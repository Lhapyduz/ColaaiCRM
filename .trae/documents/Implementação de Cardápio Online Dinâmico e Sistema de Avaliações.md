# Plano de Implementação: Sistema de Cardápio Online Completo

Este plano detalha a implementação das funcionalidades solicitadas (Status da Loja, Tempo de Entrega, Avaliações, Personalização) integrando-se à arquitetura existente (Next.js, Supabase, Tailwind).

## 1. Banco de Dados (Migração)
Criaremos uma nova migração para suportar as funcionalidades de resposta e moderação de avaliações, que atualmente não existem no schema.
*   **Arquivo:** `migrations/023_add_rating_features.sql`
*   **Alterações:**
    *   Adicionar colunas `reply` (TEXT) e `replied_at` (TIMESTAMP) nas tabelas `store_ratings` e `product_ratings`.
    *   Adicionar coluna `hidden` (BOOLEAN DEFAULT FALSE) nas tabelas `store_ratings` e `product_ratings` para permitir ocultar avaliações inadequadas.

## 2. Backend (Server Actions)
Atualizaremos `src/app/actions/store.ts` e criaremos novas ações para gerenciar as avaliações.
*   **Gerenciamento de Avaliações:**
    *   `replyToStoreRating(ratingId, replyText)`: Salvar resposta do dono.
    *   `replyToProductRating(ratingId, replyText)`: Salvar resposta do dono.
    *   `toggleStoreRatingVisibility(ratingId, hidden)`: Ocultar/Exibir avaliação.
    *   `toggleProductRatingVisibility(ratingId, hidden)`: Ocultar/Exibir avaliação.
    *   `deleteStoreRating(ratingId)` & `deleteProductRating(ratingId)`: Remover avaliação.
*   **Leitura de Dados:**
    *   Garantir que `getOpeningHours` e `getStoreAnalytics` estejam otimizados para o cliente final.

## 3. Frontend: Cardápio Online (`src/app/menu/[slug]`)
A interface do cliente será atualizada para ser dinâmica, mantendo o design atual.
*   **Status da Loja (Aberto/Fechado):**
    *   Criar lógica no `MenuClient.tsx` que compara a hora atual com `opening_hours` e considera o override manual `store_open` das configurações.
    *   Substituir o badge estático "Aberto Agora" por um indicador dinâmico (Verde=Aberto, Vermelho=Fechado) com o horário de abertura/fechamento.
*   **Tempo de Entrega:**
    *   Substituir o texto estático "30-45 min" pelos valores de `user_settings.delivery_time_min` e `max`.
*   **Sistema de Avaliação Duplo:**
    *   **Avaliação da Loja:** Tornar o badge de estrelas no header clicável. Abrir um novo componente `StoreRatingModal`.
    *   **Avaliação de Produto:** Adicionar botão de "Avaliar" (ou estrela interativa) no card do produto. Abrir `ProductRatingModal`.
    *   Implementar validação via `localStorage` para impedir avaliações consecutivas (spam) no mesmo dia.
*   **Personalização:**
    *   As variáveis CSS `--menu-primary` e `--menu-secondary` já estão sendo aplicadas. Validaremos se todos os elementos (botões, badges) estão consumindo essas variáveis corretamente.

## 4. Frontend: Painel Administrativo (`src/app/configuracoes`)
Melhorias na aba "Avaliações" e verificação das outras configurações.
*   **Aba Avaliações:**
    *   Listar avaliações de **Produtos** e da **Loja** (atualmente só busca da loja).
    *   Adicionar botões de ação em cada card de avaliação:
        *   **Responder:** Abre input de texto para enviar resposta.
        *   **Olho (Visibilidade):** Alterna o status `hidden`.
        *   **Lixeira:** Exclui a avaliação.
*   **Configurações Gerais:**
    *   Validar se os inputs de "Tempo de Entrega" e "Horário de Funcionamento" estão persistindo corretamente (já parecem implementados, faremos testes de integração).

## 5. Verificação e Testes
*   **Teste de Fluxo:** Simular um cliente acessando o cardápio em horário fechado (deve mostrar Fechado).
*   **Teste de Avaliação:** Enviar uma avaliação como cliente e respondê-la como admin.
*   **Teste de Personalização:** Mudar a cor principal no admin e verificar se o botão "Adicionar" do cardápio muda de cor instantaneamente (via refresh ou state).
