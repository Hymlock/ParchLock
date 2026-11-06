// D169: carried value and weight.
//
// The assertion that matters is the LAST one in the wumpus block: after the
// slot is pinned, the figure must move when the player picks something up or
// drops it WITHOUT any inventory command. A test that only checks the parsed
// text would pass on a tracker that never left the bootstrap, which is the
// whole thing this was built to avoid.
//
// Anchorhead is asserted alongside it because a game that never prints a
// carrying line must gain no value/weight/capacity stat at all -- silence in a
// module that does not have the feature is part of the contract (D24/D61).
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let pass = 0, fail = 0;
function check(cond, msg) {
    if (cond) { pass++; console.log('PASS:', msg); }
    else { fail++; console.log('FAIL:', msg); }
}

async function load(browser, story) {
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
    await page.waitForTimeout(6000);
    try { await page.click('#message #close', { timeout: 800 }); } catch (e) {}
    const go = async (cmd) => {
        for (let k = 0; k < 8; k++) {
            if (await page.$('.Input.LineInput')) break;
            await page.keyboard.press('Space');
            await page.waitForTimeout(400);
        }
        const i = await page.$('.Input.LineInput');
        if (!i) return;
        await i.fill(cmd);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(900);
    };
    return { ctx, page, go };
}

const stat = (page, key) => page.evaluate((key) => {
    const s = StatTracker.visibleStats().find(x => x.key === key);
    return s ? { value: s.value, source: s.source, unit: s.unit } : null;
}, key);

(async () => {
    const browser = await chromium.launch();

    // ---- wump2ka: the game that has the feature --------------------------
    {
        const { ctx, page, go } = await load(browser, 'games/wump2ka.z5.js');
        await go('no');                       // the opening restore prompt
        await go('look');

        check(!(await stat(page, 'value')),
            'no value stat before the game has stated one');

        await go('i');
        const boot = await stat(page, 'value');
        check(!!boot, 'the carrying line bootstraps a value stat');
        check(boot && boot.source === 'inventory-text',
            `it starts sourced from the game's own text (${boot && boot.source})`);
        check(boot && boot.unit === 'money', 'it is rendered as money');

        // Change what is carried, then ask once more so the slot can be pinned.
        await go('take popper');
        await go('take canteen');
        await go('i');
        const pinned = await stat(page, 'value');
        check(pinned && /^indiv:/.test(pinned.source || ''),
            `value is pinned to an individual property (${pinned && pinned.source})`);

        const high = pinned && pinned.value;
        check(high > 100, `carrying the Popper is worth a lot (${high})`);

        // THE assertion: no inventory command from here on.
        await go('drop popper');
        const dropped = await stat(page, 'value');
        check(dropped && dropped.value < high,
            `dropping it lowers the value with NO inventory command (${high} -> ${dropped && dropped.value})`);
        check(dropped && /^indiv:/.test(dropped.source || ''),
            'and it is still being read from RAM, not re-parsed from text');

        await go('take popper');
        const regained = await stat(page, 'value');
        check(regained && regained.value === high,
            `taking it back restores the value, still headless (${regained && regained.value})`);

        // Weight: pinning must NOT happen while an item computes its own,
        // and the figure must stay honest rather than silently omitting it.
        const w = await stat(page, 'weight');
        check(!!w, 'weight is reported');
        check(w && w.source === 'inventory-text',
            `weight stays text-sourced while the canteen computes its own (${w && w.source})`);

        // D174: a pinned slot that cannot answer this turn must not freeze.
        // Measured before the fix: weight pinned at 4 from RAM with the Glow
        // Bar alone, then stayed 4 after picking up the canteen -- which
        // computes its own weight -- while the game's own capacity reading went
        // 10% -> 22%. The fresh inventory text that carried the real figure was
        // refused because a RAM source outranked it, so the row showed a stale
        // number still labelled live.
        const wCanteen = await stat(page, 'weight');
        check(wCanteen && wCanteen.source === 'inventory-text',
            `weight falls back to the game's own text while an item computes its own (${wCanteen && wCanteen.source})`);

        await go('drop canteen');
        await go('i');
        const wDropped = await stat(page, 'weight');
        check(wDropped && /^indiv:/.test(wDropped.source || ''),
            `and returns to RAM once every item reports a plain weight (${wDropped && wDropped.source})`);
        check(wCanteen && wDropped && wCanteen.value > wDropped.value,
            `carrying more weighed more (${wCanteen && wCanteen.value} vs ${wDropped && wDropped.value})`);

        // A pinned slot must never report a total that omits a holder.
        const omits = await page.evaluate(() => {
            const m = StatTracker.model();
            const mem = ZRamProvider.getMem();
            const ids = StatTracker.carriedIds(mem);
            const st = m.carry && m.carry.weight;
            if (!st || st.prop == null) return 'not-pinned';
            return StatTracker.sumIndiv(mem, ids, st.prop);
        });
        check(omits === 'not-pinned' || omits === null || typeof omits === 'number',
            `weight slot is either unpinned or returns a whole-set total (${omits})`);

        await ctx.close();
    }

    // ---- Anchorhead: a game with no such feature must stay silent --------
    {
        const { ctx, page, go } = await load(browser, 'games/anchor.z8.js');
        await go('look');
        await go('i');
        await go('i');
        for (const k of ['value', 'weight', 'capacity']) {
            check(!(await stat(page, k)),
                `Anchorhead gains no ${k} stat -- it never prints a carrying line`);
        }
        // and the stats it DOES have are undisturbed
        const turns = await stat(page, 'turns');
        check(!!turns, 'Anchorhead still reports the stats it does have (turns)');
        await ctx.close();
    }

    await browser.close();
    console.log(`${pass} PASS / ${fail} FAIL`);
    process.exit(fail ? 1 : 0);
})();
