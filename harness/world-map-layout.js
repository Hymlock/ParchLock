// One focused invariant fixture for the consensus1878/1879 pure layout.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const box = { Map, Set, Number, Math, Array, Object, String, TypeError, Error };
vm.runInNewContext(fs.readFileSync('js/WorldMapLayout.js', 'utf8'), box);
const layout = box.WorldMapLayout;
const cell = (x, y, level = 0) => ({ x, y, level });
const sameCell = (a, b) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
const plain = cells => JSON.parse(JSON.stringify([...cells]));
const nodes = ['first', 'same-name-1', 'same-name-2', 'upper', 'numbered', 'island'].map((key, i) => Object.freeze({ key, anchor: i === 0 }));
const edges = [
  { from: 'first', to: 'same-name-1', dir: 'east' },
  { from: 'first', to: 'same-name-2', dir: 'east' },
  { from: 'same-name-1', to: 'first', dir: 'north' },
  { from: 'first', to: 'upper', dir: 'up' },
  { from: 'same-name-1', to: 'numbered', dir: 'exit 2', command: 'x2' },
  { from: 'first', to: 'not-revealed', dir: 'south' }
].map(Object.freeze);
Object.freeze(nodes); Object.freeze(edges);
const a = layout.place(nodes, edges, new Map());
assert.equal(a.cells.size, nodes.length);
assert.equal(new Set([...a.cells.values()].map(c => `${c.x}:${c.y}:${c.level}`)).size, nodes.length);
sameCell(a.cells.get('first'), cell(0, 0));
sameCell(a.cells.get('upper'), cell(0, 0, 1));
assert.equal(a.edgeKinds[0], 'straight'); assert.equal(a.edgeKinds[1], 'bent');
assert.equal(a.edgeKinds[2], 'bent'); assert.equal(a.edgeKinds[3], 'vertical');
assert.equal(a.edgeKinds[4], 'labelled'); assert.equal(a.edgeKinds[5], 'hidden');
assert.equal(edges[4].command, 'x2'); assert.equal(edges.length, 6);
assert.deepStrictEqual(plain(layout.place(nodes, edges, new Map()).cells), plain(a.cells));
// Extensions include an incoming-only new node; old placements never change.
const next = layout.place([...nodes, { key: 'incoming' }], [...edges, { from: 'incoming', to: 'upper', dir: 'south' }], a.cells);
for (const node of nodes) sameCell(next.cells.get(node.key), a.cells.get(node.key));
sameCell(next.cells.get('incoming'), cell(0, -1, 1));
assert.notStrictEqual(next.cells, a.cells); assert.notStrictEqual(next.cells.get('first'), a.cells.get('first'));
// Reindexing/renaming/reopening do not participate in this identity API.
const reopened = layout.place([...nodes].reverse(), edges, new Map(JSON.parse(JSON.stringify([...a.cells]))));
for (const node of nodes) sameCell(reopened.cells.get(node.key), a.cells.get(node.key));
const removed = layout.place(nodes.slice(1), edges, a.cells); assert(!removed.cells.has('first'));
// Invalid persisted numbers and duplicate stored cells cannot hide rooms.
const bad = new Map([['first', cell(10000, 10000)], ['same-name-1', cell(10000, 10000)], ['upper', cell(Infinity, 0)], ['island', cell(0, 0, 10001)]]);
const repaired = layout.place(nodes, edges, bad);
sameCell(repaired.cells.get('first'), cell(10000, 10000));
assert.equal(new Set([...repaired.cells.values()].map(c => `${c.x}:${c.y}:${c.level}`)).size, nodes.length);
for (const c of repaired.cells.values()) assert(layout.validCell(c));
assert.throws(() => layout.place([{ key: 'duplicate' }, { key: 'duplicate' }], [], new Map()), /unique/);
assert.equal(layout.place([], [], new Map()).cells.size, 0);
const unusual = layout.place([{ key: '__proto__' }, { key: 'constructor' }], [{ from: '__proto__', to: 'constructor', dir: 'toString' }], new Map());
assert.equal(unusual.cells.size, 2); assert.equal(unusual.edgeKinds[0], 'labelled');
// R4 section-group: unitLabelled keeps world default unchanged and stacks labelled exits.
const worldDefault = layout.place(
  [{ key: 'a', anchor: true }, { key: 'b' }],
  [{ from: 'a', to: 'b', dir: 'exit 2' }],
  new Map()
);
const groupMode = layout.place(
  [{ key: 'a', anchor: true }, { key: 'b' }],
  [{ from: 'a', to: 'b', dir: 'exit 2' }],
  new Map(),
  { unitLabelled: true }
);
const dWorld = Math.abs(worldDefault.cells.get('b').x - worldDefault.cells.get('a').x)
  + Math.abs(worldDefault.cells.get('b').y - worldDefault.cells.get('a').y);
const dGroup = Math.abs(groupMode.cells.get('b').x - groupMode.cells.get('a').x)
  + Math.abs(groupMode.cells.get('b').y - groupMode.cells.get('a').y);
assert.equal(dGroup, 1, 'group unitLabelled places labelled exit as orthogonal neighbour');
assert.ok(dWorld >= 2, 'world default labelled exit still uses radius-2 ring');
assert.deepStrictEqual(
  plain(layout.place(nodes, edges, new Map()).cells),
  plain(a.cells),
  'omitted options keeps world place() identical'
);
const gPrev = layout.place(
  [{ key: 's1', anchor: true }, { key: 's2' }],
  [{ from: 's1', to: 's2', dir: 'x1' }],
  new Map(),
  { unitLabelled: true }
);
const gNext = layout.place(
  [{ key: 's1', anchor: true }, { key: 's2' }, { key: 's3' }],
  [{ from: 's1', to: 's2', dir: 'x1' }, { from: 's2', to: 's3', dir: 'x2' }],
  gPrev.cells,
  { unitLabelled: true }
);
sameCell(gNext.cells.get('s1'), gPrev.cells.get('s1'));
sameCell(gNext.cells.get('s2'), gPrev.cells.get('s2'));
console.log('PASS: World Map layout identity, collision, cycles, levels, numbered/incoming edges, stability, persistence, invalid cells, purity, R4 unitLabelled group mode.');
