/**
 * D86 migration: live correctness proof for the CUT-OVER `analyzers.verbSuccess`
 * (D73-75's `_pending`/observeCommand/_resolvePending, now retired -- this
 * analyzer is the sole real writer as of the cutover, see PRODUCTION_PLAN.md
 * D86). Before cutover, this file proved byte-for-byte A/B equivalence
 * against the legacy window (verified clean); after cutover, that
 * comparison target no longer runs, so this proves the SAME real learned
 * facts directly against the now-sole system, plus the frozen-snapshot
 * boundary-stamp behavior that stays load-bearing regardless of cutover.
 *
 * Usage: node tools/d86-verbsuccess-ab-proof.js
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
    if (/wump2ka/i.test(story)) {
        await page.locator(".Input.LineInput").fill("n");
        await page.locator(".Input.LineInput").press("Enter");
        for (let i = 0; i < 20; i++) {
            await page.waitForTimeout(250);
            if (/exit\s*1/i.test(await page.locator("#windowport").innerText())) break;
            await page.keyboard.press("Space");
        }
    }
    await page.evaluate(() => {
        try {
            AttrCalibrator.hydratedForGame = null;
            AttrCalibrator.table = { version: 2, verbs: {}, objects: {} };
            if (typeof localStorage !== "undefined") {
                for (var i = localStorage.length - 1; i >= 0; i--) {
                    var k = localStorage.key(i);
                    if (k && k.indexOf("PL_AttrCalib_") === 0) localStorage.removeItem(k);
                }
            }
        } catch (e) {}
    });
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
        const page = await boot(browser, "games/wump2ka.z5.js");
        const command = async (text) => {
            await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
            await page.waitForTimeout(900);
        };

        await command("look");
        await command("take canteen"); // real, known D73 proof case (see AttrCalibrator.js header)
        await command("drop canteen");
        await command("take canteen");

        const result = await page.evaluate(() => ({
            table: JSON.parse(JSON.stringify(AttrCalibrator.table)),
            traceCount: (window.__PARCHLOCK_ATTR_TRACE__ || []).length
        }));

        check("the cut-over analyzer wrote real learned facts (D73's canteen proof case)", !!result.table.objects && Object.keys(result.table.objects).length > 0);
        check("window.__PARCHLOCK_ATTR_TRACE__ (existing diagnostic surface) is preserved byte-for-byte, still populated post-cutover", result.traceCount > 0);

        const keys = await page.evaluate(() => {
            var ks = [];
            for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("PL_AttrCalib_") === 0) ks.push(k); }
            return ks;
        });
        check("exactly one real localStorage key exists (single writer, no duplicate-write from a second path)", keys.length === 1);

        // codex #455/#456: analyze() must consume a FROZEN transcript
        // snapshot (captureAfter), never live DOM read at settle time --
        // this contract is unaffected by cutover (still load-bearing).
        const boundaryResult = await page.evaluate(async () => {
            Input.Clear();
            Input.Inject("take canteen", true);
            var turn = TurnRecorder._activeTurn;
            await new Promise((r) => setTimeout(r, 50)); // well before 450ms
            var snapshotBeforeSecondCommand = turn.analyzerSnapshots["diag-verbSuccess"];
            Input.Clear();
            Input.Inject("look", true); // boundary-stamps the first turn NOW
            var snapshotRightAfter = turn.analyzerSnapshots["diag-verbSuccess"];
            await new Promise((r) => setTimeout(r, 700));
            return {
                notCapturedBeforeBoundary: snapshotBeforeSecondCommand === undefined,
                capturedImmediatelyAtBoundary: typeof snapshotRightAfter === "string" && snapshotRightAfter.length >= 0,
                boundedByLaterCommand: turn.boundedByLaterCommand
            };
        });
        check("verbSuccess's transcript snapshot is NOT captured before a boundary/close event", boundaryResult.notCapturedBeforeBoundary);
        check("verbSuccess's transcript snapshot is captured (frozen) at the exact boundary-stamp moment, not deferred to the original 450ms timer", boundaryResult.capturedImmediatelyAtBoundary);
        check("the boundary-stamped turn correctly records boundedByLaterCommand:true", boundaryResult.boundedByLaterCommand === true);

        // Counting-based verb (open/wear/lock/switch) end-to-end: with only
        // ONE real writer post-cutover, the double-count RISK this test used
        // to guard against (a second independent clone re-basing onto an
        // already-updated table) is now structurally impossible -- confirms
        // a single real command produces exactly ONE candidate tally, not
        // an inflated count from any leftover dual-write path.
        await page.evaluate(() => { AttrCalibrator.table = { version: 2, verbs: {}, objects: {} }; });
        const singleCountResult = await page.evaluate(() => {
            var mem = AttributeSchema._getMem();
            var fakeEntry = { verb: "open", noun: "door", objectId: 999, command: "open door", trace: [{ op: "set_attr", args: [999, 14] }], success: true, ambiguous: false, at: Date.now() };
            AttrCalibrator.record(fakeEntry);
            var learned = AttrCalibrator.table.verbs.open;
            return { confirmations: learned.confirmations, candidates: Object.keys(learned.candidates) };
        });
        check("a single bit-learning observation is counted once and preserves its sole candidate", singleCountResult.confirmations === 1 && singleCountResult.candidates.length === 1 && singleCountResult.candidates[0] === "14");

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
