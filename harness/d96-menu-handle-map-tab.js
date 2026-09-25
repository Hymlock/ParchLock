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

            await page.evaluate(() => WorkspaceUI.ShowOptions());
            ok(await page.evaluate(() => !document.getElementById('pl-replay-mobile-tutorial')), 'D120: the old mobile-only replay button id is gone');
            ok(await page.evaluate(() => !!document.getElementById('pl-replay-tutorial') && !!document.getElementById('pl-reset-tutorial')), 'D120: Options exposes the new platform-neutral Replay tutorial and Reset tutorial controls');

            // Replay warns before leaving the live game, then really navigates.
            await page.evaluate(() => { window.__confirmCalls = 0; window.confirm = () => { window.__confirmCalls++; return false; }; });
            await page.click('#pl-replay-tutorial');
            await page.waitForTimeout(200);
            ok(await page.evaluate(() => window.__confirmCalls === 1), 'D120: Replay tutorial asks for confirmation before leaving the live game');
            ok(/play\.html/.test(page.url()), 'D120: declining the confirmation stays on play.html (the live game is not abandoned)');

            await page.evaluate(() => { window.confirm = () => true; });
            await Promise.all([
                page.waitForURL(/tutorial\.html/, { timeout: 5000 }).catch(() => null),
                page.click('#pl-replay-tutorial')
            ]);
            ok(/tutorial\.html/.test(page.url()), 'D120: confirming Replay tutorial really navigates to tutorial.html: ' + page.url());
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
                ok(alpha(cs.bg) <= 0.15 && alpha(cs.fg) <= 0.6, tag + 'Map tab is translucent (bg a=' + alpha(cs.bg) + ', icon a=' + alpha(cs.fg) + ')');
                const textRight = await page.evaluate(() => {
                    let max = 0; const wp = document.getElementById('windowport');
                    const walker = document.createTreeWalker(wp, NodeFilter.SHOW_TEXT);
                    let n; while ((n = walker.nextNode())) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.setStart(n, 0); rg.setEnd(n, n.textContent.replace(/s+$/, "").length); for (const r of rg.getClientRects()) if (r.width) max = Math.max(max, r.right); }
                    return max;
                });
                ok(textRight <= tab.l + 0.5, tag + 'Map tab covers no story text (text ends ' + textRight.toFixed(1) + ', tab starts ' + tab.l.toFixed(1) + ')');
            }

            {   // The right-hand exit rail (up / e / down labels) is tappable travel. A label that reaches the tab must WIN the tap,
                // and the empty rail strip must not swallow taps meant for the tab.
                const r = await page.evaluate(() => {
                    const t = document.getElementById('pl-map-tab'), tr = t.getBoundingClientRect();
                    const labels = [...document.querySelectorAll('#exits .row.vertical.right .exit.shown .dir-name, #exits .row.vertical.right .exit.shown .room-name')];
                    let labelWins = true, touching = 0;
                    for (const l of labels) {
                        const lr = l.getBoundingClientRect();
                        const x0 = Math.max(lr.left, tr.left), x1 = Math.min(lr.right, tr.right), y0 = Math.max(lr.top, tr.top), y1 = Math.min(lr.bottom, tr.bottom);
                        if (x1 > x0 && y1 > y0) { touching++; if (document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2) !== l) labelWins = false; }
                    }
                    // Tab points not covered by any label must belong to the tab.
                    let free = 0, freeOk = 0;
                    for (let y = tr.top + 2; y < tr.bottom - 1; y += 4) {
                        const x = (tr.left + tr.right) / 2;
                        if (labels.some(l => { const q = l.getBoundingClientRect(); return x >= q.left && x <= q.right && y >= q.top && y <= q.bottom; })) continue;
                        free++; const e = document.elementFromPoint(x, y); if (e && (e.id === 'pl-map-tab' || e.closest('#pl-map-tab'))) freeOk++;
                    }
                    return { n: labels.length, touching, labelWins, free, freeOk };
                });
                ok(r.n > 0 && r.labelWins, tag + 'exit labels win over the Map tab where they touch (' + r.touching + ' touching of ' + r.n + ')');
                ok(r.free > 0 && r.free === r.freeOk, tag + 'every uncovered point of the Map tab is tappable (' + r.freeOk + '/' + r.free + ')');
            }

            if (w === 390) {
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
                    const labels = Array.from(document.querySelectorAll('#radial-menu .radial-command')).map(b => b.textContent.trim());
                    return {
                        ctx: (window.jQuery && jQuery('#radial-menu').data('context') || {}).source,
                        list: document.getElementById('radial-menu').classList.contains('pl-tools-list'),
                        labels,
                        unique: new Set(labels).size === labels.length,
                        more: labels.includes('More...'),
                        handlers: ['Open map', 'Modules', 'Exit game'].every(label => {
                            const b = Array.from(document.querySelectorAll('#radial-menu .radial-command')).find(x => x.textContent.trim() === label);
                            return b && typeof jQuery(b).data('action') === 'function';
                        }),
                        closePosition: getComputedStyle(document.querySelector('#radial-menu .pl-tools-close')).position
                    };
                });
                const expected = ['Save', 'Restore', 'Open map', 'Save files', 'Map files', 'Modules', 'Items', 'Transcript', 'History', 'Display', 'Commands', 'Help', 'About', 'Theme', 'Options', 'Exit game'];
                ok(toolsList.ctx === 'tools' && toolsList.list, tag + 'Tools opens the existing scrollable mobile list');
                ok(toolsList.unique && expected.every(label => toolsList.labels.includes(label)), tag + 'Tools list contains every deduplicated tool and former Menu action');
                ok(!toolsList.labels.includes('Tools') && !toolsList.more, tag + 'Tools list has no recursive Tools or pagination entry');
                ok(toolsList.handlers, tag + 'Open map, Modules, and Exit game retain real handlers');
                ok(toolsList.closePosition === 'sticky', tag + 'close control remains reachable while the long list scrolls');
                if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'd96-tools-list.png') });
                const hid = await page.evaluate(() => ({ tab: getComputedStyle(document.getElementById('pl-map-tab')).visibility }));
                ok(hid.tab === 'hidden', tag + 'Map tab hides while the Tools list is open');

                // The newly added Open map action invokes the existing map toggle.
                await page.evaluate(() => Array.from(document.querySelectorAll('#radial-menu .radial-command')).find(b => b.textContent.trim() === 'Open map').click());
                await page.waitForTimeout(500);
                ok(await page.evaluate(() => document.body.classList.contains('map-open')), tag + 'Open map list action opens the existing map');
                await page.evaluate(() => ParchLockMap.Toggle());
                await page.waitForTimeout(300);

                // Exit remains guarded by the existing confirmation dialog.
                await page.evaluate(() => { WorkspaceUI.OpenTools(); });
                await page.waitForTimeout(300);
                await page.evaluate(() => Array.from(document.querySelectorAll('#radial-menu .radial-command')).find(b => b.textContent.trim() === 'Exit game').click());
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
            ok(!t, 'desktop: Map tab not shown');
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
            const desktopTools = await page.evaluate(() => ({
                list: document.getElementById('radial-menu').classList.contains('pl-tools-list'),
                labels: Array.from(document.querySelectorAll('#radial-menu .radial-command')).map(b => b.textContent.trim())
            }));
            ok(!desktopTools.list && !desktopTools.labels.includes('Open map') && !desktopTools.labels.includes('Modules') && !desktopTools.labels.includes('Exit game'), 'desktop: Tools radial remains unchanged');

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
