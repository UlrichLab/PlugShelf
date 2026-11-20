# PlugShelf

Eine Plugin-Bibliothek für den Mac: findet alle installierten Plugins (VST3, AU, VST2, CLAP, AAX),
zeigt sie als Kacheln nach Kategorie und Hersteller und lädt sie mit einem Klick auf die gewählte
Spur in Ableton Live. Eigenständiger Nachbau der Kernfunktionen von RONE VST MANAGER.

## Bauen und starten

```bash
./scripts/build.sh
open build/PlugShelf.app
```

`build.sh` baut eine Universal-App (Apple Silicon + Intel), erzeugt das Icon und signiert ad hoc.
Zum Installieren `build/PlugShelf.app` nach `/Applications` ziehen.

Entwicklung ohne Fenster (Seite im Browser unter http://127.0.0.1:47900/):

```bash
swift build -c release && .build/release/PlugShelf --headless
```

## Ableton Live einrichten

1. In PlugShelf → **Setup** → **Script installieren**. Das kopiert `ableton/PlugShelf` nach
   `<User Library>/Remote Scripts/PlugShelf` (User Library der zuletzt benutzten Live-Version).
2. Live neu starten.
3. Live → Einstellungen → Link, Tempo & MIDI → Control Surface → **PlugShelf** (Ein-/Ausgang: Keine).
4. In PlugShelf → **Verbindung testen**. Die Anzeige oben wird grün.

Das Script hört auf UDP `127.0.0.1:47812` und läuft problemlos neben dem RONE-Script (Port 47811).

## Was drin ist

- **Scan**: liest Bundles direkt (Info.plist, VST3 `moduleinfo.json`, AU `AudioComponents`) und ergänzt
  Namen, Hersteller, Instrument/Effekt und Kategorien aus Ableton's eigener Plugin-Datenbank
  (`Live-plugins-1.db`, nur gelesen, aus einer Kopie). Erkennt Intel-only-Binaries und defekte Bundles.
  Formate eines Plugins werden zu einer Kachel zusammengeführt.
- **Bibliothek**: Suche (`/`, Pfeiltasten, Enter lädt), Typ, Kategorien, Hersteller, Formate, Sortierung,
  Favoriten, eigene Sammlungen, „Zuletzt geladen“, „Neu installiert“, Ausblenden, Notizen,
  Kategorie-Korrektur pro Plugin, Kachelgröße.
- **Racks**: Ketten aus mehreren Plugins, per Drag & Drop sortierbar, laden in Reihenfolge auf eine Spur.
- **Health**: Gesamtgröße, VST2-Kopien neben VST3, AAX ohne Pro Tools, nur Intel, defekte Bundles,
  Fehler beim Live-Scan, noch nicht in Live gescannt, größte Plugins. Nichts wird gelöscht – nur „Im Finder zeigen“.
- **Plugin-Bilder**: PlugShelf öffnet jedes Plugin kurz in einem kleinen Fenster unten rechts und fotografiert
  dessen Oberfläche (eigener Mini-Host für VST3, VST2 und AU; Intel-only-Plugins laufen über Rosetta).
  Jede Aufnahme läuft in einem eigenen Prozess mit Zeitlimit – ein abstürzendes Plugin trifft nie die App.
  Einmalig lassen sich die Aufnahmen übernehmen, die RONE VST MANAGER auf diesem Mac schon gemacht hat.
  Rechtsklick → „Bild neu aufnehmen“ / „Bild entfernen“.
- **Setup**: Live-Script installieren/aktualisieren, Verbindungstest, Format-Reihenfolge, AAX ein/aus, Plugin-Bilder.

## Aufbau

| Teil | Datei |
| --- | --- |
| App, Fenster (WKWebView), Menü | `Sources/PlugShelf/main.swift` |
| Lokaler HTTP-Server (nur 127.0.0.1) | `Sources/PlugShelf/HTTPServer.swift` |
| API-Routen | `Sources/PlugShelf/API.swift` |
| Scanner, Familien | `Sources/PlugShelf/Scanner.swift` |
| Namen, Hersteller, Kategorien | `Sources/PlugShelf/Classify.swift` |
| Ableton-Plugin-Datenbank | `Sources/PlugShelf/LiveDB.swift` |
| UDP zu Live, Script-Installation | `Sources/PlugShelf/Ableton.swift` |
| Nutzerdaten (Favoriten, Racks …) | `Sources/PlugShelf/Store.swift` |
| Bilder: Warteschlange, Speicher, RONE-Import | `Sources/PlugShelf/Thumbs.swift` |
| Bilder: Aufnahme-Prozess (`--capture`), AU | `Sources/PlugShelf/Capture.swift` |
| Mini-Host für VST3 / VST2 (C) | `Sources/CPlugHost/` |
| Oberfläche | `web/index.html`, `web/app.css`, `web/app.js` |
| Live-Script | `ableton/PlugShelf/__init__.py` |

Daten liegen in `~/Library/Application Support/PlugShelf/` (`library.json`, `user.json`, `thumbs/`, `shots.json`, tägliche Backups).

## Noch nicht drin (nächste Schritte)

Globale Tastenkürzel und Maus-Ring, kompakte Seitenleiste, MIDI-Bibliothek, Insights, Handy-Remote, Stream Deck.
