/* Lecteur des écrans Moule & Smile
   Écrit en JavaScript "ancien" (ES5) pour fonctionner aussi sur les navigateurs
   des télés (Samsung Tizen, etc.). Chaque page /carte/, /moules/, /frites/
   définit window.ECRAN avant de charger ce fichier. */
(function () {
  var BUILD = "v.31/10/2026 12:30";   // version du code, affichée en bas à droite
  var VERIF_MIN = 5;                   // vérification des nouveautés (minutes)
  var VIDEOS = { carte: "../videos/carte.mp4", moules: "../videos/moules.mp4", frites: "../videos/frites.mp4" };

  var ecran = window.ECRAN;
  var player = document.getElementById("player");
  var pe = document.getElementById("pe");
  var msg = document.getElementById("msg");
  document.getElementById("version").innerHTML = BUILD;

  function montrer(t, ms) {
    msg.innerHTML = t; msg.style.display = "block";
    if (ms) setTimeout(function () { msg.style.display = "none"; }, ms);
  }

  function lireVersion(cb) {
    var x = new XMLHttpRequest();
    x.open("GET", "../version.txt?t=" + new Date().getTime(), true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      var v = (x.status === 200 && x.responseText) ? x.responseText.replace(/\s+$/, "") : "";
      cb(v);
    };
    try { x.send(); } catch (e) { cb(""); }
  }

  function lancer() {
    try {
      var p = player.play();
      if (p && p["catch"]) p["catch"](function () { setTimeout(lancer, 2000); });
    } catch (e) { setTimeout(lancer, 2000); }
  }

  function estPleinEcran() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function pleinEcran() {
    var el = document.documentElement;
    try {
      if (el.requestFullscreen) { var r = el.requestFullscreen(); if (r && r["catch"]) r["catch"](function () {}); }
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (player.webkitEnterFullscreen) player.webkitEnterFullscreen();
    } catch (e) {}
    pe.style.display = "none";
    lancer();
  }

  if (!VIDEOS[ecran]) { montrer("Écran inconnu"); return; }

  lireVersion(function (versionDepart) {
    var v = versionDepart || BUILD;
    player.src = VIDEOS[ecran] + "?v=" + encodeURIComponent(v);
    player.addEventListener("canplay", lancer);
    player.addEventListener("error", function () {
      montrer("Rechargement de la vidéo…");
      setTimeout(function () { location.reload(); }, 15000);
    });
    lancer();

    // Anti-blocage : vidéo figée 30 s → rechargement ; en pause → relance
    var dernier = -1, fige = 0;
    setInterval(function () {
      if (!player.paused && player.currentTime === dernier) { fige++; if (fige >= 3) location.reload(); }
      else fige = 0;
      dernier = player.currentTime;
      if (player.paused) lancer();
    }, 10000);

    // Nouvelle vidéo ou nouvelle version → rechargement
    setInterval(function () {
      lireVersion(function (nv) { if (nv && versionDepart && nv !== versionDepart) location.reload(); });
    }, VERIF_MIN * 60000);
  });

  // Plein écran : un toucher, un clic ou la touche OK de la télécommande
  document.addEventListener("click", pleinEcran);
  document.addEventListener("keydown", function (e) {
    var k = e.keyCode;
    if (k === 13 || k === 32 || e.key === "Enter" || e.key === " ") pleinEcran();
  });
  setTimeout(function () {
    var plein = estPleinEcran() || (window.innerHeight >= screen.height - 2 && window.innerWidth >= screen.width - 2);
    if (!plein) {
      pe.style.display = "block";
      setTimeout(function () { pe.style.display = "none"; }, 6000);
    }
  }, 800);
  document.addEventListener("fullscreenchange", function () { if (estPleinEcran()) pe.style.display = "none"; });
  document.addEventListener("webkitfullscreenchange", function () { if (estPleinEcran()) pe.style.display = "none"; });

  // Mémoire hors connexion (si le navigateur la gère)
  if ("serviceWorker" in navigator) {
    try { navigator.serviceWorker.register("../sw.js"); } catch (e) {}
  }
})();
