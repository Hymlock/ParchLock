// Pair calls; for each action-routine call: depth, parent, args, globals equal to action, span, callees, after-calls, text segments.
const fs = require('fs'), path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, process.argv[2] + '.trace.json')));
console.log('layout', JSON.stringify(d.info));
const [aft, rea] = d.info.layout ? d.info.layout.afterProps : [];
for (const o of d.out) {
  const st = [], fr = [];
  for (const e of o.ev) { if (e.k === 'E') { e.parent = st.length ? st[st.length - 1] : null; e.kids = []; if (e.parent) e.parent.kids.push(e); st.push(e); } else { const s = st.pop(); if (s) s.out = e.o; } }
  console.log('\n=== ' + o.cmd + ' textlen ' + o.text.length);
  for (const e of o.ev) if (e.k === 'E' && e.acts) {
    const par = e.parent;
    console.log(' act-routine 0x' + e.a.toString(16), 'acts', e.acts.join(','), 'depth', e.d, 'args', JSON.stringify(e.args), '[', e.o, e.out, ']', 'globals==act', JSON.stringify(e.g),
      'parent 0x' + (par ? par.a.toString(16) : '-') + ' pargs ' + JSON.stringify(par && par.args) + ' gp 0x' + (par && par.parent ? par.parent.a.toString(16) : '-'));
    const kids = e.kids.map(k => '0x' + k.a.toString(16) + JSON.stringify(k.args) + '[' + k.o + ',' + k.out + ']');
    console.log('   kids', kids.join(' '));
    // after-phase calls within
    const sub = []; (function walk(n) { for (const k of n.kids) { if (k.args.length >= 2 && (k.args[1] === aft || k.args[1] === rea) && k.args[0] >= 1 && k.args[0] <= d.info.layout.objMax) sub.push('0x' + k.a.toString(16) + JSON.stringify(k.args) + '@' + k.o + ' d' + k.d); walk(k); } })(e);
    console.log('   after-calls', sub.slice(0, 6).join(' '));
    console.log('   TEXT IN:', JSON.stringify(o.text.slice(e.o, e.out)));
  }
  console.log(' FULL:', JSON.stringify(o.text));
}
