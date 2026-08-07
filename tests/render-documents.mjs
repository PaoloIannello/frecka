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

for (const relativePath of [
  "vendor/qrcodegen-v1.8.0-es6.js",
  "js/qr.js",
  "js/documents.js"
]) {
  const absolutePath = join(projectDirectory, relativePath);
  vm.runInThisContext(await readFile(absolutePath, "utf8"), { filename: absolutePath });
}

const options = {
  qrService: globalThis.FRECKA_QR,
  baseUrl: "https://app.example.invalid/frecka/"
};

const companySnapshot = {
  name: "Studio Änne & Söhne",
  owner: "Alex Beispiel",
  street: "Musterstraße 12",
  zip: "93047",
  city: "Regensburg",
  taxNumber: "123/456/78901"
};

const brandingSnapshot = {
  logoMode: "custom",
  visibleName: "Haarwerk Änne",
  logo: { id: "qa-logo", label: "Geschäftsbereichslogo", source: "business-area", simulated: true }
};

const receipt = {
  id: "receipt_document_qa_001",
  number: "2030-000099",
  type: "receipt",
  status: "completed",
  date: "05.01.2030",
  time: "13:34",
  companySnapshot,
  brandingSnapshot,
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
  receiptTextSnapshot: { thankYouText: "Vielen Dank für Ihren Besuch.", footerText: "Wir freuen uns auf ein Wiedersehen." }
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
  brandingSnapshot,
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

const receiptModel = globalThis.FRECKA_DOCUMENTS.createReceiptDocumentModel(receipt, options);
const voucherModel = globalThis.FRECKA_DOCUMENTS.createVoucherDocumentModel(voucher, options);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(join(outputDirectory, receiptModel.filename), await globalThis.FRECKA_DOCUMENTS.createPdfBytes(receiptModel)),
  writeFile(join(outputDirectory, voucherModel.filename), await globalThis.FRECKA_DOCUMENTS.createPdfBytes(voucherModel))
]);

console.log(JSON.stringify({
  outputDirectory,
  files: [receiptModel.filename, voucherModel.filename],
  links: [receiptModel.qr.appLink, voucherModel.qr.appLink]
}, null, 2));
