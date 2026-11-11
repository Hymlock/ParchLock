// Bounded real-UI regressions against source. Fixtures/receipts stay in private scratch, not releases.
const fs=require('fs'),path=require('path'),http=require('http');
const repo=process.env.PARCHLOCK_SOURCE_ROOT, work=process.env.PARCHLOCK_REGRESSION_WORK;
const {chromium}=require(path.join(repo,'node_modules/playwright'));
fs.mkdirSync(work,{recursive:true});
function decode(name) {
  const text=fs.readFileSync(path.join(repo,'games',name),'utf8');
  const match=text.match(/processBase64Zcode\(\s*['"]([A-Za-z0-9+/=\s]+)['"]\s*\)/);
  if(!match)throw new Error('Unsupported fixture wrapper: '+name);
  return Buffer.from(match[1].replace(/\s/g,''),'base64');
}
const cases=[['catseye.z3.js','z3'],['Advent.z5.js','z5'],['anchor.z8.js','z8'],['Accuse.zblorb.js','zblorb'],['Alabaster.gblorb.js','gblorb']].map(([name,format])=>({name,format,bytes:decode(name)}));
const blorb=cases.find(c=>c.format==='gblorb').bytes;
for(let offset=12;offset+8<=blorb.length;) {
  const kind=blorb.toString('ascii',offset,offset+4),size=blorb.readUInt32BE(offset+4);
  if(kind==='GLUL'){cases.push({name:'Alabaster-executable.ulx',format:'ulx',bytes:blorb.subarray(offset+8,offset+8+size)});break;}
  offset+=8+size+(size%2);
}
if(!cases.some(c=>c.format==='ulx'))throw new Error('Missing genuine Glulx fixture');
for(const c of cases){c.file=path.join(work,c.name.replace(/\.js$/,''));fs.writeFileSync(c.file,c.bytes);}
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.ico':'image/x-icon'};
(async()=>{
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(repo,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
    if(!file.startsWith(path.resolve(repo)+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  const receipt={scope:'Desktop Chromium against current source, real Modules picker/change handler and imported story playback. Not signed APK, all stories, all learning/save paths or Z4 acceptance.',imports:[],playback:[],gaps:['No authentic Z4 fixture tested','Android signed APK import/playback not covered','Save/restore and learning lifecycle regressions not yet covered']};
  try {
    browser=await chromium.launch({headless:true});const context=await browser.newContext();
    await context.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');});
    let page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');
    const start=page.locator('.parchlock-splash__start');if(await start.isVisible())await start.click();
    const skip=page.getByRole('button',{name:'Skip tour',exact:true});if(await skip.isVisible())await skip.click();
    await page.locator('#games-list .game').first().waitFor({state:'attached',timeout:30000});
    await page.locator('#modules').click();
    await page.locator('#pl-module-files').setInputFiles(cases.map(c=>c.file));
    await page.waitForFunction(()=>document.querySelector('#pl-module-progress')?.textContent.includes('6 added'),null,{timeout:60000});
    receipt.imports=await page.evaluate(()=>ModuleLibrary.all().filter(entry=>entry.Local));
    if(receipt.imports.length!==6)throw new Error('Expected six installed stories');
    await page.locator('#pl-module-files').setInputFiles(path.join(repo,'games','Advent.z5.js'));
    await page.waitForFunction(()=>document.querySelector('#pl-module-progress')?.textContent.includes('1 already present'));
    receipt.duplicatePass=(await page.evaluate(()=>ModuleLibrary.all().filter(entry=>entry.Local).length))===6;
    await page.close();page=await context.newPage();
    const playbackCases=receipt.imports.map(item=>({...item,offline:false})).concat(receipt.imports.filter(item=>['z5','ulx'].includes(item.Format)).map(item=>({...item,offline:true})));
    for(const item of playbackCases) {
      const result={format:item.Format,path:item.Filename,offline:item.offline,errors:[]};
      const listener=error=>result.errors.push(String(error));page.on('pageerror',listener);
      try {
        if(item.offline) {
          await page.evaluate(()=>navigator.serviceWorker.ready);
          if(!await page.evaluate(()=>!!navigator.serviceWorker.controller))throw new Error('No controlling service worker for offline regression');
        }
        await context.setOffline(item.offline);
        await page.goto('http://127.0.0.1:'+server.address().port+'/play.html?story='+encodeURIComponent(item.Filename));
        await page.locator('#message #close').click({timeout:3000}).catch(()=>{});
        await page.waitForFunction(()=>document.querySelector('#windowport input.Input') || (document.querySelector('#errorpane')?.offsetParent && document.querySelector('#errorcontent')?.textContent.trim()),null,{timeout:45000});
        result.before=await page.locator('#windowport').innerText();
        result.errorPane=await page.evaluate(()=>document.querySelector('#errorpane')?.offsetParent ? document.querySelector('#errorcontent')?.textContent || '' : '');
        result.eamonActive=await page.evaluate(()=>!!window.__PARCHLOCK_EAMON__);
        const input=page.locator('#windowport input.Input');
        if(result.errorPane.trim()||result.eamonActive||!(await input.count()))throw new Error('Wrong engine or missing ordinary story input: '+result.errorPane);
        const character=await input.evaluate(node=>node.className.includes('CharInput'));
        if(character)await input.press('Space');else {await input.fill('look');await input.press('Enter');}
        await page.waitForTimeout(300);
        result.after=await page.locator('#windowport').innerText();
        result.pass=result.before.trim().length>0&&result.after!==result.before&&!result.eamonActive;
        if(item.Format==='z5'&&!item.offline&&process.env.PARCHLOCK_REGRESSION_SAVE_PROBE) {
          for(const command of ['in','take lamp','light lamp','switch off lamp','light lamp','switch off lamp']) {
            const before=await page.locator('#windowport').innerText();
            const line=page.locator('#windowport input.LineInput');await line.fill(command);await line.press('Enter');
            await page.waitForFunction(text=>document.querySelector('#windowport')?.innerText!==text,before,{timeout:12000});
          }
          const line=page.locator('#windowport input.LineInput');await line.fill('save');await line.press('Enter');
          await page.locator('#dialog_infield').fill('g1-regression-slot');
          await page.locator('#dialog_accept').click();
          await page.locator('#windowport input.LineInput').waitFor({state:'visible'});
          const move=page.locator('#windowport input.LineInput');await move.fill('out');await move.press('Enter');
          await page.waitForTimeout(150);
          const restore=page.locator('#windowport input.LineInput');await restore.fill('restore');await restore.press('Enter');
          await page.locator('#dialog_accept').waitFor({state:'visible'});
          result.saveProbe=await page.evaluate(()=>({text:document.body.innerText.slice(-4500),inputs:[...document.querySelectorAll('input,select,button')].filter(node=>node.offsetParent!==null).map(node=>({id:node.id,type:node.type,text:node.textContent,value:node.value})),learningKeys:Object.keys(localStorage).filter(key=>/AttrCalib|SemanticActions|LearnedWordOverrides|ExitCalib|ModuleLearningOwner/.test(key))}));
          result.saveProbe.dialog=await page.locator('#dialog').evaluate(node=>node.outerHTML).catch(()=> '');
          await page.locator('#dialog_select').selectOption({index:0});
          await page.locator('#dialog_accept').click();
          await page.locator('#windowport input.LineInput').waitFor({state:'visible'});
          result.saveProbe.restoredStatus=await page.locator('#windowport .GridWindow').innerText();
          result.saveProbe.restorePass=result.saveProbe.restoredStatus.includes('Inside Building');
          const learnedBefore=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('PL_AttrCalib_')).map(key=>[key,localStorage.getItem(key)])));
          await page.reload();
          await page.locator('#message #close').click({timeout:1000}).catch(()=>{});
          await page.locator('#windowport input.LineInput').waitFor({state:'visible'});
          result.saveProbe.learningRecordSurvivedReload=await page.evaluate(before=>Object.keys(before).length>0&&Object.entries(before).every(([key,value])=>localStorage.getItem(key)===value),learnedBefore);
          result.pass=result.pass&&result.saveProbe.restorePass&&result.saveProbe.learningRecordSurvivedReload;
          fs.writeFileSync(path.join(work,'normal-z5-save-probe.json'),JSON.stringify(result.saveProbe,null,2));
        }
      }catch(error){result.pass=false;result.failure=String(error);}
      page.off('pageerror',listener);receipt.playback.push(result);
    }
    if(process.env.PARCHLOCK_REGRESSION_SAVE_PROBE)receipt.gaps[2]='One Z5 save/restore and exact AttrCalib record reload tested; remaining save/learning/settings paths still open';
    receipt.pass=receipt.duplicatePass&&receipt.playback.length===8&&receipt.playback.every(result=>result.pass);
    fs.writeFileSync(path.join(work,'existing-module-regression.json'),JSON.stringify(receipt,null,2));
    console.log(JSON.stringify({pass:receipt.pass,duplicatePass:receipt.duplicatePass,playback:receipt.playback.map(({format,offline,pass,failure,errorPane})=>({format,offline,pass,failure,errorPane})),gaps:receipt.gaps}));
    if(!receipt.pass)process.exitCode=1;
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
