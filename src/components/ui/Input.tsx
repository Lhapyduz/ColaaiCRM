'use client';

import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
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
        <div className={`${styles.container} ${className}`}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={`${styles.inputWrapper} ${error ? styles.hasError : ''}`}>
                {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
                <input
                    ref={ref}
                    type={isPassword && showPassword ? 'text' : type}
                    className={`${styles.input} ${leftIcon ? styles.hasLeftIcon : ''} ${(rightIcon || isPassword) ? styles.hasRightIcon : ''}`}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        className={styles.togglePassword}
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                    >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                )}
                {rightIcon && !isPassword && <span className={styles.rightIcon}>{rightIcon}</span>}
            </div>
            {error && <span className={styles.error}>{error}</span>}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
