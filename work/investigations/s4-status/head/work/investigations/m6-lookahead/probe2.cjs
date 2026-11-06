const path=require('path');const { chromium } = require(process.cwd()+'/node_modules/playwright');const {pathToFileURL}=require('url');
const PLANS={'Zork1-TheGreatUndergroundEmpire.z3.js':['n','n','climb tree','look'],
'break-in.z5.js':['look','x chair','sit on chair','look','w','stand','look'],
'Hitchhik.z5.js':['turn on light','s','get up','look','s'],
'Suspect.z3.js':['wait','s','n']};
(async()=>{const b=await chromium.launch();
for(const g of Object.keys(PLANS)){const p=await b.newPage();
await p.addInitScript(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x80000000;};});
await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1');});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+g);await p.waitForTimeout(2000);
const settle=async()=>{for(let i=0;i<25;i++){await p.evaluate(()=>{document.querySelector('.parchlock-splash__start')?.click();try{Message.Hide();}catch(e){}});if(await p.locator('.Input.LineInput').count())return;const c=p.locator('.Input.CharInput');if(await c.count())await c.first().focus();await p.keyboard.press('Space');await p.waitForTimeout(120);}};
await settle();
for(const c of PLANS[g]){await p.evaluate(c=>{Input.Clear();Input.Inject(c,true);},c);await p.waitForTimeout(1300);await settle();
const r=await p.evaluate(()=>{const P=WorldModel.lastPayload||{};let par='';try{const mem=new Uint8Array(ZRamProvider.mem?ZRamProvider.mem():[]);}catch(e){}const mem=ZRamProvider.getMem();const ch=[];let c=P.playerId;for(let i=0;i<5&&c;i++){const l=ZRamReader.objectLinks(mem,c);c=l&&l.parent;if(c)ch.push(c+':'+ZRamReader.shortName(mem,c));}return {chain:ch.join('>'),enc:ZRamReader.enclosingRoom(mem,P.playerId),room:P.roomId+':'+P.roomName,src:P.roomSource,player:P.playerId,exits:(P.exits||[]).map(e=>e.label+'>'+e.targetRoomId)};});
const txt=await p.evaluate(()=>{const t=[...document.querySelectorAll('.BufferWindow, .GridWindow')].map(e=>e.innerText).join(' ');return t.slice(-300).replace(/\s+/g,' ');});
console.log(g,JSON.stringify(c),JSON.stringify(r),'|',txt.slice(-200));}
await p.close();}await b.close();})();
