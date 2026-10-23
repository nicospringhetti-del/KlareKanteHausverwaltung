# Plausible Analytics – Einbindung und Inbetriebnahme

Stand: 22.10.2026. Nur öffentliche Website; Portal und fremde Arbeitsstände bleiben unverändert.
Die Umsetzung wird über einen eigenen PR geprüft, noch nicht veröffentlicht.

## Einbindung und Messung

Jedes der 15 HTML-Dokumente bindet `/analytics.js` einmal im Head ein. Diese zentrale Datei
lädt das Originalskript `https://plausible.io/js/pa-Hq0u0PME5BWAIW0bO0PDH.js` aus Nicos Konto
erst auf HTTPS, ohne abweichenden Port, für `klarekante-hausverwaltung.de` bzw. `www.`.
Die Pfadliste umfasst die bestehenden öffentlichen Seiten einschließlich Mietverwaltung,
Stadtteilseiten, Datenschutz, Impressum, Support und Rückruf. Neue öffentliche Seiten müssen
in diese Liste aufgenommen werden. Unbekannte/private Pfade werden nicht gemessen; eine
beliebige 404-URL wird nicht an den Anbieter übertragen. `/404.html` selbst ist messbar.

Seitenaufrufe werden zentral bei Laden und tatsächlichem Pfadwechsel über
`pushState`, `replaceState` und `popstate` ausgelöst; Rückkehr aus dem BFCache zählt als neuer
Aufruf. Reine Anker- oder Parameteränderungen zählen nicht neu. Die SDK-Seitenautomatik ist
dafür ausgeschaltet. Lesetiefe und Engagementzeit erfasst das Original-SDK mit seinen
Engagementsignalen. Das ist keine Garantie, dass ein Text gelesen wurde.

Die im Kontoskript aktivierten Automatiken für Formulare, externe Links und Downloads
werden lokal deaktiviert. Sonst zählt das SDK auch fehlgeschlagene Formularversuche oder
überträgt vollständige Linkziele. Stattdessen werden nur diese fünf Ereignisse gesendet:

| Exakter Ereignisname | Auslöser |
| --- | --- |
| `Telefon_Klick` | Klick auf einen `tel:`-Link; kein Nachweis eines Gesprächs |
| `Email_Klick` | Klick auf einen `mailto:`-Link; kein Nachweis einer versendeten E-Mail |
| `Formular_Begonnen` | Erste echte, nicht leere Eingabe je Kontakt-/Rückrufformular und Dokumentbesuch |
| `Anfrage_Gesendet` | Kontaktformular: HTTP-Erfolg und JSON `success === true` |
| `Rueckruf_Gesendet` | Rückrufformular: HTTP-Erfolg und JSON `success === true` |

Formularerfolg bedeutet Annahme durch Web3Forms, nicht bestätigte E-Mail-Zustellung.
Validierungsfehler, HTTP-/Netzwerkfehler, ungültiges JSON und negative Antworten zählen nicht
als Erfolg. Beide Formulare sperren parallele Übermittlungen; eine spätere neue erfolgreiche
Anfrage zählt erneut. `Formular_Begonnen` bleibt pro Formular und Dokument einmalig.
Blockiertes Analytics verhindert weder Versand noch Kontaktaktionen.

## Datenbegrenzung und gedruckte QR-Links

Vor dem Versand entfernt ein `transformRequest`-Filter freie Query-Parameter, Fragmente,
unbekannte Pfade und beliebige Properties. Auch `utm_*`, `gclid`, `ref` und `source` aus der
besuchten URL werden nicht ungeprüft weitergegeben. Die Referrer-Quelle wird auf den
HTTP(S)-Ursprung ohne Pfad/Query reduziert. Google/Bing etc. bleiben so als Herkunft erkennbar;
freie Kampagnennamen und Suchbegriffe werden bewusst nicht übernommen. Das Google-Ads-
Tracking behält seine bestehenden Original-URLs und Kennungen.

Die erlaubten Kartenkennungen bleiben auf der Website und im Formular unverändert. Nur für
Plausible entstehen feste Kampagnenwerte: `utm_source=visitenkarte`, `utm_medium=qr` und:

| Bestehende Kennung | `utm_campaign` in Plausible |
| --- | --- |
| `k=b` | `briefkasten` |
| `k=f` | `friseur-geschaefte` |
| `k=p` | `persoenlich` |
| `k=m` | `multiplikator` |
| `k=w` | `verwalterwechsel-a6` (Quelle `flyer` statt `visitenkarte`) |

`/rueckruf?k=b` und bereits gedruckte QR-Codes funktionieren weiter. Unbekannte Kartenwerte
werden verworfen. Die einzige benutzerdefinierte Eigenschaft ist `formular` mit festem Wert
`kontakt` oder `rueckruf` beim Beginn. Sie stammt nicht aus einem eingegebenen Formularwert.
Plausible legt keine Cookies oder dauerhaften Kennungen an. `consent.js`, Google-Labels und
Banner sind unverändert; Plausible ist unabhängig von der Google-Einwilligung.

## Tests ausführen

Node.js und Playwright installieren: `npm ci`, dann `npx playwright install chromium` und
`npm test`. Alternativ vorhandenes Edge in PowerShell verwenden:
`$env:TEST_BROWSER_CHANNEL='msedge'; npm test`.

Die Tests laden ausschließlich das öffentliche Originalskript von Plausible herunter.
Alle Website-Dateien, Analytics-POSTs, Google-Anfragen und Web3Forms-Übermittlungen werden
im Testbrowser lokal abgefangen. Keine echten Anfragen, E-Mails oder Analytics-Ereignisse.
Für einen Offline-Test kann `PLAUSIBLE_TRACKER_FILE` auf eine lokale Kopie dieses Skripts zeigen.

Abgedeckt: sämtliche HTML-Seiten, Produktions-/Umgebungsausschlüsse, URLs mit vertraulichen
Testwerten, Kartenquellen, Navigation und verzögerte Skriptladung, doppelte Einbindung,
Desktop/Pixel-7-Emulation, erste Eingabe, Erfolgs- und Fehlerfälle, Doppel-Submit, blockiertes
Analytics sowie Google C1/C3/C4. Der Engagementtest emuliert das Hidden-Signal, weil Headless
Edge Tabs nicht zuverlässig unsichtbar schaltet. Reale Endgeräte, Safari und echte
Web3Forms-Zustellung sind dadurch nicht geprüft.

## Verbleibende Inbetriebnahme

1. PR einschließlich Ergänzung `datenschutz.html#plausible` prüfen und freigeben. Der Text ist
   ein auf die Integration abgestimmter Entwurf, keine juristische Abnahme. Vor Veröffentlichung
   Rechtsgrundlage, Anbietervereinbarung und tatsächliche Kontoeinstellungen bestätigen.
2. Im Plausible-Konto für `klarekante-hausverwaltung.de` unter **Settings → Goals → Add goal**
   fünf Ziele vom Typ **Custom event** mit exakt den Namen oben anlegen. Der Parameter
   `formular` ist nur für optionale Detailfilter, nicht zum Anlegen der Ziele erforderlich.
3. Erst nach Freigabe mergen und GitHub-Pages-Deployment prüfen. Danach auf der
   Plausible-Installationsseite die Integration verifizieren und einen normalen Seitenbesuch
   im Dashboard kontrollieren. Vorher werden aus diesem Branch keine Live-Daten gemessen.

Rückweg nach Veröffentlichung: diesen PR revertieren; keine Datenbankmigration erforderlich.
Kein Abonnement abgeschlossen, kein Tarif geändert und keine Dashboard-Ziele angelegt.

Offizielle Grundlagen (geprüft 22.10.2026):

- [Skriptinstallation](https://plausible.io/docs/plausible-script)
- [Optionen und manuelle Seitenaufrufe](https://plausible.io/docs/script-extensions)
- [Benutzerdefinierte Ereignisse und Ziele](https://plausible.io/docs/custom-event-goals)
- [Datenrichtlinie](https://plausible.io/data-policy)
- [Anbieter](https://plausible.io/imprint) und [Auftragsverarbeitung](https://plausible.io/dpa)
