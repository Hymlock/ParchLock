'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert');
const root=process.cwd(),out=path.join(__dirname,'final-gate-r3'),prior=path.join(__dirname,'final-gate');fs.mkdirSync(out,{recursive:true});
assert(!fs.existsSync(path.join(out,'manifest.json')),'Do not overwrite settled candidate evidence');
const old=JSON.parse(fs.readFileSync(path.join(prior,'manifest.json'))),cand='C:/Users/hymlo/Downloads/Projects/Parchmap-learning-final-r3-20261102';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifest=tree=>Object.fromEntries(fs.readdirSync(path.join(tree,'js')).filter(f=>f.endsWith('.js')).map(f=>['js/'+f,hash(path.join(tree,'js',f))]).concat([['service-worker.js',hash(path.join(tree,'service-worker.js'))]]));
assert.deepStrictEqual(manifest(old.base),old.baseHashes);assert.deepStrictEqual(manifest(cand),manifest(root));
assert.strictEqual(hash('js/ActionSynth.js'),'4cd538aae0c82158d455d04c0f787c7d3f800a86f8575d470d53bf8e3e3ad765');
assert.strictEqual(hash('work/investigations/regression-gate.cjs'),old.driverSha256);
const baseText=fs.readFileSync(path.join(prior,'base.jsonl'),'utf8'),baseRows=baseText.trim().split('\n').map(JSON.parse);assert.strictEqual(baseRows.length,309);assert.strictEqual(new Set(baseRows.map(r=>r.game)).size,309);
fs.writeFileSync(path.join(out,'base.jsonl'),baseText);
for(const [g,h] of Object.entries(old.games)){assert.strictEqual(hash(path.join(cand,'games',g)),h);assert.strictEqual(hash(path.join(root,'games',g)),h);}
const m={base:old.base,cand,baseCommit:old.baseCommit,baseReuse:'../final-gate/base.jsonl (same immutable source and driver; no baseline replay)',baseSha256:hash(path.join(out,'base.jsonl')),baseHashes:old.baseHashes,candidateHashes:manifest(cand),driverSha256:old.driverSha256,runnerSha256:hash(__filename),games:old.games,reason:'R3 adds reviewed raw exact-item/form membership preflight before scope queries; counter regression failed then47/0. R2 marks differences diagnosed via serial pair and passive same-RAM/prose natural startup observations, not assumed harmless. Baseline309 reused unchanged. Candidate source changed, so final R3candidate309 runs once.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(m,null,2));
(async()=>{
 await Promise.all(Array.from({length:8},(_,i)=>new Promise((resolve,reject)=>{
  const log=fs.openSync(path.join(out,'candidate-'+i+'.log'),'wx');
  const child=cp.spawn(process.execPath,['work/investigations/regression-gate.cjs'],{cwd:root,env:{...process.env,ROOT:cand,OUT:path.join(out,'candidate-'+i+'.jsonl'),GLULX:'1',SHARD:i+'/8'},stdio:['ignore',log,log],windowsHide:true});
  child.on('error',reject);child.on('exit',code=>{fs.closeSync(log);console.log('R3 candidate shard '+i+' exit '+code);code===0?resolve():reject(Error('R3 candidate shard failed '+i));});
 })));
 const rows=Array.from({length:8},(_,i)=>fs.readFileSync(path.join(out,'candidate-'+i+'.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)).flat().sort((a,b)=>a.game.localeCompare(b.game));assert.strictEqual(rows.length,309);assert.strictEqual(new Set(rows.map(r=>r.game)).size,309);
 fs.writeFileSync(path.join(out,'candidate.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
 assert.deepStrictEqual(manifest(cand),m.candidateHashes);assert.deepStrictEqual(manifest(root),m.candidateHashes);assert.deepStrictEqual(manifest(old.base),m.baseHashes);
 const diff=cp.execFileSync(process.execPath,['work/investigations/regression-gate.cjs','--diff',path.join(out,'base.jsonl'),path.join(out,'candidate.jsonl')],{cwd:root,encoding:'utf8'});fs.writeFileSync(path.join(out,'diff.txt'),diff);fs.writeFileSync(path.join(out,'source-stable.json'),JSON.stringify({stable:true,rowsPerSide:309,reusedImmutableBaseline:true,checked:new Date().toISOString()}));console.log(diff);
})().catch(e=>{fs.writeFileSync(path.join(out,'error.txt'),e.stack);console.error(e.stack);process.exitCode=1;});
