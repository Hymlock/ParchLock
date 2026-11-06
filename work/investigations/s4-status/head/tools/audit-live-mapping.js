const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

async function main() {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        await page.goto(pathToFileURL(path.resolve(__dirname, '../play.html')).href + '?story=games/Bronze.zblorb.js');
        await page.waitForTimeout(2000);
        await page.evaluate(() => Message.Hide());
        const observations = [];
        for (const command of ['y', 'n', 's', 'n', 's', 'n', 's', 'n', 's']) {
            await page.locator('.Input.LineInput').fill(command);
            await page.locator('.Input.LineInput').press('Enter');
            await page.waitForTimeout(900);
            const state = await page.evaluate(() => {
                const mem = AttributeSchema._getMem();
                return {
                    actual: ZRamReader.u16(mem, ZRamReader.header(mem).globals),
                    current: ParchLockMap.CurrentRoomId,
                    slot: AttrCalibrator.confirmedLocationGlobal(mem),
                    rooms: ParchLockMap.Rooms.map(r => ({ id: r.ObjectId, name: r.Name }))
                };
            });
            observations.push(state);
            console.log(command, JSON.stringify(state));
        }
        for (const state of observations.slice(-4)) {
            assert.ok([53, 56].includes(state.actual), 'known live Bronze room');
            assert.equal(String(state.current), String(state.actual), 'map follows actual location, not a constant object');
            assert.notEqual(state.slot, null, 'calibration confirmed');
        }
        assert.equal(new Set(observations.slice(-4).map(s => s.current)).size, 2);
        console.log('PASS: Bronze calibrated identity follows both rooms across revisits');
        await page.close();

        const zork = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        await zork.goto(pathToFileURL(path.resolve(__dirname, '../play.html')).href + '?story=games/Zork1-TheGreatUndergroundEmpire.z3.js');
        await zork.waitForTimeout(2000);
        await zork.evaluate(() => Message.Hide());
        const forests = new Set();
        for (const command of ['look', 'north', 'north', 'east', 'south', 'north', 'west', 'west', 'south']) {
            await zork.locator('.Input.LineInput').fill(command);
            await zork.locator('.Input.LineInput').press('Enter');
            await zork.waitForTimeout(700);
            const state = await zork.evaluate(() => ({
                payload: WorldModel.lastPayload.roomId,
                current: ParchLockMap.GetCurrentRoom().ObjectId,
                name: ParchLockMap.GetCurrentRoom().Name,
                player: ZRamReader.findPlayerId(AttributeSchema._getMem()),
                parent: ZRamReader.objectLinks(AttributeSchema._getMem(), ZRamReader.findPlayerId(AttributeSchema._getMem())).parent
            }));
            assert.equal(String(state.current), String(state.payload), 'current map room follows structural identity');
            console.log('Zork', command, JSON.stringify(state));
            if (state.name === 'Forest') forests.add(state.current);
        }
        assert.ok(forests.size >= 3, 'three distinct Forest rooms remain distinct');
        console.log('PASS: Zork duplicate-title current-room identity across three Forest rooms');
        await zork.close();

        const anchor = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await anchor.goto(pathToFileURL(path.resolve(__dirname, '../play.html')).href + '?story=games/anchor.z8.js');
        await anchor.waitForTimeout(2000);
        await anchor.evaluate(() => Message.Hide());
        for (let i = 0; i < 16 && !(await anchor.locator('.Input.LineInput').count()); i++) {
            await anchor.keyboard.press('Space');
            await anchor.waitForTimeout(250);
        }
        for (const command of ['look', 'southeast', 'undo', 'wait']) {
            await anchor.locator('.Input.LineInput').fill(command);
            await anchor.locator('.Input.LineInput').press('Enter');
            await anchor.waitForTimeout(900);
        }
        const undo = await anchor.evaluate(() => ({
            edges: ParchLockMap.Rooms.flatMap(r => Object.keys(r.Exits)),
            usage: Actionable.usageCounts.wait,
            generation: UndoRestoreSync.generation
        }));
        assert.ok(!undo.edges.includes('undo'), 'undo is not a movement edge');
        assert.equal(undo.usage, 1, 'typed wait counted once');
        console.log('PASS: mobile Anchorhead typed undo does not create edges; typed usage counted once');
        await anchor.evaluate(() => {
            Message.Hide();
            ParchLockQol.OpenRadial(195, 400, ParchLockQol.GetRadialCommands(), { source: 'input' });
        });
        const firstPage = await anchor.locator('.radial-command').allTextContents();
        await anchor.locator('.radial-command', { hasText: /^More\.\.\.$/ }).click();
        const secondPage = await anchor.locator('.radial-command').allTextContents();
        assert.notDeepEqual(firstPage, secondPage, 'More advances the mobile radial');
        console.log('PASS: mobile radial More advances instead of re-sorting to page one');
        const imports = await anchor.evaluate(() => {
            ParchLockQol.HideRadialMenu();
            const key = 'PL_Map_' + ParchLock.GameFilename;
            ParchLockMap.Save();
            const before = localStorage.getItem(key);
            const rooms = ParchLockMap.Rooms;
            const malformed = JSON.parse(ParchLock.GetSaveData());
            malformed.Map[0].Notes = [null];
            ParchLockQol.ImportPackageData(JSON.stringify(malformed));
            const rejected = localStorage.getItem(key) === before && ParchLockMap.Rooms === rooms;
            const valid = JSON.parse(ParchLock.GetSaveData());
            valid.Map[0].Notes = ['new import'];
            const draw = ParchLockMap.Draw;
            try {
                ParchLockMap.Draw = () => { throw new Error('injected render failure'); };
                ParchLockQol.ImportPackageData(JSON.stringify(valid));
            } finally { ParchLockMap.Draw = draw; }
            return { rejected, rolledBack: localStorage.getItem(key) === before && ParchLockMap.Rooms === rooms };
        });
        assert.ok(imports.rejected, 'malformed notes rejected without writes');
        assert.ok(imports.rolledBack, 'render failure preserves previous persisted map');
        console.log('PASS: malformed notes and render-failure import rollback');
        await anchor.close();

        const wumpus = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        await wumpus.goto(pathToFileURL(path.resolve(__dirname, '../play.html')).href + '?story=games/wump2ka.z5.js');
        await wumpus.waitForTimeout(1800);
        await wumpus.evaluate(() => Message.Hide());
        await wumpus.locator('.Input.LineInput').fill('n');
        await wumpus.locator('.Input.LineInput').press('Enter');
        for (let i = 0; i < 20; i++) {
            await wumpus.waitForTimeout(250);
            if (await wumpus.evaluate(() => /exit\s*1/i.test(document.querySelector('#windowport').textContent))) break;
            await wumpus.keyboard.press('Space');
        }
        const names = new Map();
        for (const command of ['look', 'x1', 'x1', 'x1']) {
            await wumpus.locator('.Input.LineInput').fill(command);
            await wumpus.locator('.Input.LineInput').press('Enter');
            await wumpus.waitForTimeout(800);
            const room = await wumpus.evaluate(() => {
                const r = ParchLockMap.GetCurrentRoom();
                return { id: r.ObjectId, name: r.Name, payload: WorldModel.lastPayload.roomId,
                    status: document.querySelector('.GridWindow.reverse').textContent,
                    transcript: document.querySelector('.BufferWindow').textContent.slice(-700) };
            });
            console.log('Wumpus', command, JSON.stringify(room));
            assert.equal(String(room.payload), room.id);
            assert.ok(!/^(room\s*#?\d+|C_ROOMS_|\?)/i.test(room.name), 'Wumpus retains descriptive labels');
            if (names.has(room.id)) assert.equal(room.name, names.get(room.id), 'descriptor stable on revisit');
            names.set(room.id, room.name);
        }
        assert.ok(names.size > 1, 'numbered-exit travel visits distinct rooms');
        console.log('PASS: Wumpus numbered exits and stable descriptive labels');
        await wumpus.close();
    } finally {
        await browser.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
