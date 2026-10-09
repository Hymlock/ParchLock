const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function FakeZvm() {}
FakeZvm.prototype.restore_undo = value => value;
FakeZvm.prototype.restore_file = value => value;
FakeZvm.prototype.restart = () => undefined;
const syncs = [];
const sandbox = {
    window: { ZVM: FakeZvm },
    UndoRestoreSync: { onStateRestored: reason => syncs.push(reason) },
    setTimeout: () => 0
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/ZvmCapture.js'), 'utf8'), sandbox);
const zvm = new FakeZvm();
const nativeClears = [];
zvm.mainwin = { id: 201 };
zvm.Glk = { glk_window_clear: win => nativeClears.push(win.id) };
assert.equal(zvm.restore_undo(0), 0);
assert.equal(zvm.restore_file(0), 0);
assert.equal(syncs.length, 0, 'failed restores do not resync topology');
assert.deepEqual(nativeClears, [], 'failed restore does not clear the story window');
assert.equal(zvm.restore_undo(1), 1);
assert.equal(zvm.restore_file(2), 2);
assert.deepEqual(syncs, ['restore_undo', 'restore_file'], 'successful restores retain their operation identity');
assert.deepEqual(nativeClears, [201], 'successful file restore clears through the native Glk window model');
zvm.restart();
assert.deepEqual(syncs, ['restore_undo', 'restore_file', 'restart'], 'restart always resyncs topology');
assert.deepEqual(nativeClears, [201], 'undo and restart never clear the native story window');
console.log('PASS: failed restore ignored; successful restore/restart operation identity preserved');

// ---------------------------------------------------------------------------
// D94 additions. The block above mocks UndoRestoreSync, so it kept passing
// while the REAL module had no onStateRestored at all -- ZvmCapture then threw
// a TypeError inside the VM's boot-time `restart`, leaving the game pane blank
// (intermittently: the wrapper is installed by a polling timer). These cases
// use the real module and prove an observer failure cannot reach the VM.
// ---------------------------------------------------------------------------
function loadZvmCapture(extra) {
    function Z() {}
    Z.prototype.restore_undo = v => v;
    Z.prototype.restore_file = v => v;
    let restarts = 0;
    Z.prototype.restart = () => { restarts++; };
    const box = Object.assign({ window: { ZVM: Z }, setTimeout: () => 0 }, extra);
    vm.createContext(box);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/ZvmCapture.js'), 'utf8'), box);
    return { z: new Z(), restarts: () => restarts };
}

// 1. The real module must define the method the VM wrapper calls.
{
    const real = { setTimeout: (fn) => { real.__fired = fn; return 1; }, clearTimeout() {} };
    vm.createContext(real);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/UndoRestoreSync.js'), 'utf8') + '\nthis.__urs = UndoRestoreSync;', real);
    assert.equal(typeof real.__urs.onStateRestored, 'function', 'UndoRestoreSync.onStateRestored must exist (ZvmCapture calls it)');
    real.__urs.onStateRestored();
    real.__urs.onStateRestored();
    assert.equal(typeof real.__fired, 'function', 'onStateRestored schedules a resync after the terp paints');
    assert.ok(real.__urs._restoreTimer, 'back-to-back restores are coalesced into one pending resync');
}

// 2. Real module wired to the real ZvmCapture wrapper: a boot restart must not throw.
{
    const real = { setTimeout: () => 1, clearTimeout() {} };
    vm.createContext(real);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/UndoRestoreSync.js'), 'utf8') + '\nthis.__urs = UndoRestoreSync;', real);
    const { z, restarts } = loadZvmCapture({ UndoRestoreSync: real.__urs });
    assert.doesNotThrow(() => z.restart(), 'VM restart with the real UndoRestoreSync must not throw');
    assert.equal(restarts(), 1, 'the VM restart itself still runs');
}

// 3. Regression for the actual incident: an observer that lacks the method
//    (or throws) must never propagate into the VM.
{
    const { z, restarts } = loadZvmCapture({ UndoRestoreSync: {} });
    assert.doesNotThrow(() => z.restart(), 'missing onStateRestored must not abort VM start');
    assert.equal(restarts(), 1);
    const boom = loadZvmCapture({ UndoRestoreSync: { onStateRestored() { throw new Error('observer bug'); } } });
    assert.doesNotThrow(() => boom.z.restart(), 'a throwing observer must not abort VM start');
    assert.equal(boom.z.restore_undo(1), 1, 'a throwing observer must not change restore_undo results');
}
console.log('PASS: D94 real-module wiring: onStateRestored exists, boot restart cannot be crashed by the observer');

// 4. A completed file restore gets exactly one normal LOOK after the Glk line
//    input returns. Undo/restart still resync, but must not create a player turn.
{
    const timers = [];
    const submitted = [];
    const real = {
        setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; },
        clearTimeout() {},
        $: selector => ({
            length: selector === '.Input.LineInput:visible' ? 1 : 0
        }),
        Message: { IsOpen: false },
        Actionable: { Submit(command) { submitted.push(command); return true; } }
    };
    vm.createContext(real);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/UndoRestoreSync.js'), 'utf8') + '\nthis.__urs = UndoRestoreSync;', real);
    real.__urs.resync = () => {};
    real.__urs.clearStoryBeforeRestoreLook = () => { submitted.push('clear'); return true; };

    real.__urs.onStateRestored('restore_file');
    timers.shift().fn(); // 250ms settle/resync
    assert.equal(timers[0].delay, 750, 'post-restore LOOK waits for Glk to rebuild the saved window');
    timers.shift().fn();
    assert.deepEqual(submitted, ['clear', 'look'], 'file restore clears stale story text before one visible LOOK');

    real.__urs.onStateRestored('restart');
    timers.shift().fn();
    assert.deepEqual(submitted, ['clear', 'look'], 'restart does not clear or inject LOOK');
}
console.log('PASS: successful file restore clears stale text then emits one LOOK; undo/restart paths remain passive');

// Boot retirement and save presentation ordering (post-APK report).
{
    const timers=[], calls=[];
    const real={setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},
        Transcript:{_booting:true},Actionable:{clearLabelSnapshot(){calls.push('clear-labels');},Scope:{},Refresh(){}},
        ParchLockMap:{Clear(){calls.push('legacy-map-clear');},Save(){}},
        SaveState:{applyPending(){calls.push('saved-state');return true;}},
        StatTracker:{Resync(){calls.push('stats');}},WorldModel:{tick(){calls.push('world');}}};
    vm.createContext(real);
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/UndoRestoreSync.js'),'utf8')+'\nthis.sync=UndoRestoreSync;',real);
    const machine={};
    real.sync.onStateRestored('restart',machine);
    assert.equal(timers.length,0,'first actual VM boot restart does not retire marks');
    assert.equal(real.sync.generation,0);
    real.Transcript._booting=false;
    real.sync.onStateRestored('restart',machine);
    timers.shift()();
    assert.deepEqual(calls,['clear-labels','saved-state','stats','world'],'save presentation applies after clear, before any fresh model render; handled map bypasses legacy clear');
    calls.length=0;
    real.sync.onStateRestored('restart',{});
    timers.pop()();
    assert.equal(real.sync.generation,2,'late attached VM first real restart is not mistaken for boot');
}
console.log('PASS: boot VM identity, late attachment and save-state apply ordering');

{
    let timerId=0;const timers=new Map();
    const real={setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},
        window:{__PARCHLOCK_ZVM__:{}},ZvmCapture:{patched:true}};
    vm.createContext(real);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/UndoRestoreSync.js'),'utf8')+'\nthis.sync=UndoRestoreSync;',real);
    for(const cmd of ['restore','undo','restart']) {real.sync.noteCommand(cmd);real.sync.tick();}
    assert.equal(timers.size,0,'native restore attempts never schedule generic resync (cancel/failure keep state)');
    real.sync.noteCommand('load');real.sync.tick();real.sync.tick();
    assert.equal(timers.size,1,'custom LOAD fallback is coalesced');
    real.sync.onStateRestored('restore_file');
    assert.equal(timers.size,1,'actual successful hook cancels fallback, leaving one authoritative settle');
    assert.equal(real.sync.pending,false);
}
console.log('PASS: successful VM hook owns native timelines; cancelled attempts keep state; fallback coalesced');
