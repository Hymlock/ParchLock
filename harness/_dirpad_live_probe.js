// Live diagnostic (not a pass/fail harness) for the operator-reported bug:
// "the little pills are all over the place, no radial/circular pattern."
// Real Chromium, real Anchorhead, real mouse-driven Pointer Events (this
// widget is Pointer-Events-based, so a real mouse press/hold/move exercises
// the exact same code path a real touch would).
const { chromium } = require("playwright");
const path = require("path");
const http = require("http");
const fs = require("fs");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".ttf": "font/ttf" };
function serveStatic(root) {
    return http.createServer((req, res) => {
        var p = decodeURIComponent(req.url.split("?")[0]);
        var full = path.join(root, p);
        fs.readFile(full, (err, data) => {
            if (err) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream" });
            res.end(data);
        });
    });
}

(async () => {
    const root = path.resolve(__dirname, "..");
    const server = serveStatic(root);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 860 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e && e.message)));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console.error: " + m.text()); });

    await page.addInitScript(() => {
        try { localStorage.setItem("PL_MobileTutorialSeen", "1"); localStorage.removeItem("PL_Prefs"); } catch (e) {}
    });
    await page.goto("http://127.0.0.1:" + port + "/play.html?story=games/anchor.z8.js&t=" + Date.now(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
    await page.waitForTimeout(6000);
    await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });
    // Anchorhead's real first screen is a CHAR prompt (title screen) -- the
    // submit arrow advances it (same as harness/d105-input-contract.js) to
    // reach a real room with real Exits.
    await page.evaluate(() => { const b = document.getElementById("pl-input-submit"); if (b) b.click(); });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });

    const room = await page.evaluate(() => {
        try { return ParchLockMap.GetCurrentRoom() ? ParchLockMap.GetCurrentRoom().Exits : null; } catch (e) { return "ERR:" + e.message; }
    });
    console.log("Current room Exits:", JSON.stringify(room));

    const handleBox = await page.evaluate(() => {
        const el = document.getElementById("pl-dirpad-handle");
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, hidden: el.hidden, cs: getComputedStyle(el).position };
    });
    console.log("Handle box:", JSON.stringify(handleBox));

    if (!handleBox) { console.log("NO HANDLE FOUND -- element never created?"); await browser.close(); process.exit(1); }

    const cx = handleBox.x + handleBox.w / 2, cy = handleBox.y + handleBox.h / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(500); // past LongPressMs (420ms)
    await page.mouse.move(cx + 1, cy + 1); // nudge to trigger a pointermove -> updateHover after fire

    const ringState = await page.evaluate(() => {
        const ring = document.getElementById("pl-dirpad-ring");
        if (!ring) return null;
        const rr = ring.getBoundingClientRect();
        const cs = getComputedStyle(ring);
        const slices = Array.from(document.querySelectorAll(".pl-dirpad-slice")).map(function (el) {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return { text: el.textContent, left: s.left, top: s.top, position: s.position, rectX: r.x, rectY: r.y, rectW: r.width, rectH: r.height };
        });
        return {
            ringHidden: ring.hidden, ringPosition: cs.position, ringLeft: ring.style.left, ringTop: ring.style.top,
            ringWidth: ring.style.width, ringHeight: ring.style.height,
            ringRect: { x: rr.x, y: rr.y, w: rr.width, h: rr.height },
            bodyHasOpenClass: document.body.classList.contains("pl-dirpad-open"),
            slices: slices
        };
    });
    console.log("Ring/slice state:\n", JSON.stringify(ringState, null, 2));

    await page.mouse.up();
    console.log("JS errors during the whole run:", JSON.stringify(errors));

    await page.screenshot({ path: path.join(__dirname, "..", "tools", "screenshots", "matrix", "d117-live-probe.png") });
    console.log("Screenshot saved.");

    await browser.close();
    server.close();
})();
