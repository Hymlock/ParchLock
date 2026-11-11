// Builds the importable Eamon Showcase package from a host build directory (see Prepare-Host.ps1).
//   node pack-showcase.cjs <work dir> <output file.eamon> [version]
// Prints the package SHA-256. A ParchLock build runs the package only if that digest is listed in
// js/EamonPackage.js (TRUSTED); pass --pin to write it there for a development build.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const [work, output, versionArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!work || !output) { console.error('usage: node pack-showcase.cjs <work dir> <output.eamon> [version] [--pin]'); process.exit(2); }
const version = versionArg || '0.1.0-dev';
const framework = path.join(work, 'eamon-host/bin/Release/net8.0/publish/wwwroot/_framework');
const data = path.join(work, 'data');
const members = [];
function walk(dir, prefix) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name), rel = prefix + name;
    if (fs.statSync(full).isDirectory()) walk(full, rel + '/');
    else if (!/\.(br|gz)$/i.test(name)) members.push({path: rel, full});
  }
}
walk(framework, '_framework/');
walk(data, 'eamon-data/');
const buffers = members.map(m => {
  let bytes = fs.readFileSync(m.full);
  if (m.path === 'eamon-data/manifest.json' && bytes[0] === 0xEF) bytes = bytes.subarray(3); // no byte-order mark
  return bytes;
});
const header = Buffer.from(JSON.stringify({
  title: 'Eamon Showcase', version, engine: 'Eamon CS 3.1.0 (5db64a37afe0b5455ee477e067fca4e6d249e419)',
  files: members.map((m, i) => ({path: m.path, size: buffers[i].length, sha256: crypto.createHash('sha256').update(buffers[i]).digest('hex')}))
}));
const length = Buffer.alloc(4); length.writeUInt32LE(header.length);
const container = Buffer.concat([Buffer.from('PLEAMON1\n'), length, header, ...buffers]);
// Fixed gzip settings and no timestamp, so the same inputs always give the same file and digest.
const packed = zlib.gzipSync(container, {level: 9});
packed.writeUInt32LE(0, 4);
fs.writeFileSync(output, packed);
const digest = crypto.createHash('sha256').update(packed).digest('hex');
console.log(JSON.stringify({output, files: members.length, rawBytes: container.length, packageBytes: packed.length, sha256: digest, version}));
if (process.argv.includes('--pin')) {
  const target = path.join(__dirname, '../../../js/EamonPackage.js');
  const source = fs.readFileSync(target, 'utf8');
  const pinned = source.replace(/\/\*TRUSTED-BEGIN\*\/[\s\S]*?\/\*TRUSTED-END\*\//, `/*TRUSTED-BEGIN*/\n        "${digest}": "Eamon Showcase ${version}"\n        /*TRUSTED-END*/`);
  if (pinned === source) { console.error('could not find the TRUSTED block'); process.exit(1); }
  fs.writeFileSync(target, pinned);
  console.log('pinned in js/EamonPackage.js');
}
