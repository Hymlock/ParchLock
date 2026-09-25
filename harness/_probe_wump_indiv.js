/**
 * Decode C_ROOMS prop-3 blob vs compass doorDir 91-95.
 * Usage: node harness/_probe_wump_indiv.js
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

(async () => {
    const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/wump2ka.z5.js");
    await page.waitForTimeout(1600);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    async function inject(cmd) {
        if (!(await page.locator(".Input.LineInput").count())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(800);
        return true;
    }
    for (let i = 0; i < 50; i++) {
        const t = await page.evaluate(() => (document.body.innerText || ""));
        const has = await page.locator(".Input.LineInput").count();
        if (/Exit 1|jagged cave|polished chamber|watery dead-end/i.test(t) && has) break;
        if (/yes or no|restore a saved game/i.test(t) && has) { await inject("n"); continue; }
        await page.keyboard.press("Space");
        await page.waitForTimeout(160);
    }
    await inject("look");
    const info = await page.evaluate(() => {
        try { ZvmCapture.tick(); WorldModel.tick(); } catch (e0) {}
        const mem = ZRamProvider.getMem();
        const p = WorldModel.lastPayload;
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
        const len = mem.byteLength || 0;
        const roomId = p && p.roomId;
        function blobAt(ptr, nbytes) {
            const bytes = [];
            for (let i = 0; i < nbytes; i++) bytes.push(ZRamReader.u8(mem, ptr + i));
            const words = [];
            for (let i = 0; i + 1 < nbytes; i += 2) {
                const v = ZRamReader.u16(mem, ptr + i);
                words.push({
                    off: i,
                    v,
                    n: (v >= 1 && v <= count) ? (ZRamReader.shortName(mem, v) || "") : ""
                });
            }
            return { ptr, bytes, words };
        }
        const ptr = roomId ? ZRamReader.readProp(mem, roomId, 3) : 0;
        const blob = ptr ? blobAt(ptr, 120) : null;
        const rec5 = [];
        const rec6 = [];
        if (blob) {
            for (let i = 0; i + 5 <= 107; i += 5) {
                const a = ZRamReader.u16(mem, ptr + i);
                const b = ZRamReader.u16(mem, ptr + i + 2);
                const c = ZRamReader.u8(mem, ptr + i + 4);
                rec5.push({
                    off: i, a, b, c,
                    aN: (a >= 1 && a <= count) ? ZRamReader.shortName(mem, a) : "",
                    cN: (c >= 1 && c <= count) ? ZRamReader.shortName(mem, c) : ""
                });
            }
            for (let i = 0; i + 6 <= 108; i += 6) {
                const a = ZRamReader.u16(mem, ptr + i);
                const b = ZRamReader.u16(mem, ptr + i + 2);
                const c = ZRamReader.u16(mem, ptr + i + 4);
                rec6.push({
                    off: i, a, b, c,
                    aN: (a >= 1 && a <= count) ? ZRamReader.shortName(mem, a) : "",
                    cN: (c >= 1 && c <= count) ? ZRamReader.shortName(mem, c) : ""
                });
            }
        }
        const hits91 = [];
        if (ptr) {
            for (let i = 0; i < 107; i++) {
                const b = ZRamReader.u8(mem, ptr + i);
                if (b >= 91 && b <= 95) hits91.push({ kind: "u8", off: i, b });
            }
            for (let i = 0; i + 1 < 107; i += 1) {
                const v = ZRamReader.u16(mem, ptr + i);
                if (v >= 91 && v <= 95) hits91.push({ kind: "u16", off: i, v });
            }
        }
        const compass = ZRamReader.children(mem, 6).map((c) => {
            const doorDir = ZRamReader.readProp(mem, c, 21);
            return { id: c, name: ZRamReader.shortName(mem, c), doorDir };
        });
        const numbered = compass.filter((c) => /exit/i.test(c.name || ""));
        // Try doorDir as word-index into blob, byte-index, and (doorDir-64), (doorDir-76)
        const lookups = numbered.map((d) => {
            const tries = {};
            const idxs = [
                ["rawWord", d.doorDir * 2],
                ["rawByte", d.doorDir],
                ["m64word", (d.doorDir - 64) * 2],
                ["m64byte", d.doorDir - 64],
                ["m76word", (d.doorDir - 76) * 2],
                ["m76byte", d.doorDir - 76],
                ["m76rec5", (d.doorDir - 76) * 5],
                ["m76rec6", (d.doorDir - 76) * 6]
            ];
            idxs.forEach(([k, off]) => {
                if (!ptr || off < 0 || off + 2 > 120) return;
                const v8 = ZRamReader.u8(mem, ptr + off);
                const v16 = ZRamReader.u16(mem, ptr + off);
                tries[k] = {
                    off, v8, v16,
                    n8: (v8 >= 1 && v8 <= count) ? ZRamReader.shortName(mem, v8) : "",
                    n16: (v16 >= 1 && v16 <= count) ? ZRamReader.shortName(mem, v16) : ""
                };
            });
            return { dir: d, tries };
        });
        // Word pairs starting after a count word
        const pairAt0 = [];
        if (ptr) {
            const n = ZRamReader.u16(mem, ptr);
            pairAt0.push({ countWord: n });
            for (let i = 2; i + 4 <= 107; i += 4) {
                const prop = ZRamReader.u16(mem, ptr + i);
                const val = ZRamReader.u16(mem, ptr + i + 2);
                pairAt0.push({
                    off: i, prop, val,
                    pN: (prop >= 1 && prop <= count) ? ZRamReader.shortName(mem, prop) : "",
                    vN: (val >= 1 && val <= count) ? ZRamReader.shortName(mem, val) : ""
                });
            }
        }
        const text = document.body.innerText || "";
        return {
            roomId,
            roomName: p && p.roomName,
            exitMentions: (text.match(/Exit \d+[^.]*\./gi) || []).slice(-6),
            ptr,
            staticMem: h.staticMem,
            himem: h.himem,
            objectCount: count,
            blobWords: blob && blob.words,
            rec5,
            rec6: rec6.slice(0, 22),
            hits91,
            numbered,
            lookups,
            pairHead: pairAt0.slice(0, 20)
        };
    });
    const out = path.join("tools", "screenshots", "matrix", "wump-indiv-probe.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(info, null, 2));
    console.log(JSON.stringify(info, null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
