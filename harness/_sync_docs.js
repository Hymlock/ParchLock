const fs = require("fs");
const path = require("path");
const root = process.argv[2];

// ----- PRODUCTION_PLAN.md -----
let plan = fs.readFileSync(path.join(root, "PRODUCTION_PLAN.md"), "utf8");

// Fix decision log: add D13 if missing
if (!plan.includes("| D13 |")) {
  plan = plan.replace(
    /(\| D12 \|[^\n]+\n)/,
    "$1| D13 | Ship as a self-contained static package (`DISTRIBUTE.md`); runtime has no SKSEDevKit/emsdk/user-home absolutes; DevKits are build-only | [yes] |\n"
  );
}

const statusBlock = `

## Implementation status (live)

**Authority checkpoint:** BUILD **41** (Consts.js). Quixe \`play.html\` remains the default product path. Emglken is an opt-in dual host.

### Done
| Item | Evidence |
|---|---|
| L2.5 WorldModel Translator seam | \`js/WorldModel.js\` provider registry + UIPayload; wired in \`ParchLock.Loop\` |
| P1 Heuristic provider | DOM / map / inventory collect inside WorldModel |
| P0 Behavioral / RemGlk provider | \`js/RemGlkTapProvider.js\` intercepts \`GlkOte.update\` (room/exits/objects) |
| Glk DOM tap fallback | \`js/GlkTapProvider.js\` |
| Emglken dual host | \`play-emglken.html\` → \`lib/parchment-modern/parchment-single-tapped.html\` (Parchment 2026.8.23 / Bocfel) |
| Emglken staging assets | \`lib/emglken/*\` from npm \`emglken@0.7.2\`; \`js/EmglkenHost.js\`, \`js/EmglkenProvider.js\` |
| Portable probe WASM | \`lib/pm_vm_probe.{js,wasm}\` + \`js/VmProbeLoader.js\` (story-byte scan; relative \`parchlock-root\`) |
| Native/WASM toolchain | \`native-hooks/\` CMake+Ninja; MSVC via DevKit **or** \`PARCHLOCK_DEVKIT\`; Emscripten via local emsdk for rebuilds only |
| Distribution contract | \`DISTRIBUTE.md\` — static server package; no runtime machine lock-in |
| Harness gates | \`harness/docs-sync.js\`, \`payload-schema.js\`, \`native-hooks-gate.js\`, \`emglken-stage-gate.js\`, \`parchment-modern-gate.js\`, \`glk-tap-gate.js\`, \`remglk-distribute-gate.js\`, \`emglken-bocfel-smoke.mjs\` |

### In progress
| Item | Notes |
|---|---|
| Z-machine object-table summary in probe | ABI moving to v2 (\`pm_vm_probe_z_summary\`) — story image walk, not live Bocfel HEAP yet |
| RemGlk \`specialCommands\` | Detect yes/no / restore-style specialized prompts for intricate games |

### Next (ordered)
1. Finish probe ABI v2 object-table walk + ship updated \`lib/pm_vm_probe.*\`
2. Feed object-table samples into WorldModel as low-confidence structural facts (P2 light)
3. RemGlk special prompt / specialized-system commands in UIPayload
4. Only then: matrix test across module types (z3/z5/z8/glulx + intricate gates like wump2ka/yagwad)
5. Live HEAP/object identity still requires Bocfel/RemGlk-rs export work (not day-one)

### Explicit non-goals right now
- Do not rip Quixe default path
- Do not require end-users to install SKSEDevKit or emsdk
- Do not treat full-module zoo testing as a substitute for unfinished probe/provider work
`;

if (plan.includes("## Implementation status (live)")) {
  plan = plan.replace(/## Implementation status \(live\)[\s\S]*$/m, statusBlock.trim() + "\n");
} else {
  plan = plan.trimEnd() + "\n\n" + statusBlock.trim() + "\n";
}

fs.writeFileSync(path.join(root, "PRODUCTION_PLAN.md"), plan);

// ----- ARCHITECTURE_UML.md -----
let uml = fs.readFileSync(path.join(root, "ARCHITECTURE_UML.md"), "utf8");

uml = uml.replace(
  /\*\*Status:\*\* Draft audited 2026-09-11/,
  "**Status:** Audited 2026-09-11 (updated BUILD 41 dual-host + RemGlk + portable probe)"
);

uml = uml.replace(
  /### Audit note\r?\nUpdated to show \*\*L2.5 WorldModel Translator\*\*, provider ranking \(D12\), and corrected ship order \(not RAM-first\)\. Repo host today remains Quixe\/ZVM \(`lib\/`\)\./,
  "### Audit note\nUpdated for **BUILD 41**: L2.5 Translator (D12), dual-host Emglken opt-in, RemGlk/GlkTap providers, portable `pm_vm_probe` + `DISTRIBUTE.md` (D13). Default product host remains Quixe/ZVM (`play.html`). Emglken host is `play-emglken.html`."
);

uml = uml.replace(
  /subgraph TODAY\["Current BUILD 33"\]/,
  'subgraph TODAY["Current default BUILD 41 — Quixe/ZVM"]'
);

// Update decision anchors table if present
if (uml.includes("| D12 |") && !uml.includes("| D13 |")) {
  uml = uml.replace(/(\| D12 \|[^\n]+\n)/, "$1| D13 | Portable static distribute package; DevKits build-only |\n");
}

const newSections = `

---

## 14. Dual-host runtime (BUILD 41)

\`\`\`mermaid
flowchart TB
  subgraph DEFAULT["Default product"]
    PLAY[play.html] --> MAIN[lib/main.js]
    MAIN --> ZVM[zvm.js Z]
    MAIN --> QUIXE[quixe.js Glulx]
    PLAY --> PM[js/ParchLock.js Loop]
    PM --> WM1[WorldModel heuristic]
  end

  subgraph EMGLKEN["Opt-in Emglken host"]
    PE[play-emglken.html] --> TAP[parchment-single-tapped.html]
    TAP --> BOC[Bocfel via Parchment 2026.8.23]
    TAP --> WM2[WorldModel]
    WM2 --> REM[RemGlkTapProvider P0]
    WM2 --> GLK[GlkTapProvider]
    WM2 --> stub[EmglkenProvider]
    WM2 --> PROBE[VmProbeLoader + lib/pm_vm_probe.wasm]
    PROBE -->|story bytes| ZOBJ[Z object-table summary]
    REM -->|GlkOte.update| PAY[UIPayload]
  end
\`\`\`

**Packaging:** runtime ships under repo root per \`DISTRIBUTE.md\`. Relative \`meta[name=parchlock-root]\`. No SKSEDevKit/emsdk required to play.

---

## 15. Provider map (implemented vs target)

| Provider | File | Rank | Status |
|---|---|---|---|
| Heuristic | \`js/WorldModel.js\` collectHeuristic | P1 | [yes] live on Quixe path |
| RemGlk / GlkOte.update | \`js/RemGlkTapProvider.js\` | P0 | [yes] live on Emglken tapped host |
| Glk DOM tap | \`js/GlkTapProvider.js\` | P0/P1 assist | [yes] |
| Emglken stub meta | \`js/EmglkenProvider.js\` | meta | [yes] |
| Story-byte Z probe | \`js/VmProbeLoader.js\` + \`lib/pm_vm_probe.*\` | P2 light | [~] scan + ABI→v2 object summary in progress |
| Live Bocfel HEAP | native-hooks linked into terp | P2 full | [ ] not started |
| Inform-Glulx RAM | — | P3 | [ ] |

---

## 16. Probe ABI (shipped WASM)

\`\`\`mermaid
flowchart LR
  STORY[story .z5/.z8 bytes] --> LOAD[VmProbeLoader]
  LOAD --> WASM[lib/pm_vm_probe.wasm]
  WASM --> INFO[pm_vm_probe_info]
  WASM --> SCAN[pm_vm_probe_scan_stub]
  WASM --> ZSUM[pm_vm_probe_z_summary ABI2]
  ZSUM --> WM[WorldModel structural facts]
\`\`\`

Build-only: \`native-hooks/build.ps1\` (MSVC) and Emscripten wasm preset. Outputs copied to \`lib/\` for distribution.

---

## 17. Open questions (updated)

1. When to promote Emglken from opt-in to default without regressing Quixe UX?
2. How much object-table data is safe to show under the text-gated spoiler shield?
3. Specialized prompt UIs (yes/no, restore, content gates): handle in RemGlk \`specialCommands\` before broad module-matrix testing.
4. Live HEAP still blocked on terp export surface — keep story-byte structural probe as the shippable P2 light path.
`;

if (!uml.includes("## 14. Dual-host runtime")) {
  uml = uml.trimEnd() + "\n" + newSections + "\n";
} else {
  uml = uml.replace(/## 14\. Dual-host runtime[\s\S]*$/m, newSections.trim() + "\n");
}

// Refresh open questions section 13 pointer
uml = uml.replace(
  /## 13\. Open questions \(Phase 0-2\)[\s\S]*?(?=\n---\n|\n## 14\.|$)/,
  "## 13. Open questions (Phase 0-2)\n\nSuperseded by **§17** for BUILD 41+. Keep historical bullets in git history if needed.\n\n"
);

fs.writeFileSync(path.join(root, "ARCHITECTURE_UML.md"), uml);

// Update docs-sync gate tokens
const docsSync = `const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const plan = fs.readFileSync(path.join(root, "PRODUCTION_PLAN.md"), "utf8");
const uml = fs.readFileSync(path.join(root, "ARCHITECTURE_UML.md"), "utf8");
const need = [
  "D12", "D13", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader",
  "DISTRIBUTE.md", "play-emglken.html", "Dual-host runtime"
];
let ok = true;
for (const token of need) {
  if (!plan.includes(token) && token !== "Dual-host runtime") {
    // Dual-host is UML-specific
  }
  if (!plan.includes(token) && !["Dual-host runtime"].includes(token)) {
    console.error("PRODUCTION_PLAN missing", token);
    ok = false;
  }
  if (!uml.includes(token) && token !== "DISTRIBUTE.md") {
    // DISTRIBUTE filename may only be in plan; allow UML to say DISTRIBUTE
  }
}
for (const token of ["D12", "D13", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader", "Dual-host runtime"]) {
  if (!uml.includes(token)) { console.error("ARCHITECTURE_UML missing", token); ok = false; }
}
for (const token of ["D12", "D13", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader", "DISTRIBUTE.md", "play-emglken.html"]) {
  if (!plan.includes(token)) { console.error("PRODUCTION_PLAN missing", token); ok = false; }
}
if (!ok) process.exit(1);
console.log("PASS: docs-sync D12/D13 + RemGlk/VmProbe/distribute");
`;
fs.writeFileSync(path.join(root, "harness", "docs-sync.js"), docsSync);

console.log("docs updated");