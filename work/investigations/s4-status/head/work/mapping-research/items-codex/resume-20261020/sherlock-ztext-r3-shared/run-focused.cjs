const fs=require('fs'),path=require('path'),{spawn}=require('child_process');const d=__dirname,m=JSON.parse(fs.readFileSync(path.join(d,'immutable-manifest.json')));
const jobs=[];
function run(name,args){return new Promise(resolve=>{const log=fs.openSync(path.join(d,name+'.txt'),'w'),p=spawn(process.execPath,args,{cwd:process.cwd(),windowsHide:true,stdio:['ignore',log,log]});p.on('close',exit=>{fs.closeSync(log);console.log(name+' exit'+exit);resolve({name,exit});});});}
for(const label of ['base','candidate'])for(const test of ['command-disambiguation','d34-dictionary-verbs'])jobs.push(run(label+'-'+test,[path.join(m[label],'harness',test+'.js')]));
for(const label of ['base','candidate']){
 const text=fs.readFileSync('harness/m12-room-short-name.js','utf8').replace("path.resolve('play.html')",JSON.stringify(path.join(m[label],'play.html')));
 const file=path.join(d,label+'-m12-runner.cjs');fs.writeFileSync(file,text);jobs.push(run(label+'-m12',[file]));
}
jobs.push(run('zil-ztext-escape',['harness/zil-ztext-escape.js']));
Promise.all(jobs).then(results=>{
 const failures=name=>fs.readFileSync(path.join(d,name+'.txt'),'utf8').split(/\r?\n/).filter(x=>/^(FAIL:|FAILURES)/.test(x));
 const paired={};for(const test of ['command-disambiguation','d34-dictionary-verbs','m12']){const a=failures('base-'+test),b=failures('candidate-'+test);paired[test]={base:a,candidate:b,same:JSON.stringify(a)===JSON.stringify(b)};}
 fs.writeFileSync(path.join(d,'focused-results.json'),JSON.stringify({results,paired,limits:'Existing paired failures are not green passes; original harness source unchanged except explicit immutable play.html location for m12.'},null,2)+'\n');
}).catch(e=>{console.error(e);process.exitCode=1});
