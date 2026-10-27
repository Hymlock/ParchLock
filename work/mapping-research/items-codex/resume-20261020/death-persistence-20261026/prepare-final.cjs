const fs=require('fs'),path=require('path'),crypto=require('crypto');
const project=process.cwd(),d=path.resolve('work/mapping-research/items-codex/resume-20261020/death-persistence-20261026/shared-final');fs.mkdirSync(d,{recursive:true});
const base=path.resolve('../wt-codex-death-base-20261027'),candidate=path.resolve('../wt-codex-death-candidate-20261027');
const changed=['js/Consts.js','js/SaveState.js','js/StatTracker.js','js/Transcript.js','js/Qol.js','js/WorkspaceUI.js','js/Tutorial.js','service-worker.js','USER_GUIDE.md'];
function files(root,rel=''){return fs.readdirSync(path.join(root,rel),{withFileTypes:true}).flatMap(e=>{const r=path.posix.join(rel,e.name);if(e.isSymbolicLink())throw Error('Unexpected link '+r);return e.isDirectory()?files(root,r):[r];});}
for(const root of [base,candidate]){if(!fs.existsSync(path.join(root,'.git')))throw Error('Expected owned worktree');for(const dir of ['games'])fs.cpSync(path.join(project,dir),path.join(root,dir),{recursive:true});}
for(const file of changed)fs.copyFileSync(path.join(project,file),path.join(candidate,file));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const runtime=['index.html','play.html','tutorial.html','manifest.json','service-worker.js','USER_GUIDE.md',...['js','css','lib','img','licenses','games'].flatMap(dir=>files(base,dir))],hashes={};
for(const file of runtime){for(const root of [base,candidate])fs.copyFileSync(path.join(project,file),path.join(root,file));if(changed.includes(file))fs.writeFileSync(path.join(base,file),require('child_process').execFileSync('git',['show','HEAD:'+file]));hashes[file]={base:sha(path.join(base,file)),candidate:sha(path.join(candidate,file))};if(!changed.includes(file)&&hashes[file].base!==hashes[file].candidate)throw Error('Unexpected source difference '+file);if(hashes[file].candidate!==sha(path.join(project,file)))throw Error('Candidate not current '+file);}
fs.writeFileSync(path.join(d,'immutable-manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),base,candidate,baseCommit:'59aeaf71db10d50eedb531942c841863311acdb0',owner:'codex',changed,hashes},null,2));
for(const file of ['run-full-gate.cjs','gate-shard.cjs'])fs.copyFileSync(path.resolve('work/mapping-research/items-codex/resume-20261020/sherlock-ztext-r3-shared',file),path.join(d,file));
console.log('Frozen '+runtime.length+' files across base/candidate; not yet launching gate');
