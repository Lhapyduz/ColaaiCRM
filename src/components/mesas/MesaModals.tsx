import React, { useState } from 'react';
import { X, Check, Trash2, Combine } from 'lucide-react';
import { MesaWithActiveSession } from '@/lib/services/mesas';
import { useFormatters } from '@/hooks/useFormatters';

interface MesaEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    mesa: MesaWithActiveSession | null;
    onSave: (numeroMesa: number, capacidade: number) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onFree?: (sessionId: string) => Promise<void>;
}

export function MesaEditModal({ isOpen, onClose, mesa, onSave, onDelete, onFree }: MesaEditModalProps) {
    const [numeroMesa, setNumeroMesa] = useState(mesa?.numero_mesa || 1);
    const [capacidade, setCapacidade] = useState(mesa?.capacidade || 4);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen || !mesa) return null;

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(numeroMesa, capacidade);
        setIsSaving(false);
        onClose();
    };

    const handleDelete = async () => {
        if (window.confirm(`Tem certeza que deseja excluir a Mesa ${mesa.numero_mesa}?`)) {
            setIsDeleting(true);
            await onDelete(mesa.id);
            setIsDeleting(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-bg-secondary w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-primary">Configurar Mesa</h2>
                    <button onClick={onClose} className="p-2 bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 md:p-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-text-secondary">Número da Mesa</label>
                        <input
                            type="number"
                            value={numeroMesa}
                            onChange={e => setNumeroMesa(e.target.value ? Number(e.target.value) : 1)}
                            className="bg-bg-primary border border-border rounded-lg px-4 py-2 focus:ring-primary focus:border-primary text-text-primary outline-none w-full"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-text-secondary">Capacidade (Pessoas)</label>
                        <input
                            type="number"
                            value={capacidade}
                            onChange={e => setCapacidade(e.target.value ? Number(e.target.value) : 1)}
                            className="bg-bg-primary border border-border rounded-lg px-4 py-2 focus:ring-primary focus:border-primary text-text-primary outline-none w-full"
                        />
                    </div>
                </div>
                <div className="p-4 md:p-6 border-t border-border flex justify-between bg-bg-tertiary/50">
                    <div className="flex items-center gap-2">
                        {/* Desktop Delete Button */}
                        <div className="hidden sm:block">
                            <button 
                                onClick={handleDelete} 
                                disabled={isDeleting || mesa.active_session !== null}
                                className="flex items-center gap-2 text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={mesa.active_session ? "Não é possível excluir uma mesa ocupada" : "Excluir mesa"}
                            >
                                <Trash2 className="w-5 h-5" />
                                <span>Excluir</span>
                            </button>
                        </div>
                        
                        {/* Mobile Delete Button */}
                        <div className="block sm:hidden">
                            <button 
                                onClick={handleDelete} 
                                disabled={isDeleting || mesa.active_session !== null}
                                className="flex items-center gap-2 text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Excluir mesa"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        {mesa.active_session && mesa.active_session.valor_parcial === 0 && onFree && (
                            <button
                                onClick={async () => {
                                    if (window.confirm(`Deseja liberar a Mesa ${mesa.numero_mesa}? Ela ficará vazia novamente.`)) {
                                        setIsSaving(true);
                                        await onFree(mesa.active_session!.id);
                                        setIsSaving(false);
                                        onClose();
                                    }
                                }}
                                disabled={isSaving}
                                className="flex items-center gap-2 text-orange-500 hover:bg-orange-500/10 px-2 sm:px-4 py-2 rounded-lg font-bold transition-colors text-sm sm:text-base border border-orange-500/30"
                                title="Liberar Mesa (sem gastos)"
                            >
                                <span className="hidden sm:inline">Liberar Mesa</span>
                                <span className="sm:hidden">Liberar</span>
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-text-secondary hover:bg-bg-tertiary transition-colors">
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                            <Check className="w-5 h-5" />
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface AddMesaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (numeroMesa: number, capacidade: number) => Promise<void>;
    suggestedNumber: number;
}

export function AddMesaModal({ isOpen, onClose, onSave, suggestedNumber }: AddMesaModalProps) {
    const [numeroMesa, setNumeroMesa] = useState(suggestedNumber);
    const [capacidade, setCapacidade] = useState(4);
    const [isSaving, setIsSaving] = useState(false);
    
    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(numeroMesa, capacidade);
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-bg-secondary w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-primary">Adicionar Nova Mesa</h2>
                    <button onClick={onClose} className="p-2 bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 md:p-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-text-secondary">Número da Mesa</label>
                        <input
                            type="number"
                            value={numeroMesa}
                            onChange={e => setNumeroMesa(e.target.value ? Number(e.target.value) : 1)}
                            className="bg-bg-primary border border-border rounded-lg px-4 py-2 focus:ring-primary focus:border-primary text-text-primary outline-none w-full"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-text-secondary">Capacidade (Pessoas)</label>
                        <input
                            type="number"
                            value={capacidade}
                            onChange={e => setCapacidade(e.target.value ? Number(e.target.value) : 1)}
                            className="bg-bg-primary border border-border rounded-lg px-4 py-2 focus:ring-primary focus:border-primary text-text-primary outline-none w-full"
                        />
                    </div>
                </div>
                <div className="p-4 md:p-6 border-t border-border flex justify-end gap-2 bg-bg-tertiary/50">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-bold text-text-secondary hover:bg-bg-tertiary transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <Check className="w-5 h-5" />
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    );
}

interface MergeConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceMesa: MesaWithActiveSession | null;
    targetMesa: MesaWithActiveSession | null;
    onConfirm: (sourceMesa: MesaWithActiveSession, targetMesa: MesaWithActiveSession, garcom: string) => Promise<void>;
}

export function MergeConfirmModal({ isOpen, onClose, sourceMesa, targetMesa, onConfirm }: MergeConfirmModalProps) {
    const { formatCurrency } = useFormatters();
    const [isMerging, setIsMerging] = useState(false);
    const [garcom, setGarcom] = useState('');

    if (!isOpen || !sourceMesa || !targetMesa) return null;

    const handleConfirm = async () => {
        setIsMerging(true);
        await onConfirm(sourceMesa, targetMesa, garcom);
        setIsMerging(false);
        setGarcom('');
        onClose();
    };

    const sourceTotal = sourceMesa.active_session?.valor_parcial || 0;
    const targetTotal = targetMesa.active_session?.valor_parcial || 0;
    const newTotal = sourceTotal + targetTotal;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-bg-secondary w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-border bg-blue-500/10">
                    <div className="flex items-center gap-3 text-blue-500">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Combine className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold">Confirmar União</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-4 md:p-6 flex flex-col gap-6">
                    <p className="text-text-secondary text-sm">
                        As mesas <strong>{sourceMesa.numero_mesa}</strong> e <strong>{targetMesa.numero_mesa}</strong> serão agrupadas fisicamente. A mesa <strong>{targetMesa.numero_mesa}</strong> será a mesa principal.
                    </p>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-text-secondary">Nome do Garçom / Atendente (Opcional)</label>
                        <input
                            type="text"
                            value={garcom}
                            onChange={e => setGarcom(e.target.value)}
                            placeholder="Ex: João, Maria"
                            className="bg-bg-primary border border-border rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500 text-text-primary outline-none w-full"
                        />
                    </div>

                    <div className="bg-bg-tertiary rounded-xl p-4 flex flex-col gap-3 mt-2">
                        <div className="flex justify-between items-center pb-3 border-b border-border/50">
                            <span className="text-sm font-semibold text-text-secondary">Mesa {sourceMesa.numero_mesa}</span>
                            <span className="text-sm font-bold text-text-primary">{formatCurrency(sourceTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-border/50">
                            <span className="text-sm font-bold text-primary">Mesa {targetMesa.numero_mesa}</span>
                            <span className="text-sm font-bold text-primary">{formatCurrency(targetTotal)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-1">
                            <span className="text-xs font-bold uppercase text-text-muted">Novo Total na Mesa {targetMesa.numero_mesa}</span>
                            <span className="text-xl font-black text-text-primary">{formatCurrency(newTotal)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 border-t border-border flex justify-end gap-3 bg-bg-tertiary/50">
                    <button 
                        onClick={onClose} 
                        disabled={isMerging}
                        className="px-4 py-2 rounded-lg font-bold text-text-secondary hover:bg-bg-tertiary transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={isMerging}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        <Combine className="w-5 h-5" />
                        Unir Mesas
                    </button>
                </div>
            </div>
        </div>
    );
}
