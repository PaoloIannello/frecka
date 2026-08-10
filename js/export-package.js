(() => {
  "use strict";

  const PACKAGE_FORMAT = "FRECKA_TAX_ADVISOR_PACKAGE";
  const PACKAGE_FORMAT_VERSION = 1;
  const JSZIP_VERSION = "3.10.1";
  const ZIP_MIME_TYPE = "application/zip";

  class ExportPackageError extends Error {
    constructor(code, userMessage, cause = null) {
      super(userMessage, cause ? { cause } : undefined);
      this.name = "ExportPackageError";
      this.code = code;
      this.userMessage = userMessage;
    }
  }

  const text = value => value == null ? "" : String(value).trim();

  function requireService(service, method, code, message) {
    if (!service || typeof service[method] !== "function") {
      throw new ExportPackageError(code, message);
    }
    return service;
  }

  function requireZipLibrary(library) {
    if (typeof library !== "function" || library.version !== JSZIP_VERSION || library.support?.uint8array !== true) {
      throw new ExportPackageError(
        "ZIP_UNAVAILABLE",
        `Die lokale ZIP-Komponente JSZip ${JSZIP_VERSION} ist nicht verfügbar.`
      );
    }
    return library;
  }

  function lastDayOfMonth(dateKey) {
    const match = text(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/u);
    if (!match) return "";
    const year = Number(match[1]);
    const month = Number(match[2]);
    return String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0");
  }

  function periodToken(range) {
    const dateFrom = text(range?.dateFrom);
    const dateTo = text(range?.dateTo);
    const fromMonth = dateFrom.slice(0, 7);
    const isFullMonth = /^\d{4}-\d{2}$/u.test(fromMonth)
      && dateFrom === `${fromMonth}-01`
      && dateTo === `${fromMonth}-${lastDayOfMonth(dateFrom)}`;
    return isFullMonth ? fromMonth : `${dateFrom}_bis_${dateTo}`;
  }

  function safeFilenamePart(value, fallback = "Datei") {
    return text(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/[^A-Za-z0-9_-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 100) || fallback;
  }

  function packageRoot(projection) {
    const period = periodToken(projection.range);
    if (!period || period.includes("_bis_") && /(?:^|_bis_)$/u.test(period)) {
      throw new ExportPackageError("PACKAGE_PERIOD_INVALID", "Der Exportzeitraum ist für den Paketnamen ungültig.");
    }
    const areaSuffix = projection.businessAreaId === "all"
      ? ""
      : `-${safeFilenamePart(projection.businessAreasLabel, "Geschaeftsbereich")}`;
    return `FRECKA-Steuerberatung-${period}${areaSuffix}`;
  }

  function archiveDate(value) {
    const result = new Date(value);
    if (!Number.isFinite(result.getTime())) {
      throw new ExportPackageError("PACKAGE_DATE_INVALID", "Das Erstellungsdatum des Exports ist ungültig.");
    }
    return result;
  }

  function linkedVoucherFor(receipt, projection) {
    const reference = text(receipt?.voucherReference);
    if (!reference) return null;
    return projection.voucherRecords.find(voucher => [voucher?.reference, voucher?.qrReference, voucher?.id].some(value => text(value) === reference)) || null;
  }

  async function defaultReceiptPdf(receipt, projection, dependencies) {
    const documents = requireService(
      dependencies.documentService || globalThis.FRECKA_DOCUMENTS,
      "createReceiptDocumentModel",
      "DOCUMENT_SERVICE_UNAVAILABLE",
      "Die Beleg-PDF-Engine ist für den Export nicht verfügbar."
    );
    requireService(
      documents,
      "createPdfBytes",
      "DOCUMENT_SERVICE_UNAVAILABLE",
      "Die Beleg-PDF-Engine ist für den Export nicht verfügbar."
    );
    const qrService = dependencies.qrService || globalThis.FRECKA_QR;
    const model = documents.createReceiptDocumentModel(receipt, {
      qrService,
      companyIdentity: dependencies.companyIdentity || globalThis.FRECKA_PERSISTENCE?.companyIdentity,
      linkedVoucher: linkedVoucherFor(receipt, projection)
    });
    let outputModel = model;
    const publicDocuments = dependencies.publicDocumentService || globalThis.FRECKA_PUBLIC_DOCUMENTS;
    if (typeof publicDocuments?.createPublicBundle === "function") {
      try {
        outputModel = (await publicDocuments.createPublicBundle(model, { qrService })).model;
      } catch (error) {
        outputModel = Object.freeze({ ...model, qr: null });
      }
    }
    return documents.createPdfBytes(outputModel);
  }

  async function binaryContent(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (typeof Blob !== "undefined" && value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
    throw new ExportPackageError("PDF_CONTENT_INVALID", "Ein Beleg-PDF besitzt kein unterstütztes Binärformat.");
  }

  async function createTaxAdvisorPackage(snapshotOrProjection, options = {}, dependencies = {}) {
    if (options.exportType && options.exportType !== "tax-advisor") {
      throw new ExportPackageError("PACKAGE_TYPE_INVALID", "Das ZIP-Gesamtpaket ist ausschließlich für den Steuerberaterexport vorgesehen.");
    }
    const exportApi = requireService(
      dependencies.exportApi || globalThis.FRECKA_EXPORT,
      "createExportFiles",
      "EXPORT_SERVICE_UNAVAILABLE",
      "Der zentrale FRECKA-Export ist nicht verfügbar."
    );
    requireService(
      exportApi,
      "createSummaryFile",
      "EXPORT_SERVICE_UNAVAILABLE",
      "Die Exportübersicht ist nicht verfügbar."
    );
    const ZipLibrary = requireZipLibrary(dependencies.zipLibrary || globalThis.JSZip);
    const exported = exportApi.createExportFiles(snapshotOrProjection, {
      ...options,
      exportType: "tax-advisor",
      includeCustomers: false
    });
    const projection = exported.projection;
    if (!Array.isArray(projection.receiptRecords) || !Array.isArray(projection.voucherRecords)) {
      throw new ExportPackageError("PACKAGE_PROJECTION_INVALID", "Die zentrale Exportprojektion enthält keine Belegdokumente.");
    }
    if (exported.files.some(file => file.name === "Kunden.csv")) {
      throw new ExportPackageError("PACKAGE_PRIVACY_INVALID", "Kundenstammdaten dürfen nicht in das Steuerberaterpaket gelangen.");
    }

    const rootDirectory = packageRoot(projection);
    const zip = new ZipLibrary();
    const date = archiveDate(projection.generatedAt);
    const compressionOptions = { level: 6 };
    const summaryFile = exportApi.createSummaryFile(projection);
    const textFiles = Object.freeze([summaryFile, ...exported.files]);
    const entries = [];

    textFiles.forEach(file => {
      const path = `${rootDirectory}/${file.name}`;
      zip.file(path, file.content, { date, createFolders: false, compression: "DEFLATE", compressionOptions });
      entries.push({ path, name: file.name, type: file.mimeType, kind: "data", size: new Blob([file.content]).size });
    });

    const pdfFactory = dependencies.createReceiptPdf || ((receipt, currentProjection) => defaultReceiptPdf(receipt, currentProjection, dependencies));
    const usedPdfNames = new Set();
    for (const receipt of projection.receiptRecords) {
      const number = text(receipt?.receiptNumber) || text(receipt?.number);
      if (!number) {
        throw new ExportPackageError("PDF_REFERENCE_INVALID", "Ein exportierter Beleg besitzt keine Belegnummer.");
      }
      const filename = `${safeFilenamePart(number, "Beleg")}.pdf`;
      const normalizedName = filename.toLocaleLowerCase("de-DE");
      if (usedPdfNames.has(normalizedName)) {
        throw new ExportPackageError("PDF_FILENAME_COLLISION", `Die Belegnummer ${number} erzeugt keinen eindeutigen PDF-Dateinamen.`);
      }
      usedPdfNames.add(normalizedName);
      let pdfBytes;
      try {
        pdfBytes = await binaryContent(await pdfFactory(receipt, projection));
      } catch (error) {
        if (error instanceof ExportPackageError) throw error;
        throw new ExportPackageError("PDF_CREATION_FAILED", `Das PDF für Beleg ${number} konnte nicht erzeugt werden.`, error);
      }
      const path = `${rootDirectory}/Belege/${filename}`;
      zip.file(path, pdfBytes, { date, createFolders: false, compression: "DEFLATE", compressionOptions });
      entries.push({ path, name: filename, type: "application/pdf", kind: "receipt-pdf", size: pdfBytes.byteLength, receiptNumber: number });
    }

    let bytes;
    try {
      bytes = await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions,
        platform: "UNIX",
        streamFiles: true,
        mimeType: ZIP_MIME_TYPE
      });
    } catch (error) {
      throw new ExportPackageError("ZIP_CREATION_FAILED", "Das Steuerberaterpaket konnte nicht als ZIP erstellt werden.", error);
    }
    const blob = new Blob([bytes], { type: ZIP_MIME_TYPE });
    const packageFile = Object.freeze({
      name: `${rootDirectory}.zip`,
      mimeType: ZIP_MIME_TYPE,
      content: blob,
      size: blob.size
    });
    return Object.freeze({
      packageFormat: PACKAGE_FORMAT,
      packageFormatVersion: PACKAGE_FORMAT_VERSION,
      jsZipVersion: JSZIP_VERSION,
      projection,
      rootDirectory,
      packageFile,
      files: textFiles,
      entries: Object.freeze(entries.map(entry => Object.freeze(entry))),
      pdfCount: projection.receiptRecords.length
    });
  }

  globalThis.FRECKA_EXPORT_PACKAGE = Object.freeze({
    PACKAGE_FORMAT,
    PACKAGE_FORMAT_VERSION,
    JSZIP_VERSION,
    ZIP_MIME_TYPE,
    ExportPackageError,
    periodToken,
    packageRoot,
    safeFilenamePart,
    createTaxAdvisorPackage
  });
})();
