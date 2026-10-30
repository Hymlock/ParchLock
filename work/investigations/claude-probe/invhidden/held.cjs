const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require(process.cwd()+'/node_modules/playwright');
const [story,...cmds]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await (await b.newContext()).newPage();
await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen'])localStorage.setItem(k,'1')});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story);await p.waitForTimeout(3400);
if(await p.locator('#message.show #close').isVisible())await p.locator('#message.show #close').click();
async function ready(){for(let i=0;i<20;i++){if(await p.locator('.Input.LineInput:visible').count())return;if(await p.locator('.Input.CharInput:visible').count())await p.keyboard.press('Enter');await p.waitForTimeout(150)}throw Error('no input')}
const log=[];for(const c of cmds){await ready();await p.locator('.Input.LineInput:visible').first().fill(c);await p.keyboard.press('Enter');await p.waitForTimeout(400);await ready();
const r=await p.evaluate(()=>{const ls=[...document.querySelectorAll('#windowport .BufferLine')];let k=-1;for(let i=ls.length-1;i>=0;i--)if(ls[i].querySelector('.Style_input')){k=i;break}
const q=WorldModel.tick(),m=ZRamProvider.getMem(),R=ZRamReader,h=R.header(m),n=R.objectCount(m,h),pl=Number(q.playerId);const tree=[];
const walk=(id,d)=>{for(let c=R.objectLinks(m,id).child;c;c=R.objectLinks(m,c).sibling){const o=R.objectLinks(m,c);tree.push(' '.repeat(d)+c+':'+R.shortName(m,c)+' ['+Array.from({length:32},(_,i)=>i).filter(i=>R.attr(o,i))+']');if(d<4)walk(c,d+1)}};walk(pl,0);
return{reply:ls.slice(k).map(x=>x.textContent).join('\n'),player:pl,held:tree,appInv:(q.inventory||[]).map(o=>o.id+':'+o.name)}});log.push({cmd:c,...r})}
fs.writeFileSync('work/investigations/claude-probe/invhidden/'+story+'.json',JSON.stringify(log,null,1));const L=log[log.length-1];console.log(story,JSON.stringify(L,null,1));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
