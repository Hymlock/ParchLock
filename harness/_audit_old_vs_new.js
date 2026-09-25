const fs = require("fs");
function grep(file, re, n=20) {
  const lines = fs.readFileSync(file, "utf8").split(/\n/);
  const hits = [];
  lines.forEach((l,i) => { if (re.test(l)) hits.push((i+1)+":"+l.trim().slice(0,140)); });
  console.log("\n## "+file); console.log(hits.slice(0,n).join("\n")||"(none)");
}
grep("js/Actionable.js", /Refresh|pl-act|WorldModel|Translator|Candidates|underline|Stale/);
grep("js/ParchLock.js", /Actionable\.Refresh|WorldModel|TranslatorUI|Loop|GetRoom|EnteredRoom/);
grep("js/Map.js", /Clear|Reset|GotoRoom|FindRoute|AllowUpdate|RemoveRoom|ExportMap|clear map/i);
grep("js/Navigator.js", /FindRoute|Enqueue|Message\.Show|Exits/);
grep("js/Qol.js", /clear map|Reset|ExportMap|Goto/i);
grep("js/TranslatorUI.js", /applyRoom|EnteredRoom|Actionable|pl-act/);
