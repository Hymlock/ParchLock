/**
 * D86 entry-point proof (updated post-cutover): Input.Inject(hitEnter===true)
 * is a real TurnRecorder entry point, and Actionable.Submit is not a
 * separate (wrong-value, window-stealing) one.
 *
 * Originally proved this against the legacy AttrCalibrator windows directly
 * (D86 stage 1). Since then, D86's migration has CUT OVER: the legacy
 * observeCommand/observeLocation/observeVerbBehavior triggers are no longer
 * called at all (js/AttrCalibrator.js's three analyzers, registered against
 * TurnRecorder, are now the sole real writers -- see PRODUCTION_PLAN.md
 * D86's cutover entry). This proof is updated to check the same properties
 * against the NEW system's own observable state (TurnRecorder._activeTurn,
 * TurnRecorder.onAcceptedSubmit call count/args) instead of the now-unused
 * internal fields it originally checked.
 *
 * Usage: node tools/d86-input-inject-entrypoint-proof.js
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
            if (typeof AttrCalibrator !== "undefined") {
                AttrCalibrator.hydratedForGame = null;
                AttrCalibrator.table = { version: 2, verbs: {}, objects: {} };
                if (typeof localStorage !== "undefined") {
                    for (var i = localStorage.length - 1; i >= 0; i--) {
                        var k = localStorage.key(i);
                        if (k && k.indexOf("PL_AttrCalib_") === 0) localStorage.removeItem(k);
                    }
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
        const page = await boot(browser, "games/anchor.z8.js");

        // 1) Direct Input.Inject(text, true) -- the click/radial/map-style path --
        //    must open a TurnRecorder turn SYNCHRONOUSLY (before its own
        //    450ms settle timer fires).
        const openedAfterInject = await page.evaluate(() => {
            Input.Clear();
            Input.Inject("look", true);
            return !!TurnRecorder._activeTurn;
        });
        check("Input.Inject(text, true) opens a TurnRecorder turn synchronously", openedAfterInject);

        await page.waitForTimeout(600); // let the 450ms settle fire and clear it
        const closedAfterResolve = await page.evaluate(() => !TurnRecorder._activeTurn);
        check("the turn naturally resolves/closes on its own 450ms timer", closedAfterResolve);

        // 2) hitEnter:false (autocomplete/stem-fill style call) must NOT open a turn.
        const openedForNoEnter = await page.evaluate(() => {
            Input.Clear();
            Input.Inject("loo", false);
            return !!TurnRecorder._activeTurn;
        });
        check("Input.Inject(text, false) opens no turn (no false submission)", !openedForNoEnter);
        await page.evaluate(() => Input.Clear());

        // 3) Actionable.Submit (the real radial/menu code path) must call
        //    TurnRecorder.onAcceptedSubmit EXACTLY ONCE with the correct
        //    final command value -- not zero (silently blocked) and not
        //    twice (a double-wrap regression). Monkeypatches the real entry
        //    point to record call count/args instead of trusting a boolean.
        const submitResult = await page.evaluate(() => {
            Input.Clear();
            var calls = [];
            var orig = TurnRecorder.onAcceptedSubmit;
            TurnRecorder.onAcceptedSubmit = function (command, source) { calls.push({ command: command, source: source }); return orig.apply(TurnRecorder, arguments); };
            try {
                Actionable.Submit("look");
            } finally {
                TurnRecorder.onAcceptedSubmit = orig;
            }
            return calls;
        });
        check("Actionable.Submit calls TurnRecorder.onAcceptedSubmit exactly once with the correct final value 'look' (not zero, not twice)",
            submitResult.length === 1 && submitResult[0].command === "look");
        await page.waitForTimeout(600);

        // 3b) Prefilled-append case (codex #429): a hitEnter:false call that
        //     stages partial text, followed by a hitEnter:true call that
        //     appends the rest, must observe the FULL FINAL value ("take
        //     lamp"), not just the second call's own argument fragment
        //     ("lamp") -- Input.Inject APPENDS to existing box content, so
        //     using the raw argument instead of $(...).val() would corrupt
        //     which noun/object analyzers correlate against.
        const appendResult = await page.evaluate(() => {
            Input.Clear();
            var seen = [];
            var orig = TurnRecorder.onAcceptedSubmit;
            TurnRecorder.onAcceptedSubmit = function (command, source) { seen.push(command); return orig.apply(TurnRecorder, arguments); };
            try {
                Input.Inject("take ", false);
                Input.Inject("lamp", true);
            } finally {
                TurnRecorder.onAcceptedSubmit = orig;
            }
            return seen;
        });
        check("a staged partial (hitEnter:false) + completing append (hitEnter:true) observes the FULL final value 'take lamp', not the suffix 'lamp'",
            appendResult.length === 1 && appendResult[0] === "take lamp");
        await page.waitForTimeout(600);

        // 4) A genuinely typed Enter (native keyboard event) must still work,
        //    via AttrCalibrator's own document-capture keypress listener,
        //    which itself now calls TurnRecorder.onAcceptedSubmit.
        await page.locator(".Input.LineInput").click();
        await page.keyboard.type("look");
        const openedBeforeEnter = await page.evaluate(() => !!TurnRecorder._activeTurn);
        check("typing alone (no Enter yet) does not open a turn", !openedBeforeEnter);
        await page.keyboard.press("Enter");
        const openedAfterTypedEnter = await page.evaluate(() => !!TurnRecorder._activeTurn);
        check("a genuinely typed Enter still opens a TurnRecorder turn (native capture listener unaffected)", openedAfterTypedEnter);

        await page.close();

        // 5) Non-Anchorhead smoke check (codex #432, non-blocking caveat):
        //    the entry-point coverage must not be an Anchorhead-specific
        //    artifact. A different engine/format (wump2ka.z5.js) gets the
        //    same direct Input.Inject synchronous-open check.
        const page2 = await boot(browser, "games/wump2ka.z5.js");
        const openedOnWump = await page2.evaluate(() => {
            Input.Clear();
            Input.Inject("look", true);
            return !!TurnRecorder._activeTurn;
        });
        check("(wump2ka.z5.js) Input.Inject(text, true) also opens a TurnRecorder turn synchronously -- not an Anchorhead-only artifact", openedOnWump);
        await page2.waitForTimeout(600);
        await page2.close();
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
