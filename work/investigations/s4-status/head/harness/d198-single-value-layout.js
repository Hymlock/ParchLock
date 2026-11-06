/* D198 single-value (8-byte v5) dictionary layout: Sherlock admission, mutation
 * controls (a)-(h), and HEAD-identity of every other title. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
function context(gpSource) {
    const sb = { console, window: {}, setTimeout: () => 0, ZRamReader: undefined, GrammarProvider: undefined, WorldModel: undefined, ZRamProvider: undefined };
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/ZRamReader.js'), 'utf8'), sb, { filename: 'js/ZRamReader.js' });
    vm.runInContext(gpSource, sb, { filename: 'GrammarProvider.js' });
    return sb.GrammarProvider;
}
const GP = context(fs.readFileSync(path.join(root, 'js/GrammarProvider.js'), 'utf8'));
const OLD = context(execSync('git show HEAD:js/GrammarProvider.js', { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 }));

function story(name) {
    const raw = fs.readFileSync(path.join(root, 'games', name));
    if (!name.endsWith('.js')) return new Uint8Array(raw);
    const match = raw.toString('utf8').match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
    if (!match) return null;
    const bytes = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
    if (bytes[0] >= 1 && bytes[0] <= 8) return new Uint8Array(bytes);
    return null; // Glulx / blorb: not a D198 subject
}
let checks = 0;
function ok(v, m) { checks++; if (!v) throw new Error('FAIL: ' + m); }

// --- Sherlock admitted ---
const sher = story('Sherlock.z5.js');
const r = GP.decodeD198(sher);
ok(r.classification === 'confirmed-zil-family' && r.evidence === 'validated', 'Sherlock validated: ' + r.reason);
ok(r.dictionaryLayout === 'single-value', 'Sherlock dictionaryLayout single-value');
ok(r.decoderVersion === 'd198-infocom-pre-v6-v2', 'decoder version bumped');
const has = (verb, prep, action) => r.templates.some(t => t.verb === verb && t.objectCount === 2 && t.prepositions[0] === prep && t.actionId === 'infocom-pre-v6:' + action);
ok(has('take', 'from', 63), 'TAKE x FROM y = 63');
ok(has('unlock', 'with', 218), 'UNLOCK x WITH y = 218');
ok(has('put', 'in', 46), 'PUT x IN y = 46');
const ids = r.prepositionIds;
ok(ids.length === 23, '23 preposition IDs, got ' + ids.length);
ok(ids.some(p => p.id === 249 && p.aliases.indexOf('into') >= 0), 'into is an alias of ID 249 (canonical ' + (ids.find(p => p.id === 249) || {}).canonical + ')');
const dirs = GP.d214DirectionProperties(sher);
const props = dirs.map(d => d.prop).sort((a, b) => a - b);
ok(JSON.stringify(props) === JSON.stringify([52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]), 'd214 props 52-63: ' + props);
const lab = {}; dirs.forEach(d => lab[d.prop] = d.label);
ok(lab[63] === 'north' && lab[55] === 'up' && lab[53] === 'in' && lab[52] === 'out', 'd214 labels ' + JSON.stringify(lab));

// --- mutations ---
const dict = GP._d198RawDictionary(sher, { dict: (sher[8] << 8) | sher[9], version: 5 }, sher.length);
const word = w => dict.byWord[w].addr;
const PREP = 21204;
ok(((sher[PREP] << 8) | sher[PREP + 1]) === 65, 'PREPOSITIONS count 65 at 21204');
function mutate(fn) { const m = new Uint8Array(sher); fn(m); return GP.decodeD198(m); }
const rejectedDict = (res, tag) => ok(res.reason === 'invalid-dictionary' && res.evidence === 'rejected', tag + ' -> invalid-dictionary (got ' + res.reason + ')');
const rejected = (res, tag) => ok(res.classification !== 'confirmed-zil-family' && res.evidence === 'rejected', tag + ' rejected (got ' + res.reason + ')');
rejectedDict(mutate(m => { m[word('take') + 6] = 0x43; }), '(a) verb with low bits 3');
rejectedDict(mutate(m => { m[word('north') + 6] = 0x31; }), '(b) direction with low bits 1');
rejectedDict(mutate(m => { m[dict.first - 3] = 7; }), '(c) entryLen 7');
rejectedDict(mutate(m => { m[0] = 4; }), '(d) entryLen 8 under a v4 header');
// (e) a duplicate prep ID record pointed at a non-0x08 word
const recs = []; for (let i = 0; i < 65; i++) { const a = PREP + 2 + i * 3; recs.push({ at: a, addr: (sher[a] << 8) | sher[a + 1], id: sher[a + 2] }); }
const dupIdx = recs.findIndex((x, i) => recs.findIndex(y => y.id === x.id) !== i);
ok(dupIdx > 0, 'a duplicated preposition ID exists');
rejected(mutate(m => { const L = word('lamp'); m[recs[dupIdx].at] = L >> 8; m[recs[dupIdx].at + 1] = L & 255; }), '(e) duplicate prep ID on non-0x08 word');
rejectedDict(mutate(m => { m[word('take') + 6] = 0x51; }), '(f) word with 0x40|0x10');
rejectedDict(mutate(m => { m[word('lamp') + 6] = 0x81; }), '(g) 0x80-only word with low bits 1');
// (h) a word whose second record carries a different ID
const rep = recs.findIndex((x, i) => recs.findIndex(y => y.addr === x.addr) !== i);
ok(rep > 0, 'a repeated preposition word exists');
const otherId = recs.find(x => x.id !== recs[rep].id).id;
rejected(mutate(m => { m[recs[rep].at + 2] = otherId; }), '(h) one prep word with two IDs');
rejectedDict(mutate(m => { m[word('lamp') + 7] = 5; }), 'P1=none word with a nonzero value byte');
ok(GP.decodeD198(new Uint8Array(sher)).evidence === 'validated', 'unmutated copy still validates');

// --- every other Z-machine title identical to HEAD except decoderVersion ---
const norm = o => JSON.stringify(o).split('d198-infocom-pre-v6-v2').join('X').split('d198-infocom-pre-v6-v1').join('X');
let compared = 0, zil9 = 0;
for (const f of fs.readdirSync(path.join(root, 'games')).sort()) {
    if (f === 'Sherlock.z5.js') continue;
    let m; try { m = story(f); } catch (e) { continue; }
    if (!m) continue;
    const a = OLD.decodeD198(new Uint8Array(m)), b = GP.decodeD198(new Uint8Array(m));
    ok(norm(a) === norm(b), f + ' decodeD198 identical to HEAD');
    ok(JSON.stringify(OLD.d214DirectionProperties(new Uint8Array(m))) === JSON.stringify(GP.d214DirectionProperties(new Uint8Array(m))), f + ' d214 identical to HEAD');
    ok(b.dictionaryLayout === undefined, f + ' carries no single-value layout');
    if (b.classification === 'confirmed-zil-family') zil9++;
    compared++;
}
ok(compared > 100, 'compared ' + compared);
console.log('PASS d198-single-value-layout: ' + checks + ' checks; ' + compared + ' Z titles identical to HEAD (' + zil9 + ' ZIL)');
