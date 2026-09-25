const fs = require("fs");
let t = fs.readFileSync("js/RemGlkTapProvider.js", "utf8");
if (t.indexOf("scanDomSpecials") < 0) {
  // Add DOM fallback before collect return
  const helper = `
    scanDomSpecials: () => {
        var special = [];
        try {
            var text = (document.body && document.body.innerText || "").toLowerCase();
            if (/restore a saved game|restore\\s*\\?/.test(text)) special.push({ label: "restore", command: "restore" });
            if (/do you wish to continue|would you like to continue/.test(text)) {
                special.push({ label: "yes", command: "yes" });
                special.push({ label: "no", command: "no" });
            }
            if (/\\byes\\b.or.\\bno\\b|\\by\\/n\\b/.test(text) && special.length === 0) {
                special.push({ label: "yes", command: "yes" });
                special.push({ label: "no", command: "no" });
            }
        } catch (e) {}
        return special;
    },
`;
  t = t.replace("collect: () => {", helper + "\n    collect: () => {");
  // After building facts, merge DOM specials
  if (t.indexOf("facts.specialCommands") >= 0) {
    t = t.replace(
      /facts\.specialCommands\s*=\s*[^;]+;/,
      (m) => m + "\n        var domSpecials = RemGlkTapProvider.scanDomSpecials();\n        if (domSpecials.length) facts.specialCommands = Array.from(new Set((facts.specialCommands||[]).concat(domSpecials.map(function(s){return s.command||s;}))));\n        if (domSpecials.length && (!facts.sources || !facts.sources.length)) facts.sources = [{ name: \"remglk-dom\", confidence: 0.6 }];"
    );
  } else {
    // append near end of collect before return facts
    t = t.replace(
      /return facts;\s*\},/,
      `try {
            var domSpecials = RemGlkTapProvider.scanDomSpecials();
            if (domSpecials.length) {
                facts.specialCommands = (facts.specialCommands || []).concat(domSpecials);
                facts.sources = (facts.sources || []).concat([{ name: "remglk-dom", confidence: 0.6 }]);
            }
        } catch (e) {}
        return facts;
    },`
    );
  }
  fs.writeFileSync("js/RemGlkTapProvider.js", t);
  console.log("RemGlk DOM specials added");
} else console.log("already");
try { new Function(fs.readFileSync("js/RemGlkTapProvider.js","utf8")); console.log("syntax ok"); }
catch(e){ console.log("syntax", e.message); }
