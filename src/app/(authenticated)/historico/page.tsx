'use client';

import React, { useState, useEffect } from 'react';
import { FiActivity, FiFilter, FiCalendar, FiRefreshCw, FiChevronLeft, FiChevronRight, FiTrash2 } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { getActionTypeLabel, getEntityTypeLabel, getActionIcon, ActionType, EntityType } from '@/lib/actionLogger';

interface ActionLog { id: string; action_type: ActionType; entity_type: EntityType; entity_id: string | null; entity_name: string | null; description: string; metadata: Record<string, unknown>; created_at: string; }

const PAGE_SIZE = 20;

export default function HistoricoPage() {
    const { user } = useAuth();
    const { canAccess, plan } = useSubscription();
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [filterAction, setFilterAction] = useState<ActionType | ''>('');
    const [filterEntity, setFilterEntity] = useState<EntityType | ''>('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [cleaning, setCleaning] = useState(false);

    const hasAccess = canAccess('actionHistory');

    useEffect(() => { if (user && hasAccess) fetchLogs(); }, [user, page, filterAction, filterEntity, dateFrom, dateTo, hasAccess]);

    if (!hasAccess) return <UpgradePrompt feature="Histórico de Ações" requiredPlan="Avançado" currentPlan={plan} fullPage />;

    const fetchLogs = async () => {
        if (!user) return; setLoading(true);
        let query = supabase.from('action_logs').select('*', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false });
        if (filterAction) query = query.eq('action_type', filterAction);
        if (filterEntity) query = query.eq('entity_type', filterEntity);
        if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
        if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);
        const from = (page - 1) * PAGE_SIZE;
        query = query.range(from, from + PAGE_SIZE - 1);
        const { data, error, count } = await query;
        if (!error && data) { setLogs(data); setTotalCount(count || 0); }
        setLoading(false);
    };

    const clearFilters = () => { setFilterAction(''); setFilterEntity(''); setDateFrom(''); setDateTo(''); setPage(1); };

    const cleanupOldLogs = async () => { if (!user) return; if (!confirm('Deseja apagar logs com mais de 7 dias?')) return; setCleaning(true); try { const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); await supabase.from('action_logs').delete().eq('user_id', user.id).lt('created_at', sevenDaysAgo.toISOString()); await fetchLogs(); } catch (e) { console.error(e); } finally { setCleaning(false); } };
    const clearAllLogs = async () => { if (!user) return; if (!confirm('Tem certeza que deseja apagar TODO o histórico de ações?')) return; setCleaning(true); try { await supabase.from('action_logs').delete().eq('user_id', user.id); setLogs([]); setTotalCount(0); } catch (e) { console.error(e); } finally { setCleaning(false); } };

    const formatDateTime = (dateString: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
    const getRelativeTime = (dateString: string) => { const date = new Date(dateString); const diffMs = Date.now() - date.getTime(); const diffMins = Math.floor(diffMs / 60000); const diffHours = Math.floor(diffMs / 3600000); const diffDays = Math.floor(diffMs / 86400000); if (diffMins < 1) return 'agora'; if (diffMins < 60) return `há ${diffMins} min`; if (diffHours < 24) return `há ${diffHours}h`; if (diffDays < 7) return `há ${diffDays} dias`; return formatDateTime(dateString); };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const actionTypes: ActionType[] = ['create', 'update', 'delete', 'status_change', 'payment', 'print', 'export', 'login', 'logout'];
    const entityTypes: EntityType[] = ['order', 'product', 'category', 'customer', 'coupon', 'ingredient', 'reward', 'addon', 'settings', 'report'];

    return (
        <div className="max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 gap-5 flex-wrap">
                <div><h1 className="text-[2rem] font-bold mb-2">Histórico de Ações</h1><p className="text-text-secondary">{totalCount} {totalCount === 1 ? 'registro encontrado' : 'registros encontrados'}</p></div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" leftIcon={<FiRefreshCw />} onClick={fetchLogs}>Atualizar</Button>
                    {totalCount > 0 && (<><Button variant="outline" leftIcon={<FiTrash2 />} onClick={cleanupOldLogs} isLoading={cleaning}>Limpar +7 dias</Button><Button variant="ghost" leftIcon={<FiTrash2 />} onClick={clearAllLogs} isLoading={cleaning} className="text-error!">Limpar Tudo</Button></>)}
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-6 p-4!">
                <div className="flex items-end gap-4 flex-wrap">
                    <div className="flex flex-col gap-1 min-w-[150px]"><label className="text-sm text-text-secondary flex items-center gap-1"><FiFilter /> Tipo de Ação</label><select className="px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm" value={filterAction} onChange={(e) => { setFilterAction(e.target.value as ActionType | ''); setPage(1); }}><option value="">Todas</option>{actionTypes.map(type => (<option key={type} value={type}>{getActionTypeLabel(type)}</option>))}</select></div>
                    <div className="flex flex-col gap-1 min-w-[150px]"><label className="text-sm text-text-secondary">Entidade</label><select className="px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm" value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value as EntityType | ''); setPage(1); }}><option value="">Todas</option>{entityTypes.map(type => (<option key={type} value={type}>{getEntityTypeLabel(type)}</option>))}</select></div>
                    <div className="flex flex-col gap-1"><label className="text-sm text-text-secondary flex items-center gap-1"><FiCalendar /> De</label><input type="date" className="px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} /></div>
                    <div className="flex flex-col gap-1"><label className="text-sm text-text-secondary">Até</label><input type="date" className="px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} /></div>
                    {(filterAction || filterEntity || dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar Filtros</Button>}
                </div>
            </Card>

            {/* Logs List */}
            <Card>
                {loading ? <div className="p-12 text-center text-text-secondary">Carregando...</div> : logs.length === 0 ? (
                    <div className="flex flex-col items-center p-12 text-center text-text-muted"><FiActivity size={48} className="mb-4 opacity-50" /><h3 className="text-lg font-semibold text-text-secondary mb-2">Nenhuma ação registrada</h3><p>O histórico de ações aparecerá aqui conforme você usa o sistema</p></div>
                ) : (
                    <>
                        <div className="flex flex-col">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-4 p-4 border-b border-border last:border-b-0 hover:bg-bg-tertiary transition-all duration-fast">
                                    <div className="w-10 h-10 flex items-center justify-center bg-bg-tertiary rounded-full text-primary">{getActionIcon(log.action_type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">{getActionTypeLabel(log.action_type)}</span><span className="text-xs text-text-muted">{getEntityTypeLabel(log.entity_type)}</span>{log.entity_name && <span className="text-xs text-text-secondary font-medium">{log.entity_name}</span>}</div>
                                        <p className="text-sm text-text-secondary truncate">{log.description}</p>
                                    </div>
                                    <div className="flex flex-col items-end whitespace-nowrap"><span className="text-sm text-text-primary font-medium">{getRelativeTime(log.created_at)}</span><span className="text-xs text-text-muted">{formatDateTime(log.created_at)}</span></div>
                                </div>
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 p-4 border-t border-border">
                                <Button variant="ghost" size="sm" leftIcon={<FiChevronLeft />} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                                <span className="text-sm text-text-secondary">Página {page} de {totalPages}</span>
                                <Button variant="ghost" size="sm" rightIcon={<FiChevronRight />} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
}
