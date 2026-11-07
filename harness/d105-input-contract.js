/**
 * D105 input-contract characterization (docs/mobile-input-plan-d105.md).
 * Group A pins behaviour that must NOT change (run green on unmodified code, then after every D105 step).
 * Group B documents the CURRENT defects the plan fixes; each B check is tagged [GAP] and is expected to FAIL
 * before the fix and PASS after it (they are reported, not counted as regressions, until D105 lands:
 * run with D105_EXPECT_FIXED=1 to require them).
 * Real touch input via CDP (Input.dispatchTouchEvent) on a 412x860 mobile page, real Anchorhead.
 * Usage: node harness/d105-input-contract.js
 */
const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");

const EXPECT_FIXED = process.env.D105_EXPECT_FIXED === "1";
let pass = 0, fail = 0, gapOpen = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS:", m); } else { fail++; console.error("FAIL:", m); } };
const gap = (c, m) => {
    if (c) { pass++; console.log("PASS: [GAP closed]", m); }
    else if (EXPECT_FIXED) { fail++; console.error("FAIL: [GAP still open]", m); }
    else { gapOpen++; console.log("OPEN: [GAP]", m); }
};

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e && e.message).slice(0, 140)));
    await page.addInitScript(() => {
        try { localStorage.setItem("PL_MobileTutorialSeen", "1"); localStorage.removeItem("PL_Prefs"); } catch (e) {}
        window.__spoken = []; window.__ckLog = [];
    });
    await page.goto(pathToFileURL(path.resolve(__dirname, "..", "play.html")).href + "?story=games/anchor.z8.js&t=" + Date.now(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
    await page.waitForTimeout(6000);
    await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });

    const cdp = await ctx.newCDPSession(page);
    const centre = (sel) => page.evaluate((s) => {
        const e = document.querySelector(s); if (!e) return null;
        const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, sel);
    const touch = async (sel, holdMs) => {
        const c = await centre(sel); if (!c) return false;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.x, y: c.y }] });
        await page.waitForTimeout(holdMs);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(250);
        return true;
    };
    const st = () => page.evaluate(() => {
        const ae = document.activeElement;
        const line = $(".Input.LineInput:visible"), chr = $(".Input.CharInput:visible");
        return {
            mode: line.length ? "line" : (chr.length ? "char" : "none"),
            radial: document.getElementById("radial-menu").classList.contains("show"),
            radialSrc: (jQuery("#radial-menu").data("context") || {}).source || null,
            pad: typeof DirectionalRadial !== "undefined" && DirectionalRadial.IsArrowModeOpen(), // D118: merged into the shared DirectionalRadial shell, #pl-arrowpad retired
            activeIsField: !!(ae && $(ae).is(".Input.LineInput, .Input.CharInput, #pl-key-proxy")),
            activeId: ae ? (ae.id || ae.className || ae.tagName) : null,
            lineFocusFlag: (window.Input && Input.KbIntent && Input.KbIntent() === "line"),
            lineInputmode: line.attr("inputmode") || null,
            charReadonly: chr.length ? chr.prop("readonly") : null,
            charInputmode: chr.attr("inputmode") || null,
            text: (document.querySelector("#windowport .BufferWindow") || { textContent: "" }).textContent
        };
    });

    // ---------- CHAR prompt (title screen) ----------
    let s = await st();
    ok(s.mode === "char", "title screen is a CHAR prompt (mode=" + s.mode + ")");
    ok(s.charReadonly === true && s.charInputmode === "none", "A: char strip is readonly/inputmode=none by default (no IME popping on its own)");
    await touch(".Input.CharInput", 60);
    s = await st();
    gap(s.activeIsField, "I1/I3: a short tap on the char strip focuses a keyboard target (active=" + s.activeId + ")");
    ok(!s.radial, "A: tapping the char strip does not open the radial");
    await touch("#windowport .BufferWindow", 60);   // a real player taps the story to put the keyboard away
    ok(await page.evaluate(() => Input.KbIntent() === null), "A: tapping the story clears the char-prompt keyboard intent");
    await touch("#pl-input-submit", 60);
    await page.waitForTimeout(2500);
    s = await st();
    ok(s.mode !== "char" || /November|deep breath/.test(s.text), "A: char submit arrow advances the startup screen");
    for (let i = 0; i < 4 && (await st()).mode === "char"; i++) { await touch("#pl-input-submit", 60); await page.waitForTimeout(2500); }

    // ---------- LINE prompt ----------
    s = await st();
    ok(s.mode === "line", "reached the LINE prompt (mode=" + s.mode + ")");
    ok(!s.lineFocusFlag && s.lineInputmode === "none" && !s.activeIsField, "A: line field starts with the keyboard closed (inputmode=none, no focus)");

    await touch(".Input.LineInput", 60);                       // short tap
    s = await st();
    ok(s.lineFocusFlag && s.lineInputmode === "text" && s.activeIsField, "A: short tap on the line field opens the keyboard (flag+inputmode=text+focus)");
    ok(!s.radial, "A: short tap does not open the radial");

    // hold with the keyboard OPEN (defect I4, live-verified: the radial opens and the keyboard closes, so native copy/paste never appears)
    await page.evaluate(() => { $(".Input.LineInput").val("hello world"); });
    await touch(".Input.LineInput", 800);
    s = await st();
    gap(!s.radial && s.lineFocusFlag && s.activeIsField, "I4: hold on a keyboard-open line field keeps the keyboard and opens NO radial (radial=" + s.radial + ", keyboard flag=" + s.lineFocusFlag + ")");
    if (s.radial) await page.evaluate(() => ParchLockQol.HideRadialMenu());
    ok(await page.evaluate(() => $(".Input.LineInput").val() === "hello world"), "A: the typed text survives the hold");
    await page.evaluate(() => { Input.Clear(); });

    // dismiss the keyboard by tapping the story, then hold with keyboard CLOSED -> radial (must stay)
    await touch("#windowport .BufferWindow", 60);
    s = await st();
    ok(!s.lineFocusFlag && !s.activeIsField, "A: tapping the story closes the keyboard");
    await touch(".Input.LineInput", 800);
    s = await st();
    ok(s.radial && s.radialSrc === "input", "A: hold on the line field (keyboard closed) opens the input radial");
    ok(!s.activeIsField, "A: that hold does not open the keyboard");
    await page.evaluate(() => ParchLockQol.HideRadialMenu());

    // submit arrow tap submits typed text; hold opens radial without submitting
    await page.evaluate(() => { Input.Clear(); $(".Input.LineInput").val("look"); });
    await touch("#pl-input-submit", 60);
    await page.waitForTimeout(2500);
    s = await st();
    ok(/Real Estate Office/.test(s.text), "A: submit arrow tap submits the typed command (game responded)");
    await page.evaluate(() => { Input.Clear(); $(".Input.LineInput").val("xyzzy-not-sent"); });
    await touch("#pl-input-submit", 800);
    s = await st();
    // T10 (operator): holding Send opens the command-history radial; the general
    // input radial stays on the input-line hold (asserted above).
    ok(s.radial && s.radialSrc === "history", "A: hold on the submit arrow opens the command-history radial");
    ok(await page.evaluate(() => $(".Input.LineInput").val() === "xyzzy-not-sent"), "A: that hold did not submit the line");
    await page.evaluate(() => { ParchLockQol.HideRadialMenu(); Input.Clear(); });

    // Tools list reachable from the radial (D102) and dismisses the keyboard
    await touch(".Input.LineInput", 800);
    ok((await st()).radial, "A: radial opens again");
    const hasTools = await page.evaluate(() => !!document.querySelector("#radial-menu .radial-tools"));
    ok(hasTools, "A: input radial keeps its Tools button (D102)");
    await page.evaluate(() => document.querySelector("#radial-menu .radial-tools").click());
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => document.getElementById("radial-menu").classList.contains("pl-tools-list")), "A: Tools opens the scrolling list");
    await page.evaluate(() => ParchLockQol.HideRadialMenu());

    // ---------- Inform menu (CHAR prompt with navigation keys) ----------
    const gridRows = () => page.evaluate(() => [...document.querySelectorAll("#windowport .GridWindow .GridLine")].map((l) => l.textContent));
    const cursorIdx = async () => (await gridRows()).findIndex((t) => /^\s*>/.test(t));
    const log = () => page.evaluate(() => window.__ckLog.splice(0));
    await page.evaluate(() => { window.__ckLog = []; });
    await page.evaluate(() => { Actionable.Submit("help"); });
    await page.waitForTimeout(3500);
    s = await st();
    ok(s.mode === "char" && await page.evaluate(() => /Things you might like to know/.test(document.body.textContent)), "A: HELP opens the Inform menu (a CHAR prompt) (mode=" + s.mode + ")");
    gap(s.pad && await page.evaluate(() => CharKeys._autoPadOwned === true), "D111: a GridWindow CHAR menu automatically opens the arrow pad");
    const startIdx = await cursorIdx();
    ok(startIdx >= 0, "menu cursor '>' is on a row (" + startIdx + ")");

    // I1/I3: tap on the strip -> proxy focus + keyboard intent
    await touch(".Input.CharInput", 60);
    s = await st();
    gap(!s.pad && s.activeId === "pl-key-proxy" && await page.evaluate(() => Input.KbIntent() === "char"), "I1/I3/D111: short-tapping the uncovered strip closes the auto pad and focuses the key proxy (intent=char, active=" + s.activeId + ")");

    // I2: Tools > Arrow keys through the real UI (hold submit arrow -> radial -> Tools -> list -> Arrow keys)
    await page.evaluate(() => { Input.DismissKeyboard(); });
    await touch("#pl-input-submit", 800);
    ok((await st()).radial, "A: hold on the submit arrow opens the radial at a CHAR prompt");
    await page.evaluate(() => document.querySelector("#radial-menu .radial-tools").click());
    await page.waitForTimeout(300);
    // Label is the first span; detail is .pl-tool-detail (do not use whole textContent).
    const labels = await page.evaluate(() => [...document.querySelectorAll("#radial-menu .radial-command")].map((b) => {
        const span = b.querySelector("span:not(.pl-tool-detail)");
        return (span ? span.textContent : b.textContent).trim();
    }));
    ok(labels.includes("Arrow keys") && new Set(labels).size === labels.length, "Tools list has a unique 'Arrow keys' entry: " + labels.join(", "));
    await page.evaluate(() => [...document.querySelectorAll("#radial-menu .radial-command")].find((b) => {
        const span = b.querySelector("span:not(.pl-tool-detail)");
        return /Arrow keys/.test(span ? span.textContent : b.textContent);
    }).click());
    await page.waitForTimeout(400);
    gap(await page.evaluate(() => {
        const p = document.getElementById("pl-dirpad-ring");
        return typeof DirectionalRadial !== "undefined" && DirectionalRadial.IsArrowModeOpen() && !!p && !p.hidden && getComputedStyle(p).display !== "none";
    }), "I2: Tools > Arrow keys opens the arrow pad");
    const pressKey = async (key) => {
        await log();
        const c = await centre('#pl-dirpad-ring [data-key="' + key + '"]');
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.x, y: c.y }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(700);
        return log();
    };
    const l1 = await pressKey("down"), i1 = await cursorIdx();
    ok(l1.length === 1 && l1[0].kind === "keydown" && l1[0].value === 40, "Down: exactly one game event (keydown 40): " + JSON.stringify(l1));
    ok(i1 === startIdx + 1, "Down moves the menu cursor (" + startIdx + " -> " + i1 + ")");
    const l2 = await pressKey("up"), i2 = await cursorIdx();
    ok(l2.length === 1 && i2 === startIdx, "Up: one event and the cursor returns (" + i2 + ")");
    await pressKey("down");
    const before = JSON.stringify(await gridRows());
    const l3 = await pressKey("enter");
    ok(l3.length === 1 && l3[0].kind === "keypress" && l3[0].value === 13, "Enter (centre): exactly one keypress 13: " + JSON.stringify(l3));
    ok(JSON.stringify(await gridRows()) !== before || await page.evaluate(() => /Author|author/.test(document.body.textContent)), "Enter activates the selected menu entry (screen changed)");
    // tap outside the ring closes it
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 8, y: 200 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(400);
    ok(await page.evaluate(() => typeof DirectionalRadial !== "undefined" && !DirectionalRadial.IsArrowModeOpen()), "tap outside the circle closes the pad");
    await page.evaluate(() => CharKeys.openArrowPad());
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    ok(await page.evaluate(() => typeof DirectionalRadial !== "undefined" && !DirectionalRadial.IsArrowModeOpen()), "Escape closes the pad");

    // keyboard proxy: letters, composition, Backspace sentinel, Enter dedupe, fail-closed
    await touch(".Input.CharInput", 60);
    await log();
    await cdp.send("Input.insertText", { text: "q" });
    await page.waitForTimeout(900);
    const lq = await log();
    ok(lq.length === 1 && lq[0].kind === "keypress" && lq[0].value === 113, "typing q through the proxy: exactly one keypress 113: " + JSON.stringify(lq));
    await page.waitForTimeout(600);
    if ((await st()).mode !== "char") { await page.evaluate(() => { Actionable.Submit("help"); }); await page.waitForTimeout(3000); }
    await touch(".Input.CharInput", 60);
    const comp = await page.evaluate(() => {
        const p = document.getElementById("pl-key-proxy"); const S = CharKeys.SENTINEL; window.__ckLog = [];
        p.focus(); p.value = S;
        p.dispatchEvent(new CompositionEvent("compositionstart"));
        p.value = S + "a"; p.dispatchEvent(new InputEvent("input", { isComposing: true, inputType: "insertCompositionText", data: "a" }));
        p.value = S + "ab"; p.dispatchEvent(new InputEvent("input", { isComposing: true, inputType: "insertCompositionText", data: "ab" }));
        const during = window.__ckLog.length;
        p.dispatchEvent(new CompositionEvent("compositionend", { data: "ab" }));
        p.dispatchEvent(new InputEvent("input", { isComposing: false, inputType: "insertText", data: "ab" }));
        return { during, after: window.__ckLog.slice(), value: p.value === S };
    });
    ok(comp.during === 0, "composition: nothing is sent while composing");
    ok(comp.after.length === 1 && comp.after[0].kind === "keypress" && comp.after[0].value === 97 && comp.value, "composition end commits exactly once, first code point only, sentinel reset: " + JSON.stringify(comp.after));
    await page.waitForTimeout(1200);
    if ((await st()).mode !== "char") { await page.evaluate(() => { Actionable.Submit("help"); }); await page.waitForTimeout(3000); await touch(".Input.CharInput", 60); }
    const bs = await page.evaluate(() => { const p = document.getElementById("pl-key-proxy"); window.__ckLog = []; p.value = ""; p.dispatchEvent(new InputEvent("input", { inputType: "deleteContentBackward" })); return { log: window.__ckLog.slice(), reset: p.value === CharKeys.SENTINEL }; });
    ok(bs.log.length === 1 && bs.log[0].kind === "keydown" && bs.log[0].value === 8 && bs.reset, "Backspace on the sentinel emits one delete and resets: " + JSON.stringify(bs.log));
    await page.waitForTimeout(1200);
    if ((await st()).mode !== "char") { await page.evaluate(() => { Actionable.Submit("help"); }); await page.waitForTimeout(3000); await touch(".Input.CharInput", 60); }
    const en = await page.evaluate(() => { const p = document.getElementById("pl-key-proxy"); window.__ckLog = []; p.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true, cancelable: true })); p.value = CharKeys.SENTINEL + "\n"; p.dispatchEvent(new InputEvent("input", { inputType: "insertLineBreak" })); return window.__ckLog.slice(); });
    ok(en.length === 1 && en[0].value === 13, "Enter via keydown + insertLineBreak dedupes to one keypress: " + JSON.stringify(en));
    await page.waitForTimeout(1200);
    if ((await st()).mode !== "char") { await page.evaluate(() => { Actionable.Submit("help"); }); await page.waitForTimeout(3000); }
    const sp = await page.evaluate(() => { window.__ckLog = []; const d = CharKeys.decode(CharKeys.SENTINEL, CharKeys.SENTINEL + "😀x", false); const sent = CharKeys.sendChar(d.ch); return { d, sent, log: window.__ckLog.slice() }; });
    ok(sp.d.kind === "char" && Array.from(sp.d.ch).length === 1 && sp.sent === false && sp.log.length === 0, "non-BMP (surrogate pair) is one code point and is not sent as a bogus key");
    const two = await page.evaluate(() => { window.__ckLog = []; const c = $(".Input.CharInput:visible")[0]; const clone = c.cloneNode(true); clone.id = "ck-clone"; c.parentNode.appendChild(clone); const r = CharKeys.sendChar("x"); clone.remove(); return { r, log: window.__ckLog.slice() }; });
    ok(two.r === false && two.log.length === 0, "two CharInputs: fail closed (no event)");
    // IME dismissed: intent clears, no per-tick refocus
    await touch(".Input.CharInput", 60);
    await page.evaluate(() => document.getElementById("pl-key-proxy").blur());
    await page.waitForTimeout(1200);
    ok(await page.evaluate(() => Input.KbIntent() === null && document.activeElement.id !== "pl-key-proxy"), "keyboard dismissed (Back/IME) clears the intent and is not refocused by the tick");
    // leave the menu with q -> LINE prompt; keyboard intent handoff char -> line
    await touch(".Input.CharInput", 60);
    for (let i = 0; i < 4 && (await st()).mode === "char"; i++) { await cdp.send("Input.insertText", { text: "q" }); await page.waitForTimeout(1500); }
    s = await st();
    ok(s.mode === "line", "leaving the menu returns to the LINE prompt (mode=" + s.mode + ")");
    ok(await page.evaluate(() => Input.KbIntent() === null && !document.activeElement.classList.contains("LineInput")), "leaving a char prompt for the command line retracts the keyboard (never covers the reply)");
    // line prompt: arrow pad Up recalls history
    await page.evaluate(() => { Input.DismissKeyboard(); Actionable.Submit("look"); });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { CharKeys.openArrowPad(); $(".Input.LineInput").val(""); window.__ckLog = []; });
    const cu = await centre('#pl-dirpad-ring [data-key="up"]');
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [cu] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(500);
    ok(await page.evaluate(() => $(".Input.LineInput").val() === "look"), "arrow pad Up at a LINE prompt recalls the previous command");
    await page.evaluate(() => { CharKeys.closeArrowPad(); Input.Clear(); });

    // contextmenu route (Android long-press can emit it)
    await page.evaluate(() => { Input.DismissKeyboard(); });
    const cm1 = await page.evaluate(() => { const f = document.querySelector(".Input.LineInput"); const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 100, clientY: 700 }); f.dispatchEvent(ev); return { prevented: ev.defaultPrevented, radial: document.getElementById("radial-menu").classList.contains("show") }; });
    ok(cm1.prevented && cm1.radial, "keyboard closed: contextmenu on the line field opens the radial (unchanged)");
    await page.evaluate(() => ParchLockQol.HideRadialMenu());
    await touch(".Input.LineInput", 60);
    const cm2 = await page.evaluate(() => { const f = document.querySelector(".Input.LineInput"); const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 100, clientY: 700 }); f.dispatchEvent(ev); return { prevented: ev.defaultPrevented, radial: document.getElementById("radial-menu").classList.contains("show") }; });
    ok(!cm2.prevented && !cm2.radial, "keyboard open: contextmenu is left to the native Cut/Copy/Paste menu");
    await page.evaluate(() => { Input.DismissKeyboard(); });

    // overlay gating + geometry at three viewports
    await page.evaluate(() => { CharKeys.openArrowPad(); Message.Show("Test", "<p>x</p>", true); });
    await page.waitForTimeout(500);
    ok(await page.evaluate(() => typeof DirectionalRadial !== "undefined" && !DirectionalRadial.IsArrowModeOpen()), "a Message dialog closes the arrow pad");
    await page.evaluate(() => Message.Hide());
    for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 740, height: 390 }]) {
        await page.setViewportSize(vp); await page.waitForTimeout(500);
        await page.evaluate(() => CharKeys.openArrowPad()); await page.waitForTimeout(200);
        const g = await page.evaluate(() => {
            const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
            return { ring: R(document.querySelector("#pl-dirpad-ring")), keys: [...document.querySelectorAll(".pl-dirpad-slice--arrow")].map(R), vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth };
        });
        const inside = g.ring.l >= 0 && g.ring.r <= g.vw && g.ring.t >= 0 && g.ring.b <= g.vh;
        const keysOk = g.keys.every((k) => k.w >= 44 && k.h >= 44 && k.l >= g.ring.l - 1 && k.r <= g.ring.r + 1 && k.t >= g.ring.t - 1 && k.b <= g.ring.b + 1);
        ok(inside && keysOk && g.sw <= g.vw, vp.width + "x" + vp.height + ": ring inside the viewport, keys >=44px inside the ring, no horizontal overflow");
        await page.evaluate(() => CharKeys.closeArrowPad());
    }
    await page.setViewportSize({ width: 412, height: 860 });

    ok(errors.length === 0, "no page errors (" + JSON.stringify(errors.slice(0, 3)) + ")");
    await browser.close();

    // ---------- desktop parity ----------
    const b2 = await chromium.launch({ headless: true });
    const p2 = await b2.newPage({ viewport: { width: 1280, height: 800 } });
    const e2 = [];
    p2.on("pageerror", (e) => e2.push(String(e && e.message).slice(0, 140)));
    await p2.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await p2.goto(pathToFileURL(path.resolve(__dirname, "..", "play.html")).href + "?story=games/anchor.z8.js&t=" + Date.now(), { waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(800);
    await p2.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
    await p2.waitForTimeout(6000);
    await p2.evaluate(() => { try { Message.Hide(); } catch (e) {} });
    await p2.keyboard.press("Space"); await p2.waitForTimeout(3500);
    for (let i = 0; i < 4 && !(await p2.evaluate(() => $(".Input.LineInput:visible").length)); i++) { await p2.keyboard.press("Space"); await p2.waitForTimeout(2500); }
    ok(await p2.evaluate(() => !!document.activeElement && document.activeElement.classList.contains("LineInput")), "desktop: Glk still autofocuses the line input (host predicate is false off mobile)");
    await p2.keyboard.type("look"); await p2.keyboard.press("Enter"); await p2.waitForTimeout(2500);
    ok(await p2.evaluate(() => /Real Estate Office/.test(document.body.textContent)), "A: desktop typing + Enter still works");
    ok(await p2.evaluate(() => !document.querySelector("#pl-key-proxy") && !document.querySelector("#pl-keypad")), "A: desktop has no key proxy / key pad");
    ok(await p2.evaluate(() => { WorkspaceUI.OpenTools(); const l = [...document.querySelectorAll("#radial-menu button")].map((b) => b.textContent.trim()); ParchLockQol.HideRadialMenu(); return l.length > 3 && !l.includes("Arrow keys"); }), "desktop Tools list has no Arrow keys entry");
    ok(e2.length === 0, "desktop: no page errors");
    await b2.close();

    console.log(JSON.stringify({ ok: fail === 0, pass, fail, gapOpen, expectFixed: EXPECT_FIXED }));
    console.log((fail ? "FAIL" : "PASS") + ": d105-input-contract (" + pass + " passed, " + fail + " failed, " + gapOpen + " gaps open)");
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
