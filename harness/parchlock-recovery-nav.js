// codex D117/D118 audit (bus #786, blocker 1): ParchLock.EnsureStoryOrRecover's
// "Continue" and "Choose a story" controls on the no-story recovery screen
// were real <a href> anchors. Global.BindNavigationGuard (D113) unconditionally
// blocks every relative-anchor click, everywhere, by design -- so both
// controls were silently dead, exactly matching the original operator
// report this session started from. Real Chromium probe (codex): both
// visibly present, both clicks left the URL unchanged and logged
// "ParchLock: blocked in-WebView navigation to ...".
//
// Fix: both are now real <button>s doing a programmatic location.href
// assignment -- the SAME established pattern this app's other two
// intentional whole-app exits (Choose story / Exit game, js/WorkspaceUI.js)
// already use, per Global.BindNavigationGuard's own documented exemption.
// Source-level checks only (consistent with this project's convention for
// structural fixes that don't need a full DOM harness); the interactive
// click -> navigation behavior itself needs the operator's/codex's own live
// browser re-verification, the same as any other real click/navigation path.

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "ParchLock.js"), "utf8");

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// Scope every check to EnsureStoryOrRecover's own body, not the whole file.
var m = /EnsureStoryOrRecover:\s*\(\)\s*=>\s*\{[\s\S]*?\n    \},/.exec(src);
assert(!!m, "EnsureStoryOrRecover's function body is still present and matches the expected shape (sanity check the regex below is scoped correctly)");
var body = m ? m[0] : "";

assert(!/<a\s+class=['"]pl-primary['"]\s+href=/.test(body), "Continue is no longer a real <a href> anchor (BindNavigationGuard unconditionally blocks every relative-anchor click)");
assert(!/<a\s+class=['"]pl-secondary['"]\s+href=['"]index\.html['"]/.test(body), "Choose a story is no longer a real <a href> anchor either");
assert(/<button id='start-continue' class='pl-primary' type='button'>Continue<\/button>/.test(body), "Continue is now a real <button> -- native Tab/Enter/Space activation for free, and structurally invisible to the anchor-only navigation guard");
assert(/<button id='start-choose' class='pl-secondary' type='button'>Choose a story<\/button>/.test(body), "Choose a story is now a real <button> too");
assert(/#start-continue[\s\S]{0,200}location\.href\s*=\s*"play\.html\?story="\s*\+\s*encodeURIComponent\(lastModule\.Path\)/.test(body), "Continue's click handler does a real programmatic location.href assignment to the last story, the same pattern WorkspaceUI's own Choose story / Exit game already use");
assert(/#start-choose[\s\S]{0,200}location\.href\s*=\s*"index\.html"/.test(body), "Choose a story's click handler does a real programmatic location.href assignment to index.html");
assert(/off\(['"]click\.plContinue['"]\)\.on\(['"]click\.plContinue['"]/.test(body), "Continue's handler is bound with a namespaced .off().on() pair (same convention #start-modules already used), so re-running EnsureStoryOrRecover never double-binds a second handler");
assert(/off\(['"]click\.plChoose['"]\)\.on\(['"]click\.plChoose['"]/.test(body), "Choose a story's handler uses the same namespaced .off().on() convention");

// The CSS backing these controls must style <button> the same as <a> (both
// the base #start-screen rule and the mobile body.no-story override), or
// the buttons would render unstyled/invisible even though they now work.
const cssSrc = fs.readFileSync(path.resolve(__dirname, "..", "css", "ParchLock.css"), "utf8");
assert(/#start-screen a,\s*#start-screen button\s*\{/.test(cssSrc), "the base #start-screen rule styles both <a> and <button> identically");
assert(/body\.no-story #start-screen a,\s*\n?\s*body\.no-story #start-screen button\s*\{/.test(cssSrc), "the mobile/no-story override rule already covered both <a> and <button> (pre-existing, confirmed still present)");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
