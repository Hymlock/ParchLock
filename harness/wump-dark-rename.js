// Wump2ka identity R4 + dark rename (Codex GO #3103, P1 #3039). From the
// operator's save (work/investigations/operator-2026-10-10-wumpus-dark/):
// the room is the measured real_location section; darkness is the measured
// location==darkness-object verdict; a name admitted dark upgrades once when
// lit; D62 holds otherwise; a tampered fact abstains as a whole.
//   node harness/wump-dark-rename.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const pkg = fs.readFileSync('work/investigations/operator-2026-10-10-wumpus-dark/save.json', 'utf8');
(async () => {
    const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/wump2ka.z5.js'); await p.waitForTimeout(2500);
    const settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
    const send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(2200); await settle(); };
    await settle(); await p.evaluate(t => ParchLockQol.ImportPackageData(t), pkg); await p.waitForTimeout(800); await p.evaluate(() => { try { Message.Hide(); } catch (e) {} });
    await send('y'); await p.waitForSelector('#dialog_select'); await p.locator('#dialog_select').selectOption({ index: 0 }); await p.locator('#dialog_accept').click(); await p.waitForTimeout(3500); await settle();
    const state = () => p.evaluate(() => { const lp = WorldModel.lastPayload || {}; const cur = ParchLockMap.Rooms.find(x => String(x.ObjectId) === String(lp.roomId)); return { roomId: lp.roomId, source: lp.probe && lp.probe.roomSource, ev: lp.darkEvidence, scope: (lp.discoveredObjects || []).length, name: cur && cur.Name, prov: cur && (cur.NameProvenance || null), marks: [...document.querySelectorAll('.pl-act')].slice(-15).map(e => e.textContent.trim()) }; });
    await send('look');
    let s = await state();
    check(s.roomId === 50 && s.source === 'measured-fact', 'room is the measured section 50, not printed-number 49 (' + s.roomId + ' ' + s.source + ')');
    check(s.scope > 0, 'objects in the real section are discovered (' + s.scope + ')');
    check(s.marks.includes('Exit 1') && s.marks.includes('Exit 2') && s.marks.includes('Exit 3'), 'Exit 1, 2 and 3 are underlined (' + s.marks.filter(m => /exit/i.test(m)).join(',') + ')');
    await send('switch off bar');
    s = await state(); check(s.ev === 'dark', 'measured darkness evidence after SWITCH OFF (' + s.ev + ')');
    await p.evaluate(() => { ParchLockMap.Clear(); }); await p.waitForTimeout(500);
    s = await state(); check(s.name === 'Darkness' && s.prov === 'dark', 'reset admits the section while dark, stamped (' + JSON.stringify([s.name, s.prov]) + ')');
    await send('switch on bar');
    s = await state(); check(s.roomId === 50 && s.name === 'A vast, jagged icebox' && !s.prov, 'the lit name upgrades the dark name once (' + JSON.stringify([s.roomId, s.name, s.prov]) + ')');
    await send('x3');
    s = await state(); check(s.roomId === 63 && s.source === 'measured-fact', 'x3 lands in section 63 (#30) (' + s.roomId + ')');
    await send('x3');
    s = await state(); check(s.roomId === 50 && s.name === 'A vast, jagged icebox', 'return keeps the upgraded name (D62) (' + JSON.stringify([s.roomId, s.name]) + ')');
    // Dark travel: real_location follows the actor while dark; no rename.
    await send('switch off bar'); await send('x3');
    s = await state(); check(s.roomId === 63 && s.ev === 'dark', 'dark travel follows the real section (' + JSON.stringify([s.roomId, s.ev]) + ')');
    await send('x3'); await send('switch on bar');
    s = await state(); check(s.roomId === 50 && s.name === 'A vast, jagged icebox', 'a named lit room is never renamed by darkness (' + s.name + ')');
    // Whole-fact abstain on a tampered real_location.
    const t = await p.evaluate(() => { const m = ZRamProvider.getMem(), g = m.getUint16(0x0c) + 2 * 37, orig = m.getUint16(g); m.setUint16(g, 20); const r = ZRamReader.measuredLocation(m); m.setUint16(g, orig); return { tampered: r, restored: ZRamReader.measuredLocation(m) }; });
    check(t.tampered === null && t.restored && t.restored.roomId === 50, 'a tampered real_location (non-room) abstains as a whole fact (' + JSON.stringify(t) + ')');
    // Operator: survive game save/restore AND map save/reload. While the
    // section is dark-stamped: save the game, save the map, reload the page,
    // restore, then light it: the stamp must persist and upgrade once.
    await send('switch off bar');
    await p.evaluate(() => { ParchLockMap.Clear(); }); await p.waitForTimeout(500);
    s = await state(); check(s.prov === 'dark', 'stamped before the round trip (' + JSON.stringify([s.roomId, s.name, s.prov]) + ')');
    const li = p.locator('.Input.LineInput').first();
    await li.fill('save'); await li.press('Enter'); await p.waitForSelector('#dialog_infield', { timeout: 15000 }); await p.fill('#dialog_infield', 'darkrt'); await p.locator('#dialog_accept').click(); await p.waitForTimeout(1500); await settle();
    await p.evaluate(() => ParchLockMap.Save()); await p.waitForTimeout(300);
    await p.reload(); await p.waitForTimeout(2500); await settle();
    await send('y'); await p.waitForSelector('#dialog_select'); await p.locator('#dialog_select').selectOption({ label: /darkrt/ }).catch(async () => { const opts = await p.locator('#dialog_select option').allTextContents(); const i = opts.findIndex(o => /darkrt/.test(o)); await p.locator('#dialog_select').selectOption({ index: Math.max(0, i) }); }); await p.locator('#dialog_accept').click(); await p.waitForTimeout(3500); await settle();
    s = await state(); check(s.roomId === 50 && s.source === 'measured-fact' && s.ev === 'dark', 'game restore resumes in the dark measured section (' + JSON.stringify([s.roomId, s.source, s.ev]) + ')');
    const saved = await p.evaluate(() => { const r = ParchLockMap.Rooms.find(x => String(x.ObjectId) === '50'); return r && { name: r.Name, prov: r.NameProvenance || null }; });
    check(saved && saved.name === 'Darkness' && saved.prov === 'dark', 'reloaded map keeps the dark stamp before lighting (' + JSON.stringify(saved) + ')');
    await send('switch on bar');
    s = await state(); check(s.roomId === 50 && s.name === 'A vast, jagged icebox' && !s.prov, 'after the round trip the lit name upgrades once (' + JSON.stringify([s.name, s.prov]) + ')');
    // Codex #3131 negatives on the actual functions.
    const neg = await p.evaluate(() => {
        const out = {}, m = ZRamProvider.getMem();
        // (1) a real_location object whose child link points past the object table.
        const tbl = m.getUint16(0x0a) + 126, entry = id => tbl + (id - 1) * 14;
        const childAt = entry(50) + 10, orig = m.getUint16(childAt);
        m.setUint16(childAt, 9000); out.outOfTable = ZRamReader.measuredLocation(m); m.setUint16(childAt, orig);
        // (2) lit admit, later dark under the same name, later lit with another name: frozen.
        const real = WorldModel.lastPayload, id = 99999, mk = (name, ev, rid) => ({ roomId: rid || id, roomName: name, darkEvidence: ev, probe: { roomSource: 'player-containment', roomId: rid || id } });
        const p1 = mk('Original Room', 'lit'); WorldModel.lastPayload = p1; MapTopology.ensureRoom('Original Room', id, p1);
        const p2 = mk('Original Room', 'dark'); WorldModel.lastPayload = p2; MapTopology.ensureRoom('Original Room', id, p2);
        const p3 = mk('Different Room', 'lit'); WorldModel.lastPayload = p3; MapTopology.ensureRoom('Different Room', id, p3);
        const r = ParchLockMap.Rooms.find(x => String(x.ObjectId) === String(id)); out.relit = r && { name: r.Name, prov: r.NameProvenance || null };
        // (3) forged evidence (not the current payload) never stamps.
        const id2 = 99998, cur = mk('X', 'lit'); WorldModel.lastPayload = cur;
        const forged = mk('Darkness', 'dark', id2); MapTopology.ensureRoom('Darkness', id2, forged);
        const r2 = ParchLockMap.Rooms.find(x => String(x.ObjectId) === String(id2)); out.forged = r2 && (r2.NameProvenance || null);
        ParchLockMap.Rooms = ParchLockMap.Rooms.filter(x => x !== r && x !== r2); WorldModel.lastPayload = real;
        return out;
    });
    check(neg.outOfTable === null, 'real_location with a link outside the object table abstains (' + JSON.stringify(neg.outOfTable) + ')');
    check(neg.relit && neg.relit.name === 'Original Room' && !neg.relit.prov, 'lit-admitted room later dark then relit keeps its first name (' + JSON.stringify(neg.relit) + ')');
    check(neg.forged === null, 'forged (non-current) dark evidence never stamps (' + JSON.stringify(neg.forged) + ')');
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
