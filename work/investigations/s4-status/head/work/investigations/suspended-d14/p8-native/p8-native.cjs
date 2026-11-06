// D8 P8 native: Suspended addressed radial forms on the wt-claude-d8 build (seeded/fresh boot, no forced RAM).
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{chromium}=require(path.resolve('node_modules/playwright')),{pathToFileURL}=require('url');
const out=__dirname,site=process.cwd(),files=['play.html','js/ActionSynth.js','js/Actionable.js','js/ModuleStatFactsClaude.js','games/Suspended.z3.js'];
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(site,f))).digest('hex');
const r={tier:'Fresh boot, ordinary radial tap + typed addressed commands, original RAM (no forced state)',site,hashes:Object.fromEntries(files.map(f=>[f,sha(f)])),rows:[]};let b;
(async()=>{try{b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1280,height:900}});
await p.addInitScript(()=>{for(const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1');sessionStorage.setItem('PL_ParchLockSplashSeen','1')});
await p.goto(pathToFileURL(path.join(site,'play.html')).href+'?story=games/Suspended.z3.js');
const ready=async()=>{for(let i=0;i<60;i++){await p.evaluate(()=>{document.querySelector('.parchlock-splash__start')?.click();try{Message.Hide()}catch{}});if(await p.locator('.Input.LineInput').count()===1)return;const ch=p.locator('.Input.CharInput').first();if(await ch.count()){await ch.focus();await p.keyboard.press('Space');}await p.waitForTimeout(150)}throw Error('no unique parser input')};
const lastReply=()=>p.evaluate(()=>{const rows=[...document.querySelectorAll('#windowport .BufferLine')];let i=rows.length-1;while(i>=0&&!rows[i].querySelector('.Style_input'))i--;return rows.slice(i).map(n=>n.textContent).join('\n')});
const snap=()=>p.evaluate(()=>{const mem=ZRamProvider.getMem(),R=ZRamReader,h=R.header(mem),g=n=>R.u16(mem,h.globals+n*2);return{digest:ModuleLibrary.currentExecutableDigest(),linked:g(114),waldo:R.objectLinks(mem,155).parent,iris:R.objectLinks(mem,158).parent,cabinet:R.objectLinks(mem,62).parent,domain:(ActionSynth.actorAddressingDomain(mem)||{robots:[]}).robots.map(x=>x.id)}});
await ready();await p.waitForTimeout(600);
r.boot=await snap();
// Radial capture: the cabinet's commands and the open radial.
r.resolved=await p.evaluate(()=>Actionable.resolveObjectCommands(62,'room').map(c=>({command:c.command,label:c.label||null,addressed:!!c.actorAddressing})));
r.poolHasCabinet=await p.evaluate(()=>Actionable.payloadPool().some(o=>o.id===62));
await p.evaluate(()=>Actionable.Open('cabinet','room',640,450,62));await p.waitForTimeout(500);
r.radialLabels=await p.evaluate(()=>[...document.querySelectorAll('.radial-command')].map(n=>n.textContent.trim()));
await p.screenshot({path:path.join(out,'radial-cabinet.png')});
const slice=p.locator('.radial-command').filter({hasText:/^Waldo: Examine$/}).first();
if(await slice.count()){const before=await snap();await slice.click();await p.waitForTimeout(700);await ready();r.rows.push({via:'radial tap Waldo: Examine',before,after:await snap(),reply:await lastReply()});}
else r.rows.push({via:'radial tap Waldo: Examine',error:'slice not present'});
for(const command of ['waldo, look on blt','iris, examine cabinet']){const before=await snap();await p.locator('.Input.LineInput').fill(command);await p.locator('.Input.LineInput').press('Enter');await p.waitForTimeout(700);await ready();r.rows.push({via:'typed',command,before,after:await snap(),reply:await lastReply()});}
// Prompt-state: provoke the missing-noun prompt and check no addressed forms are offered there.
await p.locator('.Input.LineInput').fill('waldo, examine');await p.locator('.Input.LineInput').press('Enter');await p.waitForTimeout(700);await ready();
r.promptReply=await lastReply();r.promptBlocked=await p.evaluate(()=>ActionSynth.nonCommandPrompt());r.promptAddressed=await p.evaluate(()=>Actionable.resolveObjectCommands(62,'room').filter(c=>c.actorAddressing).length);
r.status='CAPTURED';}catch(e){r.status='STOP_DIAGNOSTIC';r.error=e.stack;}finally{if(b)await b.close();r.sourceStable=files.every(f=>sha(f)===r.hashes[f]);
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(r,null,2));
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({script:'p8-native.cjs',scriptSha256:sha(path.relative(site,__filename)),inputs:r.hashes,outputs:{'result.json':crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'result.json'))).digest('hex'),...(fs.existsSync(path.join(out,'radial-cabinet.png'))?{'radial-cabinet.png':crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'radial-cabinet.png'))).digest('hex')}:{})}},null,2));
console.log(JSON.stringify({status:r.status,err:r.error&&r.error.split('\n')[0],boot:r.boot,pool:r.poolHasCabinet,resolved:r.resolved,labels:r.radialLabels,rows:r.rows.map(x=>({via:x.via,cmd:x.command,reply:x.reply,err:x.error})),prompt:[r.promptReply,r.promptBlocked,r.promptAddressed]},null,1));}})();
