# Configuração do Stripe

Para que a integração com o Stripe funcione, você precisa adicionar as seguintes variáveis ao seu arquivo `.env.local`:

```env
# Supabase (Já deve existir)
# Adicione a Service Role Key para permitir que o Webhook atualize assinaturas
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Stripe API Keys
# Obtenha em: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret
# Obtenha após configurar o endpoint do webhook em: https://dashboard.stripe.com/webhooks
# Endpoint URL: https://seu-app.vercel.app/api/stripe/webhook (ou sua URL local)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (Planos Mensais)
# Crie preços recorrentes mensais para os produtos criados e cole os IDs (começam com price_)
NEXT_PUBLIC_STRIPE_PRICE_BASIC=price_...
NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_...

# URL da Aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Passos para Finalizar

1.  **Crie os Preços no Stripe**:
    *   Fui capaz de criar os Produtos, mas você precisa criar os **Preços Recorrentes** (tabela abaixo).
    *   Vá para https://dashboard.stripe.com/products
    *   Encontre os produtos pelos IDs abaixo:
        *   **Basic**: `prod_Td71c2x7tA5TmH`
        *   **Professional**: `prod_Td71jjSIbu6hyJ`
        *   **Enterprise**: `prod_Td71ZEh5BNJmD7`
    *   Em cada produto, clique em "Adicionar preço", selecione **Recorrente** e **Mensal**.
    *   Use os valores: **R$ 49,90** (Basic), **R$ 99,90** (Professional), **R$ 199,90** (Enterprise).
    *   Copie os IDs gerados (`price_...`) para o `.env.local`.

2.  **Configure o Webhook Local (para testes)**:
    *   Instale o Stripe CLI.
    *   Rode: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
    *   Copie o `whsec_...` exibido no terminal para o `.env.local`.

3.  **Reinicie o Servidor**:
    *   Pare e inicie o `npm run dev` novamente para carregar as novas variáveis.
