'use client';

import React from 'react';
import { FiStar } from 'react-icons/fi';
import styles from './StarRating.module.css';

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

    return (
        <div className={`${styles.container} ${styles[size]}`}>
            <div className={styles.stars}>
                {Array.from({ length: maxRating }, (_, i) => {
                    const value = i + 1;
                    const filled = value <= displayRating;
                    const halfFilled = !filled && value - 0.5 <= displayRating;

                    return (
                        <button
                            key={i}
                            type="button"
                            className={`${styles.star} ${filled ? styles.filled : ''} ${halfFilled ? styles.half : ''} ${interactive ? styles.interactive : ''}`}
                            onClick={() => handleClick(value)}
                            onMouseEnter={() => handleMouseEnter(value)}
                            onMouseLeave={handleMouseLeave}
                            disabled={!interactive}
                            aria-label={`${value} estrela${value > 1 ? 's' : ''}`}
                        >
                            <FiStar />
                        </button>
                    );
                })}
            </div>
            {showValue && rating > 0 && (
                <span className={styles.value}>{rating.toFixed(1)}</span>
            )}
        </div>
    );
}
