// r48 (claude): Sherlock wearable 11 (FL-CLOTHING) + wornAttribute 34 (FL-WORN). Four-seat ACCEPT:
// grok author (PACKET-sherlock-wear-worn.md sha b4fa8fa4), grok2 #5960/#5968, codex codex-votes-0231.md (wearable R2) +
// sherlock-native-packet-review-r1.md (worn 34), claude CLAUDE-VOTES-0201.md. Requires D198 (0d1390ac).
const fs = require('fs'), f = process.env.R48_FACTS || 'js/ModuleStatFactsClaude.js';
let s = fs.readFileSync(f, 'latin1');
const d = 'ba9c2c81d6b55eb9fc7de43a2e439fc65304231cbb834c208005cd9460f44ff0';
const i = s.indexOf('    "' + d + '": {'); if (i < 0) throw new Error('no Sherlock row');
const end = s.indexOf('\n    },', i); let row = s.slice(i, end);
if (/"wearable"|"wornAttribute"/.test(row)) throw new Error('already mapped');
const am = row.match(/"attributeMap": \{([^}]*)\}/); if (!am) throw new Error('no attributeMap');
if (/:\s*(11|34)\b/.test(am[1])) throw new Error('bit collision');
row = row.replace(/(\n(\s*)"attributeMap": \{)([^}]*)\}/, (m, head, ind, body) =>
  '\n' + ind + '// wearable 11 = FL-CLOTHING: census+behaviour tier (8 static carriers, 0 setters; WEAR WHISTLE 173 reads 11 TRUE, WEAR KNIFE 151 reads 11 FALSE); V-WEAR refuses non-FL-CLOTHING.' +
  head + body.replace(/\s*$/, '') + ', "wearable": 11 }');
row = row.replace(/\s*$/, '') + ',\n        // wornAttribute 34 = FL-WORN (dynamic state): native set/clear on hat 188 and whistle 173; knife stays clear. REMOVE/TAKE OFF syntax FINDs FL-WORN.\n        "wornAttribute": 34';
s = s.slice(0, i) + row + s.slice(end);
fs.writeFileSync(f, s, 'latin1'); console.log('Sherlock wearable 11 + wornAttribute 34');
