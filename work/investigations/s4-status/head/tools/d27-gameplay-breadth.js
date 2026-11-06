/**
 * D27 real-gameplay breadth (not Alley-only).
 *
 * Alley/Anchorhead already has:
 *   tools/alley-ram-actionable-regression.js + tools/screenshots/alley/ram-alley.png
 *   tools/phase2-gameplay-proof.js + tools/screenshots/alley/phase2-*.png
 *
 * This fixture proves the same actionable/map/radial surfaces on other catalog
 * stories, including post-move rooms. Empty overlay on unresolved rooms is
 * D24-correct and recorded, not backfilled.
 *
 * Usage: node tools/d27-gameplay-breadth.js
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

const OUT = path.join("tools", "screenshots", "d27");

function pickStory(re) {
    const files = fs.readdirSync("games");
    const hit = files.find((f) => re.test(f));
    if (!hit) throw new Error("catalog story not found: " + re);
    return "games/" + hit;
}

const STORIES = [
    {
        name: "lostpig",
        re: /LostPig/i,
        cmds: ["look"],
        why: "z8 start room Outside; known id-backed marks (moon/forest/farm)"
    },
    {
        name: "advent",
        re: /^Advent\.z5\.js$/i,
        cmds: ["look"],
        why: "z5 start room At End Of Road; id-backed road/forest/stream"
    },
    {
        name: "wishbringer",
        re: /Wishbringer/i,
        cmds: ["look"],
        go: "east",
        why: "z3 Hilltop --east--> Outside Cottage (poodle/Alexis in scope after move)"
    },
    {
        name: "zork1",
        re: /Zork1/i,
        cmds: ["look"],
        go: "south",
        why: "z3 West of House --south--> South of House"
    },
    {
        name: "curses",
        re: /curses\.z5/i,
        cmds: ["look"],
        go: "east",
        why: "z5 Attic --east--> Servant's Room"
    }
];

async function command(page, text) {
    await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
    await page.waitForTimeout(900);
}

async function boot(browser, story) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + story);
    await page.waitForTimeout(1600);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 16 && !(await page.locator(".Input.LineInput").count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(280);
    }
    if (!(await page.locator(".Input.LineInput").count())) {
        await page.close();
        throw new Error("no line input after boot");
    }
    return page;
}

async function tick(page) {
    await page.evaluate(() => {
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
        try { if (window.WorldModel) WorldModel.tick(); } catch (e1) {}
        try { if (window.Actionable) Actionable.Refresh(); } catch (e2) {}
        try { if (window.ParchLockMap && ParchLockMap.Draw) ParchLockMap.Draw(); } catch (e3) {}
    });
    await page.waitForTimeout(400);
}

async function snap(page) {
    return page.evaluate(() => {
        const p = (typeof WorldModel !== "undefined") ? WorldModel.lastPayload : null;
        const marks = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)")).map((el) => ({
            noun: el.dataset.noun || "",
            id: el.dataset.objectId || null,
            kind: el.dataset.kind || null,
            text: (el.textContent || "").trim()
        }));
        const objs = ((p && p.discoveredObjects) || []).map((o) => ({
            id: o.id, name: o.name, parentId: o.parentId
        }));
        const inventory = ((p && p.inventory) || []).map((o) => ({
            id: o.id, name: o.name
        }));
        const idMarks = marks.filter((m) => m.kind !== "direction" && m.id);
        const unmatched = idMarks.filter((m) =>
            !objs.concat(inventory).some((o) => String(o.id) === String(m.id))
        );
        return {
            zvm: !!(window.__PARCHLOCK_ZVM__),
            probe: p && p.probe,
            engineMode: p && p.engineMode,
            roomName: (p && p.roomName) || (typeof ParchLockMap !== "undefined" ? ParchLockMap.CurrentRoom : "") || "",
            roomId: p && p.roomId,
            mapRoom: (typeof ParchLockMap !== "undefined") ? ParchLockMap.CurrentRoom : null,
            exits: ((p && p.exits) || []).map((e) => e.label || e.command || ""),
            objs,
            inventory,
            marks,
            idMarkCount: idMarks.length,
            unmatched,
            specialCommands: ((p && p.specialCommands) || []).map((c) => c.label || c.command)
        };
    });
}

async function shotMarks(page, slug) {
    const file = path.join(OUT, slug + "-marks.png");
    await page.screenshot({ path: file, fullPage: true });
    return file;
}

async function hideMap(page) {
    await page.evaluate(() => {
        try { if (window.ParchLockMap && ParchLockMap.Hide) ParchLockMap.Hide(); } catch (eH) {}
        try { if (window.ParchLockQol && ParchLockQol.HideRadialMenu) ParchLockQol.HideRadialMenu(); } catch (eR) {}
    });
    await page.waitForTimeout(150);
}

async function readObjectRadial(page, objectId) {
    return page.evaluate((id) => {
        const labels = Array.from(document.querySelectorAll("#radial-menu .radial-command"))
            .map((el) => el.textContent.trim());
        let synth = [];
        try {
            if (typeof ActionSynth !== "undefined" && ActionSynth.commandsForPayloadObjectId) {
                synth = ActionSynth.commandsForPayloadObjectId(id, "room").map((c) => {
                    const v = String(c.verb || "examine");
                    return v.charAt(0).toUpperCase() + v.slice(1);
                });
            }
        } catch (eS) {}
        const shown = !!(document.querySelector("#radial-menu.show") || (document.querySelector("#radial-menu") && document.querySelector("#radial-menu").classList.contains("show")));
        return { labels, synth, shown };
    }, objectId);
}

async function shotObjectRadial(page, slug, info) {
    await hideMap(page);
    const target = (info.marks || []).find((m) => m.kind === "object" && m.id)
        || (info.marks || []).find((m) => m.kind !== "direction" && m.id);
    if (!target) return { skipped: "no-id-backed-mark" };
    const box = await page.evaluate((id) => {
        const el = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)"))
            .find((n) => n.dataset.objectId === String(id) && n.getBoundingClientRect().width > 0);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: el.dataset.objectId, noun: el.dataset.noun };
    }, target.id);
    let openedHow = "mouse";
    if (box) {
        await page.mouse.click(box.x, box.y, { button: "right" });
        await page.waitForTimeout(400);
    }
    let visible = await page.locator("#radial-menu").isVisible();
    if (!visible) {
        openedHow = "Actionable.Open";
        await page.evaluate((t) => {
            const x = Math.max(80, Math.min(window.innerWidth - 80, 420));
            const y = Math.max(80, Math.min(window.innerHeight - 80, 280));
            Actionable.Open(t.noun, "object", x, y, t.id);
        }, { noun: target.noun, id: target.id });
        await page.waitForTimeout(400);
        visible = await page.locator("#radial-menu").isVisible();
    }
    if (!visible) return { ok: false, err: "object-radial-not-visible", noun: target.noun, id: target.id };
    const radial = await readObjectRadial(page, target.id);
    const file = path.join(OUT, slug + "-object-radial.png");
    await page.screenshot({ path: file });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const missing = (radial.synth || []).filter((lab) => radial.labels.indexOf(lab) < 0);
    return {
        ok: missing.length === 0 && radial.labels.indexOf("Examine") >= 0,
        file,
        noun: target.noun,
        id: target.id,
        labels: radial.labels,
        synth: radial.synth,
        missing,
        openedHow
    };
}

async function shotInputRadial(page, slug) {
    await hideMap(page);
    const inputBox = await page.locator(".Input.LineInput").boundingBox();
    if (!inputBox) return { ok: false, err: "no-line-input" };
    await page.mouse.click(inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2, { button: "right" });
    await page.waitForTimeout(400);
    const visible = await page.locator("#radial-menu").isVisible();
    if (!visible) return { ok: false, err: "input-radial-not-visible" };
    const labels = await page.evaluate(() =>
        Array.from(document.querySelectorAll("#radial-menu .radial-command")).map((el) => el.textContent.trim())
    );
    const file = path.join(OUT, slug + "-input-radial.png");
    await page.screenshot({ path: file });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const chrome = ["Undo", "Save", "Restore", "Map", "History", "Transcript"];
    const missingChrome = chrome.filter((lab) => labels.indexOf(lab) < 0);
    return { ok: missingChrome.length === 0, file, labels, missingChrome };
}

async function shotMap(page, slug) {
    try {
        await page.evaluate(() => {
            if (window.ParchLockMap && ParchLockMap.Show) ParchLockMap.Show();
        });
        await page.waitForTimeout(300);
    } catch (eM) {}
    const file = path.join(OUT, slug + "-map.png");
    await page.screenshot({ path: file, fullPage: true });
    return file;
}

function recordRoom(info, shots, extra) {
    return {
        roomName: info.roomName,
        roomId: info.roomId,
        probe: info.probe,
        engineMode: info.engineMode,
        zvm: info.zvm,
        idMarkCount: info.idMarkCount,
        marks: (info.marks || []).slice(0, 16),
        objs: (info.objs || []).slice(0, 16),
        unmatched: info.unmatched,
        exits: info.exits,
        shots,
        extra: extra || {}
    };
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const chrome = process.env.PW_CHROME || undefined;
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    const results = [];
    try {
        for (const spec of STORIES) {
            const row = { name: spec.name, why: spec.why, ok: false, err: null };
            let page;
            try {
                row.story = pickStory(spec.re);
                page = await boot(browser, row.story);
                for (const c of spec.cmds) await command(page, c);
                await tick(page);
                const start = await snap(page);
                if (!start.zvm) throw new Error("ZVM not captured");
                if (!start.probe || start.probe.status !== "z-ram-live") {
                    throw new Error("probe not z-ram-live: " + JSON.stringify(start.probe));
                }
                if ((start.unmatched || []).length) {
                    throw new Error("id-backed marks not in payload: " + JSON.stringify(start.unmatched));
                }

                const startSlug = spec.name + "-start";
                await hideMap(page);
                const startShots = { marks: await shotMarks(page, startSlug) };
                const startObj = await shotObjectRadial(page, startSlug, start);
                startShots.objectRadial = startObj.file || null;
                const startIn = await shotInputRadial(page, startSlug);
                startShots.inputRadial = startIn.file || null;
                startShots.map = await shotMap(page, startSlug);
                row.start = recordRoom(start, startShots, { objectRadial: startObj, inputRadial: startIn });

                if (spec.go) {
                    await command(page, spec.go);
                    await tick(page);
                    const moved = await snap(page);
                    if (!moved.probe || moved.probe.status !== "z-ram-live") {
                        throw new Error("post-move probe not z-ram-live: " + JSON.stringify(moved.probe));
                    }
                    if (moved.roomId && start.roomId && moved.roomId === start.roomId) {
                        throw new Error("move did not change roomId (still " + start.roomId + " " + start.roomName + ")");
                    }
                    if ((moved.unmatched || []).length) {
                        throw new Error("post-move unmatched marks: " + JSON.stringify(moved.unmatched));
                    }
                    const movedSlug = spec.name + "-moved";
                    await hideMap(page);
                    const movedShots = { marks: await shotMarks(page, movedSlug) };
                    const movedObj = await shotObjectRadial(page, movedSlug, moved);
                    movedShots.objectRadial = movedObj.file || null;
                    const movedIn = await shotInputRadial(page, movedSlug);
                    movedShots.inputRadial = movedIn.file || null;
                    movedShots.map = await shotMap(page, movedSlug);
                    row.moved = recordRoom(moved, movedShots, { objectRadial: movedObj, inputRadial: movedIn });
                }

                const startNeedsRadial = start.idMarkCount > 0;
                const movedNeedsRadial = !!(row.moved && row.moved.idMarkCount > 0);
                const uiLive = startNeedsRadial || movedNeedsRadial;
                const startRadialOk = !startNeedsRadial || startObj.ok === true;
                const movedRadial = row.moved && row.moved.extra && row.moved.extra.objectRadial;
                const movedRadialOk = !movedNeedsRadial || (movedRadial && movedRadial.ok === true);
                const inputOk = startIn.ok === true || (row.moved && row.moved.extra && row.moved.extra.inputRadial && row.moved.extra.inputRadial.ok === true);
                if (!uiLive) {
                    row.mode = "z-ram-live-no-printed-marks";
                    row.ok = true;
                    row.note = "D24-correct empty overlay (scope objects not printed); screenshots still captured";
                } else if (!startRadialOk || !movedRadialOk) {
                    throw new Error("object radial missing ActionSynth verbs: " + JSON.stringify({
                        start: startObj,
                        moved: movedRadial || null
                    }));
                } else if (!inputOk) {
                    throw new Error("input radial missing chrome: " + JSON.stringify(startIn));
                } else {
                    row.mode = "structural-ui";
                    row.ok = true;
                }
            } catch (e) {
                row.ok = false;
                row.err = String(e && e.message || e);
            }
            if (page) await page.close().catch(() => {});
            results.push(row);
            console.log(
                (row.ok ? "PASS" : "FAIL"),
                row.name,
                row.mode || "",
                row.err || (row.start && row.start.roomName + " marks=" + row.start.idMarkCount)
            );
        }
    } finally {
        await browser.close();
    }

    const structural = results.filter((r) => r.ok && r.mode === "structural-ui");
    const withMove = results.filter((r) => r.ok && r.moved && r.moved.roomId && r.start && r.start.roomId && r.moved.roomId !== r.start.roomId);
    const failed = results.filter((r) => !r.ok);
    const proof = {
        gate: "D27",
        alleyAlreadyProven: [
            "tools/screenshots/alley/ram-alley.png",
            "tools/screenshots/alley/phase2-marks.png",
            "tools/screenshots/alley/phase2-object-radial.png",
            "tools/screenshots/alley/phase2-input-radial.png",
            "tools/screenshots/alley/phase2-inventory.png"
        ],
        total: results.length,
        passed: results.length - failed.length,
        structuralUi: structural.map((r) => r.name),
        postMove: withMove.map((r) => r.name + ":" + r.start.roomName + "->" + r.moved.roomName),
        failed: failed.map((f) => f.name + ": " + f.err),
        results
    };
    fs.writeFileSync(path.join(OUT, "d27-breadth.json"), JSON.stringify(proof, null, 2));
    console.log(JSON.stringify({
        total: proof.total,
        passed: proof.passed,
        structuralUi: proof.structuralUi,
        postMove: proof.postMove,
        failed: proof.failed
    }, null, 2));
    // Breadth gate: at least 3 non-Alley stories with id-backed marks + radials,
    // and at least 2 of those with a real post-move room change.
    if (failed.length) process.exitCode = 1;
    else if (structural.length < 3) {
        console.error("FAIL: need >=3 non-Alley structural-ui stories, got " + structural.length);
        process.exitCode = 1;
    } else if (withMove.length < 2) {
        console.error("FAIL: need >=2 post-move rooms, got " + withMove.length);
        process.exitCode = 1;
    } else {
        console.log("PASS: D27 breadth screenshots across " + structural.length + " non-Alley stories, " + withMove.length + " post-move");
    }
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
