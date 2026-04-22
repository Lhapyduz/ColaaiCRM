import { describe, it, expect } from 'vitest';
import {
    predictSalesForDate,
    predictWeek,
    getConfidenceLabel,
    getConfidencePercentage,
    predictPeakHours,
} from '../salesPrediction';

// Helper: gera dados históricos simulados
function generateHistoricalData(days: number) {
    const data = [];
    const baseDate = new Date('2026-01-01');

    for (let i = 0; i < days; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
        const dayOfWeek = date.getDay();

        // Simula mais vendas nos fins de semana
        const weekendBonus = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.5 : 1;

        data.push({
            date: date.toISOString().split('T')[0],
            dayOfWeek,
            revenue: Math.round(500 * weekendBonus + Math.random() * 200),
            orders: Math.round(20 * weekendBonus + Math.random() * 10),
        });
    }

    return data;
}

describe('predictSalesForDate', () => {
    it('retorna previsão com dados vazios', () => {
        const prediction = predictSalesForDate([], new Date());
        expect(prediction.predictedRevenue).toBe(0);
        expect(prediction.predictedOrders).toBe(0);
        expect(prediction.confidence).toBe('low');
    });

    it('retorna previsão com dados limitados (confiança baixa)', () => {
        const data = generateHistoricalData(5);
        const prediction = predictSalesForDate(data, new Date());
        expect(prediction.confidence).toBe('low');
    });

    it('retorna previsão com dados suficientes (confiança média/alta)', () => {
        const data = generateHistoricalData(30);
        const prediction = predictSalesForDate(data, new Date());
        expect(['medium', 'high']).toContain(prediction.confidence);
        expect(prediction.predictedRevenue).toBeGreaterThan(0);
        expect(prediction.predictedOrders).toBeGreaterThan(0);
    });

    it('previsão baseada no dia correto', () => {
        const data = generateHistoricalData(30);
        const prediction = predictSalesForDate(data, new Date());
        expect(prediction.basedOn).toBeDefined();
        expect(prediction.basedOn.length).toBeGreaterThan(0);
    });
});

describe('predictWeek', () => {
    it('retorna 7 previsões', () => {
        const data = generateHistoricalData(30);
        const predictions = predictWeek(data);
        expect(predictions).toHaveLength(7);
    });

    it('cada previsão tem campos obrigatórios', () => {
        const data = generateHistoricalData(30);
        const predictions = predictWeek(data);
        predictions.forEach(p => {
            expect(p).toHaveProperty('predictedRevenue');
            expect(p).toHaveProperty('predictedOrders');
            expect(p).toHaveProperty('confidence');
            expect(p).toHaveProperty('basedOn');
        });
    });
});

describe('predictPeakHours', () => {
    it('retorna até 5 horários de pico', () => {
        const hourData = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            orders: hour >= 11 && hour <= 14 ? 10 : hour >= 18 && hour <= 21 ? 8 : 2,
        }));
        const peaks = predictPeakHours(hourData);
        expect(peaks.length).toBeLessThanOrEqual(5);
        expect(peaks.length).toBeGreaterThan(0);
        // Horários de pico (11-14) devem estar no topo
        expect(peaks[0].hour).toBeGreaterThanOrEqual(11);
        expect(peaks[0].hour).toBeLessThanOrEqual(14);
    });
});

describe('getConfidenceLabel', () => {
    it('retorna labels em português', () => {
        expect(getConfidenceLabel('low')).toBe('Baixa confiança');
        expect(getConfidenceLabel('medium')).toBe('Média confiança');
        expect(getConfidenceLabel('high')).toBe('Alta confiança');
    });
});

describe('getConfidencePercentage', () => {
    it('retorna percentuais crescentes', () => {
        const low = getConfidencePercentage('low');
        const medium = getConfidencePercentage('medium');
        const high = getConfidencePercentage('high');
        expect(low).toBeLessThan(medium);
        expect(medium).toBeLessThan(high);
    });
});
