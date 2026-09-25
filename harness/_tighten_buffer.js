const fs = require("fs");
let t = fs.readFileSync("js/BufferTapProvider.js", "utf8");
const neu = `extractNouns: (text) => {
        var stop = { the:1, and:1, you:1, your:1, with:1, from:1, that:1, this:1, there:1, here:1, into:1, onto:1, about:1, have:1, has:1, are:1, was:1, were:1, will:1, can:1, not:1, but:1, for:1, out:1, all:1, some:1, what:1, when:1, where:1, which:1, while:1, then:1, than:1, them:1, they:1, their:1, its:1, his:1, her:1, him:1, she:1, who:1, how:1, why:1, yes:1, no:1, look:1, examine:1, take:1, drop:1, open:1, close:1, go:1, walk:1, inventory:1, wait:1, grim:1, little:1, tucked:1, away:1, narrow:1, twisting:1, claustrophobic:1, seems:1, appear:1, appears:1, very:1, more:1, most:1, just:1, only:1, even:1, over:1, under:1, between:1, through:1, around:1, still:1, also:1, back:1, down:1, each:1, every:1, like:1, such:1, toward:1, towards:1, upon:1, within:1, without:1, before:1, after:1, again:1, once:1, twice:1, half:1, full:1, empty:1, old:1, new:1, dark:1, long:1, short:1, tall:1, small:1, large:1, big:1, high:1, low:1 };
        var raw = String(text || "");
        var out = [];
        // Prefer determiner + noun phrases: a/an/the/your <noun>
        var re = /\\b(?:a|an|the|your|my|his|her|their)\\s+([a-z][a-z0-9'-]{2,})(?:\\s+([a-z][a-z0-9'-]{2,}))?/gi;
        var m;
        while ((m = re.exec(raw))) {
            var a = (m[1] || "").toLowerCase();
            var b = (m[2] || "").toLowerCase();
            if (a && !stop[a]) out.push(a);
            if (a && b && !stop[a] && !stop[b]) out.push(a + " " + b);
            if (b && !stop[b]) out.push(b);
        }
        // Always allow cardinal/compass words present in text
        var dirs = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];
        dirs.forEach(function (d) {
            if (new RegExp("\\\\b" + d + "\\\\b", "i").test(raw)) out.push(d);
        });
        return Array.from(new Set(out)).slice(0, 30);
    },`;
if (t.indexOf("Prefer determiner") < 0) {
  t = t.replace(/extractNouns: \(text\) => \{[\s\S]*?\},/, neu);
  fs.writeFileSync("js/BufferTapProvider.js", t);
  try { new Function(t); console.log("BufferTap tightened OK"); }
  catch (e) { console.log("FAIL", e.message); }
} else console.log("already tight");
