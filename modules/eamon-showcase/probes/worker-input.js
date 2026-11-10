import { dotnet } from './_framework/dotnet.js';
try {
  const config = await (await fetch('./_framework/blazor.boot.json')).json();
  config.applicationEnvironment = 'Production';
  config.assemblyRootFolder = '_framework';
  const runtime = await dotnet.withConfig(config).create();
  runtime.setModuleImports('input-probe', {read(prompt) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/probe-input?prompt=' + encodeURIComponent(prompt), false);
    xhr.send();
    if (xhr.status !== 200) throw new Error('Input rejected: ' + xhr.status);
    return xhr.responseText;
  }});
  const exports = await runtime.getAssemblyExports('browser-probe');
  postMessage({kind:'ready'});
  postMessage({kind:'result', value:exports.InputProbe.Run()});
} catch (error) { postMessage({kind:'error', value:String(error), stack:error.stack}); }
