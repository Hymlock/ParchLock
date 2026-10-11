/* Offline ZIL attribute analyzer (grok2, 2026-10-11). Tool only; never loaded by the product.
 * Within the #3272 locks: produces DRAFT attributeMap facts for review, from each story's own
 * bytecode: D198 grammar -> action routine per verb -> test_attr/set_attr/clear_attr constants. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..', '..');
const sb = { console, window: {}, setTimeout: () => 0 }; vm.createContext(sb);
for (const f of ['js/ZRamReader.js', 'js/GrammarProvider.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb, { filename: f });
function story(name) {
  const raw = fs.readFileSync(path.join(root, 'games', name));
  const m = raw.toString('utf8').match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
  const b = Buffer.from(m[1].replace(/\s+/g, ''), 'base64');
  if (b[0] >= 1 && b[0] <= 8) return new Uint8Array(b);
  const k = b.indexOf(Buffer.from('ZCOD')); return new Uint8Array(b.subarray(k + 8, k + 8 + b.readUInt32BE(k + 4)));
}
const u16 = (m, a) => (m[a] << 8) | m[a + 1];
function actionTable(mem, d) {
  const maxA = Math.max(...d.templates.map(t => +t.actionId.split(':')[1]));
  const n = maxA + 1, end = d.staticRange.end, pc = d.prepositions.length;
  for (const es of [3, 4]) { const prepBase = end - 2 - pc * es; if (u16(mem, prepBase) === pc) return { base: prepBase - n * 4, n }; }
  return null;
}
function unpack(v, a) { return v <= 3 ? a * 2 : v <= 5 ? a * 4 : a * 8; }
// R2.3: control-flow worklist (no linear sweep over unreachable bytes); branch polarity kept.
// Codex 3310: versioned opcode whitelist; anything else fails closed.
function validOp(kind, op, v) {
  if (kind === '2OP') return op >= 1 && op <= (v >= 5 ? 0x1c : v === 4 ? 0x19 : 0x18);
  if (kind === '1OP') return !(op === 8 && v < 4);
  if (kind === '0OP') { if (op === 0x0e) return false; if (op === 0x0f) return v >= 5; if (op === 0x0c) return v === 3; return true; }
  if (kind === 'VAR') { if (v >= 5) return true; if (v === 4) return op <= 0x19; return op <= 0x0b || (op >= 0x13 && op <= 0x15); }
  if (kind === 'EXT') return v >= 5 && (op <= 4 || (op >= 9 && op <= 0x0c));
  return false;
}
function decodeAt(mem, v, pc) {
  const at = pc; if (pc < 0 || pc >= mem.length) return { at, bad: 'out of bounds' }; const b = mem[pc++]; let kind, op, types = [];
  if (b === 0xBE && v >= 5) { op = mem[pc++]; kind = 'EXT'; const t = mem[pc++]; for (let i = 6; i >= 0; i -= 2) types.push((t >> i) & 3); }
  else if (b < 0x80) { kind = '2OP'; op = b & 0x1f; types = [(b & 0x40) ? 2 : 1, (b & 0x20) ? 2 : 1]; }
  else if (b < 0xC0) { const t = (b >> 4) & 3; op = b & 0x0f; if (t === 3) kind = '0OP'; else { kind = '1OP'; types = [t]; } }
  else { kind = b < 0xE0 ? '2OP' : 'VAR'; op = b & 0x1f; const t = mem[pc++]; for (let i = 6; i >= 0; i -= 2) types.push((t >> i) & 3);
    if (kind === 'VAR' && (op === 0x0C || op === 0x1A)) { const t2 = mem[pc++]; for (let i = 6; i >= 0; i -= 2) types.push((t2 >> i) & 3); } }
  if (!validOp(kind, op, v)) return { at, bad: 'reserved/unsupported ' + kind + ' op ' + op + ' for v' + v };
  const ops = []; for (const t of types) { if (t === 3) break; if (t === 0) { ops.push({ t, v: u16(mem, pc) }); pc += 2; } else ops.push({ t, v: mem[pc++] }); }
  if (kind === '2OP' && (ops.length < 2 || (op !== 1 && ops.length > 2) || ops.length > 4)) return { at, bad: '2OP arity ' + ops.length };
  if (kind === 'VAR' && [0, 0x0c, 0x19, 0x1a].includes(op) && ops.length < 1) return { at, bad: 'call without routine' };
  let store = false, branch = false, text = false, term = false, call = null, jump = null;
  if (kind === '2OP') { if ([8, 9, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].includes(op) || (op === 25 && v >= 4)) store = true; if ([1, 2, 3, 4, 5, 6, 7, 10].includes(op)) branch = true; if (op === 25 || (op === 26 && v >= 5)) call = ops[0]; }
  else if (kind === '1OP') { if ([1, 2, 3, 4, 8, 14].includes(op) || (op === 15 && v <= 4)) store = true; if ([0, 1, 2].includes(op)) branch = true; if (op === 11) term = true; if (op === 12) { jump = ops[0]; term = true; } if (op === 8 || (op === 15 && v >= 5)) call = ops[0]; }
  else if (kind === '0OP') { if ([0, 1, 3, 7, 8, 10].includes(op)) term = true; if (op === 2 || op === 3) text = true; if ((op === 5 || op === 6) && v <= 3) branch = true; if ((op === 5 || op === 6) && v === 4) store = true; if (op === 9 && v >= 5) store = true; if (op === 13 || op === 15) branch = true; }
  else if (kind === 'VAR') { if ([0, 7, 0x0C, 0x16, 0x17, 0x18].includes(op) || (op === 4 && v >= 5) || (op === 9 && v === 6)) store = true; if ([0x17, 0x1F].includes(op)) branch = true; if ([0, 0x0C, 0x19, 0x1A].includes(op)) call = ops[0]; }
  else if (kind === 'EXT') {  if ([0, 1, 2, 3, 4, 9, 10, 0x0c].includes(op)) store = true; }
  if (store) pc++;
  let target = null, onTrue = null;
  if (branch) { const b1 = mem[pc++]; onTrue = !!(b1 & 0x80); let off; if (b1 & 0x40) off = b1 & 0x3f; else { off = ((b1 & 0x3f) << 8) | mem[pc++]; if (off & 0x2000) off -= 0x4000; } if (off !== 0 && off !== 1) target = pc + off - 2; }
  if (text) { let ok = false; while (pc + 1 < mem.length) { const w = u16(mem, pc); pc += 2; if (w & 0x8000) { ok = true; break; } } if (!ok) return { at, bad: 'unterminated inline string' }; }
  if (jump) { if (jump.t === 0) { let off = jump.v; if (off & 0x8000) off -= 0x10000; target = pc + off - 2; } else if (jump.t === 1) target = pc + jump.v - 2; else return { at, bad: 'variable jump' }; }
  if (pc > mem.length) return { at, bad: 'truncated' };
  return { at, next: pc, kind, op, ops, term, call, target, onTrue, isJump: !!jump };
}
function disasm(mem, v, addr, depth, seen, out) {
  if (seen.has(addr) || addr <= 0 || addr >= mem.length) return; seen.add(addr);
  let pc = addr; const nl = mem[pc++]; if (nl > 15) return; if (v <= 4) pc += nl * 2;
  const work = [pc], visited = new Set(); let guard = 0;
  while (work.length && guard++ < 6000) {
    let p = work.pop();
    while (p < mem.length && !visited.has(p) && guard++ < 6000) {
      visited.add(p); const ins = decodeAt(mem, v, p); if (ins.bad) { out.malformed = (out.malformed || []).concat(ins.at + ':' + ins.bad); break; }
      if (ins.kind === '2OP' && [10, 11, 12].includes(ins.op) && ins.ops[1] && ins.ops[1].t === 1) {
        const subj = ins.ops[0].t === 2 ? 'var' + ins.ops[0].v : 'const' + ins.ops[0].v;
        out.push({ op: { 10: 'test', 11: 'set', 12: 'clear' }[ins.op], attr: ins.ops[1].v, subj, depth, at: ins.at, branchOnTrue: ins.onTrue });
      }
      if (ins.call && ins.call.t === 0 && ins.call.v && depth < 2) disasm(mem, v, unpack(v, ins.call.v), depth + 1, seen, out);
      if (ins.target != null) { if (ins.target >= pc && ins.target < mem.length) work.push(ins.target); else out.malformed = (out.malformed || []).concat(ins.at + ':target outside routine'); }
      if (ins.term) break;
      p = ins.next;
    }
  }
  if (guard >= 6000) out.malformed = (out.malformed || []).concat(addr + ':guard exhausted');
  const starts = [...visited].sort((a, b) => a - b);
  for (let i = 1; i < starts.length; i++) { const prev = decodeAt(mem, v, starts[i - 1]); if (!prev.bad && prev.next > starts[i]) { out.malformed = (out.malformed || []).concat(starts[i] + ':target inside instruction at ' + starts[i - 1]); break; } }
  out.sort((x, y) => x.depth - y.depth || x.at - y.at);
}function analyze(name) {
  const mem = story(name), v = mem[0], d = sb.GrammarProvider.decodeD198(mem);
  if (!d) return { name, error: 'no D198 grammar' };
  const at = actionTable(mem, d); if (!at) return { name, error: 'no action table' };
  const byVerb = {};
  for (const t of d.templates) { const a = +t.actionId.split(':')[1]; const key = t.verb + (t.prepositions.length ? ' ' + t.prepositions.join(' ') : '') + '/' + t.objectCount; if (byVerb[key] !== undefined) continue; byVerb[key] = a; }
  const routine = a => { const out = []; disasm(mem, v, unpack(v, u16(mem, at.base + a * 2)), 0, new Set(), out); return out; };
  return { name, version: v, actions: at.n, byVerb, routine };
}
module.exports = { analyze, story, decodeAt, disasm };
if (require.main === module) {
  const r = analyze(process.argv[2] || 'Zork1-TheGreatUndergroundEmpire.z3.js'); if (r.error) { console.log(r.error); process.exit(1); }
  for (const key of (process.argv[3] || 'open/1,close/1,put in/2,put on/2,take/1,wear/1,lock with/2,unlock with/2,light/1,eat/1,attack with/2,enter/1,board/1').split(',')) {
    const a = r.byVerb[key]; if (a === undefined) { console.log(key, '-'); continue; }
    const ops = r.routine(a).filter(o => o.depth === 0);
    console.log(key.padEnd(16), 'A' + a, ops.map(o => o.op + ':' + o.attr + '(' + o.subj + ')').join(' '));
  }
}
