const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '..', '.env.local');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getEnvValue(content, key) {
    const regex = new RegExp(`${key}=(.*)`);
    const match = content.match(regex);
    return match ? match[1].trim() : null;
}

function updateEnvFile(key, value) {
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    if (content.includes(key)) {
        const regex = new RegExp(`${key}=.*`);
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content += `\n${key}=${value}\n`;
    }

    fs.writeFileSync(envPath, content);
    console.log(`✅ ${key} updated in .env.local`);
}

async function main() {
    console.log('🔧 Stripe Webhook Setup Helper');
    console.log('--------------------------------');

    if (!fs.existsSync(envPath)) {
        console.error('❌ .env.local not found!');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const currentSecret = getEnvValue(envContent, 'STRIPE_WEBHOOK_SECRET');

    if (currentSecret) {
        console.log('✅ STRIPE_WEBHOOK_SECRET is already set.');
        console.log(`Current value: ${currentSecret.substring(0, 10)}...`);

        rl.question('Do you want to overwrite it? (y/n) ', (answer) => {
            if (answer.toLowerCase() === 'y') {
                askForSecret();
            } else {
                console.log('Exiting...');
                rl.close();
            }
        });
    } else {
        console.log('❌ STRIPE_WEBHOOK_SECRET is missing.');
        askForSecret();
    }
}

function askForSecret() {
    console.log('\nTo get your Webhook Secret:');
    console.log('1. Ensure Stripe CLI is installed.');
    console.log('2. Run: stripe listen --forward-to localhost:3000/api/stripe/webhook');
    console.log('3. Copy the "whsec_..." secret shown in the output.');
    console.log('\n(If you cannot install CLI, you cannot assume webhooks will work on localhost easily without a tunnel like ngrok)');

    rl.question('\nPaste your Stripe Webhook Secret (whsec_...): ', (secret) => {
        if (!secret || !secret.startsWith('whsec_')) {
            console.error('❌ Invalid format. Should start with "whsec_"');
            rl.close();
            return;
        }

        updateEnvFile('STRIPE_WEBHOOK_SECRET', secret.trim());
        console.log('\n🎉 Configuration updated! Please restart your dev server.');
        rl.close();
    });
}

main();
