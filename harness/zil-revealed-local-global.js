// Constructed consumer controls on original LGOP bytes, not native story evidence.
// Reuse the existing story/VM loader without executing its separate light tests.
const fs = require('fs'), assert = require('assert');
const source = fs.readFileSync('harness/zil-light-forms.js', 'utf8');
const prefix = source.split('const LIGHT=')[0];
if (prefix === source) throw Error('Shared test loader boundary changed');
const load = new Function('require', prefix + '\nreturn load;')(require);
const T = load('LeatherGoddessesofPhobos.z3.js');
const originalDigest = T.digest;
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const gate = T.h.globals + 2 * 144;
const objects = () => Array.from(T.R.revealedLocalGlobalObjects(T.mem, 50, T.player));
T.parent(T.player, 50);
T.mem.setUint16(gate, 0);
check('Hidden Cell admits no object', () => assert.equal(objects().length, 0));
T.mem.setUint16(gate, 1);
check('Revealed Cell admits exact SDESC owner, preserving physical holder', () => {
  const [o] = objects(); assert(o); assert.equal(o.id, 83); assert.equal(o.name, 'black circle');
  assert.equal(o.parentId, 40); assert.equal(o.scopeRoomId, 50);
});
function row() {
  const o = objects()[0]; T.payload.discoveredObjects = o ? [o] : [];
  return o && T.S.commandsForObject(o, 'room')[0];
}
check('Synth and semantic resolver offer only scoped Examine', () => {
  const c = row(); assert(c); assert.equal(c.command, 'examine black circle');
  assert(T.c.Actionable.radialCommandCurrent(c));
  assert.deepEqual(Array.from(T.c.SemanticActions.resolveForObject(objects()[0], 'room').map(c => c.verb)), ['examine']);
});
function stale(name, mutate, undo) {
  check(name, () => { const c = row(); assert(c); mutate(); assert(!T.c.Actionable.radialCommandCurrent(c)); undo(); });
}
stale('Gate clear invalidates existing radial', () => T.mem.setUint16(gate, 0), () => T.mem.setUint16(gate, 1));
stale('Physical room change invalidates existing radial', () => T.parent(T.player, 49), () => T.parent(T.player, 50));
stale('Restore generation change invalidates existing radial', () => T.c.UndoRestoreSync.generation++, () => T.c.UndoRestoreSync.generation--);
stale('Digest drift invalidates existing radial', () => T.digest = 'unknown', () => T.digest = originalDigest);
const nameProp = T.R.listProps(T.mem, 83).find(p => p.num === 16);
stale('Untyped SDESC word rejected before decode', () => T.mem.setUint16(nameProp.dataAddr, 1), () => T.mem.setUint16(nameProp.dataAddr, 59426));
stale('Holder drift invalidates existing radial', () => T.parent(83, 41), () => T.parent(83, 40));
stale('Verified noun drift invalidates existing radial', () => T.names[83] = 'hole', () => delete T.names[83]);
const membership = T.R.listProps(T.mem, 50).find(p => p.num === 15), oldMember = T.mem.getUint8(membership.dataAddr + 1);
stale('GLOBAL membership removal invalidates radial', () => T.mem.setUint8(membership.dataAddr + 1, 0), () => T.mem.setUint8(membership.dataAddr + 1, oldMember));
stale('Stable-header drift invalidates radial', () => T.mem.setUint8(2, T.bytes[2] ^ 1), () => T.mem.setUint8(2, T.bytes[2] ^ 1));
stale('Malformed fact rejected', () => T.F.revealedLocalGlobal.gateGlobalSlot = '144', () => T.F.revealedLocalGlobal.gateGlobalSlot = 144);
stale('Out-of-frontier owner rejected', () => T.F.revealedLocalGlobal.object = 238, () => T.F.revealedLocalGlobal.object = 83);
stale('Disabled inspect policy invalidates scoped action', () => T.c.AttrCalibrator.inspectVerbCurrentlyDisabled = () => true, () => delete T.c.AttrCalibrator.inspectVerbCurrentlyDisabled);
check('Supplied non-player cannot substitute for resolved player', () => assert.equal(T.R.revealedLocalGlobalObjects(T.mem, 50, 202).length, 0));
check('Shared/forged verb rejected', () => {
  const c = row(); assert(!T.c.Actionable.radialCommandCurrent(Object.assign({}, c, { sharedMembers: [c] })));
  assert(!T.c.Actionable.radialCommandCurrent(Object.assign({}, c, { verb: 'enter' })));
});
check('Reader scope includes one logical owner; other room adds nothing', () => {
  assert.equal(T.R.scopeObjects(T.mem, 50, { playerId: T.player }).filter(o => o.id === 83).length, 1);
  assert.equal(T.R.revealedLocalGlobalObjects(T.mem, 49, T.player).length, 0);
});
check('Actual Actionable resolver preserves aliases, intent and unchanged tap', () => {
  const vm = require('vm');
  vm.runInContext(fs.readFileSync('js/Actionable.js', 'utf8'), T.c);
  T.c.Actionable.payloadPool = () => T.payload.discoveredObjects;
  T.payload.discoveredObjects = objects();
  const o = T.payload.discoveredObjects[0], c = T.S.commandsForObject(o, 'room')[0];
  assert(c); assert(T.c.Actionable.radialCommandCurrent(c), c.command);
  const semantic = T.c.SemanticActions.resolveForObject(o, 'room');
  assert.equal(semantic.length, 1); assert.equal(semantic[0].intent, 'INSPECT');
  assert.equal(semantic[0].context, 'room'); assert(semantic[0].revealedLocalGlobalScope);
  assert(T.c.Actionable.radialCommandCurrent(semantic[0]));
  T.c.AttrCalibrator.inspectVerbCurrentlyDisabled = () => true;
  assert.equal(T.S.commandsForObject(o, 'room').length, 0);
  assert(!T.c.Actionable.radialCommandCurrent(c));
  delete T.c.AttrCalibrator.inspectVerbCurrentlyDisabled;
});
console.log('PASS ' + checks + ' LGOP consumer controls (X tier)');
