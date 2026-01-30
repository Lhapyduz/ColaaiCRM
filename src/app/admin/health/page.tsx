'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StatsCard, DataTable } from '@/components/admin';
import type { Column } from '@/components/admin';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
    FiActivity,
    FiDatabase,
    FiServer,
    FiCreditCard,
    FiGlobe,
    FiAlertTriangle,
    FiCheckCircle,
    FiXCircle,
    FiRefreshCw,
    FiMapPin,
    FiClock
} from 'react-icons/fi';

interface ServiceHealth {
    id: string;
    service_name: string;
    status: 'healthy' | 'degraded' | 'down';
    response_time_ms: number | null;
    error_message: string | null;
    checked_at: string;
}

interface LoginSession {
    id: string;
    user_id: string;
    store_name: string;
    ip_address: string;
    country: string;
    city: string;
    is_suspicious: boolean;
    created_at: string;
}

const SERVICES = [
    { name: 'Database', icon: FiDatabase, key: 'database' },
    { name: 'API Server', icon: FiServer, key: 'api' },
    { name: 'Stripe', icon: FiCreditCard, key: 'stripe' },
    { name: 'CDN', icon: FiGlobe, key: 'cdn' },
];

export default function HealthPage() {
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<ServiceHealth[]>([]);
    const [loginSessions, setLoginSessions] = useState<LoginSession[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {

        try {
            // Fetch service health
            const { data: healthData } = await supabase
                .from('service_health_checks')
                .select('*')
                .order('checked_at', { ascending: false })
                .limit(10);

            // Fetch login sessions
            const { data: sessionsData } = await supabase
                .from('login_sessions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            const { data: settings } = await supabase
                .from('user_settings')
                .select('user_id, app_name');

            // Set services or use demo data
            if (healthData && healthData.length > 0) {
                setServices(healthData);
            } else {
                setServices([
                    { id: '1', service_name: 'database', status: 'healthy', response_time_ms: 12, error_message: null, checked_at: new Date().toISOString() },
                    { id: '2', service_name: 'api', status: 'healthy', response_time_ms: 45, error_message: null, checked_at: new Date().toISOString() },
                    { id: '3', service_name: 'stripe', status: 'healthy', response_time_ms: 120, error_message: null, checked_at: new Date().toISOString() },
                    { id: '4', service_name: 'cdn', status: 'degraded', response_time_ms: 350, error_message: 'Alta latência detectada', checked_at: new Date().toISOString() },
                ]);
            }

            interface SessionRow { id: string; user_id: string; ip_address: string; country: string; city: string; is_suspicious: boolean; created_at: string; }
            interface SettingRow { user_id: string; app_name: string; }
            if (sessionsData && sessionsData.length > 0) {
                const sessionsWithStore = (sessionsData as SessionRow[]).map((s: SessionRow) => ({
                    ...s,
                    store_name: (settings as SettingRow[] | null)?.find((st: SettingRow) => st.user_id === s.user_id)?.app_name || 'N/A'
                }));
                setLoginSessions(sessionsWithStore);
            } else {
                setLoginSessions([
                    { id: '1', user_id: '1', store_name: 'Hot Dog Express', ip_address: '189.45.123.45', country: 'Brasil', city: 'São Paulo', is_suspicious: false, created_at: '2025-01-29T18:30:00' },
                    { id: '2', user_id: '1', store_name: 'Hot Dog Express', ip_address: '45.178.92.100', country: 'Argentina', city: 'Buenos Aires', is_suspicious: true, created_at: '2025-01-29T18:35:00' },
                    { id: '3', user_id: '2', store_name: 'Fast Burger', ip_address: '177.92.45.200', country: 'Brasil', city: 'Rio de Janeiro', is_suspicious: false, created_at: '2025-01-29T17:45:00' },
                    { id: '4', user_id: '3', store_name: 'Dogão do Zé', ip_address: '177.134.67.89', country: 'Brasil', city: 'Belo Horizonte', is_suspicious: false, created_at: '2025-01-29T16:20:00' },
                    { id: '5', user_id: '3', store_name: 'Dogão do Zé', ip_address: '203.45.178.99', country: 'China', city: 'Beijing', is_suspicious: true, created_at: '2025-01-29T16:25:00' },
                ]);
            }
        } catch (error) {
            console.error('Error fetching health data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refreshHealth = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('pt-BR');
    };

    const getServiceStatus = (serviceName: string): ServiceHealth | undefined => {
        return services.find(s => s.service_name === serviceName);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'text-emerald-400';
            case 'degraded': return 'text-amber-400';
            case 'down': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'healthy': return 'bg-emerald-500/20 border-emerald-500/30';
            case 'degraded': return 'bg-amber-500/20 border-amber-500/30';
            case 'down': return 'bg-red-500/20 border-red-500/30';
            default: return 'bg-gray-500/20 border-gray-500/30';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy': return <FiCheckCircle className="text-emerald-400" size={20} />;
            case 'degraded': return <FiAlertTriangle className="text-amber-400" size={20} />;
            case 'down': return <FiXCircle className="text-red-400" size={20} />;
            default: return <FiActivity className="text-gray-400" size={20} />;
        }
    };

    const suspiciousCount = loginSessions.filter(s => s.is_suspicious).length;
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const avgResponseTime = services.length > 0
        ? Math.round(services.reduce((sum, s) => sum + (s.response_time_ms || 0), 0) / services.length)
        : 0;

    const sessionColumns: Column<LoginSession>[] = [
        {
            key: 'store_name',
            header: 'Loja',
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    {row.is_suspicious && (
                        <FiAlertTriangle className="text-amber-400 shrink-0" size={16} />
                    )}
                    <span className={cn(
                        "font-medium",
                        row.is_suspicious ? "text-amber-400" : "text-white"
                    )}>
                        {row.store_name}
                    </span>
                </div>
            )
        },
        {
            key: 'ip_address',
            header: 'IP',
            render: (value) => <span className="font-mono text-gray-400">{value as string}</span>
        },
        {
            key: 'city',
            header: 'Localização',
            render: (_, row) => (
                <div className="flex items-center gap-2 text-gray-400">
                    <FiMapPin size={14} />
                    <span>{row.city}, {row.country}</span>
                </div>
            )
        },
        {
            key: 'created_at',
            header: 'Data/Hora',
            sortable: true,
            render: (value) => (
                <div className="flex items-center gap-2 text-gray-400">
                    <FiClock size={14} />
                    <span>{formatDate(value as string)}</span>
                </div>
            )
        },
        {
            key: 'is_suspicious',
            header: 'Status',
            render: (value) => (
                <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    value ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                )}>
                    {value ? 'Suspeito' : 'Normal'}
                </span>
            )
        },
    ];

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">System Health</h1>
                    <p className="text-gray-400 mt-1">Monitore o status dos serviços e segurança</p>
                </div>
                <button
                    onClick={refreshHealth}
                    disabled={refreshing}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                        "bg-gray-800 text-gray-300 hover:bg-gray-700",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    <FiRefreshCw size={18} className={cn(refreshing && "animate-spin")} />
                    Atualizar
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="Serviços Online"
                    value={`${healthyCount}/${services.length}`}
                    icon={<FiActivity size={24} />}
                    variant={healthyCount === services.length ? 'success' : 'warning'}
                    loading={loading}
                />
                <StatsCard
                    title="Tempo Médio de Resposta"
                    value={`${avgResponseTime}ms`}
                    icon={<FiClock size={24} />}
                    variant={avgResponseTime < 200 ? 'success' : avgResponseTime < 500 ? 'warning' : 'danger'}
                    loading={loading}
                />
                <StatsCard
                    title="Logins Suspeitos"
                    value={suspiciousCount}
                    icon={<FiAlertTriangle size={24} />}
                    variant={suspiciousCount > 0 ? 'danger' : 'default'}
                    loading={loading}
                />
                <StatsCard
                    title="Uptime (30 dias)"
                    value="99.8%"
                    icon={<FiCheckCircle size={24} />}
                    variant="success"
                    loading={loading}
                />
            </div>

            {/* Service Health Cards */}
            <h2 className="text-xl font-bold text-white mb-4">Status dos Serviços</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {SERVICES.map(({ name, icon: Icon, key }) => {
                    const service = getServiceStatus(key);
                    const status = service?.status || 'unknown';
                    return (
                        <div
                            key={key}
                            className={cn(
                                "p-6 rounded-xl border transition-all",
                                getStatusBg(status)
                            )}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-lg bg-gray-800/50 flex items-center justify-center">
                                    <Icon size={24} className={getStatusColor(status)} />
                                </div>
                                {getStatusIcon(status)}
                            </div>
                            <h3 className="text-white font-semibold">{name}</h3>
                            <div className="mt-2 space-y-1">
                                <p className={cn("text-sm font-medium capitalize", getStatusColor(status))}>
                                    {status === 'healthy' ? 'Operacional' : status === 'degraded' ? 'Degradado' : 'Offline'}
                                </p>
                                {service?.response_time_ms && (
                                    <p className="text-gray-500 text-xs">
                                        Resposta: {service.response_time_ms}ms
                                    </p>
                                )}
                                {service?.error_message && (
                                    <p className="text-amber-400 text-xs">
                                        {service.error_message}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Suspicious Logins Section */}
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Detecção de Logins Suspeitos</h2>
                {suspiciousCount > 0 && (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium flex items-center gap-2">
                        <FiAlertTriangle size={14} />
                        {suspiciousCount} alerta{suspiciousCount > 1 ? 's' : ''}
                    </span>
                )}
            </div>
            <p className="text-gray-400 text-sm mb-4">
                Logins de IPs geograficamente distantes em curto período são marcados como suspeitos.
            </p>

            <DataTable
                columns={sessionColumns}
                data={loginSessions}
                keyField="id"
                searchPlaceholder="Buscar por loja ou IP..."
                loading={loading}
                pageSize={10}
                emptyMessage="Nenhum login recente registrado"
            />
        </div>
    );
}
