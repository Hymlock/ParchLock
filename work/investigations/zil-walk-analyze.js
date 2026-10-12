// Analysis of zil-walk-*.json (grok2). For each title and key, lists native evidence for the SOURCE-predicted bit only
// (no bit is chosen from the run). Positive/negative rules (D-rules, Codex #3394): >=2 distinct on-device positive objects
// + >=1 negative. Prints candidate facts; a human/Codex decides.
const fs = require('fs'), path = require('path'); const SRC = require('./2026-10-11-zil-source-flags.json');
const bitOf = (s, F) => { const f = s.flags && s.flags[F]; return f && (f.exact || (f.fp === 0 && f.tp >= 2)) ? f.bit : null; };
// Prefer a completed walkthrough, then a run with the fixed boot census (c* files, object-table-bounded), then the longer run.
const runs = {}; const rank = (r, f) => [!r.end && !r.err ? 1 : 0, /zil-walk-c\d/.test(f) ? 1 : 0, (r.steps || []).length]; const better = (x, y) => { for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };
const rk = {}; for (const f of fs.readdirSync(__dirname).filter(f => /^2026-10-11-zil-walk-(\d+|[sc]\w+)\.json$/.test(f))) { const j = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')); for (const g in j) { const k = rank(j[g], f); if (!runs[g] || better(k, rk[g])) { runs[g] = j[g]; rk[g] = k; } } }
const { story } = require('./zil-attr-analyzer.js');
// Rooms and the player are not evidence objects: rooms = children of the object with the most children (ROOMS); player names excluded.
const roomsOf = g => { if (!runs[g]) return new Set(); const m = Buffer.from(story(g)), v = m[0], ot = m.readUInt16BE(0x0a), b0 = ot + (v <= 3 ? 62 : 126), sz = v <= 3 ? 9 : 14, par = []; for (let i = 1; i < 1000; i++) { const e = b0 + (i - 1) * sz; if (e + sz > m.readUInt16BE(0x0e)) break; const pa = v <= 3 ? m[e + 4] : m.readUInt16BE(e + 6); const pr = v <= 3 ? m.readUInt16BE(e + 7) : m.readUInt16BE(e + 12); if (pr < e + sz) break; par[i] = pa; } const cnt = {}; par.forEach(p => { cnt[p] = (cnt[p] || 0) + 1; }); // ROOMS = the parent whose children most often hold the run's touched objects (rooms hold items; LOCAL-GLOBALS do not).
  const hold = {}; for (const st of (runs[g].steps || [])) for (const id in st.objs) { const pp = st.objs[id].p; if (pp > 0 && par[pp] > 0) hold[par[pp]] = (hold[par[pp]] || 0) + 1; }
  const RP = +Object.keys(hold).sort((a, b) => hold[b] - hold[a])[0], RM = +Object.keys(cnt).filter(k => k > 0).sort((a, b) => cnt[b] - cnt[a])[0]; return new Set(par.map((p, i) => p === RP || p === RM ? i : -1).filter(i => i > 0)); };
const PLAYER = /^(yourself|cretin|protagonist|it|me|you|#\d+)$/i;
const res = {};
for (const [g, r] of Object.entries(runs)) { const s = SRC[g] || {}; const B = { CB: bitOf(s, 'CONTBIT'), OB: bitOf(s, 'OPENBIT'), WB: bitOf(s, 'WORNBIT'), NB: bitOf(s, 'ONBIT'), AB: bitOf(s, 'ACTORBIT') }; const E = res[g] = { bits: B, steps: (r.steps || []).length, end: r.end || r.err || '' };
  let rooms; try { rooms = roomsOf(g); } catch (e) { rooms = new Set(); }
  const add = (k, kind, o, c, id) => { if (rooms.has(id)) return; if (PLAYER.test(o)) return; if (kind === 'pos' && / \(already open\)$/.test(c)) o = o + ' [test]'; const e = E[k] = E[k] || { pos: {}, neg: {} }; e[kind][o] = e[kind][o] || c; };
  for (const st of r.steps || []) { const c = st.c.toLowerCase(), nm = id => (st.objs[id] && st.objs[id].n) || '#' + id;
    for (const [op, o, b, x] of st.ops) {
      if (b === B.OB && op === 's' && /^open\b/.test(c)) add('open', 'pos', nm(o), c, o);
      if (b === B.OB && op === 't' && x === 1 && /^open\b/.test(c)) add('open', 'pos', nm(o), c + ' (already open)', o);
      if (b === B.OB && op === 't' && x === 0 && /^open\b/.test(c)) add('open', 'neg', nm(o), c, o);
      if (b === B.OB && op === 'c' && /^close\b/.test(c)) add('open', 'neg', nm(o), c, o);
      if (b === B.AB && op === 't' && x === 1) add('animate', 'pos', nm(o), c, o);
      if (b === B.AB && op === 't' && x === 0) add('animate', 'neg', nm(o), c, o);
      if (b === B.CB && op === 't' && x === 1) add('container', 'pos', nm(o), c, o);
      if (b === B.CB && op === 't' && x === 0) add('container', 'neg', nm(o), c, o);
      if (b === B.WB && op === 's' && /^(wear|put on)\b/.test(c)) add('worn', 'pos', nm(o), c, o);
      if (b === B.WB && op === 'c' && /^(remove|take off|drop)\b/.test(c)) add('worn', 'neg', nm(o), c, o);
      if (b === B.NB && op === 's' && /^(turn on|light|switch on|activate|turn .* on)\b/.test(c)) add('on', 'pos', nm(o), c, o);
      if (b === B.NB && op === 'c' && /^(turn off|extinguish|blow out|switch off|turn .* off)\b/.test(c)) add('on', 'neg', nm(o), c, o);
      if (b === B.NB && op === 't' && x === 0 && /^(turn on|light|switch on|activate|turn .* on)\b/.test(c)) add('on', 'neg', nm(o), c + ' (tested off before on)', o); } }
  const full = !r.end && !r.err && (r.steps || []).length > 0; const cen = r.census || {}; // census = static capability flag (boot, non-room): on <- LIGHTBIT (light-capable), worn <- WEARBIT; open has no static census.
  const FL = { open: null, container: 'CONTBIT', worn: 'WEARBIT', on: 'LIGHTBIT', animate: 'ACTORBIT' };
  for (const k of ['open', 'container', 'worn', 'on', 'animate']) { const e = E[k]; if (!e) continue; const dn = o => new Set(Object.keys(o).map(x => x.replace(/ \[test\]$/, ''))).size; const np = dn(e.pos), nn = dn(e.neg);
    // Operator single-object rule (8:31 PM): full walkthrough completed, source/boot census shows exactly ONE non-room object with the flag, 1 positive on it + >=1 negative.
    const only = cen[FL[k]]; e.census = only; const single = full && Array.isArray(only) && only.length === 1 && np === 1 && nn >= 1;
    e.verdict = np >= 2 && nn >= 1 ? 'MEETS 2+1' : single ? 'single-object + source' : 'insufficient (' + np + '+' + nn + (only ? ', census ' + only.length : '') + ')'; } }
fs.writeFileSync(path.join(__dirname, '2026-10-11-zil-walk-analysis.json'), JSON.stringify(res, null, 1));
for (const [g, E] of Object.entries(res)) console.log(g.padEnd(34), 'steps', E.steps, JSON.stringify(E.bits), ['open', 'container', 'worn', 'on', 'animate'].map(k => k + ':' + (E[k] ? E[k].verdict + ' [' + Object.keys(E[k].pos).slice(0, 4).join('; ') + ' / ' + Object.keys(E[k].neg).slice(0, 2).join('; ') + ']' : '-')).join('  '), E.end.slice(0, 50));
