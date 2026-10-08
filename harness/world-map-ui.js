// World map UI integration (consensus bus #1878): the side rail, the overlay
// lifecycle over its origin sheet, visited/unvisited drawing, stable stored
// cells across travel/reopen/reload/RemoveRoom/map export+import, explicit
// travel, Back/Escape order. Real Zork I route; no injected rooms.
//   node harness/world-map-ui.js [--stub]
// --stub (or a missing/empty js/WorldMapLayout.js) installs a test-only
// layout with the agreed place(nodes, edges, previous) signature.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
const useStub = process.argv.includes('--stub') || !fs.existsSync('js/WorldMapLayout.js') || !fs.readFileSync('js/WorldMapLayout.js', 'utf8').trim();

const stubLayout = () => {
  // Test-only stand-in: keeps previous cells, places new nodes by compass
  // vector from a placed neighbour, spirals off collisions, never moves cells.
  window.WorldMapLayout = { place: function (nodes, edges, previous) {
    const V = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0], northeast: [1, -1], northwest: [-1, -1], southeast: [1, 1], southwest: [-1, 1] };
    const cells = new Map(), used = new Set(), id = c => c.x + ',' + c.y + ',' + c.level;
    nodes.forEach(n => { const c = previous.get(n.key); if (c && !used.has(id(c))) { cells.set(n.key, { x: c.x, y: c.y, level: c.level }); used.add(id(c)); } });
    const free = (c) => { for (let r = 0; r < 50; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const t = { x: c.x + dx, y: c.y + dy, level: c.level }; if (!used.has(id(t))) return t; } return c; };
    let progress = true;
    while (progress) { progress = false;
      nodes.forEach(n => { if (cells.has(n.key)) return;
        const e = edges.find(e => e.to === n.key && cells.has(e.from)) || edges.find(e => e.from === n.key && cells.has(e.to));
        let c;
        if (e) { const base = cells.get(e.to === n.key ? e.from : e.to), v = V[e.dir] || [1, 0], s = e.to === n.key ? 1 : -1;
          const lv = e.dir === 'up' ? s : e.dir === 'down' ? -s : 0;
          c = free({ x: base.x + (lv ? 0 : v[0] * s), y: base.y + (lv ? 0 : v[1] * s), level: base.level + lv }); }
        else if (!cells.size) c = { x: 0, y: 0, level: 0 };
        else return;
        cells.set(n.key, c); used.add(id(c)); progress = true; }); }
    nodes.forEach(n => { if (!cells.has(n.key)) { const c = free({ x: 0, y: 6, level: 0 }); cells.set(n.key, c); used.add(id(c)); } });
    const edgeKinds = edges.map(e => { const a = cells.get(e.from), b = cells.get(e.to); if (!a || !b) return 'hidden'; if (a.level !== b.level) return 'vertical'; return V[e.dir] ? 'straight' : 'labelled'; });
    return { cells, edgeKinds };
  } };
};

(async () => {
  const b = await chromium.launch();
  for (const width of [360, 1280]) {
    const ctx = await b.newContext({ viewport: { width, height: 820 } }); const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(String(e.message || e)));
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
    if (useStub) await p.addInitScript(stubLayout);
    const boot = async () => {
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/Zork1-TheGreatUndergroundEmpire.z3.js'); await p.waitForTimeout(4500);
      await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
      for (let i = 0; i < 14 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
    };
    const send = async c => { const li = p.locator('.Input.LineInput'); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1500); };
    const W = ' @' + width + 'px';
    await boot();
    for (const c of ['north', 'east']) await send(c);

    // Side rail.
    const rail = await p.evaluate(() => { const v = el => el && getComputedStyle(el).display !== 'none'; const w = document.getElementById('pl-world-tab');
      const desktopMapOpen = document.body.classList.contains("map-open"); ParchLockMap.Hide(); const main = v(w); ParchLockMap.Show(); const onMap = v(w); const wr = w.getBoundingClientRect(), mr = document.getElementById('pl-map-tab').getBoundingClientRect();
      return { main, onMap, above: wr.bottom <= mr.top + 1, desktopMapOpen }; });
    ok(!rail.main && rail.onMap && rail.above, 'World tab: hidden on the main screen, shown with the map, sits above the Map tab' + W + ' ' + JSON.stringify(rail));

    // Open from the map.
    await p.click('#pl-world-tab'); await p.waitForTimeout(400);
    let s = await p.evaluate(() => ({ open: WorldMap.IsOpen(), mapStill: document.body.classList.contains('map-open'),
      rooms: Array.from(document.querySelectorAll('#world-map .world-room')).map(n => ({ name: n.textContent, cur: n.classList.contains('current'), unv: n.classList.contains('unvisited') })) }));
    ok(s.open && s.mapStill && s.rooms.length >= 3, 'World opens over the map and shows the discovered rooms' + W + ': ' + s.rooms.map(r => r.name).join(', '));
    ok(s.rooms.filter(r => r.cur).length === 1 && /Behind House/.test(s.rooms.find(r => r.cur).name), 'exactly one current room is highlighted (Behind House)' + W);
    ok(['West of House', 'North of House', 'Behind House'].every(n => s.rooms.some(r => r.name.indexOf(n) === 0 && !r.unv)), 'rooms you have stood in are drawn as visited' + W);
    const cells1 = await p.evaluate(() => ParchLockMap.Rooms.filter(r => r.WorldX != null).map(r => [r.Name, r.WorldX, r.WorldY, r.WorldLevel]));
    ok(cells1.length >= 3 && cells1.every(c => c.slice(1).every(Number.isInteger)), 'cells are stored on the existing room records' + W);

    // Selecting a room sends nothing; Travel is explicit.
    const echoes = () => p.evaluate(() => document.querySelectorAll('#windowport .Style_input').length);
    const e0 = await echoes();
    await p.evaluate(() => document.querySelector('#world-map .world-room:not(.current)').click()); await p.waitForTimeout(300);
    ok((await echoes()) === e0 && await p.evaluate(() => !document.querySelector('#world-map .world-panel').hidden), 'selecting a room opens its panel and submits no command' + W);

    // #1888/#1890: a REAL pointer tap selects a room (no retargeting), and a
    // slow drag of many 1px steps pans instead of selecting.
    await p.evaluate(() => { WorldMap._selected = null; WorldMap._paintSig = null; WorldMap.paint(); });
    const box = await p.locator('#world-map .world-room.current').boundingBox();
    await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !!WorldMap._selected && !!document.querySelector('#world-map .world-room.current.selected')), 'a real mouse tap on a room selects it' + W);
    await p.evaluate(() => { WorldMap._selected = null; WorldMap._paintSig = null; WorldMap.paint(); });
    const box2 = await p.locator('#world-map .world-room.current').boundingBox(), tx0 = await p.evaluate(() => WorldMap._view.tx);
    await p.mouse.move(box2.x + 20, box2.y + 20); await p.mouse.down();
    for (let i = 1; i <= 30; i++) await p.mouse.move(box2.x + 20 + i, box2.y + 20);
    await p.mouse.up(); await p.waitForTimeout(200);
    const pan = await p.evaluate(tx0 => ({ moved: WorldMap._view.tx - tx0, selected: WorldMap._selected }), tx0);
    ok(pan.moved >= 20 && !pan.selected, 'a slow 1px-at-a-time drag pans the map and selects nothing' + W + ' ' + JSON.stringify(pan));

    // #1889: one-way arrow heads end OUTSIDE the target card, so they show.
    const arrows = await p.evaluate(() => Array.from(document.querySelectorAll('#world-map .world-edge[marker-end]')).map(el => {
      const pts = el.tagName === 'line' ? [+el.getAttribute('x2'), +el.getAttribute('y2')] : el.getAttribute('points').trim().split(' ').pop().split(',').map(Number);
      const inside = Array.from(document.querySelectorAll('#world-map .world-room')).some(n => { const x = parseFloat(n.style.left), y = parseFloat(n.style.top);
        return pts[0] > x && pts[0] < x + n.offsetWidth && pts[1] > y && pts[1] < y + n.offsetHeight; });
      return inside; }));
    ok(arrows.length > 0 && arrows.every(inside => !inside), 'every one-way arrow head ends outside the cards (' + arrows.length + ' arrows)' + W);

    // #1886: the walked proof survives a same-destination look-ahead and is
    // cleared by one naming a different destination.
    const proof = await p.evaluate(() => {
      // A temporary room of its own, so no real map record is touched.
      MapTopology.link('WMT Proof Room', 'north', null, { toId: 99001, source: 'state-delta', command: 'north' });
      const room = ParchLockMap.Rooms.find(r => r.Name === 'WMT Proof Room'), key = Object.keys(room.ExitMeta)[0];
      const id = room.ExitMeta[key].travelledTo;
      MapTopology.link('WMT Proof Room', 'north', null, { toId: 99001, source: 'ram-lookahead', command: 'north' });
      const kept = room.ExitMeta[key].travelledTo === id;
      // The n/north fold (TranslatorUI.remapRoomExitKeys) must not erase it either.
      room.ExitMeta.n = Object.assign({}, room.ExitMeta[key]); room.ExitMeta.north = { toId: 99001, source: 'ram-lookahead', command: 'north' };
      if (key !== 'n' && key !== 'north') delete room.ExitMeta[key];
      TranslatorUI.remapRoomExitKeys(room);
      const folded = room.ExitMeta.n && room.ExitMeta.n.travelledTo === id;
      MapTopology.link('WMT Proof Room', 'n', null, { toId: 99002, source: 'ram-lookahead', command: 'north' });
      TranslatorUI.remapRoomExitKeys(room);    // as the app does each tick
      const cleared = room.ExitMeta.n.travelledTo === undefined;
      // #1897: an unbound "?" proof ends as soon as any destination id is seen.
      MapTopology.link('WMT Proof Room', 'south', null, { source: 'state-delta', command: 'south' });
      const sKey = MapTopology.normalizeLabel('south'), unbound = room.ExitMeta[sKey].travelledTo === '?';
      MapTopology.link('WMT Proof Room', 'south', null, { toId: 99003, source: 'ram-lookahead', command: 'south' });
      const unboundCleared = unbound && room.ExitMeta[sKey].travelledTo === undefined;
      ParchLockMap.RemoveRoom(null, room, true);
      return { id, kept, folded, cleared, unboundCleared, gone: !ParchLockMap.Rooms.some(r => r.Name === 'WMT Proof Room') }; });
    ok(proof.id === '99001' && proof.kept && proof.folded && proof.cleared && proof.unboundCleared && proof.gone, 'walked proof: kept through a same-destination look-ahead and the n/north fold, cleared by a different destination' + W + ' ' + JSON.stringify(proof));

    // #1897: the renderer checks the proof against THIS edge's real target.
    const bind = await p.evaluate(() => {
      const w = ParchLockMap.Rooms.find(r => /West of House/.test(r.Name)), m = w.ExitMeta.n, keep = JSON.parse(JSON.stringify(m));
      m.source = 'ram-lookahead';
      const right = WorldMap.evidence(w, 'n');
      m.travelledTo = '12345'; const wrong = WorldMap.evidence(w, 'n');
      m.travelledTo = '?'; const unboundOnRealTarget = WorldMap.evidence(w, 'n');
      const target = ParchLockMap.Rooms[w.Exits.n], real = target.HasRealId;
      target.HasRealId = false; const unboundOnTextTarget = WorldMap.evidence(w, 'n'); target.HasRealId = real;
      m.source = 'state-delta'; const latestMove = WorldMap.evidence(w, 'n');
      w.ExitMeta.n = keep; return { right, wrong, unboundOnRealTarget, unboundOnTextTarget, latestMove }; });
    ok(bind.right === 'travelled' && bind.wrong === 'hinted' && bind.unboundOnRealTarget === 'hinted' && bind.unboundOnTextTarget === 'hinted' && bind.latestMove === 'travelled', 'walked proof binds the actual target; unbound later hints are conservative for real and text-only rooms' + W + ' ' + JSON.stringify(bind));
    // #1897: a BENT edge along one row still ends outside its target card.
    const bentRow = await p.evaluate(() => {
      const g = WorldMap._graph, i = g.edges.findIndex(e => { const a = WorldMap._cells.get(e.from), b = WorldMap._cells.get(e.to); return a && b && a.y === b.y && a.level === b.level && a.x !== b.x; });
      if (i < 0) return { none: true };
      const saved = WorldMap._edgeKinds[i]; WorldMap._edgeKinds[i] = 'bent'; WorldMap._paintSig = null; WorldMap.paint();
      // New decoded hints can add earlier bent edges. Inspect the edge we
      // deliberately bent, rather than the first unrelated polyline.
      const el = Array.from(document.querySelectorAll('#world-map polyline.world-edge')).find(el => el.dataset.from === g.edges[i].from && el.dataset.to === g.edges[i].to), points = el && el.getAttribute('points').trim().split(' ').map(p => p.split(',').map(Number));
      const end = points && points[points.length - 1], prev = points && points[points.length - 2];
      const target = document.querySelector('#world-map .world-room[data-key="' + g.edges[i].to + '"]'), x = parseFloat(target.style.left), y = parseFloat(target.style.top);
      const inside = end && end[0] > x && end[0] < x + target.offsetWidth && end[1] > y && end[1] < y + target.offsetHeight;
      const toward = end && prev && (end[0] - prev[0]) * (x + target.offsetWidth / 2 - end[0]) + (end[1] - prev[1]) * (y + target.offsetHeight / 2 - end[1]) > 0;
      WorldMap._edgeKinds[i] = saved; WorldMap._paintSig = null; WorldMap.paint();
      return { drawn: !!el, inside, toward }; });
    ok(bentRow.drawn && bentRow.inside === false && bentRow.toward, 'a bent edge along one row ends outside its target card and points toward it' + W + ' ' + JSON.stringify(bentRow));

    // #1887: Browse hands the compass map the selected room RECORD.
    const browsed = await p.evaluate(() => { const room = ParchLockMap.Rooms.find(r => /West of House/.test(r.Name)); let arg = null; const d0 = ParchLockMap.Draw;
      ParchLockMap.Draw = function (x) { arg = x; return d0.apply(this, arguments); }; WorldMap.browse(room); ParchLockMap.Draw = d0;
      const res = { record: arg === room, worldClosed: !WorldMap.IsOpen(), map: document.body.classList.contains('map-open') }; WorldMap.Open(); return res; });
    ok(browsed.record && browsed.worldClosed && browsed.map, 'Browse closes World and draws the selected room record (not its name)' + W + ' ' + JSON.stringify(browsed));

    // Toggle back with the World tab returns to the map.
    await p.click('#pl-world-tab'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !WorldMap.IsOpen() && document.body.classList.contains('map-open')), 'tapping World again returns to the map' + W);

    // Escape: World first, map stays.
    await p.evaluate(() => WorldMap.Open()); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !WorldMap.IsOpen() && document.body.classList.contains('map-open')), 'Escape closes World first and leaves the map open' + W);

    // From Equipment: never re-opens Equipment or starts a status check.
    await p.evaluate(() => { localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); EquipmentUI.Show(); });
    await p.waitForTimeout(8000);
    const eq = await p.evaluate(() => new Promise(res => {
      let shows = 0, reqs = 0; const s0 = EquipmentUI.Show, r0 = StatTracker.requestStatusFulfillment;
      EquipmentUI.Show = function () { shows++; return s0.apply(this, arguments); };
      StatTracker.requestStatusFulfillment = function () { reqs++; return r0.apply(this, arguments); };
      document.getElementById('pl-world-tab').click();
      const openOk = WorldMap.IsOpen() && document.body.classList.contains('equip-open');
      document.getElementById('pl-equip-tab').click();     // the origin tab: just closes World
      setTimeout(() => { const back = !WorldMap.IsOpen() && document.body.classList.contains('equip-open');
        EquipmentUI.Show = s0; StatTracker.requestStatusFulfillment = r0; res({ openOk, back, shows, reqs }); }, 300); }));
    ok(eq.openOk && eq.back && eq.shows === 0 && eq.reqs === 0, 'from Equipment: World opens over it and the Equipment tab returns to it untouched (no Show, no status request)' + W + ' ' + JSON.stringify(eq));
    const other = await p.evaluate(() => { document.getElementById('pl-world-tab').click(); document.getElementById('pl-map-tab').click();
      return { world: WorldMap.IsOpen(), map: document.body.classList.contains('map-open'), equip: document.body.classList.contains('equip-open') }; });
    ok(!other.world && other.map && !other.equip, 'from Equipment, tapping Map closes World and does the Map tab\'s usual job' + W + ' ' + JSON.stringify(other));

    // Stability: travel adds a room; placed rooms do not move; reopen identical.
    await p.evaluate(() => { WorldMap.Close(); ParchLockMap.Hide(); });
    await send('south');
    await p.evaluate(() => { ParchLockMap.Show(); WorldMap.Open(); });
    const cells2 = await p.evaluate(() => ParchLockMap.Rooms.filter(r => r.WorldX != null).map(r => [r.Name, r.WorldX, r.WorldY, r.WorldLevel]));
    ok(cells1.every(c => cells2.some(d => JSON.stringify(d) === JSON.stringify(c))) && cells2.length > cells1.length, 'after travelling to a new room, every placed room keeps its cell' + W);
    await p.evaluate(() => { WorldMap.Close(); WorldMap.Open(); });
    const cells3 = await p.evaluate(() => ParchLockMap.Rooms.filter(r => r.WorldX != null).map(r => [r.Name, r.WorldX, r.WorldY, r.WorldLevel]));
    ok(JSON.stringify(cells3) === JSON.stringify(cells2), 'reopening shows identical positions' + W);

    // Map export + re-import (the existing map save system) keeps the cells.
    const roundTrip = await p.evaluate(() => { const data = JSON.parse(JSON.stringify(WorkspaceUI.MapData())); WorldMap.Close(); WorkspaceUI.LoadMap(data); WorldMap.Open();
      return ParchLockMap.Rooms.filter(r => r.WorldX != null).map(r => [r.Name, r.WorldX, r.WorldY, r.WorldLevel]); });
    ok(JSON.stringify(roundTrip) === JSON.stringify(cells2), 'map export then import keeps every cell' + W);

    // RemoveRoom renumbers Ids; the remaining rooms keep their cells.
    const removed = await p.evaluate(() => { WorldMap.Close(); const victim = ParchLockMap.Rooms.find(r => /South of House/.test(r.Name));
      ParchLockMap.RemoveRoom(null, victim, true); WorldMap.Open();
      return ParchLockMap.Rooms.filter(r => r.WorldX != null).map(r => [r.Name, r.WorldX, r.WorldY, r.WorldLevel]); });
    ok(removed.length === cells2.length - 1 && removed.every(c => cells2.some(d => JSON.stringify(d) === JSON.stringify(c))), 'removing a room renumbers Ids but every other room keeps its cell' + W);

    // App reload: the per-story map save brings the same cells back.
    const priorVisited = await p.evaluate(() => ParchLockMap.Rooms.filter(r => r.WorldVisited).map(r => String(r.ObjectId)));
    await p.evaluate(() => WorldMap.Close());
    await boot();
    const reloaded = await p.evaluate(() => { ParchLockMap.Show(); WorldMap.Open(); return ParchLockMap.Rooms.filter(r => r.WorldX != null).map(r => [r.Name, r.WorldX, r.WorldY, r.WorldLevel]); });
    ok(removed.every(c => reloaded.some(d => JSON.stringify(d) === JSON.stringify(c))), 'after an app reload the map save restores every prior cell (new decoded hints may be rediscovered)' + W);
    const vis = await p.evaluate(() => ({ rooms: ParchLockMap.Rooms.map(r => [r.Name, !!r.WorldVisited]),
      dotted: Array.from(document.querySelectorAll('#world-map .world-edge.dotted')).length,
      visitedIds: ParchLockMap.Rooms.filter(r => r.WorldVisited).map(r => String(r.ObjectId)),
      edges: WorldMap.buildGraph().edges.map(e => ({ evidence: e.evidence })),
      stored: (JSON.parse(localStorage.getItem('PL_Map_' + ParchLock.GameFilename)) || []).map(r => [r.Name, !!r.WorldVisited]) }));
    ok(priorVisited.every(id => vis.visitedIds.includes(id)) && vis.edges.some(e => e.evidence === 'travelled')
      && (vis.edges.every(e => e.evidence === 'travelled') ? vis.dotted === 0 : vis.dotted > 0),
      'prior visited rooms and travelled proof survive reload; new hints retain dotted links' + W + ' ' + JSON.stringify(vis));

    // Explicit travel: closes World, then the existing route runs.
    const before = await p.evaluate(() => ParchLockMap.CurrentRoom);
    await p.evaluate(() => { const n = Array.from(document.querySelectorAll('#world-map .world-room')).find(x => /North of House/.test(x.textContent) && !x.classList.contains('current')); n.click(); });
    await p.waitForTimeout(200);
    await p.evaluate(() => Array.from(document.querySelectorAll('#world-map .world-action')).find(x => /Travel/.test(x.textContent)).click());
    await p.waitForTimeout(9000);
    const after = await p.evaluate(() => ({ world: WorldMap.IsOpen(), room: ParchLockMap.CurrentRoom }));
    ok(!after.world && /North of House/.test(after.room) && after.room !== before, 'Travel here closes World and walks the existing route' + W + ' ' + JSON.stringify({ before, after }));

    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal page overflow' + W);
    await p.evaluate(() => { ParchLockMap.Show(); WorldMap.Open(); });
    await p.screenshot({ path: path.resolve('work/investigations/world-map-' + width + '.png') });
    ok(errors.length === 0, 'no page errors' + W + (errors.length ? ': ' + errors[0] : ''));
    await ctx.close();
  }
  await b.close();
  console.log((useStub ? '[layout stub] ' : '') + pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
