const fs = require('fs');
const path = require('path');

async function checkSetup() {
    console.log('\x1b[36m%s\x1b[0m', '🔍 Verificando configuração do ambiente...\n');

    // 1. Check .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Arquivo .env.local não encontrado!');
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`^${key}=(.*)`, 'm'));
        return match ? match[1].trim() : null;
    };

    const requiredVars = [
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'NEXT_PUBLIC_STRIPE_PRICE_BASIC',
        'NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL',
        'NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
    ];

    let hasErrors = false;

    requiredVars.forEach(key => {
        const value = getEnv(key);
        if (!value) {
            console.error('\x1b[31m%s\x1b[0m', `❌ ${key} está faltando`);
            hasErrors = true;
        } else {
            // Basic validation
            if (key.includes('PRICE') && !value.startsWith('price_')) {
                console.warn('\x1b[33m%s\x1b[0m', `⚠️ ${key} parece inválido (deveria começar com 'price_')`);
            }
            if (key.includes('SECRET_KEY') && !value.startsWith('sk_')) {
                console.warn('\x1b[33m%s\x1b[0m', `⚠️ ${key} parece inválido (deveria começar com 'sk_')`);
            }
            console.log('\x1b[32m%s\x1b[0m', `✅ ${key} encontrado`);
        }
    });

    if (hasErrors) {
        console.log('\n\x1b[31m%s\x1b[0m', '⚠️  Por favor, corrija as variáveis faltando no arquivo .env.local');
    } else {
        console.log('\n\x1b[32m%s\x1b[0m', '✅ Todas as variáveis necessárias estão presentes!');
    }

    console.log('\n\x1b[36m%s\x1b[0m', '📝 Para sincronizar o Stripe localmente (Webhooks):');
    console.log('1. Abra um novo terminal');
    console.log('2. Execute: stripe login');
    console.log('3. Execute: stripe listen --forward-to localhost:3000/api/stripe/webhook');
    console.log('4. Copie a chave de assinatura (whsec_...) exibida');
    console.log('5. Atualize STRIPE_WEBHOOK_SECRET no seu .env.local com essa chave');
    console.log('6. Reinicie o servidor do projeto (npm run dev)');
}

checkSetup();
