export interface CachedProduct {
    id: string;
    user_id: string;
    name: string;
    price: number;
    description: string | null;
    image_url: string | null;
    category_id: string | null;
    available: boolean | null;
    display_order: number | null;
    promo_enabled: boolean | null;
    promo_value: number | null;
    promo_type: 'value' | 'percentage' | null;
    created_at: string | null;
}

export interface CachedCategory {
    id: string;
    user_id: string;
    name: string;
    icon: string | null;
    color: string | null;
    display_order: number | null;
    created_at: string | null;
}

export interface CachedOrderItem {
    id: string;
    order_id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
    created_at?: string | null;
    order_item_addons?: CachedOrderItemAddon[];
}

export interface CachedOrderItemAddon {
    id: string;
    order_item_id: string;
    addon_id: string | null;
    addon_name: string;
    addon_price: number;
    quantity: number;
    created_at?: string | null;
}

export interface CachedOrder {
    id: string;
    user_id: string;
    order_number: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string | null;
    status: string | null;
    payment_method: string;
    payment_status: string | null;
    subtotal: number;
    total: number;
    delivery_fee: number | null;
    is_delivery: boolean | null;
    notes: string | null;
    coupon_discount?: number;
    user_slug: string | null;
    created_at: string | null;
    updated_at: string | null;
    rating_token: string | null;
    order_items?: CachedOrderItem[];
}

export interface CachedUserSetting {
    id: string;
    user_id: string;
    app_name: string;
    slogan: string | null;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    whatsapp_number: string | null;
    public_slug: string | null;
    pix_key: string | null;
    pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null;
    merchant_city: string | null;
    sidebar_order: string[] | null;
    hidden_sidebar_items: string[] | null;
    access_token: string | null;
    delivery_fee_type: 'fixed' | 'neighborhood' | null;
    delivery_fee_value: number | null;
    store_open: boolean | null;
    delivery_time_min: number | null;
    delivery_time_max: number | null;
    sidebar_color: string | null;
    taxa_servico_enabled: boolean | null;
    taxa_servico_percent: number | null;
}

export interface CachedClient {
    id: string;
    user_id: string;
    phone: string;
    name: string;
    email: string | null;
    total_points: number;
    total_spent: number;
    total_orders: number;
    created_at: string | null;
}

export interface CachedTable {
    id: string;
    user_id: string;
    numero_mesa: number;
    capacidade: number;
    ativa: boolean;
    created_at: string | null;
}

export interface CachedEmployee {
    id: string;
    user_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    pin_code: string | null;
    is_active: boolean;
    is_fixed?: boolean;
    permissions: any;
    hourly_rate: number | null;
    salario_fixo?: number | null;
    created_at: string | null;
}

export interface CachedActionLog {
    id: string;
    user_id: string;
    action_type: string;
    entity_type: string;
    entity_id: string | null;
    entity_name: string | null;
    description: string;
    metadata: any;
    created_at: string;
}

export interface CachedCashFlow {
    id: string;
    user_id: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
    payment_method: string | null;
    transaction_date: string;
    created_at: string;
}

export interface CachedMesaSession {
    id: string;
    mesa_id: string;
    user_id: string;
    garcom_id: string | null;
    garcom?: string | null;
    status: string | null;
    opened_at: string | null;
    closed_at: string | null;
    total: number | null;
    valor_parcial?: number;
    payment_method?: string | null;
    taxa_servico_percent?: number | null;
    desconto?: number | null;
    total_final?: number | null;
}

export interface CachedMesaSessionItem {
    id: string;
    session_id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
    status: string | null;
    created_at: string | null;
    order_id?: string | null;
    enviado_cozinha?: boolean;
    orders?: { status: string } | null;
}

export interface CachedLoyaltyReward {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    points_cost: number;
    reward_type: 'discount_percent' | 'discount_fixed' | 'free_product' | 'free_delivery';
    reward_value: number | null;
    min_order_value: number;
    is_active: boolean;
    created_at: string | null;
}

export interface CachedLoyaltySettings {
    id: string;
    user_id: string;
    points_per_real: number;
    min_points_to_redeem: number;
    points_expiry_days: number;
    tier_bronze_min: number;
    tier_silver_min: number;
    tier_gold_min: number;
    tier_platinum_min: number;
    silver_multiplier: number;
    gold_multiplier: number;
    platinum_multiplier: number;
    is_active: boolean;
    updated_at: string | null;
}

export interface CachedCoupon {
    id: string;
    user_id: string;
    code: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_value: number;
    max_discount: number | null;
    usage_limit: number | null;
    usage_count: number;
    valid_from: string;
    valid_until: string | null;
    active: boolean;
    first_order_only: boolean;
    created_at: string | null;
}

export interface CachedAppSetting {
    id: string;
    user_id: string;
    loyalty_enabled: boolean;
    coupons_enabled: boolean;
    updated_at: string | null;
}

export interface CachedProductAddon {
    id: string;
    user_id: string;
    name: string;
    price: number;
    available: boolean;
    created_at: string | null;
}

export interface CachedAddonGroup {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    required: boolean;
    max_selection: number;
    created_at: string | null;
}

export interface CachedProductAddonGroup {
    id: string;
    product_id: string;
    group_id: string;
    created_at: string | null;
}

export interface CachedAddonGroupItem {
    id: string;
    group_id: string;
    addon_id: string;
    created_at: string | null;
}

export interface CachedBill {
    id: string;
    user_id: string;
    type: 'payable' | 'receivable';
    description: string;
    category: string;
    amount: number;
    due_date: string;
    payment_date: string | null;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    supplier_customer: string | null;
    notes: string | null;
    recurrence: 'none' | 'weekly' | 'monthly' | 'yearly' | null;
    recurrence_end_date: string | null;
    created_at: string | null;
}

export interface CachedBillCategory {
    id: string;
    user_id: string;
    name: string;
    type: 'payable' | 'receivable' | 'both';
    icon: string;
    color: string;
    created_at: string | null;
}

export interface PendingAction {
    id: string; // UUID of the action itself
    type: 'create' | 'update' | 'delete' | 'create_full_order' | 'replace_relationships' | 'clear_logs' | 'delete_all';
    table: string;
    data: any; // Record data
    timestamp: number;
}

export interface QueryCacheEntry {
    key: string;
    value: string;
}

export type StoreName = 'products' | 'categories' | 'orders' | 'userSettings' | 'pendingActions' | 'customers' | 'mesas' | 'employees' | 'mesa_sessions' | 'mesa_session_items' | 'loyalty_rewards' | 'loyalty_settings' | 'coupons' | 'app_settings' | 'action_logs' | 'cash_flow' | 'product_addons' | 'addon_groups' | 'product_addon_groups' | 'addon_group_items' | 'queryCache' | 'order_items' | 'order_item_addons' | 'bills' | 'bill_categories';
