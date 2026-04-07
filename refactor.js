const fs = require('fs');
let code = fs.readFileSync('src/lib/dataAccess.ts', 'utf8');

code = code.replace("import { getDb } from './db';\r\n", "");
code = code.replace("import { getDb } from './db';\n", "");

code = code.replace("import { addPendingAction, saveAll } from './offlineStorage';", "import { addPendingAction, saveAll, saveItem, getAll, getItem, deleteItem } from './offlineStorage';");

code = code.replace(/getDb\(\)\.(products|categories|orders)\.toArray\(\)/g, "getAll('$1')");
code = code.replace(/getDb\(\)\.(products|categories|orders)\.put\(([^)]+)\)/g, "saveItem('$1', $2)");
code = code.replace(/await getDb\(\)\.(products|categories|orders)\.get\(([^)]+)\)/g, "await getItem<any>('$1', $2)");
code = code.replace(/getDb\(\)\.(products|categories|orders)\.delete\(([^)]+)\)/g, "deleteItem('$1', $2)");

code = code.replace(/const \{ getDb \} = await import\('\.\/db'\);[\r\n\s]*/g, "");

fs.writeFileSync('src/lib/dataAccess.ts', code);
console.log('Refactoring complete!');
