// P16 extension (grok2 ACCEPT p16-ext-review.md): Sorcerer NDESC 9, Spellbreaker NDESC 19 + recurses + scope retained.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { story } = require(path.resolve('work/investigations/zil-attr-analyzer.js'));
const SF = require(path.resolve('work/investigations/2026-10-11-zil-source-flags.json'));
const f = process.env.P16EXT_FACTS || 'js/ModuleStatFactsClaude.js'; let s = fs.readFileSync(f, 'latin1');
const c = { window: {} }; vm.createContext(c); vm.runInContext(s + ';this.F=ModuleStatFactsClaude', c);
const dg = g => crypto.createHash('sha256').update(Uint8Array.from(story(g))).digest('hex');
const rowRange = d => { const i = s.indexOf('    "' + d + '": {'); if (i < 0) throw new Error('row ' + d); return [i, s.indexOf('\n    },', i)]; };
const cur = g => { const c2 = { window: {} }; vm.createContext(c2); vm.runInContext(s + ';this.F=ModuleStatFactsClaude', c2); return c2.F[dg(g)]; };
function addScope(g, bit, comment) {
  const v = SF[g].flags.NDESCBIT; if (!v || v.bit !== bit || v.fp !== 0) throw new Error('NDESC ' + g + ' ' + JSON.stringify(v));
  const d = dg(g), row = cur(g); if (!row) throw new Error('row ' + g);
  for (const k of ['inventoryHiddenAttribute', 'inventoryHiddenRecurses', 'inventoryHiddenScopeRetained']) if (row[k] != null) throw new Error('has ' + k + ' ' + g);
  if (row.attributeMap && Object.values(row.attributeMap).includes(bit) && row.attributeMap.scenery !== bit) throw new Error('bit collision ' + g);
  const [i, end] = rowRange(d), j = s.indexOf('"attributeMap": {', i); if (j < 0 || j > end) throw new Error('no attributeMap ' + g);
  let eol = s.indexOf('\n', j); const ind = s.slice(s.lastIndexOf('\n', j) + 1, j);
  const cr = s[eol - 1] === '\r' ? 1 : 0;
  if (!/,\s*$/.test(s.slice(j, eol - cr))) { s = s.slice(0, eol - cr) + ',' + s.slice(eol - cr); eol++; }
  s = s.slice(0, eol + 1) + comment.map(c => ind + '// ' + c + '\n').join('') + ind + '"inventoryHiddenAttribute": ' + bit + ',\n' + ind + '"inventoryHiddenRecurses": true,\n' + ind + '"inventoryHiddenScopeRetained": true,\n' + s.slice(eol + 1);
  console.log(g, 'scope', bit);
}
addScope('Sorcerer.z3.js', 9, ['D16 P16 ext (grok2 ACCEPT p16-ext-review.md): inventoryHiddenAttribute 9 = NDESCBIT. Native D16-sorcerer-trace.md: book 139 CONTBIT+OPENBIT,',
  'exactly 7 NDESC spells; READ BOOK lists them (globals.zil:937-949); gparser.zil:1318 SEARCH-LIST no NDESC test. Native i omits spells; scope kept.']);
addScope('Spellbreaker.z3.js', 19, ['D16 P16 ext (grok2 ACCEPT): inventoryHiddenAttribute 19 = NDESCBIT (exact 55/0/0). spellbreaker-invhidden-claude-SEALED.md: PRINT-CONT BRIEFBIT',
  'exception (verbs.zil:1888) never reaches held objects (TAKE clears NDESC, verbs.zil:1734); book 144 open, 7 spells; parser.zil:1562 no NDESC test.']);
fs.writeFileSync(f, s, 'latin1');
