// Engine worker: boots the .NET runtime, loads the game data into its file system, runs the
// Main Hall, and blocks on the service worker whenever the engine asks for input.
import { dotnet } from './_framework/dotnet.js';
const started = performance.now();
let readSequence = 0, revision = 0, staged = {puts: [], deletes: []};
try {
  const config = await (await fetch('./_framework/blazor.boot.json')).json();
  config.applicationEnvironment = 'Production';
  config.assemblyRootFolder = '_framework';
  const runtime = await dotnet.withConfig(config).create();
  runtime.setModuleImports('eamon-host', {
    output(keep, text) { postMessage({kind: 'output', keep, text}); },
    phase(kind, detail) { postMessage({kind: 'phase', phase: kind, detail}); },
    stage(path, bytes) { staged.puts.push({path, bytes: Uint8Array.from(bytes)}); },
    unstage(path) { staged.deletes.push(path); },
    commit(launch) {
      postMessage({kind: 'commit', revision: ++revision, puts: staged.puts, deletes: staged.deletes, launch: launch ? launch.split('\n') : null});
      staged = {puts: [], deletes: []};
    },
    sleep(milliseconds) { /* pacing delays are presentation; the page owns pacing */ },
    read(kind, size, fill, mask, defaultText) {
      const id = ++readSequence;
      postMessage({kind: 'read', id, type: kind, size, fill, mask, defaultText});
      for (;;) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', './eamon-input?id=' + id, false);
        xhr.send();
        if (xhr.status === 200) return JSON.parse(xhr.responseText);
        if (xhr.status === 409) return null;
        if (xhr.status !== 204) throw new Error('Input channel failed: ' + xhr.status);
      }
    }
  });
  const exports = await runtime.getAssemblyExports('eamon-host');
  const entry = exports.ParchLock.EamonHost.Entry;
  const runtimeReady = performance.now();
  const manifest = await (await fetch('./eamon-data/manifest.json')).json();
  let bytes = 0;
  await Promise.all(manifest.files.map(async file => {
    const data = new Uint8Array(await (await fetch('./eamon-data/' + file)).arrayBuffer());
    bytes += data.length;
    entry.WriteFile(file, data);
  }));
  // Saved campaign files (and deletions) go over the pristine bundle; the page owns durable storage.
  const boot = await new Promise(resolve => { self.onmessage = event => { if (event.data.kind === 'boot') resolve(event.data); }; postMessage({kind: 'hello'}); });
  for (const file of boot.files) { if (file.deleted) entry.DeleteFile(file.path); else entry.WriteFile(file.path, file.bytes); }
  entry.Baseline();
  postMessage({kind: 'ready', restored: boot.files.length, resumed: boot.launch, runtimeMs: runtimeReady - started, dataMs: performance.now() - runtimeReady, files: manifest.files.length, bytes});
  self.onmessage = event => {
    if (event.data.kind === 'list') postMessage({kind: 'files', files: entry.ListFiles()});
  };
  const result = entry.Run(boot.launch || manifest.launch);
  postMessage({kind: 'result', value: result, files: entry.ListFiles()});
} catch (error) { postMessage({kind: 'error', value: String(error), stack: error.stack}); }
