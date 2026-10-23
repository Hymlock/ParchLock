// On-device check of build 74 (claude, 2026-10-22). Drives the installed app's WebView over CDP (adb forward
// tcp:9333 localabstract:webview_devtools_remote_<pid>); no insert_obj, no forced state: typed commands only.
//   node phone-check.cjs <story.js> "<cmd|cmd|...>" "<name,name>" [startKey]
// Prints, after each command: last reply lines, the app's offered commands for matching objects (resolveObjectCommands),
// their model attrs (on/worn/edible) and the Equipment tags.
const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async () => {
  const [story, cmds, names, startKey] = process.argv.slice(2);
  const b = await chromium.connectOverCDP('http://127.0.0.1:9333'); const ctx = b.contexts()[0]; const p = ctx.pages()[0];
  await p.goto('https://localhost/play.html?story=games/' + story); await p.waitForTimeout(5000);
  const ready = async () => { for (let i = 0; i < 40; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { if (Message.IsOpen) Message.Hide(); } catch (e) {} });
    if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press(startKey && i < 3 ? startKey : ' '); }
    await p.waitForTimeout(500); } return false; };
  if (!await ready()) { console.log('NO PROMPT'); process.exit(1); }
  const re = names ? new RegExp(names.split(',').join('|'), 'i') : null;
  for (const c of cmds.split('|').filter(Boolean)) {
    await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1200); await ready();
    const r = await p.evaluate((src) => { WorldModel.tick(); const re = src ? new RegExp(src, 'i') : null;
      const lines = [...document.querySelectorAll('.BufferLine')].slice(-4).map(l => l.textContent.trim()).filter(Boolean).join(' / ');
      const objs = re ? (Actionable.payloadPool() || []).filter(o => re.test(o.name || '')).map(o => { let cm = []; try { cm = Actionable.resolveObjectCommands(o.id, 'object').map(x => x.command); } catch (e) { cm = ['ERR ' + e.message]; }
        let tags = []; try { tags = (EquipmentUI.stateTags ? EquipmentUI.stateTags(o) : []).concat(EquipmentUI.activationStateTags(o)); } catch (e) {}
        const a = o.attrs || {}; return o.id + ':' + o.name + ' {on:' + a.on + ',worn:' + a.worn + ',edible:' + a.edible + '} tags[' + tags + '] -> ' + cm.join(' | '); }) : [];
      return { lines, objs }; }, re && re.source);
    console.log('> ' + c + '\n  ' + r.lines.slice(0, 220)); r.objs.forEach(o => console.log('   ' + o));
  }
  await b.close();
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
