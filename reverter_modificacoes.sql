-- Arquivo gerado para reverter as modificações da migração 20260310000001_add_employee_orders_relation.sql

-- Remover colunas da tabela orders
ALTER TABLE public.orders DROP COLUMN IF EXISTS garcom_id;

ALTER TABLE public.orders DROP COLUMN IF EXISTS entregador_id;

-- Remover coluna da tabela employees
ALTER TABLE public.employees DROP COLUMN IF EXISTS salario_fixo;