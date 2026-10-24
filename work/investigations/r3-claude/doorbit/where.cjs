// usage: node where.cjs <Story.z3.js> <DOORBIT>  -> rooms whose properties reference each DOORBIT object (DEXIT)
const path=require('path'),{pathToFileURL}=require('url');const R=process.cwd();
const { chromium } = require(R + '/node_modules/playwright');const [story,DB]=process.argv.slice(2);
(async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage();
await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story,{waitUntil:'domcontentloaded'});await p.waitForTimeout(3500);
const r=await p.evaluate(DB=>{const m=ZRamProvider.getMem();const h=ZRamReader.header(m);const first=h.objTable+h.defaultsWords*2;const L1=ZRamReader.objectLinks(m,1);const n=Math.floor(((L1.props||L1.prop||L1.propAddr)-first)/h.entrySize);
const doors=[];for(let i=1;i<=n;i++)if(ZRamReader.attr(ZRamReader.objectLinks(m,i),+DB))doors.push(i);const out={};
for(let i=1;i<=n;i++){const L=ZRamReader.objectLinks(m,i);let a=L.props||L.prop||L.propAddr;a+=1+2*m[a];while(m[a]){const sb=m[a],num=sb&31,sz=(sb>>5)+1;if(num>=(h.version>3?0:0)&&sz>=2)for(let k=0;k<sz;k++){const v=m[a+1+k];if(doors.includes(v)&&sz>=4&&sz<=6){(out[v]=out[v]||[]).push(i+':'+ZRamReader.shortName(m,i)+'/p'+num+'/sz'+sz);}}a+=1+sz;}}
return doors.map(d=>d+':'+ZRamReader.shortName(m,d)+' <- '+(out[d]||[]).join(', '));},DB);console.log(r.join('\n'));await b.close();})();
