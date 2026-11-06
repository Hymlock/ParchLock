/**
 * D86 migration: live correctness proof for the CUT-OVER `analyzers.verbBehavior`
 * (D85's `_verbBehaviorWindow`/observeVerbBehavior/_resolveVerbBehavior, now
 * retired -- this analyzer is the sole real writer as of the cutover, see
 * PRODUCTION_PLAN.md D86). Before cutover, this file proved byte-for-byte
 * A/B equivalence against the legacy window (verified clean); after
 * cutover, that comparison target no longer runs, so this proves the real,
 * final learned fact directly against the now-sole system.
 *
 * Uses AOTYRZ.z5.js -- D85's own real proof case (the "examine has been
 * disabled" title).
 *
 * Usage: node tools/d86-verbbehavior-ab-proof.js
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
        const page = await boot(browser, "games/AOTYRZ.z5.js");
        const command = async (text) => {
            await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
            await page.waitForTimeout(1200);
        };

        await command("yes");
        await command("n");
        await command("w"); // bedroom: dead soldier, cell phone, plasma rifle, closet

        const before = await page.evaluate(() => ActionSynth.inspectVerbDisabled());
        check("before any observation, inspectVerbDisabled() is false", before === false);

        // Same real 3-distinct-object confirmed-stub sequence as D85's live proof.
        await command("examine dead soldier");
        await command("examine cell phone");
        await command("examine plasma rifle");

        const result = await page.evaluate(() => ({
            vb: AttrCalibrator.table.verbBehavior ? JSON.parse(JSON.stringify(AttrCalibrator.table.verbBehavior)) : null
        }));

        check("the cut-over analyzer confirmed the disablement (D85's own proof case)", !!result.vb && result.vb.disabled.examine && result.vb.disabled.examine.confirmed === true);
        check("the confirmed disablement has 3 distinct objectId-keyed responses behind it (codex #444's fix, still correct post-cutover)",
            !!result.vb && Object.keys(result.vb.disabled.examine.responsesByObject || {}).length === 3);

        const afterKeys = await page.evaluate(() => {
            var keys = [];
            for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("PL_AttrCalib_") === 0) keys.push(k); }
            return keys;
        });
        check("exactly one real localStorage key exists (single writer)", afterKeys.length === 1);

        const consumerResult = await page.evaluate(() => ({
            disabled: ActionSynth.inspectVerbDisabled(),
            verbs: ActionSynth.verbsForAttrs({})
        }));
        check("ActionSynth.inspectVerbDisabled() correctly reflects the cut-over analyzer's confirmed fact", consumerResult.disabled === true);
        check("ActionSynth.verbsForAttrs correctly omits the disabled default verb (the original bug report, still fixed post-cutover)", consumerResult.verbs.indexOf("examine") < 0);

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
