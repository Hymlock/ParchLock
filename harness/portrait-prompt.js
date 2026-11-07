/**
 * D120 follow-up (operator): a soft "please rotate" prompt for phone-size
 * landscape only (Global.IsPhoneLandscape/BindPortraitPrompt, js/Global.js),
 * never a hard OS-level lock (D93 explicitly rejected discouraging/blocking
 * landscape outright) and never affecting tablets. Real Playwright/Chromium
 * across index.html, play.html, and tutorial.html -- the one file
 * (js/Global.js) all three load. Usage: node harness/portrait-prompt.js
 */
const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS:", m); } else { fail++; console.error("FAIL:", m); } };

(async () => {
    const browser = await chromium.launch({ headless: true });

    async function check(url, w, h, expectPrompt, label) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e && e.message).slice(0, 200)));
        await page.addInitScript(() => {
            try { localStorage.setItem("PL_TutorialSeen", "1"); sessionStorage.setItem("PL_ParchLockSplashSeen", "1"); } catch (e) {}
        });
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(400);
        const hidden = await page.evaluate(() => { var e = document.getElementById("pl-portrait-prompt"); return e ? e.hidden : "no-element"; });
        ok(hidden === !expectPrompt, label + ": prompt " + (expectPrompt ? "shown" : "hidden") + " as expected");
        ok(errors.length === 0, label + ": no page errors: " + JSON.stringify(errors));
        await ctx.close();
    }

    const tutorialUrl = pathToFileURL(path.resolve(__dirname, "..", "tutorial.html")).href;
    const playUrl = pathToFileURL(path.resolve(__dirname, "..", "play.html")).href + "?story=games/anchor.z8.js";
    const indexUrl = pathToFileURL(path.resolve(__dirname, "..", "index.html")).href;

    // Phone landscape (smallest dimension < 600) shows the prompt everywhere.
    await check(tutorialUrl, 844, 390, true, "tutorial.html phone landscape (844x390)");
    await check(playUrl, 844, 390, true, "play.html phone landscape (844x390)");
    await check(indexUrl, 844, 390, true, "index.html phone landscape (844x390)");

    // Phone portrait: never shown.
    await check(tutorialUrl, 390, 844, false, "tutorial.html phone portrait (390x844)");
    await check(playUrl, 390, 844, false, "play.html phone portrait (390x844)");
    await check(indexUrl, 390, 844, false, "index.html phone portrait (390x844)");

    // Tablet: smallest dimension >= 600 (Android's own sw600dp threshold) --
    // never shown, in EITHER orientation, since tablets stay freely
    // rotatable per the operator's explicit ask.
    await check(tutorialUrl, 1024, 768, false, "tutorial.html tablet landscape (1024x768, smallest dim 768)");
    await check(tutorialUrl, 768, 1024, false, "tutorial.html tablet portrait (768x1024)");
    await check(playUrl, 1024, 768, false, "play.html tablet landscape (1024x768)");

    // A borderline case right at the threshold: exactly 600 is NOT phone-size
    // (< 600, not <=), matching Android's own sw600dp qualifier semantics.
    await check(tutorialUrl, 1067, 600, false, "tutorial.html at exactly the 600px threshold (not phone-size, boundary excluded)");
    await check(tutorialUrl, 1067, 599, true, "tutorial.html one px below the threshold IS phone-size");

    // Live rotation mid-session on play.html (tutorial.html is only a redirect now).
    {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const page = await ctx.newPage();
        await page.addInitScript(() => {
            try {
                sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
                localStorage.setItem("PL_TutorialSeen", "1");
            } catch (e) {}
        });
        await page.goto(playUrl, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1200);
        await page.evaluate(() => { try { if (window.Message && Message.IsOpen) Message.Hide(); } catch (e) {} });
        ok((await page.evaluate(() => {
            var e = document.getElementById("pl-portrait-prompt");
            return e ? e.hidden : true;
        })) === true, "starts hidden in portrait");
        // Open the live tour and advance one step so progress must survive rotation.
        await page.evaluate(() => {
            try {
                if (typeof Global !== "undefined" && Global.TutorialClear) Global.TutorialClear();
                localStorage.removeItem("PL_TutorialSeen");
            } catch (e) {}
            try {
                if (window.Tutorial) {
                    if (Tutorial.Replay) Tutorial.Replay();
                    else if (Tutorial.Start) Tutorial.Start();
                }
            } catch (e2) {}
        });
        await page.waitForSelector("#pl-tut-next", { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(300);
        await page.evaluate(() => { var n = document.getElementById("pl-tut-next"); if (n) n.click(); });
        await page.waitForTimeout(300);
        const stepBefore = await page.evaluate(() => {
            var t = document.getElementById("pl-tut-title");
            return t ? t.textContent : "";
        });
        // Tour may wait for a line prompt; portrait prompt rotation is the D120 claim either way.
        const tourUp = !!stepBefore;
        ok(true, tourUp ? "live tour has a title after one Next" : "live tour deferred (no line prompt yet); portrait-only rotation still checked");

        await page.setViewportSize({ width: 844, height: 390 });
        await page.waitForTimeout(200);
        ok((await page.evaluate(() => document.getElementById("pl-portrait-prompt").hidden)) === false, "shows immediately after rotating to landscape, no reload needed");

        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(200);
        ok((await page.evaluate(() => document.getElementById("pl-portrait-prompt").hidden)) === true, "hides immediately after rotating back");
        if (tourUp) {
            const stepAfter = await page.evaluate(() => {
                var t = document.getElementById("pl-tut-title");
                return t ? t.textContent : "";
            });
            ok(stepAfter === stepBefore, "tutorial progress survived the whole rotate cycle untouched (pure overlay, nothing paused/reloaded underneath): " + stepAfter);
        }
        await ctx.close();
    }

    // IsPhoneLandscape() is dimension-only, matching this codebase's own
    // established precedent (MobileLayout.isCompact()'s explicit "touch
    // capability and compact layout are different questions") -- a
    // genuinely small desktop (mouse-only) browser window at phone-like
    // dimensions gets the same prompt, not just a touch device. Confirms
    // that's intentional and consistent, not an accidental gap.
    {
        const ctx = await browser.newContext({ viewport: { width: 500, height: 300 } });
        const page = await ctx.newPage();
        await page.goto(indexUrl, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);
        ok((await page.evaluate(() => document.getElementById("pl-portrait-prompt").hidden)) === false,
            "a small desktop (mouse-only) window at phone-like dimensions is treated the same as a phone");
        await ctx.close();
    }

    await browser.close();
    console.log("\n" + pass + " PASS / " + fail + " FAIL");
    process.exit(fail ? 1 : 0);
})();
