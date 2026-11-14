// Eamon package trust guard for builds (Grok #3525). js/EamonPackage.js holds the TRUSTED block of package digests
// a build will run. A test package (an update test's N+1) is trusted only in the build that asks for it, through
// EAMON_TEST_TRUST, never by editing the repository file, and never in a release build.
//   node tools/check-trusted.cjs inject <EamonPackage.js>                         add EAMON_TEST_TRUST entries
//   node tools/check-trusted.cjs check <repo EamonPackage.js> <built EamonPackage.js> [--allow-test]
// EAMON_TEST_TRUST = "sha256=label[,sha256=label...]". check fails unless the built block holds exactly the repository
// block, plus (with --allow-test) the EAMON_TEST_TRUST digests.
const fs = require('fs');
const BLOCK = /\/\*TRUSTED-BEGIN\*\/([\s\S]*?)\/\*TRUSTED-END\*\//;
const fail = (msg) => { console.error('check-trusted: ' + msg); process.exit(1); };
// The block must parse as object entries; every key must be a lowercase SHA-256 (fails closed, Grok #3527 N2).
const parseBlock = (inner, file) => {
  let obj;
  try { obj = JSON.parse('{' + inner.replace(/,\s*$/, '') + '}'); } catch (e) { fail('TRUSTED block in ' + file + ' does not parse: ' + e.message); }
  const keys = Object.keys(obj);
  const quoted = (inner.match(/"(?:[^"\\]|\\.)*"\s*:/g) || []).length;
  if (quoted !== keys.length) fail('TRUSTED block in ' + file + ' has duplicate or hidden keys');
  const bad = keys.filter(k => !/^[0-9a-f]{64}$/.test(k));
  if (bad.length) fail('TRUSTED block in ' + file + ' has keys that are not lowercase SHA-256: ' + bad.join(', '));
  return obj;
};
const digests = (text, file) => {
  const m = BLOCK.exec(text);
  if (!m) fail('no TRUSTED block in ' + file);
  return Object.keys(parseBlock(m[1], file));
};
const testList = () => String(process.env.EAMON_TEST_TRUST || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
  const [hash, ...label] = s.split('=');
  if (!/^[0-9a-f]{64}$/.test(hash)) fail('bad EAMON_TEST_TRUST entry ' + s);
  return { hash, label: label.join('=') || 'Eamon Showcase test' };
});
const [mode, a, b] = process.argv.slice(2);
if (mode === 'inject') {
  const text = fs.readFileSync(a, 'utf8'), have = new Set(digests(text, a)), add = testList().filter(t => !have.has(t.hash));
  if (!add.length) { console.log('check-trusted: nothing to inject'); process.exit(0); }
  // Key and label written as JSON strings, so no label text can break the script (Grok #3527 N3).
  const out = text.replace(BLOCK, (all, inner) => '/*TRUSTED-BEGIN*/' + inner.replace(/\s*$/, '') + add.map(t => ',\n        ' + JSON.stringify(t.hash) + ': ' + JSON.stringify(t.label)).join('') + '\n        /*TRUSTED-END*/');
  const check = digests(out, a + ' (after inject)');
  if (add.some(t => check.indexOf(t.hash) < 0)) fail('inject did not take in ' + a);
  fs.writeFileSync(a, out);
  console.log('check-trusted: injected ' + add.map(t => t.hash.slice(0, 8) + ' (' + t.label + ')').join(', ') + ' into ' + a);
} else if (mode === 'check') {
  const repo = digests(fs.readFileSync(a, 'utf8'), a), built = digests(fs.readFileSync(b, 'utf8'), b);
  const allowed = new Set(repo.concat(process.argv.includes('--allow-test') ? testList().map(t => t.hash) : []));
  const extra = built.filter(h => !allowed.has(h)), missing = repo.filter(h => !built.includes(h));
  if (extra.length || missing.length) fail(b + ' does not match the repository TRUSTED block' + (extra.length ? '; not allowed: ' + extra.join(', ') : '') + (missing.length ? '; missing: ' + missing.join(', ') : ''));
  console.log('check-trusted: ' + b + ' ok (' + built.length + ' trusted)');
} else { console.error('usage: check-trusted.cjs inject <file> | check <repo file> <built file> [--allow-test]'); process.exit(2); }
