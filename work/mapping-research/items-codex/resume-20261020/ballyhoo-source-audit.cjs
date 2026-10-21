// Read-only source qualification, not a flag-closure or bytecode reachability proof.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const A=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js');
const dir=path.join(__dirname,'ballyhoo-on');fs.mkdirSync(dir,{recursive:true});
const source=path.join(require('os').tmpdir(),'hs-src/ballyhoo/historicalsource-ballyhoo-9f779e8');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=fs.readdirSync(source).filter(f=>/\.zil$/i.test(f));
const manifest=files.map(file=>({file,sha256:hash(fs.readFileSync(path.join(source,file)))}));
const scanner='work/investigations/zil-titles/source-search/zilscan.js';
const scan=execFileSync(process.execPath,[scanner,source,'ONBIT'],{encoding:'utf8'});
fs.writeFileSync(path.join(dir,'whole-source-ONBIT.txt'),scan);
const current=Buffer.from(A.story('Ballyhoo.z3.js')),release=fs.readFileSync(path.join(source,'m4-release.zip'));
const end=current.readUInt16BE(26)*2;
let differences=0;for(let i=0;i<release.length;i++)if(current[i]!==release[i])differences++;
const candidates=[];for(let pc=0;pc<end;pc++){const x=A.decodeAt(current,3,pc);if(!x.bad&&x.kind==='2OP'&&[11,12].includes(x.op)&&x.ops[1]?.t!==2&&x.ops[1]?.v===24)candidates.push({at:pc,op:x.op,operands:x.ops});}
const report={source,sourceRevisionPrefix:'9f779e8',manifest,scannerSha256:hash(fs.readFileSync(scanner)),currentDigest:hash(current),currentBytes:current.length,declaredPayloadBytes:end,archivedReleaseBytes:release.length,archivedReleaseSha256:hash(release),prefixDifferences:differences,declaredPayloadMatchesArchive:end===release.length&&differences===0,literalSetClear24Candidates:candidates,candidateQualification:'Every-byte overapproximation includes operands/strings/data. These are not validated instructions, reachable writers or a proof of single ownership.'};
fs.writeFileSync(path.join(dir,'source-provenance.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({sourceFiles:files.length,payloadMatches:report.declaredPayloadMatchesArchive,literalCandidates:candidates.length}));
