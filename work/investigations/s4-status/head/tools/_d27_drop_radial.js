/**
 * One-off D27 proof for #26: inventory radial offers Drop (not Take)
 * on a held non-worn item (umbrella) in Anchorhead.
 */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        const dir = path.resolve("tools/screenshots");
        fs.mkdirSync(dir, { recursive: true });
        await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/anchor.z8.js");
        await page.waitForTimeout(2500);
        await page.evaluate(() => { if (window.Message) Message.Hide(); });
        for (let i = 0; i < 12 && !(await page.locator(".Input.LineInput").count()); i++) {
            await page.keyboard.press("Space");
            await page.waitForTimeout(500);
        }
        await page.locator(".Input.LineInput").waitFor({ state: "visible" });
        await page.evaluate(() => { Input.Clear(); Input.Inject("inventory", true); });
        await page.waitForTimeout(800);
        await page.evaluate(() => Actionable.ShowInventory());
        await page.waitForTimeout(400);

        const target = await page.evaluate(() => {
            const p = WorldModel && WorldModel.lastPayload;
            const inv = (p && p.inventory) || [];
            const held = inv.find((o) => o && o.name && !/worn/i.test(o.name) && !(o.attrs && (o.attrs.worn || o.attrs.isWorn)));
            const btn = Array.from(document.querySelectorAll("#inventory-items button")).find((el) => {
                const id = el.getAttribute("data-object-id");
                return held && String(id) === String(held.id);
            });
            if (!held || !btn) {
                return { ok: false, inv: inv.map((o) => ({ id: o.id, name: o.name, worn: !!(o.attrs && o.attrs.worn) })) };
            }
            const r = btn.getBoundingClientRect();
            return { ok: true, id: held.id, name: held.name, x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        assert.ok(target.ok, "no held non-worn inventory button: " + JSON.stringify(target));
        await page.mouse.click(target.x, target.y, { button: "right" });
        await page.waitForTimeout(400);
        assert.ok(await page.locator("#radial-menu").isVisible(), "inventory radial did not open");
        const labels = await page.evaluate(() =>
            Array.from(document.querySelectorAll("#radial-menu .radial-command")).map((el) => el.textContent.trim())
        );
        await page.screenshot({ path: path.join(dir, "inventory-drop-radial.png") });
        assert.ok(labels.indexOf("Drop") >= 0, "inventory radial missing Drop, got " + JSON.stringify(labels));
        assert.ok(labels.indexOf("Take") < 0, "inventory radial still has Take, got " + JSON.stringify(labels));
        assert.ok(labels.indexOf("Examine") >= 0, "inventory radial missing Examine");
        console.log("PASS: inventory Drop radial", { name: target.name, id: target.id, labels });
    } finally {
        await browser.close();
    }
})().catch((e) => { console.error(e); process.exitCode = 1; });
