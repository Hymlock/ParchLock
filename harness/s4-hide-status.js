// S4 (b) R2: "Hide the story's status line" on vs off.
// Seeded setup from work/investigations/regression-gate.cjs. For Sherlock and
// Curses at 396px and 1280px, asserts: readRaw + decoded metrics identical;
// the grid is hidden only when decoded metrics + a room label exist; Curses'
// multi-row grid stays visible; the VM-owned window layout (GlkOte inline
// boxes, grid rows/cols) is identical; the buffer reclaims the line.
// Screenshots -> work/investigations/s4-status/.
"use strict";
const { chromium } = require(path0("node_modules/playwright"));
function path0(p) { return require("path").resolve(__dirname, "..", p); }
const path = require("path"), fs = require("fs"), { pathToFileURL } = require("url");
const ROOT = process.env.ROOT || path0("."), OUT = path0("work/investigations/s4-status");
let fail = 0;
function check(name, ok, info) { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  " + JSON.stringify(info).slice(0, 600))); if (!ok) fail++; }

async function run(b, game, vw, hide) {
    const p = await b.newPage({ viewport: { width: vw, height: vw < 768 ? 850 : 900 } });
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
    await p.addInitScript(h => {
        sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
        for (const k of ["PL_TutorialSeen", "PL_MobileTutorialSeen", "PL_LearnedWordsTutorialSeen"]) localStorage.setItem(k, "1");
        localStorage.setItem("PL_Prefs", JSON.stringify({ HideStatusLine: h }));
    }, hide);
    await p.goto(pathToFileURL(path.resolve(ROOT, "play.html")).href + "?story=games/" + game); await p.waitForTimeout(2500);
    const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector(".parchlock-splash__start")?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator(".Input.LineInput").count()) return true; await p.keyboard.press("Space"); await p.waitForTimeout(500); } return false; };
    await settle();
    for (const c of ["look", "wait", "i"]) { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1500); await settle(); }
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
        // S4 review: a hidden D207 carry-probe row must not be read by the windowport text fallback.
        const wpEl = document.querySelector("#windowport"), probe = document.createElement("div"); probe.className = "BufferLine pl-carry-probe"; probe.setAttribute("aria-hidden", "true"); probe.style.display = "none"; probe.textContent = "ZZPROBEZZ"; (wpEl.querySelector(".BufferWindow") || wpEl).appendChild(probe);
        const probeExcluded = ZRamProvider._windowportText(wpEl).indexOf("ZZPROBEZZ") < 0; probe.remove();
        const wp = document.getElementById("windowport");
        const frames = [...wp.children].filter(e => e.classList.contains("WindowFrame"));
        const raw = StatusGridDecoder.readRaw(document), dec = StatusGridDecoder.decode(raw);
        const grids = frames.filter(e => e.classList.contains("GridWindow"));
        let visible = 0; try { visible = StatTracker.visibleStats().length; } catch (e) {}
        return { probeExcluded,
            raw, metrics: dec.metrics, roomLabel: dec.roomLabel, visibleStats: visible,
            layout: frames.map(e => ({ id: e.id, cls: e.classList.contains("GridWindow") ? "grid" : "other", left: e.style.left, top: e.style.top, right: e.style.right, bottom: e.style.bottom,
                rows: e.querySelectorAll(".GridLine").length, cols: [...e.querySelectorAll(".GridLine")].map(l => l.textContent.length) })),
            grids: grids.map(e => ({ oneline: e.classList.contains("pl-oneline-status"), visibility: getComputedStyle(e).visibility, display: getComputedStyle(e).display, top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom, rows: e.querySelectorAll(".GridLine").length })),
            buffers: frames.filter(e => !e.classList.contains("GridWindow")).map(e => ({ top: e.getBoundingClientRect().top, below: e.classList.contains("pl-status-below") })),
            hideClass: wp.classList.contains("pl-hide-status"),
            testPaneTouched: !!document.querySelector("#layout_test_pane .pl-oneline-status"),
            checkbox: (() => { try { WorkspaceUI.ShowOptions(); } catch (e) {} const c = document.getElementById("pl-hide-status-line"); const res = c ? { checked: c.checked, inInterface: !!c.closest("details") && /Accessibility & controls/.test(c.closest("details").textContent) } : null; return res; })(),
            ariaHidden: grids.some(e => e.hasAttribute("aria-hidden"))
        };
    });
    try { await p.keyboard.press("Escape"); await p.evaluate(() => { document.querySelectorAll("#game-options, .pl-options").forEach(e => { try { e.remove(); } catch (x) {} }); }); } catch (e) {}
    await p.screenshot({ path: path.join(OUT, `${game.split(".")[0]}-${vw}-hide-${hide ? "on" : "off"}.png`) });
    await p.close();
    return r;
}

(async () => {
    const b = await chromium.launch();
    const summary = {};
    for (const game of ["Sherlock.z5.js", "curses.z5.js"]) for (const vw of [396, 1280]) {
        const off = await run(b, game, vw, false), on = await run(b, game, vw, true);
        const t = `${game.split(".")[0]}@${vw}`;
        summary[t] = { off, on };
        check(t + " readRaw identical", on.raw === off.raw, [on.raw, off.raw]);
        check(t + " decoded metrics identical", JSON.stringify(on.metrics) === JSON.stringify(off.metrics), [on.metrics, off.metrics]);
        check(t + " VM window layout identical", JSON.stringify(on.layout) === JSON.stringify(off.layout), [on.layout, off.layout]);
        check(t + " option off: grid visible, no hide class", !off.hideClass && off.grids.every(g => g.visibility === "visible"), off.grids);
        const gate = on.roomLabel && (on.visibleStats || on.metrics.length) > 0 && on.grids.filter(g => g.rows === 1).length === 1;
        check(t + ` option on: hidden iff metrics+room (gate=${!!gate})`, on.hideClass === !!gate && on.grids.every(g => (g.visibility === "hidden") === (!!gate && g.rows === 1)), { gate, grids: on.grids, roomLabel: on.roomLabel, metrics: on.metrics });
        check(t + " hidden carry-probe row not read by the fallback", on.probeExcluded === true && off.probeExcluded === true, [on.probeExcluded, off.probeExcluded]);
        check(t + " never display:none", on.grids.every(g => g.display !== "none"));
        check(t + " multi-row grids stay visible", on.grids.filter(g => g.rows > 1).every(g => g.visibility === "visible"));
        check(t + " test pane untouched, no aria-hidden", !on.testPaneTouched && !on.ariaHidden);
        check(t + " checkbox present in Accessibility & controls", on.checkbox && on.checkbox.inInterface && on.checkbox.checked && off.checkbox && !off.checkbox.checked, [on.checkbox, off.checkbox]);
        if (gate) {
            const g = on.grids.find(x => x.rows === 1), bt = on.buffers.filter(x => x.below);
            check(t + " buffer reclaims the line (top == grid top)", bt.length >= 1 && bt.every(x => Math.abs(x.top - g.top) < 1.5), { g, buffers: on.buffers, offBuffers: off.buffers });
        }
    }
    fs.writeFileSync(path.join(OUT, "hide-status-results.json"), JSON.stringify(summary, null, 1));
    await b.close();
    console.log(fail ? fail + " FAIL" : "0 FAIL");
    process.exit(fail ? 1 : 0);
})();
