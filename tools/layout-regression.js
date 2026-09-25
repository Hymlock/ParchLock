const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        // The click-gated ParchLock splash covers every FRESH session; the real app
        // dismisses it on the menu page before a story loads and records that in
        // sessionStorage. Reproduce that state so these suites exercise the game UI.
        await page.addInitScript(() => { try { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); localStorage.setItem('PL_TutorialSeen','1'); localStorage.setItem('PL_TutorialLibrarySeen','1'); } catch (e) {} });
        const errors = [];
        page.on('pageerror', error => { errors.push(error.message); console.log(error.message); });
        page.on('dialog', dialog => dialog.accept());
        const dir = path.resolve('tools/screenshots/build31');
        fs.mkdirSync(dir, { recursive: true });
        const shot = name => page.screenshot({ path: path.join(dir, name + '.png') });
        const command = async text => {
            await page.evaluate(text => { Input.Clear(); Input.Inject(text, true); }, text);
            await page.waitForTimeout(600);
        };
        await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js');
        await page.waitForTimeout(2000);
        await page.evaluate(() => Message.Hide());
        await page.waitForTimeout(300);
        await shot('intro');
        console.log('Intro grid', await page.evaluate(() => Array.from(document.querySelectorAll('.GridLine')).filter(el => el.querySelector('.reverse')).slice(0, 4).map(el => ({ html: el.innerHTML, height: el.getBoundingClientRect().height, line: getComputedStyle(el).lineHeight, width: el.getBoundingClientRect().width }))));
        for (let i = 0; i < 8 && !(await page.locator('.Input.LineInput').count()); i++) {
            await page.keyboard.press('Space'); await page.waitForTimeout(400);
            if (i === 0) await shot('day-title');
        }
        await page.locator('.Input.LineInput').waitFor({ state: 'visible' });
        await command('look');
        const marks = await page.locator('.pl-act:not(.is-stale)').count();
        assert(marks > 0);
        await page.evaluate(() => {
            document.querySelectorAll('.pl-act:not(.is-stale)').forEach(el => el.replaceWith(document.createTextNode(el.textContent)));
        });
        await page.waitForTimeout(500);
        assert.equal(await page.locator('.pl-act:not(.is-stale)').count(), marks, 'Highlights survive same-text redraw');
        await page.evaluate(() => $('.Input.LineInput').hide());
        await page.waitForTimeout(300);
        await page.evaluate(() => $('.Input.LineInput').show());
        await page.waitForTimeout(300);
        assert.equal(await page.locator('.pl-act:not(.is-stale)').count(), marks, 'Temporary prompt visibility does not erase highlights');
        await command('se');
        assert(await page.locator('.map-paths line').count() > 0);
        await command('inventory');
        await page.evaluate(() => Actionable.ShowInventory());
        await page.waitForTimeout(300);
        // D122: inventory moved out of the map into its own equipment sheet.
        // Actionable.ShowInventory() now opens THAT, and #items-tab is hidden
        // inside the map (its markup is kept only so RenderInventory's "last
        // response" text and /items keep working). Assert the shipped
        // behaviour: the equipment sheet is what opens.
        assert(await page.evaluate(() => document.body.classList.contains('equip-open')),
            'ShowInventory opens the equipment sheet');
        assert(await page.locator('#equipment-list .equip-row').count() > 0,
            'and the equipment sheet lists what the player is carrying');
        // The sheets swap, so hand the map back before the map-toolbar steps.
        await page.evaluate(() => {
            if (typeof EquipmentUI !== 'undefined' && EquipmentUI.Hide) EquipmentUI.Hide();
            ParchLockMap.Show();
        });
        await page.waitForTimeout(300);
        assert.equal(await page.locator('#message').isVisible(), false);
        assert(await page.locator('#inventory-items button').count() > 0);
        await shot('items-paths');
        const inputBefore = await page.locator('.Input.LineInput').boundingBox();
        await page.evaluate(() => { document.querySelector('.BufferWindow').scrollTop = 0; document.querySelector('#windowport').scrollTop = 0; });
        await page.waitForTimeout(150);
        const inputAfter = await page.locator('.Input.LineInput').boundingBox();
        assert(Math.abs(inputBefore.y - inputAfter.y) < 2);
        assert(inputAfter.y > 700 && inputAfter.y + inputAfter.height <= 900);
        await shot('pinned-input');
        await page.evaluate(() => WorkspaceUI.OpenTools());
        assert.equal(await page.locator('#control-panel').isVisible(), false);
        assert.equal(await page.evaluate(() => $('#radial-menu').data('context').source), 'tools');
        await shot('tools-radial');
        await page.keyboard.press('Escape');
        await page.locator('#export-map').click();
        await page.locator('#map-slot-name').fill('Alley checkpoint');
        await page.locator('#save-map-slot').click();
        assert.equal(await page.locator('#map-storage-status').innerText(), 'Map saved.');
        const pendingDownload = page.waitForEvent('download');
        await page.locator('#download-map-json').click();
        const download = await pendingDownload;
        const map = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
        assert(map.Map.length >= 2);
        await shot('map-files');
        await page.evaluate(() => { ParchLockMap.Rooms = []; });
        await page.locator('#map-slots button', { hasText: /^Load$/ }).click();
        assert(await page.evaluate(() => ParchLockMap.Rooms.length >= 2));
        await page.evaluate(() => WorkspaceUI.ShowMaps());
        await page.locator('#map-file').setInputFiles({ name: 'map.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(map)) });
        await page.waitForTimeout(300);
        assert.equal(await page.locator('#message').isVisible(), false);
        await page.locator('#game-menu').click();
        await shot('game-menu');
        await page.locator('.radial-command', { hasText: /^Exit game$/ }).click();
        assert((await page.locator('#message').innerText()).includes('last game save'));
        await shot('exit-warning');
        await page.locator('#exit-cancel').click();
        await page.evaluate(() => Message.ShowHelp());
        await shot('help');
        assert((await page.locator('#message').innerText()).includes('Map files'));
        await page.keyboard.press('Escape');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);
        await page.evaluate(() => ParchLockMap.Hide());
        await page.waitForTimeout(350);
        await shot('mobile-input');
        const mobileInput = await page.locator('.Input.LineInput').boundingBox();
        assert(mobileInput.x >= 0 && mobileInput.x + mobileInput.width <= 390 && mobileInput.y + mobileInput.height <= 844);
        await page.evaluate(() => { ParchLockMap.Show(); $('#items-tab').prop('open', true); });
        await page.waitForTimeout(400);
        await shot('mobile-items');
        await page.evaluate(() => WorkspaceUI.OpenTools());
        await shot('mobile-tools');
        await page.keyboard.press('Escape');
        await page.evaluate(() => WorkspaceUI.ShowMaps());
        await shot('mobile-map-files');
        assert.deepEqual(errors, []);
        console.log('PASS: persistent input/highlights, items tab, tools radial, paths, map save/download/import, exit warning and responsive screenshots');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
