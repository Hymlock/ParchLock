// Current-source adversarial controls. Constructed v5 state, no native claim.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const prefix=fs.readFileSync('harness/zil-light-forms.js','utf8').split('const LIGHT=')[0];
const load=new Function('require',prefix+'\nreturn load;')(require),T=load('Sherlock.z5.js');
vm.runInContext(fs.readFileSync('js/Actionable.js','utf8'),T.c);
T.c.Actionable.payloadPool=()=>T.payload.inventory;
const parent=(id,p)=>T.mem.setUint16(T.R.objectBase(T.h,id)+6,p);
parent(232,38);parent(166,232);T.bit(166,38,0);
const lamp=T.obj(166);T.payload.inventory=[lamp];
const row=T.S.commandsForObject(lamp,'inventory').find(c=>c.lightFormScope);
assert(row&&T.c.Actionable.radialCommandCurrent(row));
T.payload.inventory=[];
const absentCurrent=T.c.Actionable.radialCommandCurrent(row);
T.payload.inventory=[lamp];T.bit(166,38,1);
T.c.AttrCalibrator.allowedVerbsFor=()=>['turn off','turn on'];
const verbs=Array.from(T.S.commandsForObject(lamp,'inventory')).filter(c=>/^turn (on|off) /.test(c.command));
const result={head:require('child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tier:'constructed/X',absentCurrent,learnedMatchingNativeVerb:verbs.map(c=>({command:c.command,hasScope:!!c.lightFormScope,current:T.c.Actionable.radialCommandCurrent(c)}))};
fs.writeFileSync(__dirname+'/c3df-current-audit.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
