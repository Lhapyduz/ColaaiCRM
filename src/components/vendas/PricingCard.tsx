'use client';

import React from 'react';
import Link from 'next/link';
import { FiCheck } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import Button from '@/components/ui/Button';

interface PricingCardProps {
    title: string;
    price: string;
    description: string;
    features: string[];
    isPopular?: boolean;
    period: 'monthly' | 'annual';
    annualPrice?: string;
    ctaHref?: string;
    ctaText?: string;
    delay?: number;
}

export default function PricingCard({
    title,
    price,
    description,
    features,
    isPopular = false,
    period,
    annualPrice,
    ctaHref = '/assinatura',
    ctaText = 'Começar Grátis',
    delay = 0
}: PricingCardProps) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    const priceValue = period === 'monthly' ? price : (annualPrice ? (parseFloat(annualPrice.replace(',', '.')) / 12).toFixed(2).replace('.', ',') : price);
    const displayPeriod = '/mês';

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className={cn(
                "group relative rounded-2xl border bg-bg-card p-6 md:p-8 transition-all duration-300 hover:shadow-2xl",
                isPopular ? "border-primary/50 shadow-primary/10" : "border-border hover:border-primary/30"
            )}
            onMouseMove={handleMouseMove}
        >
            {/* Spotlight Effect */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                          650px circle at ${mouseX}px ${mouseY}px,
                          rgba(255, 107, 53, 0.1),
                          transparent 80%
                        )
                    `,
                }}
            />

            {/* Popular Badge */}
            {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-[0_4px_10px_rgba(255,107,53,0.3)] border border-white/20">
                    MAIS POPULAR
                </div>
            )}

            {/* Header */}
            <div className="mb-6 relative z-10">
                <h3 className={cn("text-xl font-bold mb-2", isPopular ? "text-primary" : "text-text-primary")}>
                    {title}
                </h3>
                <p className="text-text-muted text-sm min-h-[40px]">{description}</p>
            </div>

            {/* Price */}
            <div className="mb-6 relative z-10">
                <div className="flex items-end gap-1">
                    <span className="text-lg text-text-muted self-start mt-2">R$</span>
                    <span className="text-5xl font-bold tracking-tight text-text-primary">{priceValue}</span>
                    <span className="text-text-muted mb-2">{displayPeriod}</span>
                </div>
                {period === 'annual' && annualPrice && (
                    <p className="text-xs text-primary mt-2 font-medium bg-primary/10 inline-block px-2 py-1 rounded">
                        Economize pagando R$ {annualPrice} / ano
                    </p>
                )}
            </div>

            {/* CTA */}
            <div className="mb-8 relative z-10">
                <Link href={ctaHref} className="block w-full">
                    <Button
                        fullWidth
                        variant={isPopular ? 'primary' : 'outline'}
                        className={cn(
                            "py-6 text-base",
                            isPopular && "shadow-[0_4px_20px_rgba(255,107,53,0.3)] hover:shadow-[0_6px_25px_rgba(255,107,53,0.4)]"
                        )}
                    >
                        {ctaText}
                    </Button>
                </Link>
                {period === 'monthly' && (
                    <p className="text-center text-xs text-text-muted mt-3">7 dias grátis, sem cartão</p>
                )}
            </div>

            {/* Features */}
            <ul className="space-y-4 relative z-10">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                        <div className={cn(
                            "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                            isPopular ? "bg-primary/20 text-primary" : "bg-bg-tertiary text-text-secondary"
                        )}>
                            <FiCheck className="w-3 h-3" />
                        </div>
                        <span className="text-text-secondary">{feature}</span>
                    </li>
                ))}
            </ul>
        </motion.div>
    );
}
