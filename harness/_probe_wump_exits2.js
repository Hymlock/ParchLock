const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
process.chdir(path.resolve(__dirname, ".."));

(async () => {
    const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/wump2ka.z5.js");
    await page.waitForTimeout(1500);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 40; i++) {
        const has = await page.locator(".Input.LineInput").count();
        const t = await page.evaluate(() => (document.body.innerText || ""));
        if (has && /exit\s*1|you are|jagged|chamber|polished/i.test(t)) break;
        if (has && i > 12) break;
        await page.keyboard.press("Space");
        await page.waitForTimeout(200);
    }
    async function inject(cmd) {
        if (!(await page.locator(".Input.LineInput").count())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(800);
        return true;
    }
    await inject("look");
    const snap = await page.evaluate(() => {
        try { ZvmCapture.tick(); WorldModel.tick(); } catch (e) {}
        const mem = ZRamProvider.getMem();
        const p = WorldModel.lastPayload;
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
        const len = mem.byteLength || mem.length;
        function u16(a) { return ZRamReader.u16(mem, a); }
        const text = (document.body.innerText || "").slice(-1200);
        const stats = (document.querySelector("#map-stats") && document.querySelector("#map-stats").textContent) || "";
        const roomId = (p && p.roomId) || 0;
        const globals = [];
        for (let g = 0; g < 80; g++) {
            const val = u16(h.globals + g * 2);
            if (val >= 1 && val <= count) {
                const nm = ZRamReader.shortName(mem, val) || "";
                if (/C_ROOMS|exit|CustomPlayer|self/i.test(nm) || g < 20) globals.push({ g, val, nm });
            }
        }
        const objHits = [];
        const scanMax = Math.min(len - 760, 60000);
        for (let addr = 256; addr < scanMax; addr += 2) {
            let roomOk = 0, roomZero = 0, roomNoise = 0;
            for (let id = 25; id <= 145; id++) {
                const v = u16(addr + id * 2);
                if (v >= 25 && v <= 145) roomOk++;
                else if (v === 0) roomZero++;
                else roomNoise++;
            }
            if (roomOk >= 40 && roomNoise <= 20) {
                objHits.push({
                    addr, roomOk, roomZero, roomNoise,
                    atRoom: roomId ? u16(addr + roomId * 2) : 0,
                    at38: u16(addr + 38 * 2),
                    at37: u16(addr + 37 * 2)
                });
            }
        }
        objHits.sort((a, b) => b.roomOk - a.roomOk);
        function listProps(id) {
            const obj = ZRamReader.objectLinks(mem, id);
            if (!obj) return [];
            let addr = obj.props;
            const textLen = ZRamReader.u8(mem, addr);
            addr += 1 + textLen * 2;
            const props = [];
            let guard = 0;
            while (guard++ < 80) {
                const sizebyte = ZRamReader.u8(mem, addr);
                if (!sizebyte) break;
                let num, sz, dataAddr;
                num = sizebyte & 0x3f;
                if (sizebyte & 0x80) {
                    const sb2 = ZRamReader.u8(mem, addr + 1);
                    sz = sb2 & 0x3f; if (!sz) sz = 64;
                    dataAddr = addr + 2; addr = dataAddr + sz;
                } else {
                    sz = (sizebyte & 0x40) ? 2 : 1;
                    dataAddr = addr + 1; addr = dataAddr + sz;
                }
                const words = [];
                for (let i = 0; i + 1 < sz; i += 2) words.push(ZRamReader.u16(mem, dataAddr + i));
                if (sz === 1) words.push(ZRamReader.u8(mem, dataAddr));
                props.push({ num, sz, words: words.slice(0, 8) });
            }
            return props;
        }
        const kids = roomId ? ZRamReader.children(mem, roomId).map((c) => ({ id: c, name: ZRamReader.shortName(mem, c) })) : [];
        return {
            stats, text,
            roomId, roomName: p && p.roomName,
            exits: (p && p.exits) || [],
            playerId: p && p.probe && p.probe.playerId,
            customParent: (function () {
                const o = ZRamReader.objectLinks(mem, 171);
                return o && { parent: o.parent, name: ZRamReader.shortName(mem, o.parent) };
            })(),
            kids,
            roomProps: roomId ? listProps(roomId) : [],
            globals,
            objHits: objHits.slice(0, 12),
            lookAhead: roomId ? ZRamReader.lookAheadExits(mem, roomId) : []
        };
    });
    console.log("BEFORE MOVE", JSON.stringify({
        stats: snap.stats, roomId: snap.roomId, roomName: snap.roomName,
        exits: snap.exits, kids: snap.kids, roomProps: snap.roomProps,
        lookAhead: snap.lookAhead, objHits: snap.objHits, globals: snap.globals,
        customParent: snap.customParent, text: (snap.text || "").slice(-800)
    }, null, 2));
    await inject("1");
    await inject("look");
    const after = await page.evaluate(() => {
        try { ZvmCapture.tick(); WorldModel.tick(); } catch (e) {}
        const mem = ZRamProvider.getMem();
        const p = WorldModel.lastPayload;
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
        const text = (document.body.innerText || "").slice(-800);
        const stats = (document.querySelector("#map-stats") && document.querySelector("#map-stats").textContent) || "";
        const globals = [];
        for (let g = 0; g < 80; g++) {
            const val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val >= 1 && val <= count) {
                const nm = ZRamReader.shortName(mem, val) || "";
                if (/C_ROOMS|exit|CustomPlayer/i.test(nm)) globals.push({ g, val, nm });
            }
        }
        const custom = ZRamReader.objectLinks(mem, 171);
        return {
            stats, text,
            roomId: p && p.roomId, roomName: p && p.roomName,
            exits: p && p.exits,
            customParent: custom && { parent: custom.parent, name: ZRamReader.shortName(mem, custom.parent) },
            globals,
            map: (typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms)
                ? ParchLockMap.Rooms.map((r) => ({ name: r.Name, exits: Object.keys(r.Exits || {}), meta: Object.keys(r.ExitMeta || {}) }))
                : []
        };
    });
    console.log("AFTER 1", JSON.stringify(after, null, 2));
    fs.writeFileSync("tools/screenshots/matrix/wump-exits-probe2.json", JSON.stringify({ before: snap, after }, null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
