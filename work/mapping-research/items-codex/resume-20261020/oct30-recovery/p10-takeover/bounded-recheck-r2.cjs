// Regression gate (operator 2026-10-10): one row per game, recorded the same
// way on a baseline tree and on the candidate tree, then diffed.
// Per game: boot, LOOK, the first two printed/lookahead exits walked and back,
// i, take all, i. Records map rooms (id:name), current-room exits, underline
// marks after LOOK, and the shown inventory names (EquipmentUI.render path).
//   ROOT=<tree> OUT=<file.jsonl> [GAMES=a,b] node work/investigations/regression-gate.cjs
//   node work/investigations/regression-gate.cjs --diff base.jsonl cand.jsonl
const fs = require('fs'), path = require('path');
if (process.argv[2] === '--diff') {
    const rd = f => Object.fromEntries(fs.readFileSync(f, 'utf8').trim().split('\n').map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(r => r && r.game).map(r => [r.game, r]));
    const a = rd(process.argv[3]), b = rd(process.argv[4]); let changed = 0;
    for (const g of Object.keys(a).sort()) {
        if (!b[g]) { console.log('MISSING ' + g); changed++; continue; }
        for (const k of ['rooms', 'exits', 'marks', 'inv1', 'inv2', 'error']) {
            const x = JSON.stringify(a[g][k]), y = JSON.stringify(b[g][k]);
            if (x !== y) { changed++; console.log(g + ' ' + k + '\n  base: ' + String(x).slice(0, 300) + '\n  cand: ' + String(y).slice(0, 300)); }
        }
    }
    console.log('GATE: ' + Object.keys(a).length + ' games, ' + changed + ' differences (each must be an intended, reviewed change)');
    process.exit(0);
}
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const ROOT = process.env.ROOT || '.';
// GLULX=1 includes Glulx titles (the three-type check: ZIL + Inform Z + Glulx).
const games = fs.readdirSync('games').filter(f => f.endsWith('.js') && (process.env.GLULX || !/\.(ulx|gblorb)\.js$/i.test(f))).sort()
    .filter(f => !process.env.GAMES || process.env.GAMES.split(',').includes(f))
    // SHARD=i/N (bottleneck fix 2026-10-17): this process runs every N-th game starting at i; run N shards in parallel and
    // concatenate their OUT files. The --diff mode is unchanged (keyed by game).
    .filter((f, idx) => { const m = /^(\d+)\/(\d+)$/.exec(process.env.SHARD || ''); return !m || idx % +m[2] === +m[1]; });
const out = fs.createWriteStream(process.env.OUT || 'gate.jsonl');
(async () => {
    const b = await chromium.launch();
    for (const g of games) {
        const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
        // Deterministic runs (2026-10-11): the story's random opcode draws on Math.random; seed it so
    // base and candidate see the same game events (Planetfall's ambassador was flipping run to run).
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
        const row = { game: g };
        try {
            await p.addInitScript(()=>{let seed=12345;Math.random=()=>{seed=(seed*1103515245+12345)>>>0;return seed/4294967296;};});await p.goto(pathToFileURL(path.resolve(ROOT, process.env.HTML || 'play.html')).href + '?story=games/' + g); await p.waitForTimeout(2000);
            const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(120); } return false; };
            const cmd = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1300); await settle(); };
            const inv = () => p.evaluate(() => { try { const all = EquipmentUI.model().items, S = Actionable.Scope, dt = S.lastLookText + "\n" + S.lastInventoryText + "\n" + (S.lastReplyText || ""); return all.map(o => { let s = Actionable.displayNameFor(o, all, dt); if (typeof LearnedWords !== "undefined") s = LearnedWords.label("name", o.id, s); return o.id + ':' + s; }); } catch (e) { return 'ERR'; } });
            if (await settle()) {
                await cmd('look');
                await p.waitForFunction(()=> typeof StatTracker === 'undefined' || (!StatTracker._probeActive && !StatTracker._hideCarryProbe), {timeout:5000});
                await p.evaluate(()=>{WorldModel.tick();Actionable.Refresh();});await p.waitForTimeout(200);
                Object.assign(row, await p.evaluate(() => ({ nativeScene: (()=>{const m=ZRamProvider.getMem(),h=ZRamReader.header(m),z=window.__PARCHLOCK_ZVM__;return {roomId:WorldModel.lastPayload?.roomId,playerId:WorldModel.lastPayload?.playerId,pc:z?.pc,read:z?.read_data?{bufaddr:z.read_data.bufaddr,parseaddr:z.read_data.parseaddr}:null,text:document.querySelector('#windowport')?.innerText,ram:Array.from({length:h.staticMem},(_,i)=>ZRamReader.u8(m,i))};})(), exits: ((WorldModel.lastPayload || {}).exits || []).map(e => e.label + '>' + e.targetRoomId).sort(), marks: [...document.querySelectorAll('.pl-act')].slice(-25).map(e => e.textContent.trim()) })));
                const ex = await p.evaluate(() => ((WorldModel.lastPayload || {}).exits || []).map(e => e.command || e.label).filter(Boolean).slice(0, 2));
                for (const e of ex) { await cmd(e); await cmd('look'); }
                await cmd('i'); row.inv1 = await inv(); await cmd('take all'); await cmd('i'); row.inv2 = await inv();
                row.rooms = await p.evaluate(() => (ParchLockMap.Rooms || []).filter(r => r && r.HasRealId).map(r => r.ObjectId + ':' + r.Name).sort());
            } else row.error = 'no-prompt';
        } catch (e) { row.error = String(e.message).slice(0, 120); }
        if(row.nativeScene?.ram){row.nativeScene.ramSha256=require('crypto').createHash('sha256').update(Buffer.from(row.nativeScene.ram)).digest('hex');delete row.nativeScene.ram;}out.write(JSON.stringify(row) + '\n');
        await p.close();
    }
    out.end(); await b.close();
})();
