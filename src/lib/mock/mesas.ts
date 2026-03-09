/**
 * Mocks Iniciais para Desenvolvimento UI-First do Sistema de Mesas
 * Esta é uma representação temporária do que virá do banco de dados na próxima etapa.
 */

export type MesaStatus = 'livre' | 'ocupada' | 'suja' | 'fechando';

export interface MesaMockItem {
    id: string;
    produto_id: string;
    nome: string;
    quantidade: number;
    preco_unitario: number;
    preco_total: number;
    observacao?: string;
    enviado_cozinha: boolean;
}

export interface MesaMock {
    id: string;
    numero_mesa: number;
    capacidade: number;
    status: MesaStatus;
    garcom?: string;
    criado_em?: string;
    atualizado_em?: string;
    itens_parciais: MesaMockItem[];
    valor_parcial: number;
}

export const mockedMesas: MesaMock[] = [
    {
        id: 'm1',
        numero_mesa: 1,
        capacidade: 4,
        status: 'livre',
        itens_parciais: [],
        valor_parcial: 0,
    },
    {
        id: 'm2',
        numero_mesa: 2,
        capacidade: 2,
        status: 'ocupada',
        garcom: 'João',
        criado_em: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        itens_parciais: [
            {
                id: 'i1',
                produto_id: 'p1',
                nome: 'Dogão Turbinado',
                quantidade: 2,
                preco_unitario: 25.0,
                preco_total: 50.0,
                enviado_cozinha: true,
            },
            {
                id: 'i2',
                produto_id: 'p2',
                nome: 'Refrigerante Cola 350ml',
                quantidade: 2,
                preco_unitario: 6.0,
                preco_total: 12.0,
                enviado_cozinha: true,
            },
        ],
        valor_parcial: 62.0,
    },
    {
        id: 'm3',
        numero_mesa: 3,
        capacidade: 6,
        status: 'fechando',
        garcom: 'Maria',
        criado_em: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        itens_parciais: [
            {
                id: 'i3',
                produto_id: 'p3',
                nome: 'Combo Família',
                quantidade: 1,
                preco_unitario: 89.9,
                preco_total: 89.9,
                enviado_cozinha: true,
            },
            {
                id: 'i4',
                produto_id: 'p4',
                nome: 'Suco Laranja 1L',
                quantidade: 1,
                preco_unitario: 15.0,
                preco_total: 15.0,
                enviado_cozinha: true,
            },
        ],
        valor_parcial: 104.9,
    },
    {
        id: 'm4',
        numero_mesa: 4,
        capacidade: 4,
        status: 'livre',
        itens_parciais: [],
        valor_parcial: 0,
    },
    {
        id: 'm5',
        numero_mesa: 5,
        capacidade: 4,
        status: 'suja',
        itens_parciais: [],
        valor_parcial: 0,
    },
    {
        id: 'm6',
        numero_mesa: 6,
        capacidade: 8,
        status: 'ocupada',
        garcom: 'Carlos',
        criado_em: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        itens_parciais: [
            {
                id: 'i5',
                produto_id: 'p5',
                nome: 'Dogão Clássico',
                quantidade: 3,
                preco_unitario: 20.0,
                preco_total: 60.0,
                enviado_cozinha: false,
            },
            {
                id: 'i6',
                produto_id: 'p6',
                nome: 'Energético lata',
                quantidade: 3,
                preco_unitario: 8.0,
                preco_total: 24.0,
                enviado_cozinha: false,
            },
        ],
        valor_parcial: 84.0,
    },
    {
        id: 'm7',
        numero_mesa: 7,
        capacidade: 2,
        status: 'ocupada',
        garcom: 'Ana',
        criado_em: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        itens_parciais: [
            {
                id: 'i7',
                produto_id: 'p7',
                nome: 'Dogão Cheddar Bacon',
                quantidade: 1,
                preco_unitario: 29.9,
                preco_total: 29.9,
                enviado_cozinha: true,
            },
            {
                id: 'i8',
                produto_id: 'p8',
                nome: 'Água Mineral 500ml',
                quantidade: 1,
                preco_unitario: 4.0,
                preco_total: 4.0,
                enviado_cozinha: true,
            },
        ],
        valor_parcial: 33.9,
    },
    {
        id: 'm8',
        numero_mesa: 8,
        capacidade: 6,
        status: 'livre',
        itens_parciais: [],
        valor_parcial: 0,
    },
    {
        id: 'm9',
        numero_mesa: 9,
        capacidade: 4,
        status: 'suja',
        itens_parciais: [],
        valor_parcial: 0,
    },
    {
        id: 'm10',
        numero_mesa: 10,
        capacidade: 10,
        status: 'ocupada',
        garcom: 'João',
        criado_em: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        itens_parciais: [
            {
                id: 'i9',
                produto_id: 'p9',
                nome: 'Combo Trio (3 Dogs)',
                quantidade: 2,
                preco_unitario: 59.9,
                preco_total: 119.8,
                enviado_cozinha: true,
            },
            {
                id: 'i10',
                produto_id: 'p10',
                nome: 'Batata Frita Grande',
                quantidade: 2,
                preco_unitario: 22.0,
                preco_total: 44.0,
                enviado_cozinha: true,
            },
            {
                id: 'i11',
                produto_id: 'p11',
                nome: 'Guaraná 2L',
                quantidade: 1,
                preco_unitario: 12.0,
                preco_total: 12.0,
                enviado_cozinha: false,
            },
        ],
        valor_parcial: 175.8,
    },
];
