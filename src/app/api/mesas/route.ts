import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

/**
 * Authenticate the request: extract user from Authorization header or cookie.
 */
async function getAuthUser(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    if (!token) return null;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}

/**
 * POST /api/mesas — Create a new mesa (bypasses RLS via admin client)
 */
export async function POST(request: Request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { numero_mesa, capacidade, ativa = true, id } = body;

        if (!numero_mesa || numero_mesa < 1) {
            return NextResponse.json({ error: 'Número da mesa inválido' }, { status: 400 });
        }

        // Check for existing mesa with same number
        const { data: existing } = await supabaseAdmin
            .from('mesas')
            .select('id, ativa')
            .eq('user_id', user.id)
            .eq('numero_mesa', numero_mesa)
            .maybeSingle();

        if (existing) {
            if (existing.ativa) {
                return NextResponse.json({ error: `A Mesa ${numero_mesa} já existe no mapa.` }, { status: 409 });
            }
            // Reactivate inactive mesa
            const { data, error } = await supabaseAdmin
                .from('mesas')
                .update({ ativa: true, capacidade: capacidade || 4 })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            return NextResponse.json({ data });
        }

        // Create new mesa
        const record = {
            ...(id ? { id } : {}),
            user_id: user.id,
            numero_mesa,
            capacidade: capacidade || 4,
            ativa,
        };

        const { data, error } = await supabaseAdmin
            .from('mesas')
            .insert(record)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: `O número da mesa ${numero_mesa} já está em uso.` }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Erro no POST /api/mesas:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

/**
 * PUT /api/mesas — Update an existing mesa (bypasses RLS via admin client)
 */
export async function PUT(request: Request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID da mesa é obrigatório' }, { status: 400 });
        }

        // Verify ownership
        const { data: existing } = await supabaseAdmin
            .from('mesas')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!existing || existing.user_id !== user.id) {
            return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 });
        }

        const { data, error } = await supabaseAdmin
            .from('mesas')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Erro no PUT /api/mesas:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

/**
 * DELETE /api/mesas — Soft-delete (deactivate) a mesa (bypasses RLS via admin client)
 */
export async function DELETE(request: Request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID da mesa é obrigatório' }, { status: 400 });
        }

        // Verify ownership
        const { data: existing } = await supabaseAdmin
            .from('mesas')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!existing || existing.user_id !== user.id) {
            return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 });
        }

        // Soft delete
        const { error } = await supabaseAdmin
            .from('mesas')
            .update({ ativa: false })
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro no DELETE /api/mesas:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
