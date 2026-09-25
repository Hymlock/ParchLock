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
        const url = pathToFileURL(path.resolve('play.html')).href;
        fs.mkdirSync('tools/screenshots/startup', { recursive: true });
        await page.goto(url);
        await page.waitForTimeout(700);
        await page.locator('#game-menu').click();
        await page.locator('.radial-command', { hasText: /^Help$/ }).click();
        await page.locator('#message #close').click();
        await page.screenshot({ path: 'tools/screenshots/startup/after-help.png' });
        // D113's navigation guard replaces relative <a href> links with real
        // buttons, because target-navigation inside the Capacitor WebView
        // unloads the whole app. The start screen's "Choose a story" anchor is
        // therefore a #start-choose button at runtime. Assert the shipped
        // control -- this assertion has been stale since that guard landed.
        assert(await page.locator('#start-screen #start-choose').isVisible(), 'Story selection must remain available after closing Help');
        for (const action of ['Options', 'Display']) {
            await page.locator('#game-menu').click();
            await page.locator('.radial-command', { hasText: new RegExp('^' + action + '$') }).click();
            await page.keyboard.press('Escape');
            assert(await page.locator('#start-screen #start-choose').isVisible(), action + ' preserves story selection');
        }
        await page.locator('#game-menu').click();
        assert.equal(await page.locator('.radial-command', { hasText: /^(Save|Restore|Map)$/ }).count(), 0);
        await page.locator('.radial-command', { hasText: /^Choose story$/ }).click();
        await page.waitForURL('**/index.html');
        await page.goto(url + '?story=games/anchor.z8.js');
        await page.waitForTimeout(1800);
        if (await page.locator('#message').isVisible()) await page.locator('#message #close').click();
        for (const action of ['Help', 'Options', 'Save', 'Restore']) {
            await page.locator('#game-menu').click();
            await page.locator('.radial-command', { hasText: new RegExp('^' + action + '$') }).click();
            await page.locator('#message #close').click();
        }
        await page.screenshot({ path: 'tools/screenshots/startup/story-after-menus.png' });
        for (let i = 0; i < 12 && !(await page.locator('.Input.LineInput').count()); i++) {
            await page.keyboard.press('Space'); await page.waitForTimeout(400);
        }
        await page.locator('.Input.LineInput').waitFor({ state: 'visible' });
        await page.locator('.Input.LineInput').fill('look');
        await page.locator('.Input.LineInput').press('Enter');
        await page.waitForTimeout(500);
        assert((await page.locator('.BufferWindow').innerText()).includes('Outside the Real Estate Office'));
        assert.deepEqual(errors, []);
        await page.screenshot({ path: 'tools/screenshots/startup/game-started.png' });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(url);
        await page.waitForTimeout(600);
        await page.screenshot({ path: 'tools/screenshots/startup/mobile-chooser.png' });
        assert(await page.locator('#start-screen #start-choose').isVisible());
        console.log('PASS: no-story menu recovery, library navigation, startup Save/Restore guards, and starting Anchorhead after menus');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
