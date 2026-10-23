/* Plausible: nur öffentliche Produktionsseiten; keine Formulardaten/freien URLs.
   Konfiguration zentral, Einbindung einmal pro statischem HTML-Dokument im Head. */
(function () {
  "use strict";
  if (window.kkAnalytics) return;

  var DOMAIN = "klarekante-hausverwaltung.de";
  var PAGES = ["/", "/404", "/datenschutz", "/impressum", "/support/", "/rueckruf",
    "/hausverwaltung-wechseln", "/mietverwaltung-frankfurt", "/verwaltungsbeirat-weg",
    "/weg-jahresabrechnung", "/weg-verwaltung-kosten", "/weg-verwaltung-frankfurt",
    "/weg-verwaltung-frankfurt-bornheim", "/weg-verwaltung-frankfurt-nordend",
    "/weg-verwaltung-frankfurt-ostend"];
  var CHANNELS = { f: "friseur-geschaefte", b: "briefkasten", p: "persoenlich", m: "multiplikator",
    w: "verwalterwechsel-a6" };
  /* Gedruckte Quelle je Kennung; ohne Eintrag gilt „visitenkarte“. */
  var SOURCES = { w: "flyer" };
  var EVENTS = ["Telefon_Klick", "Email_Klick", "Formular_Begonnen", "Anfrage_Gesendet", "Rueckruf_Gesendet"];

  function publicUrl(value) {
    try {
      var url = new URL(value);
      if (url.protocol !== "https:" || url.port ||
          (url.hostname !== DOMAIN && url.hostname !== "www." + DOMAIN)) return null;
      var path = url.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
      if (path !== "/" && path !== "/support/") path = path.replace(/\/$/, "");
      if (path === "/support") path = "/support/";
      if (PAGES.indexOf(path) === -1) return null;
      var key = (url.searchParams.get("k") || "").toLowerCase();
      var channel = Object.prototype.hasOwnProperty.call(CHANNELS, key) ? CHANNELS[key] : null;
      return "https://" + DOMAIN + path + (channel ?
        "?utm_source=" + (SOURCES[key] || "visitenkarte") + "&utm_medium=qr&utm_campaign=" + channel : "");
    } catch (e) { return null; }
  }

  if (!publicUrl(window.location.href)) return;

  function referrer(value) {
    try {
      var url = new URL(value);
      return /^https?:$/.test(url.protocol) ? url.origin + "/" : null;
    } catch (e) { return null; }
  }

  window.plausible = window.plausible || function () {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
  window.plausible.init = window.plausible.init || function (options) { window.plausible.o = options || {}; };
  window.plausible.init({
    autoCapturePageviews: false,
    /* Der Kontostandard zählt jeden Submit vor der Serverantwort. Stattdessen
       unten nur feste Ereignisse und in script.js bestätigte Erfolge melden. */
    formSubmissions: false,
    outboundLinks: false,
    fileDownloads: false,
    transformRequest: function (payload) {
      var url = publicUrl(payload.u);
      if (!url || (payload.n !== "pageview" && payload.n !== "engagement" && EVENTS.indexOf(payload.n) === -1)) return null;
      var safe = { n: payload.n, v: payload.v, d: DOMAIN, u: url, r: referrer(payload.r) };
      if (payload.n === "engagement") {
        if (typeof payload.sd === "number" && isFinite(payload.sd)) safe.sd = Math.max(0, Math.min(100, payload.sd));
        if (typeof payload.e === "number" && isFinite(payload.e)) safe.e = Math.max(0, payload.e);
      }
      var kind = payload.p && payload.p.formular;
      if (payload.n === "Formular_Begonnen" && (kind === "kontakt" || kind === "rueckruf")) {
        safe.p = { formular: kind };
      }
      return safe;
    }
  });

  window.kkAnalytics = function (name, kind) {
    if (EVENTS.indexOf(name) === -1 || !publicUrl(window.location.href)) return;
    try {
      var options = { url: window.location.href };
      if (name === "Formular_Begonnen") options.props = { formular: kind };
      window.plausible(name, options);
    } catch (e) { /* Messung darf weder Kontaktlinks noch Versand unterbrechen. */ }
  };

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    var href = link.getAttribute("href");
    if (/^tel:/i.test(href)) window.kkAnalytics("Telefon_Klick");
    if (/^mailto:/i.test(href)) window.kkAnalytics("Email_Klick");
  });

  var started = [];
  function formStarted(event) {
    var field = event.target;
    var form = field.form;
    if (!event.isTrusted || !form || field.disabled || field.readOnly ||
        !/^(INPUT|TEXTAREA|SELECT)$/.test(field.tagName) ||
        /^(hidden|submit|button|reset)$/.test(field.type) || field.name === "botcheck" ||
        !String(field.value || "").trim() || started.indexOf(form) !== -1) return;
    var kind = form.id === "kontaktformular" ? "kontakt" : form.id === "rueckrufformular" ? "rueckruf" : null;
    if (!kind) return;
    started.push(form);
    window.kkAnalytics("Formular_Begonnen", kind);
  }
  document.addEventListener("input", formStarted);
  document.addEventListener("change", formStarted);

  /* Eine gemeinsame Zählung für Laden, push/pop/replaceState und BFCache.
     SDK-Automatik ist aus: keine konkurrierenden Pfad-Merklisten/Doppelzählung.
     Anker und Query-Änderungen zählen nicht als neue Seite. */
  var lastPath;
  function pageview(force) {
    var url = publicUrl(window.location.href);
    var path = url ? new URL(url).pathname : null;
    if (path && (force || path !== lastPath)) {
      try { window.plausible("pageview", { url: window.location.href }); } catch (e) {}
    }
    lastPath = path;
  }
  ["pushState", "replaceState"].forEach(function (method) {
    var original = window.history[method];
    window.history[method] = function () {
      var result = original.apply(this, arguments);
      pageview(false);
      return result;
    };
  });
  window.addEventListener("popstate", function () { pageview(false); });
  window.addEventListener("pageshow", function (event) { if (event.persisted) pageview(true); });
  pageview(false);

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://plausible.io/js/pa-Hq0u0PME5BWAIW0bO0PDH.js";
  script.referrerPolicy = "no-referrer";
  document.head.appendChild(script);
})();
