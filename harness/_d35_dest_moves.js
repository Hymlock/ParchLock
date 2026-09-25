/**
 * D35 dest-resolution MOVE confirmation (read-only, not a gate).
 *
 * Reboots wump2ka until the start room is walkable (not a flooded
 * dead-end), then types xN / first/second/third with prompt-visible
 * + real PC-parent change required before scoring a correspondence.
 *
 * Does not implement pushExit-style destination-backed exits.
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
    const story = pathToFileURL(path.resolve("play.html")).href + "?story=games/wump2ka.z5.js";

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
    async function waitLine(max = 20) {
        for (let i = 0; i < max; i++) {
            if (await hasLine()) return true;
            await page.keyboard.press("Space");
            await page.waitForTimeout(180);
        }
        return hasLine();
    }

    async function bootUntilWalkable() {
        for (let attempt = 1; attempt <= 10; attempt++) {
            await page.goto(story);
            await page.waitForTimeout(1600);
            await page.evaluate(() => { if (window.Message) Message.Hide(); });
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
            const buf = await bufferText();
            const flooded = /fills the entire room with water|too (?:strong|deep|fast) to|can't (?:swim|go through)/i.test(buf.slice(-1200));
            const hasExit = /Exit\s+1/i.test(buf);
            if (hasExit && !flooded) return { attempt, flooded: false, tail: buf.slice(-500) };
            if (attempt === 10) return { attempt, flooded: true, tail: buf.slice(-500) };
        }
        return { attempt: 0, flooded: true, tail: "" };
    }

    const boot = await bootUntilWalkable();

    async function snapMove() {
        return page.evaluate(() => {
            try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
            const mem = ZRamProvider.getMem();
            if (!mem) return { error: "no-mem" };
            const h = ZRamReader.header(mem);
            const count = ZRamReader.objectCount(mem, h);
            const snap = ZRamReader.snapshot(mem);
            const doorDirs = ZRamReader.directionDoorDirs(mem).filter((d) => d >= 64);
            function indivOf(id) {
                return ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, id, 3));
            }
            const roomSet = {};
            for (let id = 1; id <= count; id++) {
                const t = indivOf(id);
                if (!ZRamReader.isIndivTable(t)) continue;
                if (!doorDirs.some((d) => t[d] != null || Object.prototype.hasOwnProperty.call(t, String(d)))) continue;
                roomSet[id] = ZRamReader.shortName(mem, id) || "";
            }
            let pc = null;
            for (let id = 1; id <= count; id++) {
                const nm = ZRamReader.shortName(mem, id) || "";
                if (!/^\(CustomPlayer\)$/i.test(nm)) continue;
                const o = ZRamReader.objectLinks(mem, id);
                pc = {
                    id,
                    parent: o && o.parent,
                    parentName: o && o.parent ? (roomSet[o.parent] || ZRamReader.shortName(mem, o.parent) || "") : "",
                    kids: ZRamReader.children(mem, id).length
                };
                break;
            }
            const loc = pc && pc.parent && roomSet[pc.parent] ? pc.parent : 0;
            const t = loc ? indivOf(loc) : {};
            const slots = {};
            const populated = [];
            doorDirs.forEach((d) => {
                const raw = t[d] || 0;
                slots[d] = raw;
                if (raw) populated.push(d);
            });
            const buf = $("#windowport .BufferWindow").text() || "";
            const printed = [];
            const re = /(?:You are (?:back )?in room #(\d+)|Room #(\d+))/gi;
            let m;
            while ((m = re.exec(buf))) printed.push(+(m[1] || m[2]));
            return {
                snapRoomId: snap.roomId,
                loc,
                locName: loc ? (roomSet[loc] || "") : "",
                pc,
                slots,
                populated,
                printedRoomNums: printed.slice(-4),
                exitMentions: (buf.match(/Exit\s+\d+[^\n.]{0,90}/gi) || []).slice(-6),
                promptVisible: /Exit\s+\d+/i.test(buf.slice(-1400)),
                dead: /you (have (been )?died|are dead)|game over|would you like to/i.test(buf.slice(-500)),
                flooded: /fills the entire room with water/i.test(buf.slice(-800)),
                tail: buf.slice(-480)
            };
        });
    }

    const trials = [];
    async function tryCommand(cmd, phase) {
        const before = await snapMove();
        const bufBefore = await bufferText();
        const okInject = await inject(cmd);
        await waitLine();
        await page.waitForTimeout(350);
        const after = await snapMove();
        const bufAfter = await bufferText();
        const delta = bufAfter.slice(Math.max(0, bufBefore.length - 40));
        const parserReject = /not a verb I recognise|don't understand|can't see any such|that's not a direction|no exits lead/i.test(delta);
        const moved = !!(before.loc && after.loc && before.loc !== after.loc);
        const printedMoved = !!(before.printedRoomNums && after.printedRoomNums
            && after.printedRoomNums.length
            && after.printedRoomNums[after.printedRoomNums.length - 1]
                !== (before.printedRoomNums[before.printedRoomNums.length - 1] || 0));
        const matched = [];
        if (moved && before.slots) {
            Object.keys(before.slots).forEach((d) => {
                if (before.slots[d] && before.slots[d] === after.loc) matched.push(+d);
            });
        }
        const ordinal = before.populated || [];
        const xn = /^\s*x(\d+)\s*$/i.test(cmd) ? +RegExp.$1 : 0;
        const ordinalHit = (moved && xn) ? (ordinal[xn - 1] || null) : null;
        const row = {
            phase, cmd, okInject,
            promptVisible: !!before.promptVisible,
            parserReject, moved, printedMoved,
            matchedDprop: matched,
            uniqueMatch: matched.length === 1 ? matched[0] : null,
            ordinalDprop: ordinalHit,
            ordinalAgreed: !!(ordinalHit && matched.length === 1 && matched[0] === ordinalHit),
            from: {
                loc: before.loc, name: before.locName, populated: before.populated,
                slots: before.slots, printed: before.printedRoomNums,
                exits: before.exitMentions, snap: before.snapRoomId, flooded: before.flooded
            },
            to: {
                loc: after.loc, name: after.locName, populated: after.populated,
                printed: after.printedRoomNums, dead: after.dead, snap: after.snapRoomId
            },
            textDelta: delta.replace(/\s+/g, " ").slice(-280)
        };
        trials.push(row);
        return row;
    }

    const start = await snapMove();
    await tryCommand("1", "parser-probe");
    await tryCommand("x1", "start-room");
    if (!trials[trials.length - 1].moved) {
        await tryCommand("first", "start-room-fallback");
    }

    const numberedCmds = ["x1", "x2", "x3", "x4"];
    for (const cmd of numberedCmds) {
        const here = await snapMove();
        if (here.dead) break;
        const r = await tryCommand(cmd, "pass-" + cmd);
        if (r.to && r.to.dead) break;
        if (r.moved) {
            for (let hop = 0; hop < 3; hop++) {
                const r2 = await tryCommand(cmd, "chain-" + cmd);
                if (!r2.moved || (r2.to && r2.to.dead)) break;
            }
        }
    }

    for (let hop = 0; hop < 14; hop++) {
        const here = await snapMove();
        if (here.dead) break;
        // Prefer higher numbered slots when present so x4/x5 are not
        // starved by the 93-populated super-set (prefix pattern, no gaps).
        let cmd = "x1";
        if (here.slots && here.slots[95] && here.promptVisible) cmd = "x5";
        else if (here.slots && here.slots[94] && here.promptVisible) cmd = hop % 2 === 0 ? "x4" : "x3";
        else if (here.slots && here.slots[93] && here.promptVisible) cmd = hop % 3 === 0 ? "x3" : (hop % 3 === 1 ? "x2" : "x1");
        else if (here.slots && here.slots[92] && here.promptVisible && hop % 2 === 1) cmd = "x2";
        const r = await tryCommand(cmd, "mix");
        if (r.to && r.to.dead) break;
    }

    const here = await snapMove();
    if (here.promptVisible && !here.dead) {
        await tryCommand("first", "word-probe");
        const h2 = await snapMove();
        if (h2.promptVisible && !h2.dead) await tryCommand("second", "word-probe");
        const h3 = await snapMove();
        if (h3.promptVisible && !h3.dead && h3.slots && h3.slots[93]) await tryCommand("third", "word-probe");
        const h4 = await snapMove();
        if (h4.promptVisible && !h4.dead && h4.slots && h4.slots[94]) await tryCommand("fourth", "word-probe");
    }

    await browser.close();

    const scored = trials.filter((t) => t.promptVisible && t.moved && !t.parserReject);
    const correspondence = {};
    scored.forEach((t) => {
        if (!correspondence[t.cmd]) {
            correspondence[t.cmd] = {
                n: 0, unique91: 0, unique92: 0, unique93: 0, unique94: 0, unique95: 0,
                multi: 0, none: 0, ordinalAgreed: 0, samples: []
            };
        }
        const c = correspondence[t.cmd];
        c.n++;
        if (t.uniqueMatch) c["unique" + t.uniqueMatch] = (c["unique" + t.uniqueMatch] || 0) + 1;
        else if (t.matchedDprop.length > 1) c.multi++;
        else c.none++;
        if (t.ordinalAgreed) c.ordinalAgreed++;
        if (c.samples.length < 5) {
            c.samples.push({ from: t.from.loc, to: t.to.loc, pop: t.from.populated, unique: t.uniqueMatch, printed: t.to.printed });
        }
    });

    const out = {
        boot,
        start: { loc: start.loc, name: start.locName, populated: start.populated, slots: start.slots, flooded: start.flooded, prompt: start.promptVisible },
        trialCount: trials.length,
        scoredMoves: scored.length,
        correspondence,
        hypothesis: {
            moveConfirmed: scored.length > 0,
            x1Is91: scored.filter((t) => t.cmd === "x1" && t.uniqueMatch === 91).length,
            x1Total: scored.filter((t) => t.cmd === "x1").length,
            x2Is92: scored.filter((t) => t.cmd === "x2" && t.uniqueMatch === 92).length,
            x2Total: scored.filter((t) => t.cmd === "x2").length,
            x3Is93: scored.filter((t) => t.cmd === "x3" && t.uniqueMatch === 93).length,
            x3Total: scored.filter((t) => t.cmd === "x3").length,
            x4Is94: scored.filter((t) => t.cmd === "x4" && t.uniqueMatch === 94).length,
            x4Total: scored.filter((t) => t.cmd === "x4").length,
            firstIs91: scored.filter((t) => t.cmd === "first" && t.uniqueMatch === 91).length,
            secondIs92: scored.filter((t) => t.cmd === "second" && t.uniqueMatch === 92).length,
            thirdIs93: scored.filter((t) => t.cmd === "third" && t.uniqueMatch === 93).length,
            anyMismatch: scored.filter((t) => {
                if (!t.uniqueMatch) return true;
                if (t.cmd === "x1" || t.cmd === "first") return t.uniqueMatch !== 91;
                if (t.cmd === "x2" || t.cmd === "second") return t.uniqueMatch !== 92;
                if (t.cmd === "x3" || t.cmd === "third") return t.uniqueMatch !== 93;
                if (t.cmd === "x4") return t.uniqueMatch !== 94;
                if (t.cmd === "x5") return t.uniqueMatch !== 95;
                return false;
            }).length,
            ordinalAlways: scored.length > 0 && scored.filter((t) => /^x\d+$/i.test(t.cmd)).every((t) => t.ordinalAgreed)
        },
        trials: trials.map((t) => ({
            phase: t.phase, cmd: t.cmd,
            prompt: t.promptVisible, reject: t.parserReject,
            moved: t.moved, printedMoved: t.printedMoved,
            unique: t.uniqueMatch, matched: t.matchedDprop,
            ordinal: t.ordinalDprop, ordinalOk: t.ordinalAgreed,
            from: t.from, to: t.to, delta: t.textDelta
        }))
    };

    const outPath = path.join("tools", "screenshots", "matrix", "d35-dest-moves.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(JSON.stringify({
        boot,
        start: out.start,
        trialCount: out.trialCount,
        scoredMoves: out.scoredMoves,
        correspondence: out.correspondence,
        hypothesis: out.hypothesis,
        trials: out.trials.map((t) => ({
            phase: t.phase, cmd: t.cmd, prompt: t.prompt, reject: t.reject,
            moved: t.moved, printedMoved: t.printedMoved,
            unique: t.unique, matched: t.matched, ordinalOk: t.ordinalOk,
            from: t.from.loc + ":" + t.from.name + " pop=" + (t.from.populated || []).join(","),
            to: t.to.loc + ":" + t.to.name,
            delta: t.delta
        }))
    }, null, 2));
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
