// usage: node drive2.cjs <Story> <cmdsFile(json array)> <outLog.json> <probeWords comma list>
// Ordinary commands only. WAITUNTIL:<regex> repeats WAIT (max 40) until reply matches.
// When new output mentions a probe word, the probe verb set is injected once per (room,word).
const path=require('path'),fs=require('fs'),{pathToFileURL}=require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async()=>{const [story,cf,outf,pw]=process.argv.slice(2);const cmds=JSON.parse(fs.readFileSync(cf,'utf8'));
const words=(pw||'').split(',').filter(Boolean);
const b=await chromium.launch({headless:true});const p=await b.newPage();
await p.addInitScript(()=>{try{sessionStorage.setItem('PL_ParchLockSplashSeen','1')}catch(e){}});
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+story);
await p.waitForTimeout(3000);
try{await p.click('.parchlock-splash__start',{timeout:1500})}catch(e){}
await p.evaluate(()=>{try{Message.Hide()}catch(e){}});await p.waitForTimeout(800);
const st=()=>p.evaluate(()=>{const m=ZRamProvider.getMem();const pl=WorldModel.lastPayload||{};const id=pl.playerId;const L=id?ZRamReader.objectLinks(m,id):null;const par=L?L.parent:null;
 return {playerId:id,roomId:pl.roomId,parent:par,parentName:par?ZRamReader.shortName(m,par):null,lines:document.querySelectorAll('.BufferLine').length}});
const txt=(from)=>p.evaluate(f=>[...document.querySelectorAll('.BufferLine')].slice(f).map(l=>l.innerText).join('\n').trim(),from);
const log=[];let dead=false;
async function run(c,tag){const before=await st();await p.evaluate(c=>{try{Message.Hide()}catch(e){};Input.Clear();Input.Inject(c,true)},c);await p.waitForTimeout(1100);
 const a=await st();let r=await p.evaluate(()=>[...document.querySelectorAll('.BufferLine')].slice(-14).map(l=>l.innerText).join('\n'));{const k=r.toLowerCase().lastIndexOf('>'+c.toLowerCase());if(k>=0)r=r.slice(k+c.length+1);}r=r.trim();const e={cmd:c,tag:tag||null,parentBefore:before.parent,parentBeforeName:before.parentName,parentAfter:a.parent,parentAfterName:a.parentName,playerId:a.playerId,reply:r.slice(0,700)};log.push(e);
 console.log(JSON.stringify(c),tag||'',e.parentBefore,'->',e.parentAfter,e.parentAfterName,'|',r.replace(/\s+/g,' ').slice(0,150));
 if(/You have died|\*\*\*\* You have|RESTART, RESTORE/.test(r))dead=true;return e;}
const probed=new Set();
async function probe(e){for(const w of words){const re=new RegExp('\\b'+w+'\\b','i');if(!re.test(e.reply))continue;const key=e.parentAfter+'|'+w;if(probed.has(key))continue;probed.add(key);
 for(const v of ['get in '+w,'get out of '+w,'enter '+w,'exit','sit on '+w,'stand up','board '+w,'get out of '+w,'climb on '+w,'get off '+w]){if(dead)return;await run(v,'probe:'+w);} }}
let probeOn=true;
let HUB=null;async function step(){return p.evaluate(([target,HUB])=>{const m=ZRamProvider.getMem();const cur=WorldModel.lastPayload.roomId;const ex=id=>{try{return ExitCalibrator.exitsFor(m,id)}catch(e){return []}};
 const curNm=(()=>{try{return ZRamReader.shortName(m,cur)}catch(e){return ''}})();const bfs=(target)=>{const prev=new Map([[cur,null]]);const q=[cur];let hit=null;while(q.length){const id=q.shift();let nm='';try{nm=ZRamReader.shortName(m,id)||''}catch(e){}if(id!==cur&&nm.toLowerCase()===target.toLowerCase()){hit=id;break}
  for(const e of ex(id)){if(e.targetRoomId&&!prev.has(e.targetRoomId)){prev.set(e.targetRoomId,{from:id,dir:e.command});q.push(e.targetRoomId)}}}
 if(hit){let x=hit,d=null;while(prev.get(x)){d=prev.get(x).dir;if(prev.get(x).from===cur)break;x=prev.get(x).from}return d}return null};let d=bfs(target);if(d)return {dir:d,path:true};if(HUB&&curNm!==HUB){d=bfs(HUB);if(d)return {dir:d,path:'hub'}}
 const all=['north','south','east','west','northeast','northwest','southeast','southwest','up','down'];return {dir:all[Math.floor(Math.random()*all.length)],path:false}},[target,HUB]);}
let target=null;
for(const c of cmds){if(dead)break;let m=/^WAITUNTIL:(.*)$/.exec(c);
 if(c.startsWith('HUB:')){HUB=c.slice(4);continue}if(c==='PROBE:on'){probeOn=true;continue}if(c==='PROBE:off'){probeOn=false;continue}
 let g=/^(?:GOTO|ENSURE):(.*)$/.exec(c);if(g){target=g[1];const lim=c.startsWith('ENSURE')?25:80;for(let i=0;i<lim&&!dead;i++){const s0=await st();const nm=await p.evaluate(()=>{try{return ZRamReader.shortName(ZRamProvider.getMem(),WorldModel.lastPayload.roomId)}catch(e){return ''}});if(String(nm).toLowerCase()===target.toLowerCase())break;const d=await step();const e=await run(d.dir,'goto:'+target+(d.path===true?'':d.path==='hub'?':hub':':random'));if(probeOn&&!dead)await probe(e);}continue;}
 if(m){const re=new RegExp(m[1],'i');for(let i=0;i<40&&!dead;i++){const e=await run('WAIT','waituntil');if(re.test(e.reply))break;}continue;}
 if(c==='TYPEPOEM'){const all=log.map(x=>x.reply).join('\n');const i=all.lastIndexOf('Oh freddled');const lines=log.map(x=>/^Time passes\.\.\.\s*"([^"]+)"\s*>?\s*$/.exec((x.reply||'').trim())).filter(Boolean).map(x=>x[1]).filter(x=>!/If he|mutters|Since you|Hello/.test(x));
 const O={first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8};const mm=/(\w+) word from the (\w+) verse/.exec(all)||[];const wn=O[mm[1]]||2,vn=O[mm[2]]||2;
 const verse=lines.slice((vn-1)*4,vn*4).join(' ').split(/\s+/).map(x=>x.replace(/[^a-z]/gi,'')).filter(Boolean);const w=verse[wn-1]||'bleem';await run('type "'+w.toLowerCase()+'"','typepoem:'+mm[0]);continue;}
 const e=await run(c);if(probeOn&&!dead)await probe(e);}
fs.writeFileSync(outf,JSON.stringify(log,null,1));
await b.close();})();




