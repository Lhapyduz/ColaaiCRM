import fs from 'fs';

try {
    let content = fs.readFileSync('lint_results_utf8.json', 'utf8');
    // Remove potential non-JSON prefix/suffix
    const startIdx = content.indexOf('[');
    const endIdx = content.lastIndexOf(']') + 1;
    if (startIdx === -1 || endIdx === 0) {
        throw new Error('Valid JSON array not found');
    }
    content = content.substring(startIdx, endIdx);
    
    const results = JSON.parse(content);
    const targetFile = results.find(r => r.filePath.includes('dataAccess.ts'));

    if (targetFile) {
        console.log(`Errors for ${targetFile.filePath}:`);
        targetFile.messages.forEach(m => {
            console.log(`${m.line}:${m.column} - ${m.ruleId} - ${m.message}`);
        });
    } else {
        console.log('File not found in lint results.');
    }
} catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
}
