/* Erzeugt die Stadtteilseiten aus tools/daten-*.cjs und haelt
   analytics.js (PAGES) und sitemap.xml auf demselben Stand.

   Aufruf:  node tools/stadtteilseiten.cjs
   Pruefung ohne Schreiben:  node tools/stadtteilseiten.cjs --pruefen

   Die acht handgeschriebenen Seiten (BESTEHEND) werden nicht angefasst. */
"use strict";

const fs = require("fs");
const path = require("path");
const { render } = require("./stadtteil-template.cjs");

const ROOT = path.join(__dirname, "..");
const NUR_PRUEFEN = process.argv.includes("--pruefen");

/* Handgeschrieben, bleibt unveraendert. */
const BESTEHEND = [
  "bornheim", "nordend", "ostend", "sachsenhausen",
  "westend", "bockenheim", "innenstadt", "oberrad",
];

const DATEN = [
  ...require("./daten-01-mitte.cjs"),
  ...require("./daten-02-west.cjs"),
  ...require("./daten-03-nordwest.cjs"),
  ...require("./daten-04-nordost.cjs"),
];

/* ---------------------------------------------------------------- Pruefung */
const fehler = [];
const gesehen = new Set();
const alleSlugs = new Set([...BESTEHEND, ...DATEN.map((d) => d.slug)]);

const PFLICHT = [
  "slug", "ort", "eigenwert", "metaDesc", "heroLead", "heroSupport",
  "tagNum", "tagLabel", "s1Kicker", "s1Title", "s1P1", "s1P2",
  "s2Kicker", "s2Title", "s2Intro", "kostenSatz", "wechselSatz", "leistungenSatz",
];

for (const d of DATEN) {
  const wo = d.slug || "(ohne slug)";

  for (const f of PFLICHT) {
    if (!d[f] || String(d[f]).trim() === "") fehler.push(`${wo}: Feld "${f}" fehlt`);
  }
  if (gesehen.has(d.slug)) fehler.push(`${wo}: slug doppelt`);
  gesehen.add(d.slug);
  if (BESTEHEND.includes(d.slug)) fehler.push(`${wo}: wuerde eine handgeschriebene Seite ueberschreiben`);
  if (!/^[a-z0-9-]+$/.test(d.slug || "")) fehler.push(`${wo}: slug enthaelt unerlaubte Zeichen`);

  if (d.metaDesc && d.metaDesc.length > 165) {
    fehler.push(`${wo}: metaDesc ${d.metaDesc.length} Zeichen (max. 165)`);
  }
  if (!Array.isArray(d.s1Bullets) || d.s1Bullets.length !== 5) {
    fehler.push(`${wo}: s1Bullets muss 5 Eintraege haben`);
  }
  if (!Array.isArray(d.s2Cards) || d.s2Cards.length !== 3) {
    fehler.push(`${wo}: s2Cards muss 3 Eintraege haben`);
  } else {
    d.s2Cards.forEach((c, i) => {
      if (!c.h || !c.p) fehler.push(`${wo}: s2Cards[${i}] unvollstaendig`);
    });
  }
  if (!Array.isArray(d.faq) || d.faq.length !== 4) {
    fehler.push(`${wo}: faq muss 4 Eintraege haben`);
  } else {
    d.faq.forEach((f, i) => {
      if (!f.q || !f.a) fehler.push(`${wo}: faq[${i}] unvollstaendig`);
    });
  }
  if (!Array.isArray(d.nachbarn) || d.nachbarn.length !== 3) {
    fehler.push(`${wo}: nachbarn muss 3 Eintraege haben`);
  }
}

/* Nachbarlinks duerfen nur auf vorhandene Seiten zeigen und nicht auf sich selbst. */
for (const d of DATEN) {
  for (const n of d.nachbarn || []) {
    if (!alleSlugs.has(n.slug)) fehler.push(`${d.slug}: Nachbarlink "${n.slug}" existiert nicht`);
    if (n.slug === d.slug) fehler.push(`${d.slug}: verlinkt auf sich selbst`);
  }
}

if (fehler.length) {
  console.error("FEHLER in den Stadtteildaten:\n - " + fehler.join("\n - "));
  process.exit(1);
}

/* ------------------------------------------------------------- Erzeugung */
/* Repository verwendet durchgehend CRLF. */
const crlf = (s) => s.replace(/\r?\n/g, "\r\n");

const erzeugt = [];
for (const d of DATEN) {
  const html = crlf(render(d));

  /* JSON-LD muss gueltig sein. */
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) { console.error(`${d.slug}: kein JSON-LD erzeugt`); process.exit(1); }
  try { JSON.parse(m[1]); }
  catch (e) { console.error(`${d.slug}: JSON-LD ungueltig – ${e.message}`); process.exit(1); }

  /* Keine offenen Platzhalter. */
  if (/\$\{|undefined/.test(html)) {
    console.error(`${d.slug}: offener Platzhalter oder undefined im Ergebnis`);
    process.exit(1);
  }

  const datei = path.join(ROOT, `weg-verwaltung-frankfurt-${d.slug}.html`);
  if (!NUR_PRUEFEN) fs.writeFileSync(datei, html, "utf8");
  erzeugt.push({ slug: d.slug, ort: d.ort, bytes: Buffer.byteLength(html) });
}

/* -------------------------------------------------- analytics.js (PAGES) */
const alleSeitenPfade = [...BESTEHEND, ...DATEN.map((d) => d.slug)]
  .map((s) => `/weg-verwaltung-frankfurt-${s}`);

const analyticsPfad = path.join(ROOT, "analytics.js");
let analytics = fs.readFileSync(analyticsPfad, "utf8");

const basisPfade = ['/', '/404', '/datenschutz', '/impressum', '/support/', '/rueckruf',
  '/hausverwaltung-wechseln', '/mietverwaltung-frankfurt', '/verwaltungsbeirat-weg',
  '/weg-jahresabrechnung', '/weg-verwaltung-kosten', '/weg-verwaltung-frankfurt'];

const alleP = [...basisPfade, ...alleSeitenPfade];

/* Zeilen mit maximal 96 Zeichen, Einrueckung wie bisher. */
const zeilen = [];
let zeile = "  var PAGES = [";
for (let i = 0; i < alleP.length; i++) {
  const stueck = `"${alleP[i]}"` + (i < alleP.length - 1 ? ", " : "];");
  if (zeile.length + stueck.length > 96) { zeilen.push(zeile.trimEnd()); zeile = "    "; }
  zeile += stueck;
}
zeilen.push(zeile.trimEnd());
const neuesPages = zeilen.join("\r\n");

const pagesRegex = /^ {2}var PAGES = \[[\s\S]*?\];$/m;
if (!pagesRegex.test(analytics)) {
  console.error("analytics.js: PAGES-Block nicht gefunden");
  process.exit(1);
}
analytics = analytics.replace(pagesRegex, neuesPages);
if (!NUR_PRUEFEN) fs.writeFileSync(analyticsPfad, analytics, "utf8");

/* ------------------------------------------------------------- sitemap.xml */
const sitemapPfad = path.join(ROOT, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPfad, "utf8");
const heute = new Date().toISOString().slice(0, 10);

let ergaenzt = 0;
const neueEintraege = DATEN
  .filter((d) => sitemap.indexOf(`/weg-verwaltung-frankfurt-${d.slug}<`) === -1)
  .map((d) => {
    ergaenzt++;
    return [
      "  <url>",
      `    <loc>https://klarekante-hausverwaltung.de/weg-verwaltung-frankfurt-${d.slug}</loc>`,
      `    <lastmod>${heute}</lastmod>`,
      "    <changefreq>monthly</changefreq>",
      "    <priority>0.7</priority>",
      "  </url>",
    ].join("\r\n");
  });

if (neueEintraege.length) {
  sitemap = sitemap.replace(/\r?\n?<\/urlset>\s*$/, "\r\n" + neueEintraege.join("\r\n") + "\r\n</urlset>\r\n");
  if (!NUR_PRUEFEN) fs.writeFileSync(sitemapPfad, sitemap, "utf8");
}

/* ------------------------------------------------------------------ Bericht */
console.log(NUR_PRUEFEN ? "PRUEFLAUF – nichts geschrieben" : "geschrieben:");
console.log(`  Stadtteilseiten neu erzeugt: ${erzeugt.length}`);
console.log(`  Handgeschriebene Seiten unberuehrt: ${BESTEHEND.length}`);
console.log(`  Stadtteilseiten gesamt: ${erzeugt.length + BESTEHEND.length}`);
console.log(`  analytics.js PAGES-Eintraege: ${alleP.length}`);
console.log(`  sitemap.xml ergaenzt um: ${ergaenzt}`);
