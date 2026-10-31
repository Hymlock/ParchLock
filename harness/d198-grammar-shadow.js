/* D198 Gate E: owner-local grammar valve and isolated shadow snapshot. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const storage = new Map();
const sandbox = {
    console,
    window: {},
    localStorage: {
        getItem: key => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: key => storage.delete(key)
    },
    setTimeout: () => 0,
    ZRamReader: undefined,
    GrammarProvider: undefined,
    WorldModel: { lastPayload: { sentinel: true } },
    ZRamProvider: undefined
};
vm.createContext(sandbox);
for (const file of ['js/ZRamReader.js', 'js/GrammarProvider.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}

function story(name) {
    const text = fs.readFileSync(path.join(root, 'games', name), 'utf8');
    const match = text.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
    if (!match) throw new Error('No story wrapper: ' + name);
    return new Uint8Array(Buffer.from(match[1].replace(/\s+/g, ''), 'base64'));
}

let checks = 0;
function ok(value, message) {
    checks++;
    if (!value) throw new Error('FAIL: ' + message);
}
function same(a, b, message) { ok(JSON.stringify(a) === JSON.stringify(b), message); }

const GP = sandbox.GrammarProvider;
const valve = GP.D198GrammarValve;
const zork = story('Zork1-TheGreatUndergroundEmpire.z3.js');
const advent = story('Advent.z5.js');
// Suspect.z3 was the unknown-family fixture until b0e2f9e0 admitted it as
// confirmed-zil-family; every shipped raw story now classifies, so use a
// synthetic v3 image that no family validator can confirm.
const unknownStory = new Uint8Array(65536); unknownStory[0] = 3; unknownStory[0x1a] = 0x80;

sandbox.ZRamProvider = { getMem: () => zork };
ok(valve.mode() === 'on', 'grammar valve defaults on after validated activation');
valve._testOverride = 'off';
const offZork = GP.collect();
ok(offZork.specialCommands.length === 0, 'off preserves legacy empty Infocom vocabulary');
ok(GP.d198ShadowDiagnostics() === null, 'off creates no shadow snapshot');
same(sandbox.WorldModel.lastPayload, { sentinel: true }, 'off does not mutate WorldModel payload');

valve._testOverride = 'shadow';
const shadowZork = GP.collect();
same(shadowZork, offZork, 'shadow returns exact off payload');
const shadow = GP.d198ShadowDiagnostics();
ok(shadow.classification === 'confirmed-zil-family' && shadow.activation === 'shadow', 'shadow records validated ZIL classification');
ok(shadow.vocabulary.includes('take') && shadow.templates.length > 0, 'shadow retains decoded diagnostics');
ok(!sandbox.window.__PL_GRAMMAR_VERBS__ || sandbox.window.__PL_GRAMMAR_VERBS__.length === 0, 'shadow does not publish D198 grammar verbs');
same(sandbox.WorldModel.lastPayload, { sentinel: true }, 'shadow does not mutate WorldModel payload');
shadow.vocabulary[0] = 'mutated';
ok(GP.d198ShadowDiagnostics().vocabulary[0] !== 'mutated', 'shadow diagnostics getter returns a clone');

sandbox.ZRamProvider.getMem = () => advent;
valve._testOverride = 'off';
const offInform = GP.collect();
const offGlobal = JSON.stringify(sandbox.window.__PL_GRAMMAR_VERBS__);
valve._testOverride = 'shadow';
const shadowInform = GP.collect();
same(shadowInform, offInform, 'Inform provider payload is byte-identical in shadow');
ok(JSON.stringify(sandbox.window.__PL_GRAMMAR_VERBS__) === offGlobal, 'Inform global verb list is byte-identical in shadow');
ok(GP.d198ShadowDiagnostics().classification === 'confirmed-inform', 'Inform classification is diagnostic only');

valve._testOverride = 'on';
sandbox.ZRamProvider.getMem = () => zork;
const onZork = GP.collect();
ok(onZork.specialCommands.length > 100, 'on exposes the validated game-wide Infocom vocabulary');
ok(onZork.specialCommands.some(item => item.command === 'take' && item.source === 'dictionary-verb' && item.d198 === true), 'active vocabulary keeps D198 provenance on the established transport');
same(sandbox.window.__PL_GRAMMAR_VERBS__, onZork.specialCommands.map(item => item.command), 'on publishes exactly the active grammar vocabulary');
ok(GP.d198ShadowDiagnostics() === null, 'on does not leave a shadow snapshot');

sandbox.ZRamProvider.getMem = () => unknownStory;
valve._testOverride = 'shadow';
GP.collect();
ok(GP.d198ShadowDiagnostics() && GP.d198ShadowDiagnostics().classification === 'unknown', 'unknown-family fixture really classifies unknown');
valve._testOverride = 'on';
const unknownOn = GP.collect();
ok(unknownOn.specialCommands.length === 0, 'unknown family emits no facts even when valve is on');

valve._testOverride = 'invalid';
ok(valve.mode() === 'on', 'invalid or absent valve values use the validated default');
GP.collect();
ok(GP.d198ShadowDiagnostics() === null, 'returning off clears generation-local shadow state');

valve._testOverride = null;
ok(valve.setMode('shadow') === 'shadow' && storage.get(valve.StorageKey) === 'shadow', 'versioned shadow mode persists under owner key');
ok(valve.mode() === 'shadow', 'persisted shadow mode reads back');
GP._d198ShadowSnapshot = { sentinel: true };
ok(valve.setMode('on') === 'on' && storage.get(valve.StorageKey) === 'on', 'versioned on mode reads back');
ok(GP.d198ShadowDiagnostics() === null, 'leaving shadow clears the snapshot immediately');
ok(valve.setMode('nonsense') === 'off' && storage.get(valve.StorageKey) === 'off', 'invalid requested mode persists explicit rollback state');

sandbox.ZRamProvider.getMem = () => null;
valve._testOverride = 'shadow';
GP.collect();
ok(GP.d198ShadowDiagnostics() === null, 'no-memory shadow collection cannot retain a prior snapshot');

console.log('PASS D198 grammar shadow/valve: ' + checks + ' checks for off parity, isolated shadow, validated activation and fail-closed controls');
