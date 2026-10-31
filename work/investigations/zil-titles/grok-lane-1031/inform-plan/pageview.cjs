// grok: read-only in-page view of what Parchmap believes for given object ids. node pageview.cjs <story> "<cmds>" ids...
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(3500);
  const settle = async () => { for (let i = 0; i < 20 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(200); } };
  for (const c of (process.argv[3]||'').split('|').filter(Boolean)) { await settle(); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(600); }
  await settle();
  const ids = process.argv.slice(4).map(Number);
  if (process.env.FACT) await p.evaluate(f => { const d = ModuleLibrary.currentExecutableDigest(); ModuleStatFactsClaude[d] = Object.assign({}, ModuleStatFactsClaude[d] || {}, JSON.parse(f)); }, process.env.FACT);
  console.log(JSON.stringify(await p.evaluate(ids => { WorldModel.tick(); const out = { bits: {} };
    for (const k of ['container','concealed','door','wearable','clothing','edible','enterable','female','absent','open','openable','supporter','worn','animate']) out.bits[k] = AttributeSchema.bitFor(k);
    const eq = EquipmentUI.model(); out.eq = eq.items.map(o => { const r = {}; for (const k in o) { const v = o[k]; if (typeof v !== 'object' || v === null) r[k] = v; } return r; });
    out.objs = ids.map(id => { let w = null; try { w = WorldModel.objects ? WorldModel.objects[id] : null; } catch (e) {} const r = { id }; if (w) for (const k in w) { const v = w[k]; if (typeof v === 'boolean' && v) r[k] = true; } return r; });
    out.pool = (Actionable.payloadPool() || []).map(o => { const a = o.attrs || o.attributes || {}; let c = []; try { c = Actionable.resolveObjectCommands(o.id, 'object').map(x => x.command); } catch (e) {} return o.id + ':' + o.name + ' [' + Object.keys(a).filter(k => a[k] === true).join(',') + '] ' + c.join('; '); });
    return out; }, ids)));
  await b.close(); })();


