// r50 (claude): Sherlock moved 3 (FL-TOUCHED, byte-diff tier) + edible 41 (FL-FOOD, census+behaviour). scenery 32 -> L:X (no map).
// Votes: grok2 author ACCEPT (pre-absence), codex ACCEPT (codex-sherlock-votes-0837 incl. FINAL moved), claude ACCEPT
// (CLAUDE-VOTES-sherlock.md); grok vote REQUIRED before landing (three-seat rule, operator 2026-10-31).
const fs = require('fs'), f = process.env.R50_FACTS || 'js/ModuleStatFactsClaude.js';
let s = fs.readFileSync(f, 'latin1');
const d = 'ba9c2c81d6b55eb9fc7de43a2e439fc65304231cbb834c208005cd9460f44ff0';
const i = s.indexOf('    "' + d + '": {'); if (i < 0) throw new Error('no Sherlock row');
const end = s.indexOf('\n    },', i); let row = s.slice(i, end);
const m = row.match(/"attributeMap": \{([^}]*)\}/); const cur = JSON.parse('{' + m[1] + '}');
for (const [k, b] of [['moved', 3], ['edible', 41]]) { if (cur[k] != null) throw new Error('has ' + k); if (Object.values(cur).includes(b)) throw new Error('collision ' + b); }
row = row.replace(/\n(\s*)"attributeMap": \{([^}]*)\}/, (x, ind, body) =>
  '\n' + ind + '// r50: moved 3 = FL-TOUCHED (object TOUCHBIT; byte-diff: pound note 150 / pistol 122 0->1 on take, Mrs Hudson refused 0->0 (run d854ecf6 / plan a51a105c, codex sherlock-moved-retained-substitution.json; not the PACKET-moved-3 parent-0 'cannot see' row));\n' +
  ind + '// edible 41 = FL-FOOD (census+behaviour: 2 eats + 2 refusals, PACKET-edible-41.md). scenery FL-NODESC 32 is NOT mapped (L:X: list-suppression only).\n' +
  ind + '"attributeMap": {' + body.replace(/\s*$/, '') + ', "moved": 3, "edible": 41 }');
s = s.slice(0, i) + row + s.slice(end);
fs.writeFileSync(f, s, 'latin1'); console.log('Sherlock r50 moved 3 + edible 41 staged');
