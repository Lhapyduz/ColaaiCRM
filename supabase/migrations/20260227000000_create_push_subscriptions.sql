-- Criar a tabela para as inscrições de push (Web Push Subscriptions)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,

-- Um device/browser específico não deve ser duplicado para o mesmo usuário
UNIQUE(user_id, endpoint) );

-- Ativar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Como vamos acessar via Service Role Key a maior parte do tempo nas APIs, e o user autenticado
-- pode nem precisar ler ou escrever diretamente, políticas de select não são estritamente exigidas.
-- Mas vamos liberar caso o front decidisse ler:
CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- Para permitir que os scripts via admin rule passem
CREATE POLICY "Service role can manage all subscriptions" ON public.push_subscriptions FOR ALL TO service_role USING (true)
WITH
    CHECK (true);

-- Index por user_id que será mais usado
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);