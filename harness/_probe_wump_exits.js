/**
 * One-off live dump: wump2ka room/exits/player/compass after reaching a cave.
 * Usage: node harness/_probe_wump_exits.js
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
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/wump2ka.z5.js");
    await page.waitForTimeout(1600);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 20 && !(await page.locator(".Input.LineInput").count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(250);
    }
    async function inject(t) {
        const has = await page.locator(".Input.LineInput").count();
        if (!has) {
            await page.keyboard.type(t);
            await page.keyboard.press("Enter");
        } else {
            await page.evaluate((cmd) => { Input.Clear(); Input.Inject(cmd, true); }, t);
        }
        await page.waitForTimeout(900);
    }
    for (const c of ["n", "look", "1", "look"]) {
        if (await page.locator(".Input.LineInput").count()) await inject(c);
        else {
            await page.keyboard.press("Space");
            await page.waitForTimeout(400);
        }
    }
    const info = await page.evaluate(() => {
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
        try { if (window.WorldModel) WorldModel.tick(); } catch (e1) {}
        const mem = ZRamProvider.getMem && ZRamProvider.getMem();
        const p = WorldModel && WorldModel.lastPayload;
        const text = (document.body.innerText || "").slice(0, 1800);
        const stats = (document.querySelector("#map-stats") && document.querySelector("#map-stats").textContent) || "";
        if (!mem) return { noMem: true, text, payload: p, stats };
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
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
                for (let i = 0; i + 1 < sz; i += 2) words.push(ZRamReader.u16(mem, dataAddr + i));
                if (sz === 1) words.push(ZRamReader.u8(mem, dataAddr));
                props.push({ num, sz, words: words.slice(0, 12), nWords: Math.ceil(sz / 2) });
            }
            return props;
        }
        const playerId = ZRamReader.findPlayerId(mem);
        const custom = 171;
        const ears = 378;
        function objInfo(id) {
            const o = ZRamReader.objectLinks(mem, id);
            if (!o) return { id, missing: true };
            return {
                id,
                name: ZRamReader.shortName(mem, id),
                parent: o.parent,
                parentName: o.parent ? ZRamReader.shortName(mem, o.parent) : "",
                child: o.child,
                kids: ZRamReader.children(mem, id).map((c) => ({ id: c, name: ZRamReader.shortName(mem, c) })),
                props: listProps(id)
            };
        }
        const roomId = (p && p.roomId) || 0;
        const compassKids = ZRamReader.children(mem, 6).map((c) => {
            const doorDir = ZRamReader.readProp(mem, c, 21);
            const dest = roomId ? ZRamReader.readProp(mem, roomId, doorDir) : null;
            return {
                id: c,
                name: ZRamReader.shortName(mem, c),
                doorDir,
                dest,
                destName: dest ? ZRamReader.shortName(mem, dest) : ""
            };
        });
        const locGlobals = [];
        for (let g = 0; g < 40; g++) {
            const val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val >= 1 && val <= count) {
                locGlobals.push({ g, val, name: ZRamReader.shortName(mem, val) });
            }
        }
        return {
            stats,
            text,
            playerId,
            payload: {
                roomId: p && p.roomId,
                roomName: p && p.roomName,
                exits: (p && p.exits) || [],
                scope: ((p && p.discoveredObjects) || []).slice(0, 12),
                probe: p && p.probe
            },
            player20: objInfo(20),
            customPlayer: objInfo(custom),
            ears: objInfo(ears),
            currentRoom: roomId ? objInfo(roomId) : null,
            lookAhead: roomId ? ZRamReader.lookAheadExits(mem, roomId) : [],
            compassKids,
            locGlobals,
            roomsOnMap: (typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms)
                ? ParchLockMap.Rooms.map((r) => ({ name: r.Name, exits: Object.keys(r.Exits || {}), meta: Object.keys(r.ExitMeta || {}) }))
                : []
        };
    });
    const out = path.join("tools", "screenshots", "matrix", "wump-exits-probe.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(info, null, 2));
    console.log(JSON.stringify({
        stats: info.stats,
        playerId: info.playerId,
        payload: info.payload,
        customParent: info.customPlayer && info.customPlayer.parentName,
        lookAhead: info.lookAhead,
        compass: info.compassKids,
        map: info.roomsOnMap,
        text: (info.text || "").slice(0, 600)
    }, null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
