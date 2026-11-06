// Shared food/Drink regression: actual menu and learned-provider consumers.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let checks=0;const mem={},obj={id:34,name:'waybread',attrs:{edible:true}};
const c=vm.createContext({console,WorldModel:{lastPayload:{inventory:[obj],discoveredObjects:[]}},Actionable:{isGameWord:()=>true},AttributeSchema:{measuredFlagOwner:()=>true},AttrCalibrator:{hasConfirmedFlag:()=>false,allowedVerbsFor:()=>[]},SemanticActions:{confirmedObjectFormsFor:()=>[]}});
for(const f of ['ActionSynth','LearnedWords'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const S=c.ActionSynth,L=c.LearnedWords;
function expect(label,drink){const v=S.verbsForAttrs(obj.attrs,obj.id),p=L.independentForms(obj);assert(v.includes('eat'),label+' preserves Eat');assert(p.includes('eat'),label+' provider preserves Eat');assert.equal(v.includes('drink'),drink,label+' menu');assert.equal(p.includes('drink'),drink,label+' provider');checks++;}
expect('no Z provider retains existing dictionary-gated path',true);
c.ZRamProvider={getMem:()=>null};expect('null Z memory retains existing path',true);
c.ZRamProvider={getMem:()=>mem};c.ZRamReader={isInformCompiled:()=>true};expect('positive Inform semantics preserves D150 rain',true);
c.ZRamReader.isInformCompiled=()=>false;expect('trusted ZIL edible alone never grants Drink',false);
assert(!S.verbsForAttrs(obj.attrs,34,{directEvidenceOnly:true}).includes('drink'));checks++;
c.ZRamReader.isInformCompiled=()=>true;assert(!L.independentForms({...obj,examineOnly:true}).includes('drink'));checks++;
c.Actionable.isGameWord=()=>false;expect('dictionary negative still denies inferred Drink',false);
c.Actionable.isGameWord=()=>{throw Error('dictionary failure')};expect('dictionary failure denies inference',false);
c.Actionable.isGameWord=()=>true;c.ZRamProvider.getMem=()=>{throw Error('provider failure')};expect('throwing provider is not no-memory fallback',false);
c.ZRamProvider.getMem=()=>mem;c.ZRamReader={};expect('missing compiler evidence fails closed',false);
c.ZRamReader.isInformCompiled=()=>{throw Error('classifier failure')};expect('throwing compiler evidence fails closed',false);
c.ZRamReader.isInformCompiled=()=>false;c.AttrCalibrator.allowedVerbsFor=()=>['drink'];assert(S.verbsForAttrs(obj.attrs,34).includes('drink'));checks++;
c.SemanticActions.confirmedObjectFormsFor=()=>[{verb:'drink'}];assert(L.independentForms(obj).includes('drink'));checks++;
c.AttrCalibrator.allowedVerbsFor=()=>[];c.SemanticActions.confirmedObjectFormsFor=()=>[];
// Exercise the actual compiler classifier on original bundled story bytes.
vm.runInContext(fs.readFileSync('js/ZRamReader.js','utf8'),c);
function originalMemory(file){const text=fs.readFileSync('games/'+file,'utf8'),encoded=text.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);assert(encoded,'original story encoding');const bytes=Buffer.from(encoded[1].replace(/\s+/g,''),'base64');return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);}
const inform=originalMemory('anchor.z8.js');c.ZRamProvider.getMem=()=>inform;
assert(c.ZRamReader.isInformCompiled(inform),'original Anchorhead is Inform');expect('actual Inform classifier preserves both consumers',true);
const zil=originalMemory('Zork3-TheDungeonMaster.z3.js');c.ZRamProvider.getMem=()=>zil;
assert(!c.ZRamReader.isInformCompiled(zil),'original Zork III is not Inform');expect('actual ZIL memory denies inferred Drink in both consumers',false);
console.log(checks+' shared food/Drink checks passed');
