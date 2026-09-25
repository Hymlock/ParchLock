const fs = require("fs");
let map = fs.readFileSync("js/Map.js", "utf8");
if (map.indexOf("Input.Inject(route, true)") >= 0) {
  map = map.replace(
    /var route = Navigator\.FindRoute\(ParchLockMap\.CurrentRoom, roomName\);\s*if \(route\) \{\s*Input\.Inject\(route, true\);\s*if \(\$\(window\)\.width\(\) < 850\) ParchLockMap\.Toggle\(\);\s*\}/,
    "var route = Navigator.FindRoute(ParchLockMap.CurrentRoom, roomName);\n        if (route && route.length) {\n            if ($(window).width() < 850) ParchLockMap.Toggle();\n        }"
  );
  fs.writeFileSync("js/Map.js", map);
  console.log("GotoRoom fixed", map.indexOf("Input.Inject(route, true)") < 0);
} else {
  console.log("GotoRoom already fixed");
}

let html = fs.readFileSync("play.html", "utf8");
if (html.indexOf('id="reset-map"') < 0) {
  html = html.replace(
    '<button id="export-map" title="Save, load or download maps">Maps</button>',
    '<button id="export-map" title="Save, load or download maps">Maps</button>\n\t\t\t\t<button id="reset-map" title="Clear the current map">Reset Map</button>'
  );
  fs.writeFileSync("play.html", html);
  console.log("reset-map button added");
}

map = fs.readFileSync("js/Map.js", "utf8");
if (map.indexOf("reset-map") < 0) {
  if (map.indexOf("BindResetMap") < 0) {
    map = map.replace(
      "ExportMap: () => {",
      `BindResetMap: () => {
        $("#reset-map").off("click").on("click", () => {
            if (!confirm("Clear the current map? Room notes on the map will be removed.")) return;
            ParchLockMap.Clear();
            ParchLockMap.Save();
            ParchLockMap.Draw();
            ParchLockMap.RebuildRoomsList();
        });
    },

    ExportMap: () => {`
    );
  }
  if (map.indexOf("BindResetMap()") < 0) {
    map = map.replace("Build: () => {", "Build: () => {\n        try { ParchLockMap.BindResetMap(); } catch (e) {}");
  }
  fs.writeFileSync("js/Map.js", map);
  console.log("reset wired");
} else {
  console.log("reset already in Map.js");
}
