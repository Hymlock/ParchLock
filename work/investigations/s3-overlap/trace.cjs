"use strict";
const path=require("path"),{pathToFileURL}=require("url");
const ROOT=path.resolve(__dirname,"../../..");const {chromium}=require(ROOT+"/node_modules/playwright");
(async()=>{const b=await chromium.launch();
for(const vw of [396,1280]){const p=await b.newPage({viewport:{width:vw,height:850}});
await p.addInitScript(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x80000000;};});
await p.addInitScript(()=>{sessionStorage.setItem("PL_ParchLockSplashSeen","1");for(const k of["PL_TutorialSeen","PL_MobileTutorialSeen","PL_LearnedWordsTutorialSeen"])localStorage.setItem(k,"1");
window.__log=[];const t=setInterval(()=>{if(window.GlkOte&&GlkOte.update&&!GlkOte.__w){const o=GlkOte.update;GlkOte.update=function(a){try{(a.content||[]).forEach(c=>{if(c.lines)window.__log.push(JSON.stringify(c).slice(0,600))});if(a.windows)window.__log.push("WIN "+JSON.stringify(a.windows))}catch(e){}return o.apply(this,arguments)};GlkOte.__w=1;}},5);});
await p.goto(pathToFileURL(path.join(ROOT,"play.html")).href+"?story=games/anchor.z8.js");await p.waitForTimeout(2500);
for(let i=0;i<30;i++){await p.evaluate(()=>{document.querySelector(".parchlock-splash__start")?.click();try{Message.Hide()}catch(e){}});if(await p.locator(".Input.LineInput").count())break;await p.keyboard.press("Space");await p.waitForTimeout(500);}
console.log("== "+vw);console.log((await p.evaluate(()=>window.__log)).join("\n"));await p.close();}
await b.close();})();
