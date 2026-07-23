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

  function setNote(msg, type) {
    if (!note) return;
    note.textContent = msg;
    note.className = "form-note " + (type || "");
  }
})();
