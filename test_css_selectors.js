const fs = require('fs');
const css = fs.readFileSync('src/app/(authenticated)/relatorios/page.module.css', 'utf8');

// remove comments
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

const lines = noComments.split('\n');
lines.forEach((line, i) => {
  const trimmed = line.trim();
  if (trimmed.endsWith('{')) {
    const selector = trimmed.slice(0, -1).trim();
    if (!selector.includes('.') && !selector.includes('#') && !selector.startsWith('@')) {
      console.log(`Line ${i + 1}: ${selector}`);
    }
  }
});
