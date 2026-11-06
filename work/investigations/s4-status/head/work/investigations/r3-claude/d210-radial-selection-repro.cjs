// D210 on-device failure, reproduced without a phone (claude, 2026-10-23). Research tool, no product edits.
// Mobile touch context; a REAL CDP touch long-press on an underlined mark (finger stays down after the radial opens,
// as on Android). While still held, checks whether the radial's own elements can start native selection:
// computed user-select / -webkit-touch-callout on .radial-tools/.radial-command, and whether a selectstart and a
// contextmenu dispatched on .radial-tools are defaultPrevented (what Android's long-press timer triggers).
//   ROOT=<tree> node work/investigations/r3-claude/d210-radial-selection-repro.cjs   -> PASS/FAIL lines, exit 1 on FAIL
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const ROOT = process.env.ROOT || '.';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve(ROOT, 'play.html')).href + '?story=games/Zork1-TheGreatUndergroundEmpire.z3.js'); await p.waitForTimeout(4000);
  for (let i = 0; i < 30 && !(await p.locator('.Input.LineInput').count()); i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); await p.waitForTimeout(300); }
  await p.evaluate(() => { Input.Clear(); Input.Inject('look', true); }); await p.waitForTimeout(1500);
  const box = await p.evaluate(() => { const m = [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(e => /mailbox/i.test(e.textContent)).pop(); if (!m) return null; m.scrollIntoView({ block: 'center' }); const k = m.getBoundingClientRect(); return { x: k.left + k.width / 2, y: k.top + k.height / 2 }; });
  if (!box) { console.log('FAIL no mailbox mark'); process.exit(1); }
  for (let i = 0; i < 5; i++) { await p.evaluate(() => { try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); await p.waitForTimeout(300); }
  const hit = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); if (!e) return null;
    const chain = []; for (let n = e; n && n !== document.body; n = n.parentElement) chain.push((n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className ? '.' + n.className.split(' ').join('.') : n.tagName));
    return chain.slice(0, 6).join(' < '); }, box);
  console.log('under touch point: ' + hit + ' at ' + JSON.stringify(box));
  const pt = [{ x: box.x, y: box.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
  await p.waitForTimeout(900); // past Actionable.LongPressMs (500): radial should be open, finger still down
  const r = await p.evaluate(() => {
    const open = document.body.classList.contains('radial-open'); const tools = document.querySelector('.radial-tools'); const cmd = document.querySelector('.radial-command');
    const cs = e => e ? { us: getComputedStyle(e).userSelect, wus: getComputedStyle(e).webkitUserSelect, callout: getComputedStyle(e).webkitTouchCallout } : null;
    const fire = (e, type) => { if (!e) return null; const ev = new Event(type, { bubbles: true, cancelable: true }); e.dispatchEvent(ev); return ev.defaultPrevented; };
    const tgt = tools && (tools.firstChild && tools.firstChild.nodeType === 3 ? tools : tools);
    return { open, tools: cs(tools), command: cs(cmd), selectstartBlocked: fire(tgt, 'selectstart'), contextmenuBlocked: fire(tgt, 'contextmenu'), bodyUs: getComputedStyle(document.body).userSelect };
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await b.close();
  console.log(JSON.stringify(r));
  const checks = [
    ['radial opened by touch long-press', r.open],
    ['radial centre label not selectable (user-select none)', r.tools && (r.tools.us === 'none' || r.tools.wus === 'none')],
    ['radial command not selectable (user-select none)', r.command && (r.command.us === 'none' || r.command.wus === 'none')],
    ['selectstart on radial blocked while held', r.selectstartBlocked === true],
    ['contextmenu on radial blocked while held', r.contextmenuBlocked === true]];
  let fail = 0; for (const [n, v] of checks) { console.log((v ? 'PASS ' : 'FAIL ') + n); if (!v) fail++; }
  console.log(fail + ' FAIL'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
