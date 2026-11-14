import json, sys
# Stats acceptance by injected state (plan section 11 item 11; Grok #3558 C1). PROBE BUILDS ONLY, like mkinject.py.
# usage: mkstatus.py <case-index> <positive|negative> <out.js>   (prints the case count with "count")
# Each case enters one adventure, applies the state its own STATUS reads, types a real STATUS, and returns the
# game's printed STATUS beside the status card's values and the stat model rows (C2: no duplicate rows).
CASES = [
    {"name": "Alternate Beginner's Cave", "sel": 1, "branch": "magic dagger +5",
     "positive": [{"state": "MagicDaggerCounter", "value": 5}], "negative": [{"state": "MagicDaggerCounter", "value": 0}]},
    {"name": "The Beginner's Cave", "sel": 14, "branch": "Trollsfire alight",
     "positive": [{"artifact": 10, "to": "carried"}, {"state": "Trollsfire", "value": 1}],
     "negative": [{"state": "Trollsfire", "value": 1}]},
    {"name": "The Training Ground", "sel": 20, "branch": "speed spell",
     "positive": [{"state": "Speed", "value": 7}], "negative": [{"state": "Speed", "value": 0}]},
    {"name": "The Vile Grimoire of Jaldi'al", "sel": 21, "branch": "paralyzed and agility impaired",
     "positive": [{"stateKey": "ParalyzedTargets", "value": 3}, {"stateKey": "ClumsyTargets", "value": 3}],
     "negative": [{"stateKey": "ParalyzedTargets", "remove": True}, {"stateKey": "ClumsyTargets", "remove": True}]},
]
if sys.argv[1] == 'count':
    print(len(CASES)); sys.exit(0)
case = CASES[int(sys.argv[1])]
mode = sys.argv[2]
steps = ['#probe ' + json.dumps(op) for op in case[mode]] + ['status']
js = r'''(async () => {
  const vm = window.__PARCHLOCK_EAMON__, sleep = ms => new Promise(r => setTimeout(r, ms));
  const text = () => (document.querySelector('#windowport .BufferWindow') || {innerText: ''}).innerText.replace(/ /g, ' ');
  const tailLine = () => { const t = text().replace(/\s+$/, ''); return t.slice(t.lastIndexOf('\n') + 1); };
  const send = v => { const ch = document.querySelector('#windowport .Input.CharInput'); if (ch) jQuery('.Input.CharInput').trigger(jQuery.Event('keypress', {which: v.codePointAt(0)})); else { Input.Clear(); Input.Inject(v, true); } };
  const steps = __STEPS__; let i = 0, phase = 'hall', done = false; const log = [];
  for (let step = 0; step < 300 && !done; step++) {
    await sleep(700);
    try { if (Message.IsOpen) { log.push('DIALOG ' + (document.querySelector('#message') || {}).innerText.replace(/\s+/g, ' ').slice(0, 200)); Message.Hide(); } } catch (e) {}
    const tl = tailLine(); let v = null;
    if (/D for desk/.test(tl)) v = 'D';
    else if (/type it in now/.test(tl)) v = 'Parch Tester';
    else if (/Enter the selection/.test(tl)) v = phase === 'hall' ? '__SEL__' : 'X';
    else if (/\[X\]:$/.test(tl)) v = '1';
    else if (/introduction story/.test(tl)) v = 'N';
    else if (/\(G\/A\/N\)/.test(tl)) v = 'N';
    else if (/name your bow/i.test(tl)) v = 'Probe';
    else if (/\(Y\/N\)|Y for yes/.test(tl)) v = 'Y';
    else if (/Press any key/i.test(tl)) v = ' ';
    else if (/^Your choice: ?$/.test(tl.trim())) v = '3';
    else if (tl.trim() === '>') { phase = 'adventure'; if (i < steps.length) v = steps[i++]; else done = true; }
    if (v != null) { log.push(tl.slice(-30) + ' => ' + v.slice(0, 60)); send(v); }
  }
  await sleep(2500);
  const all = text(); let at = -1; for (const m of all.matchAll(/(^|\n)>\s*status\b/gi)) at = m.index;
  const model = (typeof StatTracker !== 'undefined' && StatTracker.model) ? StatTracker.model().stats : {};
  const rows = Object.keys(model).map(k => ({ key: k, label: model[k].label, value: model[k].value, max: model[k].max, source: model[k].source, confirmed: model[k].confirmed }));
  const ev = vm.state.saves || [];
  return { name: __NAME__, mode: __MODE__, branch: __BRANCH__, statusText: at < 0 ? null : all.slice(at, at + 2500),
    card: (vm.state.world || {}).status || null, rows, probe: ev.filter(e => /^probe-contract/.test(e)).map(e => e.slice(0, 200)), log: log.slice(-10) };
})()'''
js = js.replace('__STEPS__', json.dumps(steps)).replace('__SEL__', str(case['sel'])).replace('__NAME__', json.dumps(case['name'])) \
    .replace('__MODE__', json.dumps(mode)).replace('__BRANCH__', json.dumps(case['branch']))
open(sys.argv[3], 'w').write(js)
print('ok', case['name'], mode, len(steps))
