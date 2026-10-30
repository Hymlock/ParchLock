const path=require('path'),{pathToFileURL}=require('url'),{chromium}=require(process.cwd()+'/node_modules/playwright');
const [story,hid,take]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await (await b.newContext()).newPage();
await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen'])localStorage.setItem(k,'1')});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story);await p.waitForTimeout(3400);
const r=await p.evaluate(([H,T])=>{const m=ZRamProvider.getMem(),R=ZRamReader,h=R.header(m),n=R.objectCount(m,h),out=[];for(let i=1;i<=n;i++){const o=R.objectLinks(m,i);if(R.attr(o,H))out.push(i+':'+R.shortName(m,i)+(R.attr(o,T)?' TAKE':'')+' p='+o.parent+':'+R.shortName(m,o.parent))}return out},[+hid,+take]);
console.log(r.join('\n'));await b.close()})();
