// Flag-absence evidence for ledger UD cells (claude, 2026-10-17). For each U flag cell whose title has no matching bit in
// 2026-10-11-zil-source-flags.json, download that title's historicalsource repo (gh tarball) and grep EVERY .zil file for
// every flag name of the key. ABSENT = no definition or use anywhere in source (UD candidate, rule 6 citation);
// PRESENT = the parser missed it (stays U, evidence needed). Writes 2026-10-17-zil-flag-absence.json.
//   node work/investigations/zil-flag-absence.cjs
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const D = __dirname, CACHE = path.join(require('os').tmpdir(), 'hs-src');
const src = require('./2026-10-11-zil-source-flags.json');
const REPO = { Ballyhoo: 'ballyhoo', Borderzo: 'borderzone', Cutthroats: 'cutthroats', Deadline: 'deadline', Enchanter: 'enchanter',
  HollywoodHijinx: 'hollywoodhijinx', Infidel: 'infidel', LeatherGoddessesofPhobos: 'leathergoddesses', Moonmist: 'moonmist',
  Planetfall: 'planetfall', PlunderedHearts: 'plunderedhearts', Seastalker: 'seastalker', Sherlock: 'sherlock', Sorcerer: 'sorcerer',
  Spellbreaker: 'spellbreaker', Starcross: 'starcross', Stationfall: 'stationfall', Suspect: 'suspect', Suspended: 'suspended',
  Hitchhik: 'hitchhikersguide', TheLurkingHorror: 'lurkinghorror', TheWitness: 'witness', Wishbringer: 'wishbringer',
  'Zork1-TheGreatUndergroundEmpire': 'zork1', 'Zork2-TheWizardofFrobozz': 'zork2', 'Zork3-TheDungeonMaster': 'zork3' };
const KF = { lightSource: ['LIGHTBIT', 'ONBIT'], on: ['ONBIT'], wearable: ['WEARBIT'], worn: ['WORNBIT'], edible: ['FOODBIT', 'DRINKBIT'],
  animate: ['ACTORBIT', 'PERSON', 'PERSONBIT'], container: ['CONTBIT'], open: ['OPENBIT'], supporter: ['SURFACEBIT'] };
const L = fs.readFileSync(path.join(D, '2026-10-11-zil-matrix.md'), 'utf8').split('\n');
const i0 = L.findIndex(l => /^\| Ballyhoo \| F/.test(l)), H = L[i0 - 2].split('|').map(s => s.trim()).filter(Boolean);
const cells = [];
for (let k = i0; k < L.length && L[k].startsWith('|'); k++) {
  const c = L[k].split('|').map(s => s.trim()).filter(Boolean), g = Object.keys(src).find(x => x.startsWith(c[0] + '.'));
  const fl = g ? (src[g].flags || {}) : {};
  c.slice(1).forEach((v, j) => { const key = H[j + 1]; if (v === 'U' && KF[key] && !KF[key].some(F => fl[F] && fl[F].bit != null && fl[F].positives > 0)) cells.push({ title: c[0], key }); });
}
const zilOf = repo => {
  const dir = path.join(CACHE, repo);
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dir + '.tgz', execSync('gh api repos/historicalsource/' + repo + '/tarball', { maxBuffer: 1 << 28 }));
    execSync('tar -xzf ' + repo + '.tgz -C ' + repo, { cwd: CACHE, stdio: 'ignore' });
  }
  const out = []; const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.zil$/i.test(e.name)) out.push(p); }); walk(dir); return out;
};
const res = cells.map(({ title, key }) => {
  const repo = REPO[title]; let files = []; try { files = zilOf(repo); } catch (e) { return { title, key, repo, verdict: 'NOSRC', err: String(e).slice(0, 80) }; }
  const hits = {}; for (const f of files) { const t = fs.readFileSync(f, 'latin1'); for (const F of KF[key]) { const n = (t.match(new RegExp('\\b' + F + '\\b', 'g')) || []).length; if (n) (hits[F] = hits[F] || []).push(path.basename(f) + ':' + n); } }
  return { title, key, repo, files: files.length, flags: KF[key], hits, verdict: !files.length ? 'NOSRC' : Object.keys(hits).length ? 'PRESENT' : 'ABSENT' };
});
fs.writeFileSync(path.join(D, '2026-10-17-zil-flag-absence.json'), JSON.stringify(res, null, 1));
for (const r of res) console.log(r.verdict.padEnd(8), (r.title + ':' + r.key).padEnd(40), r.files + ' .zil', JSON.stringify(r.hits));
console.log(['ABSENT', 'PRESENT', 'NOSRC'].map(v => v + ' ' + res.filter(r => r.verdict === v).length).join(' | '));
