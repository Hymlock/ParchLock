const fs = require("fs");
const plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
// Print objective, translator, phases, decisions, success, status
const sections = [
  "## 1. Objective",
  "## 4. Target architecture",
  "### 4.2 WorldModel Translator",
  "### 4.3 Per-turn pipeline",
  "### 4.4 Spoiler policy",
  "## 6. Phased roadmap",
  "## 9. Success definition",
  "## 11. Decision log",
  "## Implementation status"
];
const lines = plan.split(/\n/);
function dump(startMarker, maxLines=80) {
  const i = plan.indexOf(startMarker);
  if (i < 0) { console.log("MISSING", startMarker); return; }
  const slice = plan.slice(i, i + 3500);
  console.log("\n" + "=".repeat(60) + "\n" + slice.split(/\n/).slice(0, maxLines).join("\n") + "\n");
}
dump("## 1. Objective", 40);
dump("### 4.2 WorldModel Translator", 60);
dump("### 4.3 Per-turn pipeline", 40);
dump("### 4.4 Spoiler policy", 30);
dump("## 6. Phased roadmap", 90);
dump("## 9. Success definition", 30);
dump("## 11. Decision log", 50);
dump("## Implementation status", 60);
