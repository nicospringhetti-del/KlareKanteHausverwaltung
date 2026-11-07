/* 1. Baut auf weg-verwaltung-frankfurt.html die Uebersicht aller Stadtteile
      (Anker #stadtteile), auf den die erzeugten Seiten verlinken.
   2. Ersetzt die Formulierung "kaufmaennisch, technisch und rechtlich"
      auf allen Seiten – ein WEG-Verwalter erbringt keine Rechtsdienstleistung
      im Sinne des RDG, Rechtsberatung ist nur zulaessige Nebenleistung. */
"use strict";

const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const crlf = (s) => s.replace(/\r?\n/g, "\r\n");

/* ------------------------------------------------- 1. Stadtteiluebersicht */
const GRUPPEN = [
  ["Mitte und Innenstadt", [
    ["altstadt", "Altstadt"], ["innenstadt", "Innenstadt"], ["bahnhofsviertel", "Bahnhofsviertel"],
    ["gutleutviertel", "Gutleutviertel"], ["gallus", "Gallus"],
  ]],
  ["Osten", [
    ["ostend", "Ostend"], ["bornheim", "Bornheim"], ["riederwald", "Riederwald"],
    ["seckbach", "Seckbach"], ["fechenheim", "Fechenheim"], ["bergen-enkheim", "Bergen-Enkheim"],
  ]],
  ["Süden", [
    ["sachsenhausen", "Sachsenhausen"], ["oberrad", "Oberrad"], ["niederrad", "Niederrad"],
  ]],
  ["Westen", [
    ["bockenheim", "Bockenheim"], ["westend", "Westend"], ["hoechst", "Höchst"],
    ["griesheim", "Griesheim"], ["nied", "Nied"], ["schwanheim", "Schwanheim"],
    ["unterliederbach", "Unterliederbach"], ["sossenheim", "Sossenheim"],
    ["sindlingen", "Sindlingen"], ["zeilsheim", "Zeilsheim"],
  ]],
  ["Nordwesten", [
    ["roedelheim", "Rödelheim"], ["hausen", "Hausen"], ["praunheim", "Praunheim"],
    ["heddernheim", "Heddernheim"], ["niederursel", "Niederursel"],
  ]],
  ["Norden", [
    ["nordend", "Nordend"], ["dornbusch", "Dornbusch"], ["ginnheim", "Ginnheim"],
    ["eschersheim", "Eschersheim"], ["eckenheim", "Eckenheim"], ["preungesheim", "Preungesheim"],
    ["frankfurter-berg", "Frankfurter Berg"], ["bonames", "Bonames"], ["berkersheim", "Berkersheim"],
    ["riedberg", "Riedberg"], ["kalbach", "Kalbach"], ["nieder-eschbach", "Nieder-Eschbach"],
    ["harheim", "Harheim"], ["nieder-erlenbach", "Nieder-Erlenbach"],
  ]],
];

const alle = GRUPPEN.flatMap(([, l]) => l);
const slugs = alle.map(([s]) => s);
if (new Set(slugs).size !== slugs.length) throw new Error("Stadtteil doppelt in der Uebersicht");

/* Jede Datei muss es auch geben. */
for (const s of slugs) {
  const p = path.join(ROOT, `weg-verwaltung-frankfurt-${s}.html`);
  if (!fs.existsSync(p)) throw new Error(`Seite fehlt: ${s}`);
}
const vorhanden = fs.readdirSync(ROOT)
  .filter((f) => /^weg-verwaltung-frankfurt-.+\.html$/.test(f))
  .map((f) => f.replace(/^weg-verwaltung-frankfurt-|\.html$/g, ""));
const fehlend = vorhanden.filter((s) => !slugs.includes(s));
if (fehlend.length) throw new Error("Nicht in der Uebersicht: " + fehlend.join(", "));

const gruppenHtml = GRUPPEN.map(([name, liste]) => {
  const links = liste
    .map(([s, l]) => `<a href="/weg-verwaltung-frankfurt-${s}">${l}</a>`)
    .join(", ");
  return `          <p class="section-intro">\n            <strong>${name}:</strong>\n            ${links}\n          </p>`;
}).join("\n");

const NEU = `    <section class="section einsatzgebiet" id="einsatzgebiet-frankfurt">
      <div class="wrap">
        <div class="section-head" id="stadtteile">
          <p class="section-kicker">Einsatzgebiet</p>
          <h2 class="section-title">In ganz Frankfurt<br />für Sie tätig.</h2>
          <p class="section-intro">
            Unser Büro liegt in der Rhönstraße im <a href="/weg-verwaltung-frankfurt-ostend">Ostend</a>.
            Von dort betreuen wir Wohnungseigentümergemeinschaften im gesamten Stadtgebiet –
            für das passende Objekt fahren wir auch quer durch die Stadt. Zu jedem Frankfurter
            Stadtteil finden Sie hier eine eigene Seite mit dem, was dort baulich und
            organisatorisch typisch ist.
          </p>
${gruppenHtml}
          <p class="section-intro">
            Sie sind unsicher, ob Ihre Immobilie in unserem Einsatzgebiet liegt? Sprechen
            Sie uns einfach an – im <a href="#kontakt-cta">Erstgespräch</a> klären wir das
            unkompliziert und ehrlich. Neben Frankfurt betreuen wir auch ausgewählte Orte
            des Rhein-Main-Gebiets.
          </p>
        </div>
      </div>
    </section>`;

const hubPfad = path.join(ROOT, "weg-verwaltung-frankfurt.html");
let hub = fs.readFileSync(hubPfad, "utf8");

const start = hub.indexOf('    <section class="section einsatzgebiet" id="einsatzgebiet-frankfurt">');
if (start < 0) throw new Error("Einsatzgebiet-Abschnitt nicht gefunden");
const endMarker = "</section>";
const ende = hub.indexOf(endMarker, start);
if (ende < 0) throw new Error("Ende des Einsatzgebiet-Abschnitts nicht gefunden");
const alt = hub.slice(start, ende + endMarker.length);
if (alt.length > 4000) throw new Error("Abschnitt unerwartet gross – Abbruch");

hub = hub.slice(0, start) + crlf(NEU) + hub.slice(ende + endMarker.length);
fs.writeFileSync(hubPfad, hub, "utf8");

/* -------------------------------------- 2. Formulierung "und rechtlich" */
const ALT_NEU = [
  ["kaufmännisch, technisch und rechtlich", "kaufmännisch und technisch"],
  ["Kaufmännisch, technisch und rechtlich", "Kaufmännisch und technisch"],
];
let geaendert = 0;
for (const datei of fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"))) {
  const p = path.join(ROOT, datei);
  let s = fs.readFileSync(p, "utf8");
  const vorher = s;
  for (const [a, b] of ALT_NEU) s = s.split(a).join(b);
  if (s !== vorher) { fs.writeFileSync(p, s, "utf8"); geaendert++; }
}

console.log("Stadtteile in der Uebersicht:", slugs.length);
console.log("Seiten im Verzeichnis:", vorhanden.length);
console.log("Dateien mit geaenderter Formulierung:", geaendert);
