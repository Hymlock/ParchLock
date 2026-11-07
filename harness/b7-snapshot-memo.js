// B7 snapshot memo controls (COMPARE-and-PROPOSAL-claude-1107 r2). Static, no browser.
// Loads the real ZRamReader + AttributeSchema + facts in a vm with a real story image, stubs the run
// counters, and checks: hit when nothing changed; miss on every input the key covers (VM run,
// undo/restore generation, digest, learning tables = grok #6277 A, status-grid room = grok #6277 B,
// map-admitted rooms, ExitCalibrator table); no store while the VM is mid-run; callers get copies.
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const root = process.cwd();
const story = require(root + '/work/investigations/zil-attr-analyzer.js').story;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } };

function setup(file) {
  const bytes = Uint8Array.from(story(file)), mem = new DataView(bytes.buffer);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const status = { text: '' };
  const T = { digest };
  const c = vm.createContext({
    console: { log() {}, warn() {} }, structuredClone,
    window: {}, document: { readyState: 'loading', addEventListener() {},
      querySelector: (s) => /GridWindow/.test(s) ? { innerText: status.text } : null },
    ZvmCapture: { patched: true, vmRuns: 0, inRun: 0 },
    UndoRestoreSync: { generation: 1 },
    ModuleLibrary: { currentExecutableDigest: () => T.digest, currentExecutableIdentity: () => ({ digest: T.digest, header: Array.from(bytes.slice(0, 28)) }) },
    ZRamProvider: { getMem: () => mem, collectGeneration: 1 },
    AttrCalibrator: { table: { version: 2, verbs: {}, objects: {} }, hydratedForGame: 'g' },
    ExitCalibrator: { _table: { rooms: {} }, _key: 'k' },
    ParchLockMap: { Rooms: [] }
  });
  for (const f of ['ModuleStatFactsClaude', 'ZRamReader', 'GrammarProvider', 'AttributeSchema']) vm.runInContext(fs.readFileSync(root + '/js/' + f + '.js', 'utf8'), c);
  let uncached = 0; const orig = c.ZRamReader._snapshotUncached;
  c.ZRamReader._snapshotUncached = function () { uncached++; return orig.apply(this, arguments); };
  return { c, mem, status, T, calls: () => uncached };
}

for (const file of ['Zork1-TheGreatUndergroundEmpire.z3.js', 'edifice.z5.js']) {
  const S = setup(file), R = S.c.ZRamReader, snap = () => R.snapshot(S.mem);
  const first = snap(), base = S.calls();
  const second = snap();
  ok(S.calls() === base, file + ': second call with nothing changed is a hit');
  ok(JSON.stringify(first) === JSON.stringify(second), file + ': hit equals the uncached result');
  second.inventory = ['MUTATED']; second.roomId = -1;
  ok(JSON.stringify(snap()) === JSON.stringify(first), file + ': mutating a returned copy does not leak into the memo');

  const miss = (label, change) => { const n = S.calls(); change(); snap(); ok(S.calls() === n + 1, file + ': miss on ' + label); snap(); ok(S.calls() === n + 1, file + ': hit again after ' + label); };
  miss('VM run (vmRuns)', () => { S.c.ZvmCapture.vmRuns += 2; });
  miss('undo/restore generation', () => { S.c.UndoRestoreSync.generation++; });
  miss('story digest', () => { S.T.digest = 'other-' + S.T.digest; });
  miss('learning table write after the VM returned (grok A)', () => { S.c.AttrCalibrator.table.wornBit = 6; });
  miss('learning table reset/hydrate', () => { S.c.AttrCalibrator.hydratedForGame = 'g2'; });
  miss('status-grid room number repaint (grok B)', () => { S.status.text = 'Room #25'; });
  miss('ExitCalibrator table write', () => { S.c.ExitCalibrator._table.rooms.x = 1; });
  miss('map-admitted real room', () => { S.c.ParchLockMap.Rooms.push({ HasRealId: true, ObjectId: 999 }); });

  // Mid-run: compute every time, never store.
  S.c.ZvmCapture.inRun = 1;
  let n = S.calls(); snap(); snap();
  ok(S.calls() === n + 2, file + ': inRun computes every call');
  S.c.ZvmCapture.inRun = 0;
  n = S.calls(); snap();
  ok(S.calls() === n + 1, file + ': first call after the run is a miss (nothing stored mid-run)');

  // Unpatched VM capture: no memo at all.
  S.c.ZvmCapture.patched = false; n = S.calls(); snap(); snap();
  ok(S.calls() === n + 2, file + ': no memo when ZvmCapture is not installed');
  S.c.ZvmCapture.patched = true;
}
console.log(pass + ' PASS / ' + fail + ' FAIL (b7 snapshot memo)');
process.exit(fail ? 1 : 0);
