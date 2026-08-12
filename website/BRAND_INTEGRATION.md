# FRECKA Brand Integration

## 1. Integrationsprinzip

Die Landingpage besitzt eine feste Asset-Schnittstelle. Alle sichtbaren Brand- und Media-Dateien werden ausschließlich aus `website/assets/` geladen.

`styles/brand-assets.css` ist die zentrale Zuordnungsschicht:

- Es definiert die dauerhaften Pfade als CSS Custom Properties.
- Es legt finale Medien über die vorhandenen RC2-Fallbackflächen.
- Fehlt eine Datei, bleibt der Text- bzw. CSS-Fallback sichtbar.
- Liegt die freigegebene Datei unter dem erwarteten Namen, erscheint sie automatisch.
- Abmessungen, Layout, DOM, Inhalte und JavaScript ändern sich beim Austausch nicht.

Die Landingpage bindet Favicons, Apple Touch Icon und Social Preview bereits direkt unter den finalen Assetpfaden ein. Bis diese Dateien geliefert sind, können dafür Netzwerk-404 auftreten; sichtbare Seitenelemente bleiben davon unbeeinträchtigt. Vor Produktion müssen alle direkt referenzierten P0-Dateien vorhanden sein.

## 2. Logo-Integration

### Header

| Eigenschaft | Festlegung |
| --- | --- |
| Stelle | `.c-header .c-brand__wordmark` |
| Erwartete Datei | `assets/logo/svg/frecka-logo-horizontal-positive.svg` |
| Darstellungsbox | 120 × 20 CSS px |
| Skalierung | `contain`, links zentriert |
| Fallback | Live-Text „FRECKA“ |
| Claim | separater Live-Text „Einfach. Erledigt. Weiter.“ |
| Modus | positiv auf heller Headerfläche |

### Footer

| Eigenschaft | Festlegung |
| --- | --- |
| Stelle | `.c-footer .c-brand__wordmark` |
| Erwartete Datei | `assets/logo/svg/frecka-logo-horizontal-positive.svg` |
| Darstellungsbox | 152 × 28 CSS px |
| Skalierung | `contain`, links zentriert |
| Fallback | Live-Text „FRECKA“ |
| Claim | separater Live-Text |
| Modus | positiv auf Weiß |

Die SVG-Datei darf den Claim nicht enthalten. Die horizontale Fassung umfasst D TILE und Wortmarke. Ihre `viewBox` muss ohne unnötige Außenfläche exportiert sein.

### Vorbereitete, derzeit nicht sichtbare Fassungen

- `assets/logo/svg/frecka-logo-horizontal-negative.svg`
- `assets/logo/svg/frecka-logo-horizontal-monochrome.svg`
- positive/negative/monochrome Wortmarke;
- positive/negative/monochrome D-TILE-Bildmarke.

Diese Dateien sind für Dark-Mode-, Druck-, Icon- und Social-Anwendungen vorbereitet, werden auf der hellen Landingpage aber nicht zusätzlich geladen.

## 3. Hero Screenshot

| Eigenschaft | Festlegung |
| --- | --- |
| Stelle | Hero Product Stage, innerhalb `.c-device__screen` |
| Datei | `assets/screenshots/hero/frecka-hero-receipt-flow.webp` |
| Quellexport | 1240 × 2200 px |
| Seitenverhältnis | 31:55 |
| Darstellung | exakt in den bestehenden Device-Screen eingepasst |
| Position | Mitte |
| Ladepriorität | Hero/P0; später nicht lazy laden |
| Fallback | vorhandene CSS-App-Vorschau |

Die Datei muss exakt auf den sichtbaren App-Inhalt zugeschnitten sein. Browserchrome, Geräteframe und zusätzliche transparente Ränder sind ausgeschlossen, weil der neutrale Device Frame bereits durch CSS erzeugt wird.

## 4. Workflow Screens

| Schritt | Stelle | Erwartete Datei | Quellexport | Darstellung |
| --- | --- | --- | --- | --- |
| Leistung auswählen | erste `.c-step-item .c-mini-screen` | `assets/screenshots/workflow/frecka-workflow-01-select.webp` | 960 × 540 px | `cover`, Mitte |
| Zahlung erfassen | zweite `.c-step-item .c-mini-screen` | `assets/screenshots/workflow/frecka-workflow-02-payment.webp` | 960 × 540 px | `cover`, Mitte |
| Beleg abschließen | dritte `.c-step-item .c-mini-screen` | `assets/screenshots/workflow/frecka-workflow-03-receipt.webp` | 960 × 540 px | `cover`, Mitte |

Die drei Dateien müssen aus demselben freigegebenen Release und demselben fiktiven Datensatz stammen. Der zentrale Funktionszustand gehört in die Bildmitte; wichtige UI darf bei responsiver `cover`-Darstellung nicht am Außenrand liegen.

## 5. Arbeitsfoto

| Eigenschaft | Festlegung |
| --- | --- |
| Stelle | Arbeitsalltag, `.c-photo-slot__surface` |
| Webdatei | `assets/photos/optimized/frecka-workday.webp` |
| Master | `assets/photos/originals/frecka-workday-master.*` |
| Mindest-Webgröße | 1600 × 1200 px |
| bevorzugtes Seitenverhältnis | 4:3 |
| Darstellung | `cover`, Mitte |
| Fallback | vorhandene ruhige CSS-Fotofläche |

Der Master behält sein natives Kameraformat und wird nicht von der Website geladen. Die optimierte Webfassung enthält keine EXIF-, Standort- oder personenbezogenen Metadaten.

Die vorhandene `role="img"`-Beschreibung bleibt gültig, solange das finale Motiv dieselbe Aufgabe erfüllt: eine ruhige Arbeitssituation in einem kleinen Dienstleistungsbetrieb. Weicht das spätere Motiv inhaltlich davon ab, ist aus Barrierefreiheitsgründen einmalig der vorhandene `aria-label` anzupassen; das wäre eine Inhaltskorrektur, kein technischer Assetaustausch. Das ausgewählte Motiv soll deshalb die dokumentierte Beschreibung erfüllen.

## 6. Favicon

### Direkt eingebunden

| Datei | Zweck | Größe |
| --- | --- | ---: |
| `assets/logo/favicon/favicon.svg` | moderner Browser-Tab | skalierbar, quadratische `viewBox` |
| `assets/logo/favicon/favicon-32.png` | PNG-Fallback | 32 × 32 px |

### Zusätzlich zu liefern

- `favicon-16.png` – 16 × 16 px;
- `favicon-48.png` – 48 × 48 px;
- `favicon.ico` – Multi-Size 16/32/48 px.

Die zusätzlichen Dateien sind für Host-/Browserkonfigurationen vorbereitet, werden in RC2 noch nicht separat angefragt.

## 7. Apple Touch Icon

| Eigenschaft | Festlegung |
| --- | --- |
| Direkt eingebundene Datei | `assets/app-icon/ios/apple-touch-icon-180.png` |
| Größe | exakt 180 × 180 px |
| Inhalt | D TILE ohne Wortmarke |
| Transparenz | vermeiden |
| Safe Zone | zentrale 66 % |

`assets/app-icon/ios/app-icon-1024.png` ist zusätzlich als Store-/Masterexport vorgesehen, wird von der Landingpage nicht geladen.

## 8. Android und Adaptive Icons

Die Landingpage besitzt derzeit kein eigenes Web-App-Manifest. Deshalb werden Android-Icons vorbereitet, aber noch nicht vom Browser angefragt.

### Legacy/Density-Dateien

- `assets/app-icon/android/icon-48.png`
- `assets/app-icon/android/icon-72.png`
- `assets/app-icon/android/icon-96.png`
- `assets/app-icon/android/icon-144.png`
- `assets/app-icon/android/icon-192.png`
- `assets/app-icon/android/icon-512.png`

### Adaptive Dateien

- `assets/app-icon/adaptive/foreground-432.png`
- `assets/app-icon/adaptive/background-432.png`
- `assets/app-icon/adaptive/monochrome-432.png`

Eine spätere Manifestintegration darf diese Pfade direkt übernehmen. Sie ist nicht Teil von WEBSITE-006, weil keine neue Websitefunktion eingeführt wird.

## 9. OpenGraph und Social Preview

### Direkt eingebunden

| Metadatum | Datei | Größe |
| --- | --- | ---: |
| OpenGraph Image | `/assets/social/frecka-og-1200x630.png` | 1200 × 630 px |
| X/Twitter Image | `/assets/social/frecka-og-1200x630.png` | 1200 × 630 px |

Alt-Text ist bereits vorbereitet: „FRECKA – Einfach. Erledigt. Weiter.“

Der Root-Pfad setzt eine Veröffentlichung von `website/` am Domainroot voraus. Bei Hosting in einem Unterverzeichnis muss die Deploymentkonfiguration den Rootpfad entsprechend abbilden. Für maximale Crawlerkompatibilität sind `og:image`, `og:url` und Canonical nach Festlegung der Produktionsdomain als absolute URLs auszuliefern; die Assetdatei und ihr Verzeichnis bleiben unverändert.

### Weitere vorbereitete Social Assets

- `assets/social/frecka-social-square-1080.png`
- `assets/social/frecka-social-portrait-1080x1350.png`
- `assets/social/frecka-social-story-1080x1920.png`
- `assets/social/frecka-avatar-512.png`

Diese Dateien werden nicht von der Landingpage geladen.

## 10. Weitere Produkt-Screenshots

Die folgenden Dateien sind für spätere Seiten oder Medien vorbereitet. RC2 lädt sie nicht und erhält dadurch keine Performancekosten.

| Bereich | Erwartete Datei | Größe |
| --- | --- | ---: |
| Kunden | `assets/screenshots/customers/frecka-customers-overview.webp` | 1240 × 2200 px |
| Gutscheine | `assets/screenshots/vouchers/frecka-vouchers-overview.webp` | 1240 × 2200 px |
| Belege Übersicht | `assets/screenshots/receipts/frecka-receipts-overview.webp` | 1240 × 2200 px |
| Beleg Detail | `assets/screenshots/receipts/frecka-receipt-detail.webp` | 1240 × 2200 px |
| Einstellungen | `assets/screenshots/settings/frecka-settings-overview.webp` | 1240 × 2200 px |
| Datenkontrolle | `assets/screenshots/settings/frecka-settings-data-control.webp` | 1240 × 2200 px |

## 11. Aktuell fehlende P0-Dateien

Zum Abschluss von WEBSITE-006 wurden bewusst keine visuellen Assets erzeugt. Daher fehlen derzeit:

- `assets/logo/svg/frecka-logo-horizontal-positive.svg`;
- `assets/logo/favicon/favicon.svg`;
- `assets/logo/favicon/favicon-32.png`;
- `assets/app-icon/ios/apple-touch-icon-180.png`;
- `assets/screenshots/hero/frecka-hero-receipt-flow.webp`;
- drei Workflow-WebP-Dateien;
- `assets/photos/optimized/frecka-workday.webp`;
- `assets/social/frecka-og-1200x630.png`.

Die Landingpage bleibt ohne die sichtbaren Logo-/Bilddateien durch ihre bestehenden Fallbacks benutzbar. Favicon, Touch Icon und Social Image müssen vor einem Produktionsdeployment vorhanden sein, um fehlende Netzwerkressourcen zu vermeiden.

## 12. Austauschablauf

1. Asset nach `BRAND_GUIDELINES.md` gestalten bzw. freigeben.
2. Exakt mit dem in diesem Dokument genannten Namen exportieren.
3. In den vorgesehenen Ordner legen und bestehende Datei atomar ersetzen.
4. Browsercache leeren oder Assetversion im Deployment invalidieren.
5. Seite ohne HTML-/CSS-Änderung prüfen.
6. Kontrast, Zuschnitt, Schärfe, CLS und Reduced Motion erneut abnehmen.
7. `ASSET_CHECKLIST.md` erst nach erfolgreicher Prüfung abhaken.

## 13. Technische Grenzen

- Dateiendungen und Namen sind Teil der öffentlichen Schnittstelle.
- Ein Wechsel von WebP zu AVIF oder SVG zu PNG erfordert eine Anpassung der zentralen Pfaddefinition, wenn nicht dieselben Namen beibehalten werden können.
- Logo- und Bildproportionen müssen den vorgesehenen Boxen entsprechen.
- CSS-Hintergrundbilder besitzen keine eigene Bildsemantik. Die Landingpage liefert ihren Kontext bereits über sichtbare Texte, Captions und die vorhandene Foto-Beschreibung.
- Der Claim bleibt HTML-Text.
- Direkte Browser-/Social-Metadatenassets besitzen keinen sichtbaren Fallback und sind vor Produktion Pflicht.

