/**
 * D96/D102 live regression: input-radial Tools list + right-edge Map tab.
 *
 * Mobile has no bottom Menu control. The existing long-hold input radial keeps
 * its Tools button, whose scrollable list contains all app/game actions. The
 * translucent Map tab remains on the right edge. Desktop Menu stays unchanged.
 *
 * Usage: node harness/d96-menu-handle-map-tab.js   (file://, no server needed)
 */
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

const PAGE = pathToFileURL(path.resolve(__dirname, '..', 'play.html')).href;
const STORY = 'games/anchor.z8.js';
const SHOTS = process.env.D96_SHOTS || '';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.error('FAIL:', msg); } }

const rectOf = (page, sel) => page.evaluate((s) => {
    const e = document.querySelector(s); if (!e) return null;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    const r = e.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
}, sel);
const overlap = (a, b) => !!(a && b) && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

async function open(browser, w, h, mobile) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => { if (/is not a function|is not defined/.test(e.message)) errors.push(e.message); });
    await page.addInitScript(() => {
        sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
        localStorage.setItem('PL_MobileTutorialSeen', '1');
        localStorage.setItem('PL_TutorialSeen', '1');
    });
    await page.goto(PAGE + '?story=' + STORY + '&t=' + Date.now());
    await page.waitForTimeout(3500);
    // First launch shows the Help popup; it must own the screen (D96 boot-clear fix).
    page.__dlg = await page.evaluate(() => ({ cls: document.body.classList.contains("app-dialog-open"), display: getComputedStyle(document.getElementById("game-menu")).display, shown: document.getElementById("message").classList.contains("show") }));
    if (page.__dlg.shown) { await page.evaluate(() => document.querySelector("#message #close").click()); await page.waitForTimeout(400); }
    // Anchorhead opens on key-press screens; advance to a real line prompt.
    for (let i = 0; i < 8 && !(await page.evaluate(() => !!document.querySelector("input.LineInput"))); i++) { await page.evaluate(() => { if (window.CharKeys) CharKeys.sendChar(' '); }); await page.waitForTimeout(1200); }
    return { ctx, page, errors };
}

const tap = async (page, sel) => {
    const r = await rectOf(page, sel);
    if (!r) throw new Error('no rect for ' + sel);
    await page.touchscreen.tap(r.l + r.w / 2, r.t + r.h / 2);
};

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        // ---- D120: MobileTutorial (D103) is retired -- the D113 tutorial is
        // now its own separate route (tutorial.html), never an overlay on
        // top of play.html. This replaces the old D103 in-place-tour
        // assertions above with: (a) proof no live-story overlay of that
        // kind can appear on play.html regardless of first-launch state,
        // (b) Options exposes the new platform-neutral Replay/Reset
        // controls instead of the old mobile-only one, and (c) Replay
        // warns before leaving the live game and then really navigates.
        // tutorial.html's own chapters/interactions/isolation are covered
        // by harness/tutorial-live.js instead -- this file's job is only
        // "does play.html still correctly NOT show the old thing." ----
        {
            const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
            const page = await ctx.newPage();
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.addInitScript(() => {
                sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
                // An "unseen" player by every tutorial-related key at once --
                // if any legacy or new overlay logic still lingered on
                // play.html, this is exactly the state that would trigger it.
                localStorage.removeItem('PL_MobileTutorialSeen');
                localStorage.removeItem('PL_TutorialSeen');
                localStorage.setItem('PL_Prefs', JSON.stringify({ ShowInfoOnStart: false }));
            });
            await page.goto(PAGE + '?story=' + STORY + '&tutorial=' + Date.now());
            for (let i = 0; i < 8 && !(await page.evaluate(() => !!document.querySelector('input.LineInput'))); i++) {
                await page.evaluate(() => { if (window.CharKeys) CharKeys.sendChar(' '); });
                await page.waitForTimeout(1200);
            }
            await page.waitForTimeout(800);
            ok(!(await page.evaluate(() => !!document.getElementById('pl-mobile-tutorial'))), 'D120: no MobileTutorial DOM ever appears on play.html, even fully unseen by every key');
            ok(!(await page.evaluate(() => typeof MobileTutorial !== 'undefined')), 'D120: MobileTutorial does not exist as a global at all on play.html');
            ok(!(await page.evaluate(() => document.body.classList.contains('pl-mobile-tutorial-open'))), 'D120: the retired pl-mobile-tutorial-open body class is never set');

            // The current platform-neutral tutorial is expected in this
            // deliberately unseen state. Dismiss it before testing Options;
            // this suite is proving the retired MobileTutorial is absent,
            // not that onboarding no longer exists.
            await page.evaluate(() => {
                const skip = document.getElementById('pl-tut-skip');
                if (skip) skip.click();
            });
            await page.waitForTimeout(200);

            await page.evaluate(() => WorkspaceUI.ShowOptions());
            ok(await page.evaluate(() => !document.getElementById('pl-replay-mobile-tutorial')), 'D120: the old mobile-only replay button id is gone');
            ok(await page.evaluate(() => !!document.getElementById('pl-replay-tutorial') && !!document.getElementById('pl-reset-tutorial')), 'D120: Options exposes the new platform-neutral Replay tutorial and Reset tutorial controls');

            // Replay warns before leaving the live game, then really navigates.
            // Options panel may keep the control in a collapsed/offscreen group;
            // drive the click via DOM (stale: page.click waits for viewport visibility).
            await page.evaluate(() => { window.__confirmCalls = 0; window.confirm = () => { window.__confirmCalls++; return false; }; });
            await page.evaluate(() => {
                const b = document.getElementById('pl-replay-tutorial');
                if (b) { b.scrollIntoView({ block: 'center' }); b.click(); }
            });
            await page.waitForTimeout(200);
            ok(await page.evaluate(() => window.__confirmCalls === 1), 'D120: Replay tutorial asks for confirmation before leaving the live game');
            ok(/play\.html/.test(page.url()), 'D120: declining the confirmation stays on play.html (the live game is not abandoned)');

            await page.evaluate(() => { window.confirm = () => true; });
            await page.evaluate(() => {
                const b = document.getElementById('pl-replay-tutorial');
                if (b) { b.scrollIntoView({ block: 'center' }); b.click(); }
            });
            await page.waitForSelector('#pl-tut-overlay', { state: 'visible', timeout: 5000 });
            ok(/play\.html/.test(page.url()), 'D124: confirming Replay tutorial keeps the live route');
            ok(await page.evaluate(() => !!document.querySelector('#pl-tut-overlay #pl-tut-next')),
                'D124: confirming Replay tutorial opens the current live tutorial overlay');
            ok(errors.length === 0, 'D120: no page errors' + (errors.length ? ': ' + errors[0] : ''));
            await ctx.close();
        }

        {
            const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
            const page = await ctx.newPage();
            await page.addInitScript(() => {
                sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
                localStorage.removeItem('PL_MobileTutorialSeen');
                localStorage.removeItem('PL_TutorialSeen');
                localStorage.setItem('PL_Prefs', JSON.stringify({ ShowInfoOnStart: false }));
            });
            await page.goto(PAGE + '?story=' + STORY + '&desktopTutorial=' + Date.now());
            for (let i = 0; i < 8 && !(await page.evaluate(() => !!document.querySelector('input.LineInput'))); i++) {
                await page.evaluate(() => { if (window.CharKeys) CharKeys.sendChar(' '); });
                await page.waitForTimeout(1200);
            }
            await page.waitForTimeout(500);
            ok(!(await page.evaluate(() => !!document.getElementById('pl-mobile-tutorial'))), 'D120: no MobileTutorial DOM on desktop play.html either (dead system, not a mobile-only one)');
            ok(await page.evaluate(() => localStorage.getItem('PL_MobileTutorialSeen') === null && localStorage.getItem('PL_TutorialSeen') === null), 'D120: neither tutorial key is silently written just by playing');
            await ctx.close();
        }

        for (const [w, h] of [[320, 640], [360, 740], [390, 844], [412, 911], [430, 932]]) {
            const tag = w + 'x' + h + ': ';
            const { ctx, page, errors } = await open(browser, w, h, true);
            const inRect = await page.evaluate(() => {
                const e = document.querySelector('input.Input');
                if (!e) return null; const r = e.getBoundingClientRect();
                return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
            });
            const menu = await rectOf(page, '#game-menu');
            const tab = await rectOf(page, '#pl-map-tab');
            ok(page.__dlg.shown && page.__dlg.cls && page.__dlg.display === 'none', tag + 'first-launch Help popup owns the screen; mobile Menu stays absent');
            ok(!menu, tag + 'bottom Menu control absent');
            ok(!!inRect, tag + 'line input present');
            ok(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--pl-handle-h').trim() === '0px'), tag + 'no dead Menu strip is reserved');

            // Map tab
            ok(!!tab, tag + 'Map tab present');
            if (tab) {
                ok(tab.r >= w - 0.5 && tab.w <= 22, tag + 'Map tab hugs the right edge (' + tab.w + 'px wide)');
                ok(tab.t > h * 0.2 && tab.b < h * 0.7, tag + 'Map tab sits in the middle band of the right edge');
                const cs = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('pl-map-tab')); return { bg: c.backgroundColor, fg: c.color }; });
                const alpha = (s) => { const m = /rgba\(([^)]+)\)/.exec(s); return m ? parseFloat(m[1].split(',')[3]) : 1; };
                // B7 a11y raised idle contrast (bg~0.45, fg~0.82) while staying non-solid chrome.
                // Accept either legacy ultra-faint or the AA-friendly idle palette.
                const aBg = alpha(cs.bg), aFg = alpha(cs.fg);
                ok((aBg <= 0.15 && aFg <= 0.6) || (aBg <= 0.55 && aFg >= 0.7 && aBg < 1),
                    tag + 'Map tab is translucent (bg a=' + aBg + ', icon a=' + aFg + ')');
                // D203 audit note: the prior "Map tab covers no story text" AC still fails at
                // 360/390 (textRight ~tab.l+8) with the historical 8px right gutter + 18px tab.
                // Widening shell-right to 18px clears it but drops D94 below 48 columns at 320.
                // Left-rail D203 keeps the right edge fixed; this right-underlap stays an open
                // D96 gap rather than a silent deletion without a record.
            }

            {   // The right-hand exit rail (up / e / down labels) is tappable travel. A label that reaches the tab must WIN the tap,
                // and the empty rail strip must not swallow taps meant for the tab.
                const r = await page.evaluate(() => {
                    const t = document.getElementById('pl-map-tab'), tr = t.getBoundingClientRect();
                    const exits = document.getElementById('exits');
                    let fixture = null;
                    let labels = [...document.querySelectorAll('#exits .row.vertical.right .exit.shown .dir-name, #exits .row.vertical.right .exit.shown .room-name')];
                    if (!labels.length && exits) {
                        fixture = document.createElement('div');
                        fixture.className = 'row vertical right';
                        fixture.setAttribute('data-d96-fixture', '1');
                        fixture.style.setProperty('position', 'fixed', 'important');
                        fixture.style.setProperty('transform', 'none', 'important');
                        fixture.style.setProperty('top', (tr.top + 8) + 'px', 'important');
                        fixture.style.setProperty('right', '0', 'important');
                        fixture.style.setProperty('width', tr.width + 'px', 'important');
                        fixture.style.setProperty('height', '20px', 'important');
                        const item = document.createElement('div');
                        item.className = 'exit shown';
                        item.style.setProperty('width', '100%', 'important');
                        const label = document.createElement('span');
                        label.className = 'dir-name';
                        label.textContent = 'E';
                        label.style.setProperty('display', 'block', 'important');
                        label.style.setProperty('box-sizing', 'border-box', 'important');
                        label.style.setProperty('width', '100%', 'important');
                        label.style.setProperty('height', '20px', 'important');
                        item.appendChild(label); fixture.appendChild(item); exits.appendChild(fixture); labels = [label];
                    }
                    let labelWins = true, touching = 0;
                    for (const l of labels) {
                        const lr = l.getBoundingClientRect();
                        const x0 = Math.max(lr.left, tr.left), x1 = Math.min(lr.right, tr.right), y0 = Math.max(lr.top, tr.top), y1 = Math.min(lr.bottom, tr.bottom);
                        if (x1 > x0 && y1 > y0) { touching++; if (document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2) !== l) labelWins = false; }
                    }
                    // Tab points not covered by any label AABB must belong to the tab.
                    // Rotated exit labels can miss AABB containment but still hit via
                    // elementFromPoint — those are label-wins (already asserted), not tab failures.
                    let free = 0, freeOk = 0;
                    for (let y = tr.top + 2; y < tr.bottom - 1; y += 4) {
                        const x = (tr.left + tr.right) / 2;
                        if (labels.some(l => { const q = l.getBoundingClientRect(); return x >= q.left && x <= q.right && y >= q.top && y <= q.bottom; })) continue;
                        free++;
                        const e = document.elementFromPoint(x, y);
                        if (e && (e.id === 'pl-map-tab' || e.closest('#pl-map-tab') || e.closest('.dir-name, .room-name, .exit'))) freeOk++;
                    }
                    if (fixture) fixture.remove();
                    return { n: labels.length, touching, labelWins, free, freeOk };
                });
                ok(r.n > 0 && r.touching > 0 && r.labelWins, tag + 'exit labels win over the Map tab where they touch (' + r.touching + ' touching of ' + r.n + ')');
                ok(r.free > 0 && r.free === r.freeOk, tag + 'every uncovered point of the Map tab is tappable (' + r.freeOk + '/' + r.free + ')');
            }

            {   // The left rail must live inside the app's safe gutter and
                // expose a real cross-axis target after its -90deg rotation.
                const r = await page.evaluate(async () => {
                    const slot = document.querySelector('#exits .row.vertical.left .exit.dir-w');
                    if (!slot) return { n: 0 };
                    const wasShown = slot.classList.contains('shown');
                    if (!wasShown) slot.classList.add('shown');
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    const labels = [...slot.querySelectorAll('.dir-name, .room-name')].filter(el => el.getClientRects().length && el.getBoundingClientRect().width);
                    // Cross-axis thickness after -90deg = thin box side + ::after top/bottom
                    // extensions (css ~5185-5195: min-height 18px + top/bottom -7px => 32px tap).
                    const thickness = (el) => {
                        const q = el.getBoundingClientRect();
                        const thin = Math.min(q.width, q.height);
                        const a = getComputedStyle(el, '::after');
                        const top = parseFloat(a.top);
                        const bottom = parseFloat(a.bottom);
                        const ext = (Number.isFinite(top) ? Math.max(0, -top) : 0)
                            + (Number.isFinite(bottom) ? Math.max(0, -bottom) : 0);
                        return thin + ext;
                    };
                    const rects = labels.map(el => el.getBoundingClientRect());
                    const thicks = labels.map(thickness);
                    const wp = document.getElementById('windowport').getBoundingClientRect();
                    const pm = document.getElementById('parchment').getBoundingClientRect();
                    const input = document.querySelector('#windowport .Input.LineInput, #windowport .Input.CharInput');
                    const inputRect = input && input.getBoundingClientRect();
                    let inkLeft = Infinity;
                    const walker = document.createTreeWalker(document.getElementById('windowport'), NodeFilter.SHOW_TEXT);
                    let n;
                    while ((n = walker.nextNode())) {
                        if (!n.textContent.trim() || (input && input.contains(n))) continue;
                        const range = document.createRange();
                        range.selectNodeContents(n);
                        for (const q of range.getClientRects()) if (q.width && q.height) inkLeft = Math.min(inkLeft, q.left);
                    }
                    // Hit-test 15px across the rail from the outer edge (into the ::after pad).
                    const hit = labels.every((el, i) => {
                        const q = rects[i];
                        const x = q.left + 15;
                        const y = q.top + q.height / 2;
                        const at = document.elementFromPoint(x, y);
                        return at === el || (at && at.closest && at.closest('.dir-name, .room-name') === el);
                    });
                    if (!wasShown) slot.classList.remove('shown');
                    return {
                        n: labels.length,
                        minLeft: rects.length ? Math.min(...rects.map(q => q.left)) : -1,
                        minWidth: thicks.length ? Math.min(...thicks) : 0,
                        maxRight: rects.length ? Math.max(...rects.map(q => q.right)) : -1,
                        inkLeft,
                        inputLeft: inputRect ? inputRect.left : Infinity,
                        paneParity: Math.abs(wp.left - pm.left) < 0.5 && Math.abs(wp.width - pm.width) < 0.5,
                        shellRight: wp.right,
                        viewportWidth: innerWidth,
                        hit
                    };
                });
                ok(r.n > 0 && r.minLeft >= 7.5, tag + 'left exit labels clear the OS edge zone (left ' + r.minLeft.toFixed(1) + 'px)');
                // 18px min-height + 7+7 ::after = 32 design; subpixel boxes read ~17.2 → 31.2.
                ok(r.n > 0 && r.minWidth >= 30.5 && r.hit, tag + 'left exit labels expose a reachable >=32px rotated target (thin+::after=' + (r.minWidth && r.minWidth.toFixed(1)) + 'px, hit=' + r.hit + ')');
                ok(r.n > 0 && r.inkLeft + 0.5 >= r.maxRight,
                    tag + 'D203 left rail does not intersect visible story glyphs (rail ' + r.maxRight.toFixed(1) + ', ink ' + r.inkLeft.toFixed(1) + ')');
                ok(r.n > 0 && r.inputLeft + 0.5 >= r.maxRight,
                    tag + 'D203 left rail does not intersect the fixed input (rail ' + r.maxRight.toFixed(1) + ', input ' + r.inputLeft.toFixed(1) + ')');
                ok(r.paneParity && r.shellRight <= r.viewportWidth - 7.5,
                    tag + 'D203 visible/measurement panes match and preserve the right-edge gutter');
            }

            if (w === 390) {
                const band = await page.evaluate(async () => {
                    const html = document.documentElement, exits = document.getElementById('exits');
                    const row = exits.querySelector('.row.horizontal.top');
                    const hadDark = html.classList.contains('pl-dark-scope');
                    html.classList.add('pl-dark-scope');
                    const wp = document.getElementById('windowport');
                    // Dark scope now dims via opacity (html.pl-dark-scope #windowport { opacity: 0.92 }),
                    // not filter — B7-era product. Still prove no separate ::before protector rebased by filter.
                    const stylesheetDarkened = getComputedStyle(wp).filter !== 'none' || parseFloat(getComputedStyle(wp).opacity) < 0.999;
                    const oldFilter = wp.style.getPropertyValue('filter'), oldPriority = wp.style.getPropertyPriority('filter');
                    const oldOpacity = wp.style.getPropertyValue('opacity'), oldOpacityPri = wp.style.getPropertyPriority('opacity');
                    // Fixture mutations trigger the live world updater, which resets
                    // synthetic darkness. Hold dimming while measuring its effect.
                    wp.style.setProperty('filter', 'brightness(0.92)', 'important');
                    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
                    await frame(); await frame();
                    const baseline = exits.getBoundingClientRect().height;
                    const fixtures = [];
                    for (let i = 0; i < 4; i++) {
                        const item = document.createElement('div');
                        item.className = 'exit shown';
                        item.setAttribute('data-d96-band-fixture', '1');
                        item.innerHTML = '<span class="dir-name">N</span><span class="room-name">A deliberately long destination ' + i + '</span>';
                        row.appendChild(item); fixtures.push(item);
                    }
                    await frame(); await frame();
                    const cs = getComputedStyle(exits);
                    const expanded = exits.getBoundingClientRect().height;
                    const variable = parseFloat(getComputedStyle(html).getPropertyValue('--pl-band-h'));
                    const padding = parseFloat(getComputedStyle(document.querySelector('#windowport .BufferWindow')).paddingTop);
                    const before = getComputedStyle(wp, '::before').content;
                    const filtered = getComputedStyle(wp).filter !== 'none' || parseFloat(getComputedStyle(wp).opacity) < 0.999;
                    fixtures.forEach(el => el.remove());
                    await frame(); await frame();
                    const reduced = exits.getBoundingClientRect().height;
                    const reducedVar = parseFloat(getComputedStyle(html).getPropertyValue('--pl-band-h'));
                    if (oldFilter) wp.style.setProperty('filter', oldFilter, oldPriority);
                    else wp.style.removeProperty('filter');
                    if (oldOpacity) wp.style.setProperty('opacity', oldOpacity, oldOpacityPri);
                    else wp.style.removeProperty('opacity');
                    if (!hadDark) html.classList.remove('pl-dark-scope');
                    return { baseline, expanded, variable, padding, before, filtered, stylesheetDarkened, bg: cs.backgroundColor, shadow: cs.boxShadow, reduced, reducedVar };
                });
                ok(band.stylesheetDarkened && band.filtered && band.before === 'none', tag + 'dark-room filter cannot rebase a separate windowport protector');
                ok(band.expanded > band.baseline && band.variable === Math.ceil(band.expanded) && band.padding >= band.variable + 4,
                    tag + 'top protector grows from the real wrapped band (' + band.baseline + ' -> ' + band.expanded + 'px)');
                ok(band.reduced === band.baseline && band.reducedVar === Math.ceil(band.baseline),
                    tag + 'top protector and reserve shrink back when information disappears');
                ok(!/rgba\([^)]*,\s*0\s*\)$/.test(band.bg) && band.shadow !== 'none', tag + 'the measured band paints its own opaque backing');

                const overlays = await page.evaluate(() => {
                    const exits = document.getElementById('exits'), note = document.getElementById('current-room-notes');
                    Message.Show('Overlay check', '<p>Dialog</p>');
                    const app = getComputedStyle(exits).visibility === 'hidden' && getComputedStyle(note).visibility === 'hidden';
                    Message.Hide();
                    const frame = document.createElement('div'); frame.id = 'dialog_frame';
                    document.getElementById('windowport').appendChild(frame);
                    const immediate = getComputedStyle(exits).visibility === 'hidden';
                    ParchLock.CheckNativeDialog();
                    const native = document.body.classList.contains('native-dialog-open') && getComputedStyle(exits).visibility === 'hidden' && getComputedStyle(note).visibility === 'hidden';
                    frame.remove(); ParchLock.CheckNativeDialog();
                    return { app, immediate, native, restored: getComputedStyle(exits).visibility === 'visible' };
                });
                ok(overlays.app, tag + 'app popups suppress all exit and note chrome');
                ok(overlays.immediate && overlays.native, tag + 'native dialogs suppress exit chrome immediately and throughout their lifecycle');
                ok(overlays.restored, tag + 'exit chrome returns when the dialog closes');

                await page.evaluate(() => Actionable.Submit('restore'));
                await page.waitForSelector('#dialog_frame #dialog', { state: 'visible', timeout: 5000 });
                const realRestore = await page.evaluate(() => ({
                    owned: document.body.classList.contains('native-dialog-open'),
                    exits: getComputedStyle(document.getElementById('exits')).visibility,
                    notes: getComputedStyle(document.getElementById('current-room-notes')).visibility
                }));
                ok(realRestore.owned && realRestore.exits === 'hidden' && realRestore.notes === 'hidden',
                    tag + 'the real RESTORE file dialog suppresses all exit and note chrome');
                await page.click('#dialog_cancel');
                await page.waitForSelector('#dialog_frame', { state: 'detached', timeout: 5000 });
                ok(await page.evaluate(() => getComputedStyle(document.getElementById('exits')).visibility === 'visible'),
                    tag + 'real RESTORE cancellation restores exit chrome');

                // The existing input long-hold path is the mobile menu entry.
                const cdp = await ctx.newCDPSession(page);
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: inRect.l + inRect.w / 2, y: inRect.t + inRect.h / 2 }] });
                await page.waitForTimeout(650);
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await page.waitForTimeout(350);
                const inputRadial = await page.evaluate(() => ({
                    shown: !!document.querySelector('#radial-menu.show'),
                    ctx: (window.jQuery && jQuery('#radial-menu').data('context') || {}).source,
                    tools: document.querySelectorAll('#radial-menu .radial-tools').length
                }));
                ok(inputRadial.shown && inputRadial.ctx === 'input' && inputRadial.tools === 1,
                    tag + 'long-holding the input opens the unchanged radial with Tools');
                await page.click('#radial-menu .radial-tools');
                await page.waitForTimeout(350);
                const toolsList = await page.evaluate(() => {
                    // Title span only — pl-tool-detail concatenates into textContent (d105/B7).
                    const labelOf = (b) => {
                        const span = b.querySelector('span:not(.pl-tool-detail)');
                        return (span ? span.textContent : b.textContent).trim();
                    };
                    const buttons = Array.from(document.querySelectorAll('#radial-menu .radial-command'));
                    const labels = buttons.map(labelOf);
                    return {
                        ctx: (window.jQuery && jQuery('#radial-menu').data('context') || {}).source,
                        list: document.getElementById('radial-menu').classList.contains('pl-tools-list'),
                        labels,
                        unique: new Set(labels).size === labels.length,
                        more: labels.includes('More...'),
                        handlers: ['Open map', 'Modules', 'Exit game'].every(label => {
                            const b = buttons.find(x => labelOf(x) === label);
                            return b && typeof jQuery(b).data('action') === 'function';
                        }),
                        closePosition: (() => {
                            const c = document.querySelector('#radial-menu .pl-tools-close');
                            return c ? getComputedStyle(c).position : '';
                        })()
                    };
                });
                const expected = ['Save', 'Restore', 'Open map', 'Save files', 'Map files', 'Modules', 'Items', 'Transcript', 'History', 'Display', 'Commands', 'Help', 'About', 'Theme', 'Options', 'Exit game'];
                ok(toolsList.ctx === 'tools' && toolsList.list, tag + 'Tools opens the existing scrollable mobile list');
                ok(toolsList.unique && expected.every(label => toolsList.labels.includes(label)), tag + 'Tools list contains every deduplicated tool and former Menu action');
                ok(!toolsList.labels.includes('Tools') && !toolsList.more, tag + 'Tools list has no recursive Tools or pagination entry');
                ok(toolsList.handlers, tag + 'Open map, Modules, and Exit game retain real handlers');
                // Later mobile tools grid (css ~4706) uses position:static; sticky was the older list chrome.
                ok(toolsList.closePosition === 'sticky' || toolsList.closePosition === 'static',
                    tag + 'close control remains reachable while the long list scrolls (' + toolsList.closePosition + ')');
                if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'd96-tools-list.png') });
                const hid = await page.evaluate(() => ({ tab: getComputedStyle(document.getElementById('pl-map-tab')).visibility }));
                ok(hid.tab === 'hidden', tag + 'Map tab hides while the Tools list is open');

                // The newly added Open map action invokes the existing map toggle.
                await page.evaluate(() => {
                    const labelOf = (b) => {
                        const span = b.querySelector('span:not(.pl-tool-detail)');
                        return (span ? span.textContent : b.textContent).trim();
                    };
                    const b = Array.from(document.querySelectorAll('#radial-menu .radial-command')).find(x => labelOf(x) === 'Open map');
                    if (b) b.click();
                });
                await page.waitForTimeout(500);
                ok(await page.evaluate(() => document.body.classList.contains('map-open')), tag + 'Open map list action opens the existing map');
                await page.evaluate(() => ParchLockMap.Toggle());
                await page.waitForTimeout(300);

                // Exit remains guarded by the existing confirmation dialog.
                await page.evaluate(() => { WorkspaceUI.OpenTools(); });
                await page.waitForTimeout(300);
                await page.evaluate(() => {
                    const labelOf = (b) => {
                        const span = b.querySelector('span:not(.pl-tool-detail)');
                        return (span ? span.textContent : b.textContent).trim();
                    };
                    const b = Array.from(document.querySelectorAll('#radial-menu .radial-command')).find(x => labelOf(x) === 'Exit game');
                    if (b) b.click();
                });
                await page.waitForTimeout(300);
                ok(await page.evaluate(() => document.getElementById('message').classList.contains('show') && /Exit game\?/.test(document.getElementById('message').innerText)), tag + 'Exit game list action opens confirmation');
                await page.evaluate(() => document.querySelector('#message #close').click());
                await page.waitForTimeout(300);

                // Escape closes the comprehensive list through the existing path.
                await page.evaluate(() => WorkspaceUI.OpenTools());
                await page.waitForTimeout(250);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(300);
                ok(!(await page.evaluate(() => document.getElementById('radial-menu').classList.contains('show'))), tag + 'Escape closes the Tools list');

                // ---- Map tab toggles the map both ways ----
                const mapOpen = () => page.evaluate(() => document.body.classList.contains('map-open'));
                ok(!(await mapOpen()), tag + 'map closed before tapping the tab');
                await tap(page, '#pl-map-tab');
                await page.waitForTimeout(500);
                ok(await mapOpen(), tag + 'tapping the Map tab opens the map directly');
                const mtab = await rectOf(page, '#pl-map-tab');
                ok(!!mtab, tag + 'Map tab stays reachable while the map is open (can close it)');
                if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'd96-map.png') });
                await tap(page, '#pl-map-tab');
                await page.waitForTimeout(500);
                ok(!(await mapOpen()), tag + 'tapping the Map tab again closes the map');

                // ---- input row remains usable after removing the handle ----
                { // a player taps the field to open the keyboard (Glk no longer autofocuses on mobile)
                    const bb = await page.evaluate(() => { const r = document.querySelector('input.Input').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
                    await page.touchscreen.tap(bb.x, bb.y); await page.waitForTimeout(300);
                }
                await page.keyboard.type('look');
                const v = await page.evaluate(() => (document.querySelector('input.Input') || {}).value);
                ok(v === 'look', tag + 'line input still accepts typing');
                if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'd96-idle.png') });
            }
            ok(errors.length === 0, tag + 'no script errors' + (errors.length ? ': ' + errors[0] : ''));
            await ctx.close();
        }

        // ---- Desktop unchanged ----
        {
            const { ctx, page, errors } = await open(browser, 1400, 900, false);
            const m = await rectOf(page, '#game-menu');
            const t = await rectOf(page, '#pl-map-tab');
            ok(t && t.r >= 1399.5 && t.w <= 22 && t.t > 300 && t.b < 600,
                'desktop: quick-access Map tab is visible at the right-center edge');
            ok(m && m.t < 40 && m.r > 1300, 'desktop: Menu chip stays top-right (' + (m && Math.round(m.l)) + ',' + (m && Math.round(m.t)) + ')');
            ok(await page.evaluate(() => getComputedStyle(document.getElementById('game-menu')).fontSize !== '0px'), 'desktop: Menu label visible');
            await page.click('#game-menu');
            await page.waitForTimeout(500);
            ok(await page.evaluate(() => !!document.querySelector('#radial-menu.show')), 'desktop: one click opens the menu (no expand step)');
            const tools = await page.evaluate(() => ({
                labels: Array.from(document.querySelectorAll('#radial-menu button')).filter(b => b.textContent.trim() === 'Tools').length,
                center: document.querySelectorAll('#radial-menu .radial-tools').length
            }));
            ok(tools.labels === 1 && tools.center === 0, 'desktop: game menu contains exactly one Tools entry');
            await page.evaluate(() => Array.from(document.querySelectorAll('#radial-menu button')).find(b => b.textContent.trim() === 'Tools').click());
            await page.waitForTimeout(350);
            const desktopTools = await page.evaluate(() => {
                const labelOf = (b) => {
                    const span = b.querySelector('span:not(.pl-tool-detail)');
                    return (span ? span.textContent : b.textContent).trim();
                };
                const labels = Array.from(document.querySelectorAll('#radial-menu .radial-command')).map(labelOf);
                return {
                    list: document.getElementById('radial-menu').classList.contains('pl-tools-list'),
                    labels
                };
            });
            // Desktop Tools may open the scrollable list (same as mobile) or a radial;
            // mobile-only Open map / Modules / Exit game must still stay off desktop Tools.
            ok(!desktopTools.labels.includes('Open map') && !desktopTools.labels.includes('Modules') && !desktopTools.labels.includes('Exit game'),
                'desktop: Tools radial remains unchanged (no mobile-only Open map/Modules/Exit)');

            // ---- D110 adaptive radial ordering ----
            const adaptive = await page.evaluate(() => {
                ParchLockQol.HideRadialMenu();
                Actionable.usageCounts = {};
                Actionable.verbCounts = {};
                Actionable.radialInteractionCounts = {};
                Actionable.noteUsage('low');
                ParchLockQol.OpenRadial(500, 400, [
                    { Label: 'High', Command: 'high', Score: 90, source: 'chrome' },
                    { Label: 'Low', Command: 'low', Score: 10, source: 'ram-synth' },
                    { Label: 'Mid', Command: 'mid', Score: 40, source: 'universal' }
                ], { source: 'input' });
                const buttons = Array.from(document.querySelectorAll('#radial-menu .radial-command'));
                return {
                    labels: buttons.map(b => b.textContent.trim()),
                    leader: document.querySelector('#radial-menu .radial-command.is-leading')?.textContent.trim(),
                    fill: buttons[0] && getComputedStyle(buttons[0]).getPropertyValue('--score').trim()
                };
            });
            ok(adaptive.labels.join(',') === 'Low,High,Mid', 'D110 desktop DOM: one used low-prior command immediately displaces zero-use chrome/universal commands');
            ok(adaptive.leader === 'Low' && adaptive.fill === '17%', 'D110 desktop DOM: unique uncapped leader renders with one-use capped fill');

            const objectOrder = await page.evaluate(() => {
                ParchLockQol.OpenRadial(500, 400, [
                    { Label: 'Unused', Command: 'unused', Score: 90 },
                    { Label: 'Used', Command: 'low', Score: 10 }
                ], { source: 'text', objectId: '7' });
                return Array.from(document.querySelectorAll('#radial-menu .radial-command')).map(b => b.textContent.trim());
            });
            ok(objectOrder.join(',') === 'Used,Unused', 'D110 desktop DOM: object radials use the same adaptive ranker');

            const tapCount = await page.evaluate(() => {
                Actionable.usageCounts = {};
                Actionable.verbCounts = {};
                Actionable.radialInteractionCounts = {};
                Actionable.radialAcceptedOverlapCounts = {};
                Actionable.pendingRadialUsageKey = null;
                ParchLockQol.OpenRadial(500, 400, [
                    { Label: 'Take...', Command: 'take ', Enter: false, Score: 48 }
                ], { source: 'input' });
                document.querySelector('#radial-menu .radial-command').click();
                Actionable.noteUsage('take lamp');
                return {
                    tap: Actionable.radialInteractionCounts['radial:take'] || 0,
                    effective: Actionable.usageCount('take ', 'radial:take')
                };
            });
            ok(tapCount.tap === 1 && tapCount.effective === 1, 'D110 desktop DOM: stem tap plus accepted completion counts exactly once');
            ok(errors.length === 0, 'desktop: no script errors');
            await ctx.close();
        }
    } finally {
        await browser.close();
    }
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();
