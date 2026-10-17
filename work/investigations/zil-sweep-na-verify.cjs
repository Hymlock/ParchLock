// Verify sweep "not applicable" U cells (claude, 2026-10-17). SOLID = the sweep searched the whole source/object table;
// WEAK = only "0 candidates natively" (stays U); otherwise the reason is "no exact <BIT> in source", which is re-checked
// against historicalsource: CARRIERS = some (FLAGS ...) line carries the bit (stays U, sweep gap), ABSENT = no carrier
// object anywhere in source (UD candidate). Rewrites 2026-10-17-zil-sweep-na.json with a verdict per cell.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const CACHE = path.join(require('os').tmpdir(), 'hs-src'), F = path.join(__dirname, '2026-10-17-zil-sweep-na.json');
const REPO = { Ballyhoo: 'ballyhoo', Borderzo: 'borderzone', Cutthroats: 'cutthroats', Deadline: 'deadline', Enchanter: 'enchanter',
  HollywoodHijinx: 'hollywoodhijinx', Infidel: 'infidel', LeatherGoddessesofPhobos: 'leathergoddesses', Moonmist: 'moonmist',
  Planetfall: 'planetfall', PlunderedHearts: 'plunderedhearts', Seastalker: 'seastalker', Sherlock: 'sherlock', Sorcerer: 'sorcerer',
  Spellbreaker: 'spellbreaker', Starcross: 'starcross', Stationfall: 'stationfall', Suspect: 'suspect', Suspended: 'suspended',
  Hitchhik: 'hitchhikersguide', TheLurkingHorror: 'lurkinghorror', TheWitness: 'witness', Wishbringer: 'wishbringer',
  'Zork1-TheGreatUndergroundEmpire': 'zork1', 'Zork2-TheWizardofFrobozz': 'zork2', 'Zork3-TheDungeonMaster': 'zork3' };
const FL = { consumed: ['FOODBIT', 'DRINKBIT'], actors: ['ACTORBIT', 'PERSONBIT', 'PERSON'], wornItems: ['WEARBIT'], nested: ['CONTBIT'], onoff: ['ONBIT', 'LIGHTBIT'] };
const zil = repo => {
  const dir = path.join(CACHE, repo);
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dir + '.tgz', execSync('gh api repos/historicalsource/' + repo + '/tarball', { maxBuffer: 1 << 28 }));
    execSync('tar -xzf ' + repo + '.tgz -C ' + repo, { cwd: CACHE, stdio: 'ignore' });
  }
  const o = []; const w = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) w(p); else if (/\.zil$/i.test(e.name)) o.push(p); }); w(dir); return o;
};
const res = JSON.parse(fs.readFileSync(F, 'utf8')).map(x => {
  let v;
  if (/share a head noun|whole object table|no source container/.test(x.reason)) v = 'SOLID';
  else if (/natively \(\d+ candidates\)/.test(x.reason)) v = 'WEAK';
  else {
    let hits = 0;
    for (const f of zil(REPO[x.title])) { const t = fs.readFileSync(f, 'latin1'); for (const b of FL[x.key]) hits += (t.match(new RegExp('\\(FLAGS[^)]*\\b' + b + '\\b', 'g')) || []).length; }
    v = hits ? 'CARRIERS:' + hits : 'ABSENT';
  }
  return Object.assign({}, x, { verdict: v });
});
fs.writeFileSync(F, JSON.stringify(res, null, 1));
const c = {}; res.forEach(r => { const k = r.verdict.replace(/:\d+/, ''); c[k] = (c[k] || 0) + 1; }); console.log(JSON.stringify(c));
res.filter(r => /CARRIERS/.test(r.verdict)).forEach(r => console.log('  ' + r.title + ' ' + r.key + ' ' + r.verdict));
