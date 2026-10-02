const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

async function interactionAudit() {
    const browser = await chromium.launch({ headless: true });
    try {
        for (const width of [1400, 412]) {
            const context = await browser.newContext({ viewport: { width, height: 915 }, isMobile: width < 600, hasTouch: width < 600 });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => { localStorage.setItem('PL_MobileTutorialSeen', '1'); localStorage.setItem('PL_TutorialSeen', '1'); });
            const check = (value, label) => { assert(value, width + ': ' + label); console.log('PASS: ' + width + ': ' + label); };
            const submit = async command => {
                check(await page.evaluate(c => { Input.Clear(); return Actionable.Submit(c); }, command), 'accepted ' + command);
                await page.waitForTimeout(700);
            };
            await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'play.html')).href + '?story=games/anchor.z8.js');
            await page.waitForTimeout(800);
            await page.evaluate(() => document.querySelector('.parchlock-splash__start')?.click());
            await page.waitForTimeout(2500);
            for (let i = 0; i < 12 && !await page.locator('.Input.LineInput').count(); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
            await page.evaluate(() => Message.Hide());
            await submit('look');
            const id = await page.evaluate(() => Actionable.payloadPool().find(o => /real estate.*door/i.test(o.name)).id);
            await page.locator('.pl-act:not(.is-stale)[data-object-id="' + id + '"]').first().click({ force: true });
            await page.waitForTimeout(700);
            check(await page.evaluate(() => /^(examine|open) door$/.test([...document.querySelectorAll('.Style_input')].pop()?.textContent.trim())), 'left click submits primary action');
            const labels = await page.evaluate(id => {
                Actionable.Open('real estate office door', 'object', 200, 300, id);
                const labels = [...document.querySelectorAll('#radial-menu .radial-command')].map(el => el.textContent.trim());
                return labels;
            }, id);
            check(labels.length > 0 && labels.every(label => label.length < 24 && !/clarify|\(any\)/i.test(label)), 'short wheel labels');
            for (let i = 0; i < 4 && !await page.locator('#radial-menu .radial-command').filter({ hasText: /^More$/ }).count(); i++) {
                await page.locator('#radial-menu .radial-command').filter({ hasText: /^More\.\.\.$/ }).click();
            }
            await page.locator('#radial-menu .radial-command').filter({ hasText: /^More$/ }).click();
            check(await page.locator('#radial-menu .radial-command').count() > 0, 'More opens vocabulary suggestions');
            const beforeSuggestion = await page.locator('.Style_input').count();
            await page.locator('#radial-menu .radial-command').first().click();
            check(await page.evaluate(() => !!Input.Value()) && await page.locator('.Style_input').count() === beforeSuggestion, 'suggestion fills input without claiming or auto-submitting capability');
            await page.evaluate(() => Input.Clear());
            check(await page.evaluate(id => {
                const original = AttrCalibrator.allowedVerbsFor;
                const open = ParchLockQol.OpenRadial;
                let offered = [];
                try {
                    AttrCalibrator.allowedVerbsFor = () => ['wave'];
                    ParchLockQol.OpenRadial = (x, y, commands) => { offered = commands; };
                    const slices = [];
                    Actionable.addMoreActions(slices, { noun: 'door', kind: 'object', objectId: id }, 200, 300);
                    slices.find(s => s.Label === 'More').Action();
                    return offered.some(c => c.Label === 'Wave' && c.Command === 'wave door' && c.Enter === false);
                } finally { AttrCalibrator.allowedVerbsFor = original; ParchLockQol.OpenRadial = open; }
            }, id), 'learned provider remains connected to More');
            await page.evaluate(() => ParchLockQol.HideRadialMenu());
            await submit('open trenchcoat');
            await page.evaluate(() => EquipmentUI.Show());
            await page.waitForTimeout(700);
            await page.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
            await page.waitForTimeout(700);
            const ids = await page.evaluate(() => { const m = EquipmentUI.model(); return { item: m.items.find(o => o.name === 'umbrella').id, coat: m.items.find(o => o.name === 'trenchcoat').id, player: m.playerId }; });
            const drag = async targetId => {
                const grip = page.locator('.equip-row[data-object-id="' + ids.item + '"] .equip-grip');
                const target = page.locator('.equip-row[data-object-id="' + targetId + '"]');
                await grip.scrollIntoViewIfNeeded();
                const start = await grip.boundingBox(), end = await target.boundingBox();
                if (width < 600) {
                    const cdp = await context.newCDPSession(page);
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x + start.width / 2, y: start.y + start.height / 2 }] });
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: end.x + end.width / 2, y: end.y + end.height / 2 }] });
                    await page.evaluate(() => EquipmentUI.Render());
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                    await cdp.detach();
                    await page.waitForTimeout(1000);
                    return;
                }
                await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
                await page.mouse.down();
                await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 });
                await page.evaluate(() => EquipmentUI.Render());
                await page.mouse.up();
                await page.waitForTimeout(1000);
            };
            await drag(ids.coat);
            check(await page.evaluate(({item, coat}) => WorldModel.lastPayload.inventory.find(o => o.id === item)?.parentId === coat, ids), 'real drag into coat');
            await drag(ids.player);
            check(await page.evaluate(({item, player}) => WorldModel.lastPayload.inventory.find(o => o.id === item)?.parentId === player, ids), 'real drag back onto Yourself');
            ids.item = await page.evaluate(() => EquipmentUI.model().items.find(o => /wedding ring/.test(o.name)).id);
            await drag(ids.coat);
            check(await page.evaluate(({item, coat}) => WorldModel.lastPayload.inventory.find(o => o.id === item)?.parentId === coat, ids), 'real worn ring drop into trenchcoat');
            await page.evaluate(() => { EquipmentUI.Hide(); ParchLockMap.Show(); });
            await page.waitForTimeout(350);
            const neighbor = page.locator('#rooms .room.shown:not(.dir-here)').first();
            const expectedRoom = await neighbor.evaluate(el => $(el).data('room').Id);
            await neighbor.click();
            check(await page.evaluate(id => String(ParchLockMap.DisplayedRoomId) === String(id), expectedRoom), 'real mouse click selects neighboring map room');
            check(await page.evaluate(() => {
                ParchLockMap.ResetViewport();
                const nodes = [...document.querySelectorAll('#rooms .room.shown')];
                for (const scale of [1, .8, .6, .45, .9, 1.4, 1]) {
                    ParchLockMap.SetScale(scale);
                    if (document.getElementById('map-overview') || ParchLockMap.Scale < .65 || ParchLockMap.Scale > 1.8) return false;
                    if (!nodes.every(el => el.isConnected && el.classList.contains('shown'))) return false;
                }
                ParchLockMap.ResetViewport();
                return ParchLockMap.Scale === 1 && ParchLockMap.PanX === 0 && ParchLockMap.PanY === 0;
            }), 'stable hub zoom and Center');
            await page.evaluate(() => ParchLockMap.Hide());
            check(await page.evaluate(() => {
                const input = document.querySelector('.Input.LineInput');
                if (!input || !input.getBoundingClientRect().height) return false;
                for (let el = input; el; el = el.parentElement) {
                    const style = getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                }
                return true;
            }), 'live input survives Equipment probes and return from map');
            await submit('se');
            await page.evaluate(() => { ParchLockMap.GetCurrentRoom().Notes.push('restart-regression'); ParchLockMap.SetScale(.6); });
            await submit('restart');
            await submit('yes');
            for (let i = 0; i < 12 && !await page.locator('.Input.LineInput').count(); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(250); }
            await page.waitForTimeout(800);
            check(await page.evaluate(() => ParchLockMap.Scale === 1 && ParchLockMap.PanX === 0 && ParchLockMap.PanY === 0 && !ParchLockMap.Rooms.some(r => (r.Notes || []).includes('restart-regression'))), 'native restart resets map and camera');
            check(errors.length === 0, 'no browser errors ' + errors.join('; '));
            await context.close();
        }
    } finally { await browser.close(); }
}

const url = process.argv[2] || 'http://127.0.0.1:8765/play.html?story=games/anchor.z8.js';
const executablePath = process.env.PW_CHROME;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function inspect(page, label) {
    const session = await page.context().newCDPSession(page);
    const expression = `
        JSON.stringify({
            label: ${JSON.stringify(label)},
            windowText: (document.querySelector('#windowport')?.innerText || '').slice(0, 500),
            windows: Array.from(document.querySelectorAll('#windowport .WindowFrame,.BufferWindow,.GridWindow,.Input.LineInput')).map(el => {
                const rect = el.getBoundingClientRect();
                const style = getComputedStyle(el);
                return {
                    id: el.id,
                    className: String(el.className),
                    text: (el.innerText || el.value || '').slice(0, 120),
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    display: style.display,
                    position: style.position
                };
            })
        })
    `;
    const result = await session.send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
    }
    return JSON.parse(result.result.value);
}

(async () => {
    if (process.env.PL_INTERACTION_AUDIT) return interactionAudit();
    const browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    page.on('console', message => console.log(`${message.type()}: ${message.text()}`));
    page.on('pageerror', error => console.log(`pageerror: ${error.message}`));

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    console.log(JSON.stringify(await inspect(page, 'initial'), null, 2));

    let afterPrompt = null;
    for (let step = 1; step <= 12; step++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(1500);
        afterPrompt = await inspect(page, `after-space-${step}`);
        console.log(JSON.stringify(afterPrompt, null, 2));
        if (afterPrompt.windows.some(win => win.className.includes('LineInput'))) {
            break;
        }
    }

    const buffer = afterPrompt.windows.find(win => win.className.includes('BufferWindow'));
    const input = afterPrompt.windows.find(win => win.className.includes('LineInput'));
    assert(buffer && buffer.width > 100 && buffer.height > 100, 'Buffer window is not visibly sized after Anchorhead startup screen.');
    assert(input && input.width > 20 && input.height > 10, 'Line input is not visibly sized after Anchorhead startup screen.');

    await page.keyboard.type('look');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    const afterLook = await inspect(page, 'after-look');
    console.log(JSON.stringify(afterLook, null, 2));
    assert(afterLook.windowText.includes('Outside the Real Estate Office'), 'Anchorhead did not accept input after startup screen.');

    await page.screenshot({ path: 'anchorhead-after-fix.png', fullPage: true });
    await browser.close();
})().catch(error => {
    console.error(error);
    process.exit(1);
});
