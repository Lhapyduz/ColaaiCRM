const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = dotenv.config({ path: envPath });

if (envConfig.error) {
    console.error('Er o ao carregar .env.local');
    process.exit(1);
}

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey || secretKey.includes('sk_test_...')) {
    console.error('❌ STRIPE_SECRET_KEY inválida ou não encontrada em .env.local');
    console.error('Por favor, adicione suas chaves do Stripe no arquivo .env.local');
    process.exit(1);
}

const stripe = require('stripe')(secretKey);

const PRODUCTS = [
    {
        name: 'Basic',
        description: 'Plano ideal para pequenos negócios: dashboard, pedidos, produtos e categorias.',
        price: 4990, // cents
        features: ['Dashboard', 'Pedidos', 'Produtos']
    },
    {
        name: 'Professional',
        description: 'Recursos avançados: gestão de estoque, entregas, cozinha e fidelidade.',
        price: 7990,
        features: ['Estoque', 'Entregas', 'Cozinha', 'Fidelidade']
    },
    {
        name: 'Enterprise',
        description: 'Solução completa: todos os recursos + relatórios avançados e multiplas lojas.',
        price: 14990,
        features: ['Relatórios Avançados', 'Multi-lojas']
    }
];

async function setup() {
    console.log('🚀 Iniciando configuração do Stripe...');

    const newEnvLines = [];

    for (const plan of PRODUCTS) {
        console.log(`\nConfigurando plano ${plan.name}...`);

        // Check if product exists (simple check by name to avoid duplicates if re-run)
        const search = await stripe.products.search({
            query: `name:'${plan.name}'`,
        });

        let productId;
        let product;

        if (search.data.length > 0) {
            console.log(`✅ Produto ${plan.name} já existe: ${search.data[0].id}`);
            product = search.data[0];
            productId = product.id;
        } else {
            product = await stripe.products.create({
                name: plan.name,
                description: plan.description,
            });
            console.log(`✅ Produto ${plan.name} criado: ${product.id}`);
            productId = product.id;
        }

        // Create Price
        // We want a recurring monthly price
        // Check if a price with this amount and recurring exists
        const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 10,
        });

        let priceId;
        const existingPrice = prices.data.find(p =>
            p.unit_amount === plan.price &&
            p.recurring?.interval === 'month' &&
            p.currency === 'brl'
        );

        if (existingPrice) {
            console.log(`✅ Preço já existe: ${existingPrice.id}`);
            priceId = existingPrice.id;
        } else {
            const price = await stripe.prices.create({
                product: productId,
                unit_amount: plan.price,
                currency: 'brl',
                recurring: {
                    interval: 'month',
                },
            });
            console.log(`✅ Preço criado: ${price.id}`);
            priceId = price.id;
        }

        const envVarName = `NEXT_PUBLIC_STRIPE_PRICE_${plan.name.toUpperCase()}`;
        newEnvLines.push(`${envVarName}=${priceId}`);
    }

    console.log('\n----------------------------------------');
    console.log('📝 Adicione as seguintes linhas ao seu .env.local:');
    console.log('----------------------------------------');
    console.log(newEnvLines.join('\n'));
    console.log('----------------------------------------');

    // Attempt to verify if they are already in file
    const currentEnv = fs.readFileSync(envPath, 'utf8');
    let updatedEnv = currentEnv;
    let madeChanges = false;

    newEnvLines.forEach(line => {
        const [key, value] = line.split('=');
        if (updatedEnv.includes(key)) {
            // Replace existing
            const regex = new RegExp(`${key}=.*`);
            const match = updatedEnv.match(regex);
            if (match && match[0] !== line) {
                updatedEnv = updatedEnv.replace(regex, line);
                madeChanges = true;
            }
        } else {
            updatedEnv += `\n${line}`;
            madeChanges = true;
        }
    });

    if (madeChanges) {
        fs.writeFileSync(envPath, updatedEnv);
        console.log('✅ Arquivo .env.local atualizado automaticamente!');
    } else {
        console.log('✅ Arquivo .env.local já está atualizado.');
    }
}

setup().catch(err => {
    console.error('Erro na configuração:', err);
});
