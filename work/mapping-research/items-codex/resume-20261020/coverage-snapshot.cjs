// Reporting only: project existing evidence onto the full scope, never invent closure.
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const root = process.cwd(), D = path.join(root, 'work/investigations');
const read = f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
const matrix = read('2026-10-11-zil-matrix.json'), ledger = read('2026-10-11-zil-cell-ledger.json'), audits = read('2026-10-11-zil-audited.json');
const { story } = require(path.join(D, 'zil-attr-analyzer.js'));
const factsText = fs.readFileSync('js/ModuleStatFactsClaude.js', 'utf8'), context = {};
vm.runInNewContext(factsText, context);
const allFacts = JSON.parse(JSON.stringify(context.ModuleStatFactsClaude));
const current = JSON.parse(fs.readFileSync(path.join(__dirname,'current-classifications.json'),'utf8'));
const attributes = [...new Set([...matrix.profileKeys, 'isWorn', 'hidden'])];
const world = ['playerId','roomId','roomName','inventory','discoveredObjects','unnamedCandidates','darkness','darkEvidence','exits','actors','vocabulary','commandReferences','descriptors','identical','nested','underlineVsDict'];
const special = ['playerGlobal','playerObject','measuredLocation','locationGlobal','inventoryHiddenAttribute','wornAttribute','openCapability','lightSource','equipmentState','objectUseVerb','mapStorage'];
const status = ['status','score','score.max','rank','turns','time','date/day','health','damage','experience','experience.max','magic','life','progress','value','treasures','tasks.max','quota.max','holiness','holiness.max','temptations.max','locations.max','odds','certainty','keysSeen','keysTurned','statusPair','statusTurnsMetric','scoreAliasField','fields'];
const universe = [...attributes.map(key=>({area:'attribute',key})), ...world.map(key=>({area:'world',key})), ...special.map(key=>({area:'fact',key})), ...status.map(key=>({area:'status',key}))];
const rows = matrix.order.map(game => {
  const digest = crypto.createHash('sha256').update(Buffer.from(story(game))).digest('hex');
  const fact = allFacts[digest] || {}, audit = audits[game] || {}, manual = ledger[game] || {};
  const cells = universe.map(({area,key}) => {
    let value, owner;
    if(area==='attribute' && Object.hasOwn(fact.attributeMap||{},key)){value=fact.attributeMap[key];owner='attributeMap.'+key;}
    else if(area==='attribute' && ['worn','isWorn'].includes(key) && Number.isInteger(fact.wornAttribute)){value=fact.wornAttribute;owner='wornAttribute';}
    else if(area==='fact' && Object.hasOwn(fact,key)){value=fact[key];owner=key;}
    else if(area==='status' && Object.hasOwn(fact,key)){value=fact[key];owner=key;}
    const evidence = audit[key] || (key==='isOpen' ? audit.open : key==='isWorn' ? audit.worn : undefined);
    // Existing audit strings and ledger states are pointers, not an automatic native/consumer certification.
    return {area,key,state:owner?'FACT_PRESENT_REVIEW_SCOPE':'EVIDENCE_RECONCILIATION_REQUIRED',...(owner?{owner,value}:{}),...(evidence?{auditPointer:evidence}:{}),...(manual[key]?{existingLedger:manual[key]}:{}),...(matrix.rows[game]?.keys?.[key]?{historicDraft:matrix.rows[game].keys[key]}:{})};
  });
  const classification = current.rows.find(r=>r.game===game && r.digest===digest);
  if(!classification) throw new Error('Missing current digest classification: '+game);
  return {game,digest,currentClassification:classification,historicClassification:matrix.rows[game]?.classification||'unknown',classificationNote:'Current source-bound decoder result is distinct from historical matrix',factKeys:Object.keys(fact),cells};
});
const report={generatedAt:new Date().toISOString(),factsSha256:crypto.createHash('sha256').update(factsText).digest('hex'),scope:'Reconciliation report only, not a second registry/ledger and not a completion percentage',titleCount:rows.length,keysPerTitle:universe.length,universe,rows};
fs.writeFileSync(path.join(__dirname,'full-coverage-snapshot.json'),JSON.stringify(report,null,2)+'\n');
let md='# Full-scope evidence reconciliation snapshot\n\nGenerated '+report.generatedAt+'. '+rows.length+' titles × '+universe.length+' listed scope slots. This is an evidence inventory, NOT a finished-cell denominator or closure tally. No-dedicated-bit alternatives, derived fields and title-specific status fields still require qualified evidence. Read the JSON for every slot.\n\n';
md+='| Title | Digest prefix | Direct attribute/special fact slots | Slots requiring evidence reconciliation | Current classification |\n|---|---|---:|---:|---|\n';
for(const row of rows){const present=row.cells.filter(c=>c.state==='FACT_PRESENT_REVIEW_SCOPE').length;md+='| '+row.game+' | '+row.digest.slice(0,12)+' | '+present+' | '+(universe.length-present)+' | '+row.currentClassification.classification+'/'+row.currentClassification.evidence+' |\n';}
md+='\nFact presence is not semantic/action success; missing fact is not feature absence. Light and lightSource are kept distinct, as are animate/talkable and worn/wearable. The existing registry, audit records and cell ledger retain authority. This report intentionally invents zero CLOSED/F/N/A verdicts. Current classifying runs and per-title evidence can refine it.\n';
fs.writeFileSync(path.join(__dirname,'full-coverage-snapshot.md'),md);
console.log(JSON.stringify({titles:rows.length,scopeSlots:universe.length,factSlots:rows.reduce((n,r)=>n+r.cells.filter(c=>c.owner).length,0),closuresInferred:0}));
