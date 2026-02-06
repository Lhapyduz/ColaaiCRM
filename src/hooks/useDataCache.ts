'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    available: boolean;
    category_id: string;
    display_order: number;
    promo_enabled: boolean;
    promo_value: number;
    promo_type: 'value' | 'percentage';
}

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    display_order?: number;
}

interface CacheData<T> {
    data: T[];
    timestamp: number;
    userId: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const PRODUCTS_CACHE_KEY = 'cola_ai_products_cache';
const CATEGORIES_CACHE_KEY = 'cola_ai_categories_cache';

function getCachedData<T>(key: string, userId: string): T[] | null {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const parsed: CacheData<T> = JSON.parse(cached);

        // Verifica se é do mesmo usuário e se não expirou
        if (parsed.userId !== userId) return null;
        if (Date.now() - parsed.timestamp > CACHE_DURATION) return null;

        return parsed.data;
    } catch {
        return null;
    }
}

function setCachedData<T>(key: string, data: T[], userId: string): void {
    try {
        const cacheData: CacheData<T> = {
            data,
            timestamp: Date.now(),
            userId
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Failed to cache data:', error);
    }
}

export function useProductsCache() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    const fetchProducts = useCallback(async (forceRefresh = false) => {
        if (!user) return;

        // Tenta usar cache primeiro (se não for refresh forçado)
        if (!forceRefresh) {
            const cached = getCachedData<Product>(PRODUCTS_CACHE_KEY, user.id);
            if (cached) {
                setProducts(cached);
                setLoading(false);
                return;
            }
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', user.id)
                .order('display_order', { ascending: true, nullsFirst: false })
                .order('name', { ascending: true });

            if (fetchError) throw fetchError;

            const productData = data || [];
            setProducts(productData);
            setCachedData(PRODUCTS_CACHE_KEY, productData, user.id);
            setError(null);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Erro ao carregar produtos');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Invalida cache quando produtos são modificados
    const invalidateCache = useCallback(() => {
        if (user) {
            localStorage.removeItem(PRODUCTS_CACHE_KEY);
            fetchProducts(true);
        }
    }, [user, fetchProducts]);

    useEffect(() => {
        if (user && !fetchedRef.current) {
            fetchedRef.current = true;
            fetchProducts();
        }
    }, [user, fetchProducts]);

    return { products, loading, error, refetch: invalidateCache };
}

export function useCategoriesCache() {
    const { user } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    const fetchCategories = useCallback(async (forceRefresh = false) => {
        if (!user) return;

        // Tenta usar cache primeiro
        if (!forceRefresh) {
            const cached = getCachedData<Category>(CATEGORIES_CACHE_KEY, user.id);
            if (cached) {
                setCategories(cached);
                setLoading(false);
                return;
            }
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('categories')
                .select('*')
                .eq('user_id', user.id)
                .order('display_order', { ascending: true, nullsFirst: false })
                .order('name', { ascending: true });

            if (fetchError) throw fetchError;

            const categoryData = data || [];
            setCategories(categoryData);
            setCachedData(CATEGORIES_CACHE_KEY, categoryData, user.id);
            setError(null);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Erro ao carregar categorias');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const invalidateCache = useCallback(() => {
        if (user) {
            localStorage.removeItem(CATEGORIES_CACHE_KEY);
            fetchCategories(true);
        }
    }, [user, fetchCategories]);

    useEffect(() => {
        if (user && !fetchedRef.current) {
            fetchedRef.current = true;
            fetchCategories();
        }
    }, [user, fetchCategories]);

    return { categories, loading, error, refetch: invalidateCache };
}

// Hook para menu público (sem autenticação) com cache por userId do dono
export function usePublicMenuCache(userId: string) {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Tenta cache primeiro
            const cachedProducts = getCachedData<Product>(`public_products_${userId}`, userId);
            const cachedCategories = getCachedData<Category>(`public_categories_${userId}`, userId);

            if (cachedProducts && cachedCategories) {
                setProducts(cachedProducts);
                setCategories(cachedCategories);
                setLoading(false);
                return;
            }

            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    supabase
                        .from('products')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('available', true)
                        .order('display_order', { ascending: true }),
                    supabase
                        .from('categories')
                        .select('*')
                        .eq('user_id', userId)
                        .order('display_order', { ascending: true })
                ]);

                const productData = productsRes.data || [];
                const categoryData = categoriesRes.data || [];

                setProducts(productData);
                setCategories(categoryData);

                // Cache por 5 minutos
                setCachedData(`public_products_${userId}`, productData, userId);
                setCachedData(`public_categories_${userId}`, categoryData, userId);
            } catch (error) {
                console.error('Error fetching public menu:', error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        }
    }, [userId]);

    return { products, categories, loading };
}

// Limpar todo o cache (para logout ou troca de usuário)
export function clearAllCache() {
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('cola_ai_') || key.startsWith('public_'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('Failed to clear cache:', error);
    }
}
