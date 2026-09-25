const fs = require("fs");
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
const i = plan.indexOf("Required deliverables");
console.log(plan.slice(i, i + 900));
if (!plan.includes("as-you-go")) {
  plan = plan.replace(
    "Required deliverables (from conversion guide, folded in):",
    "Required deliverables (from conversion guide, folded in):\n\n**As-you-go rule:** each turn decode only the current room from RAM (player object ? parent(location) ? in-scope children + look-ahead exits). The map grows as the player moves (state-delta + look-ahead). No whole-game room pre-scan.\n"
  );
  fs.writeFileSync("PRODUCTION_PLAN.md", plan);
}
console.log("now", fs.readFileSync("PRODUCTION_PLAN.md","utf8").includes("as-you-go"));
