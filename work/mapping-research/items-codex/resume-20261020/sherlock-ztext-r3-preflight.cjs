const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');const d=path.join(__dirname,'sherlock-ztext-r3-shared');fs.mkdirSync(d,{recursive:true});
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story,games=JSON.parse(fs.readFileSync('work/investigations/2026-10-11-zil-matrix.json')).order;
const base='C:/Users/hymlo/Downloads/Projects/Parchmap-main/wt-codex-ztext-r2-base-20261021',rows=[],sources={};
for(const root of [base,process.cwd()]){const c=vm.createContext({console});sources[root]={};for(const file of ['ZRamReader','GrammarProvider']){const raw=fs.readFileSync(path.join(root,'js/'+file+'.js'),'utf8');sources[root][file]=crypto.createHash('sha256').update(raw).digest('hex');vm.runInContext(raw,c);}
 for(const game of games){const mem=new DataView(Uint8Array.from(story(game)).buffer),result=c.GrammarProvider.decodeD198(mem);rows.push({root,game,classification:result.classification,evidence:result.evidence,family:result.family||null,reason:result.reason});}
}
const changes=[];for(const game of games){const a=rows.find(x=>x.game===game&&x.root===base),b=rows.find(x=>x.game===game&&x.root!==base);if(['classification','evidence','family','reason'].some(k=>a[k]!==b[k]))changes.push({game,base:a,candidate:b});}
fs.writeFileSync(path.join(d,'classification-preflight.json'),JSON.stringify({scope:'Offline existing26-title family contract comparison, not native catalog rerun or whole-title closure',sources,rows,changes},null,2)+'\n');console.log(JSON.stringify({titles:games.length,changes}));
