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

  // Tapping the Klik wordmark goes back to the home page.
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.querySelector(".brand");
    if (b && !b.closest("a")) { var a = document.createElement("a"); a.href = "./"; a.setAttribute("aria-label", "Klik home"); a.style.color = "inherit"; a.style.textDecoration = "none"; b.replaceWith(a); a.append(b); }
  });
})();
