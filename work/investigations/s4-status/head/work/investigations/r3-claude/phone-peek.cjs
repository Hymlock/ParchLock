// Read-only peek at the phone app page state over CDP (claude, 2026-10-22).
const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9333'); const p = b.contexts()[0].pages()[0];
  console.log(JSON.stringify(await p.evaluate(() => ({ url: location.href, title: document.title, visible: document.visibilityState,
    line: document.querySelectorAll('.Input.LineInput').length, char: document.querySelectorAll('.Input.CharInput').length,
    splash: !!document.querySelector('.parchlock-splash__start'), msgOpen: (() => { try { return Message.IsOpen; } catch (e) { return 'n/a'; } })(),
    last: [...document.querySelectorAll('.BufferLine,.GridLine')].slice(-6).map(l => l.textContent.trim()).filter(Boolean),
    body: document.body.innerText.slice(0, 400) }))));
  await b.close();
})().catch(e => console.log('ERR ' + e.message));
