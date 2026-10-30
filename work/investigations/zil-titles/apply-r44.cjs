// r44 (claude): D1 inventoryHiddenRecurses (R2, codex ACCEPT) for the RECURSES titles. Spellbreaker (BRIEFBIT exception
// Enchanter + Sorcerer EXCLUDED after r44 gate: spells are NDESC children of the spell book, so the hidden fact drops them from inventory (missing options; D148 spell tapping). DEFERRED D16.
// pending) and Moonmist (FLAT, verbs.zil:516) are excluded. inventoryHiddenAttribute is added only as the exact source
// NDESCBIT (2026-10-11-zil-source-flags.json, fp 0) and refuses an existing value or a non-NDESC attributeMap collision.
//   node work/investigations/zil-titles/apply-r44.cjs [path/to/ModuleStatFactsClaude.js]   (story bytes from this checkout)
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { story } = require(path.resolve('work/investigations/zil-attr-analyzer.js'));
const SF = require(path.resolve('work/investigations/2026-10-11-zil-source-flags.json'));
const f = process.argv[2] || 'js/ModuleStatFactsClaude.js';
const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(f, 'utf8') + ';this.F=ModuleStatFactsClaude', c);
let s = fs.readFileSync(f, 'utf8');
const dg = g => crypto.createHash('sha256').update(Uint8Array.from(story(g))).digest('hex');
const TITLES = ['Zork1-TheGreatUndergroundEmpire.z3.js', 'Zork2-TheWizardofFrobozz.z3.js', 'Zork3-TheDungeonMaster.z3.js',
  'Cutthroats.z3.js', 'Deadline.z3.js', 'Infidel.z3.js', 'Planetfall.z3.js', 'Starcross.z3.js', 'TheWitness.z3.js',
  'HollywoodHijinx.z3.js', 'LeatherGoddessesofPhobos.z3.js', 'Stationfall.z3.js', 'Suspended.z3.js'];
for (const g of TITLES) {
  const d = dg(g), row = c.F[d]; if (!row) throw new Error('row ' + g);
  if ('inventoryHiddenRecurses' in row) throw new Error('has recurses ' + g);
  const nd = SF[g].flags.NDESCBIT; if (!nd || nd.fp !== 0 || !Number.isInteger(nd.bit)) throw new Error('NDESCBIT ' + g + ' ' + JSON.stringify(nd));
  const i = s.indexOf('    "' + d + '": {'); if (i < 0) throw new Error('text row ' + g);
  const at = s.indexOf('\n', i) + 1; let ins;
  if (Number.isInteger(row.inventoryHiddenAttribute)) ins = '        "inventoryHiddenRecurses": true,\n';
  else {
    if (row.inventoryHiddenAttribute != null) throw new Error('malformed hidden ' + g);
    const col = Object.entries(row.attributeMap || {}).filter(([k, v]) => v === nd.bit && k !== 'scenery' && k !== 'concealed');
    if (col.length) throw new Error('collision ' + g + ' ' + JSON.stringify(col));
    ins = '        // D1 source-proven (r44): inventoryHiddenAttribute ' + nd.bit + ' = NDESCBIT (tp ' + nd.tp + ' fp 0 fn ' + nd.fn + '); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.\n'
      + '        "inventoryHiddenAttribute": ' + nd.bit + ',\n        "inventoryHiddenRecurses": true,\n';
  }
  s = s.slice(0, at) + ins + s.slice(at);
  console.log(g, Number.isInteger(row.inventoryHiddenAttribute) ? 'recurses' : 'hidden ' + nd.bit + ' + recurses');
}
fs.writeFileSync(f, s);
