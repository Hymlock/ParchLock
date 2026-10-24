// usage: node drive.cjs <Story.z3.js> <CB> <OB> <AB> <cmdsfile|->
const path=require('path'),{pathToFileURL}=require('url');const R=process.cwd();
const { chromium } = require(R + '/node_modules/playwright');
const [story,CB,OB,AB,cmdf]=process.argv.slice(2);
const cmds=cmdf&&cmdf!=='-'?require('fs').readFileSync(cmdf,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[];
(async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage();
await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');try{localStorage.setItem('PL_MobileTutorialSeen','1');localStorage.setItem('PL_TutorialSeen','1');}catch(e){}});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story,{waitUntil:'domcontentloaded'});
await p.waitForTimeout(2500);await p.evaluate(()=>{const s=document.querySelector('.parchlock-splash__start');if(s)s.click();try{Message.Hide()}catch(e){}});
await p.waitForTimeout(2000);
const waitLine=async()=>{for(let i=0;i<40;i++){if(await p.locator('.Input.LineInput').count())return;await p.keyboard.press('Space').catch(()=>{});await p.waitForTimeout(250);}};
const more=async()=>{for(let i=0;i<8;i++){const m=await p.evaluate(()=>!document.querySelector('.Input.LineInput'));if(!m)break;await p.keyboard.press('Space');await p.waitForTimeout(300);}};
await waitLine();
const snap=()=>p.evaluate(([CB,OB,AB])=>{const m=ZRamProvider.getMem();const h=ZRamReader.header(m);const first=h.objTable+h.defaultsWords*2;const L1=ZRamReader.objectLinks(m,1);const n=Math.floor(((L1.props||L1.prop||L1.propAddr)-first)/h.entrySize);const o={};for(let i=1;i<=n;i++){const L=ZRamReader.objectLinks(m,i);o[i]={n:ZRamReader.shortName(m,i),p:L.parent,c:ZRamReader.attr(L,+CB)?1:0,o:ZRamReader.attr(L,+OB)?1:0,a:ZRamReader.attr(L,+AB)?1:0};}
const wp=WorldModel.lastPayload||{};return {count:n,o,room:wp.roomId,player:wp.playerId};},[CB,OB,AB]);
const body=()=>p.evaluate(()=>document.body.innerText);
const out={story,init:await snap(),intro:(await body()).slice(-1500),steps:[]};
for(const c of cmds){const before=await snap();const b0=await p.evaluate(()=>document.querySelectorAll(".BufferLine").length);
await p.evaluate(c=>{try{Message.Hide()}catch(e){}Input.Clear();Input.Inject(c,true);},c);await p.waitForTimeout(900);await more();
const after=await snap();const t=await p.evaluate(()=>[...document.querySelectorAll(".BufferLine")].map(l=>l.textContent));const diff=[];for(const id in after.o){const a=before.o[id],z=after.o[id];if(a.c!==z.c||a.o!==z.o||a.p!==z.p)diff.push({id:+id,n:z.n,before:a,after:z});}
out.steps.push({cmd:c,reply:t.slice(Math.max(0,b0-1)).join(" ").slice(0,900),room:after.room,player:after.player,diff});}
out.final=await snap();console.log(JSON.stringify(out));await b.close();})();
