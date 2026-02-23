-- Adicionar coluna slogan na tabela user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS slogan VARCHAR(255) DEFAULT 'A melhor experiência gastronômica, entregue na sua porta.';