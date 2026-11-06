// grok solo inv-extra probe (REVIEW-REQUEST-004). node probe.cjs <story> "<script a|b|#key>"
// Read-only: dumps the player subtree with every set attribute bit, decoded attrs, and the app inventory rows.
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const story = process.argv[2], script = process.argv[3] || 'look';
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + story); await p.waitForTimeout(3500);
  const trace = [];
  const snap = async (input) => trace.push(Object.assign({ input }, await p.evaluate(() => {
    const buf = Array.from(document.querySelectorAll('.BufferWindow')).map(e => e.innerText).join('\n');
    const out = {}; try { const mem = ZRamProvider.getMem(); const pl = ZRamProvider.collect(); const pid = pl.probe && pl.probe.playerId;
      const f = ZRamReader.executableLayoutFacts(mem) || {}; out.dig = ModuleLibrary.currentExecutableDigest(); out.pid = pid; out.factHidden = f.inventoryHiddenAttribute;
      out.attrNames = ZRamReader.informAttributeNames(mem);
      out.inv = (pl.inventory || []).map(x => typeof x === 'string' ? x : (x.id + ':' + (x.name || x.Name)));
      const tree = []; const walk = (id, d) => { if (d > 3) return; ZRamReader.children(mem, id).forEach(c => { const l = ZRamReader.objectLinks(mem, c); const bits = []; for (let i = 0; i < 48; i++) if (l.attrBytes[i >> 3] & (128 >> (i & 7))) bits.push(i);
        const a = ZRamReader.attrsFromObject(mem, c); tree.push({ id: c, parent: id, depth: d, name: ZRamReader.shortName(mem, c), bits, attrs: Object.keys(a).filter(k => a[k] === true) }); walk(c, d + 1); }); };
      if (pid) walk(pid, 0); out.tree = tree; } catch (e) { out.err = e.message; }
    out.tail = buf.slice(-240).replace(/\s+/g, ' '); return out; })));
  const charKey = async () => { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(300); return true; } return false; };
  const send = async (cmd) => { for (let i = 0; i < 25 && !await p.locator('.Input.LineInput').count(); i++) { if (!await charKey()) await p.waitForTimeout(200); }
    if (!await p.locator('.Input.LineInput').count()) { await snap('!noline:' + cmd); return; }
    await p.locator('.Input.LineInput').fill(cmd); await p.keyboard.press('Enter'); await p.waitForTimeout(900); await snap(cmd); };
  for (const c of script.split('|')) { if (c === '#key') { await charKey(); } else await send(c); }
  console.log(JSON.stringify({ story, trace }, null, 1)); await b.close(); })();
