const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function scenario(options = {}) {
    let now = 0;
    const calls = [];
    const rooms = [{ Id: 0, Exits: { n: 1 }, ExitMeta: options.locked ? { n: { isLocked: true } } : {} },
        { Id: 1, Exits: { e: 2 } }, { Id: 2, Exits: {} }];
    const sandbox = {
        Date: { now: () => now }, setTimeout: () => 1, clearTimeout: () => {},
        $: selector => ({ length: selector.includes('LineInput') ? 1 : 0 }),
        Message: { IsOpen: false, Show: () => {} },
        ParchLockMap: { Rooms: rooms, GetCurrentRoom: () => rooms[options.position || 0] },
        Actionable: { Submit: command => { calls.push(command); return options.accepted !== false; } }
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/Navigator.js'), 'utf8'), sandbox);
    return { nav: sandbox.Navigator, calls, advance: position => { options.position = position; now += 600; sandbox.Navigator.Pump(); } };
}
// Navigator.resolveStepCommand deliberately expands short compass keys to
// their full word via expandCompassCommand (js/Navigator.js:87-98) before
// submitting -- internal map storage uses short forms ("n"/"nw") per
// TranslatorUI's own convention, but the real game parser gets the full
// word. This fixture originally predated that expansion and asserted the
// raw short-form key; updated to match the current, intentional behavior
// (both forms are universally valid IF parser vocabulary either way, so
// this is not a functional regression -- just a stale assertion).
let s = scenario();
s.nav.EnqueueRoute(['n', 'e']);
assert.deepEqual(s.calls, ['north']);
s.advance(0);
assert.deepEqual(s.calls, ['north'], 'failed movement must not send the second direction');
assert.ok(s.nav.Interrupted);
s = scenario();
s.nav.EnqueueRoute(['n', 'e']);
s.advance(1);
assert.deepEqual(s.calls, ['north', 'east']);
s.advance(2);
assert.equal(s.nav.Running, false);
assert.equal(s.nav.Interrupted, false);
s = scenario({ locked: true });
s.nav.EnqueueRoute(['n']);
assert.deepEqual(s.calls, []);
assert.ok(s.nav.Interrupted);
s = scenario({ accepted: false });
s.nav.EnqueueRoute(['n', 'e']);
assert.equal(s.nav.Running, false);
assert.equal(s.nav.Submitting, false);
assert.deepEqual(s.calls, ['north']);
console.log('PASS: navigation arrival, failed movement, locked exit, rejected submission');
