// On-device EAT/DRINK refusal probe (claude, 2026-10-17; grok #3932: edible/consumed UD needs a device refusal per title).
// Untouched boot: settle the intro, INVENTORY, then for up to two carried objects (else room objects) issue the
// target-named EAT <noun> and DRINK <noun> and record the game's own reply. No objects are moved or flags forced.
//   node work/investigations/zil-eat-refusal.cjs [Title,Title]   -> 2026-10-17-zil-eat-refusal.json
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '../..');
const FILE = { Ballyhoo: 'Ballyhoo.z3.js', Enchanter: 'Enchanter.z3.js', HollywoodHijinx: 'HollywoodHijinx.z3.js', LeatherGoddessesofPhobos: 'LeatherGoddessesofPhobos.z3.js',
  PlunderedHearts: 'PlunderedHearts.z3.js', Sorcerer: 'Sorcerer.z3.js', Spellbreaker: 'Spellbreaker.z3.js', Stationfall: 'Stationfall.z3.js', Wishbringer: 'Wishbringer.z3.js',
  Deadline: 'Deadline.z3.js', Moonmist: 'Moonmist.z3.js', Borderzo: 'Borderzo.z5.js', Starcross: 'Starcross.z3.js', Suspended: 'Suspended.z3.js' };
const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(FILE);
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const t of only) {
    const p = await b.newPage();
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    try {
      await p.goto(pathToFileURL(path.join(root, 'play.html')).href + '?story=games/' + FILE[t]); await p.waitForTimeout(2500);
      const settle = async () => { for (let i = 0; i < 40; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200); } return false; };
      const cmd = async c => { const n0 = await p.evaluate(() => document.querySelectorAll('.BufferLine').length); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1200); await settle();
        return p.evaluate(n0 => [...document.querySelectorAll('.BufferLine')].slice(n0).map(l => l.textContent).join(' ').replace(/\s+/g, ' ').trim(), n0); };
      if (!await settle()) throw new Error('no line input');
      const inv = await cmd('inventory');
      // Candidate nouns: carried objects from the app's own payload (names only), then room objects.
      const cands = await p.evaluate(() => { const P = WorldModel.lastPayload || {}; const w = o => String(o.name || '').toLowerCase().split(/\s+/).pop();
        return (P.inventory || []).map(w).concat((P.objects || P.visible || []).map(w)).filter(x => x && x.length > 2 && !/^\(/.test(x)); });
      // Fallback: the game's own INVENTORY reply ("You are carrying: a ticket ...") when the payload has no names yet.
      if (!cands.length) (inv.replace(/^.*?(carrying|have|holding)[^:]*:?/i, '').match(/\b(?:a|an|the|some|your)\s+([a-z-]+(?:\s+[a-z-]+)?)/gi) || [])
        .forEach(m => cands.push(m.trim().split(/\s+/).pop().toLowerCase()));
      if (!cands.length) cands.push('me');
      const tests = [];
      for (const n of [...new Set(cands)].slice(0, 2)) for (const v of ['eat', 'drink']) tests.push({ cmd: v + ' ' + n, reply: (await cmd(v + ' ' + n)).slice(0, 220) });
      out[t] = { file: FILE[t], inventory: inv.slice(0, 200), tests };
    } catch (e) { out[t] = { file: FILE[t], error: String(e.message || e).slice(0, 120) }; }
    await p.close(); console.log(t, JSON.stringify(out[t]).slice(0, 400));
  }
  const F = path.join(__dirname, '2026-10-17-zil-eat-refusal.json'); const prev = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : {};
  fs.writeFileSync(F, JSON.stringify(Object.assign(prev, out), null, 1)); await b.close(); // merged: one title per run is safe

})();
