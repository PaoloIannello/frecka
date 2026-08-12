(() => {
  "use strict";

  const PUBLIC_DOCUMENT_VERSION = "QR-002";
  const FORMAT_MARKER = "FPD";
  const FORMAT_VERSION = 1;
  const DOCUMENT_VERSION = "DOCUMENT-001";
  const ROUTE_PREFIX = "#/p/";
  const MAX_RAW_BYTES = 16 * 1024;
  const MAX_TRANSPORT_BYTES = 900;
  const MAX_URL_LENGTH = 1280;
  const MAX_POSITIONS = 25;
  const MAX_QR_VERSION = 30;

  class PublicDocumentError extends Error {
    constructor(code, userMessage, cause = null) {
      super(userMessage, cause ? { cause } : undefined);
      this.name = "PublicDocumentError";
      this.code = code;
      this.userMessage = userMessage;
    }
  }

  const trimmed = value => typeof value === "string" ? value.trim() : "";
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const receiptKindCodes = Object.freeze({ receipt: 0, "voucher-sale": 1, credit: 2, cancellation: 3 });
  const receiptKinds = Object.freeze([
    { code: "receipt", label: "Beleg", title: "Digitaler Beleg" },
    { code: "voucher-sale", label: "Gutscheinverkauf", title: "Verkaufsbeleg" },
    { code: "credit", label: "Gutschrift", title: "Gutschrift" },
    { code: "cancellation", label: "Stornobeleg", title: "Stornobeleg" }
  ]);
  const paymentMethods = Object.freeze(["Bar", "Karte", "Gutschein", "Später", "Gutschein + Bar", "Gutschein + Karte", "Noch nicht erfasst"]);
  const voucherStatuses = Object.freeze([
    ["active", "Aktiv"],
    ["partially_redeemed", "Teilweise eingelöst"],
    ["redeemed", "Vollständig eingelöst"],
    ["cancelled", "Storniert"]
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function publicError(code, message, cause = null) {
    return new PublicDocumentError(code, message, cause);
  }

  function stringField(value, label, maximumLength, { optional = false } = {}) {
    const result = trimmed(value);
    if ((!result && !optional) || result.length > maximumLength || /[\u0000-\u001F\u007F]/u.test(result)) {
      throw publicError("PUBLIC_DOCUMENT_INVALID", `Das Feld „${label}“ ist im digitalen Dokument ungültig.`);
    }
    return result;
  }

  function integerField(value, label, { minimum = -100000000, maximum = 100000000 } = {}) {
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < minimum || result > maximum) {
      throw publicError("PUBLIC_DOCUMENT_INVALID", `Der Wert „${label}“ ist im digitalen Dokument ungültig.`);
    }
    return result;
  }

  function numberField(value, label, { minimum = 0, maximum = 100000 } = {}) {
    const result = Number(value);
    if (!Number.isFinite(result) || result < minimum || result > maximum) {
      throw publicError("PUBLIC_DOCUMENT_INVALID", `Der Wert „${label}“ ist im digitalen Dokument ungültig.`);
    }
    return result;
  }

  function arrayField(value, label, exactLength = null) {
    if (!Array.isArray(value) || (exactLength !== null && value.length !== exactLength)) {
      throw publicError("PUBLIC_DOCUMENT_INVALID", `Der Abschnitt „${label}“ ist im digitalen Dokument ungültig.`);
    }
    return value;
  }

  function safeFilenamePart(value) {
    return trimmed(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/[^A-Za-z0-9_-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 80) || "Dokument";
  }

  function maskedVoucherCode(value) {
    const code = trimmed(value);
    if (!code) return "";
    const parts = code.split("-").filter(Boolean);
    if (parts.length >= 3) return `${parts[0]}-XXXX-${parts.at(-1)}`;
    if (code.length <= 4) return code;
    return `${"•".repeat(Math.min(8, code.length - 4))}${code.slice(-4)}`;
  }

  function compactDateTime(value) {
    const match = /^(\d{2})\.(\d{2})\.(\d{4}) • (\d{2}):(\d{2})$/u.exec(trimmed(value));
    if (!match) return trimmed(value);
    return `${match[3]}${match[2]}${match[1]}${match[4]}${match[5]}`;
  }

  function expandDateTime(value, label) {
    const compact = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/u.exec(trimmed(value));
    return validateDateTime(compact ? `${compact[3]}.${compact[2]}.${compact[1]} • ${compact[4]}:${compact[5]}` : value, label);
  }

  function paymentMethodProjection(value) {
    const method = trimmed(value);
    const code = paymentMethods.indexOf(method);
    return code >= 0 ? code : [paymentMethods.length, method];
  }

  function hydratePaymentMethod(value) {
    if (Number.isInteger(value) && value >= 0 && value < paymentMethods.length) return paymentMethods[value];
    const custom = arrayField(value, "Zahlungsart", 2);
    if (custom[0] !== paymentMethods.length) throw publicError("PUBLIC_DOCUMENT_INVALID", "Die Zahlungsart im digitalen Dokument ist ungültig.");
    return stringField(custom[1], "Zahlungsart", 100);
  }

  function issuerProjection(issuer = {}) {
    return [
      trimmed(issuer.name),
      trimmed(issuer.owner),
      trimmed(issuer.street),
      trimmed(issuer.cityLine),
      "",
      ""
    ];
  }

  function brandingProjection(branding = {}) {
    const logoCode = !branding.logo || branding.logoMode === "none"
      ? 0
      : branding.logoMode === "custom" || branding.logo.source === "business-area" || branding.logo.initials === "GB"
        ? 2
        : 1;
    return [trimmed(branding.visibleName), logoCode];
  }

  function customerProjection(customer) {
    return customer ? [trimmed(customer.name), trimmed(customer.street), trimmed(customer.cityLine)] : null;
  }

  function receiptProjection(model) {
    if (!Array.isArray(model.positions) || !model.positions.length || model.positions.length > MAX_POSITIONS) {
      throw publicError("PUBLIC_DOCUMENT_TOO_LARGE", `Der Beleg besitzt mehr als ${MAX_POSITIONS} darstellbare Positionen.`);
    }
    return [
      trimmed(model.number),
      receiptKindCodes[trimmed(model.kind?.code)],
      model.paymentStatus === "open" ? 1 : 0,
      paymentMethodProjection(model.paymentMethod),
      compactDateTime(model.dateTime),
      issuerProjection(model.issuer),
      brandingProjection(model.branding),
      customerProjection(model.customer),
      model.positions.map(position => Number(position.discountCents) > 0
        ? [trimmed(position.title), Number(position.quantity), Number(position.originalUnitCents), Number(position.totalCents), Number(position.discountCents), trimmed(position.discountLabel)]
        : [trimmed(position.title), Number(position.quantity), Number(position.originalUnitCents), Number(position.totalCents)]),
      [
        Number(model.totals?.subtotalCents),
        Number(model.totals?.discountCents),
        Number(model.totals?.netCents),
        Number(model.totals?.taxCents),
        Number(model.totals?.grossCents)
      ],
      (model.taxes || []).map(group => [Number(group.rate), Number(group.taxCents)]),
      model.voucherPayment ? [maskedVoucherCode(model.voucherPayment.code), Number(model.voucherPayment.amountCents)] : null,
      model.remainderPayment ? [trimmed(model.remainderPayment.method), Number(model.remainderPayment.amountCents)] : null,
      model.linkedVoucher?.code ? maskedVoucherCode(model.linkedVoucher.code) : "",
      trimmed(model.correctionReference),
      [trimmed(model.texts?.thankYou), trimmed(model.texts?.footer)]
    ];
  }

  function voucherProjection(model) {
    const statusCode = voucherStatuses.findIndex(([status]) => status === trimmed(model.status));
    return [
      trimmed(model.code),
      statusCode,
      Number(model.issuedValueCents),
      Number(model.currentValueCents),
      compactDateTime(model.soldAt),
      issuerProjection(model.issuer),
      brandingProjection(model.branding),
      trimmed(model.displayName),
      [
        trimmed(model.redemptionLocation?.name),
        trimmed(model.redemptionLocation?.street),
        trimmed(model.redemptionLocation?.cityLine),
        trimmed(model.redemptionLocation?.voucherNote)
      ]
    ];
  }

  function projectDocument(modelInput) {
    const model = modelInput && typeof modelInput === "object" ? modelInput : null;
    if (!model || model.documentVersion !== DOCUMENT_VERSION || !new Set(["receipt", "voucher"]).has(model.type)) {
      throw publicError("PUBLIC_DOCUMENT_INVALID", "Dieses Dokument kann nicht als öffentlicher FRECKA-Link ausgegeben werden.");
    }
    const envelope = [
      FORMAT_MARKER,
      FORMAT_VERSION,
      model.type === "receipt" ? "r" : "v",
      model.type === "receipt" ? receiptProjection(model) : voucherProjection(model)
    ];
    validateEnvelope(envelope);
    return deepFreeze(envelope);
  }

  function hydrateIssuer(value) {
    const fields = arrayField(value, "Aussteller", 6);
    const owner = stringField(fields[1], "Unternehmer/in", 160);
    const name = stringField(fields[0], "Geschäftsbezeichnung", 160, { optional: true });
    return {
      name,
      owner,
      displayName: name || owner,
      street: stringField(fields[2], "Unternehmensanschrift", 180, { optional: true }),
      cityLine: stringField(fields[3], "Unternehmensort", 140, { optional: true }),
      country: "",
      phone: "",
      email: "",
      taxNumber: stringField(fields[4], "Steuernummer", 80, { optional: true }),
      vatId: stringField(fields[5], "USt-IdNr.", 80, { optional: true })
    };
  }

  function hydrateBranding(value) {
    const fields = arrayField(value, "Branding", 2);
    const logoCode = integerField(fields[1], "Logo-Modus", { minimum: 0, maximum: 2 });
    const logoMode = logoCode === 0 ? "none" : logoCode === 2 ? "custom" : "company";
    return {
      visibleName: stringField(fields[0], "sichtbare Geschäftsbezeichnung", 160, { optional: true }),
      logoMode,
      logo: logoCode ? {
        id: "",
        label: logoCode === 2 ? "Geschäftsbereichslogo" : "Unternehmenslogo",
        source: "public-document",
        simulated: true,
        initials: logoCode === 2 ? "GB" : "UN"
      } : null
    };
  }

  function hydrateCustomer(value) {
    if (value === null) return null;
    const fields = arrayField(value, "Kunde", 3);
    return {
      id: "",
      name: stringField(fields[0], "Kundenname", 180),
      companyName: "",
      street: stringField(fields[1], "Kundenanschrift", 180, { optional: true }),
      cityLine: stringField(fields[2], "Kundenort", 140, { optional: true }),
      email: "",
      phone: ""
    };
  }

  function validateDateTime(value, label) {
    const result = stringField(value, label, 40);
    if (!/^\d{2}\.\d{2}\.\d{4} • \d{2}:\d{2}$/u.test(result)) {
      throw publicError("PUBLIC_DOCUMENT_INVALID", `Das Feld „${label}“ besitzt kein unterstütztes deutsches Datumsformat.`);
    }
    return result;
  }

  function publicReference(digest, type) {
    return `public_${type}_${digest.slice(0, 16)}`;
  }

  function hydrateReceipt(value, digest) {
    const fields = arrayField(value, "Beleg", 16);
    const number = stringField(fields[0], "Belegnummer", 80);
    const kindIndex = integerField(fields[1], "Belegart", { minimum: 0, maximum: receiptKinds.length - 1 });
    const kind = receiptKinds[kindIndex];
    const positionsInput = arrayField(fields[8], "Positionen");
    if (!positionsInput.length || positionsInput.length > MAX_POSITIONS) {
      throw publicError("PUBLIC_DOCUMENT_INVALID", "Die Anzahl der Positionen im digitalen Dokument ist ungültig.");
    }
    const positions = positionsInput.map((position, arrayIndex) => {
      const item = arrayField(position, `Position ${arrayIndex + 1}`);
      if (![4, 6].includes(item.length)) throw publicError("PUBLIC_DOCUMENT_INVALID", `Die Position ${arrayIndex + 1} ist im digitalen Dokument ungültig.`);
      const originalUnitCents = integerField(item[2], "ursprünglicher Einzelpreis");
      const totalCents = integerField(item[3], "Positionsbrutto");
      return {
        index: arrayIndex + 1,
        id: "",
        title: stringField(item[0], "Positionsbezeichnung", 180),
        type: "service",
        quantity: numberField(item[1], "Menge", { minimum: 0.001 }),
        originalUnitCents,
        unitCents: originalUnitCents,
        discountCents: item.length === 6 ? integerField(item[4], "Rabatt", { minimum: 1 }) : 0,
        discountLabel: item.length === 6 ? stringField(item[5], "Rabattbezeichnung", 100) : "Rabatt",
        totalCents,
        netCents: totalCents,
        taxCents: 0,
        taxRate: 0
      };
    });
    const totalFields = arrayField(fields[9], "Summen", 5);
    const taxInput = arrayField(fields[10], "Steuergruppen");
    if (taxInput.length > 12) throw publicError("PUBLIC_DOCUMENT_INVALID", "Das digitale Dokument enthält zu viele Steuergruppen.");
    const taxes = taxInput.map((group, index) => {
      const tax = arrayField(group, `Steuergruppe ${index + 1}`, 2);
      return {
        rate: numberField(tax[0], "Steuersatz", { maximum: 100 }),
        netCents: 0,
        taxCents: integerField(tax[1], "Steuerbetrag"),
        grossCents: 0
      };
    });
    const voucherFields = fields[11] === null ? null : arrayField(fields[11], "Gutscheinzahlung", 2);
    const remainderFields = fields[12] === null ? null : arrayField(fields[12], "Restzahlung", 2);
    const reference = publicReference(digest, "receipt");
    return {
      documentVersion: DOCUMENT_VERSION,
      type: "receipt",
      id: reference,
      reference,
      number,
      filename: `FRECKA-Beleg-${safeFilenamePart(number)}.pdf`,
      kind: {
        ...kind
      },
      status: fields[2] === 1 ? "Offen" : "Bezahlt",
      paymentStatus: fields[2] === 1 ? "open" : fields[2] === 0 ? "paid" : (() => { throw publicError("PUBLIC_DOCUMENT_INVALID", "Der Zahlungsstatus im digitalen Dokument ist ungültig."); })(),
      paymentStatusLabel: fields[2] === 1 ? "Offen" : "Bezahlt",
      paymentMethod: hydratePaymentMethod(fields[3]),
      dateTime: expandDateTime(fields[4], "Belegdatum"),
      issuer: hydrateIssuer(fields[5]),
      branding: hydrateBranding(fields[6]),
      businessArea: null,
      serviceLocation: null,
      customer: hydrateCustomer(fields[7]),
      positions,
      totals: {
        subtotalCents: integerField(totalFields[0], "Zwischensumme"),
        discountCents: integerField(totalFields[1], "Gesamtrabatt", { minimum: 0 }),
        netCents: integerField(totalFields[2], "Nettosumme"),
        taxCents: integerField(totalFields[3], "Steuersumme"),
        grossCents: integerField(totalFields[4], "Bruttosumme")
      },
      taxes,
      voucherPayment: voucherFields ? {
        reference: "",
        code: stringField(voucherFields[0], "maskierter Gutscheincode", 80),
        amountCents: integerField(voucherFields[1], "Gutscheinbetrag", { minimum: 0 }),
        balanceAfterCents: 0
      } : null,
      remainderPayment: remainderFields ? {
        method: stringField(remainderFields[0], "Restzahlungsart", 80),
        amountCents: integerField(remainderFields[1], "Restzahlungsbetrag", { minimum: 0 })
      } : null,
      linkedVoucher: fields[13] ? { reference: "", code: stringField(fields[13], "maskierter Gutscheincode", 80) } : null,
      correctionReference: stringField(fields[14], "Korrekturbezug", 80, { optional: true }),
      texts: (() => {
        const textFields = arrayField(fields[15], "Belegtexte", 2);
        return {
          thankYou: stringField(textFields[0], "Dankestext", 500),
          footer: stringField(textFields[1], "Fußtext", 700, { optional: true })
        };
      })()
    };
  }

  function hydrateVoucher(value, digest) {
    const fields = arrayField(value, "Gutschein", 9);
    const code = stringField(fields[0], "Gutscheincode", 100);
    const statusCode = integerField(fields[1], "Gutscheinstatus", { minimum: 0, maximum: voucherStatuses.length - 1 });
    const issuedValueCents = integerField(fields[2], "Gutscheinwert", { minimum: 1 });
    const currentValueCents = integerField(fields[3], "Restwert", { minimum: 0 });
    if (currentValueCents > issuedValueCents) throw publicError("PUBLIC_DOCUMENT_INVALID", "Der Restwert ist größer als der Gutscheinwert.");
    const locationFields = arrayField(fields[8], "Einlöseort", 4);
    const reference = publicReference(digest, "voucher");
    return {
      documentVersion: DOCUMENT_VERSION,
      type: "voucher",
      id: reference,
      reference,
      code,
      filename: `FRECKA-Gutschein-${safeFilenamePart(code)}.pdf`,
      title: "Gutschein",
      status: voucherStatuses[statusCode][0],
      statusLabel: voucherStatuses[statusCode][1],
      issuedValueCents,
      currentValueCents,
      soldAt: expandDateTime(fields[4], "Ausstellungsdatum"),
      issuer: hydrateIssuer(fields[5]),
      branding: hydrateBranding(fields[6]),
      businessArea: null,
      redemptionLocation: {
        id: "",
        name: stringField(locationFields[0], "Einlöseort", 160),
        street: stringField(locationFields[1], "Einlöseanschrift", 180, { optional: true }),
        cityLine: stringField(locationFields[2], "Einlöseort", 140, { optional: true }),
        phone: "",
        voucherNote: stringField(locationFields[3], "Gutscheinhinweis", 300, { optional: true })
      },
      customer: null,
      displayName: stringField(fields[7], "Name auf dem Gutschein", 180, { optional: true }),
      saleReceipt: null
    };
  }

  function validateEnvelope(envelope) {
    const fields = arrayField(envelope, "Format", 4);
    if (fields[0] !== FORMAT_MARKER) throw publicError("PUBLIC_FORMAT_INVALID", "Dies ist kein unterstütztes FRECKA-Dokument.");
    if (fields[1] !== FORMAT_VERSION) throw publicError("PUBLIC_VERSION_UNSUPPORTED", "Diese Version des digitalen Dokuments wird noch nicht unterstützt.");
    if (!new Set(["r", "v"]).has(fields[2])) throw publicError("PUBLIC_TYPE_INVALID", "Dieser digitale Dokumenttyp wird nicht unterstützt.");
    const hydrated = fields[2] === "r" ? hydrateReceipt(fields[3], "validation") : hydrateVoucher(fields[3], "validation");
    return deepFreeze(hydrated);
  }

  function bytesToBase64Url(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 8192)));
    }
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
  }

  function base64UrlToBytes(value) {
    const encoded = String(value || "");
    if (!encoded || encoded.length > Math.ceil(MAX_TRANSPORT_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) {
      throw publicError("PUBLIC_PAYLOAD_INVALID", "Der digitale Beleglink enthält keine gültigen Daten.");
    }
    try {
      const padded = encoded.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
      const binary = atob(padded);
      return Uint8Array.from(binary, character => character.charCodeAt(0));
    } catch (error) {
      throw publicError("PUBLIC_PAYLOAD_INVALID", "Der digitale Beleglink enthält keine gültigen Daten.", error);
    }
  }

  async function sha256(bytes, cryptoObject = globalThis.crypto) {
    if (!cryptoObject?.subtle?.digest) {
      throw publicError("PUBLIC_INTEGRITY_UNAVAILABLE", "Die Integritätsprüfung ist in diesem Browser nicht verfügbar.");
    }
    try {
      return new Uint8Array(await cryptoObject.subtle.digest("SHA-256", bytes));
    } catch (error) {
      throw publicError("PUBLIC_INTEGRITY_UNAVAILABLE", "Die Integritätsprüfung ist in diesem Browser nicht verfügbar.", error);
    }
  }

  async function transformBytes(bytes, format, TransformConstructor, maximumOutput = MAX_RAW_BYTES) {
    if (typeof TransformConstructor !== "function") throw publicError("PUBLIC_COMPRESSION_UNAVAILABLE", "Dieser Browser kann das komprimierte Dokument nicht öffnen.");
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new TransformConstructor(format));
      const reader = stream.getReader();
      const chunks = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maximumOutput) {
          await reader.cancel();
          throw publicError("PUBLIC_DOCUMENT_TOO_LARGE", "Das digitale Dokument überschreitet die sichere Größenbegrenzung.");
        }
        chunks.push(value);
      }
      const result = new Uint8Array(total);
      let offset = 0;
      chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.byteLength; });
      return result;
    } catch (error) {
      if (error instanceof PublicDocumentError) throw error;
      throw publicError("PUBLIC_COMPRESSION_FAILED", "Das digitale Dokument konnte nicht verarbeitet werden.", error);
    }
  }

  function resolveViewerBaseUrl(baseUrl) {
    const configured = trimmed(baseUrl) || trimmed(globalThis.FRECKA_CONFIG?.publicViewerBaseUrl);
    const fallback = globalThis.location?.href;
    try {
      const url = new URL(configured || fallback, fallback || undefined);
      if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("Unsupported protocol");
      url.search = "";
      url.hash = "";
      return url;
    } catch (error) {
      throw publicError("PUBLIC_BASE_URL_INVALID", "Die öffentliche FRECKA-Adresse ist nicht gültig.", error);
    }
  }

  function isPublicLink(value = globalThis.location?.href) {
    try {
      const url = new URL(String(value || ""), globalThis.location?.href);
      return url.hash === "#/p" || url.hash.startsWith(ROUTE_PREFIX);
    } catch (error) {
      return String(value || "").startsWith("#/p");
    }
  }

  function parseRoute(value) {
    const source = String(value || "");
    if (source.length > MAX_URL_LENGTH) {
      throw publicError("PUBLIC_LINK_TOO_LARGE", "Der digitale FRECKA-Link überschreitet die unterstützte Länge.");
    }
    let url;
    try {
      url = new URL(source, globalThis.location?.href);
    } catch (error) {
      throw publicError("PUBLIC_LINK_INVALID", "Der digitale FRECKA-Link ist ungültig.", error);
    }
    if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password || url.search || url.href.length > MAX_URL_LENGTH) {
      throw publicError("PUBLIC_LINK_INVALID", "Der digitale FRECKA-Link ist nicht kanonisch oder enthält nicht unterstützte URL-Bestandteile.");
    }
    if (!isPublicLink(url.href)) return null;
    const parts = url.hash.slice(2).split("/");
    if (parts[0] !== "p" || parts.length !== 5) throw publicError("PUBLIC_LINK_INVALID", "Der digitale FRECKA-Link ist unvollständig.");
    if (!new Set(["r", "v"]).has(parts[1])) throw publicError("PUBLIC_TYPE_INVALID", "Dieser digitale Dokumenttyp wird nicht unterstützt.");
    const version = Number(parts[2]);
    if (version !== FORMAT_VERSION) throw publicError("PUBLIC_VERSION_UNSUPPORTED", "Diese Version des digitalen Dokuments wird noch nicht unterstützt.");
    if (!new Set(["d", "n"]).has(parts[3])) throw publicError("PUBLIC_CODEC_UNSUPPORTED", "Die Komprimierung dieses Dokuments wird nicht unterstützt.");
    const payloadAndDigest = parts[4].split(".");
    if (payloadAndDigest.length !== 2) throw publicError("PUBLIC_LINK_INVALID", "Der digitale FRECKA-Link ist unvollständig.");
    if (!/^[A-Za-z0-9_-]{43}$/u.test(payloadAndDigest[1])) {
      throw publicError("PUBLIC_INTEGRITY_INVALID", "Die Integritätsangabe des digitalen Dokuments ist ungültig.");
    }
    return { url, type: parts[1], version, codec: parts[3], payload: payloadAndDigest[0], digest: payloadAndDigest[1] };
  }

  function attachQr(modelInput, link, digest, qrService = globalThis.FRECKA_QR) {
    if (!qrService?.encodeAppLink) throw publicError("PUBLIC_QR_UNAVAILABLE", "Der öffentliche QR-Code kann momentan nicht erzeugt werden.");
    let encoded;
    try {
      encoded = qrService.encodeAppLink(link, { label: modelInput.type === "receipt" ? "QR-Code zum digitalen Beleg" : "Gutschein-QR-Code" });
    } catch (error) {
      throw publicError("PUBLIC_QR_TOO_LARGE", "Dieses Dokument ist für einen zuverlässig lesbaren QR-Code zu umfangreich. PDF und Teilen bleiben verfügbar.", error);
    }
    if (encoded.version > MAX_QR_VERSION) {
      throw publicError("PUBLIC_QR_TOO_DENSE", "Dieses Dokument ist für einen zuverlässig lesbaren QR-Code zu umfangreich. PDF und Teilen bleiben verfügbar.");
    }
    return deepFreeze({
      ...modelInput,
      qr: {
        kind: modelInput.type,
        reference: publicReference(digest, modelInput.type),
        appLink: encoded.appLink,
        size: encoded.size,
        version: encoded.version,
        matrix: encoded.matrix.map(row => [...row]),
        svg: encoded.svg
      }
    });
  }

  async function createPublicBundle(model, options = {}) {
    const envelope = projectDocument(model);
    const rawBytes = new TextEncoder().encode(JSON.stringify(envelope));
    if (rawBytes.byteLength > MAX_RAW_BYTES) throw publicError("PUBLIC_DOCUMENT_TOO_LARGE", "Das digitale Dokument überschreitet die sichere Größenbegrenzung.");
    const CompressionConstructor = hasOwn(options, "CompressionStream") ? options.CompressionStream : globalThis.CompressionStream;
    let codec = "n";
    let transportBytes = rawBytes;
    if (typeof CompressionConstructor === "function") {
      const compressed = await transformBytes(rawBytes, "deflate", CompressionConstructor, MAX_TRANSPORT_BYTES);
      if (compressed.byteLength < rawBytes.byteLength) {
        codec = "d";
        transportBytes = compressed;
      }
    }
    if (transportBytes.byteLength > MAX_TRANSPORT_BYTES) throw publicError("PUBLIC_DOCUMENT_TOO_LARGE", "Das digitale Dokument ist für einen QR-Link zu umfangreich.");
    const digest = bytesToBase64Url(await sha256(rawBytes, options.crypto || globalThis.crypto));
    const url = resolveViewerBaseUrl(options.baseUrl);
    url.hash = `/p/${envelope[2]}/${FORMAT_VERSION}/${codec}/${bytesToBase64Url(transportBytes)}.${digest}`;
    if (url.href.length > MAX_URL_LENGTH) throw publicError("PUBLIC_DOCUMENT_TOO_LARGE", "Das digitale Dokument ist für einen QR-Link zu umfangreich.");
    const hydrated = envelope[2] === "r" ? hydrateReceipt(envelope[3], digest) : hydrateVoucher(envelope[3], digest);
    const publicModel = attachQr(hydrated, url.href, digest, options.qrService || globalThis.FRECKA_QR);
    return deepFreeze({
      formatMarker: FORMAT_MARKER,
      formatVersion: FORMAT_VERSION,
      codec,
      link: url.href,
      digest,
      rawBytes: rawBytes.byteLength,
      transportBytes: transportBytes.byteLength,
      urlLength: url.href.length,
      qrVersion: publicModel.qr.version,
      qrSize: publicModel.qr.size,
      model: publicModel
    });
  }

  async function decodePublicLink(value, options = {}) {
    const parsed = parseRoute(value);
    if (!parsed) return null;
    const transportBytes = base64UrlToBytes(parsed.payload);
    if (transportBytes.byteLength > MAX_TRANSPORT_BYTES) throw publicError("PUBLIC_DOCUMENT_TOO_LARGE", "Das digitale Dokument überschreitet die sichere Größenbegrenzung.");
    const rawBytes = parsed.codec === "d"
      ? await transformBytes(transportBytes, "deflate", hasOwn(options, "DecompressionStream") ? options.DecompressionStream : globalThis.DecompressionStream, MAX_RAW_BYTES)
      : transportBytes;
    const expectedDigest = bytesToBase64Url(await sha256(rawBytes, options.crypto || globalThis.crypto));
    if (expectedDigest.length !== parsed.digest.length || expectedDigest !== parsed.digest) {
      throw publicError("PUBLIC_INTEGRITY_FAILED", "Das digitale Dokument ist beschädigt oder unvollständig.");
    }
    let envelope;
    try {
      envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBytes));
    } catch (error) {
      throw publicError("PUBLIC_PAYLOAD_INVALID", "Die Daten des digitalen Dokuments sind beschädigt.", error);
    }
    const hydrated = validateEnvelope(envelope);
    if ((hydrated.type === "receipt" ? "r" : "v") !== parsed.type) {
      throw publicError("PUBLIC_TYPE_INVALID", "Der Dokumenttyp des digitalen Links ist widersprüchlich.");
    }
    const model = attachQr(hydrated, parsed.url.href, expectedDigest, options.qrService || globalThis.FRECKA_QR);
    return deepFreeze({
      formatMarker: FORMAT_MARKER,
      formatVersion: FORMAT_VERSION,
      codec: parsed.codec,
      link: parsed.url.href,
      digest: expectedDigest,
      rawBytes: rawBytes.byteLength,
      transportBytes: transportBytes.byteLength,
      urlLength: parsed.url.href.length,
      qrVersion: model.qr.version,
      qrSize: model.qr.size,
      model
    });
  }

  globalThis.FRECKA_PUBLIC_DOCUMENTS = Object.freeze({
    PUBLIC_DOCUMENT_VERSION,
    FORMAT_MARKER,
    FORMAT_VERSION,
    PublicDocumentError,
    constants: Object.freeze({
      routePrefix: ROUTE_PREFIX,
      maxRawBytes: MAX_RAW_BYTES,
      maxTransportBytes: MAX_TRANSPORT_BYTES,
      maxUrlLength: MAX_URL_LENGTH,
      maxPositions: MAX_POSITIONS,
      maxQrVersion: MAX_QR_VERSION,
      errorCorrection: "M"
    }),
    isPublicLink,
    resolveViewerBaseUrl,
    projectDocument,
    createPublicBundle,
    decodePublicLink
  });
})();
