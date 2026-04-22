'use client';

import React, { useState, useMemo } from 'react';
import { X, Printer, ReceiptText, Clock, Users, History, PlusCircle, Minus, Plus, CreditCard, Banknote, QrCode, CheckCircle, Share, Info, Ticket } from 'lucide-react';
import { MesaMock } from '@/infra/mock/mesas';
import { categoriasCardapio, produtosCardapio } from '@/infra/mock/cardapio';
import { useFormatters } from '@/hooks/useFormatters';
import { cn } from '@/utils/utils';

interface MesaDetailsModalProps {
    mesa: MesaMock;
    onClose: () => void;
}

export const MesaDetailsModal: React.FC<MesaDetailsModalProps> = ({ mesa, onClose }) => {
    const { formatCurrency } = useFormatters();

    // Toggle view: 'detalhes' vs 'pagamento'
    const [view, setView] = useState<'detalhes' | 'pagamento'>(mesa.status === 'fechando' ? 'pagamento' : 'detalhes');

    const [activeCategory, setActiveCategory] = useState(categoriasCardapio[0].id);

    const filteredProducts = useMemo(() => {
        return produtosCardapio.filter(p => p.categoria_id === activeCategory);
    }, [activeCategory]);


    const allItems = mesa.itens_parciais;
    const totalItems = allItems.length;

    // Fees
    const subtotal = mesa.valor_parcial;
    const taxaServico = subtotal * 0.1;
    const desconto = 0; // mocked
    const totalFinal = subtotal + taxaServico - desconto;

    // Payment state
    const [splitCount, setSplitCount] = useState(1);
    const splitValue = splitCount > 0 ? totalFinal / splitCount : 0;
    const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
    const [valorRecebido, setValorRecebido] = useState<number | ''>('');

    const getStatusStyle = () => {
        switch (mesa.status) {
            case 'livre': return { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
            case 'ocupada': return { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
            case 'fechando': return { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
            case 'suja': return { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
            default: return { text: 'text-text-muted', bg: 'bg-bg-tertiary', border: 'border-border' };
        }
    };

    const s = getStatusStyle();

    return (
        <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-6 animate-fadeIn transition-all duration-300"
            onClick={onClose}
        >
            <div
                className={cn(
                    'bg-bg-primary flex flex-col overflow-hidden w-full h-full shadow-2xl relative',
                    'md:rounded-2xl md:h-[calc(100vh-3rem)] md:max-w-[1400px] md:mx-auto',
                    'animate-scaleIn'
                )}
                onClick={e => e.stopPropagation()}
            >
                {/* Minimal Header purely for modal closure and view switching */}
                <header className="flex items-center justify-between border-b border-border bg-bg-card/50 backdrop-blur-md px-6 py-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary p-2 rounded-xl text-white flex items-center justify-center shadow-md shadow-primary/20">
                            <ReceiptText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold leading-tight tracking-tight">Mesa {String(mesa.numero_mesa).padStart(2, '0')}</h2>
                            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                                {view === 'detalhes' ? 'Gerenciamento' : 'Fechamento de Conta'}
                            </p>
                        </div>
                    </div>
                    {totalItems > 0 && (
                        <div className="hidden md:flex flex-1 justify-center gap-8">
                            <div className="flex items-center gap-6">
                                <button
                                    className={cn("text-sm font-medium transition-colors", view === 'detalhes' ? "text-primary font-bold border-b-2 border-primary pb-1" : "text-text-secondary hover:text-primary")}
                                    onClick={() => setView('detalhes')}
                                >
                                    Resumo do Pedido
                                </button>
                                <button
                                    className={cn("text-sm font-medium transition-colors", view === 'pagamento' ? "text-primary font-bold border-b-2 border-primary pb-1" : "text-text-secondary hover:text-primary")}
                                    onClick={() => setView('pagamento')}
                                >
                                    Pagamento da Conta
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-4">
                        <div className="text-right mr-2 hidden sm:block">
                            <p className="text-[10px] text-text-muted uppercase font-bold">Total Parcial</p>
                            <p className="text-xl font-black text-primary">{formatCurrency(subtotal)}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-tertiary text-text-muted hover:bg-error/10 hover:text-error transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Content View Routing */}
                {view === 'detalhes' ? (
                    <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
                        {/* Main Content Area */}
                        <main className="flex-[1.5] lg:flex-2 flex flex-col overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-bg-primary">

                            {/* Table Title Status */}
                            <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-white text-3xl font-black tracking-tight">Mesa {String(mesa.numero_mesa).padStart(2, '0')}</h1>
                                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", s.bg, s.text, s.border)}>
                                            {mesa.status}
                                        </span>
                                    </div>
                                    <p className="text-text-muted text-sm font-medium flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Aberta em: {mesa.criado_em ? new Date(mesa.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button className="flex items-center gap-2 px-5 h-12 bg-bg-card text-text-primary rounded-lg font-bold hover:border-primary border border-border transition-all cursor-pointer">
                                        <Printer className="w-5 h-5" />
                                        <span className="hidden sm:inline">Imprimir Prévia</span>
                                    </button>
                                    <button
                                        className="flex items-center gap-2 px-5 h-12 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 cursor-pointer"
                                        onClick={() => setView('pagamento')}
                                    >
                                        <ReceiptText className="w-5 h-5" />
                                        <span>Fechar Mesa</span>
                                    </button>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                                <div className="flex flex-col gap-2 rounded-xl p-6 bg-bg-card border border-border">
                                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Total Consumido</p>
                                    <p className="text-white text-3xl font-bold">{formatCurrency(subtotal)}</p>
                                </div>
                                <div className="flex flex-col gap-2 rounded-xl p-6 bg-bg-card border border-border">
                                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Qtd. Pessoas</p>
                                    <p className="text-white text-3xl font-bold">{mesa.capacidade}</p>
                                </div>
                                <div className="flex flex-col gap-2 rounded-xl p-6 bg-bg-card border border-primary/30 shadow-lg shadow-primary/5">
                                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Garçom</p>
                                    <p className="text-white text-2xl font-bold truncate">{mesa.garcom || 'Nenhum'}</p>
                                </div>
                            </div>

                            {/* Orders Table */}
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-white text-xl font-bold">Itens do Pedido</h2>
                                <button className="text-primary font-bold text-xs hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer">
                                    <History className="w-4 h-4" /> Histórico completo
                                </button>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-border bg-bg-card shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-bg-primary/50 border-b border-border">
                                            <th className="px-6 py-4 text-text-muted font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">Item</th>
                                            <th className="px-6 py-4 text-text-muted font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">Qtd</th>
                                            <th className="px-6 py-4 text-text-muted font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">Valor Unit.</th>
                                            <th className="px-6 py-4 text-text-muted font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">Status</th>
                                            <th className="px-6 py-4 text-text-muted font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {allItems.map(item => (
                                            <tr key={item.id} className="hover:bg-bg-card-hover transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col min-w-[120px]">
                                                        <span className="text-white font-bold">{item.nome}</span>
                                                        <span className="text-text-muted text-xs truncate max-w-[200px]">{item.observacao || ''}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-white font-medium whitespace-nowrap">{String(item.quantidade).padStart(2, '0')}</td>
                                                <td className="px-6 py-4 text-white whitespace-nowrap">{formatCurrency(item.preco_total / item.quantidade)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.enviado_cozinha ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                                                            <span className="size-1.5 rounded-full bg-green-500"></span> Entregue
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                            <span className="size-1.5 rounded-full bg-yellow-500"></span> Em preparo
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-white font-bold whitespace-nowrap">{formatCurrency(item.preco_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {totalItems === 0 && (
                                    <div className="py-12 text-center text-text-muted">
                                        Nenhum item adicionado ainda.
                                    </div>
                                )}
                            </div>

                            {/* Spacer */}
                            <div className="h-8"></div>
                        </main>

                        {/* Right Sidebar: Quick Add */}
                        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-bg-card/50 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white text-lg font-bold">Adicionar Pedido</h3>
                                <PlusCircle className="text-text-muted w-5 h-5" />
                            </div>
                            {/* Tabs */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {categoriasCardapio.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                                            activeCategory === cat.id
                                                ? "bg-primary border-primary text-white"
                                                : "bg-bg-tertiary border-border text-text-muted hover:border-primary"
                                        )}
                                    >
                                        {cat.nome.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            {/* Product List */}
                            <div className="grid grid-cols-1 gap-4">
                                {filteredProducts.map(prod => (
                                    <div key={prod.id} className="group relative flex flex-col rounded-xl overflow-hidden bg-bg-card border border-border cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all">
                                        <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url('${prod.imagem_url}')` }}></div>
                                        <div className="p-3">
                                            <p className="text-white font-bold text-sm">{prod.nome}</p>
                                            <p className="text-primary font-bold text-base mt-0.5">{formatCurrency(prod.preco)}</p>
                                            <button className="mt-3 w-full py-2 bg-bg-tertiary text-text-primary rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 group-hover:bg-primary group-hover:text-white transition-colors uppercase tracking-wider cursor-pointer">
                                                <PlusCircle className="w-3.5 h-3.5" /> ADICIONAR
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                ) : (
                    /* ======== VIEW: PAGAMENTO ======== */
                    <div className="flex flex-1 overflow-y-auto p-4 md:p-6 lg:px-12 grid-cols-1 lg:grid-cols-12 md:grid gap-6 custom-scrollbar bg-bg-primary">
                        {/* Left Column: Summary & Splitting */}
                        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
                            {/* Order Summary */}
                            <section className="bg-bg-card rounded-xl border border-border overflow-hidden">
                                <div className="p-4 border-b border-border flex justify-between items-center">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <ReceiptText className="text-primary w-5 h-5" /> Itens Consumidos
                                    </h3>
                                    <span className="text-xs bg-bg-tertiary px-2 py-1 rounded font-medium">{totalItems} {totalItems === 1 ? 'Item' : 'Itens'}</span>
                                </div>
                                <div className="divide-y divide-border/50 max-h-80 overflow-y-auto custom-scrollbar">
                                    {allItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-4 hover:bg-bg-card-hover transition-colors">
                                            <div className="flex flex-col">
                                                <p className="font-semibold text-white">{item.nome}</p>
                                                <p className="text-xs text-text-muted">{item.quantidade}x {formatCurrency(item.preco_total / item.quantidade)}</p>
                                            </div>
                                            <p className="font-bold text-white">{formatCurrency(item.preco_total)}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Split Bill */}
                            <section className="bg-bg-card rounded-xl border border-border p-5">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <Users className="text-primary w-5 h-5" /> Dividir Conta
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                                        <p className="text-xs font-bold uppercase text-text-muted mb-2">Por Pessoa</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold hover:bg-primary hover:text-white transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
                                                <span className="text-lg font-bold w-6 text-center">{String(splitCount).padStart(2, '0')}</span>
                                                <button onClick={() => setSplitCount(splitCount + 1)} className="size-8 rounded-full bg-primary flex items-center justify-center text-white font-bold hover:bg-primary-dark transition-colors cursor-pointer"><Plus className="w-4 h-4" /></button>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-text-muted leading-none mb-1">Cada um paga</p>
                                                <p className="text-lg font-black text-primary">{formatCurrency(splitValue)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-border flex flex-col justify-center">
                                        <p className="text-xs font-bold uppercase text-text-muted mb-2">Valor Personalizado</p>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold">R$</span>
                                            <input type="number" placeholder="0,00" className="w-full bg-transparent border-border rounded-lg pl-10 focus:ring-primary focus:border-primary text-white" />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Totals & Payments */}
                        <div className="lg:col-span-5 flex flex-col gap-6 w-full mt-6 md:mt-0">
                            {/* Payment Methods */}
                            <section className="bg-bg-card rounded-xl border border-border p-5">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <CreditCard className="text-primary w-5 h-5" /> Método de Pagamento
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setSelectedPayment('credito')}
                                        className={cn("flex flex-col items-center justify-center p-4 rounded-xl border-2 gap-2 transition-all cursor-pointer", selectedPayment === 'credito' ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-bg-tertiary hover:border-primary/50 text-text-muted")}
                                    >
                                        <CreditCard className="w-6 h-6" />
                                        <span className="text-xs font-bold">Crédito</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedPayment('debito')}
                                        className={cn("flex flex-col items-center justify-center p-4 rounded-xl border-2 gap-2 transition-all cursor-pointer", selectedPayment === 'debito' ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-bg-tertiary hover:border-primary/50 text-text-muted")}
                                    >
                                        <CreditCard className="w-6 h-6" />
                                        <span className="text-xs font-bold">Débito</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedPayment('pix')}
                                        className={cn("flex flex-col items-center justify-center p-4 rounded-xl border-2 gap-2 transition-all cursor-pointer", selectedPayment === 'pix' ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-bg-tertiary hover:border-primary/50 text-text-muted")}
                                    >
                                        <QrCode className="w-6 h-6" />
                                        <span className="text-xs font-bold">PIX</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedPayment('dinheiro')}
                                        className={cn("flex flex-col items-center justify-center p-4 rounded-xl border-2 gap-2 transition-all cursor-pointer", selectedPayment === 'dinheiro' ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-bg-tertiary hover:border-primary/50 text-text-muted")}
                                    >
                                        <Banknote className="w-6 h-6" />
                                        <span className="text-xs font-bold">Dinheiro</span>
                                    </button>
                                </div>
                                {selectedPayment === 'dinheiro' && (
                                    <div className="mt-4 p-4 border border-border rounded-xl bg-bg-tertiary animate-fadeIn">
                                        <label className="text-xs font-bold uppercase text-text-muted mb-2 block">
                                            Valor Recebido do Cliente (R$)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold">R$</span>
                                            <input
                                                type="number"
                                                value={valorRecebido}
                                                onChange={(e) => setValorRecebido(e.target.value ? Number(e.target.value) : '')}
                                                placeholder="Ex: 50.00"
                                                step="0.01"
                                                className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2 focus:ring-primary focus:border-primary text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Ticket / Discount */}
                            <div className="bg-bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                                <Ticket className="text-text-muted w-5 h-5" />
                                <input type="text" placeholder="Código de desconto..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-0 text-white placeholder:text-text-muted" />
                                <button className="text-primary text-xs font-bold uppercase tracking-tight hover:underline cursor-pointer">Aplicar</button>
                            </div>

                            {/* Summary & Confirm */}
                            <section className="bg-bg-card rounded-xl border border-border p-5 mt-auto">
                                <div className="space-y-3 mb-5">
                                    <div className="flex justify-between text-text-muted text-sm">
                                        <span>Subtotal</span>
                                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-text-muted text-sm">
                                        <div className="flex items-center gap-1">
                                            <span>Taxa de Serviço (10%)</span>
                                            <Info className="w-3.5 h-3.5 text-text-muted" />
                                        </div>
                                        <span className="font-medium">{formatCurrency(taxaServico)}</span>
                                    </div>
                                    {desconto > 0 && (
                                        <div className="flex justify-between text-emerald-500 text-sm font-medium">
                                            <span>Descontos</span>
                                            <span>- {formatCurrency(desconto)}</span>
                                        </div>
                                    )}
                                    <div className="h-px bg-border my-2"></div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-medium text-white">Total Final</span>
                                        <span className="text-3xl font-black text-primary">{formatCurrency(totalFinal)}</span>
                                    </div>
                                    {selectedPayment === 'dinheiro' && typeof valorRecebido === 'number' && valorRecebido >= totalFinal && (
                                        <div className="flex justify-between items-end mt-2 pt-3 border-t border-border/50 animate-fadeIn">
                                            <span className="text-lg font-bold text-text-muted">Troco</span>
                                            <span className="text-2xl font-black text-emerald-500">{formatCurrency(valorRecebido - totalFinal)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                        disabled={!selectedPayment}
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Confirmar Pagamento
                                    </button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button className="bg-bg-tertiary hover:bg-bg-card-hover text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-border">
                                            <Printer className="w-4 h-4" /> Imprimir
                                        </button>
                                        <button className="bg-bg-tertiary hover:bg-bg-card-hover text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-border">
                                            <Share className="w-4 h-4" /> Enviar NF-e
                                        </button>
                                    </div>
                                </div>
                            </section>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
