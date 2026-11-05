/* Z3 (grok, 2026-11-04): Sherlock TAKE capability from the game's own compact-syntax FIND byte.
 * GrammarProvider records variable-family FWIM1(+2)/FWIM2(+5) (Sherlock constants.zil:1168/1170) and
 * d214TakeAttribute admits the validated variable family. Positive/negative/mutation/control.
 * Tier: real story bytes + constructed payload projection (not native, not full UI frontier). */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const CUR = fs.readFileSync(path.join(root, 'js/GrammarProvider.js'), 'utf8');
const LINE14_NEW = "|| (decoded.family !== 'infocom-pre-v6-fixed' && decoded.family !== 'infocom-pre-v6-variable'))";
const LINE14_OLD = "|| decoded.family !== 'infocom-pre-v6-fixed')";
const FWIM_NEW = "action: variableAction, findAttributes: variableObjects ? [ZRamReader.u8(mem,pos+2), variableObjects > 1 ? ZRamReader.u8(mem,pos+5) : 0] : null });";
const FWIM_OLD = "action: variableAction });";
let checks = 0;
function ok(v, m) { checks++; if (!v) throw new Error('FAIL: ' + m); }
ok(CUR.indexOf(LINE14_NEW) >= 0 && CUR.indexOf(FWIM_NEW) >= 0, 'accepted 2 lines present in js/GrammarProvider.js');
const PRE = CUR.replace(LINE14_NEW, LINE14_OLD).replace(FWIM_NEW, FWIM_OLD);          // pre-Z3 reconstruction
const NO_FAMILY = CUR.replace(LINE14_NEW, LINE14_OLD);                                // M6: FWIM kept, family gate reverted
ok(PRE !== CUR && NO_FAMILY !== CUR, 'reconstructions differ from current');

function story(name) {
    const raw = fs.readFileSync(path.join(root, 'games', name));
    const m = raw.toString('utf8').match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
    return new Uint8Array(Buffer.from(m[1].replace(/\s+/g, ''), 'base64'));
}
function gp(src) {
    const sb = { console, window: {}, setTimeout: () => 0 };
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/ZRamReader.js'), 'utf8'), sb);
    vm.runInContext(src + ';this.GrammarProvider=GrammarProvider;', sb);
    return sb.GrammarProvider;
}
// Full composition context (ModuleStatFactsClaude/ZRamReader/GrammarProvider/AttributeSchema/ActionSynth/...), fresh buffer.
function world(bytesIn, gpSrc) {
    const bytes = new Uint8Array(bytesIn), mem = new DataView(bytes.buffer);
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    const payload = { inventory: [], discoveredObjects: [], playerId: 1 };
    const c = vm.createContext({ console, setTimeout, clearTimeout, window: {},
        ModuleLibrary: { currentExecutableDigest: () => digest, currentExecutableIdentity: () => ({ digest, header: Array.from(bytes.slice(0, 28)) }) },
        ZRamProvider: { getMem: () => mem }, WorldModel: { lastPayload: payload },
        Actionable: { payloadPool: () => payload.inventory.concat(payload.discoveredObjects), referenceFor: o => ({ unique: true, verified: true, noun: o.name }), commandNounFor: o => o.name, isGameWord: () => true } });
    for (const f of ['ModuleStatFactsClaude', 'ZRamReader', 'GrammarProvider', 'AttributeSchema', 'ActionSynth', 'LearnedWords', 'SemanticActions', 'ExitCalibrator']) {
        const src = f === 'GrammarProvider' ? gpSrc : fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8');
        try { vm.runInContext(src, c); } catch (e) { /* optional modules, as in audit-r43 */ }
    }
    const R = c.ZRamReader, A = c.AttributeSchema, S = c.ActionSynth, h = R.header(mem);
    const base = id => R.objectBase(h, id);
    return {
        mem, R, A, S, payload,
        setBit(id, b, v) { const a = base(id) + (b >> 3), m = 128 >> (b & 7); mem.setUint8(a, v ? mem.getUint8(a) | m : mem.getUint8(a) & ~m); },
        attrs(id) { return A.applyTo({}, R.objectLinks(mem, id), mem); },
        takeRadial(id) { const o = { id, name: R.shortName(mem, id), parentId: R.objectLinks(mem, id).parent, attrs: this.attrs(id) };
            payload.inventory = []; payload.discoveredObjects = [o];
            return S.commandsForPayloadObjectId(id, 'room').map(x => x.verb || x.command || String(x)).some(v => /^take\b/i.test(v)); }
    };
}
// Raw compact-syntax walk (independent of the decoder): every line with its byte position.
function walk(b) {
    const u16 = a => (b[a] << 8) | b[a + 1], baseS = u16(14), first = u16(baseS), n = (first - baseS) / 2, sizes = [2, 4, 7, 0], out = [];
    for (let v = 0; v < n; v++) { let pos = u16(baseS + v * 2); const cnt = b[pos++];
        for (let i = 0; i < cnt; i++) { const b0 = b[pos], objs = (b0 >> 6) & 3; out.push({ v, pos, objs, p1: b0 & 63, action: b[pos + 1], f1: objs ? b[pos + 2] : null }); pos += sizes[objs]; } }
    return out;
}

const SHER = story('Sherlock.z5.js');
const G = gp(CUR), Gpre = gp(PRE);
// --- P1/P2: decoder + capability ---
const dec = G.decodeD198(SHER);
ok(dec.classification === 'confirmed-zil-family' && dec.evidence === 'validated' && dec.family === 'infocom-pre-v6-variable', 'Sherlock validated variable family');
const bare = dec.templates.filter(t => t.verb === 'take' && t.objectCount === 1 && !t.prepositions.length);
ok(bare.length === 1 && bare[0].actionId === 'infocom-pre-v6:63' && JSON.stringify(bare[0].findAttributes) === '[39,0]', 'P2 bare TAKE action 63 FIND [39,0]: ' + JSON.stringify(bare));
ok(G.d214TakeAttribute(SHER) === 39, 'P1 d214TakeAttribute(Sherlock) === 39 (FL-TAKEABLE)');
ok(Gpre.d214TakeAttribute(new Uint8Array(SHER)) === null, 'pre-Z3 Sherlock d214 === null');
// Linkage/byte-boundary invariant: Sherlock templates identical to pre-Z3 except the new findAttributes field.
const strip = d => JSON.stringify((d.templates || []).map(t => Object.assign({}, t, { findAttributes: null })));
const decPre = Gpre.decodeD198(new Uint8Array(SHER));
ok(strip(dec) === strip(decPre) && JSON.stringify(dec.prepositionIds) === JSON.stringify(decPre.prepositionIds), 'Sherlock templates/preps identical apart from findAttributes');

// --- P3/N1/N2 attribute + composed radial ---
const W = world(SHER, CUR);
const POS = [150, 153, 166, 129, 164, 165, 122, 151, 142, 189, 206, 229, 252, 308];
const DOORS = [2, 4, 9, 35, 43, 70, 83, 99, 102, 104, 98];
const STATUES_TOMBS = [120, 130, 162, 216, 234, 268, 282, 288, 127, 138, 199, 225, 238, 246, 281, 283];
for (const id of POS) ok(W.attrs(id).takeable === true, 'P3 takeable ' + id + ' ' + W.R.shortName(W.mem, id));
for (const id of DOORS) ok(W.attrs(id).takeable === false, 'N1 door not takeable ' + id + ' ' + W.R.shortName(W.mem, id));
for (const id of STATUES_TOMBS) ok(W.attrs(id).takeable === false, 'N2 statue/tomb not takeable ' + id + ' ' + W.R.shortName(W.mem, id));
for (const id of [150, 206]) ok(W.takeRadial(id) === true, 'composed radial offers Take ' + id);
for (const id of DOORS.concat(STATUES_TOMBS)) ok(W.takeRadial(id) === false, 'N3 composed radial no Take ' + id);
// --- M4 live RAM bit ---
W.setBit(2, 39, 1); ok(W.attrs(2).takeable === true, 'M4 door 2 + bit39 -> takeable (live read)');
W.setBit(150, 39, 0); ok(W.attrs(150).takeable === false, 'M4 pound note - bit39 -> not takeable (live read)');

// --- grammar mutations on fresh buffers ---
const lines = walk(SHER);
// TAKE verb: has TAKE x TO y (V-PUSH-TO 139) AND a bare 1-object V-TAKE (63) line (syntax.zil:903/906)
const takeVerb = [...new Set(lines.map(l => l.v))].find(v => lines.some(l => l.v === v && l.objs === 2 && l.action === 139) && lines.some(l => l.v === v && l.objs === 1 && l.p1 === 0 && l.action === 63));
const takeLines = lines.filter(l => l.v === takeVerb);
const bareLine = takeLines.filter(l => l.objs === 1 && l.p1 === 0);
ok(bareLine.length === 1 && bareLine[0].action === 63 && bareLine[0].f1 === 39, 'raw walk: one bare TAKE line action 63 FWIM1 39');
const sameAction2 = takeLines.filter(l => l.objs === 2 && l.action === 63);
ok(sameAction2.length === 5, 'raw walk: 5 same-action 2-object TAKE witnesses (on/in/from/off/out), got ' + sameAction2.length);
function mut(fn) { const m = new Uint8Array(SHER); fn(m); return gp(CUR).d214TakeAttribute(m); }
ok(mut(m => { m[bareLine[0].pos + 2] = 0; }) === null, 'M1 FWIM1=0 -> d214 null');
ok(mut(m => { m[bareLine[0].pos + 2] = 48; }) === null, 'M2 FWIM1=48 -> d214 null (v5 range)');
ok(mut(m => { m[sameAction2[0].pos + 1] = 139; }) === 39, 'M3a retarget ONE witness -> guard still satisfied (39)');
ok(mut(m => { for (const l of sameAction2) m[l.pos + 1] = 139; }) === null, 'M3 retarget ALL same-action witnesses -> d214 null');
ok(mut(m => { m[bareLine[0].pos] = 0x80; }) === null, 'M5 bare TAKE byte0 -> 2 objects -> null (decode rejects or no bare line)');
ok(gp(NO_FAMILY).d214TakeAttribute(new Uint8Array(SHER)) === null, 'M6 family gate reverted -> null');
// M1 fallback disclosure: d214 null => AttributeSchema returns to its pre-Z3 PROFILE-derived takeable (not a suppression).
const Wm = world((() => { const m = new Uint8Array(SHER); m[bareLine[0].pos + 2] = 0; return m; })(), CUR), Wp = world(SHER, PRE);
for (const id of [2, 120, 150, 308]) ok(Wm.attrs(id).takeable === Wp.attrs(id).takeable, 'M1 fallback equals pre-Z3 takeable for ' + id);

// --- C1/C2: the other 25 titles ---
const CONTROL = { 'Zork1-TheGreatUndergroundEmpire.z3.js': 17, 'Zork2-TheWizardofFrobozz.z3.js': 17, 'Zork3-TheDungeonMaster.z3.js': 20, 'Enchanter.z3.js': 19, 'Sorcerer.z3.js': 23, 'Spellbreaker.z3.js': 24, 'Planetfall.z3.js': 25, 'Stationfall.z3.js': 23, 'Infidel.z3.js': 15, 'Wishbringer.z3.js': 17, 'Hitchhik.z5.js': 41, 'Starcross.z3.js': 16, 'TheLurkingHorror.z3.js': 24, 'TheWitness.z3.js': 22, 'Deadline.z3.js': 19, 'Ballyhoo.z3.js': 22, 'Moonmist.z3.js': 26, 'Cutthroats.z3.js': 7, 'Seastalker.z3.js': 23, 'Suspect.z3.js': 22, 'Suspended.z3.js': 18, 'HollywoodHijinx.z3.js': 17, 'LeatherGoddessesofPhobos.z3.js': 23, 'PlunderedHearts.z3.js': 23, 'Borderzo.z5.js': 42 };
for (const [t, bit] of Object.entries(CONTROL)) {
    const s = story(t), a = gp(CUR).decodeD198(new Uint8Array(s)), b = gp(PRE).decodeD198(new Uint8Array(s));
    ok(a.family === 'infocom-pre-v6-fixed', 'C ' + t + ' fixed family');
    ok(JSON.stringify(a.templates) === JSON.stringify(b.templates) && JSON.stringify(a.prepositionIds) === JSON.stringify(b.prepositionIds), 'C2 ' + t + ' decoded templates deep-equal pre-Z3');
    ok(gp(CUR).d214TakeAttribute(new Uint8Array(s)) === bit && gp(PRE).d214TakeAttribute(new Uint8Array(s)) === bit, 'C1 ' + t + ' d214 bit ' + bit);
}
console.log('d214-variable-take-find: ' + checks + ' checks PASS');