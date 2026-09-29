/* ---------- Einwilligung Google-Ads-Messung ----------
   Lädt gtag.js ausschliesslich nach ausdrücklicher Zustimmung. Ohne Einwilligung
   wird kein Google-Skript geladen, kein Google-Cookie gesetzt und kein Ereignis
   gesendet. Alle Google-Ads-Kennungen stehen nur in dieser Datei.
   Stil wie script.js: ES5, IIFE, var.
*/
(function () {
  "use strict";

  var KEY = "kk_consent_v1";
  var ADS_ID = "AW-18440139228";

  /* Conversion-Labels aus dem Ads-Konto. script.js nennt nur die Art,
     nie das Label – so bleiben die Kennungen an einer Stelle. */
  var LABELS = {
    form: "EWX_CP_P8IodENzj-NhE",   /* C1 – Formular bestätigt gesendet (primär) */
    tel:  "L2H3CIXQ8IodENzj-NhE",   /* C3 – Klick auf tel:-Link (sekundär)       */
    mail: "PcSQCIjQ8IodENzj-NhE"    /* C4 – Klick auf mailto:-Link (sekundär)    */
  };
  /* C2 (Anzeigenanruf ab 60 s) läuft über das Anruf-Asset in der Anzeige
     und braucht kein Website-Label. */

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function write(granted) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ads: granted, ts: new Date().toISOString() }));
    } catch (e) {}
  }

  /* ---------- Google-Tag ---------- */

  function loadAds() {
    if (window.kkAdsLoaded) return;
    window.kkAdsLoaded = true;

    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }

    /* Erst alles verweigern, dann gezielt nur die Werbemessung erlauben.
       Personalisierung und Analyse bleiben dauerhaft verweigert. */
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied"
    });
    window.gtag("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted"
    });

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ADS_ID;
    document.head.appendChild(s);

    window.gtag("js", new Date());
    window.gtag("config", ADS_ID);
  }

  /* Widerruf: Einwilligung zurücknehmen und bereits gesetzte Google-Cookies entfernen.
     Ein bereits geladenes gtag.js lässt sich nicht entladen, sendet nach diesem
     Update aber keine werbebezogenen Daten mehr. */
  function revokeAds() {
    if (window.kkAdsLoaded && window.gtag) {
      window.gtag("consent", "update", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }
    clearAdsCookies();
  }

  function clearAdsCookies() {
    var raw = document.cookie ? document.cookie.split(";") : [];
    var host = window.location.hostname;
    var base = host.replace(/^www\./, "");
    for (var i = 0; i < raw.length; i++) {
      var name = raw[i].split("=")[0].replace(/^\s+|\s+$/g, "");
      if (name.indexOf("_gcl") !== 0) continue;
      document.cookie = name + "=; Max-Age=0; path=/";
      document.cookie = name + "=; Max-Age=0; path=/; domain=" + host;
      document.cookie = name + "=; Max-Age=0; path=/; domain=." + base;
    }
  }

  /* ---------- Öffentlicher Helfer für script.js ----------
     Sendet nur, wenn eingewilligt wurde und das Tag geladen ist.
     Ohne Einwilligung passiert hier nichts. */
  window.kkTrack = function (kind) {
    if (!Object.prototype.hasOwnProperty.call(LABELS, kind)) return;
    if (!window.kkAdsLoaded || !window.gtag) return;
    window.gtag("event", "conversion", { send_to: ADS_ID + "/" + LABELS[kind] });
  };

  /* ---------- Banner ---------- */

  var lastFocus = null;

  function banner() { return document.getElementById("consent-banner"); }

  function showBanner() {
    var b = banner();
    if (!b) return;
    lastFocus = document.activeElement;
    b.hidden = false;
    var first = document.getElementById("consent-decline");
    if (first) first.focus();
  }

  function hideBanner() {
    var b = banner();
    if (!b) return;
    b.hidden = true;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    lastFocus = null;
  }

  ready(function () {
    var state = read();

    if (state && state.ads === true) loadAds();
    if (!state) showBanner();

    var accept = document.getElementById("consent-accept");
    var decline = document.getElementById("consent-decline");

    if (accept) {
      accept.addEventListener("click", function () {
        write(true);
        hideBanner();
        loadAds();
      });
    }
    if (decline) {
      decline.addEventListener("click", function () {
        write(false);
        hideBanner();
        revokeAds();
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-consent-open]"), function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        showBanner();
      });
    });
  });
})();
