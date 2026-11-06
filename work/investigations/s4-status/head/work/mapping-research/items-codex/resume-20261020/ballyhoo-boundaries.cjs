// Research instrumentation of existing offline decoder; source file stays untouched.
const fs=require('fs'),path=require('path'),Module=require('module');
const file=path.resolve('work/investigations/zil-attr-analyzer.js');let code=fs.readFileSync(file,'utf8');
code=code.replace('const ins = decodeAt(mem, v, p); if (ins.bad)','const ins = decodeAt(mem, v, p); if (out.boundaries && !ins.bad) out.boundaries.push({at:p,next:ins.next,kind:ins.kind,op:ins.op}); if (ins.bad)');
code=code.replace('const out = []; disasm(mem, v, unpack(v, u16(mem, at.base + a * 2))','const out = []; out.boundaries=[]; disasm(mem, v, unpack(v, u16(mem, at.base + a * 2))');
const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(code,file);
const A=mod.exports,a=A.analyze('Ballyhoo.z3.js');
const dir=path.join(__dirname,'ballyhoo-on'),q=JSON.parse(fs.readFileSync(path.join(dir,'source-provenance.json')));
const routines=[];for(let id=0;id<a.actions;id++){const out=a.routine(id);routines.push({action:id,address:a.routineAddr(id),boundaries:out.boundaries||[],malformed:out.malformed||[]});}
const rows=q.literalSetClear24Candidates.map(c=>({...c,overlappingGrammarInstructions:routines.flatMap(r=>r.boundaries.filter(x=>x.at<=c.at&&c.at<x.next).map(x=>({action:r.action,routine:r.address,...x})))}));
fs.writeFileSync(path.join(dir,'candidate-boundaries.json'),JSON.stringify({scope:'Grammar action roots and direct calls depth<=2 only, not whole executable reachability',actions:a.actions,rows},null,2));
console.log(JSON.stringify(rows.map(x=>({at:x.at,overlaps:x.overlappingGrammarInstructions.slice(0,3)}))));
