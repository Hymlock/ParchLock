// Two-operand FSET/FCLEAR/FSET? scan over whole files with newlines collapsed (multiline forms included).
const fs = require('fs'), path = require('path'); const dir = process.argv[2];
let nonLit = [], macros = [], total = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.zil')).sort()) {
  const raw = fs.readFileSync(path.join(dir, f), 'latin1'); const flat = raw.replace(/;"[^"]*"/g, '').replace(/\s+/g, ' ');
  const re = /<(FSET\??|FCLEAR)\s+([^\s<>]+|<[^<>]*>)\s+([^\s<>]+|<[^<>]*>)\s*>/g; let m;
  while ((m = re.exec(flat))) { total++; const flag = m[3]; if (!/^,[A-Z0-9-]+$/.test(flag)) nonLit.push(f + ': ' + m[0].slice(0, 90)); }
  const mre = /<DEFMAC\s+([A-Z0-9-]+)[^]*?(?=<DEFMAC|<ROUTINE|$)/g;
  while ((m = mre.exec(flat))) if (/FSET|FCLEAR/.test(m[0].slice(0, 400))) macros.push(f + ': DEFMAC ' + m[1]);
}
console.log('two-operand FSET/FSET?/FCLEAR forms scanned: ' + total);
console.log('forms whose FLAG operand is not a literal ,FLAG constant: ' + nonLit.length); nonLit.forEach(x => console.log('  ' + x));
console.log('DEFMAC macros containing FSET/FCLEAR: ' + macros.length); macros.forEach(x => console.log('  ' + x));
