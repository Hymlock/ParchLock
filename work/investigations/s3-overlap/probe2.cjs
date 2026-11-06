"use strict";
const path=require("path"),{pathToFileURL}=require("url");
const ROOT=path.resolve(__dirname,"../../..");const {chromium}=require(ROOT+"/node_modules/playwright");
const OUT=__dirname;
(async()=>{const b=await chromium.launch();const res={};
for(const vw of [360,396,412,1280]){const p=await b.newPage({viewport:{width:vw,height:vw<768?800:900}});
await p.addInitScript(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x80000000;};});
await p.addInitScript(()=>{sessionStorage.setItem("PL_ParchLockSplashSeen","1");for(const k of["PL_TutorialSeen","PL_MobileTutorialSeen","PL_LearnedWordsTutorialSeen"])localStorage.setItem(k,"1");});
await p.goto(pathToFileURL(path.join(ROOT,"play.html")).href+"?story=games/anchor.z8.js");await p.waitForTimeout(2500);
const settle=async()=>{for(let i=0;i<30;i++){await p.evaluate(()=>{document.querySelector(".parchlock-splash__start")?.click();try{Message.Hide()}catch(e){}});if(await p.locator(".Input.LineInput").count())return;await p.keyboard.press("Space");await p.waitForTimeout(500);}};
await settle();for(const c of["look"]){await p.evaluate(c=>{Input.Clear();Input.Inject(c,true)},c);await p.waitForTimeout(1500);await settle();}
res[vw]=await p.evaluate(()=>{let hdr=null;try{const m=ZRamProvider.getMem();hdr={w21:m.getUint8(0x21),h20:m.getUint8(0x20),w22:m.getUint16(0x22),fw26:m.getUint8(0x26),fh27:m.getUint8(0x27)}}catch(e){hdr=String(e)}window.__hdr=hdr;const g=document.querySelector("#windowport .GridWindow");const tp=document.querySelector("#layout_test_pane");
const lines=g?[...g.querySelectorAll(".GridLine")].map(l=>({t:l.textContent,len:l.textContent.length,w:l.getBoundingClientRect().width,sw:l.scrollWidth})):[];
const gs=g&&getComputedStyle(g);const tl=tp&&tp.querySelector(".GridWindow");const tls=tl&&getComputedStyle(tl);const gl=g&&g.querySelector(".GridLine");const gls=gl&&getComputedStyle(gl);
const spans=gl?[...gl.children].map(s=>{const r=s.getBoundingClientRect();return{t:s.textContent,x:Math.round(r.left),w:Math.round(r.width),fs:getComputedStyle(s).fontSize,ff:getComputedStyle(s).fontFamily}}):[];
const st=document.querySelector("#pl-stats");const sr=st&&st.getBoundingClientRect();const gr=g&&g.getBoundingClientRect();
return{hdr:window.__hdr,lines,spans,grid:gr&&{l:gr.left,t:gr.top,w:gr.width,h:gr.height,ff:gs.fontFamily,fs:gs.fontSize,ls:gs.letterSpacing},gridLineFS:gls&&gls.fontSize,
testPane:tls&&{ff:tls.fontFamily,fs:tls.fontSize,html:tp.innerHTML.slice(0,300)},stats:st&&{t:st.textContent.slice(0,120),l:sr.left,t2:sr.top,w:sr.width,h:sr.height,vis:getComputedStyle(st).display},
metrics:(()=>{try{return Glk&&GlkOte&&null}catch(e){return null}})()};});
await p.screenshot({path:path.join(OUT,`anchor2-${vw}.png`),clip:{x:0,y:0,width:vw,height:220}});await p.close();}
console.log(JSON.stringify(res,null,1));await b.close();})();
