'use strict';
// Focused rerun of the shared regression-gate driver on chosen trees/games. Read-only on trees.
// usage: node run-focused.cjs <label>=<treeAbsPath> ... ; env GAMES, REPS
const cp=require('child_process'),path=require('path'),fs=require('fs');
const out=__dirname, reps=+(process.env.REPS||2);
const cfg=process.argv.slice(2).map(a=>a.split('='));
const jobs=[];for(let r=1;r<=reps;r++)for(const [lab,tree] of cfg)jobs.push([lab+'-r'+r,tree]);
Promise.all(jobs.map(([n,tree])=>new Promise(res=>{
 const o=path.join(out,n+'.jsonl');try{fs.unlinkSync(o)}catch{}
 const c=cp.spawn(process.execPath,['work/investigations/regression-gate.cjs'],{cwd:process.cwd(),env:{...process.env,ROOT:tree,OUT:o,GLULX:'1'},stdio:['ignore','ignore','pipe'],windowsHide:true});
 let e='';c.stderr.on('data',d=>e+=d);c.on('exit',code=>{console.log(n,'exit',code,e.slice(0,300));res();});
}))).then(()=>console.log('ALL DONE'));