'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiPrinter, FiUser, FiBriefcase, FiClock } from 'react-icons/fi';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeMetrics, EmployeeDashboardMetrics } from '@/lib/services/funcionariosDash';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EditEmployeeSheet, { EmployeeData } from '@/components/funcionarios/EditEmployeeSheet';

// Inteface EmployeeData imports de EditEmployeeSheet

export default function EmployeeProfile({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { user } = useAuth();

    // Resolvemos a Promise para o acesso correto ao 'id' no Next 15+
    const resolvedParams = use(params);
    const employeeId = resolvedParams.id;

    const [employee, setEmployee] = useState<EmployeeData | null>(null);
    const [metrics, setMetrics] = useState<EmployeeDashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);

    useEffect(() => {
        async function loadData() {
            if (!user) return;

            const { data: emp, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('id', employeeId)
                .eq('user_id', user.id)
                .single();

            if (empError || !emp) {
                console.error('Erro ao buscar funcionário:', empError);
                router.push('/funcionarios');
                return;
            }

            setEmployee(emp);

            // Carregar as métricas de comissões se for motoboy ou garçom
            const dashMetrics = await getEmployeeMetrics(employeeId, emp.role, user.id);
            setMetrics(dashMetrics);

            setLoading(false);
        }

        loadData();
    }, [employeeId, user, router]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-text-secondary animate-pulse text-lg">Carregando painel do funcionário...</p>
            </div>
        );
    }

    if (!employee) return null;

    const roleLabels: Record<string, string> = {
        admin: 'Admin', manager: 'Gerente', cashier: 'Caixa',
        kitchen: 'Cozinha', attendant: 'Atendente', garcom: 'Garçom',
        delivery: 'Entregador', entregador: 'Entregador'
    };

    const label = (roleLabels[employee.role] || employee.role).toUpperCase();

    // Stats Mocks format
    const pedidosAtendidos = metrics?.monthlyCount || 1284;
    const avaliacaoMedia = 4.8;
    const assiduidade = "98%";
    const comissoesAcumuladas = metrics?.monthlyTotal || 320.00;

    return (
        <div className="w-full max-w-6xl mx-auto p-6 space-y-6 text-sm">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/funcionarios')}
                        className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-primary hover:bg-bg-tertiary/80 transition-colors border border-border"
                    >
                        <FiArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-text-primary">Perfil do Funcionário</h1>
                        <p className="text-text-muted text-xs">Visualizando detalhes de {employee.name}</p>
                    </div>
                </div>
                <div className="flex w-full md:w-auto gap-3 flex-wrap">
                    <Button variant="ghost" className="flex-1 md:flex-none border border-border text-text-secondary hover:text-text-primary h-10 px-4 flex items-center justify-center gap-2 min-w-max">
                        <FiPrinter size={16} /> Imprimir Ficha
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setIsEditOpen(true)}
                        className="flex-1 md:flex-none bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-10 px-5 font-semibold min-w-max"
                    >
                        Editar Perfil
                    </Button>
                </div>
            </div>

            {/* Top Card (Avatar + Stats) */}
            <Card className="bg-[#1e1e24] border-0 p-6 md:p-8 flex flex-col lg:flex-row gap-8 lg:items-center justify-between shadow-lg">
                {/* Avatar Info */}
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
                    <div className="w-24 h-24 rounded-2xl bg-bg-secondary border-2 border-purple-500 flex items-center justify-center text-4xl text-text-primary shadow-lg overflow-hidden shrink-0">
                        {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-white">{employee.name}</h2>
                            {employee.is_active ? (
                                <span className="bg-green-500/10 text-green-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-green-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> ATIVO
                                </span>
                            ) : (
                                <span className="bg-red-500/10 text-red-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-red-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> INATIVO
                                </span>
                            )}
                            <span className="bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-purple-500/20 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full border-[1.5px] border-purple-400"></span> {label}
                            </span>
                        </div>
                        <p className="text-text-muted text-sm">
                            Membro da equipe desde {format(new Date(employee.created_at || new Date()), "MMMM 'de' yyyy", { locale: ptBR })} • ID: #{(employee.id || '').slice(0, 4).toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto">
                    <div className="bg-bg-tertiary/50 p-4 rounded-xl border border-border/40">
                        <p className="text-xs text-text-muted mb-1 font-medium">Pedidos Atendidos</p>
                        <p className="text-xl font-bold text-white">{pedidosAtendidos.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="bg-bg-tertiary/50 p-4 rounded-xl border border-border/40">
                        <p className="text-xs text-text-muted mb-1 font-medium">Avaliação Média</p>
                        <p className="text-xl font-bold text-yellow-500 flex items-center gap-1">
                            {avaliacaoMedia} <span className="text-base leading-none">★</span>
                        </p>
                    </div>
                    <div className="bg-bg-tertiary/50 p-4 rounded-xl border border-border/40">
                        <p className="text-xs text-text-muted mb-1 font-medium">Assiduidade</p>
                        <p className="text-xl font-bold text-green-500">{assiduidade}</p>
                    </div>
                    <div className="bg-bg-tertiary/50 p-4 rounded-xl border border-border/40">
                        <p className="text-xs text-text-muted mb-1 font-medium">Comissões Acumuladas</p>
                        <p className="text-xl font-bold text-purple-400">R$ {comissoesAcumuladas.toFixed(2).replace('.', ',')}</p>
                    </div>
                </div>
            </Card>

            {/* Informações Section Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações Pessoais */}
                <Card className="bg-[#1e1e24] border-0 p-6 shadow-lg">
                    <h3 className="font-semibold text-base flex items-center gap-2 mb-6 text-purple-400">
                        <FiUser size={18} /> Informações Pessoais
                    </h3>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">Nome Completo</span>
                            <span className="font-medium text-white sm:text-right break-all">{employee.name}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">CPF</span>
                            <span className="font-medium text-white sm:text-right break-all">{employee.cpf || 'Não informado'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">Data de Nascimento</span>
                            <span className="font-medium text-white sm:text-right break-all">{employee.data_nascimento || 'Não informado'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">Email</span>
                            <span className="font-medium text-white sm:text-right break-all">{employee.email || 'Não informado'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">Telefone</span>
                            <span className="font-medium text-white sm:text-right break-all">{employee.phone || 'Não informado'}</span>
                        </div>
                    </div>
                </Card>

                {/* Dados Profissionais */}
                <Card className="bg-[#1e1e24] border-0 p-6 shadow-lg">
                    <h3 className="font-semibold text-base flex items-center gap-2 mb-6 text-green-500">
                        <FiBriefcase size={18} /> Dados Profissionais
                    </h3>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">Data de Admissão</span>
                            <span className="font-medium text-white sm:text-right break-all">{format(new Date(employee.created_at || new Date()), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">Salário Base</span>
                            <span className="font-medium text-white sm:text-right break-all">R$ {(employee.salario_fixo || 0).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">Turno</span>
                            <span className="font-medium text-white sm:text-right break-all">{employee.turno || 'Não informado'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">Departamento</span>
                            <span className="font-medium text-white sm:text-right break-all">{employee.departamento || 'Não atribuído'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm border-b border-border/20 pb-3 gap-1 sm:gap-0">
                            <span className="text-text-muted">Contrato</span>
                            <span className="font-medium text-white sm:text-right break-all">{employee.contrato || (employee.is_fixed ? 'CLT' : 'Freelancer')}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Atividades Recentes */}
            <Card className="bg-[#1e1e24] border-0 p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-base flex items-center gap-2 text-white">
                        <FiClock size={18} className="text-text-muted" /> Atividades Recentes
                    </h3>
                    <button className="text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors">
                        Ver tudo
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                            <tr className="bg-bg-primary/30 border-b border-border/20">
                                <th className="px-4 py-3 rounded-tl-lg">Data / Hora</th>
                                <th className="px-4 py-3">Ação Realizada</th>
                                <th className="px-4 py-3">Módulo</th>
                                <th className="px-4 py-3 rounded-tr-lg">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border/10 hover:bg-bg-tertiary/20 transition-colors">
                                <td className="px-4 py-4 text-white">Hoje, 19:42</td>
                                <td className="px-4 py-4 text-white">Pedido #4521 finalizado</td>
                                <td className="px-4 py-4">
                                    <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded text-xs font-medium border border-blue-500/20">Vendas</span>
                                </td>
                                <td className="px-4 py-4 text-green-500 font-medium">Sucesso</td>
                            </tr>
                            <tr className="border-b border-border/10 hover:bg-bg-tertiary/20 transition-colors">
                                <td className="px-4 py-4 text-white">Hoje, 18:15</td>
                                <td className="px-4 py-4 text-white">Login no sistema (Terminal 02)</td>
                                <td className="px-4 py-4">
                                    <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded text-xs font-medium border border-indigo-500/20">Sistema</span>
                                </td>
                                <td className="px-4 py-4 text-green-500 font-medium">Sucesso</td>
                            </tr>
                            <tr className="border-b border-border/10 hover:bg-bg-tertiary/20 transition-colors">
                                <td className="px-4 py-4 text-white">Ontem, 23:55</td>
                                <td className="px-4 py-4 text-white">Fechamento de Caixa realizado</td>
                                <td className="px-4 py-4">
                                    <span className="bg-pink-500/10 text-pink-400 px-2.5 py-1 rounded text-xs font-medium border border-pink-500/20">Financeiro</span>
                                </td>
                                <td className="px-4 py-4 text-green-500 font-medium">Concluído</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>
            {/* MODAL DE EDIÇÃO */}
            <EditEmployeeSheet
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                employee={employee}
                onSave={async (updatedData) => {
                    const { error } = await supabase
                        .from('employees')
                        .update(updatedData)
                        .eq('id', employee.id);

                    if (error) {
                        console.error('Erro ao atualizar', JSON.stringify(error, null, 2), error.message);
                        alert(`Não foi possível salvar as alterações: ${error.message || 'Erro desconhecido'}`);
                        return;
                    }

                    // Atualiza local state
                    setEmployee({ ...employee, ...updatedData } as EmployeeData);
                }}
            />
        </div>
    );
}
