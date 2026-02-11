import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Variáveis de ambiente Supabase não configuradas');
            return NextResponse.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
        }

        // Try Authorization header first, then fallback to cookie
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '') || '';

        let supabaseHeaders: Record<string, string> = {};

        if (token) {
            supabaseHeaders = { Authorization: `Bearer ${token}` };
        } else {
            try {
                const cookieStore = await cookies();
                supabaseHeaders = { cookie: cookieStore.toString() };
            } catch {
                return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
            }
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: supabaseHeaders },
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
