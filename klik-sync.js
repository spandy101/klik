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
    // In the feed, each game's menu is just a way back Home.
    document.addEventListener("DOMContentLoaded", function () {
      var menu = document.getElementById("menu"); if (!menu) return;
      var adding = false;
      new MutationObserver(function () {
        if (adding || menu.hidden || menu.querySelector(".klik-games")) return;
        adding = true;
        // Keep the menu short in the feed: just Home. Rounds, solo and invite already have their own buttons on screen.
        [].slice.call(menu.children).forEach(function (el) {
          if (el.classList.contains("sep") || /^(Play another round|Play on two phones|Play solo|Play with a friend|New game)$/.test((el.textContent || "").trim())) el.hidden = true;
        });
        var box = document.createElement("div"); box.className = "klik-games"; box.style.cssText = "display:flex;flex-direction:column;gap:4px";
        var home = document.createElement("a"); home.className = "item"; home.textContent = "Home"; home.href = "./" + feed.location.hash; home.target = "_top"; home.style.textDecoration = "none";
        box.append(home);
        menu.append(box);
        adding = false;
      }).observe(menu, { childList: true, attributes: true, attributeFilter: ["hidden"] });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "PageDown") feed.KLIK_FEED.step(1); if (e.key === "PageUp") feed.KLIK_FEED.step(-1); });
  }


  // ---------- names (feed only) ----------
  if (feed) document.addEventListener("DOMContentLoaded", function () {
    var F = feed.KLIK_FEED;
    var css = document.createElement("style");
    css.textContent =
      ".klik-vs{margin:-8px 0 0;text-align:center;font-size:1.05rem;opacity:.95}" +
      ".klik-vs button{font:inherit;color:inherit;background:none;border:0;padding:2px 4px;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:4px;cursor:pointer}" +
      ".klik-vs b{font-weight:700}" +
      ".klik-namecard{position:fixed;inset:0;z-index:20;background:rgba(16,41,31,.72);display:grid;place-items:center;padding:16px}" +
      ".klik-namecard form{width:min(380px,100%);background:#FFF5E1;color:#10291F;border:3px solid #10291F;border-radius:22px;box-shadow:0 6px 0 #10291F;padding:22px 20px;display:flex;flex-direction:column;gap:12px;font-family:Fredoka,Nunito,system-ui,sans-serif}" +
      ".klik-namecard h2{margin:0;font-weight:600;font-size:1.4rem;line-height:1.2}" +
      ".klik-namecard p{margin:0;color:#4B5F56;font-size:1rem}" +
      ".klik-namecard input{font:inherit;font-size:1.25rem;min-height:54px;padding:6px 14px;border-radius:14px;border:3px solid #10291F;background:#fff;color:#10291F;width:100%;box-sizing:border-box}" +
      ".klik-namecard .row{display:flex;gap:10px}.klik-namecard button{flex:1;font:inherit;font-size:1.15rem;min-height:52px;border-radius:999px;border:3px solid #10291F;background:#D9A53A;color:#10291F;box-shadow:0 4px 0 #10291F;cursor:pointer}" +
      ".klik-namecard button.alt{background:#FFF5E1}";
    document.head.append(css);

    // one card for "your name" (before inviting, or to change it)
    function askName(title, note, cta, done) {
      var wrap = document.createElement("div"); wrap.className = "klik-namecard";
      var f = document.createElement("form");
      var h = document.createElement("h2"); h.textContent = title;
      var p = document.createElement("p"); p.textContent = note;
      var i = document.createElement("input"); i.type = "text"; i.maxLength = 20; i.placeholder = "Your name"; i.setAttribute("aria-label", "Your name"); i.autocomplete = "given-name";
      i.value = F.myName() || F.savedName();
      var row = document.createElement("div"); row.className = "row";
      var cancel = document.createElement("button"); cancel.type = "button"; cancel.className = "alt"; cancel.textContent = "Cancel";
      var ok = document.createElement("button"); ok.type = "submit"; ok.textContent = cta;
      row.append(cancel, ok); f.append(h, p, i, row); wrap.append(f); document.body.append(wrap);
      setTimeout(function () { i.focus(); }, 30);
      cancel.addEventListener("click", function () { wrap.remove(); });
      f.addEventListener("submit", function (e) { e.preventDefault(); var n = i.value.trim(); if (!n) { i.focus(); return; } F.setName(n); wrap.remove(); done && done(); });
    }

    // Ask the inviter's name the first time they tap Invite a friend, then carry on with the invite.
    var inv = document.getElementById("invite"), passing = false;
    if (inv) inv.addEventListener("click", function (e) {
      if (passing || F.myName()) return;
      e.stopImmediatePropagation(); e.preventDefault();
      askName("What's your name?", "So your friend knows who's inviting them.", "Save and invite", function () { passing = true; inv.click(); passing = false; });
    }, true);
    // Home's "Invite a friend" button lands here: confirm the name (prefilled if known), and the tap on the card sends the invite.
    window.KLIK_ASK_INVITE = function () {
      if (!inv) return;
      askName(F.myName() || F.savedName() ? "Invite a friend" : "What's your name?", "So your friend knows who's inviting them.", "Invite", function () { passing = true; inv.click(); passing = false; });
    };

    // "You vs Maya" under the title; tap You to change your name
    var vs = document.createElement("p"); vs.className = "klik-vs"; vs.hidden = true;
    var tr = document.querySelector(".titlerow"); if (tr) tr.after(vs);
    function drawVs() {
      var fr = F.friendName(); vs.hidden = !fr; if (!fr) return;
      vs.replaceChildren();
      var me = document.createElement("button"); me.type = "button"; me.textContent = F.myName() || "You"; me.setAttribute("aria-label", "Change your name");
      me.addEventListener("click", function () { askName("Change your name", "Your friend sees this name.", "Save"); });
      var b = document.createElement("b"); b.textContent = fr;
      vs.append(me, " vs ", b);
    }

    // Status lines say the friend's name instead of their colour, and "your friend" becomes their name.
    var st = document.getElementById("status"), last = "";
    function nameStatus() {
      var fr = F.friendName(); if (!st || !fr) return;
      var t = st.textContent; if (t === last) return;
      var n = t;
      if (/\byou(r|'re)?\b/i.test(t)) n = n.replace(/\b(Red|Blue|Black|White)(?=('s\b| needs| goes| joined| wins| has| is| \d))/g, fr);
      if (/\byour\b/i.test(t)) n = n.replace(/\bbefore (red|blue|black|white)\b/gi, "before " + fr);
      n = n.replace(/\bjoined its sides\b/g, "joined their sides").replace(/\bYour friend's\b/g, fr + "'s").replace(/\byour friend's\b/g, fr + "'s").replace(/\bYour friend\b/g, fr).replace(/\byour friend\b/g, fr);
      last = n; if (n !== t) st.textContent = n;
    }
    if (st) new MutationObserver(nameStatus).observe(st, { childList: true, characterData: true, subtree: true });
    F.onNames(function () { drawVs(); last = ""; nameStatus(); });
    drawVs(); nameStatus();
  });

  // Tapping the Klik wordmark goes back to the home page.
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.querySelector(".brand");
    if (b && !b.closest("a")) { var a = document.createElement("a"); a.href = "./"; if (feed) a.target = "_top"; a.setAttribute("aria-label", "Klik home"); a.style.color = "inherit"; a.style.textDecoration = "none"; b.replaceWith(a); a.append(b); }
  });
})();
