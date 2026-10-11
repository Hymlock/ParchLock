/* ZIL matrix research (read-only, R3.4). Attribute/object-key rows owned by grok2; STATUS rows owned by Codex. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { analyze, story } = require('./zil-attr-analyzer.js');
const root = path.resolve(__dirname, '..', '..');
const sb = { console, window: {}, setTimeout: () => 0 }; vm.createContext(sb);
for (const f of ['js/ZRamReader.js', 'js/GrammarProvider.js', 'js/AttributeSchema.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb, { filename: f });
const PROFILE = Object.keys(sb.AttributeSchema.PROFILE);
const gl = fs.readFileSync(path.join(root, 'js/GameList.js'), 'utf8');
const listed = [...new Set([...gl.matchAll(/games\/([A-Za-z0-9_'\-]+\.z[1-8]\.js)|["']([A-Za-z0-9_'\-]+\.z[1-8]\.js)["']/g)].map(m => m[1] || m[2]))];
const titles = [];
for (const g of listed.sort((a, b) => a.localeCompare(b))) {   // R3.5: runtime order is alphabetized
  if (!fs.existsSync(path.join(root, 'games', g))) continue;
  let d = null; try { d = sb.GrammarProvider.decodeD198(story(g)); } catch (e) {}
  const cls = d ? d.classification + '/' + d.evidence : 'unknown/rejected';
  if (/confirmed-inform/.test(cls)) continue;
  titles.push({ g, cls, reason: d ? d.reason : null });
}
const rows = {};
const U = (why) => ({ value: null, status: 'unknown', reason: why });
for (const t of titles) {
  const R = {}; rows[t.g] = { classification: t.cls, keys: R };
  if (!/confirmed-zil-family\/validated/.test(t.cls)) { PROFILE.forEach(k => R[k] = U('classification ' + t.cls + ': no ZIL facts (R2.2/R3.5); classifier resolution is Codex-owned')); continue; }
  const r = analyze(t.g); if (r.error) { PROFILE.forEach(k => R[k] = U(r.error)); continue; }
  const ops = (...keys) => { for (const k of keys) { const a = r.byVerb[k]; if (a !== undefined) return { key: k, ops: r.routine(a) }; } return null; };
  const ev = (o) => o.key + ':' + o.ops.filter(x => x.depth === 0).map(x => x.op[0] + x.attr + (x.subj === prso ? 'o' : x.subj === prsi ? 'i' : '?') + (x.op === 'test' ? (x.branchOnTrue ? '+' : '-') : '')).join(' ');
  const OPEN = ops('open/1'), CLOSE = ops('close/1'), PUTIN = ops('put in/2'), PUTON = ops('put on/2'), LOOKIN = ops('look in/1');
  // PRSO = subject of the bit OPEN sets and CLOSE clears; PRSI = other object var in PUT IN. Inferred; live proof pending (R2.3b).
  let prso = null, prsi = null, open = null;
  if (OPEN && CLOSE) { const both = OPEN.ops.filter(o => o.depth === 0 && o.op === 'set' && CLOSE.ops.some(c => c.depth === 0 && c.op === 'clear' && c.attr === o.attr && c.subj === o.subj)); const u = [...new Set(both.map(o => o.attr))]; if (u.length === 1) { open = u[0]; prso = both[0].subj; } }
  if (PUTIN && prso) { const vs = [...new Set(PUTIN.ops.filter(o => o.depth === 0 && o.subj !== prso && /^var/.test(o.subj)).map(o => o.subj))]; if (vs.length === 1) prsi = vs[0]; }
  const T = (o, subj) => o ? o.ops.filter(x => x.depth === 0 && x.op === 'test' && x.subj === subj).map(x => x.attr) : [];
  const S = (o, op, subj) => o ? o.ops.filter(x => x.depth === 0 && x.op === op && x.subj === subj).map(x => x.attr) : [];
  const draft = (value, rule, evid) => ({ value, status: 'static-draft', rule, evidence: evid, needs: 'native before/after transition or static consumer semantic (R2.3d); PRSO/PRSI live proof (R2.3b)' });
  const v = {};
  if (open != null) { v.open = open; R.open = R.isOpen = draft(open, 'set in OPEN and cleared in CLOSE on PRSO', ev(OPEN) + ' | ' + ev(CLOSE)); } else { R.open = R.isOpen = U(OPEN && CLOSE ? 'no unique bit set in OPEN and cleared in CLOSE' : 'no OPEN/CLOSE action in grammar'); }
  if (open != null && PUTIN && prsi) { const it = T(PUTIN, prsi); const c = T(OPEN, prso).filter(a => a !== open && it.includes(a)); if (c.length) { v.container = c[0]; R.container = draft(c[0], 'first PRSO test in OPEN also tested on PRSI in PUT IN', ev(OPEN) + ' | ' + ev(PUTIN) + ' | candidates ' + [...new Set(c)].join(',')); } else R.container = U('no OPEN test shared with PUT IN on PRSI'); } else R.container = U('needs open bit and proven PUT IN PRSI');
  if (PUTON && prsi) { const s = [...new Set(T(PUTON, prsi))].filter(a => a !== v.container); if (s.length === 1) { v.supporter = s[0]; R.supporter = draft(s[0], 'only PRSI test in PUT ON (not container)', ev(PUTON)); } else R.supporter = U(s.length ? 'PUT ON tests several PRSI bits ' + s.join(',') : 'PUT ON reuses container test or none'); } else R.supporter = U('no PUT ON/2 or PRSI unproven');
  if (open != null) { const ot = OPEN.ops.filter(x => x.depth === 0); const si = ot.findIndex(x => x.op === 'set' && x.attr === open); const setAlso = S(OPEN, 'set', prso);
    const after = ot.slice(si + 1).filter(x => x.op === 'test' && x.subj === prso && ![v.container, open].includes(x.attr) && !setAlso.includes(x.attr)).map(x => x.attr);
    const li = LOOKIN ? LOOKIN.ops.map(x => x.attr) : []; const tr = after.find(a => li.includes(a));
    if (tr != null) { v.transparent = tr; R.transparent = draft(tr, 'first PRSO test after OPEN sets open (contents-visible check), also tested in LOOK IN', ev(OPEN)); } else R.transparent = U('no post-open PRSO test shared with LOOK IN');
    const dc = T(OPEN, prso).filter(a => T(CLOSE, prso).includes(a) && ![v.container, open, v.transparent, v.supporter].includes(a)); const du = [...new Set(dc)];
    if (du.length === 1) { v.door = du[0]; R.door = draft(du[0], 'PRSO test common to OPEN and CLOSE, not container/open/transparent/supporter', ev(OPEN) + ' | ' + ev(CLOSE)); } else R.door = U(du.length ? 'ambiguous ' + du.join(',') : 'no residual OPEN/CLOSE test');
  } else { R.transparent = U('needs open bit'); R.door = U('needs open bit'); }
  const first = (o) => { const t = T(o, prso); return t.length ? t[0] : null; };
  const ATT = ops('attack/1', 'attack with/2', 'kill with/2', 'kill/1'); const a0 = first(ATT);
  R.animate = a0 != null ? draft(a0, 'first PRSO test in ATTACK', ev(ATT)) : U('no ATTACK PRSO test');
  const TALK = ops('talk to/1', 'tell/1', 'ask/1', 'ask about/2'); const t0 = first(TALK);
  R.talkable = t0 != null ? draft(t0, 'first PRSO test in TALK TO/TELL/ASK (separate from animate, R3.1)', ev(TALK)) : U('no TALK/TELL/ASK PRSO test');
  const EAT = ops('eat/1'); const e0 = first(EAT); R.edible = e0 != null ? draft(e0, 'first PRSO test in EAT', ev(EAT)) : U('no EAT PRSO test');
  const LIGHT = ops('light/1', 'turn on/1'), OFF = ops('extinguish/1', 'turn off/1', 'douse/1');
  const lset = S(LIGHT, 'set', prso), loff = S(OFF, 'clear', prso); const onb = lset.find(a => loff.includes(a));
  if (onb != null) R.on = draft(onb, 'set in LIGHT/TURN ON and cleared in EXTINGUISH/TURN OFF', ev(LIGHT) + ' | ' + ev(OFF)); else R.on = U('no bit set by LIGHT and cleared by OFF');
  const lt = T(LIGHT, prso).filter(a => a !== onb); R.light = lt.length ? draft(lt[0], 'first PRSO test in LIGHT/TURN ON that LIGHT does not set (light-source precondition)', ev(LIGHT)) : U('no LIGHT precondition test');
  R.switchable = U('ZIL has no separate switchable flag in native routines (light/on cover it)');
  const ENT = ops('board/1', 'get in/1', 'enter/1', 'get on/1'); const en = T(ENT, prso).filter(a => a !== v.door);
  R.enterable = en.length ? draft(en[0], 'first non-door PRSO test in BOARD/GET IN/ENTER/GET ON', ev(ENT)) : U('no vehicle test');
  const WEAR = ops('wear/1', 'put on/1'), OFFW = ops('take off/1', 'remove/1');
  const wset = S(WEAR, 'set', prso), wclr = S(OFFW, 'clear', prso); const wb = wset.find(a => wclr.includes(a));
  R.worn = R.isWorn = wb != null ? draft(wb, 'set in WEAR and cleared in TAKE OFF/REMOVE (precedence R2.5: wornAttribute fact path, not attributeMap)', ev(WEAR) + ' | ' + ev(OFFW)) : U('no bit set by WEAR and cleared by TAKE OFF');
  const wt = T(WEAR, prso).filter(a => a !== wb); R.wearable = R.clothing = wt.length ? draft(wt[0], 'first PRSO test in WEAR', ev(WEAR)) : U('no WEAR precondition test');
  const LK = ops('lock with/2', 'lock/1'), UL = ops('unlock with/2', 'unlock/1'); const lb = S(LK, 'set', prso).find(a => S(UL, 'clear', prso).includes(a));
  R.locked = lb != null ? draft(lb, 'set by LOCK, cleared by UNLOCK', ev(LK) + ' | ' + ev(UL)) : U('LOCK/UNLOCK handled per object (no generic set/clear)');
  R.lockable = U('no generic native lockable test (per-object routines)');
  let tb = null; try { tb = sb.GrammarProvider.d214TakeAttribute(story(t.g)); } catch (e) {}
  R.takeable = { value: null, status: 'derived', reason: 'owned by D214 d214TakeAttribute (FIND bit ' + tb + ') then objectOverrideFor wins (R3.2); not mapped' };
  for (const k of PROFILE) if (!R[k]) R[k] = U('no native verb routine tests/sets it generically; nothing to prove from bytecode');
  rows[t.g].prso = prso; rows[t.g].prsi = prsi;
}
fs.writeFileSync(path.join(__dirname, '2026-10-11-zil-matrix.json'), JSON.stringify({ order: titles.map(t => t.g), profileKeys: PROFILE, rows }, null, 1));
const keys = ['container', 'open', 'transparent', 'door', 'supporter', 'animate', 'talkable', 'edible', 'light', 'on', 'enterable', 'wearable', 'worn', 'locked'];
let md = '# ZIL matrix (attribute rows; static drafts only, R3.4)\n\nOrder: GameList runtime (alphabetized). `n` = static draft bit (needs native proof), `-` = unknown (reason in JSON). takeable = derived (D214), other PROFILE keys unknown unless listed.\n\n| Title | class | ' + keys.join(' | ') + ' | drafted |\n|' + '---|'.repeat(keys.length + 3) + '\n';
for (const t of titles) { const R = rows[t.g].keys; const vals = keys.map(k => R[k].value == null ? '-' : R[k].value); md += `| ${t.g.replace(/\.z\d\.js$/, '')} | ${t.cls.split('/')[0].replace('confirmed-zil-family', 'zil')} | ${vals.join(' | ')} | ${vals.filter(x => x !== '-').length}/${keys.length} |\n`; }
fs.writeFileSync(path.join(__dirname, '2026-10-11-zil-matrix.md'), md); console.log(md);
