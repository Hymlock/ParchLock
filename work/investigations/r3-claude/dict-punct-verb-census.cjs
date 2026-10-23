// Census (claude, 2026-10-23): verb-flagged dictionary words that start with a non-letter, across every Z-machine game.
// Uses the app's own GrammarProvider.readVerbWords on each story's memory. Glulx stories are skipped (no Z dictionary).
//   node work/investigations/r3-claude/dict-punct-verb-census.cjs -> work/investigations/r3-claude/dict-punct-verb-census.json
const fs = require('fs'), vm = require('vm'), path = require('path');
const { story } = require(path.resolve('work/investigations/zil-attr-analyzer.js'));
const ctx = { console, window: {} }; vm.createContext(ctx);
for (const f of ['ZRamReader', 'GrammarProvider']) vm.runInContext(fs.readFileSync('js/' + f + '.js', 'utf8'), ctx);
const out = {}, counts = {}; let games = 0, failed = [];
for (const g of fs.readdirSync('games').filter(f => /\.(z[1-8]|zblorb)\.js$/i.test(f))) {
  let mem; try { const b = Uint8Array.from(story(g)); mem = new DataView(b.buffer); } catch (e) { failed.push(g); continue; }
  games++;
  let words = []; try { words = ctx.GrammarProvider.readVerbWords(mem) || []; } catch (e) { failed.push(g); continue; }
  const odd = words.filter(w => !/^[a-z]/i.test(w));
  if (odd.length) { out[g] = odd; odd.forEach(w => counts[w] = (counts[w] || 0) + 1); }
}
fs.writeFileSync('work/investigations/r3-claude/dict-punct-verb-census.json', JSON.stringify({ games, failed, byGame: out, counts }, null, 1));
console.log('games', games, 'withPunctVerbs', Object.keys(out).length, 'failed', failed.length);
console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([w, n]) => w + ':' + n).join('  '));
