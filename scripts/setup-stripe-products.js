const Stripe = require('stripe');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
    process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const PLANS = [
    {
        name: 'Basic', // Try to match existing names if possible, but these seem standard
        id_keyword: 'basic',
        amount: 4990, // R$ 49,90
    },
    {
        name: 'Professional',
        id_keyword: 'professional',
        amount: 7990, // R$ 79,90
    },
    {
        name: 'Enterprise',
        id_keyword: 'enterprise',
        amount: 14990, // R$ 149,90
    }
];

async function main() {
    console.log('Starting Stripe Product/Price Setup...');

    const results = {};

    for (const plan of PLANS) {
        console.log(`\nProcessing ${plan.name}...`);

        // 1. Search for existing Product
        let product;
        const products = await stripe.products.search({
            query: `name~'${plan.name}' AND active:'true'`,
        });

        if (products.data.length > 0) {
            product = products.data[0];
            console.log(`Found existing product: ${product.name} (${product.id})`);
        } else {
            product = await stripe.products.create({
                name: plan.name,
                description: `Plano ${plan.name} - Ligeirinho Hotdog`,
            });
            console.log(`Created new product: ${product.name} (${product.id})`);
        }

        // 2. Search for existing Recurring Price
        let price;
        const prices = await stripe.prices.list({
            product: product.id,
            active: true,
            type: 'recurring',
            limit: 100,
        });

        // specific amount matching
        price = prices.data.find(p => p.unit_amount === plan.amount && p.currency === 'brl' && p.recurring.interval === 'month');

        if (price) {
            console.log(`Found existing price: ${price.id} (R$ ${price.unit_amount / 100})`);
        } else {
            price = await stripe.prices.create({
                product: product.id,
                unit_amount: plan.amount,
                currency: 'brl',
                recurring: {
                    interval: 'month',
                },
                nickname: plan.name,
            });
            console.log(`Created new price: ${price.id} (R$ ${price.unit_amount / 100})`);
        }

        results[plan.id_keyword] = price.id;
    }

    console.log('\n\n==================================================');
    console.log('COPY THESE LINES TO YOUR .env.local FILE:');
    console.log('==================================================');
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_BASIC=${results.basic}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL=${results.professional}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=${results.enterprise}`);
    console.log('==================================================');
}

main().catch(console.error);
