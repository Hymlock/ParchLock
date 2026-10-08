// Export naming (#1746): every download says what it is.
//   node harness/export-filenames.js
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/TreasuresofaSlaversKingdom.z8.js'); await p.waitForTimeout(5000);
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });

  // Name table.
  const t = await p.evaluate(() => {
    const n = (k, l, e) => ParchLockQol.ExportFilename(k, l, e);
    return {
      one: n('Save', '1', 'json'), two: n('Save', '2', 'json'),
      pkg: n('Save package', undefined, 'json'),
      punct: n('Save', 'Before the "big" fight: a/b?', 'json'),
      emoji: n('Save', 'Café 🐉 run', 'json'),
      forbidden: n('Save', '<>:"/\\|?*', 'json'),
      reserved: n('Save', 'CON', 'json'),
      long: n('Save', 'x'.repeat(300), 'json'),
      dupA: n('Map', 'same', 'json'), dupB: n('Map', 'same', 'json')
    };
  });
  const pat = /^Treasures of a Slaver.s Kingdom.* - Save - 1 - \d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}-\d{3}\.json$/;
  ok(pat.test(t.one), 'readable format with the story title, kind, the player\'s save name and local time: ' + t.one);
  ok(t.one !== t.two && / - Save - 2 - /.test(t.two), 'saves named 1 and 2 give clearly different files');
  ok(/ - Save package - \d{4}-/.test(t.pkg), 'no label when there is none: ' + t.pkg);
  ok(/Before the -big- fight- a-b-/.test(t.punct), 'forbidden characters replaced, the rest kept: ' + t.punct);
  ok(/Café 🐉 run/.test(t.emoji), 'accents and emoji kept verbatim: ' + t.emoji);
  ok(/ - Save - unnamed save - /.test(t.forbidden), 'an all-forbidden name becomes "unnamed save": ' + t.forbidden);
  ok(/ - Save - _CON - /.test(t.reserved), 'reserved device names are made safe: ' + t.reserved);
  ok(Array.from(t.long).length <= 160 && /\.json$/.test(t.long), 'very long names are capped and keep the extension (' + Array.from(t.long).length + ' chars)');
  ok(t.dupA !== t.dupB, 'two exports with the same name in the same moment never collide: ' + t.dupB.slice(-30));
  ok(!/[\\/:*?"<>|]/.test(Object.values(t).join('')), 'no forbidden filesystem characters anywhere');

  // Real download routes.
  const grab = async (fn, arg) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.evaluate(fn, arg)]); return d.suggestedFilename(); };
  const tx = await grab(() => { Transcript.currentSaveLabel = 'gravel pit'; ParchLockQol.ShowTranscriptText('hello'); document.getElementById('download-transcript').click(); });
  ok(/ - Transcript - gravel pit - \d{4}-.*\.txt$/.test(tx), 'transcript download carries the loaded save name: ' + tx);
  await p.evaluate(() => { Message.Hide(); Transcript.currentSaveLabel = null; });
  const map = await grab(() => ParchLockMap.ExportMap());
  ok(/ - Map( \(text\))? - \d{4}-/.test(map), 'map download is named for the story and kind: ' + map);
  // #1752 repairs.
  const r = await p.evaluate(() => ({
    bang: ParchLockQol.ExportFilename('Save', '!!!', 'json'),
    spaces: ParchLockQol.ExportFilename('Save', 'a  b', 'json'),
    huge: ParchLockQol.ExportFilename('Save package with a very long kind name', 'L'.repeat(200), 'json')
  }));
  ok(/ - Save - !!! - /.test(r.bang), 'punctuation-only names the player typed are kept: ' + r.bang);
  ok(/ - Save - a  b - /.test(r.spaces), 'internal spacing is kept as typed');
  ok(Array.from(r.huge).length <= 150 && /\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}-\d{3}\.json$/.test(r.huge), 'over-long names keep the full timestamp and extension within 150 (' + Array.from(r.huge).length + ')');
  // The native dialog's generic "data" link: kind from the file's own bytes.
  const native = async (b64, label) => grab((args) => {
    const dlg = document.createElement('div'); dlg.id = 'dialog'; dlg.textContent = 'Use "Save As" option in your browser to download this link. ';
    const a = document.createElement('a'); a.href = 'data:application/octet-stream;base64,' + args[0]; a.download = 'data'; a.textContent = args[1];
    dlg.appendChild(a); document.body.appendChild(dlg); a.click(); window.__nativeLink = a; setTimeout(() => dlg.remove(), 2000);
  }, [b64, label]);
  const quetzal = Buffer.from([0x46, 0x4f, 0x52, 0x4d, 0, 0, 0, 16, 0x49, 0x46, 0x5a, 0x53, 0x78, 0x78, 0x78, 0x78]).toString('base64');   // 'FORM' len 'IFZS'
  const nat = await native(quetzal, 'my save 3');
  ok(/ - Save file - my save 3 - \d{4}-.*\.glksave$/.test(nat), 'a Quetzal save from the native dialog is named as a save: ' + nat);
  const again = await grab(() => window.__nativeLink.click());
  ok(again !== nat, 'clicking the same native link again gives a fresh name: ' + again.slice(-30));
  await p.waitForTimeout(2100);
  const data = await native(Buffer.from('ABCDEFGH').toString('base64'), 'settings');
  ok(/ - Data file - settings - \d{4}-.*\.glkdata$/.test(data), 'a data file is named as data even though the dialog says "Save As": ' + data);
  await b.close();
  console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
