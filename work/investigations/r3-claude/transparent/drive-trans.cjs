// usage (cwd = repo root): node drive-trans.cjs <Story.z3.js> <TRANS> <CONT> <OPEN> <cmdsfile> <out.json>
// Lines in cmdsfile beginning with "?" are probe commands (recorded with probe:true).
const path=require('path'),fs=require('fs'),{pathToFileURL}=require('url');const R=process.cwd();
const { chromium } = require(R + '/node_modules/playwright');
const [story,TB,CB,OB,cmdf,outf]=process.argv.slice(2);
const cmds=fs.readFileSync(cmdf,'utf8').split('\n').map(s=>s.trim()).filter(Boolean);
(async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage();
await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');try{localStorage.setItem('PL_MobileTutorialSeen','1');localStorage.setItem('PL_TutorialSeen','1');}catch(e){}});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story,{waitUntil:'domcontentloaded'});
await p.waitForTimeout(2500);await p.evaluate(()=>{const s=document.querySelector('.parchlock-splash__start');if(s)s.click();try{Message.Hide()}catch(e){}});
await p.waitForTimeout(2000);
const waitLine=async()=>{for(let i=0;i<40;i++){if(await p.locator('.Input.LineInput').count())return;await p.keyboard.press('Space').catch(()=>{});await p.waitForTimeout(250);}};
const more=async()=>{for(let i=0;i<8;i++){const m=await p.evaluate(()=>!document.querySelector('.Input.LineInput'));if(!m)break;await p.keyboard.press('Space');await p.waitForTimeout(300);}};
await waitLine();
const census=()=>p.evaluate(([TB,CB,OB])=>{const m=ZRamProvider.getMem();const h=ZRamReader.header(m);const first=h.objTable+h.defaultsWords*2;const L1=ZRamReader.objectLinks(m,1);const n=Math.floor(((L1.props||L1.prop||L1.propAddr)-first)/h.entrySize);
const kids=id=>{const r=[];let c=ZRamReader.objectLinks(m,id).child;let g=0;while(c&&g++<60){r.push({id:c,n:ZRamReader.shortName(m,c)});c=ZRamReader.objectLinks(m,c).sibling;}return r;};
const rows=[];for(let i=1;i<=n;i++){const L=ZRamReader.objectLinks(m,i);const t=!!ZRamReader.attr(L,+TB),c=!!ZRamReader.attr(L,+CB);if(!t&&!c)continue;rows.push({id:i,name:ZRamReader.shortName(m,i),parent:L.parent,trans:t,container:c,open:!!ZRamReader.attr(L,+OB),contents:kids(i)});}
return {count:n,rows};},[TB,CB,OB]);
const initC=await census();
const out={story,bits:{trans:+TB,container:+CB,open:+OB},objectCount:initC.count,
 carriers:initC.rows.filter(r=>r.trans),closedOpaqueWithContents:initC.rows.filter(r=>!r.trans&&r.container&&!r.open&&r.contents.length),steps:[]};
for(const raw of cmds){const probe=raw[0]==='?';const c=probe?raw.slice(1).trim():raw;const b0=await p.evaluate(()=>document.querySelectorAll(".BufferLine").length);
await p.evaluate(c=>{try{Message.Hide()}catch(e){}Input.Clear();Input.Inject(c,true);},c);await p.waitForTimeout(900);await more();
const st={cmd:c};if(probe){st.probe=true;const t=await p.evaluate(()=>[...document.querySelectorAll(".BufferLine")].map(l=>l.textContent));st.reply=t.slice(Math.max(0,b0)).join(" / ").replace(/\s+/g,' ').slice(0,900);const cc=await census();st.transRows=cc.rows.filter(r=>r.trans&&r.container&&r.contents.length).map(r=>({id:r.id,name:r.name,parent:r.parent,open:r.open,contents:r.contents.map(x=>x.n)}));st.closedOpaque=cc.rows.filter(r=>!r.trans&&r.container&&!r.open&&r.contents.length).map(r=>({id:r.id,name:r.name,parent:r.parent,contents:r.contents.map(x=>x.n)}));}
out.steps.push(st);}
const fin=await census();out.finalTransContainers=fin.rows.filter(r=>r.trans&&r.container);
fs.writeFileSync(outf,JSON.stringify(out,null,1));await b.close();})();
