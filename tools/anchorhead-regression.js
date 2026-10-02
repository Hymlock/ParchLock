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
            const overflowCount = width < 600 ? 8 : 18;
            await page.evaluate(count => {
                window._moreReached = false;
                const commands = Array.from({ length: count }, (_, i) => ({ Label: 'Action ' + i, Score: count - i, Action: () => {} }));
                commands.push({ Label: 'More', MoreSuggestions: true, Score: 0, Action: () => { window._moreReached = true; } });
                ParchLockQol.OpenRadial(200, 300, commands, { source: 'object' });
            }, overflowCount);
            const reached = new Set();
            for (let i = 0; i < 5 && !await page.evaluate(() => window._moreReached); i++) {
                const labels = await page.locator('#radial-menu .radial-command').allTextContents();
                check(labels.filter(label => /^More(?:\.\.\.)?$/.test(label)).length === 1, 'one More continuation on overflow page ' + i);
                labels.filter(label => /^Action /.test(label)).forEach(label => reached.add(label));
                await page.locator('#radial-menu .radial-command').filter({ hasText: /^More(?:\.\.\.)?$/ }).click();
            }
            check(await page.evaluate(() => window._moreReached) && reached.size === overflowCount, 'all overflow actions precede the suggestion launcher without truncation');
            await page.evaluate(count => {
                ParchLockQol.OpenRadial(200, 300, Array.from({ length: count }, (_, i) => ({ Label: 'Plain ' + i, Score: count - i, Action: () => {} })), { source: 'input' });
            }, overflowCount);
            const firstPlain = await page.locator('#radial-menu .radial-command').allTextContents();
            const plainPages = Math.ceil(overflowCount / ((width < 600 ? 6 : 16) - 1));
            for (let i = 0; i < plainPages; i++) await page.locator('#radial-menu .radial-command').filter({ hasText: /^More\.\.\.$/ }).click();
            check(JSON.stringify(await page.locator('#radial-menu .radial-command').allTextContents()) === JSON.stringify(firstPlain), 'radials without suggestion launchers retain cyclic pagination');
            await page.evaluate(() => ParchLockQol.HideRadialMenu());
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
                check(await page.locator('#radial-menu .radial-command').filter({ hasText: /^More(?:\.\.\.)?$/ }).count() === 1, 'real object action page has one More');
                await page.locator('#radial-menu .radial-command').filter({ hasText: /^More\.\.\.$/ }).click();
            }
            check(await page.locator('#radial-menu .radial-command').filter({ hasText: /^More(?:\.\.\.)?$/ }).count() === 1, 'real object final action page has one More');
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
            if (await page.locator('#message.show #close').count()) await page.locator('#message.show #close').click();
            await page.waitForTimeout(700);
            check(await page.evaluate(() => {
                const probes = [...document.querySelectorAll('.Style_input')].filter(el => /^(score|diagnose|inventory)$/.test(el.textContent.trim()));
                return probes.length > 0 && probes.every(el => !!el.closest('.pl-stat-probe, .pl-carry-probe'));
            }), 'status probes stay hidden after real disclosure dismissal');
            const umbrellaRow = page.locator('.equip-row').filter({ hasText: /^umbrella$/ });
            if (width < 600) {
                const box = await umbrellaRow.boundingBox();
                const cdp = await context.newCDPSession(page);
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 20, y: box.y + box.height / 2 }] });
                await page.evaluate(() => EquipmentUI.Render());
                await page.waitForTimeout(650);
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await cdp.detach();
            } else await umbrellaRow.click({ button: 'right' });
            check(await page.locator('#radial-menu.show .radial-command').count() > 0, 'inventory real context gesture opens actions');
            await page.locator('#radial-menu .radial-command').filter({ hasText: /^Examine$/ }).click();
            await page.waitForTimeout(800);
            check(await page.evaluate(() => /^(examine|inspect) umbrella$/.test([...document.querySelectorAll('.Style_input:not(.pl-stat-probe):not(.pl-carry-probe)')].pop()?.textContent.trim())), 'inventory radial submits real command while sheet stays open');
            check(await page.evaluate(() => {
                const echo = [...document.querySelectorAll('.Style_input')].reverse().find(el => /^(examine|inspect) umbrella$/.test(el.textContent.trim()));
                return echo && !echo.closest('.pl-stat-probe, .pl-carry-probe');
            }), 'inventory player command is not hidden as status output');
            const ids = await page.evaluate(() => { const m = EquipmentUI.model(); return { item: m.items.find(o => o.name === 'umbrella').id, coat: m.items.find(o => o.name === 'trenchcoat').id, player: m.playerId }; });
            const drag = async targetId => {
                const grip = page.locator('.equip-row[data-object-id="' + ids.item + '"] .equip-grip');
                const target = page.locator('.equip-row[data-object-id="' + targetId + '"]');
                await grip.scrollIntoViewIfNeeded();
                const start = await grip.boundingBox(), end = await target.boundingBox();
                if (width < 600) {
                    const cdp = await context.newCDPSession(page);
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x + start.width / 2, y: start.y + start.height / 2 }] });
                    await page.evaluate(() => EquipmentUI.Render());
                    await page.waitForTimeout(250);
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: end.x + end.width / 2, y: end.y + end.height / 2 }] });
                    await page.evaluate(() => EquipmentUI.Render());
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                    await cdp.detach();
                    await page.waitForTimeout(1000);
                    return;
                }
                await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
                await page.mouse.down();
                await page.evaluate(() => EquipmentUI.Render());
                await page.waitForTimeout(250);
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
        const context = await browser.newContext({ viewport: { width: 1200, height: 850 } });
        const page = await context.newPage();
        await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'play.html')).href + '?story=games/LLR3.z8.js');
        await page.waitForTimeout(700);
        await page.evaluate(() => document.querySelector('.parchlock-splash__start')?.click());
        await page.waitForTimeout(2000);
        for (let i = 0; i < 12 && !await page.locator('.Input.LineInput').count(); i++) { await page.keyboard.press('Space'); await page.waitForTimeout(200); }
        if (await page.locator('#message.show #close').count()) await page.locator('#message.show #close').click();
        await page.evaluate(() => EquipmentUI.Show());
        await page.waitForTimeout(200);
        assert(await page.evaluate(() => Message.IsOpen && !StatTracker._hideCarryProbe && !StatTracker._probeActive), 'disclosure precedes any silent command transaction');
        await page.locator('#message.show #close').click();
        await page.waitForTimeout(1200);
        assert(await page.evaluate(() => !StatTracker._statProbeOwned && !StatTracker._probeActive), 'unsupported DIAGNOSE releases ownership at returned prompt');
        assert(await page.evaluate(() => StatTracker.model().stats.experience?.value === 0), 'silent LLR SCORE still fulfills experience');
        const probes = await page.evaluate(() => [...document.querySelectorAll('.Style_input')].map(el => ({ text: el.textContent.trim(), hidden: !!el.closest('.pl-stat-probe, .pl-carry-probe') })));
        assert(probes.some(p => p.text === 'score') && probes.some(p => p.text === 'diagnose') && probes.every(p => p.hidden), 'available first-open status probes execute silently after dismissal: ' + JSON.stringify(probes));
        assert(await page.evaluate(() => { Input.Clear(); return Actionable.Submit('look'); }), 'normal player submission is accepted after unsupported probe');
        await page.waitForTimeout(700);
        const playerOutput = await page.evaluate(() => ({ echoes: [...document.querySelectorAll('.Style_input')].map(e => ({ text: e.textContent.trim(), hidden: !!e.closest('.pl-stat-probe, .pl-carry-probe') })), draft: document.querySelector('.Input.LineInput')?.value, owned: StatTracker._statProbeOwned, active: StatTracker._probeActive }));
        assert(playerOutput.echoes.at(-1)?.text === 'look' && !playerOutput.echoes.at(-1).hidden, 'player output is not claimed by a completed unsupported probe: ' + JSON.stringify(playerOutput));
        console.log('PASS: LLR first-open disclosure, silent SCORE/DIAGNOSE, EXP and player-output isolation');
        await context.close();
        const labelsContext = await browser.newContext({ viewport: { width: 1200, height: 915 } });
        const labelsPage = await labelsContext.newPage();
        await labelsPage.addInitScript(() => { localStorage.setItem('PL_TutorialSeen', '1'); localStorage.setItem('PL_MobileTutorialSeen', '1'); });
        await labelsPage.goto(pathToFileURL(path.resolve(__dirname, '..', 'play.html')).href + '?story=games/RoTA.zblorb.js');
        await labelsPage.waitForTimeout(1000);
        await labelsPage.evaluate(() => document.querySelector('.parchlock-splash__start')?.click());
        await labelsPage.waitForTimeout(2500);
        for (let i = 0; i < 16 && !await labelsPage.locator('.Input.LineInput').count(); i++) { await labelsPage.keyboard.press('Space'); await labelsPage.waitForTimeout(300); }
        if (await labelsPage.locator('#message.show #close').count()) await labelsPage.locator('#message.show #close').click();
        await labelsPage.evaluate(() => EquipmentUI.Show());
        await labelsPage.waitForTimeout(200);
        if (await labelsPage.locator('#message.show #close').count()) await labelsPage.locator('#message.show #close').click();
        await labelsPage.waitForTimeout(1200);
        const observedLabels = await labelsPage.evaluate(() => {
            EquipmentUI.Render();
            return [...document.querySelectorAll('.equip-row:not(.equip-self)')].map(row => ({ id: row.dataset.objectId, label: row.querySelector('.equip-name').textContent }));
        });
        for (const label of ['leather jerkin', 'dagger', 'blank parchment', 'new-looking journal']) {
            assert(observedLabels.some(row => row.label === label), 'RoTA observed inventory label: ' + label + ': ' + JSON.stringify(observedLabels));
        }
        assert(new Set(observedLabels.map(row => row.id)).size === observedLabels.length, 'observed label refinement preserves separate physical item IDs');
        await labelsPage.setViewportSize({ width: 412, height: 915 });
        await labelsPage.evaluate(id => Actionable.Open('dagger', 'inventory', 200, 300, Number(id)), observedLabels.find(row => row.label === 'dagger').id);
        for (let i = 0; i < 8; i++) {
            assert(await labelsPage.locator('#radial-menu .radial-command').filter({ hasText: /^More(?:\.\.\.)?$/ }).count() === 1, 'RoTA inventory radial has exactly one More on every page');
            if (await labelsPage.locator('#radial-menu .radial-command').filter({ hasText: /^More$/ }).count()) break;
            await labelsPage.locator('#radial-menu .radial-command').filter({ hasText: /^More\.\.\.$/ }).click();
        }
        assert(await labelsPage.locator('#radial-menu .radial-command').filter({ hasText: /^More$/ }).count() === 1, 'RoTA final action page retains the vocabulary suggestion launcher');
        await labelsPage.locator('#radial-menu .radial-command').filter({ hasText: /^More$/ }).click();
        assert(await labelsPage.locator('#radial-menu .radial-command').count() > 0, 'RoTA suggestion submenu remains available');
        console.log('PASS: RoTA live observed inventory labels and physical IDs');
        await labelsContext.close();
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
