const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);
async function boot(page, story) {
  await page.addInitScript(() => { localStorage.setItem("PL_MobileTutorialSeen","1"); localStorage.setItem("PL_TutorialSeen","1"); });
  await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/" + story + "&t=" + Date.now(), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(350);
  await page.evaluate(() => { const s=document.querySelector(".parchlock-splash__start"); if(s)s.click(); try{Message.Hide();}catch(e){} });
  await page.waitForTimeout(1600);
  for (let i=0;i<25;i++){ if(await page.evaluate(()=>!!document.querySelector(".Input.LineInput"))) break; await page.keyboard.press("Space").catch(()=>{}); await page.waitForTimeout(200); }
  if (await page.evaluate(()=>/restore a saved game/i.test(document.body.innerText||""))) { await page.evaluate(()=>{Input.Clear();Input.Inject("no",true);}); await page.waitForTimeout(1200); }
  for (let i=0;i<30;i++){ const ok=await page.evaluate(()=>{try{ZvmCapture.tick();return!!(ZRamProvider.getMem()&&ZRamReader.header(ZRamProvider.getMem()));}catch(e){return false;}}); if(ok)break; await page.waitForTimeout(200); }
}
(async()=>{
  const chrome=process.env.PW_CHROME||"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser=await chromium.launch({executablePath:chrome,headless:true});
  for (const story of ["LLR3.z8.js","anchor.z8.js"]) {
    const page=await browser.newPage();
    await boot(page, story);
    const info=await page.evaluate(()=>{
      const mem=ZRamProvider.getMem();
      const h=ZRamReader.header(mem);
      const count=ZRamReader.objectCount(mem,h);
      // Find objects named like compass directions
      const dirs=[];
      for (let id=1; id<=Math.min(count,400); id++) {
        let nm=""; try{nm=ZRamReader.shortName(mem,id)||"";}catch(e){}
        if (!/^(north|south|east|west|northeast|northwest|southeast|southwest|up|down|in|out|n_to|s_to)$/i.test(nm.trim())) continue;
        const props={};
        for (let p=1;p<=40;p++){ const v=ZRamReader.readProp(mem,id,p); if(v!=null&&v!==0) props[p]=v; }
        const words=(ZRamReader.parserWordsAny&&ZRamReader.parserWordsAny(mem,id))||[];
        const links=ZRamReader.objectLinks(mem,id);
        dirs.push({id,nm,props,words,parent:links&&links.parent,child:links&&links.child});
      }
      const doorDirs=ZRamReader.directionDoorDirs(mem);
      // Also find parent named compass
      const compass=[];
      for (let id=1;id<=Math.min(count,400);id++){
        let nm=""; try{nm=ZRamReader.shortName(mem,id)||"";}catch(e){}
        if (/compass/i.test(nm)) {
          const kids=(ZRamReader.children(mem,id)||[]).map(k=>({id:k,name:ZRamReader.shortName(mem,k)||""}));
          compass.push({id,nm,kids});
        }
      }
      return {story, doorDirs, dirs, compass, profile: ZRamReader.directionProps.PROFILE};
    });
    console.log("====", story, "====");
    console.log(JSON.stringify(info, null, 2).slice(0, 5000));
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
