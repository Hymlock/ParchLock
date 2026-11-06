'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert');
const root=process.cwd(), out=path.join(__dirname,'final-gate');fs.mkdirSync(out,{recursive:true});
const base='C:/Users/hymlo/Downloads/Projects/Parchmap-learning-base-20261102';
const cand='C:/Users/hymlo/Downloads/Projects/Parchmap-learning-candidate-20261102';
const files=cp.execFileSync('git',['diff','--name-only','--','js','service-worker.js'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const games=fs.readdirSync('games').filter(f=>f.endsWith('.js')).sort();assert.strictEqual(games.length,309);
const manifest=tree=>Object.fromEntries(fs.readdirSync(path.join(tree,'js')).filter(f=>f.endsWith('.js')).map(f=>['js/'+f,hash(path.join(tree,'js',f))]).concat([['service-worker.js',hash(path.join(tree,'service-worker.js'))]]));
assert(!fs.existsSync(path.join(out,'manifest.json')),'Refuse to overwrite a gate');
for(const f of files)fs.copyFileSync(path.join(root,f),path.join(cand,f));
for(const g of games){assert.strictEqual(hash(path.join(root,'games',g)),hash(path.join(base,'games',g)));assert.strictEqual(hash(path.join(root,'games',g)),hash(path.join(cand,'games',g)));}
const captured={baseCommit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base,cand,files,
 driverSha256:hash('work/investigations/regression-gate.cjs'),runnerSha256:hash(__filename),baseHashes:manifest(base),candidateHashes:manifest(cand),games:Object.fromEntries(games.map(g=>[g,hash(path.join(root,'games',g))]))};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(captured,null,2));
async function run(label,tree){
 await Promise.all(Array.from({length:8},(_,i)=>new Promise((resolve,reject)=>{
  const log=fs.openSync(path.join(out,label+'-'+i+'.log'),'wx'), output=path.join(out,label+'-'+i+'.jsonl');
  const child=cp.spawn(process.execPath,['work/investigations/regression-gate.cjs'],{cwd:root,env:{...process.env,ROOT:tree,OUT:output,GLULX:'1',SHARD:i+'/8'},stdio:['ignore',log,log],windowsHide:true});
  child.on('error',reject);child.on('exit',code=>{fs.closeSync(log);console.log(label+' shard '+i+' exited '+code);code===0?resolve():reject(Error(label+' shard '+i+' failed '+code));});
 })));
 const rows=Array.from({length:8},(_,i)=>fs.readFileSync(path.join(out,label+'-'+i+'.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)).flat().sort((a,b)=>a.game.localeCompare(b.game));
 assert.strictEqual(rows.length,309);assert.strictEqual(new Set(rows.map(r=>r.game)).size,309);
 fs.writeFileSync(path.join(out,label+'.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
 console.log(label+' complete309');
}
(async()=>{await run('base',base);await run('candidate',cand);
 assert.deepStrictEqual(manifest(base),captured.baseHashes);assert.deepStrictEqual(manifest(cand),captured.candidateHashes);assert.deepStrictEqual(manifest(root),captured.candidateHashes);
 const diff=cp.execFileSync(process.execPath,['work/investigations/regression-gate.cjs','--diff',path.join(out,'base.jsonl'),path.join(out,'candidate.jsonl')],{cwd:root,encoding:'utf8'});
 fs.writeFileSync(path.join(out,'diff.txt'),diff);fs.writeFileSync(path.join(out,'source-stable.json'),JSON.stringify({stable:true,rowsPerSide:309,checked:new Date().toISOString()}));console.log(diff);
})().catch(e=>{fs.writeFileSync(path.join(out,'runner-error.txt'),e.stack);console.error(e.stack);process.exitCode=1;});
