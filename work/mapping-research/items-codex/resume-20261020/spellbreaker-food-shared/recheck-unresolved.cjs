const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const d=__dirname,m=JSON.parse(fs.readFileSync(path.join(d,'immutable-manifest.json')));
const games='cycles.z5.js,Mullmurd.z5.js';
Promise.all(['base','candidate'].map(label=>new Promise((resolve,reject)=>{
 const log=fs.openSync(path.join(d,label+'-diff-recheck-round2.txt'),'w');
 const p=spawn(process.execPath,[path.join(d,'gate-shard.cjs')],{cwd:process.cwd(),windowsHide:true,env:{...process.env,ROOT:m[label],GAMES:games,SHARD:'0/1',GLULX:'1',OUT:path.join(d,label+'-diff-recheck-round2.jsonl')},stdio:['ignore',log,log]});
 p.on('close',code=>{fs.closeSync(log);code===0?resolve():reject(Error(label+' '+code));});
}))).then(()=>{
 for(const label of ['base','candidate']){
  const read=name=>fs.readFileSync(path.join(d,name),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const rows=read(label+'-diff-recheck-round1.jsonl'),fresh=read(label+'-diff-recheck-round2.jsonl');
  for(const row of fresh){const i=rows.findIndex(x=>x.game===row.game);if(i<0)throw Error('Unexpected game');rows[i]=row;}
  fs.writeFileSync(path.join(d,label+'-diff-recheck.jsonl'),rows.map(JSON.stringify).join('\n')+'\n');
 }
 console.log('Preserved round1; paired round2 for only unresolved games complete');
}).catch(e=>{console.error(e);process.exitCode=1});
