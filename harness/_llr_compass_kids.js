const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);
(async()=>{
  const chrome=process.env.PW_CHROME||"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser=await chromium.launch({executablePath:chrome,headless:true});
  const page=await browser.newPage();
  await page.addInitScript(()=>{localStorage.setItem("PL_MobileTutorialSeen","1");localStorage.setItem("PL_TutorialSeen","1");});
  await page.goto(pathToFileURL(path.resolve("play.html")).href+"?story=games/LLR3.z8.js&t="+Date.now(),{waitUntil:"domcontentloaded"});
  await page.waitForTimeout(350);
  await page.evaluate(()=>{const s=document.querySelector(".parchlock-splash__start"); if(s)s.click(); try{Message.Hide();}catch(e){}});
  await page.waitForTimeout(1600);
  for(let i=0;i<25;i++){ if(await page.evaluate(()=>!!document.querySelector(".Input.LineInput"))) break; await page.keyboard.press("Space").catch(()=>{}); await page.waitForTimeout(200); }
  if(await page.evaluate(()=>/restore a saved game/i.test(document.body.innerText||""))){ await page.evaluate(()=>{Input.Clear();Input.Inject("no",true);}); await page.waitForTimeout(1200); }
  for(let i=0;i<30;i++){ const ok=await page.evaluate(()=>{try{ZvmCapture.tick();return!!ZRamProvider.getMem();}catch(e){return false;}}); if(ok)break; await page.waitForTimeout(200); }
  const info=await page.evaluate(()=>{
    const mem=ZRamProvider.getMem();
    const kids=ZRamReader.children(mem,6)||[];
    const out=kids.map(id=>{
      const props={};
      for(let p=1;p<=40;p++){ const v=ZRamReader.readProp(mem,id,p); if(v!=null&&v!==0) props[p]=v; }
      const words=(ZRamReader.parserWordsAny&&ZRamReader.parserWordsAny(mem,id))||[];
      const name=ZRamReader.shortName(mem,id)||"";
      const attrs=ZRamReader.attrsFromObject(mem,id)||{};
      return {id,name,words,props,kind:props[2],door_dir:props[21]};
    });
    // Why directionDoorDirs failed
    const debug=[];
    for (let id=1; id<=96; id++) {
      const ch=ZRamReader.children(mem,id);
      if (ch.length>=8) {
        const rows=ch.map(k=>({k, dd:ZRamReader.readProp(mem,k,21), kind:ZRamReader.readProp(mem,k,2), name:ZRamReader.shortName(mem,k)||"", words:(ZRamReader.parserWordsAny&&ZRamReader.parserWordsAny(mem,k))||[]}));
        debug.push({id, name:ZRamReader.shortName(mem,id)||"", nKids:ch.length, rows});
      }
    }
    return {kids:out, debug};
  });
  console.log(JSON.stringify(info,null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
