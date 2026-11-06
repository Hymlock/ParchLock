/**
 * D34 follow-up D27 proof: Inform dictionary verb flags on the input radial.
 *
 * Advent (I6 z5): payload specialCommands include pray/xyzzy tagged
 * dictionary-verb; GetRadialCommands exposes them; special-commands bar
 * does not dump the 200-word list as buttons.
 * Zork1 (Infocom z3): zero dictionary-verb specialCommands (format gate).
 *
 * Usage: node tools/d34-dictionary-verbs-proof.js
 */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);
const OUT = path.join("tools", "screenshots", "d34");

async function command(page, text) {
    await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
    await page.waitForTimeout(900);
}

async function boot(browser, story) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        // Fresh sessions show the click-gated ParchLock splash; the real app dismisses it on the menu page before a story loads.
        await page.addInitScript(() => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); localStorage.setItem('PL_TutorialSeen','1'); localStorage.setItem('PL_TutorialLibrarySeen','1'); } catch (e) {} });
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
    return page;
}

async function tick(page) {
    await page.evaluate(() => {
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
        try { if (window.WorldModel) WorldModel.tick(); } catch (e1) {}
        try { if (window.Actionable) Actionable.Refresh(); } catch (e2) {}
    });
    await page.waitForTimeout(400);
}

async function snap(page) {
    return page.evaluate(() => {
        const p = (typeof WorldModel !== "undefined") ? WorldModel.lastPayload : null;
        const special = (p && p.specialCommands) || [];
        const dictVerbs = special.filter((c) => c && c.source === "dictionary-verb").map((c) => c.command || c.label);
        let radial = [];
        try { radial = ParchLockQol.GetRadialCommands() || []; } catch (eR) {}
        const barButtons = Array.from(document.querySelectorAll("#pl-special-commands button")).map((el) => el.textContent.trim());
        return {
            engineMode: p && p.engineMode,
            probe: p && p.probe,
            roomName: p && p.roomName,
            dictVerbCount: dictVerbs.length,
            hasPray: dictVerbs.indexOf("pray") >= 0,
            hasXyzzy: dictVerbs.indexOf("xyzzy") >= 0,
            hasWind: dictVerbs.indexOf("wind") >= 0,
            radialHasXyzzy: radial.some((c) => String(c.Command || "").toLowerCase() === "xyzzy"),
            radialHasPray: radial.some((c) => String(c.Command || "").toLowerCase() === "pray"),
            radialLookSource: (radial.filter((c) => String(c.Command || "").toLowerCase() === "look")[0] || {}).source,
            radialWaitSource: (radial.filter((c) => String(c.Command || "").toLowerCase() === "wait")[0] || {}).source,
            radialDictCount: radial.filter((c) => c.source === "dictionary-verb").length,
            barButtons: barButtons.slice(0, 20),
            barCount: barButtons.length,
            grammarDump: (typeof window.__PL_GRAMMAR_VERBS__ !== "undefined") ? window.__PL_GRAMMAR_VERBS__.length : 0,
            zvm: !!(window.__PARCHLOCK_ZVM__)
        };
    });
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    const report = {};
    try {
        const adventPage = await boot(browser, "games/Advent.z5.js");
        await command(adventPage, "look");
        await tick(adventPage);
        const advent = await snap(adventPage);
        report.advent = advent;
        assert.ok(advent.zvm, "Advent: ZVM not captured");
        assert.ok(advent.dictVerbCount >= 100, "Advent: expected a real dictionary verb list, got " + advent.dictVerbCount);
        assert.equal(advent.hasPray, true, "Advent: pray missing from dictionary-verb specialCommands");
        assert.equal(advent.hasXyzzy, true, "Advent: xyzzy missing from dictionary-verb specialCommands");
        assert.equal(advent.radialHasXyzzy, true, "Advent: GetRadialCommands missing xyzzy");
        assert.equal(advent.radialHasPray, true, "Advent: GetRadialCommands missing pray");
        assert.equal(advent.radialLookSource, "universal", "Advent: look must stay universal, not dictionary-verb");
        assert.equal(advent.radialWaitSource, "universal", "Advent: wait must stay universal, not dictionary-verb");
        assert.ok(advent.barCount < 20, "Advent: special-commands bar dumped dictionary verbs (" + advent.barCount + ")");
        await adventPage.locator(".Input.LineInput").click({ button: "right" });
        await adventPage.waitForTimeout(400);
        assert.ok(await adventPage.locator("#radial-menu").isVisible(), "Advent: input radial did not open");
        await adventPage.screenshot({ path: path.join(OUT, "advent-input-radial.png") });
        await adventPage.keyboard.press("Escape");
        await adventPage.close();

        const zorkPage = await boot(browser, "games/Zork1-TheGreatUndergroundEmpire.z3.js");
        await command(zorkPage, "look");
        await tick(zorkPage);
        const zork = await snap(zorkPage);
        report.zork1 = zork;
        assert.equal(zork.dictVerbCount, 0, "Zork1 Infocom must not expose Inform verb flags, got " + zork.dictVerbCount);
        assert.equal(zork.radialDictCount, 0, "Zork1 input radial must not source dictionary-verb items");
        await zorkPage.locator(".Input.LineInput").click({ button: "right" });
        await zorkPage.waitForTimeout(400);
        await zorkPage.screenshot({ path: path.join(OUT, "zork1-input-radial.png") });
        await zorkPage.close();

        fs.writeFileSync(path.join(OUT, "d34-proof.json"), JSON.stringify(report, null, 2));
        console.log("PASS: D34 dictionary-verb real-gameplay proof");
        console.log(JSON.stringify({
            advent: {
                dictVerbCount: advent.dictVerbCount,
                hasPray: advent.hasPray,
                hasXyzzy: advent.hasXyzzy,
                barCount: advent.barCount
            },
            zork1: { dictVerbCount: zork.dictVerbCount, radialDictCount: zork.radialDictCount }
        }, null, 2));
    } finally {
        await browser.close();
    }
})().catch((e) => { console.error(e); process.exitCode = 1; });
