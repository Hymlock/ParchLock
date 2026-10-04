const {chromium}=require('playwright'), assert=require('assert'), path=require('path'), {pathToFileURL}=require('url');
let checks=0;
function check(value, message) { assert(value,message); console.log('PASS:',message); checks++; }
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for (const width of [1280,360,320]) {
   const context=await browser.newContext({viewport:{width,height:850}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');localStorage.setItem('PL_TutorialSeen','1');localStorage.setItem('PL_MobileTutorialSeen','1');});
   await page.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/anchor.z8.js');
   await page.waitForTimeout(3500);
   await page.evaluate(()=>{if(Message.IsOpen)Message.Hide();});
   for(let i=0;i<8&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(300);}
   await page.waitForFunction(()=>AttributeSchema._getMem()&&Actionable.payloadPool().length);
   // Real story boot/owners; deterministic learned fixtures make every edit reproducible.
   const setup=await page.evaluate(()=>{
    const obj=LearnedWords.objects()[0]; if(!obj)throw Error('No verified scoped object');
    const verb=['rub','touch','smell','polish','kiss','wield'].find(v=>AttrCalibrator.dictionaryForm(v)&&!LearnedWords.independentForms(obj).includes(v));
    AttrCalibrator.hydrate(AttributeSchema._getMem());
    AttrCalibrator.table.objects[String(obj.id)]={exactForms:{[verb]:{confirmations:2}}};
    window.__lwTest={id:obj.id,verb,key:LearnedWords.rowKey('exact',obj.id,verb),before:JSON.stringify(AttrCalibrator.table)};
    const input=document.querySelector('.Input.LineInput'); if(input)input.value='unfinished player command';
    LearnedWords.open(); return {id:obj.id,verb};
   });
   check(await page.locator('.lw-tour').isVisible(),'first open shows independent tutorial '+width);
   if(width===360)await page.screenshot({path:'work/learned-words-tutorial-mobile.png'});
   await page.locator('.lw-tour button').filter({hasText:/^Skip$/}).click();
   check(await page.evaluate(()=>localStorage.getItem('PL_LearnedWordsTutorialSeen')==='1'&&localStorage.getItem('PL_TutorialSeen')==='1'),'Skip completes sibling key only '+width);
   check(await page.evaluate(()=>LearnedWords._section==='status'),'Status is the initial restored center panel '+width);
   await page.locator('.lw-section-header[data-section=learned]').click();
   const row=page.locator('.lw-entry').filter({hasText:'Remembered'}).first(); await row.locator(':scope > summary').click();
   const inputs=row.locator('.lw-fields input'); await inputs.nth(1).fill('Edited action'); await inputs.nth(0).focus();
   check(await row.locator(':scope > summary').innerText().then(t=>t.includes('Response: Edited action')),'blur autosaves with labeled summary '+width);
   check(await page.evaluate(()=>JSON.stringify(AttrCalibrator.table)===window.__lwTest.before),'editing preserves original evidence '+width);
   await inputs.nth(1).fill('Unsaved live draft');
   await page.evaluate(()=>{const r=AttrCalibrator.table.objects[String(window.__lwTest.id)].exactForms[window.__lwTest.verb];r.confirmations++;});
   await page.waitForTimeout(650);
   check(await inputs.nth(1).inputValue()==='Unsaved live draft','live learning preserves focused field '+width);
   await inputs.nth(1).fill('Edited action');await inputs.nth(0).focus();
   await row.locator('.lw-advanced > summary').click();
   check(await row.locator('.lw-advanced select option').count()===1,'Used in shows only compatible destination '+width);
   const phrase=row.locator('.lw-advanced input');await phrase.fill(setup.verb);await row.locator('.lw-advanced button').click();
   check(await row.locator('.lw-advanced').innerText().then(t=>t.includes('Exact match. No game command was run.')),'phrase check is local '+width);
   await row.locator('.lw-ignore input').check();
   check(await page.evaluate(()=>!AttrCalibrator.exactFormsFor(window.__lwTest.id).includes(window.__lwTest.verb)),'Ignore filters actual owner '+width);
   await page.locator('[data-action=undo]').click();
   check(await page.evaluate(()=>AttrCalibrator.exactFormsFor(window.__lwTest.id).includes(window.__lwTest.verb)),'Undo restores learned contribution '+width);
   await page.locator('[data-action=add]').click();
   check(await page.locator('[data-draft=true]').count()===1,'Add creates a draft '+width);
   await page.locator('#message #close').click();
   check(await page.evaluate(()=>!Message.IsOpen&&document.querySelector('.Input.LineInput').value==='unfinished player command'),'close discards incomplete draft and restores player prompt '+width);
   await page.evaluate(()=>LearnedWords.open());
   check(!await page.locator('.lw-tour').isVisible(),'reopening does not repeat tutorial '+width);
   check(await page.locator('[data-draft=true]').count()===0,'Undo/close never resurrect blank draft '+width);
   await page.locator('[data-action=help]').click();
   await page.keyboard.press('Escape');
   check(await page.evaluate(()=>localStorage.getItem('PL_LearnedWordsTutorialSeen')===null&&localStorage.getItem('PL_TutorialSeen')==='1'),'interrupted replay leaves main tutorial untouched '+width);
   await page.evaluate(()=>LearnedWords.open());
   check(await page.locator('.lw-tour').isVisible(),'interrupted tour returns '+width);
   for(let i=0;i<LearnedTourLength();i++) { const next=page.locator('.lw-tour button').filter({hasText:/^(Next|Finish)$/}); if(await next.isVisible())await next.click(); }
   check(await page.evaluate(()=>localStorage.getItem('PL_LearnedWordsTutorialSeen')==='1'),'Finish persists sibling completion '+width);
   check(await page.evaluate(()=>{const el=document.getElementById('learned-words');return el.scrollWidth<=el.clientWidth+1;}),'responsive editor has no horizontal overflow '+width);
   if(width===360||width===1280)await page.screenshot({path:'work/learned-words-implemented-'+width+'.png'});
   await page.locator('#message #close').click();
   const manual=await page.evaluate(()=>{
    const obj=LearnedWords.objects().find(o=>String(o.id)===String(window.__lwTest.id));
    const existing=ActionSynth.commandsForObject(obj,'room').map(c=>c.verb);
    return {id:obj.id,verb:['rub','touch','smell','polish','kiss','wield'].find(v=>AttrCalibrator.dictionaryForm(v)&&v!==window.__lwTest.verb&&!existing.includes(v))};
   });
   check(!!manual.verb,'dictionary-only manual fixture exists '+width);
   await page.evaluate(()=>LearnedWords.open());await page.locator('[data-action=add]').click();
   const draft=page.locator('[data-draft=true]');await draft.locator('.lw-fields select').selectOption(String(manual.id));
   await draft.locator('.lw-fields input').nth(0).fill(manual.verb);await draft.locator('.lw-fields input').nth(1).fill('My action');
   await page.locator('#message #close').click();
   check(await page.evaluate(({id,verb})=>LearnedWords.candidates(id).some(c=>c.form===verb&&c.label==='My action'&&!c.enter),manual),'valid Add UI autosaves a review-only suggestion '+width);
   const gates=await page.evaluate(({verb})=>{
    const obj=LearnedWords.objects().find(o=>String(o.id)===String(window.__lwTest.id));
    const legacy=ActionSynth.commandsForObject(obj,'room').find(c=>c.verb===verb);
    const semantic=SemanticActions.migrationCompatFormsFor(obj,'room').find(c=>c.verb===verb);
    const submit=Actionable.Submit; let sent=0;Actionable.Submit=()=>sent++;
    try{
      Actionable.Open(Actionable.referenceFor(obj).noun,'object',150,150,obj.id);
      const node=Array.from(document.querySelectorAll('#radial-menu button,#radial-menu .radial-item')).find(n=>n.textContent==='My action');
      if(node)node.click();
      return {legacy:legacy.Enter,semantic:semantic.Enter,sent,verb,node:!!node,prompt:document.querySelector('.Input.LineInput').value};
    }finally{Actionable.Submit=submit;ParchLockQol.HideRadialMenu();}
   },manual);
   check(gates.legacy===false&&gates.semantic===false,'legacy and semantic suggestions stay review-only '+width);
   check(gates.node&&gates.sent===0&&gates.prompt.toLowerCase().startsWith(gates.verb+' '),'actual radial selection fills without submitting '+width+' '+JSON.stringify(gates));
   const duplicateCases=await page.evaluate(()=>{
    const old={pool:Actionable.payloadPool,payload:WorldModel.lastPayload,more:Actionable.addMoreActions,radial:ParchLockQol.OpenRadial,submit:Actionable.Submit,nouns:Actionable.CommandNouns};
    const results=[];let captured,source;
    try{
     Actionable.addMoreActions=()=>{};ParchLockQol.OpenRadial=(x,y,s,c)=>captured={s,c};Actionable.Submit=(cmd,via)=>source=via;Actionable.CommandNouns={};
     for(const scenario of ['all-ground','mixed','all-held','worn','nested','three'])for(const reverse of [false,true]){
      const objects=[{id:9001,name:'pellet',aliases:['pellet'],attrs:{takeable:true}},{id:9002,name:'pellet',aliases:['pellet'],attrs:{takeable:true}}];
      if(scenario==='three')objects.push({...objects[1],id:9003});
      if(scenario==='worn')objects.forEach(o=>{o.attrs.worn=true;o.attrs.wearable=true;});
      if(scenario==='nested')objects.forEach(o=>o.parentId=8888);
      const held=scenario==='all-ground'?[]:scenario==='mixed'||scenario==='three'?[objects[0]]:objects;
      WorldModel.lastPayload={discoveredObjects:objects,inventory:held,playerId:1};
      const pool=objects.concat(held,objects);Actionable.payloadPool=()=>reverse?pool.slice().reverse():pool;
      const host=document.createElement('div');host.className='BufferLine';host.textContent='pellet';document.body.appendChild(host);
      Actionable.wrapFirstExact([host],'pellet',{objectId:9001,kind:reverse?'object':'inventory'});
      const mark=host.querySelector('.pl-act');captured=null;source=null;
      mark.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:100,button:2}));
      const commands=captured.s.map(c=>c.Command).filter(Boolean),take=commands.includes('take pellet');
      if(captured.s[0]&&captured.s[0].Action)captured.s[0].Action();
      results.push({scenario,reverse,owners:JSON.parse(mark.dataset.candidateIds).length,unbound:!mark.dataset.objectId&&captured.c.objectId===null,kind:mark.dataset.kind,take,source});host.remove();
     }
    }finally{Actionable.payloadPool=old.pool;WorldModel.lastPayload=old.payload;Actionable.addMoreActions=old.more;ParchLockQol.OpenRadial=old.radial;Actionable.Submit=old.submit;Actionable.CommandNouns=old.nouns;}
    return results;
   });
   check(duplicateCases.every(c=>c.unbound&&c.owners===(c.scenario==='three'?3:2)&&c.kind===(['all-ground','mixed','three'].includes(c.scenario)?'object':'inventory')&&c.take===['all-ground','mixed','three'].includes(c.scenario)&&c.source==='ambiguous-reference'),'real story contextmenu dispatch preserves mixed/all-held ownership and command source '+width+' '+JSON.stringify(duplicateCases));
   const beforeRestore=await page.evaluate(()=>JSON.stringify(LearnedWords.load()));
   await page.evaluate(()=>LearnedWords.open());
   await page.locator('.lw-section-header[data-section=learned]').click();
   const savedRow=page.locator('section[data-section=learned] .lw-entry').first();await savedRow.locator(':scope > summary').click();await savedRow.locator('.lw-fields input').nth(1).fill('Uncommitted restore draft');
   await page.evaluate(()=>UndoRestoreSync.generation++);await page.waitForTimeout(650);
   check(await page.evaluate(()=>!Message.IsOpen),'restore generation closes editor '+width);
   check(await page.evaluate(()=>JSON.stringify(LearnedWords.load()))===beforeRestore,'restore discards stale draft without overwriting valid override '+width);
   check(errors.length===0,'no browser errors '+width+': '+errors.join('; '));
   await context.close();
  }
 } finally {await browser.close();}
 console.log(checks+' live checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
function LearnedTourLength(){return 8;}
