const fs = require("fs");
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
if (plan.indexOf("wump2ka restore") < 0) {
  plan = plan.replace("### Done", "### Done\n- Specialized gates: wump2ka restore + yagwad continue ? UIPayload specialCommands (DOM whitespace-tolerant)\n");
  fs.writeFileSync("PRODUCTION_PLAN.md", plan);
}
console.log("BUILD", (fs.readFileSync("js/Consts.js","utf8").match(/BUILD\\s*[:=]\\s*(\\d+)/)||[])[1]);
