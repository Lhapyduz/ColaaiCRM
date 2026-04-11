'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, PlusCircle, Combine, Map, Filter, Clock, Loader2, X } from 'lucide-react';
import { MesaWithActiveSession, unirMesas, separarMesa } from '@/lib/services/mesas';
import { createMesa, updateMesa, deleteMesa } from '@/lib/dataAccess';
import { useMesasCache } from '@/hooks/useDataCache';
import { MesaCard } from '@/components/mesas/MesaCard';
import { MesaEditModal, AddMesaModal, MergeConfirmModal } from '@/components/mesas/MesaModals';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

export default function MesasPage() {
    const router = useRouter();
    const toast = useToast();

    const { mesas: rawMesas, loading } = useMesasCache();
    // Type casting here safely because we know useMesasCache now merges active_session locally
    const mesas = rawMesas as unknown as MesaWithActiveSession[];

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todas' | 'livre' | 'ocupada' | 'fechando' | 'suja'>('todas');

    // New states for Map Configuration and Merging
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [sourceMesaId, setSourceMesaId] = useState<string | null>(null);
    const [targetMesaId, setTargetMesaId] = useState<string | null>(null);
    const [mesaToEdit, setMesaToEdit] = useState<MesaWithActiveSession | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const toggleConfiguring = () => {
        setIsConfiguring(!isConfiguring);
        setIsMerging(false);
        setSourceMesaId(null);
    };

    const toggleMerging = () => {
        setIsMerging(!isMerging);
        setIsConfiguring(false);
        if (!isMerging) {
            toast.info("Selecione a primeira mesa (Origem)");
        } else {
            setSourceMesaId(null);
        }
    };

    const handleMesaClick = (mesa: MesaWithActiveSession) => {
        if (isConfiguring) {
            setMesaToEdit(mesa);
            return;
        }
        if (isMerging) {
            if (!sourceMesaId) {
                setSourceMesaId(mesa.id);
                toast.info("Agora selecione a mesa destino");
            } else {
                if (mesa.id === sourceMesaId) {
                    setSourceMesaId(null); // deselect
                    toast.info("Mesa origem desmarcada.");
                    return;
                }
                setTargetMesaId(mesa.id);
            }
            return;
        }

        router.push(`/mesas/${mesa.id}`);
    };

    const handleSaveMesa = async (numero: number, capacidade: number) => {
        if (mesaToEdit) {
            await updateMesa(mesaToEdit.id, { numero_mesa: numero, capacidade });
            toast.success("Mesa atualizada!");
        }
    };

    const handleDeleteMesa = async (id: string) => {
        await deleteMesa(id);
        toast.success("Mesa excluída com sucesso.");
    };

    const handleCreateMesaExt = async (numero: number, capacidade: number) => {
        await createMesa({ numero_mesa: numero, capacidade, ativa: true });
        toast.success("Mesa adicionada!");
    };

    const handleMergeConfirm = async (source: MesaWithActiveSession, target: MesaWithActiveSession, garcom: string) => {
        try {
            await unirMesas(source.id, target.id, garcom);
            toast.success("Mesas unidas com sucesso!");
            setSourceMesaId(null);
            setTargetMesaId(null);
            setIsMerging(false);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao unir mesas");
        }
    };

    /* ——————— KPIs ——————— */
    const kpiCounts = useMemo(() => {
        const counts: Record<string, number> = { total: mesas.length };
        mesas.forEach(m => {
            const st = m.active_session?.status || 'livre';
            counts[st] = (counts[st] || 0) + 1;
        });
        return counts;
    }, [mesas]);

    /* ——————— Filtros ——————— */
    const filteredMesas = useMemo(() => {
        return mesas.filter(mesa => {
            const term = searchTerm.toLowerCase().trim();
            const status = mesa.active_session?.status || 'livre';

            const matchSearch =
                !term ||
                String(mesa.numero_mesa).includes(term) ||
                (mesa.active_session?.garcom && mesa.active_session.garcom.toLowerCase().includes(term));

            const matchStatus = statusFilter === 'todas' || status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [searchTerm, statusFilter, mesas]);

    const getCurrentTime = () => {
        const now = new Date();
        return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="relative flex flex-col h-full w-full bg-bg-primary overflow-hidden animate-fadeIn">
            {/* Header */}
            <header className="min-h-16 py-3 md:py-0 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 bg-bg-secondary backdrop-blur-md shrink-0 gap-3 md:gap-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <h2 className="text-lg md:text-xl font-bold tracking-tight truncate max-w-full">
                        Gestão de Mesas 
                        <span className="text-text-muted mx-1 md:mx-2">—</span> 
                        <span className="text-text-secondary font-normal hidden sm:inline">Salão Principal</span>
                        {isConfiguring && <span className="ml-3 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase animate-pulse">Editando Mapa</span>}
                        {isMerging && <span className="ml-3 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 text-xs font-bold uppercase animate-pulse">Modo União</span>}
                    </h2>
                </div>
                <div className="flex items-center gap-3 w-full justify-between md:justify-end md:w-auto">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar mesa..."
                            className="pl-10 pr-4 py-1.5 bg-bg-tertiary border-none outline-none rounded-lg text-sm focus:ring-2 focus:ring-primary w-64 text-text-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/20">
                        <PlusCircle className="w-5 h-5" />
                        Nova Reserva
                    </button>
                </div>
            </header>

            {/* Sub-Header / Filtros */}
            <div className="px-4 md:px-8 py-4 border-b border-border flex flex-col md:flex-row items-stretch md:items-center justify-between bg-bg-card/20 shrink-0 gap-4">
                <div className="flex items-center gap-2 flex-wrap pb-2 md:pb-0">
                    <button
                        onClick={() => setStatusFilter('todas')}
                        className={cn(
                            "px-3 md:px-4 py-1.5 rounded-full text-[11px] md:text-xs font-semibold whitespace-nowrap transition-colors",
                            statusFilter === 'todas'
                                ? "bg-primary text-white"
                                : "bg-bg-tertiary border border-border text-text-secondary hover:border-primary/50"
                        )}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setStatusFilter('livre')}
                        className={cn(
                            "px-3 md:px-4 py-1.5 rounded-full text-[11px] md:text-xs font-semibold whitespace-nowrap transition-colors",
                            statusFilter === 'livre'
                                ? "bg-emerald-500 text-white"
                                : "bg-bg-tertiary border border-border text-text-secondary hover:border-emerald-500/50"
                        )}
                    >
                        Livres ({kpiCounts['livre'] || 0})
                    </button>
                    <button
                        onClick={() => setStatusFilter('ocupada')}
                        className={cn(
                            "px-3 md:px-4 py-1.5 rounded-full text-[11px] md:text-xs font-semibold whitespace-nowrap transition-colors",
                            statusFilter === 'ocupada'
                                ? "bg-red-500 text-white"
                                : "bg-bg-tertiary border border-border text-text-secondary hover:border-red-500/50"
                        )}
                    >
                        Ocupadas ({kpiCounts['ocupada'] || 0})
                    </button>
                    <button
                        onClick={() => setStatusFilter('fechando')}
                        className={cn(
                            "px-3 md:px-4 py-1.5 rounded-full text-[11px] md:text-xs font-semibold whitespace-nowrap transition-colors",
                            statusFilter === 'fechando'
                                ? "bg-amber-500 text-white"
                                : "bg-bg-tertiary border border-border text-text-secondary hover:border-amber-500/50"
                        )}
                    >
                        Pedindo Conta ({kpiCounts['fechando'] || 0})
                    </button>
                    <button
                        onClick={() => setStatusFilter('suja')}
                        className={cn(
                            "px-3 md:px-4 py-1.5 rounded-full text-[11px] md:text-xs font-semibold whitespace-nowrap transition-colors",
                            statusFilter === 'suja'
                                ? "bg-blue-500 text-white"
                                : "bg-bg-tertiary border border-border text-text-secondary hover:border-blue-500/50"
                        )}
                    >
                        Em Limpeza ({kpiCounts['suja'] || 0})
                    </button>
                </div>
                <div className="flex items-center justify-end gap-2 w-full md:w-auto">
                    {isMerging && (
                        <button onClick={() => setSourceMesaId(null)} disabled={!sourceMesaId} className="mr-2 text-xs font-bold text-text-muted hover:text-text-primary px-2 transition-colors disabled:opacity-30">
                            Limpar Seleção
                        </button>
                    )}
                    <button 
                        onClick={toggleMerging}
                        className={cn("p-2 rounded-lg transition-colors border border-transparent", isMerging ? "bg-blue-500/20 text-blue-500 border-blue-500/50 shadow-md" : "hover:bg-bg-tertiary text-text-muted")} 
                        title="Unir Mesas"
                    >
                        <Combine className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={toggleConfiguring}
                        className={cn("p-2 rounded-lg transition-colors border border-transparent", isConfiguring ? "bg-primary/20 text-primary border-primary/50 shadow-md" : "hover:bg-bg-tertiary text-text-muted")} 
                        title="Configurar Mapa"
                    >
                        {isConfiguring ? <X className="w-5 h-5" /> : <Map className="w-5 h-5" />}
                    </button>
                    <div className="h-6 w-px bg-border mx-2"></div>
                    <button className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted transition-colors">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid Area */}
            <main className="flex-1 overflow-y-auto p-3 md:p-8 custom-scrollbar bg-bg-primary">
                {loading ? (
                    <div className="flex justify-center items-center h-full text-text-muted w-full">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" /> Carregando mesas...
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6 pb-20">
                        {filteredMesas.map((mesa, i) => (
                            <MesaCard 
                                key={mesa.id} 
                                mesa={mesa} 
                                onClick={handleMesaClick} 
                                index={i} 
                                isSelected={sourceMesaId === mesa.id}
                                isConfiguring={isConfiguring}
                            />
                        ))}
                        {/* Botão de Adicionar Mesa (visível no modo Configurar Mapa) */}
                        {isConfiguring && (
                            <div onClick={() => setShowAddModal(true)} className="bg-bg-card rounded-xl border-2 border-dashed border-border p-5 flex flex-col gap-4 relative group hover:border-primary/50 transition-all cursor-pointer opacity-60">
                                <div className="flex flex-col items-center justify-center h-full py-6">
                                    <PlusCircle className="w-8 h-8 text-text-muted mb-2 group-hover:text-primary transition-colors" />
                                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest group-hover:text-primary transition-colors">Adicionar Mesa</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Modals */}
            <MesaEditModal 
                key={`edit-${mesaToEdit?.id || 'none'}`}
                isOpen={!!mesaToEdit} 
                onClose={() => setMesaToEdit(null)} 
                mesa={mesaToEdit} 
                onSave={handleSaveMesa}
                onDelete={handleDeleteMesa}
                onFree={async (sessionId) => {
                    try {
                        await separarMesa(sessionId);
                        toast.success("Mesa liberada com sucesso!");
                        setMesaToEdit(null);
                    } catch (e) {
                        const err = e as Error;
                        toast.error(err.message || "Erro ao liberar mesa");
                    }
                }}
            />
            
            <AddMesaModal
                key={`add-${showAddModal ? 'open' : 'closed'}`}
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSave={handleCreateMesaExt}
                suggestedNumber={mesas.length > 0 ? Math.max(...mesas.map(m => m.numero_mesa)) + 1 : 1}
            />

            <MergeConfirmModal
                isOpen={!!targetMesaId && !!sourceMesaId}
                onClose={() => setTargetMesaId(null)}
                sourceMesa={mesas.find(m => m.id === sourceMesaId) || null}
                targetMesa={mesas.find(m => m.id === targetMesaId) || null}
                onConfirm={handleMergeConfirm}
            />

            {/* Footer de Status */}
            <footer className="h-12 border-t border-border px-4 md:px-8 flex items-center justify-between text-[11px] text-text-muted font-medium bg-bg-secondary shrink-0">
                <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                        <span className="size-2 rounded-full bg-emerald-500"></span> Livre: {kpiCounts['livre'] || 0}
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="size-2 rounded-full bg-red-500"></span> Ocupada: {kpiCounts['ocupada'] || 0}
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="size-2 rounded-full bg-amber-500"></span> Pedindo Conta: {kpiCounts['fechando'] || 0}
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="size-2 rounded-full bg-blue-500"></span> Em Limpeza: {kpiCounts['suja'] || 0}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Última atualização: {getCurrentTime()}
                </div>
            </footer>
        </div>
    );
}
