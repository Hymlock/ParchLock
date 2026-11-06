/**
 * D94 live regression (real browser, real game): two intermittent/visible
 * mobile defects.
 *
 * 1. BLANK GAME PANE. ZvmCapture wraps the VM's restart/restore and called
 *    UndoRestoreSync.onStateRestored(), which did not exist -> a TypeError
 *    thrown inside the VM's own boot-time `restart`, aborting the game. The
 *    wrapper is installed by a polling timer, so it only crashed when it landed
 *    before the VM's first restart: ~half of loads. Guard: repeated cold loads
 *    must produce game text and no "is not a function" errors.
 *
 * 2. MISALIGNED TEXT. GlkOte measures its character cell in a test pane inside
 *    #parchment while the real windows live in #windowport, so on mobile the
 *    game was told 44 columns (8.4px cells) though the grid rendered 6px cells;
 *    it hard-wrapped its quote mid-word and mis-centred the title. Guard: on
 *    phone-sized viewports the MEASURED cell must equal the RENDERED cell (grid
 *    and prose), the prose column must hold at least as many characters as the
 *    grid reports, and Anchorhead's boxed quote/title must stay intact.
 *    Desktop keeps its existing metrics.
 *
 * Usage: node harness/d94-cell-and-boot.js   (uses file://, no server needed)
 */
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

const PAGE = pathToFileURL(path.resolve(__dirname, '..', 'play.html')).href;
const STORY = 'games/anchor.z8.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.error('FAIL:', msg); } }

async function open(browser, w, h, mobile) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => { if (/is not a function/.test(e.message)) errors.push(e.message); });
    // Only the real crash signature: file:// always logs unrelated wasm-fetch TypeErrors.
    page.on('console', m => { if (/is not a function/.test(m.text())) errors.push(m.text()); });
    // Record what GlkOte measures, at the instant it removes its test pane.
    await page.addInitScript(() => {
        window.__glkMeasure = null;
        const orig = Node.prototype.removeChild;
        Node.prototype.removeChild = function (c) {
            try {
                if (c && c.id === 'layout_test_pane') {
                    const g = c.querySelector('.GridWindow span'), b = c.querySelector('.BufferWindow span');
                    window.__glkMeasure = { grid: g.getBoundingClientRect().width / 8, buf: b.getBoundingClientRect().width / 8 };
                }
            } catch (e) {}
            return orig.call(this, c);
        };
    });
    await page.goto(PAGE + '?story=' + STORY + '&t=' + Date.now());
    await page.waitForTimeout(3500);
    return { ctx, page, errors };
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        // ---- 1. Boot: repeated cold loads must never blank or throw. ----
        let blank = 0, crashed = 0;
        for (let i = 0; i < 6; i++) {
            const { ctx, page, errors } = await open(browser, 412, 911, true);
            const len = await page.evaluate(() => document.getElementById('windowport').innerText.replace(/\s+/g, ' ').trim().length);
            if (len < 20) blank++;
            if (errors.length) { crashed++; console.error('  load', i, 'errors:', errors.slice(0, 2)); }
            await ctx.close();
        }
        ok(blank === 0, 'game pane renders on all 6 cold loads (was blank on ~half)');
        ok(crashed === 0, 'no "is not a function"/TypeError during boot on any load');

        // ---- 2. Cell parity on phone-sized viewports. ----
        for (const [w, h] of [[320, 640], [360, 740], [390, 844], [412, 911], [430, 932]]) {
            const { ctx, page } = await open(browser, w, h, true);
            const r = await page.evaluate(() => {
                const real = sel => {
                    const e = document.querySelector(sel); if (!e) return null;
                    const s = document.createElement('span'); s.className = 'Style_normal'; s.textContent = '12345678';
                    s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
                    e.appendChild(s); const v = s.getBoundingClientRect().width / 8; s.remove(); return v;
                };
                const gl = document.querySelector('#windowport .GridWindow .GridLine');
                const grid = document.querySelector('#windowport .GridWindow');
                const lineH = gl ? gl.getBoundingClientRect().height : 0;
                const rb = real('#windowport .BufferWindow .BufferLine');
                const buf = document.querySelector('#windowport .BufferWindow');
                const titleLine = Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine'))
                    .find(e => /A N C H O R H E A D/.test(e.textContent || ''));
                const titleBefore = titleLine && {
                    font: getComputedStyle(titleLine).fontSize,
                    height: titleLine.getBoundingClientRect().height
                };
                Global.SetFontSize(30);
                const titleAtMax = titleLine && {
                    font: getComputedStyle(titleLine).fontSize,
                    height: titleLine.getBoundingClientRect().height,
                    overflow: titleLine.scrollWidth > titleLine.clientWidth + 1
                };
                Global.SetFontSize(20);
                return {
                    m: window.__glkMeasure,
                    realGrid: real('#windowport .GridWindow .GridLine'),
                    realBuf: rb,
                    cols: gl ? Array.from(gl.children).reduce((a, c) => a + c.textContent.length, 0) : 0,
                    bufCap: buf && rb ? Math.floor((buf.clientWidth - 20) / rb) : 0,
                    wrapped: grid ? Array.from(grid.querySelectorAll('.GridLine')).filter(l => l.getBoundingClientRect().height > lineH * 1.5).length : -1,
                    quote: grid ? /emotion of mankind/.test(grid.innerText.replace(/\s+/g, ' ')) : false,
                    title: buf ? /A N C H O R H E A D/.test(buf.innerText) : false,
                    titleBefore,
                    titleAtMax
                };
            });
            const tag = w + 'x' + h;
            ok(r.m && Math.abs(r.m.grid - r.realGrid) < 0.05, tag + ': measured grid cell == rendered (' + (r.m && r.m.grid.toFixed(2)) + ' vs ' + (r.realGrid && r.realGrid.toFixed(2)) + ')');
            ok(r.m && Math.abs(r.m.buf - r.realBuf) < 0.05, tag + ': measured prose cell == rendered');
            ok(r.cols >= 48, tag + ': game is told >= 48 columns (' + r.cols + ')');
            ok(r.bufCap >= r.cols - 1, tag + ': prose column holds the reported columns (' + r.bufCap + ' >= ' + r.cols + ')');
            ok(r.wrapped === 0, tag + ': no grid line wraps');
            ok(r.quote && r.title, tag + ': Anchorhead quote and title intact');
            ok(r.titleAtMax && r.titleBefore.font === r.titleAtMax.font &&
                Math.abs(r.titleBefore.height - r.titleAtMax.height) < 0.1 && !r.titleAtMax.overflow,
                tag + ': maximum Text size leaves story-authored padded title fixed and unwrapped');

            for (let i = 0; i < 12 && !(await page.locator('.Input.LineInput').count()); i++) {
                await page.evaluate(() => { if (window.CharKeys) CharKeys.sendChar(' '); });
                await page.waitForTimeout(250);
            }
            const scaled = await page.evaluate(() => {
                const grid = document.querySelector('#windowport .GridWindow .Style_normal');
                const prose = Array.from(document.querySelectorAll('#windowport .BufferLine.Style_normal'))
                    .find(e => (e.textContent || '').trim() && !/[{}]/.test(e.textContent || ''));
                const before = { grid: grid && getComputedStyle(grid).fontSize, prose: prose && getComputedStyle(prose).fontSize };
                Global.SetFontSize(14);
                const minimum = prose && getComputedStyle(prose).fontSize;
                Global.SetFontSize(24);
                return {
                    before,
                    minimum,
                    grid: grid && getComputedStyle(grid).fontSize,
                    prose: prose && getComputedStyle(prose).fontSize,
                    wrapped: Array.from(document.querySelectorAll('#windowport .GridWindow .GridLine'))
                        .some(l => l.scrollWidth > l.clientWidth + 1)
                };
            });
            ok(parseFloat(scaled.prose) > parseFloat(scaled.before.prose) * 1.15, tag + ': Display text size immediately enlarges normal story prose');
            ok(parseFloat(scaled.minimum) >= 9, tag + ': minimum Text size respects the 9px mobile readability floor');
            ok(scaled.grid === scaled.before.grid && !scaled.wrapped, tag + ': text size leaves fixed-width grid metrics intact');
            await ctx.close();
        }

        // ---- 3. Desktop is unchanged (many columns, CharCell.css inert). ----
        {
            const { ctx, page } = await open(browser, 1400, 900, false);
            for (let i = 0; i < 12 && !(await page.locator('.Input.LineInput').count()); i++) {
                await page.evaluate(() => { if (window.CharKeys) CharKeys.sendChar(' '); });
                await page.waitForTimeout(250);
            }
            const r = await page.evaluate(() => {
                const gl = document.querySelector('#windowport .GridWindow .GridLine');
                const prose = Array.from(document.querySelectorAll('#windowport .BufferLine.Style_normal'))
                    .find(e => (e.textContent || '').trim() && !/[{}]/.test(e.textContent || ''));
                const before = prose && getComputedStyle(prose).fontSize;
                Global.SetFontSize(24);
                return { cols: gl ? Array.from(gl.children).reduce((a, c) => a + c.textContent.length, 0) : 0,
                         mobile: document.body.classList.contains('pl-mobile'),
                         gridFont: getComputedStyle(document.querySelector('#windowport .GridWindow .Style_normal')).fontSize,
                         before,
                         proseFont: prose && getComputedStyle(prose).fontSize };
            });
            ok(!r.mobile && r.cols > 100 && r.gridFont === '14px', 'desktop 1400x900 unchanged: ' + r.cols + ' cols, grid ' + r.gridFont);
            ok(r.before !== r.proseFont && r.proseFont === '24px', 'desktop Display text size changes story prose immediately');
            await ctx.close();
        }
    } finally {
        await browser.close();
    }
    console.log(JSON.stringify({ ok: fail === 0, pass, fail }));
    if (fail) { console.error('FAIL: d94-cell-and-boot (' + fail + ' failed)'); process.exit(1); }
    console.log('PASS: d94-cell-and-boot (' + pass + ' passed)');
})();
