(() => {
  "use strict";

  const QR_VERSION = "QR-001";
  const QUIET_ZONE_MODULES = 4;
  const allowedKinds = new Set(["receipt", "voucher"]);

  class QrServiceError extends Error {
    constructor(code, userMessage, cause = null) {
      super(userMessage, cause ? { cause } : undefined);
      this.name = "QrServiceError";
      this.code = code;
      this.userMessage = userMessage;
    }
  }

  function requireEncoder() {
    if (!globalThis.qrcodegen?.QrCode?.encodeText) {
      throw new QrServiceError("QR_ENGINE_UNAVAILABLE", "Die QR-Erzeugung ist momentan nicht verfügbar.");
    }
    return globalThis.qrcodegen.QrCode;
  }

  function normalizeKind(kind) {
    const normalized = String(kind || "").trim().toLowerCase();
    if (!allowedKinds.has(normalized)) {
      throw new QrServiceError("QR_KIND_INVALID", "Diese QR-Referenz wird nicht unterstützt.");
    }
    return normalized;
  }

  function normalizeReference(reference) {
    const normalized = String(reference ?? "").trim();
    if (!normalized || normalized.length > 256 || /[\u0000-\u001F\u007F]/u.test(normalized)) {
      throw new QrServiceError("QR_REFERENCE_INVALID", "Die QR-Referenz ist ungültig.");
    }
    return normalized;
  }

  function resolveBaseUrl(baseUrl) {
    const fallback = globalThis.location?.href;
    if (!baseUrl && !fallback) {
      throw new QrServiceError("QR_BASE_URL_MISSING", "Der FRECKA-App-Link konnte nicht erstellt werden.");
    }
    try {
      const url = new URL(baseUrl || fallback, fallback || undefined);
      if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("Unsupported protocol");
      url.search = "";
      url.hash = "";
      return url;
    } catch (error) {
      throw new QrServiceError("QR_BASE_URL_INVALID", "Der FRECKA-App-Link konnte nicht erstellt werden.", error);
    }
  }

  function buildAppLink(kind, reference, baseUrl) {
    const normalizedKind = normalizeKind(kind);
    const normalizedReference = normalizeReference(reference);
    const url = resolveBaseUrl(baseUrl);
    url.hash = `/${normalizedKind}/${encodeURIComponent(normalizedReference)}`;
    return url.href;
  }

  function normalizeAppLink(appLink, baseUrl) {
    try {
      const url = new URL(String(appLink || ""), resolveBaseUrl(baseUrl));
      if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("Unsupported protocol");
      return url.href;
    } catch (error) {
      if (error instanceof QrServiceError) throw error;
      throw new QrServiceError("QR_APP_LINK_INVALID", "Der QR-Code enthält keinen gültigen App-Link.", error);
    }
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function renderSvg(matrix, label = "FRECKA QR-Code") {
    if (!Array.isArray(matrix) || !matrix.length || matrix.some(row => !Array.isArray(row) || row.length !== matrix.length)) {
      throw new QrServiceError("QR_MATRIX_INVALID", "Der QR-Code konnte nicht dargestellt werden.");
    }
    const dimension = matrix.length + QUIET_ZONE_MODULES * 2;
    const path = [];
    matrix.forEach((row, y) => row.forEach((dark, x) => {
      if (dark) path.push(`M${x + QUIET_ZONE_MODULES},${y + QUIET_ZONE_MODULES}h1v1h-1z`);
    }));
    if (!path.length) {
      throw new QrServiceError("QR_MATRIX_EMPTY", "Der QR-Code konnte nicht dargestellt werden.");
    }
    return `<svg class="frecka-qr-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" role="img" aria-label="${escapeXml(label)}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${path.join("")}" fill="#000"/></svg>`;
  }

  function encodeAppLink(appLink, options = {}) {
    const normalizedLink = normalizeAppLink(appLink, options.baseUrl);
    let qr;
    try {
      const QrCode = requireEncoder();
      qr = QrCode.encodeText(normalizedLink, QrCode.Ecc.MEDIUM);
    } catch (error) {
      if (error instanceof QrServiceError) throw error;
      throw new QrServiceError("QR_ENCODING_FAILED", "Der QR-Code konnte nicht erzeugt werden.", error);
    }
    const matrix = Object.freeze(Array.from({ length: qr.size }, (_, y) => Object.freeze(
      Array.from({ length: qr.size }, (_, x) => qr.getModule(x, y))
    )));
    return Object.freeze({
      appLink: normalizedLink,
      size: qr.size,
      version: qr.version,
      mask: qr.mask,
      matrix,
      svg: renderSvg(matrix, options.label)
    });
  }

  function create(kind, reference, options = {}) {
    const normalizedKind = normalizeKind(kind);
    const normalizedReference = normalizeReference(reference);
    const encoded = encodeAppLink(buildAppLink(normalizedKind, normalizedReference, options.baseUrl), options);
    return Object.freeze({
      kind: normalizedKind,
      reference: normalizedReference,
      ...encoded
    });
  }

  function parseAppLink(value, baseUrl) {
    let url;
    try {
      const raw = String(value || "");
      url = raw.startsWith("#/")
        ? new URL(raw, resolveBaseUrl(baseUrl))
        : new URL(raw, resolveBaseUrl(baseUrl));
    } catch (error) {
      if (error instanceof QrServiceError) throw error;
      throw new QrServiceError("QR_APP_LINK_INVALID", "Der FRECKA-Link ist ungültig.", error);
    }
    const match = /^#\/(receipt|voucher)\/([^/?#]+)$/u.exec(url.hash);
    if (!match) {
      if (/^#\/(receipt|voucher)(?:\/|$)/u.test(url.hash)) {
        throw new QrServiceError("QR_REFERENCE_INVALID", "Die QR-Referenz ist ungültig.");
      }
      return null;
    }
    try {
      return Object.freeze({
        kind: normalizeKind(match[1]),
        reference: normalizeReference(decodeURIComponent(match[2])),
        appLink: url.href
      });
    } catch (error) {
      if (error instanceof QrServiceError) throw error;
      throw new QrServiceError("QR_REFERENCE_INVALID", "Die QR-Referenz ist ungültig.", error);
    }
  }

  globalThis.FRECKA_QR = Object.freeze({
    QR_VERSION,
    QrServiceError,
    QUIET_ZONE_MODULES,
    buildAppLink,
    encodeAppLink,
    create,
    parseAppLink
  });
})();
