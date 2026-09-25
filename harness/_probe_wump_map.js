/**
 * Live dump: wump2ka numbered-exit storage (room props, direction objects, map tables).
 * Usage: node harness/_probe_wump_map.js
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
        if (/Exit 1|jagged cave|polished chamber/i.test(t) && has) break;
        if (/yes or no|restore a saved game/i.test(t) && has) {
            await inject("n");
            continue;
        }
        if (/please answer yes or no/i.test(t) && has) {
            await inject("n");
            continue;
        }
        await page.keyboard.press("Space");
        await page.waitForTimeout(160);
        if (has && i > 18 && /What do you want to do|You are/i.test(t)) break;
    }
    await inject("look");
    for (let i = 0; i < 8; i++) {
        const t = await page.evaluate(() => (document.body.innerText || ""));
        if (/Exit 1|jagged cave|polished chamber/i.test(t)) break;
        if (await page.locator(".Input.LineInput").count()) await inject("look");
        else {
            await page.keyboard.press("Space");
            await page.waitForTimeout(200);
        }
    }
    const info = await page.evaluate(() => {
        try { ZvmCapture.tick(); WorldModel.tick(); } catch (e0) {}
        const mem = ZRamProvider.getMem();
        const p = WorldModel.lastPayload;
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
        const text = (document.body.innerText || "").slice(-1500);
        const stats = (document.querySelector("#map-stats") && document.querySelector("#map-stats").textContent) || "";
        const known = Array.from(document.querySelectorAll("#rooms-list .name, #map #rooms-list .name")).map((el) => el.textContent);

        function listProps(id) {
            const obj = ZRamReader.objectLinks(mem, id);
            if (!obj || !obj.props) return [];
            let addr = obj.props;
            const textLen = ZRamReader.u8(mem, addr);
            addr += 1 + textLen * 2;
            const props = [];
            let guard = 0;
            while (guard++ < 80) {
                const sizebyte = ZRamReader.u8(mem, addr);
                if (!sizebyte) break;
                let num, sz, dataAddr;
                if (h.version <= 3) {
                    num = sizebyte & 0x1f;
                    sz = (sizebyte >> 5) + 1;
                    dataAddr = addr + 1;
                    addr = dataAddr + sz;
                } else {
                    num = sizebyte & 0x3f;
                    if (sizebyte & 0x80) {
                        const sizebyte2 = ZRamReader.u8(mem, addr + 1);
                        sz = sizebyte2 & 0x3f;
                        if (sz === 0) sz = 64;
                        dataAddr = addr + 2;
                        addr = dataAddr + sz;
                    } else {
                        sz = (sizebyte & 0x40) ? 2 : 1;
                        dataAddr = addr + 1;
                        addr = dataAddr + sz;
                    }
                }
                const words = [];
                for (let i = 0; i + 1 < sz && words.length < 24; i += 2) words.push(ZRamReader.u16(mem, dataAddr + i));
                if (sz === 1) words.push(ZRamReader.u8(mem, dataAddr));
                const decoded = words.map((w) => {
                    if (w >= 1 && w <= count) return { w, asObj: ZRamReader.shortName(mem, w) };
                    return { w };
                });
                props.push({ num, sz, words, decoded });
            }
            return props;
        }

        const roomId = (p && p.roomId) || 0;
        const compassKids = ZRamReader.children(mem, 6).map((c) => ({
            id: c,
            name: ZRamReader.shortName(mem, c),
            parent: (ZRamReader.objectLinks(mem, c) || {}).parent,
            props: listProps(c)
        }));

        // Scan for per-room connection tables: rows of object-ids in room range.
        const len = mem.byteLength || mem.length;
        const roomMin = 20;
        const roomMax = Math.min(count, 200);
        const tableHits = [];
        for (const cols of [2, 3, 4, 5, 6, 12, 17]) {
            const rows = roomMax - roomMin + 1;
            const bytes = rows * cols * 2;
            for (let addr = h.static || 0x100; addr + bytes < Math.min(len, 90000); addr += 2) {
                let good = 0, bad = 0, zeros = 0, totalEx = 0;
                for (let r = 0; r < rows; r++) {
                    let ex = 0, rowBad = 0;
                    for (let c = 0; c < cols; c++) {
                        const v = ZRamReader.u16(mem, addr + (r * cols + c) * 2);
                        if (v === 0) { zeros++; continue; }
                        if (v >= roomMin && v <= roomMax) ex++;
                        else rowBad++;
                    }
                    if (rowBad) bad++;
                    else if (ex >= 1) { good++; totalEx += ex; }
                }
                if (good >= Math.floor(rows * 0.4) && bad <= Math.floor(rows * 0.2)) {
                    const atRoom = roomId ? Array.from({ length: cols }, (_, c) => {
                        const v = ZRamReader.u16(mem, addr + ((roomId - roomMin) * cols + c) * 2);
                        return { v, n: (v >= 1 && v <= count) ? ZRamReader.shortName(mem, v) : "" };
                    }) : [];
                    tableHits.push({ addr, cols, good, bad, zeros, totalEx, atRoom });
                }
            }
        }
        tableHits.sort((a, b) => b.good - a.good || b.totalEx - a.totalEx);

        // Also scan: for each direction object, try common door_to-like props against current room.
        const dirProbe = compassKids.map((d) => {
            const hits = [];
            (d.props || []).forEach((pr) => {
                pr.words.forEach((w) => {
                    if (w >= 1 && w <= count) hits.push({ prop: pr.num, w, n: ZRamReader.shortName(mem, w) });
                });
            });
            return { id: d.id, name: d.name, hits };
        });

        const caves = [];
        for (let id = 1; id <= count; id++) {
            const nm = ZRamReader.shortName(mem, id) || "";
            if (/^C_ROOMS_/i.test(nm) || /cave|chamber|cavern/i.test(nm)) caves.push({ id, nm });
        }
        const roomProps = roomId ? listProps(roomId) : [];
        const staticMem = h.staticMem || 0;
        const follows = roomProps.map((pr) => {
            const w = pr.words[0] || 0;
            const asByte = w;
            const asPacked = w * 4;
            function peek(addr) {
                if (addr < 0 || addr + 16 >= len) return null;
                const words = [];
                for (let i = 0; i < 8; i++) words.push(ZRamReader.u16(mem, addr + i * 2));
                return words.map((v) => ({ v, n: (v >= 1 && v <= count) ? ZRamReader.shortName(mem, v) : "" }));
            }
            return { prop: pr.num, w, inDyn: w > 0 && w < staticMem, byte: peek(asByte), packed: peek(asPacked) };
        });
        const caveIds = caves.map((c) => c.id);
        const caveMin = caveIds.length ? Math.min.apply(null, caveIds) : 20;
        const caveMax = caveIds.length ? Math.max.apply(null, caveIds) : 200;
        const pairHits = [];
        if (roomId) {
            const scanEnd = Math.min(len - 8, staticMem || 80000);
            for (let addr = 64; addr < scanEnd; addr += 2) {
                const a = ZRamReader.u16(mem, addr);
                if (a !== roomId) continue;
                const b = ZRamReader.u16(mem, addr + 2);
                const c = ZRamReader.u16(mem, addr + 4);
                const d = ZRamReader.u16(mem, addr + 6);
                const isCave = (v) => v >= caveMin && v <= caveMax;
                const nearby = [b, c, d].filter(isCave);
                if (nearby.length >= 1) {
                    pairHits.push({
                        addr,
                        row: [a, b, c, d].map((v) => ({ v, n: (v >= 1 && v <= count) ? ZRamReader.shortName(mem, v) : "" }))
                    });
                }
            }
        }

        return {
            stats,
            known,
            text,
            roomId,
            roomName: p && p.roomName,
            exits: p && p.exits,
            lookAhead: roomId ? ZRamReader.lookAheadExits(mem, roomId) : [],
            roomProps,
            follows,
            pairHits: pairHits.slice(0, 20),
            caveCount: caves.length,
            caves: caves.slice(0, 30),
            caveMin,
            caveMax,
            staticMem,
            roomKids: roomId ? ZRamReader.children(mem, roomId).map((c) => ({ id: c, n: ZRamReader.shortName(mem, c) })) : [],
            objectCount: count,
            compassKids: compassKids.map((c) => ({ id: c.id, name: c.name, propNums: (c.props || []).map((x) => x.num + ":" + x.sz) })),
            firstExit: compassKids.find((c) => /first exit/i.test(c.name || "")),
            north: compassKids.find((c) => /north/i.test(c.name || "")),
            dirProbe,
            tableHits: tableHits.slice(0, 12),
            playerId: p && p.probe && p.probe.playerId,
            probe: p && p.probe
        };
    });
    const out = path.join("tools", "screenshots", "matrix", "wump-map-probe.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(info, null, 2));
    console.log(JSON.stringify({
        stats: info.stats,
        roomId: info.roomId,
        roomName: info.roomName,
        exits: info.exits,
        lookAhead: info.lookAhead,
        known: info.known,
        textTail: (info.text || "").slice(-400),
        roomProps: info.roomProps,
        firstExit: info.firstExit,
        north: info.north,
        tableHits: info.tableHits,
        follows: info.follows,
        pairHits: info.pairHits,
        caveCount: info.caveCount,
        caves: info.caves,
        compass: info.compassKids
    }, null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
