/**
 * D35 follow-up: get a clean x3/third move from a room with slot 93 populated.
 * Read-only research; not a gate.
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

(async () => {
    const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({
        executablePath: fs.existsSync(chrome) ? chrome : undefined,
        headless: true
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/wump2ka.z5.js");
    await page.waitForTimeout(1800);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });

    async function hasLine() {
        return (await page.locator(".Input.LineInput").count()) > 0;
    }
    async function bufferText() {
        return page.evaluate(() => ($("#windowport .BufferWindow").text() || ""));
    }
    async function inject(cmd) {
        if (!(await hasLine())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(1400);
        return true;
    }
    async function fillEnter(cmd) {
        const loc = page.locator(".Input.LineInput").first();
        if (!(await loc.count())) return false;
        await loc.fill(cmd);
        await loc.press("Enter");
        await page.waitForTimeout(1400);
        return true;
    }
    async function waitLine(max = 16) {
        for (let i = 0; i < max; i++) {
            if (await hasLine()) return true;
            await page.keyboard.press("Space");
            await page.waitForTimeout(180);
        }
        return hasLine();
    }

    for (let i = 0; i < 70; i++) {
        const t = await page.evaluate(() => (document.body.innerText || ""));
        const has = await hasLine();
        if (/yes or no|restore a saved game/i.test(t) && has) { await inject("n"); continue; }
        if (/Exit 1/i.test(t) && has) break;
        await page.keyboard.press("Space");
        await page.waitForTimeout(160);
    }
    await inject("look");
    await waitLine();

    async function snap() {
        return page.evaluate(() => {
            try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
            const mem = ZRamProvider.getMem();
            const h = ZRamReader.header(mem);
            const count = ZRamReader.objectCount(mem, h);
            const numbered = ZRamReader.directionDoorDirs(mem).filter((d) => d >= 64);
            function indivOf(id) {
                return ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, id, 3));
            }
            const roomSet = {};
            for (let id = 1; id <= count; id++) {
                const t = indivOf(id);
                if (!ZRamReader.isIndivTable(t)) continue;
                if (!numbered.some((d) => t[d] != null || Object.prototype.hasOwnProperty.call(t, String(d)))) continue;
                roomSet[id] = ZRamReader.shortName(mem, id) || "";
            }
            let pc = null;
            for (let id = 1; id <= count; id++) {
                const nm = ZRamReader.shortName(mem, id) || "";
                if (!/^\(CustomPlayer\)$/i.test(nm)) continue;
                const o = ZRamReader.objectLinks(mem, id);
                pc = { id, parent: o && o.parent, parentName: o && o.parent ? (roomSet[o.parent] || ZRamReader.shortName(mem, o.parent) || "") : "" };
                break;
            }
            const loc = pc && pc.parent && roomSet[pc.parent] ? pc.parent : 0;
            const t = loc ? indivOf(loc) : {};
            const slots = {};
            numbered.forEach((d) => { slots[d] = t[d] || 0; });
            const buf = $("#windowport .BufferWindow").text() || "";
            return {
                loc, locName: loc ? roomSet[loc] : "", pc, slots,
                populated: numbered.filter((d) => t[d]),
                promptVisible: /Exit\s+\d+/i.test(buf.slice(-1400)),
                dead: /you (have (been )?died|are dead)|game over/i.test(buf.slice(-400)),
                tail: buf.slice(-500)
            };
        });
    }

    const trials = [];
    async function tryCmd(how, cmd) {
        const before = await snap();
        const bufBefore = await bufferText();
        if (how === "fill") await fillEnter(cmd);
        else await inject(cmd);
        await waitLine();
        await page.waitForTimeout(300);
        const after = await snap();
        const bufAfter = await bufferText();
        const moved = !!(before.loc && after.loc && before.loc !== after.loc);
        const matched = [];
        Object.keys(before.slots || {}).forEach((d) => {
            if (before.slots[d] && before.slots[d] === after.loc) matched.push(+d);
        });
        const row = {
            how, cmd, moved,
            uniqueMatch: matched.length === 1 ? matched[0] : null,
            matched,
            promptVisible: !!before.promptVisible,
            from: { loc: before.loc, name: before.locName, populated: before.populated, slots: before.slots },
            to: { loc: after.loc, name: after.locName, populated: after.populated },
            beforeTail: (before.tail || "").slice(-220),
            afterTail: (after.tail || "").slice(-220),
            delta: bufAfter.slice(Math.max(0, bufBefore.length - 20)).slice(-280)
        };
        trials.push(row);
        return row;
    }

    // Hop with x1/x2 until we sit in a room with slot 93 populated, then fire x3/third.
    for (let i = 0; i < 12; i++) {
        const here = await snap();
        if (here.dead) break;
        if (here.slots && here.slots[93] && here.promptVisible) {
            await tryCmd("inject", "x3");
            const afterX3 = trials[trials.length - 1];
            if (!afterX3.moved) {
                await tryCmd("fill", "x3");
            }
            const here2 = await snap();
            if (here2.slots && here2.slots[93] && !trials.some((t) => t.cmd === "third" && t.moved)) {
                await tryCmd("inject", "third");
            }
            const here3 = await snap();
            if (here3.slots && here3.slots[93]) {
                await tryCmd("inject", "x 3");
            }
            break;
        }
        const hop = (here.populated || []).indexOf(92) >= 0 && i % 2 === 1 ? "x2" : "x1";
        await tryCmd("inject", hop);
        if (trials[trials.length - 1].to && (await snap()).dead) break;
    }

    await browser.close();
    const scored = trials.filter((t) => t.moved && (t.cmd === "x3" || t.cmd === "third" || t.cmd === "x 3"));
    const out = { scored: scored.length, trials };
    const outPath = path.join("tools", "screenshots", "matrix", "d35-dest-x3.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(JSON.stringify({
        scored: scored.length,
        trials: trials.map((t) => ({
            how: t.how, cmd: t.cmd, moved: t.moved, unique: t.uniqueMatch, matched: t.matched,
            from: t.from.loc + ":" + t.from.name + " pop=" + (t.from.populated || []).join(",") + " slot93=" + (t.from.slots && t.from.slots[93]),
            to: t.to.loc + ":" + t.to.name,
            delta: (t.delta || t.afterTail || "").replace(/\s+/g, " ").slice(-200)
        }))
    }, null, 2));
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
