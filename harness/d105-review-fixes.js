/**
 * D105 review-fix regression (codex #717 blockers, #718 live IME/strip failures, #719 char-strip long-hold).
 * Real CDP touch/key input, real Anchorhead, 412x860 mobile. Usage: node harness/d105-review-fixes.js
 */
const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS:", m); } else { fail++; console.error("FAIL:", m); } };

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e && e.message).slice(0, 140)));
    await page.addInitScript(() => { try { localStorage.setItem("PL_MobileTutorialSeen", "1"); } catch (e) {} window.__ckLog = [];
        // test instrumentation: which elements get .focus() called, and independently controllable viewport numbers
        window.__focusLog = [];
        const nf = HTMLElement.prototype.focus;
        HTMLElement.prototype.focus = function () { window.__focusLog.push((this.id || "") + "." + String(this.className || "")); return nf.apply(this, arguments); };
        window.__ih = null; window.__vvh = null; window.__vvtop = null;
        const ihd = Object.getOwnPropertyDescriptor(window, "innerHeight");
        Object.defineProperty(window, "innerHeight", { configurable: true, get() { return window.__ih != null ? window.__ih : ihd.get.call(window); } });
        const vh = Object.getOwnPropertyDescriptor(VisualViewport.prototype, "height"), vt = Object.getOwnPropertyDescriptor(VisualViewport.prototype, "offsetTop");
        Object.defineProperty(window.visualViewport, "height", { configurable: true, get() { return window.__vvh != null ? window.__vvh : vh.get.call(window.visualViewport); } });
        Object.defineProperty(window.visualViewport, "offsetTop", { configurable: true, get() { return window.__vvtop != null ? window.__vvtop : vt.get.call(window.visualViewport); } });
    });
    await page.goto(pathToFileURL(path.resolve(__dirname, "..", "play.html")).href + "?story=games/anchor.z8.js&t=" + Date.now(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
    await page.waitForTimeout(6000);
    await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });
    const cdp = await ctx.newCDPSession(page);

    const rect = () => page.evaluate(() => {
        const e = $(".Input.CharInput:visible")[0]; if (!e) return null;
        const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { x: r.x, y: r.y, w: r.width, h: r.height, vh: innerHeight, hit: hit === e, win: e.closest(".GridWindow") ? "grid" : "buffer" };
    });
    const touch = async (holdMs, dx) => {
        const r = await rect(); const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [c] });
        if (dx) { await page.waitForTimeout(50); await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: c.x + dx, y: c.y }] }); }
        await page.waitForTimeout(holdMs);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(300);
    };
    // D118: the arrow pad merged into DirectionalRadial's shared shell --
    // #pl-arrowpad is retired, #pl-dirpad-ring renders both exits and
    // arrow mode now (data-key is preserved on arrow-mode buttons
    // specifically for this exact query to keep working unchanged).
    const padPress = async (name) => {
        const r = await page.evaluate((key) => {
            const e = document.querySelector('#pl-dirpad-ring [data-key="' + key + '"]');
            if (!e) return null;
            const b = e.getBoundingClientRect();
            return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        }, name);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [r] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(500);
    };
    const st = () => page.evaluate(() => ({
        radial: document.getElementById("radial-menu").classList.contains("show"),
        src: (jQuery("#radial-menu").data("context") || {}).source || null,
        intent: Input.KbIntent(), activeId: document.activeElement && (document.activeElement.id || ""),
        mode: $(".Input.LineInput:visible").length ? "line" : ($(".Input.CharInput:visible").length ? "char" : "none"),
        map: document.body.classList.contains("map-open"), pad: typeof DirectionalRadial !== "undefined" && DirectionalRadial.IsArrowModeOpen()
    }));
    const log = () => page.evaluate(() => window.__ckLog.splice(0));
    const key = async (k, code, vk) => {
        await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk });
        await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
        await page.waitForTimeout(150);
    };
    const toHelp = async () => {
        for (let i = 0; i < 8 && (await st()).mode !== "line"; i++) { await page.evaluate(() => CharKeys.sendChar(" ")); await page.waitForTimeout(2500); }
        await page.evaluate(() => Actionable.Submit("help")); await page.waitForTimeout(3500);
    };

    // ---- #719 / #718 startup char strip ----
    let r = await rect();
    ok(r && r.h >= 44 && r.w > 200 && r.y + r.h <= r.vh && r.y > r.vh * 0.85 && r.hit, "startup char strip is a >=44px bottom strip with an unobscured hit target: " + JSON.stringify(r));
    ok(!(await st()).pad, "D111: BufferWindow startup char prompt does not auto-open the arrow pad");
    await touch(800);
    let s = await st();
    ok(s.radial && s.src === "input" && s.intent === null && s.activeId !== "pl-key-proxy", "hold on the startup char strip opens ONE input radial, no keyboard intent/proxy focus");
    ok(await page.evaluate(() => !!document.querySelector("#radial-menu .radial-tools")), "that radial has the Tools button");
    await page.evaluate(() => ParchLockQol.HideRadialMenu());
    const txt0 = await page.evaluate(() => document.body.textContent);
    await touch(800); await page.evaluate(() => ParchLockQol.HideRadialMenu());
    ok(txt0 === await page.evaluate(() => document.body.textContent), "touchend after a fired hold cannot advance/submit the game");
    await touch(300, 60);
    s = await st();
    ok(!s.radial && s.intent === null, "a moved touch neither opens the radial nor the keyboard");
    await touch(60);
    s = await st();
    ok(!s.radial && s.intent === "char" && s.activeId === "pl-key-proxy", "60 ms tap opens the proxy (keyboard intent) and no radial");
    // #723 root: ParchLock is the SOLE focus owner on mobile; Glk autofocus of recreated prompts is off (nothing to steal/refocus)
    const glkFocuses = () => page.evaluate(() => window.__focusLog.filter((x) => /Input/.test(x) && /CharInput|LineInput/.test(x)));
    await page.evaluate(() => { window.__focusLog = []; });
    for (let n = 1; n <= 2; n++) {
        await page.evaluate(() => CharKeys.sendChar(" ")); await page.waitForTimeout(1800);   // each key recreates the Glk prompt
        s = await st();
        if (s.mode !== "char") break;
        ok(s.intent === "char" && s.activeId === "pl-key-proxy" && (await glkFocuses()).length === 0, "prompt replacement #" + n + ": proxy keeps focus, intent stays char, Glk CharInput focus requested 0 times (" + JSON.stringify(await glkFocuses()) + ")");
    }
    await page.waitForTimeout(700);
    await page.evaluate(() => document.getElementById("pl-key-proxy").blur());
    await page.waitForTimeout(900);
    s = await st();
    ok(s.intent === null && s.activeId !== "pl-key-proxy", "Back/IME blur to body clears the intent and nothing reopens the keyboard");
    await page.evaluate(() => Input.DismissKeyboard());

    // ---- #718 B / #719: Anchorhead HELP (GridWindow char prompt) ----
    await toHelp();
    await page.waitForTimeout(400);
    s = await st();
    ok(s.pad && await page.evaluate(() => CharKeys._autoPadOwned === true), "D111: HELP auto-opens an auto-owned arrow pad");
    await page.evaluate(() => {
        window.__d111Frames = [];
        window.__d111Sample = true;
        const sample = () => {
            const p = document.getElementById("pl-dirpad-ring");
            const open = typeof DirectionalRadial !== "undefined" && DirectionalRadial.IsArrowModeOpen();
            window.__d111Frames.push(!!(open && p && !p.hidden && getComputedStyle(p).display !== "none"));
            if (window.__d111Sample) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
    });
    for (const keyName of ["down", "up", "down", "up", "down", "up"]) await padPress(keyName);
    const continuous = await page.evaluate(() => {
        window.__d111Sample = false;
        const values = window.__d111Frames.slice();
        let transitions = 0;
        for (let i = 1; i < values.length; i++) if (values[i] !== values[i - 1]) transitions++;
        return { frames: values.length, transitions, allVisible: values.length > 0 && values.every(Boolean) };
    });
    ok(continuous.allVisible && continuous.transitions === 0 && continuous.frames >= 30, "D111: six real HELP arrows cause zero pad visibility transitions across animation frames: " + JSON.stringify(continuous));

    // The automatic backdrop stops above the live strip. A normal short tap
    // closes only the auto pad, opens the existing proxy, and a real Q exits.
    await touch(60);
    s = await st();
    ok(!s.pad && s.intent === "char" && s.activeId === "pl-key-proxy", "D111: auto pad leaves the HELP strip tappable for the keyboard proxy");
    await cdp.send("Input.insertText", { text: "q" });
    await page.waitForTimeout(1800);
    ok((await st()).mode === "line", "D111: keyboard letter Q reaches the native HELP menu and exits it");
    await page.evaluate(() => Input.DismissKeyboard());
    await toHelp();
    await page.waitForTimeout(400);
    ok((await st()).pad, "D111: leaving and re-entering the grid menu allows one new automatic open");
    r = await rect();
    ok(r && r.win === "grid" && r.h >= 44 && r.w > 200 && r.y + r.h <= r.vh && r.y > r.vh * 0.85 && r.hit, "HELP (grid-window char prompt) still shows the >=44px bottom strip, unobscured: " + JSON.stringify(r));
    await touch(800);
    s = await st();
    ok(s.radial && s.src === "input" && s.intent === null, "hold on the HELP strip opens the input radial (no keyboard)");
    await page.evaluate(() => document.querySelector("#radial-menu .radial-tools").click()); await page.waitForTimeout(300);
    await page.evaluate(() => [...document.querySelectorAll("#radial-menu .radial-command")].find((b) => /Arrow keys/.test(b.textContent)).click()); await page.waitForTimeout(400);
    ok((await st()).pad, "HELP: Tools > Arrow keys opens the pad entirely from the strip hold");
    await page.evaluate(() => CharKeys.closeArrowPad());

    // ---- root: ONE keyboard-geometry model (layout height + a single visual-bottom inset) ----
    const geo = async (ih, vvh, top) => page.evaluate(([ih, vvh, top]) => { window.__ih = ih; window.__vvh = vvh; window.__vvtop = top; MobileLayout.apply(); const cs = getComputedStyle(document.documentElement); const e = $(".Input.CharInput:visible")[0] || $(".Input.LineInput:visible")[0]; return { inset: cs.getPropertyValue("--pl-kb-inset").trim(), layout: cs.getPropertyValue("--pl-layout-height").trim(), stripBottom: Math.round(e.getBoundingClientRect().bottom) }; }, [ih, vvh, top]);
    const closed = await geo(860, 860, 0);
    ok(closed.inset === "0px", "keyboard closed: inset 0 (" + JSON.stringify(closed) + ")");
    const gapA = await geo(860, 520, 0);      // the device gap: visual viewport already shrank, layout viewport not yet
    // Allow a small chrome/safe-area floor under the visual bottom (observed ~484 on current mobile chrome).
    ok(gapA.inset === "340px" && gapA.layout === "860px" && gapA.stripBottom >= 470 && gapA.stripBottom <= 520, "gap (vv 520, layout 860): controls lifted ONCE to just above the visible bottom, strip bottom " + gapA.stripBottom + " within the visible 520 (" + JSON.stringify(gapA) + ")");
    const resized = await geo(520, 520, 0);   // WebView resized the layout too: same physical place, nothing left to compensate
    ok(resized.inset === "0px" && resized.layout === "520px", "layout resized to match: inset 0 (no second compensation) (" + JSON.stringify(resized) + ")");
    const panned = await geo(860, 520, 100);  // visual viewport scrolled: bottom = offsetTop + height
    ok(panned.inset === "240px", "visual viewport offsetTop counted once: inset 240 (" + JSON.stringify(panned) + ")");
    await geo(null, null, null);
    await page.evaluate(() => { window.__ih = null; window.__vvh = null; window.__vvtop = null; MobileLayout.apply(); });

    // ---- #717 blocker 1: transaction-scoped dedupe (each case runs in the HELP menu, where these keys are harmless) ----
    const menuProxy = async () => { if ((await st()).mode !== "char") await toHelp(); await touch(60); await log(); };
    const latch = await page.evaluate(() => {
        const fake = document.createElement("input"); fake.className = "Input CharInput"; document.body.appendChild(fake);
        const seen = []; $(fake).on("keydown", (e) => { seen.push("d" + e.keyCode); }).on("keypress", (e) => { seen.push("p" + e.which); });
        const real = CharKeys.charTarget; CharKeys.charTarget = () => fake;
        const p = CharKeys.ensureProxy(), S = CharKeys.SENTINEL; p.value = S; window.__ckLog = [];
        const out = {};
        p.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", keyCode: 8, bubbles: true, cancelable: true }));      // no input event follows (preventDefault)
        p.value = S + "x"; p.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "x" }));
        out.backspaceThenX = seen.splice(0);
        p.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true, cancelable: true }));         // no input event follows
        p.value = S + "x"; p.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: "x" }));
        out.enterThenX = seen.splice(0);
        p.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true, cancelable: true }));         // matching follow-up input IS deduped
        p.value = S + "\n"; p.dispatchEvent(new InputEvent("input", { inputType: "insertLineBreak" }));
        out.enterDedupe = seen.splice(0);
        CharKeys.charTarget = real; fake.remove();
        return out;
    });
    ok(JSON.stringify(latch.backspaceThenX) === JSON.stringify(["d8", "p120"]), "Backspace keydown then typing x: both delivered, no stale latch: " + JSON.stringify(latch.backspaceThenX));
    ok(JSON.stringify(latch.enterThenX) === JSON.stringify(["p13", "p120"]), "Enter keydown (no input event) then x: both delivered: " + JSON.stringify(latch.enterThenX));
    ok(JSON.stringify(latch.enterDedupe) === JSON.stringify(["p13"]), "Enter keydown + its insertLineBreak input: exactly one keypress: " + JSON.stringify(latch.enterDedupe));
    let l;
    await menuProxy();
    await key("ArrowUp", "ArrowUp", 38);
    await cdp.send("Input.insertText", { text: "x" }); await page.waitForTimeout(400);
    l = await log();
    ok(l.length === 2 && l[0].value === 38 && l[1].value === 120, "ArrowUp then x: both delivered: " + JSON.stringify(l));
    await menuProxy();
    await key("Enter", "Enter", 13); await page.waitForTimeout(1200);
    await menuProxy();
    await cdp.send("Input.insertText", { text: "x" }); await page.waitForTimeout(400);
    l = await log();
    ok(l.length === 1 && l[0].value === 120, "Enter with no follow-up input, then x at the next prompt: x delivered: " + JSON.stringify(l));
    // ---- blocker 2: proxy-consumed keys never reach global shortcuts ----
    await menuProxy();
    const mapBefore = (await st()).map, errBefore = errors.length;
    await key("Tab", "Tab", 9);
    l = await log();
    ok(l.length === 1 && l[0].value === 9 && errors.length === errBefore, "Tab through the proxy: exactly one game event, no page error: " + JSON.stringify(l));
    await menuProxy();
    await key("`", "Backquote", 192); await page.waitForTimeout(400);
    ok((await st()).map === mapBefore && errors.length === errBefore, "a backtick typed at a char prompt does not toggle the map or throw");
    await menuProxy();
    await key("Escape", "Escape", 27);
    l = await log();
    ok(l.length === 1 && l[0].kind === "keydown" && l[0].value === 27 && (await st()).map === mapBefore && errors.length === errBefore, "Escape through the proxy: exactly one game event, map/app chrome untouched: " + JSON.stringify(l));
    ok(errors.length === 0, "no page errors so far (" + JSON.stringify(errors.slice(0, 3)) + ")");

    // ---- blocker 4: composition variants ----
    if ((await st()).mode !== "char") await toHelp();
    await touch(60);
    const comp = await page.evaluate(() => {
        const p = document.getElementById("pl-key-proxy"), S = CharKeys.SENTINEL; window.__ckLog = []; p.focus(); p.value = S;
        p.dispatchEvent(new CompositionEvent("compositionstart"));
        p.value = S + "ab"; p.dispatchEvent(new InputEvent("input", { isComposing: true, inputType: "insertCompositionText", data: "ab" }));
        p.dispatchEvent(new CompositionEvent("compositionend", { data: "ab" }));
        p.value = S + "ab"; p.dispatchEvent(new InputEvent("input", { isComposing: false, inputType: "insertText", data: "ab" }));   // IME re-applies after compositionend
        return window.__ckLog.slice();
    });
    ok(comp.length === 1 && comp[0].value === 97, "composition end + re-applied final input sends exactly once: " + JSON.stringify(comp));

    // ---- blocker 5: submit arrow fail-closed with two CharInputs ----
    const two = await page.evaluate(() => {
        const c = $(".Input.CharInput:visible")[0], clone = c.cloneNode(true); clone.id = "ck2"; c.parentNode.appendChild(clone);
        let n = 0; const f = () => { n++; }; $(c).on("keypress.t", f); $(clone).on("keypress.t", f);
        Input.SubmitPrompt(); $(c).off(".t"); clone.remove(); return n;
    });
    ok(two === 0, "submit arrow with two CharInputs dispatches nothing (fail closed)");

    // ---- blocker 3: Message and native dialog end the pad + keyboard intent ----
    await touch(60);
    await page.evaluate(() => { CharKeys.openArrowPad(); Input._kbIntent = "char"; Message.Show("T", "<p>x</p>", true); });
    await page.waitForTimeout(500);
    s = await st();
    ok(!s.pad && s.intent === null, "Message: pad closed and keyboard intent cleared");
    await page.evaluate(() => Message.Hide());
    if ((await st()).mode === "char") { for (let i = 0; i < 5 && (await st()).mode !== "line"; i++) { await page.evaluate(() => { const c = $(".Input.CharInput:visible")[0]; if (c) Input.SubmitPrompt(); }); await page.waitForTimeout(2200); await cdp.send("Input.insertText", { text: "q" }).catch(() => {}); await page.waitForTimeout(800); } }
    if ((await st()).mode === "line") {
        await page.evaluate(() => { CharKeys.openArrowPad(); Input._kbIntent = "line"; Actionable.Submit("save"); });
        await page.waitForTimeout(2500);
        const dlg = await page.evaluate(() => ({ dialog: !!document.querySelector("#dialog"), pad: typeof DirectionalRadial !== "undefined" && DirectionalRadial.IsArrowModeOpen(), intent: Input.KbIntent() }));
        ok(dlg.dialog && !dlg.pad && dlg.intent === null, "native save dialog: pad closed, intent cleared: " + JSON.stringify(dlg));
        await page.evaluate(() => { const f = document.querySelector("#dialog_infield"); if (f) f.focus(); });
        await page.waitForTimeout(600);
        ok(await page.evaluate(() => { const f = document.querySelector("#dialog_infield"); return !f || document.activeElement === f; }), "the dialog's own input keeps focus (not stolen by keyboard-intent code)");
        await page.evaluate(() => { const c = document.querySelector("#dialog_cancel"); if (c) c.click(); });
    }
    // ---- operator: the keyboard retracts after a submitted command (it would cover the reply) ----
    for (let i = 0; i < 8 && (await st()).mode !== "line"; i++) { await page.evaluate(() => { Input.DismissKeyboard(); CharKeys.sendChar("q"); }); await page.waitForTimeout(1800); }
    const lineRect = () => page.evaluate(() => { const r = $(".Input.LineInput:visible")[0].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const openLineKb = async () => { const c = await lineRect(); await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [c] }); await page.waitForTimeout(60); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await page.waitForTimeout(300); };
    const closedAfter = () => page.evaluate(() => Input.KbIntent() === null && !document.activeElement.classList.contains("LineInput"));
    ok((await st()).mode === "line", "at the LINE prompt for the retract tests");
    await page.evaluate(() => { window.__focusLog = []; });
    await openLineKb();
    ok((await st()).intent === "line", "tap opens the keyboard at the line prompt");
    ok((await glkFocuses()).length === 1, "line tap: exactly one explicit focus of the line field (" + JSON.stringify(await glkFocuses()) + ")");
    await page.evaluate(() => { window.__focusLog = []; });
    await cdp.send("Input.insertText", { text: "sw" });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await page.waitForTimeout(2500);
    ok(await page.evaluate(() => [...document.querySelectorAll("#windowport .BufferLine")].some((l) => /^>\s*sw\s*$/i.test(l.textContent.trim()))), "the typed 'sw' command really reached the game (echoed in the transcript)");
    ok(await closedAfter(), "typed sw + Enter: keyboard retracts after the command (intent null, field not focused)");
    ok((await glkFocuses()).length === 0, "submitted command: the new Glk prompt is NOT auto-focused (0 focus calls, " + JSON.stringify(await glkFocuses()) + ")");
    await openLineKb();
    await cdp.send("Input.insertText", { text: "look" });
    const sub = await page.evaluate(() => { const r = document.querySelector("#pl-input-submit").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [sub] }); await page.waitForTimeout(60); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(2500);
    ok(await closedAfter(), "typed text + submit arrow: keyboard retracts");
    await openLineKb();
    await cdp.send("Input.insertText", { text: "look" });
    await page.evaluate(() => { CharKeys.openArrowPad(); });
    const en = await page.evaluate(() => { CharKeys.pressKey("enter"); return true; });
    await page.waitForTimeout(2500);
    ok(en && await closedAfter(), "arrow pad Enter at the line prompt: keyboard retracts");
    await page.evaluate(() => CharKeys.closeArrowPad());

    ok(errors.length === 0, "no page errors (" + JSON.stringify(errors.slice(0, 3)) + ")");
    await browser.close();
    console.log(JSON.stringify({ ok: fail === 0, pass, fail }));
    console.log((fail ? "FAIL" : "PASS") + ": d105-review-fixes (" + pass + " passed, " + fail + " failed)");
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
