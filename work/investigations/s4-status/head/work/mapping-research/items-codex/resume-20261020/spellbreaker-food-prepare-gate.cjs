const fs=require('fs'),path=require('path'),crypto=require('crypto');
const d=path.join(__dirname,'spellbreaker-food-shared'),project=process.cwd(),parent=path.dirname(project);
fs.mkdirSync(d,{recursive:true});
const base=path.join(parent,'wt-codex-object-food-base-20261021'),candidate=path.join(parent,'wt-codex-object-food-candidate-20261021');
const sharedFiles=['js/AttributeSchema.js','js/ActionSynth.js','js/ModuleStatFactsClaude.js'];
for(const root of [base,candidate]){if(!fs.existsSync(path.join(root,'.git')))throw Error('Expected prepared git worktree');fs.cpSync(path.join(project,'games'),path.join(root,'games'),{recursive:true});}
for(const file of sharedFiles)fs.copyFileSync(path.join(project,file),path.join(candidate,file));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function files(root,prefix=''){return fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>{if(e.isSymbolicLink())throw Error('Link disallowed '+e.name);return e.isDirectory()?files(path.join(root,e.name),prefix+e.name+'/'):[prefix+e.name];});}
const runtime=['play.html',...files(path.join(base,'js')).map(x=>'js/'+x)],hashes={};
for(const file of runtime){hashes[file]={base:sha(path.join(base,file)),candidate:sha(path.join(candidate,file))};if(!sharedFiles.includes(file)&&hashes[file].base!==hashes[file].candidate)throw Error('Unexpected source difference '+file);}
const games=files(path.join(project,'games')),catalog={};for(const file of games){const h=sha(path.join(project,'games',file));if(h!==sha(path.join(base,'games',file))||h!==sha(path.join(candidate,'games',file)))throw Error('Game bytes differ '+file);catalog[file]=h;}
fs.writeFileSync(path.join(d,'immutable-manifest.json'),JSON.stringify({base,candidate,baseCommit:'8acb07e0e1f9bfbc4700cfc050a2d03bae6a2987',sharedFiles,hashes,catalog,createdAt:new Date().toISOString(),owner:'codex',scope:'One new full309x2 gate for reviewed Spellbreaker identity-food shared candidate; food gate not reused'},null,2)+'\n');
for(const file of ['run-full-gate.cjs','gate-shard.cjs'])fs.copyFileSync(path.join(__dirname,'zil-food-shared',file),path.join(d,file));
console.log('Prepared immutable object-food gate: '+runtime.length+' runtime files, '+games.length+' game files, only '+sharedFiles.join(', '));
