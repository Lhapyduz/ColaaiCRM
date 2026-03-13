-- Adicionar colunas para rastreamento de entregadores e garçons nos pedidos
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS garcom_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS entregador_id uuid REFERENCES public.employees (id) ON DELETE SET NULL;

-- Adicionar tipo para o salario_fixo (se já não existir na tabela employees)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS salario_fixo numeric(10, 2) DEFAULT 0;

-- Certificar que service_fee e discount_amount também existem e estão como numéricos se precisarem de default
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS service_fee numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT 0;