const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    console.log('--- Stripe Configuration Check ---');
    let webhookSecretFound = false;

    lines.forEach(line => {
        if (line.includes('STRIPE_WEBHOOK_SECRET')) {
            webhookSecretFound = true;
            const parts = line.split('=');
            if (parts.length > 1) {
                const val = parts[1].trim();
                console.log(`STRIPE_WEBHOOK_SECRET=${val.substring(0, 5)}...`);
            }
        }
    });

    if (!webhookSecretFound) {
        console.log('❌ STRIPE_WEBHOOK_SECRET missing in .env.local');
    } else {
        console.log('✅ STRIPE_WEBHOOK_SECRET is present');
    }

} catch (error) {
    console.error('Error reading .env.local:', error.message);
}
