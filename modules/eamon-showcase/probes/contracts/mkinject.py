import json, sys
# usage: mkinject.py <spec-index> <positive|negative> <out.js>
specs = json.load(open('inject-specs.json'))
spec = specs[int(sys.argv[1])]
mode = sys.argv[2]
ops = spec['ops']
if mode == 'positive':
    use = [ops[i] for i in spec.get('positiveOps', range(len(ops)))]
else:
    if 'negativeKeep' in spec: use = [ops[i] for i in spec['negativeKeep']]
    else: use = [op for i, op in enumerate(ops) if i != spec['negativeDrop']]
ex = spec['negativeExit'] if (mode == 'negative' and 'negativeExit' in spec) else spec['exit']
moves = ex[1] if isinstance(ex[1], list) else [ex[1]]
steps = spec.get('pre', []) + ['#probe {"report":true}'] + ['#probe ' + json.dumps(op) for op in use] + (['#probe ' + json.dumps({"state": "Ro", "value": ex[0]})] if ex[0] is not None else []) + ['#probe {"report":true}'] + moves
js = r'''(async () => {
  const vm = window.__PARCHLOCK_EAMON__, sleep = ms => new Promise(r => setTimeout(r, ms));
  const text = () => (document.querySelector('#windowport .BufferWindow') || {innerText: ''}).innerText.replace(/ /g, ' ');
  const tailLine = () => { const t = text().replace(/\s+$/, ''); return t.slice(t.lastIndexOf('\n') + 1); };
  const send = v => { const ch = document.querySelector('#windowport .Input.CharInput'); if (ch) jQuery('.Input.CharInput').trigger(jQuery.Event('keypress', {which: v.codePointAt(0)})); else { Input.Clear(); Input.Inject(v, true); } };
  const steps = STEPS; let i = 0, phase = 'hall', finished = false; const log = [];
  for (let step = 0; step < 300 && !finished; step++) {
    await sleep(700);
    try { if (Message.IsOpen) { log.push('DIALOG ' + (document.querySelector('#message') || {}).innerText.replace(/\s+/g, ' ').slice(0, 200)); Message.Hide(); } } catch (e) {}
    const tl = tailLine(); let v = null;
    if (/D for desk/.test(tl)) v = 'D';
    else if (/type it in now/.test(tl)) v = 'Parch Tester';
    else if (/Enter the selection/.test(tl)) v = phase === 'hall' ? 'SEL' : 'X';
    else if (/\[X\]:$/.test(tl)) { if (phase !== 'hall') { finished = true; break; } v = '1'; }
    else if (/introduction story/.test(tl)) v = 'N';
    else if (/\(G\/A\/N\)/.test(tl)) v = 'N';
    else if (/name your bow/i.test(tl)) v = 'Probe';
    else if (/Leave this adventure|\(Y\/N\)|Y for yes/.test(tl)) v = 'Y';
    else if (/Press any key/i.test(tl)) v = ' ';
    else if (/^Your choice: ?$/.test(tl.trim())) v = '3';
    else if (tl.trim() === '>') { phase = 'adventure'; if (i < steps.length) v = steps[i++]; else { v = 'look'; i++; if (i > steps.length + 3) finished = true; } }
    if (v != null) { log.push(tl.slice(-30) + ' => ' + v.slice(0, 60)); send(v); }
  }
  await sleep(2000);
  const ev = vm.state.saves || [];
  return { name: NAME, mode: MODE, probe: ev.filter(e => /^probe-contract|^contract-check/.test(e)).map(e => e.slice(0, 260)), ended: ev.filter(e => /^adventure-ended/.test(e)), log: log.slice(-14) };
})()'''.replace('STEPS', json.dumps(steps)).replace('SEL', str(spec['sel'])).replace('NAME', json.dumps(spec['name'])).replace('MODE', json.dumps(mode))
open(sys.argv[3], 'w').write(js)
print('ok', spec['name'], mode, len(steps))
