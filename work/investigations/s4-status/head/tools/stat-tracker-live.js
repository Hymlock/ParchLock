// D149 character tracker, live. Asserts per module against the values measured
// when the feature was researched, so a regression in the discovery path shows
// up as a named module reporting the wrong thing rather than as a silent blank.
//
// The point of each case: Deadline must find a CLOCK and no score (its header
// says so); Zork 1 must find a score with NO status text to read it from (the
// v3 globals path); wump2ka must find a percent gauge; Slavers must find an
// n/m gauge from a custom status window; LDoDoom must find nothing at all and
// keep the block hidden.
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let pass = 0, fail = 0;
function check(cond, msg) {
    if (cond) { pass++; console.log('PASS:', msg); }
    else { fail++; console.log('FAIL:', msg); }
}

async function load(browser, story, seed) {
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
    await page.waitForTimeout(5200);
    try { await page.click('#message #close', { timeout: 800 }); } catch (e) {}
    const go = async (cmd) => {
        for (let k = 0; k < 8; k++) {
            if (await page.$('.Input.LineInput')) break;
            await page.keyboard.press('Space');
            await page.waitForTimeout(420);
        }
        const i = await page.$('.Input.LineInput');
        if (!i) return;
        await i.fill(cmd);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(950);
    };
    for (const c of seed) await go(c);
    return { ctx, page, go };
}

const read = (page) => page.evaluate(() => {
    const m = StatTracker.model();
    const vis = StatTracker.visibleStats();
    return {
        keys: vis.map(s => s.key),
        byKey: vis.reduce((a, s) => { a[s.key] = { v: s.value, max: s.max, unit: s.unit, src: s.source }; return a; }, {}),
        scoreUnavailable: !!m.scoreUnavailable,
        deaths: m.deaths || 0,
        hidden: (() => { const h = document.getElementById('pl-stats'); return !h || h.hidden; })()
    };
});

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    try {
        // Deadline: Flags1 0x62. A timed mystery -- no score exists to show.
        let s = await load(browser, 'games/Deadline.z3.js', ['look', 'wait', 'wait']);
        let r = await read(s.page);
        check(r.scoreUnavailable === true,
            'Deadline: its header alone marks score unavailable, before any text is parsed');
        check(!r.keys.includes('score'), 'Deadline: and no score row is ever offered');
        await s.ctx.close();

        // wump2ka: "Room #2  Score: 1  ...  Health: 81%" -- percent gauge.
        s = await load(browser, 'games/wump2ka.z5.js', ['no', 'look', 'wait', 'wait']);
        r = await read(s.page);
        check(r.keys.includes('score'), 'wump2ka: score is discovered from its own status window');
        check(r.byKey.health && r.byKey.health.unit === 'percent',
            'wump2ka: Health is discovered as a PERCENT gauge (measured 81%)');
        check(r.hidden === false, 'wump2ka: the tracker block is visible because it has real stats');
        await s.ctx.close();

        // TreasuresofaSlaversKingdom: a custom status window, n/m fractions.
        s = await load(browser, 'games/TreasuresofaSlaversKingdom.z8.js', ['look', 'wait', 'wait']);
        r = await read(s.page);
        check(r.byKey.health && r.byKey.health.unit === 'fraction' && r.byKey.health.max > 0,
            'Slavers: HIT POINTS n/m is read from its custom status window as a fraction with a real maximum');
        check(r.keys.includes('quest rate'),
            "Slavers: its own invented stat QUEST RATE survives under its own name rather than being discarded");
        await s.ctx.close();

        // LDoDoom answers "There is no scoring in this game." and shows nothing else.
        s = await load(browser, 'games/LDoDoom.z5.js', ['no', 'look', 'wait']);
        await s.page.evaluate(() => StatTracker.applyScoreReply('There is no scoring in this game.'));
        await s.page.evaluate(() => StatTracker.Render());
        r = await read(s.page);
        check(r.scoreUnavailable === true && !r.keys.includes('score'),
            'LDoDoom: its explicit no-scoring reply suppresses the score row');
        // D152 registers a turn counter behaviourally, with no text needed, so
        // a scoreless game can still legitimately show Turns. What must stay
        // true is that the SCORE row is gone and nothing was invented.
        // D156: the strip is always present now (an absent panel read as a
        // missing feature), so what must hold is that no stat was INVENTED.
        check(!r.keys.includes('score') && r.keys.every(k => k === 'turns'),
            'LDoDoom: no score row and nothing invented -- only a behaviourally-proven turn counter');
        await s.ctx.close();

        // Zork 1: v3, so the status row carries the room name ONLY (D137). The
        // score has to come from the globals path or not at all. 35 points are
        // scored by reaching the Living Room, which is what makes the change
        // that lets a global be promoted.
        s = await load(browser, 'games/Zork1-TheGreatUndergroundEmpire.z3.js',
            ['look', 'n', 'e', 'open window', 'enter window', 'w', 'look', 'wait']);
        await s.page.evaluate(() => StatTracker.Identify());
        await s.page.waitForTimeout(3200);
        await s.page.evaluate(() => StatTracker.Render());
        r = await read(s.page);
        check(r.byKey.score && r.byKey.score.max === 350,
            'Zork 1: SCORE yields its maximum of 350, which no status window in a v3 game could have given');
        check(r.byKey.score && r.byKey.score.v > 0,
            'Zork 1: and a real non-zero score after reaching the Living Room');
        await s.ctx.close();

        // Anchorhead is scoreless in its status row and shows "day one".
        s = await load(browser, 'games/anchor.z8.js', ['look', 'wait', 'wait']);
        r = await read(s.page);
        // D188: restored to its original form. D187 briefly made an automatic
        // SCORE probe fire, which gave Anchorhead a score row and broke this --
        // and the probe was removed because injecting a command is not headless
        // and its buffer churn destroyed the room's underlines. With no probe,
        // the original premise holds again: nothing asks, so nothing invents.
        check(!r.keys.includes('score'),
            'Anchorhead: no score is invented from a status row that only says "day one"');
        await s.ctx.close();

        console.log('\n' + pass + ' PASS / ' + fail + ' FAIL');
        if (fail) process.exitCode = 1;
    } finally {
        await browser.close();
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
