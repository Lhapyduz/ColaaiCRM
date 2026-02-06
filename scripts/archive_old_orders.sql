-- Script de Arquivamento de Pedidos Antigos
-- Execute este script mensalmente para manter o banco de dados otimizado
-- Recomendação: Arquivar pedidos com mais de 3 meses

-- 1. Criar tabela de arquivo (execute apenas uma vez)
CREATE TABLE IF NOT EXISTS orders_archive (
    LIKE orders INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS order_items_archive (
    LIKE order_items INCLUDING ALL
);

-- Adicionar índice para busca por data
CREATE INDEX IF NOT EXISTS idx_orders_archive_created ON orders_archive(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_archive_user ON orders_archive(user_id);

-- 2. Função para arquivar pedidos antigos
CREATE OR REPLACE FUNCTION archive_old_orders(months_old INTEGER DEFAULT 3)
RETURNS TABLE(archived_orders INTEGER, archived_items INTEGER) AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    orders_count INTEGER;
    items_count INTEGER;
BEGIN
    cutoff_date := NOW() - (months_old || ' months')::INTERVAL;
    
    -- Contar pedidos a serem arquivados
    SELECT COUNT(*) INTO orders_count 
    FROM orders 
    WHERE created_at < cutoff_date 
    AND status = 'delivered';
    
    -- Arquivar order_items primeiro (por causa da FK)
    INSERT INTO order_items_archive
    SELECT oi.* FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at < cutoff_date 
    AND o.status = 'delivered'
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS items_count = ROW_COUNT;
    
    -- Arquivar orders
    INSERT INTO orders_archive
    SELECT * FROM orders
    WHERE created_at < cutoff_date 
    AND status = 'delivered'
    ON CONFLICT (id) DO NOTHING;
    
    -- Deletar order_items originais
    DELETE FROM order_items oi
    USING orders o
    WHERE oi.order_id = o.id
    AND o.created_at < cutoff_date 
    AND o.status = 'delivered';
    
    -- Deletar orders originais
    DELETE FROM orders
    WHERE created_at < cutoff_date 
    AND status = 'delivered';
    
    RETURN QUERY SELECT orders_count, items_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Para executar o arquivamento:
-- SELECT * FROM archive_old_orders(3);  -- Arquiva pedidos > 3 meses

-- 4. Para restaurar um pedido específico se necessário:
-- INSERT INTO orders SELECT * FROM orders_archive WHERE id = 'uuid-aqui';
-- INSERT INTO order_items SELECT * FROM order_items_archive WHERE order_id = 'uuid-aqui';

-- NOTA: Este script considera apenas pedidos com status 'delivered'.
-- Pedidos cancelados, pendentes ou em preparo NÃO são arquivados.
