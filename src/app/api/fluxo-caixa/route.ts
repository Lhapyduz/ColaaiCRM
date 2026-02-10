import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();

        // Get user token from cookie or Authorization header
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '') || '';

        if (!token) {
            // Try to get from Supabase auth cookie
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

            const supabase = createClient(supabaseUrl, supabaseAnonKey, {
                global: {
                    headers: {
                        cookie: cookieStore.toString(),
                    },
                },
            });

            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
            }

            // Fetch cash flow data
            const { data: cashFlowData, error: cashFlowError } = await supabase
                .from('cash_flow')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false })
                .limit(100);

            if (cashFlowError) {
                console.error('Erro ao buscar fluxo de caixa:', cashFlowError);
                return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
            }

            return NextResponse.json({ data: cashFlowData || [] });
        }

        // If token was provided in Authorization header
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { data: cashFlowData, error: cashFlowError } = await supabase
            .from('cash_flow')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(100);

        if (cashFlowError) {
            console.error('Erro ao buscar fluxo de caixa:', cashFlowError);
            return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
        }

        return NextResponse.json({ data: cashFlowData || [] });
    } catch (error) {
        console.error('Erro no endpoint fluxo-caixa:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
