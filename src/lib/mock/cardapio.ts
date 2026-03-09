/**
 * Mock do Cardápio para a Tela de Detalhes da Mesa
 * Categorias e produtos para exibição no modal de gerenciamento de pedidos.
 */

export interface CategoriaCardapio {
    id: string;
    nome: string;
    emoji: string;
}

export interface ProdutoCardapio {
    id: string;
    nome: string;
    preco: number;
    categoria_id: string;
    imagem_url: string;
}

export const categoriasCardapio: CategoriaCardapio[] = [
    { id: 'cat-bebidas', nome: 'Bebidas', emoji: '🥤' },
    { id: 'cat-entradas', nome: 'Entradas', emoji: '🍟' },
    { id: 'cat-pratos', nome: 'Pratos Principais', emoji: '🌭' },
    { id: 'cat-sobremesas', nome: 'Sobremesas', emoji: '🍰' },
];

export const produtosCardapio: ProdutoCardapio[] = [
    // ——— Bebidas ———
    { id: 'p-b1', nome: 'Refrigerante Cola 350ml', preco: 6.00, categoria_id: 'cat-bebidas', imagem_url: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&h=300&fit=crop' },
    { id: 'p-b2', nome: 'Suco de Laranja 500ml', preco: 10.00, categoria_id: 'cat-bebidas', imagem_url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=300&fit=crop' },
    { id: 'p-b3', nome: 'Água Mineral 500ml', preco: 4.00, categoria_id: 'cat-bebidas', imagem_url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop' },
    { id: 'p-b4', nome: 'Guaraná 2L', preco: 12.00, categoria_id: 'cat-bebidas', imagem_url: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=300&h=300&fit=crop' },
    { id: 'p-b5', nome: 'Energético Lata', preco: 8.00, categoria_id: 'cat-bebidas', imagem_url: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=300&h=300&fit=crop' },
    { id: 'p-b6', nome: 'Cerveja Long Neck', preco: 9.90, categoria_id: 'cat-bebidas', imagem_url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&h=300&fit=crop' },

    // ——— Entradas ———
    { id: 'p-e1', nome: 'Batata Frita Grande', preco: 22.00, categoria_id: 'cat-entradas', imagem_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=300&fit=crop' },
    { id: 'p-e2', nome: 'Onion Rings', preco: 18.00, categoria_id: 'cat-entradas', imagem_url: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=300&h=300&fit=crop' },
    { id: 'p-e3', nome: 'Nuggets (10un)', preco: 19.90, categoria_id: 'cat-entradas', imagem_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=300&h=300&fit=crop' },
    { id: 'p-e4', nome: 'Queijo Coalho', preco: 15.00, categoria_id: 'cat-entradas', imagem_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&h=300&fit=crop' },
    { id: 'p-e5', nome: 'Mandioca Frita', preco: 16.00, categoria_id: 'cat-entradas', imagem_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=300&fit=crop' },
    { id: 'p-e6', nome: 'Polenta Frita', preco: 14.00, categoria_id: 'cat-entradas', imagem_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&h=300&fit=crop' },

    // ——— Pratos Principais ———
    { id: 'p-p1', nome: 'Dogão Clássico', preco: 20.00, categoria_id: 'cat-pratos', imagem_url: 'https://images.unsplash.com/photo-1612392062126-86f785454e05?w=300&h=300&fit=crop' },
    { id: 'p-p2', nome: 'Dogão Turbinado', preco: 25.00, categoria_id: 'cat-pratos', imagem_url: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=300&h=300&fit=crop' },
    { id: 'p-p3', nome: 'Dogão Cheddar Bacon', preco: 29.90, categoria_id: 'cat-pratos', imagem_url: 'https://images.unsplash.com/photo-1551615593-ef5fe247e8f7?w=300&h=300&fit=crop' },
    { id: 'p-p4', nome: 'Combo Família', preco: 89.90, categoria_id: 'cat-pratos', imagem_url: 'https://images.unsplash.com/photo-1561758033-7e924f619b47?w=300&h=300&fit=crop' },
    { id: 'p-p5', nome: 'Combo Trio (3 Dogs)', preco: 59.90, categoria_id: 'cat-pratos', imagem_url: 'https://images.unsplash.com/photo-1613769049987-b31b641f25b1?w=300&h=300&fit=crop' },
    { id: 'p-p6', nome: 'Dog Vegetariano', preco: 22.00, categoria_id: 'cat-pratos', imagem_url: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300&h=300&fit=crop' },

    // ——— Sobremesas ———
    { id: 'p-s1', nome: 'Pudim de Leite', preco: 12.00, categoria_id: 'cat-sobremesas', imagem_url: 'https://images.unsplash.com/photo-1614961908858-21b28d5f6a1f?w=300&h=300&fit=crop' },
    { id: 'p-s2', nome: 'Brownie com Sorvete', preco: 18.00, categoria_id: 'cat-sobremesas', imagem_url: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=300&h=300&fit=crop' },
    { id: 'p-s3', nome: 'Açaí 500ml', preco: 20.00, categoria_id: 'cat-sobremesas', imagem_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&h=300&fit=crop' },
    { id: 'p-s4', nome: 'Churros (6un)', preco: 14.00, categoria_id: 'cat-sobremesas', imagem_url: 'https://images.unsplash.com/photo-1624471783244-4ff1b267174a?w=300&h=300&fit=crop' },
    { id: 'p-s5', nome: 'Sorvete 2 Bolas', preco: 10.00, categoria_id: 'cat-sobremesas', imagem_url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=300&fit=crop' },
    { id: 'p-s6', nome: 'Torta de Limão', preco: 13.00, categoria_id: 'cat-sobremesas', imagem_url: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=300&h=300&fit=crop' },
];
