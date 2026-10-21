const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const d=__dirname,m=JSON.parse(fs.readFileSync(path.join(d,'immutable-manifest.json'))),results=[];
function run(name,file,cwd=process.cwd()){const r=spawnSync(process.execPath,[file],{cwd,encoding:'utf8',windowsHide:true});fs.writeFileSync(path.join(d,name+'.txt'),(r.stdout||'')+(r.stderr||''));results.push({name,exit:r.status});return r;}
const harness=path.resolve('harness/zil-object-food.js'),red=run('new-regression-base',harness,m.base);
if(red.status===0)throw Error('Regression failed to detect missing identity capability');
for(const name of ['zil-object-food','zil-food-drink','zil-direct-player-worn','d198-semantic-provenance','zil-actor-open'])if(run(name,path.resolve('harness/'+name+'.js')).status!==0)throw Error('Focused candidate failure '+name);
const base=run('d31-base',path.join(m.base,'harness/d31-nested-inventory.js'),m.base),candidate=run('d31-candidate',path.resolve('harness/d31-nested-inventory.js'));
const failures=r=>(r.stdout+'\n'+r.stderr).split(/\r?\n/).filter(x=>x.startsWith('FAIL:'));
if(base.status!==candidate.status||JSON.stringify(failures(base))!==JSON.stringify(failures(candidate)))throw Error('New D31 regression');
fs.writeFileSync(path.join(d,'focused-results.json'),JSON.stringify({results,regression:'Fails baseline, passes candidate',d31:{classification:'Same existing failures on immutable baseline and candidate; not a green test',failures:failures(candidate)}},null,2)+'\n');console.log(JSON.stringify(results));
