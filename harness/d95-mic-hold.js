/**
 * D95 live regression: the mobile microphone button.
 *
 * Operator report: the default mode is HOLD-TO-TALK (records for as long as the
 * button is held); the alternative is TAP-to-toggle. Pressing the button showed
 * no held state and did not work correctly.
 *
 * The native plugin (@capacitor-community/speech-recognition, Android
 * SpeechRecognizer) is modelled from its real source, not idealised:
 *   - start({partialResults:false}) resolves only when the recognizer ends: it
 *     ends BY ITSELF a short time after speech stops (so one call can never last
 *     "as long as you hold"), or when stop() is called.
 *   - a session that heard nothing REJECTS ("No match" / "No speech input").
 *   - available()/checkPermissions() are async.
 * Real CDP touch events drive the button. Speech is scripted on a timeline
 * relative to the press, with a pause longer than the recognizer's own
 * end-of-speech timeout in the middle of the hold.
 *
 * Usage: node harness/d95-mic-hold.js   (file://, no server)
 */
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

const PAGE = pathToFileURL(path.resolve(__dirname, '..', 'play.html')).href + '?story=games/Zork1-TheGreatUndergroundEmpire.z3.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.error('FAIL:', msg); } }

// Injected before the page scripts: a faithful model of the native plugin.
function installNativeModel(opts) {
    window.__mic = { t0: 0, sessions: 0, live: 0, calls: [], speech: [], endpointMs: 1500, noSpeechMs: 4000, perm: 'granted' };
    const M = window.__mic;
    const now = () => performance.now() - M.t0;
    let cur = null;
    function finish(sess, why) {
        if (sess.done) return; sess.done = true; M.live--;
        clearTimeout(sess.timer);
        const words = M.speech.filter(s => s.at >= sess.startAt && s.at <= now()).map(s => s.text);
        if (!words.length) { sess.reject(new Error(why === 'stop' ? 'No match' : 'No speech input')); return; }
        sess.resolve({ status: 'success', matches: [words.join(' ')] });
    }
    function arm(sess) {
        clearTimeout(sess.timer);
        const heard = M.speech.filter(s => s.at >= sess.startAt && s.at <= now());
        const last = heard.length ? heard[heard.length - 1].at : sess.startAt;
        const wait = heard.length ? M.endpointMs : M.noSpeechMs;
        sess.timer = setTimeout(() => {
            // Re-check: more speech may have arrived while waiting.
            const h = M.speech.filter(s => s.at >= sess.startAt && s.at <= now());
            const l = h.length ? h[h.length - 1].at : sess.startAt;
            if (now() - l >= wait - 20) finish(sess, 'timeout'); else arm(sess);
        }, Math.max(20, last + wait - now()));
    }
    const plugin = {
        available: () => { M.calls.push('available'); return new Promise(r => setTimeout(() => r({ available: true }), 40)); },
        checkPermissions: () => { M.calls.push('checkPermissions'); return new Promise(r => setTimeout(() => r({ speechRecognition: M.perm }), 40)); },
        requestPermissions: () => { M.calls.push('requestPermissions'); return new Promise(r => setTimeout(() => r({ speechRecognition: M.perm === 'denied' ? 'denied' : 'granted' }), 60)); },
        start: (o) => {
            M.calls.push('start'); M.sessions++; M.live++;
            return new Promise((resolve, reject) => {
                const sess = { startAt: now(), resolve, reject, done: false, timer: 0 };
                cur = sess; arm(sess);
                // Speech that arrives later re-arms the endpoint timer.
                M.speech.forEach(s => { if (s.at > now()) setTimeout(() => { if (!sess.done) arm(sess); }, s.at - now() + 5); });
            });
        },
        stop: () => { M.calls.push('stop'); if (cur && !cur.done) finish(cur, 'stop'); return Promise.resolve(); }
    };
    window.Capacitor = { Plugins: { SpeechRecognition: plugin, App: { addListener() {}, exitApp() {} } } };
}

async function open(browser, hold, extraInit) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 911 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); localStorage.setItem('PL_TutorialSeen','1'); localStorage.setItem('PL_TutorialLibrarySeen','1'); localStorage.setItem('PL_MobileTutorialSeen', '1'); } catch (e) {} });
    await page.addInitScript(installNativeModel);
    await page.addInitScript(h => { try { localStorage.setItem('PL_Prefs', JSON.stringify({ MicHoldToTalk: h })); } catch (e) {} }, hold);
    if (extraInit) await page.addInitScript(extraInit);
    await page.goto(PAGE + '&t=' + Date.now());
    await page.waitForTimeout(3500);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    await page.waitForTimeout(400);
    const cdp = await ctx.newCDPSession(page);
    const box = await page.evaluate(() => { const r = document.getElementById('pl-input-mic').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
    return { ctx, page, cdp, box };
}
const down = (h) => h.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: h.box.x, y: h.box.y }] });
const up = (h) => h.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const state = (page) => page.evaluate(() => {
    const b = document.getElementById('pl-input-mic'), cs = getComputedStyle(b), st = document.getElementById('pl-mic-status');
    return {
        cls: b.className, pressed: b.getAttribute('aria-pressed'),
        input: document.querySelector('.Input.LineInput') ? document.querySelector('.Input.LineInput').value : null,
        live: window.__mic.live, sessions: window.__mic.sessions,
        status: st ? st.textContent : '', statusVisible: st ? getComputedStyle(st).display !== 'none' && st.textContent.trim() !== '' : false,
        select: cs.userSelect, callout: cs.webkitTouchCallout || cs.getPropertyValue('-webkit-touch-callout'), touchAction: cs.touchAction
    };
});
const isHeld = s => /pl-mic-(held|active)/.test(s.cls) || s.pressed === 'true';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        // ---- A. HOLD mode: visible immediately, continuous across a pause, commits on release. ----
        {
            // D167 made hold-release auto-send the default; this case asserts the
            // dictated text lands in the line, so it runs with auto-send OFF.
            const h = await open(browser, true, () => { try { localStorage.setItem('PL_Prefs', JSON.stringify({ MicHoldToTalk: true, MicAutoSendOnRelease: false })); } catch (e) {} });
            await h.page.evaluate(() => { __mic.speech = [{ at: 500, text: 'open' }, { at: 3600, text: 'the mailbox' }]; });
            await h.page.evaluate(() => { __mic.t0 = performance.now(); });
            await down(h);
            await h.page.waitForTimeout(90);   // BEFORE the async available()/permission chain can finish
            let s = await state(h.page);
            ok(isHeld(s), 'A: the button shows a held/recording state immediately on press (cls="' + s.cls + '")');
            ok(!s.statusVisible && !(await h.page.evaluate(() => !!document.getElementById('pl-mic-status'))), 'A: NO text element exists for the mic at all -- the lit button is the only indicator');
            ok(await h.page.evaluate(() => { const b = document.getElementById('pl-input-mic'); const c = getComputedStyle(b); return c.backgroundColor !== getComputedStyle(document.getElementById('pl-input-submit')).backgroundColor && b.classList.contains('pl-mic-active'); }), 'A: the button is visibly lit (background differs from an idle button)');
            await h.page.waitForTimeout(1500);
            s = await state(h.page);
            ok(isHeld(s), 'A: still shown as held mid-recording');
            await h.page.waitForTimeout(2900); // t~4.5s: past the 3.6s utterance, recognizer auto-ended at least once in the pause
            s = await state(h.page);
            ok(isHeld(s), 'A: still shown as held after the recognizer ended on its own during the pause');
            ok(s.live >= 1, 'A: recording is still live while the finger is still down (live sessions=' + s.live + ')');
            ok(!/mailbox|open/.test(s.input || ''), 'A: nothing is inserted into the command line until release');
            await up(h);
            await h.page.waitForTimeout(1500);
            s = await state(h.page);
            ok(!isHeld(s), 'A: held state clears on release (cls="' + s.cls + '")');
            ok(s.live === 0, 'A: no recording session remains after release (live=' + s.live + ')');
            ok(/open/.test(s.input || '') && /mailbox/.test(s.input || ''), 'A: BOTH phrases spoken across the pause are captured (input="' + s.input + '")');
            ok(!(await h.page.evaluate(() => /pl-mic-error/.test(document.getElementById('pl-input-mic').className))), 'A: no error flash after a good recording');
            await h.ctx.close();
        }

        // ---- B. HOLD mode: a quick tap must not start recording after release, and must not report an error. ----
        {
            const h = await open(browser, true);
            await h.page.evaluate(() => { __mic.speech = []; __mic.t0 = performance.now(); });
            await down(h); await h.page.waitForTimeout(120); await up(h);
            await h.page.waitForTimeout(1500);
            const s = await state(h.page);
            ok(s.live === 0, 'B: releasing before the async start chain completes leaves NO recording running (live=' + s.live + ')');
            ok(!/pl-mic-error/.test(s.cls), 'B: an empty press (no speech) is not reported as a failure (cls="' + s.cls + '")');
            ok(!isHeld(s), 'B: not stuck in the held state');
            await h.ctx.close();
        }

        // ---- C. HOLD mode: a hold with no speech is quiet, not an error. ----
        {
            const h = await open(browser, true);
            await h.page.evaluate(() => { __mic.speech = []; __mic.t0 = performance.now(); });
            await down(h); await h.page.waitForTimeout(1200); await up(h);
            await h.page.waitForTimeout(1200);
            const s = await state(h.page);
            ok(!/pl-mic-error/.test(s.cls) && s.live === 0 && !isHeld(s), 'C: holding through silence ends cleanly with no error (cls="' + s.cls + '")');
            await h.ctx.close();
        }

        // ---- D. Permission denied: the failure must be VISIBLE on a touchscreen (title text is not). ----
        {
            const h = await open(browser, true);
            await h.page.evaluate(() => { __mic.perm = 'denied'; __mic.t0 = performance.now(); });
            await down(h); await h.page.waitForTimeout(700); await up(h);
            await h.page.waitForTimeout(500);
            const s = await state(h.page);
            const d = await h.page.evaluate(() => { const b = document.getElementById('pl-input-mic'); const a = getComputedStyle(b, '::after'); return { err: b.classList.contains('pl-mic-error'), sign: a.content !== 'none' && a.content !== 'normal', border: getComputedStyle(b).borderTopColor, pill: !!document.getElementById('pl-mic-status'), text: b.textContent.trim().length }; });
            ok(d.err && d.sign, 'D: a failure flashes the button red with a circle-and-line sign over it (err=' + d.err + ' sign=' + d.sign + ' border=' + d.border + ')');
            ok(!d.pill, 'D: and NO text element exists anywhere for the mic');
            await h.page.waitForTimeout(2800);
            ok(!(await h.page.evaluate(() => document.getElementById('pl-input-mic').classList.contains('pl-mic-error'))), 'D: the failure sign clears by itself after a couple of seconds');
            await h.ctx.close();
        }

        // ---- E. The button must survive a long press (no text-selection / context menu). ----
        {
            const h = await open(browser, true);
            const s = await state(h.page);
            ok(s.select === 'none', 'E: button is not text-selectable (user-select=' + s.select + ')');
            ok(s.touchAction === 'none', 'E: touch-action:none so the gesture is not claimed by scrolling (' + s.touchAction + ')');
            const prevented = await h.page.evaluate(() => { const e = new Event('contextmenu', { cancelable: true, bubbles: true }); document.getElementById('pl-input-mic').dispatchEvent(e); return e.defaultPrevented; });
            ok(prevented, 'E: the long-press context menu is suppressed on the button');
            await h.ctx.close();
        }

        // ---- F. TAP mode: tap to start, ends by itself after speech, indicator shown while listening. ----
        {
            const h = await open(browser, false);
            await h.page.evaluate(() => { __mic.speech = [{ at: 400, text: 'north' }]; __mic.t0 = performance.now(); });
            await down(h); await h.page.waitForTimeout(60); await up(h);
            await h.page.waitForTimeout(500);
            let s = await state(h.page);
            ok(isHeld(s) && s.live >= 1, 'F: tap mode shows the listening state while recording (cls="' + s.cls + '")');
            await h.page.waitForTimeout(2600);
            s = await state(h.page);
            ok(!isHeld(s) && /north/.test(s.input || ''), 'F: tap mode ends on silence and inserts the text (input="' + s.input + '")');
            await h.ctx.close();
        }
        // ---- G. TAP mode: tapping again while listening stops it. ----
        {
            const h = await open(browser, false);
            await h.page.evaluate(() => { __mic.speech = [{ at: 300, text: 'east' }]; __mic.t0 = performance.now(); });
            await down(h); await up(h);
            await h.page.waitForTimeout(700);
            await down(h); await up(h);
            await h.page.waitForTimeout(700);
            const s = await state(h.page);
            ok(s.live === 0 && !isHeld(s), 'G: a second tap stops listening (live=' + s.live + ')');
            ok(/east/.test(s.input || ''), 'G: the words heard before the stop are kept (input="' + s.input + '")');
            await h.ctx.close();
        }

        // ---- H. Switching hold <-> tap in Settings takes effect immediately. ----
        {
            const h = await open(browser, true);
            await h.page.evaluate(() => { __mic.speech = [{ at: 300, text: 'west' }]; Global.Prefs.MicHoldToTalk = false; Input.InitMic(); __mic.t0 = performance.now(); });
            await down(h); await h.page.waitForTimeout(60); await up(h);          // a TAP now
            await h.page.waitForTimeout(500);
            let s = await state(h.page);
            ok(isHeld(s), 'H: after switching to tap mode, a quick tap starts listening and STAYS lit after the finger lifts');
            await h.page.waitForTimeout(2600);
            s = await state(h.page);
            ok(/west/.test(s.input || '') && !isHeld(s), 'H: and it finishes by itself on silence (input="' + s.input + '")');
            await h.ctx.close();
        }

        // ---- I. Browser/PWA path (Web Speech API, no Capacitor): same hold behaviour. ----
        {
            const ctx = await browser.newContext({ viewport: { width: 412, height: 911 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
            const page = await ctx.newPage();
            // D167: insertion is asserted below, so hold-release auto-send is OFF here.
            await page.addInitScript(() => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); localStorage.setItem('PL_MobileTutorialSeen', '1'); localStorage.setItem('PL_Prefs', JSON.stringify({ MicAutoSendOnRelease: false })); } catch (e) {} });
            await page.addInitScript(() => {
                window.__web = { started: 0, stopped: 0, live: 0 };
                window.SpeechRecognition = class {
                    start() { __web.started++; __web.live++; this.t = setTimeout(() => { this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'look around' }], { isFinal: true })] }); }, 700); }
                    stop() { __web.stopped++; clearTimeout(this.t); __web.live--; setTimeout(() => this.onend && this.onend(), 30); }
                };
            });
            await page.goto(PAGE + '&t=' + Date.now());
            await page.waitForTimeout(3500);
            await page.evaluate(() => Message.Hide());

            // D133 follow-up: the browser recogniser is deliberately refused on
            // file:// pages -- a local file cannot hold a microphone grant, so
            // every start re-prompts and (in hold-to-talk) the prompt steals
            // focus, releasing the button and prompting again, forever. This
            // harness loads play.html FROM DISK, so assert that refusal here,
            // then stand in for a served origin to exercise the recording path
            // itself. The real served-vs-file behaviour is covered live.
            const refusedOnFile = await page.evaluate(() => Input.MicWebSupported());
            ok(refusedOnFile === false, 'I: the browser recogniser is refused on a file:// page (no repeating permission prompt)');
            const struck = await page.evaluate(() => document.getElementById('pl-input-mic').classList.contains('pl-mic-unavailable'));
            ok(struck === true, 'I: and the button shows its struck-through, self-explaining state instead');
            await page.evaluate(() => {
                Input.MicWebSupported = function () { return true; };
                Input.Mic.init();
            });
            await page.waitForTimeout(150);

            const cdp = await ctx.newCDPSession(page);
            const b = await page.evaluate(() => { const r = document.getElementById('pl-input-mic').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] });
            await page.waitForTimeout(1500);
            let lit = await page.evaluate(() => document.getElementById('pl-input-mic').classList.contains('pl-mic-active'));
            ok(lit && (await page.evaluate(() => __web.live)) === 1, 'I: browser path: lit and recording while held');
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await page.waitForTimeout(800);
            const r = await page.evaluate(() => ({ v: document.querySelector('.Input.LineInput').value, lit: document.getElementById('pl-input-mic').classList.contains('pl-mic-active'), live: __web.live }));
            ok(/look around/.test(r.v) && !r.lit && r.live === 0, 'I: browser path: text inserted on release, unlit, recognizer stopped (input="' + r.v + '")');
            await ctx.close();
        }
    } finally {
        await browser.close();
    }
    console.log(JSON.stringify({ ok: fail === 0, pass, fail }));
    if (fail) { console.error('FAIL: d95-mic-hold (' + fail + ' failed)'); process.exit(1); }
    console.log('PASS: d95-mic-hold (' + pass + ' passed)');
})();
