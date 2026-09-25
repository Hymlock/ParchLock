const fs = require("fs");
const t = fs.readFileSync("play.html", "utf8");
console.log(t.slice(0, 2500));
console.log("---HAS GUARD---", t.includes("__PL_EMGLKEN_STORY__"));
console.log("---HAS REDIRECT IN PLAY---", /location\.replace/.test(t) && t.includes("parchment-single"));
console.log("---BRIDGE REDIRECT---", fs.readFileSync("js/HostEmglkenBridge.js","utf8").includes("location.replace"));
