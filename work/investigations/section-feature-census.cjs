// Operator 2026-10-10: find other games with Wumpus's feature. For every non-Glulx game:
// compiled numbered-room index (C_ROOMS_<n>-style, ZRamReader.compiledRoomIndex), plus
// "section of" wording in the opening text. Read-only.
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
const games = fs.readdirSync('games').filter(f => f.endsWith('.js') && !/\.(ulx|gblorb)\.js$/i.test(f)).sort();
(async () => { const b = await chromium.launch();
for (const g of games) { const p = await b.newPage(); let row = { game: g };
  try { await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2000);
    row = Object.assign(row, await p.evaluate(() => { try { const m = ZRamProvider.getMem(); const idx = ZRamReader.compiledRoomIndex(m); const n = ZRamReader.objectCount(m, ZRamReader.header(m)); let numbered = 0; for (let i = 1; i <= n; i++) if (/^[a-z_]*rooms?[_ ]?\d+$/i.test(ZRamReader.shortName(m, i) || '')) numbered++; return { indexCount: idx ? idx.count : 0, numberedNames: numbered, section: /section of (room|the)/i.test(document.body.innerText) }; } catch (e) { return { err: String(e.message).slice(0, 80) }; } }));
  } catch (e) { row.err = String(e.message).slice(0, 80); }
  if (row.indexCount || row.numberedNames || row.section || row.err) console.log(JSON.stringify(row));
  await p.close(); }
console.log('DONE ' + games.length); await b.close(); })();
