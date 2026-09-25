const fs = require("fs");
const guide = fs.readFileSync("Full Stack Engine Level Conversion.txt", "utf8");
const plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8") + "\n" + fs.readFileSync("ARCHITECTURE_UML.md", "utf8");

// Topic checklist from guide
const topics = [
  ["Dual-VM Z+Glulx RAM inspection", /Z-Machine|Glulx|object table|0x70|HEAP|vm_read|RAM/i],
  ["Z3/Z5/Z8/ZBlorb coverage", /z3|z5|z8|zblorb/i],
  ["ULX/GBlorb Glulx", /ulx|gblorb|glulxe|git/i],
  ["Room state & look-ahead mapping", /look-ahead|lookahead|exit|mapping|room state/i],
  ["Scope / inventory / container traversal", /scope|inventory|container|child\(|worn|carried/i],
  ["Text-gated visibility / spoiler shield", /text-gate|spoiler|discovered|visibility shield/i],
  ["Deterministic verb/action synthesis", /action synth|verb|attribute|radial|Actionable/i],
  ["Word-to-ObjectID binding", /object.?id|ObjectId|word-to-object/i],
  ["Invalid action suppression", /invalid action|illegal verb|suppression/i],
  ["Glk status/HUD mining", /HUD|status line|grid/i],
  ["Grammar/dictionary meta-commands", /dictionary|grammar|meta-command|0-arg/i],
  ["Global variable heuristics", /global.?var|countdown|resource/i],
  ["Dynamic grammar table extraction", /grammar table|non-standard action/i],
  ["Multi-level container recursion", /container|recursion|opaque|closed/i],
  ["False-positive filtering", /false.?positive|filter/i],
  ["Attribute & traversal matrix", /attribute|OffersLight|openable|lockable/i],
  ["Special mechanics / meta commands", /special|yes.?no|restore|prompt/i],
  ["Non-cardinal topological graphing", /non-cardinal|topolog|graph/i],
  ["Combined UI payload schema", /UIPayload|payload schema/i],
  ["Hybrid grid-force layout", /force.?layout|D3|hybrid.?grid|beautif/i],
  ["Planarization / crossing minimization", /planar|crossing|orthogonal/i],
  ["Z-axis / multi-floor", /z-axis|floor|elevation|zDelta/i],
  ["Save/restore/undo sync", /save|restore|undo|resync/i],
  ["Compiler schema fingerprint I6/I7", /fingerprint|I6|I7|schema|PunyInform/i],
  ["Unambiguous parser commands", /unambiguous|adjective\+noun|disambigu/i],
  ["Pathfinding queue & interrupt", /path|Navigator|step.?queue|interrupt|locked/i],
  ["Darkness & light scope", /dark|OffersLight|light scope/i],
  ["WASM get_vm_ram_ptr / player_obj hooks", /get_vm_ram|player_object|EMSCRIPTEN_KEEPALIVE|vm_read/i],
  ["AsyncGlk event pipeline", /AsyncGlk|GlkOte|extevent|turn/i],
  ["Canvas/overlay Layer 3", /overlay|canvas|outside.?#windowport|L3/i],
  ["Glk window tree / graphics coexistence", /graphics|window.?tree|bounding.?box|dock/i],
  ["Responsive repositioning", /responsive|reposition|viewport geometry/i]
];

function hit(doc, re) { return re.test(doc); }

console.log("GUIDE vs PLAN+UML coverage\n");
console.log("| Topic | In guide | In plan/UML | Gap? |");
console.log("|---|---|---|---|");
const gaps = [];
topics.forEach(([name, re]) => {
  const g = hit(guide, re);
  const p = hit(plan, re);
  const gap = g && !p ? "MISSING FROM PLAN" : (!g && p ? "(plan-only ok)" : (g && p ? "covered" : "neither"));
  if (g && !p) gaps.push(name);
  console.log(`| ${name} | ${g?"yes":"no"} | ${p?"yes":"no"} | ${gap} |`);
});

console.log("\n=== Potential gaps (in guide, weak/absent in plan) ===");
gaps.forEach(g => console.log("-", g));

// Deeper: extract guide bullets that mention MUST / required / critical
console.log("\n=== Guide MUST/CRITICAL lines (sample) ===");
guide.split(/\n/).forEach((l,i) => {
  if (/MUST|CRITICAL|required|always |never |EMSCRIPTEN_KEEPALIVE|get_vm_ram|get_player|Word-to-Object|False-Positive|fingerprint|planarization|grammar table/i.test(l) && l.trim().length > 20 && l.trim().length < 200) {
    console.log((i+1)+": "+l.trim().slice(0,180));
  }
});
