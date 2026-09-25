const fs = require("fs");
const path = require("path");
// sample games extensions
const games = fs.readdirSync("games").filter(f => /\.(z3|z5|z8|ulx|blorb|zblorb)\.js$/i.test(f) || /\.js$/i.test(f));
const byExt = {};
games.forEach(f => {
  const m = f.match(/\.([a-z0-9]+)\.js$/i);
  const k = m ? m[1].toLowerCase() : "other";
  byExt[k] = (byExt[k]||0)+1;
});
console.log("games by ext", byExt, "total", games.length);
// HostEmglkenBridge should be inert unless explicitly opted - check Init doesn't force
const bridge = fs.readFileSync("js/HostEmglkenBridge.js","utf8");
console.log("bridge has location.replace", bridge.includes("location.replace"));
console.log("bridge wants host=", /host=emglken/.test(bridge));
// ParchLock story param usage
const g = fs.readFileSync("js/Global.js","utf8");
const hits=[]; g.split(/\n/).forEach((l,i)=>{ if(/story|GetUrlParameter/.test(l)) hits.push((i+1)+":"+l.trim().slice(0,100)); });
console.log("Global story hits", hits.slice(0,12).join("\n"));
