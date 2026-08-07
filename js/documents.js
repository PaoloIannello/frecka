(() => {
  "use strict";

  const DOCUMENT_VERSION = "DOCUMENT-001";
  const RECEIPT_WIDTH = 226.77; // 80 mm
  const MAX_RECEIPT_HEIGHT = 841.89; // A4 height
  const VOUCHER_SIZE = Object.freeze([419.53, 595.28]); // A5 portrait
  const QUIET_ZONE_MODULES = 4;

  class DocumentError extends Error {
    constructor(code, userMessage, cause = null) {
      super(userMessage, cause ? { cause } : undefined);
      this.name = "DocumentError";
      this.code = code;
      this.userMessage = userMessage;
    }
  }

  const stringValue = (value, fallback = "") => typeof value === "string" ? value : fallback;
  const trimmed = value => stringValue(value).trim();
  const numberValue = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const centsFrom = (cents, decimal = 0) => Number.isInteger(cents) ? cents : Math.round(numberValue(decimal) * 100);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function requireObject(value, code, message) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new DocumentError(code, message);
    return value;
  }

  function requireQrService(service) {
    if (!service?.create) throw new DocumentError("DOCUMENT_QR_UNAVAILABLE", "Der QR-Code für dieses Dokument ist momentan nicht verfügbar.");
    return service;
  }

  function requirePdfLibrary(library) {
    if (!library?.PDFDocument || !library?.StandardFonts || !library?.rgb) {
      throw new DocumentError("DOCUMENT_PDF_UNAVAILABLE", "Die PDF-Erzeugung ist momentan nicht verfügbar.");
    }
    return library;
  }

  function identityFallback(source = {}) {
    const rawName = trimmed(source?.name);
    const rawOwner = trimmed(source?.owner);
    const owner = rawOwner || rawName;
    const duplicatesOwner = rawName && owner && rawName.localeCompare(owner, "de-DE", { sensitivity: "base" }) === 0;
    const name = duplicatesOwner || !rawOwner ? "" : rawName;
    return Object.freeze({ name, owner, displayName: name || owner });
  }

  function companyIdentity(source, resolver) {
    const result = typeof resolver === "function" ? resolver(source || {}) : identityFallback(source || {});
    return {
      name: trimmed(result?.name),
      owner: trimmed(result?.owner),
      displayName: trimmed(result?.displayName || result?.name || result?.owner)
    };
  }

  function sameDisplayText(left, right) {
    return trimmed(left).localeCompare(trimmed(right), "de-DE", { sensitivity: "base" }) === 0;
  }

  function addressCityLine(address = {}) {
    const postalCode = trimmed(address.zip || address.postalCode);
    const city = trimmed(address.city);
    return postalCode && city.startsWith(`${postalCode} `) ? city : [postalCode, city].filter(Boolean).join(" ");
  }

  function normalizeCompany(source, identityResolver) {
    const company = source && typeof source === "object" ? source : {};
    const identity = companyIdentity(company, identityResolver);
    return {
      ...identity,
      street: trimmed(company.street),
      cityLine: addressCityLine(company),
      country: trimmed(company.country),
      phone: trimmed(company.phone),
      email: trimmed(company.email),
      taxNumber: trimmed(company.taxNumber),
      vatId: trimmed(company.vatId)
    };
  }

  function normalizeLocation(source) {
    const location = source && typeof source === "object" ? source : {};
    const street = [trimmed(location.street), trimmed(location.houseNumber)].filter(Boolean).join(" ");
    return {
      id: trimmed(location.id),
      name: trimmed(location.name),
      street: street || trimmed(location.street),
      cityLine: addressCityLine(location),
      phone: trimmed(location.phone),
      voucherNote: trimmed(location.voucherNote)
    };
  }

  function normalizeBranding(source, issuer) {
    const branding = source && typeof source === "object" ? source : {};
    const visibleName = trimmed(branding.visibleName);
    const distinctVisibleName = visibleName
      && !sameDisplayText(visibleName, issuer.name)
      && !sameDisplayText(visibleName, issuer.owner)
      ? visibleName
      : "";
    const sourceLogo = branding.logo && typeof branding.logo === "object" ? branding.logo : null;
    const logoMode = ["company", "custom", "none"].includes(branding.logoMode) ? branding.logoMode : sourceLogo ? "company" : "none";
    const logo = logoMode === "none" ? null : sourceLogo;
    return {
      visibleName: distinctVisibleName,
      logoMode,
      logo: logo ? {
        id: trimmed(logo.id),
        label: trimmed(logo.label) || "Logo",
        source: trimmed(logo.source),
        simulated: logo.simulated !== false,
        initials: logo.source === "business-area" ? "GB" : "UN"
      } : null
    };
  }

  function normalizeCustomer(source) {
    if (!source || typeof source !== "object") return null;
    const name = trimmed(source.name)
      || [trimmed(source.firstName), trimmed(source.lastName)].filter(Boolean).join(" ")
      || trimmed(source.companyName);
    if (!name && !trimmed(source.email) && !trimmed(source.street)) return null;
    return {
      id: trimmed(source.id),
      name: name || "Kunde",
      companyName: trimmed(source.companyName),
      street: [trimmed(source.street), trimmed(source.houseNumber)].filter(Boolean).join(" "),
      cityLine: addressCityLine(source),
      email: trimmed(source.email),
      phone: trimmed(source.mobile || source.phone)
    };
  }

  function formatGermanDate(value) {
    const source = trimmed(value);
    const german = source.match(/^(\d{2})\.(\d{2})\.(\d{4})$/u);
    if (german) return source;
    const dateOnly = source.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
    if (dateOnly) return `${dateOnly[3]}.${dateOnly[2]}.${dateOnly[1]}`;
    const timestamp = Date.parse(source);
    return Number.isFinite(timestamp)
      ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(timestamp))
      : source;
  }

  function formatGermanTime(value) {
    const source = trimmed(value);
    const direct = source.match(/^(\d{1,2}):(\d{2})/u);
    if (direct) return `${direct[1].padStart(2, "0")}:${direct[2]}`;
    const timestamp = Date.parse(source);
    return Number.isFinite(timestamp)
      ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(timestamp))
      : "";
  }

  function formatGermanDateTime({ date = "", time = "", iso = "" } = {}) {
    return [formatGermanDate(date || iso), formatGermanTime(time || iso)].filter(Boolean).join(" • ");
  }

  function receiptKind(receipt) {
    if (receipt.receiptKind === "voucher-sale") return { code: "voucher-sale", label: "Gutscheinverkauf", title: "Verkaufsbeleg" };
    if (receipt.type === "credit" || receipt.receiptType === "credit") return { code: "credit", label: "Gutschrift", title: "Gutschrift" };
    if (receipt.type === "cancellation" || receipt.receiptType === "cancellation") return { code: "cancellation", label: "Stornobeleg", title: "Stornobeleg" };
    return { code: "receipt", label: "Beleg", title: "Digitaler Beleg" };
  }

  function receiptStatus(receipt) {
    if (receipt.status === "cancelled") return "Storniert";
    if (receipt.status === "credited") return "Gutgeschrieben";
    if (receipt.status === "partially-credited") return "Teilgutschrift";
    return receipt.paymentStatus === "open" ? "Offen" : "Bezahlt";
  }

  function voucherStatus(voucher) {
    return ({
      active: "Aktiv",
      partially_redeemed: "Teilweise eingelöst",
      redeemed: "Vollständig eingelöst",
      cancelled: "Storniert"
    })[voucher.status] || "Aktiv";
  }

  function qrModel(kind, reference, options) {
    try {
      const qr = requireQrService(options.qrService || globalThis.FRECKA_QR).create(kind, reference, {
        baseUrl: options.baseUrl,
        label: kind === "receipt" ? "QR-Code zum digitalen Beleg" : "Gutschein-QR-Code"
      });
      return {
        kind: qr.kind,
        reference: qr.reference,
        appLink: qr.appLink,
        size: qr.size,
        matrix: qr.matrix.map(row => [...row]),
        svg: qr.svg
      };
    } catch (error) {
      if (error instanceof DocumentError) throw error;
      throw new DocumentError("DOCUMENT_QR_INVALID", error?.userMessage || "Der QR-Code für dieses Dokument konnte nicht erzeugt werden.", error);
    }
  }

  function createReceiptDocumentModel(receiptInput, options = {}) {
    const receipt = requireObject(receiptInput, "DOCUMENT_RECEIPT_INVALID", "Der Beleg kann nicht als Dokument dargestellt werden.");
    const number = trimmed(receipt.number || receipt.receiptNumber);
    const id = trimmed(receipt.id) || (number ? `receipt_${safeFilenamePart(number).replaceAll("-", "_")}` : "");
    if (!id || !number) throw new DocumentError("DOCUMENT_RECEIPT_INVALID", "Dem Beleg fehlt eine stabile Referenz oder Belegnummer.");
    const issuerSource = receipt.companySnapshot || receipt.contextSnapshot?.company || receipt.presentationSnapshot?.issuer || options.company;
    const issuer = normalizeCompany(issuerSource, options.companyIdentity);
    if (!issuer.owner) throw new DocumentError("DOCUMENT_ISSUER_INVALID", "Für das Dokument fehlt die verpflichtende Unternehmerangabe.");
    const branding = normalizeBranding(receipt.brandingSnapshot || receipt.contextSnapshot?.branding || receipt.presentationSnapshot?.branding, issuer);
    const sourcePositions = Array.isArray(receipt.positions) ? receipt.positions : Array.isArray(receipt.items) ? receipt.items : [];
    if (!sourcePositions.length) throw new DocumentError("DOCUMENT_RECEIPT_EMPTY", "Der Beleg enthält keine darstellbaren Positionen.");
    const positions = sourcePositions.map((position, index) => ({
      index: index + 1,
      id: trimmed(position.id),
      title: trimmed(position.title || position.name) || `Position ${index + 1}`,
      type: trimmed(position.type) || "service",
      quantity: numberValue(position.quantity, 1),
      originalUnitCents: centsFrom(position.originalUnitPriceCents, position.originalUnitPrice ?? position.unitPrice),
      unitCents: centsFrom(position.unitPriceCents, position.unitPrice),
      discountCents: Math.abs(centsFrom(position.discountCents, position.discountTotal)),
      discountLabel: trimmed(position.discountLabel) || "Rabatt",
      totalCents: centsFrom(position.totalCents, position.total),
      netCents: centsFrom(position.netCents, position.netTotal),
      taxCents: centsFrom(position.taxCents, position.taxAmount),
      taxRate: numberValue(position.taxRate)
    }));
    const sourceTaxes = Array.isArray(receipt.taxBreakdown) ? receipt.taxBreakdown : Array.isArray(receipt.taxGroups) ? receipt.taxGroups : [];
    const kind = receiptKind(receipt);
    const voucherPayment = receipt.voucherPayment && typeof receipt.voucherPayment === "object" ? {
      reference: trimmed(receipt.voucherPayment.reference),
      code: trimmed(receipt.voucherPayment.code),
      amountCents: centsFrom(receipt.voucherPayment.amountCents, receipt.voucherPayment.amount),
      balanceAfterCents: centsFrom(receipt.voucherPayment.balanceAfterCents, receipt.voucherPayment.balanceAfter)
    } : null;
    const remainderPayment = receipt.remainderPayment && typeof receipt.remainderPayment === "object" ? {
      method: trimmed(receipt.remainderPayment.method),
      amountCents: centsFrom(receipt.remainderPayment.amountCents, receipt.remainderPayment.amount)
    } : null;
    const model = {
      documentVersion: DOCUMENT_VERSION,
      type: "receipt",
      id,
      reference: id,
      number,
      filename: `FRECKA-Beleg-${safeFilenamePart(number)}.pdf`,
      kind,
      status: receiptStatus(receipt),
      paymentStatus: receipt.paymentStatus === "open" ? "open" : "paid",
      paymentStatusLabel: receipt.paymentStatus === "open" ? "Offen" : "Bezahlt",
      paymentMethod: trimmed(receipt.paymentMethod || receipt.payment) || "Noch nicht erfasst",
      dateTime: formatGermanDateTime({ date: receipt.date, time: receipt.time, iso: receipt.completedAt || receipt.createdAt || receipt.sortKey }),
      issuer,
      branding,
      businessArea: clone(receipt.businessAreaSnapshot || receipt.contextSnapshot?.businessArea) || null,
      serviceLocation: null,
      customer: normalizeCustomer(receipt.customerSnapshot || receipt.customer),
      positions,
      totals: {
        subtotalCents: centsFrom(receipt.subtotalCents, receipt.originalTotal),
        discountCents: Math.abs(centsFrom(receipt.discountCents, receipt.discountTotal)),
        netCents: centsFrom(receipt.netTotalCents, receipt.netTotal),
        taxCents: centsFrom(receipt.taxTotalCents, receipt.taxTotal),
        grossCents: centsFrom(receipt.totalCents, receipt.total)
      },
      taxes: sourceTaxes.map(group => ({
        rate: numberValue(group?.rate),
        netCents: centsFrom(group?.netCents, group?.net),
        taxCents: centsFrom(group?.taxCents, group?.tax),
        grossCents: centsFrom(group?.grossCents, group?.gross)
      })),
      voucherPayment,
      remainderPayment,
      linkedVoucher: receipt.voucherReference ? {
        reference: trimmed(receipt.voucherReference),
        code: trimmed(options.linkedVoucher?.code)
      } : null,
      correctionReference: trimmed(receipt.reference || receipt.references?.originalReceiptNumber),
      texts: {
        thankYou: trimmed(receipt.receiptTextSnapshot?.thankYouText) || "Vielen Dank für Ihren Besuch.",
        footer: trimmed(receipt.receiptTextSnapshot?.footerText)
      },
      qr: qrModel("receipt", id, options)
    };
    return deepFreeze(model);
  }

  function createVoucherDocumentModel(voucherInput, options = {}) {
    const voucher = requireObject(voucherInput, "DOCUMENT_VOUCHER_INVALID", "Der Gutschein kann nicht als Dokument dargestellt werden.");
    const reference = trimmed(voucher.qrReference || voucher.reference || voucher.id);
    const code = trimmed(voucher.code);
    if (!reference || !code) throw new DocumentError("DOCUMENT_VOUCHER_INVALID", "Dem Gutschein fehlt eine stabile Referenz oder ein Gutscheincode.");
    const issuerSource = voucher.companySnapshot || voucher.presentationSnapshot?.issuer || voucher.contextSnapshot?.company || options.company;
    const issuer = normalizeCompany(issuerSource, options.companyIdentity);
    if (!issuer.owner) throw new DocumentError("DOCUMENT_ISSUER_INVALID", "Für das Dokument fehlt die verpflichtende Unternehmerangabe.");
    const locationSource = voucher.serviceLocationSnapshot || voucher.presentationSnapshot?.redemptionLocation || voucher.contextSnapshot?.serviceLocation;
    const redemptionLocation = normalizeLocation(locationSource);
    const branding = normalizeBranding(voucher.brandingSnapshot || voucher.presentationSnapshot?.branding || voucher.contextSnapshot?.branding, issuer);
    const issuedValueCents = centsFrom(voucher.issuedValueCents, voucher.issuedValue);
    const currentValueCents = centsFrom(voucher.currentValueCents, voucher.currentValue);
    if (issuedValueCents <= 0 || currentValueCents < 0 || currentValueCents > issuedValueCents) {
      throw new DocumentError("DOCUMENT_VOUCHER_VALUE_INVALID", "Die Gutscheinwerte sind für ein PDF nicht gültig.");
    }
    if (!redemptionLocation.name) {
      throw new DocumentError("DOCUMENT_LOCATION_INVALID", "Für den Gutschein fehlt der gespeicherte Einlöseort.");
    }
    const model = {
      documentVersion: DOCUMENT_VERSION,
      type: "voucher",
      id: trimmed(voucher.id),
      reference,
      code,
      filename: `FRECKA-Gutschein-${safeFilenamePart(code)}.pdf`,
      title: "Gutschein",
      status: trimmed(voucher.status) || "active",
      statusLabel: voucherStatus(voucher),
      issuedValueCents,
      currentValueCents,
      soldAt: formatGermanDateTime({ date: voucher.soldAt, time: voucher.soldTime, iso: voucher.soldAtIso || voucher.createdAt }),
      issuer,
      branding,
      businessArea: clone(voucher.businessAreaSnapshot || voucher.contextSnapshot?.businessArea) || null,
      redemptionLocation,
      customer: normalizeCustomer(voucher.customerSnapshot || voucher.customer),
      displayName: trimmed(voucher.displayName),
      saleReceipt: voucher.saleReceipt && typeof voucher.saleReceipt === "object" ? {
        id: trimmed(voucher.saleReceipt.id),
        number: trimmed(voucher.saleReceipt.number)
      } : null,
      qr: qrModel("voucher", reference, options)
    };
    return deepFreeze(model);
  }

  function safeFilenamePart(value) {
    return trimmed(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/[^A-Za-z0-9_-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 80) || "Dokument";
  }

  function formatMoney(cents) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(numberValue(cents) / 100);
  }

  function wrapText(font, rawText, size, maxWidth) {
    const text = safePdfText(font, rawText);
    if (!text) return [];
    const words = text.split(/\s+/u);
    const lines = [];
    let current = "";
    words.forEach(word => {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        return;
      }
      lines.push(current);
      current = word;
      while (font.widthOfTextAtSize(current, size) > maxWidth && current.length > 1) {
        let splitAt = current.length - 1;
        while (splitAt > 1 && font.widthOfTextAtSize(`${current.slice(0, splitAt)}-`, size) > maxWidth) splitAt -= 1;
        lines.push(`${current.slice(0, splitAt)}-`);
        current = current.slice(splitAt);
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function safePdfText(font, value) {
    return Array.from(stringValue(value)).map(character => {
      try {
        font.encodeText(character);
        return character;
      } catch (error) {
        return "?";
      }
    }).join("");
  }

  function drawText(page, font, text, options) {
    page.drawText(safePdfText(font, text), { font, ...options });
  }

  function drawCentered(page, font, text, size, y, color, pageWidth) {
    const safe = safePdfText(font, text);
    drawText(page, font, safe, { x: Math.max(12, (pageWidth - font.widthOfTextAtSize(safe, size)) / 2), y, size, color });
  }

  function drawRight(page, font, text, size, right, y, color) {
    const safe = safePdfText(font, text);
    drawText(page, font, safe, { x: right - font.widthOfTextAtSize(safe, size), y, size, color });
  }

  function drawRule(page, left, right, y, color, thickness = 0.5) {
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness, color });
  }

  function drawLogoPlaceholder(page, model, fonts, colors, centerX, y) {
    if (!model.branding.logo || model.branding.logoMode === "none") return y;
    page.drawRectangle({ x: centerX - 20, y: y - 40, width: 40, height: 40, borderColor: colors.ink, borderWidth: 1, color: colors.paper });
    drawCentered(page, fonts.bold, model.branding.logo.initials, 10, y - 22, colors.ink, centerX * 2);
    return y - 48;
  }

  function drawQrMatrix(page, qr, x, y, size, colors) {
    if (!qr?.matrix?.length) throw new DocumentError("DOCUMENT_QR_INVALID", "Der QR-Code für dieses Dokument ist ungültig.");
    page.drawRectangle({ x, y, width: size, height: size, color: colors.paper });
    const dimension = qr.matrix.length + QUIET_ZONE_MODULES * 2;
    const moduleSize = size / dimension;
    qr.matrix.forEach((row, rowIndex) => row.forEach((dark, columnIndex) => {
      if (!dark) return;
      page.drawRectangle({
        x: x + (columnIndex + QUIET_ZONE_MODULES) * moduleSize,
        y: y + (dimension - QUIET_ZONE_MODULES - rowIndex - 1) * moduleSize,
        width: moduleSize + 0.02,
        height: moduleSize + 0.02,
        color: colors.ink
      });
    }));
  }

  function estimateReceiptHeight(model, fonts) {
    const contentWidth = RECEIPT_WIDTH - 32;
    let height = 32 + (model.branding.logo && model.branding.logoMode !== "none" ? 50 : 0) + 88;
    height += model.positions.reduce((sum, item) => sum + 30 + Math.max(0, wrapText(fonts.bold, item.title, 8.5, contentWidth - 62).length - 1) * 10, 0);
    if (model.customer) height += 45;
    height += 65;
    if (model.taxes.length && model.kind.code !== "voucher-sale") height += 28 + model.taxes.length * 13;
    if (model.voucherPayment) height += 24;
    if (model.remainderPayment) height += 18;
    if (model.correctionReference) height += 18;
    height += 76 + wrapText(fonts.regular, model.texts.thankYou, 8, contentWidth).length * 10;
    if (model.texts.footer) height += wrapText(fonts.regular, model.texts.footer, 7, contentWidth).length * 9;
    height += 270;
    return Math.max(500, Math.min(MAX_RECEIPT_HEIGHT, height));
  }

  async function pdfContext(library) {
    const pdfLib = requirePdfLibrary(library || globalThis.PDFLib);
    const pdf = await pdfLib.PDFDocument.create();
    const [regular, bold, oblique] = await Promise.all([
      pdf.embedFont(pdfLib.StandardFonts.Helvetica),
      pdf.embedFont(pdfLib.StandardFonts.HelveticaBold),
      pdf.embedFont(pdfLib.StandardFonts.HelveticaOblique)
    ]);
    return {
      pdfLib,
      pdf,
      fonts: { regular, bold, oblique },
      colors: {
        ink: pdfLib.rgb(0.08, 0.1, 0.12),
        muted: pdfLib.rgb(0.34, 0.37, 0.4),
        line: pdfLib.rgb(0.8, 0.82, 0.84),
        paper: pdfLib.rgb(1, 1, 1),
        soft: pdfLib.rgb(0.95, 0.96, 0.96)
      }
    };
  }

  function setMetadata(pdf, model) {
    pdf.setTitle(model.type === "receipt" ? `FRECKA Beleg ${model.number}` : `FRECKA Gutschein ${model.code}`);
    pdf.setSubject(model.type === "receipt" ? model.kind.label : "Gutschein");
    pdf.setAuthor(model.issuer.displayName || "FRECKA");
    pdf.setCreator("FRECKA");
    pdf.setProducer(`FRECKA ${DOCUMENT_VERSION}`);
    pdf.setKeywords(["FRECKA", model.type === "receipt" ? "Beleg" : "Gutschein"]);
  }

  async function renderReceiptPdf(model, library) {
    const context = await pdfContext(library);
    const { pdf, fonts, colors } = context;
    setMetadata(pdf, model);
    const margin = 16;
    const right = RECEIPT_WIDTH - margin;
    const contentWidth = right - margin;
    const initialHeight = estimateReceiptHeight(model, fonts);
    let page = pdf.addPage([RECEIPT_WIDTH, initialHeight]);
    let pageHeight = initialHeight;
    let y = pageHeight - 24;

    const newPage = () => {
      page = pdf.addPage([RECEIPT_WIDTH, MAX_RECEIPT_HEIGHT]);
      pageHeight = MAX_RECEIPT_HEIGHT;
      y = pageHeight - 28;
      drawCentered(page, fonts.regular, `${model.kind.title} ${model.number} · Fortsetzung`, 7, y, colors.muted, RECEIPT_WIDTH);
      y -= 20;
    };
    const ensure = height => { if (y - height < 20) newPage(); };
    const line = (label, value, { bold = false, size = 8, gap = 13 } = {}) => {
      ensure(gap + 3);
      drawText(page, fonts.regular, label, { x: margin, y, size, color: colors.muted });
      drawRight(page, bold ? fonts.bold : fonts.regular, value, size, right, y, colors.ink);
      y -= gap;
    };
    const paragraph = (text, { font = fonts.regular, size = 8, color = colors.ink, center = false, gap = 10 } = {}) => {
      const lines = wrapText(font, text, size, contentWidth);
      ensure(lines.length * gap + 2);
      lines.forEach(textLine => {
        if (center) drawCentered(page, font, textLine, size, y, color, RECEIPT_WIDTH);
        else drawText(page, font, textLine, { x: margin, y, size, color });
        y -= gap;
      });
    };

    y = drawLogoPlaceholder(page, model, fonts, colors, RECEIPT_WIDTH / 2, y);
    if (model.branding.visibleName) {
      drawCentered(page, fonts.oblique, model.branding.visibleName, 9, y, colors.ink, RECEIPT_WIDTH);
      y -= 14;
    }
    drawCentered(page, fonts.bold, model.issuer.name || model.issuer.owner, 11, y, colors.ink, RECEIPT_WIDTH);
    y -= 14;
    if (model.issuer.name && model.issuer.owner) {
      drawCentered(page, fonts.regular, model.issuer.owner, 8.5, y, colors.ink, RECEIPT_WIDTH);
      y -= 12;
    }
    [model.issuer.street, model.issuer.cityLine].filter(Boolean).forEach(value => {
      drawCentered(page, fonts.regular, value, 7.5, y, colors.muted, RECEIPT_WIDTH);
      y -= 10;
    });
    if (model.issuer.taxNumber) {
      drawCentered(page, fonts.regular, `Steuernummer: ${model.issuer.taxNumber}`, 7, y, colors.muted, RECEIPT_WIDTH);
      y -= 10;
    }
    if (model.issuer.vatId) {
      drawCentered(page, fonts.regular, `USt-IdNr.: ${model.issuer.vatId}`, 7, y, colors.muted, RECEIPT_WIDTH);
      y -= 10;
    }
    y -= 4;
    drawRule(page, margin, right, y, colors.line);
    y -= 17;
    drawText(page, fonts.bold, `${model.kind.label} ${model.number}`, { x: margin, y, size: 8.5, color: colors.ink });
    drawRight(page, fonts.regular, model.dateTime, 7.5, right, y, colors.muted);
    y -= 18;

    model.positions.forEach(item => {
      const titleLines = wrapText(fonts.bold, item.title, 8.5, contentWidth - 64);
      ensure(Math.max(30, titleLines.length * 10 + 18));
      titleLines.forEach((titleLine, index) => {
        drawText(page, fonts.bold, titleLine, { x: margin, y: y - index * 10, size: 8.5, color: colors.ink });
      });
      drawRight(page, fonts.bold, formatMoney(item.totalCents), 8.5, right, y, colors.ink);
      y -= titleLines.length * 10 + 2;
      drawText(page, fonts.regular, `${item.quantity} × ${formatMoney(item.originalUnitCents)}`, { x: margin, y, size: 7.5, color: colors.muted });
      y -= 11;
      if (item.discountCents > 0) {
        drawText(page, fonts.oblique, `${item.discountLabel}: -${formatMoney(item.discountCents)}`, { x: margin, y, size: 7, color: colors.muted });
        y -= 10;
      }
      y -= 3;
    });

    drawRule(page, margin, right, y, colors.line);
    y -= 16;
    if (model.customer) {
      paragraph("Kunde", { font: fonts.regular, size: 7, color: colors.muted, gap: 9 });
      paragraph(model.customer.name, { font: fonts.bold, size: 8, gap: 10 });
      [model.customer.street, model.customer.cityLine].filter(Boolean).forEach(value => paragraph(value, { size: 7.5, color: colors.muted, gap: 9 }));
      y -= 5;
    }
    line("Zahlungsstatus", model.paymentStatusLabel, { bold: true });
    if (model.paymentStatus !== "open") line("Zahlungsart", model.paymentMethod, { bold: true });
    if (model.voucherPayment) {
      line(`Gutschein ${model.voucherPayment.code || ""}`.trim(), formatMoney(model.voucherPayment.amountCents), { bold: true });
    }
    if (model.remainderPayment) line(`Restzahlung · ${model.remainderPayment.method}`, formatMoney(model.remainderPayment.amountCents), { bold: true });
    if (model.linkedVoucher?.code) line("Verknüpfter Gutschein", model.linkedVoucher.code, { size: 7.5 });
    if (model.correctionReference) line("Bezug", model.correctionReference, { size: 7.5 });

    if (model.kind.code !== "voucher-sale" && model.taxes.length) {
      y -= 2;
      drawRule(page, margin, right, y, colors.line);
      y -= 15;
      if (model.totals.discountCents > 0) {
        line("Zwischensumme", formatMoney(model.totals.subtotalCents));
        line("Rabatt gesamt", `-${formatMoney(model.totals.discountCents)}`);
      }
      line("Netto", formatMoney(model.totals.netCents));
      model.taxes.forEach(group => line(`MwSt. ${new Intl.NumberFormat("de-DE").format(group.rate)} %`, formatMoney(group.taxCents)));
    }
    y -= 2;
    ensure(35);
    page.drawRectangle({ x: margin, y: y - 22, width: contentWidth, height: 29, color: colors.soft });
    drawText(page, fonts.bold, model.kind.code === "voucher-sale" ? "Gesamtbetrag" : "Gesamt brutto", { x: margin + 7, y: y - 11, size: 9.5, color: colors.ink });
    drawRight(page, fonts.bold, formatMoney(model.totals.grossCents), 11, right - 7, y - 12, colors.ink);
    y -= 36;
    paragraph(model.texts.thankYou, { center: true, size: 8, gap: 10 });
    if (model.texts.footer) paragraph(model.texts.footer, { center: true, size: 7, color: colors.muted, gap: 9 });
    y -= 8;

    const qrSize = Math.min(178, contentWidth);
    ensure(qrSize + 28);
    drawQrMatrix(page, model.qr, (RECEIPT_WIDTH - qrSize) / 2, y - qrSize, qrSize, colors);
    y -= qrSize + 14;
    drawCentered(page, fonts.bold, "Digitaler Beleg", 8, y, colors.ink, RECEIPT_WIDTH);
    return pdf.save();
  }

  async function renderVoucherPdf(model, library) {
    const context = await pdfContext(library);
    const { pdf, fonts, colors } = context;
    setMetadata(pdf, model);
    const [pageWidth, pageHeight] = VOUCHER_SIZE;
    const page = pdf.addPage([pageWidth, pageHeight]);
    const margin = 34;
    const right = pageWidth - margin;
    let y = pageHeight - 42;
    y = drawLogoPlaceholder(page, model, fonts, colors, pageWidth / 2, y);
    if (model.branding.logo && model.branding.logoMode !== "none") y -= 12;
    drawCentered(page, fonts.bold, "GUTSCHEIN", 20, y, colors.ink, pageWidth);
    y -= 28;
    if (model.branding.visibleName) {
      drawCentered(page, fonts.oblique, model.branding.visibleName, 11, y, colors.ink, pageWidth);
      y -= 17;
    }
    drawCentered(page, fonts.bold, model.issuer.name || model.issuer.owner, 12, y, colors.ink, pageWidth);
    y -= 16;
    if (model.issuer.name && model.issuer.owner) {
      drawCentered(page, fonts.regular, model.issuer.owner, 9, y, colors.ink, pageWidth);
      y -= 13;
    }
    [model.issuer.street, model.issuer.cityLine].filter(Boolean).forEach(value => {
      drawCentered(page, fonts.regular, value, 8, y, colors.muted, pageWidth);
      y -= 11;
    });
    y -= 8;
    drawRule(page, margin, right, y, colors.line);
    y -= 25;
    drawCentered(page, fonts.regular, "Gutscheinwert", 9, y, colors.muted, pageWidth);
    y -= 26;
    drawCentered(page, fonts.bold, formatMoney(model.issuedValueCents), 28, y, colors.ink, pageWidth);
    y -= 29;
    if (model.currentValueCents !== model.issuedValueCents || model.status !== "active") {
      drawCentered(page, fonts.bold, `Restwert: ${formatMoney(model.currentValueCents)} · ${model.statusLabel}`, 9, y, colors.ink, pageWidth);
      y -= 18;
    }
    if (model.displayName) {
      const recipient = /^für\b/iu.test(model.displayName) ? model.displayName : `Für ${model.displayName}`;
      drawCentered(page, fonts.regular, recipient, 10, y, colors.ink, pageWidth);
      y -= 18;
    }
    const qrSize = 125;
    drawQrMatrix(page, model.qr, (pageWidth - qrSize) / 2, y - qrSize, qrSize, colors);
    y -= qrSize + 15;
    drawCentered(page, fonts.regular, "Gutscheincode", 8, y, colors.muted, pageWidth);
    y -= 15;
    drawCentered(page, fonts.bold, model.code, 14, y, colors.ink, pageWidth);
    y -= 20;
    drawRule(page, margin, right, y, colors.line);
    y -= 14;
    drawText(page, fonts.regular, "Einlösbar bei", { x: margin, y, size: 8, color: colors.muted });
    y -= 15;
    drawText(page, fonts.bold, model.redemptionLocation.name, { x: margin, y, size: 10, color: colors.ink });
    y -= 14;
    [model.redemptionLocation.street, model.redemptionLocation.cityLine, model.redemptionLocation.voucherNote].filter(Boolean).forEach(value => {
      drawText(page, fonts.regular, value, { x: margin, y, size: 8, color: colors.ink });
      y -= 11;
    });
    drawRight(page, fonts.regular, `Ausgestellt: ${model.soldAt}`, 7.5, right, Math.max(12, y - 2), colors.muted);
    return pdf.save();
  }

  async function createPdfBytes(modelInput, options = {}) {
    const model = requireObject(modelInput, "DOCUMENT_MODEL_INVALID", "Das Dokumentmodell ist ungültig.");
    try {
      if (model.documentVersion !== DOCUMENT_VERSION) throw new DocumentError("DOCUMENT_MODEL_VERSION_INVALID", "Das Dokumentmodell besitzt eine nicht unterstützte Version.");
      if (model.type === "receipt") return await renderReceiptPdf(model, options.pdfLibrary);
      if (model.type === "voucher") return await renderVoucherPdf(model, options.pdfLibrary);
      throw new DocumentError("DOCUMENT_TYPE_INVALID", "Dieser Dokumenttyp wird nicht unterstützt.");
    } catch (error) {
      if (error instanceof DocumentError) throw error;
      throw new DocumentError("DOCUMENT_PDF_FAILED", "Das PDF konnte nicht erstellt werden.", error);
    }
  }

  async function createPdfBlob(model, options = {}) {
    const bytes = await createPdfBytes(model, options);
    return new Blob([bytes], { type: "application/pdf" });
  }

  globalThis.FRECKA_DOCUMENTS = Object.freeze({
    DOCUMENT_VERSION,
    DocumentError,
    createReceiptDocumentModel,
    createVoucherDocumentModel,
    createPdfBytes,
    createPdfBlob,
    formatGermanDateTime,
    formatMoney,
    safeFilenamePart
  });
})();
