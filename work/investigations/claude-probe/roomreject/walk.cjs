// Native walk: play.html, send commands, after each read ParchLockMap rooms + current room + ZRAM HERE.
const {chromium}=require('playwright'),path=require('path'),{pathToFileURL}=require('url');
const [story,...cmds]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const x of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(x,'1');});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story);await p.waitForTimeout(4000);
const settle=async()=>{for(let i=0;i<25&&!await p.locator('.Input.LineInput').count();i++){const c=p.locator('.Input.CharInput');if(await c.count()){await c.first().focus();await p.keyboard.press('Space');}await p.waitForTimeout(200);}};
const snap=()=>p.evaluate(()=>{const M=window.ParchLockMap||{};const R=M.Rooms||{};const names=Object.keys(R).map(k=>{const r=R[k];return (r.Name||k)+'#'+r.ObjectId+' '+JSON.stringify(r.Exits||{})});
let here=null;try{const m=ZRamProvider.getMem();const h=ZRamReader.header(m);here=m.getUint16(h.globals);}catch(e){}return {cur:M.CurrentRoom,here,n:names.length,names};});
await settle();
const send=async c=>{await settle();if(!await p.locator('.Input.LineInput').count()){await p.keyboard.press('Enter');await p.waitForTimeout(400);await settle();}await p.locator('.Input.LineInput').fill(c);await p.keyboard.press('Enter');await p.waitForTimeout(700);await settle();};
for(const c of cmds){if(c.startsWith('WAITUNTIL:')){const re=new RegExp(c.slice(10),'i');for(let k=0;k<40;k++){const t=(await p.evaluate(()=>document.body.innerText)).slice(-600);if(re.test(t))break;await send('WAIT');}continue;}await settle();if(!await p.locator('.Input.LineInput').count()){await p.keyboard.press('Enter');await p.waitForTimeout(400);await settle();}const i=p.locator('.Input.LineInput');await i.fill(c);await p.keyboard.press('Enter');await p.waitForTimeout(700);await settle();
 const s=await snap();console.log(JSON.stringify({cmd:c,cur:s.cur,here:s.here,n:s.n}));}
const s=await snap();console.log('TEXT',(await p.evaluate(()=>document.body.innerText)).slice(-1500));console.log('FINAL',JSON.stringify(s.names));await b.close();})();
