// ZIL flag-operation scanner (claude, 2026-10-20; replaces the regex flagscan.js per codex #4345).
// Tokenizes every .zil file: "strings" (with \ escapes) are skipped, ';' comments out the NEXT whole object (atom, string
// or bracketed form of any depth), < ( [ nest to any depth. Every form whose head atom is FSET, FCLEAR, FSET?, BSET,
// BCLEAR or BSET? is reported with its top-level operands. Also reports unbalanced brackets per file.
//   node zilscan.js <sourceDir> [FLAG]      (FLAG filters the report to forms mentioning that flag atom)
const fs = require('fs'), path = require('path');
const dir = process.argv[2], want = process.argv[3] || null;
const HEADS = new Set(['FSET', 'FCLEAR', 'FSET?', 'BSET', 'BCLEAR', 'BSET?']);
const OPEN = { '<': '>', '(': ')', '[': ']' };
function parse(src) {
  let i = 0, line = 1; const n = src.length; let unbalanced = 0;
  const skipWs = () => { while (i < n && /\s/.test(src[i])) { if (src[i] === '\n') line++; i++; } };
  function readObj() { // returns {type, atom?, items?, line, start, end}
    skipWs(); if (i >= n) return null;
    const c = src[i], start = i, ln = line;
    if (c === ';') { i++; readObj(); return { type: 'comment', line: ln }; }
    if (c === '"') { i++; while (i < n && src[i] !== '"') { if (src[i] === '\\') i++; if (src[i] === '\n') line++; i++; } i++; return { type: 'string', line: ln }; }
    if (OPEN[c]) { const close = OPEN[c]; i++; const items = [];
      for (;;) { skipWs(); if (i >= n) { unbalanced++; break; } if (src[i] === close) { i++; break; }
        if (src[i] === '>' || src[i] === ')' || src[i] === ']') { unbalanced++; i++; break; }
        const o = readObj(); if (!o) break; if (o.type !== 'comment') items.push(o); }
      return { type: 'form', open: c, items, line: ln, text: src.slice(start, i) }; }
    if (c === '>' || c === ')' || c === ']') { i++; unbalanced++; return { type: 'stray', line: ln }; }
    let a = ''; while (i < n && !/[\s<>()\[\]";]/.test(src[i])) a += src[i++];
    if (!a) { i++; return { type: 'junk', line: ln }; }
    return { type: 'atom', atom: a, line: ln };
  }
  const top = []; while (i < n) { const o = readObj(); if (!o) break; if (o.type !== 'comment') top.push(o); }
  return { top, unbalanced };
}
const out = []; let total = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.zil')).sort()) {
  const { top, unbalanced } = parse(fs.readFileSync(path.join(dir, f), 'latin1'));
  if (unbalanced) out.push('UNBALANCED ' + f + ': ' + unbalanced);
  (function walk(objs) { for (const o of objs) { if (o.type !== 'form') continue;
    const h = o.items[0]; if (o.open === '<' && h && h.type === 'atom' && HEADS.has(h.atom)) { total++;
      const ops = o.items.slice(1).map(x => x.type === 'atom' ? x.atom : x.type === 'form' ? '<form>' : x.type);
      const lit = ops.slice(1).every(x => /^,[A-Z0-9-?]+$/.test(x));
      if (!want || ops.some(x => x.replace(/^,/, '') === want) || !lit)
        out.push(f + ':' + o.line + ' ' + h.atom + ' ' + ops.join(' ') + (lit ? '' : '   [NON-LITERAL FLAG OPERAND]')); }
    walk(o.items); } })(top);
}
console.log('flag-operation forms (FSET/FCLEAR/FSET?/BSET/BCLEAR/BSET?) parsed: ' + total + (want ? ' ; filter ' + want + ' + all non-literal' : ''));
out.forEach(x => console.log(x));
