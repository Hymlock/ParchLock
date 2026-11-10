const http = require('http'), fs = require('fs'), path = require('path');
const {chromium} = require(path.join(process.env.PARCHLOCK_SOURCE_ROOT, 'node_modules/playwright'));
const work = process.env.PARCHLOCK_PROBE_WORK;
const root = path.join(work, 'browser-probe/bin/Release/net8.0/publish/wwwroot');
const mime = {'.html':'text/html','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.css':'text/css','.dat':'application/octet-stream'};
(async () => {
 const server = http.createServer((req,res) => {
  const pathname = new URL(req.url,'http://localhost').pathname;
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes) => {if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');res.end(bytes);});
 });
 await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
 const url = 'http://127.0.0.1:' + server.address().port;
 const profile = fs.mkdtempSync(path.join(work, 'storage-profile-'));
 let context;
 async function open() {
  context = await chromium.launchPersistentContext(profile,{headless:true});
  const page = await context.newPage(); await page.goto(url);
  await page.waitForFunction(() => typeof DotNet !== 'undefined' && document.querySelector('h1')?.textContent.includes('Hello'),null,{timeout:45000});
  return page;
 }
 try {
  let page = await open();
  const original = fs.readFileSync(path.join(process.env.PARCHLOCK_EAMON_UPSTREAM,'Adventures/TheBeginnersCave/MODULE.DAT')).toString('base64');
  const before = JSON.parse(await page.evaluate(data => DotNet.invokeMethodAsync('browser-probe','Inspect',data), original));
  if (!before.serialization.ok) throw new Error('Source serializer failed');
  await page.evaluate(data => new Promise((resolve,reject) => {
   const request = indexedDB.open('eamon-isolated-g1-probe',1);
   request.onupgradeneeded = () => request.result.createObjectStore('payload');
   request.onerror = () => reject(request.error);
   request.onsuccess = () => {const db=request.result;const tx=db.transaction('payload','readwrite');tx.objectStore('payload').put(data,'module');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
  }),before.serialization.compressedCopy);
  await context.close(); context = null;
  page = await open();
  const stored = await page.evaluate(() => new Promise((resolve,reject) => {
   const request=indexedDB.open('eamon-isolated-g1-probe',1);request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{const db=request.result;const tx=db.transaction('payload','readonly');const read=tx.objectStore('payload').get('module');read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error);tx.oncomplete=()=>db.close();};
  }));
  const after = JSON.parse(await page.evaluate(data => DotNet.invokeMethodAsync('browser-probe','Inspect',data),stored));
  const summary = result => {const {compressedCopy,...rest}=result.serialization;return rest;};
  const receipt = {scope:'Actual Eamon MODULE.DAT serializer bytes committed to isolated IndexedDB and read after complete Chromium process restart. Not engine save/restore, atomic multi-file journal or production learning persistence.',before:summary(before),after:summary(after),sameStoredBytes:stored===before.serialization.compressedCopy};
  receipt.pass=receipt.sameStoredBytes&&after.serialization.ok&&before.serialization.title===after.serialization.title&&before.serialization.rooms===after.serialization.rooms&&before.serialization.artifacts===after.serialization.artifacts;
  fs.writeFileSync(path.join(work,'storage-probe-receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));if(!receipt.pass)process.exitCode=1;
 } finally {if(context)await context.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
