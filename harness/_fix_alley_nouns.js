const fs = require("fs");
let t = fs.readFileSync("js/BufferTapProvider.js", "utf8");

// Rewrite extractNouns: never block object nouns like can/cans; prefer concrete room props
const extract = `extractNouns: (text) => {
        // Modal/function words only ? do NOT include concrete nouns like "can"/"cans"
        var stop = { the:1, and:1, you:1, your:1, with:1, from:1, that:1, this:1, there:1, here:1, into:1, onto:1, about:1, have:1, has:1, are:1, was:1, were:1, will:1, not:1, but:1, for:1, out:1, all:1, some:1, what:1, when:1, where:1, which:1, while:1, then:1, than:1, them:1, they:1, their:1, its:1, his:1, her:1, him:1, she:1, who:1, how:1, why:1, yes:1, no:1, look:1, examine:1, take:1, drop:1, open:1, close:1, go:1, walk:1, inventory:1, wait:1, grim:1, little:1, tucked:1, away:1, narrow:1, twisting:1, claustrophobic:1, seems:1, appear:1, appears:1, very:1, more:1, most:1, just:1, only:1, even:1, over:1, under:1, between:1, through:1, around:1, still:1, also:1, back:1, down:1, each:1, every:1, like:1, such:1, toward:1, towards:1, upon:1, within:1, without:1, before:1, after:1, again:1, once:1, twice:1, half:1, full:1, empty:1, old:1, new:1, dark:1, long:1, short:1, tall:1, small:1, large:1, big:1, high:1, low:1, older:1, portion:1, ends:1, tucked:1 };
        var raw = String(text || "");
        var low = raw.toLowerCase();
        var out = [];
        function add(n) {
            n = String(n || "").toLowerCase().trim();
            if (!n || stop[n] || n.length < 3) return;
            if (out.indexOf(n) < 0) out.push(n);
        }
        // Determiner phrases: a/an/the/your <word> [<word>]
        var re = /\\b(?:a|an|the|your|my|his|her|their)\\s+([a-z][a-z0-9'-]{2,})(?:\\s+([a-z][a-z0-9'-]{2,}))?/gi;
        var m;
        while ((m = re.exec(raw))) {
            var a = (m[1] || "").toLowerCase();
            var b = (m[2] || "").toLowerCase();
            add(a);
            if (b) { add(b); add(a + " " + b); }
        }
        // High-value room props if literally present (singular + plural)
        ["window","windows","fence","fences","can","cans","garbage","door","doors","wall","walls","gate","gates","alley","street","sign","box","boxes","bin","bins"].forEach(function (w) {
            if (new RegExp("\\\\b" + w + "\\\\b", "i").test(raw)) add(w);
        });
        // Compound junk objects
        if (/garbage\\s+cans?/i.test(raw)) { add("garbage can"); add("garbage cans"); add("can"); add("cans"); }
        // Compass words
        ["north","south","east","west","northeast","northwest","southeast","southwest","up","down"].forEach(function (d) {
            if (new RegExp("\\\\b" + d + "\\\\b", "i").test(raw)) add(d);
        });
        return out.slice(0, 36);
    },`;

t = t.replace(/extractNouns: \(text\) => \{[\s\S]*?\n    \},/, extract);
fs.writeFileSync("js/BufferTapProvider.js", t);
try { new Function(t); console.log("extract OK"); } catch (e) { console.log("FAIL", e.message); }

// Sanity unit check without browser
const fn = t.match(/extractNouns: \(text\) => \{[\s\S]*?\n    \},/)[0];
const sample = "This grim little cul-de-sac is tucked away in a corner of the older portion of Anchorhead. A claustrophobic tangle of narrow, twisting avenues. The lane ends here. To the east is the real estate office. Several garbage cans sit by the fence. A dirty window looks into the alley.";
// eval extract by loading module-ish
global.window = global;
eval(t.replace(/try \{[\s\S]*$/, ""));
const nouns = BufferTapProvider.extractNouns(sample);
console.log("sample nouns", nouns);
console.log("has", {
  can: nouns.includes("can") || nouns.includes("cans"),
  window: nouns.includes("window"),
  fence: nouns.includes("fence")
});
