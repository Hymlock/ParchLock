// Retained entry point for original-map regressions after overview withdrawal.
const fs = require('fs');
const vm = require('vm');
let pass = 0;
function ok(value, label) { if (!value) throw new Error(label); pass++; }
const source = fs.readFileSync('js/Map.js', 'utf8');
const topology = fs.readFileSync('js/MapTopology.js', 'utf8');
const beautify = fs.readFileSync('js/MapBeautify.js', 'utf8');
const workspace = fs.readFileSync('js/WorkspaceUI.js', 'utf8');
const css = fs.readFileSync('css/ParchLock.css', 'utf8');
for (const [name, text] of Object.entries({ source, topology, beautify, workspace, css })) {
    ok(!/MapMode|OverviewEnabled|OverviewEdges|overviewLayout|map-overview|overview-mode/.test(text), name + ': withdrawn renderer removed, not disabled');
}
ok(/Math\.max\(0\.65, Math\.min\(1\.8,/.test(source), 'original scale bounds');
ok(/ActivePointers\[ev\.pointerId\]/.test(source), 'pointer identities retained');
ok(/closest\('\.room'\)\[0\] \|\| e\.currentTarget/.test(source), 'room click capture target retained');
ok(/state\.scale \* distance \/ state\.distance/.test(source), 'continuous pinch baseline retained');
ok(/ClearGesture/.test(source) && /pointercancel/.test(source) && /lostpointercapture/.test(source), 'gesture cancellation retained');
ok(/SetScale\(ParchLockMap\.Scale \+ delta/.test(source), 'shared zoom primitive retained');
ok(/clientWidth/.test(workspace) && /function localCenter\(el\)/.test(workspace), 'scale-independent path endpoints retained');
ok(/querySelector\("svg\.map-paths"\)/.test(workspace), 'explicit path layer retained');
ok(/requestAnimationFrame\(function \(\) \{ requestAnimationFrame\(WorkspaceUI\.DrawPaths\); \}\)/.test(source), 'post-open path remeasurement retained');
const sandbox = { console, setInterval() {} };
vm.createContext(sandbox);
vm.runInContext(topology, sandbox);
ok(sandbox.MapTopology.isSystemPropExitKey('exit-13'), 'internal property exit recognized');
ok(!sandbox.MapTopology.isSystemPropExitKey('1'), 'numbered travel preserved');
ok(!sandbox.MapTopology.isSystemPropExitKey('exit 1'), 'named numbered travel preserved');
ok(/isSystemPropExitKey\(dir\)/.test(source), 'local renderer retains internal-exit filtering');
console.log('PASS: original map contract (' + pass + ' passed)');
