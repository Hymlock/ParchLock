const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        fs.mkdirSync('tools/screenshots/alley', { recursive: true });

        await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js');
        await page.waitForTimeout(1600);
        await page.evaluate(() => { if (window.Message) Message.Hide(); });
        for (let i = 0; i < 12 && !(await page.locator('.Input.LineInput').count()); i++) {
            await page.keyboard.press('Space');
            await page.waitForTimeout(400);
        }
        await page.locator('.Input.LineInput').waitFor({ state: 'visible' });

        const command = async text => {
            await page.evaluate(text => { Input.Clear(); Input.Inject(text, true); }, text);
            await page.waitForTimeout(800);
        };

        await command('look');
        await command('southeast');
        await page.waitForTimeout(600);
        await command('look');
        await page.waitForTimeout(1000);

        // Force translator + refresh
        await page.evaluate(() => {
            if (WorldModel && WorldModel.tick) WorldModel.tick();
            if (Actionable && Actionable.Refresh) Actionable.Refresh();
        });
        await page.waitForTimeout(400);

        const info = await page.evaluate(() => {
            const room = ParchLockMap.CurrentRoom;
            const marks = Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).map(el => (el.dataset.noun || '').toLowerCase());
            const payload = WorldModel && WorldModel.lastPayload;
            const objs = ((payload && payload.discoveredObjects) || []).map(o => (o.name || '').toLowerCase());
            const text = BufferTapProvider ? BufferTapProvider.roomText() : '';
            return { room, marks, objs, text: text.slice(0, 400), build: typeof BUILD !== 'undefined' ? BUILD : null };
        });

        await page.screenshot({ path: 'tools/screenshots/alley/alley-actionable.png', fullPage: true });
        fs.writeFileSync('tools/screenshots/alley/alley-actionable.json', JSON.stringify(info, null, 2));

        assert.match(String(info.room || ''), /alley/i, 'Expected to be in Alley, got ' + info.room);

        const has = (re) => info.marks.some(m => re.test(m)) || info.objs.some(o => re.test(o));
        assert.ok(has(/cans?/), 'Expected can/cans actionable. marks=' + JSON.stringify(info.marks) + ' objs=' + JSON.stringify(info.objs) + ' text=' + info.text);
        assert.ok(has(/window/), 'Expected window actionable. marks=' + JSON.stringify(info.marks));
        assert.ok(has(/fence/), 'Expected fence actionable. marks=' + JSON.stringify(info.marks));

        assert.deepEqual(errors, []);
        console.log('PASS: Alley actionable marks include can/cans, window, fence');
        console.log('room', info.room, 'marks', info.marks);
    } finally {
        await browser.close();
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
