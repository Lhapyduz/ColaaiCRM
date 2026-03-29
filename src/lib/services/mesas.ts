import { supabase, Database } from '../supabase';

export type Mesa = Database['public']['Tables']['mesas']['Row'];
export type MesaSession = Database['public']['Tables']['mesa_sessions']['Row'];
export type MesaSessionItem = Database['public']['Tables']['mesa_session_items']['Row'] & {
    orders?: { status: string } | null;
};

export type MesaWithActiveSession = Mesa & {
    active_session: (MesaSession & { items?: MesaSessionItem[] }) | null;
};

/**
 * Busca todas as mesas ativas e a sessão atual (se houver), 
 * incluindo os itens da sessão.
 */
export async function getMesas(): Promise<MesaWithActiveSession[]> {
    const { data: mesas, error: mesasError } = await supabase
        .from('mesas')
        .select(`
            *,
            mesa_sessions (
                *,
                mesa_session_items (*)
            )
        `)
        .eq('ativa', true)
        .order('numero_mesa', { ascending: true });

    if (mesasError) {
        console.error("Erro ao buscar mesas:", mesasError);
        throw mesasError;
    }

    // Transforma o array do join na prop 'active_session' para facilitar
    return mesas.map(mesa => {
        // Encontra a sessão que não tem data de fechamento, ou pega a última se houver lógica diferente
        const active_session = mesa.mesa_sessions?.find((s: MesaSession) => s.closed_at === null) || null;

        return {
            ...mesa,
            active_session: active_session
                ? {
                    ...active_session,
                    items: active_session.mesa_session_items || []
                }
                : null
        };
    });
}

/**
 * Busca detalhes de uma rota específica (só para consistência/segurança).
 */
export async function getMesaById(mesaId: string): Promise<MesaWithActiveSession | null> {
    const { data: mesa, error } = await supabase
        .from('mesas')
        .select(`
            *,
            mesa_sessions (
                *,
                mesa_session_items (
                    *,
                    orders (status)
                )
            )
        `)
        .eq('id', mesaId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error("Erro ao buscar mesa:", error);
        throw error;
    }

    const active_session = mesa.mesa_sessions?.find((s: MesaSession) => s.closed_at === null) || null;

    return {
        ...mesa,
        active_session: active_session
            ? {
                ...active_session,
                items: active_session.mesa_session_items || []
            }
            : null
    };
}

/**
 * Abre uma nova sessão para uma mesa
 */
export async function abrirMesa(mesaId: string, garcom?: string) {
    const userRes = await supabase.auth.getUser();
    if (!userRes.data.user) throw new Error("Usuário não autenticado");
    const userId = userRes.data.user.id;

    // Buscar configurações do usuário para pegar a taxa padrão
    const { data: settings } = await supabase
        .from('user_settings')
        .select('taxa_servico_enabled, taxa_servico_percent')
        .eq('user_id', userId)
        .single();

    const sessionToInsert: Database['public']['Tables']['mesa_sessions']['Insert'] = {
        mesa_id: mesaId,
        user_id: userId,
        status: 'ocupada',
        garcom: garcom && garcom.trim() !== '' ? garcom.trim() : 'Nenhum',
        valor_parcial: 0,
        taxa_servico_percent: settings?.taxa_servico_enabled ? (Number(settings.taxa_servico_percent) || 10) : 0,
        desconto: 0,
        total_final: 0
    };

    const { data: newSession, error } = await supabase
        .from('mesa_sessions')
        .insert(sessionToInsert)
        .select()
        .single();

    if (error) {
        console.error("Erro ao abrir mesa:", error);
        throw error;
    }

    return newSession;
}

/**
 * Altera status da sessão ativa de uma mesa (ex: para 'fechando' ou 'suja')
 */
export async function updateStatusMesa(sessionId: string, newStatus: 'livre' | 'ocupada' | 'fechando' | 'suja') {
    const { data, error } = await supabase
        .from('mesa_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId)
        .select()
        .single();

    if (error) {
        console.error("Erro ao atualizar status:", error);
        throw error;
    }
    return data;
}

/**
 * Adiciona um item na sessão de uma mesa e atualiza o valor parcial
 */
export async function addSessionItem(
    sessionId: string,
    produto: { id: string, nome: string, preco: number },
    quantidade: number = 1,
    observacao: string = ''
) {
    const itemTotal = produto.preco * quantidade;

    const { data: newItem, error: itemError } = await supabase
        .from('mesa_session_items')
        .insert({
            session_id: sessionId,
            product_id: produto.id,
            product_name: produto.nome,
            quantidade,
            preco_unitario: produto.preco,
            preco_total: itemTotal,
            observacao,
            enviado_cozinha: false
        })
        .select()
        .single();

    if (itemError) {
        console.error("Erro ao adicionar item:", itemError);
        throw itemError;
    }

    // Após adicionar item, buscar sessão para atualizar o valor parcial
    const { data: sessionData, error: sessionFetchError } = await supabase
        .from('mesa_sessions')
        .select('valor_parcial')
        .eq('id', sessionId)
        .single();

    if (!sessionFetchError && sessionData) {
        await supabase
            .from('mesa_sessions')
            .update({ valor_parcial: sessionData.valor_parcial + itemTotal })
            .eq('id', sessionId);
    }

    return newItem;
}

/**
 * Fecha a sessão de uma mesa e sincroniza com o sistema financeiro (Caixa/Relatórios)
 */
export async function fecharMesaSessao(
    sessionId: string,
    paymentMethod: 'credito' | 'debito' | 'pix' | 'dinheiro',
    taxaServico: number, // Valor em R$ da taxa
    desconto: number = 0,
    totalFinal: number
) {
    // 1. Buscar dados da sessão e itens para criar o Pedido (Order)
    const { data: session, error: sessionError } = await supabase
        .from('mesa_sessions')
        .select(`
            *,
            mesas:mesa_id (numero_mesa),
            items:mesa_session_items (
                product_id,
                quantidade,
                preco_unitario,
                preco_total,
                product_name
            )
        `)
        .eq('id', sessionId)
        .single();

    if (sessionError || !session) {
        throw new Error("Sessão não encontrada para fechamento");
    }

    // 2. Obter próximo order_number
    const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .eq('user_id', session.user_id)
        .order('order_number', { ascending: false })
        .limit(1)
        .single();

    const orderNumber = (lastOrder?.order_number || 0) + 1;

    // 3. Criar registro na tabela 'orders'
    // Mapeamento de métodos de pagamento (frontend -> banco)
    const paymentMethodMap: Record<string, string> = {
        'money': 'money',
        'dinheiro': 'money',
        'pix': 'pix',
        'credito': 'credit',
        'debito': 'debit',
        'credit': 'credit',
        'debit': 'debit'
    };

    // Tentar localizar o ID do garçom pelo nome salvo na sessão
    let garcom_id = null;
    if (session.garcom && session.garcom !== 'Nenhum') {
        const { data: garcomData } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', session.user_id)
            .ilike('name', session.garcom)
            .maybeSingle(); // maybeSingle para não dar erro se não achar exatamente

        if (garcomData) {
            garcom_id = garcomData.id;
        }
    }

    const dbPaymentMethod = paymentMethodMap[paymentMethod] || 'money';

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: session.user_id,
            order_number: orderNumber,
            customer_name: `Mesa ${session.mesas?.numero_mesa || ''} - ${session.garcom || 'Consumidor'}`,
            status: 'delivered', // 'completed' viola a constraint orders_status_check
            payment_method: dbPaymentMethod,
            payment_status: 'paid',
            subtotal: totalFinal + desconto - taxaServico,
            total: totalFinal,
            discount_amount: desconto,
            service_fee: taxaServico,
            garcom_id: garcom_id,
            is_delivery: false,
            notes: `Fechamento de mesa via PDV`
        })
        .select()
        .single();

    if (orderError) {
        console.error("Erro ao inserir pedido (orders):", orderError);
        throw orderError;
    }

    // 4. Criar registros em 'order_items'
    if (session.items && session.items.length > 0) {
        const orderItems = session.items.map((item: {
            product_id: string | null,
            quantidade: number,
            preco_unitario: number,
            preco_total: number,
            product_name: string | null
        }) => ({
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name || 'Produto',
            quantity: item.quantidade,
            unit_price: item.preco_unitario,
            total: item.preco_total
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) console.error("Erro ao inserir itens do pedido no fechamento:", itemsError);
    }

    // 5. Atualizar a sessão da mesa como encerrada
    const { data, error } = await supabase
        .from('mesa_sessions')
        .update({
            status: 'livre',
            payment_method: paymentMethod,
            taxa_servico_percent: taxaServico, // Guardamos o valor fixo por simplicidade ou percentual se preferir
            desconto: desconto,
            total_final: totalFinal,
            closed_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

    if (error) {
        console.error("Erro ao fechar sessão da mesa:", error);
        throw error;
    }

    // 6. Liberar qualquer mesa que tenha sido agrupada a esta
    if (session.mesas?.numero_mesa) {
        const tableNumberStr = String(session.mesas.numero_mesa).padStart(2, '0');
        const groupedString = `[Unida c/ Mesa ${tableNumberStr}]`;
        
        await supabase
            .from('mesa_sessions')
            .update({
                status: 'livre',
                closed_at: new Date().toISOString()
            })
            .eq('garcom', groupedString)
            .is('closed_at', null);
    }

    return data;
}

/**
 * Separa a força todas as mesas que estão agrupadas a uma mesa destino.
 */
export async function desagruparTodas(numeroMesa: number) {
    const tableNumberStr = String(numeroMesa).padStart(2, '0');
    const groupedString = `[Unida c/ Mesa ${tableNumberStr}]`;
    
    const { error } = await supabase
        .from('mesa_sessions')
        .update({
            status: 'livre',
            closed_at: new Date().toISOString()
        })
        .eq('garcom', groupedString)
        .is('closed_at', null);
        
    if (error) throw new Error("Erro ao desagrupar contas: " + error.message);
    return true;
}

/**
 * Cria várias mesas (utilitário para o botão "Seed")
 */
export async function createMesaSeed(qtde: number = 1) {
    const userRes = await supabase.auth.getUser();
    if (!userRes.data.user) throw new Error("Usuário não autenticado");
    const userId = userRes.data.user.id;

    // Buscar maior numero_mesa do usuario pra auto-incrementar visualmente
    const { data: maxMesa, error: errorFetch } = await supabase
        .from('mesas')
        .select('numero_mesa')
        .eq('user_id', userId)
        .order('numero_mesa', { ascending: false })
        .limit(1);

    const baseNumber = (!errorFetch && maxMesa && maxMesa.length > 0) ? maxMesa[0].numero_mesa : 0;

    const mesasToInsert = Array.from({ length: qtde }).map((_, i) => ({
        user_id: userId,
        numero_mesa: baseNumber + i + 1,
        capacidade: 4,
        ativa: true
    }));

    const { data, error } = await supabase
        .from('mesas')
        .insert(mesasToInsert)
        .select();

    if (error) throw error;
    return data;
}

/**
 * Confirma itens da mesa, enviando para a Cozinha:
 * 1. Cria um Order invisível para o faturamento (total = 0)
 * 2. Adiciona os itens ao Order
 * 3. Marca os itens da sessão como 'enviado_cozinha' = true
 */
export async function confirmarItensMesa(
    sessionId: string,
    numeroMesa: number,
    userId: string,
    itemsToConfirm: {
        id: string;
        product_id: string | null;
        product_name: string;
        quantidade: number;
        preco_unitario: number;
        preco_total: number;
        observacao: string | null;
    }[]
) {
    if (!itemsToConfirm || itemsToConfirm.length === 0) return;

    // 0. Pegar o próximo número do pedido para o usuário (vendedor)
    const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .eq('user_id', userId)
        .order('order_number', { ascending: false })
        .limit(1)
        .single();

    const nextOrderNumber = (lastOrder?.order_number || 0) + 1;

    // 1. Criar Ticket (Order) para a Cozinha
    const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            customer_name: `Mesa ${numeroMesa}`,
            status: 'pending', // Fica pendente na cozinha
            payment_method: 'money',
            payment_status: 'pending', // Conforme solicitado: o pedido não precisa estar pago
            subtotal: 0,
            delivery_fee: 0,
            total: 0, // Fundamental para não duplicar receita no Dashboard
            notes: `Pedido da Mesa ${numeroMesa}`,
            is_delivery: false,
            order_number: nextOrderNumber, // Adicionado para satisfazer a constraint NOT NULL
        })
        .select()
        .single();

    if (orderError) {
        throw new Error(`Erro ao criar ticket para a cozinha: ${orderError.message}`);
    }

    // 2. Transcrever Itens para o Ticket
    const orderItems = itemsToConfirm.map((item) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        product_name: item.product_name, // Obrigatório em order_items
        quantity: item.quantidade,
        unit_price: item.preco_unitario,
        total: item.preco_total, // Era total_price (erro)
        notes: item.observacao,
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

    if (itemsError) {
        throw new Error(`Erro ao popular ticket da cozinha: ${itemsError.message}`);
    }

    // 3. Marcar Itens como Enviados na Mesa
    const itemIds = itemsToConfirm.map(i => i.id);

    // O Supabase tem uma limitação com atualização 'in' diretamente pelo SDK tipado sem uma match function exata,
    // mas eq() na verdade pode ser contornado atualizando um por um, ou usando um .in() global se a RLS permitir.
    // Vamos atualizar iterando por segurança para evitar problemas de tipos, visto que são poucos itens.
    for (const itemId of itemIds) {
        await supabase
            .from('mesa_session_items')
            .update({
                enviado_cozinha: true,
                order_id: newOrder.id // Vincula o item ao ticket da cozinha
            })
            .eq('id', itemId);
    }

    return newOrder;
}

/**
 * Une duas mesas (sessões) fisicamente.
 * A mesa origem será bloqueada com um status 'ocupada' e um aviso, 
 * enquanto a mesa destino reterá os itens e o valor total.
 */
export async function unirMesas(sourceMesaId: string, targetMesaId: string, garcomNome?: string) {
    if (!sourceMesaId || !targetMesaId) {
        throw new Error("IDs de mesa inválidos para união.");
    }

    const { data: sourceMesa } = await supabase.from('mesas').select('numero_mesa').eq('id', sourceMesaId).single();
    const { data: targetMesa } = await supabase.from('mesas').select('numero_mesa').eq('id', targetMesaId).single();

    if (!sourceMesa || !targetMesa) throw new Error("Mesa não encontrada");

    // Determina a sessão ativa de cada mesa (null se estiver livre)
    const { data: sourceSession } = await supabase.from('mesa_sessions').select('*').eq('mesa_id', sourceMesaId).is('closed_at', null).maybeSingle();
    const { data: targetSession } = await supabase.from('mesa_sessions').select('*').eq('mesa_id', targetMesaId).is('closed_at', null).maybeSingle();

    let finalTargetSessionId = targetSession?.id;

    // 1. Garante que Target possui uma sessão ativa para receber itens
    if (!finalTargetSessionId) {
        const principalName = garcomNome && garcomNome.trim() !== '' ? garcomNome : 'Mesa Principal';
        const newTargetSession = await abrirMesa(targetMesaId, principalName);
        finalTargetSessionId = newTargetSession.id;
    } else if (garcomNome && garcomNome.trim() !== '') {
        // Atualiza o garçom da mesa principal se um novo for fornecido
        await supabase.from('mesa_sessions').update({ garcom: garcomNome }).eq('id', finalTargetSessionId);
    }

    // 2. Se Origin tiver sessão, transferir itens e valores. Em seguida bloqueá-la.
    if (sourceSession && sourceSession.id) {
        if (sourceSession.valor_parcial > 0) {
            // Transferir os itens
            await supabase.from('mesa_session_items').update({ session_id: finalTargetSessionId }).eq('session_id', sourceSession.id);

            // Atualizar o valor parcial da sessão destino
            const { data: currentTargetSession } = await supabase.from('mesa_sessions').select('valor_parcial').eq('id', finalTargetSessionId).single();
            if (currentTargetSession) {
                await supabase.from('mesa_sessions').update({ 
                    valor_parcial: currentTargetSession.valor_parcial + sourceSession.valor_parcial 
                }).eq('id', finalTargetSessionId);
            }
        }
        
        // Bloquear a sessão Origem (não liberar, pois agora estão juntas fisicamente)
        await supabase.from('mesa_sessions').update({
            status: 'ocupada',
            garcom: `[Unida c/ Mesa ${String(targetMesa.numero_mesa).padStart(2, '0')}]`,
            valor_parcial: 0
        }).eq('id', sourceSession.id);
    } else {
        // Se a Origem estava livre, apenas criamos uma nova sessão bloqueada nela
        await abrirMesa(sourceMesaId, `[Unida c/ Mesa ${String(targetMesa.numero_mesa).padStart(2, '0')}]`);
    }

    return true;
}

/**
 * Libera/Separa uma mesa que estava bloqueada por causa de uma junção.
 */
export async function separarMesa(sessionId: string) {
    const { error } = await supabase.from('mesa_sessions').update({
        status: 'livre',
        closed_at: new Date().toISOString()
    }).eq('id', sessionId);
    
    if (error) throw new Error("Erro ao separar mesa: " + error.message);
    return true;
}

/**
 * Cria uma nova mesa no mapa, ou reativa caso já exista número inativo.
 */
export async function createMesa(numero_mesa: number, capacidade: number) {
    const userRes = await supabase.auth.getUser();
    if (!userRes.data.user) throw new Error("Usuário não autenticado");
    
    // Verifica se já existe uma mesa (ativa ou inativa) com este número
    const { data: existing } = await supabase
        .from('mesas')
        .select('*')
        .eq('user_id', userRes.data.user.id)
        .eq('numero_mesa', numero_mesa)
        .maybeSingle();

    if (existing) {
        if (existing.ativa) {
            throw new Error(`A Mesa ${numero_mesa} já existe no mapa.`);
        }
        // Reativa a mesa apagada anteriormente
        const { data, error } = await supabase
            .from('mesas')
            .update({ ativa: true, capacidade })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw new Error("Erro ao reativar mesa: " + error.message);
        return data;
    }

    const { data, error } = await supabase
        .from('mesas')
        .insert({
            user_id: userRes.data.user.id,
            numero_mesa,
            capacidade,
            ativa: true
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') throw new Error(`O número da mesa ${numero_mesa} já está em uso.`);
        throw new Error("Erro ao criar mesa: " + error.message);
    }
    return data;
}

/**
 * Atualiza os dados de uma mesa existente.
 */
export async function updateMesa(id: string, numero_mesa: number, capacidade: number) {
    const userRes = await supabase.auth.getUser();
    if (!userRes.data.user) throw new Error("Usuário não autenticado");

    // Verifica se já existe OUTRA mesa com este número
    const { data: existing } = await supabase
        .from('mesas')
        .select('id, ativa')
        .eq('user_id', userRes.data.user.id)
        .eq('numero_mesa', numero_mesa)
        .neq('id', id)
        .maybeSingle();

    if (existing) {
        throw new Error(`A Mesa ${numero_mesa} já está em uso${!existing.ativa ? ' (mesa oculta/em lixeira)' : ''}.`);
    }

    const { data, error } = await supabase
        .from('mesas')
        .update({ numero_mesa, capacidade })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error("Erro ao atualizar mesa: " + error.message);
    return data;
}

/**
 * Deleta (ou desativa) uma mesa do mapa.
 */
export async function deleteMesa(id: string) {
    // Definimos como inativa no lugar de deletar para não quebrar orders atreladas, 
    // ou tentamos deletar se preferir. 'ativa: false' é mais seguro.
    const { error } = await supabase
        .from('mesas')
        .update({ ativa: false })
        .eq('id', id);

    if (error) throw new Error("Erro ao excluir mesa: " + error.message);
    return true;
}
