'use client';

import React, { useState } from 'react';
import { FiActivity, FiFilter, FiCalendar, FiRefreshCw, FiChevronLeft, FiChevronRight, FiTrash2 } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getActionTypeLabel, getEntityTypeLabel, getActionIcon, ActionType, EntityType } from '@/lib/actionLogger';
import { useActionLogsCache } from '@/hooks/useDataCache';
import { clearActionLogsDAL } from '@/lib/dataAccess';

const PAGE_SIZE = 20;

export default function HistoricoPage() {
    const { user } = useAuth();
    const { canAccess, plan } = useSubscription();
    
    const [page, setPage] = useState(1);
    const [filterAction, setFilterAction] = useState<ActionType | ''>('');
    const [filterEntity, setFilterEntity] = useState<EntityType | ''>('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [cleaning, setCleaning] = useState(false);

    const hasAccess = canAccess('actionHistory');

    const { logs, totalCount, loading, refetch } = useActionLogsCache(PAGE_SIZE, page, {
        action: filterAction || undefined,
        entity: filterEntity || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined
    });

    if (!hasAccess) return <UpgradePrompt feature="Histórico de Ações" requiredPlan="Avançado" currentPlan={plan} fullPage />;

    const clearFilters = () => { setFilterAction(''); setFilterEntity(''); setDateFrom(''); setDateTo(''); setPage(1); };

    const cleanupOldLogs = async () => { 
        if (!user) return; 
        if (!confirm('Deseja apagar logs com mais de 7 dias?')) return; 
        setCleaning(true); 
        try { 
            const sevenDaysAgo = new Date(); 
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); 
            
            await clearActionLogsDAL(user.id, sevenDaysAgo.toISOString());
            await refetch(); 
        } catch (e) { 
            console.error(e); 
        } finally { 
            setCleaning(false); 
        } 
    };

    const clearAllLogs = async () => { 
        if (!user) return; 
        if (!confirm('Tem certeza que deseja apagar TODO o histórico de ações?')) return; 
        setCleaning(true); 
        try { 
            await clearActionLogsDAL(user.id);
            await refetch();
        } catch (e) { 
            console.error(e); 
        } finally { 
            setCleaning(false); 
        } 
    };

    const formatDateTime = (dateString: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
    const getRelativeTime = (dateString: string) => { const date = new Date(dateString); const diffMs = Date.now() - date.getTime(); const diffMins = Math.floor(diffMs / 60000); const diffHours = Math.floor(diffMs / 3600000); const diffDays = Math.floor(diffMs / 864000000); if (diffMins < 1) return 'agora'; if (diffMins < 60) return `há ${diffMins} min`; if (diffHours < 24) return `há ${diffHours}h`; if (diffDays < 7) return `há ${diffDays} dias`; return formatDateTime(dateString); };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const actionTypes: ActionType[] = ['create', 'update', 'delete', 'status_change', 'payment', 'stock_movement', 'print', 'export', 'login', 'logout'];
    const entityTypes: EntityType[] = ['order', 'product', 'category', 'customer', 'coupon', 'ingredient', 'reward', 'addon', 'settings', 'report'];

    return (
        <div className="max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 gap-5 flex-wrap">
                <div className="w-full md:w-auto"><h1 className="text-[2rem] font-bold mb-2">Histórico de Ações</h1><p className="text-text-secondary">{totalCount} {totalCount === 1 ? 'registro encontrado' : 'registros encontrados'}</p></div>
                <div className="flex w-full md:w-auto gap-2 flex-wrap">
                    <Button variant="outline" className="flex-1 md:flex-none" leftIcon={<FiRefreshCw />} onClick={() => refetch()}>Atualizar</Button>
                    {totalCount > 0 && (<><Button variant="outline" className="flex-1 md:flex-none" leftIcon={<FiTrash2 />} onClick={cleanupOldLogs} isLoading={cleaning}>Limpar +7 dias</Button><Button variant="ghost" className="flex-1 md:flex-none text-error!" leftIcon={<FiTrash2 />} onClick={clearAllLogs} isLoading={cleaning}>Limpar Tudo</Button></>)}
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-6 p-4!">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap md:items-end gap-4">
                    <div className="flex flex-col gap-1 w-full"><label className="text-sm text-text-secondary flex items-center gap-1"><FiFilter /> Tipo de Ação</label><select className="px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm w-full" value={filterAction} onChange={(e) => { setFilterAction(e.target.value as ActionType | ''); setPage(1); }}><option value="">Todas</option>{actionTypes.map(type => (<option key={type} value={type}>{getActionTypeLabel(type)}</option>))}</select></div>
                    <div className="flex flex-col gap-1 w-full"><label className="text-sm text-text-secondary">Entidade</label><select className="px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm w-full" value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value as EntityType | ''); setPage(1); }}><option value="">Todas</option>{entityTypes.map(type => (<option key={type} value={type}>{getEntityTypeLabel(type)}</option>))}</select></div>
                    <div className="flex flex-col gap-1 w-full"><label className="text-sm text-text-secondary flex items-center gap-1"><FiCalendar /> De</label><input type="date" className="px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm w-full" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} /></div>
                    <div className="flex flex-col gap-1 w-full"><label className="text-sm text-text-secondary">Até</label><input type="date" className="px-3 py-2 bg-bg-tertiary border border-border rounded-md text-text-primary text-sm w-full" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} /></div>
                    {(filterAction || filterEntity || dateFrom || dateTo) && <div className="sm:col-span-2 md:col-span-1 w-full flex items-end"><Button variant="ghost" size="sm" className="w-full mt-2 md:mt-0" onClick={clearFilters}>Limpar Filtros</Button></div>}
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
                                <div key={log.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border-b border-border last:border-b-0 hover:bg-bg-tertiary transition-all duration-fast">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 flex items-center justify-center bg-bg-tertiary rounded-full text-primary shrink-0">{getActionIcon(log.action_type as ActionType)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">{getActionTypeLabel(log.action_type as ActionType)}</span><span className="text-xs text-text-muted">{getEntityTypeLabel(log.entity_type as EntityType)}</span>{log.entity_name && <span className="text-xs text-text-secondary font-medium">{log.entity_name}</span>}</div>
                                            <p className="text-sm text-text-secondary truncate">{log.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-row sm:flex-col items-center justify-between sm:items-end w-full sm:w-auto whitespace-nowrap pl-[52px] sm:pl-0"><span className="text-sm text-text-primary font-medium">{getRelativeTime(log.created_at)}</span><span className="text-xs text-text-muted">{formatDateTime(log.created_at)}</span></div>
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
