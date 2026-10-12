// zil-walk-analyze2 (grok2, after Codex #3449). Uses only q-runs (zil-walk.js with per-step qualified roles).
// - Evidence keyed by OBJECT ID (names are display only); distinct ids are counted.
// - Rooms = observed game locations and every child of an observed ROOMS parent (rp = parent of the location).
//   Player = the app's payload player id per step AND the game's location chain is not used for evidence.
// - Completion: 'won' (game printed a win) or 'exhausted' (every walkthrough command accepted, no death). Death = incomplete.
// - single-object + source: completion required, census (boot, object-table-bounded, non-room holders of the capability flag)
//   has exactly ONE id, the positive is that same id, and >=1 negative (distinct id).
const fs = require('fs'), path = require('path'); const SRC = require('./2026-10-11-zil-source-flags.json'); const { story } = require('./zil-attr-analyzer.js');
const bitOf = (s, F) => { const f = s && s.flags && s.flags[F]; return f && (f.exact || (f.fp === 0 && f.tp >= 2)) ? f.bit : null; };
const runs = {}; for (const f of fs.readdirSync(__dirname).filter(f => /^2026-10-11-zil-walk-m\d\.json$/.test(f))) { const j = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')); for (const g in j) { const r = j[g]; const done = x => x.terminalWin ? 3 : x.won ? 2 : x.exhausted ? 1 : 0; if (!runs[g] || done(r) > done(runs[g]) || (done(r) === done(runs[g]) && r.steps.length > runs[g].steps.length)) runs[g] = Object.assign(r, { file: f }); } }
const parents = g => { const m = Buffer.from(story(g)), v = m[0], ot = m.readUInt16BE(0x0a), b0 = ot + (v <= 3 ? 62 : 126), sz = v <= 3 ? 9 : 14, par = []; let minP = 1e9; for (let i = 1; i < 2000; i++) { const e = b0 + (i - 1) * sz; if (e + sz > minP) break; minP = Math.min(minP, m.readUInt16BE(e + sz - 2)); par[i] = v <= 3 ? m[e + 4] : m.readUInt16BE(e + 6); } return par; };
const res = {};
// Game-over cut (Codex #3451/#3453): steps after the game's own RESTART/RESTORE/QUIT prompt are not play; a game over before the list ends is a death/ending, not completion.
for (const [g, r] of Object.entries(runs)) { const go = r.steps.findIndex(x => /restart, restore,? or quit/i.test(x.t)); if (go >= 0) { r.steps = r.steps.slice(0, go + 1); r.gameOverAt = go; if (!r.terminalWin) { r.exhausted = false; r.died = true; } } const s = SRC[g] || {}; const B = { CB: bitOf(s, 'CONTBIT'), OB: bitOf(s, 'OPENBIT'), WB: bitOf(s, 'WORNBIT'), NB: bitOf(s, 'ONBIT'), AB: bitOf(s, 'ACTORBIT') };
  const par = parents(g); const RPS = new Set(r.steps.map(x => x.rp).filter(x => x > 0)); const LOCS = new Set(r.steps.map(x => x.loc).filter(x => x > 0)); const PLS = new Set(r.steps.map(x => x.pl).filter(x => x > 0));
  const isRoom = id => LOCS.has(id) || RPS.has(par[id]); const isPlayer = id => PLS.has(id);
  // Codex #3453: completion = the game's own end-of-game checkpoint without a death; list exhaustion is only 'attempted'.
  const completion = r.terminalWin ? 'terminal' : r.won ? 'won' : r.exhausted ? 'attempted' : 'incomplete';
  const E = res[g] = { file: r.file, bits: B, steps: r.steps.length, completion, end: (r.end || r.err || '').slice(0, 100), rooms: RPS.size + '/' + LOCS.size, players: [...PLS] };
  const add = (k, kind, id, nm, c, how) => { if (isRoom(id) || isPlayer(id)) return; const e = E[k] = E[k] || { pos: {}, neg: {} }; if (!e[kind][id]) e[kind][id] = nm + ' <' + c + '>' + (how ? ' ' + how : ''); };
  for (const st of r.steps) { const c = st.c.toLowerCase(), nm = id => (st.objs[id] && st.objs[id].n) || '#' + id;
    for (const [op, o, b, x] of st.ops) {
      if (b === B.OB && /^open\b/.test(c)) { if (op === 's') add('open', 'pos', o, nm(o), c, 'set'); else if (op === 't' && x === 1) add('open', 'pos', o, nm(o), c, 'already-open'); else if (op === 't' && x === 0) add('open', 'neg', o, nm(o), c, 'tested-closed'); }
      if (b === B.OB && op === 'c' && /^close\b/.test(c)) add('open', 'neg', o, nm(o), c, 'cleared');
      if (b === B.CB && op === 't') add('container', x ? 'pos' : 'neg', o, nm(o), c);
      if (b === B.AB && op === 't') add('animate', x ? 'pos' : 'neg', o, nm(o), c);
      if (b === B.WB && op === 's' && /^(wear|put on)\b/.test(c)) add('worn', 'pos', o, nm(o), c);
      if (b === B.WB && op === 'c' && /^(remove|take off)\b/.test(c)) add('worn', 'neg', o, nm(o), c);
      if (b === B.NB && op === 's' && /^(turn on|light|switch on|activate|turn \S+ on)\b/.test(c)) add('on', 'pos', o, nm(o), c);
      if (b === B.NB && op === 'c' && /^(turn off|extinguish|blow out|switch off|turn \S+ off)\b/.test(c)) add('on', 'neg', o, nm(o), c, 'cleared');
      if (b === B.NB && op === 't' && x === 0 && /^(turn on|light|switch on|activate|turn \S+ on)\b/.test(c)) add('on', 'neg', o, nm(o), c, 'tested-off'); } }
  const CEN = { container: 'CONTBIT', worn: 'WEARBIT', on: 'LIGHTBIT', animate: 'ACTORBIT' };
  for (const k of ['open', 'container', 'worn', 'on', 'animate']) { const e = E[k]; if (!e) continue; const P = Object.keys(e.pos), N = Object.keys(e.neg); const cen = CEN[k] && r.census && r.census[CEN[k]] ? r.census[CEN[k]].map(x => +String(x).split(':')[0]).filter(id => !isRoom(id) && !isPlayer(id)) : null; e.census = cen;
    const single = (completion === 'terminal' || completion === 'won') && cen && cen.length === 1 && P.length === 1 && +P[0] === cen[0] && N.some(n => +n !== cen[0] || /tested-off|cleared/.test(e.neg[n]));
    e.verdict = P.length >= 2 && N.length >= 1 ? 'MEETS 2+1' : single ? 'single-object + source' : 'insufficient (' + P.length + '+' + N.length + (cen ? ', census ' + cen.length : '') + ')'; } }
fs.writeFileSync(path.join(__dirname, '2026-10-11-zil-walk-analysis2.json'), JSON.stringify(res, null, 1));
for (const [g, E] of Object.entries(res)) console.log(g.padEnd(38), E.completion.padEnd(10), 'rooms', E.rooms, 'pl', E.players.join('/'), ['open', 'container', 'worn', 'on', 'animate'].map(k => E[k] ? k + '=' + E[k].verdict.replace('insufficient ', '') : '').filter(Boolean).join(' '));
