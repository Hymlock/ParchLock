const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require(path.join(process.env.PARCHLOCK_SOURCE_ROOT, 'node_modules/playwright'));
const root=path.resolve(process.env.PARCHLOCK_PROBE_WORK,'browser-probe/bin/Release/net8.0/publish/wwwroot');
const fixtures=new Set(['/input-index.html','/input-sw.js','/worker-input.js']);
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.dat':'application/octet-stream'};
(async()=>{
 const logs=[];const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=fixtures.has(pathname)?path.join(__dirname,pathname.slice(1)):path.resolve(root,'.'+pathname);
  if(!fixtures.has(pathname)&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try {
  browser=await chromium.launch({headless:true});const page=await browser.newPage();
  page.on('console',m=>logs.push({type:m.type(),text:m.text()}));page.on('pageerror',e=>logs.push({type:'pageerror',text:String(e)}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/input-index.html');
  await page.waitForFunction(()=>receipt.messages.some(m=>m.kind==='result'||m.kind==='error'),null,{timeout:45000});
  const receipt=await page.evaluate(()=>window.receipt);receipt.logs=logs;
  receipt.scope='Local Chromium mechanism only: .NET worker synchronous input suspension, two responses, UI heartbeat. Not Eamon gameplay or cross-target G1 acceptance.';
  receipt.pass=receipt.messages.some(m=>m.kind==='result'&&m.value==='alpha:beta')&&receipt.requests.length===2&&receipt.requests[1].ticks>receipt.requests[0].ticks+5;
  await page.goto('http://127.0.0.1:'+server.address().port+'/input-index.html?cancel');
  await page.waitForFunction(()=>receipt.messages.some(m=>m.kind==='result'||m.kind==='error'),null,{timeout:45000});
  receipt.cancellation=await page.evaluate(()=>window.receipt);
  receipt.cancellation.pass=receipt.cancellation.requests.length===1&&receipt.cancellation.messages.some(m=>m.kind==='error'&&m.value.includes('409'))&&!receipt.cancellation.messages.some(m=>m.kind==='result');
  receipt.pass=receipt.pass&&receipt.cancellation.pass;
  fs.writeFileSync(path.join(process.env.PARCHLOCK_PROBE_WORK,'input-probe-receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));if(!receipt.pass)process.exitCode=1;
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
