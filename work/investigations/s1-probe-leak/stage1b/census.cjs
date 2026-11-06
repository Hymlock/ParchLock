const fs=require('fs'),path=require('path');const R=process.argv[2];
global.window=global;require('vm').runInThisContext(fs.readFileSync(R+'/js/ZRamReader.js','utf8').replace(/^const ZRamReader|^var ZRamReader|^let ZRamReader/m,'globalThis.ZRamReader'));
let ST;try{ST=require(R+'/js/StatTracker.js');}catch(e){console.error('ST',e.message)}
const inv=require(R+'/work/investigations/zil-titles/grok-lane-1031/inform-plan/inventory.json');
const res={A:0,B:0,none:0,multi:0,nonZ:0,noLayout:0};const rows=[];
for(const g of inv){if(!/^z/.test(g.vm||'')){res.nonZ++;rows.push(g.file+' nonZ '+g.vm);continue;}
 const src=fs.readFileSync(R+'/games/'+g.file,'utf8');let buf=Buffer.from(src.slice(src.indexOf("'")+1,src.lastIndexOf("'")),'base64');
 const zi=buf.indexOf('ZCOD');if(buf.slice(0,4).toString()==='FORM'&&zi>0)buf=buf.slice(zi+8);
 const v=buf[0],mult=v===8?8:4;let lay=null;try{lay=ST.decodeI6ActionLayout(new Uint8Array(buf));}catch(e){}
 const ab=lay&&lay.actionBase;const hits=[];
 for(let p=0;p+12<buf.length;p+=mult){if(buf[p]!==0)continue;
  // A: 0xCF 0x2F word Gk 00 AF 00 B0
  if(buf[p+1]===0xCF&&buf[p+2]===0x2F&&buf[p+5]>=16&&buf[p+6]===0&&buf[p+7]===0xAF&&buf[p+8]===0&&buf[p+9]===0xB0)hits.push({s:'A',p:p/mult,c:buf.readUInt16BE(p+3),g:buf[p+5]-16});
  if(buf[p+1]===0xE0&&buf[p+2]===0x0B&&buf[p+7]>=16&&buf[p+8]===0&&buf[p+9]===0xAF&&buf[p+10]===0&&buf[p+11]===0xB0)hits.push({s:'B',p:p/mult,c:buf.readUInt16BE(p+5),g:buf[p+7]-16});
 }
 const m=hits.filter(h=>ab!=null&&h.c===ab);
 if(ab==null)res.noLayout++;
 const k=m.length===0?'none':m.length>1?'multi':m[0].s;if(ab!=null)res[k]++;
 rows.push(g.file+' v'+v+' ab='+ab+' '+k+' all='+JSON.stringify(hits.map(h=>h.s+':0x'+h.p.toString(16)+':c'+h.c+':G'+h.g)));}
console.log(rows.join('\n'));console.log(JSON.stringify(res));
