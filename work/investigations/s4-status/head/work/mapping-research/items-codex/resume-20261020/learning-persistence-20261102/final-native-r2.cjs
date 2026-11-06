// Actual older native SAVE/RESTORE lifecycle; no VM or learned-data injection.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),http=require('http');
const {chromium}=require(process.cwd()+'/node_modules/playwright');
const phase=process.argv[2]||'restore-existing',out=path.join(__dirname,'final-native-r2-'+phase+'.json');if(fs.existsSync(out))throw Error('Refuse overwrite');
const hashes=()=>Object.fromEntries(fs.readdirSync('js').filter(f=>f.endsWith('.js')).map(f=>['js/'+f,crypto.createHash('sha256').update(fs.readFileSync('js/'+f)).digest('hex')]));
(async()=>{const repo=process.cwd(),server=http.createServer((req,res)=>{const name=path.resolve(repo,'.'+new URL(req.url,'http://localhost').pathname);if(!name.startsWith(repo+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(name,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',name.endsWith('.wasm')?'application/wasm':name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(b);});});await new Promise((r,j)=>{server.once('error',j);server.listen(47863,'127.0.0.1',r)});const pre=hashes(),producerHash=crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),events=[],ctx=await chromium.launchPersistentContext(path.join(__dirname,'final-native-profile'),{headless:true,viewport:{width:412,height:915}});let p,rows=[];
try{p=ctx.pages()[0]||await ctx.newPage();p.on('console',m=>{if(m.type()==='warning'||m.type()==='error')events.push({type:m.type(),text:m.text().slice(0,350)});});p.on('pageerror',e=>events.push({type:'pageerror',text:String(e)}));
await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1')});
await p.goto('http://127.0.0.1:47863/play.html?story=games/HugeCave.z8.js');await p.waitForTimeout(3500);
await p.evaluate(()=>{try{Message.Hide()}catch(e){}});
const snap=()=>p.evaluate(()=>{const text=Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine')).map(e=>e.textContent).join('\n');const mem=typeof ZRamProvider==='undefined'?null:ZRamProvider.getMem(),key=mem?AttrCalibrator.gameIdentityKey(mem):null,pool=typeof Actionable==='undefined'?[]:Actionable.payloadPool(),lamp=pool.find(o=>/lamp/i.test(o.name||''));const parse=s=>{try{return JSON.parse(s)}catch(e){return s}};return{text:text.slice(-5000),lineInput:!!document.querySelector('.Input.LineInput'),charInput:!!document.querySelector('.Input.CharInput'),identity:key,generation:typeof UndoRestoreSync==='undefined'?null:UndoRestoreSync.generation,lamp:lamp||null,objectCommands:lamp?ActionSynth.commandsForObject(lamp,'inventory').map(c=>({command:c.command,verb:c.verb,source:c.source})):[],yourselfCommands:lamp&&typeof EquipmentUI!=='undefined'?EquipmentUI.yourselfCommands(lamp).map(c=>({form:c.Form,enter:c.Enter})):[],table:AttrCalibrator.table,stored:key?parse(localStorage.getItem('PL_AttrCalib_'+key)):null,wordStored:key?parse(localStorage.getItem('PL_LearnedWordOverrides_'+key)):null,projection:LearnedWords._projection,pending:LearningStores.pending(),storageError:LearningStores.lastError(),room:WorldModel.lastPayload?.roomId,inventory:WorldModel.lastPayload?.inventory?.map(o=>({id:o.id,name:o.name,parent:o.parentId}))}});
rows=[{stage:'boot',state:await snap()}];
const captureRadial=async stage=>{await p.evaluate(()=>Actionable.Open('lamp','inventory',210,380,135));await p.waitForTimeout(200);const main=await p.locator('#radial-menu').innerText();const moreOpened=await p.evaluate(()=>{const e=[...document.querySelectorAll('#radial-menu button,#radial-menu [role=button],#radial-menu li,#radial-menu a')].find(e=>e.offsetParent!==null&&/^more(?:\.{3})?$/i.test(e.textContent.trim()));if(e){e.click();return true}return false});await p.waitForTimeout(150);const more=moreOpened?await p.locator('#radial-menu').innerText():null;await p.evaluate(()=>ParchLockQol.HideRadialMenu());rows.push({stage,renderedRadial:{entry:'actual Actionable.Open public renderer, no physical gesture claim',main,more},state:await snap()});};
const cmd=async s=>{if(!await p.locator('.Input.LineInput').count())throw Error('No line input for '+s);await p.locator('.Input.LineInput').fill(s);await p.keyboard.press('Enter');await p.waitForTimeout(650);rows.push({stage:s,state:await snap()})};
if(phase!=='boot'){
 let st=rows[0].state;if(st.charInput&&!st.lineInput){await p.locator('.Input.CharInput').focus();await p.keyboard.press('Space');await p.waitForTimeout(700);rows.push({stage:'native-start-space',state:await snap()});}
 for(let i=0;i<6;i++){st=await snap();if(!/restore a saved game|want.*instructions|need.*instructions|Please answer yes or no/i.test(st.text.slice(-450)))break;if(st.lineInput)await cmd('no');else if(st.charInput){await p.locator('.Input.CharInput').focus();await p.keyboard.press('n');await p.waitForTimeout(700);rows.push({stage:'native-no-startup-question',state:await snap()});}else throw Error('Startup question lacks usable input');}
 st=await snap();if(st.room!==113)throw Error('Initial End-of-Road room guard failed: '+st.room);
 await cmd('east');st=await snap();if(!st.lamp)throw Error('No scoped lamp after entering building');
 await cmd('take lamp');
 if(phase==='restore'||phase==='restore-existing'){
  if(phase==='restore'){
  await cmd('save');await p.locator('#dialog_infield').fill('before-learning');await p.locator('#dialog_accept').click();await p.waitForTimeout(900);
  rows.push({stage:'native-save-before-learning',state:await snap()});
  for(const s of ['light lamp','douse lamp','light lamp','douse lamp'])await cmd(s);
  }else{
   const known=await snap();if(known.stored?.objects?.['135']?.rememberedForms?.light?.observations!==2||known.stored?.objects?.['135']?.rememberedForms?.douse?.observations!==2)throw Error('Missing retained lesson from final-native-restore.json');
   rows.push({stage:'already-learned-before-any-light-command',origin:'Lesson and older native save created in final-native-restore.json; same executable/private profile, no imported/edited evidence.',state:known});
  }
  await p.waitForTimeout(500);await captureRadial('learned-before-restore');
  await cmd('light lamp');
  const generation=(await snap()).generation;
  await cmd('restore');const options=await p.locator('#dialog_select option').allTextContents();if(options.length!==1||!options[0].includes('before-learning'))throw Error('Unexpected native save list '+JSON.stringify(options));
  await p.locator('#dialog_select').selectOption({index:0});await p.locator('#dialog_accept').click();await p.waitForTimeout(1600);
  await cmd('look');const restored=await snap();if(restored.generation<=generation)throw Error('No actual restore generation transition');
  rows.push({stage:'native-older-save-restored-without-reteaching',state:restored});await captureRadial('radial-after-older-save-restore');
  const remembered=JSON.stringify(restored.stored.objects['135'].rememberedForms);
  await p.evaluate(()=>WorkspaceUI.ShowOptions());
  rows.push({stage:'existing-learning-settings',settings:await p.evaluate(()=>{const group=[...document.querySelectorAll('#game-options>details')].find(e=>e.querySelector('summary')?.textContent.includes('Learned words'));if(!group)throw Error('Missing existing Learned Words group');group.open=true;return{text:group.innerText,tracker:LearningStores.list(),records:LearnedWords.records().filter(r=>r.objectId==='135'&&['light','douse'].includes(r.trigger))};}),state:await snap()});
  await p.evaluate(()=>{Message.Hide();WorkspaceUI.ExitGame();});await p.locator('#exit-confirm').click();await p.waitForURL('**/index.html');
  rows.push({stage:'actual-unsaved-exit-library',state:await p.evaluate(key=>({text:'',identity:key,stored:JSON.parse(localStorage.getItem('PL_AttrCalib_'+key)),url:location.href}),restored.identity)});
  await p.goto('http://127.0.0.1:47863/play.html?story=games/HugeCave.z8.js');await p.waitForTimeout(3500);await p.evaluate(()=>{try{Message.Hide()}catch(e){}});
  rows.push({stage:'fresh-page-before-any-reteaching',state:await snap()});
  if(await p.locator('.Input.CharInput').count()){await p.locator('.Input.CharInput').focus();await p.keyboard.press('Space');await p.waitForTimeout(700);}
  if(/restore a saved game/i.test((await snap()).text.slice(-450)))await cmd('no');
  if((await snap()).room!==113)throw Error('Fresh restart room guard failed');
  await cmd('east');await cmd('take lamp');await captureRadial('fresh-reopen-learned-priority-no-reteaching');
  const reopened=await snap();if(JSON.stringify(reopened.stored.objects['135'].rememberedForms)!==remembered)throw Error('Remembered evidence changed without reteaching');
  if(!reopened.objectCommands.some(c=>c.command==='light lamp')||!reopened.objectCommands.some(c=>c.command==='douse lamp'))throw Error('Fresh item radial missing learned forms');
 }
 if(phase==='learn-ui'||phase==='reopen-ui')await captureRadial('rendered-before-teaching');
 if(phase.startsWith('learn'))for(const s of ['light lamp','douse lamp','light lamp','douse lamp'])await cmd(s);
 if(phase==='learn-ui')await captureRadial('rendered-after-teaching');
 await p.waitForTimeout(1400);rows.push({stage:'settled-before-close-no-save',state:await snap()});
 if(phase==='exit-flow'){
  const retainedKey=(await snap()).identity;
  await p.evaluate(()=>WorkspaceUI.ExitGame());await p.locator('#exit-confirm').click();await p.waitForURL('**/index.html');await p.waitForTimeout(800);
  rows.push({stage:'actual-exit-without-save-library',state:await p.evaluate(key=>{const raw=localStorage.getItem('PL_AttrCalib_'+key);return{text:'',identity:key,lamp:null,objectCommands:[],yourselfCommands:[],stored:raw?JSON.parse(raw):null,url:location.href}},retainedKey)});
  await p.goto('http://127.0.0.1:47863/play.html?story=games/HugeCave.z8.js');await p.waitForTimeout(3500);await p.evaluate(()=>{try{Message.Hide()}catch(e){}});rows.push({stage:'reopened-after-exit-no-restore',state:await snap()});
 }
}
fs.writeFileSync(out,JSON.stringify({phase,ts:new Date().toISOString(),tier:'ordinary typed commands in isolated persistent Chromium profile over local HTTP; actual native save and restore, no VM/learned-data injection',producerHash,pre,post:hashes(),events,rows},null,2),{flag:'wx'});
console.log(JSON.stringify({phase,events,stages:rows.map(r=>r.stage),stable:JSON.stringify(pre)===JSON.stringify(hashes())}));
}catch(e){if(!fs.existsSync(out))fs.writeFileSync(out,JSON.stringify({phase,error:String(e.stack),producerHash,pre,post:hashes(),events,rows},null,2),{flag:'wx'});throw e;}finally{await ctx.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e.stack);process.exitCode=1});
