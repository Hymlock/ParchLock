// Blind check for Codex #3460 (grok2): fresh boot, no calibration; does EquipmentUI label state for a verified-fact object?
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const G = { verifiedZIL: 'Zork1-TheGreatUndergroundEmpire.z3.js', verifiedZIL2: 'Cutthroats.z3.js', unknownZIL: 'Suspect.z3.js', inform: 'curses.z5.js', glulx: 'CounterfeitMonkey.gblorb.js' };
const settle = async p => { for (let i = 0; i < 14 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press(i % 3 === 2 ? '1' : i % 3 === 1 ? 'Enter' : 'Space'); } await p.waitForTimeout(300); } };
(async () => { const b = await chromium.launch(); for (const k in G) { const p = await b.newPage(); await p.addInitScript(() => { localStorage.clear(); sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + G[k]); await p.waitForTimeout(k === 'glulx' ? 9000 : 3500); await settle(p);
  const r = await p.evaluate(() => { const mem = ZRamProvider.getMem && ZRamProvider.getMem(); const q = f => { try { return EquipmentUI.flagStateKnown({}, f); } catch (e) { return 'err'; } };
    const own = f => { try { return !!(mem && AttributeSchema.measuredFlagOwner(mem, f)); } catch (e) { return 'err'; } };
    let trusted; try { trusted = EquipmentUI.containerStateKnown({}); } catch (e) { trusted = 'err'; }
    const tags = a => { try { return EquipmentUI.containerStateTags({ attrs: a }).concat(EquipmentUI.activationStateTags({ attrs: a })); } catch (e) { return 'err'; } };
    return { mem: !!mem, inform: mem ? ZRamReader.isInformCompiled(mem) : null, known: { open: q('open'), on: q('on'), switchable: q('switchable'), openable: q('openable') }, measuredOwner: { open: own('open'), container: own('container'), on: own('on') }, containerTrusted: trusted,
      closedBox: tags({ container: true, open: false }), openBox: tags({ container: true, open: true }), lampOn: tags({ switchable: true, on: true }) }; });
  console.log(k.padEnd(13), JSON.stringify(r)); await p.close(); } await b.close(); })();
