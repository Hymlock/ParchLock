const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        // Fresh sessions show the click-gated ParchLock splash; the real app dismisses it on the menu page before a story loads.
        await page.addInitScript(() => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); localStorage.setItem('PL_TutorialSeen','1'); localStorage.setItem('PL_TutorialLibrarySeen','1'); } catch (e) {} });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        fs.mkdirSync('tools/screenshots/highlights', { recursive: true });
        await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js');
        await page.waitForTimeout(1600);
        await page.evaluate(() => Message.Hide());
        for (let i = 0; i < 10 && !(await page.locator('.Input.LineInput').count()); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(400); }
        await page.locator('.Input.LineInput').waitFor({ state: 'visible' });
        await page.waitForTimeout(400);
        await page.evaluate(() => {
            window.testRoomMarks = Array.from(document.querySelectorAll('.pl-act:not(.is-stale)'));
        });
        assert(await page.evaluate(() => testRoomMarks.length > 0), 'Start room must have RAM-backed marks');
        const command = async text => { await page.evaluate(text => { Input.Clear(); Input.Inject(text, true); }, text); await page.waitForTimeout(650); };
        await command('examine useful information');
        await page.screenshot({ path: 'tools/screenshots/highlights/after-failed-examine.png' });
        assert(await page.evaluate(() => testRoomMarks.some(el => el.isConnected && !el.classList.contains('is-stale')) || document.querySelectorAll('.pl-act:not(.is-stale)').length > 0), 'Failed examine must preserve room highlights');
        assert.equal(await page.locator('.pl-act:not(.is-stale)[data-noun="useful information"]').count(), 0);
        await command('inventory');
        assert(await page.locator('.pl-act:not(.is-stale)').count() > 0);
        await command('examine wedding ring');
        assert(await page.locator('.pl-act:not(.is-stale)').count() > 0);
        await page.evaluate(() => document.querySelectorAll('.pl-act:not(.is-stale)').forEach(el => el.replaceWith(document.createTextNode(el.textContent))));
        await page.waitForTimeout(500);
        const marked = page.locator('.pl-act:not(.is-stale)').first();
        assert(await marked.count() > 0);
        await marked.click({ button: 'right' });
        assert(await page.locator('#radial-menu').isVisible());
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            var el = document.querySelector('.pl-act:not(.is-stale)');
            window.oldDescription = el ? el.closest('.BufferLine') : null;
        });
        await command('southeast');
        await page.waitForTimeout(650);
        assert.equal(await page.evaluate(() => ParchLockMap.CurrentRoom), 'Alley');
        assert.equal(await page.evaluate(() => oldDescription ? oldDescription.querySelectorAll('.pl-act:not(.is-stale)').length : 0), 0, 'Leaving a room invalidates its old description');
        assert(await page.locator('.pl-act:not(.is-stale)').count() > 0);
        await page.screenshot({ path: 'tools/screenshots/highlights/after-movement.png' });
        await command('look');
        await command('examine imaginary object');
        assert(await page.evaluate(() => {
            const marks = Array.from(document.querySelectorAll('.pl-act:not(.is-stale)'));
            return marks.some((el) => /window/i.test(el.dataset.noun || "") && el.dataset.objectId);
        }), 'Alley look must mark a RAM-backed window with data-object-id');
        assert.deepEqual(errors, []);
        console.log('PASS: failed/successful examine and inventory preserve room highlights; redraw, radial, movement expiry and repeated look work');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
