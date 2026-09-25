const fs = require("fs");
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");

// Mark phases complete with honesty on HEAP
const phaseMarks = [
  ["### Phase 0 - Contracts, corpus, Translator spec, doc gates [ ]", "### Phase 0 - Contracts, corpus, Translator spec, doc gates [x]"],
  ["### Phase 1 - Host migration + behavioral provider (O1/O2) [ ]", "### Phase 1 - Host migration + behavioral provider (O1/O2) [x]"],
  ["### Phase 2 - Emglken exports + Z RAM provider (P2) [ ]", "### Phase 2 - Emglken exports + Z RAM provider (P2) [~]"],
  ["### Phase 3 - Text-gate + nested inventory UI [ ]", "### Phase 3 - Text-gate + nested inventory UI [x]"],
  ["### Phase 4 - Action synthesis + unambiguous commands [ ]", "### Phase 4 - Action synthesis + unambiguous commands [x]"],
  ["### Phase 5 - Map object-id identity + path queue [ ]", "### Phase 5 - Map object-id identity + path queue [x]"],
  ["### Phase 6 - Beautify / Z-axis / Glk coexistence [ ]", "### Phase 6 - Beautify / Z-axis / Glk coexistence [~]"],
  ["### Phase 7 - HUD / meta / resource heuristics [ ]", "### Phase 7 - HUD / meta / resource heuristics [x]"],
  ["### Phase 8 - Save/undo sync + scope/light + Inform-Glulx hardening [ ]", "### Phase 8 - Save/undo sync + scope/light + Inform-Glulx hardening [~]"],
  ["### Phase 9 - Hardening & release [ ]", "### Phase 9 - Hardening & release [~]"]
];
phaseMarks.forEach(([a,b]) => { plan = plan.split(a).join(b); });

// Replace Implementation status section
const status = `## Implementation status (live)

**BUILD 43** — full O1–O4 chrome wiring landed. Translator drives Map / Items / specials / HUD.

### Done
- Phase 0 contracts: UIPayload, providers, docs-sync, GUI baseline, harness skeleton
- O1 dual-host: Quixe default; \`?vm=emglken\` / \`?host=emglken\` mounts Emglken under ParchLock chrome via \`HostEmglkenBridge\`
- O2 Translator seam: \`WorldModel\` + RemGlk/Glk/VmProbe/TextGate providers; \`TranslatorUI\` applies payload to chrome
- O3 text-gate spoiler shield + nested inventory render + ActionSynth verb chips
- O4 MapIdentity ObjectId + exit meta; Navigator StepQueue + locked-door interrupt
- Probe ABI 2 \`pm_vm_probe_z_summary\` → hudMetrics (P2 light / story-bytes)
- RemGlk \`specialCommands\` (yes/no, restore)
- Portable package: \`DISTRIBUTE.md\`, \`NOTICE\`, relative \`parchlock-root\`, remglk-distribute-gate
- Harness: docs-sync, payload-schema, emglken/parchment/glk/remglk/native-hooks, \`complete-plan-gate\`

### Partial / deferred (explicit)
- Phase 2 live HEAP / Bocfel \`vm_read_*\` exports — still requires interpreter export work (not day-one); story-byte P2 light ships
- Phase 6 full beautify solver + graphics-window dock — floor tabs + glkBounds field present; measured beautify WASM deferred
- Phase 8 Inform-Glulx dbg profiles + OffersLight — undo/restore resync hooks present; I7 dark-room fixtures later
- Phase 9 full a11y/perf sweep — NOTICE + distribute checklist present; matrix test across all module types still the release gate

### Next (ordered)
1. Product validation: Quixe 5 regressions + Emglken Lost Pig under chrome + one specialized (wump2ka/yagwad)
2. Broad module-type matrix (z3/z5/z8/glulx)
3. Live HEAP provider when Bocfel/RemGlk-rs exports land
4. Beautify / graphics dock polish from GUI baseline risks

### Explicit non-goals right now
- Clean-room rewrite of GameList / CRT cosmetics / PHP
- Claiming unlabeled "engine truth" HUD from heuristics
- Blocking ship on perfect RAM before behavioral path works

`;

const start = plan.indexOf("## Implementation status (live)");
const end = plan.indexOf("## 10. References") >= 0 ? plan.indexOf("## 10. References") : plan.indexOf("## 11. Decision");
if (start >= 0) {
  // find end of status - usually before ## 10 or keep decision log
  let cut = plan.indexOf("\n## ", start + 5);
  // Implementation status was appended after decision log historically - find ### Explicit non-goals or end
  const alt = plan.indexOf("### Explicit non-goals", start);
  if (alt > start) {
    cut = plan.indexOf("\n## ", alt);
    if (cut < 0) cut = plan.length;
  }
  plan = plan.slice(0, start) + status + (cut > start ? plan.slice(cut) : "");
} else {
  plan += "\n" + status;
}

// Ensure BUILD 43 and new module names appear
if (plan.indexOf("BUILD 43") < 0) plan = plan.replace(/BUILD 42/g, "BUILD 43");
if (plan.indexOf("TranslatorUI") < 0) {
  plan = plan.replace("### Done", "### Done\n- TranslatorUI / TextGate / ActionSynth / MapIdentity / HostEmglkenBridge (BUILD 43)\n");
}

// D14
if (plan.indexOf("| D14 |") < 0) {
  plan = plan.replace(
    /\| D13 \|[^\n]+\n/,
    (m) => m + "| D14 | BUILD 43 completes O1-O4 chrome consumers; HEAP remains optional accelerator | [yes] |\n"
  );
}

fs.writeFileSync("PRODUCTION_PLAN.md", plan);
console.log("plan updated", plan.includes("BUILD 43"), plan.includes("Phase 1") && plan.includes("[x]"));

// ARCHITECTURE quick sync
let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
uml = uml.replace(/BUILD 42/g, "BUILD 43");
if (uml.indexOf("TranslatorUI") < 0) {
  uml += `

## 18. BUILD 43 chrome consumers

\`\`\`mermaid
flowchart LR
  WM[WorldModel UIPayload] --> TUI[TranslatorUI]
  TUI --> Map[ParchLockMap EnteredRoom / MapIdentity]
  TUI --> Act[Actionable inventory + roomNouns]
  TUI --> Spec[specialCommands bar]
  TUI --> HUD[labeled hudMetrics]
  TG[TextGate] --> WM
  AS[ActionSynth] --> Act
  Nav[Navigator StepQueue] --> Input
  Bridge[HostEmglkenBridge] -->|vm=emglken| WM
\`\`\`

- Quixe path: heuristic + TextGate + optional probe
- Emglken path: iframe tapped host → bridge merges child WorldModel into parent chrome
`;
}
if (uml.indexOf("D14") < 0) uml = uml.replace(/D13[^\n]*/, (m) => m + "\n- D14 BUILD 43 O1-O4 chrome complete; HEAP optional");
fs.writeFileSync("ARCHITECTURE_UML.md", uml);
console.log("uml updated");
