// Rebind v3 provenance controls (Codex #3340/#3342). Draft guard, wump2ka seeded.
// 1) repeated identical `i`: each accepted submit is its own record, confirmation follows the newest.
// 2) story switch in one page (simulated: GameFilename changes the mark epoch): the prior
//    story's accepted `i` is cleared and never qualifies; a new `i` under the new epoch does.
const path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0; const check = (n, ok, info) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : ' :: ' + JSON.stringify(info).slice(0, 400))); };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 850 } });
  await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/wump2ka.z5.js'); await p.waitForTimeout(2500);
  const settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200); } };
  const cmd = async t => { await p.locator('.Input.LineInput').fill(t); await p.locator('.Input.LineInput').press('Enter'); await p.waitForTimeout(1300); await settle(); };
  const st = () => p.evaluate(() => { WorldModel.tick(); const c = Actionable.InventoryConfirm || null, s = Actionable._lastSubmit;
    return { conf: c && { id: c.submissionId, n: (c.confirmed || []).length }, sub: s && { id: s.submissionId, cmd: s.command, ok: s.storyEpoch === Actionable._markEpoch && s.port === Actionable._markPort }, epoch: Actionable._markEpoch }; });
  await settle(); await cmd('no'); await cmd('take pellet');
  await cmd('i'); const a = await st();
  check('first i confirmed under current story epoch', !!(a.conf && a.conf.n > 0 && a.sub && a.sub.ok && a.conf.id === a.sub.id), a);
  await cmd('i'); const r = await st();
  check('repeated identical i: new record, confirmation follows newest', !!(r.conf && r.conf.n === a.conf.n && r.conf.id > a.conf.id && r.conf.id === r.sub.id), { a, r });
  await p.evaluate(() => { window.__realName = ParchLock.GameFilename; ParchLock.GameFilename = 'other-story.z5.js'; }); await p.waitForTimeout(1500);
  const s = await st();
  check('story switch clears the prior accepted i', s.sub === null && s.epoch !== r.epoch, s);
  check('prior story i never confirms after switch', !!(s.conf && s.conf.id === r.conf.id), s);
  await cmd('i'); const n = await st();
  check('new i under the new story epoch qualifies', !!(n.conf && n.sub && n.sub.ok && n.conf.id === n.sub.id && n.conf.id > r.conf.id), n);
  // Codex #3354 control: a retained shared alias that is NOT the object's head noun (e.g. Glow Bar 'light')
  // re-printed as 'lights' gets no headVariantProof and stays unmarked.
  const sa = await p.evaluate(() => { WorldModel.tick(); const pool = Actionable.distinctObjects(Actionable.payloadPool());
    const o = pool.find(x => { const h = String(Actionable.headNounOf(x) || '').toLowerCase(); return (x.aliases || []).some(a => /^[a-z]{4,}$/.test(a) && a !== h && !h.startsWith(a) && !a.startsWith(h)); }); if (!o) return { none: true };
    const head = String(Actionable.headNounOf(o) || '').toLowerCase(); const alias = o.aliases.find(a => /^[a-z]{4,}$/.test(a) && a !== head && !head.startsWith(a) && !a.startsWith(head));
    const win = document.querySelector('#windowport .BufferWindow'); const old = document.createElement('div'); old.className = 'BufferLine'; const mk = document.createElement('span'); mk.className = 'pl-act'; mk.textContent = alias; mk.dataset.kind = 'object'; mk.dataset.objectId = String(o.id); mk.dataset.candidateIds = JSON.stringify([o.id]); old.appendChild(mk); win.appendChild(old);
    const nl = document.createElement('div'); nl.className = 'BufferLine'; nl.textContent = 'You notice some ' + alias + 's here.'; win.appendChild(nl);
    const live = Actionable.LiveMarks; Actionable.LiveMarks = [mk];
    const picked = Actionable.rebindCandidates({ phrase: alias + 's', objectId: o.id, preferred: false, fromName: false }, [nl], [o], false);
    const r = { obj: o.name, head, alias, picked: picked.length, proof: !!picked.headVariantProof, marked: !!nl.querySelector('.pl-act') };
    Actionable.LiveMarks = live; old.remove(); nl.remove(); return r; });
  check('shared non-head alias (' + (sa.alias || '-') + ' -> ' + (sa.alias || '-') + 's): no headVariantProof, stays unmarked', !sa.none && !sa.proof && !sa.marked, sa);
  await b.close(); console.log(`RESULT ${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0); })();


