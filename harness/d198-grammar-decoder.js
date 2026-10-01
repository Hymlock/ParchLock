/* D198 Gate D: bounded, title-blind pre-V6 Infocom grammar decoder. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sandbox = {
    console,
    window: {},
    setTimeout: () => 0,
    ZRamReader: undefined,
    GrammarProvider: undefined,
    WorldModel: undefined,
    ZRamProvider: undefined
};
vm.createContext(sandbox);
for (const file of ['js/ZRamReader.js', 'js/GrammarProvider.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}

function story(name) {
    const raw = fs.readFileSync(path.join(root, 'games', name));
    if (!name.endsWith('.js')) return new Uint8Array(raw);
    const match = raw.toString('utf8').match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
    if (!match) throw new Error('No story wrapper in ' + name);
    const bytes = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
    if (bytes[0] >= 1 && bytes[0] <= 8) return new Uint8Array(bytes);
    const marker = bytes.indexOf(Buffer.from('ZCOD'));
    if (marker < 0) throw new Error('No ZCOD chunk in ' + name);
    const length = bytes.readUInt32BE(marker + 4);
    return new Uint8Array(bytes.subarray(marker + 8, marker + 8 + length));
}

let checks = 0;
function ok(value, message) {
    checks++;
    if (!value) throw new Error('FAIL: ' + message);
}

const GP = sandbox.GrammarProvider;
const controls = [
    ['Advent.z5.js', 'confirmed-inform'],
    ['curses.z5.js', 'confirmed-inform'],
    ['dejavu.z3.js', 'confirmed-inform']
];
for (const [file, expected] of controls) {
    const result = GP.decodeD198(story(file));
    ok(result.classification === expected, file + ' remains an Inform control');
    ok(result.activation === 'off', file + ' decoder activation is off');
    ok(result.vocabulary.length === 0 && result.templates.length === 0, file + ' emits no D198 facts');
}

const infocom = [
    'Zork1-TheGreatUndergroundEmpire.z3.js',
    'Deadline.z3.js',
    'Enchanter.z3.js',
    'Wishbringer.z3.js',
    'Hitchhik.z5.js',
    'Borderzo.z5.js'
];
for (const file of infocom) {
    const mem = story(file);
    const result = GP.decodeD198(mem);
    ok(result.classification === 'confirmed-zil-family', file + ' validates the Infocom family (' + result.reason + ')');
    ok(result.activation === 'off', file + ' remains inactive');
    ok(result.vocabulary.includes('take') && result.vocabulary.includes('look'), file + ' exposes exact dictionary verbs');
    ok(result.prepositions.length > 0, file + ' exposes bounded prepositions');
    ok(result.templates.length > result.vocabulary.length, file + ' exposes syntax templates');
    ok(result.templates.every(t => /^infocom-pre-v6:\d+$/.test(t.actionId)), file + ' keeps action IDs opaque');
    ok(result.staticRange.start > 0 && result.staticRange.end > result.staticRange.start, file + ' reports immutable decoded range');

    const originalWord = result.vocabulary[0];
    result.vocabulary[0] = 'mutated';
    result.templates[0].verb = 'mutated';
    const again = GP.decodeD198(mem);
    ok(again.vocabulary[0] === originalWord && again.templates[0].verb !== 'mutated', file + ' cached result is immutable to callers');
}

const malformed = story('Zork1-TheGreatUndergroundEmpire.z3.js').slice();
const staticBase = (malformed[14] << 8) | malformed[15];
malformed[staticBase] = 0;
malformed[staticBase + 1] = 1;
const rejected = GP.decodeD198(malformed);
ok(rejected.classification === 'unknown' && rejected.evidence === 'rejected', 'malformed root fails closed');
ok(rejected.vocabulary.length === 0 && rejected.templates.length === 0, 'rejected family emits no facts');

const zork = story('Zork1-TheGreatUndergroundEmpire.z3.js');
sandbox.ZRamProvider = { getMem: () => zork };
GP.D198GrammarValve._testOverride = 'off';
const baselineCollect = GP.collect();
ok(baselineCollect.specialCommands.length === 0, 'explicit-off decoder does not alter existing Infocom collect output');
ok(!sandbox.window.__PL_GRAMMAR_VERBS__ || sandbox.window.__PL_GRAMMAR_VERBS__.length === 0, 'explicit-off decoder does not publish grammar verbs');
ok(!Object.prototype.hasOwnProperty.call(GP, '_d198ShadowSnapshot'), 'Gate D does not create the Phase 2 shadow side channel');

const source = fs.readFileSync(path.join(root, 'js/GrammarProvider.js'), 'utf8');
ok(!/Zork1|Deadline|Enchanter|Wishbringer|Hitchhik|Borderzo|dejavu/i.test(source), 'runtime classifier contains no title or filename exceptions');
ok(!/Actionable\.|Qol\.|Autocomplete\.|MapTopology\./.test(source.split('    readVerbWords:')[0]), 'pure decoder has no consumer calls');
ok(/_d198Cacheable:\s*dict\.first\s*>=\s*h\.staticMem/.test(source), 'full-result cache requires the consumed dictionary to be static');

if (process.argv.includes('--catalog')) {
    const catalog = { 'confirmed-inform': [], 'confirmed-zil-family': [], unknown: [], skipped: [] };
    for (const file of fs.readdirSync(path.join(root, 'games')).filter(name => name.endsWith('.js'))) {
        try {
            const mem = story(file);
            const result = GP.decodeD198(mem);
            (catalog[result.classification] || catalog.unknown).push(file);
        } catch (error) {
            catalog.skipped.push(file);
        }
    }
    console.log(JSON.stringify(catalog));
}

console.log('PASS D198 grammar decoder: ' + checks + ' checks across Inform controls, six Infocom builds, malformed bounds, cache and valve-off parity');
