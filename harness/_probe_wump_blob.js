/**
 * Dump the 107-byte per-room prop-3 blob for the current wump2ka room.
 * Usage: node harness/_probe_wump_blob.js
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
        function readProp(id, want) {
            const obj = ZRamReader.objectLinks(mem, id);
            if (!obj || !obj.props) return 0;
            let addr = obj.props;
            const textLen = ZRamReader.u8(mem, addr);
            addr += 1 + textLen * 2;
            let guard = 0;
            while (guard++ < 80) {
                const sizebyte = ZRamReader.u8(mem, addr);
                if (!sizebyte) break;
                let num, sz, dataAddr;
                num = sizebyte & 0x3f;
                if (sizebyte & 0x80) {
                    const sizebyte2 = ZRamReader.u8(mem, addr + 1);
                    sz = sizebyte2 & 0x3f; if (sz === 0) sz = 64;
                    dataAddr = addr + 2; addr = dataAddr + sz;
                } else {
                    sz = (sizebyte & 0x40) ? 2 : 1;
                    dataAddr = addr + 1; addr = dataAddr + sz;
                }
                if (num === want) {
                    if (sz === 1) return ZRamReader.u8(mem, dataAddr);
                    if (sz >= 2) return ZRamReader.u16(mem, dataAddr);
                }
            }
            return 0;
        }
        function blob(id) {
            const ptr = readProp(id, 3);
            if (!ptr) return null;
            const bytes = [];
            const ascii = [];
            for (let i = 0; i < 107; i++) {
                const b = ZRamReader.u8(mem, ptr + i);
                bytes.push(b);
                ascii.push((b >= 32 && b < 127) ? String.fromCharCode(b) : ".");
            }
            const words = [];
            for (let i = 0; i + 1 < 107; i += 2) {
                const v = ZRamReader.u16(mem, ptr + i);
                words.push({
                    off: i,
                    v,
                    n: (v >= 1 && v <= count) ? (ZRamReader.shortName(mem, v) || "") : ""
                });
            }
            const asRoomNum = bytes.map((b, i) => ({
                off: i, b,
                room: (b >= 1 && b <= 121) ? ("C_ROOMS_" + b) : "",
                obj: (b >= 25 && b <= 146) ? (ZRamReader.shortName(mem, b) || "") : ""
            })).filter((x) => x.room || x.obj);
            return { ptr, bytes, ascii: ascii.join(""), words, asRoomNum };
        }
        const roomId = p && p.roomId;
        const samples = [25, 26, 27, 28, 29, 30, roomId].filter((v, i, a) => a.indexOf(v) === i);
        const recs = samples.map((id) => {
            const b = blob(id);
            return {
                id,
                name: ZRamReader.shortName(mem, id),
                ptr: b && b.ptr,
                ascii: b && b.ascii,
                bytesHead: b && b.bytes.slice(0, 32),
                roomish: b && b.asRoomNum.slice(0, 20),
                wordsHead: b && b.words.slice(0, 16)
            };
        });
        const text = document.body.innerText || "";
        return {
            roomId,
            roomName: p && p.roomName,
            exitMentions: (text.match(/Exit \d+[^.]*\./gi) || []).slice(-6),
            recs,
            textTail: text.slice(-400)
        };
    });
    const out = path.join("tools", "screenshots", "matrix", "wump-blob-probe.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(info, null, 2));
    console.log(JSON.stringify(info, null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
