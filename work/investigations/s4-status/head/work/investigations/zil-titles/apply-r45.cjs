// r45 (claude): close Suspended + Hitchhiker U cells (see zil-titles/r45-notes.md). PREPARED, NOT APPLIED.
// Run once from the repo root after r44 is gated. Dry run on a copy: R45_FACTS=<copy of js/ModuleStatFactsClaude.js> node apply-r45.cjs
// Evidence: work/investigations/claude-probe/r45/ (plan-*.json = commands, run-*.json = test_attr ops + game text, g1-batch.cjs runner).
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { story } = require(path.resolve('work/investigations/zil-attr-analyzer.js'));
const SF = require(path.resolve('work/investigations/2026-10-11-zil-source-flags.json'));
const f = process.env.R45_FACTS || 'js/ModuleStatFactsClaude.js'; let s = fs.readFileSync(f, 'utf8');
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

// ---- Suspended (v3). Actor scope: the player (FC) sees nothing itself; bare commands answer "Visual scanners cannot see any X here"
// (run-suspended-20261030T160739-12160, run-suspW-20261030T160923-36152). All tests below are robot-addressed; facts are object state.
const SU = 'Suspended.z3.js';
addMap(SU, 'container', 19, 'container 19 = CONTBIT (source exact 13/13; native r45 claude-probe/r45/run-suspW-*): sensa,look in home 81 and waldo,look in cabinet 62 test 19=1 ("The electrical column is closed." / "The hollow object is closed."), whiz,look on groove 45 19=1 (contents listed); sensa,look in ramp 64 tests 19=0 ("I don\'t know how to look inside a dens..."; run-suspended-20261030T160739). Robots (VICBIT 24) also carry 19+8: they hold items.', 'CONTBIT', true);
addMap(SU, 'supporter', 11, 'supporter 11 = SURFACEBIT (source exact 3/3): waldo,look on blt 37 11=1 ("There is nothing on the walkway."), whiz,look on groove 45 11=1 ("Sitting in the groove are..."); waldo,close cabinet 62 11=0 and sensa,close poet 146 11=0.', 'SURFACEBIT', true);
addMap(SU, 'open', 8, 'open/isOpen 8 = OPENBIT (source exact 6/6): BLT 37 and groove 45 test 8=1 on look on/in; cabinet 62 8=0 ("It\'s already closed."), HOME 81 8=0 ("The electrical column is closed.").', 'OPENBIT', true);
addMap(SU, 'isOpen', 8, null, 'OPENBIT', true, 'open');
{ const d = dg(SU); const [i, end] = rowRange(d); let blk = s.slice(i, end); if (blk.includes('"openCapability"')) throw new Error('has openCapability');
  // FAIL-CLOSED: animate is unmapped (ledger NA, ACTORBIT 0 carriers), so openCapabilityAllows returns false for every object.
  blk = blk.replace(/\n(\s*)"attributeMap": \{/, '\n$1// openCapability FAIL-CLOSED (r45): no CONTBIT carrier accepts container Open/Close natively: waldo,open cabinet 62 "I don\'t detect any easy way to do that",\n$1// waldo,close blt 37 / whiz,close groove 45 "Not a likely occurrence within reality, no?", sensa,close poet 146 "I don\'t think he would like that" (robots carry 19+8, VICBIT 24 unmapped).\n$1// animate is unmapped, so the none-list fails closed (#3642 pattern): container keeps search/look-in, never Open/Close.\n$1"openCapability": { "all": ["container"], "none": ["supporter", "animate"] },\n$1"attributeMap": {');
  s = s.slice(0, i) + blk + s.slice(end); console.log(SU, 'openCapability (fail-closed)'); }

// ---- Hitchhiker (v5)
const HH = 'Hitchhik.z5.js';
addMap(HH, 'enterable', 28, 'enterable 28 = VEHBIT (census: compiled carriers bed 114, GLOBAL-BED 166 (local-global proxy, PERFORMs on BED), pilot seat 49, poetry appreciation chair 164 - all seats/beds, no room; ENTER X = V-THROUGH -> BOARD on VEHBIT, verbs.zil:1957). Native r45 run-hhgg-*: get in bed tests 114:28=1 ("You are now in the bed."); get in gown 206:28=0 ("You can\'t get into your gown!"), get in jukebox 98:28=0.', 'VEHBIT', true);
addMap(HH, 'switchable', 32, 'switchable 32 = SWITCHBIT (census exact 3/3: dipswitch 143, generator switch 96, case switch 134 - all devices; DIPSWITCH-F/SWITCH-F/CASE-SWITCH-F handle LAMP-ON). Native r45 run-hg7-*: switch on switch (134, RAM 32 set) plays the case recording; switch on gown (206, 32 clear) "You can\'t turn that on." (run-hhgg). Switch-off is refused for 134 ("You can\'t turn that off.").', 'SWITCHBIT', true);

fs.writeFileSync(f, s);
