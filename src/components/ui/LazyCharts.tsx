'use client';

import dynamic from 'next/dynamic';

// Skeleton loading component for charts
export function ChartSkeleton({ height = 300 }: { height?: number }) {
    return (
        <div
            className="skeleton animate-shimmer rounded-lg"
            style={{ height, width: '100%' }}
        />
    );
}

// Dynamically import all Recharts components to reduce initial bundle size
// These will only be loaded when actually used on the Relatorios page
export const LazyLineChart = dynamic(
    () => import('recharts').then(mod => mod.LineChart),
    {
        ssr: false,
        loading: () => <ChartSkeleton />
    }
);

export const LazyAreaChart = dynamic(
    () => import('recharts').then(mod => mod.AreaChart),
    {
        ssr: false,
        loading: () => <ChartSkeleton />
    }
);

export const LazyBarChart = dynamic(
    () => import('recharts').then(mod => mod.BarChart),
    {
        ssr: false,
        loading: () => <ChartSkeleton />
    }
);

export const LazyPieChart = dynamic(
    () => import('recharts').then(mod => mod.PieChart),
    {
        ssr: false,
        loading: () => <ChartSkeleton height={250} />
    }
);

export const LazyResponsiveContainer = dynamic(
    () => import('recharts').then(mod => mod.ResponsiveContainer),
    {
        ssr: false,
        loading: () => <ChartSkeleton />
    }
);

// Re-export non-component utilities that don't need lazy loading
// These are small and used for configuration
export {
    Line,
    Area,
    Bar,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
