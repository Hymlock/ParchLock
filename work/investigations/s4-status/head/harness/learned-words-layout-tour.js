const { chromium } = require('playwright'), assert = require('assert'), path = require('path'), {pathToFileURL} = require('url');
let checks=0;
function check(value,text){assert(value,text);checks++;console.log('PASS:',text.split(' {')[0]);}
async function boot(browser,width,height){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),page=await context.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');localStorage.setItem('PL_TutorialSeen','1');localStorage.setItem('PL_LearnedWordsTutorialSeen','1');});
 await page.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/anchor.z8.js');await page.waitForTimeout(3500);
 await page.evaluate(()=>{if(Message.IsOpen)Message.Hide();['learned','actions','names','status'].forEach(k=>Global.Prefs['LearnedWordsShow_'+k]=true);});
 for(let i=0;i<8&&!await page.locator('.Input.LineInput').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(300);}
 await page.waitForFunction(()=>LearnedWords.objects().length);
 return {context,page};
}
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const [width,height,kb] of [[1280,850,0],[360,850,300],[320,640,0],[800,360,0]]){
  const {context,page}=await boot(browser,width,height);
  // Isolate editor short-height geometry from the existing phone-landscape rotation overlay.
  if(width>height) await page.evaluate(()=>document.querySelector('#pl-portrait-prompt').remove());
  if(width===1280){
   const result=await page.evaluate(()=>{
    const results=[],pool=Actionable.payloadPool,before=JSON.stringify(Actionable.VerifiedNouns);
    function run(html,phrase,order,duplicate){
     const host=document.createElement('div');host.innerHTML=html;document.body.appendChild(host);
     Actionable.payloadPool=()=>duplicate?[{id:1,name:phrase},{id:2,name:phrase}]:[{id:1,name:phrase}];
     const lines=Array.from(host.children),meta={kind:'inventory',objectId:1};
     const originalText=host.textContent;
     Actionable.wrapFirstExact(order?lines.slice().reverse():lines,phrase,meta);
     const originalMark=host.querySelector('.pl-act');
     Actionable.relocateExactMarks(order?lines.slice().reverse():lines);
     const marks=host.querySelectorAll('.pl-act'),mark=marks[0];
     const data={count:marks.length,line:mark&&Array.from(host.children).indexOf(mark.closest('.line')),tail:mark&&mark.nextSibling&&mark.nextSibling.textContent,
       parent:mark&&mark.parentElement.tagName,objectId:mark&&mark.dataset.objectId,candidateIds:mark&&mark.dataset.candidateIds,sameNode:mark===originalMark,textUnchanged:host.textContent===originalText};
     host.remove();return data;
    }
    try{
     results.push(run('<p class="line">empty canteen then empty canteen.</p>','empty canteen'));
     results.push(run('<p class="line">canteen</p><p class="line">Inventory: canteen.</p>','canteen',true));
     results.push(run('<p class="line">canteen <em>canteen</em></p>','canteen'));
     results.push(run('<p class="line">canteen</p><p class="line"><a>canteen</a><span class="Style_input">canteen</span><span class="Style_subheader">canteen</span></p>','canteen'));
     results.push(run('<p class="line">canteen</p><p class="line">canteens canteenish.</p>','canteen'));
     results.push(run('<p class="line">canteen</p><p class="line">canteen</p>','canteen',true,true));
     results.push(run('<p class="line">scribbled note</p><p class="line">scribbled note then scrap of paper</p>','scribbled note'));
     results.push(run('<p class="line">food pellet</p><p class="line">food pellet then pellets</p>','food pellet'));
     return {results,verifiedUnchanged:JSON.stringify(Actionable.VerifiedNouns)===before};
    }finally{Actionable.payloadPool=pool;}
   });
   check(result.results[0].tail==='.'&&result.results[0].count===1,'last word-bounded repeat inside one text node');
   check(result.results[1].line===1,'actual DOM order wins over reversed activeLines for inventory repeat');
   check(result.results[2].parent==='EM','last occurrence across styled text nodes');
   check(result.results[3].line===0,'links and input/subheader exclusions remain');
   check(result.results[4].line===0,'longer-token substring does not become a match');
   check(!result.results[5].objectId&&JSON.parse(result.results[5].candidateIds).length===2,'duplicate-name ambiguity metadata stays unresolved');
   check(result.results[6].tail===' then scrap of paper'&&result.results[7].tail===' then pellets','different phrases do not steal the selected phrase');
   check(result.results.every(r=>r.sameNode&&r.count===1&&r.textUnchanged)&&result.verifiedUnchanged,'same single mark moves without prose or VerifiedNouns changes');
  }
  await page.evaluate(({kb,height})=>{
   AttrCalibrator.hydrate(AttributeSchema._getMem());for(let i=0;i<80;i++)AttrCalibrator.table.objects[String(100000+i)]={exactForms:{examine:{confirmations:2}}};
   document.documentElement.style.setProperty('--pl-layout-height',height+'px');document.documentElement.style.setProperty('--pl-kb-inset',kb+'px');
   LearnedWords.open();window.__spoken=[];window.__stops=0;ReadAloud.stop=()=>window.__stops++;ReadAloud.speak=text=>window.__spoken.push(text);
  },{kb,height});
  await page.waitForTimeout(400); // Existing Message top transition must settle before geometry assertions.
  function geometry(){return page.evaluate(()=>{
   const limit=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pl-layout-height'))-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pl-kb-inset'));
   const rects=Array.from(document.querySelectorAll('.lw-section-header,#message #close,.lw-toolbar')).map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};});
   const center=document.querySelector('.lw-center');
   return {reachable:rects.every(r=>r.top>=0&&r.bottom<=limit+1&&r.left>=0&&r.right<=document.documentElement.clientWidth+1),center:!!center&&center.clientHeight>0,scroll:getComputedStyle(center).overflowY,headers:document.querySelectorAll('.lw-section-header').length,open:document.querySelectorAll('.lw-section-header[aria-expanded=true]').length};
  });}
  check(await page.evaluate(()=>LearnedWords._section==='learned'&&document.querySelector('.lw-toolbar').classList.contains('lw-icons')),'initial Edit Learned Words panel and collapsed accessible toolbar '+width);
  let g=await geometry();check(g.reachable&&g.center&&g.headers===4&&g.open===1,'fixed headers/X and usable center '+width+' '+JSON.stringify(g));
  check(g.scroll==='auto'&&await page.evaluate(()=>getComputedStyle(document.querySelector('#message')).overflowY==='hidden'&&getComputedStyle(document.querySelector('#message > div')).overflowY==='hidden'),'only central editor pane scrolls '+width);
  await page.evaluate(()=>{document.querySelector('.lw-center').scrollTop=300;});const before=await geometry();check(before.reachable,'headers remain reachable after long-list scroll '+width);
  await page.locator('.lw-section-header[data-section=learned]').click();check(await page.evaluate(()=>LearnedWords._section==='learned'),'active header cannot leave zero open '+width);
  for(const name of ['actions','names','status','learned']){
   await page.evaluate(name=>LearnedWords.selectSection(name,true),name);
   check(await page.evaluate(name=>{
    const keys=['learned','actions','names','status'],index=keys.indexOf(name);
    const top=Array.from(document.querySelectorAll('.lw-current-header button')).map(b=>b.dataset.section);
    const bottom=Array.from(document.querySelectorAll('.lw-bottom-headers button')).map(b=>b.dataset.section);
    return JSON.stringify(top)===JSON.stringify(keys.slice(0,index+1))&&JSON.stringify(bottom)===JSON.stringify(keys.slice(index+1))&&document.querySelectorAll('.lw-panel:not([hidden])').length===1;
   },name),'cumulative headers preserve original order '+name+' '+width);
   const geometryState=await geometry();check(geometryState.reachable&&geometryState.center,'all cumulative headers and center fit '+name+' '+width);
  }
  await page.locator('.lw-section-header[data-section=names]').click();check(await page.evaluate(()=>LearnedWords._section==='names'&&document.querySelector('.lw-current-header button:last-child').dataset.section==='names'),'selected header follows preceding banners '+width);
  await page.locator('.lw-section-header[data-section=learned]').click();
  await page.evaluate(()=>{document.querySelector('.lw-center').scrollTop=0;const row=document.querySelector('[data-section=learned] .lw-entry');row.open=true;window.__row=row;window.__field=row.querySelectorAll('.lw-fields input')[1];});
  await page.locator('[data-section=learned] .lw-entry').first().locator('.lw-fields input').nth(1).fill('');
  await page.locator('.lw-section-header[data-section=names]').click();await page.locator('.lw-section-header[data-section=learned]').click();
  check(await page.evaluate(()=>window.__row.isConnected&&window.__field===window.__row.querySelectorAll('.lw-fields input')[1]&&window.__field.value===''),'switch preserves existing dirty row/field '+width);
  await page.evaluate(()=>{window.__field.value='Examine';window.__field.dispatchEvent(new Event('input'));window.__field.dispatchEvent(new Event('blur'));});
  const baseline=await page.evaluate(()=>JSON.stringify(LearnedWords.load()));
  await page.locator('[data-action=help]').click();
  for(let i=0;i<8;i++){
   const state=await page.evaluate(()=>{
    const target=LearnedWords._tourTarget,t=target.getBoundingClientRect(),c=document.querySelector('.lw-tour').getBoundingClientRect(),tour=document.querySelector('.lw-tour');
    return {visible:target.getClientRects().length>0,overlap:c.left<t.right&&c.right>t.left&&c.top<t.bottom&&c.bottom>t.top,
      inert:!!target.closest('[inert]'),bytes:window.__spoken.at(-1),expected:LearnedWords.TOUR[LearnedWords._tourStep].join('. '),stops:window.__stops,
      target:t.toJSON(),card:c.toJSON(),buttons:Array.from(tour.querySelectorAll('button')).map(b=>b.getBoundingClientRect().toJSON())};
   });
   check(state.visible&&state.inert&&!state.overlap,'visible inert target not covered step '+i+' '+width+' '+JSON.stringify(state));
   check(state.bytes===state.expected&&state.stops>=i+1,'visible narration bytes and cancellation step '+i+' '+width);
   await page.locator('.lw-tour button').filter({hasText:/^(Next|Finish)$/}).click();
  }
  check(await page.evaluate(()=>JSON.stringify(LearnedWords.load()))===baseline,'tour never changes real overrides '+width);
  check(await page.evaluate(()=>localStorage.getItem('PL_TutorialSeen')==='1'&&localStorage.getItem('PL_LearnedWordsTutorialSeen')==='1'),'tour completion/main tutorial isolation '+width);
  if(width===360){await page.locator('.lw-section-header[data-section=names]').click();await page.evaluate(()=>document.querySelector('.lw-center').scrollTop=0);await page.screenshot({path:'work/learned-words-ordered-banners-mobile.png'});}
  if(width===1280){
   await page.locator('.lw-section-header[data-section=names]').click();
   await page.evaluate(()=>{document.querySelector('.lw-center').scrollTop=20;});
   const restore=await page.evaluate(()=>({section:LearnedWords._section,scroll:document.querySelector('.lw-center').scrollTop}));
   await page.locator('[data-action=help]').click();
   await page.locator('.lw-tour button').filter({hasText:'Next'}).click();
   const stops=await page.evaluate(()=>window.__stops);
   await page.locator('.lw-tour button').filter({hasText:'Back'}).click();
   check(await page.evaluate(()=>LearnedWords._tourStep===0&&window.__stops)>stops,'Back cancels previous narration');
   await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Tab');
   check(await page.evaluate(()=>!!document.activeElement.closest('.lw-tour')),'tour keyboard focus remains inside controls');
   await page.locator('.lw-tour button').filter({hasText:'Skip'}).click();
   check(await page.evaluate(r=>LearnedWords._section===r.section&&document.querySelector('.lw-center').scrollTop===r.scroll,restore),'Skip restores prior section and scroll');
   const records=await page.evaluate(()=>{const old=LearnedWords.records;LearnedWords.records=()=>[];LearnedWords.render(true);LearnedWords.startTour();LearnedWords._tourStep=1;LearnedWords.renderTour();return {old:!!old,baseline:JSON.stringify(LearnedWords.load())};});
   check(await page.evaluate(()=>!!document.querySelector('.lw-demo input[readonly]')&&document.querySelector('.lw-demo').textContent.includes('Example only')),'empty list uses clearly labeled read-only demonstration');
   check(await page.evaluate(()=>JSON.stringify(LearnedWords.load()))===records.baseline,'empty-list demonstration writes no overrides');
   const closingStops=await page.evaluate(()=>window.__stops);await page.keyboard.press('Escape');
   check(await page.evaluate(()=>!LearnedWords._open&&window.__stops)>closingStops,'Escape closes and cancels tour narration');
  } else {
  await page.locator('#message #close').click();
  }
  check(page.errors.length===0,'no script errors '+width+': '+page.errors.join(';'));
  await context.close();
 }
}finally{await browser.close();}console.log(checks+' layout/spotlight/underline checks passed');})().catch(e=>{console.error(e);process.exitCode=1;});

