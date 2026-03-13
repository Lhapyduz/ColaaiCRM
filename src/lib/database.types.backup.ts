export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            action_logs: {
                Row: {
                    action_type: string
                    created_at: string | null
                    description: string
                    entity_id: string | null
                    entity_name: string | null
                    entity_type: string
                    id: string
                    ip_address: string | null
                    metadata: Json | null
                    user_agent: string | null
                    user_id: string
                }
                Insert: {
                    action_type: string
                    created_at?: string | null
                    description: string
                    entity_id?: string | null
                    entity_name?: string | null
                    entity_type: string
                    id?: string
                    ip_address?: string | null
                    metadata?: Json | null
                    user_agent?: string | null
                    user_id: string
                }
                Update: {
                    action_type?: string
                    created_at?: string | null
                    description?: string
                    entity_id?: string | null
                    entity_name?: string | null
                    entity_type?: string
                    id?: string
                    ip_address?: string | null
                    metadata?: Json | null
                    user_agent?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            addon_group_items: {
                Row: {
                    addon_id: string
                    display_order: number | null
                    group_id: string
                    id: string
                }
                Insert: {
                    addon_id: string
                    display_order?: number | null
                    group_id: string
                    id?: string
                }
                Update: {
                    addon_id?: string
                    display_order?: number | null
                    group_id?: string
                    id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "addon_group_items_addon_id_fkey"
                        columns: ["addon_id"]
                        isOneToOne: false
                        referencedRelation: "addons"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "addon_group_items_group_id_fkey"
                        columns: ["group_id"]
                        isOneToOne: false
                        referencedRelation: "addon_groups"
                        referencedColumns: ["id"]
                    },
                ]
            }
            addon_groups: {
                Row: {
                    created_at: string | null
                    description: string | null
                    display_order: number | null
                    id: string
                    is_optional: boolean | null
                    max_selections: number
                    min_selections: number
                    name: string
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    display_order?: number | null
                    id?: string
                    is_optional?: boolean | null
                    max_selections?: number
                    min_selections?: number
                    name: string
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    display_order?: number | null
                    id?: string
                    is_optional?: boolean | null
                    max_selections?: number
                    min_selections?: number
                    name?: string
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            addons: {
                Row: {
                    available: boolean | null
                    created_at: string | null
                    description: string | null
                    id: string
                    name: string
                    price: number
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    available?: boolean | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    name: string
                    price: number
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    available?: boolean | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    name?: string
                    price?: number
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            app_settings: {
                Row: {
                    coupons_enabled: boolean | null
                    created_at: string | null
                    id: string
                    loyalty_enabled: boolean | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    coupons_enabled?: boolean | null
                    created_at?: string | null
                    id?: string
                    loyalty_enabled?: boolean | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    coupons_enabled?: boolean | null
                    created_at?: string | null
                    id?: string
                    loyalty_enabled?: boolean | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            categories: {
                Row: {
                    color: string | null
                    created_at: string | null
                    icon: string | null
                    id: string
                    name: string
                    user_id: string
                }
                Insert: {
                    color?: string | null
                    created_at?: string | null
                    icon?: string | null
                    id?: string
                    name: string
                    user_id: string
                }
                Update: {
                    color?: string | null
                    created_at?: string | null
                    icon?: string | null
                    id?: string
                    name?: string
                    user_id?: string
                }
                Relationships: []
            }
            coupons: {
                Row: {
                    active: boolean | null
                    code: string
                    created_at: string | null
                    discount_type: string
                    discount_value: number
                    expiration_date: string | null
                    id: string
                    max_uses: number | null
                    min_order_value: number | null
                    times_used: number | null
                    user_id: string
                }
                Insert: {
                    active?: boolean | null
                    code: string
                    created_at?: string | null
                    discount_type: string
                    discount_value: number
                    expiration_date?: string | null
                    id?: string
                    max_uses?: number | null
                    min_order_value?: number | null
                    times_used?: number | null
                    user_id: string
                }
                Update: {
                    active?: boolean | null
                    code?: string
                    created_at?: string | null
                    discount_type?: string
                    discount_value?: number
                    expiration_date?: string | null
                    id?: string
                    max_uses?: number | null
                    min_order_value?: number | null
                    times_used?: number | null
                    user_id?: string
                }
                Relationships: []
            }
            loyalty_customers: {
                Row: {
                    created_at: string | null
                    id: string
                    last_purchase_date: string | null
                    lifetime_points: number | null
                    phone: string
                    points_balance: number | null
                    total_orders: number | null
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    last_purchase_date?: string | null
                    lifetime_points?: number | null
                    phone: string
                    points_balance?: number | null
                    total_orders?: number | null
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    last_purchase_date?: string | null
                    lifetime_points?: number | null
                    phone?: string
                    points_balance?: number | null
                    total_orders?: number | null
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            loyalty_history: {
                Row: {
                    created_at: string | null
                    customer_id: string
                    description: string
                    id: string
                    order_id: string | null
                    points_change: number
                    transaction_type: string
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    customer_id: string
                    description: string
                    id?: string
                    order_id?: string | null
                    points_change: number
                    transaction_type: string
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    customer_id?: string
                    description?: string
                    id?: string
                    order_id?: string | null
                    points_change?: number
                    transaction_type?: string
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "loyalty_history_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "loyalty_customers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "loyalty_history_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            loyalty_rewards: {
                Row: {
                    active: boolean | null
                    cost_in_points: number
                    created_at: string | null
                    description: string | null
                    id: string
                    title: string
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    active?: boolean | null
                    cost_in_points: number
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    title: string
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    active?: boolean | null
                    cost_in_points?: number
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    title?: string
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            loyalty_settings: {
                Row: {
                    created_at: string | null
                    id: string
                    is_active: boolean | null
                    minimum_order_value: number | null
                    points_expiry_days: number | null
                    points_per_real: number
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    minimum_order_value?: number | null
                    points_expiry_days?: number | null
                    points_per_real?: number
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    minimum_order_value?: number | null
                    points_expiry_days?: number | null
                    points_per_real?: number
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            opening_hours: {
                Row: {
                    close_time: string | null
                    created_at: string | null
                    day_of_week: number
                    id: string
                    is_closed: boolean | null
                    open_time: string | null
                    user_id: string
                }
                Insert: {
                    close_time?: string | null
                    created_at?: string | null
                    day_of_week: number
                    id?: string
                    is_closed?: boolean | null
                    open_time?: string | null
                    user_id: string
                }
                Update: {
                    close_time?: string | null
                    created_at?: string | null
                    day_of_week?: number
                    id?: string
                    is_closed?: boolean | null
                    open_time?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            order_items: {
                Row: {
                    id: string
                    notes: string | null
                    order_id: string
                    product_id: string | null
                    product_name: string
                    quantity: number
                    total: number
                    unit_price: number
                }
                Insert: {
                    id?: string
                    notes?: string | null
                    order_id: string
                    product_id?: string | null
                    product_name: string
                    quantity: number
                    total: number
                    unit_price: number
                }
                Update: {
                    id?: string
                    notes?: string | null
                    order_id?: string
                    product_id?: string | null
                    product_name?: string
                    quantity?: number
                    total?: number
                    unit_price?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "order_items_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            orders: {
                Row: {
                    created_at: string | null
                    customer_address: string | null
                    customer_name: string
                    customer_phone: string | null
                    delivery_fee: number | null
                    id: string
                    is_delivery: boolean | null
                    notes: string | null
                    order_number: number
                    payment_method: string
                    payment_status: string | null
                    status: string | null
                    subtotal: number
                    total: number
                    updated_at: string | null
                    user_slug: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    customer_address?: string | null
                    customer_name: string
                    customer_phone?: string | null
                    delivery_fee?: number | null
                    id?: string
                    is_delivery?: boolean | null
                    notes?: string | null
                    order_number: number
                    payment_method: string
                    payment_status?: string | null
                    status?: string | null
                    subtotal: number
                    total: number
                    updated_at?: string | null
                    user_slug?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    customer_address?: string | null
                    customer_name?: string
                    customer_phone?: string | null
                    delivery_fee?: number | null
                    id?: string
                    is_delivery?: boolean | null
                    notes?: string | null
                    order_number?: number
                    payment_method?: string
                    payment_status?: string | null
                    status?: string | null
                    subtotal?: number
                    total?: number
                    updated_at?: string | null
                    user_slug?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            product_category: {
                Row: {
                    category_id: string
                    product_id: string
                }
                Insert: {
                    category_id: string
                    product_id: string
                }
                Update: {
                    category_id?: string
                    product_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "product_category_category_id_fkey"
                        columns: ["category_id"]
                        isOneToOne: false
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "product_category_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            product_ratings: {
                Row: {
                    comment: string | null
                    created_at: string | null
                    customer_name: string | null
                    hidden: boolean | null
                    id: string
                    product_id: string
                    rating: number
                    reply: string | null
                    replied_at: string | null
                    user_id: string
                }
                Insert: {
                    comment?: string | null
                    created_at?: string | null
                    customer_name?: string | null
                    hidden?: boolean | null
                    id?: string
                    product_id: string
                    rating: number
                    reply?: string | null
                    replied_at?: string | null
                    user_id: string
                }
                Update: {
                    comment?: string | null
                    created_at?: string | null
                    customer_name?: string | null
                    hidden?: boolean | null
                    id?: string
                    product_id?: string
                    rating?: number
                    reply?: string | null
                    replied_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "product_ratings_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            products: {
                Row: {
                    available: boolean | null
                    category_id: string | null
                    created_at: string | null
                    description: string | null
                    id: string
                    image_url: string | null
                    name: string
                    price: number
                    user_id: string
                }
                Insert: {
                    available?: boolean | null
                    category_id?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    name: string
                    price: number
                    user_id: string
                }
                Update: {
                    available?: boolean | null
                    category_id?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    name?: string
                    price?: number
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "products_category_id_fkey"
                        columns: ["category_id"]
                        isOneToOne: false
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    },
                ]
            }
            store_ratings: {
                Row: {
                    comment: string | null
                    created_at: string | null
                    customer_name: string | null
                    hidden: boolean | null
                    id: string
                    rating: number
                    reply: string | null
                    replied_at: string | null
                    user_id: string
                }
                Insert: {
                    comment?: string | null
                    created_at?: string | null
                    customer_name?: string | null
                    hidden?: boolean | null
                    id?: string
                    rating: number
                    reply?: string | null
                    replied_at?: string | null
                    user_id: string
                }
                Update: {
                    comment?: string | null
                    created_at?: string | null
                    customer_name?: string | null
                    hidden?: boolean | null
                    id?: string
                    rating?: number
                    reply?: string | null
                    replied_at?: string | null
                    user_id?: string
                }
                Relationships: []
            }
            subscription_plans: {
                Row: {
                    created_at: string | null
                    features: Json | null
                    id: string
                    limits: Json | null
                    name: string
                    price: number
                    stripe_price_id: string | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    features?: Json | null
                    id?: string
                    limits?: Json | null
                    name: string
                    price: number
                    stripe_price_id?: string | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    features?: Json | null
                    id?: string
                    limits?: Json | null
                    name?: string
                    price?: number
                    stripe_price_id?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            subscriptions: {
                Row: {
                    cancel_at_period_end: boolean | null
                    created_at: string | null
                    current_period_end: string | null
                    current_period_start: string | null
                    customer_id: string | null
                    id: string
                    plan_id: string | null
                    status: string
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    cancel_at_period_end?: boolean | null
                    created_at?: string | null
                    current_period_end?: string | null
                    current_period_start?: string | null
                    customer_id?: string | null
                    id: string
                    plan_id?: string | null
                    status: string
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    cancel_at_period_end?: boolean | null
                    created_at?: string | null
                    current_period_end?: string | null
                    current_period_start?: string | null
                    customer_id?: string | null
                    id?: string
                    plan_id?: string | null
                    status?: string
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "subscriptions_plan_id_fkey"
                        columns: ["plan_id"]
                        isOneToOne: false
                        referencedRelation: "subscription_plans"
                        referencedColumns: ["id"]
                    },
                ]
            }
            user_access_tokens: {
                Row: {
                    created_at: string | null
                    expires_at: string | null
                    id: string
                    token: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    expires_at?: string | null
                    id?: string
                    token: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    expires_at?: string | null
                    id?: string
                    token?: string
                    user_id?: string
                }
                Relationships: []
            }
            user_settings: {
                Row: {
                    access_token: string | null
                    app_name: string | null
                    created_at: string | null
                    delivery_fee_value: number | null
                    delivery_time_max: number | null
                    delivery_time_min: number | null
                    hidden_sidebar_items: string[] | null
                    id: string
                    logo_url: string | null
                    merchant_city: string | null
                    pix_key: string | null
                    pix_key_type: string | null
                    primary_color: string | null
                    public_slug: string | null
                    secondary_color: string | null
                    sidebar_color: string | null
                    store_open: boolean | null
                    user_id: string
                    whatsapp_number: string | null
                }
                Insert: {
                    access_token?: string | null
                    app_name?: string | null
                    created_at?: string | null
                    delivery_fee_value?: number | null
                    delivery_time_max?: number | null
                    delivery_time_min?: number | null
                    hidden_sidebar_items?: string[] | null
                    id?: string
                    logo_url?: string | null
                    merchant_city?: string | null
                    pix_key?: string | null
                    pix_key_type?: string | null
                    primary_color?: string | null
                    public_slug?: string | null
                    secondary_color?: string | null
                    sidebar_color?: string | null
                    store_open?: boolean | null
                    user_id: string
                    whatsapp_number?: string | null
                }
                Update: {
                    access_token?: string | null
                    app_name?: string | null
                    created_at?: string | null
                    delivery_fee_value?: number | null
                    delivery_time_max?: number | null
                    delivery_time_min?: number | null
                    hidden_sidebar_items?: string[] | null
                    id?: string
                    logo_url?: string | null
                    merchant_city?: string | null
                    pix_key?: string | null
                    pix_key_type?: string | null
                    primary_color?: string | null
                    public_slug?: string | null
                    secondary_color?: string | null
                    sidebar_color?: string | null
                    store_open?: boolean | null
                    user_id?: string
                    whatsapp_number?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
