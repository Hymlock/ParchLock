// D151: the player can be standing IN or ON something, and the search that
// finds them has to look inside that furniture -- otherwise it disagrees with
// D139, which walks UP out of exactly the same container/supporter/vehicle to
// find the room.
//
// Measured on 905.z5: the real PC is "(thief)", a child of the bed, which is a
// child of the Bedroom. The game opens "Bedroom (on the bed)" and reports
// soiled clothing and a gold watch being worn, while the nominal "(self
// object)" holds nothing -- so the equipment sheet showed 0 items for a player
// visibly wearing two. Anchorhead is asserted alongside it because the fix must
// not disturb a game whose player object is already correct.
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let pass = 0, fail = 0;
function check(cond, msg) {
    if (cond) { pass++; console.log('PASS:', msg); }
    else { fail++; console.log('FAIL:', msg); }
}

async function inspect(browser, story, seed) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
        try {
            sessionStorage.setItem('PL_ParchLockSplashSeen', '1');
            localStorage.setItem('PL_TutorialSeen', '1');
            localStorage.setItem('PL_TutorialLibrarySeen', '1');
        } catch (e) {}
    });
    await page.goto(pathToFileURL(path.resolve('play.html')).href + '?story=' + story);
    await page.waitForTimeout(5300);
    try { await page.click('#message #close', { timeout: 800 }); } catch (e) {}
    for (const cmd of seed) {
        for (let k = 0; k < 8; k++) {
            if (await page.$('.Input.LineInput')) break;
            await page.keyboard.press('Space');
            await page.waitForTimeout(420);
        }
        const i = await page.$('.Input.LineInput');
        if (!i) continue;
        await i.fill(cmd);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(950);
    }
    const data = await page.evaluate(() => {
        const p = WorldModel.lastPayload || {};
        return {
            playerId: String(p.playerId),
            probePlayer: p.probe ? String(p.probe.playerId) : null,
            inv: (p.inventory || []).map(o => o.name),
            count: EquipmentUI.model().items.length
        };
    });
    await ctx.close();
    return data;
}

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    try {
        const nine = await inspect(browser, 'games/905.z5.js', ['look', 'inventory']);
        check(nine.inv.length === 2,
            '905: the two worn items the story reports are actually in the payload (was an empty inventory)');
        check(nine.inv.join('|').toLowerCase().includes('clothing')
              && nine.inv.join('|').toLowerCase().includes('watch'),
            '905: and they are the soiled clothing and the gold watch, not something else picked up off the floor');
        check(nine.playerId !== nine.probePlayer,
            '905: the player was corrected away from the empty "(self object)" the probe reported');
        check(nine.count === 2, '905: the equipment sheet counts them');

        const anchor = await inspect(browser, 'games/anchor.z8.js', ['look', 'inventory']);
        check(anchor.inv.length >= 4,
            'Anchorhead: a game whose player object was already right is undisturbed (trenchcoat, ring, clothes, umbrella)');

        // A game that starts genuinely empty-handed must STAY empty -- the
        // recovery must not adopt some nearby furniture's contents as inventory.
        const zork = await inspect(browser, 'games/Zork1-TheGreatUndergroundEmpire.z3.js', ['look', 'inventory']);
        check(zork.inv.length === 0,
            'Zork 1: an empty-handed start stays empty -- the recovery never invents an inventory out of nearby furniture');

        console.log('\n' + pass + ' PASS / ' + fail + ' FAIL');
        if (fail) process.exitCode = 1;
    } finally {
        await browser.close();
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
