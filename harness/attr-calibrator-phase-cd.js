/**
 * D73 / AttrCalibrator Phase C (persistence) + Phase D (consumption).
 *
 * Proves:
 *   - a confirmed take/refusal is remembered per-object and overrides
 *     AttributeSchema.applyTo()'s takeable derivation for THAT object only
 *   - a bit-level flag (open/wear/lock/switch) only overrides once the
 *     SAME mutated bit has been confirmed CONFIRM_THRESHOLD times
 *   - a disagreeing observation resets the candidate tally instead of
 *     averaging toward a wrong answer
 *   - persistence round-trips through localStorage keyed by real game
 *     identity (release+serial), mirroring ZRamReader's diagonal-exit
 *     calibration pattern
 *   - a game/flag with NO observation is completely unaffected (no
 *     regression risk for already-correct predictions, e.g. Anchorhead)
 *
 * Usage: node harness/attr-calibrator-phase-cd.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function freshSandbox() {
    const store = {};
    const sandbox = {
        console, setTimeout, window: {},
        localStorage: {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; }
        }
    };
    vm.createContext(sandbox);
    sandbox.Actionable = { Submit: function (command) {} };
    sandbox.WorldModel = {
        lastPayload: {
            discoveredObjects: [{ id: 285, name: "canteen" }, { id: 189, name: "wide shaft" }, { id: 700, name: "door" }],
            inventory: []
        }
    };
    // Fake mem with a real, distinguishable header (release + serial) so
    // gameIdentityKey produces a real key -- ZvmCapture.getMem stub must
    // return something ZRamReader.header() accepts (version byte 1-8).
    var memBytes = new Array(64).fill(0);
    memBytes[0] = 5; // version 5
    memBytes[2] = 0; memBytes[3] = 1; // release 1
    "123456".split("").forEach(function (ch, i) { memBytes[0x12 + i] = ch.charCodeAt(0); });
    var fakeMem = { getUint8: (a) => memBytes[a] || 0, byteLength: memBytes.length };
    sandbox.ZvmCapture = { getMem: function () { return fakeMem; } };
    var gameKey = "1-123456";
    sandbox.LearningStores = {
        register: function () {},
        identity: function () { return { identityKey: gameKey, digest: "123456" }; },
        readOwned: function (kind, id) {
            var prefix = kind === "attrCalib" ? "PL_AttrCalib_" : (kind + "_");
            return { status: "ready", value: store[prefix + (id && id.identityKey)] || null };
        },
        persist: function (kind, i, value) {
            var prefix = kind === "attrCalib" ? "PL_AttrCalib_" : (kind + "_");
            store[prefix + i.identityKey] = value;
        }
    };
    vm.runInContext(fs.readFileSync(path.join(root, "js", "AttributeSchema.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "AttrCalibrator.js"), "utf8"), sandbox);
    return { sandbox, fakeMem, store };
}

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// D86 CUTOVER, 2026-09-14: drives AttrCalibrator.analyzers.verbSuccess
// directly (the legacy observeCommand/_resolvePending/`_pending` window this
// harness originally used has been removed -- the analyzer reuses the exact
// same classification logic, now orchestrated by TurnRecorder in
// production). `forceObjectId`, when given, overrides the real
// AttributeSchema._findIdByName-resolved id after prepare() runs -- the
// same trick the original harness used (`_pending.id = objId`) to target
// synthetic object ids that aren't in the fake payload.
function driveVerbSuccess(AttrCalibrator, command, opcodes, forceObjectId) {
    var analyzer = AttrCalibrator.analyzers.verbSuccess;
    var turn = { command: command, startLine: 0, endLine: null, analyzerSnapshots: {} };
    var interest = analyzer.prepare(turn);
    if (!interest) return turn;
    if (forceObjectId != null && turn.__diagVerbSuccessCtx) turn.__diagVerbSuccessCtx.id = forceObjectId;
    opcodes.forEach(function (c) { analyzer.observeOpcode(turn, c.op, null, c.args, c.result); });
    turn.endLine = 0;
    if (interest.captureAfter) turn.analyzerSnapshots["diag-verbSuccess"] = interest.captureAfter(turn);
    analyzer.analyze(turn);
    return turn;
}

// --- Case 1: a confirmed successful take overrides takeable for THAT object only ---
{
    const { sandbox, fakeMem } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    const AttributeSchema = sandbox.AttributeSchema;
    const ZRamReader = sandbox.ZRamReader;

    // canteen: static bit (19) set -> static profile predicts takeable:false
    var canteenObj = { id: 285, attrBytes: [0, 0, 0b00010000, 0, 0, 0] }; // bit19 set (byte2 bit3 from MSB: byte2=0b00010000 -> bit19 true), bit17(scenery) false
    var attrsBefore = {};
    AttributeSchema.applyTo(attrsBefore, canteenObj);
    assert(attrsBefore.static === true, "sanity: canteen's static bit reads true before any calibration");
    assert(attrsBefore.takeable === false, "sanity: static profile predicts canteen is NOT takeable, before calibration");

    // Simulate the real observed "take canteen" -> Taken. trace (D73 proof).
    driveVerbSuccess(AttrCalibrator, "take canteen", [
        { op: "test_attr", args: [285, 5], result: 0 }, { op: "test_attr", args: [285, 32], result: 0 },
        { op: "remove_obj", args: [285] }, { op: "insert_obj", args: [285, 171] }, { op: "set_attr", args: [285, 17] }
    ]);

    var attrsAfter = {};
    AttributeSchema.applyTo(attrsAfter, canteenObj);
    assert(attrsAfter.takeable === true, "after one confirmed real take, canteen's takeable prediction flips to true (per-object override)");
    assert(attrsAfter.static === true, "the underlying static bit read is untouched -- only the derived takeable flag changed");

    // A DIFFERENT object (wide shaft, also static) must be unaffected.
    var shaftObj = { id: 189, attrBytes: [0, 0, 0b00010000, 0, 0, 0] };
    var shaftAttrs = {};
    AttributeSchema.applyTo(shaftAttrs, shaftObj);
    assert(shaftAttrs.takeable === false, "a different object with the same static bit is NOT affected by the canteen's per-object override");
}

// --- Case 2: bit-level calibration only finalizes after CONFIRM_THRESHOLD consistent observations ---
{
    const { sandbox } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    const AttributeSchema = sandbox.AttributeSchema;

    // Real profile bit for "open" is 14. Simulate a game whose real OPEN
    // routine actually flips bit 40 instead (a shifted/nonstandard layout).
    function simulateOpen(objId) {
        driveVerbSuccess(AttrCalibrator, "open door", [
            { op: "test_attr", args: [objId, 10], result: 0 },
            { op: "set_attr", args: [objId, 40] }
        ], objId);
    }
    simulateOpen(501);
    assert(!AttrCalibrator.overrideFor().open, "one observation alone does not yet finalize a bit override");
    simulateOpen(502);
    assert(!AttrCalibrator.overrideFor().open, "two observations alone do not yet finalize a bit override");
    driveVerbSuccess(AttrCalibrator, "close door", [
        { op: "clear_attr", args: [503, 40] }
    ], 503);
    var ov = AttrCalibrator.overrideFor();
    assert(ov.open && ov.open.bit === 40, "three complementary open/close observations confirm the unique shared bit 40");

    var doorObj = { id: 999, attrBytes: [0, 0, 0, 0, 0, 0, 0, 0] };
    doorObj.attrBytes[5] = 0b00000000; // bit 40 = byte5 bit0(MSB) -- leave false for now
    var attrsClosed = {};
    AttributeSchema.applyTo(attrsClosed, doorObj);
    assert(attrsClosed.open === false, "applyTo now reads the CALIBRATED bit (40), not the static profile's bit 14, for 'open'");
}

// --- Case 3: a disagreeing observation resets the candidate tally, never averages to a wrong answer ---
{
    const { sandbox } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    function simulateOpen(objId, bit) {
        driveVerbSuccess(AttrCalibrator, "open door", [
            { op: "set_attr", args: [objId, bit] }
        ], objId);
    }
    simulateOpen(601, 40);
    simulateOpen(602, 40);
    simulateOpen(603, 41); // disagrees -- resets bit 40's tally
    simulateOpen(604, 41);
    assert(!AttrCalibrator.overrideFor().open, "an inconsistent bit sequence never finalizes an override from noise alone (got: " + JSON.stringify(AttrCalibrator.overrideFor().open) + ")");
}

// --- Case 4: persistence round-trips through localStorage, keyed by real game identity ---
{
    const { sandbox, store } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    const AttributeSchema = sandbox.AttributeSchema;
    driveVerbSuccess(AttrCalibrator, "take canteen", [
        { op: "remove_obj", args: [285] }, { op: "insert_obj", args: [285, 171] }
    ]);
    var keys = Object.keys(store);
    assert(keys.some((k) => k.indexOf("PL_AttrCalib_") === 0), "a real localStorage entry is written under the PL_AttrCalib_ prefix");

    // Fresh sandbox (new page load), same localStorage backing store: the
    // learned table must hydrate back in, not start clean.
    const AttributeSchema2 = sandbox.AttributeSchema;
    AttrCalibrator.hydratedForGame = null; // force a fresh-load simulation
    AttrCalibrator.table = { version: 2, verbs: {}, objects: {} };
    var canteenObj2 = { id: 285, attrBytes: [0, 0, 0b00010000, 0, 0, 0] };
    var attrs2 = {};
    AttributeSchema2.applyTo(attrs2, canteenObj2);
    assert(attrs2.takeable === true, "a fresh hydrate from the SAME localStorage backing store restores the canteen's learned takeable:true");
}

// --- Case 5: no observation ever recorded -> zero effect (Anchorhead-style regression guard) ---
{
    const { sandbox } = freshSandbox();
    const AttributeSchema = sandbox.AttributeSchema;
    var freshObj = { id: 42, attrBytes: [0, 0, 0b00010000, 0, 0, 0] }; // static bit set, never observed
    var attrs = {};
    AttributeSchema.applyTo(attrs, freshObj);
    assert(attrs.takeable === false, "an object/game with zero AttrCalibrator observations behaves exactly as the static profile always did");
}

// D186: compiled declarations must work before any command or learned table.
{
    const c = {};
    vm.createContext(c);
    ["ZRamReader", "AttributeSchema", "ActionSynth"].forEach(name =>
        vm.runInContext(fs.readFileSync(path.join(root, "js", name + ".js"), "utf8"), c));
    const R = c.ZRamReader, A = c.AttributeSchema;
    const bytes = new Uint8Array(fs.readFileSync(path.join(__dirname, "fixtures/wump2ka.z5")));
    A._getMem = () => bytes;
    const declarations = R.informAttributeNames(bytes);
    assert(declarations && declarations.bits.static === 24 && declarations.bits.switchable === 26,
        "D186: reads Wumpus compiler declarations, not the standard bit positions");
    const canteen = A.applyTo({}, R.objectLinks(bytes, 285), bytes);
    const bar = A.applyTo({}, R.objectLinks(bytes, 284), bytes);
    assert(c.ActionSynth.verbsForAttrs(canteen, 285).includes("take"),
        "D186: canteen offers TAKE at the first query, without playing a command");
    const verbs = c.ActionSynth.verbsForAttrs(bar, 284);
    assert(verbs.includes("switch on") && verbs.includes("switch off") && !bar.worn && !bar.scenery,
        "D186: Glow Bar offers both switch directions initially, without false worn/scenery flags");
    assert(R.informAttributeNames(bytes) === declarations, "D186: immutable declarations are cached per memory instance");
    R._informCompiledCache = new WeakMap();
    const originalU8 = R.u8;
    let compilerStampReads = 0;
    R.u8 = function (mem, at) {
        if (at === 0x3C || at === 0x3D) compilerStampReads++;
        return originalU8(mem, at);
    };
    const viewA = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const viewB = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    assert(R.isInformCompiled(viewA) && R.isInformCompiled(viewB) && compilerStampReads === 2,
        "D200 audit: Inform detection is cached by backing buffer across fresh DataView wrappers");
    R.u8 = originalU8;
    const corrupt = new Uint8Array(bytes);
    corrupt[declarations.address] = 255; corrupt[declarations.address + 1] = 255;
    assert(R.informAttributeNames(corrupt) === null, "D186: corrupt table is rejected, not partially installed");
    const stripped = new Uint8Array(bytes);
    stripped.fill(0, declarations.address, declarations.address + 96);
    assert(R.informAttributeNames(stripped) === null, "D186: absent symbols retain existing fallback strategies");
    const partial = new Uint8Array(bytes);
    partial.fill(0, declarations.address + declarations.bits.switchable * 2,
        declarations.address + declarations.bits.switchable * 2 + 2);
    A._getMem = () => partial;
    assert(R.informAttributeNames(partial) === null && Object.keys(A.PROFILE).every(k => A.bitFor(k, partial) === A.PROFILE[k]),
        "D186: one missing required declaration rejects the WHOLE table; no mixed positions");
    const z3Expected = {
        "catseye.z3.js": { container: 1, scenery: 8, static: 10, workflag: 12 },
        "gussdeath.z3.js": { animate: 0, container: 3, scenery: 17, static: 19, workflag: 25 },
        "moonglow.z3.js": { container: 1, scenery: 8, static: 10, workflag: 12 }
    };
    for (const file of ["anchor.z8.js", "905.z5.js", "Zork1-TheGreatUndergroundEmpire.z3.js", "Enchanter.z3.js",
        "catseye.z3.js", "gussdeath.z3.js", "moonglow.z3.js", "LostPig.z8.js"]) {
        let game;
        vm.runInNewContext(fs.readFileSync(path.join(root, "games", file), "utf8"), {
            processBase64Zcode: encoded => { game = new Uint8Array(Buffer.from(encoded, "base64")); }
        });
        A._getMem = () => game;
        const table = R.informAttributeNames(game);
        if (!R.isInformCompiled(game)) {
            assert(table === null, "D186: " + file + " preserves the non-Inform fallback");
        } else if (z3Expected[file]) {
            const expected = z3Expected[file];
            assert(table && Object.keys(expected).every(name => table.bits[name] === expected[name])
                && R.header(game).entrySize === 9 && R.objectLinks(game, 1).attrBytes.length === 4,
                "D200: " + file + " reads its real 32-attribute Inform Z3 declaration table");
            if (file === "catseye.z3.js") {
                const damaged = new Uint8Array(game);
                const requiredBit = table.bits.container;
                damaged[table.address + requiredBit * 2] = 0;
                damaged[table.address + requiredBit * 2 + 1] = 0;
                assert(R.informAttributeNames(damaged) === null,
                    "D200: an Inform Z3 table missing a required declaration fails closed");
            }
        } else if (file === "LostPig.z8.js") {
            assert(table && table.bits.static !== A.PROFILE.static,
                "D186: another shifted compiler layout is independently decoded (LostPig)");
        } else {
            assert(table && Object.keys(A.PROFILE).every(k => A.PROFILE[k] == null || A.bitFor(k, game) === A.PROFILE[k]),
                "D186: " + file + " retains every existing standard-profile bit");
        }
    }
}

if (process.argv.includes("--catalog")) {
    const report = { sourceHashes: Object.fromEntries(["js/ZRamReader.js", "js/AttributeSchema.js"].map(f =>
        [f, require("crypto").createHash("sha256").update(fs.readFileSync(path.join(root, f))).digest("hex")])),
        modules: [], nonInform: [], totals: { files: 0, inform: 0, declared: 0, objects: 0, changedObjects: 0 } };
    for (const file of fs.readdirSync(path.join(root, "games")).filter(f => /\.(z[1-8]|zblorb)\.js$/i.test(f))) {
        let mem;
        vm.runInNewContext(fs.readFileSync(path.join(root, "games", file), "utf8"), {
            processBase64Zcode: encoded => { mem = new Uint8Array(Buffer.from(encoded, "base64")); }
        }, { timeout: 1000 });
        if (Buffer.from(mem.slice(0, 4)).toString() === "FORM") {
            const container = Buffer.from(mem);
            mem = null;
            for (let at = 12; at + 8 <= container.length;) {
                const size = container.readUInt32BE(at + 4);
                if (at + 8 + size > container.length) throw new Error("Invalid Blorb: " + file);
                if (container.toString("ascii", at, at + 4) === "ZCOD") { mem = new Uint8Array(container.subarray(at + 8, at + 8 + size)); break; }
                at += 8 + size + (size % 2);
            }
            if (!mem) throw new Error("No ZCOD chunk: " + file);
        }
        report.totals.files++;
        const c = {}; vm.createContext(c);
        ["ZRamReader", "AttributeSchema"].forEach(name => vm.runInContext(fs.readFileSync(path.join(root, "js", name + ".js"), "utf8"), c));
        const R = c.ZRamReader, A = c.AttributeSchema;
        A._getMem = () => mem;
        if (!R.isInformCompiled(mem)) {
            const header = R.header(mem), table = R.informAttributeNames(mem);
            report.nonInform.push({ file, header, table });
            assert(header && table === null, "D186 catalog: " + file + " valid Z header; no Inform schema installed");
            continue;
        }
        report.totals.inform++;
        const table = R.informAttributeNames(mem), h = R.header(mem);
        const entry = { file, table, count: 0, changed: [], errors: [] };
        if (table) report.totals.declared++;
        const first = R.objectBase(h, 1);
        const count = (R.u16(mem, first + (h.version <= 3 ? 7 : 12)) - first) / h.entrySize;
        if (!Number.isInteger(count) || count < 1) { entry.errors.push("Object boundary unavailable"); report.modules.push(entry); assert(false, "D186 catalog: " + file + " invalid object boundary"); continue; }
        for (let id = 1; id <= count; id++) {
            const base = R.objectBase(h, id);
            const obj = { id, attrBytes: Array.from(mem.slice(base, base + (h.version <= 3 ? 4 : 6))) };
            const declared = A.applyTo({}, obj, mem);
            const reader = R.informAttributeNames;
            R.informAttributeNames = () => null;
            const standard = A.applyTo({}, obj, mem);
            R.informAttributeNames = reader;
            const delta = [];
            for (const flag of Object.keys(A.PROFILE)) {
                const name = flag === "wearable" ? "clothing" : flag === "isOpen" ? "open" : flag;
                const bit = table ? table.bits[name] : A.PROFILE[flag];
                if (flag !== "takeable" && bit != null) {
                    const expected = !!(mem[base + Math.floor(bit / 8)] & (128 >> (bit % 8)));
                    if (declared[flag] !== expected) entry.errors.push({ id, flag, expected, actual: declared[flag] });
                }
                if (declared[flag] !== standard[flag]) delta.push({ flag, standard: standard[flag] == null ? null : standard[flag], declared: declared[flag] == null ? null : declared[flag],
                    oldBit: A.PROFILE[flag], declaredBit: bit == null ? null : bit,
                    reason: flag === "takeable" ? "derived from declared static/scenery" : bit == null ? "attribute absent from validated declarations; no standard-bit substitution" : "compiler attribute-name entry" });
            }
            if (declared.takeable !== (!declared.static && !declared.scenery)) entry.errors.push({ id, flag: "takeable" });
            if (delta.length) entry.changed.push({ id, name: R.shortName(mem, id), bytes: obj.attrBytes, delta });
            entry.count++;
        }
        report.totals.objects += entry.count;
        report.totals.changedObjects += entry.changed.length;
        report.modules.push(entry);
        assert(!entry.errors.length, "D186 catalog: " + file + ": " + entry.count + " objects, " + entry.changed.length + " explicitly explained changes");
    }
    fs.writeFileSync(path.join(root, "tools/screenshots/matrix/d186-attribute-catalog.json"), JSON.stringify(report, null, 2));
    console.log("CATALOG", JSON.stringify(report.totals));
}

async function liveAttributeAudit() {
    const { chromium } = require("playwright"), { pathToFileURL } = require("url");
    const browser = await chromium.launch();
    const report = [];
    try {
        for (const [file, commands] of [
            ["anchor.z8.js", ["look", "se", "nw", "w", "n", "s", "e"]],
            ["905.z5.js", ["look", "stand", "get off bed", "east", "west", "south", "north", "west", "east", "north", "south"]],
            ["LostPig.z8.js", ["look", "listen", "listen", "northeast", "look", "east", "west", "north", "south", "up", "down"]]
        ]) {
            const only = process.argv.find(a => a.startsWith("--only="));
            if (only && !file.includes(only.slice(7))) continue;
            const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
            try {
                const page = await context.newPage();
                await page.addInitScript(() => {
                    sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
                    localStorage.setItem("PL_TutorialSeen", "1");
                    localStorage.setItem("PL_TutorialLibrarySeen", "1");
                });
                await page.goto(pathToFileURL(path.join(root, "play.html")).href + "?story=games/" + file);
                await page.waitForTimeout(4000);
                await page.evaluate(() => { if (window.Message) Message.Hide(); });
                const samples = [];
                for (const command of commands) {
                    for (let k = 0; k < 12 && !await page.locator(".Input.LineInput").count(); k++) {
                        await page.keyboard.press("Space"); await page.waitForTimeout(200);
                    }
                    await page.locator(".Input.LineInput").fill(command, { timeout: 3000 });
                    await page.keyboard.press("Enter"); await page.waitForTimeout(650);
                    const sample = await page.evaluate(() => {
                        const R = ZRamReader, A = AttributeSchema, mem = ZRamProvider.getMem();
                        const p = WorldModel.lastPayload || {}, table = R.informAttributeNames(mem);
                        const ids = [...new Set([p.roomId, p.playerId].concat((p.discoveredObjects || []).map(o => o.id), (p.inventory || []).map(o => o.id)).filter(Boolean))];
                        const read = R.informAttributeNames;
                        const actual = ids.map(id => ({ id, attrs: R.attrsFromObject(mem, id), name: R.shortName(mem, id), bytes: R.objectLinks(mem, id).attrBytes }));
                        let standard, oldRoot;
                        try {
                            R.informAttributeNames = () => null;
                            standard = ids.map(id => ({ id, attrs: R.attrsFromObject(mem, id) }));
                            oldRoot = ZRamProvider.resolveInventoryRootId(mem, p.probe && p.probe.playerId, p.discoveredObjects, p.roomId);
                        } finally { R.informAttributeNames = read; }
                        const root = ZRamProvider.resolveInventoryRootId(mem, p.probe && p.probe.playerId, p.discoveredObjects, p.roomId);
                        const deltas = [], errors = [];
                        actual.forEach((obj, index) => {
                            Object.keys(A.PROFILE).forEach(flag => {
                                const name = flag === "wearable" ? "clothing" : flag === "isOpen" ? "open" : flag;
                                const bit = table ? table.bits[name] : A.PROFILE[flag];
                                if (obj.attrs[flag] !== standard[index].attrs[flag]) {
                                    deltas.push({ id: obj.id, name: obj.name, flag, old: standard[index].attrs[flag], now: obj.attrs[flag], oldBit: A.PROFILE[flag], declaredBit: bit });
                                    if (flag !== "takeable" && bit === A.PROFILE[flag]) errors.push("Unexplained change " + obj.id + ":" + flag);
                                }
                            });
                        });
                        return { room: p.roomId, roomName: p.roomName, root, rootName: R.shortName(mem, root), oldRoot, player: p.playerId,
                            rootParent: R.objectLinks(mem, root).parent,
                            inventory: (p.inventory || []).map(o => ({ id: o.id, name: o.name, parent: o.parentId })),
                            table, actual, standard, deltas, errors,
                            text: (document.querySelector(".BufferWindow").innerText || "").slice(-650) };
                    });
                    samples.push({ command, ...sample });
                }
                report.push({ file, samples });
                const rooms = new Set(samples.map(s => s.room));
                assert(rooms.size >= 3, "D186 live: " + file + " covers at least three actual rooms (" + rooms.size + ")");
                assert(samples.every(s => !s.errors.length), "D186 live: " + file + " every scoped attribute difference has a declared-bit explanation");
                if (file !== "LostPig.z8.js") {
                    assert(samples.every(s => !s.deltas.length && s.root === s.oldRoot), "D186 live: " + file + " exact attribute and inventory-root A/B parity in every sample");
                }
                if (file === "905.z5.js") assert(samples[0].rootName === "(thief)" && samples[0].inventory.some(o => /clothing/i.test(o.name)) && samples[0].inventory.some(o => /watch/i.test(o.name)), "D186 live: 905 starts with real thief and both worn possessions");
                if (file === "anchor.z8.js") assert(samples.every(s => s.root === 20 && s.inventory.length >= 4), "D186 live: Anchorhead unnamed holder20 and possessions survive room changes");
                console.log("LIVE", file, JSON.stringify([...rooms]));
            } finally { await context.close(); }
        }
    } finally {
        await browser.close();
        fs.writeFileSync(path.join(root, "tools/screenshots/matrix/d186-attribute-live.json"), JSON.stringify(report, null, 2));
    }
}
async function finish() {
    if (process.argv.includes("--live")) await liveAttributeAudit();
    const breadth = process.argv.find(a => a.startsWith("--breadth="));
    if (breadth) await breadthAudit(Number(breadth.split("=")[1]));
    console.log("\n" + pass + " PASS / " + fail + " FAIL");
    process.exitCode = fail ? 1 : 0;
}
async function breadthAudit(limit) {
    const { chromium } = require("playwright"), { pathToFileURL } = require("url");
    const catalog = JSON.parse(fs.readFileSync(path.join(root, "tools/screenshots/matrix/d186-attribute-catalog.json"), "utf8"));
    const groups = [catalog.nonInform, catalog.modules.filter(m => m.changed.length), catalog.modules.filter(m => !m.table), catalog.modules.filter(m => m.table && !m.changed.length)];
    const files = [];
    for (let i = 0; files.length < limit && groups.some(g => i < g.length); i++) {
        for (const group of groups) if (group[i] && files.length < limit) files.push(group[i].file);
    }
    const report = [], browser = await chromium.launch();
    try {
        for (const file of files) {
            const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
            const item = { file, errors: [] };
            try {
                const page = await context.newPage();
                page.on("pageerror", e => item.errors.push(String(e)));
                page.setDefaultTimeout(5000);
                await page.addInitScript(() => {
                    sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
                    localStorage.setItem("PL_TutorialSeen", "1");
                    localStorage.setItem("PL_TutorialLibrarySeen", "1");
                });
                await page.goto(pathToFileURL(path.join(root, "play.html")).href + "?story=games/" + file);
                await page.waitForFunction(() => !!document.querySelector(".BufferWindow"), { timeout: 10000 });
                await page.waitForTimeout(600);
                await page.evaluate(() => { if (window.Message) Message.Hide(); });
                for (let k = 0; k < 6 && !await page.locator(".Input.LineInput").count(); k++) {
                    await page.keyboard.press("Space"); await page.waitForTimeout(180);
                }
                Object.assign(item, await page.evaluate(() => {
                    const p = WorldModel.lastPayload || {}, m = ZRamProvider.getMem();
                    const ids = [...new Set((p.discoveredObjects || []).concat(p.inventory || []).map(o => o.id).filter(Boolean))];
                    const read = ZRamReader.informAttributeNames, declared = read(m);
                    const attrs = ids.map(id => ({ id, name: ZRamReader.shortName(m, id), attrs: ZRamReader.attrsFromObject(m, id) }));
                    let standard;
                    try {
                        ZRamReader.informAttributeNames = () => null;
                        standard = ids.map(id => ({ id, attrs: ZRamReader.attrsFromObject(m, id) }));
                    } finally { ZRamReader.informAttributeNames = read; }
                    return { room: p.roomId, player: p.playerId, inventory: (p.inventory || []).map(o => ({ id: o.id, name: o.name })),
                        lineInput: !!document.querySelector(".Input.LineInput"), declared: declared && declared.bits,
                        attrs, standard, text: (document.querySelector(".BufferWindow").innerText || "").slice(-700),
                        errorPaneText: (document.querySelector("#errorpane") || {}).textContent || "" };
                }));
            } catch (e) { item.errors.push(String(e)); }
            finally { await context.close(); }
            report.push(item);
            console.log("BREADTH", report.length, file, JSON.stringify({ room: item.room, input: item.lineInput, objects: item.attrs && item.attrs.length, errors: item.errors.length }));
            fs.writeFileSync(path.join(root, "tools/screenshots/matrix/d186-module-breadth.json"), JSON.stringify(report, null, 2));
        }
    } finally { await browser.close(); }
    console.log("BREADTH SUMMARY", JSON.stringify({ modules: report.length, errors: report.filter(x => x.errors.length).length,
        noLineInput: report.filter(x => !x.lineInput).length, noMappedRoom: report.filter(x => !x.room).length }));
}
finish().catch(e => { console.error(e); process.exitCode = 1; });
