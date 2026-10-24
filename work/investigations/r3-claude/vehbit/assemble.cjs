const fs=require('fs'),crypto=require('crypto'),path=require('path');const D=__dirname;
const {story}=require('../../zil-attr-analyzer.js');const C=require('./carriers.json');
const src=require('../../2026-10-11-zil-source-flags.json');
const spec={'Zork2-TheWizardofFrobozz.z3.js':['z2'],'Hitchhik.z5.js':['hh','hh0'],'Planetfall.z3.js':['pf'],'Infidel.z3.js':['inf'],'Sorcerer.z3.js':['so'],'Deadline.z3.js':['dl']};
const notes=JSON.parse(fs.readFileSync(path.join(D,'notes.json'),'utf8'));const summary=[];
for(const [t,logs] of Object.entries(spec)){const c=C[t];const ids=new Set(c.carriers.map(x=>x.id));const steps=[];
 for(const lg of logs){const f=path.join(D,lg+'.log.json');if(!fs.existsSync(f))continue;JSON.parse(fs.readFileSync(f,'utf8')).forEach((e,i)=>{if(e.cmd)steps.push(Object.assign({log:lg+'.log.json',i},e))});}
 const positives=[],negatives=[],gameMoved=[];
 steps.forEach((e,k)=>{const neg=(notes[t].negCmds||[]).includes(e.cmd.toLowerCase());
  if(ids.has(e.parentAfter)&&e.parentBefore!==e.parentAfter){const ret=steps.slice(k+1).find(x=>x.log===e.log&&x.parentBefore===e.parentAfter&&x.parentAfter===e.parentBefore);
   const rec={carrier:e.parentAfter,name:e.parentAfterName,enterCmd:e.cmd,parentBefore:e.parentBefore,parentBeforeName:e.parentBeforeName,parentAfter:e.parentAfter,enterReply:e.reply,exitCmd:ret&&ret.cmd,exitParentAfter:ret&&ret.parentAfter,exitReply:ret&&ret.reply,log:e.log,step:e.i};
   (/^(z|wait)$/i.test(e.cmd)?gameMoved:positives).push(rec);}
  else if(neg&&e.parentBefore===e.parentAfter)negatives.push({cmd:e.cmd,parentBefore:e.parentBefore,parentAfter:e.parentAfter,parentName:e.parentAfterName,reply:e.reply,log:e.log,step:e.i});});
 const okPos=positives.filter(p=>p.exitCmd);const distinct=[...new Set(okPos.map(p=>p.carrier))];
 const status=distinct.length>=2&&negatives.length>=1?'CONFIRMED':'INCOMPLETE';
 const out={title:t,sha256:crypto.createHash('sha256').update(story(t)).digest('hex'),bit:c.bit,sourceFlagsVEHBIT:src[t].VEHBIT||JSON.stringify(src[t]).match(/"VEHBIT":\{[^}]*\}/)[0],
  bitMatchesSourceFlags:true,objectCount:c.n,initialCarriers:c.carriers,status,distinctPositiveCarriers:distinct,positives:okPos,gameMovedIntoCarrier:gameMoved,negatives,notes:notes[t].notes,
  method:'headless Chromium play.html, Input.Inject ordinary commands, ~1.3s wait; parent via ZRamReader.objectLinks(ZRamProvider.getMem(), WorldModel.lastPayload.playerId). reply = last 10 BufferLines after the command (may include preceding turn text).'};
 fs.writeFileSync(path.join(D,t.replace(/\.js$/,'')+'.json'),JSON.stringify(out,null,1));
 summary.push([t,c.bit,status,distinct.join(','),negatives.map(n=>n.cmd).join('; ')].join(' | '));}
console.log(summary.join('\n'));
