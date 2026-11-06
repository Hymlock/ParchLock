// OPEN_WORK M13: isInternalNamedLocation must reject only real library/meta holders,
// not Book and Volume's real room 64 "(Library)". Static census + native play.html check.
//   node harness/m13-internal-room-name.js          (static + native)
//   STATIC=1 node harness/m13-internal-room-name.js (static only)
const fs=require('fs'),vm=require('vm'),path=require('path');const root=process.cwd();
const story=require(root+'/work/investigations/zil-attr-analyzer.js').story;
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;}else{fail++;console.log('FAIL '+m);}};
function load(file){const mem=new DataView(Uint8Array.from(story(file)).buffer);
  const c=vm.createContext({console,window:{},document:{readyState:'loading',addEventListener(){}},UndoRestoreSync:{generation:1},
    ModuleLibrary:{currentExecutableDigest:()=>'x',currentExecutableIdentity:()=>({digest:'x',header:[]})},ZRamProvider:{getMem:()=>mem}});
  for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema'])vm.runInContext(fs.readFileSync(root+'/js/'+f+'.js','utf8'),c);
  return {mem,R:c.ZRamReader};}
// Census (work/investigations/m13-internal-name/census.txt): every Z-title object starting "(" that the
// pre-M13 regex matched. Only bookvol 64 "(Library)" is a real room. Fixed per-title rows:
const ROWS=[['bookvol.z5.js',64,'(Library)',false],['dreamhold.z8.js',46,'(Darkness)',true]];
const INTERNAL=/^\((Inform Library( 6\/3)?|Inform Parser|Library Extensions|LibraryMessages|libraryMessages|darkness object|self object|Darkness)\)$/;
const OLD=/^\((darkness|self|class|object|thedark|inform|library|librarymessages)\b/i;
let census=0;
for(const f of fs.readdirSync('games').filter(f=>f.endsWith('.js')&&!/\.(ulx|gblorb)\.js$/i.test(f)).sort()){
  let T;try{const b=story(f);if(!(b[0]>=1&&b[0]<=8))continue;T=load(f);}catch(e){continue;}
  const n=T.R.objectCount(T.mem);
  for(let id=1;id<=n;id++){const nm=String(T.R.shortName(T.mem,id)||'');if(nm[0]!=='('||!OLD.test(nm))continue;census++;
    const fixed=ROWS.find(r=>r[0]===f&&r[1]===id);
    const wantInternal=fixed?fixed[3]:true;
    if(fixed)ok(nm===fixed[2],f+' '+id+' name '+nm);
    else ok(INTERNAL.test(nm),f+' '+id+' unexpected census name '+nm);
    // isInternalNamedLocation false == rejected (for parentless, non-Class holders)
    const got=T.R.isInternalNamedLocation(T.mem,id,-1);
    ok(got===!wantInternal,f+' '+id+' '+nm+' isInternalNamedLocation='+got+' want '+!wantInternal);}}
ok(census===1124,'census size '+census+' != 1124');
// enclosingRoom(player in 64) = 64 for bookvol.
{const T=load('bookvol.z5.js'),m=T.mem,h=T.R.header(m),ob=i=>T.R.objectBase(h,i);
 const P=i=>m.getUint16(ob(i)+6),Sb=i=>m.getUint16(ob(i)+8),C=i=>m.getUint16(ob(i)+10);const me=364,op=P(me);
 if(op){if(C(op)===me)m.setUint16(ob(op)+10,Sb(me));else{let k=C(op);while(k&&Sb(k)!==me)k=Sb(k);if(k)m.setUint16(ob(k)+8,Sb(me));}}
 m.setUint16(ob(me)+6,64);m.setUint16(ob(me)+8,C(64));m.setUint16(ob(64)+10,me);
 const er=T.R.enclosingRoom(m,me);ok(er===64,'bookvol enclosingRoom(player in 64)='+er);}
console.log('STATIC: '+pass+' PASS, '+fail+' FAIL (census '+census+')');
if(process.env.STATIC){process.exit(fail?1:0);}
(async()=>{const {pathToFileURL}=require('url');const {chromium}=require(path.join(root,'node_modules','playwright'));
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});
 await p.addInitScript(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x80000000;};});
 await p.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');for(const k of['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen'])localStorage.setItem(k,'1');});
 await p.goto(pathToFileURL(path.resolve(root,'play.html')).href+'?story=games/bookvol.z5.js');await p.waitForTimeout(2500);
 const settle=async()=>{for(let i=0;i<25;i++){await p.evaluate(()=>{document.querySelector('.parchlock-splash__start')?.click();try{Message.Hide();}catch(e){}});if(await p.locator('.Input.LineInput').count())return true;const c=p.locator('.Input.CharInput');if(await c.count())await c.first().focus();await p.keyboard.press('Space');await p.waitForTimeout(120);}return false;};
 const cmd=async c=>{await p.evaluate(c=>{Input.Clear();Input.Inject(c,true);},c);await p.waitForTimeout(1300);await settle();};
 await settle();for(let k=0;k<3;k++){const c=p.locator('.Input.CharInput');if(await c.count()){await c.first().focus();await p.keyboard.press('b');await p.waitForTimeout(800);}}
 await settle();
 await p.evaluate(()=>{const m=ZRamProvider.getMem(),h=ZRamReader.header(m);const ob=i=>ZRamReader.objectBase(h,i);const P=i=>m.getUint16(ob(i)+6),Sb=i=>m.getUint16(ob(i)+8),C=i=>m.getUint16(ob(i)+10);const me=364,op=P(me);if(C(op)===me)m.setUint16(ob(op)+10,Sb(me));else{let k=C(op);while(k&&Sb(k)!==me)k=Sb(k);if(k)m.setUint16(ob(k)+8,Sb(me));}m.setUint16(ob(me)+6,62);m.setUint16(ob(me)+8,C(62));m.setUint16(ob(62)+10,me);m.setUint16(h.globals+32,62);m.setUint16(h.globals+86,62);});
 await cmd('u');
 const r=await p.evaluate(()=>{const P=WorldModel.lastPayload||{},pr=P.probe||{};return {room:P.roomId,name:P.roomName,rs:pr.roomSource};});
 console.log('NATIVE u from MuseRoom 62: '+JSON.stringify(r));
 ok(r.room===64&&r.rs==='player-containment','native payload room 64 / player-containment');
 await b.close();console.log('TOTAL: '+pass+' PASS, '+fail+' FAIL');process.exit(fail?1:0);})();
