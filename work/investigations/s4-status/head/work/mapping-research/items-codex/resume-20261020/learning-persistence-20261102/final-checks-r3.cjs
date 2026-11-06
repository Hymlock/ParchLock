'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert');
const root=process.cwd(),out=path.join(__dirname,'final-gate-r3'),candidate='C:/Users/hymlo/Downloads/Projects/Parchmap-learning-final-r3-20261102';
async function run(name,file,env={}){const target=path.join(out,name+'.txt'),log=fs.openSync(target,'wx');return new Promise((resolve,reject)=>{
 const child=cp.spawn(process.execPath,[file],{cwd:root,env:{...process.env,...env},windowsHide:true,stdio:['ignore',log,log]});
 child.on('error',reject);child.on('exit',code=>{fs.closeSync(log);console.log(name+' exit '+code);resolve({name,command:'node '+file,code,log:name+'.txt'});});
});}
(async()=>{
 const jobs=['learning-persistence','learning-stores','learning-caps','learned-words','learned-words-consensus','equipment-ui','radial-auto-submit','shared-radial-integration','zil-light-forms'];
 const results=await Promise.all(jobs.map(n=>run(n,'harness/'+n+'.js')));
 results.push(await run('operator','harness/operator-regressions.js',{ROOT:candidate}));
 const games=['Zork1-TheGreatUndergroundEmpire.z3.js','anchor.z8.js','CounterfeitMonkey.gblorb.js'];games.forEach(g=>assert(fs.existsSync(path.join(candidate,'games',g))));
 results.push(await run('three-type','work/investigations/regression-gate.cjs',{ROOT:candidate,GLULX:'1',GAMES:games.join(','),OUT:path.join(out,'three-type.jsonl')}));
 const rows=fs.readFileSync(path.join(out,'three-type.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);assert.strictEqual(rows.length,3);assert(rows.every(r=>!r.error));
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({results,threeTypes:rows.map(r=>r.game),qualification:'Glulx play/boot-only smoke, not mapped object/flag certification.'},null,2));
 if(results.some(r=>r.code!==0))throw Error('A required focused check failed');console.log('Final focused/operator/three-type checks complete');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
