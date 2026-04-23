'use client';

import Image from 'next/image';
import { useState, useEffect, memo } from 'react';
import { cn } from '@/utils/utils';

interface OptimizedImageProps {
    src: string | null | undefined;
    alt: string;
    width?: number;
    height?: number;
    fill?: boolean;
    className?: string;
    containerClassName?: string;
    fallback?: React.ReactNode;
    fallbackIcon?: string;
    priority?: boolean;
    quality?: number;
    sizes?: string;
    thumbnailSrc?: string;
}

/**
 * Optimized Image component with:
 * - Next.js Image optimization (WebP/AVIF, lazy loading)
 * - Skeleton loading state
 * - Error fallback handling
 * - Responsive sizing support
 * - Thumbnail support for mobile
 */
export const OptimizedImage = memo(function OptimizedImage({
    src,
    alt,
    width,
    height,
    fill = false,
    className,
    containerClassName,
    fallback,
    fallbackIcon = '🍽️',
    priority = false,
    quality = 80,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    thumbnailSrc,
}: OptimizedImageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const imageSrc = (thumbnailSrc && isMobile ? thumbnailSrc : src);

    // Handle missing or invalid src
    if (!imageSrc || hasError) {
        if (fallback) return <>{fallback}</>;
        return (
            <div
                className={cn(
                    'flex items-center justify-center bg-bg-tertiary text-4xl',
                    containerClassName,
                    className
                )}
            >
                <span className="opacity-30">{fallbackIcon}</span>
            </div>
        );
    }

    return (
        <div className={cn('relative overflow-hidden', containerClassName)}>
            {/* Skeleton loader */}
            {isLoading && (
                <div className="absolute inset-0 skeleton animate-shimmer" />
            )}

            {fill ? (
                <Image
                    src={imageSrc}
                    alt={alt}
                    fill
                    sizes={sizes}
                    quality={quality}
                    priority={priority}
                    loading={priority ? 'eager' : 'lazy'}
                    className={cn(
                        'object-cover transition-opacity duration-300',
                        isLoading ? 'opacity-0' : 'opacity-100',
                        className
                    )}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setHasError(true);
                        setIsLoading(false);
                    }}
                />
            ) : (
                <Image
                    src={imageSrc}
                    alt={alt}
                    width={width || 400}
                    height={height || 300}
                    quality={quality}
                    priority={priority}
                    loading={priority ? 'eager' : 'lazy'}
                    className={cn(
                        'object-cover transition-opacity duration-300',
                        isLoading ? 'opacity-0' : 'opacity-100',
                        className
                    )}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setHasError(true);
                        setIsLoading(false);
                    }}
                />
            )}
        </div>
    );
});

export default OptimizedImage;
