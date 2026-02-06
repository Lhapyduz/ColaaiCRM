-- Trial System with Anti-Fraud Fingerprinting
-- Migration para sistema de trial de 3 dias com proteção anti-fraude

-- 1. Criar tabela device_fingerprints para rastrear dispositivos
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fingerprint_hash TEXT UNIQUE NOT NULL,
  first_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trial_used BOOLEAN DEFAULT true,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar campos na tabela subscriptions (se não existirem)
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS created_from_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS trial_abuse_count INTEGER DEFAULT 0;

-- 3. Enable RLS na nova tabela
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- 4. Política: Apenas service_role pode ler/escrever device_fingerprints
CREATE POLICY "Service role full access to device_fingerprints" ON device_fingerprints
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON device_fingerprints(first_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_fingerprint ON subscriptions(created_from_fingerprint);

-- 6. Garantir que subscriptions tem RLS ativo
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de segurança para subscriptions
-- Drop existing policies if they exist (para evitar conflitos)
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

-- Usuários podem ver apenas sua própria subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Apenas service_role pode inserir/atualizar/deletar
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 8. Função para verificar elegibilidade de trial (usada pelo backend)
CREATE OR REPLACE FUNCTION check_trial_eligibility(p_fingerprint_hash TEXT)
RETURNS TABLE(can_trial BOOLEAN, reason TEXT) AS $$
BEGIN
  -- Verificar se fingerprint já foi usado
  IF EXISTS (SELECT 1 FROM device_fingerprints WHERE fingerprint_hash = p_fingerprint_hash AND trial_used = true) THEN
    RETURN QUERY SELECT false, 'Dispositivo já utilizou período de trial'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para registrar uso de trial
CREATE OR REPLACE FUNCTION register_trial_usage(
  p_fingerprint_hash TEXT,
  p_user_id UUID,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO device_fingerprints (fingerprint_hash, first_user_id, trial_used, ip_hash, user_agent)
  VALUES (p_fingerprint_hash, p_user_id, true, p_ip_hash, p_user_agent)
  ON CONFLICT (fingerprint_hash) 
  DO UPDATE SET 
    last_seen_at = NOW(),
    trial_used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
