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
        await page.addInitScript(() => {
            try {
                sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); localStorage.setItem('PL_TutorialSeen','1'); localStorage.setItem('PL_TutorialLibrarySeen','1');
                localStorage.setItem('PL_MobileTutorialSeen', '1');
            } catch (e) {}
        });
        const errors = [];
        page.on('pageerror', error => { errors.push(error.message); console.log('PAGE ERROR', error.message); });
        const dir = path.resolve('tools/screenshots');
        fs.mkdirSync(dir, { recursive: true });
        await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js');
        await page.waitForTimeout(2500);
        await page.evaluate(() => Message.Hide());
        for (let i = 0; i < 12 && !(await page.locator('.Input.LineInput').count()); i++) {
            await page.keyboard.press('Space'); await page.waitForTimeout(500);
        }
        await page.locator('.Input.LineInput').waitFor({ state: 'visible' });
        await page.evaluate(() => { Input.Clear(); Input.Inject('look', true); });
        await page.waitForTimeout(800);
        console.log('Live nouns', await page.locator('.pl-act:not(.is-stale)').allTextContents());
        assert(await page.locator('.pl-act:not(.is-stale)').count() > 0);
        assert.equal(await page.locator('#tools-toggle').isVisible(), false);
        await page.screenshot({ path: path.join(dir, 'game-desktop.png') });
        // Object radial (Examine), not a RAM direction mark. "in"/"east" wrap
        // as kind=direction and correctly offer Go, which is not this fixture.
        const noun = page.locator('.pl-act:not(.is-stale)[data-object-id]:not([data-kind="direction"])').first();
        assert(await noun.count() > 0, 'expected an id-backed object mark for Examine radial');
        await noun.click({ button: 'right' });
        assert(await page.locator('#radial-menu').isVisible());
        await page.screenshot({ path: path.join(dir, 'noun-radial.png') });
        await page.locator('.radial-command', { hasText: /^Examine$/ }).click();
        await page.waitForTimeout(700);
        assert(await page.locator('.Style_input').last().innerText().then(t => t.startsWith('examine ')));
        assert(await page.locator('.pl-act.is-stale').count() > 0);
        for (const method of ['ShowDisplay', 'ShowTranscript', 'ShowHistory', 'ShowCommands', 'ShowSaveManager']) {
            await page.evaluate(method => { ParchLockMap.Show(); ParchLockQol[method](); }, method);
            await page.waitForTimeout(400);
            assert.equal(await page.evaluate(() => document.body.classList.contains('map-open')), false, method + ' retracts map');
            assert(await page.locator('#message #close').isVisible());
            await page.screenshot({ path: path.join(dir, method + '.png') });
            if (method === 'ShowDisplay') {
                const frame = await page.locator('#message').boundingBox();
                await page.mouse.move(frame.x + frame.width - 3, frame.y + frame.height - 3);
                await page.mouse.down(); await page.mouse.move(frame.x + frame.width - 180, frame.y + frame.height + 40); await page.mouse.up();
                assert((await page.locator('#message').boundingBox()).width < frame.width - 100, 'Popup resizes');
                await page.evaluate(() => { document.querySelector('#message').style.width = ''; document.querySelector('#message').style.height = ''; });
            }
            if (method === 'ShowTranscript') assert(!/font-family|#window\d/.test(await page.locator('#transcript-box').inputValue()));
            await page.locator('#message #close').click();
            await page.waitForTimeout(120);
            assert(await page.evaluate(() => document.body.classList.contains('map-open')), method + ' restores map');
        }
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => document.body.classList.contains('map-open')), false);
        await page.keyboard.press('Escape');
        assert(await page.evaluate(() => document.body.classList.contains('map-open')));
        await page.evaluate(() => { Input.Clear(); Input.Inject('save', true); });
        await page.locator('#dialog_infield').waitFor();
        await page.locator('#dialog_infield').fill('UI regression');
        await page.locator('#dialog_accept').click();
        await page.waitForTimeout(700);
        const pkg = await page.evaluate(() => ParchLock.GetSaveData());
        assert(JSON.parse(pkg).Save.length >= 2, 'save package contains native save');
        await page.evaluate(pkg => ParchLockQol.ImportPackageData(pkg), pkg);
        assert.equal(await page.locator('#message h2').innerText(), 'Import Complete');
        await page.evaluate(() => Message.Hide());
        await page.evaluate(() => { Input.Clear(); Input.Inject('se', true); });
        await page.waitForTimeout(600);
        await page.evaluate(() => { Input.Clear(); Input.Inject('restore', true); });
        await page.locator('#dialog_select').waitFor();
        await page.waitForTimeout(350);
        assert.equal(await page.locator('#map').isVisible(), false);
        await page.screenshot({ path: path.join(dir, 'restore.png') });
        await page.locator('#dialog_select').selectOption({ index: 0 });
        await page.locator('#dialog_accept').click();
        await page.waitForFunction(() => {
            const buffer = document.querySelector('.BufferWindow');
            const inputs = Array.from(document.querySelectorAll('.BufferWindow .Style_input'));
            return buffer && buffer.innerText.includes('Outside the Real Estate Office')
                && inputs.some(node => node.textContent.trim().toLowerCase() === 'look');
        }, null, { timeout: 4000 });
        assert(!(await page.locator('#dialog').count()));
        assert((await page.locator('.BufferWindow').innerText()).includes('Outside the Real Estate Office'));
        assert.deepEqual(
            (await page.locator('.BufferWindow .Style_input').allTextContents()).map(text => text.trim().toLowerCase()),
            ['look'],
            'restore clears stale transcript before its automatic LOOK'
        );
        const exitKeys = await page.evaluate(() => Object.keys(ParchLockMap.GetRoom(ParchLockMap.CurrentRoom).Exits).join(','));
        assert.ok(/(^|,)se(,|$)/.test(exitKeys), 'Office still has se after restore, got ' + exitKeys);
        assert.ok(!/(^|,)(restore|move)(,|$)/.test(exitKeys), 'Restore must not invent an exit, got ' + exitKeys);
        await page.evaluate(() => { Input.Clear(); Input.Inject('inventory', true); });
        await page.waitForTimeout(650);
        await page.evaluate(() => Actionable.ShowInventory());
        console.log('Inventory candidates', await page.evaluate(() => Actionable.Scope.inventoryNouns));
        await page.screenshot({ path: path.join(dir, 'inventory.png') });
        assert(await page.locator('#inventory-items button').count() > 0);
        await page.evaluate(() => Message.Hide());
        await page.locator('.Input.LineInput').click({ button: 'right' });
        await page.screenshot({ path: path.join(dir, 'input-radial.png') });
        await page.keyboard.press('Escape');
        // D122 changed shipped behaviour: Actionable.ShowInventory() above now
        // opens the EQUIPMENT sheet, and the map and equipment are peer sheets
        // that swap rather than stack -- so the map is closed by this point and
        // #rooms-shell sits off-screen. The map-zoom steps below need it open.
        // Updating the test's setup, not the code: the swap is intended.
        await page.evaluate(() => {
            if (typeof EquipmentUI !== 'undefined' && EquipmentUI.Hide) EquipmentUI.Hide();
            ParchLockMap.Show();
        });
        await page.waitForTimeout(300);
        await page.evaluate(() => { ParchLockMap.Scale = 1.8; ParchLockMap.ApplyViewport(); });
        await page.screenshot({ path: path.join(dir, 'map-zoom.png') });
        const shell = await page.locator('#rooms-shell').boundingBox();
        await page.mouse.move(shell.x + shell.width / 2, shell.y + 30);
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(100);
        assert(await page.evaluate(() => ParchLockMap.Scale < 1.8));
        await page.mouse.down(); await page.mouse.move(shell.x + shell.width / 2 + 60, shell.y + 60); await page.mouse.up();
        assert(await page.evaluate(() => Math.abs(ParchLockMap.PanX) > 10));
        await page.locator('#center-current-room').click();
        assert.equal(await page.evaluate(() => ParchLockMap.PanX), 0);
        await page.evaluate(() => { Input.Clear(); Input.Inject('/tools'); });
        await page.waitForTimeout(300);
        assert(await page.locator('#tools-toggle').isVisible());
        await page.evaluate(() => ParchLockQol.ShowDisplay());
        await page.locator('#tools-toggle').click();
        assert.equal(await page.locator('#message').isVisible(), false);
        await page.evaluate(() => document.body.classList.remove('tools-button-visible', 'tools-open'));
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(600);
        await page.evaluate(() => { ParchLockMap.Hide(); ParchLockQol.ShowTranscript(); });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(dir, 'transcript-mobile.png') });
        assert(await page.locator('#message #close').isVisible());
        await page.locator('#message #close').click();
        for (const method of ['ShowDisplay', 'ShowHistory', 'ShowCommands', 'ShowSaveManager']) {
            await page.evaluate(method => ParchLockQol[method](), method);
            await page.screenshot({ path: path.join(dir, method + '-mobile.png') });
            const close = await page.locator('#message #close').boundingBox();
            assert(close.x >= 0 && close.x + close.width <= 390);
            await page.locator('#message #close').click();
        }
        await page.locator('.Input.LineInput').click({ button: 'right' });
        console.log('Mobile geometry', await page.evaluate(() => Array.from(document.querySelectorAll('#windowport,.BufferWindow,.BufferLine,.Input.LineInput')).slice(0, 6).map(el => ({ cls: el.className, x: el.getBoundingClientRect().x, scroll: el.scrollLeft, width: el.getBoundingClientRect().width }))));
        await page.screenshot({ path: path.join(dir, 'radial-mobile.png') });
        assert.deepEqual(errors, []);
        await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/LostPig.z8.js');
        await page.waitForTimeout(1800);
        await page.evaluate(() => Message.Hide());
        for (let i = 0; i < 8 && !(await page.locator('.Input.LineInput').count()); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(350); }
        await page.evaluate(() => { Input.Clear(); Input.Inject('look', true); });
        await page.waitForTimeout(600);
        assert(await page.locator('.pl-act:not(.is-stale)').count() > 0);
        console.log('Second game text', (await page.locator('.BufferWindow').innerText()).slice(-2500));
        const live = page.locator('.pl-act:not(.is-stale):not([data-kind="direction"])').first();
        const selected = await live.getAttribute('data-noun');
        const objectId = await live.getAttribute('data-object-id');
        await live.click(); await page.waitForTimeout(500);
        const submitted = (await page.locator('.Style_input').last().innerText()).trim();
        // RAM-backed clicks submit ActionSynth commands using the object's
        // short name, which preserves proper-noun capitalization (e.g.
        // "examine Grunk"). Z-machine parsers are case-insensitive. The old
        // heuristic path lowercased data-noun and this assertion required
        // exact equality against that lowercase span text.
        if (objectId) {
            const expected = await page.evaluate((id) => {
                const cmds = (typeof ActionSynth !== 'undefined' && ActionSynth.commandsForPayloadObjectId)
                    ? (ActionSynth.commandsForPayloadObjectId(id, 'room') || [])
                    : [];
                return cmds.length ? cmds[0].command : '';
            }, objectId);
            assert.equal(submitted, expected);
        } else {
            assert.equal(submitted.toLowerCase(), ('examine ' + selected).toLowerCase());
        }
        await page.screenshot({ path: path.join(dir, 'lost-pig-mobile.png') });
        await page.locator('.Input.LineInput').fill('examine moo');
        await page.locator('.Input.LineInput').press('Tab');
        assert((await page.locator('.Input.LineInput').inputValue()).includes('moon'));
        await page.evaluate(() => { Input.Clear(); Input.Inject('/note UI regression note;'); });
        await page.waitForTimeout(400);
        assert(await page.evaluate(() => ParchLockMap.GetRoom(ParchLockMap.CurrentRoom).Notes.some(note => note.trim() === 'UI regression note')));
        assert.deepEqual(errors, []);
        console.log('PASS: noun/input radials, popup close/map restoration, native save/restore, package, transcript, desktop/mobile screenshots');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
