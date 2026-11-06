/**
 * D86 migration: live correctness proof for the CUT-OVER `analyzers.locationGlobal`
 * (D84's `_locWindow`/observeLocation/_resolveLocationWindow, now retired --
 * this analyzer is the sole real writer as of the cutover, see
 * PRODUCTION_PLAN.md D86). Before cutover, this file proved byte-for-byte A/B
 * equivalence against the legacy window (verified clean); after cutover,
 * that comparison target no longer runs, so this proves the real, final
 * learned fact directly against the now-sole system.
 *
 * Uses Bronze.zblorb.js -- D84's own real proof case (the game whose
 * `parent(playerId)` path is permanently useless, per D83).
 *
 * Usage: node tools/d86-locationglobal-ab-proof.js
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
        const page = await boot(browser, "games/Bronze.zblorb.js");
        const command = async (text) => {
            await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
            await page.waitForTimeout(900);
        };

        const beforeKeys = await page.evaluate(() => {
            var keys = [];
            for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("PL_AttrCalib_") === 0) keys.push(k); }
            return keys;
        });

        // Alternating real moves -- the same D84 proof shape (repeated
        // revisits are what crosses LOCATION_CONFIRM_THRESHOLD).
        await command("y");
        await command("look");
        await command("n"); await command("s");
        await command("n"); await command("s");
        await command("n"); await command("s");
        await command("n"); await command("s");

        const result = await page.evaluate(() => ({
            loc: AttrCalibrator.table.locationGlobal ? JSON.parse(JSON.stringify(AttrCalibrator.table.locationGlobal)) : null
        }));

        check("the cut-over analyzer confirmed a location-global slot (D84's own Bronze proof case)", !!result.loc && result.loc.confirmedSlot != null);
        const evidence = result.loc && result.loc.candidates[result.loc.confirmedSlot];
        check("the confirmed slot has actual changes and revisits", !!evidence && evidence.transitions >= 3 && evidence.returns > 0);

        const afterKeys = await page.evaluate(() => {
            var keys = [];
            for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("PL_AttrCalib_") === 0) keys.push(k); }
            return keys;
        });
        check("exactly one real localStorage key exists (single writer)", afterKeys.length === 1);

        const consumerResult = await page.evaluate(() => {
            var mem = AttributeSchema._getMem();
            return ZRamReader.findLocationGlobal(mem);
        });
        check("ZRamReader.findLocationGlobal returns Bronze's actual Drawbridge object", consumerResult === 53);

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
