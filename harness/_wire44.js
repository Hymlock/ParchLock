const fs = require("fs");
let html = fs.readFileSync("play.html", "utf8");
const extras = [
  "js/DarkScope.js",
  "js/GraphicsDock.js",
  "js/MapBeautify.js",
  "js/LiveHeapProvider.js"
];
extras.forEach(src => {
  if (html.indexOf(src) >= 0) return;
  html = html.replace(
    '<script src="js/WorldModel.js"></script>',
    '<script src="' + src + '"></script>\n\t\t<script src="js/WorldModel.js"></script>'
  );
});
// Ensure order: ... LiveHeap before WorldModel is fine; TranslatorUI after WorldModel already
fs.writeFileSync("play.html", html);
console.log("wired", extras.every(s => html.includes(s)));

// ParchLock loop: DarkScope.noteText
let p = fs.readFileSync("js/ParchLock.js", "utf8");
if (p.indexOf("DarkScope.noteText") < 0) {
  p = p.replace(
    /if \(typeof TextGate !== "undefined" && typeof \$ !== "undefined"\) \{ try \{ TextGate\.noteText\(\$\("#windowport"\)\.text\(\)\); \} catch \(e\) \{\} \}/g,
    'if (typeof TextGate !== "undefined" && typeof $ !== "undefined") { try { TextGate.noteText($("#windowport").text()); } catch (e) {} }\n\t\tif (typeof DarkScope !== "undefined" && typeof $ !== "undefined") { try { DarkScope.noteText($("#windowport").text()); } catch (e) {} }\n\t\tif (typeof GraphicsDock !== "undefined") { try { GraphicsDock.detect(); } catch (e) {} }\n\t\tif (typeof MapBeautify !== "undefined") { try { MapBeautify.tick(); } catch (e) {} }'
  );
  fs.writeFileSync("js/ParchLock.js", p);
  console.log("ParchLock loop hooked");
}

// Matrix harness ? play.html + catalog games only
const matrix = `#!/usr/bin/env node
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const stories = [
  "games/Ballyhoo.z3.js",
  "games/Advent.z5.js",
  "games/lost.z5.js",
  "games/wump2ka.z5.js",
  "games/yagwad.z5.js",
  "games/LostPig.z8.js",
  "games/anchor.z8.js",
  "games/Accuse.zblorb.js"
];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const results = [];
  for (const rel of stories) {
    if (!fs.existsSync(rel)) { results.push({ rel, ok: false, reason: "missing" }); continue; }
    const url = "http://127.0.0.1:8765/play.html?story=" + encodeURIComponent("http://127.0.0.1:8765/" + rel);
    const row = { rel, ok: false };
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(6000);
      const snap = await page.evaluate(() => ({
        path: location.pathname,
        hasMap: !!document.getElementById("map"),
        hasTools: !!document.getElementById("tools-toggle"),
        autocomplete: typeof Autocomplete,
        translator: typeof TranslatorUI,
        world: typeof WorldModel,
        input: !!document.querySelector(".Input.LineInput, input.Input"),
        errs: window.__PL_BOOT_ERRS || null
      }));
      row.snap = snap;
      row.ok = snap.path.indexOf("play.html") >= 0 && snap.hasMap && snap.hasTools && snap.translator === "object" && snap.autocomplete === "object";
    } catch (e) {
      row.reason = String(e.message || e);
    }
    results.push(row);
    console.log(row.ok ? "PASS" : "FAIL", rel, row.reason || "");
  }
  const out = path.join(__dirname, "shots-build43", "matrix-playhtml.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  const failed = results.filter(r => !r.ok);
  await browser.close();
  if (failed.length) { console.error("matrix failures", failed.length); process.exit(1); }
  console.log("matrix-playhtml PASS", results.length);
})().catch(e => { console.error(e); process.exit(1); });
`;
fs.writeFileSync("harness/matrix-playhtml.js", matrix);

// Docs product rule
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
plan = plan.replace(/BUILD 43/g, "BUILD 44");
if (plan.indexOf("D15") < 0) {
  plan = plan.replace(/\| D14 \|[^\n]+\n/, (m) => m + "| D15 | Product UX is play.html only for all catalog modules; Emglken special URLs are experimental/off | [yes] |\n");
}
const status = `## Implementation status (live)

**BUILD 44** ? product rule locked: **play.html is the app** for every catalog module (z3/z5/z8/zblorb). No per-module jerry-rigging.

### Done
- D15 play.html-only product path; HostEmglkenBridge inert unless \`?experimental_emglken=1\`
- Translator chrome on Quixe path: TextGate, ActionSynth, MapIdentity, TranslatorUI, Navigator queue
- DarkScope + GraphicsDock + MapBeautify (floors/layout hints) + LiveHeapProvider (Quixe peek / story-byte fallback)
- Portable package + NOTICE + harness gates
- Matrix harness \`harness/matrix-playhtml.js\` boots catalog stories through play.html UI

### Deferred ? landed or narrowed
- Live HEAP: Quixe.ReadByte probe when present; story-byte ABI2 remains fallback (Bocfel export still optional accelerator)
- Beautify/graphics: MapBeautify + pl-graphics-dock CSS on play.html chrome
- Dark/OffersLight: DarkScope heuristic provider + \`pl-dark-scope\` chrome cue
- Module matrix: play.html across z3/z5/z8/zblorb + specialized gates

### Explicit non-goals
- Separate tapped-page or host=emglken as the normal player path
- Clean-room GameList / CRT rewrite
`;
const s0 = plan.indexOf("## Implementation status (live)");
if (s0 >= 0) {
  let s1 = plan.indexOf("\n## ", s0 + 5);
  if (s1 < 0) s1 = plan.length;
  // find a safer end ? next ## after status that isn't ### 
  const alt = plan.indexOf("### Explicit non-goals", s0);
  if (alt > 0) {
    const after = plan.indexOf("\n## ", alt);
    s1 = after > 0 ? after : plan.length;
  }
  plan = plan.slice(0, s0) + status + "\n" + plan.slice(s1);
} else plan += "\n" + status;
fs.writeFileSync("PRODUCTION_PLAN.md", plan);

let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
uml = uml.replace(/BUILD 43/g, "BUILD 44");
if (uml.indexOf("D15") < 0) uml += "\n\n## 20. Product rule (D15)\n\nAll player UX flows through \`play.html\` + Quixe for catalog modules. Emglken entry points are experimental only.\n";
fs.writeFileSync("ARCHITECTURE_UML.md", uml);
console.log("docs BUILD44");
