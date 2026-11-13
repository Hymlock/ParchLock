import json, sys
# usage: mkdrive.py <plan.json> <selection> <out.js>
# Plays a planned route like a careful player: answers the Hall's questions, walks the plan, repeats a move after a
# dark-room bump, fights any visible enemy first, saves every few steps, and on death restores the last save and
# resumes the plan from there. Reports the lifecycle events (adventure-ended carries the clear and credit decision).
plan = json.load(open(sys.argv[1]))
selection = sys.argv[2]
js = r'''(async () => {
  const vm = window.__PARCHLOCK_EAMON__, sleep = ms => new Promise(r => setTimeout(r, ms));
  const text = () => (document.querySelector('#windowport .BufferWindow') || {innerText: ''}).innerText.replace(/ /g, ' ');
  const tailLine = () => { const t = text().replace(/\s+$/, ''); return t.slice(t.lastIndexOf('\n') + 1); };
  const send = v => { const ch = document.querySelector('#windowport .Input.CharInput'); if (ch) jQuery('.Input.CharInput').trigger(jQuery.Event('keypress', {which: v.codePointAt(0)})); else { Input.Clear(); Input.Inject(v, true); } };
  const enemies = () => ((vm.state.world || {}).objects || []).filter(o => o.kind === 'monster' && o.reaction === 'Enemy');
  const plan = PLAN; const log = []; let i = 0, retries = 0, phase = 'hall', finished = false, savedAt = 0, sinceSave = 0, deaths = 0, saving = false, fights = 0;
  for (let step = 0; step < 900 && !finished; step++) {
    await sleep(700);
    try { if (Message.IsOpen) { log.push('DIALOG ' + (document.querySelector('#message') || {}).innerText.replace(/\s+/g, ' ').slice(0, 300)); Message.Hide(); } } catch (e) {}
    const tl = tailLine(); let v = null;
    if (/D for desk/.test(tl)) v = 'D';
    else if (/type it in now/.test(tl)) v = 'Parch Tester';
    else if (/Enter the selection/.test(tl)) v = phase === 'hall' ? 'SELECTION' : 'X';
    else if (/\[X\]:$/.test(tl)) { if (phase === 'done') { finished = true; break; } v = '1'; }
    else if (/introduction story/.test(tl)) v = 'N';
    else if (/^Your choice: ?$/.test(tl.trim()) && /You have perished/.test(text().slice(-600))) { deaths++; v = deaths <= 6 && savedAt > 0 ? '1' : '3'; i = savedAt; log.push('DEATH ' + deaths + ', back to step ' + savedAt); }
    else if (/Your choice \(1-6\)/.test(tl)) v = '1';
    else if (/Enter new name/.test(tl)) v = 'Probe';
    else if (/Enter 1-\d.*restore|saved position|saved game/.test(tl)) v = '1';
    else if (/Leave this adventure|\(Y\/N\)|Y for yes/.test(tl)) v = 'Y';
    else if (/Press any key/i.test(tl)) v = ' ';
    else if (tl.trim() === '>') {
      phase = phase === 'done' ? 'done' : 'adventure';
      const t = text(); const last = t.lastIndexOf('> '); const prev = t.lastIndexOf('> ', last - 1); const turnText = t.slice(prev, last);
      const foes = enemies();
      if (phase === 'done') v = 'n';
      else if (foes.length && fights < 60) { const n = String(foes[0].name).split(' ').pop(); v = 'attack ' + n; fights++; }
      else if (i > 0 && /bumped into an obstacle|unfriendlies about/.test(turnText) && retries < 12 && /^(n|s|e|w|u|d|ne|nw|se|sw)$/.test(plan[i - 1])) { v = plan[i - 1]; retries++; }
      else if (sinceSave >= 5 && !saving) { v = 'save'; saving = true; savedAt = i; sinceSave = 0; }
      else if (i < plan.length) { v = plan[i++]; retries = 0; sinceSave++; saving = false; }
      else { v = 'n'; phase = 'done'; }
    }
    if (v != null) { log.push(tl.slice(-36) + ' => ' + v); send(v); }
  }
  await sleep(2500);
  try { if (Message.IsOpen) log.push('DIALOG ' + (document.querySelector('#message') || {}).innerText.replace(/\s+/g, ' ').slice(0, 400)); } catch (e) {}
  return { stepsDone: i, planLength: plan.length, deaths, fights, events: (vm.state.saves || []).slice(-6), log: log.slice(-45), tail: text().slice(-900) };
})()'''.replace('PLAN', json.dumps(plan)).replace('SELECTION', selection)
open(sys.argv[3], 'w').write(js)
print('ok')
