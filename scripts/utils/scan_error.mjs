import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const searchPatterns = [
    'skeleton-highlight',
    '120deg',
    '-:|',
    'bg-[',
    'linear-gradient'
];

function searchFile(filePath) {
    if (filePath.includes('scan_error.mjs') || filePath.includes('scan_error.js')) return;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of searchPatterns) {
            if (content.includes(pattern)) {
                // Log match
                console.log(`MATCH: "${filePath}" contains "${pattern}"`);
                // If exact match of weird char
                if (pattern === '-:|') {
                    console.log('!!! CRITICAL MATCH !!!');
                }
            }
        }
    } catch (e) { }
}

function walkDir(dir) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                    walkDir(filePath);
                }
            } else {
                if (['.tsx', '.ts', '.css', '.jsx', '.js', '.mjs'].includes(path.extname(file))) {
                    searchFile(filePath);
                }
            }
        }
    } catch (e) { }
}

console.log('--- START SCAN ---');
walkDir('.');
// Explicitly check .temp_ag_kit if it exists at root or wherever
if (fs.existsSync('.temp_ag_kit')) {
    walkDir('.temp_ag_kit');
}
console.log('--- END SCAN ---');
