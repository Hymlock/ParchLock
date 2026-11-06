/**
 * D85 standalone live proof: per-game learned verb-disablement calibration,
 * verified via real UI-driven play on AOTYRZ.z5.js ("Attack of the Yeti
 * Robot Zombies"), using D86 stage 1's now-correct Input.Inject entry-point
 * coverage (this game's commands are submitted the same way any click/
 * radial-driven command would be -- Input.Inject(text, true) -- exactly the
 * path that was blind to all calibration before D86 stage 1 shipped).
 *
 * This is the live, real-gameplay resolution of the original bug report:
 * the game's own action routine explicitly disables examine/look-at/search
 * (its own intro text says so), but the radial kept offering "Examine" for
 * every object regardless, because AttributeSchema's static profile has no
 * way to know a compiled verb has been globally stubbed.
 *
 * Proves, live, end to end:
 *   - before any observation, ActionSynth.inspectVerbDisabled() is false
 *   - three distinct real objects (dead soldier / cell phone / plasma
 *     rifle) whose "examine" response text is confirmed byte-identical
 *     confirm the disablement
 *   - a real object whose response text genuinely differs (the closet:
 *     "The closet is empty.") is never mistaken for evidence of the stub
 *   - once confirmed, ActionSynth.commandsForPayloadObjectId no longer
 *     offers "examine" for a real room object at all
 *
 * Usage: node tools/d85-verb-disablement-proof.js
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
            AttrCalibrator.table = {};
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

        await command("yes"); // "Get it? Yes or no?" gate
        await command("n");   // living room
        await command("w");   // bedroom: dead soldier, cell phone, plasma rifle, closet

        const before = await page.evaluate(() => ActionSynth.inspectVerbDisabled());
        check("before any observation, inspectVerbDisabled() is false", before === false);

        // A real, different-text response must not be mistaken for the stub.
        // Run this in isolation (own table) since a contaminated noun's
        // response is remembered permanently -- correctly -- and would
        // otherwise block the clean-confirmation case checked next.
        await command("examine closet");
        const afterOneReal = await page.evaluate(() => ActionSynth.inspectVerbDisabled());
        check("a genuinely different real response (closet) alone never confirms disablement", afterOneReal === false);
        await page.evaluate(() => { AttrCalibrator.table = {}; });

        // Three distinct real objects, confirmed live to return byte-identical
        // author-written stub text.
        await command("examine dead soldier");
        await command("examine cell phone");
        await command("examine plasma rifle");

        const after = await page.evaluate(() => ({
            disabled: ActionSynth.inspectVerbDisabled(),
            confirmed: AttrCalibrator.table.verbBehavior && AttrCalibrator.table.verbBehavior.disabled.examine && AttrCalibrator.table.verbBehavior.disabled.examine.confirmed
        }));
        check("three distinct byte-identical-response objects confirm disablement", after.disabled === true && after.confirmed === true);

        const radial = await page.evaluate(() => {
            var p = WorldModel.lastPayload;
            var obj = (p.discoveredObjects || []).find((o) => o.name === "closet");
            if (!obj) return null;
            return ActionSynth.commandsForPayloadObjectId(obj.id, "room").map((c) => c.verb);
        });
        check("a real room object's radial no longer offers 'examine' once confirmed disabled", !!radial && radial.indexOf("examine") < 0);

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
