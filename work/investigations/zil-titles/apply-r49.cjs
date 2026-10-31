// r49 (claude): Sherlock grok-lane packets (INDEX-sherlock-grok-lane.md sha 42ba8316). Four-seat ACCEPT: grok author,
// grok2 VOTES-grok2.md, claude VOTES-claude.md, codex codex-sherlock-votes-0837.md (#5999). Seeded native-command tier disclosed.
const fs = require('fs'), f = process.env.R49_FACTS || 'js/ModuleStatFactsClaude.js';
let s = fs.readFileSync(f, 'latin1');
const d = 'ba9c2c81d6b55eb9fc7de43a2e439fc65304231cbb834c208005cd9460f44ff0';
const i = s.indexOf('    "' + d + '": {'); if (i < 0) throw new Error('no Sherlock row');
const end = s.indexOf('\n    },', i); let row = s.slice(i, end);
const add = { animate: 40, talkable: 47, supporter: 16, door: 8, locked: 15, openable: 44, enterable: 1, transparent: 2 };
const m = row.match(/"attributeMap": \{([^}]*)\}/); if (!m) throw new Error('no attributeMap');
const cur = JSON.parse('{' + m[1] + '}');
if (cur.container !== 9 || cur.open !== 5 || cur.isOpen !== 5) throw new Error('expected container 9/open 5 present');
for (const [k, b] of Object.entries(add)) {
  if (cur[k] != null) throw new Error('has ' + k);
  const owners = Object.keys(cur).filter(x => cur[x] === b);
  if (owners.length && !(k === 'talkable' && false)) throw new Error('collision ' + k + ' ' + owners);
}
const body = m[1].replace(/\s*$/, '') + Object.entries(add).map(([k, b]) => ', "' + k + '": ' + b).join('') + ' ';
const note = '        // r49 grok-lane Sherlock (four-seat): animate 40 = FL-ALIVE (animals too; V-LISTEN/V-LOOK-INSIDE discriminate), talkable 47 = FL-PERSON,\n' +
  '        // supporter 16 FL-SURFACE, door 8 FL-DOOR, locked 15 FL-LOCKED (box 137, front door 35, bedroom door 104; no rooms), openable 44,\n' +
  '        // enterable 1 FL-VEHICLE, transparent 2 FL-TRANSPARENT (phial 128 + wax pool 179). Packets: grok-lane-1031/PACKET-sherlock-*.md.\n';
row = row.replace(/\n(\s*)"attributeMap": \{[^}]*\}/, '\n' + note + '$1"attributeMap": {' + body + '}');
s = s.slice(0, i) + row + s.slice(end);
fs.writeFileSync(f, s, 'latin1'); console.log('Sherlock r49 added', Object.keys(add).join(','));
