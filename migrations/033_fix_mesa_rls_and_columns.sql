-- Migration: Fix Mesa RLS and Align Schema Columns
-- Resolves 403 Forbidden and 400 Bad Request errors

-- 1. Ensure Table schema for mesa_sessions exists
CREATE TABLE IF NOT EXISTS mesa_sessions (
    id UUID DEFAULT uuid_generate_v4 () PRIMARY KEY,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
    mesa_id UUID REFERENCES mesas (id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) DEFAULT 'ocupada' CHECK (
        status IN (
            'livre',
            'ocupada',
            'fechando',
            'suja'
        )
    ),
    garcom TEXT,
    valor_parcial DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(20) CHECK (
        payment_method IN (
            'credito',
            'debito',
            'pix',
            'dinheiro'
        )
    ),
    taxa_servico_percent DECIMAL(5, 2) DEFAULT 10,
    desconto DECIMAL(10, 2) DEFAULT 0,
    total_final DECIMAL(10, 2) DEFAULT 0,
    opened_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        closed_at TIMESTAMP
    WITH
        TIME ZONE,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 2. Ensure Table schema for mesa_session_items exists
CREATE TABLE IF NOT EXISTS mesa_session_items (
    id UUID DEFAULT uuid_generate_v4 () PRIMARY KEY,
    session_id UUID REFERENCES mesa_sessions (id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products (id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    preco_total DECIMAL(10, 2) NOT NULL,
    observacao TEXT,
    enviado_cozinha BOOLEAN DEFAULT false,
    order_id UUID REFERENCES orders (id) ON DELETE SET NULL,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- 3. Add missing columns to orders if they don't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_slug TEXT;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating_token TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- 4. Enable RLS
ALTER TABLE mesa_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE mesa_session_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for mesa_sessions
CREATE POLICY "Users can view own mesa sessions" ON mesa_sessions FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own mesa sessions" ON mesa_sessions FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update own mesa sessions" ON mesa_sessions FOR
UPDATE USING (auth.uid () = user_id);

CREATE POLICY "Users can delete own mesa sessions" ON mesa_sessions FOR DELETE USING (auth.uid () = user_id);

-- 6. RLS Policies for mesa_session_items
CREATE POLICY "Users can view own mesa session items" ON mesa_session_items FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM mesa_sessions
            WHERE
                mesa_sessions.id = mesa_session_items.session_id
                AND mesa_sessions.user_id = auth.uid ()
        )
    );

CREATE POLICY "Users can insert own mesa session items" ON mesa_session_items FOR
INSERT
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM mesa_sessions
            WHERE
                mesa_sessions.id = mesa_session_items.session_id
                AND mesa_sessions.user_id = auth.uid ()
        )
    );

CREATE POLICY "Users can update own mesa session items" ON mesa_session_items FOR
UPDATE USING (
    EXISTS (
        SELECT 1
        FROM mesa_sessions
        WHERE
            mesa_sessions.id = mesa_session_items.session_id
            AND mesa_sessions.user_id = auth.uid ()
    )
);

CREATE POLICY "Users can delete own mesa session items" ON mesa_session_items FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM mesa_sessions
        WHERE
            mesa_sessions.id = mesa_session_items.session_id
            AND mesa_sessions.user_id = auth.uid ()
    )
);