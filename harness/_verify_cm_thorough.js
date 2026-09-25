const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(ROOT, "play.html")).href + "?story=games/CounterfeitMonkey.gblorb.js");
    await page.waitForTimeout(3500);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });

    async function inject(cmd) {
        if (!(await page.locator(".Input.LineInput").count())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(1000);
        return true;
    }

    const beforeText = await page.evaluate(() => document.body.innerText || "");
    await inject("no");
    await inject("no");
    const injected = await inject("look");
    const afterLook = await page.evaluate(() => document.body.innerText || "");
    await inject("inventory");
    const afterInv = await page.evaluate(() => document.body.innerText || "");

    const quixe = await page.evaluate(() => {
        const r = { hasQuixe: typeof window.Quixe !== "undefined" };
        if (r.hasQuixe) {
            r.magic = [Quixe.ReadByte(0), Quixe.ReadByte(1), Quixe.ReadByte(2), Quixe.ReadByte(3)];
            const vi = Quixe.get_vm_internals ? Quixe.get_vm_internals() : null;
            r.hasVmInternals = !!vi;
            r.endmem = vi ? vi.endmem : null;
        }
        return r;
    });

    await page.screenshot({ path: "tools/screenshots/counterfeit-monkey-boot.png", fullPage: false });
    await browser.close();

    console.log("=== injected 'look' successfully:", injected, "===");
    console.log("=== BEFORE TEXT (first 400) ===\n", beforeText.slice(0, 400));
    console.log("=== AFTER LOOK (last 500) ===\n", afterLook.slice(-500));
    console.log("=== AFTER INVENTORY (last 500) ===\n", afterInv.slice(-500));
    console.log("=== QUIXE ===", JSON.stringify(quixe));
    console.log("=== PAGE ERRORS ===", JSON.stringify(errors));
    console.log("=== SCREENSHOT saved to tools/screenshots/counterfeit-monkey-boot.png ===");
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
