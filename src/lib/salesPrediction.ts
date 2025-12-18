// Sales Prediction Utility
// Simple algorithm based on historical data patterns

export interface PredictionData {
    predictedRevenue: number;
    predictedOrders: number;
    confidence: 'low' | 'medium' | 'high';
    basedOn: string;
}

interface HistoricalData {
    date: string;
    dayOfWeek: number;
    hour?: number;
    revenue: number;
    orders: number;
}

/**
 * Calculate average values for a specific day of week
 */
function calculateDayOfWeekAverages(data: HistoricalData[]): Record<number, { avgRevenue: number; avgOrders: number; count: number }> {
    const dayStats: Record<number, { totalRevenue: number; totalOrders: number; count: number }> = {};

    for (let i = 0; i < 7; i++) {
        dayStats[i] = { totalRevenue: 0, totalOrders: 0, count: 0 };
    }

    data.forEach(d => {
        dayStats[d.dayOfWeek].totalRevenue += d.revenue;
        dayStats[d.dayOfWeek].totalOrders += d.orders;
        dayStats[d.dayOfWeek].count++;
    });

    const averages: Record<number, { avgRevenue: number; avgOrders: number; count: number }> = {};
    for (let i = 0; i < 7; i++) {
        const stats = dayStats[i];
        averages[i] = {
            avgRevenue: stats.count > 0 ? stats.totalRevenue / stats.count : 0,
            avgOrders: stats.count > 0 ? stats.totalOrders / stats.count : 0,
            count: stats.count
        };
    }

    return averages;
}

/**
 * Calculate trend multiplier based on recent performance
 * Optimized: Uses partial selection instead of full sort when possible
 */
function calculateTrendMultiplier(data: HistoricalData[]): number {
    if (data.length < 14) return 1;

    // Sort only once and take what we need - O(n log n) but necessary for date ordering
    // Pre-sorted data from caller could optimize this further
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate averages using reduce for single pass - O(14) = O(1)
    const recent7DaysTotal = sortedData.slice(0, 7).reduce((sum, d) => sum + d.revenue, 0);
    const previous7DaysTotal = sortedData.slice(7, 14).reduce((sum, d) => sum + d.revenue, 0);

    const recentAvg = recent7DaysTotal / 7;
    const previousAvg = previous7DaysTotal / 7;

    if (previousAvg === 0) return 1;

    const trend = recentAvg / previousAvg;

    // Limit trend multiplier to reasonable range
    return Math.max(0.7, Math.min(1.3, trend));
}

/**
 * Determine confidence level based on available data
 */
function determineConfidence(dataCount: number, dayCount: number): 'low' | 'medium' | 'high' {
    if (dataCount < 7 || dayCount < 2) return 'low';
    if (dataCount < 21 || dayCount < 3) return 'medium';
    return 'high';
}

/**
 * Generate sales prediction for a specific date
 */
export function predictSalesForDate(
    historicalData: HistoricalData[],
    targetDate: Date = new Date()
): PredictionData {
    const dayOfWeek = targetDate.getDay();
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    if (historicalData.length === 0) {
        return {
            predictedRevenue: 0,
            predictedOrders: 0,
            confidence: 'low',
            basedOn: 'Sem dados históricos'
        };
    }

    const dayAverages = calculateDayOfWeekAverages(historicalData);
    const trendMultiplier = calculateTrendMultiplier(historicalData);
    const dayData = dayAverages[dayOfWeek];

    const predictedRevenue = dayData.avgRevenue * trendMultiplier;
    const predictedOrders = Math.round(dayData.avgOrders * trendMultiplier);
    const confidence = determineConfidence(historicalData.length, dayData.count);

    return {
        predictedRevenue,
        predictedOrders,
        confidence,
        basedOn: `${dayData.count} ${dayNames[dayOfWeek]}${dayData.count !== 1 ? 's' : ''} anteriores`
    };
}

/**
 * Generate prediction for the remaining hours of today
 */
export function predictRemainingToday(
    historicalData: HistoricalData[],
    currentRevenue: number,
    currentOrders: number
): PredictionData {
    const now = new Date();
    const currentHour = now.getHours();
    const hoursRemaining = 24 - currentHour;

    if (hoursRemaining <= 0 || historicalData.length === 0) {
        return {
            predictedRevenue: currentRevenue,
            predictedOrders: currentOrders,
            confidence: 'high',
            basedOn: 'Dia finalizado'
        };
    }

    // Get full day prediction
    const fullDayPrediction = predictSalesForDate(historicalData, now);

    // Estimate percentage of day remaining based on typical business hours
    // Assume peak hours are 11-14 and 18-21
    const hourWeights: Record<number, number> = {
        0: 0.01, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
        6: 0.02, 7: 0.03, 8: 0.04, 9: 0.05, 10: 0.06,
        11: 0.08, 12: 0.10, 13: 0.09, 14: 0.07,
        15: 0.05, 16: 0.05, 17: 0.06, 18: 0.08, 19: 0.09, 20: 0.08,
        21: 0.06, 22: 0.04, 23: 0.02
    };

    let completedWeight = 0;
    for (let h = 0; h < currentHour; h++) {
        completedWeight += hourWeights[h] || 0.04;
    }

    const remainingPercentage = 1 - completedWeight;

    // Calculate predicted additional revenue/orders
    const additionalRevenue = fullDayPrediction.predictedRevenue * remainingPercentage;
    const additionalOrders = Math.round(fullDayPrediction.predictedOrders * remainingPercentage);

    return {
        predictedRevenue: currentRevenue + additionalRevenue,
        predictedOrders: currentOrders + additionalOrders,
        confidence: fullDayPrediction.confidence,
        basedOn: `Tendência + ${hoursRemaining}h restantes`
    };
}

/**
 * Generate weekly prediction
 */
export function predictWeek(
    historicalData: HistoricalData[],
    startDate: Date = new Date()
): PredictionData[] {
    const predictions: PredictionData[] = [];

    for (let i = 0; i < 7; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + i);
        predictions.push(predictSalesForDate(historicalData, targetDate));
    }

    return predictions;
}

/**
 * Get peak hours prediction based on historical data
 */
export function predictPeakHours(
    historicalData: { hour: number; orders: number }[]
): { hour: number; expectedOrders: number }[] {
    const hourStats: Record<number, { total: number; count: number }> = {};

    for (let i = 0; i < 24; i++) {
        hourStats[i] = { total: 0, count: 0 };
    }

    historicalData.forEach(d => {
        if (d.hour !== undefined) {
            hourStats[d.hour].total += d.orders;
            hourStats[d.hour].count++;
        }
    });

    const predictions = Object.entries(hourStats)
        .map(([hour, stats]) => ({
            hour: parseInt(hour),
            expectedOrders: stats.count > 0 ? Math.round(stats.total / stats.count) : 0
        }))
        .sort((a, b) => b.expectedOrders - a.expectedOrders)
        .slice(0, 5);

    return predictions;
}

/**
 * Format confidence level for display
 */
export function getConfidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
    const labels = {
        low: 'Baixa confiança',
        medium: 'Média confiança',
        high: 'Alta confiança'
    };
    return labels[confidence];
}

/**
 * Format confidence as percentage
 */
export function getConfidencePercentage(confidence: 'low' | 'medium' | 'high'): number {
    const percentages = {
        low: 40,
        medium: 70,
        high: 90
    };
    return percentages[confidence];
}
