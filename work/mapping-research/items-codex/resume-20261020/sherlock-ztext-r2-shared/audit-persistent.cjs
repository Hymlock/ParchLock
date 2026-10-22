const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');const d=__dirname,m=JSON.parse(fs.readFileSync(path.join(d,'immutable-manifest.json'))),story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
const report=[];for(const [game,ids]of [['dogslife.z5.js',[37,46,47]],['acorncourt.z5.js',[24,33,56]]]){
 const bytes=Uint8Array.from(story(game)),mem=new DataView(bytes.buffer),row={game,digest:crypto.createHash('sha256').update(bytes).digest('hex'),variants:{}};
 for(const label of ['base','candidate']){const c=vm.createContext({console});for(const file of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema'])vm.runInContext(fs.readFileSync(path.join(m[label],'js/'+file+'.js'),'utf8'),c);const R=c.ZRamReader;
  row.variants[label]={header:R.header(mem),attributeNames:R.informAttributeNames(mem),propertyNames:R.informPropertyNames(mem),objects:ids.map(id=>{const o=R.objectLinks(mem,id),words=R.u8(mem,o.props),addr=o.props+1;return {id,name:R.shortName(mem,id),storyName:R.storyShortName(mem,id),attrs:R.attrsFromObject(mem,id),words,addr,raw:Buffer.from(bytes.slice(addr,addr+2*words)).toString('hex'),zchars:Array.from({length:words},(_,i)=>{const w=R.u16(mem,addr+i*2);return[(w>>10)&31,(w>>5)&31,w&31]}).flat(),parent:o.parent};})};
 }
 report.push(row);
}
fs.writeFileSync(path.join(d,'persistent-offline-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.map(r=>({game:r.game,variants:Object.fromEntries(Object.entries(r.variants).map(([k,v])=>[k,{attrs:!!v.attributeNames,properties:!!v.propertyNames,objects:v.objects.map(({id,name,storyName,raw})=>({id,name,storyName,raw}))}]))})),null,2));
