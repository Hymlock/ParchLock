// Engine worker: boots the .NET runtime, loads the game data into its file system, runs the
// Main Hall, and blocks on the service worker whenever the engine asks for input.
// The engine build and game data come from the installed Showcase package, or from this folder in a
// development build. The page names the folder in its first message (a worker served by the service
// worker's cache does not keep its query string).
const PAYLOAD = await new Promise(resolve => {
  self.onmessage = event => { if (event.data && event.data.kind === 'payload') resolve(new URL(event.data.base || './', self.location.href).href); };
});
const { dotnet } = await import(PAYLOAD + '_framework/dotnet.js');
const started = performance.now();
let readSequence = 0, revision = 0, staged = {puts: [], deletes: []};
try {
  const config = await (await fetch(PAYLOAD + '_framework/blazor.boot.json')).json();
  config.applicationEnvironment = 'Production';
  config.assemblyRootFolder = '_framework';
  const runtime = await dotnet.withConfig(config).create();
  runtime.setModuleImports('eamon-host', {
    output(keep, text) { postMessage({kind: 'output', keep, text}); },
    world(json) { postMessage({kind: 'world', json}); },
    lifecycle(kind, name) { postMessage({kind: 'lifecycle', event: kind, name}); },
    trim(dropped) { postMessage({kind: 'trim', dropped}); },
    phase(kind, detail) { postMessage({kind: 'phase', phase: kind, detail}); },
    stage(path, bytes) { staged.puts.push({path, bytes: Uint8Array.from(bytes)}); },
    unstage(path) { staged.deletes.push(path); },
    commit(launch) {
      postMessage({kind: 'commit', revision: ++revision, puts: staged.puts, deletes: staged.deletes, launch: launch ? launch.split('\n') : null});
      staged = {puts: [], deletes: []};
    },
    sleep(milliseconds) { /* pacing delays are presentation; the page owns pacing */ },
    read(kind, size, fill, mask, defaultText, safePoint) {
      const id = ++readSequence;
      postMessage({kind: 'read', id, type: kind, size, fill, mask, defaultText, safePoint});
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
  const manifest = await (await fetch(PAYLOAD + 'eamon-data/manifest.json')).json();
  let bytes = 0;
  const hashes = {};
  await Promise.all(manifest.files.map(async file => {
    const data = new Uint8Array(await (await fetch(PAYLOAD + 'eamon-data/' + file)).arrayBuffer());
    bytes += data.length;
    if (/^Adventures\//.test(file)) hashes[file] = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    entry.WriteFile(file, data);
  }));
  // One fingerprint per adventure folder: a digest of its pristine package files (path and bytes), so the page can tell
  // which adventures a new package changed (plan 9a, Grok #3454 A5).
  const byDir = {};
  for (const file of manifest.files) {
    const m = /^Adventures\/([^/]+)\//.exec(file);
    if (m) (byDir[m[1]] = byDir[m[1]] || []).push(file);
  }
  const fingerprints = {};
  for (const dir of Object.keys(byDir)) {
    const parts = [];
    for (const file of byDir[dir].sort()) {
      parts.push(new TextEncoder().encode(file + '\n'), hashes[file]);
    }
    const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0; for (const p of parts) { all.set(p, at); at += p.length; }
    fingerprints[dir] = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', all)), b => b.toString(16).padStart(2, '0')).join('');
  }
  // Saved campaign files (and deletions) go over the pristine bundle; the page owns durable storage.
  const boot = await new Promise(resolve => { self.onmessage = event => { if (event.data.kind === 'boot') resolve(event.data); }; postMessage({kind: 'hello', fingerprints, packaged: manifest.files}); });
  for (const file of boot.files) { if (file.deleted) entry.DeleteFile(file.path); else entry.WriteFile(file.path, file.bytes); }
  entry.Baseline();
  postMessage({kind: 'ready', restored: boot.files.length, resumed: boot.launch, runtimeMs: runtimeReady - started, dataMs: performance.now() - runtimeReady, files: manifest.files.length, bytes});
  self.onmessage = event => {
    if (event.data.kind === 'list') postMessage({kind: 'files', files: entry.ListFiles()});
  };
  const result = entry.Run(boot.launch || manifest.launch);
  postMessage({kind: 'result', value: result, files: entry.ListFiles()});
} catch (error) { postMessage({kind: 'error', value: String(error), stack: error.stack}); }
