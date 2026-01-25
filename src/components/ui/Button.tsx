'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}, ref) => {
    // Base styles
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-fast cursor-pointer border-none outline-none relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed active:enabled:scale-[0.98]';

    // Variant styles
    const variantStyles = {
        primary: 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-primary-glow hover:enabled:shadow-primary-glow-lg hover:enabled:-translate-y-px',
        secondary: 'bg-bg-tertiary text-text-primary border border-border hover:enabled:bg-bg-card-hover hover:enabled:border-border-light',
        outline: 'bg-transparent text-primary border-2 border-primary hover:enabled:bg-primary/10',
        ghost: 'bg-transparent text-text-secondary hover:enabled:bg-bg-tertiary hover:enabled:text-text-primary',
        danger: 'bg-gradient-to-br from-error to-[#c0392b] text-white shadow-[0_4px_15px_rgba(231,76,60,0.3)] hover:enabled:shadow-[0_6px_20px_rgba(231,76,60,0.4)] hover:enabled:-translate-y-px',
    };

    // Size styles
    const sizeStyles = {
        sm: 'h-8 px-3 text-sm',
        md: 'h-[42px] px-5 text-[0.9375rem]',
        lg: 'h-[52px] px-7 text-base',
    };

    return (
        <button
            ref={ref}
            className={cn(
                baseStyles,
                variantStyles[variant],
                sizeStyles[size],
                fullWidth && 'w-full',
                isLoading && 'pointer-events-none',
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <>
                    {leftIcon && <span className="flex items-center justify-center text-[1.1em]">{leftIcon}</span>}
                    {children}
                    {rightIcon && <span className="flex items-center justify-center text-[1.1em]">{rightIcon}</span>}
                </>
            )}
        </button>
    );
});

Button.displayName = 'Button';

export default Button;
