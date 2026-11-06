// POST-RUN manifest of the two gate trees (claude 2026-10-22, codex #4456). Not a pre-run record: the only pre-run
// record is the sha256 prefixes printed at tree creation (see README.md here). Hashes every js/ file, play.html and all
// games/*.js in each tree, plus git HEAD/status of the tree.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const out = {};
for (const t of ['base', 'cand']) {
  const root = path.resolve(__dirname, '../../../../../../wt-claude-edible-' + t + '-20261022');
  const files = ['play.html', ...fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f),
    ...fs.readdirSync(path.join(root, 'games')).filter(f => f.endsWith('.js')).map(f => 'games/' + f)];
  out[t] = { root, head: cp.execSync('git rev-parse HEAD', { cwd: root }).toString().trim(),
    status: cp.execSync('git status --short', { cwd: root }).toString().trim().split('\n').filter(Boolean),
    hashes: Object.fromEntries(files.map(f => [f, sha(path.join(root, f))])) };
}
const js = Object.keys(out.base.hashes).filter(f => f.startsWith('js/') || f === 'play.html');
out.jsDiffers = js.filter(f => out.base.hashes[f] !== out.cand.hashes[f]);
out.gamesDiffer = Object.keys(out.base.hashes).filter(f => f.startsWith('games/') && out.base.hashes[f] !== out.cand.hashes[f]);
out.gameCount = Object.keys(out.base.hashes).filter(f => f.startsWith('games/')).length;
fs.writeFileSync(path.join(__dirname, 'post-run-manifest.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ heads: [out.base.head, out.cand.head], baseStatus: out.base.status, candStatus: out.cand.status, jsDiffers: out.jsDiffers, gamesDiffer: out.gamesDiffer.length, games: out.gameCount }));
