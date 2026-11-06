# Icon candidates

Generated with OpenAI's built-in image-generation tool on 2026-10-09, directed and selected by Hymlock Groves. The operator approved the four storybook variants and explicitly instructed use of these designs (bus2125 and direct approval). No additional design examples are planned.

Approved originals: `book-archive-door.png`, `book-dungeon-door.png`, `book-forest-path.png`, `book-living-map.png`. Their left-page source scenes are the matching `img/parchlock-splash-*.png` files; their shared book/map source is `candidate-b-book.png`. Transparent `foreground-*.png` layers were extracted with the same image-generation tool for adaptive packaging, preserving the approved artwork.

`tools/icon-asset-pack.cjs` records format packing in `asset-pack-audit.json`: Android legacy/round/transparent foreground sizes, web192/512 plus maskable512, desktop256, and four ICOs with16/32/48/256 frames. Purpose-drawn tiny SVGs use a simplified book/route and scene-colour panel for legibility. Adaptive foreground and maskable motifs fit the central circular safe zone of diameter66/108, verified from actual output pixels. Bounding-box scaling alone was insufficient and was corrected before acceptance. Source hashes and pixel dimensions are recorded. No Apple assets or links are changed.

Focused technical validation: `node work/investigations/icons/check-pack.cjs` passes166 checks, including34 actual-pixel safe-circle checks, PNG dimensions and ICO frames. `technical-pack.png` was visually inspected at large and small sizes. Bus2146 requests independent audit of this corrected pack. Platform rotation remains a separate native implementation loop.

Codex prepared the assets; Claude reviews technical integration and owns the native shortcut rotation implementation. Original splash-artwork provenance remains a separate text/permissions sweep task; icon generation does not establish ownership of source artwork.
