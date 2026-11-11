const fs=require('fs'),http=require('http'),path=require('path');
const {chromium}=require(path.join(process.env.PARCHLOCK_SOURCE_ROOT,'node_modules/playwright'));
const root=path.join(process.env.PARCHLOCK_HOST_WORK,'eamon-host/bin/Release/net8.0/publish/wwwroot');
const visibility=process.env.PARCHLOCK_PROBE_CASE==='visibility';
if(process.env.PARCHLOCK_PROBE_CASE&&!['metadata','visibility'].includes(process.env.PARCHLOCK_PROBE_CASE))throw new Error('Unknown probe case');
const worker=`import {dotnet} from './_framework/dotnet.js';
try {const config=await(await fetch('./_framework/blazor.boot.json')).json(); config.applicationEnvironment='Production';config.assemblyRootFolder='_framework';
const runtime=await dotnet.withConfig(config).create();const staged=[];let commits=0;
runtime.setModuleImports('eamon-host',{stage(path,bytes){staged.push({path,bytes:Array.from(bytes)});},unstage(){},commit(){commits++;}});
const exports=await runtime.getAssemblyExports('eamon-host');postMessage({result:JSON.parse(exports.${visibility?'VisibilityProbe.Check':'MetadataProbe.Rewrite'}()),staged,commits});
}catch(error){postMessage({error:String(error)});}`;
(async()=>{let browser;const server=http.createServer((req,res)=>{
if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<script>window.result=null;const worker=new Worker("/probe.js",{type:"module"});worker.onmessage=event=>window.result=event.data;</script>');return;}
if(req.url==='/probe.js'){res.setHeader('Content-Type','text/javascript');res.end(worker);return;}
const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':file.endsWith('.js')?'text/javascript':'application/json');res.end(data);});});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
 browser=await chromium.launch({headless:true});const page=await browser.newPage();
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForFunction(()=>window.result,null,{timeout:45000});
 const result=await page.evaluate(()=>window.result);
 result.scope=visibility?'Isolated native base Room/Artifact fixture. Query side effect only; not full visibility or UI acceptance.':'Isolated actual Persistence.Flush with same-length same-timestamp changed bytes. Not gameplay.';
 result.pass=visibility
  ? !result.error&&result.result?.before===false&&result.result?.listed===false&&result.result?.after===true&&result.result?.direct===false&&result.result?.directSeen===false
  : !result.error&&result.result?.sameStamp===true&&result.commits===1&&result.staged?.length===1&&JSON.stringify(result.staged[0].bytes)==='[4,5,6]';
 fs.writeFileSync(path.join(process.env.PARCHLOCK_HOST_WORK,visibility?'native-visibility-receipt.json':'codex-metadata-receipt.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));if(!result.pass)process.exitCode=1;
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
