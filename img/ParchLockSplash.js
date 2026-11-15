(function () {
  "use strict";

  var SESSION_KEY = "PL_ParchLockSplashSeen";
  var WINDOW_MARKER = "__PARCHLOCK_SPLASH_SEEN__";

  var scenes = [
    {
      id: "map",
      image: "img/parchlock-splash-living-map.png",
      alt: "An elaborate hand-drawn fantasy map on an explorer's table",
      eyebrow: "Every story has a way in"
    },
    {
      id: "dungeon",
      image: "img/parchlock-splash-dungeon-door.png",
      alt: "An ancient wooden door standing ajar in a dark dusty dungeon",
      eyebrow: "Beyond the door, the story waits"
    },
    {
      id: "archive",
      image: "img/parchlock-splash-archive-door.png",
      alt: "A moonlit archive with a map door shaped like a keyhole",
      eyebrow: "The archive is waiting"
    },
    {
      id: "forest",
      image: "img/parchlock-splash-forest-path.png",
      alt: "A winding path through a richly detailed ancient forest",
      eyebrow: "Choose a path. Discover a world."
    }
  ];

  function sceneById(id) {
    for (var i = 0; i < scenes.length; i++) if (scenes[i].id === id) return scenes[i];
    return null;
  }

  function hasBeenDismissed() {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") return true;
    } catch (e) {}
    return String(window.name || "").indexOf(WINDOW_MARKER) !== -1;
  }

  function rememberDismissal() {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch (e) {}
    if (String(window.name || "").indexOf(WINDOW_MARKER) === -1) {
      window.name = String(window.name || "") + WINDOW_MARKER;
    }
  }

  function resolveScene() {
    // 1) Already chosen in play.html <head> (matches desktop icon / ?splash=)
    if (window.__PL_SPLASH_SCENE && window.__PL_SPLASH_SCENE.id) {
      var fromHead = sceneById(window.__PL_SPLASH_SCENE.id);
      if (fromHead) return fromHead;
    }
    // 2) URL param
    var requested = null;
    try {
      requested = new URLSearchParams(window.location.search).get("splash");
    } catch (e) {}
    var fromUrl = sceneById(requested);
    if (fromUrl) return fromUrl;
    // 3) Already painted on the DOM
    var splash = document.getElementById("parchlock-splash");
    if (splash && splash.dataset.scene) {
      var fromDom = sceneById(splash.dataset.scene);
      if (fromDom) return fromDom;
    }
    // 4) Random only when nothing requested
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  function applyScene(scene, splash, picture, eyebrow) {
    if (!scene || !splash || !picture || !splash.isConnected || hasBeenDismissed()) return;
    splash.dataset.scene = scene.id;
    // Only set src if different — avoids a second network load that can flash.
    if (picture.getAttribute("src") !== scene.image) {
      picture.src = scene.image;
    }
    picture.alt = scene.alt || "";
    if (eyebrow) eyebrow.textContent = scene.eyebrow || "";
    document.documentElement.classList.remove("parchlock-splash-pending");
    document.documentElement.classList.add("parchlock-splash-active");
    // Freeze: nothing else may change the splash image this session boot.
    window.__PL_SPLASH_LOCKED = scene.id;
  }

  function init() {
    var splash = document.getElementById("parchlock-splash");
    if (!splash) return;

    if (hasBeenDismissed()) {
      splash.remove();
      document.documentElement.classList.remove("parchlock-splash-pending", "parchlock-splash-active");
      return;
    }

    var picture = splash.querySelector(".parchlock-splash__picture");
    var eyebrow = splash.querySelector(".parchlock-splash__eyebrow");
    var start = splash.querySelector(".parchlock-splash__start");

    // PC launcher: ?splash= already applied/locked in play.html — keep it.
    if (window.__PL_SPLASH_LOCKED) {
      document.documentElement.classList.remove("parchlock-splash-pending");
      document.documentElement.classList.add("parchlock-splash-active");
    } else {
      // Android: wait for iconScene before locking. Web/random: apply now.
      var plugin = null;
      try {
        var Cap = window.Capacitor;
        if (Cap && typeof Cap.isNativePlatform === "function" && Cap.isNativePlatform() && Cap.Plugins && Cap.Plugins.SaveFile && Cap.Plugins.SaveFile.iconScene) {
          plugin = Cap.Plugins.SaveFile;
        }
      } catch (e) {}
      if (plugin) {
        // A slow bridge is not evidence that no icon scene exists. Picking and
        // locking a random image on a timer makes slower phones mismatch.
        // The Start button remains available while the bridge answers.
        Promise.resolve().then(function () { return plugin.iconScene(); }).then(
          function (r) {
            if (window.__PL_SPLASH_LOCKED) return;
            var s = sceneById(r && r.scene) || resolveScene();
            applyScene(s, splash, picture, eyebrow);
          },
          function () {
            if (!window.__PL_SPLASH_LOCKED) applyScene(resolveScene(), splash, picture, eyebrow);
          }
        );
      } else {
        applyScene(resolveScene(), splash, picture, eyebrow);
      }
    }

    if (start) {
      start.addEventListener("click", function () {
        if (splash.classList.contains("is-leaving")) return;
        rememberDismissal();
        splash.classList.add("is-leaving");
        window.setTimeout(function () {
          splash.remove();
          document.documentElement.classList.remove("parchlock-splash-pending", "parchlock-splash-active");
          var lineInput = document.querySelector(".Input.LineInput");
          if (lineInput && lineInput.focus) lineInput.focus();
        }, 700);
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
