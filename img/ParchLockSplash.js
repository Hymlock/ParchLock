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

  function randomIndex(length) {
    if (window.crypto && window.crypto.getRandomValues) {
      var value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] % length;
    }
    return Math.floor(Math.random() * length);
  }

  function hasBeenDismissed() {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") return true;
    } catch (e) {}
    return String(window.name || "").indexOf(WINDOW_MARKER) !== -1;
  }

  function rememberDismissal() {
    try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
    if (String(window.name || "").indexOf(WINDOW_MARKER) === -1) {
      window.name = String(window.name || "") + WINDOW_MARKER;
    }
  }

  function init() {
    var splash = document.getElementById("parchlock-splash");
    if (!splash) return;

    if (hasBeenDismissed()) {
      splash.remove();
      document.documentElement.classList.remove("parchlock-splash-pending", "parchlock-splash-active");
      return;
    }

    var scene = scenes[randomIndex(scenes.length)];
    var picture = splash.querySelector(".parchlock-splash__picture");
    var eyebrow = splash.querySelector(".parchlock-splash__eyebrow");
    var start = splash.querySelector(".parchlock-splash__start");

    splash.dataset.scene = scene.id;
    picture.src = scene.image;
    picture.alt = scene.alt;
    eyebrow.textContent = scene.eyebrow;
    document.documentElement.classList.remove("parchlock-splash-pending");
    document.documentElement.classList.add("parchlock-splash-active");

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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
