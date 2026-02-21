-- migration file para otimização de consultas na tabela orders

-- Índice para consultas filtrando pedidos pelo user_id (dono da loja), ordenado por data de criação
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders (user_id, created_at DESC);

-- Índice composto para filtragem por user_id e status (essencial para o Kanban/PDV board)
CREATE INDEX IF NOT EXISTS idx_orders_user_id_status ON orders (user_id, status);