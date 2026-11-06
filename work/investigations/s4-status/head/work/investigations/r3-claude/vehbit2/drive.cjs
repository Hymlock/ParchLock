// usage: node drive.cjs <Story> <cmdsFile(json array)> <outLog.json>
const path=require('path'),fs=require('fs'),{pathToFileURL}=require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async()=>{const [story,cf,outf]=process.argv.slice(2);const cmds=JSON.parse(fs.readFileSync(cf,'utf8'));
const b=await chromium.launch({headless:true});const p=await b.newPage();
await p.addInitScript(()=>{try{sessionStorage.setItem('PL_ParchLockSplashSeen','1')}catch(e){}});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story);
await p.waitForTimeout(3000);
try{await p.click('.parchlock-splash__start',{timeout:1500})}catch(e){}
await p.evaluate(()=>{try{Message.Hide()}catch(e){}});await p.waitForTimeout(800);
const st=()=>p.evaluate(()=>{const m=ZRamProvider.getMem();const pl=WorldModel.lastPayload||{};const id=pl.playerId;const L=id?ZRamReader.objectLinks(m,id):null;const par=L?L.parent:null;
 const L2=document.querySelectorAll('.BufferLine');return {playerId:id,roomId:pl.roomId,parent:par,parentName:par?ZRamReader.shortName(m,par):null,lines:L2.length}});
const txt=(from)=>p.evaluate(f=>[...document.querySelectorAll('.BufferLine')].slice(f).map(l=>l.innerText).join('\n').trim(),from);
const log=[];let s=await st();log.push({cmd:null,state:s,reply:(await txt(0)).slice(-600)});
for(const c of cmds){const before=await st();await p.evaluate(c=>{try{Message.Hide()}catch(e){};Input.Clear();Input.Inject(c,true)},c);await p.waitForTimeout(1300);
 const a=await st();const r=await p.evaluate(()=>{const L=[...document.querySelectorAll(".BufferLine")].map(l=>l.innerText);return L.slice(-10).join(" / ")});log.push({cmd:c,parentBefore:before.parent,parentBeforeName:before.parentName,parentAfter:a.parent,parentAfterName:a.parentName,playerId:a.playerId,reply:r.slice(0,500)});}
fs.writeFileSync(outf,JSON.stringify(log,null,1));
for(const e of log)console.log(JSON.stringify(e.cmd),e.parentBefore,'->',e.parentAfter,e.parentAfterName,'|',(e.reply||'').replace(/\s+/g,' ').slice(0,140));
await b.close();})();
