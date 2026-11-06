// grok1: build ledger/a-batch.json from Claude #5242 rulings and merge it into the cell ledger (only U/absent cells).
const fs = require('fs'), path = require('path'); const D = path.join(__dirname, '../..');
const S = require(path.join(D, '2026-10-11-zil-source-flags.json')); const T = n => Object.keys(S).find(t => t.startsWith(n));
const V = 'verify: grok1/ledger/verify-a-batch.txt'; const B = {}; const put = (t, k, s, r) => { (B[T(t)] = B[T(t)] || {})[k] = { s, r }; };
put('PlunderedHearts', 'switchable', 'X', 'FAIL CLOSED per Claude #5242 (grok #5223): LIGHTBIT 25 objects (torch 9, chandelier 59) are fixed and the native toggle is refused ("It already is."); bare turn off finds them via FIND LIGHTBIT only; no working switch semantics. ' + V);
put('Moonmist', 'door', 'X', 'FAIL CLOSED per Claude #5242 (grok #5218): DOORBIT 7 is on 39 objects, 34 of them ROOMS; front door 120 @23 read 1, tweed outfit 0; bit is not a door marker. ' + V);
put('PlunderedHearts', 'on', 'X', 'FAIL CLOSED per Claude #5242 (grok #5219): ONBIT 29 on 61 objects, 56 ROOMS (light family), 0 takeable. ' + V);
for (const t of ['Deadline', 'Infidel', 'Planetfall', 'Wishbringer', 'Stationfall']) put(t, 'on', 'X', 'FAIL CLOSED per Claude #5242 (grok #5214 A2, Hitchhiker precedent): ONBIT carriers are overwhelmingly ROOMS (lit-room family), not an on/off state. ' + V);
put('Enchanter', 'switchable', 'X', 'FAIL CLOSED per Claude #5242 (grok #5214 A3): LIGHTBIT 22 on 32 objects, 30 ROOMS. ' + V);
for (const t of ['Zork2', 'Enchanter', 'Infidel', 'LeatherGoddesses', 'TheLurkingHorror', 'Seastalker', 'Sorcerer', 'Suspect', 'Wishbringer']) put(t, 'scenery', 'X', 'FAIL CLOSED per Claude #5242 (grok #5216/#5217): NDESCBIT also sits on takeable objects (and is toggled at runtime), so it is not a static scenery marker. ' + V);
for (const t of ['Deadline', 'Seastalker', 'Spellbreaker', 'Enchanter', 'Zork1', 'Zork2', 'Sorcerer']) put(t, 'wornAttribute', 'NA', 'not applicable per Claude #5242 (grok #5214 A1, Witness #5207 precedent): no WORNBIT runtime worn state in source (WEARBIT, where present, is wearability only). ' + V);
fs.writeFileSync(path.join(__dirname, 'a-batch.json'), JSON.stringify(B, null, 2) + '\n');
if (process.argv[2] === '--merge') { const LP = path.join(D, '2026-10-11-zil-cell-ledger.json'), L = JSON.parse(fs.readFileSync(LP, 'utf8')); let n = 0;
  for (const t in B) for (const k in B[t]) { const cur = (L[t] || {})[k]; if (cur && cur.s !== 'U') { console.log('SKIP existing', t, k, cur.s); continue; } (L[t] = L[t] || {})[k] = B[t][k]; n++; }
  fs.writeFileSync(LP, JSON.stringify(L, null, 1) + '\n'); console.log('merged', n); }
