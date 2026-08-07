import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
globalThis.location = new URL("https://paoloiannello.github.io/frecka/");

for (const relativePath of [
  "vendor/qrcodegen-v1.8.0-es6.js",
  "js/config.js",
  "js/qr.js",
  "js/public-documents.js"
]) {
  const absolutePath = join(projectDirectory, relativePath);
  vm.runInThisContext(await readFile(absolutePath, "utf8"), { filename: absolutePath });
}

const titles = [
  "Waschen & Schneiden",
  "Intensive Farbberatung mit Ansatzfarbe",
  "Pflegeöl für schönes Haar",
  "Festliches Styling ÄÖÜ",
  "Kopfhautpflege & Massage",
  "Beratung für natürliche Locken",
  "Glossing mit individueller Nuancierung",
  "Haarkur mit Aufbaupflege",
  "Konturenschnitt und Finish",
  "Föhnen mit Volumenstyling"
];

function receiptModel(positionCount, conservative = false) {
  const positions = Array.from({ length: positionCount }, (_, index) => ({
    index: index + 1,
    title: `${titles[index % titles.length]} ${index + 1}`,
    type: index % 4 === 0 ? "product" : "service",
    quantity: index % 5 === 0 ? 2 : 1,
    originalUnitCents: 1990 + index * 37,
    unitCents: 1890 + index * 37,
    discountCents: index % 6 === 0 ? 100 : 0,
    discountLabel: index % 6 === 0 ? "Treuerabatt für Stammkundschaft" : "Rabatt",
    totalCents: 1890 + index * 37,
    netCents: 1588 + index * 31,
    taxCents: 302 + index * 6,
    taxRate: index % 4 === 0 ? 7 : 19
  }));
  const gross = positions.reduce((sum, item) => sum + item.totalCents, 0);
  const discount = positions.reduce((sum, item) => sum + item.discountCents, 0);
  return {
    documentVersion: "DOCUMENT-001",
    type: "receipt",
    number: "2026-000123",
    kind: { code: "receipt", label: "Beleg", title: "Digitaler Beleg" },
    status: "Bezahlt",
    paymentStatus: "paid",
    paymentStatusLabel: "Bezahlt",
    paymentMethod: conservative ? "Gutschein + Karte" : "Karte",
    dateTime: "07.08.2026 • 14:20",
    issuer: {
      name: "Frisör Änne & Söhne",
      owner: "Alexandra Beispiel-Unternehmerin",
      displayName: "Frisör Änne & Söhne",
      street: "Lange Musterstraße 123",
      cityLine: "93047 Regensburg",
      country: "Deutschland",
      taxNumber: "123/456/78901",
      vatId: "DE123456789",
      phone: "nicht transportieren",
      email: "nicht@transportieren.invalid"
    },
    branding: { visibleName: "Haarwerk Änne", logoMode: "custom", logo: { label: "Geschäftsbereichslogo", initials: "GB" } },
    customer: conservative ? { name: "Marlene Musterfrau-Özdemir", street: "Prüfeninger Straße 220", cityLine: "93049 Regensburg", email: "privat@example.invalid", phone: "0123" } : null,
    positions,
    totals: { subtotalCents: gross + discount, discountCents: discount, netCents: gross - 1900, taxCents: 1900, grossCents: gross },
    taxes: conservative ? [{ rate: 19, netCents: gross - 2200, taxCents: 1800, grossCents: gross - 400 }, { rate: 7, netCents: 374, taxCents: 100, grossCents: 474 }] : [{ rate: 19, netCents: gross - 1900, taxCents: 1900, grossCents: gross }],
    voucherPayment: conservative ? { reference: "intern", code: "FRKA-GREN-1234", amountCents: 5000 } : null,
    remainderPayment: conservative ? { method: "Karte", amountCents: Math.max(0, gross - 5000) } : null,
    linkedVoucher: null,
    correctionReference: "",
    texts: {
      thankYou: conservative ? "Vielen Dank für deinen Besuch – wir freuen uns auf ein Wiedersehen!" : "Vielen Dank für Ihren Besuch.",
      footer: conservative ? "Bitte bewahre diesen Beleg für deine Unterlagen auf. Alle Beträge wurden auf dem Gerät des Unternehmens erfasst." : ""
    }
  };
}

function voucherModel() {
  const receipt = receiptModel(1, true);
  return {
    documentVersion: "DOCUMENT-001",
    type: "voucher",
    code: "FRKA-ÄNNE-2026",
    title: "Gutschein",
    status: "partially_redeemed",
    statusLabel: "Teilweise eingelöst",
    issuedValueCents: 15000,
    currentValueCents: 7543,
    soldAt: "07.08.2026 • 14:20",
    issuer: receipt.issuer,
    branding: receipt.branding,
    displayName: "Für Zoë & Jürgen",
    redemptionLocation: {
      name: "Haarwerk Änne Innenstadt",
      street: "Prüfeninger Straße 220",
      cityLine: "93049 Regensburg",
      voucherNote: "Einlösbar nach Terminvereinbarung für alle angebotenen Leistungen – ausgenommen bereits reduzierte Aktionsangebote."
    }
  };
}

const cases = [
  ["klein", receiptModel(1)],
  ["normal", receiptModel(3)],
  ["umlaute", receiptModel(3, true)],
  ["lang-20", receiptModel(20, true)],
  ["lang-25", receiptModel(25, true)],
  ["gutschein", voucherModel()]
];

const rows = [];
let exampleLink = "";
for (const [name, model] of cases) {
  try {
    const bundle = await globalThis.FRECKA_PUBLIC_DOCUMENTS.createPublicBundle(model, {
      baseUrl: globalThis.location.href,
      qrService: globalThis.FRECKA_QR
    });
    if (!exampleLink) exampleLink = bundle.link;
    rows.push({ name, raw: bundle.rawBytes, deflate: bundle.transportBytes, url: bundle.urlLength, qrVersion: bundle.qrVersion, matrix: bundle.qrSize, result: "ok" });
  } catch (error) {
    rows.push({ name, result: error.code || error.name, message: error.userMessage || error.message });
  }
}

console.table(rows);
if (process.argv.includes("--example-link")) console.log(`PUBLIC_EXAMPLE_LINK=${exampleLink}`);
