// Dump a story's memory image (as loaded) to a .bin for offline disassembly.
//   node work/investigations/memdump.cjs games/<file> <out.bin>
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=' + process.argv[2]); await p.waitForTimeout(3000);
const arr = await p.evaluate(() => { const m = ZRamProvider.getMem(); const out = new Array(m.byteLength); for (let i = 0; i < m.byteLength; i++) out[i] = m.getUint8(i); return out; });
fs.writeFileSync(process.argv[3], Buffer.from(arr)); console.log('wrote', arr.length); await b.close(); })();
