# Lokale Drittanbieterdateien

## Nayuki QR Code generator

- Datei: `qrcodegen-v1.8.0-es6.js`
- Version: `1.8.0`
- Upstream: `https://github.com/nayuki/QR-Code-generator/releases/tag/v1.8.0`
- Release-Datei: `qrcodegen-v1.8.0-es6.js`
- Lizenz: MIT, siehe `qrcodegen-v1.8.0.LICENSE.txt`
- SHA-256: `6a1116192ed1dd67fa1bf31e77f5817103d71c23bbac24c382e698b7668bdd01`

Die Datei wird lokal und ohne CDN ausgeliefert. FRECKA greift nicht direkt aus den Fachansichten darauf zu; die einzige öffentliche Integration liegt in `js/qr.js`.

## pdf-lib

- Datei: `pdf-lib-v1.17.1.min.js`
- Version: `1.17.1`
- Upstream: `https://github.com/Hopding/pdf-lib/releases/tag/v1.17.1`
- Browser-Build: `dist/pdf-lib.min.js`
- Lizenz: MIT, siehe `pdf-lib-v1.17.1.LICENSE.md`
- SHA-256: `0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f`

Die Bibliothek wird lokal und ohne CDN ausgeliefert. Die einzige FRECKA-Integration liegt in `js/documents.js`; Fachansichten verwenden ausschließlich die zentrale Dokumenten-API.

## JSZip

- Datei: `jszip-v3.10.1.min.js`
- Version: `3.10.1`
- Upstream: `https://github.com/Stuk/jszip/tree/v3.10.1`
- Browser-Build: `dist/jszip.min.js`
- Lizenz: wahlweise MIT oder GPLv3; FRECKA verwendet die MIT-Lizenzoption, vollständiger Upstream-Lizenztext in `jszip-v3.10.1.LICENSE.markdown`
- SHA-256 Browser-Build: `acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e`
- SHA-256 Lizenzdatei: `566c953c6090b1218ca6217dd7359d45dde46581968586dc607d59a78af6a9c4`

Die fest versionierte Browser-Datei stammt unverändert aus dem offiziellen Tag `v3.10.1`, wird lokal und ohne CDN, npm-Runtime oder Serverdienst ausgeliefert und benötigt keine weitere Laufzeitabhängigkeit. Ausschließlich `js/export-package.js` greift direkt auf `JSZip` zu; Projektion, CSV-Inhalte und PDF-Erzeugung bleiben in ihren bestehenden zentralen Modulen.
