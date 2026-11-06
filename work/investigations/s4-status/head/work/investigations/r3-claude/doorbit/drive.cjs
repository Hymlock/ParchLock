// usage: node drive.cjs <Story.z3.js> <CB> <OB> <AB> <cmdsfile|->
const path=require('path'),{pathToFileURL}=require('url');const R=process.cwd();
const { chromium } = require(R + '/node_modules/playwright');
const [story,CB,OB,AB,cmdf,JSEED]=process.argv.slice(2);
const cmds=cmdf&&cmdf!=='-'?require('fs').readFileSync(cmdf,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[];
(async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage();
await p.addInitScript((J)=>{ let A=J>>>0,iv=0,ct=0;const fr=function(t){t=t<<16>>16;if(t<=0){const v=-t;if(v===0){A=J>>>0;iv=0;}else if(v<1000){ct=0;iv=v;}else{A=v>>>0;iv=0;}return 0;}let r;if(iv){r=ct++;if(ct===iv)ct=0;}else{A=(Math.imul(0x015a4e35,A)+1)>>>0;r=(A>>>16)&0x7fff;}return r%t+1;};let cur;Object.defineProperty(window,'__PARCHLOCK_ZVM__',{configurable:true,get(){return cur;},set(v){cur=v;if(v&&!v.__jr){v.__jr=1;v.random=fr;}}});sessionStorage.setItem('PL_ParchLockSplashSeen','1');try{localStorage.setItem('PL_MobileTutorialSeen','1');localStorage.setItem('PL_TutorialSeen','1');}catch(e){}},+(JSEED||0));
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
const inj=async c=>{await p.evaluate(c=>{try{Message.Hide()}catch(e){}Input.Clear();Input.Inject(c,true);},c);await p.waitForTimeout(700);await more();};
for(const c of cmds){if(/^WAITUNTIL:/.test(c)){const re=new RegExp(c.slice(10),'i');for(let w=0;w<40;w++){await inj('wait');if(re.test((await body()).slice(-600)))break;}continue;}const before=await snap();const T=()=>p.evaluate(()=>[...document.querySelectorAll(".BufferLine")].map(l=>l.textContent).join(" "));const t0=(await T()).slice(-300);
await p.evaluate(c=>{try{Message.Hide()}catch(e){}Input.Clear();Input.Inject(c,true);},c);await p.waitForTimeout(900);await more();
const after=await snap();const t1=await T();const ix=t1.toLowerCase().lastIndexOf(">"+c.toLowerCase());const diff=[];for(const id in after.o){const a=before.o[id],z=after.o[id];if(a.c!==z.c||a.o!==z.o||a.p!==z.p)diff.push({id:+id,n:z.n,before:a,after:z});}
out.steps.push({cmd:c,reply:(ix>=0?t1.slice(ix+c.length+1):"?? "+t1.slice(-400)).slice(0,600),room:after.room,player:after.player,diff});}
out.final=await snap();console.log(JSON.stringify(out));await b.close();})();
