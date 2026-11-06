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
        page.on('pageerror', error => errors.push(error.message));
        fs.mkdirSync('tools/screenshots/pathing', { recursive: true });

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
            await page.waitForTimeout(700);
        };

        await command('look');
        await command('southeast');
        await page.waitForTimeout(500);

        const rooms = await page.evaluate(() => (ParchLockMap.Rooms || []).map(r => ({
            Name: r.Name,
            Id: r.Id,
            Exits: r.Exits
        })));
        assert.ok(rooms.length >= 2, 'Expected at least two mapped rooms after movement');

        const pathInfo = await page.evaluate(() => {
            const fromRoom = ParchLockMap.GetCurrentRoom
                ? ParchLockMap.GetCurrentRoom()
                : ParchLockMap.GetRoom(ParchLockMap.CurrentRoom);
            const from = fromRoom ? fromRoom.Name : ParchLockMap.CurrentRoom;
            // Pick a room that is actually reachable on the recorded graph
            // (not the first Rooms[] entry, which may be a stale non-room
            // object or an unconnected look-ahead stub).
            const others = (ParchLockMap.Rooms || []).filter(function (r) {
                if (!r || !fromRoom || r.Id === fromRoom.Id) return false;
                if (MapTopology && MapTopology.isInternalRoomName
                    && MapTopology.isInternalRoomName(r.Name)) return false;
                if (MapTopology && MapTopology.isPlayerFacingRoom
                    && !MapTopology.isPlayerFacingRoom(r)) return false;
                var route = Navigator.FindShortestRoute(fromRoom.Id, r.Id);
                return Array.isArray(route) && route.length > 0;
            });
            const other = others[0];
            if (!other) return { ok: false, reason: 'no-reachable-other-room', from: from };
            // Clear any open message
            if (window.Message && Message.IsOpen) Message.Hide();
            const route = Navigator.FindRoute(fromRoom, other);
            return {
                ok: Array.isArray(route) && route.length > 0,
                route,
                from,
                to: other.Name,
                fromExits: (fromRoom || {}).Exits,
                message: (($('#message h2').text() || '') + ' ' + ($('#message div').first().text() || '')).trim()
            };
        });
        await page.screenshot({ path: 'tools/screenshots/pathing/after-route.png', fullPage: true });
        assert.equal(pathInfo.ok, true, 'Pathing failed: ' + JSON.stringify(pathInfo));
        await page.waitForFunction(() => !Navigator.Running);
        assert.equal(await page.evaluate(() => ParchLockMap.GetCurrentRoom().Name), pathInfo.to, 'route must actually arrive');
        assert.equal(await page.evaluate(() => Navigator.Interrupted), false, 'successful route is not interrupted');

        // Reset map control must exist and clear rooms
        assert.ok(await page.locator('#reset-map').count(), 'Reset Map button missing');
        await page.evaluate(() => {
            window.confirm = () => true;
            ParchLockMap.Clear();
            ParchLockMap.RebuildRoomsList();
        });
        const afterClear = await page.evaluate(() => ParchLockMap.Rooms.length);
        assert.ok(afterClear <= 1, 'Clear() should leave at most current room, got ' + afterClear);

        // Actionable marks should come from deterministic set (directions / buffer-tap nouns), not empty
        await command('look');
        await page.waitForTimeout(800);
        const marks = await page.evaluate(() => Array.from(document.querySelectorAll('.pl-act:not(.is-stale)')).map(el => el.dataset.noun));
        await page.screenshot({ path: 'tools/screenshots/pathing/after-look-marks.png', fullPage: true });
        assert.ok(marks.length > 0, 'Expected deterministic actionable marks after look');

        assert.deepEqual(errors, []);
        console.log('PASS: map pathing between adjacent rooms works; Reset Map clears; deterministic marks present');
        console.log('route', pathInfo.route, 'marks', marks.slice(0, 12));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
