'use client';

import React, { useState, useEffect } from 'react';
import {
    FiActivity,
    FiFilter,
    FiCalendar,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getActionTypeLabel, getEntityTypeLabel, getActionIcon, ActionType, EntityType } from '@/lib/actionLogger';
import styles from './page.module.css';

interface ActionLog {
    id: string;
    action_type: ActionType;
    entity_type: EntityType;
    entity_id: string | null;
    entity_name: string | null;
    description: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

const PAGE_SIZE = 20;

export default function HistoricoPage() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [filterAction, setFilterAction] = useState<ActionType | ''>('');
    const [filterEntity, setFilterEntity] = useState<EntityType | ''>('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        if (user) {
            fetchLogs();
        }
    }, [user, page, filterAction, filterEntity, dateFrom, dateTo]);

    const fetchLogs = async () => {
        if (!user) return;
        setLoading(true);

        let query = supabase
            .from('action_logs')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (filterAction) {
            query = query.eq('action_type', filterAction);
        }
        if (filterEntity) {
            query = query.eq('entity_type', filterEntity);
        }
        if (dateFrom) {
            query = query.gte('created_at', `${dateFrom}T00:00:00`);
        }
        if (dateTo) {
            query = query.lte('created_at', `${dateTo}T23:59:59`);
        }

        const from = (page - 1) * PAGE_SIZE;
        query = query.range(from, from + PAGE_SIZE - 1);

        const { data, error, count } = await query;

        if (!error && data) {
            setLogs(data);
            setTotalCount(count || 0);
        }
        setLoading(false);
    };

    const clearFilters = () => {
        setFilterAction('');
        setFilterEntity('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'agora';
        if (diffMins < 60) return `há ${diffMins} min`;
        if (diffHours < 24) return `há ${diffHours}h`;
        if (diffDays < 7) return `há ${diffDays} dias`;
        return formatDateTime(dateString);
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const actionTypes: ActionType[] = [
        'create', 'update', 'delete', 'status_change', 'payment',
        'print', 'export', 'login', 'logout'
    ];

    const entityTypes: EntityType[] = [
        'order', 'product', 'category', 'customer', 'coupon',
        'ingredient', 'reward', 'addon', 'settings', 'report'
    ];

    return (
        <MainLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Histórico de Ações</h1>
                        <p className={styles.subtitle}>
                            {totalCount} {totalCount === 1 ? 'registro encontrado' : 'registros encontrados'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        leftIcon={<FiRefreshCw />}
                        onClick={fetchLogs}
                    >
                        Atualizar
                    </Button>
                </div>

                {/* Filters */}
                <Card className={styles.filtersCard}>
                    <div className={styles.filters}>
                        <div className={styles.filterGroup}>
                            <label><FiFilter /> Tipo de Ação</label>
                            <select
                                value={filterAction}
                                onChange={(e) => {
                                    setFilterAction(e.target.value as ActionType | '');
                                    setPage(1);
                                }}
                            >
                                <option value="">Todas</option>
                                {actionTypes.map(type => (
                                    <option key={type} value={type}>
                                        {getActionTypeLabel(type)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label>Entidade</label>
                            <select
                                value={filterEntity}
                                onChange={(e) => {
                                    setFilterEntity(e.target.value as EntityType | '');
                                    setPage(1);
                                }}
                            >
                                <option value="">Todas</option>
                                {entityTypes.map(type => (
                                    <option key={type} value={type}>
                                        {getEntityTypeLabel(type)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label><FiCalendar /> De</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div className={styles.filterGroup}>
                            <label>Até</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        {(filterAction || filterEntity || dateFrom || dateTo) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                            >
                                Limpar Filtros
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Logs List */}
                <Card>
                    {loading ? (
                        <div className={styles.loading}>Carregando...</div>
                    ) : logs.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FiActivity size={48} />
                            <h3>Nenhuma ação registrada</h3>
                            <p>O histórico de ações aparecerá aqui conforme você usa o sistema</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.logsList}>
                                {logs.map((log) => (
                                    <div key={log.id} className={styles.logItem}>
                                        <div className={styles.logIcon}>
                                            {getActionIcon(log.action_type)}
                                        </div>
                                        <div className={styles.logContent}>
                                            <div className={styles.logHeader}>
                                                <span className={styles.logAction}>
                                                    {getActionTypeLabel(log.action_type)}
                                                </span>
                                                <span className={styles.logEntity}>
                                                    {getEntityTypeLabel(log.entity_type)}
                                                </span>
                                                {log.entity_name && (
                                                    <span className={styles.logEntityName}>
                                                        {log.entity_name}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={styles.logDescription}>
                                                {log.description}
                                            </p>
                                        </div>
                                        <div className={styles.logTime}>
                                            <span className={styles.relativeTime}>
                                                {getRelativeTime(log.created_at)}
                                            </span>
                                            <span className={styles.absoluteTime}>
                                                {formatDateTime(log.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className={styles.pagination}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<FiChevronLeft />}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <span className={styles.pageInfo}>
                                        Página {page} de {totalPages}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        rightIcon={<FiChevronRight />}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Próxima
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>
        </MainLayout>
    );
}
