import fs from 'fs';

try {
    let content = fs.readFileSync('fresh_lints.json', 'utf8');
    const startIdx = content.indexOf('[');
    const endIdx = content.lastIndexOf(']') + 1;
    if (startIdx === -1 || endIdx === 0) {
        throw new Error('Valid JSON array not found');
    }
    content = content.substring(startIdx, endIdx);
    
    const results = JSON.parse(content);
    const ruleToFind = 'react-hooks/set-state-in-effect';
    
    const filesWithRule = results.filter(file => 
        file.messages.some(m => m.ruleId === ruleToFind)
    );

    console.log(`Found ${filesWithRule.length} files with ${ruleToFind}:`);
    filesWithRule.forEach(file => {
        const count = file.messages.filter(m => m.ruleId === ruleToFind).length;
        console.log(`${file.filePath} (${count} occurrences)`);
    });
} catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
}
