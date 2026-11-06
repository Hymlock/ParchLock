// Parse IF Archive stepwise solutions (work/investigations/walkthrough-src/, untrusted data) into command routes and merge
// them into 2026-10-15-zil-routes.json under the zil-walk keys (claude, 2026-10-17). Comments {...} and [...] are dropped,
// "(Nx)" repeats the previous command, separators are ':' (stationfall), '-' (lgop), '#N' (suspended), '.' (starcross).
//   node work/investigations/walkthrough-parse.cjs
const fs = require('fs'), path = require('path'), D = path.join(__dirname, 'walkthrough-src');
const clean = s => s.replace(/\{[^}]*\}/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').replace(/\s+/g, ' ').trim();
const expand = cmds => { const out = []; for (let c of cmds) { c = c.trim().toLowerCase(); if (!c) continue; const m = /^\((\d+)x\)$/.exec(c) || /^(.*?)\s*\((\d+)x\)$/.exec(c);
  if (m && m.length === 2) { for (let i = 1; i < +m[1]; i++) out.push(out[out.length - 1]); continue; }
  if (m && m.length === 3) { for (let i = 0; i < +m[2]; i++) out.push(m[1]); continue; }
  if ((c.length > 60 && !/until@/.test(c)) || /^(save|restore|restart)/.test(c)) continue; out.push(c); } return out.filter(Boolean); };
// "again [until it reads: '...']" -> repeat the previous command until that text appears (zil-walk DOUNTIL).
const untilRx = s => s.replace(/\.\.\.,?/g, ' ').trim().split(/[.!?](\s|$)/)[0] /* first sentence: releases differ after it */.replace(/[.*+?^${}()|[\]\\!]/g, '').replace(/\s+/g, '\\s+');
// "{eat when necessary: open kit: eat orange goo}" is an instruction, not a comment: keep the commands after the colon.
const untils = t => t.replace(/\{[^}:]*when necessary:\s*([^}]*)\}/gi, '$1').replace(/again\s*\[until it reads:\s*'([\s\S]*?)'\]/gi, (m, x) => 'again UNTIL@' + Buffer.from(untilRx(x)).toString('hex') + ' ');
const resolveUntil = cmds => cmds.map((c, i) => { const m = /^again until@([0-9a-f]+)$/.exec(c); return m ? 'DOUNTIL:' + cmds[i - 1] + '|' + Buffer.from(m[1], 'hex').toString() : c; });
const body = (f, startRe) => { const t = untils(fs.readFileSync(path.join(D, f), 'utf8')); const i = startRe ? t.search(startRe) : 0; return clean(t.slice(i < 0 ? 0 : i)); };
const routes = {};
// Stationfall: ':' separated after the header.
// "type xxx {course for the watch time}" -> zil-walk SFCOURSE (computed from the game's own SPACETRUCK-TYPE formula).
routes.stationfall = expand(body('stationfall.step', /\n\s*[a-z][a-z ]*:/i).split(':')).map(c => c === 'type xxx' ? 'SFCOURSE' : c);
// "wait {until you're docked}": wait until the ship.zil docking text appears.
{ const i = routes.stationfall.indexOf('SFCOURSE'); if (i >= 0 && routes.stationfall[i + 1] === 'wait') routes.stationfall[i + 1] = 'WAITUNTIL:Stationfall\\.|no space station'; }
// LGOP: '-' separated; drop the header prose before the first command run.
// 'look' absorbs the intro More prompt; each scratch 'n' sniff "smell" waits for RETURN, answered by an empty NP: line.
// "drop sack,rake,trellis" fails whole if one item is not held ("You're not holding all those things!"); split it.
const splitList = c => { const m = /^(drop|take|get)\s+(.+,.+)$/.exec(c); return m ? m[2].split(/\s*,\s*/).map(x => m[1] + ' ' + x) : [c]; };
routes.lgop = ['look'].concat(...[].concat(...resolveUntil(expand(body('lgop.step1', /\[male version\]/i).split('-'))).map(splitList)).map(c => /^smell\b/.test(c) ? [c, 'NP:'] : [c]));
// Suspended: '#N COMMAND' items.
routes.suspended = expand((body('suspended.txt').match(/#\d+\s+[^#]+/g) || []).map(s => s.replace(/^#\d+\s+/, '')));
// Starcross: '.' separated lines after the dashed rule. The "[RANGE] [THETA] [PHI]" line (manual table) becomes zil-walk
// SCUM, which reads the UM code on screen and types its coordinates from the game's own MASS-LOCS table.
const sc = fs.readFileSync(path.join(D, 'starcross.step1'), 'utf8'); const scBody = sc.slice(sc.indexOf('-----', sc.indexOf('Version')) + 1);
const scCmds = []; for (const line of scBody.split('\n')) { if (/Emacs Local/.test(line)) break; if (/\[RANGE\]/.test(line)) { scCmds.push('scum', ...clean(line.slice(line.indexOf('[PHI]') + 5)).split('.')); continue; } scCmds.push(...clean(line).split('.')); }
const gi = scCmds.findIndex(c => /^\s*get up\s*$/i.test(c)); routes.starcross = expand(gi >= 0 ? scCmds.slice(gi) : scCmds).map(c => c === 'scum' ? 'SCUM' : c)
  .map((c, i, a) => c === 'confirm' && a[i - 1] === 'SCUM' ? 'computer, confirm' : c); // V-YES is the computer's (actions.zil)
const f = path.join(__dirname, '2026-10-15-zil-routes.json'); const j = JSON.parse(fs.readFileSync(f, 'utf8'));
for (const k in routes) { j[k] = routes[k]; console.log(k, routes[k].length, JSON.stringify(routes[k].slice(0, 8))); }
fs.writeFileSync(f, JSON.stringify(j, null, 1));
