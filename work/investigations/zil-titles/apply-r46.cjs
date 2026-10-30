// r46 (claude, applied under operator override of the stale grok facts claim): Seastalker concealed 12, Hollywood enterable 8, Suspect locked 17. Evidence: claude-probe/e1d9, codex suspect-native-r3; P10 8b76ec8.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { story } = require(path.resolve('work/investigations/zil-attr-analyzer.js'));
const SF = require(path.resolve('work/investigations/2026-10-11-zil-source-flags.json'));
const f = process.env.R46_FACTS || 'js/ModuleStatFactsClaude.js'; let s = fs.readFileSync(f, 'utf8');
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
addMap('Seastalker.z3.js', 'concealed', 12, 'concealed 12 = INVISIBLE (source exact 2/2; native claude-probe/e1d9): special tool 116 in the office reads 12=1 and "You can\'t see any odd metallic object here!" until SEARCH OFFICE or leaving reveals it (12: 1->0, dome.zil:1250-1257); freighter 237 is the second carrier; negative sonarphone 229 12=0.', 'INVISIBLE', true);
addMap('HollywoodHijinx.z3.js', 'enterable', 8, 'enterable 8 = VEHBIT (source exact 2/2; native claude-probe/e1d9 run-hollywood-*): ENTER left/right end of plank moves the player 90->8 / 90->68 with 8=1; ENTER SAFE 227 8=0 "You hit your head against the safe". Plain ENTER works natively (no enterForms override).', 'VEHBIT', true);
addMap('Suspect.z3.js', 'locked', 17, 'locked 17 = LOCKED (source exact 18/18; native 2+1 + codex review-20261027/suspect-native-r3-diagnostic-r3: unforced START-ALICIA north door 212 locked+open and NORTH still reaches Walkway 169). With P10 (8b76ec8) route pause needs locked AND closed, so open-locked doors stay passable; raw lock glyph unchanged.', 'LOCKED', true);
fs.writeFileSync(f, s);
