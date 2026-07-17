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
     Versand über Web3Forms (api.web3forms.com) – kein eigener Server nötig.
  */
  var form = document.getElementById("kontaktformular");
  var note = document.getElementById("form-note");
  var submitBtn = form ? form.querySelector("button[type=submit]") : null;

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = form.name.value.trim();
      var email = form.email.value.trim();
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
            setNote("Vielen Dank! Ihre Nachricht wurde versendet.", "ok");
            form.reset();
          } else {
            setNote("Senden fehlgeschlagen. Bitte versuchen Sie es erneut.", "err");
          }
        })
        .catch(function () {
          submitBtn.disabled = false;
          setNote("Senden fehlgeschlagen. Bitte versuchen Sie es erneut.", "err");
        });
    });
  }

  function setNote(msg, type) {
    if (!note) return;
    note.textContent = msg;
    note.className = "form-note " + (type || "");
  }
})();
