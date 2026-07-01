# KlareKante Hausverwaltung – Website

Statische One-Page-Website für die WEG-Verwaltung **KlareKante Hausverwaltung**.
Kein Build-Schritt, keine Datenbank – nur HTML, CSS und ein bisschen JavaScript.

---

## 📁 Dateien im Überblick

| Datei | Inhalt |
|-------|--------|
| `index.html` | Die Startseite (One-Pager) |
| `styles.css` | Das komplette Design |
| `script.js` | Navigation, Animationen, Kontaktformular |
| `favicon.svg` | Das kleine Icon im Browser-Tab |
| `impressum.html` | Impressum (Pflicht in Deutschland) |
| `datenschutz.html` | Datenschutzerklärung (Pflicht) |

---

## ✏️ Inhalte anpassen

Alle noch auszufüllenden Stellen stehen in **eckigen Klammern**, z. B. `[Vorname Nachname]`.
Am schnellsten findest du sie so:

1. Öffne die Datei in einem Editor (z. B. **VS Code**, kostenlos).
2. Suche (Strg/Cmd + F) nach der Klammer `[` und ersetze der Reihe nach.

**Wichtig zu ersetzen:**
- Name & Kontaktdaten in `index.html` (Abschnitt „Kontakt" und „Über uns")
- Kennzahlen im Abschnitt „Kennzahlen" (`[XX]+`, `[XXX]`)
- E-Mail-Empfänger in `script.js` → Zeile `var EMPFAENGER = "..."`
- Alle Angaben in `impressum.html` und `datenschutz.html`

Ein Foto vom Ansprechpartner: Lege es z. B. als `bilder/portrait.jpg` ab und ersetze
in `index.html` den `<div class="portrait-placeholder">…</div>` durch:
```html
<img src="bilder/portrait.jpg" alt="[Name]" />
```

---

## 👀 Lokal ansehen

Doppelklick auf `index.html` – fertig. Die Seite öffnet sich im Browser.

---

## 🚀 Veröffentlichen mit GitHub Pages (kostenlos)

1. Änderungen hochladen:
   ```bash
   git add .
   git commit -m "Website aktualisiert"
   git push
   ```
2. Auf GitHub: **Settings → Pages**.
3. Unter „Build and deployment" → Source: **Deploy from a branch**.
4. Branch: **main**, Ordner: **/(root)** → **Save**.
5. Nach ~1 Minute ist die Seite erreichbar unter:
   `https://nicospringhetti-del.github.io/KlareKanteHausverwaltung/`

Jeder weitere `git push` aktualisiert die Live-Seite automatisch.

---

## 🌐 Eigene Netcup-Domain koppeln

**Schritt 1 – bei GitHub** (Settings → Pages → „Custom domain"):
Deine Domain eintragen, z. B. `klarekante-hausverwaltung.de`, dann **Save**.
(GitHub legt dadurch automatisch eine Datei `CNAME` im Repo an.)

**Schritt 2 – bei Netcup** (Kundenpanel CCP → Domains → DNS):

| Typ   | Host | Ziel                              |
|-------|------|-----------------------------------|
| A     | @    | `185.199.108.153`                 |
| A     | @    | `185.199.109.153`                 |
| A     | @    | `185.199.110.153`                 |
| A     | @    | `185.199.111.153`                 |
| CNAME | www  | `nicospringhetti-del.github.io.`  |

**Schritt 3 – HTTPS:** In GitHub unter Settings → Pages den Haken bei
**„Enforce HTTPS"** setzen (erscheint, sobald DNS aktiv ist – kann 1–24 h dauern).

---

## ✉️ Kontaktformular (wichtig)

Eine statische Seite kann **selbst keine E-Mails versenden**. Aktuell öffnet das
Formular beim Absenden das **E-Mail-Programm des Besuchers** (mailto) mit
vorausgefüllter Nachricht.

**Empfänger-Adresse eintragen:** in `script.js`, Zeile
```js
var EMPFAENGER = "info@klarekante-hausverwaltung.de";
```

### Optional: echter Versand über Formspree (ohne mailto)
1. Kostenloses Konto auf [formspree.io](https://formspree.io) anlegen, Formular-ID erhalten.
2. In `index.html` das `<form>`-Tag ändern:
   ```html
   <form class="contact-form" id="kontaktformular"
         action="https://formspree.io/f/DEINE-ID" method="POST">
   ```
3. In `script.js` den `submit`-Block entfernen bzw. `e.preventDefault()` weglassen,
   damit das Formular normal an Formspree gesendet wird.

---

## 🔒 Datenschutz-Hinweis zu Google Fonts

Die Seite lädt die Schriften **Fraunces**, **Archivo** und **Space Mono** von Google.
Wer die Datenübertragung an Google vermeiden will, kann die Schriften lokal einbinden
(z. B. über [google-webfonts-helper](https://gwfh.mranftl.com)) und die
`<link ...fonts.googleapis.com...>`-Zeilen in den HTML-Dateien durch lokale Verweise
ersetzen. Der Datenschutz-Hinweis in `datenschutz.html` ist entsprechend anzupassen.

---

## 🎨 Design-Konzept

- **Ästhetik:** architektonisch-editorial, „klare Kante" = scharfe Ecken, präzises Raster
- **Farben:** Papier-Creme `#F1ECE1`, Tannengrün `#1E3D31`, Terrakotta `#C0562F`
- **Schriften:** Fraunces (Display), Archivo (Text), Space Mono (Labels)

Farben zentral änderbar in `styles.css` ganz oben unter `:root { ... }`.
