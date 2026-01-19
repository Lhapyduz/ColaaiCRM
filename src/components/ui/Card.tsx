'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'glass' | 'gradient';
    hoverable?: boolean;
    onClick?: () => void;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
    children,
    className = '',
    variant = 'default',
    hoverable = false,
    onClick,
    padding = 'md'
}: CardProps) {
    // Base styles
    const baseStyles = 'rounded-lg border border-border transition-all duration-normal';

    // Variant styles
    const variantStyles = {
        default: 'bg-bg-card',
        glass: 'bg-white/5 backdrop-blur-[10px] border-white/10',
        gradient: 'bg-gradient-to-br from-bg-card to-bg-tertiary border-white/5',
    };

    // Padding styles
    const paddingStyles = {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-7',
    };

    return (
        <div
            className={cn(
                baseStyles,
                variantStyles[variant],
                paddingStyles[padding],
                hoverable && 'hover:border-border-light hover:-translate-y-0.5 hover:shadow-lg',
                onClick && 'cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
    return <div className={cn('flex flex-col gap-1 mb-4', className)}>{children}</div>;
}

interface CardTitleProps {
    children: ReactNode;
    className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
    return <h3 className={cn('text-lg font-semibold text-text-primary m-0', className)}>{children}</h3>;
}

interface CardDescriptionProps {
    children: ReactNode;
    className?: string;
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
    return <p className={cn('text-sm text-text-secondary m-0', className)}>{children}</p>;
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
    return <div className={cn('flex-1', className)}>{children}</div>;
}

interface CardFooterProps {
    children: ReactNode;
    className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
    return <div className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-border', className)}>{children}</div>;
}
