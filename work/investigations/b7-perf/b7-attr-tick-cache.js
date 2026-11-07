// B7 perf: AttributeSchema per-tick attribute cache (work/investigations/b7-perf/PROPOSAL-applyTo-per-tick.md r2;
// gates from grok's reviews #6180/#6200: real hit/miss counts, raw-snapshot keys, view keys, calibrator state,
// nested re-entry starts fresh, throw cleanup, copies on first return and on hits, absent-key parity).
//   node harness/b7-attr-tick-cache.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
(async () => {
    const b = await chromium.launch(); const p = await b.newPage();
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/Zork1-TheGreatUndergroundEmpire.z3.js'); await p.waitForTimeout(3500);
    await p.evaluate(() => { try { Message.Hide(); } catch (e) {} });
    const r = await p.evaluate(() => {
        const out = {}; const AS = AttributeSchema, mem = ZRamProvider.getMem(), st = AS._tickStats;
        out.api = typeof AS.tickBegin === 'function' && typeof AS.tickEnd === 'function';
        if (!out.api) return out;
        const raw = ZRamReader.objectLinks(mem, 160);          // Zork I small mailbox (container, openable)
        const flip = Object.assign({}, raw, { attrBytes: raw.attrBytes.slice() });
        const openBit = AS.bitFor('open', mem);
        flip.attrBytes[openBit >> 3] ^= (0x80 >> (openBit & 7));
        const uncached = AS.applyTo({}, raw, mem);
        // outside a tick nothing is counted or stored
        const h0 = st.hits, m0 = st.misses; AS.applyTo({}, raw, mem);
        out.outside = st.hits === h0 && st.misses === m0 && AS._tickCache === null && AS._tickDepth === 0;
        AS.tickBegin();
        let h = st.hits, m = st.misses;
        const a1 = AS.applyTo({}, raw, mem);
        out.firstMiss = st.misses === m + 1 && st.hits === h;
        a1.open = 'MUTATED';                                    // copy on first return
        const a2 = AS.applyTo({}, raw, mem);
        out.secondHit = st.hits === h + 1 && a2.open === uncached.open;
        a2.open = 'MUTATED2';                                   // copy on hit
        out.pristine = AS.applyTo({}, raw, mem).open === uncached.open;
        // two raw snapshots of one id are separate entries with different answers
        h = st.hits; m = st.misses;
        const f1 = AS.applyTo({}, flip, mem);
        out.snapshots = st.misses === m + 1 && f1.open !== uncached.open;
        // a second DataView over the same buffer with a different offset/length is keyed separately
        m = st.misses;
        const view2 = new DataView(mem.buffer, mem.byteOffset, mem.byteLength - 1);
        AS.applyTo({}, raw, view2);
        out.views = st.misses === m + 1;
        // calibrator state change starts a new map (revision bump)
        m = st.misses; const rev0 = AttrCalibrator.revision;
        try { AttrCalibrator.recordExactForm(null); } catch (e) {}
        AS.applyTo({}, raw, mem);
        out.calib = AttrCalibrator.revision === rev0 + 1 && st.misses === m + 1;
        // nested re-entry starts fresh (a reentrant tick may follow a state change) and inner end keeps depth
        AS.tickBegin(); m = st.misses; AS.applyTo({}, raw, mem);
        out.nestedFresh = st.misses === m + 1;
        AS.tickEnd();
        out.nestedDepth = AS._tickDepth === 1 && AS._tickCache !== null;
        AS.tickEnd();
        out.ended = AS._tickDepth === 0 && AS._tickCache === null;
        // throw inside a bracket leaves nothing behind
        try { AS.tickBegin(); throw new Error('x'); } catch (e) {} finally { AS.tickEnd(); }
        out.throwClean = AS._tickDepth === 0 && AS._tickCache === null;
        // absent-key parity
        AS.tickBegin(); AS.applyTo({}, raw, mem); const c = AS.applyTo({}, raw, mem); AS.tickEnd();
        out.keys = JSON.stringify(Object.keys(uncached).sort()) === JSON.stringify(Object.keys(c).sort());
        // a real WorldModel.tick uses the cache and leaves none behind
        h = st.hits; WorldModel.tick();
        out.tickHits = st.hits > h;
        out.tickBracket = AS._tickDepth === 0 && AS._tickCache === null;
        return out;
    });
    check(r.api, 'AttributeSchema exposes tickBegin/tickEnd');
    if (r.api) {
        check(r.outside, 'outside a tick: no counting, no cache');
        check(r.firstMiss, 'first call in a tick is a miss');
        check(r.secondHit, 'repeat call in the same tick is a hit with the uncached value');
        check(r.pristine, 'mutating returned attrs (first return and hit) never leaks into later hits');
        check(r.snapshots, 'two raw attrBytes snapshots of one object are separate entries');
        check(r.views, 'a different memory view is keyed separately');
        check(r.calib, 'calibrator recording bumps the revision and starts a new map');
        check(r.nestedFresh, 'nested tick re-entry starts a fresh cache');
        check(r.nestedDepth, 'ending the nested tick keeps the outer bracket');
        check(r.ended, 'ending the outer tick drops the cache');
        check(r.throwClean, 'throw inside a bracket leaves no cache');
        check(r.keys, 'cached and uncached results have identical keys');
        check(r.tickHits, 'a real WorldModel.tick gets cache hits');
        check(r.tickBracket, 'WorldModel.tick leaves no cache behind');
    }
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
