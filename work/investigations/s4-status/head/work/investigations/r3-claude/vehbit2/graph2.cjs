// node graph.cjs <Story> <target room names comma>  -> backward BFS tree in static exit graph (read-only)
const path=require('path'),{pathToFileURL}=require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async()=>{const [story,tg]=process.argv.slice(2);const b=await chromium.launch({headless:true});const p=await b.newPage();
await p.addInitScript(()=>{try{sessionStorage.setItem('PL_ParchLockSplashSeen','1')}catch(e){}});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story);await p.waitForTimeout(3000);
try{await p.click('.parchlock-splash__start',{timeout:1500})}catch(e){}
const r=await p.evaluate(tg=>{const m=ZRamProvider.getMem();const E=[];const nm={};
 for(let i=1;i<256;i++){try{nm[i]=ZRamReader.shortName(m,i)}catch(e){}let ex=[];try{ex=ExitCalibrator.exitsFor(m,i)}catch(e){}for(const e of ex)if(e.targetRoomId)E.push([i,e.command,e.targetRoomId]);}
 const out={};for(const t of tg.split(',')){const tid=Object.keys(nm).filter(k=>nm[k]===t).map(Number);const seen=new Map(tid.map(x=>[x,null]));const q=[...tid];
  while(q.length){const x=q.shift();for(const [a,d,bb] of E)if(bb===x&&!seen.has(a)){seen.set(a,[d,x]);q.push(a)}}
  out[t]=[...seen.entries()].map(([a,v])=>nm[a]+(v?' --'+v[0]+'--> '+nm[v[1]]:''));}
 out.names=Object.entries(nm).filter(([k,v])=>/Park|Booth|Midway|Entrance|Arcade|Gate|Turnstile|Haunted|Casino/i.test(v||'')).map(x=>x.join(':'));out.casinoIn=E.filter(e=>/Casino|Haunted/.test(nm[e[2]])).map(e=>nm[e[0]]+' '+e[1]+' '+nm[e[2]]);out.casinoOut=E.filter(e=>/Casino|Haunted/.test(nm[e[0]])).map(e=>nm[e[0]]+' '+e[1]+' '+nm[e[2]]);return out;},tg);console.log(JSON.stringify(r,null,1));await b.close();})();

