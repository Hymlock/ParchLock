/* ParchLock PWA service worker.
 *
 * Two-tier strategy, deliberately NOT "cache every game file up front" --
 * the catalog is ~300 story files and precaching all of them would be slow
 * and wasteful for something most installs never open.
 *
 *   1. APP_SHELL: the fixed set of files play.html itself references
 *      (html/css/js/lib/icons) -- precached on install, cache-first at
 *      runtime, so the app boots and is fully interactive with zero
 *      network once installed.
 *   2. Everything else (games/*, any lib loaded dynamically at runtime,
 *      fonts, etc.): network-first, falling back to a prior cached copy
 *      when offline -- so a game you've actually opened before still
 *      loads offline, and a fresh network response always wins when one
 *      is available (never serves a stale game file over a working
 *      connection).
 *
 * Bump CACHE_VERSION when APP_SHELL's contents change so old clients pick
 * up the new files instead of serving a stale cached shell forever.
 */
// v174: persistent item learning, learned radial priority and calibration reload.
const CACHE_VERSION = "parchlock-shell-v183"; // Build 84: phone responsiveness (snapshot reuse), Inform flag layouts for all non-ZIL games, dejavu, Edifice player swap, Cast at only when the game knows cast; Build 83: keyboard/contrast a11y, Tab trap, picker hyphen names, opaque tentative boxes, faster grammar; Build 82: local-map exit hints, put on surfaces, ZIL instrumental grammar; Build 81: map room boxes long-press menu (rewind); Build 80: long stat names span two columns; Build 79: LLR3 depth level names, whole-word stat labels; Build 78: older I7 probe leak, LLR3 depth levels, killed-in deaths; Build 77: door hints, seated moves, probe reply boundary, compiled room names, status clock/hide, click-to-rewind; Save-linked cumulative playthrough history; Build 72: Wumpus section groups on the World Map (frame) and local map (caption); first-room gate for Inform epigraph/menu boots (Curses, Ghost, Vespers); Facility player global; Build 71: Wumpus multi-section rooms (measured section, dark-room names, exit 3, objects); item names (no line crossing, game casing, full descriptors); I7 Map_Storage exits; dark-scope latest reply; Build 70: compass labels from the game's own compass, internal-named rooms, stale "(on the X)" names, I7 phantom exits, Degeneracy player; Item 8: full room names from the printed heading; Item 8: two-line exit names; Item 7: shared secondary words not underlined alone; Map closes instantly when Equipment replaces it; Item 6: first underline per reply; Automatic return paths, Mapping option removed; Build 69; Exit decoding respects property size (no punctured boat); Build 68; Item 4: verified display names survive undo; Item 5: equal fixed mobile borders, bottom exits under input, opacity dark scope; Item 3: display-key cache (latency); widget copy ASCII; Item 2: inventory load summary is probe reply; Issue 1: icon rotation at app start, native first-launch question, truthful Options result; Post-APK63 HHG noun-safe links, full inventory labels, ephemeral radial pool and Take/root evidence; APK63: D214 underlining/possession, generic ambiguous base words, ZIL room hints and World Map; APK62: BufferRevision cache + StatTracker render/version skips; Treasures burdened prowess; inventory hidden/worn facts, Yourself, state labels; TTS callback repair; Close ✕ glyph everywhere; native dialog Edit row; Export naming repairs + Tools beautification + legacy restore label; Export naming: readable unique download names (#1746); E4 rev: save-concrete transcript; E3 warning before guards; E5b prowess family; E3 install-owned inventory WARNING; E4 save-attached running transcript; Worn learner uses the game's own inventory listing; Inventory holder learned from the game's own INVENTORY routine (Suspect); Worn: one owner per story (declared > measured fact > learned from inventory opcodes > Inform default); D152/D153: interpreter-only slot2 seeding and turn-counter ambiguity repair.
// D215: approved storybook icons and bounded authored-ending death counter.
const RUNTIME_CACHE = "parchlock-runtime-v1";

const APP_SHELL = [
    "./",
    "index.html",
    "play.html",
    "tutorial.html",
    "manifest.json",
    "css/CharCell.css",
    "css/ParchLock.css",
    "css/parchment.css",
    "css/Tutorial.css",
    "css/LearnedWords.css",
    "img/apple-touch-icon-114x114.png",
    "img/apple-touch-icon-120x120.png",
    "img/apple-touch-icon-144x144.png",
    "img/apple-touch-icon-152x152.png",
    "img/apple-touch-icon-180x180.png",
    "img/apple-touch-icon-57x57.png",
    "img/apple-touch-icon-72x72.png",
    "img/apple-touch-icon-76x76.png",
    "img/apple-touch-icon.png",
    "img/favicon.ico",
    "img/icons/archive-192.png",
    "img/icons/archive-512.png",
    "img/icons/archive-maskable-512.png",
    "img/ParchLockSplash.css",
    "img/ParchLockSplash.js",
    "img/parchlock-splash-archive-door.png",
    "img/parchlock-splash-dungeon-door.png",
    "img/parchlock-splash-forest-path.png",
    "img/parchlock-splash-living-map.png",
    "js/ActionSynth.js",
    "js/BufferRevision.js",
    "js/Actionable.js",
    "js/AttrCalibrator.js",
    "js/LearnedWords.js",
    "js/AttributeSchema.js",
    "js/Autocomplete.js",
    "js/BufferTapProvider.js",
    "js/Consts.js",
    "js/DarkScope.js",
    "js/DirectionalRadial.js",
    "js/Directions.js",
    "js/GameList.js",
    "js/GlkTapProvider.js",
    "js/Global.js",
    "js/GrammarProvider.js",
    "js/GraphicsDock.js",
    "js/CharKeys.js",
    "js/Input.js",
    "js/LiveHeapProvider.js",
    "js/MainMenu.js",
    "js/Map.js",
    "js/MapBeautify.js",
    "js/EquipmentUI.js",
    "js/ModuleStatFacts.js",
    "js/ModuleStatFactsClaude.js",
    "js/StatTracker.js",
    "js/StatusGridDecoder.js",
    "js/MapIdentity.js",
    "js/ExitCalibrator.js",
    "js/MapTopology.js",
    "js/Message.js",
    "js/IconRotation.js",
    "js/MobileLayout.js",
    "js/ModuleLibrary.js",
    "js/Navigator.js",
    "js/ParchLock.js",
    "js/ProductInfo.js",
    "js/Qol.js",
    "js/PronunciationCatalog.js",
    "js/ReadAloud.js",
    "js/Transcript.js",
    "js/SaveState.js",
    "js/RemGlkTapProvider.js",
    "js/SemanticActions.js",
    "js/TextGate.js",
    "js/TranslatorUI.js",
    "js/Tutorial.js",
    "js/TurnRecorder.js",
    "js/UndoRestoreSync.js",
    "js/VmProbeLoader.js",
    "js/WorkspaceUI.js",
    "js/WorldMap.js",
    "js/WorldMapLayout.js",
    "js/WorldModel.js",
    "js/ZRamProvider.js",
    "js/ZRamReader.js",
    "js/ZvmCapture.js",
    "lib/ie.js",
    "lib/jquery.min.js",
    "lib/main.js",
    "lib/resourcemap.js"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(function (cache) {
            // addAll fails the whole install if ANY single URL 404s -- add
            // individually instead so one missing/renamed optional asset
            // (e.g. a lib/ file that doesn't exist in every checkout)
            // can't block the entire app shell from installing.
            return Promise.all(APP_SHELL.map(function (url) {
                return cache.add(url).catch(function () {});
            }));
        }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(names.map(function (name) {
                if (name !== CACHE_VERSION && name !== RUNTIME_CACHE) return caches.delete(name);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener("fetch", function (event) {
    var req = event.request;
    if (req.method !== "GET") return;
    var url = new URL(req.url);

    // IndexedDB-backed modules are virtual URLs handled by ModuleLibrary's
    // jQuery adapter. A leak into fetch must fail locally, never reach a
    // server or enter either service-worker cache.
    if (/\/local\/[0-9a-f]{64}\.(?:z3|z4|z5|z8|zblorb|gblorb|ulx)\.js$/.test(url.pathname)) {
        event.respondWith(new Response("Local module requests are handled on-device.", {
            status: 404,
            headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" }
        }));
        return;
    }
    if (url.origin !== self.location.origin) return; // never intercept cross-origin requests

    event.respondWith(
        caches.match(req, { ignoreSearch: true }).then(function (shellHit) {
            // App shell: cache-first (instant boot offline; a real update
            // arrives via CACHE_VERSION bump + activate's cleanup, not by
            // racing the network on every load).
            if (shellHit && APP_SHELL.indexOf(url.pathname.replace(/^\//, "")) >= 0) return shellHit;

            // Everything else (games/*, anything not in the fixed shell
            // list): network-first so an actual connection always wins,
            // falling back to whatever was cached from a previous visit
            // when offline.
            return fetch(req).then(function (res) {
                if (res && res.ok) {
                    var copy = res.clone();
                    caches.open(RUNTIME_CACHE).then(function (cache) { cache.put(req, copy); });
                }
                return res;
            }).catch(function () {
                return shellHit || caches.match(req, { ignoreSearch: true });
            });
        })
    );
});
