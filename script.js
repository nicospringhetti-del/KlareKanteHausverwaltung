/* =====================================================================
   KLAREKANTE HAUSVERWALTUNG — Interaktion
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- Jahr im Footer automatisch setzen ---------- */
  var jahr = document.getElementById("jahr");
  if (jahr) jahr.textContent = new Date().getFullYear();

  /* ---------- Header: Zustand beim Scrollen ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (window.scrollY > 10) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile-Navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");

  function closeMenu() {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Menü öffnen");
    mobileNav.classList.remove("open");
    mobileNav.hidden = true;
  }
  function openMenu() {
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Menü schließen");
    mobileNav.hidden = false;
    // kleiner Tick, damit hidden entfernt ist, bevor die Klasse greift
    requestAnimationFrame(function () { mobileNav.classList.add("open"); });
  }

  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      open ? closeMenu() : openMenu();
    });
    // Nach Klick auf einen Link schließen
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    // Bei Größenwechsel auf Desktop zurücksetzen
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  /* ---------- Phone-Mockup: automatischer Wechsel der Portal-Ansichten ---------- */
  var phoneScreen = document.getElementById("phone-screen");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (phoneScreen && !reducedMotion) {
    var slides = phoneScreen.querySelectorAll(".phone-screen-slide");
    if (slides.length > 1) {
      var activeIndex = 0;
      setInterval(function () {
        var nextIndex = (activeIndex + 1) % slides.length;
        slides[activeIndex].classList.remove("is-active");
        slides[nextIndex].classList.add("is-active");
        activeIndex = nextIndex;
      }, 6500);
    }
  }

  /* ---------- Scroll-Reveal per IntersectionObserver ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    // Fallback: alles sofort sichtbar
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Kontaktformular ----------
     Versand über Web3Forms (api.web3forms.com) – kein eigener Server nötig.
     Feldbezogene Validierung mit aria-invalid, Fehlermeldung pro Feld und
     Fokussprung auf das erste fehlerhafte Feld.
  */
  var form = document.getElementById("kontaktformular");
  var note = document.getElementById("form-note");
  var submitBtn = form ? form.querySelector("button[type=submit]") : null;

  // Pflichtfelder: Feld-ID -> Fehlermeldung + zugehörige Fehler-Span-ID
  var requiredFields = [
    { id: "name",      err: "err-name",      msg: "Bitte geben Sie Ihren Namen an." },
    { id: "email",     err: "err-email",     msg: "Bitte geben Sie eine gültige E-Mail-Adresse an." },
    { id: "plz",       err: "err-plz",       msg: "Bitte geben Sie PLZ oder Stadtteil der Immobilie an." },
    { id: "einheiten", err: "err-einheiten", msg: "Bitte wählen Sie die Anzahl der Einheiten." },
    { id: "nachricht", err: "err-nachricht", msg: "Bitte beschreiben Sie kurz Ihr Anliegen." }
  ];

  function showFieldError(field, show) {
    var input = document.getElementById(field.id);
    var errEl = document.getElementById(field.err);
    if (!input || !errEl) return;
    if (show) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", field.err);
      errEl.textContent = field.msg;
      errEl.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      errEl.textContent = "";
      errEl.hidden = true;
    }
  }

  function fieldValid(field) {
    var input = document.getElementById(field.id);
    if (!input) return true;
    var val = (input.value || "").trim();
    if (!val) return false;
    if (field.id === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }
    if (field.id === "rr-telefon") {
      return (val.match(/\d/g) || []).length >= 6;
    }
    return true;
  }

  if (form) {
    // Fehlerzustand aufheben, sobald der Nutzer ein Feld korrigiert
    requiredFields.forEach(function (field) {
      var input = document.getElementById(field.id);
      if (!input) return;
      var evt = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(evt, function () {
        if (fieldValid(field)) showFieldError(field, false);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var firstInvalid = null;
      requiredFields.forEach(function (field) {
        var valid = fieldValid(field);
        showFieldError(field, !valid);
        if (!valid && !firstInvalid) firstInvalid = document.getElementById(field.id);
      });

      if (firstInvalid) {
        setNote("Bitte prüfen Sie die markierten Felder.", "err");
        firstInvalid.focus();
        return;
      }

      submitBtn.disabled = true;
      setNote("Wird gesendet …", "");

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          submitBtn.disabled = false;
          if (data.success) {
            setNote("Vielen Dank für Ihre Anfrage. Wir melden uns in der Regel innerhalb von 24 Stunden an Werktagen bei Ihnen.", "ok");
            form.reset();
          } else {
            setNote("Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder rufen Sie uns an.", "err");
          }
        })
        .catch(function () {
          submitBtn.disabled = false;
          setNote("Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder rufen Sie uns an.", "err");
        });
    });
  }

  /* ---------- Rückrufformular (/rueckruf) ----------
     Ziel der QR-Codes auf den Visitenkarten. Pflicht sind nur Name und
     Telefon; Versand wie beim Kontaktformular über Web3Forms.
  */
  var rrForm = document.getElementById("rueckrufformular");
  var rrNote = document.getElementById("rr-note");
  var rrFields = [
    { id: "rr-name",    err: "err-rr-name",    msg: "Bitte geben Sie Ihren Namen an." },
    { id: "rr-telefon", err: "err-rr-telefon", msg: "Bitte geben Sie eine Telefonnummer an, unter der ich Sie erreiche." }
  ];

  if (rrForm) {
    var rrBtn = rrForm.querySelector("button[type=submit]");

    rrFields.forEach(function (field) {
      var input = document.getElementById(field.id);
      if (!input) return;
      input.addEventListener("input", function () {
        if (fieldValid(field)) showFieldError(field, false);
      });
    });

    rrForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var firstInvalid = null;
      rrFields.forEach(function (field) {
        var valid = fieldValid(field);
        showFieldError(field, !valid);
        if (!valid && !firstInvalid) firstInvalid = document.getElementById(field.id);
      });

      if (firstInvalid) {
        setNote("Bitte prüfen Sie die markierten Felder.", "err", rrNote);
        firstInvalid.focus();
        return;
      }

      rrBtn.disabled = true;
      setNote("Wird gesendet …", "", rrNote);

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(rrForm)))
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          rrBtn.disabled = false;
          if (data.success) {
            setNote("Vielen Dank – Ihre Rückrufbitte ist angekommen. Ich melde mich telefonisch bei Ihnen.", "ok", rrNote);
            rrForm.reset();
            applyKanal();
          } else {
            setNote("Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder rufen Sie an: 069 8600 7411.", "err", rrNote);
          }
        })
        .catch(function () {
          rrBtn.disabled = false;
          setNote("Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder rufen Sie an: 069 8600 7411.", "err", rrNote);
        });
    });
  }

  /* ---------- Kanal der Visitenkarte ----------
     Die QR-Codes auf den Visitenkarten hängen ?k=<Kennung> an die Adresse.
     Die Kennung landet im versteckten Feld „kanal“ jedes Formulars und im
     Betreff, und sie wird an interne Links weitergereicht, damit sie auch
     nach einem Seitenwechsel (Leistungsseite → Kontaktformular) in der
     Anfrage steht. Nichts wird im Browser gespeichert (kein Cookie, kein
     Storage). Unbekannte Kennungen werden ignoriert.
  */
  var KANAELE = {
    f: "Visitenkarte Friseur & Geschäfte",
    b: "Visitenkarte Briefkasten",
    p: "Visitenkarte Persönlich",
    m: "Visitenkarte Multiplikator"
  };
  var kanalKey = (new URLSearchParams(window.location.search).get("k") || "").toLowerCase();
  var kanal = Object.prototype.hasOwnProperty.call(KANAELE, kanalKey) ? KANAELE[kanalKey] : null;

  function applyKanal() {
    if (!kanal) return;
    document.querySelectorAll('input[name="kanal"]').forEach(function (el) { el.value = kanal; });
    document.querySelectorAll('input[name="subject"]').forEach(function (el) {
      if (el.value.indexOf(kanal) === -1) el.value += " – " + kanal;
    });
  }

  if (kanal) {
    applyKanal();
    document.querySelectorAll("a[href]").forEach(function (a) {
      var url;
      try { url = new URL(a.getAttribute("href"), window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin || url.searchParams.has("k")) return;
      url.searchParams.set("k", kanalKey);
      a.setAttribute("href", url.pathname + url.search + url.hash);
    });
  }

  function setNote(msg, type, target) {
    var el = target || note;
    if (!el) return;
    el.textContent = msg;
    el.className = "form-note " + (type || "");
  }
})();
