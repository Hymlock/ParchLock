const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
        try {
            localStorage.setItem("PL_MobileTutorialSeen", "1");
            localStorage.setItem("PL_TutorialSeen", "1");
        } catch (e) {}
    });
    const url = pathToFileURL(path.resolve(__dirname, "..", "play.html")).href + "?story=games/wump2ka.z5.js&t=" + Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
        const s = document.querySelector(".parchlock-splash__start");
        if (s) s.click();
        try { Message.Hide(); } catch (e) {}
    });
    await page.waitForTimeout(2000);
    async function waitLine() {
        for (let i = 0; i < 40; i++) {
            if (await page.locator(".Input.LineInput").count()) return true;
            await page.keyboard.press("Space").catch(() => {});
            await page.waitForTimeout(250);
        }
        return false;
    }
    async function submit(cmd) {
        await page.evaluate((t) => {
            try { Message.Hide(); } catch (e) {}
            Input.Clear();
            Input.Inject(t, true);
        }, cmd);
        await page.waitForTimeout(900);
        for (let i = 0; i < 6; i++) {
            const more = await page.evaluate(() => !document.querySelector(".Input.LineInput") && /more/i.test(document.body.innerText.slice(-200)));
            if (!more) break;
            await page.keyboard.press("Space");
            await page.waitForTimeout(300);
        }
    }
    await waitLine();
    const boot = await page.evaluate(() => (document.body.innerText || "").slice(0, 400));
    if (/restore/i.test(boot)) await submit("no");
    await waitLine();
    await submit("look");
    for (const cmd of ["take canteen", "take note", "take popper", "take club", "take skeleton", "take pellets"]) {
        await submit(cmd);
    }
    const before = await page.evaluate(() => {
        const m = StatTracker.model();
        return {
            value: m.stats.value && m.stats.value.value,
            weight: m.stats.weight && m.stats.weight.value,
            inv: (WorldModel.lastPayload && WorldModel.lastPayload.inventory || []).map((o) => o.name),
            lineVisible: !!document.querySelector(".Input.LineInput")
        };
    });
    const turns = async () => page.evaluate(() => {
        const t = StatTracker.model().stats.turns;
        return t && typeof t.value === "number" ? t.value : null;
    });
    const t0 = await turns();
    await page.evaluate(() => { try { EquipmentUI.Show(); } catch (e) {} });
    await page.waitForTimeout(1800);
    const t1 = await turns();
    await page.evaluate(() => { try { EquipmentUI.Hide(); } catch (e) {} });
    await page.waitForTimeout(400);
    await page.evaluate(() => { try { EquipmentUI.Show(); } catch (e) {} });
    await page.waitForTimeout(1800);
    const t2 = await turns();
    const after = await page.evaluate(() => {
        const m = StatTracker.model();
        const stats = {};
        Object.keys(m.stats || {}).forEach((k) => {
            const s = m.stats[k];
            if (s && s.confirmed) stats[k] = { value: s.value, source: s.source };
        });
        return {
            equipOpen: document.body.classList.contains("equip-open"),
            hideFlag: !!StatTracker._hideCarryProbe,
            useless: !!StatTracker._carryProbeUseless,
            stats,
            chips: Array.from(document.querySelectorAll("#pl-stats .pl-stat, #pl-stats [data-stat]")).map((el) => el.textContent.slice(0, 40)),
            statusText: (document.querySelector("#pl-stats") && document.querySelector("#pl-stats").innerText || "").slice(0, 400),
            probeLines: document.querySelectorAll(".pl-carry-probe").length,
            lastInput: (document.querySelector(".Style_input:last-of-type") && document.querySelector(".Style_input:last-of-type").textContent) || ""
        };
    });
    console.log(JSON.stringify({ before, after, turns: { t0, t1, t2 } }, null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
