-- ============================================================
-- SCRIPT DE LIMPEZA DO SUPABASE - Cola Aí CRM
-- Execute no SQL Editor do Supabase Dashboard
-- Objetivo: Liberar ~330MB de espaço ocupado por extensões
-- ============================================================

-- 1. Limpar logs de cron jobs (71MB)
-- Esses são logs internos de execuções do pg_cron, não dados do usuário
TRUNCATE TABLE cron.job_run_details;

-- 2. Limpar logs do pg_net HTTP responses (38MB)
-- Cache de respostas HTTP feitas pelo pg_net extension
TRUNCATE TABLE net._http_response;

-- 3. Limpar extensão Stripe Wrapper (sync_runs é VIEW, sync_obj_runs é TABLE)
-- A extensão Supabase Stripe usa Foreign Data Wrappers, por isso algumas são views

-- Dropar views primeiro
DROP VIEW IF EXISTS stripe.sync_runs CASCADE;

-- Dropar tabelas reais
DROP TABLE IF EXISTS stripe.sync_obj_runs CASCADE;

-- Se o schema stripe ficou vazio, remover ele também
-- (descomente se quiser limpar completamente)
-- DROP SCHEMA IF EXISTS stripe CASCADE;

-- 4. Limpar action_logs antigos (manter últimos 30 dias)
DELETE FROM public.action_logs
WHERE
    created_at < NOW() - INTERVAL '30 days';

-- 5. Limpar sessões de mesa fechadas há mais de 60 dias
DELETE FROM public.mesa_session_items
WHERE
    session_id IN (
        SELECT id
        FROM public.mesa_sessions
        WHERE
            closed_at IS NOT NULL
            AND closed_at < NOW() - INTERVAL '60 days'
    );

DELETE FROM public.mesa_sessions
WHERE
    closed_at IS NOT NULL
    AND closed_at < NOW() - INTERVAL '60 days';

-- 6. Espaço será recuperado automaticamente pelo autovacuum do Postgres
-- (VACUUM FULL não pode rodar no SQL Editor do Supabase)

-- ============================================================
-- RESULTADO ESPERADO:
-- Database Size: de 0.391 GB (~78%) para ~0.050 GB (~10%)
-- Isso libera capacidade para centenas de clientes
-- ============================================================