// Analysis of zil-walk-*.json (grok2). For each title and key, lists native evidence for the SOURCE-predicted bit only
// (no bit is chosen from the run). Positive/negative rules (D-rules, Codex #3394): >=2 distinct on-device positive objects
// + >=1 negative. Prints candidate facts; a human/Codex decides.
const fs = require('fs'), path = require('path'); const SRC = require('./2026-10-11-zil-source-flags.json');
const bitOf = (s, F) => { const f = s.flags && s.flags[F]; return f && (f.exact || (f.fp === 0 && f.tp >= 2)) ? f.bit : null; };
const runs = {}; for (const f of fs.readdirSync(__dirname).filter(f => /^2026-10-11-zil-walk-\d+\.json$/.test(f))) Object.assign(runs, JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));
const res = {};
for (const [g, r] of Object.entries(runs)) { const s = SRC[g] || {}; const B = { CB: bitOf(s, 'CONTBIT'), OB: bitOf(s, 'OPENBIT'), WB: bitOf(s, 'WORNBIT'), NB: bitOf(s, 'ONBIT') }; const E = res[g] = { bits: B, steps: (r.steps || []).length, end: r.end || r.err || '' };
  const add = (k, kind, o, c) => { const e = E[k] = E[k] || { pos: {}, neg: {} }; e[kind][o] = e[kind][o] || c; };
  for (const st of r.steps || []) { const c = st.c.toLowerCase(), nm = id => (st.objs[id] && st.objs[id].n) || '#' + id;
    for (const [op, o, b, x] of st.ops) {
      if (b === B.OB && op === 's' && /^open\b/.test(c)) add('open', 'pos', nm(o), c);
      if (b === B.OB && op === 't' && x === 1 && /^open\b/.test(c)) add('open', 'pos', nm(o), c + ' (already open)');
      if (b === B.OB && op === 't' && x === 0 && /^open\b/.test(c)) add('open', 'neg', nm(o), c);
      if (b === B.OB && op === 'c' && /^close\b/.test(c)) add('open', 'neg', nm(o), c);
      if (b === B.CB && op === 't' && x === 1) add('container', 'pos', nm(o), c);
      if (b === B.CB && op === 't' && x === 0) add('container', 'neg', nm(o), c);
      if (b === B.WB && op === 's' && /^(wear|put on)\b/.test(c)) add('worn', 'pos', nm(o), c);
      if (b === B.WB && op === 'c' && /^(remove|take off|drop)\b/.test(c)) add('worn', 'neg', nm(o), c);
      if (b === B.NB && op === 's' && /^(turn on|light|switch on|activate|turn .* on)\b/.test(c)) add('on', 'pos', nm(o), c);
      if (b === B.NB && op === 'c' && /^(turn off|extinguish|blow out|switch off|turn .* off)\b/.test(c)) add('on', 'neg', nm(o), c); } }
  for (const k of ['open', 'container', 'worn', 'on']) { const e = E[k]; if (!e) continue; const np = Object.keys(e.pos).length, nn = Object.keys(e.neg).length; e.verdict = np >= 2 && nn >= 1 ? 'MEETS 2+1' : 'insufficient (' + np + '+' + nn + ')'; } }
fs.writeFileSync(path.join(__dirname, '2026-10-11-zil-walk-analysis.json'), JSON.stringify(res, null, 1));
for (const [g, E] of Object.entries(res)) console.log(g.padEnd(34), 'steps', E.steps, JSON.stringify(E.bits), ['open', 'container', 'worn', 'on'].map(k => k + ':' + (E[k] ? E[k].verdict + ' [' + Object.keys(E[k].pos).slice(0, 4).join('; ') + ' / ' + Object.keys(E[k].neg).slice(0, 2).join('; ') + ']' : '-')).join('  '), E.end.slice(0, 50));
