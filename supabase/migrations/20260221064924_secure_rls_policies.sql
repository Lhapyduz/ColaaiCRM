-- Script de Migração: Configuração de Políticas de Row Level Security (RLS)
-- Garante que lojas só vejam e manipulem seus próprios dados, e visitantes
-- apenas consigam visualizar cardápios e produtos, mas não interferir em pedidos.

-- 1. Tabela user_settings (Lojas)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.user_settings;

CREATE POLICY "Public profiles are viewable by everyone." ON public.user_settings FOR
SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile." ON public.user_settings;

CREATE POLICY "Users can update own profile." ON public.user_settings FOR
UPDATE USING (auth.uid () = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.user_settings;

CREATE POLICY "Users can insert their own profile." ON public.user_settings FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

DROP POLICY IF EXISTS "Users can delete own profile." ON public.user_settings;

CREATE POLICY "Users can delete own profile." ON public.user_settings FOR DELETE USING (auth.uid () = user_id);

-- 2. Tabela products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are viewable by everyone." ON public.products;

CREATE POLICY "Products are viewable by everyone." ON public.products FOR
SELECT USING (true);

DROP POLICY IF EXISTS "Users can perform all actions on own products" ON public.products;

CREATE POLICY "Users can perform all actions on own products" ON public.products FOR ALL USING (auth.uid () = user_id);

-- 3. Tabela categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;

CREATE POLICY "Categories are viewable by everyone." ON public.categories FOR
SELECT USING (true);

DROP POLICY IF EXISTS "Users can perform all actions on own categories" ON public.categories;

CREATE POLICY "Users can perform all actions on own categories" ON public.categories FOR ALL USING (auth.uid () = user_id);

-- 4. Tabela orders (Pedidos)
-- Insert é feito através da server action createOrder com a key de Service Role.
-- Desta forma, bloqueamos o acesso aos visitantes e garantimos segurança total.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owner can view own orders." ON public.orders;

CREATE POLICY "Store owner can view own orders." ON public.orders FOR
SELECT USING (auth.uid () = user_id);

DROP POLICY IF EXISTS "Store owner can update own orders." ON public.orders;

CREATE POLICY "Store owner can update own orders." ON public.orders FOR
UPDATE USING (auth.uid () = user_id);

DROP POLICY IF EXISTS "Store owner can delete own orders." ON public.orders;

CREATE POLICY "Store owner can delete own orders." ON public.orders FOR DELETE USING (auth.uid () = user_id);

-- 5. Tabela order_items (Itens dos pedidos)
-- Insert é feito via Service Role Key também.
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owner can view own order items." ON public.order_items;

CREATE POLICY "Store owner can view own order items." ON public.order_items FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.orders
            WHERE
                public.orders.id = public.order_items.order_id
                AND public.orders.user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "Store owner can update own order items." ON public.order_items;

CREATE POLICY "Store owner can update own order items." ON public.order_items FOR
UPDATE USING (
    EXISTS (
        SELECT 1
        FROM public.orders
        WHERE
            public.orders.id = public.order_items.order_id
            AND public.orders.user_id = auth.uid ()
    )
);

DROP POLICY IF EXISTS "Store owner can delete own order items." ON public.order_items;

CREATE POLICY "Store owner can delete own order items." ON public.order_items FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.orders
        WHERE
            public.orders.id = public.order_items.order_id
            AND public.orders.user_id = auth.uid ()
    )
);

-- 6. Tabela admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view their own record." ON public.admin_users;

CREATE POLICY "Admins can view their own record." ON public.admin_users FOR
SELECT USING (auth.uid () = user_id);