const fs = require("fs");
let html = fs.readFileSync("play.html", "utf8");
if (html.indexOf("BufferTapProvider.js") < 0) {
  html = html.replace(
    '<script src="js/WorldModel.js"></script>',
    '<script src="js/BufferTapProvider.js"></script>\n\t\t<script src="js/WorldModel.js"></script>'
  );
  fs.writeFileSync("play.html", html);
  console.log("wired BufferTapProvider");
} else console.log("already wired");
