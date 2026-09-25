const fs = require("fs");
let t = fs.readFileSync("js/EmglkenHost.js", "utf8");
if (t.indexOf("host=emglken") < 0) {
  t = t.replace(
    'if (q.indexOf("vm=emglken") >= 0) return true;',
    'if (q.indexOf("vm=emglken") >= 0) return true;\n            if (q.indexOf("host=emglken") >= 0) return true;'
  );
  fs.writeFileSync("js/EmglkenHost.js", t);
  console.log("EmglkenHost host= added");
} else console.log("EmglkenHost ok");
