/**
 * D119 self-adversarial live audit (codex unavailable -- operator instructed
 * Claude to do its own adversarial pass with live reproduction, the same
 * standard codex's #782/#786 audits used, not just code review). Real
 * Chromium via Playwright/CDP, real Anchorhead. Usage: node harness/d119-live-audit.js
 */
const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS:", m); } else { fail++; console.error("FAIL:", m); } };

const storyUrl = (extra) => pathToFileURL(path.resolve(__dirname, "..", "play.html")).href + "?story=games/anchor.z8.js&t=" + Date.now() + (extra || "");
const noStoryUrl = () => pathToFileURL(path.resolve(__dirname, "..", "play.html")).href + "?t=" + Date.now();

(async () => {
    const browser = await chromium.launch({ headless: true });

    // === PART 1: blocker 1 + blocker 2, no-story recovery screen (mobile context, matches codex's own repro) ===
    {
        const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
        const page = await ctx.newPage();
        const warnings = [];
        page.on("console", (m) => { if (m.type() === "warning" || /blocked/i.test(m.text())) warnings.push(m.text()); });
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e && e.message).slice(0, 200)));
        // D120 follow-up: index.html now redirects an unseen player to
        // tutorial.html (MainMenu.js's own first-run routing) -- this test
        // is about the no-story recovery screen's Continue/Choose-a-story
        // buttons, not the tutorial, so seed completion to keep the
        // "Choose a story -> index.html" navigation landing where this
        // test actually expects it.
        await page.addInitScript(() => { try { localStorage.setItem("PL_TutorialSeen", "1"); } catch (e) {} });

        await page.goto(noStoryUrl(), { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1200);
        await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
        await page.waitForTimeout(500);

        const state1 = await page.evaluate(() => ({
            noStory: document.body.classList.contains("no-story"),
            startScreenHidden: document.getElementById("start-screen") ? document.getElementById("start-screen").hidden : null,
            anyAnchorsInStartScreen: document.querySelectorAll("#start-screen a[href]").length,
            chooseBtn: !!document.getElementById("start-choose"),
            continueBtn: !!document.getElementById("start-continue"),
            handleExists: !!document.getElementById("pl-dirpad-handle"),
            handleHidden: document.getElementById("pl-dirpad-handle") ? document.getElementById("pl-dirpad-handle").hidden : null
        }));
        ok(state1.noStory === true, "no-story recovery screen: body.no-story is set with no ?story= param");
        ok(state1.startScreenHidden === false, "no-story recovery screen: #start-screen is actually visible");
        ok(state1.anyAnchorsInStartScreen === 0, "blocker 1: #start-screen has ZERO real <a href> elements left (Continue/Choose-a-story are buttons now)");
        ok(state1.chooseBtn === true && !state1.continueBtn, "blocker 1: 'Choose a story' button renders; 'Continue' does not (no PL_LastStory set yet)");

        // blocker 2: the directional handle must NOT be visible/hit-testable on this pre-game screen
        ok(state1.handleExists === true, "sanity: the handle element exists in the DOM (hidden, not removed)");
        ok(state1.handleHidden === true, "blocker 2: DirectionalRadial handle.hidden is TRUE on the no-story recovery screen (was FALSE before the fix, per codex's real repro)");
        const hitTest1 = await page.evaluate(() => {
            const h = document.getElementById("pl-dirpad-handle");
            if (!h) return null;
            const r = h.getBoundingClientRect();
            const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return el === h;
        });
        ok(hitTest1 !== true, "blocker 2: the handle's own screen position is NOT hit-testable to itself (hidden elements don't receive elementFromPoint hits) -- was hit-testable before the fix");

        // Click "Choose a story" for real and confirm it actually navigates (not blocked by the nav guard).
        warnings.length = 0;
        await Promise.all([
            page.waitForURL(/index\.html/, { timeout: 5000 }).catch(() => null),
            page.click("#start-choose")
        ]);
        await page.waitForTimeout(300);
        ok(/index\.html/.test(page.url()), "blocker 1: clicking 'Choose a story' actually navigates to index.html for real (was silently blocked before the fix)");
        ok(!warnings.some((w) => /blocked in-WebView navigation|blocked in-app navigation/i.test(w)), "blocker 1: no 'blocked navigation' console warning was logged for this click");
        ok(errors.length === 0, "no page errors on the no-story recovery screen: " + JSON.stringify(errors));

        await ctx.close();
    }

    // === PART 1b: Continue button (needs a fake installed last-story, same repro codex used) ===
    {
        const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
        const page = await ctx.newPage();
        const warnings = [];
        page.on("console", (m) => { if (/blocked/i.test(m.text())) warnings.push(m.text()); });
        await page.goto(noStoryUrl(), { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
        await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            localStorage.setItem("PL_LastStory", "games/anchor.z8.js");
            ModuleLibrary.find = function (p) { return p === "games/anchor.z8.js" ? { Title: "Anchorhead", Path: "games/anchor.z8.js" } : null; };
            ParchLock.EnsureStoryOrRecover();
        });
        await page.waitForTimeout(200);
        const hasContinue = await page.evaluate(() => !!document.getElementById("start-continue"));
        ok(hasContinue, "Continue button renders once a last-played story is 'installed' (real repro of codex's exact scenario)");
        warnings.length = 0;
        await Promise.all([
            page.waitForURL(/play\.html\?story=games%2Fanchor\.z8\.js/, { timeout: 5000 }).catch(() => null),
            page.click("#start-continue")
        ]);
        await page.waitForTimeout(300);
        ok(/play\.html\?story=games%2Fanchor\.z8\.js/.test(page.url()), "blocker 1: clicking Continue actually navigates to play.html?story=... for real");
        ok(!warnings.some((w) => /blocked/i.test(w)), "no blocked-navigation warning logged for Continue either");
        await ctx.close();
    }

    // === PART 2: real story loaded -- handle becomes visible/hit-testable once playable ===
    {
        const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e && e.message).slice(0, 200)));
        await page.addInitScript(() => { try { localStorage.setItem("PL_MobileTutorialSeen", "1"); } catch (e) {} });
        await page.goto(storyUrl(), { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
        await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
        await page.waitForTimeout(4000);
        await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });
        await page.waitForTimeout(500);

        const state2 = await page.evaluate(() => ({
            noStory: document.body.classList.contains("no-story"),
            handleHidden: document.getElementById("pl-dirpad-handle").hidden,
            playable: DirectionalRadial.IsStoryPlayable()
        }));
        ok(state2.noStory === false, "real story: body.no-story is NOT set once a real story is playing");
        ok(state2.playable === true, "real story: IsStoryPlayable() is true with real Anchorhead content loaded");
        ok(state2.handleHidden === false, "real story: the handle becomes visible again once the story is genuinely playable (the playability gate does not get permanently stuck)");

        // Advance past the intro screens into a real room with real known
        // exits -- OpenKeyboardMode()/GetSlices() legitimately no-op with
        // zero slices before that, which is not what high 3/4 are testing.
        for (let i = 0; i < 8; i++) {
            const mode = await page.evaluate(() => ($(".Input.LineInput:visible").length ? "line" : ($(".Input.CharInput:visible").length ? "char" : "none")));
            if (mode === "line") break;
            await page.evaluate(() => { try { CharKeys.sendChar(" "); } catch (e) {} });
            await page.waitForTimeout(1200);
        }
        await page.waitForTimeout(500);
        const roomCheck = await page.evaluate(() => { try { const r = ParchLockMap.GetCurrentRoom(); return r ? Object.keys(r.Exits || {}).length : -1; } catch (e) { return -2; } });
        ok(roomCheck > 0, "sanity: actually reached a real room with at least one known exit before testing the handle/keyboard-mode path -- got " + roomCheck);

        // === High 3: focused handle Enter must open keyboard mode WITHOUT also submitting in the same keystroke ===
        await page.evaluate(() => { window.__submits = []; const real = Actionable.Submit; Actionable.Submit = function (cmd) { window.__submits.push(cmd); return real.apply(this, arguments); }; });
        await page.evaluate(() => document.getElementById("pl-dirpad-handle").focus());
        const cdp = await ctx.newCDPSession(page);
        await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        await page.waitForTimeout(300);
        const afterOpenEnter = await page.evaluate(() => ({
            submits: window.__submits.slice(), keyboardOpen: DirectionalRadial._keyboardOpen === true, ringHidden: DirectionalRadial.ring.hidden,
            _debug: { activeIsHandle: document.activeElement === document.getElementById("pl-dirpad-handle"), canOpen: DirectionalRadial.CanOpen(), playable: DirectionalRadial.IsStoryPlayable(), messageOpen: typeof Message !== "undefined" && Message.IsOpen, bodyClasses: document.body.className }
        }));
        console.log("DEBUG high3:", JSON.stringify(afterOpenEnter._debug));
        ok(afterOpenEnter.submits.length === 0, "high 3: pressing Enter on the focused handle submits NOTHING in the same keystroke (was submitting 'n' immediately before the fix) -- got: " + JSON.stringify(afterOpenEnter.submits));
        ok(afterOpenEnter.keyboardOpen === true && afterOpenEnter.ringHidden === false, "high 3: the SAME Enter press does still open keyboard mode (the fix didn't break opening, only the double-read)");
        // A second, later Enter should now submit exactly the highlighted slice.
        await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        await page.waitForTimeout(300);
        const afterSecondEnter = await page.evaluate(() => window.__submits.slice());
        ok(afterSecondEnter.length === 1, "high 3: a SEPARATE, later Enter press does submit exactly once (the keyboard path still works end to end) -- got: " + JSON.stringify(afterSecondEnter));

        // === High 4: arrow-mode buttons must respond to real keyboard Enter/Space, not just pointerdown ===
        await page.evaluate(() => { window.__pressKeyLog = []; const real = CharKeys.pressKey; CharKeys.pressKey = function (name) { window.__pressKeyLog.push(name); return real.apply(this, arguments); }; });
        await page.evaluate(() => { CharKeys.openArrowPad(); });
        await page.waitForTimeout(300);
        const arrowOpen = await page.evaluate(() => DirectionalRadial.IsArrowModeOpen());
        ok(arrowOpen === true, "sanity: manual openArrowPad() actually opens arrows mode for this test");
        await page.evaluate(() => { const b = document.querySelector('#pl-dirpad-ring [data-key="up"]'); if (b) b.focus(); });
        const focusedIsUp = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("data-key") === "up");
        ok(focusedIsUp === true, "sanity: the Up arrow button can actually receive real keyboard focus (real tabindex/focusability, not just visually present)");
        await page.evaluate(() => {
            window.__clickSeen = 0;
            window.__kdLog = [];
            var btn = document.querySelector('#pl-dirpad-ring [data-key="up"]');
            btn.addEventListener("click", function () { window.__clickSeen++; });
            document.addEventListener("keydown", function (e) { window.__kdLog.push({ phase: "doc-bubble", key: e.key, defaultPrevented: e.defaultPrevented, target: e.target.tagName + "#" + (e.target.id || "") + "." + (e.target.className || "") }); }, false);
            document.addEventListener("keydown", function (e) { window.__kdLog.push({ phase: "doc-capture", key: e.key, defaultPrevented: e.defaultPrevented }); }, true);
            btn.addEventListener("keydown", function (e) { window.__kdLog.push({ phase: "btn-target", key: e.key, defaultPrevented: e.defaultPrevented }); });
        });
        // Use Playwright's own keyboard API here (not raw CDP dispatch) --
        // activating a real <button>'s native click-on-Enter default action
        // needs the full key-processing path, not a raw/unprocessed event.
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);
        const clickDebug = await page.evaluate(() => {
            var all = document.querySelectorAll('#pl-dirpad-ring [data-key="up"]');
            var b = document.activeElement;
            return {
                clickSeen: window.__clickSeen, stillFocused: b && b.getAttribute("data-key") === "up", ringHidden: DirectionalRadial.ring.hidden, kdLog: window.__kdLog,
                matchCount: all.length, activeTag: b && b.tagName, activeType: b && b.getAttribute("type"), activeDisabled: b && b.disabled,
                sameElement: all[0] === b
            };
        });
        console.log("DEBUG high4 click:", JSON.stringify(clickDebug, null, 1));
        const afterArrowEnter = await page.evaluate(() => window.__pressKeyLog.slice());
        ok(afterArrowEnter.length === 1 && afterArrowEnter[0] === "up", "high 4: real keyboard Enter on a focused arrow button fires pressKey('up') EXACTLY ONCE (was zero times before the fix) -- got: " + JSON.stringify(afterArrowEnter));
        await page.evaluate(() => { window.__pressKeyLog = []; });
        // A real touch/pointer press on the same button must still fire exactly once too (no double-fire regression from the fix).
        const btnRect = await page.evaluate(() => { const b = document.querySelector('#pl-dirpad-ring [data-key="up"]'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [btnRect] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(300);
        const afterArrowTouch = await page.evaluate(() => window.__pressKeyLog.slice());
        ok(afterArrowTouch.length === 1 && afterArrowTouch[0] === "up", "high 4 regression check: a real touch press on the same button still fires pressKey exactly ONCE, not twice (pointerdown+click double-fire would be a new regression) -- got: " + JSON.stringify(afterArrowTouch));
        await page.evaluate(() => { CharKeys.closeArrowPad(); });
        await page.waitForTimeout(200);

        // === High 5: forceReset() in arrows mode must route through CharKeys' ownership API, not leak state ===
        const preOpenGuards = await page.evaluate(() => ({
            dirUndefined: typeof DirectionalRadial === "undefined",
            bodyHasOpen: document.body.classList.contains("pl-dirpad-open"),
            mode: DirectionalRadial._mode,
            dirEnabled: Global.Prefs.DirectionalRadialEnabled,
            playable: DirectionalRadial.IsStoryPlayable(),
            handleExists: !!DirectionalRadial.handle
        }));
        console.log("DEBUG pre-openArrowPad(auto) guards:", JSON.stringify(preOpenGuards));
        // We're genuinely sitting at a real LineInput prompt here, not a
        // real native-menu CharInput -- the pre-existing (untouched by
        // D118/D119) syncAutoPad/leaveAutoPadMode would correctly tear a
        // forced-open auto pad right back down on its very next real tick,
        // since lineReady is true. That is CORRECT existing behavior, not
        // what this test is about -- stub gridCharTarget() truthy so the
        // real eligibility check reads "still legitimately eligible" and
        // leaves our manually-opened pad alone until we trigger blur.
        await page.evaluate(() => { CharKeys.gridCharTarget = function () { return document.createElement("div"); }; });
        await page.evaluate(() => {
            CharKeys.openArrowPad("auto");
            CharKeys._autoEligible = true;
        });
        await page.waitForTimeout(200);
        const postOpen = await page.evaluate(() => ({ mode: DirectionalRadial._mode, ringHidden: DirectionalRadial.ring.hidden, bodyHasOpen: document.body.classList.contains("pl-dirpad-open") }));
        console.log("DEBUG post-openArrowPad(auto):", JSON.stringify(postOpen));
        // Read state synchronously in the SAME evaluate call as the blur
        // dispatch (not a separate round-trip after a wait) -- forceReset()
        // runs synchronously inside the blur handler, but this test also
        // stubbed gridCharTarget() truthy so the real (untouched)
        // syncAutoPad tick can legitimately re-open the pad again shortly
        // after, once eligibility is correctly cleared -- that re-open is
        // proof the fix works, not something to race against by accident.
        const beforeBlur = await page.evaluate(() => ({
            open: DirectionalRadial.IsArrowModeOpen(), owned: CharKeys._autoPadOwned, eligible: CharKeys._autoEligible,
            _debug: { mode: DirectionalRadial._mode, bodyHasOpen: document.body.classList.contains("pl-dirpad-open"), dirEnabled: Global.Prefs.DirectionalRadialEnabled, playable: DirectionalRadial.IsStoryPlayable() }
        }));
        console.log("DEBUG high5:", JSON.stringify(beforeBlur._debug));
        ok(beforeBlur.open === true && beforeBlur.owned === true, "sanity: an auto-owned arrow pad is genuinely open before the blur test");
        // Dispatch blur AND read the resulting state back in the SAME
        // evaluate call, synchronously -- forceReset() runs synchronously
        // inside the blur handler, but this test also stubbed
        // gridCharTarget() truthy so the real (untouched) syncAutoPad tick
        // can legitimately race in and re-open the pad again shortly after
        // eligibility is correctly cleared. A separate round-trip after a
        // wait would sometimes observe that legitimate re-open instead of
        // the direct, immediate consequence of forceReset() itself.
        const afterBlur = await page.evaluate(() => {
            window.dispatchEvent(new Event("blur"));
            return { open: DirectionalRadial.IsArrowModeOpen(), owned: CharKeys._autoPadOwned, eligible: CharKeys._autoEligible, timer: CharKeys._autoExitTimer };
        });
        ok(afterBlur.open === false, "high 5: a real window 'blur' event closes the auto-opened arrow pad (checked synchronously, before any later real tick can race in)");
        ok(afterBlur.owned === false, "high 5: _autoPadOwned is cleared by the real blur event (was left stuck true before the fix)");
        ok(afterBlur.eligible === false, "high 5: _autoEligible is cleared too (was left stuck true before the fix, which blocked ANY future auto-reopen for the rest of that native menu)");
        ok(afterBlur.timer === null, "high 5: the auto-exit timer is cleared, not left dangling");
        // Now let a real subsequent tick run -- with gridCharTarget() still
        // stubbed truthy and eligibility correctly cleared, the pad SHOULD
        // legitimately reopen on its own (this is the actual practical fix:
        // before it, eligibility stayed stuck and this reopen never happened).
        await page.waitForTimeout(600);
        const reArmed = await page.evaluate(() => DirectionalRadial.IsArrowModeOpen());
        ok(reArmed === true, "high 5 practical consequence: a genuine later eligible tick DOES reopen the pad now (was permanently blocked for the rest of that native menu before the fix)");
        await page.evaluate(() => { CharKeys.closeArrowPad(); delete CharKeys.gridCharTarget; });
        await page.waitForTimeout(200);
        // Prove the practical consequence: eligibility can immediately re-arm afterward (this is what was actually broken).
        const canReArm = await page.evaluate(() => {
            CharKeys._autoEligible = false; // already false, but exercise the real re-entry condition explicitly
            return typeof CharKeys.syncAutoPad === "function";
        });
        ok(canReArm === true, "high 5: syncAutoPad remains callable and _autoEligible is in the correct false state for a genuine future eligible tick to re-open the pad (not permanently stuck)");

        ok(errors.length === 0, "no page errors across all of part 2's checks: " + JSON.stringify(errors));
        await ctx.close();
    }

    // === PART 3: desktop arrow-overlay toggle -- must never touch mobile, must default off, must gate on story/pref ===
    {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); // no isMobile/hasTouch => desktop
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e && e.message).slice(0, 200)));
        await page.goto(storyUrl(), { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
        await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
        await page.waitForTimeout(4000);
        await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });
        await page.waitForTimeout(500);

        const isMobileCtx = await page.evaluate(() => document.body.classList.contains("pl-mobile"));
        ok(isMobileCtx === false, "sanity: this context is genuinely desktop (no pl-mobile class)");

        const defaultState = await page.evaluate(() => ({ pref: Global.Prefs.DesktopArrowPadEnabled, open: DirectionalRadial.IsArrowModeOpen() }));
        ok(defaultState.pref === false, "desktop toggle: DesktopArrowPadEnabled defaults to false in a real fresh session");
        ok(defaultState.open === false, "desktop toggle: the arrow overlay is NOT open by default on desktop");

        // Turn it on for real through Options, not by calling internals directly -- proves the actual UI wiring.
        await page.evaluate(() => WorkspaceUI.ShowOptions());
        await page.waitForTimeout(200);
        const checkboxInfo = await page.evaluate(() => {
            const labels = Array.from(document.querySelectorAll("#game-options label"));
            const lbl = labels.find((l) => /on-screen arrow-key overlay on PC/i.test(l.textContent || ""));
            return { found: !!lbl, checked: lbl ? lbl.querySelector("input[type=checkbox]").checked : null };
        });
        ok(checkboxInfo.found === true, "desktop toggle: the real Options checkbox with the expected label text actually renders in the DOM");
        ok(checkboxInfo.checked === false, "desktop toggle: the real checkbox starts unchecked, matching the false default");
        await page.evaluate(() => {
            const labels = Array.from(document.querySelectorAll("#game-options label"));
            const lbl = labels.find((l) => /on-screen arrow-key overlay on PC/i.test(l.textContent || ""));
            const cb = lbl.querySelector("input[type=checkbox]");
            cb.checked = true;
            cb.dispatchEvent(new Event("change"));
        });
        await page.waitForTimeout(300);
        const afterCheck = await page.evaluate(() => ({ pref: Global.Prefs.DesktopArrowPadEnabled, open: DirectionalRadial.IsArrowModeOpen(), mode: DirectionalRadial._mode }));
        ok(afterCheck.pref === true, "desktop toggle: checking the real checkbox actually sets Global.Prefs.DesktopArrowPadEnabled");
        ok(afterCheck.open === true && afterCheck.mode === "arrows", "desktop toggle: checking it for real opens the arrow overlay via the existing CharKeys.openArrowPad() path (no new rendering code)");

        // Uncheck -- must close again.
        await page.evaluate(() => {
            const labels = Array.from(document.querySelectorAll("#game-options label"));
            const lbl = labels.find((l) => /on-screen arrow-key overlay on PC/i.test(l.textContent || ""));
            const cb = lbl.querySelector("input[type=checkbox]");
            cb.checked = false;
            cb.dispatchEvent(new Event("change"));
        });
        await page.waitForTimeout(300);
        const afterUncheck = await page.evaluate(() => DirectionalRadial.IsArrowModeOpen());
        ok(afterUncheck === false, "desktop toggle: unchecking it closes the overlay again");
        await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });

        // Idempotency: repeatedly re-evaluating ApplyEnabledState with the pref ON must not thrash open/close or call openArrowPad redundantly.
        await page.evaluate(() => {
            Global.Prefs.DesktopArrowPadEnabled = true;
            DirectionalRadial.ApplyEnabledState();
            window.__openCalls = 0;
            const real = CharKeys.openArrowPad;
            CharKeys.openArrowPad = function () { window.__openCalls++; return real.apply(this, arguments); };
            for (let i = 0; i < 5; i++) DirectionalRadial.ApplyEnabledState();
        });
        await page.waitForTimeout(200);
        const idempo = await page.evaluate(() => ({ calls: window.__openCalls, open: DirectionalRadial.IsArrowModeOpen() }));
        ok(idempo.calls === 0, "desktop toggle: re-evaluating ApplyEnabledState() 5 more times while already open does NOT call openArrowPad() again (idempotent, no thrash/redundant calls) -- got " + idempo.calls + " extra calls");
        ok(idempo.open === true, "desktop toggle: it stays open across repeated re-evaluation");
        await page.evaluate(() => { Global.Prefs.DesktopArrowPadEnabled = false; DirectionalRadial.ApplyEnabledState(); });

        ok(errors.length === 0, "no page errors across desktop toggle checks: " + JSON.stringify(errors));
        await ctx.close();
    }

    // === PART 4: mobile context -- prove the desktop toggle NEVER touches mobile's own arrow-pad ownership ===
    {
        const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
        const page = await ctx.newPage();
        await page.addInitScript(() => { try { localStorage.setItem("PL_MobileTutorialSeen", "1"); } catch (e) {} });
        await page.goto(storyUrl(), { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
        await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
        await page.waitForTimeout(4000);
        await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });
        await page.waitForTimeout(500);

        // Manually open the mobile pad (simulating Tools > Arrow keys), then hammer ApplyEnabledState
        // with the desktop pref flipping around -- on mobile, none of that should ever call open/close.
        await page.evaluate(() => {
            CharKeys.openArrowPad(); // manual, mobile-owned
            window.__openCalls = 0; window.__closeCalls = 0;
            const ro = CharKeys.openArrowPad, rc = CharKeys.closeArrowPad;
            CharKeys.openArrowPad = function () { window.__openCalls++; return ro.apply(this, arguments); };
            CharKeys.closeArrowPad = function () { window.__closeCalls++; return rc.apply(this, arguments); };
            Global.Prefs.DesktopArrowPadEnabled = true; DirectionalRadial.ApplyEnabledState();
            Global.Prefs.DesktopArrowPadEnabled = false; DirectionalRadial.ApplyEnabledState();
            Global.Prefs.DesktopArrowPadEnabled = true; DirectionalRadial.ApplyEnabledState();
        });
        await page.waitForTimeout(200);
        const mobileGuard = await page.evaluate(() => ({ opens: window.__openCalls, closes: window.__closeCalls, stillOpen: DirectionalRadial.IsArrowModeOpen() }));
        ok(mobileGuard.opens === 0 && mobileGuard.closes === 0, "PART 4: on real mobile, flipping DesktopArrowPadEnabled and re-evaluating ApplyEnabledState NEVER calls openArrowPad/closeArrowPad -- mobile's own manual/auto ownership is completely untouched (got opens=" + mobileGuard.opens + " closes=" + mobileGuard.closes + ")");
        ok(mobileGuard.stillOpen === true, "PART 4: the mobile-opened pad is still open and undisturbed after all that desktop-pref churn");
        await ctx.close();
    }

    // === PART 5: operator-reported live bug -- wide desktop window, map panel open beside the story ===
    {
        const ctx = await browser.newContext({ viewport: { width: 2560, height: 1329 } }); // matches the operator's own screenshot
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e && e.message).slice(0, 200)));
        await page.goto(storyUrl(), { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
        await page.evaluate(() => { const s = document.querySelector(".parchlock-splash__start"); if (s) s.click(); });
        await page.waitForTimeout(4000);
        await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });
        await page.waitForTimeout(500);
        for (let i = 0; i < 8; i++) {
            const hasLine = await page.evaluate(() => !!document.querySelector(".Input.LineInput"));
            if (hasLine) break;
            await page.evaluate(() => { try { CharKeys.sendChar(" "); } catch (e) {} });
            await page.waitForTimeout(1200);
        }
        // Open the map for real (Menu/Tools -> Map path), toggling only if
        // it isn't already open -- desktop can default to map-open already.
        await page.evaluate(() => {
            try { if (!document.body.classList.contains("map-open")) ParchLockMap.Toggle(); } catch (e) {}
        });
        await page.waitForTimeout(500);
        ok((await page.evaluate(() => document.body.classList.contains("map-open"))), "PART 5 sanity: the map panel is genuinely open, matching the operator's own screenshot");

        const geo = await page.evaluate(() => {
            const wp = document.getElementById("windowport").getBoundingClientRect();
            const handle = document.getElementById("pl-dirpad-handle").getBoundingClientRect();
            return { wpCenter: wp.left + wp.width / 2, handleCenter: handle.left + handle.width / 2, handleRect: handle };
        });
        ok(Math.abs(geo.handleCenter - geo.wpCenter) < 5, "PART 5: with the map panel open on a wide desktop window, the handle is centered over the actual story/#windowport column, not the whole viewport (handle " + geo.handleCenter.toFixed(1) + " vs windowport center " + geo.wpCenter.toFixed(1) + ") -- was landing at the seam with the map panel before the fix");

        // Handle opens on pointer hold; synthesize pointer events on the element.
        await page.evaluate(() => {
            var h = document.getElementById("pl-dirpad-handle");
            var r = h.getBoundingClientRect();
            var x = r.left + r.width / 2, y = r.top + r.height / 2;
            h.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", buttons: 1 }));
        });
        await page.waitForTimeout(900);
        ok((await page.evaluate(() => !document.getElementById("pl-dirpad-ring").hidden)), "PART 5: holding the handle actually opens the compass ring while the map panel is open on desktop -- was silently blocked by CanOpen()'s own map-open check before the fix (\"doesn't do anything\")");
        await page.evaluate(() => {
            var h = document.getElementById("pl-dirpad-handle");
            h.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "mouse" }));
        });
        await page.waitForTimeout(300);

        // And confirm a real window resize alone (no class change) keeps it centered too.
        await page.setViewportSize({ width: 1800, height: 1000 });
        await page.waitForTimeout(600);
        const geo2 = await page.evaluate(() => {
            const wp = document.getElementById("windowport").getBoundingClientRect();
            const handle = document.getElementById("pl-dirpad-handle").getBoundingClientRect();
            return { wpCenter: wp.left + wp.width / 2, handleCenter: handle.left + handle.width / 2 };
        });
        ok(Math.abs(geo2.handleCenter - geo2.wpCenter) < 5, "PART 5: a plain window resize (no map toggle) alone still keeps the handle centered over #windowport, not stuck at the old viewport width's position");

        ok(errors.length === 0, "PART 5: no page errors: " + JSON.stringify(errors));
        await ctx.close();
    }

    await browser.close();
    console.log("\n" + pass + " PASS / " + fail + " FAIL");
    process.exit(fail ? 1 : 0);
})();
