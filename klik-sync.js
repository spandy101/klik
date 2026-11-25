// Klik public sync: gives the games the same small "db" API they use on Claude, backed by Firebase Realtime Database.
(function () {
  // Every game lives at its own link, like hex.html#k7f3q2. Opening a game without a code starts a new one.
  var code = location.hash.slice(1).replace(/[^A-Za-z0-9-]/g, "");
  if (!code) history.replaceState(null, "", location.pathname + location.search + "#" + Math.random().toString(36).slice(2, 8));

  var cfg = window.KLIK_FIREBASE, ready = false;
  try { if (window.firebase && cfg && cfg.apiKey && cfg.apiKey !== "PASTE_ME") { firebase.initializeApp(cfg); ready = true; } } catch (e) { ready = false; }

  // Games save one JSON document per table. Store it as a string so Firebase keeps arrays and nulls exactly.
  function doc(path) {
    var r = firebase.database().ref("klik/" + String(path).replace(/[.#$\[\]]/g, "_"));
    var wrap = function (s) { var v = s.val(), d = null; try { d = v && typeof v.json === "string" ? JSON.parse(v.json) : null; } catch (e) { d = null; }
      return { exists: !!d, data: function () { return d; }, metadata: { fromCache: false } }; };
    return {
      set: function (d) { return r.set({ json: JSON.stringify(d), at: firebase.database.ServerValue.TIMESTAMP }); },
      get: function () { return r.get().then(wrap); },
      delete: function () { return r.remove(); },
      onSnapshot: function (fn, onErr) { var h = function (s) { fn(wrap(s)); }; r.on("value", h, onErr); return function () { r.off("value", h); }; }
    };
  }
  var db = { doc: doc };
  window.claude = { use: function (name) { return Promise.resolve(name === "db" && ready ? db : null); } };

  // Inside the feed (play.html), a game sits in a frame. Invite links share the feed, and a vertical swipe moves to the next game.
  var feed = null;
  try { if (window.parent !== window && window.parent.KLIK_FEED) feed = window.parent; } catch (e) { feed = null; }
  window.KLIK_INVITE_LINK = function (table) {
    if (feed) return feed.KLIK_FEED.link();
    return location.origin + location.pathname + "#" + table;
  };
  if (feed) {
    var t0 = null;
    var draggable = function (el) {   // never steal a drag the game itself uses, like sliding a tile
      for (; el && el.nodeType === 1; el = el.parentNode) { var ta = getComputedStyle(el).touchAction; if (ta && ta.indexOf("none") >= 0) return true; }
      return false;
    };
    document.addEventListener("touchstart", function (e) { var t = e.touches[0]; t0 = e.touches.length === 1 && !draggable(e.target) ? { x: t.clientX, y: t.clientY, at: Date.now() } : null; }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (!t0) return; var t = e.changedTouches[0], dy = t0.y - t.clientY, dx = t0.x - t.clientX; var quick = Date.now() - t0.at < 800; t0 = null;
      if (quick && Math.abs(dy) > 60 && Math.abs(dx) < Math.abs(dy) * 0.7) feed.KLIK_FEED.step(dy > 0 ? 1 : -1);
    }, { passive: true });
    var wheelAt = 0;
    document.addEventListener("wheel", function (e) { if (Math.abs(e.deltaY) < 30 || Date.now() - wheelAt < 900) return; wheelAt = Date.now(); feed.KLIK_FEED.step(e.deltaY > 0 ? 1 : -1); }, { passive: true });
    // Each game's menu also lists all the games, so either player can jump straight to one.
    document.addEventListener("DOMContentLoaded", function () {
      var menu = document.getElementById("menu"); if (!menu) return;
      var adding = false;
      new MutationObserver(function () {
        if (adding || menu.hidden || menu.querySelector(".klik-games")) return;
        adding = true;
        // Keep the menu short in the feed: just the games. Rounds, solo and invite already have their own buttons on screen.
        [].slice.call(menu.children).forEach(function (el) {
          if (el.classList.contains("sep") || /^(Play another round|Play on two phones|Play solo|Play with a friend|New game)$/.test((el.textContent || "").trim())) el.hidden = true;
        });
        var box = document.createElement("div"); box.className = "klik-games"; box.style.cssText = "display:flex;flex-direction:column;gap:4px";
        feed.KLIK_FEED.games.forEach(function (g, i) {
          var b = document.createElement("button"); b.type = "button"; b.className = "item"; b.textContent = g.name;
          if (i === feed.KLIK_FEED.current()) b.setAttribute("aria-current", "true");
          b.addEventListener("click", function () { menu.hidden = true; var mb = document.getElementById("menubtn"); if (mb) mb.setAttribute("aria-expanded", "false"); feed.KLIK_FEED.jump(i); });
          box.append(b);
        });
        menu.append(box);
        adding = false;
      }).observe(menu, { childList: true, attributes: true, attributeFilter: ["hidden"] });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "PageDown") feed.KLIK_FEED.step(1); if (e.key === "PageUp") feed.KLIK_FEED.step(-1); });
  }

  // Tapping the Klik wordmark goes back to the home page.
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.querySelector(".brand");
    if (b && !b.closest("a")) { var a = document.createElement("a"); a.href = "./"; if (feed) a.target = "_top"; a.setAttribute("aria-label", "Klik home"); a.style.color = "inherit"; a.style.textDecoration = "none"; b.replaceWith(a); a.append(b); }
  });
})();
