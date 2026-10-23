// More-page candidate admission only. These constructed controls do not
// establish native object capabilities; see the retained native UI captures.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let captured, words = [], learned = [], grammar, inform = false, decodes = 0;
const c = vm.createContext({
    console,
    ParchLockQol: {
        GetRadialCommands: () => words,
        OpenRadial: (x, y, slices) => { captured = slices; }
    },
    AttrCalibrator: { allowedVerbsFor: () => learned },
    ZRamReader: { isInformCompiled: () => inform },
    GrammarProvider: { decodeD198: () => { decodes++; return grammar; } },
    ZRamProvider: { getMem: () => ({}) }
});
vm.runInContext(fs.readFileSync('js/Actionable.js', 'utf8'), c);
const A = c.Actionable;
A.payloadPool = () => [{ id: 97 }];
A.referenceFor = () => ({ noun: 'assignment' });
const confirmed = {
    classification: 'confirmed-zil-family', evidence: 'validated',
    templates: [
        { verb: 'read', objectCount: 1 }, { verb: 'wait', objectCount: 0 },
        { verb: 'écrire', objectCount: 1 }, { verb: '$ve', objectCount: 1 }
    ]
};
let n = 0;
function check(label, fn) { fn(); console.log('PASS ' + label); n++; }
function run(w, g, l = []) {
    words = w; grammar = g; learned = l; captured = [];
    const slices = [];
    A.addMoreActions(slices, { kind: 'inventory', objectId: 97 }, 1, 2);
    if (slices.length) slices[0].Action();
    return captured;
}
const dict = verb => ({ Command: verb, source: 'dictionary-verb' });
check('confirmed arity and punctuation admission', () => {
    const s = run(['read', 'wait', '$ve', '#rand', 'unknown', 'écrire'].map(dict), confirmed);
    assert.deepEqual(s.map(x => x.Command), ['read assignment', 'écrire assignment']);
});
check('unknown grammar leaves arity open but applies token admission', () => {
    assert.equal(run(['wait', '$ve'].map(dict), { classification: 'unknown' }).length, 1);
});
check('Inform admission skips decoder on repeated opens', () => {
    inform = true;
    const before = decodes;
    for (let i = 0; i < 3; i++) assert.equal(run(['wait', '.hold'].map(dict), null).length, 1);
    assert.equal(decodes, before);
    inform = false;
});
check('learned punctuation and no-object words preserved', () => {
    assert.equal(run(['$ve', 'wait'].map(dict), confirmed, ['$ve', 'wait']).length, 2);
});
check('trusted ram-synth retained', () => {
    assert.equal(run([{ Command: '$ve', source: 'ram-synth' }], confirmed).length, 1);
});
check('ordering dedup and Enter false preserved', () => {
    const s = run(['écrire', 'read', 'read'].map(dict), confirmed);
    assert.deepEqual(s.map(x => x.Command), ['écrire assignment', 'read assignment']);
    assert(s.every(x => x.Enter === false));
});
check('direction has no More', () => {
    const s = [];
    A.addMoreActions(s, { kind: 'direction' }, 0, 0);
    assert.equal(s.length, 0);
});
console.log(n + ' PASS / 0 FAIL');
