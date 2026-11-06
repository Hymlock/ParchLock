const path=require('path');const{pathToFileURL}=require('url');
(async()=>{const{chromium}=require(process.cwd()+'/node_modules/playwright');const b=await chromium.launch();const p=await b.newPage();
await p.addInitScript(()=>{let A=0,iv=0,ct=0;const fr=function(t){t=t<<16>>16;if(t<=0){const v=-t;if(v===0){A=0;iv=0}else if(v<1000){ct=0;iv=v}else{A=v>>>0;iv=0}return 0}let r;if(iv){r=ct++;if(ct===iv)ct=0}else{A=(Math.imul(0x015a4e35,A)+1)>>>0;r=(A>>>16)&0x7fff}return r%t+1};let cur;Object.defineProperty(window,'__PARCHLOCK_ZVM__',{configurable:true,get(){return cur},set(v){cur=v;if(v&&!v.__jr){v.__jr=1;v.random=fr}}});sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const x of['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(x,'1')});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/Sorcerer.z3.js');await p.waitForTimeout(3500);
const settle=async()=>{for(let i=0;i<20&&!await p.locator('.Input.LineInput').count();i++){const c=p.locator('.Input.CharInput');if(await c.count()){await c.first().focus();await p.keyboard.press('Space')}await p.waitForTimeout(200)}};
const txt=()=>p.evaluate(()=>document.querySelector('#windowport').innerText);
const cmd=async c=>{const before=(await txt()).length;await p.locator('.Input.LineInput').fill(c);await p.keyboard.press('Enter');await p.waitForTimeout(700);await settle();return (await txt()).slice(before)};
await settle();
const dump=()=>p.evaluate(()=>{const m=ZRamProvider.getMem();const R=ZRamReader;let book=0;const nm=i=>{try{return R.shortName(m,i)}catch(e){return '?'}};for(let i=1;i<=255;i++)if(nm(i)==='spell book'){book=i;break}
const hex=i=>Array.from(R.objectLinks(m,i).attrBytes).map(x=>x.toString(16).padStart(2,'0')).join('');const bits=i=>{const a=R.objectLinks(m,i).attrBytes,o=[];for(let k=0;k<32;k++)if(a[k>>3]&(128>>(k&7)))o.push(k);return o};
const L=R.objectLinks(m,book);const kids=[];let c=L.child;while(c){kids.push({id:c,name:nm(c),attr:hex(c),bits:bits(c),ndesc:bits(c).includes(9)});c=R.objectLinks(m,c).sibling}
return{book,bookName:nm(book),bookAttr:hex(book),bookBits:bits(book),parent:L.parent,parentName:nm(L.parent),here:m.getUint16(m.getUint16(0x0c)),hereName:nm(m.getUint16(m.getUint16(0x0c))),kids}});
const out={start:await dump()};out.intro=(await txt()).slice(-1500);
for(const c of['i','read book','examine frotz spell','examine gnusto spell','read frotz spell','learn frotz'])out['cmd:'+c]=await cmd(c);
out.after=await dump();console.log(JSON.stringify(out,null,1));await b.close()})();
