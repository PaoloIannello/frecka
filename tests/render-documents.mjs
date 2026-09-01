import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const outputDirectory = join(projectDirectory, "tmp", "pdfs");
const require = createRequire(import.meta.url);

globalThis.PDFLib = require(join(projectDirectory, "vendor", "pdf-lib-v1.17.1.min.js"));
globalThis.location = new URL("https://app.example.invalid/frecka/");

const qaPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAA6ADAAQAAAABAAAAAgAAAABqvnfpAAAAGUlEQVQIHWOULEq2VdU8fOc6EwMQMDICCQA2ZAP112/IsQAAAABJRU5ErkJggg==";
const qaJpegBase64 = "/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAA6ADAAQAAAABAAAAAgAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAAgADAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAAf/aAAwDAQACEQMRAD8A+bda/wCPyP8A69rX/wBER1k1r61/x+R/9e1r/wCiErIr3D+U6vxM/9k=";
const logoAssets = [
  { assetId: "qa-logo-png", mimeType: "image/png", fileName: "qa-logo.png", size: Buffer.from(qaPngBase64, "base64").length, dataUrl: `data:image/png;base64,${qaPngBase64}` },
  { assetId: "qa-logo-jpeg", mimeType: "image/jpeg", fileName: "qa-logo.jpg", size: Buffer.from(qaJpegBase64, "base64").length, dataUrl: `data:image/jpeg;base64,${qaJpegBase64}` }
];

for (const relativePath of [
  "vendor/qrcodegen-v1.8.0-es6.js",
  "js/config.js",
  "js/qr.js",
  "js/documents.js",
  "js/public-documents.js"
]) {
  const absolutePath = join(projectDirectory, relativePath);
  vm.runInThisContext(await readFile(absolutePath, "utf8"), { filename: absolutePath });
}

const options = {
  qrService: globalThis.FRECKA_QR,
  baseUrl: "https://app.example.invalid/frecka/",
  resolveLogoAsset: assetId => logoAssets.find(asset => asset.assetId === assetId) || null
};

function visiblePdfText(pdf) {
  const result = [];
  for (const page of pdf.getPages()) {
    const contents = page.node.Contents();
    const references = contents?.asArray ? contents.asArray() : contents ? [contents] : [];
    for (const reference of references) {
      const decoded = globalThis.PDFLib.decodePDFRawStream(pdf.context.lookup(reference)).decode();
      const source = new TextDecoder("latin1").decode(decoded);
      for (const match of source.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/gu)) {
        result.push(Buffer.from(match[1], "hex").toString("latin1"));
      }
    }
  }
  return result.join(" ");
}

const companySnapshot = {
  name: "Studio Änne & Söhne",
  owner: "Alex Beispiel",
  street: "Musterstraße 12",
  zip: "93047",
  city: "Regensburg",
  taxNumber: "123/456/78901"
};

const receiptBrandingSnapshot = {
  logoMode: "custom",
  visibleName: "Haarwerk Änne",
  logo: { assetId: "qa-logo-png", label: "Geschäftsbereichslogo", source: "business-area" }
};

const voucherBrandingSnapshot = {
  logoMode: "custom",
  visibleName: "Haarwerk Änne",
  logo: { assetId: "qa-logo-jpeg", label: "Geschäftsbereichslogo", source: "business-area" }
};

const receipt = {
  id: "receipt_document_qa_001",
  number: "2030-000099",
  type: "receipt",
  status: "completed",
  date: "05.01.2030",
  time: "13:34",
  companySnapshot,
  brandingSnapshot: receiptBrandingSnapshot,
  customerSnapshot: {
    id: "customer-qa",
    name: "Anna Muster",
    street: "Prüfeninger Straße 20",
    zip: "93049",
    city: "Regensburg"
  },
  items: [
    { id: "service-qa", type: "service", title: "Waschen & Schneiden", quantity: 1, originalUnitPrice: 50, unitPrice: 45, discountTotal: 5, discountLabel: "Treuerabatt", total: 45, netTotal: 37.82, taxAmount: 7.18, taxRate: 19 },
    { id: "product-qa", type: "product", title: "Pflegeöl für schönes Haar", quantity: 2, originalUnitPrice: 15, unitPrice: 15, discountTotal: 0, total: 30, netTotal: 28.04, taxAmount: 1.96, taxRate: 7 }
  ],
  originalTotal: 80,
  discountTotal: 5,
  netTotal: 65.86,
  taxTotal: 9.14,
  total: 75,
  taxGroups: [
    { rate: 19, net: 37.82, tax: 7.18, gross: 45 },
    { rate: 7, net: 28.04, tax: 1.96, gross: 30 }
  ],
  paymentStatus: "paid",
  paymentMethod: "Bar",
  prescriptionAssignment: {
    prescriptionId: "prescription-private-qa",
    prescribedOn: "2026-08-31",
    treatmentText: "PRIVATE-PRESCRIPTION-QA"
  },
  receiptTextSnapshot: { thankYouText: "Vielen Dank für Ihren Besuch.", footerText: "Wir freuen uns auf ein Wiedersehen." }
};

const treatmentRecord = {
  receiptId: receipt.id,
  receiptNumber: receipt.number,
  customerCareAdvice: "PODOLOGY004-CARE-MARKER",
  internalDocumentation: "PODOLOGY004-INTERNAL-MARKER"
};

const voucher = {
  id: "voucher_document_qa_001",
  reference: "vch_document_qa_001",
  qrReference: "vch_document_qa_001",
  code: "FRKA-QA01-2030",
  status: "partially_redeemed",
  issuedValue: 100,
  currentValue: 35,
  soldAt: "05.01.2030",
  soldTime: "13:34",
  companySnapshot,
  brandingSnapshot: voucherBrandingSnapshot,
  serviceLocationSnapshot: {
    id: "location-qa",
    name: "Haarwerk Innenstadt",
    street: "Prüfeninger Straße",
    houseNumber: "20",
    zip: "93049",
    city: "Regensburg",
    voucherNote: "Einlösbar nach Terminvereinbarung"
  },
  displayName: "Für Familie Muster",
  saleReceipt: { id: "receipt_voucher_qa", number: "2030-000098" }
};

const receiptModel = globalThis.FRECKA_DOCUMENTS.createReceiptDocumentModel(receipt, {
  ...options,
  outputMode: "customer",
  treatmentRecord
});
const taxReceiptModel = globalThis.FRECKA_DOCUMENTS.createReceiptDocumentModel(receipt, {
  ...options,
  outputMode: "tax-advisor",
  treatmentRecord
});
const voucherModel = globalThis.FRECKA_DOCUMENTS.createVoucherDocumentModel(voucher, options);
const [publicReceipt, publicVoucher] = await Promise.all([
  globalThis.FRECKA_PUBLIC_DOCUMENTS.createPublicBundle(receiptModel, { baseUrl: options.baseUrl, qrService: options.qrService }),
  globalThis.FRECKA_PUBLIC_DOCUMENTS.createPublicBundle(voucherModel, { baseUrl: options.baseUrl, qrService: options.qrService })
]);

await mkdir(outputDirectory, { recursive: true });
const receiptOutputModel = Object.freeze({ ...receiptModel, qr: publicReceipt.model.qr });
const voucherOutputModel = Object.freeze({ ...voucherModel, qr: publicVoucher.model.qr });
const [receiptBytes, taxReceiptBytes, voucherBytes] = await Promise.all([
  globalThis.FRECKA_DOCUMENTS.createPdfBytes(receiptOutputModel),
  globalThis.FRECKA_DOCUMENTS.createPdfBytes(taxReceiptModel),
  globalThis.FRECKA_DOCUMENTS.createPdfBytes(voucherOutputModel)
]);
const customerPdfText = visiblePdfText(await globalThis.PDFLib.PDFDocument.load(receiptBytes));
const taxPdfText = visiblePdfText(await globalThis.PDFLib.PDFDocument.load(taxReceiptBytes));
if (!customerPdfText.includes("Rezept vom: 31.08.2026") || !customerPdfText.includes("Pflegehinweis: PODOLOGY004-CARE-MARKER")) {
  throw new Error("PODOLOGY-004-Kundenfelder fehlen im gerenderten Kunden-PDF.");
}
if (customerPdfText.includes("PODOLOGY004-INTERNAL-MARKER")) {
  throw new Error("Interne Behandlungsdokumentation gelangte ins Kunden-PDF.");
}
if (taxPdfText.includes("Rezept vom:") || taxPdfText.includes("Pflegehinweis:") || taxPdfText.includes("PODOLOGY004-")) {
  throw new Error("Medizinische Zusatzfelder gelangten ins Steuerberater-PDF.");
}
const taxFilename = "FRECKA-Steuerberater-2030-000099.pdf";
await Promise.all([
  writeFile(join(outputDirectory, receiptOutputModel.filename), receiptBytes),
  writeFile(join(outputDirectory, taxFilename), taxReceiptBytes),
  writeFile(join(outputDirectory, voucherOutputModel.filename), voucherBytes)
]);

console.log(JSON.stringify({
  outputDirectory,
  files: [receiptOutputModel.filename, taxFilename, voucherOutputModel.filename],
  links: [publicReceipt.link, publicVoucher.link],
  qrVersions: [publicReceipt.qrVersion, publicVoucher.qrVersion]
}, null, 2));
