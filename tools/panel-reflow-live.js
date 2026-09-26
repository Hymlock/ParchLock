// D168: two operator-reported desktop defects, both invisible to every static
// check in the repo because both are about where a box actually lands.
//
// 1. The equipment sheet did not reflow the story. #equipment is the map's
//    peer -- same tier, same half of the screen, same `calc(50vw - 40px)` box
//    -- but only `body.map-open` was listed in the rule that shrinks
//    #windowport, so on a PC the sheet painted straight over live text and
//    every line past the halfway point was simply covered.
//
// 2. The mic button was flung off the top of the viewport. The
//    `.pl-mic-unavailable` state added `position: relative` so its ::after
//    slash would have a containing block -- but `position: fixed` already IS
//    one, so `relative` only destroyed the fixed positioning. The button fell
//    into document flow at the top of the page and `bottom: 31px` then put it
//    at top: -31px. Desktop only: the mobile rule carries
//    `position: fixed !important` and so was never overridden.
//
// Both assertions are geometric on purpose. A source-text check would have
// passed in both cases -- the declarations were all present and spelled
// correctly, they just produced the wrong box.
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let pass = 0, fail = 0;
function check(cond, msg) {
    if (cond) { pass++; console.log('PASS:', msg); }
    else { fail++; console.log('FAIL:', msg); }
}

const STORY = 'games/anchor.z8.js';

async function open(browser, mobile) {
    const ctx = await browser.newContext(mobile
        ? { viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true }
        : { viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
        try {
            sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
            localStorage.setItem('PL_TutorialSeen', '1');
            localStorage.setItem('PL_TutorialLibrarySeen', '1');
        } catch (e) {}
    });
    await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=' + STORY);
    await page.waitForFunction(() => !!document.querySelector('#windowport .BufferWindow'),
        { timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { const c = document.querySelector('#message #close'); if (c) c.click(); });
    await page.waitForTimeout(300);
    return { ctx, page };
}

const box = (page, sel) => page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top),
             bot: Math.round(b.bottom), w: Math.round(b.width) };
}, sel);

(async () => {
    const browser = await chromium.launch();

    // ---- desktop: the sheet must reflow the story, exactly as the map does --
    {
        const { ctx, page } = await open(browser, false);
        const wide = await box(page, '#windowport');

        await page.evaluate(() => ParchLockMap.Show());
        await page.waitForTimeout(900);
        const mapWp = await box(page, '#windowport');
        check(mapWp.w < wide.w * 0.75,
            `map-open shrinks the story (${wide.w} -> ${mapWp.w})`);

        await page.evaluate(() => EquipmentUI.Show());
        await page.waitForTimeout(900);
        const eqWp = await box(page, '#windowport');
        const eqBuf = await box(page, '#windowport .BufferWindow');
        const sheet = await box(page, '#equipment');

        check(eqWp.w < wide.w * 0.75,
            `equip-open shrinks the story (${wide.w} -> ${eqWp.w})`);
        check(eqWp.r <= sheet.l,
            `story right edge ${eqWp.r} does not run under the sheet at ${sheet.l}`);
        check(eqBuf && eqBuf.r <= sheet.l,
            `the text buffer itself reflows too (right edge ${eqBuf && eqBuf.r})`);
        check(Math.abs(eqWp.w - mapWp.w) <= 40,
            `equipment and map reserve comparable width (${eqWp.w} vs ${mapWp.w})`);

        // The fixed send/mic buttons must not end up underneath the sheet.
        const submit = await box(page, '#pl-input-submit');
        check(submit.r <= sheet.l + 4,
            `send button stays clear of the sheet (right ${submit.r}, sheet ${sheet.l})`);

        await ctx.close();
    }

    // ---- desktop: the mic button must stay on screen in every state --------
    {
        const { ctx, page } = await open(browser, false);
        const vh = 1080;
        for (const state of ['closed', 'map-open', 'equip-open']) {
            if (state === 'map-open') await page.evaluate(() => ParchLockMap.Show());
            if (state === 'equip-open') await page.evaluate(() => EquipmentUI.Show());
            await page.waitForTimeout(700);

            // Force the unavailable state, which is what a file:// copy really
            // gets: no stored mic permission, so js/Input.js marks the button.
            await page.evaluate(() => {
                document.getElementById('pl-input-mic').classList.add('pl-mic-unavailable');
            });
            const mic = await box(page, '#pl-input-mic');
            const pos = await page.evaluate(() =>
                getComputedStyle(document.getElementById('pl-input-mic')).position);
            check(mic.t >= 0 && mic.bot <= vh,
                `${state}: unavailable mic stays inside the viewport (top ${mic.t}, bottom ${mic.bot})`);
            check(mic.t > vh / 2,
                `${state}: unavailable mic sits with the input row, not at the top (top ${mic.t})`);
            check(pos === 'fixed',
                `${state}: unavailable mic keeps position:fixed (got ${pos})`);
            await page.evaluate(() => {
                document.getElementById('pl-input-mic').classList.remove('pl-mic-unavailable');
            });
        }
        await ctx.close();
    }

    // ---- mobile: the sheet is full-screen, so the story must NOT shrink ----
    {
        const { ctx, page } = await open(browser, true);
        const wide = await box(page, '#windowport');
        await page.evaluate(() => EquipmentUI.Show());
        await page.waitForTimeout(900);
        const eqWp = await box(page, '#windowport');
        check(Math.abs(eqWp.w - wide.w) <= 2,
            `mobile equip-open leaves the story full width (${wide.w} -> ${eqWp.w})`);
        await ctx.close();
    }

    // ---- the tutorial must still be able to SHOW the options row ----------
    // Operator-raised, and it is a real trap: the tour uses those controls as
    // a display. Tutorial.resolveTarget skips any target with no width or
    // height, so a collapsed <details> would not have broken the tour loudly
    // -- it would have silently fallen through to highlighting the whole
    // sheet, with harness/tutorial-live.js (a source-text check that only
    // asserts the selector is MENTIONED) still green. This assertion is live
    // on purpose.
    for (const mobile of [false, true]) {
        const { ctx, page } = await open(browser, mobile);
        const where = mobile ? 'mobile' : 'desktop';
        const seen = await page.evaluate(async () => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            Tutorial.Start();
            const out = { reached: false, rect: null, open: null, restored: null };
            for (let i = 0; i < 40; i++) {
                const def = Tutorial.steps()[Tutorial._step];
                if (def && def.title === 'Sort, search and flatten') {
                    await sleep(250);
                    const el = document.getElementById('equipment-controls');
                    const b = el.getBoundingClientRect();
                    out.reached = true;
                    out.open = document.getElementById('equipment-options').open;
                    out.rect = { w: Math.round(b.width), h: Math.round(b.height),
                                 t: Math.round(b.top) };
                    // and it must be what the spotlight actually picked
                    out.resolved = Tutorial.resolveTarget(def) === el;

                    // Step forward once more: the disclosure must close again
                    // on a step that is not about it. (Deliberately not
                    // Tutorial.finish() -- finishing restarts the module and
                    // would navigate out from under the assertion.)
                    for (let j = 0; j < 4; j++) {
                        const d2 = Tutorial.steps()[Tutorial._step];
                        if (d2 && (d2.target || []).indexOf('#equipment-controls') === -1) break;
                        document.getElementById('pl-tut-next').click();
                        await sleep(120);
                    }
                    out.restored = document.getElementById('equipment-options').open;
                    break;
                }
                const next = document.getElementById('pl-tut-next');
                if (!next) break;
                next.click();
                await sleep(60);
            }
            return out;
        });

        check(seen.reached, `${where}: the tour reaches the sort/search step`);
        check(seen.open === true,
            `${where}: the tour opens the options disclosure for that step (open=${seen.open})`);
        check(!!(seen.rect && seen.rect.w > 0 && seen.rect.h > 0),
            `${where}: the options row is really rendered there (${JSON.stringify(seen.rect)})`);
        check(seen.resolved === true,
            `${where}: resolveTarget picks the options row itself, not the fallback sheet`);
        check(seen.restored === false,
            `${where}: the row collapses again on the next step (open=${seen.restored})`);
        await ctx.close();
    }

    await browser.close();
    console.log(`${pass} PASS / ${fail} FAIL`);
    process.exit(fail ? 1 : 0);
})();
