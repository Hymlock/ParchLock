// usage: node cdp-eval.cjs "<expr>"  (awaits promises)
const expr = process.argv[2];
(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const ws = new WebSocket(list.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) pend[d.id](d); else if (d.method === 'Runtime.consoleAPICalled') console.log('[console]', d.params.args.map(a => a.value ?? a.description).join(' ')); };
  const send = (method, params) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
  if (process.env.CONSOLE) await send('Runtime.enable', {});
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true, timeout: 20000 });
  console.log(JSON.stringify(r.result.result ? (r.result.result.value ?? r.result.result.description) : r.result, null, 1));
  if (r.result.exceptionDetails) console.log('EXC', JSON.stringify(r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description));
  if (process.env.WAIT) await new Promise(r => setTimeout(r, +process.env.WAIT));
  ws.close();
})();
