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
     Statische Seiten können selbst keine E-Mails versenden.
     Standard: Das Formular öffnet das E-Mail-Programm des Besuchers (mailto).
     Für serverseitigen Versand ohne mailto siehe README.md (Formspree o. Ä.).

     >>> EMPFÄNGER-ADRESSE hier eintragen: <<<
  */
  var EMPFAENGER = "info@klarekante-hausverwaltung.de"; // TODO: echte Adresse eintragen

  var form = document.getElementById("kontaktformular");
  var note = document.getElementById("form-note");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var betreff = form.betreff.value.trim() || "Anfrage über die Website";
      var nachricht = form.nachricht.value.trim();

      // einfache Validierung
      if (!name || !email || !nachricht) {
        setNote("Bitte füllen Sie Name, E-Mail und Nachricht aus.", "err");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setNote("Bitte geben Sie eine gültige E-Mail-Adresse an.", "err");
        return;
      }

      // mailto zusammenbauen
      var body =
        "Name: " + name + "\n" +
        "E-Mail: " + email + "\n\n" +
        nachricht;
      var href =
        "mailto:" + EMPFAENGER +
        "?subject=" + encodeURIComponent(betreff) +
        "&body=" + encodeURIComponent(body);

      window.location.href = href;
      setNote("Ihr E-Mail-Programm wurde geöffnet. Bitte senden Sie die Nachricht dort ab.", "ok");
      form.reset();
    });
  }

  function setNote(msg, type) {
    if (!note) return;
    note.textContent = msg;
    note.className = "form-note " + (type || "");
  }
})();
