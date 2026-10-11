// ZIL source-flag correlation (2026-10-11, supplementary evidence per operator rule): Infocom's released ZIL
// source (github.com/historicalsource/<repo>) lists each object's initial (FLAGS ...). Match source objects
// to RAM objects by DESC == short name (unique on both sides), then for every source flag find the attribute
// bit whose RAM set equals the flag's set at boot. Read-only; writes 2026-10-11-zil-source-flags.json.
//   [ONLY=Zork1-...z3.js] node work/investigations/zil-source-flags.js
const fs = require('fs'), path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const REPO = { 'Zork1-TheGreatUndergroundEmpire.z3.js': 'zork1', 'Zork2-TheWizardofFrobozz.z3.js': 'zork2', 'Zork3-TheDungeonMaster.z3.js': 'zork3', 'Enchanter.z3.js': 'enchanter', 'Hitchhik.z5.js': 'hitchhikersguide', 'Ballyhoo.z3.js': 'ballyhoo', 'Cutthroats.z3.js': 'cutthroats', 'Deadline.z3.js': 'deadline', 'Infidel.z3.js': 'infidel', 'HollywoodHijinx.z3.js': 'hollywoodhijinx', 'LeatherGoddessesofPhobos.z3.js': 'leathergoddesses', 'Moonmist.z3.js': 'moonmist', 'PlunderedHearts.z3.js': 'plunderedhearts', 'Borderzo.z5.js': 'borderzone', 'TheLurkingHorror.z3.js': 'lurkinghorror', 'Planetfall.z3.js': 'planetfall', 'Seastalker.z3.js': 'seastalker', 'Sorcerer.z3.js': 'sorcerer', 'Spellbreaker.z3.js': 'spellbreaker', 'Starcross.z3.js': 'starcross', 'Stationfall.z3.js': 'stationfall', 'Suspect.z3.js': 'suspect', 'Suspended.z3.js': 'suspended', 'Wishbringer.z3.js': 'wishbringer', 'TheWitness.z3.js': 'witness' };
const H = { 'User-Agent': 'parchmap-research' };
async function sourceObjects(repo) { const t = await (await fetch(`https://api.github.com/repos/historicalsource/${repo}/git/trees/HEAD?recursive=1`, { headers: H })).json();
  const files = (t.tree || []).filter(x => /\.zil$/i.test(x.path)).map(x => x.path); const objs = [];
  for (const f of files) { const src = await (await fetch(`https://raw.githubusercontent.com/historicalsource/${repo}/HEAD/${f}`, { headers: H })).text();
    const re = /<(OBJECT|ROOM)\s+([A-Z0-9\-?]+)([\s\S]*?)(?=\n<(?:OBJECT|ROOM|ROUTINE|GLOBAL|CONSTANT|SYNTAX|DEFINE|SETG)\b|$)/g; let m;
    while ((m = re.exec(src))) { const body = m[3]; const d = /\(DESC\s+"([^"]*)"\)/.exec(body); const fl = /\(FLAGS\s+([^)]*)\)/.exec(body);
      objs.push({ kind: m[1], name: m[2], desc: d ? d[1] : null, flags: fl ? fl[1].trim().split(/\s+/).filter(Boolean) : [], file: f }); } }
  // Repos can hold several source versions (zork3: 3dungeon.zil and dungeon.zil): keep one entry per object NAME,
  // preferring a file whose name starts with a digit (the released game's own files); disagreements show as fp/fn.
  const byName = new Map(); objs.sort((a, b) => (/^\d/.test(b.file.split('/').pop()) ? 1 : 0) - (/^\d/.test(a.file.split('/').pop()) ? 1 : 0)).forEach(o => { if (!byName.has(o.name)) byName.set(o.name, o); });
  return { files, objs: [...byName.values()] }; }
(async () => { const only = process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(REPO); const out = {}; const b = await chromium.launch();
  for (const g of only) { const repo = REPO[g]; if (!repo) continue; const rec = out[g] = { repo, source: `https://github.com/historicalsource/${repo}` };
    try { const S = await sourceObjects(repo); rec.files = S.files.length; rec.sourceObjects = S.objs.length;
      const p = await b.newPage(); await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(4000);
      const ram = await p.evaluate(() => { const m = ZRamProvider.getMem(); const v = m.getUint8(0); const n = v <= 3 ? 255 : 1000; const out = [];
        for (let id = 1; id <= n; id++) { let L; try { L = ZRamReader.objectLinks(m, id); } catch (e) { break; } if (!L || !L.attrBytes) break; let nm = ''; try { nm = ZRamReader.shortName(m, id) || ''; } catch (e) {}
          const bits = []; L.attrBytes.forEach((byte, i) => { for (let k = 0; k < 8; k++) if (byte & (0x80 >> k)) bits.push(i * 8 + k); }); out.push({ id, nm, bits }); if (v <= 3 && id >= 255) break; }
        return out; }); await p.close();
      const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); const cnt = (arr, k) => arr.filter(x => k(x)).length;
      const pairs = []; for (const o of S.objs) { if (!o.desc) continue; const d = norm(o.desc); if (cnt(S.objs, x => norm(x.desc) === d) !== 1) continue; const r = ram.filter(x => norm(x.nm) === d); if (r.length === 1) pairs.push({ src: o, ram: r[0] }); }
      rec.matched = pairs.length; rec.ramObjects = ram.length; const flags = [...new Set(pairs.flatMap(x => x.src.flags))].sort(); rec.flags = {};
      for (const f of flags) { const pos = pairs.filter(x => x.src.flags.includes(f)), neg = pairs.filter(x => !x.src.flags.includes(f)); let best = null;
        for (let bit = 0; bit < 48; bit++) { const tp = pos.filter(x => x.ram.bits.includes(bit)).length, fp = neg.filter(x => x.ram.bits.includes(bit)).length; const score = tp - fp - (pos.length - tp); if (!best || score > best.score) best = { bit, tp, fp, fn: pos.length - tp, score }; }
        rec.flags[f] = { bit: best.bit, positives: pos.length, negatives: neg.length, tp: best.tp, fp: best.fp, fn: best.fn, exact: best.fp === 0 && best.fn === 0, examples: pos.slice(0, 3).map(x => x.ram.id + ':' + x.ram.nm) }; }
      console.log(g, 'matched', rec.matched, '/', rec.sourceObjects, 'src;', Object.entries(rec.flags).map(([f, v]) => f + '=' + v.bit + (v.exact ? '' : '~') + '[' + v.tp + '/' + v.positives + ' fp' + v.fp + ']').join(' '));
    } catch (e) { rec.error = e.message.slice(0, 150); console.log(g, 'ERROR', rec.error); } }
  await b.close(); const P = path.join('work/investigations', '2026-10-11-zil-source-flags.json'); let prev = {}; try { prev = JSON.parse(fs.readFileSync(P, 'utf8')); } catch (e) {} fs.writeFileSync(P, JSON.stringify(Object.assign(prev, out), null, 1)); })();

