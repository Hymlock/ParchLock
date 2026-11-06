// Item 3 (APK 64 latency, claude): the cached Actionable.observedPhraseFor must
// return exactly what the uncached original returned, for every live object,
// and must drop its cache when the encoder's version or alphabet changes.
//   node harness/display-key-cache.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS: ' : 'FAIL: ') + msg); };
// The original (uncached) implementation, read verbatim from the commit
// before item 3 (git show 4d6d0c0:js/Actionable.js).
const { execSync } = require('child_process');
const ORIG = execSync('git show 4d6d0c0:js/Actionable.js', { encoding: 'utf8', maxBuffer: 64 << 20 });
const REF = (() => { const a = ORIG.indexOf('observedPhraseFor: function (obj, pool, text, requireUnique) {'), b = ORIG.indexOf('    nounWordsOf:', a);
    return '(' + ORIG.slice(a + 'observedPhraseFor: '.length, b).trim().replace(/,\s*$/, '') + ')'; })();
(async () => {
    const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/wump2ka.z5.js'); await p.waitForTimeout(1800);
    const toLine = async () => { for (let i = 0; i < 35; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
    await toLine(); await p.evaluate(() => { Input.Clear(); Input.Inject('no', true); }); await p.waitForTimeout(500); await toLine();
    for (const cmd of ['look', 'take canteen', 'take pellet', 'inventory']) { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, cmd); await p.waitForTimeout(600); await toLine(); }
    const r = await p.evaluate(src => {
        const ref = eval(src), pool = Actionable.payloadPool();
        const texts = [Actionable.Scope.lastLookText, Actionable.Scope.lastInventoryText, Actionable.Scope.lastReplyText, 'a two-handed sword, the food-pellet and a brittle skeleton'];
        let same = 0, diff = [];
        texts.forEach(t => [false, true].forEach(u => pool.forEach(o => { const a = ref(o, pool, t, u), c = Actionable.observedPhraseFor(o, pool, t, u); if (a === c) same++; else diff.push([o.id, a, c]); })));
        // Counterexample: a changed alphabet must invalidate the cache.
        const vm = window.__PARCHLOCK_ZVM__, ctx = Actionable.displayKeyContext(), before = ctx.sig, size = ctx.keys.size;
        const saved = vm.alphabets; vm.alphabets = [saved[1], saved[0], saved[2]];
        const after = Actionable.displayKeyContext(); const reset = after.sig !== before && after.keys.size === 0;
        vm.alphabets = saved; Actionable.displayKeyContext();
        // Counterexample: a replaced encoder function on the same VM also invalidates.
        Actionable.observedPhraseFor(pool[0], pool, 'a lamp', false);
        const enc = vm.encode; vm.encode = function (x) { return enc.call(this, x); };
        const encReset = Actionable.displayKeyContext().keys.size === 0;
        vm.encode = enc; Actionable.displayKeyContext();
        // Encoder throws once, then recovers: the same text must not keep the fallback keys.
        let calls = 0; const realEnc = vm.encode;
        const flaky = function (x) { calls++; if (calls === 1) throw new Error('once'); return realEnc.call(this, x); };
        vm.encode = flaky; Actionable.displayKeyContext();
        const t = 'zzqword lamp';
        Actionable.observedPhraseFor(pool[0], pool, t, false);
        const c1 = Actionable.displayKeyContext();
        const recovered = c1.text === null || (c1.wordKeys || []).every(k => k.slice(0, 2) === 'z:');
        Actionable.observedPhraseFor(pool[0], pool, t, false);
        const c2 = Actionable.displayKeyContext();
        const recomputed = c2.text === t.toLowerCase() && c2.wordKeys.every(k => k.slice(0, 2) === 'z:');
        vm.encode = realEnc; Actionable.displayKeyContext();
        // Without an encoder nothing is cached.
        window.__PARCHLOCK_ZVM__ = null; Actionable.observedPhraseFor(pool[0], pool, 'a lamp', false);
        const noCache = Actionable.displayKeyContext().keys.size === 0;
        window.__PARCHLOCK_ZVM__ = vm; Actionable.displayKeyContext();
        return { objects: pool.length, same, diff: diff.slice(0, 5), diffCount: diff.length, reset, size, encReset, noCache, recovered, recomputed };
    }, REF);
    check(r.objects > 0 && r.same > 0, 'compared ' + r.same + ' results over ' + r.objects + ' live objects and 4 texts');
    check(r.diffCount === 0, 'cached output is identical to the original for every object, text and uniqueness mode' + (r.diffCount ? ' ' + JSON.stringify(r.diff) : ''));
    check(r.reset, 'a changed encoder alphabet invalidates the cache (restart rebuilds alphabets on the same VM)');
    check(r.size <= 4096, 'the cache stays within its bound');
    check(r.encReset, 'a replaced encoder function on the same VM invalidates the cache');
    check(r.recovered && r.recomputed, 'an encoder that throws once and recovers never leaves fallback keys reused for the same text');
    check(r.noCache,'without a usable encoder no fallback key is cached');
    await b.close(); console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
