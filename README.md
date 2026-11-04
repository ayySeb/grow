# grow

Persönliche Wachstumsziele als ruhige Web-App (PWA), Schwester-App zum Wochenplaner [Tage](https://ayyseb.github.io/tage/).

- **Quests** mit Meilensteinen, als Können formuliert („Kann 10 km am Stück laufen“), Haupt- und Nebenquests, Warum, optionales Zieldatum, Beweis-Notiz, Quest-Ideen
- **Gewohnheiten**: täglich, an Wochentagen oder X-mal pro Woche; abhaken mit Menge, Intensität, Notiz, Mini-Version; auch „Lassen“-Gewohnheiten
- **Bereiche → Skills** mit Level, Charakterlevel, Radar, XP-Heatmap, Messwert-Kurven, Abzeichen, Belohnungen
- **Reflexion**: Tagessatz mit Stimmung, Wochen-, Monats- (mit Lebensrad), Quartals- und Jahresrückblick
- **Mehr**: Vision und Werte, Leitsätze, Bucket-Liste, Lernliste, Können-Portfolio zum Drucken oder Kopieren
- Keine Bestrafung: keine Streaks, nichts Überfälliges, Level sinken nie
- Sync über dasselbe Supabase-Projekt und denselben Login wie Tage (Tabelle `grow_items`, siehe `supabase.sql`)

Kein Build-Schritt: reines HTML, CSS und JavaScript (ES-Module).

## Lokal starten

```powershell
.\serve.ps1
```

Dann http://localhost:5180 öffnen.

## Was ändere ich wo?

| Ich will … | Datei |
|---|---|
| XP-Werte, Level-Kurven, Pause bis zur Mini-Version | `js/rules.js` → `XP`, `CURVES`, `PAUSE_DAYS` |
| Fragen der Rückblicke | `js/rules.js` → `REVIEWS` |
| Abzeichen | `js/rules.js` → `BADGES` |
| Quest-Ideen pro Bereich | `js/rules.js` → `QUEST_IDEAS` |
| Start-Bereiche, -Quests, -Gewohnheiten (neues Gerät ohne Konto) | `js/rules.js` → `SEED` |
| Aussehen | `css/style.css` |
| Ein Screen | `js/views/*.js` (Quests, Heute, Charakter, Journal, Mehr) |
| Ein Detail-Fenster | `js/sheets/*.js` |
| Wie XP berechnet werden | `js/xp.js` |

XP werden nie gespeichert, sondern immer aus dem Erreichten berechnet. Eine Änderung in `rules.js` gilt deshalb sofort auch rückwirkend.

Nach Änderungen an Dateien die Versionsnummer in `sw.js` (`grow-v1` → `grow-v2`) hochzählen, damit installierte Apps sie sicher laden.
