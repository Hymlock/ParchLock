// node assemble2.cjs  -> writes <title>.json in this folder
const fs=require('fs'),crypto=require('crypto'),path=require('path');const D=__dirname;
const {story}=require('../../zil-attr-analyzer.js');const C=require('../vehbit/carriers.json');
const spec=JSON.parse(fs.readFileSync(path.join(D,'spec.json'),'utf8').replace(/^﻿/,''));const summary=[];
for(const [t,cfg] of Object.entries(spec)){const c=C[t];const ids=new Set(c.carriers.map(x=>x.id));
 const prior=JSON.parse(fs.readFileSync(path.join(D,'../vehbit',t.replace(/\.js$/,'')+'.json'),'utf8'));
 const positives=[],matrix={},negatives=[];
 for(const lg of cfg.logs){const f=path.join(D,lg+'.log.json');if(!fs.existsSync(f))continue;const L=JSON.parse(fs.readFileSync(f,'utf8'));
  L.forEach((e,k)=>{if(!e.cmd)return;
   if(ids.has(e.parentAfter)&&e.parentBefore!==e.parentAfter&&!/^(z|wait)$/i.test(e.cmd)){const ret=L.slice(k+1).find(x=>x.parentBefore===e.parentAfter&&x.parentAfter===e.parentBefore);
    positives.push({carrier:e.parentAfter,name:e.parentAfterName,enterCmd:e.cmd,parentBefore:e.parentBefore,parentBeforeName:e.parentBeforeName,parentAfter:e.parentAfter,enterReply:e.reply,exitCmd:ret&&ret.cmd,exitParentAfter:ret&&ret.parentAfter,exitReply:ret&&ret.reply,log:lg+'.log.json',step:k});}
   for(const [w,id] of Object.entries(cfg.words)){const inV=e.parentBefore===id;const re=new RegExp('\\b'+w+'\\b','i');
    if(re.test(e.cmd)||(inV&&/^(exit|stand up|get up|leave|out)$/i.test(e.cmd))){if(/can't see any/i.test(e.reply))continue;
     (matrix[id]=matrix[id]||[]).push({cmd:e.cmd,parentBefore:e.parentBefore,parentAfter:e.parentAfter,moved:e.parentBefore!==e.parentAfter,reply:(e.reply||'').slice(0,240),log:lg+'.log.json',step:k});}}
   if(cfg.neg&&cfg.neg.includes(e.cmd.toLowerCase())&&e.parentBefore===e.parentAfter&&!/can't see any/i.test(e.reply))negatives.push({cmd:e.cmd,parentBefore:e.parentBefore,parentAfter:e.parentAfter,parentName:e.parentAfterName,reply:(e.reply||'').slice(0,300),log:lg+'.log.json',step:k});});}
 const ok=positives.filter(p=>p.exitCmd);const newIds=[...new Set(ok.map(p=>p.carrier))];
 const priorIds=prior.distinctPositiveCarriers||[];const all=[...new Set([...priorIds,...newIds])];
 const status=all.length>=2?'CONFIRMED':'INCOMPLETE';
 const out={title:t,sha256:crypto.createHash('sha256').update(story(t)).digest('hex'),bit:c.bit,initialCarriers:c.carriers,status,
  priorCarriers:priorIds,newCarriers:newIds.filter(x=>!priorIds.includes(x)),distinctPositiveCarriers:all,positives:ok,verbMatrix:matrix,negatives:negatives.concat(prior.negatives||[]).slice(0,40),
  priorEvidenceFile:'work/investigations/r3-claude/vehbit/'+t.replace(/\.js$/,'')+'.json',notes:cfg.notes,
  method:'headless Chromium play.html via drive2.cjs: Input.Inject of ordinary commands only (no VM writes/snapshots). Navigation helpers GOTO/ENSURE only issue ordinary direction commands chosen by BFS over ExitCalibrator.exitsFor (read-only). parent = ZRamReader.objectLinks(mem, WorldModel.lastPayload.playerId).parent before/after each command.'};
 fs.writeFileSync(path.join(D,t.replace(/\.js$/,'')+'.json'),JSON.stringify(out,null,1));
 summary.push([t,'bit '+c.bit,status,'prior '+priorIds.join(','),'new '+out.newCarriers.join(','),'pos '+ok.map(p=>p.carrier+':'+p.enterCmd+'/'+p.exitCmd).join('; ')].join(' | '));}
console.log(summary.join('\n'));
