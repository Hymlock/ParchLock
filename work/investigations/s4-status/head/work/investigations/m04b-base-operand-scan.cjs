// M04-B research (diagnostic only, no product code): does the story's own
// code reference a candidate Map_Storage base address as a constant operand
// of a loadw/storew instruction? Scans every byte of memory for the 2-byte
// big-endian constant and classifies the preceding opcode byte.
//   node work/investigations/m04b-base-operand-scan.cjs games/<file> <candidateBase>
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path');
const game = process.argv[2], base = Number(process.argv[3]);
(async () => { const b = await chromium.launch(); const p = await b.newPage();
await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=' + game); await p.waitForTimeout(3000);
console.log(JSON.stringify(await p.evaluate((base) => { const m = ZRamProvider.getMem(), R = ZRamReader, h = R.header(m), hits = [];
  for (let a = 1; a < m.byteLength - 1; a++) { if (R.u16(m, a) !== base) continue;
    // loadw = 2OP:15. Long form opcode byte: 0x0F/0x2F/0x4F/0x6F with the first operand a constant.
    // Variable form 0xCF followed by a types byte. Report the 1-4 bytes before the operand.
    const prev = [a - 1, a - 2, a - 3].map(x => x >= 0 ? R.u8(m, x) : -1);
    const kind = (prev[0] === 0x0F || prev[0] === 0x2F) ? 'loadw(long, base first operand)'
      : (prev[0] === 0x10 || prev[0] === 0x30) ? 'loadb(long)'
      : (prev[1] === 0xCF) ? 'loadw(var, after types byte)'
      : (prev[1] === 0xE1) ? 'storew(var)' : 'other';
    hits.push({ addr: a, region: a >= h.himem ? 'high/code' : a >= h.staticMem ? 'static' : 'dynamic', prev: prev.map(x => x.toString(16)).join(' '), kind }); }
  return { base, himem: h.himem, hits }; }, base), null, 1));
await b.close(); })();
