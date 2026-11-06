/*
 * BufferRevision: one owner for "has the story window changed?".
 *
 * ParchLock.Loop runs every 200 ms whether or not anything happened, and
 * several readers on that path rebuilt the whole transcript string or walked
 * every BufferLine each time. That cost grows with the session, so a long game
 * slowed down and kept the phone busy (bus #1810/#1825/#1829, consensus #1830).
 *
 * A single MutationObserver on #windowport bumps `rev`; text(key) returns the
 * cached jQuery .text() of a whitelisted selector until the next mutation.
 * Records only LOCATE the BufferLines they touched (D104: element state stays
 * the source); lineFacts(line) is recomputed from the current element after
 * any such touch. Every read first drains pending records synchronously, so a
 * cached value is exact even within the task that mutated the DOM.
 */
var BufferRevision = {
    rev: 0,
    bypass: false,                  // tests: compute fresh every time
    stats: { textRebuilds: 0, factRebuilds: 0 },
    TEXT_KEYS: ["#windowport", "#windowport .BufferWindow"],
    _observer: null,
    _observed: null,
    _texts: {},
    _facts: null,
    _versions: null,                // line -> version, bumped on every touch
    _epoch: 0,                      // bumped when all lines must be re-read
    _nextVersion: 1,
    _reset: function () {
        BufferRevision._facts = typeof WeakMap !== "undefined" ? new WeakMap() : null;
        BufferRevision._versions = typeof WeakMap !== "undefined" ? new WeakMap() : null;
        BufferRevision._epoch++;
    },
    _touch: function (line) {
        if (BufferRevision._facts) BufferRevision._facts.delete(line);
        if (BufferRevision._versions) BufferRevision._versions.set(line, BufferRevision._nextVersion++);
    },

    _invalidateLines: function (node) {
        if (!node || !BufferRevision._facts) return;
        var el = node.nodeType === 1 ? node : node.parentElement;
        // The line itself and every enclosing line (nested BufferLines).
        var p = el && el.closest ? el.closest(".BufferLine") : null;
        while (p) {
            BufferRevision._touch(p);
            p = p.parentElement ? p.parentElement.closest(".BufferLine") : null;
        }
        if (el && el.querySelectorAll) {
            Array.prototype.forEach.call(el.querySelectorAll(".BufferLine"), BufferRevision._touch);
        }
    },

    _process: function (records) {
        if (!records || !records.length) return;
        BufferRevision.rev++;
        BufferRevision._texts = {};
        for (var i = 0; i < records.length; i++) {
            var m = records[i];
            if (m.target === BufferRevision._observed) {
                // The window set itself changed (restore, window recreation).
                BufferRevision._reset();
                continue;
            }
            BufferRevision._invalidateLines(m.target);
            if (m.addedNodes) for (var j = 0; j < m.addedNodes.length; j++) BufferRevision._invalidateLines(m.addedNodes[j]);
        }
    },

    // Re-observe if #windowport was replaced, then drain pending records.
    sync: function () {
        if (typeof document === "undefined" || typeof MutationObserver === "undefined") return false;
        var port = document.getElementById("windowport");
        if (port !== BufferRevision._observed) {
            if (BufferRevision._observer) { try { BufferRevision._observer.disconnect(); } catch (e) {} }
            BufferRevision._observed = port;
            BufferRevision._texts = {};
            BufferRevision._reset();
            BufferRevision.rev++;
            if (!port) return false;
            if (!BufferRevision._observer) BufferRevision._observer = new MutationObserver(BufferRevision._process);
            BufferRevision._observer.observe(port, { childList: true, characterData: true, subtree: true,
                attributes: true, attributeFilter: ["class", "aria-hidden", "style", "hidden"] });
        }
        if (!port) return false;
        BufferRevision._process(BufferRevision._observer.takeRecords());
        return true;
    },

    // Same result as $(key).text(); only whitelisted keys are cached.
    text: function (key) {
        var cacheable = !BufferRevision.bypass && BufferRevision.TEXT_KEYS.indexOf(key) >= 0 && BufferRevision.sync();
        if (cacheable && Object.prototype.hasOwnProperty.call(BufferRevision._texts, key)) return BufferRevision._texts[key];
        var value = typeof $ !== "undefined" ? $(key).text() : "";
        BufferRevision.stats.textRebuilds++;
        if (cacheable) BufferRevision._texts[key] = value;
        return value;
    },

    // One sync, then a cheap per-line version reader: the token changes
    // whenever a mutation touched the line (or every line was reset). A
    // consumer that stored the token with its own derived value can skip
    // re-reading an untouched line. Returns null when tokens are unavailable
    // (or bypassed), meaning "re-read everything".
    versionReader: function () {
        if (BufferRevision.bypass || !BufferRevision.sync() || !BufferRevision._versions) return null;
        var epoch = BufferRevision._epoch, versions = BufferRevision._versions, root = BufferRevision._observed;
        // Only lines inside the observed root have trustworthy versions; any
        // other line (outside #windowport, or detached) is always re-read.
        return function (line) { return root.contains(line) ? epoch + ":" + (versions.get(line) || 0) : null; };
    },

    // Per-line facts with the old jQuery semantics:
    //   input:      line.querySelector(".Style_input")
    //   subheaders: $(line).find(".Style_subheader").addBack(".Style_subheader") texts, document order
    //   stars:      /\*\*\*/ in the line's textContent (end-of-game banner)
    lineFacts: function (line) {
        var cacheable = !BufferRevision.bypass && BufferRevision.sync() && BufferRevision._facts;
        if (cacheable) {
            var hit = BufferRevision._facts.get(line);
            if (hit) return hit;
        }
        var subs = [];
        if (line.matches && line.matches(".Style_subheader")) subs.push(line.textContent);
        Array.prototype.forEach.call(line.querySelectorAll(".Style_subheader"), function (el) { subs.push(el.textContent); });
        var facts = {
            input: !!line.querySelector(".Style_input"),
            subheaders: subs,
            stars: subs.length ? /\*\*\*/.test(String(line.textContent || "")) : false
        };
        BufferRevision.stats.factRebuilds++;
        if (cacheable) BufferRevision._facts.set(line, facts);
        return facts;
    }
};
