'use client';

import React from 'react';
import { FiStar } from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface StarRatingProps {
    rating: number;
    maxRating?: number;
    size?: 'sm' | 'md' | 'lg';
    interactive?: boolean;
    onChange?: (rating: number) => void;
    showValue?: boolean;
}

export default function StarRating({
    rating,
    maxRating = 5,
    size = 'md',
    interactive = false,
    onChange,
    showValue = false
}: StarRatingProps) {
    const [hoverRating, setHoverRating] = React.useState(0);

    const handleClick = (value: number) => {
        if (interactive && onChange) {
            onChange(value);
        }
    };

    const handleMouseEnter = (value: number) => {
        if (interactive) {
            setHoverRating(value);
        }
    };

    const handleMouseLeave = () => {
        if (interactive) {
            setHoverRating(0);
        }
    };

    const displayRating = hoverRating || rating;

    // Size mappings
    const sizeStyles = {
        sm: { star: 'w-4 h-4', value: 'text-sm' },
        md: { star: 'w-6 h-6', value: 'text-base' },
        lg: { star: 'w-9 h-9', value: 'text-xl' },
    };

    return (
        <div className="inline-flex items-center gap-2">
            <div className="flex gap-0.5">
                {Array.from({ length: maxRating }, (_, i) => {
                    const value = i + 1;
                    const filled = value <= displayRating;
                    const halfFilled = !filled && value - 0.5 <= displayRating;

                    return (
                        <button
                            key={i}
                            type="button"
                            className={cn(
                                'bg-transparent border-none p-0 cursor-default flex items-center justify-center transition-all duration-150',
                                interactive && 'cursor-pointer hover:scale-110',
                                filled ? 'text-[#fbbf24]' : 'text-border',
                                halfFilled && 'text-[#fbbf24]'
                            )}
                            onClick={() => handleClick(value)}
                            onMouseEnter={() => handleMouseEnter(value)}
                            onMouseLeave={handleMouseLeave}
                            disabled={!interactive}
                            aria-label={`${value} estrela${value > 1 ? 's' : ''}`}
                        >
                            <FiStar className={cn(sizeStyles[size].star, filled && 'fill-[#fbbf24]')} />
                        </button>
                    );
                })}
            </div>
            {showValue && rating > 0 && (
                <span className={cn('font-semibold text-text-primary', sizeStyles[size].value)}>
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    );
}
