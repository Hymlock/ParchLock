// r47 (claude, four-seat ACCEPT 2026-10-31, CLAUDE-VOTES-0201.md): Cutthroats talkable 26 (VICBIT), Suspended enterable 28 (VEHBIT {CAR 58}).
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { story } = require(path.resolve('work/investigations/zil-attr-analyzer.js'));
const SF = require(path.resolve('work/investigations/2026-10-11-zil-source-flags.json'));
const f = process.env.R47_FACTS || 'js/ModuleStatFactsClaude.js'; let s = fs.readFileSync(f, 'latin1');
const c = { window: {} }; vm.createContext(c); vm.runInContext(s + ';this.F=ModuleStatFactsClaude', c);
const dg = g => crypto.createHash('sha256').update(Uint8Array.from(story(g))).digest('hex');
const rowRange = d => { const i = s.indexOf('    "' + d + '": {'); if (i < 0) throw new Error('row ' + d); return [i, s.indexOf('\n    },', i)]; };
const cur = g => { const c2 = { window: {} }; vm.createContext(c2); vm.runInContext(s + ';this.F=ModuleStatFactsClaude', c2); return c2.F[dg(g)]; };

// shareWith: the one key allowed to already own this bit (open/isOpen pair).
function addMap(g, key, bit, comment, flagName, exact, shareWith) {
  if (flagName) { const v = SF[g].flags[flagName]; if (!v || v.bit !== bit || v.fp !== 0 || (exact && !v.exact)) throw new Error(flagName + ' ' + g + ' ' + JSON.stringify(v)); }
  const d = dg(g), row = cur(g); if (!row || !row.attributeMap) throw new Error('row ' + g);
  if (row.attributeMap[key] != null) throw new Error('has ' + key + ' ' + g);
  const owners = Object.keys(row.attributeMap).filter(k => row.attributeMap[k] === bit);
  if (owners.length && !(owners.length === 1 && owners[0] === shareWith)) throw new Error('collision ' + g + ' ' + key + ' ' + owners);
  const [i] = rowRange(d), j = s.indexOf('"attributeMap": {', i), k = s.indexOf('}', j), ls = s.lastIndexOf('\n', j) + 1;
  s = s.slice(0, ls) + (comment ? '        // ' + comment + '\n' : '') + s.slice(ls, k).replace(/\s*$/, '') + ', "' + key + '": ' + bit + ' ' + s.slice(k);
  console.log(g, key, bit);
}
addMap('Cutthroats.z3.js', 'talkable', 26, 'talkable 26 = VICBIT (four-seat ACCEPT, grok-lane-1031/PACKET-cutthroats-talkable.md sha 684f56dd): V-TELL (verbs:2588) sets WINNER only when PRSO has VICBIT; else TELL-NO-TELL. Source exact 9/9 (11 FLAGS carriers incl self objects ME/ADVENTURER - consumer may suppress self). Native 3+2 bit-tested.', 'VICBIT', true);
addMap('Suspended.z3.js', 'enterable', 28, 'enterable 28 = VEHBIT, singleton CAR 58 (four-seat ACCEPT, PACKET-suspended-enterable.md sha e290bc20): BOARD OBJECT (FIND VEHBIT) = V-BOARD; ENTER OBJECT = V-THROUGH -> PERFORM V?BOARD on VEHBIT. Native: poet, enter car TRUE (58 has 28; "I am now in the carriage"); scoped negatives. Robot-only vehicle: board is offered via D8 actorAddressing forms.', 'VEHBIT', true);
fs.writeFileSync(f, s, 'latin1');
