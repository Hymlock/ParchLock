'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert');
const root=process.cwd(),out=path.join(__dirname,'final-gate'),m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
const handoff=JSON.parse(fs.readFileSync(path.join(out,'orchestrator-handoff.json')));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifest=tree=>Object.fromEntries(fs.readdirSync(path.join(tree,'js')).filter(f=>f.endsWith('.js')).map(f=>['js/'+f,hash(path.join(tree,'js',f))]).concat([['service-worker.js',hash(path.join(tree,'service-worker.js'))]]));
assert.deepStrictEqual(manifest(m.base),m.baseHashes);
if(!fs.existsSync(path.join(out,'manifest-first-freeze.json')))fs.copyFileSync(path.join(out,'manifest.json'),path.join(out,'manifest-first-freeze.json'));
m.candidateHashes=manifest(m.cand);assert.deepStrictEqual(manifest(root),m.candidateHashes);
m.adjustment=JSON.parse(fs.readFileSync(path.join(out,'candidate-eol-adjustment.json')));m.continuationHash=hash(__filename);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(m,null,2));
function collect(label){return Array.from({length:8},(_,i)=>{const f=path.join(out,label+'-'+i+'.jsonl');return fs.existsSync(f)?fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l);}catch(e){return null;}}).filter(Boolean):[];}).flat();}
function merge(label){const rows=collect(label).concat(label==='base'?collect('base-recovery'):[]).sort((a,b)=>a.game.localeCompare(b.game));assert.strictEqual(rows.length,309);assert.strictEqual(new Set(rows.map(r=>r.game)).size,309);fs.writeFileSync(path.join(out,label+'.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');return rows;}
async function shards(label,tree,selected){await Promise.all(Array.from({length:8},(_,i)=>new Promise((resolve,reject)=>{
 const log=fs.openSync(path.join(out,label+'-'+i+'.log'),'wx');
 const child=cp.spawn(process.execPath,['work/investigations/regression-gate.cjs'],{cwd:root,env:{...process.env,ROOT:tree,OUT:path.join(out,label+'-'+i+'.jsonl'),GLULX:'1',SHARD:i+'/8',...(selected?{GAMES:selected.join(',')}:{})},stdio:['ignore',log,log],windowsHide:true});
 child.on('error',reject);child.on('exit',code=>{fs.closeSync(log);console.log(label+' shard '+i+' exit '+code);code===0?resolve():reject(Error(label+' shard failed '+i));});
})));}
async function main(){
 const ids=handoff.children.map(x=>Number(x.ProcessId));assert(ids.every(x=>Number.isInteger(x)&&x>0));
 await new Promise((resolve,reject)=>{const p=cp.spawn('powershell',['-NoProfile','-NonInteractive','-Command','Get-Process -Id '+ids.join(',')+' -ErrorAction SilentlyContinue | Wait-Process; exit 0'],{windowsHide:true,stdio:'ignore'});p.on('error',reject);p.on('exit',resolve);});
 const have=new Set(collect('base').map(r=>r.game)),missing=Object.keys(m.games).filter(g=>!have.has(g));
 if(missing.length){fs.writeFileSync(path.join(out,'baseline-missing-recovery.json'),JSON.stringify({retained:have.size,missing,reason:'Original test-job children ended when their orchestrator exited; retain all completed rows and run missing cases only.'},null,2));console.log('Retained baseline'+have.size+'; running missing'+missing.length);await shards('base-recovery',m.base,missing);}
 merge('base');assert.deepStrictEqual(manifest(m.base),m.baseHashes);console.log('Preserved baseline complete309; starting final exact-byte candidate');
 await shards('candidate',m.cand);
 merge('candidate');assert.deepStrictEqual(manifest(m.cand),m.candidateHashes);assert.deepStrictEqual(manifest(root),m.candidateHashes);
 const diff=cp.execFileSync(process.execPath,['work/investigations/regression-gate.cjs','--diff',path.join(out,'base.jsonl'),path.join(out,'candidate.jsonl')],{cwd:root,encoding:'utf8'});
 fs.writeFileSync(path.join(out,'diff.txt'),diff);fs.writeFileSync(path.join(out,'source-stable.json'),JSON.stringify({stable:true,rowsPerSide:309,checked:new Date().toISOString()}));console.log(diff);
}
main().catch(e=>{fs.writeFileSync(path.join(out,'continuation-error.txt'),e.stack);console.error(e.stack);process.exitCode=1;});
