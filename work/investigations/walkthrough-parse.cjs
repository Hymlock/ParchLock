// Parse IF Archive stepwise solutions (work/investigations/walkthrough-src/, untrusted data) into command routes and merge
// them into 2026-10-15-zil-routes.json under the zil-walk keys (claude, 2026-10-17). Comments {...} and [...] are dropped,
// "(Nx)" repeats the previous command, separators are ':' (stationfall), '-' (lgop), '#N' (suspended), '.' (starcross).
//   node work/investigations/walkthrough-parse.cjs
const fs = require('fs'), path = require('path'), D = path.join(__dirname, 'walkthrough-src');
const clean = s => s.replace(/\{[^}]*\}/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').replace(/\s+/g, ' ').trim();
const expand = cmds => { const out = []; for (let c of cmds) { c = c.trim().toLowerCase(); if (!c) continue; const m = /^\((\d+)x\)$/.exec(c) || /^(.*?)\s*\((\d+)x\)$/.exec(c);
  if (m && m.length === 2) { for (let i = 1; i < +m[1]; i++) out.push(out[out.length - 1]); continue; }
  if (m && m.length === 3) { for (let i = 0; i < +m[2]; i++) out.push(m[1]); continue; }
  if (c.length > 60 || /^(save|restore|restart)/.test(c)) continue; out.push(c); } return out.filter(Boolean); };
const body = (f, startRe) => { const t = fs.readFileSync(path.join(D, f), 'utf8'); const i = startRe ? t.search(startRe) : 0; return clean(t.slice(i < 0 ? 0 : i)); };
const routes = {};
// Stationfall: ':' separated after the header.
routes.stationfall = expand(body('stationfall.step', /\n\s*[a-z][a-z ]*:/i).split(':'));
// LGOP: '-' separated; drop the header prose before the first command run.
routes.lgop = expand(body('lgop.step1', /\[male version\]/i).split('-'));
// Suspended: '#N COMMAND' items.
routes.suspended = expand((body('suspended.txt').match(/#\d+\s+[^#]+/g) || []).map(s => s.replace(/^#\d+\s+/, '')));
// Starcross: '.' separated lines after the dashed rule; the UM coordinates line needs the manual's table -> stop there.
const sc = fs.readFileSync(path.join(D, 'starcross.step1'), 'utf8'); const scBody = sc.slice(sc.indexOf('-----', sc.indexOf('Version')) + 1);
const scCmds = []; for (const line of scBody.split('\n')) { if (/\[RANGE\]/.test(line)) break; scCmds.push(...clean(line).split('.')); }
const gi = scCmds.findIndex(c => /^\s*get up\s*$/i.test(c)); routes.starcross = expand(gi >= 0 ? scCmds.slice(gi) : scCmds);
const f = path.join(__dirname, '2026-10-15-zil-routes.json'); const j = JSON.parse(fs.readFileSync(f, 'utf8'));
for (const k in routes) { j[k] = routes[k]; console.log(k, routes[k].length, JSON.stringify(routes[k].slice(0, 8))); }
fs.writeFileSync(f, JSON.stringify(j, null, 1));
