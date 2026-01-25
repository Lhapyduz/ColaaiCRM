'use client';

import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    leftIcon,
    rightIcon,
    type = 'text',
    className = '',
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className={cn('flex flex-col gap-1.5 w-full', className)}>
            {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
            <div className={cn(
                'relative flex items-center bg-bg-tertiary border-2 border-border rounded-md transition-all duration-fast',
                'focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(255,107,53,0.15)]',
                error && 'border-error focus-within:shadow-[0_0_0_3px_rgba(231,76,60,0.15)]'
            )}>
                {leftIcon && (
                    <span className="absolute left-3.5 flex items-center justify-center text-text-muted text-[1.1rem]">
                        {leftIcon}
                    </span>
                )}
                <input
                    ref={ref}
                    type={isPassword && showPassword ? 'text' : type}
                    className={cn(
                        'flex-1 h-12 px-4 bg-transparent border-none outline-none text-[0.9375rem] text-text-primary',
                        'placeholder:text-text-muted',
                        leftIcon && 'pl-11',
                        (rightIcon || isPassword) && 'pr-11'
                    )}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="absolute right-3 flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-sm text-text-muted cursor-pointer transition-all duration-fast hover:text-text-primary hover:bg-bg-card-hover"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                    >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                )}
                {rightIcon && !isPassword && (
                    <span className="absolute right-3.5 flex items-center justify-center text-text-muted text-[1.1rem]">
                        {rightIcon}
                    </span>
                )}
            </div>
            {error && <span className="text-[0.8125rem] text-error">{error}</span>}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
