import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    name: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    name: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string;
                    created_at?: string;
                };
            };
            user_settings: {
                Row: {
                    id: string;
                    user_id: string;
                    app_name: string;
                    logo_url: string | null;
                    primary_color: string;
                    secondary_color: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    app_name?: string;
                    logo_url?: string | null;
                    primary_color?: string;
                    secondary_color?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    app_name?: string;
                    logo_url?: string | null;
                    primary_color?: string;
                    secondary_color?: string;
                    created_at?: string;
                };
            };
            categories: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    icon: string;
                    color: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    name: string;
                    icon?: string;
                    color?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    name?: string;
                    icon?: string;
                    color?: string;
                    created_at?: string;
                };
            };
            products: {
                Row: {
                    id: string;
                    user_id: string;
                    category_id: string;
                    name: string;
                    description: string | null;
                    price: number;
                    image_url: string | null;
                    available: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    category_id: string;
                    name: string;
                    description?: string | null;
                    price: number;
                    image_url?: string | null;
                    available?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    category_id?: string;
                    name?: string;
                    description?: string | null;
                    price?: number;
                    image_url?: string | null;
                    available?: boolean;
                    created_at?: string;
                };
            };
            orders: {
                Row: {
                    id: string;
                    user_id: string;
                    order_number: number;
                    customer_name: string;
                    customer_phone: string | null;
                    customer_address: string | null;
                    status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
                    payment_method: string;
                    payment_status: 'pending' | 'paid';
                    subtotal: number;
                    delivery_fee: number;
                    total: number;
                    notes: string | null;
                    is_delivery: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    order_number?: number;
                    customer_name: string;
                    customer_phone?: string | null;
                    customer_address?: string | null;
                    status?: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
                    payment_method: string;
                    payment_status?: 'pending' | 'paid';
                    subtotal: number;
                    delivery_fee?: number;
                    total: number;
                    notes?: string | null;
                    is_delivery?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    order_number?: number;
                    customer_name?: string;
                    customer_phone?: string | null;
                    customer_address?: string | null;
                    status?: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
                    payment_method?: string;
                    payment_status?: 'pending' | 'paid';
                    subtotal?: number;
                    delivery_fee?: number;
                    total?: number;
                    notes?: string | null;
                    is_delivery?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            order_items: {
                Row: {
                    id: string;
                    order_id: string;
                    product_id: string;
                    product_name: string;
                    quantity: number;
                    unit_price: number;
                    total: number;
                    notes: string | null;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    product_id: string;
                    product_name: string;
                    quantity: number;
                    unit_price: number;
                    total: number;
                    notes?: string | null;
                };
                Update: {
                    id?: string;
                    order_id?: string;
                    product_id?: string;
                    product_name?: string;
                    quantity?: number;
                    unit_price?: number;
                    total?: number;
                    notes?: string | null;
                };
            };
        };
    };
};
