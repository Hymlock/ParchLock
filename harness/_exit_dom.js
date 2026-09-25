const fs = require("fs");
const html = fs.readFileSync("play.html", "utf8");
const m = html.match(/class="[^"]*dir-[a-z]+[^"]*"/g) || [];
console.log([...new Set(m)].slice(0, 40));
console.log("exits section", html.includes('id="exits"'));
const i = html.indexOf('id="exits"');
console.log(html.slice(i, i+800));
