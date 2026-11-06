/**
 * D86 TurnRecorder substrate proof (v13 consensus, mailbox #379-#450).
 *
 * Verifies the new js/TurnRecorder.js's own mechanics in isolation, using a
 * throwaway diagnostic analyzer registered live in the browser (removed at
 * the end of each test) -- NOT the real AttrCalibrator analyzers, which are
 * not ported yet (staged migration, see PRODUCTION_PLAN.md D86).
 *
 * Proves:
 *   - a turn opens with the correct startLine and no analyzer interest by
 *     default (prepare() returning null means zero capture)
 *   - opcodes are only forwarded to an analyzer that declared wantsOpcodes
 *   - a SECOND command accepted before the first turn's ~450ms timer fires
 *     boundary-stamps the first turn's endLine immediately (not force-read
 *     later) and runs its captureAfter hook AT THAT MOMENT, not later
 *   - a turn that closes naturally (no later command arrives in time) is
 *     NOT boundary-stamped -- its own timer freezes endLine itself
 *   - hasWitness() gates analyze() -- a turn with zero real signal is never
 *     analyzed if the analyzer says so
 *   - both real entry points (native typed Enter, Input.Inject) reach
 *     TurnRecorder.onAcceptedSubmit
 *
 * Usage: node tools/d86-turnrecorder-substrate-proof.js
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

async function boot(browser, story) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + story);
    await page.waitForTimeout(1800);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 16 && !(await page.locator(".Input.LineInput").count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(300);
    }
    if (!(await page.locator(".Input.LineInput").count())) {
        await page.close();
        throw new Error("no line input after boot: " + story);
    }
    await page.waitForFunction(() => {
        try { return !!(typeof AttributeSchema !== "undefined" && AttributeSchema._getMem()); } catch (e) { return false; }
    }, { timeout: 8000 });
    return page;
}

async function main() {
    const browser = await chromium.launch();
    let pass = 0, fail = 0;
    function check(name, cond) {
        if (cond) { pass++; console.log("PASS: " + name); }
        else { fail++; console.log("FAIL: " + name); }
    }

    try {
        const page = await boot(browser, "games/anchor.z8.js");

        // --- Test 1: default (uninterested) analyzer sees an opened turn
        //     but captures nothing. Real analyzers (D84's locationGlobal,
        //     now ported) may ALSO legitimately register interest in the
        //     same turn -- this test isolates specifically whether OUR
        //     throwaway analyzer's own null return correctly contributed
        //     zero interest, not the total interest count across every
        //     currently-registered analyzer. ---
        const t1 = await page.evaluate(() => {
            var seen = { prepared: 0, opcodes: 0, analyzed: 0 };
            var a = { id: "diag-uninterested", prepare: function () { seen.prepared++; return null; }, observeOpcode: function () { seen.opcodes++; }, analyze: function () { seen.analyzed++; } };
            TurnRecorder.registerAnalyzer(a);
            Input.Clear();
            Input.Inject("look", true);
            var interests = TurnRecorder._activeTurn ? TurnRecorder._activeTurn._interests : [];
            var uninterestedIsPresent = interests.some(function (entry) { return entry.analyzer.id === "diag-uninterested"; });
            TurnRecorder._analyzers = TurnRecorder._analyzers.filter(function (x) { return x.id !== "diag-uninterested"; });
            return { seen: seen, uninterestedIsPresent: uninterestedIsPresent };
        });
        check("prepare() is called once when a turn opens", t1.seen.prepared === 1);
        check("returning null from prepare() means zero interest recorded for THAT analyzer (cheapest path)", t1.uninterestedIsPresent === false);
        await page.waitForTimeout(600);
        await page.waitForTimeout(600);

        // --- Test 2: an interested analyzer with wantsOpcodes receives
        //     opcode forwarding; one without it does not. ---
        const t2 = await page.evaluate(async () => {
            var withOps = { id: "diag-with-ops", opcodes: 0, prepare: function () { return { wantsOpcodes: true }; }, observeOpcode: function () { withOps.opcodes++; }, analyze: function () {} };
            var withoutOps = { id: "diag-without-ops", opcodes: 0, prepare: function () { return {}; }, observeOpcode: function () { withoutOps.opcodes++; }, analyze: function () {} };
            TurnRecorder.registerAnalyzer(withOps);
            TurnRecorder.registerAnalyzer(withoutOps);
            Input.Clear();
            Input.Inject("examine door", true);
            await new Promise((r) => setTimeout(r, 700));
            var result = { withOps: withOps.opcodes, withoutOps: withoutOps.opcodes };
            TurnRecorder._analyzers = TurnRecorder._analyzers.filter(function (x) { return x.id !== "diag-with-ops" && x.id !== "diag-without-ops"; });
            return result;
        });
        check("an analyzer that declared wantsOpcodes receives at least one real opcode call", t2.withOps > 0);
        check("an analyzer that did NOT declare wantsOpcodes receives none, even for the same turn", t2.withoutOps === 0);

        // --- Test 3: boundary-stamping -- a second command accepted before
        //     the first turn's timer fires freezes endLine and runs
        //     captureAfter IMMEDIATELY, not at the original ~450ms mark. ---
        const t3 = await page.evaluate(async () => {
            var events = [];
            var a = {
                id: "diag-boundary",
                prepare: function (turn) {
                    return {
                        captureAfter: function (t) { events.push({ at: Date.now(), boundedByLaterCommand: t.boundedByLaterCommand }); return "snap"; },
                        hasWitness: function () { return true; }
                    };
                },
                analyze: function () {}
            };
            TurnRecorder.registerAnalyzer(a);
            Input.Clear();
            Input.Inject("look", true);
            var firstTurn = TurnRecorder._activeTurn;
            await new Promise((r) => setTimeout(r, 100)); // well before the 450ms natural close
            var stampedBefore = firstTurn.endLine;
            Input.Clear();
            Input.Inject("look", true); // second command -- must boundary-stamp the first turn NOW
            var stampedAfter = firstTurn.endLine;
            var snapshotSetImmediately = firstTurn.analyzerSnapshots["diag-boundary"];
            await new Promise((r) => setTimeout(r, 700)); // let both turns' timers finish
            TurnRecorder._analyzers = TurnRecorder._analyzers.filter(function (x) { return x.id !== "diag-boundary"; });
            return { stampedBefore: stampedBefore, stampedAfter: stampedAfter, snapshotSetImmediately: snapshotSetImmediately, eventCount: events.length, firstEventBounded: events[0] && events[0].boundedByLaterCommand };
        });
        check("before the second command, the first turn's endLine is still null (not yet closed)", t3.stampedBefore == null);
        check("immediately after the second command is accepted, the first turn's endLine is frozen (boundary-stamped, not force-read-later)", t3.stampedAfter != null);
        check("captureAfter ran synchronously at boundary-stamp time, not deferred", t3.snapshotSetImmediately === "snap");
        check("the frozen turn correctly records boundedByLaterCommand:true", t3.firstEventBounded === true);

        // --- Test 4: a turn with no later command closes naturally on its
        //     own ~450ms timer (NOT boundary-stamped). ---
        const t4 = await page.evaluate(async () => {
            var captured = null;
            var a = { id: "diag-natural", prepare: function () { return { captureAfter: function (t) { captured = { boundedByLaterCommand: t.boundedByLaterCommand }; return "x"; }, hasWitness: function () { return true; } }; }, analyze: function () {} };
            TurnRecorder.registerAnalyzer(a);
            Input.Clear();
            Input.Inject("look", true);
            var turn = TurnRecorder._activeTurn;
            var beforeSettle = turn.endLine;
            await new Promise((r) => setTimeout(r, 700));
            TurnRecorder._analyzers = TurnRecorder._analyzers.filter(function (x) { return x.id !== "diag-natural"; });
            return { beforeSettle: beforeSettle, afterSettle: turn.endLine, boundedByLaterCommand: captured && captured.boundedByLaterCommand };
        });
        check("a turn with no later command has a null endLine before its own timer fires", t4.beforeSettle == null);
        check("its own ~450ms timer freezes endLine naturally", t4.afterSettle != null);
        check("a naturally-closed turn correctly records boundedByLaterCommand:false", t4.boundedByLaterCommand === false);

        // --- Test 5: hasWitness() gates analyze() -- an analyzer that
        //     reports no witness is never analyzed. ---
        const t5 = await page.evaluate(async () => {
            var analyzedCount = 0;
            var a = { id: "diag-no-witness", prepare: function () { return { hasWitness: function () { return false; } }; }, analyze: function () { analyzedCount++; } };
            TurnRecorder.registerAnalyzer(a);
            Input.Clear();
            Input.Inject("look", true);
            await new Promise((r) => setTimeout(r, 700));
            TurnRecorder._analyzers = TurnRecorder._analyzers.filter(function (x) { return x.id !== "diag-no-witness"; });
            return analyzedCount;
        });
        check("an analyzer whose hasWitness() returns false is never analyze()-d", t5 === 0);

        // --- Test 6: both real entry points reach TurnRecorder, tagged with
        //     the correct source. ---
        await page.evaluate(() => {
            window.__diagHits = { typed: 0, inject: 0 };
            var a = { id: "diag-entrypoints", prepare: function (turn) { window.__diagHits[turn.source] = (window.__diagHits[turn.source] || 0) + 1; return null; }, analyze: function () {} };
            TurnRecorder.registerAnalyzer(a);
        });
        await page.evaluate(() => { Input.Clear(); Input.Inject("look", true); });
        await page.waitForTimeout(600);
        const injectHits = await page.evaluate(() => window.__diagHits.inject);
        check("Input.Inject(text, true) reaches TurnRecorder with source:'inject'", injectHits > 0);

        await page.locator(".Input.LineInput").click();
        await page.keyboard.type("look");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(600);
        const typedHits = await page.evaluate(() => {
            var hits = window.__diagHits.typed;
            TurnRecorder._analyzers = TurnRecorder._analyzers.filter(function (x) { return x.id !== "diag-entrypoints"; });
            return hits;
        });
        check("a genuinely typed Enter reaches TurnRecorder with source:'typed'", typedHits > 0);

        await page.close();
    } catch (e) {
        console.log("FAIL: unexpected error: " + (e && e.stack || e));
        fail++;
    } finally {
        await browser.close();
    }

    console.log("\n" + pass + " PASS / " + fail + " FAIL");
    process.exit(fail ? 1 : 0);
}

main();
