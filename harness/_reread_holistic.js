const fs = require("fs");

function section(title, text, startRe, max = 3500) {
  const m = text.search(startRe);
  if (m < 0) { console.log("\n## MISSING:", title); return; }
  console.log("\n##########", title, "@", m, "##########");
  console.log(text.slice(m, m + max));
}

const plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
const uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
const guide = fs.existsSync("Full Stack Engine Level Conversion.txt")
  ? fs.readFileSync("Full Stack Engine Level Conversion.txt", "utf8")
  : "";

console.log("LENS", { plan: plan.length, uml: uml.length, guide: guide.length });

section("PLAN Objective", plan, /Objective \(consolidated\)/);
section("PLAN Phase 2 CRITICAL", plan, /Phase 2 - Live Z RAM/);
section("PLAN Phase 4-6", plan, /Phase 4 -/);
section("PLAN 6B gaps", plan, /6B\. Conversion-guide/);
section("PLAN 6C universal", plan, /6C\. Universal/);
section("PLAN Decision log D17+", plan, /\| D17 \|/);
section("PLAN Implementation status", plan, /Implementation status/);

section("UML ?22 RAM-primary", uml, /22\. Deterministic RAM-primary/);
section("UML ?23 clicks", uml, /23\. Deterministic click/);
section("UML ?24 universal", uml, /24\. Universal coverage/);
section("UML provider map", uml, /Provider map|provider map|15\./i);

section("GUIDE non-cardinal", guide, /Non-Cardinal & Topological/);
section("GUIDE hybrid grid-force", guide, /Hybrid Grid-Force Layout/);
section("GUIDE RAM look-ahead / exits", guide, /Exit Inspection|Look-Ahead|direction properties/);
section("GUIDE Word ObjectID / actionable", guide, /Word.*Object|dictionary|Action Synthesis/i);
section("GUIDE state-delta", guide, /State-Delta Protocol|Command-Agnostic Edge/);
