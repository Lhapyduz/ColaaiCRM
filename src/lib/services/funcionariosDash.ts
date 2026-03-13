import { supabase } from '../supabase';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface EmployeeDashboardMetrics {
    dailyTotal: number;
    dailyCount: number;
    weeklyTotal: number;
    weeklyCount: number;
    monthlyTotal: number;
    monthlyCount: number;
    monthlyChartData: { date: string; amount: number }[];
    recentActivity: { id: string; date: string; type: string; amount: number; description: string }[];
}

export async function getEmployeeMetrics(
    employeeId: string,
    role: string,
    userId: string
): Promise<EmployeeDashboardMetrics> {
    const now = new Date();

    // Intervalos
    const sDay = startOfDay(now).toISOString();
    const eDay = endOfDay(now).toISOString();
    const sWeek = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const eWeek = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const sMonth = startOfMonth(now).toISOString();
    const eMonth = endOfMonth(now).toISOString();

    // Identificar a coluna e o campo de ganho
    let roleColumn = '';
    let feeColumn = '';
    let activityName = '';

    if (role === 'attendant' || role === 'garcom') {
        roleColumn = 'garcom_id';
        feeColumn = 'service_fee';
        activityName = 'Mesa Atendida';
    } else if (role === 'delivery' || role === 'entregador') {
        roleColumn = 'entregador_id';
        feeColumn = 'delivery_fee';
        activityName = 'Entrega';
    }

    const defaultMetrics = {
        dailyTotal: 0, dailyCount: 0,
        weeklyTotal: 0, weeklyCount: 0,
        monthlyTotal: 0, monthlyCount: 0,
        monthlyChartData: [],
        recentActivity: []
    };

    if (!roleColumn) return defaultMetrics;

    // Buscar pedidos associados ao funcionário deste mês (já contempla a semana e dia atual)
    const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`id, created_at, customer_name, order_number, ${feeColumn}`)
        .eq('user_id', userId)
        .eq(roleColumn, employeeId)
        .gte('created_at', sMonth)
        .lte('created_at', eMonth)
        .order('created_at', { ascending: false });

    if (error || !ordersData) return defaultMetrics;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = ordersData as any[];

    let dailyTotal = 0, dailyCount = 0;
    let weeklyTotal = 0, weeklyCount = 0;
    let monthlyTotal = 0;
    const monthlyCount = orders.length;

    // Para o gráfico
    const chartMap: Record<string, number> = {};
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
    daysInMonth.forEach((d: Date) => {
        chartMap[format(d, 'yyyy-MM-dd')] = 0;
    });

    const recentActivity: EmployeeDashboardMetrics['recentActivity'] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orders.forEach((order: any) => {
        const orderDate = new Date(order.created_at);
        const orderIso = orderDate.toISOString();
        const dateKey = format(orderDate, 'yyyy-MM-dd');
        const fee = Number(order[feeColumn]) || 0;

        monthlyTotal += fee;

        if (chartMap[dateKey] !== undefined) {
            chartMap[dateKey] += fee;
        }

        if (orderIso >= sWeek && orderIso <= eWeek) {
            weeklyTotal += fee;
            weeklyCount++;
        }

        if (orderIso >= sDay && orderIso <= eDay) {
            dailyTotal += fee;
            dailyCount++;
        }

        // Popular atividade recente (ultimas 5 operacoes de maior valor ou simplesmente por ordem decrescente)
        if (recentActivity.length < 10) {
            recentActivity.push({
                id: order.id,
                date: order.created_at,
                type: activityName,
                amount: fee,
                description: `${activityName} - ${order.customer_name || 'Pedido #' + order.order_number}`
            });
        }
    });

    const monthlyChartData = daysInMonth.map((d: Date) => {
        const key = format(d, 'yyyy-MM-dd');
        return {
            date: format(d, 'dd MMM', { locale: ptBR }),
            amount: chartMap[key] || 0
        };
    });

    return {
        dailyTotal,
        dailyCount,
        weeklyTotal,
        weeklyCount,
        monthlyTotal,
        monthlyCount,
        monthlyChartData,
        recentActivity
    };
}
