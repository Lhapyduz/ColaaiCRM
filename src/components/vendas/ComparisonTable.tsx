'use client';

import React, { useState } from 'react';
import { FiCheck, FiMinus } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface PlanFeature {
    name: string;
    basic: boolean | string;
    professional: boolean | string;
    enterprise: boolean | string;
    category?: string;
    description?: string;
}

interface ComparisonTableProps {
    features: PlanFeature[];
    recommendedPlan?: 'professional';
}

export default function ComparisonTable({ features, recommendedPlan = 'professional' }: ComparisonTableProps) {
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);

    // Group features if they have categories (optional for future expansion)
    // For now, we render flat as per design

    const renderValue = (value: boolean | string) => {
        if (typeof value === 'boolean') {
            return value ? (
                <div className="flex justify-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                    >
                        <FiCheck className="text-xl text-success" />
                    </motion.div>
                </div>
            ) : (
                <div className="flex justify-center">
                    <FiMinus className="text-xl text-border" />
                </div>
            );
        }
        return <span className="text-sm font-medium text-text-primary">{value}</span>;
    };

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-bg-card shadow-lg mx-auto max-w-5xl">
            {/* Header - Sticky on Mobile if needed, but usually tables sticky head within container */}
            <div className="grid grid-cols-4 bg-bg-tertiary/50 backdrop-blur-sm sticky top-0 z-20 border-b border-border">
                <div className="p-4 md:p-6 font-bold text-text-secondary flex items-end">Recursos</div>

                {/* Basic */}
                <div className="p-4 md:p-6 text-center border-l border-border/50">
                    <h3 className="font-bold text-lg mb-1">Básico</h3>
                    <div className="h-1 w-8 bg-zinc-500 rounded-full mx-auto opacity-50"></div>
                </div>

                {/* Professional (Recommended) */}
                <div className={cn(
                    "p-4 md:p-6 text-center border-l border-r border-primary/30 relative overflow-hidden bg-primary/5",
                    recommendedPlan === 'professional' && "bg-linear-to-b from-primary/10 to-transparent"
                )}>
                    {recommendedPlan === 'professional' && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_10px_var(--primary)]"></div>
                    )}
                    <h3 className="font-bold text-lg mb-1 text-primary">Avançado</h3>
                    <div className="h-1 w-8 bg-primary rounded-full mx-auto"></div>
                </div>

                {/* Enterprise */}
                <div className="p-4 md:p-6 text-center border-l border-border/50">
                    <h3 className="font-bold text-lg mb-1">Profissional</h3>
                    <div className="h-1 w-8 bg-zinc-500 rounded-full mx-auto opacity-50"></div>
                </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border/50">
                {features.map((feature, i) => (
                    <motion.div
                        key={i}
                        className={cn(
                            "grid grid-cols-4 transition-colors duration-200",
                            hoveredRow === i ? "bg-bg-tertiary" : "hover:bg-bg-tertiary/30"
                        )}
                        onMouseEnter={() => setHoveredRow(i)}
                        onMouseLeave={() => setHoveredRow(null)}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ delay: i * 0.02 }}
                    >
                        {/* Feature Name */}
                        <div className="p-4 md:px-6 md:py-4 flex items-center text-sm md:text-base font-medium text-text-secondary">
                            {feature.name}
                            {feature.description && (
                                <span className="ml-2 text-text-muted cursor-help" title={feature.description}>ⓘ</span>
                            )}
                        </div>

                        {/* Basic Value */}
                        <div className="p-4 border-l border-border/50 flex items-center justify-center text-center">
                            {renderValue(feature.basic)}
                        </div>

                        {/* Professional Value */}
                        <div className={cn(
                            "p-4 border-l border-r border-primary/20 flex items-center justify-center text-center",
                            recommendedPlan === 'professional' && "bg-primary/5"
                        )}>
                            {renderValue(feature.professional)}
                        </div>

                        {/* Enterprise Value */}
                        <div className="p-4 border-l border-border/50 flex items-center justify-center text-center">
                            {renderValue(feature.enterprise)}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Mobile Scroll Hint (visible only on small screens) */}
            <div className="md:hidden text-center p-2 text-xs text-text-muted bg-bg-tertiary border-t border-border">
                Arraste para o lado para ver mais →
            </div>
        </div>
    );
}
