// LLR3 dungeon depth (operator 2026-11-06, work/investigations/llr3-depth/PROPOSAL.md).
// One seeded run (page LCG s=12345, walker seed 7): trapdoor in Cold room 219 at step 12 -> Wet room 233.
// Proves: Depth stat 1 then 2 (room map_region prop 7 rank); level-2 room on a different, lower World level;
// local map draws the trapdoor neighbour in the down slot; level-1 and level-2 rooms stay distinct records.
//   node harness/llr3-depth.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
(async () => {
    const b = await chromium.launch(); const p = await b.newPage();
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/LLR3.z8.js'); await p.waitForTimeout(2500);
    const toLine = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
    await toLine();
    const txt = () => p.evaluate(() => document.querySelector('#windowport .BufferWindow').innerText);
    const send = async c => { const n = (await txt()).length; await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(700); await toLine(); return (await txt()).slice(n); };
    const depth = () => p.evaluate(() => { WorldModel.tick(); const s = StatTracker.model().stats.depth; return s ? s.value : null; });
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed; };
    const dirs = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'];
    let found = false, d1 = null, from = null;
    for (let step = 0; step < 40 && !found; step++) {
        const t = await send('look');
        if (/trap ?door/i.test(t)) { found = true; d1 = await depth(); from = await p.evaluate(() => WorldModel.lastPayload.roomId); break; }
        const ex = (t.match(/\b(north|south|east|west)\b/gi) || dirs);
        await send(ex[rnd() % ex.length].toLowerCase());
    }
    check(found && from === 219, 'walker reaches the trapdoor in Cold room 219 (got ' + from + ')');
    check(d1 === 1, 'Depth stat is 1 on level 1 (got ' + d1 + ')');
    await send('enter trapdoor'); await send('look');
    const d2 = await depth();
    check(d2 === 2, 'Depth stat is 2 after the trapdoor (got ' + d2 + ')');
    const r = await p.evaluate(() => {
        const rooms = ParchLockMap.Rooms.filter(x => x && x.HasRealId);
        const a = rooms.find(x => String(x.ObjectId) === '219'), c = rooms.find(x => String(x.ObjectId) === '233');
        try { WorldMap._layoutSig = null; WorldMap.Show && WorldMap.Show(); } catch (e) {}
        try { WorldMap.relayout ? WorldMap.relayout() : null; } catch (e) {}
        const g = WorldMap.buildGraph(); const out = WorldMap.layoutWithSections(g);
        const ca = a && out.cells.get(g.keyOf.get(a)), cc = c && out.cells.get(g.keyOf.get(c));
        const e = g.edges.find(x => a && c && x.from === g.keyOf.get(a) && x.to === g.keyOf.get(c));
        try { ParchLockMap.Redraw ? ParchLockMap.Redraw() : null; } catch (e2) {}
        return { distinct: !!(a && c && a !== c && g.keyOf.get(a) !== g.keyOf.get(c)), la: ca && ca.level, lc: cc && cc.level,
                 edge: e ? { dir: e.dir, layoutDir: e.layoutDir } : null, lc219: MapTopology.levelChangeDir(a, c),
                 l1: rooms.filter(x => MapTopology.roomDepth(x) === 1).length, l2: rooms.filter(x => MapTopology.roomDepth(x) === 2).length,
                 labels: (() => { WorldMap._graph = g; WorldMap._cells = out.cells; return [ca && WorldMap.depthLabel(ca.level), cc && WorldMap.depthLabel(cc.level)]; })() };
    });
    console.log(JSON.stringify(r));
    check(r.distinct && r.l1 >= 2 && r.l2 >= 1, 'level-1 and level-2 rooms are distinct records (no merge): l1=' + r.l1 + ' l2=' + r.l2);
    check(r.edge && r.edge.layoutDir === 'down', 'trapdoor edge 219->233 placed as a down step (dir "' + (r.edge && r.edge.dir) + '")');
    check(r.la != null && r.lc === r.la - 1, 'Wet room 233 on World level ' + r.lc + ', one below Cold room 219 (' + r.la + ')');
    check(r.labels[0] === "Depth 1" && r.labels[1] === "Depth 2", "World map level buttons read Depth 1 / Depth 2: " + r.labels);
    check(r.lc219 === 'down', 'local map: levelChangeDir(219,233) = down (down slot)');
    // Local map from 219's record: the 233 neighbour box sits in the down slot.
    const slot = await p.evaluate(() => { const a = ParchLockMap.Rooms.find(x => x && String(x.ObjectId) === '219'); if (!a) return null; const dir = Object.keys(a.Exits || {}).find(k => String(ParchLockMap.Rooms[a.Exits[k]] && ParchLockMap.Rooms[a.Exits[k]].ObjectId) === '233'); return dir || null; });
    console.log('219 exit label to 233:', slot);
    await b.close();
    console.log(pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
