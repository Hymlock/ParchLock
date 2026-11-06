const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const root=process.cwd(),dir=path.join(root,'work/mapping-research/items-codex/resume-20261020/death-persistence-20261026');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'shared-final/immutable-manifest.json'),'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const expected={
'js/Consts.js':'0C3E014242D052D698C1D3828626FCB85450188F9884FA89B52714DDE5610510',
'js/SaveState.js':'8BD7EAD8597691963310D2B97F10764CE212A2B0D388C6D9CF1FC66DC931BE75',
'js/StatTracker.js':'4E4F7948EA5EE01B934C79E039EE1E35E1B7224EDE30FFE5944DEA6A07AF9E83',
'js/Transcript.js':'5CDDF48DD101579D8B0EC628F540183A89AE7546AA7B31D4D0555CD6C7FB1C7B',
'js/Qol.js':'1EBEA551E8D54B556122242FDDB47B153F1D9F319DBD972994E879DB8AABC5EE',
'js/WorkspaceUI.js':'C48694502F78974CF5B923D386D476667FEDFAB025E89CFC22E21171BE630353',
'js/Tutorial.js':'FCBEBE25F96D378021D1CB97A696D319D00E8ECC4FFBD43BFE8AC5A72C34EFCB',
'service-worker.js':'DABCBCFC297CD0889C58C73A3E5180DAFA5D14E9F1ECDD1997FB4E402AA1E92A',
'USER_GUIDE.md':'C1A1D2CBE0ED805E3B7885E8319B482CFB846349E8FC1CA62EAF713563C40790'};
const errors=[],changed=[],groups={};
for(const [file,entry] of Object.entries(manifest.hashes)){
 try{
 const base=hash(fs.readFileSync(path.join(manifest.base,file))),candidate=hash(fs.readFileSync(path.join(manifest.candidate,file))),live=hash(fs.readFileSync(path.join(root,file)));
 if(base!==entry.base||candidate!==entry.candidate)errors.push(file+': manifest mismatch');
 if(candidate!==live)errors.push(file+': candidate/live mismatch');
 if(base!==candidate){changed.push(file);const head=hash(cp.execFileSync('git',['show',manifest.baseCommit+':'+file],{cwd:root,maxBuffer:64*1024*1024}));if(base!==head)errors.push(file+': baseline/rawgit mismatch');}
 if(expected[file]&&candidate!==expected[file].toLowerCase())errors.push(file+': differs from accepted hash');
 const group=file.split('/')[0];groups[group]=(groups[group]||0)+1;
 }catch(e){errors.push(file+': '+e.message);}
}
if(JSON.stringify([...changed].sort())!==JSON.stringify(Object.keys(expected).sort()))errors.push('actual changed set differs from accepted9');
if(JSON.stringify([...manifest.changed].sort())!==JSON.stringify(Object.keys(expected).sort()))errors.push('declared changed set differs from accepted9');
const out={status:errors.length?'FAIL':'PASS',files:Object.keys(manifest.hashes).length,changed,groups,errors,baseCommit:manifest.baseCommit,manifestSha256:hash(fs.readFileSync(path.join(dir,'shared-final/immutable-manifest.json'))),checkedAt:new Date().toISOString()};
fs.writeFileSync(path.join(dir,'independent/final-freeze-validation.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));if(errors.length)process.exitCode=1;
