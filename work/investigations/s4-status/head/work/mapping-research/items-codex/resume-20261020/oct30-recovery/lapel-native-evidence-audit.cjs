const fs=require('fs'),crypto=require('crypto'),assert=require('assert');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync('games/Sherlock.z5.js'),run=JSON.parse(fs.readFileSync(__dirname+'/lapel-native-lit.run.json','utf8'));
assert.equal(sha(raw),run.gameSha256);
const match=raw.toString().match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/),packed=Buffer.from(match[1].replace(/\s+/g,''),'base64');
const off=packed[0]>=1&&packed[0]<=8?-1:packed.indexOf(Buffer.from('ZCOD'));
const exe=off<0?packed:packed.subarray(off+8,off+8+packed.readUInt32BE(off+4));
assert.equal(sha(exe),'ba9c2c81d6b55eb9fc7de43a2e439fc65304231cbb834c208005cd9460f44ff0');
assert.equal(run.sourceStable,true);assert.deepEqual(run.sourcePre,run.sourcePost);assert(!run.stopped);assert.equal(run.tests.length,37);
const cases=run.tests.filter(r=>/coat lapel positive/.test(r.role));assert.equal(cases.length,2);
for(const c of cases){assert(/carnation/i.test(c.text));assert(c.inventory.lapel.some(o=>o.id===296&&o.parent===174));assert(c.inventory.rows.some(o=>o.id===296&&o.parent===174&&!o.suppressed));assert(c.inventory.labels.some(o=>o.id===296));assert(c.testAttrOnId.some(o=>o[0]===174&&o[1]===32&&o[2]===1));}
const cure=run.tests.find(r=>r.role==='natural lapel acquisition');assert(/puts a lovely carnation in your lapel/.test(cure.text));
const diagnosis=run.tests.find(r=>r.cmd==='listen to girl');assert(/incredibly fast/.test(diagnosis.text));assert(run.tests.some(r=>r.cmd==='give orange pill to girl'));
const result={verdict:'PASS bounded lapel native/display evidence',decodedDigest:sha(exe),decodedDigestTier:'deterministically reconstructed from captured-hash-identical wrapper, not a new RAM digest measurement',sourceStable62:Object.keys(run.sourcePre).length,reader:run.readerSha256,commands:37,naturalOwner:296,hiddenHolder:174,coatContexts:['worn','unworn'],nativeAndLabelProjection:true,rawArtifactSha256:sha(fs.readFileSync(__dirname+'/lapel-native-lit.run.json')),limits:['Seed0 replacement disclosed','No actual rendered GUI click proof from labelRows model','No whole-title/full26 closure','Earlier dark failure preserved; no invented cure on that run']};
fs.writeFileSync(__dirname+'/lapel-native-evidence-audit.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
