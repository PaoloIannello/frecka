(() => {
  "use strict";

  const SHARE_VERSION = "COMM-001";

  class ShareServiceError extends Error {
    constructor(code, userMessage, cause = null) {
      super(userMessage, cause ? { cause } : undefined);
      this.name = "ShareServiceError";
      this.code = code;
      this.userMessage = userMessage;
    }
  }

  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const trimmed = value => typeof value === "string" ? value.trim() : "";

  function normalizeFilename(value) {
    const filename = trimmed(value);
    if (!filename || filename.length > 180 || /[\\/\u0000-\u001F\u007F]/u.test(filename)) {
      throw new ShareServiceError("SHARE_FILENAME_INVALID", "Der Dateiname zum Teilen ist ungültig.");
    }
    return filename;
  }

  function normalizeMimeType(value) {
    const mimeType = trimmed(value) || "application/octet-stream";
    if (mimeType.length > 120 || /[\u0000-\u001F\u007F]/u.test(mimeType)) {
      throw new ShareServiceError("SHARE_MIME_INVALID", "Der Dateityp zum Teilen ist ungültig.");
    }
    return mimeType;
  }

  function normalizeUrl(value, baseUrl) {
    try {
      const url = new URL(String(value || ""), baseUrl || globalThis.location?.href);
      if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("Unsupported protocol");
      return url.href;
    } catch (error) {
      throw new ShareServiceError("SHARE_URL_INVALID", "Der digitale Link zum Teilen ist ungültig.", error);
    }
  }

  function metadataValue(value, maximumLength) {
    const result = trimmed(value);
    return result ? result.slice(0, maximumLength) : "";
  }

  function shareMetadata(metadata = {}) {
    const title = metadataValue(metadata.title, 160);
    const text = metadataValue(metadata.text, 500);
    return {
      ...(title ? { title } : {}),
      ...(text ? { text } : {})
    };
  }

  function errorResult(error) {
    if (error?.name === "AbortError") return Object.freeze({ status: "cancelled", mode: "none" });
    const code = ({
      NotAllowedError: "SHARE_NOT_ALLOWED",
      InvalidStateError: "SHARE_INVALID_STATE",
      TypeError: "SHARE_DATA_INVALID",
      DataError: "SHARE_DATA_INVALID"
    })[error?.name] || "SHARE_FAILED";
    const message = code === "SHARE_NOT_ALLOWED"
      ? "Teilen wurde vom Browser nicht erlaubt. Bitte versuche es erneut."
      : code === "SHARE_INVALID_STATE"
      ? "Der Teilen-Dialog ist bereits geöffnet oder momentan nicht verfügbar."
      : code === "SHARE_DATA_INVALID"
      ? "Diese Datei oder dieser Link kann auf diesem Gerät nicht geteilt werden."
      : "Teilen konnte nicht geöffnet werden.";
    throw new ShareServiceError(code, message, error);
  }

  function createShareService(environment = {}) {
    const navigatorObject = hasOwn(environment, "navigator") ? environment.navigator : globalThis.navigator;
    const documentObject = hasOwn(environment, "document") ? environment.document : globalThis.document;
    const urlApi = hasOwn(environment, "urlApi") ? environment.urlApi : globalThis.URL;
    const FileConstructor = hasOwn(environment, "File") ? environment.File : globalThis.File;
    const secureContext = hasOwn(environment, "isSecureContext")
      ? environment.isSecureContext === true
      : globalThis.isSecureContext === true;
    const schedule = hasOwn(environment, "setTimeout") ? environment.setTimeout : globalThis.setTimeout;
    const now = typeof environment.now === "function" ? environment.now : Date.now;
    const baseUrl = hasOwn(environment, "baseUrl") ? environment.baseUrl : globalThis.location?.href;

    function createFile(content, options = {}) {
      if (typeof FileConstructor !== "function") {
        throw new ShareServiceError("SHARE_FILE_UNAVAILABLE", "Dateien können in diesem Browser nicht direkt geteilt werden.");
      }
      const name = normalizeFilename(options.name);
      const type = normalizeMimeType(options.type);
      const lastModified = Number.isFinite(Number(options.lastModified)) ? Number(options.lastModified) : Number(now());
      try {
        return new FileConstructor([content], name, { type, lastModified });
      } catch (error) {
        throw new ShareServiceError("SHARE_FILE_INVALID", "Die Datei zum Teilen konnte nicht vorbereitet werden.", error);
      }
    }

    function areActualFiles(files) {
      return Array.isArray(files)
        && files.length > 0
        && typeof FileConstructor === "function"
        && files.every(file => file instanceof FileConstructor);
    }

    function canUseWebShare() {
      return secureContext && typeof navigatorObject?.share === "function";
    }

    function canShareFiles(files) {
      if (!canUseWebShare() || typeof navigatorObject?.canShare !== "function" || !areActualFiles(files)) return false;
      try {
        return navigatorObject.canShare({ files }) === true;
      } catch (error) {
        return false;
      }
    }

    function canShareUrl(value) {
      if (!canUseWebShare()) return false;
      let url;
      try {
        url = normalizeUrl(value, baseUrl);
      } catch (error) {
        return false;
      }
      if (typeof navigatorObject?.canShare !== "function") return true;
      try {
        return navigatorObject.canShare({ url }) === true;
      } catch (error) {
        return false;
      }
    }

    async function shareFiles(files, metadata = {}) {
      if (!canShareFiles(files)) return Object.freeze({ status: "unsupported", mode: "files" });
      try {
        await navigatorObject.share({ files, ...shareMetadata(metadata) });
        return Object.freeze({ status: "shared", mode: "files" });
      } catch (error) {
        const result = errorResult(error);
        return result.mode === "none" ? Object.freeze({ ...result, mode: "files" }) : result;
      }
    }

    async function shareUrl(value, metadata = {}) {
      const url = normalizeUrl(value, baseUrl);
      if (!canShareUrl(url)) return Object.freeze({ status: "unsupported", mode: "url" });
      try {
        await navigatorObject.share({ url, ...shareMetadata(metadata) });
        return Object.freeze({ status: "shared", mode: "url" });
      } catch (error) {
        const result = errorResult(error);
        return result.mode === "none" ? Object.freeze({ ...result, mode: "url" }) : result;
      }
    }

    function downloadFallback(file) {
      if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") {
        throw new ShareServiceError("SHARE_DOWNLOAD_INVALID", "Die Datei konnte nicht auf dem Gerät gespeichert werden.");
      }
      if (!documentObject?.createElement || !documentObject?.body?.append || !urlApi?.createObjectURL || !urlApi?.revokeObjectURL) {
        throw new ShareServiceError("SHARE_DOWNLOAD_UNAVAILABLE", "Dieser Browser kann die Datei momentan nicht speichern.");
      }
      const name = normalizeFilename(file.name || "FRECKA-Dokument.pdf");
      let objectUrl;
      try {
        objectUrl = urlApi.createObjectURL(file);
        const link = documentObject.createElement("a");
        link.href = objectUrl;
        link.download = name;
        link.rel = "noopener";
        link.hidden = true;
        documentObject.body.append(link);
        link.click();
        link.remove();
        schedule?.(() => urlApi.revokeObjectURL(objectUrl), 1000);
        return Object.freeze({ status: "downloaded", mode: "download" });
      } catch (error) {
        if (objectUrl) urlApi.revokeObjectURL(objectUrl);
        throw new ShareServiceError("SHARE_DOWNLOAD_FAILED", "Die Datei konnte nicht auf dem Gerät gespeichert werden.", error);
      }
    }

    async function sharePreferred({ files = [], url = "", metadata = {}, downloadFile = null } = {}) {
      if (canShareFiles(files)) return shareFiles(files, metadata);
      if (url && canShareUrl(url)) return shareUrl(url, metadata);
      if (downloadFile) return downloadFallback(downloadFile);
      return Object.freeze({ status: "unsupported", mode: "none" });
    }

    return Object.freeze({
      version: SHARE_VERSION,
      createFile,
      canUseWebShare,
      canShareFiles,
      canShareUrl,
      shareFiles,
      shareUrl,
      downloadFallback,
      sharePreferred
    });
  }

  const service = createShareService();
  globalThis.FRECKA_SHARING = Object.freeze({
    SHARE_VERSION,
    ShareServiceError,
    createShareService,
    ...service
  });
})();
