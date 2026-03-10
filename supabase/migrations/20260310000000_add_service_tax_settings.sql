-- Migração para adicionar configurações globais de taxa de serviço
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS taxa_servico_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS taxa_servico_percent NUMERIC DEFAULT 10;

-- Comentários para documentação
COMMENT ON COLUMN public.user_settings.taxa_servico_enabled IS 'Indica se a taxa de serviço (garçom) está habilitada globalmente';

COMMENT ON COLUMN public.user_settings.taxa_servico_percent IS 'Percentual padrão da taxa de serviço';