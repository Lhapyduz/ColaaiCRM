const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

try {
    let content = fs.readFileSync(envPath, 'utf8');

    console.log('Checking .env.local for corruption...');

    // Check if NEXT_PUBLIC_APP_URL follows another variable without a newline
    // Regex looks for a character that is not a newline, followed immediately by NEXT_PUBLIC_APP_URL
    const corruptionRegex = /([^\r\n])(NEXT_PUBLIC_APP_URL=)/;

    if (corruptionRegex.test(content)) {
        console.log('Corruption detected! Fixing...');

        // Add a newline before NEXT_PUBLIC_APP_URL
        const fixedContent = content.replace(corruptionRegex, '$1\n$2');

        fs.writeFileSync(envPath, fixedContent);
        console.log('✅ File repaired successfully.');
        console.log('New content snippet:');
        const match = fixedContent.match(/.*NEXT_PUBLIC_APP_URL=.*/);
        if (match) console.log(match[0]);

    } else {
        console.log('No specific corruption pattern detected. The file might be okay or corrupted differently.');
    }

} catch (err) {
    console.error('Error processing file:', err);
}
