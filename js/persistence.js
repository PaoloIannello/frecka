(() => {
  "use strict";

  const constants = Object.freeze({
    databaseName: "frecka",
    databaseVersion: 5,
    storeName: "settings",
    settingsStoreName: "settings",
    catalogStoreName: "catalog",
    customersStoreName: "customers",
    receiptsStoreName: "receipts",
    vouchersStoreName: "vouchers",
    tenantId: "local-default",
    formatVersion: 1,
    companyLogoFormatVersion: 1,
    companyLogoMaxBytes: 1024 * 1024,
    userFormatVersion: 1,
    licenseFormatVersion: 1,
    backupReminderFormatVersion: 1,
    backupReminderDelayMs: 7 * 24 * 60 * 60 * 1000,
    backupReminderSnoozeMs: 24 * 60 * 60 * 1000,
    settingsFormatVersion: 1,
    catalogFormatVersion: 1,
    customersFormatVersion: 1,
    receiptsFormatVersion: 1,
    vouchersFormatVersion: 1
  });

  const forbiddenRootKeys = new Set([
    "catalog", "categories", "businessTemplates", "templateImportStatus",
    "customers", "customerChoices", "receipts", "vouchers", "histories",
    "openReceipt", "drafts", "cancellations", "credits"
  ]);
  const catalogForbiddenRootKeys = new Set([
    "company", "serviceLocations", "businessAreas", "taxSettings", "receiptSettings",
    "paymentChoices", "setup", "catalog", "businessTemplates", "templateImportStatus",
    "customers", "customerChoices", "receipts", "vouchers", "histories", "openReceipt",
    "drafts", "cancellations", "credits", "images", "logos", "license"
  ]);
  const customersForbiddenRootKeys = new Set([
    "company", "serviceLocations", "businessAreas", "taxSettings", "receiptSettings",
    "paymentChoices", "setup", "catalog", "categories", "businessTemplates",
    "templateImportStatus", "customerChoices", "receipts", "vouchers", "histories",
    "openReceipt", "drafts", "cancellations", "credits", "emailStatus", "license"
  ]);
  const customerForbiddenKeys = new Set([
    "history", "histories", "receipts", "vouchers", "openPayments", "drafts",
    "cancellations", "credits", "emailStatus", "receiptCount", "lastVisit", "totalTurnover",
    "zip", "note"
  ]);
  const receiptsForbiddenRootKeys = new Set([
    "company", "serviceLocations", "businessAreas", "taxSettings", "receiptSettings",
    "paymentChoices", "setup", "catalog", "categories", "businessTemplates",
    "templateImportStatus", "customers", "customerChoices", "vouchers", "histories",
    "openReceipt", "drafts", "cancellations", "credits", "images", "logos", "license"
  ]);
  const receiptForbiddenKeys = new Set([
    "voucher", "voucherObject", "voucherHistory", "emailStatus", "emailHistory",
    "pdf", "pdfFile", "qrData", "tse", "fiscalization"
  ]);
  const vouchersForbiddenRootKeys = new Set([
    "company", "serviceLocations", "businessAreas", "taxSettings", "receiptSettings",
    "paymentChoices", "setup", "catalog", "categories", "businessTemplates",
    "templateImportStatus", "customers", "customerChoices", "receipts", "histories",
    "openReceipt", "drafts", "cancellations", "credits", "images", "logos", "license"
  ]);
  const voucherForbiddenKeys = new Set([
    "pdf", "pdfFile", "qrImage", "qrGraphic", "qrCells", "mailStatus", "emailStatus",
    "cameraData", "scanData", "printStatus", "printedAt"
  ]);
  const userForbiddenKeys = new Set([
    "pin", "password", "passphrase", "login", "roles", "roleids", "permissions", "rights",
    "session", "sessions", "sessiontoken", "token", "accesstoken", "refreshtoken"
  ]);
  const licenseAllowedKeys = new Set([
    "formatVersion", "licenseId", "tenantId", "deviceId", "activatedAt", "lastValidation"
  ]);
  const companyLogoAllowedKeys = new Set([
    "formatVersion", "id", "name", "mimeType", "size", "dataUrl", "updatedAt"
  ]);
  const dangerousKeys = new Set(["__proto__", "prototype", "constructor"]);
  const sensitiveKeyPattern = /(password|passphrase|credential|secret|access.?token|refresh.?token|private.?key)/i;
  const setupStatuses = new Set(["not-started", "started", "completed"]);
  const tenantSnapshotConstants = Object.freeze({
    backupFormat: "FRECKA_TENANT_SNAPSHOT",
    backupFormatVersion: 1,
    appDataSchemaVersion: constants.databaseVersion,
    appVersion: "BACKUP-001",
    storeKeys: Object.freeze(["settings", "catalog", "customers", "receipts", "vouchers"])
  });
  const integrityDiagnosticConstants = Object.freeze({
    format: "FRECKA_INTEGRITY_DIAGNOSTIC",
    formatVersion: 1
  });
  const historicalDemoVoucherReceiptRepairConstants = Object.freeze({
    format: "FRECKA_HISTORICAL_DEMO_VOUCHER_RECEIPT_REPAIR",
    formatVersion: 1,
    cases: Object.freeze([
      Object.freeze({ receiptId: "receipt_demo_2026_000118", receiptNumber: "2026-000118", voucherReference: "vch_6d2a84f9b3c1", voucherCode: "FRKA-5T9L-2H7C" }),
      Object.freeze({ receiptId: "receipt_demo_2026_000121", receiptNumber: "2026-000121", voucherReference: "vch_3c9f7a2e5b84", voucherCode: "FRKA-8D3K-4M7R" }),
      Object.freeze({ receiptId: "receipt_demo_2026_000124", receiptNumber: "2026-000124", voucherReference: "vch_8f4c2a91d7e6", voucherCode: "FRKA-7Q2M-9K4X" }),
      Object.freeze({ receiptId: "receipt_demo_2026_000131", receiptNumber: "2026-000131", voucherReference: "vch_1b7e93a4c5d8", voucherCode: "FRKA-3N8R-6W5P" })
    ])
  });

  class PersistenceError extends Error {
    constructor(code, userMessage, cause = null, diagnostic = null) {
      super(userMessage);
      this.name = "PersistenceError";
      this.code = code;
      this.userMessage = userMessage;
      if (cause) this.cause = cause;
      if (diagnostic) this.diagnostic = diagnostic;
    }
  }

  const isPlainObject = value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  };

  function cloneSafe(value) {
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
    if (Array.isArray(value)) return value.map(cloneSafe).filter(entry => entry !== undefined);
    if (!isPlainObject(value)) return undefined;
    const result = {};
    Object.keys(value).forEach(key => {
      if (dangerousKeys.has(key) || sensitiveKeyPattern.test(key)) return;
      const cloned = cloneSafe(value[key]);
      if (cloned !== undefined) result[key] = cloned;
    });
    return result;
  }

  function cloneSerializable(value) {
    try {
      if (typeof structuredClone === "function") return structuredClone(value);
      return JSON.parse(JSON.stringify(value));
    } catch (cause) {
      throw new PersistenceError(
        "SERIALIZE_FAILED",
        "Die Daten konnten nicht für die lokale Speicherung vorbereitet werden.",
        cause
      );
    }
  }

  const stringValue = (value, fallback = "") => typeof value === "string" ? value : fallback;
  const trimmedString = (value, fallback = "") => stringValue(value, fallback).trim();
  const booleanValue = (value, fallback = false) => typeof value === "boolean" ? value : fallback;
  const finiteNumber = (value, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const nullableStringId = value => typeof value === "string" && value.trim() ? value : null;
  const uniqueStrings = values => [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === "string" && value.trim()))];
  const nonNegativeInteger = (value, fallback = 0) => Number.isInteger(value) && value >= 0 ? value : fallback;
  const validLogoMode = value => ["company", "custom", "none"].includes(value) ? value : "company";
  const validSetupStatus = value => setupStatuses.has(value) ? value : "not-started";
  const epochIso = "1970-01-01T00:00:00.000Z";

  function companyIdentity(source = {}) {
    const rawName = stringValue(source?.name).trim();
    const rawOwner = stringValue(source?.owner).trim();
    const owner = rawOwner || rawName;
    const duplicatesOwner = rawName
      && owner
      && rawName.localeCompare(owner, "de-DE", { sensitivity: "base" }) === 0;
    const name = duplicatesOwner || !rawOwner ? "" : rawName;
    return Object.freeze({ name, owner, displayName: name || owner });
  }

  function stableIso(value, fallback = epochIso) {
    if (typeof value === "string" && value.trim()) {
      const timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
    }
    const fallbackTimestamp = Date.parse(fallback);
    return Number.isFinite(fallbackTimestamp) ? new Date(fallbackTimestamp).toISOString() : epochIso;
  }

  function nullableIso(value) {
    if (value === null || value === undefined || value === "") return null;
    const normalized = stableIso(value, "");
    return normalized === epochIso ? null : normalized;
  }

  function normalizeBackupReminder(source, fallbackSource = null, initializedAt = new Date().toISOString()) {
    const fallback = isPlainObject(fallbackSource) ? fallbackSource : {};
    const candidate = isPlainObject(source) ? source : {};
    if (Number.isInteger(candidate.formatVersion) && candidate.formatVersion > constants.backupReminderFormatVersion) {
      throw new PersistenceError("UNSUPPORTED_FORMAT", "Diese Sicherungserinnerung benötigt eine neuere FRECKA-Version und wurde nicht verändert.");
    }
    const baselineAt = nullableIso(candidate.baselineAt)
      || nullableIso(fallback.baselineAt)
      || stableIso(initializedAt, new Date().toISOString());
    return {
      formatVersion: constants.backupReminderFormatVersion,
      baselineAt,
      lastSuccessfulAt: Object.prototype.hasOwnProperty.call(candidate, "lastSuccessfulAt")
        ? nullableIso(candidate.lastSuccessfulAt)
        : nullableIso(fallback.lastSuccessfulAt),
      snoozedUntil: Object.prototype.hasOwnProperty.call(candidate, "snoozedUntil")
        ? nullableIso(candidate.snoozedUntil)
        : nullableIso(fallback.snoozedUntil)
    };
  }

  function backupReminderIsDue(source, nowInput = Date.now()) {
    const reminder = normalizeBackupReminder(source, null, new Date(nowInput).toISOString());
    const now = nowInput instanceof Date ? nowInput.getTime() : Number(nowInput);
    const baseline = Date.parse(reminder.lastSuccessfulAt || reminder.baselineAt);
    const snoozedUntil = Date.parse(reminder.snoozedUntil || "");
    return Number.isFinite(now)
      && Number.isFinite(baseline)
      && now - baseline >= constants.backupReminderDelayMs
      && (!Number.isFinite(snoozedUntil) || now >= snoozedUntil);
  }

  function snoozeBackupReminder(source, nowInput = Date.now()) {
    const now = nowInput instanceof Date ? nowInput.getTime() : Number(nowInput);
    if (!Number.isFinite(now)) throw new PersistenceError("INVALID_DATA", "Der Zeitpunkt der Sicherungserinnerung ist ungültig.");
    return {
      ...normalizeBackupReminder(source, null, new Date(now).toISOString()),
      snoozedUntil: new Date(now + constants.backupReminderSnoozeMs).toISOString()
    };
  }

  function completeBackupReminder(source, nowInput = Date.now()) {
    const now = nowInput instanceof Date ? nowInput.getTime() : Number(nowInput);
    if (!Number.isFinite(now)) throw new PersistenceError("INVALID_DATA", "Der Zeitpunkt der erfolgreichen Sicherung ist ungültig.");
    return {
      ...normalizeBackupReminder(source, null, new Date(now).toISOString()),
      lastSuccessfulAt: new Date(now).toISOString(),
      snoozedUntil: null
    };
  }

  function decodeBase64Bytes(encoded) {
    if (typeof encoded !== "string"
      || !encoded.length
      || encoded.length % 4 !== 0
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new PersistenceError("INVALID_DATA", "Das gespeicherte Unternehmenslogo ist ungültig.");
    }
    try {
      const binary = globalThis.atob(encoded);
      return Uint8Array.from(binary, character => character.charCodeAt(0));
    } catch (cause) {
      throw new PersistenceError("INVALID_DATA", "Das gespeicherte Unternehmenslogo ist ungültig.", cause);
    }
  }

  function normalizeCompanyLogo(source) {
    if (source === undefined || source === null || source?.simulated === true) return null;
    if (!isPlainObject(source)) {
      throw new PersistenceError("INVALID_DATA", "Das gespeicherte Unternehmenslogo ist ungültig.");
    }
    if (!Number.isInteger(source.formatVersion) || source.formatVersion < 1) {
      throw new PersistenceError("INVALID_DATA", "Das gespeicherte Unternehmenslogo besitzt keine gültige Formatversion.");
    }
    if (source.formatVersion > constants.companyLogoFormatVersion) {
      throw new PersistenceError("UNSUPPORTED_FORMAT", "Dieses Unternehmenslogo benötigt eine neuere FRECKA-Version und wurde nicht verändert.");
    }
    const mimeType = trimmedString(source.mimeType).toLowerCase();
    if (!new Set(["image/png", "image/jpeg"]).has(mimeType)) {
      throw new PersistenceError("INVALID_DATA", "Als Unternehmenslogo sind ausschließlich PNG- und JPEG-Dateien zulässig.");
    }
    if (!Number.isInteger(source.size) || source.size < 1 || source.size > constants.companyLogoMaxBytes) {
      throw new PersistenceError("INVALID_DATA", "Das Unternehmenslogo darf maximal 1 MB groß sein.");
    }
    const prefix = `data:${mimeType};base64,`;
    if (typeof source.dataUrl !== "string"
      || !source.dataUrl.startsWith(prefix)
      || source.dataUrl.length > prefix.length + Math.ceil(constants.companyLogoMaxBytes / 3) * 4) {
      throw new PersistenceError("INVALID_DATA", "Das gespeicherte Unternehmenslogo ist ungültig.");
    }
    const bytes = decodeBase64Bytes(source.dataUrl.slice(prefix.length));
    if (bytes.length !== source.size || bytes.length > constants.companyLogoMaxBytes) {
      throw new PersistenceError("INVALID_DATA", "Die Größe des gespeicherten Unternehmenslogos ist ungültig.");
    }
    const isPng = bytes.length >= 20
      && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
      && [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82].every((value, index) => bytes[bytes.length - 8 + index] === value);
    const isJpeg = bytes.length >= 4
      && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
    if ((mimeType === "image/png" && !isPng) || (mimeType === "image/jpeg" && !isJpeg)) {
      throw new PersistenceError("INVALID_DATA", "Dateityp und Inhalt des Unternehmenslogos stimmen nicht überein.");
    }
    const id = trimmedString(source.id);
    const name = trimmedString(source.name);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id) || !name || name.length > 120) {
      throw new PersistenceError("INVALID_DATA", "Die Angaben zum gespeicherten Unternehmenslogo sind ungültig.");
    }
    const updatedAt = stableIso(source.updatedAt, "");
    if (updatedAt === epochIso) {
      throw new PersistenceError("INVALID_DATA", "Der Änderungszeitpunkt des Unternehmenslogos ist ungültig.");
    }
    return {
      formatVersion: constants.companyLogoFormatVersion,
      id,
      name,
      mimeType,
      size: bytes.length,
      dataUrl: source.dataUrl,
      updatedAt
    };
  }

  const generatedLocalLicenses = new Map();

  function createOpaqueLocalId(prefix) {
    const webCrypto = globalThis.crypto;
    if (typeof webCrypto?.randomUUID === "function") return `${prefix}_${webCrypto.randomUUID()}`;
    if (typeof webCrypto?.getRandomValues === "function") {
      const bytes = webCrypto.getRandomValues(new Uint8Array(16));
      return `${prefix}_${[...bytes].map(value => value.toString(16).padStart(2, "0")).join("")}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  }

  function generatedLocalLicense(expectedTenantId) {
    const safeTenantId = nullableStringId(expectedTenantId) || constants.tenantId;
    if (!generatedLocalLicenses.has(safeTenantId)) {
      const createdAt = new Date().toISOString();
      generatedLocalLicenses.set(safeTenantId, Object.freeze({
        formatVersion: constants.licenseFormatVersion,
        licenseId: createOpaqueLocalId("license"),
        tenantId: safeTenantId,
        deviceId: createOpaqueLocalId("device"),
        activatedAt: createdAt,
        lastValidation: createdAt
      }));
    }
    return cloneSafe(generatedLocalLicenses.get(safeTenantId));
  }

  function hasLicenseModelFields(value) {
    return isPlainObject(value) && [...licenseAllowedKeys].some(key => value[key] !== undefined);
  }

  function normalizeV1License(source, expectedTenantId, fallbackSource = null) {
    const safeTenantId = nullableStringId(expectedTenantId) || constants.tenantId;
    const sourceIsAbsent = source === undefined || source === null;
    const candidate = sourceIsAbsent
      ? hasLicenseModelFields(fallbackSource)
        ? fallbackSource
        : generatedLocalLicense(safeTenantId)
      : source;
    if (!isPlainObject(candidate)) {
      throw new PersistenceError("INVALID_DATA", "Die lokale Lizenz ist unvollständig.");
    }
    if (!Number.isInteger(candidate.formatVersion) || candidate.formatVersion < 1) {
      throw new PersistenceError("INVALID_DATA", "Die lokale Lizenz besitzt keine gültige Formatversion.");
    }
    if (candidate.formatVersion > constants.licenseFormatVersion) {
      throw new PersistenceError("UNSUPPORTED_FORMAT", "Diese Lizenzdaten benötigen eine neuere FRECKA-Version und wurden nicht verändert.");
    }
    const validOpaqueId = value => typeof value === "string"
      && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
    if (!validOpaqueId(candidate.licenseId) || !validOpaqueId(candidate.deviceId)) {
      throw new PersistenceError("INVALID_DATA", "Die lokale Lizenz- oder Gerätekennung ist ungültig.");
    }
    if (nullableStringId(candidate.tenantId) !== safeTenantId) {
      throw new PersistenceError("INVALID_DATA", "Die lokale Lizenz gehört zu einem anderen Mandanten.");
    }
    const activatedAt = stableIso(candidate.activatedAt, "");
    const lastValidation = stableIso(candidate.lastValidation, "");
    if (activatedAt === epochIso || lastValidation === epochIso || Date.parse(lastValidation) < Date.parse(activatedAt)) {
      throw new PersistenceError("INVALID_DATA", "Die lokalen Lizenzzeitpunkte sind ungültig.");
    }
    return {
      formatVersion: constants.licenseFormatVersion,
      licenseId: candidate.licenseId,
      tenantId: safeTenantId,
      deviceId: candidate.deviceId,
      activatedAt,
      lastValidation
    };
  }

  function normalizeV1User(source, expectedTenantId, fallbackDisplayName, fallbackTimestamp = epochIso) {
    const safeTenantId = nullableStringId(expectedTenantId) || constants.tenantId;
    const candidate = isPlainObject(source) ? source : {};
    const createdAt = stableIso(candidate.createdAt, fallbackTimestamp);
    const normalized = cloneSafe(mergePreservingUnknown(candidate, {
      formatVersion: constants.userFormatVersion,
      id: nullableStringId(candidate.id) || "user-primary",
      tenantId: safeTenantId,
      displayName: trimmedString(candidate.displayName, trimmedString(fallbackDisplayName, "Benutzer/in")),
      active: true,
      createdAt,
      updatedAt: stableIso(candidate.updatedAt, createdAt)
    }));
    Object.keys(normalized).forEach(key => {
      if (userForbiddenKeys.has(key.toLowerCase())) delete normalized[key];
    });
    return normalized;
  }

  function settingsWithLegacyUserModel(record, expectedTenantId) {
    if (!isPlainObject(record) || record.users !== undefined || record.activeUserId !== undefined) return record;
    const migrated = cloneSafe(record);
    const identity = companyIdentity(migrated.company);
    const timestamp = stableIso(migrated.updatedAt, epochIso);
    const user = normalizeV1User(null, expectedTenantId, identity.owner, timestamp);
    migrated.users = [user];
    migrated.activeUserId = user.id;
    return migrated;
  }

  function settingsWithLegacyLicenseModel(record, expectedTenantId) {
    if (!isPlainObject(record) || Object.prototype.hasOwnProperty.call(record, "license")) return record;
    const migrated = cloneSafe(record);
    migrated.license = generatedLocalLicense(expectedTenantId);
    return migrated;
  }

  const centsFrom = (centsValue, decimalValue = 0) => Number.isInteger(centsValue)
    ? centsValue
    : Math.round(finiteNumber(decimalValue) * 100);

  function customerMatchesSearch(customer, query) {
    if (!isPlainObject(customer)) return false;
    const normalizedQuery = trimmedString(query).toLocaleLowerCase("de-DE");
    if (!normalizedQuery) return true;
    const searchableText = [
      customer.firstName,
      customer.lastName,
      customer.companyName,
      customer.phone,
      customer.mobile,
      customer.email,
      customer.street,
      customer.postalCode,
      customer.zip,
      customer.city
    ].map(value => stringValue(value).toLocaleLowerCase("de-DE")).join(" ");
    if (searchableText.includes(normalizedQuery)) return true;
    const phoneQuery = normalizedQuery.replace(/[^0-9+]/g, "").replace(/(?!^)\+/g, "");
    if (!phoneQuery) return false;
    return [customer.phone, customer.mobile].some(value => (
      stringValue(value).replace(/[^0-9+]/g, "").replace(/(?!^)\+/g, "").includes(phoneQuery)
    ));
  }

  function snapshotSettings(runtimeData, setupStatus = "not-started", tenantId = constants.tenantId) {
    if (!runtimeData || !isPlainObject(runtimeData.company)) {
      throw new PersistenceError("INVALID_DATA", "Die zentralen Einstellungen sind nicht verfügbar.");
    }

    const safeTenantId = nullableStringId(tenantId) || constants.tenantId;
    const company = runtimeData.company;
    const identity = companyIdentity(company);
    const runtimeUsers = Array.isArray(runtimeData.users) ? runtimeData.users : [];
    if (runtimeUsers.length > 1) {
      throw new PersistenceError("INVALID_DATA", "FRECKA V1.0 unterstützt genau einen lokalen Benutzer.");
    }
    const submittedUser = runtimeUsers[0] || null;
    if (Number.isInteger(submittedUser?.formatVersion) && submittedUser.formatVersion > constants.userFormatVersion) {
      throw new PersistenceError("UNSUPPORTED_FORMAT", "Diese Benutzerdaten benötigen eine neuere FRECKA-Version und wurden nicht verändert.");
    }
    if (nullableStringId(submittedUser?.tenantId) && submittedUser.tenantId !== safeTenantId) {
      throw new PersistenceError("INVALID_DATA", "Der lokale Benutzer gehört zu einem anderen Mandanten.");
    }
    if (submittedUser?.active === false) {
      throw new PersistenceError("INVALID_DATA", "FRECKA V1.0 benötigt genau einen aktiven lokalen Benutzer.");
    }
    const user = normalizeV1User(submittedUser, safeTenantId, identity.owner);
    const runtimeActiveUserId = nullableStringId(runtimeData.userSettings?.activeUserId)
      || nullableStringId(runtimeData.activeUserId);
    if (runtimeActiveUserId && runtimeActiveUserId !== user.id) {
      throw new PersistenceError("INVALID_DATA", "Der aktive lokale Benutzer ist nicht eindeutig.");
    }
    const runtimeLicense = hasLicenseModelFields(runtimeData.license) ? runtimeData.license : null;
    const license = normalizeV1License(runtimeLicense, safeTenantId);
    const taxSettings = runtimeData.taxSettings || {};
    const receiptSettings = runtimeData.receiptSettings || {};
    const backupReminder = normalizeBackupReminder(runtimeData.backupReminder, null, new Date().toISOString());
    const snapshot = {
      formatVersion: constants.formatVersion,
      tenantId: safeTenantId,
      updatedAt: new Date().toISOString(),
      users: [user],
      activeUserId: user.id,
      license,
      company: {
        name: identity.name,
        owner: identity.owner,
        contactPerson: stringValue(company.contactPerson),
        street: stringValue(company.street),
        houseNumber: stringValue(company.houseNumber),
        zip: stringValue(company.zip),
        city: stringValue(company.city),
        country: stringValue(company.country, "Deutschland"),
        phone: stringValue(company.phone),
        email: stringValue(company.email),
        website: stringValue(company.website),
        taxNumber: stringValue(company.taxNumber),
        vatId: stringValue(company.vatId),
        logo: normalizeCompanyLogo(company.logo),
        updatedAt: stableIso(company.updatedAt, epochIso),
        defaultTaxRate: finiteNumber(company.defaultTaxRate, finiteNumber(taxSettings.defaultRate, 19)),
        useAsServiceLocation: company.useAsServiceLocation !== false
      },
      serviceLocations: (Array.isArray(runtimeData.serviceLocations) ? runtimeData.serviceLocations : []).map(location => ({
        id: location.id,
        name: stringValue(location.name),
        addressMode: location.addressMode === "own" ? "own" : "company",
        street: stringValue(location.street),
        houseNumber: stringValue(location.houseNumber),
        zip: stringValue(location.zip),
        city: stringValue(location.city),
        phone: stringValue(location.phone),
        voucherNote: stringValue(location.voucherNote),
        active: location.active !== false,
        businessAreaIds: uniqueStrings(location.businessAreaIds)
      })).filter(location => nullableStringId(location.id)),
      taxSettings: {
        status: ["vat", "small-business", "undecided"].includes(taxSettings.status) ? taxSettings.status : "undecided",
        rates: (Array.isArray(taxSettings.rates) ? taxSettings.rates : []).map(rate => ({
          id: rate.id,
          rate: finiteNumber(rate.rate),
          active: rate.active !== false
        })).filter(rate => nullableStringId(rate.id)),
        defaultRate: finiteNumber(taxSettings.defaultRate, 19)
      },
      receiptSettings: {
        yearPrefix: stringValue(receiptSettings.yearPrefix),
        nextNumber: Number.isInteger(receiptSettings.nextNumber) ? receiptSettings.nextNumber : 1,
        footerText: stringValue(receiptSettings.footerText),
        thankYouText: stringValue(receiptSettings.thankYouText),
        currency: stringValue(receiptSettings.currency, "EUR"),
        language: stringValue(receiptSettings.language, "Deutsch")
      },
      paymentChoices: (Array.isArray(runtimeData.paymentChoices) ? runtimeData.paymentChoices : []).map(choice => ({
        id: choice.id,
        title: stringValue(choice.title),
        icon: stringValue(choice.icon),
        active: choice.active !== false
      })).filter(choice => nullableStringId(choice.id)),
      businessAreas: (Array.isArray(runtimeData.businessAreas) ? runtimeData.businessAreas : []).map(area => ({
        id: area.id,
        label: stringValue(area.label, "Geschäftsbereich"),
        visibleName: stringValue(area.visibleName),
        logoMode: validLogoMode(area.logoMode),
        active: area.active !== false,
        isDefault: area.isDefault === true,
        defaultServiceLocationId: nullableStringId(area.defaultServiceLocationId)
      })).filter(area => nullableStringId(area.id)),
      backupReminder,
      setup: { status: validSetupStatus(typeof setupStatus === "string" ? setupStatus : setupStatus?.status) }
    };

    return cloneSafe(snapshot);
  }

  function snapshotCatalog(runtimeData, tenantId = constants.tenantId) {
    if (!runtimeData || !Array.isArray(runtimeData.categories) || !isPlainObject(runtimeData.catalog)) {
      throw new PersistenceError("INVALID_DATA", "Die zentralen Katalogdaten sind nicht verfügbar.");
    }

    const categories = runtimeData.categories.map(category => ({
      id: category.id,
      businessAreaId: category.businessAreaId,
      name: stringValue(category.name),
      type: ["service", "product"].includes(category.type) ? category.type : "service",
      active: category.active !== false,
      sortOrder: finiteNumber(category.sortOrder),
      source: category.source === "template" ? "template" : "manual",
      createdAt: stringValue(category.createdAt, epochIso),
      updatedAt: stringValue(category.updatedAt, stringValue(category.createdAt, epochIso))
    })).filter(category => nullableStringId(category.id) && nullableStringId(category.businessAreaId));

    const items = Object.entries(runtimeData.catalog).flatMap(([businessAreaId, entries]) => (
      Array.isArray(entries) ? entries : []
    ).filter(item => ["service", "product"].includes(item?.type)).map(item => {
      const type = item.type;
      const priceCents = nonNegativeInteger(item.priceCents, Math.max(0, Math.round(finiteNumber(item.price) * 100)));
      const record = {
        id: item.id,
        type,
        businessAreaId: nullableStringId(item.businessAreaId) || businessAreaId,
        categoryId: nullableStringId(item.categoryId),
        name: stringValue(item.name, stringValue(item.title, "Eintrag")),
        priceCents,
        taxRate: finiteNumber(item.taxRate),
        active: item.active !== false,
        favorite: item.favorite === true,
        sortOrder: finiteNumber(item.sortOrder),
        source: item.source === "template" ? "template" : "manual",
        needsReview: item.needsReview === true,
        priceConfirmed: item.priceConfirmed !== false,
        taxRateConfirmed: item.taxRateConfirmed !== false,
        description: stringValue(item.description),
        quantityAdjustable: type === "product" ? item.quantityAdjustable !== false : false,
        icon: stringValue(item.icon, type === "product" ? "▣" : "✦"),
        createdAt: stringValue(item.createdAt, epochIso),
        updatedAt: stringValue(item.updatedAt, stringValue(item.createdAt, epochIso))
      };
      if (type === "product") {
        record.sku = nullableStringId(item.sku);
        record.unit = stringValue(item.unit, "Stück");
      }
      return record;
    }).filter(item => nullableStringId(item.id) && nullableStringId(item.businessAreaId)));

    const templateImports = Object.entries(isPlainObject(runtimeData.templateImportStatus) ? runtimeData.templateImportStatus : {}).flatMap(([businessAreaId, status]) => {
      if (!isPlainObject(status) || !nullableStringId(status.templateKey) || !nullableStringId(businessAreaId)) return [];
      const categoryIds = uniqueStrings(status.categoryIds).length
        ? uniqueStrings(status.categoryIds)
        : categories.filter(category => category.businessAreaId === businessAreaId && category.source === "template").map(category => category.id);
      const itemIds = uniqueStrings(status.itemIds).length
        ? uniqueStrings(status.itemIds)
        : items.filter(item => item.businessAreaId === businessAreaId && item.source === "template").map(item => item.id);
      return [{
        templateId: status.templateKey,
        businessAreaId,
        importedAt: stringValue(status.importedAt, epochIso),
        lastCheckedAt: stringValue(status.lastCheckedAt, stringValue(status.importedAt, epochIso)),
        version: Number.isInteger(status.version) && status.version > 0 ? status.version : 1,
        status: status.status === "ready" ? "ready" : "needs-review",
        needsReviewCount: nonNegativeInteger(status.needsReviewCount),
        categoryIds,
        itemIds
      }];
    });

    return stripExcludedCatalogData({
      formatVersion: constants.catalogFormatVersion,
      tenantId: nullableStringId(tenantId) || constants.tenantId,
      updatedAt: new Date().toISOString(),
      categories,
      items,
      templateImports
    });
  }

  function snapshotCustomers(runtimeData, tenantId = constants.tenantId) {
    if (!runtimeData || !Array.isArray(runtimeData.customers)) {
      throw new PersistenceError("INVALID_DATA", "Die zentralen Kundendaten sind nicht verfügbar.");
    }

    const customers = runtimeData.customers.map(customer => ({
      id: customer.id,
      firstName: trimmedString(customer.firstName),
      lastName: trimmedString(customer.lastName),
      companyName: trimmedString(customer.companyName),
      street: trimmedString(customer.street),
      postalCode: trimmedString(customer.postalCode, trimmedString(customer.zip)),
      city: trimmedString(customer.city),
      phone: trimmedString(customer.phone),
      mobile: trimmedString(customer.mobile),
      email: trimmedString(customer.email),
      notes: trimmedString(customer.notes, trimmedString(customer.note)),
      active: customer.active !== false,
      createdAt: trimmedString(customer.createdAt, epochIso),
      updatedAt: trimmedString(customer.updatedAt, trimmedString(customer.createdAt, epochIso))
    })).filter(customer => nullableStringId(customer.id));

    return stripExcludedCustomersData({
      formatVersion: constants.customersFormatVersion,
      tenantId: nullableStringId(tenantId) || constants.tenantId,
      updatedAt: new Date().toISOString(),
      customers
    });
  }

  function normalizeReceiptPosition(position, fallbackTaxRate = 0) {
    const source = isPlainObject(position) ? position : {};
    const quantity = Math.max(0, finiteNumber(source.quantity, 1));
    const unitPriceCents = centsFrom(source.unitPriceCents, source.unitPrice);
    const originalUnitPriceCents = centsFrom(source.originalUnitPriceCents, source.originalUnitPrice ?? source.unitPrice);
    const totalCents = centsFrom(source.totalCents, source.total ?? (unitPriceCents * quantity) / 100);
    const originalTotalCents = centsFrom(source.originalTotalCents, source.originalTotal ?? (originalUnitPriceCents * quantity) / 100);
    const discountCents = Math.max(0, centsFrom(source.discountCents, source.discountTotal));
    const taxRate = finiteNumber(source.taxRate, fallbackTaxRate);
    const netCents = centsFrom(source.netCents, source.netTotal ?? totalCents / 100 / (1 + taxRate / 100));
    const taxCents = centsFrom(source.taxCents, source.taxAmount ?? (totalCents - netCents) / 100);
    const normalized = mergePreservingUnknown(source, {
      catalogItemId: nullableStringId(source.catalogItemId) || nullableStringId(source.id),
      type: ["service", "product", "voucher-sale"].includes(source.type) ? source.type : "service",
      name: stringValue(source.name, stringValue(source.title, "Position")),
      quantity,
      unitPriceCents,
      originalUnitPriceCents,
      totalCents,
      originalTotalCents,
      discountCents,
      discountLabel: stringValue(source.discountLabel),
      taxRate,
      netCents,
      taxCents,
      grossCents: totalCents,
      title: stringValue(source.title, stringValue(source.name, "Position")),
      unitPrice: unitPriceCents / 100,
      originalUnitPrice: originalUnitPriceCents / 100,
      total: totalCents / 100,
      originalTotal: originalTotalCents / 100,
      discountTotal: discountCents / 100,
      netTotal: netCents / 100,
      taxAmount: taxCents / 100
    });
    return cloneSafe(normalized);
  }

  function normalizeCompanySnapshot(source) {
    if (!isPlainObject(source)) return null;
    const identity = companyIdentity(source);
    return cloneSafe(mergePreservingUnknown(source, {
      name: identity.name,
      owner: identity.owner
    }));
  }

  function normalizeReceiptEntry(receipt, fallbackTimestamp = epochIso) {
    if (!isPlainObject(receipt)) return null;
    const number = trimmedString(receipt.receiptNumber, trimmedString(receipt.number));
    const receiptType = ["receipt", "cancellation", "credit"].includes(receipt.receiptType)
      ? receipt.receiptType
      : ["receipt", "cancellation", "credit"].includes(receipt.type) ? receipt.type : "receipt";
    const contextSnapshot = isPlainObject(receipt.contextSnapshot) ? cloneSafe(receipt.contextSnapshot) : {};
    const businessAreaSnapshot = isPlainObject(receipt.businessAreaSnapshot)
      ? cloneSafe(receipt.businessAreaSnapshot)
      : isPlainObject(contextSnapshot.businessArea) ? cloneSafe(contextSnapshot.businessArea) : null;
    const serviceLocationSnapshot = isPlainObject(receipt.serviceLocationSnapshot)
      ? cloneSafe(receipt.serviceLocationSnapshot)
      : isPlainObject(contextSnapshot.serviceLocation) ? cloneSafe(contextSnapshot.serviceLocation) : null;
    const companySnapshot = isPlainObject(receipt.companySnapshot)
      ? normalizeCompanySnapshot(receipt.companySnapshot)
      : isPlainObject(contextSnapshot.company) ? normalizeCompanySnapshot(contextSnapshot.company) : null;
    const brandingSnapshot = isPlainObject(receipt.brandingSnapshot)
      ? cloneSafe(receipt.brandingSnapshot)
      : isPlainObject(contextSnapshot.branding) ? cloneSafe(contextSnapshot.branding) : null;
    const customerSnapshot = isPlainObject(receipt.customerSnapshot)
      ? cloneSafe(receipt.customerSnapshot)
      : isPlainObject(receipt.customer) ? cloneSafe(receipt.customer) : null;
    const createdAt = stableIso(receipt.createdAt, stableIso(receipt.sortKey, fallbackTimestamp));
    const completedAt = stableIso(receipt.completedAt, createdAt);
    const updatedAt = stableIso(receipt.updatedAt, completedAt);
    const sourcePositions = Array.isArray(receipt.positions) ? receipt.positions : Array.isArray(receipt.items) ? receipt.items : [];
    const positions = sourcePositions.map(position => normalizeReceiptPosition(position)).filter(Boolean);
    const positionsSubtotalCents = positions.reduce((sum, position) => sum + position.originalTotalCents, 0);
    const positionsTotalCents = positions.reduce((sum, position) => sum + position.totalCents, 0);
    const positionsDiscountCents = positions.reduce((sum, position) => sum + position.discountCents, 0);
    const positionsNetCents = positions.reduce((sum, position) => sum + position.netCents, 0);
    const positionsTaxCents = positions.reduce((sum, position) => sum + position.taxCents, 0);
    const subtotalCents = centsFrom(receipt.subtotalCents, receipt.originalTotal ?? positionsSubtotalCents / 100);
    const totalCents = centsFrom(receipt.totalCents, receipt.total ?? positionsTotalCents / 100);
    const discountCents = Math.max(0, centsFrom(receipt.discountCents, receipt.discountTotal ?? positionsDiscountCents / 100));
    const netTotalCents = centsFrom(receipt.netTotalCents, receipt.netTotal ?? positionsNetCents / 100);
    const taxTotalCents = centsFrom(receipt.taxTotalCents, receipt.taxTotal ?? positionsTaxCents / 100);
    const sourceTaxBreakdown = Array.isArray(receipt.taxBreakdown) ? receipt.taxBreakdown : Array.isArray(receipt.taxGroups) ? receipt.taxGroups : [];
    const taxBreakdown = sourceTaxBreakdown.map(group => ({
      rate: finiteNumber(group?.rate),
      netCents: centsFrom(group?.netCents, group?.net),
      taxCents: centsFrom(group?.taxCents, group?.tax),
      grossCents: centsFrom(group?.grossCents, group?.gross)
    }));
    if (!taxBreakdown.length && positions.length) {
      const groups = new Map();
      positions.forEach(position => {
        const key = String(position.taxRate);
        const group = groups.get(key) || { rate: position.taxRate, netCents: 0, taxCents: 0, grossCents: 0 };
        group.netCents += position.netCents;
        group.taxCents += position.taxCents;
        group.grossCents += position.totalCents;
        groups.set(key, group);
      });
      taxBreakdown.push(...groups.values());
    }
    const paymentEvents = (Array.isArray(receipt.paymentEvents) ? receipt.paymentEvents : []).filter(isPlainObject).map(event => ({
      ...cloneSafe(event),
      recordedAt: stableIso(event.recordedAt, completedAt),
      amountCents: centsFrom(event.amountCents, event.amount),
      amount: centsFrom(event.amountCents, event.amount) / 100
    }));
    const sourceActivities = Array.isArray(receipt.activities) ? receipt.activities : Array.isArray(receipt.activity) ? receipt.activity : [];
    const activities = sourceActivities.filter(isPlainObject).map(activity => ({
      ...cloneSafe(activity),
      occurredAt: stableIso(activity.occurredAt, updatedAt)
    }));
    const originalReference = nullableStringId(receipt.reference)
      || nullableStringId(receipt.references?.originalReceiptNumber);
    const references = {
      ...(isPlainObject(receipt.references) ? cloneSafe(receipt.references) : {}),
      originalReceiptNumber: originalReference,
      correctionNumbers: uniqueStrings(receipt.references?.correctionNumbers)
    };
    const voucherReference = nullableStringId(receipt.voucherReference)
      || nullableStringId(receipt.voucherPayment?.reference);
    const voucherPayment = isPlainObject(receipt.voucherPayment) ? {
      reference: nullableStringId(receipt.voucherPayment.reference),
      code: stringValue(receipt.voucherPayment.code),
      amountCents: centsFrom(receipt.voucherPayment.amountCents, receipt.voucherPayment.amount),
      balanceBeforeCents: centsFrom(receipt.voucherPayment.balanceBeforeCents, receipt.voucherPayment.balanceBefore),
      balanceAfterCents: centsFrom(receipt.voucherPayment.balanceAfterCents, receipt.voucherPayment.balanceAfter),
      amount: centsFrom(receipt.voucherPayment.amountCents, receipt.voucherPayment.amount) / 100,
      balanceBefore: centsFrom(receipt.voucherPayment.balanceBeforeCents, receipt.voucherPayment.balanceBefore) / 100,
      balanceAfter: centsFrom(receipt.voucherPayment.balanceAfterCents, receipt.voucherPayment.balanceAfter) / 100
    } : null;
    const id = nullableStringId(receipt.id) || (number ? `receipt_${number.replace(/[^A-Za-z0-9]+/g, "_")}` : null);
    if (!id || !number) return null;

    const normalized = mergePreservingUnknown(receipt, {
      id,
      receiptNumber: number,
      number,
      receiptType,
      type: receiptType,
      status: trimmedString(receipt.status, receiptType === "receipt" ? "completed" : receiptType === "cancellation" ? "cancelled" : "credited"),
      businessAreaId: nullableStringId(receipt.businessAreaId) || nullableStringId(businessAreaSnapshot?.id),
      businessAreaSnapshot,
      serviceLocationId: nullableStringId(receipt.serviceLocationId) || nullableStringId(serviceLocationSnapshot?.id),
      serviceLocationSnapshot,
      companySnapshot,
      brandingSnapshot,
      contextSnapshot: {
        ...contextSnapshot,
        company: companySnapshot,
        businessArea: businessAreaSnapshot,
        serviceLocation: serviceLocationSnapshot,
        branding: brandingSnapshot
      },
      customerId: nullableStringId(receipt.customerId) || nullableStringId(customerSnapshot?.id),
      customerSnapshot,
      customer: customerSnapshot,
      positions,
      items: positions,
      subtotalCents,
      discountCents,
      netTotalCents,
      taxTotalCents,
      totalCents,
      originalTotal: subtotalCents / 100,
      discountTotal: discountCents / 100,
      netTotal: netTotalCents / 100,
      taxTotal: taxTotalCents / 100,
      total: totalCents / 100,
      taxBreakdown,
      taxGroups: taxBreakdown.map(group => ({ rate: group.rate, net: group.netCents / 100, tax: group.taxCents / 100, gross: group.grossCents / 100 })),
      paymentStatus: receipt.paymentStatus === "open" ? "open" : "paid",
      paymentMethod: nullableStringId(receipt.paymentMethod) || nullableStringId(receipt.payment),
      payment: nullableStringId(receipt.paymentMethod) || nullableStringId(receipt.payment),
      paymentRecordedAt: receipt.paymentStatus === "open" ? null : stableIso(receipt.paymentRecordedAt, completedAt),
      paymentEvents,
      activities,
      activity: activities,
      note: stringValue(receipt.note, stringValue(receipt.internalNote)),
      internalNote: stringValue(receipt.internalNote, stringValue(receipt.note)),
      createdAt,
      completedAt,
      updatedAt,
      references,
      reference: originalReference,
      voucherReference,
      voucherPayment
    });
    receiptForbiddenKeys.forEach(key => { delete normalized[key]; });
    return cloneSafe(normalized);
  }

  function snapshotReceipts(runtimeData, tenantId = constants.tenantId) {
    if (!runtimeData || !Array.isArray(runtimeData.receipts)) {
      throw new PersistenceError("INVALID_DATA", "Die zentralen Belegdaten sind nicht verfügbar.");
    }
    const now = new Date().toISOString();
    return stripExcludedReceiptsData({
      formatVersion: constants.receiptsFormatVersion,
      tenantId: nullableStringId(tenantId) || constants.tenantId,
      updatedAt: now,
      receipts: runtimeData.receipts.map(receipt => normalizeReceiptEntry(receipt, now)).filter(Boolean)
    });
  }

  function normalizeReceiptsRecord(rawRecord, defaultsInput, expectedTenantId = constants.tenantId) {
    if (!isPlainObject(defaultsInput)) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Belegdaten sind nicht verfügbar.");
    }
    const defaults = Array.isArray(defaultsInput.receipts)
      ? cloneSafe(defaultsInput)
      : snapshotReceipts(defaultsInput, expectedTenantId);
    if (!Array.isArray(defaults?.receipts)) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Belegdaten sind unvollständig.");
    }
    const raw = rawRecord == null ? defaults : rawRecord;
    if (!isPlainObject(raw)) {
      throw new PersistenceError("INVALID_DATA", "Der gespeicherte Belegdatensatz ist ungültig.");
    }
    const repairs = new Set();
    const diagnostics = [];
    if (rawRecord == null) repairs.add("RECEIPTS_DEFAULTED");
    const rawFormatVersion = raw.formatVersion == null ? constants.receiptsFormatVersion : raw.formatVersion;
    if (!Number.isInteger(rawFormatVersion) || rawFormatVersion < 1) {
      throw new PersistenceError("INVALID_DATA", "Die gespeicherten Belege besitzen keine gültige Formatversion.");
    }
    if (rawFormatVersion !== constants.receiptsFormatVersion) {
      throw new PersistenceError(
        "UNSUPPORTED_FORMAT",
        rawFormatVersion > constants.receiptsFormatVersion
          ? "Die gespeicherten Belege stammen aus einer neueren FRECKA-Version und wurden nicht verändert."
          : "Für diese ältere Belegformatversion ist noch keine Migration verfügbar."
      );
    }
    if (raw.formatVersion == null) repairs.add("FORMAT_VERSION_ADDED");
    const source = Array.isArray(raw.receipts) ? raw.receipts : defaults.receipts;
    if (!Array.isArray(raw.receipts)) repairs.add("RECEIPTS_DEFAULTED");
    const seenIds = new Map();
    const seenNumbers = new Map();
    const receipts = source.flatMap(entry => {
      const normalized = normalizeReceiptEntry(entry, raw.updatedAt || epochIso);
      if (!normalized) {
        repairs.add("RECEIPT_REMOVED");
        diagnostics.push({
          invariant: "RECEIPT_IDENTITY_INVALID",
          receipts: [diagnosticReceiptView(entry)]
        });
        return [];
      }
      if (seenIds.has(normalized.id) || seenNumbers.has(normalized.number)) {
        repairs.add("RECEIPT_DUPLICATE_REMOVED");
        diagnostics.push({
          invariant: "RECEIPT_ID_OR_NUMBER_DUPLICATE",
          duplicateFields: [
            ...(seenIds.has(normalized.id) ? ["id"] : []),
            ...(seenNumbers.has(normalized.number) ? ["number"] : [])
          ],
          receipts: uniqueDiagnosticRecords([
            seenIds.get(normalized.id),
            seenNumbers.get(normalized.number),
            normalized
          ], diagnosticReceiptView)
        });
        return [];
      }
      seenIds.set(normalized.id, normalized);
      seenNumbers.set(normalized.number, normalized);
      return [normalized];
    });
    return {
      record: stripExcludedReceiptsData(mergePreservingUnknown(raw, {
        formatVersion: constants.receiptsFormatVersion,
        tenantId: nullableStringId(expectedTenantId) || constants.tenantId,
        updatedAt: stableIso(raw.updatedAt, epochIso),
        receipts
      })),
      repairs: [...repairs],
      diagnostics
    };
  }

  const voucherHistoryTypes = new Set(["sold", "partial_redemption", "full_redemption", "cancelled", "credit"]);
  const normalizedVoucherCode = value => trimmedString(value).toLocaleUpperCase("de-DE").replace(/[^A-Z0-9]/g, "");

  function germanDateTimeIso(date, time, fallback = epochIso) {
    const match = trimmedString(date).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    const timeMatch = trimmedString(time).match(/^(\d{2}):(\d{2})$/);
    if (!match) return stableIso(fallback);
    const [, day, month, year] = match;
    const hour = timeMatch?.[1] || "00";
    const minute = timeMatch?.[2] || "00";
    return stableIso(`${year}-${month}-${day}T${hour}:${minute}:00.000Z`, fallback);
  }

  function assertVoucherValueRange(voucher, message = "Der Gutschein besitzt einen ungültigen Restwert.") {
    const issuedValueCents = centsFrom(voucher?.issuedValueCents, voucher?.issuedValue);
    const currentValueCents = centsFrom(voucher?.currentValueCents, voucher?.currentValue);
    if (!Number.isInteger(issuedValueCents) || issuedValueCents <= 0
      || !Number.isInteger(currentValueCents) || currentValueCents < 0
      || currentValueCents > issuedValueCents) {
      throw new PersistenceError("INVALID_VOUCHER_VALUE", message);
    }
    return { issuedValueCents, currentValueCents };
  }

  function assertUniqueVoucherSources(vouchers) {
    const seenIds = new Set();
    const seenReferences = new Set();
    const seenCodes = new Set();
    (Array.isArray(vouchers) ? vouchers : []).forEach(voucher => {
      const id = nullableStringId(voucher?.id);
      const reference = nullableStringId(voucher?.reference);
      const code = normalizedVoucherCode(voucher?.code);
      if (!reference || !code) throw new PersistenceError("INVALID_DATA", "Ein Gutschein besitzt keine stabile Referenz oder keinen sichtbaren Code.");
      if ((id && seenIds.has(id)) || seenReferences.has(reference) || seenCodes.has(code)) {
        throw new PersistenceError("VOUCHER_DUPLICATE", "Ein Gutschein mit derselben ID, Referenz oder demselben Code ist bereits vorhanden.");
      }
      if (id) seenIds.add(id);
      seenReferences.add(reference);
      seenCodes.add(code);
      assertVoucherValueRange(voucher);
    });
  }

  function normalizeVoucherHistoryEntry(entry, reference, index, issuedValueCents, previousOccurredAt, fallbackTimestamp) {
    if (!isPlainObject(entry)) return null;
    const type = voucherHistoryTypes.has(entry.type) ? entry.type : null;
    if (!type) return null;
    const parsedOccurredAt = stableIso(
      entry.occurredAt,
      germanDateTimeIso(entry.date, entry.time, fallbackTimestamp)
    );
    const occurredAt = Date.parse(parsedOccurredAt) < Date.parse(previousOccurredAt)
      ? previousOccurredAt
      : parsedOccurredAt;
    const amountCents = Math.max(0, centsFrom(entry.amountCents, entry.amount));
    const balanceAfterCents = Math.min(
      issuedValueCents,
      Math.max(0, centsFrom(entry.balanceAfterCents, entry.balanceAfter))
    );
    const safeReference = reference.replace(/[^A-Za-z0-9]+/g, "_");
    return cloneSafe(mergePreservingUnknown(entry, {
      id: nullableStringId(entry.id) || `voucher_history_${safeReference}_${index + 1}`,
      type,
      occurredAt,
      date: stringValue(entry.date),
      time: stringValue(entry.time),
      amountCents,
      amount: amountCents / 100,
      balanceAfterCents,
      balanceAfter: balanceAfterCents / 100,
      receiptReference: nullableStringId(entry.receiptReference) || nullableStringId(entry.receiptNumber),
      receiptNumber: trimmedString(entry.receiptNumber, trimmedString(entry.receiptReference))
    }));
  }

  function normalizeVoucherEntry(voucher, fallbackTimestamp = epochIso) {
    if (!isPlainObject(voucher)) return null;
    const reference = nullableStringId(voucher.reference);
    const code = trimmedString(voucher.code);
    const normalizedCode = normalizedVoucherCode(code);
    if (!reference || !normalizedCode) return null;
    const issuedValueCents = centsFrom(voucher.issuedValueCents, voucher.issuedValue);
    if (!Number.isInteger(issuedValueCents) || issuedValueCents <= 0) return null;
    const requestedCurrentValueCents = centsFrom(voucher.currentValueCents, voucher.currentValue);
    const currentValueCents = Math.min(issuedValueCents, Math.max(0, requestedCurrentValueCents));
    const soldAtIso = stableIso(
      voucher.soldAtIso,
      stableIso(voucher.saleReceipt?.soldAt, germanDateTimeIso(voucher.soldAt, voucher.soldTime, fallbackTimestamp))
    );
    const customerSnapshot = isPlainObject(voucher.customerSnapshot)
      ? cloneSafe(voucher.customerSnapshot)
      : isPlainObject(voucher.customer) ? cloneSafe(voucher.customer) : null;
    const contextSnapshot = isPlainObject(voucher.contextSnapshot) ? cloneSafe(voucher.contextSnapshot) : {};
    const companySnapshot = isPlainObject(voucher.companySnapshot)
      ? normalizeCompanySnapshot(voucher.companySnapshot)
      : isPlainObject(contextSnapshot.company) ? normalizeCompanySnapshot(contextSnapshot.company) : null;
    const brandingSnapshot = isPlainObject(voucher.brandingSnapshot)
      ? cloneSafe(voucher.brandingSnapshot)
      : isPlainObject(contextSnapshot.branding) ? cloneSafe(contextSnapshot.branding) : null;
    const businessAreaSnapshot = isPlainObject(voucher.businessAreaSnapshot)
      ? cloneSafe(voucher.businessAreaSnapshot)
      : isPlainObject(contextSnapshot.businessArea) ? cloneSafe(contextSnapshot.businessArea) : null;
    const serviceLocationSnapshot = isPlainObject(voucher.serviceLocationSnapshot)
      ? cloneSafe(voucher.serviceLocationSnapshot)
      : isPlainObject(contextSnapshot.serviceLocation) ? cloneSafe(contextSnapshot.serviceLocation) : null;
    const history = [];
    let previousOccurredAt = epochIso;
    (Array.isArray(voucher.history) ? voucher.history : []).forEach((entry, index) => {
      const normalized = normalizeVoucherHistoryEntry(entry, reference, index, issuedValueCents, previousOccurredAt, soldAtIso);
      if (!normalized) return;
      history.push(normalized);
      previousOccurredAt = normalized.occurredAt;
    });
    const createdAt = stableIso(voucher.createdAt, soldAtIso);
    const updatedAt = stableIso(voucher.updatedAt, history.at(-1)?.occurredAt || createdAt);
    const derivedStatus = currentValueCents <= 0
      ? voucher.status === "cancelled" ? "cancelled" : "redeemed"
      : currentValueCents < issuedValueCents ? "partially_redeemed" : "active";
    const saleReceipt = isPlainObject(voucher.saleReceipt) ? cloneSafe(voucher.saleReceipt) : {};
    const redemptionReferences = uniqueStrings([
      ...(Array.isArray(voucher.redemptionReferences) ? voucher.redemptionReferences : []),
      ...history.filter(entry => entry.type !== "sold").map(entry => entry.receiptReference || entry.receiptNumber)
    ]);
    const id = nullableStringId(voucher.id) || `voucher_${reference.replace(/[^A-Za-z0-9]+/g, "_")}`;
    const normalized = mergePreservingUnknown(voucher, {
      id,
      reference,
      code,
      normalizedCode,
      status: derivedStatus,
      issuedValueCents,
      issuedValue: issuedValueCents / 100,
      currentValueCents,
      currentValue: currentValueCents / 100,
      soldAt: stringValue(voucher.soldAt),
      soldTime: stringValue(voucher.soldTime),
      soldAtIso,
      saleReceipt: {
        ...saleReceipt,
        id: nullableStringId(saleReceipt.id),
        number: trimmedString(saleReceipt.number),
        reference: nullableStringId(saleReceipt.reference) || nullableStringId(saleReceipt.id) || nullableStringId(saleReceipt.number),
        soldAt: stableIso(saleReceipt.soldAt, soldAtIso),
        customerId: nullableStringId(saleReceipt.customerId) || nullableStringId(customerSnapshot?.id)
      },
      saleReceiptReference: nullableStringId(voucher.saleReceiptReference)
        || nullableStringId(saleReceipt.id)
        || nullableStringId(saleReceipt.number),
      redemptionReferences,
      history,
      companySnapshot,
      brandingSnapshot,
      businessAreaId: nullableStringId(voucher.businessAreaId) || nullableStringId(businessAreaSnapshot?.id),
      businessAreaSnapshot,
      serviceLocationId: nullableStringId(voucher.serviceLocationId) || nullableStringId(serviceLocationSnapshot?.id),
      serviceLocationSnapshot,
      contextSnapshot: {
        ...contextSnapshot,
        company: companySnapshot,
        branding: brandingSnapshot,
        businessArea: businessAreaSnapshot,
        serviceLocation: serviceLocationSnapshot
      },
      customerId: nullableStringId(voucher.customerId) || nullableStringId(customerSnapshot?.id),
      customerSnapshot,
      customer: customerSnapshot,
      qrReference: nullableStringId(voucher.qrReference) || reference,
      qrLink: trimmedString(voucher.qrLink, trimmedString(voucher.appLink)),
      createdAt,
      updatedAt
    });
    voucherForbiddenKeys.forEach(key => { delete normalized[key]; });
    return cloneSafe(normalized);
  }

  function snapshotVouchers(runtimeData, tenantId = constants.tenantId) {
    if (!runtimeData || !Array.isArray(runtimeData.vouchers)) {
      throw new PersistenceError("INVALID_DATA", "Die zentralen Gutscheindaten sind nicht verfügbar.");
    }
    assertUniqueVoucherSources(runtimeData.vouchers);
    const now = new Date().toISOString();
    return stripExcludedVouchersData({
      formatVersion: constants.vouchersFormatVersion,
      tenantId: nullableStringId(tenantId) || constants.tenantId,
      updatedAt: now,
      vouchers: runtimeData.vouchers.map(voucher => normalizeVoucherEntry(voucher, now)).filter(Boolean)
    });
  }

  function normalizeVouchersRecord(rawRecord, defaultsInput, expectedTenantId = constants.tenantId) {
    if (!isPlainObject(defaultsInput)) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Gutscheindaten sind nicht verfügbar.");
    }
    const defaults = Array.isArray(defaultsInput.vouchers)
      ? cloneSafe(defaultsInput)
      : snapshotVouchers(defaultsInput, expectedTenantId);
    if (!Array.isArray(defaults?.vouchers)) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Gutscheindaten sind unvollständig.");
    }
    const raw = rawRecord == null ? defaults : rawRecord;
    if (!isPlainObject(raw)) throw new PersistenceError("INVALID_DATA", "Der gespeicherte Gutscheindatensatz ist ungültig.");
    const rawFormatVersion = raw.formatVersion == null ? constants.vouchersFormatVersion : raw.formatVersion;
    if (!Number.isInteger(rawFormatVersion) || rawFormatVersion < 1) {
      throw new PersistenceError("INVALID_DATA", "Die gespeicherten Gutscheine besitzen keine gültige Formatversion.");
    }
    if (rawFormatVersion !== constants.vouchersFormatVersion) {
      throw new PersistenceError(
        "UNSUPPORTED_FORMAT",
        rawFormatVersion > constants.vouchersFormatVersion
          ? "Die gespeicherten Gutscheine stammen aus einer neueren FRECKA-Version und wurden nicht verändert."
          : "Für diese ältere Gutscheinformatversion ist noch keine Migration verfügbar."
      );
    }
    const repairs = new Set();
    const diagnostics = [];
    if (rawRecord == null) repairs.add("VOUCHERS_DEFAULTED");
    const source = Array.isArray(raw.vouchers) ? raw.vouchers : defaults.vouchers;
    if (!Array.isArray(raw.vouchers)) repairs.add("VOUCHERS_DEFAULTED");
    const seenIds = new Map();
    const seenReferences = new Map();
    const seenCodes = new Map();
    const vouchers = source.flatMap(entry => {
      const normalized = normalizeVoucherEntry(entry, raw.updatedAt || epochIso);
      if (!normalized) {
        repairs.add("VOUCHER_REMOVED");
        diagnostics.push({
          invariant: "VOUCHER_IDENTITY_INVALID",
          vouchers: [diagnosticVoucherView(entry)]
        });
        return [];
      }
      if (centsFrom(entry.currentValueCents, entry.currentValue) !== normalized.currentValueCents) repairs.add("VOUCHER_BALANCE_REPAIRED");
      if (seenIds.has(normalized.id) || seenReferences.has(normalized.reference) || seenCodes.has(normalized.normalizedCode)) {
        repairs.add("VOUCHER_DUPLICATE_REMOVED");
        diagnostics.push({
          invariant: "VOUCHER_ID_REFERENCE_OR_CODE_DUPLICATE",
          duplicateFields: [
            ...(seenIds.has(normalized.id) ? ["id"] : []),
            ...(seenReferences.has(normalized.reference) ? ["reference"] : []),
            ...(seenCodes.has(normalized.normalizedCode) ? ["code"] : [])
          ],
          vouchers: uniqueDiagnosticRecords([
            seenIds.get(normalized.id),
            seenReferences.get(normalized.reference),
            seenCodes.get(normalized.normalizedCode),
            normalized
          ], diagnosticVoucherView)
        });
        return [];
      }
      seenIds.set(normalized.id, normalized);
      seenReferences.set(normalized.reference, normalized);
      seenCodes.set(normalized.normalizedCode, normalized);
      return [normalized];
    });
    return {
      record: stripExcludedVouchersData(mergePreservingUnknown(raw, {
        formatVersion: constants.vouchersFormatVersion,
        tenantId: nullableStringId(expectedTenantId) || constants.tenantId,
        updatedAt: stableIso(raw.updatedAt, epochIso),
        vouchers
      })),
      repairs: [...repairs],
      diagnostics
    };
  }

  function diagnosticReceiptView(receipt) {
    return {
      id: nullableStringId(receipt?.id),
      number: trimmedString(receipt?.number || receipt?.receiptNumber),
      receiptKind: trimmedString(receipt?.receiptKind),
      voucherReference: nullableStringId(receipt?.voucherReference),
      createdAt: trimmedString(receipt?.createdAt),
      completedAt: trimmedString(receipt?.completedAt)
    };
  }

  function diagnosticHistoryView(entry) {
    return {
      id: nullableStringId(entry?.id),
      type: trimmedString(entry?.type),
      receiptReference: nullableStringId(entry?.receiptReference),
      receiptNumber: trimmedString(entry?.receiptNumber),
      occurredAt: trimmedString(entry?.occurredAt)
    };
  }

  function diagnosticVoucherView(voucher, includeHistory = false) {
    const saleReceipt = isPlainObject(voucher?.saleReceipt) ? voucher.saleReceipt : {};
    const history = Array.isArray(voucher?.history) ? voucher.history : [];
    return {
      id: nullableStringId(voucher?.id),
      reference: nullableStringId(voucher?.reference),
      code: trimmedString(voucher?.code),
      saleReceiptReference: nullableStringId(voucher?.saleReceiptReference),
      saleReceipt: {
        id: nullableStringId(saleReceipt.id),
        number: trimmedString(saleReceipt.number)
      },
      createdAt: trimmedString(voucher?.createdAt),
      soldAtIso: trimmedString(voucher?.soldAtIso),
      ...(includeHistory ? {
        historyReferences: history.slice(0, 50).map(diagnosticHistoryView),
        historyReferencesTruncated: Math.max(0, history.length - 50)
      } : {})
    };
  }

  function uniqueDiagnosticRecords(records, projector) {
    const seen = new Set();
    return (Array.isArray(records) ? records : []).filter(Boolean).flatMap(record => {
      const projected = projector(record);
      const key = JSON.stringify(projected);
      if (seen.has(key)) return [];
      seen.add(key);
      return [projected];
    });
  }

  function voucherReceiptDiagnostic(invariant, { vouchers = [], receipts = [], details = {} } = {}) {
    return {
      invariant,
      vouchers: uniqueDiagnosticRecords(vouchers, voucher => diagnosticVoucherView(voucher)),
      receipts: uniqueDiagnosticRecords(receipts, diagnosticReceiptView),
      ...cloneSafe(details)
    };
  }

  function voucherHistoryDiagnostic(invariant, voucher, entries = []) {
    return {
      invariant,
      vouchers: [diagnosticVoucherView(voucher, true)],
      historyEntries: uniqueDiagnosticRecords(entries, diagnosticHistoryView)
    };
  }

  function voucherReceiptInvariantError(message, invariant = "VOUCHER_RECEIPT_INVARIANT_INVALID", context = {}) {
    return new PersistenceError(
      "VOUCHER_RECEIPT_INVARIANT_INVALID",
      message,
      null,
      voucherReceiptDiagnostic(invariant, context)
    );
  }

  function voucherReceiptFinding(message, invariant, context = {}) {
    return Object.freeze({
      code: "VOUCHER_RECEIPT_INVARIANT_INVALID",
      userMessage: message,
      diagnostic: voucherReceiptDiagnostic(invariant, context)
    });
  }

  function inspectVoucherReceiptInvariant(receiptsInput, vouchersInput) {
    const receipts = Array.isArray(receiptsInput)
      ? receiptsInput
      : receiptsInput?.receipts;
    const vouchers = Array.isArray(vouchersInput)
      ? vouchersInput
      : vouchersInput?.vouchers;
    const findings = [];
    const addFinding = (message, invariant, context = {}) => {
      findings.push(voucherReceiptFinding(message, invariant, context));
    };
    if (!Array.isArray(receipts) || !Array.isArray(vouchers)) {
      addFinding(
        "Die Gutschein-Verkaufsbelege konnten nicht vollständig geprüft werden.",
        "VOUCHER_RECEIPT_INPUT_INCOMPLETE"
      );
      return Object.freeze({
        findings: Object.freeze(findings),
        summary: Object.freeze({ vouchersWithSaleReceipt: 0, voucherSaleReceipts: 0 })
      });
    }

    const receiptById = new Map();
    const receiptByNumber = new Map();
    receipts.forEach(receipt => {
      const id = nullableStringId(receipt?.id);
      const number = trimmedString(receipt?.number);
      if (!id || !number) {
        addFinding(
          "Ein Beleg besitzt keine eindeutige ID oder Belegnummer.",
          "RECEIPT_IDENTITY_MISSING",
          { receipts: [receipt] }
        );
        return;
      }
      if (receiptById.has(id) || receiptByNumber.has(number)) {
        addFinding(
          `Die Beleg-ID oder Belegnummer ${number} ist mehrfach vorhanden.`,
          "RECEIPT_ID_OR_NUMBER_DUPLICATE",
          {
            receipts: [receiptById.get(id), receiptByNumber.get(number), receipt],
            details: {
              duplicateFields: [
                ...(receiptById.has(id) ? ["id"] : []),
                ...(receiptByNumber.has(number) ? ["number"] : [])
              ]
            }
          }
        );
        return;
      }
      receiptById.set(id, receipt);
      receiptByNumber.set(number, receipt);
    });

    const voucherByReference = new Map();
    vouchers.forEach(voucher => {
      const reference = nullableStringId(voucher?.reference);
      if (!reference) {
        addFinding(
          "Ein Gutschein besitzt keine eindeutige Referenz.",
          "VOUCHER_REFERENCE_MISSING",
          { vouchers: [voucher] }
        );
        return;
      }
      if (voucherByReference.has(reference)) {
        addFinding(
          `Die Gutscheinreferenz ${reference} ist mehrfach vorhanden.`,
          "VOUCHER_REFERENCE_DUPLICATE",
          { vouchers: [voucherByReference.get(reference), voucher] }
        );
        return;
      }
      voucherByReference.set(reference, voucher);
    });

    const receiptOwnerById = new Map();
    const receiptOwnerByNumber = new Map();
    vouchers.forEach(voucher => {
      const reference = nullableStringId(voucher.reference);
      const code = trimmedString(voucher.code, reference);
      const saleReceipt = isPlainObject(voucher.saleReceipt) ? voucher.saleReceipt : {};
      const saleReceiptId = nullableStringId(saleReceipt.id);
      const saleReceiptNumber = trimmedString(saleReceipt.number);
      const canonicalReference = nullableStringId(voucher.saleReceiptReference);
      const hasSaleReceiptReference = Boolean(canonicalReference || saleReceiptId || saleReceiptNumber);
      if (!hasSaleReceiptReference) return;
      if (!saleReceiptId || !saleReceiptNumber) {
        addFinding(
          `Der Gutschein ${code} besitzt keine vollständige Verkaufsbeleg-ID und Belegnummer.`,
          "VOUCHER_SALE_RECEIPT_IDENTITY_INCOMPLETE",
          { vouchers: [voucher] }
        );
        return;
      }
      if (canonicalReference !== saleReceiptId) {
        addFinding(
          `Der Gutschein ${code} enthält eine widersprüchliche Verkaufsbelegreferenz.`,
          "VOUCHER_SALE_RECEIPT_REFERENCE_MISMATCH",
          { vouchers: [voucher] }
        );
        return;
      }

      const receiptByCanonicalId = receiptById.get(saleReceiptId);
      const receiptByCanonicalNumber = receiptByNumber.get(saleReceiptNumber);
      if (!receiptByCanonicalId || !receiptByCanonicalNumber) {
        addFinding(
          `Der Gutschein ${code} verweist auf den nicht vollständig gespeicherten Verkaufsbeleg ${saleReceiptNumber || saleReceiptId}.`,
          "VOUCHER_SALE_RECEIPT_NOT_FOUND",
          {
            vouchers: [voucher],
            receipts: [receiptByCanonicalId, receiptByCanonicalNumber],
            details: {
              missingById: !receiptByCanonicalId,
              missingByNumber: !receiptByCanonicalNumber
            }
          }
        );
        return;
      }
      if (receiptByCanonicalId !== receiptByCanonicalNumber) {
        addFinding(
          `Beim Gutschein ${code} bezeichnen Verkaufsbeleg-ID und Belegnummer unterschiedliche Belege.`,
          "VOUCHER_SALE_RECEIPT_ID_NUMBER_MISMATCH",
          { vouchers: [voucher], receipts: [receiptByCanonicalId, receiptByCanonicalNumber] }
        );
        return;
      }
      if (receiptByCanonicalId.receiptKind !== "voucher-sale") {
        addFinding(
          `Der Verkaufsbeleg ${saleReceiptNumber} des Gutscheins ${code} besitzt nicht die Belegart Gutscheinverkauf.`,
          "VOUCHER_SALE_RECEIPT_KIND_INVALID",
          { vouchers: [voucher], receipts: [receiptByCanonicalId] }
        );
      }
      if (nullableStringId(receiptByCanonicalId.voucherReference) !== reference) {
        addFinding(
          `Der Verkaufsbeleg ${saleReceiptNumber} enthält nicht die passende Gegenreferenz zum Gutschein ${code}.`,
          "VOUCHER_SALE_RECEIPT_COUNTER_REFERENCE_MISMATCH",
          { vouchers: [voucher], receipts: [receiptByCanonicalId] }
        );
      }
      if (receiptOwnerById.has(saleReceiptId) || receiptOwnerByNumber.has(saleReceiptNumber)) {
        const previousReference = receiptOwnerById.get(saleReceiptId) || receiptOwnerByNumber.get(saleReceiptNumber);
        addFinding(
          `Der Verkaufsbeleg ${saleReceiptNumber} ist mehr als einem Gutschein zugeordnet.`,
          "VOUCHER_SALE_RECEIPT_MULTIPLE_OWNERS",
          {
            vouchers: [voucherByReference.get(previousReference), voucher],
            receipts: [receiptByCanonicalId]
          }
        );
      }
      receiptOwnerById.set(saleReceiptId, reference);
      receiptOwnerByNumber.set(saleReceiptNumber, reference);
    });

    receipts.filter(receipt => receipt.receiptKind === "voucher-sale").forEach(receipt => {
      const reference = nullableStringId(receipt.voucherReference);
      const number = trimmedString(receipt.number);
      const voucher = reference ? voucherByReference.get(reference) : null;
      if (!voucher) {
        addFinding(
          `Der Gutscheinverkaufsbeleg ${number} verweist auf keinen vorhandenen Gutschein.`,
          "VOUCHER_SALE_RECEIPT_ORPHANED",
          { receipts: [receipt] }
        );
        return;
      }
      const saleReceipt = isPlainObject(voucher.saleReceipt) ? voucher.saleReceipt : {};
      if (nullableStringId(voucher.saleReceiptReference) !== nullableStringId(receipt.id)
        || nullableStringId(saleReceipt.id) !== nullableStringId(receipt.id)
        || trimmedString(saleReceipt.number) !== number) {
        addFinding(
          `Der Gutscheinverkaufsbeleg ${number} ist im zugehörigen Gutschein nicht eindeutig gegengezeichnet.`,
          "VOUCHER_SALE_RECEIPT_NOT_COUNTERSIGNED",
          { vouchers: [voucher], receipts: [receipt] }
        );
      }
    });

    return Object.freeze({
      findings: Object.freeze(findings),
      summary: Object.freeze({
        vouchersWithSaleReceipt: receiptOwnerById.size,
        voucherSaleReceipts: receipts.filter(receipt => receipt.receiptKind === "voucher-sale").length
      })
    });
  }

  function validateVoucherReceiptInvariant(receiptsInput, vouchersInput) {
    const inspection = inspectVoucherReceiptInvariant(receiptsInput, vouchersInput);
    const finding = inspection.findings[0];
    if (finding) {
      throw new PersistenceError(finding.code, finding.userMessage, null, finding.diagnostic);
    }
    return inspection.summary;
  }

  function validateVoucherCommitInvariant(mode, receipt, voucher) {
    if (mode === "sale") {
      return validateVoucherReceiptInvariant([receipt], [voucher]);
    }

    const historyEntry = voucher.history.find(entry => (
      nullableStringId(entry.receiptReference) === receipt.id
      && trimmedString(entry.receiptNumber) === receipt.number
    ));
    const redemptionReceipt = voucher.redemptionReceipts.find(entry => (
      nullableStringId(entry.id) === receipt.id
      && trimmedString(entry.number) === receipt.number
    ));
    if (receipt.receiptKind === "voucher-sale"
      || nullableStringId(receipt.voucherReference) !== voucher.reference
      || nullableStringId(receipt.voucherPayment?.reference) !== voucher.reference
      || !historyEntry
      || !redemptionReceipt
      || !voucher.redemptionReferences.includes(receipt.number)) {
      throw voucherReceiptInvariantError(`Die Einlösung auf Beleg ${receipt.number} ist im Gutschein ${voucher.code} nicht eindeutig gegengezeichnet.`);
    }
    return Object.freeze({ redemptionReceiptId: receipt.id, voucherReference: voucher.reference });
  }

  function normalizeCustomersRecord(rawRecord, defaultsInput, expectedTenantId = constants.tenantId) {
    if (!isPlainObject(defaultsInput)) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Kundendaten sind nicht verfügbar.");
    }
    const defaults = Array.isArray(defaultsInput.customers)
      ? cloneSafe(defaultsInput)
      : snapshotCustomers(defaultsInput, expectedTenantId);
    if (!Array.isArray(defaults?.customers)) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Kundendaten sind unvollständig.");
    }
    const raw = rawRecord == null ? defaults : rawRecord;
    if (!isPlainObject(raw)) {
      throw new PersistenceError("INVALID_DATA", "Der gespeicherte Kundendatensatz ist ungültig.");
    }

    const repairs = new Set();
    if (rawRecord == null) repairs.add("CUSTOMERS_DEFAULTED");
    const hasFormatVersion = raw.formatVersion != null;
    if (hasFormatVersion && (typeof raw.formatVersion !== "number" || !Number.isInteger(raw.formatVersion) || raw.formatVersion < 1)) {
      throw new PersistenceError("INVALID_DATA", "Die gespeicherten Kundendaten besitzen keine gültige Formatversion.");
    }
    const rawFormatVersion = hasFormatVersion ? raw.formatVersion : constants.customersFormatVersion;
    if (rawFormatVersion !== constants.customersFormatVersion) {
      throw new PersistenceError(
        "UNSUPPORTED_FORMAT",
        rawFormatVersion > constants.customersFormatVersion
          ? "Die gespeicherten Kundendaten stammen aus einer neueren FRECKA-Version und wurden nicht verändert."
          : "Für diese ältere Kundenformatversion ist noch keine Migration verfügbar."
      );
    }
    if (!hasFormatVersion) repairs.add("FORMAT_VERSION_ADDED");

    const defaultById = new Map(defaults.customers.filter(customer => nullableStringId(customer.id)).map(customer => [customer.id, customer]));
    const source = Array.isArray(raw.customers) ? raw.customers : defaults.customers;
    if (!Array.isArray(raw.customers)) repairs.add("CUSTOMERS_DEFAULTED");
    const seenIds = new Set();
    const customers = source.flatMap(entry => {
      if (!isPlainObject(entry) || !nullableStringId(entry.id)) {
        repairs.add("CUSTOMER_REMOVED");
        return [];
      }
      if (seenIds.has(entry.id)) {
        repairs.add("CUSTOMER_DUPLICATE_REMOVED");
        return [];
      }
      seenIds.add(entry.id);
      const fallback = defaultById.get(entry.id) || {};
      const firstName = trimmedString(entry.firstName, trimmedString(fallback.firstName));
      const lastName = trimmedString(entry.lastName, trimmedString(fallback.lastName));
      if (!firstName || !lastName) repairs.add("CUSTOMER_NAME_REPAIRED");
      return [{
        id: entry.id,
        firstName: firstName || "Unbekannt",
        lastName: lastName || "Unbekannt",
        companyName: trimmedString(entry.companyName, trimmedString(fallback.companyName)),
        street: trimmedString(entry.street, trimmedString(fallback.street)),
        postalCode: trimmedString(entry.postalCode, trimmedString(entry.zip, trimmedString(fallback.postalCode, trimmedString(fallback.zip)))),
        city: trimmedString(entry.city, trimmedString(fallback.city)),
        phone: trimmedString(entry.phone, trimmedString(fallback.phone)),
        mobile: trimmedString(entry.mobile, trimmedString(fallback.mobile)),
        email: trimmedString(entry.email, trimmedString(fallback.email)),
        notes: trimmedString(entry.notes, trimmedString(entry.note, trimmedString(fallback.notes, trimmedString(fallback.note)))),
        active: booleanValue(entry.active, fallback.active !== false),
        createdAt: trimmedString(entry.createdAt, trimmedString(fallback.createdAt, epochIso)),
        updatedAt: trimmedString(entry.updatedAt, trimmedString(fallback.updatedAt, trimmedString(entry.createdAt, epochIso)))
      }];
    });

    const normalizedKnownFields = {
      formatVersion: constants.customersFormatVersion,
      tenantId: nullableStringId(expectedTenantId) || constants.tenantId,
      updatedAt: trimmedString(raw.updatedAt),
      customers
    };
    return {
      record: stripExcludedCustomersData(mergePreservingUnknown(raw, normalizedKnownFields)),
      repairs: [...repairs]
    };
  }

  function normalizeCatalogRecord(rawRecord, defaultsInput, businessAreasInput = [], expectedTenantId = constants.tenantId) {
    if (!isPlainObject(defaultsInput)) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Katalogdaten sind nicht verfügbar.");
    }
    const defaults = Array.isArray(defaultsInput.categories) && Array.isArray(defaultsInput.items)
      ? cloneSafe(defaultsInput)
      : snapshotCatalog(defaultsInput, expectedTenantId);
    if (!Array.isArray(defaults?.categories) || !Array.isArray(defaults?.items) || !Array.isArray(defaults?.templateImports)) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Katalogdaten sind unvollständig.");
    }
    const raw = rawRecord == null ? defaults : rawRecord;
    if (!isPlainObject(raw)) {
      throw new PersistenceError("INVALID_DATA", "Der gespeicherte Katalogdatensatz ist ungültig.");
    }

    const repairs = new Set();
    if (rawRecord == null) repairs.add("CATALOG_DEFAULTED");
    const hasFormatVersion = raw.formatVersion != null;
    if (hasFormatVersion && (typeof raw.formatVersion !== "number" || !Number.isInteger(raw.formatVersion) || raw.formatVersion < 1)) {
      throw new PersistenceError("INVALID_DATA", "Der gespeicherte Katalog besitzt keine gültige Formatversion.");
    }
    const rawFormatVersion = hasFormatVersion ? raw.formatVersion : constants.catalogFormatVersion;
    if (rawFormatVersion !== constants.catalogFormatVersion) {
      throw new PersistenceError(
        "UNSUPPORTED_FORMAT",
        rawFormatVersion > constants.catalogFormatVersion
          ? "Der gespeicherte Katalog stammt aus einer neueren FRECKA-Version und wurde nicht verändert."
          : "Für diese ältere Katalogformatversion ist noch keine Migration verfügbar."
      );
    }
    if (!hasFormatVersion) repairs.add("FORMAT_VERSION_ADDED");

    const businessAreaIds = new Set((Array.isArray(businessAreasInput) ? businessAreasInput : [])
      .map(area => typeof area === "string" ? area : area?.id)
      .filter(nullableStringId));
    const defaultCategoryByKey = new Map(defaults.categories.map(category => [`${category.businessAreaId}\u0000${category.id}`, category]));
    const categorySource = Array.isArray(raw.categories) ? raw.categories : defaults.categories;
    if (!Array.isArray(raw.categories)) repairs.add("CATEGORIES_DEFAULTED");
    const seenCategoryIds = new Set();
    const categories = categorySource.flatMap((entry, index) => {
      if (!isPlainObject(entry) || !nullableStringId(entry.id) || !nullableStringId(entry.businessAreaId)) {
        repairs.add("CATEGORY_REMOVED");
        return [];
      }
      const key = `${entry.businessAreaId}\u0000${entry.id}`;
      if (seenCategoryIds.has(entry.id)) {
        repairs.add("CATEGORY_DUPLICATE_REMOVED");
        return [];
      }
      seenCategoryIds.add(entry.id);
      const fallback = defaultCategoryByKey.get(key) || {};
      const areaExists = businessAreaIds.has(entry.businessAreaId);
      if (!areaExists) repairs.add("CATEGORY_BUSINESS_AREA_MISSING");
      return [{
        id: entry.id,
        businessAreaId: entry.businessAreaId,
        name: stringValue(entry.name, stringValue(fallback.name, "Kategorie")),
        type: ["service", "product"].includes(entry.type) ? entry.type : (["service", "product"].includes(fallback.type) ? fallback.type : "service"),
        active: areaExists && booleanValue(entry.active, fallback.active !== false),
        sortOrder: finiteNumber(entry.sortOrder, finiteNumber(fallback.sortOrder, (index + 1) * 10)),
        source: entry.source === "template" ? "template" : (fallback.source === "template" ? "template" : "manual"),
        createdAt: stringValue(entry.createdAt, stringValue(fallback.createdAt, epochIso)),
        updatedAt: stringValue(entry.updatedAt, stringValue(fallback.updatedAt, stringValue(entry.createdAt, epochIso)))
      }];
    });

    const categoryByKey = new Map(categories.map(category => [`${category.businessAreaId}\u0000${category.id}`, category]));
    const defaultItemByKey = new Map(defaults.items.map(item => [`${item.businessAreaId}\u0000${item.id}`, item]));
    const itemSource = Array.isArray(raw.items) ? raw.items : defaults.items;
    if (!Array.isArray(raw.items)) repairs.add("ITEMS_DEFAULTED");
    const seenItemKeys = new Set();
    const items = itemSource.flatMap((entry, index) => {
      if (!isPlainObject(entry) || !nullableStringId(entry.id) || !nullableStringId(entry.businessAreaId) || !["service", "product"].includes(entry.type)) {
        repairs.add("ITEM_REMOVED");
        return [];
      }
      const key = `${entry.businessAreaId}\u0000${entry.id}`;
      if (seenItemKeys.has(key)) {
        repairs.add("ITEM_DUPLICATE_REMOVED");
        return [];
      }
      seenItemKeys.add(key);
      const fallback = defaultItemByKey.get(key) || {};
      const areaExists = businessAreaIds.has(entry.businessAreaId);
      if (!areaExists) repairs.add("ITEM_BUSINESS_AREA_MISSING");
      let categoryId = nullableStringId(entry.categoryId);
      const category = categoryId ? categoryByKey.get(`${entry.businessAreaId}\u0000${categoryId}`) : null;
      if (categoryId && (!category || category.type !== entry.type)) {
        categoryId = null;
        repairs.add("ITEM_CATEGORY_REPAIRED");
      }
      const fallbackPrice = nonNegativeInteger(fallback.priceCents);
      const priceCents = nonNegativeInteger(entry.priceCents, fallbackPrice);
      if (priceCents !== entry.priceCents) repairs.add("ITEM_PRICE_REPAIRED");
      const fallbackTaxRate = finiteNumber(fallback.taxRate);
      const requestedTaxRate = finiteNumber(entry.taxRate, fallbackTaxRate);
      const taxRate = requestedTaxRate >= 0 && requestedTaxRate <= 100 ? requestedTaxRate : fallbackTaxRate;
      if (taxRate !== entry.taxRate) repairs.add("ITEM_TAX_RATE_REPAIRED");
      const item = {
        id: entry.id,
        type: entry.type,
        businessAreaId: entry.businessAreaId,
        categoryId,
        name: stringValue(entry.name, stringValue(fallback.name, "Eintrag")),
        priceCents,
        taxRate,
        active: areaExists && booleanValue(entry.active, fallback.active !== false),
        favorite: booleanValue(entry.favorite, fallback.favorite === true),
        sortOrder: finiteNumber(entry.sortOrder, finiteNumber(fallback.sortOrder, (index + 1) * 10)),
        source: entry.source === "template" ? "template" : (fallback.source === "template" ? "template" : "manual"),
        needsReview: booleanValue(entry.needsReview, fallback.needsReview === true),
        priceConfirmed: booleanValue(entry.priceConfirmed, fallback.priceConfirmed !== false),
        taxRateConfirmed: booleanValue(entry.taxRateConfirmed, fallback.taxRateConfirmed !== false),
        description: stringValue(entry.description, stringValue(fallback.description)),
        quantityAdjustable: entry.type === "product" && booleanValue(entry.quantityAdjustable, fallback.quantityAdjustable !== false),
        icon: stringValue(entry.icon, stringValue(fallback.icon, entry.type === "product" ? "▣" : "✦")),
        createdAt: stringValue(entry.createdAt, stringValue(fallback.createdAt, epochIso)),
        updatedAt: stringValue(entry.updatedAt, stringValue(fallback.updatedAt, stringValue(entry.createdAt, epochIso)))
      };
      if (entry.type === "product") {
        item.sku = nullableStringId(entry.sku);
        item.unit = stringValue(entry.unit, stringValue(fallback.unit, "Stück"));
      }
      return [item];
    });

    const itemByKey = new Map(items.map(item => [`${item.businessAreaId}\u0000${item.id}`, item]));
    const importSource = Array.isArray(raw.templateImports) ? raw.templateImports : defaults.templateImports;
    if (!Array.isArray(raw.templateImports)) repairs.add("TEMPLATE_IMPORTS_DEFAULTED");
    const seenImportAreas = new Set();
    const templateImports = importSource.flatMap(entry => {
      if (!isPlainObject(entry) || !nullableStringId(entry.templateId) || !nullableStringId(entry.businessAreaId)) {
        repairs.add("TEMPLATE_IMPORT_REMOVED");
        return [];
      }
      if (seenImportAreas.has(entry.businessAreaId)) {
        repairs.add("TEMPLATE_IMPORT_DUPLICATE_REMOVED");
        return [];
      }
      seenImportAreas.add(entry.businessAreaId);
      if (!businessAreaIds.has(entry.businessAreaId)) repairs.add("TEMPLATE_IMPORT_BUSINESS_AREA_MISSING");
      const categoryIds = uniqueStrings(entry.categoryIds).filter(id => categoryByKey.has(`${entry.businessAreaId}\u0000${id}`));
      const itemIds = uniqueStrings(entry.itemIds).filter(id => itemByKey.has(`${entry.businessAreaId}\u0000${id}`));
      const needsReviewCount = items.filter(item => item.businessAreaId === entry.businessAreaId && item.active && item.needsReview).length;
      return [{
        templateId: entry.templateId,
        businessAreaId: entry.businessAreaId,
        importedAt: stringValue(entry.importedAt, epochIso),
        lastCheckedAt: stringValue(entry.lastCheckedAt, stringValue(entry.importedAt, epochIso)),
        version: Number.isInteger(entry.version) && entry.version > 0 ? entry.version : 1,
        status: needsReviewCount ? "needs-review" : "ready",
        needsReviewCount,
        categoryIds,
        itemIds
      }];
    });

    const normalizedKnownFields = {
      formatVersion: constants.catalogFormatVersion,
      tenantId: nullableStringId(expectedTenantId) || constants.tenantId,
      updatedAt: stringValue(raw.updatedAt),
      categories,
      items,
      templateImports
    };
    return {
      record: stripExcludedCatalogData(mergePreservingUnknown(raw, normalizedKnownFields)),
      repairs: [...repairs]
    };
  }

  function normalizeSettingsRecord(rawRecord, defaultsInput, expectedTenantId = constants.tenantId) {
    if (!isPlainObject(defaultsInput)) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Einstellungen sind nicht verfügbar.");
    }
    const defaults = defaultsInput.formatVersion
      ? cloneSafe(defaultsInput)
      : snapshotSettings(defaultsInput, "not-started", expectedTenantId);
    if (!isPlainObject(defaults?.company)
      || !Array.isArray(defaults?.businessAreas)
      || !defaults.businessAreas.some(area => isPlainObject(area) && nullableStringId(area.id))) {
      throw new PersistenceError("INVALID_DATA", "Die sicheren Standard-Einstellungen sind unvollständig.");
    }
    const raw = rawRecord == null ? {} : rawRecord;
    if (!isPlainObject(raw)) {
      throw new PersistenceError("INVALID_DATA", "Der gespeicherte Einstellungsdatensatz ist ungültig.");
    }

    const repairs = new Set();
    const hasFormatVersion = raw.formatVersion != null;
    if (hasFormatVersion && (typeof raw.formatVersion !== "number" || !Number.isInteger(raw.formatVersion) || raw.formatVersion < 1)) {
      throw new PersistenceError("INVALID_DATA", "Die gespeicherten Einstellungen besitzen keine gültige Formatversion.");
    }
    const rawFormatVersion = hasFormatVersion ? raw.formatVersion : constants.formatVersion;
    if (rawFormatVersion > constants.formatVersion) {
      throw new PersistenceError(
        "UNSUPPORTED_FORMAT",
        "Die gespeicherten Einstellungen stammen aus einer neueren FRECKA-Version und wurden nicht verändert."
      );
    }
    if (!hasFormatVersion) repairs.add("FORMAT_VERSION_ADDED");
    else if (rawFormatVersion !== constants.formatVersion) {
      throw new PersistenceError("UNSUPPORTED_FORMAT", "Für diese ältere Einstellungsformatversion ist noch keine Migration verfügbar.");
    }

    const defaultCompany = defaults.company || {};
    const rawCompany = isPlainObject(raw.company) ? raw.company : {};
    if (!isPlainObject(raw.company)) repairs.add("COMPANY_DEFAULTED");
    const submittedCompanyName = stringValue(rawCompany.name, stringValue(defaultCompany.name)).trim();
    const submittedCompanyOwner = stringValue(rawCompany.owner).trim();
    const fallbackCompanyOwner = stringValue(defaultCompany.owner).trim();
    const identity = companyIdentity({
      name: submittedCompanyName,
      owner: submittedCompanyOwner || submittedCompanyName || fallbackCompanyOwner
    });
    if (!submittedCompanyOwner) repairs.add("COMPANY_OWNER_REPAIRED");
    if (submittedCompanyName && !identity.name) repairs.add("COMPANY_DUPLICATE_NAME_REMOVED");
    const company = {
      name: identity.name,
      owner: identity.owner,
      contactPerson: stringValue(rawCompany.contactPerson, stringValue(defaultCompany.contactPerson)),
      street: stringValue(rawCompany.street, stringValue(defaultCompany.street)),
      houseNumber: stringValue(rawCompany.houseNumber, stringValue(defaultCompany.houseNumber)),
      zip: stringValue(rawCompany.zip, stringValue(defaultCompany.zip)),
      city: stringValue(rawCompany.city, stringValue(defaultCompany.city)),
      country: stringValue(rawCompany.country, stringValue(defaultCompany.country, "Deutschland")),
      phone: stringValue(rawCompany.phone, stringValue(defaultCompany.phone)),
      email: stringValue(rawCompany.email, stringValue(defaultCompany.email)),
      website: stringValue(rawCompany.website, stringValue(defaultCompany.website)),
      taxNumber: stringValue(rawCompany.taxNumber, stringValue(defaultCompany.taxNumber)),
      vatId: stringValue(rawCompany.vatId, stringValue(defaultCompany.vatId)),
      logo: normalizeCompanyLogo(Object.prototype.hasOwnProperty.call(rawCompany, "logo") ? rawCompany.logo : defaultCompany.logo),
      updatedAt: stableIso(rawCompany.updatedAt, raw.updatedAt || defaultCompany.updatedAt || defaults.updatedAt),
      defaultTaxRate: finiteNumber(rawCompany.defaultTaxRate, finiteNumber(defaultCompany.defaultTaxRate, 19)),
      useAsServiceLocation: booleanValue(rawCompany.useAsServiceLocation, defaultCompany.useAsServiceLocation !== false)
    };

    const safeTenantId = nullableStringId(expectedTenantId) || constants.tenantId;
    const defaultUserSource = Array.isArray(defaults.users) && defaults.users.length === 1
      ? defaults.users[0]
      : null;
    const defaultUser = normalizeV1User(defaultUserSource, safeTenantId, identity.owner, defaults.updatedAt);
    const rawUsers = Array.isArray(raw.users) ? raw.users : null;
    if (!rawUsers) repairs.add("USER_MODEL_DEFAULTED");
    else if (rawUsers.length > 1) {
      throw new PersistenceError("UNSUPPORTED_FORMAT", "Diese Benutzerdaten benötigen eine neuere FRECKA-Version und wurden nicht verändert.");
    } else if (rawUsers.length !== 1) repairs.add("USER_COUNT_REPAIRED");
    const submittedUser = rawUsers?.length === 1 ? rawUsers[0] : null;
    if (Number.isInteger(submittedUser?.formatVersion) && submittedUser.formatVersion > constants.userFormatVersion) {
      throw new PersistenceError("UNSUPPORTED_FORMAT", "Diese Benutzerdaten benötigen eine neuere FRECKA-Version und wurden nicht verändert.");
    }
    const user = normalizeV1User(submittedUser, safeTenantId, identity.owner, raw.updatedAt || defaultUser.createdAt);
    if (!isPlainObject(submittedUser)
      || submittedUser.formatVersion !== constants.userFormatVersion
      || nullableStringId(submittedUser.id) !== user.id
      || nullableStringId(submittedUser.tenantId) !== safeTenantId
      || trimmedString(submittedUser.displayName) !== user.displayName
      || submittedUser.active !== true
      || stableIso(submittedUser.createdAt, "") !== user.createdAt
      || stableIso(submittedUser.updatedAt, "") !== user.updatedAt) {
      repairs.add("USER_MODEL_REPAIRED");
    }
    const activeUserId = user.id;
    if (nullableStringId(raw.activeUserId) !== user.id) repairs.add("ACTIVE_USER_REPAIRED");

    const defaultLicense = normalizeV1License(defaults.license, safeTenantId);
    const rawHasLicense = hasLicenseModelFields(raw.license);
    const license = normalizeV1License(raw.license, safeTenantId, defaultLicense);
    if (!rawHasLicense) repairs.add("LICENSE_MODEL_DEFAULTED");
    else if (!sameSerializableValue(projectKnownFields(raw.license, license), license)) {
      repairs.add("LICENSE_MODEL_REPAIRED");
    }

    const defaultAreaById = new Map((defaults.businessAreas || []).map(area => [area.id, area]));
    let areaSource = Array.isArray(raw.businessAreas) ? raw.businessAreas : defaults.businessAreas || [];
    if (!Array.isArray(raw.businessAreas)) repairs.add("BUSINESS_AREAS_DEFAULTED");
    const seenAreaIds = new Set();
    let businessAreas = areaSource.flatMap(entry => {
      if (!isPlainObject(entry) || !nullableStringId(entry.id) || seenAreaIds.has(entry.id)) {
        repairs.add("BUSINESS_AREA_REMOVED");
        return [];
      }
      seenAreaIds.add(entry.id);
      const fallback = defaultAreaById.get(entry.id) || {};
      return [{
        id: entry.id,
        label: stringValue(entry.label, stringValue(fallback.label, "Geschäftsbereich")),
        visibleName: stringValue(entry.visibleName, stringValue(fallback.visibleName)),
        logoMode: ["company", "custom", "none"].includes(entry.logoMode) ? entry.logoMode : validLogoMode(fallback.logoMode),
        active: booleanValue(entry.active, fallback.active !== false),
        isDefault: booleanValue(entry.isDefault, fallback.isDefault === true),
        defaultServiceLocationId: nullableStringId(entry.defaultServiceLocationId)
      }];
    });
    if (!businessAreas.length) {
      repairs.add("BUSINESS_AREAS_RESTORED");
      businessAreas = cloneSafe(defaults.businessAreas || []);
    }
    if (!businessAreas.some(area => area.active)) {
      businessAreas[0].active = true;
      repairs.add("ACTIVE_BUSINESS_AREA_RESTORED");
    }
    const activeDefault = businessAreas.find(area => area.active && area.isDefault)
      || businessAreas.find(area => area.active && defaultAreaById.get(area.id)?.isDefault)
      || businessAreas.find(area => area.active);
    businessAreas.forEach(area => { area.isDefault = area.id === activeDefault?.id; });
    if (!areaSource.some(area => area?.active !== false && area?.isDefault === true) || areaSource.filter(area => area?.active !== false && area?.isDefault === true).length !== 1) {
      repairs.add("DEFAULT_BUSINESS_AREA_REPAIRED");
    }

    const businessAreaIds = new Set(businessAreas.map(area => area.id));
    const defaultLocationById = new Map((defaults.serviceLocations || []).map(location => [location.id, location]));
    const locationSource = Array.isArray(raw.serviceLocations) ? raw.serviceLocations : defaults.serviceLocations || [];
    if (!Array.isArray(raw.serviceLocations)) repairs.add("SERVICE_LOCATIONS_DEFAULTED");
    const seenLocationIds = new Set();
    let serviceLocations = locationSource.flatMap(entry => {
      if (!isPlainObject(entry) || !nullableStringId(entry.id) || seenLocationIds.has(entry.id)) {
        repairs.add("SERVICE_LOCATION_REMOVED");
        return [];
      }
      seenLocationIds.add(entry.id);
      const fallback = defaultLocationById.get(entry.id) || {};
      const submittedAreaIds = Array.isArray(entry.businessAreaIds) ? entry.businessAreaIds : fallback.businessAreaIds || [];
      const normalizedAreaIds = uniqueStrings(submittedAreaIds).filter(id => businessAreaIds.has(id));
      if (normalizedAreaIds.length !== uniqueStrings(submittedAreaIds).length) repairs.add("SERVICE_LOCATION_ASSIGNMENTS_REPAIRED");
      return [{
        id: entry.id,
        name: stringValue(entry.name, stringValue(fallback.name, "Leistungsort")),
        addressMode: entry.addressMode === "own" || entry.addressMode === "company" ? entry.addressMode : (fallback.addressMode === "own" ? "own" : "company"),
        street: stringValue(entry.street, stringValue(fallback.street)),
        houseNumber: stringValue(entry.houseNumber, stringValue(fallback.houseNumber)),
        zip: stringValue(entry.zip, stringValue(fallback.zip)),
        city: stringValue(entry.city, stringValue(fallback.city)),
        phone: stringValue(entry.phone, stringValue(fallback.phone)),
        voucherNote: stringValue(entry.voucherNote, stringValue(fallback.voucherNote)),
        active: booleanValue(entry.active, fallback.active !== false),
        businessAreaIds: normalizedAreaIds
      }];
    });
    if (!serviceLocations.length && (defaults.serviceLocations || []).length) {
      repairs.add("SERVICE_LOCATIONS_RESTORED");
      serviceLocations = cloneSafe(defaults.serviceLocations).map(location => ({
        ...location,
        businessAreaIds: uniqueStrings(location.businessAreaIds).filter(id => businessAreaIds.has(id))
      }));
    }

    const usableLocationForArea = (location, areaId) => location.active !== false
      && location.businessAreaIds.includes(areaId)
      && (location.addressMode !== "company" || company.useAsServiceLocation !== false);
    businessAreas.forEach(area => {
      const currentDefault = serviceLocations.find(location => location.id === area.defaultServiceLocationId);
      if (currentDefault && usableLocationForArea(currentDefault, area.id)) return;
      const fallback = serviceLocations.find(location => usableLocationForArea(location, area.id)) || null;
      if (area.defaultServiceLocationId !== fallback?.id) repairs.add("DEFAULT_SERVICE_LOCATION_REPAIRED");
      area.defaultServiceLocationId = fallback?.id || null;
    });

    const defaultTaxSettings = defaults.taxSettings || {};
    const rawTaxSettings = isPlainObject(raw.taxSettings) ? raw.taxSettings : {};
    if (!isPlainObject(raw.taxSettings)) repairs.add("TAX_SETTINGS_DEFAULTED");
    const defaultRateById = new Map((defaultTaxSettings.rates || []).map(rate => [rate.id, rate]));
    const rawRates = Array.isArray(rawTaxSettings.rates) ? rawTaxSettings.rates : defaultTaxSettings.rates || [];
    const seenRateIds = new Set();
    let rates = rawRates.flatMap(entry => {
      if (!isPlainObject(entry) || !nullableStringId(entry.id) || seenRateIds.has(entry.id)) {
        repairs.add("TAX_RATE_REMOVED");
        return [];
      }
      const rate = finiteNumber(entry.rate, NaN);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        repairs.add("TAX_RATE_REMOVED");
        return [];
      }
      seenRateIds.add(entry.id);
      const fallback = defaultRateById.get(entry.id) || {};
      return [{ id: entry.id, rate, active: booleanValue(entry.active, fallback.active !== false) }];
    });
    if (!rates.length) {
      repairs.add("TAX_RATES_RESTORED");
      rates = cloneSafe(defaultTaxSettings.rates || [{ id: "tax-19", rate: 19, active: true }]);
    }
    if (!rates.some(rate => rate.active)) {
      rates[0].active = true;
      repairs.add("ACTIVE_TAX_RATE_RESTORED");
    }
    const requestedDefaultRate = finiteNumber(rawTaxSettings.defaultRate, finiteNumber(defaultTaxSettings.defaultRate, rates[0].rate));
    const defaultRate = rates.find(rate => rate.active && rate.rate === requestedDefaultRate)?.rate ?? rates.find(rate => rate.active).rate;
    if (defaultRate !== requestedDefaultRate) repairs.add("DEFAULT_TAX_RATE_REPAIRED");
    const taxSettings = {
      status: ["vat", "small-business", "undecided"].includes(rawTaxSettings.status) ? rawTaxSettings.status : stringValue(defaultTaxSettings.status, "undecided"),
      rates,
      defaultRate
    };
    company.defaultTaxRate = defaultRate;

    const defaultReceiptSettings = defaults.receiptSettings || {};
    const rawReceiptSettings = isPlainObject(raw.receiptSettings) ? raw.receiptSettings : {};
    if (!isPlainObject(raw.receiptSettings)) repairs.add("RECEIPT_SETTINGS_DEFAULTED");
    const yearPrefix = /^\d{4}$/.test(rawReceiptSettings.yearPrefix) ? rawReceiptSettings.yearPrefix : stringValue(defaultReceiptSettings.yearPrefix, String(new Date().getFullYear()));
    const nextNumber = Number.isInteger(rawReceiptSettings.nextNumber) && rawReceiptSettings.nextNumber > 0
      ? rawReceiptSettings.nextNumber
      : Math.max(1, Number(defaultReceiptSettings.nextNumber) || 1);
    const receiptSettings = {
      yearPrefix,
      nextNumber,
      footerText: stringValue(rawReceiptSettings.footerText, stringValue(defaultReceiptSettings.footerText)),
      thankYouText: stringValue(rawReceiptSettings.thankYouText, stringValue(defaultReceiptSettings.thankYouText)),
      currency: stringValue(rawReceiptSettings.currency, stringValue(defaultReceiptSettings.currency, "EUR")),
      language: stringValue(rawReceiptSettings.language, stringValue(defaultReceiptSettings.language, "Deutsch"))
    };

    const defaultPaymentById = new Map((defaults.paymentChoices || []).map(choice => [choice.id, choice]));
    const paymentSource = Array.isArray(raw.paymentChoices) ? raw.paymentChoices : defaults.paymentChoices || [];
    if (!Array.isArray(raw.paymentChoices)) repairs.add("PAYMENT_CHOICES_DEFAULTED");
    const seenPaymentIds = new Set();
    let paymentChoices = paymentSource.flatMap(entry => {
      if (!isPlainObject(entry) || !nullableStringId(entry.id) || seenPaymentIds.has(entry.id)) {
        repairs.add("PAYMENT_CHOICE_REMOVED");
        return [];
      }
      seenPaymentIds.add(entry.id);
      const fallback = defaultPaymentById.get(entry.id) || {};
      return [{
        id: entry.id,
        title: stringValue(entry.title, stringValue(fallback.title, entry.id)),
        icon: stringValue(entry.icon, stringValue(fallback.icon)),
        active: booleanValue(entry.active, fallback.active !== false)
      }];
    });
    if (!paymentChoices.length) {
      repairs.add("PAYMENT_CHOICES_RESTORED");
      paymentChoices = cloneSafe(defaults.paymentChoices || [{ id: "cash", title: "Bar", icon: "€", active: true }]);
    }
    if (!paymentChoices.some(choice => choice.id !== "voucher" && choice.active)) {
      let fallback = paymentChoices.find(choice => choice.id === "cash") || paymentChoices.find(choice => choice.id !== "voucher");
      if (!fallback) {
        const defaultNormalChoice = (defaults.paymentChoices || []).find(choice => choice.id !== "voucher");
        fallback = cloneSafe(defaultNormalChoice || { id: "cash", title: "Bar", icon: "€", active: true });
        fallback.active = true;
        paymentChoices.unshift(fallback);
      } else {
        fallback.active = true;
      }
      repairs.add("NORMAL_PAYMENT_CHOICE_RESTORED");
    }

    const rawSetupStatus = isPlainObject(raw.setup) ? raw.setup.status : null;
    const defaultSetupStatus = isPlainObject(defaults.setup) ? defaults.setup.status : "not-started";
    const setupStatus = setupStatuses.has(rawSetupStatus) ? rawSetupStatus : validSetupStatus(defaultSetupStatus);
    if (!setupStatuses.has(rawSetupStatus)) repairs.add("SETUP_STATUS_DEFAULTED");

    const defaultBackupReminder = normalizeBackupReminder(defaults.backupReminder, null, defaults.updatedAt || new Date().toISOString());
    const backupReminder = normalizeBackupReminder(raw.backupReminder, defaultBackupReminder, defaultBackupReminder.baselineAt);
    if (!isPlainObject(raw.backupReminder)) {
      repairs.add("BACKUP_REMINDER_DEFAULTED");
    } else if (JSON.stringify(raw.backupReminder) !== JSON.stringify(backupReminder)) {
      repairs.add("BACKUP_REMINDER_REPAIRED");
    }

    const normalizedKnownFields = {
        formatVersion: constants.formatVersion,
        tenantId: nullableStringId(expectedTenantId) || constants.tenantId,
        updatedAt: stringValue(raw.updatedAt),
        users: [user],
        activeUserId,
        license,
        company,
        serviceLocations,
        taxSettings,
        receiptSettings,
        paymentChoices,
        businessAreas,
        backupReminder,
        setup: { status: setupStatus }
    };
    return {
      record: stripExcludedData(mergePreservingUnknown(raw, normalizedKnownFields)),
      repairs: [...repairs]
    };
  }

  function mergePreservingUnknown(existing, next) {
    if (Array.isArray(next)) {
      if (!Array.isArray(existing)) return cloneSafe(next);
      const identity = entry => {
        if (!isPlainObject(entry)) return null;
        if (nullableStringId(entry.id)) return `${nullableStringId(entry.businessAreaId) || ""}\u0000${entry.id}`;
        if (nullableStringId(entry.templateId) && nullableStringId(entry.businessAreaId)) return `${entry.businessAreaId}\u0000${entry.templateId}`;
        return null;
      };
      const keyed = next.every(entry => identity(entry));
      if (!keyed) return cloneSafe(next);
      const existingById = new Map(existing.filter(entry => identity(entry)).map(entry => [identity(entry), entry]));
      return next.map(entry => mergePreservingUnknown(existingById.get(identity(entry)), entry));
    }
    if (!isPlainObject(next)) return cloneSafe(next);
    const result = isPlainObject(existing) ? cloneSafe(existing) : {};
    Object.keys(next).forEach(key => {
      if (dangerousKeys.has(key) || sensitiveKeyPattern.test(key)) return;
      result[key] = mergePreservingUnknown(isPlainObject(existing) || Array.isArray(existing) ? existing[key] : undefined, next[key]);
    });
    return result;
  }

  function sortedSerializable(value) {
    if (Array.isArray(value)) return value.map(sortedSerializable);
    if (!isPlainObject(value)) return value;
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = sortedSerializable(value[key]);
      return result;
    }, {});
  }

  function sameSerializableValue(left, right) {
    return JSON.stringify(sortedSerializable(left)) === JSON.stringify(sortedSerializable(right));
  }

  function projectKnownFields(source, shape) {
    if (Array.isArray(shape)) {
      const sourceArray = Array.isArray(source) ? source : [];
      if (sourceArray.length !== shape.length) return sourceArray;
      return shape.map((entry, index) => projectKnownFields(sourceArray[index], entry));
    }
    if (!isPlainObject(shape)) return source;
    const sourceObject = isPlainObject(source) ? source : {};
    return Object.keys(shape).reduce((result, key) => {
      result[key] = projectKnownFields(sourceObject[key], shape[key]);
      return result;
    }, {});
  }

  function catalogValidationView(record) {
    const view = cloneSafe(record);
    (view?.templateImports || []).forEach(entry => {
      delete entry.status;
      delete entry.needsReviewCount;
    });
    return view;
  }

  function assertSnapshotRecord(result, rawRecord, label, sanitizer, validationView = value => value) {
    const normalizedView = validationView(result.record);
    const rawView = validationView(rawRecord);
    const knownRawFields = projectKnownFields(rawView, normalizedView);
    const sanitizedRaw = sanitizer(rawRecord);
    if (result.repairs.length
      || !sameSerializableValue(normalizedView, knownRawFields)
      || !sameSerializableValue(rawRecord, sanitizedRaw)) {
      throw new PersistenceError(
        "BACKUP_VALIDATION_FAILED",
        `${label} sind unvollständig oder widersprüchlich. Die Sicherung wurde nicht eingespielt.`,
        null,
        {
          invariant: "SNAPSHOT_RECORD_NORMALIZATION_REQUIRED",
          store: label,
          repairs: [...result.repairs],
          findings: (cloneSafe(result.diagnostics) || []).slice(0, 20),
          findingsTruncated: Math.max(0, (Array.isArray(result.diagnostics) ? result.diagnostics.length : 0) - 20)
        }
      );
    }
    return sanitizer(mergePreservingUnknown(rawRecord, result.record));
  }

  function validateTenantSnapshot(snapshotInput, expectedTenantId = constants.tenantId) {
    let snapshot;
    try {
      snapshot = cloneSerializable(snapshotInput);
    } catch (cause) {
      throw new PersistenceError("BACKUP_VALIDATION_FAILED", "Die Sicherungsdaten konnten nicht gelesen werden.", cause);
    }
    if (!isPlainObject(snapshot)
      || snapshot.backupFormat !== tenantSnapshotConstants.backupFormat
      || snapshot.backupFormatVersion !== tenantSnapshotConstants.backupFormatVersion) {
      throw new PersistenceError("BACKUP_FORMAT_UNSUPPORTED", "Diese Sicherungsdatei besitzt kein unterstütztes FRECKA-Format.");
    }
    if (snapshot.appDataSchemaVersion !== constants.databaseVersion) {
      throw new PersistenceError(
        "BACKUP_SCHEMA_UNSUPPORTED",
        snapshot.appDataSchemaVersion > constants.databaseVersion
          ? "Diese Sicherung stammt aus einer neueren FRECKA-Version. Bitte zuerst FRECKA aktualisieren."
          : "Für diese ältere Sicherung ist noch keine Datenmigration verfügbar."
      );
    }
    const safeTenantId = nullableStringId(expectedTenantId) || constants.tenantId;
    if (nullableStringId(snapshot.tenantId) !== safeTenantId) {
      throw new PersistenceError("BACKUP_TENANT_MISMATCH", "Diese Sicherung gehört zu einer anderen FRECKA-Instanz.");
    }
    if (stableIso(snapshot.createdAt, "") !== snapshot.createdAt) {
      throw new PersistenceError("BACKUP_VALIDATION_FAILED", "Die Sicherung enthält keinen gültigen Erstellungszeitpunkt.");
    }
    if (!isPlainObject(snapshot.stores)
      || tenantSnapshotConstants.storeKeys.some(key => !isPlainObject(snapshot.stores[key]))) {
      throw new PersistenceError("BACKUP_INCOMPLETE", "Die Sicherung ist unvollständig. Es fehlen lokale FRECKA-Daten.");
    }
    tenantSnapshotConstants.storeKeys.forEach(key => {
      if (nullableStringId(snapshot.stores[key].tenantId) !== safeTenantId) {
        throw new PersistenceError("BACKUP_TENANT_MISMATCH", "Die Sicherung enthält Daten einer anderen FRECKA-Instanz.");
      }
    });

    const userSettingsInput = settingsWithLegacyUserModel(snapshot.stores.settings, safeTenantId);
    const settingsInput = settingsWithLegacyLicenseModel(userSettingsInput, safeTenantId);
    const settings = assertSnapshotRecord(
      normalizeSettingsRecord(settingsInput, settingsInput, safeTenantId),
      settingsInput,
      "Die Einstellungen",
      stripExcludedData
    );
    const catalog = assertSnapshotRecord(
      normalizeCatalogRecord(snapshot.stores.catalog, snapshot.stores.catalog, settings.businessAreas, safeTenantId),
      snapshot.stores.catalog,
      "Die Katalogdaten",
      stripExcludedCatalogData,
      catalogValidationView
    );
    const customers = assertSnapshotRecord(
      normalizeCustomersRecord(snapshot.stores.customers, snapshot.stores.customers, safeTenantId),
      snapshot.stores.customers,
      "Die Kundendaten",
      stripExcludedCustomersData
    );
    const receipts = assertSnapshotRecord(
      normalizeReceiptsRecord(snapshot.stores.receipts, snapshot.stores.receipts, safeTenantId),
      snapshot.stores.receipts,
      "Die Belegdaten",
      stripExcludedReceiptsData
    );
    const vouchers = assertSnapshotRecord(
      normalizeVouchersRecord(snapshot.stores.vouchers, snapshot.stores.vouchers, safeTenantId),
      snapshot.stores.vouchers,
      "Die Gutscheindaten",
      stripExcludedVouchersData
    );

    assertUniqueVoucherSources(vouchers.vouchers);
    validateVoucherReceiptInvariant(receipts, vouchers);
    const receiptByNumber = new Map(receipts.receipts.map(receipt => [receipt.number, receipt]));
    const receiptById = new Map(receipts.receipts.map(receipt => [receipt.id, receipt]));
    const customerIds = new Set(customers.customers.map(customer => customer.id));
    const requireReceipt = (reference, message, receipt, invariant) => {
      if (reference && !receiptByNumber.has(reference) && !receiptById.has(reference)) {
        throw new PersistenceError("BACKUP_REFERENCE_INVALID", message, null, {
          invariant,
          receipts: [diagnosticReceiptView(receipt)],
          missingReference: reference
        });
      }
    };

    receipts.receipts.forEach(receipt => {
      requireReceipt(
        receipt.reference,
        `Der Beleg ${receipt.number} verweist auf einen nicht enthaltenen Ursprungsbeleg.`,
        receipt,
        "RECEIPT_SOURCE_REFERENCE_ORPHANED"
      );
      (receipt.references?.correctionNumbers || []).forEach(reference => {
        requireReceipt(
          reference,
          `Der Beleg ${receipt.number} enthält eine ungültige Korrekturreferenz.`,
          receipt,
          "RECEIPT_CORRECTION_REFERENCE_ORPHANED"
        );
      });
      if (receipt.customerId && !customerIds.has(receipt.customerId) && !receipt.customerSnapshot) {
        throw new PersistenceError(
          "BACKUP_REFERENCE_INVALID",
          `Der Beleg ${receipt.number} enthält keine nachvollziehbaren Kundendaten.`,
          null,
          { invariant: "RECEIPT_CUSTOMER_REFERENCE_UNRESOLVED", receipts: [diagnosticReceiptView(receipt)] }
        );
      }
    });

    vouchers.vouchers.forEach(voucher => {
      if (voucher.customerId && !customerIds.has(voucher.customerId) && !voucher.customerSnapshot) {
        throw new PersistenceError(
          "BACKUP_REFERENCE_INVALID",
          `Der Gutschein ${voucher.code} enthält keine nachvollziehbaren Kundendaten.`,
          null,
          { invariant: "VOUCHER_CUSTOMER_REFERENCE_UNRESOLVED", vouchers: [diagnosticVoucherView(voucher)] }
        );
      }
      if (!voucher.history.length || voucher.history[0].type !== "sold") {
        throw new PersistenceError(
          "BACKUP_VOUCHER_HISTORY_INVALID",
          `Die Historie des Gutscheins ${voucher.code} beginnt nicht mit dem Verkauf.`,
          null,
          voucherHistoryDiagnostic("VOUCHER_HISTORY_SALE_ENTRY_MISSING", voucher, voucher.history.slice(0, 1))
        );
      }
      const historyIds = new Set();
      let expectedBalanceCents = voucher.issuedValueCents;
      voucher.history.forEach((entry, index) => {
        if (historyIds.has(entry.id)) {
          throw new PersistenceError(
            "BACKUP_VOUCHER_HISTORY_INVALID",
            `Die Historie des Gutscheins ${voucher.code} enthält einen doppelten Eintrag.`,
            null,
            voucherHistoryDiagnostic("VOUCHER_HISTORY_ENTRY_DUPLICATE", voucher, [entry])
          );
        }
        historyIds.add(entry.id);
        if (index === 0) {
          if (entry.amountCents !== voucher.issuedValueCents || entry.balanceAfterCents !== voucher.issuedValueCents) {
            throw new PersistenceError(
              "BACKUP_VOUCHER_HISTORY_INVALID",
              `Der Verkaufseintrag des Gutscheins ${voucher.code} besitzt widersprüchliche Werte.`,
              null,
              voucherHistoryDiagnostic("VOUCHER_HISTORY_SALE_VALUES_INVALID", voucher, [entry])
            );
          }
          return;
        }
        if (entry.type === "sold") {
          throw new PersistenceError(
            "BACKUP_VOUCHER_HISTORY_INVALID",
            `Die Historie des Gutscheins ${voucher.code} enthält mehr als einen Verkauf.`,
            null,
            voucherHistoryDiagnostic("VOUCHER_HISTORY_MULTIPLE_SALE_ENTRIES", voucher, [entry])
          );
        }
        if (["partial_redemption", "full_redemption", "cancelled"].includes(entry.type)) {
          expectedBalanceCents -= entry.amountCents;
        } else if (entry.type === "credit") {
          expectedBalanceCents += entry.amountCents;
        } else {
          expectedBalanceCents = entry.balanceAfterCents;
        }
        if (expectedBalanceCents < 0
          || expectedBalanceCents > voucher.issuedValueCents
          || entry.balanceAfterCents !== expectedBalanceCents
          || (entry.type === "partial_redemption" && expectedBalanceCents === 0)
          || (["full_redemption", "cancelled"].includes(entry.type) && expectedBalanceCents !== 0)) {
          throw new PersistenceError(
            "BACKUP_VOUCHER_HISTORY_INVALID",
            `Die Historie des Gutscheins ${voucher.code} enthält einen widersprüchlichen Restwert.`,
            null,
            voucherHistoryDiagnostic("VOUCHER_HISTORY_BALANCE_INVALID", voucher, [entry])
          );
        }
      });
      if (voucher.currentValueCents !== voucher.history.at(-1).balanceAfterCents) {
        throw new PersistenceError(
          "BACKUP_VOUCHER_HISTORY_INVALID",
          `Der Restwert des Gutscheins ${voucher.code} stimmt nicht mit seiner Historie überein.`,
          null,
          voucherHistoryDiagnostic("VOUCHER_CURRENT_BALANCE_HISTORY_MISMATCH", voucher, voucher.history.slice(-1))
        );
      }
    });

    const prefix = settings.receiptSettings.yearPrefix;
    const highestSequence = receipts.receipts.reduce((highest, receipt) => {
      const match = String(receipt.number || "").match(new RegExp(`^${prefix}-(\\d{6})$`));
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    if (settings.receiptSettings.nextNumber <= highestSequence) {
      throw new PersistenceError(
        "BACKUP_NUMBER_SEQUENCE_INVALID",
        "Der Belegnummernstand der Sicherung würde eine Nummernkollision verursachen.",
        null,
        {
          invariant: "RECEIPT_NUMBER_SEQUENCE_COLLISION",
          yearPrefix: prefix,
          nextNumber: settings.receiptSettings.nextNumber,
          highestStoredSequence: highestSequence
        }
      );
    }

    const normalizedSnapshot = {
      backupFormat: tenantSnapshotConstants.backupFormat,
      backupFormatVersion: tenantSnapshotConstants.backupFormatVersion,
      appDataSchemaVersion: constants.databaseVersion,
      tenantId: safeTenantId,
      createdAt: snapshot.createdAt,
      app: {
        version: trimmedString(snapshot.app?.version, tenantSnapshotConstants.appVersion),
        build: trimmedString(snapshot.app?.build)
      },
      stores: { settings, catalog, customers, receipts, vouchers }
    };
    const identity = companyIdentity(settings.company);
    return {
      snapshot: normalizedSnapshot,
      summary: {
        createdAt: normalizedSnapshot.createdAt,
        companyName: identity.name,
        companyOwner: identity.owner,
        businessAreas: settings.businessAreas.length,
        serviceLocations: settings.serviceLocations.length,
        categories: catalog.categories.length,
        catalogItems: catalog.items.length,
        customers: customers.customers.length,
        receipts: receipts.receipts.length,
        vouchers: vouchers.vouchers.length
      }
    };
  }

  function historicalRepairTechnicalFinding(code, invariant, details = {}) {
    return cloneSafe({ code, invariant, ...details });
  }

  function prepareHistoricalDemoVoucherReceiptRepair(snapshotInput, canonicalRecordsInput, expectedTenantId = constants.tenantId) {
    const safeTenantId = nullableStringId(expectedTenantId) || constants.tenantId;
    const candidate = cloneSerializable(snapshotInput);
    const canonicalRecords = isPlainObject(canonicalRecordsInput) ? canonicalRecordsInput : {};
    const rawReceipts = Array.isArray(candidate?.stores?.receipts?.receipts) ? candidate.stores.receipts.receipts : null;
    const rawVouchers = Array.isArray(candidate?.stores?.vouchers?.vouchers) ? candidate.stores.vouchers.vouchers : null;
    const canonicalReceipts = Array.isArray(canonicalRecords.receipts?.receipts) ? canonicalRecords.receipts.receipts : null;
    const canonicalVouchers = Array.isArray(canonicalRecords.vouchers?.vouchers) ? canonicalRecords.vouchers.vouchers : null;
    const cases = [];
    const blockedFindings = [];
    const additions = [];
    const inspection = inspectVoucherReceiptInvariant(rawReceipts, rawVouchers);
    const allowedByReceiptId = new Map(historicalDemoVoucherReceiptRepairConstants.cases.map(entry => [entry.receiptId, entry]));
    const allowedByReceiptNumber = new Map(historicalDemoVoucherReceiptRepairConstants.cases.map(entry => [entry.receiptNumber, entry]));

    if (!rawReceipts || !rawVouchers) {
      blockedFindings.push(historicalRepairTechnicalFinding(
        "HISTORICAL_DEMO_REPAIR_INPUT_INCOMPLETE",
        "TENANT_RECEIPT_OR_VOUCHER_STORE_INCOMPLETE"
      ));
    }
    if (!canonicalReceipts || !canonicalVouchers) {
      blockedFindings.push(historicalRepairTechnicalFinding(
        "HISTORICAL_DEMO_REPAIR_CANONICAL_INPUT_INCOMPLETE",
        "CANONICAL_DEMO_SOURCE_INCOMPLETE"
      ));
    }

    const receipts = rawReceipts || [];
    const vouchers = rawVouchers || [];
    const seedReceipts = canonicalReceipts || [];
    const seedVouchers = canonicalVouchers || [];
    const receiptMatchesById = value => receipts.filter(receipt => nullableStringId(receipt?.id) === value);
    const receiptMatchesByNumber = value => receipts.filter(receipt => trimmedString(receipt?.number) === value);
    const voucherMatchesByReference = value => vouchers.filter(voucher => nullableStringId(voucher?.reference) === value);
    const canonicalReceiptMatchesById = value => seedReceipts.filter(receipt => nullableStringId(receipt?.id) === value);
    const canonicalReceiptMatchesByNumber = value => seedReceipts.filter(receipt => trimmedString(receipt?.number) === value);
    const canonicalVoucherMatches = entry => seedVouchers.filter(voucher => (
      nullableStringId(voucher?.reference) === entry.voucherReference
      && trimmedString(voucher?.code) === entry.voucherCode
    ));

    const claims = new Map();
    vouchers.forEach(voucher => {
      const saleReceipt = isPlainObject(voucher?.saleReceipt) ? voucher.saleReceipt : {};
      [nullableStringId(saleReceipt.id), trimmedString(saleReceipt.number)].filter(Boolean).forEach(identity => {
        const claimList = claims.get(identity) || [];
        claimList.push(nullableStringId(voucher?.reference));
        claims.set(identity, claimList);
      });
    });

    historicalDemoVoucherReceiptRepairConstants.cases.forEach(entry => {
      const caseFindings = [];
      const canonicalById = canonicalReceiptMatchesById(entry.receiptId);
      const canonicalByNumber = canonicalReceiptMatchesByNumber(entry.receiptNumber);
      const canonicalVoucher = canonicalVoucherMatches(entry);
      const currentById = receiptMatchesById(entry.receiptId);
      const currentByNumber = receiptMatchesByNumber(entry.receiptNumber);
      const currentVouchers = voucherMatchesByReference(entry.voucherReference);
      const claimedReferences = new Set([
        ...(claims.get(entry.receiptId) || []),
        ...(claims.get(entry.receiptNumber) || [])
      ].filter(Boolean));
      let status = "blocked";

      if (canonicalById.length !== 1
        || canonicalByNumber.length !== 1
        || canonicalById[0] !== canonicalByNumber[0]
        || canonicalVoucher.length !== 1) {
        caseFindings.push("CANONICAL_DEMO_MAPPING_AMBIGUOUS");
      } else {
        const canonicalReceipt = canonicalById[0];
        const canonicalVoucherRecord = canonicalVoucher[0];
        const canonicalSaleReceipt = isPlainObject(canonicalVoucherRecord.saleReceipt) ? canonicalVoucherRecord.saleReceipt : {};
        if (canonicalReceipt.receiptKind !== "voucher-sale"
          || nullableStringId(canonicalReceipt.voucherReference) !== entry.voucherReference
          || nullableStringId(canonicalVoucherRecord.saleReceiptReference) !== entry.receiptId
          || nullableStringId(canonicalSaleReceipt.id) !== entry.receiptId
          || trimmedString(canonicalSaleReceipt.number) !== entry.receiptNumber) {
          caseFindings.push("CANONICAL_DEMO_MAPPING_INVALID");
        }
      }

      if (currentVouchers.length !== 1) {
        caseFindings.push(currentVouchers.length ? "VOUCHER_REFERENCE_DUPLICATE" : "VOUCHER_MISSING");
      } else {
        const voucher = currentVouchers[0];
        const saleReceipt = isPlainObject(voucher.saleReceipt) ? voucher.saleReceipt : {};
        if (trimmedString(voucher.code) !== entry.voucherCode
          || nullableStringId(voucher.saleReceiptReference) !== entry.receiptId
          || nullableStringId(saleReceipt.id) !== entry.receiptId
          || trimmedString(saleReceipt.number) !== entry.receiptNumber) {
          caseFindings.push("VOUCHER_CANONICAL_REFERENCE_MISMATCH");
        }
      }
      if (claimedReferences.size > 1) caseFindings.push("VOUCHER_RECEIPT_MULTIPLE_CLAIMS");

      if (currentById.length > 1) caseFindings.push("RECEIPT_ID_DUPLICATE");
      if (currentByNumber.length > 1) caseFindings.push("RECEIPT_NUMBER_DUPLICATE");
      if (!caseFindings.length) {
        if (!currentById.length && !currentByNumber.length) {
          status = "missing";
          additions.push(cloneSafe(canonicalById[0]));
        } else if (currentById.length !== 1 || currentByNumber.length !== 1 || currentById[0] !== currentByNumber[0]) {
          caseFindings.push("RECEIPT_ID_OR_NUMBER_COLLISION");
        } else if (!sameSerializableValue(currentById[0], canonicalById[0])) {
          caseFindings.push("RECEIPT_CANONICAL_DATA_MISMATCH");
        } else {
          status = "correct";
        }
      }

      caseFindings.forEach(invariant => {
        blockedFindings.push(historicalRepairTechnicalFinding(
          "HISTORICAL_DEMO_REPAIR_BLOCKED",
          invariant,
          { receiptId: entry.receiptId, receiptNumber: entry.receiptNumber, voucherReference: entry.voucherReference }
        ));
      });
      cases.push({
        receiptId: entry.receiptId,
        receiptNumber: entry.receiptNumber,
        voucherReference: entry.voucherReference,
        voucherCode: entry.voucherCode,
        status: caseFindings.length ? "blocked" : status,
        findings: caseFindings
      });
    });

    inspection.findings.forEach(finding => {
      const diagnostic = finding.diagnostic || {};
      const voucher = Array.isArray(diagnostic.vouchers) ? diagnostic.vouchers[0] : null;
      const saleReceiptId = nullableStringId(voucher?.saleReceipt?.id);
      const saleReceiptNumber = trimmedString(voucher?.saleReceipt?.number);
      const allowed = (saleReceiptId && allowedByReceiptId.get(saleReceiptId))
        || (saleReceiptNumber && allowedByReceiptNumber.get(saleReceiptNumber));
      const repairableMissing = diagnostic.invariant === "VOUCHER_SALE_RECEIPT_NOT_FOUND"
        && diagnostic.missingById === true
        && diagnostic.missingByNumber === true
        && allowed
        && allowed.receiptId === saleReceiptId
        && allowed.receiptNumber === saleReceiptNumber
        && allowed.voucherReference === nullableStringId(voucher?.reference);
      if (!repairableMissing) {
        blockedFindings.push(historicalRepairTechnicalFinding(
          finding.code,
          diagnostic.invariant,
          { vouchers: diagnostic.vouchers, receipts: diagnostic.receipts }
        ));
      }
    });

    const patchedCandidate = cloneSafe(candidate);
    if (patchedCandidate?.stores?.receipts?.receipts && additions.length) {
      patchedCandidate.stores.receipts.receipts = [
        ...additions.slice().sort((left, right) => right.number.localeCompare(left.number, "de-DE")),
        ...patchedCandidate.stores.receipts.receipts
      ];
    }

    let validatedCandidate = null;
    if (!blockedFindings.length) {
      try {
        validatedCandidate = validateTenantSnapshot(patchedCandidate, safeTenantId).snapshot;
      } catch (error) {
        if (!(error instanceof PersistenceError)) throw error;
        blockedFindings.push(historicalRepairTechnicalFinding(
          error.code,
          trimmedString(error.diagnostic?.invariant, error.code),
          { details: cloneSafe(error.diagnostic) }
        ));
      }
    }

    const status = blockedFindings.length ? "blocked" : additions.length ? "repairable" : "no-op";
    const report = Object.freeze(cloneSafe({
      repairFormat: historicalDemoVoucherReceiptRepairConstants.format,
      repairFormatVersion: historicalDemoVoucherReceiptRepairConstants.formatVersion,
      status,
      canRepair: status === "repairable",
      noOp: status === "no-op",
      allowedReceiptIdentities: historicalDemoVoucherReceiptRepairConstants.cases.map(entry => ({
        receiptId: entry.receiptId,
        receiptNumber: entry.receiptNumber,
        voucherReference: entry.voucherReference
      })),
      cases,
      additions: additions.map(receipt => ({
        receiptId: receipt.id,
        receiptNumber: receipt.number,
        voucherReference: receipt.voucherReference
      })),
      findings: blockedFindings,
      invariantFindings: inspection.findings.map(finding => ({
        code: finding.code,
        invariant: finding.diagnostic?.invariant,
        vouchers: finding.diagnostic?.vouchers,
        receipts: finding.diagnostic?.receipts,
        missingById: finding.diagnostic?.missingById,
        missingByNumber: finding.diagnostic?.missingByNumber
      })),
      receiptSequence: {
        before: candidate?.stores?.settings?.receiptSettings?.nextNumber ?? null,
        after: patchedCandidate?.stores?.settings?.receiptSettings?.nextNumber ?? null,
        changed: candidate?.stores?.settings?.receiptSettings?.nextNumber !== patchedCandidate?.stores?.settings?.receiptSettings?.nextNumber
      },
      customerHistory: {
        action: "none",
        persisted: false,
        reason: "Kundenhistorien sind vom IndexedDB-Kundenformat ausgeschlossen; der frühere Demo-Eintrag ist im aktuellen Laufzeit-Seed bereits entfernt."
      }
    }));

    return { report, candidateSnapshot: validatedCandidate, additions: cloneSafe(additions) };
  }

  function planHistoricalDemoVoucherReceiptRepair(snapshotInput, canonicalRecordsInput, expectedTenantId = constants.tenantId) {
    return prepareHistoricalDemoVoucherReceiptRepair(snapshotInput, canonicalRecordsInput, expectedTenantId).report;
  }

  function diagnoseTenantSnapshot(snapshotInput, expectedTenantId = constants.tenantId, options = {}) {
    const diagnosticCreatedAt = stableIso(options.createdAt, new Date().toISOString());
    const candidate = isPlainObject(snapshotInput) ? snapshotInput : {};
    const rawReceipts = Array.isArray(candidate.stores?.receipts?.receipts)
      ? candidate.stores.receipts.receipts
      : [];
    const rawVouchers = Array.isArray(candidate.stores?.vouchers?.vouchers)
      ? candidate.stores.vouchers.vouchers
      : [];
    const base = {
      diagnosticFormat: integrityDiagnosticConstants.format,
      diagnosticFormatVersion: integrityDiagnosticConstants.formatVersion,
      createdAt: diagnosticCreatedAt,
      app: {
        version: trimmedString(options.appVersion, trimmedString(candidate.app?.version)).slice(0, 80),
        build: trimmedString(options.appBuild, trimmedString(candidate.app?.build)).slice(0, 80)
      },
      appDataSchemaVersion: Number.isInteger(candidate.appDataSchemaVersion)
        ? candidate.appDataSchemaVersion
        : constants.databaseVersion,
      recordCounts: {
        receipts: rawReceipts.length,
        voucherSaleReceipts: rawReceipts.filter(receipt => receipt?.receiptKind === "voucher-sale").length,
        vouchers: rawVouchers.length
      },
      privacy: {
        dataAccess: "read-only",
        automaticRepair: false,
        serverTransfer: false,
        includedFields: "Nur technische IDs, Referenzen, Belegnummern, Belegarten und relevante Zeit-/Historienreferenzen."
      },
      recordVersionAssessment: {
        status: "not-determinable",
        reason: "Belege und Gutscheine speichern keine erzeugende FRECKA-Version. Eine automatische Zuordnung zu vor oder nach 0.10.3 wäre daher nicht belastbar; die betroffenen Erstellungszeitpunkte werden stattdessen ausgegeben."
      }
    };
    const historicalDemoRepair = isPlainObject(options.canonicalRecords)
      ? planHistoricalDemoVoucherReceiptRepair(snapshotInput, options.canonicalRecords, expectedTenantId)
      : null;

    try {
      validateTenantSnapshot(snapshotInput, expectedTenantId);
      return Object.freeze(cloneSafe({
        ...base,
        historicalDemoRepair,
        status: "consistent",
        validation: {
          code: "OK",
          invariant: "TENANT_SNAPSHOT_VALID",
          message: "Die zentrale FRECKA-Snapshotprüfung hat keine Integritätsverletzung festgestellt."
        },
        details: null
      }));
    } catch (error) {
      if (!(error instanceof PersistenceError)) throw error;
      const diagnostic = cloneSafe(error.diagnostic) || {};
      const primaryFinding = Array.isArray(diagnostic.findings) ? diagnostic.findings[0] : null;
      return Object.freeze(cloneSafe({
        ...base,
        historicalDemoRepair,
        status: "inconsistent",
        validation: {
          code: trimmedString(error.code, "PERSISTENCE_VALIDATION_FAILED"),
          invariant: trimmedString(primaryFinding?.invariant, trimmedString(diagnostic.invariant, trimmedString(error.code, "PERSISTENCE_VALIDATION_FAILED"))),
          message: trimmedString(error.userMessage, "Die zentrale Snapshotprüfung hat eine Integritätsverletzung festgestellt.")
        },
        details: Object.keys(diagnostic).length ? diagnostic : null
      }));
    }
  }

  function stripExcludedData(record) {
    const cleaned = cloneSafe(record) || {};
    forbiddenRootKeys.forEach(key => { delete cleaned[key]; });
    if (isPlainObject(cleaned.company)) {
      Object.keys(cleaned.company).forEach(key => {
        if (key.toLowerCase().startsWith("logo") && key !== "logo") delete cleaned.company[key];
      });
      if (isPlainObject(cleaned.company.logo)) {
        Object.keys(cleaned.company.logo).forEach(key => {
          if (!companyLogoAllowedKeys.has(key)) delete cleaned.company.logo[key];
        });
      } else if (cleaned.company.logo !== null) delete cleaned.company.logo;
    }
    if (Array.isArray(cleaned.businessAreas)) {
      cleaned.businessAreas.forEach(area => {
        if (!isPlainObject(area)) return;
        Object.keys(area).forEach(key => {
          if (key !== "logoMode" && key.toLowerCase().startsWith("logo")) delete area[key];
        });
      });
    }
    if (Array.isArray(cleaned.users)) {
      cleaned.users.forEach(user => {
        if (!isPlainObject(user)) return;
        Object.keys(user).forEach(key => {
          if (userForbiddenKeys.has(key.toLowerCase())) delete user[key];
        });
      });
    }
    if (isPlainObject(cleaned.license)) {
      Object.keys(cleaned.license).forEach(key => {
        if (!licenseAllowedKeys.has(key)) delete cleaned.license[key];
      });
    }
    return cleaned;
  }

  function stripExcludedCatalogData(record) {
    const cleaned = cloneSafe(record) || {};
    catalogForbiddenRootKeys.forEach(key => { delete cleaned[key]; });
    [cleaned.categories, cleaned.items].forEach(entries => {
      if (!Array.isArray(entries)) return;
      entries.forEach(entry => {
        if (!isPlainObject(entry)) return;
        Object.keys(entry).forEach(key => {
          if (/^(image|logo)/i.test(key)) delete entry[key];
        });
      });
    });
    return cleaned;
  }

  function stripExcludedCustomersData(record) {
    const cleaned = cloneSafe(record) || {};
    customersForbiddenRootKeys.forEach(key => { delete cleaned[key]; });
    if (Array.isArray(cleaned.customers)) {
      cleaned.customers.forEach(customer => {
        if (!isPlainObject(customer)) return;
        customerForbiddenKeys.forEach(key => { delete customer[key]; });
      });
    }
    return cleaned;
  }

  function stripExcludedReceiptsData(record) {
    const cleaned = cloneSafe(record) || {};
    receiptsForbiddenRootKeys.forEach(key => { delete cleaned[key]; });
    if (Array.isArray(cleaned.receipts)) {
      cleaned.receipts.forEach(receipt => {
        if (!isPlainObject(receipt)) return;
        receiptForbiddenKeys.forEach(key => { delete receipt[key]; });
      });
    }
    return cleaned;
  }

  function stripExcludedVouchersData(record) {
    const cleaned = cloneSafe(record) || {};
    vouchersForbiddenRootKeys.forEach(key => { delete cleaned[key]; });
    if (Array.isArray(cleaned.vouchers)) {
      cleaned.vouchers.forEach(voucher => {
        if (!isPlainObject(voucher)) return;
        voucherForbiddenKeys.forEach(key => { delete voucher[key]; });
      });
    }
    return cleaned;
  }

  function createSettingsPersistence(options = {}) {
    const indexedDBFactory = Object.prototype.hasOwnProperty.call(options, "indexedDBFactory")
      ? options.indexedDBFactory
      : globalThis.indexedDB;
    const databaseName = options.databaseName || constants.databaseName;
    const databaseVersion = Number(options.databaseVersion || constants.databaseVersion);
    const storeName = options.storeName || constants.storeName;
    const catalogStoreName = options.catalogStoreName || constants.catalogStoreName;
    const customersStoreName = options.customersStoreName || constants.customersStoreName;
    const receiptsStoreName = options.receiptsStoreName || constants.receiptsStoreName;
    const vouchersStoreName = options.vouchersStoreName || constants.vouchersStoreName;
    const tenantId = nullableStringId(options.tenantId) || constants.tenantId;
    let databasePromise = null;
    let writeQueue = Promise.resolve();

    const queued = operation => {
      const result = writeQueue.catch(() => {}).then(operation);
      writeQueue = result.catch(() => {});
      return result;
    };

    function openDatabase() {
      if (!indexedDBFactory || typeof indexedDBFactory.open !== "function") {
        return Promise.reject(new PersistenceError(
          "INDEXEDDB_UNAVAILABLE",
          "Lokale Speicherung wird von diesem Browser nicht bereitgestellt."
        ));
      }
      if (databasePromise) return databasePromise;
      const openingPromise = new Promise((resolve, reject) => {
        let settled = false;
        let request;
        try {
          request = indexedDBFactory.open(databaseName, databaseVersion);
        } catch (cause) {
          reject(new PersistenceError("OPEN_FAILED", "Die lokale Datenbank konnte nicht geöffnet werden.", cause));
          return;
        }
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: "tenantId" });
          if (!database.objectStoreNames.contains(catalogStoreName)) database.createObjectStore(catalogStoreName, { keyPath: "tenantId" });
          if (!database.objectStoreNames.contains(customersStoreName)) database.createObjectStore(customersStoreName, { keyPath: "tenantId" });
          if (!database.objectStoreNames.contains(receiptsStoreName)) database.createObjectStore(receiptsStoreName, { keyPath: "tenantId" });
          if (!database.objectStoreNames.contains(vouchersStoreName)) database.createObjectStore(vouchersStoreName, { keyPath: "tenantId" });
        };
        request.onsuccess = () => {
          const database = request.result;
          if (settled) {
            database.close();
            return;
          }
          if (!database.objectStoreNames.contains(storeName)
            || !database.objectStoreNames.contains(catalogStoreName)
            || !database.objectStoreNames.contains(customersStoreName)
            || !database.objectStoreNames.contains(receiptsStoreName)
            || !database.objectStoreNames.contains(vouchersStoreName)) {
            settled = true;
            database.close();
            reject(new PersistenceError("SCHEMA_MISSING", "Die lokale Datenbank besitzt nicht das erwartete FRECKA-Schema."));
            return;
          }
          settled = true;
          database.onversionchange = () => {
            database.close();
            databasePromise = null;
          };
          resolve(database);
        };
        request.onerror = () => {
          if (settled) return;
          settled = true;
          databasePromise = null;
          reject(new PersistenceError("OPEN_FAILED", "Die lokale Datenbank konnte nicht geöffnet werden.", request.error));
        };
        request.onblocked = () => {
          if (settled) return;
          settled = true;
          databasePromise = null;
          reject(new PersistenceError("DATABASE_BLOCKED", "Die lokale Datenbank ist noch in einem anderen FRECKA-Fenster geöffnet."));
        };
      });
      databasePromise = openingPromise;
      openingPromise.catch(() => {
        if (databasePromise === openingPromise) databasePromise = null;
      });
      return openingPromise;
    }

    async function readSettings() {
      const database = await openDatabase();
      return new Promise((resolve, reject) => {
        let settled = false;
        let result = null;
        let transaction;
        try {
          transaction = database.transaction(storeName, "readonly");
          const request = transaction.objectStore(storeName).get(tenantId);
          request.onsuccess = () => { result = request.result || null; };
          request.onerror = () => {
            if (settled) return;
            settled = true;
            reject(new PersistenceError("READ_FAILED", "Gespeicherte Einstellungen konnten nicht gelesen werden.", request.error));
          };
        } catch (cause) {
          reject(new PersistenceError("READ_FAILED", "Gespeicherte Einstellungen konnten nicht gelesen werden.", cause));
          return;
        }
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        transaction.onabort = () => {
          if (settled) return;
          settled = true;
          reject(new PersistenceError("TRANSACTION_ABORTED", "Das Lesen der Einstellungen wurde abgebrochen.", transaction.error));
        };
        transaction.onerror = () => {};
      });
    }

    function writeSettings(record) {
      let requestedSnapshot;
      try {
        requestedSnapshot = stripExcludedData(cloneSerializable(record));
      } catch (error) {
        return Promise.reject(error);
      }
      if (!isPlainObject(requestedSnapshot) || requestedSnapshot.formatVersion !== constants.formatVersion) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Einstellungsdatensatz besitzt kein unterstütztes Format."));
      }
      if (nullableStringId(requestedSnapshot.tenantId) && requestedSnapshot.tenantId !== tenantId) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Einstellungsdatensatz gehört zu einer anderen Instanz."));
      }
      requestedSnapshot.tenantId = tenantId;

      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let writtenRecord = null;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const readRequest = store.get(tenantId);
            readRequest.onerror = () => {
              transactionFailure = new PersistenceError("WRITE_FAILED", "Die Einstellungen konnten nicht lokal gespeichert werden.", readRequest.error);
            };
            readRequest.onsuccess = () => {
              try {
                const existing = readRequest.result;
                if (existing?.formatVersion != null
                  && (typeof existing.formatVersion !== "number" || !Number.isInteger(existing.formatVersion) || existing.formatVersion < 1)) {
                  throw new PersistenceError("INVALID_DATA", "Die gespeicherten Einstellungen besitzen keine gültige Formatversion.");
                }
                if (existing?.formatVersion > constants.formatVersion) {
                  throw new PersistenceError(
                    "UNSUPPORTED_FORMAT",
                    "Die gespeicherten Einstellungen stammen aus einer neueren FRECKA-Version und wurden nicht überschrieben."
                  );
                }
                if (existing?.formatVersion != null && existing.formatVersion < constants.formatVersion) {
                  throw new PersistenceError("UNSUPPORTED_FORMAT", "Für diese ältere Einstellungsformatversion ist noch keine Migration verfügbar.");
                }
                writtenRecord = stripExcludedData(mergePreservingUnknown(existing, requestedSnapshot));
                writtenRecord.formatVersion = constants.formatVersion;
                writtenRecord.tenantId = tenantId;
                writtenRecord.updatedAt = new Date().toISOString();
                const putRequest = store.put(writtenRecord);
                putRequest.onerror = () => {
                  transactionFailure = new PersistenceError("WRITE_FAILED", "Die Einstellungen konnten nicht lokal gespeichert werden.", putRequest.error);
                };
              } catch (error) {
                if (settled) return;
                transactionFailure = error instanceof PersistenceError
                  ? error
                  : new PersistenceError("WRITE_FAILED", "Die Einstellungen konnten nicht lokal gespeichert werden.", error);
                try { transaction.abort(); } catch (abortError) {
                  settled = true;
                  reject(transactionFailure);
                }
              }
            };
          } catch (cause) {
            reject(new PersistenceError("WRITE_FAILED", "Die Einstellungen konnten nicht lokal gespeichert werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve(cloneSafe(writtenRecord));
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Speichern der Einstellungen wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("WRITE_FAILED", "Die Einstellungen konnten nicht lokal gespeichert werden.", transaction.error);
          };
        });
      });
    }

    function deleteSettings() {
      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(storeName, "readwrite");
            const request = transaction.objectStore(storeName).delete(tenantId);
            request.onerror = () => {
              transactionFailure = new PersistenceError("DELETE_FAILED", "Gespeicherte Einstellungen konnten nicht zurückgesetzt werden.", request.error);
            };
          } catch (cause) {
            reject(new PersistenceError("DELETE_FAILED", "Gespeicherte Einstellungen konnten nicht zurückgesetzt werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve();
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Zurücksetzen der Einstellungen wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("DELETE_FAILED", "Gespeicherte Einstellungen konnten nicht zurückgesetzt werden.", transaction.error);
          };
        });
      });
    }

    async function readCatalog() {
      const database = await openDatabase();
      return new Promise((resolve, reject) => {
        let settled = false;
        let result = null;
        let transaction;
        try {
          transaction = database.transaction(catalogStoreName, "readonly");
          const request = transaction.objectStore(catalogStoreName).get(tenantId);
          request.onsuccess = () => { result = request.result || null; };
          request.onerror = () => {
            if (settled) return;
            settled = true;
            reject(new PersistenceError("CATALOG_READ_FAILED", "Der gespeicherte Katalog konnte nicht gelesen werden.", request.error));
          };
        } catch (cause) {
          reject(new PersistenceError("CATALOG_READ_FAILED", "Der gespeicherte Katalog konnte nicht gelesen werden.", cause));
          return;
        }
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        transaction.onabort = () => {
          if (settled) return;
          settled = true;
          reject(new PersistenceError("TRANSACTION_ABORTED", "Das Lesen des Katalogs wurde abgebrochen.", transaction.error));
        };
        transaction.onerror = () => {};
      });
    }

    function writeCatalog(record) {
      let requestedSnapshot;
      try {
        requestedSnapshot = stripExcludedCatalogData(cloneSerializable(record));
      } catch (error) {
        return Promise.reject(error);
      }
      if (!isPlainObject(requestedSnapshot) || requestedSnapshot.formatVersion !== constants.catalogFormatVersion) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Katalogdatensatz besitzt kein unterstütztes Format."));
      }
      if (nullableStringId(requestedSnapshot.tenantId) && requestedSnapshot.tenantId !== tenantId) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Katalogdatensatz gehört zu einer anderen Instanz."));
      }
      requestedSnapshot.tenantId = tenantId;

      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let writtenRecord = null;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(catalogStoreName, "readwrite");
            const store = transaction.objectStore(catalogStoreName);
            const readRequest = store.get(tenantId);
            readRequest.onerror = () => {
              transactionFailure = new PersistenceError("CATALOG_WRITE_FAILED", "Der Katalog konnte nicht lokal gespeichert werden.", readRequest.error);
            };
            readRequest.onsuccess = () => {
              try {
                const existing = readRequest.result;
                if (existing?.formatVersion != null
                  && (typeof existing.formatVersion !== "number" || !Number.isInteger(existing.formatVersion) || existing.formatVersion < 1)) {
                  throw new PersistenceError("INVALID_DATA", "Der gespeicherte Katalog besitzt keine gültige Formatversion.");
                }
                if (existing?.formatVersion > constants.catalogFormatVersion) {
                  throw new PersistenceError(
                    "UNSUPPORTED_FORMAT",
                    "Der gespeicherte Katalog stammt aus einer neueren FRECKA-Version und wurde nicht überschrieben."
                  );
                }
                if (existing?.formatVersion != null && existing.formatVersion < constants.catalogFormatVersion) {
                  throw new PersistenceError("UNSUPPORTED_FORMAT", "Für diese ältere Katalogformatversion ist noch keine Migration verfügbar.");
                }
                writtenRecord = stripExcludedCatalogData(mergePreservingUnknown(existing, requestedSnapshot));
                writtenRecord.formatVersion = constants.catalogFormatVersion;
                writtenRecord.tenantId = tenantId;
                writtenRecord.updatedAt = new Date().toISOString();
                const putRequest = store.put(writtenRecord);
                putRequest.onerror = () => {
                  transactionFailure = new PersistenceError("CATALOG_WRITE_FAILED", "Der Katalog konnte nicht lokal gespeichert werden.", putRequest.error);
                };
              } catch (error) {
                if (settled) return;
                transactionFailure = error instanceof PersistenceError
                  ? error
                  : new PersistenceError("CATALOG_WRITE_FAILED", "Der Katalog konnte nicht lokal gespeichert werden.", error);
                try { transaction.abort(); } catch (abortError) {
                  settled = true;
                  reject(transactionFailure);
                }
              }
            };
          } catch (cause) {
            reject(new PersistenceError("CATALOG_WRITE_FAILED", "Der Katalog konnte nicht lokal gespeichert werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve(cloneSafe(writtenRecord));
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Speichern des Katalogs wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("CATALOG_WRITE_FAILED", "Der Katalog konnte nicht lokal gespeichert werden.", transaction.error);
          };
        });
      });
    }

    function deleteCatalog() {
      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(catalogStoreName, "readwrite");
            const request = transaction.objectStore(catalogStoreName).delete(tenantId);
            request.onerror = () => {
              transactionFailure = new PersistenceError("CATALOG_DELETE_FAILED", "Der gespeicherte Katalog konnte nicht zurückgesetzt werden.", request.error);
            };
          } catch (cause) {
            reject(new PersistenceError("CATALOG_DELETE_FAILED", "Der gespeicherte Katalog konnte nicht zurückgesetzt werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve();
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Zurücksetzen des Katalogs wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("CATALOG_DELETE_FAILED", "Der gespeicherte Katalog konnte nicht zurückgesetzt werden.", transaction.error);
          };
        });
      });
    }

    async function readCustomers() {
      const database = await openDatabase();
      return new Promise((resolve, reject) => {
        let settled = false;
        let result = null;
        let transaction;
        try {
          transaction = database.transaction(customersStoreName, "readonly");
          const request = transaction.objectStore(customersStoreName).get(tenantId);
          request.onsuccess = () => { result = request.result || null; };
          request.onerror = () => {
            if (settled) return;
            settled = true;
            reject(new PersistenceError("CUSTOMERS_READ_FAILED", "Die gespeicherten Kundendaten konnten nicht gelesen werden.", request.error));
          };
        } catch (cause) {
          reject(new PersistenceError("CUSTOMERS_READ_FAILED", "Die gespeicherten Kundendaten konnten nicht gelesen werden.", cause));
          return;
        }
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        transaction.onabort = () => {
          if (settled) return;
          settled = true;
          reject(new PersistenceError("TRANSACTION_ABORTED", "Das Lesen der Kundendaten wurde abgebrochen.", transaction.error));
        };
        transaction.onerror = () => {};
      });
    }

    function writeCustomers(record) {
      let requestedSnapshot;
      try {
        requestedSnapshot = stripExcludedCustomersData(cloneSerializable(record));
      } catch (error) {
        return Promise.reject(error);
      }
      if (!isPlainObject(requestedSnapshot) || requestedSnapshot.formatVersion !== constants.customersFormatVersion) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Kundendatensatz besitzt kein unterstütztes Format."));
      }
      if (nullableStringId(requestedSnapshot.tenantId) && requestedSnapshot.tenantId !== tenantId) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Kundendatensatz gehört zu einer anderen Instanz."));
      }
      requestedSnapshot.tenantId = tenantId;

      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let writtenRecord = null;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(customersStoreName, "readwrite");
            const store = transaction.objectStore(customersStoreName);
            const readRequest = store.get(tenantId);
            readRequest.onerror = () => {
              transactionFailure = new PersistenceError("CUSTOMERS_WRITE_FAILED", "Die Kundendaten konnten nicht lokal gespeichert werden.", readRequest.error);
            };
            readRequest.onsuccess = () => {
              try {
                const existing = readRequest.result;
                if (existing?.formatVersion != null
                  && (typeof existing.formatVersion !== "number" || !Number.isInteger(existing.formatVersion) || existing.formatVersion < 1)) {
                  throw new PersistenceError("INVALID_DATA", "Die gespeicherten Kundendaten besitzen keine gültige Formatversion.");
                }
                if (existing?.formatVersion > constants.customersFormatVersion) {
                  throw new PersistenceError(
                    "UNSUPPORTED_FORMAT",
                    "Die gespeicherten Kundendaten stammen aus einer neueren FRECKA-Version und wurden nicht überschrieben."
                  );
                }
                if (existing?.formatVersion != null && existing.formatVersion < constants.customersFormatVersion) {
                  throw new PersistenceError("UNSUPPORTED_FORMAT", "Für diese ältere Kundenformatversion ist noch keine Migration verfügbar.");
                }
                writtenRecord = stripExcludedCustomersData(mergePreservingUnknown(existing, requestedSnapshot));
                writtenRecord.formatVersion = constants.customersFormatVersion;
                writtenRecord.tenantId = tenantId;
                writtenRecord.updatedAt = new Date().toISOString();
                const putRequest = store.put(writtenRecord);
                putRequest.onerror = () => {
                  transactionFailure = new PersistenceError("CUSTOMERS_WRITE_FAILED", "Die Kundendaten konnten nicht lokal gespeichert werden.", putRequest.error);
                };
              } catch (error) {
                if (settled) return;
                transactionFailure = error instanceof PersistenceError
                  ? error
                  : new PersistenceError("CUSTOMERS_WRITE_FAILED", "Die Kundendaten konnten nicht lokal gespeichert werden.", error);
                try { transaction.abort(); } catch (abortError) {
                  settled = true;
                  reject(transactionFailure);
                }
              }
            };
          } catch (cause) {
            reject(new PersistenceError("CUSTOMERS_WRITE_FAILED", "Die Kundendaten konnten nicht lokal gespeichert werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve(cloneSafe(writtenRecord));
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Speichern der Kundendaten wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("CUSTOMERS_WRITE_FAILED", "Die Kundendaten konnten nicht lokal gespeichert werden.", transaction.error);
          };
        });
      });
    }

    function deleteCustomers() {
      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(customersStoreName, "readwrite");
            const request = transaction.objectStore(customersStoreName).delete(tenantId);
            request.onerror = () => {
              transactionFailure = new PersistenceError("CUSTOMERS_DELETE_FAILED", "Die gespeicherten Kundendaten konnten nicht zurückgesetzt werden.", request.error);
            };
          } catch (cause) {
            reject(new PersistenceError("CUSTOMERS_DELETE_FAILED", "Die gespeicherten Kundendaten konnten nicht zurückgesetzt werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve();
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Zurücksetzen der Kundendaten wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("CUSTOMERS_DELETE_FAILED", "Die gespeicherten Kundendaten konnten nicht zurückgesetzt werden.", transaction.error);
          };
        });
      });
    }

    async function readReceipts() {
      const database = await openDatabase();
      return new Promise((resolve, reject) => {
        let settled = false;
        let result = null;
        let transaction;
        try {
          transaction = database.transaction(receiptsStoreName, "readonly");
          const request = transaction.objectStore(receiptsStoreName).get(tenantId);
          request.onsuccess = () => { result = request.result || null; };
          request.onerror = () => {
            if (settled) return;
            settled = true;
            reject(new PersistenceError("RECEIPTS_READ_FAILED", "Die gespeicherten Belege konnten nicht gelesen werden.", request.error));
          };
        } catch (cause) {
          reject(new PersistenceError("RECEIPTS_READ_FAILED", "Die gespeicherten Belege konnten nicht gelesen werden.", cause));
          return;
        }
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        transaction.onabort = () => {
          if (settled) return;
          settled = true;
          reject(new PersistenceError("TRANSACTION_ABORTED", "Das Lesen der Belege wurde abgebrochen.", transaction.error));
        };
        transaction.onerror = () => {};
      });
    }

    function prepareReceiptsRecord(record) {
      let requestedSnapshot;
      try {
        requestedSnapshot = stripExcludedReceiptsData(cloneSerializable(record));
      } catch (error) {
        throw error;
      }
      if (!isPlainObject(requestedSnapshot) || requestedSnapshot.formatVersion !== constants.receiptsFormatVersion || !Array.isArray(requestedSnapshot.receipts)) {
        throw new PersistenceError("INVALID_DATA", "Der Belegdatensatz besitzt kein unterstütztes Format.");
      }
      if (nullableStringId(requestedSnapshot.tenantId) && requestedSnapshot.tenantId !== tenantId) {
        throw new PersistenceError("INVALID_DATA", "Der Belegdatensatz gehört zu einer anderen Instanz.");
      }
      requestedSnapshot.tenantId = tenantId;
      return requestedSnapshot;
    }

    function writeReceipts(record) {
      let requestedSnapshot;
      try {
        requestedSnapshot = prepareReceiptsRecord(record);
      } catch (error) {
        return Promise.reject(error);
      }
      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let writtenRecord = null;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(receiptsStoreName, "readwrite");
            const store = transaction.objectStore(receiptsStoreName);
            const readRequest = store.get(tenantId);
            readRequest.onerror = () => {
              transactionFailure = new PersistenceError("RECEIPTS_WRITE_FAILED", "Die Belege konnten nicht lokal gespeichert werden.", readRequest.error);
            };
            readRequest.onsuccess = () => {
              try {
                const existing = readRequest.result;
                if (existing?.formatVersion > constants.receiptsFormatVersion) {
                  throw new PersistenceError("UNSUPPORTED_FORMAT", "Die gespeicherten Belege stammen aus einer neueren FRECKA-Version und wurden nicht überschrieben.");
                }
                if (existing?.formatVersion != null && existing.formatVersion < constants.receiptsFormatVersion) {
                  throw new PersistenceError("UNSUPPORTED_FORMAT", "Für diese ältere Belegformatversion ist noch keine Migration verfügbar.");
                }
                writtenRecord = normalizeReceiptsRecord(requestedSnapshot, requestedSnapshot, tenantId).record;
                writtenRecord = stripExcludedReceiptsData(mergePreservingUnknown(existing, writtenRecord));
                writtenRecord.updatedAt = new Date().toISOString();
                const putRequest = store.put(writtenRecord);
                putRequest.onerror = () => {
                  transactionFailure = new PersistenceError("RECEIPTS_WRITE_FAILED", "Die Belege konnten nicht lokal gespeichert werden.", putRequest.error);
                };
              } catch (error) {
                transactionFailure = error instanceof PersistenceError
                  ? error
                  : new PersistenceError("RECEIPTS_WRITE_FAILED", "Die Belege konnten nicht lokal gespeichert werden.", error);
                try { transaction.abort(); } catch (abortError) {
                  if (!settled) {
                    settled = true;
                    reject(transactionFailure);
                  }
                }
              }
            };
          } catch (cause) {
            reject(new PersistenceError("RECEIPTS_WRITE_FAILED", "Die Belege konnten nicht lokal gespeichert werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve(cloneSafe(writtenRecord));
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Speichern der Belege wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("RECEIPTS_WRITE_FAILED", "Die Belege konnten nicht lokal gespeichert werden.", transaction.error);
          };
        });
      });
    }

    function deleteReceipts() {
      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(receiptsStoreName, "readwrite");
            const request = transaction.objectStore(receiptsStoreName).delete(tenantId);
            request.onerror = () => {
              transactionFailure = new PersistenceError("RECEIPTS_DELETE_FAILED", "Die gespeicherten Belege konnten nicht zurückgesetzt werden.", request.error);
            };
          } catch (cause) {
            reject(new PersistenceError("RECEIPTS_DELETE_FAILED", "Die gespeicherten Belege konnten nicht zurückgesetzt werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve();
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Zurücksetzen der Belege wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("RECEIPTS_DELETE_FAILED", "Die gespeicherten Belege konnten nicht zurückgesetzt werden.", transaction.error);
          };
        });
      });
    }

    async function readVouchers() {
      const database = await openDatabase();
      return new Promise((resolve, reject) => {
        let settled = false;
        let result = null;
        let transaction;
        try {
          transaction = database.transaction(vouchersStoreName, "readonly");
          const request = transaction.objectStore(vouchersStoreName).get(tenantId);
          request.onsuccess = () => { result = request.result || null; };
          request.onerror = () => {
            if (settled) return;
            settled = true;
            reject(new PersistenceError("VOUCHERS_READ_FAILED", "Die gespeicherten Gutscheine konnten nicht gelesen werden.", request.error));
          };
        } catch (cause) {
          reject(new PersistenceError("VOUCHERS_READ_FAILED", "Die gespeicherten Gutscheine konnten nicht gelesen werden.", cause));
          return;
        }
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        transaction.onabort = () => {
          if (settled) return;
          settled = true;
          reject(new PersistenceError("TRANSACTION_ABORTED", "Das Lesen der Gutscheine wurde abgebrochen.", transaction.error));
        };
        transaction.onerror = () => {};
      });
    }

    function prepareVouchersRecord(record) {
      let requestedSnapshot;
      try {
        requestedSnapshot = stripExcludedVouchersData(cloneSerializable(record));
      } catch (error) {
        throw error;
      }
      if (!isPlainObject(requestedSnapshot)
        || requestedSnapshot.formatVersion !== constants.vouchersFormatVersion
        || !Array.isArray(requestedSnapshot.vouchers)) {
        throw new PersistenceError("INVALID_DATA", "Der Gutscheindatensatz besitzt kein unterstütztes Format.");
      }
      if (nullableStringId(requestedSnapshot.tenantId) && requestedSnapshot.tenantId !== tenantId) {
        throw new PersistenceError("INVALID_DATA", "Der Gutscheindatensatz gehört zu einer anderen Instanz.");
      }
      assertUniqueVoucherSources(requestedSnapshot.vouchers);
      requestedSnapshot.tenantId = tenantId;
      return normalizeVouchersRecord(requestedSnapshot, requestedSnapshot, tenantId).record;
    }

    function writeVouchers(record) {
      let requestedSnapshot;
      try {
        requestedSnapshot = prepareVouchersRecord(record);
      } catch (error) {
        return Promise.reject(error);
      }
      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let writtenRecord = null;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(vouchersStoreName, "readwrite");
            const store = transaction.objectStore(vouchersStoreName);
            const readRequest = store.get(tenantId);
            readRequest.onerror = () => {
              transactionFailure = new PersistenceError("VOUCHERS_WRITE_FAILED", "Die Gutscheine konnten nicht lokal gespeichert werden.", readRequest.error);
            };
            readRequest.onsuccess = () => {
              try {
                const existing = readRequest.result;
                if (existing?.formatVersion > constants.vouchersFormatVersion) {
                  throw new PersistenceError("UNSUPPORTED_FORMAT", "Die gespeicherten Gutscheine stammen aus einer neueren FRECKA-Version und wurden nicht überschrieben.");
                }
                const existingRecord = existing
                  ? normalizeVouchersRecord(existing, requestedSnapshot, tenantId).record
                  : null;
                if (existingRecord) {
                  requestedSnapshot.vouchers.forEach(nextVoucher => {
                    const previous = existingRecord.vouchers.find(voucher => voucher.id === nextVoucher.id);
                    if (!previous) return;
                    const immutableFields = [
                      "id", "reference", "code", "issuedValueCents", "createdAt", "saleReceipt",
                      "companySnapshot", "brandingSnapshot", "businessAreaSnapshot", "serviceLocationSnapshot",
                      "customerSnapshot", "contextSnapshot", "presentationSnapshot"
                    ];
                    if (immutableFields.some(field => JSON.stringify(previous[field]) !== JSON.stringify(nextVoucher[field]))) {
                      throw new PersistenceError("VOUCHER_SNAPSHOT_IMMUTABLE", "Gutscheinstammdaten und Verkaufssnapshots dürfen nach dem Verkauf nicht verändert werden.");
                    }
                    if (nextVoucher.history.length < previous.history.length
                      || previous.history.some((entry, index) => JSON.stringify(entry) !== JSON.stringify(nextVoucher.history[index]))) {
                      throw new PersistenceError("VOUCHER_HISTORY_IMMUTABLE", "Die bestehende Gutscheinhistorie darf nicht verändert oder gekürzt werden.");
                    }
                  });
                }
                writtenRecord = stripExcludedVouchersData(mergePreservingUnknown(existing, requestedSnapshot));
                writtenRecord.formatVersion = constants.vouchersFormatVersion;
                writtenRecord.tenantId = tenantId;
                writtenRecord.updatedAt = new Date().toISOString();
                const putRequest = store.put(writtenRecord);
                putRequest.onerror = () => {
                  transactionFailure = new PersistenceError("VOUCHERS_WRITE_FAILED", "Die Gutscheine konnten nicht lokal gespeichert werden.", putRequest.error);
                };
              } catch (error) {
                transactionFailure = error instanceof PersistenceError
                  ? error
                  : new PersistenceError("VOUCHERS_WRITE_FAILED", "Die Gutscheine konnten nicht lokal gespeichert werden.", error);
                try { transaction.abort(); } catch (abortError) {
                  if (!settled) {
                    settled = true;
                    reject(transactionFailure);
                  }
                }
              }
            };
          } catch (cause) {
            reject(new PersistenceError("VOUCHERS_WRITE_FAILED", "Die Gutscheine konnten nicht lokal gespeichert werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve(cloneSafe(writtenRecord));
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Speichern der Gutscheine wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("VOUCHERS_WRITE_FAILED", "Die Gutscheine konnten nicht lokal gespeichert werden.", transaction.error);
          };
        });
      });
    }

    function deleteVouchers() {
      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let transactionFailure = null;
          let transaction;
          try {
            transaction = database.transaction(vouchersStoreName, "readwrite");
            const request = transaction.objectStore(vouchersStoreName).delete(tenantId);
            request.onerror = () => {
              transactionFailure = new PersistenceError("VOUCHERS_DELETE_FAILED", "Die gespeicherten Gutscheine konnten nicht zurückgesetzt werden.", request.error);
            };
          } catch (cause) {
            reject(new PersistenceError("VOUCHERS_DELETE_FAILED", "Die gespeicherten Gutscheine konnten nicht zurückgesetzt werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve();
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Das Zurücksetzen der Gutscheine wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("VOUCHERS_DELETE_FAILED", "Die gespeicherten Gutscheine konnten nicht zurückgesetzt werden.", transaction.error);
          };
        });
      });
    }

    function prepareSettingsForReceiptCommit(existingSettings, requestedSettings) {
      if (existingSettings?.formatVersion > constants.settingsFormatVersion) {
        throw new PersistenceError("UNSUPPORTED_FORMAT", "Die gespeicherten Einstellungen stammen aus einer neueren FRECKA-Version.");
      }
      const mergedSettings = stripExcludedData(mergePreservingUnknown(existingSettings, requestedSettings));
      mergedSettings.formatVersion = constants.settingsFormatVersion;
      mergedSettings.tenantId = tenantId;
      mergedSettings.updatedAt = new Date().toISOString();
      mergedSettings.receiptSettings.nextNumber = Math.max(
        1,
        nonNegativeInteger(existingSettings?.receiptSettings?.nextNumber, 1),
        nonNegativeInteger(requestedSettings.receiptSettings?.nextNumber, 1)
      );
      return mergedSettings;
    }

    function prepareReceiptCommit(draft, existingSettings, requestedSettings, currentReceipts) {
      const mergedSettings = prepareSettingsForReceiptCommit(existingSettings, requestedSettings);
      const existingById = currentReceipts.receipts.find(receipt => receipt.id === draft.id);
      if (existingById) {
        return { created: false, receipt: existingById, receiptsRecord: currentReceipts, settingsRecord: mergedSettings };
      }
      const prefix = /^\d{4}$/.test(trimmedString(mergedSettings.receiptSettings?.yearPrefix))
        ? trimmedString(mergedSettings.receiptSettings.yearPrefix)
        : String(new Date().getFullYear());
      const highestPersisted = currentReceipts.receipts.reduce((highest, receipt) => {
        const match = String(receipt.number || "").match(new RegExp(`^${prefix}-(\\d{6})$`));
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0);
      let sequence = Math.max(
        1,
        nonNegativeInteger(existingSettings?.receiptSettings?.nextNumber, 1),
        nonNegativeInteger(requestedSettings.receiptSettings?.nextNumber, 1),
        highestPersisted + 1
      );
      const usedNumbers = new Set(currentReceipts.receipts.map(receipt => receipt.number));
      let receiptNumber = `${prefix}-${String(sequence).padStart(6, "0")}`;
      while (usedNumbers.has(receiptNumber)) {
        sequence += 1;
        receiptNumber = `${prefix}-${String(sequence).padStart(6, "0")}`;
      }
      const completedAt = stableIso(draft.completedAt, stableIso(draft.createdAt, new Date().toISOString()));
      const receipt = normalizeReceiptEntry({
        ...draft,
        number: receiptNumber,
        receiptNumber,
        createdAt: stableIso(draft.createdAt, completedAt),
        completedAt,
        updatedAt: completedAt
      }, completedAt);
      if (!receipt) throw new PersistenceError("INVALID_DATA", "Der Beleg konnte nicht in das persistente Format überführt werden.");
      currentReceipts.receipts.unshift(receipt);
      currentReceipts.updatedAt = new Date().toISOString();
      mergedSettings.receiptSettings.nextNumber = sequence + 1;
      return { created: true, receipt, receiptsRecord: currentReceipts, settingsRecord: mergedSettings };
    }

    function commitReceipt(receiptDraft, settingsRecord, seedReceiptsRecord) {
      let draft;
      let requestedSettings;
      let seedRecord;
      try {
        draft = cloneSerializable(receiptDraft);
        requestedSettings = stripExcludedData(cloneSerializable(settingsRecord));
        seedRecord = prepareReceiptsRecord(seedReceiptsRecord);
      } catch (error) {
        return Promise.reject(error);
      }
      if (!isPlainObject(draft) || !nullableStringId(draft.id)) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der abzuschließende Beleg besitzt keine stabile ID."));
      }
      if (!isPlainObject(requestedSettings)
        || requestedSettings.formatVersion !== constants.settingsFormatVersion
        || !isPlainObject(requestedSettings.receiptSettings)) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Nummernstand für den Belegabschluss ist nicht verfügbar."));
      }
      if (nullableStringId(requestedSettings.tenantId) && requestedSettings.tenantId !== tenantId) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Die Einstellungen gehören zu einer anderen Instanz."));
      }
      requestedSettings.tenantId = tenantId;

      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let transactionFailure = null;
          let committedResult = null;
          let transaction;
          try {
            transaction = database.transaction([storeName, receiptsStoreName], "readwrite");
            const settingsStore = transaction.objectStore(storeName);
            const receiptsStore = transaction.objectStore(receiptsStoreName);
            const settingsRequest = settingsStore.get(tenantId);
            const receiptsRequest = receiptsStore.get(tenantId);
            let settingsReady = false;
            let receiptsReady = false;

            const fail = (code, message, cause) => {
              if (!transactionFailure) transactionFailure = new PersistenceError(code, message, cause);
            };
            const commitWhenReady = () => {
              if (!settingsReady || !receiptsReady || transactionFailure) return;
              try {
                const currentReceipts = receiptsRequest.result
                  ? normalizeReceiptsRecord(receiptsRequest.result, seedRecord, tenantId).record
                  : normalizeReceiptsRecord(seedRecord, seedRecord, tenantId).record;
                const prepared = prepareReceiptCommit(draft, settingsRequest.result, requestedSettings, currentReceipts);
                committedResult = {
                  ...prepared,
                  receipt: cloneSafe(prepared.receipt),
                  receiptsRecord: cloneSafe(prepared.receiptsRecord),
                  settingsRecord: cloneSafe(prepared.settingsRecord)
                };
                if (!prepared.created) return;
                const settingsPut = settingsStore.put(prepared.settingsRecord);
                const receiptsPut = receiptsStore.put(stripExcludedReceiptsData(prepared.receiptsRecord));
                settingsPut.onerror = () => fail("RECEIPT_COMMIT_FAILED", "Der Belegabschluss konnte nicht lokal gespeichert werden.", settingsPut.error);
                receiptsPut.onerror = () => fail("RECEIPT_COMMIT_FAILED", "Der Belegabschluss konnte nicht lokal gespeichert werden.", receiptsPut.error);
              } catch (error) {
                transactionFailure = error instanceof PersistenceError
                  ? error
                  : new PersistenceError("RECEIPT_COMMIT_FAILED", "Der Belegabschluss konnte nicht lokal gespeichert werden.", error);
                try { transaction.abort(); } catch (abortError) {
                  if (!settled) {
                    settled = true;
                    reject(transactionFailure);
                  }
                }
              }
            };

            settingsRequest.onerror = () => fail("RECEIPT_COMMIT_FAILED", "Der Nummernstand konnte nicht gelesen werden.", settingsRequest.error);
            receiptsRequest.onerror = () => fail("RECEIPT_COMMIT_FAILED", "Die vorhandenen Belege konnten nicht gelesen werden.", receiptsRequest.error);
            settingsRequest.onsuccess = () => { settingsReady = true; commitWhenReady(); };
            receiptsRequest.onsuccess = () => { receiptsReady = true; commitWhenReady(); };
          } catch (cause) {
            reject(new PersistenceError("RECEIPT_COMMIT_FAILED", "Der Belegabschluss konnte nicht lokal gespeichert werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else if (!committedResult) reject(new PersistenceError("RECEIPT_COMMIT_FAILED", "Der Belegabschluss wurde nicht bestätigt."));
            else resolve(committedResult);
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Der Belegabschluss wurde abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("RECEIPT_COMMIT_FAILED", "Der Belegabschluss konnte nicht lokal gespeichert werden.", transaction.error);
          };
        });
      });
    }

    function commitVoucherReceiptTransaction(mode, receiptDraft, voucherInput, settingsRecord, seedReceiptsRecord, seedVouchersRecord) {
      let draft;
      let input;
      let requestedSettings;
      let seedReceipts;
      let seedVouchers;
      try {
        draft = cloneSerializable(receiptDraft);
        input = cloneSerializable(voucherInput);
        requestedSettings = stripExcludedData(cloneSerializable(settingsRecord));
        seedReceipts = prepareReceiptsRecord(seedReceiptsRecord);
        seedVouchers = prepareVouchersRecord(seedVouchersRecord);
      } catch (error) {
        return Promise.reject(error);
      }
      if (!isPlainObject(draft) || !nullableStringId(draft.id)) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der verknüpfte Beleg besitzt keine stabile ID."));
      }
      if (!isPlainObject(requestedSettings)
        || requestedSettings.formatVersion !== constants.settingsFormatVersion
        || !isPlainObject(requestedSettings.receiptSettings)) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Nummernstand für den Belegabschluss ist nicht verfügbar."));
      }
      if (nullableStringId(requestedSettings.tenantId) && requestedSettings.tenantId !== tenantId) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Die Einstellungen gehören zu einer anderen Instanz."));
      }
      requestedSettings.tenantId = tenantId;
      if (mode === "sale") {
        try {
          assertVoucherValueRange(input, "Der neue Gutschein besitzt einen ungültigen Ursprungs- oder Restwert.");
        } catch (error) {
          return Promise.reject(error);
        }
        if (!nullableStringId(input?.id) || !nullableStringId(input?.reference) || !normalizedVoucherCode(input?.code)) {
          return Promise.reject(new PersistenceError("INVALID_DATA", "Der neue Gutschein besitzt keine stabile ID, Referenz oder keinen sichtbaren Code."));
        }
      } else if (mode === "redemption") {
        if (!nullableStringId(input?.voucherReference) || !Number.isInteger(input?.amountCents) || input.amountCents <= 0) {
          return Promise.reject(new PersistenceError("INVALID_DATA", "Die Gutscheineinlösung besitzt keine gültige Referenz oder keinen gültigen Betrag."));
        }
      } else {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Gutscheinvorgang wird nicht unterstützt."));
      }

      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let transactionFailure = null;
          let committedResult = null;
          let transaction;
          try {
            transaction = database.transaction([storeName, receiptsStoreName, vouchersStoreName], "readwrite");
            const settingsStore = transaction.objectStore(storeName);
            const receiptsStore = transaction.objectStore(receiptsStoreName);
            const vouchersStore = transaction.objectStore(vouchersStoreName);
            const settingsRequest = settingsStore.get(tenantId);
            const receiptsRequest = receiptsStore.get(tenantId);
            const vouchersRequest = vouchersStore.get(tenantId);
            let settingsReady = false;
            let receiptsReady = false;
            let vouchersReady = false;
            const fail = (code, message, cause) => {
              if (!transactionFailure) transactionFailure = new PersistenceError(code, message, cause);
            };
            const abortWith = error => {
              transactionFailure = error instanceof PersistenceError
                ? error
                : new PersistenceError("VOUCHER_COMMIT_FAILED", "Der Gutscheinvorgang konnte nicht lokal gespeichert werden.", error);
              try { transaction.abort(); } catch (abortError) {
                if (!settled) {
                  settled = true;
                  reject(transactionFailure);
                }
              }
            };
            const commitWhenReady = () => {
              if (!settingsReady || !receiptsReady || !vouchersReady || transactionFailure) return;
              try {
                const currentReceipts = receiptsRequest.result
                  ? normalizeReceiptsRecord(receiptsRequest.result, seedReceipts, tenantId).record
                  : normalizeReceiptsRecord(seedReceipts, seedReceipts, tenantId).record;
                const currentVouchers = vouchersRequest.result
                  ? normalizeVouchersRecord(vouchersRequest.result, seedVouchers, tenantId).record
                  : normalizeVouchersRecord(seedVouchers, seedVouchers, tenantId).record;
                const existingReceipt = currentReceipts.receipts.find(receipt => receipt.id === draft.id);
                let voucher;

                if (mode === "sale") {
                  const duplicate = currentVouchers.vouchers.find(entry => (
                    entry.id === input.id
                    || entry.reference === input.reference
                    || entry.normalizedCode === normalizedVoucherCode(input.code)
                  ));
                  if (existingReceipt || duplicate) {
                    if (existingReceipt && duplicate
                      && existingReceipt.voucherReference === duplicate.reference
                      && duplicate.saleReceipt?.id === existingReceipt.id) {
                      validateVoucherCommitInvariant("sale", existingReceipt, duplicate);
                      const mergedSettings = prepareSettingsForReceiptCommit(settingsRequest.result, requestedSettings);
                      committedResult = {
                        created: false,
                        receipt: cloneSafe(existingReceipt),
                        voucher: cloneSafe(duplicate),
                        receiptsRecord: cloneSafe(currentReceipts),
                        vouchersRecord: cloneSafe(currentVouchers),
                        settingsRecord: cloneSafe(mergedSettings)
                      };
                      return;
                    }
                    throw new PersistenceError(
                      duplicate ? "VOUCHER_DUPLICATE" : "VOUCHER_ATOMIC_CONFLICT",
                      duplicate
                        ? "Ein Gutschein mit derselben ID, Referenz oder demselben Code ist bereits vorhanden."
                        : "Der Verkaufsbeleg ist bereits ohne passenden Gutschein vorhanden. Der Vorgang wurde nicht verändert."
                    );
                  }
                  const preparedReceipt = prepareReceiptCommit(draft, settingsRequest.result, requestedSettings, currentReceipts);
                  const soldHistory = Array.isArray(input.history) && input.history.length
                    ? input.history.map(entry => ({ ...entry }))
                    : [{ type: "sold", amountCents: centsFrom(input.issuedValueCents, input.issuedValue), balanceAfterCents: centsFrom(input.issuedValueCents, input.issuedValue) }];
                  const soldIndex = Math.max(0, soldHistory.findIndex(entry => entry.type === "sold"));
                  soldHistory[soldIndex] = {
                    ...soldHistory[soldIndex],
                    receiptReference: preparedReceipt.receipt.id,
                    receiptNumber: preparedReceipt.receipt.number,
                    occurredAt: stableIso(soldHistory[soldIndex]?.occurredAt, preparedReceipt.receipt.completedAt)
                  };
                  voucher = normalizeVoucherEntry({
                    ...input,
                    saleReceipt: {
                      ...(isPlainObject(input.saleReceipt) ? input.saleReceipt : {}),
                      id: preparedReceipt.receipt.id,
                      reference: preparedReceipt.receipt.id,
                      number: preparedReceipt.receipt.number,
                      soldAt: preparedReceipt.receipt.completedAt
                    },
                    saleReceiptReference: preparedReceipt.receipt.id,
                    history: soldHistory,
                    qrReference: nullableStringId(input.qrReference) || input.reference,
                    createdAt: stableIso(input.createdAt, preparedReceipt.receipt.completedAt),
                    updatedAt: preparedReceipt.receipt.completedAt
                  }, preparedReceipt.receipt.completedAt);
                  assertVoucherValueRange(voucher);
                  validateVoucherCommitInvariant("sale", preparedReceipt.receipt, voucher);
                  currentVouchers.vouchers.unshift(voucher);
                  currentVouchers.updatedAt = new Date().toISOString();
                  committedResult = {
                    ...preparedReceipt,
                    voucher,
                    vouchersRecord: currentVouchers
                  };
                } else {
                  voucher = currentVouchers.vouchers.find(entry => entry.reference === input.voucherReference) || null;
                  if (!voucher) throw new PersistenceError("VOUCHER_NOT_FOUND", "Gutschein wurde nicht gefunden.");
                  if (existingReceipt) {
                    const existingEvent = voucher.history.find(entry => entry.receiptNumber === existingReceipt.number);
                    if (!existingEvent || existingReceipt.voucherReference !== voucher.reference) {
                      throw new PersistenceError("VOUCHER_ATOMIC_CONFLICT", "Der Einlösungsbeleg ist bereits ohne passende Gutscheinbuchung vorhanden.");
                    }
                    validateVoucherCommitInvariant("redemption", existingReceipt, voucher);
                    const mergedSettings = prepareSettingsForReceiptCommit(settingsRequest.result, requestedSettings);
                    committedResult = {
                      created: false,
                      receipt: cloneSafe(existingReceipt),
                      voucher: cloneSafe(voucher),
                      receiptsRecord: cloneSafe(currentReceipts),
                      vouchersRecord: cloneSafe(currentVouchers),
                      settingsRecord: cloneSafe(mergedSettings)
                    };
                    return;
                  }
                  if (voucher.status === "cancelled") throw new PersistenceError("VOUCHER_CANCELLED", "Dieser Gutschein wurde storniert.");
                  if (!["active", "partially_redeemed"].includes(voucher.status) || voucher.currentValueCents <= 0) {
                    throw new PersistenceError("VOUCHER_REDEEMED", "Dieser Gutschein wurde bereits vollständig eingelöst.");
                  }
                  if (input.amountCents > voucher.currentValueCents) {
                    throw new PersistenceError("INVALID_VOUCHER_VALUE", "Der Einlösungsbetrag ist größer als der verfügbare Restwert.");
                  }
                  const balanceBeforeCents = voucher.currentValueCents;
                  const balanceAfterCents = balanceBeforeCents - input.amountCents;
                  const redemptionDraft = {
                    ...draft,
                    voucherReference: voucher.reference,
                    voucherPayment: {
                      ...(isPlainObject(draft.voucherPayment) ? draft.voucherPayment : {}),
                      reference: voucher.reference,
                      code: voucher.code,
                      amountCents: input.amountCents,
                      balanceBeforeCents,
                      balanceAfterCents,
                      amount: input.amountCents / 100,
                      balanceBefore: balanceBeforeCents / 100,
                      balanceAfter: balanceAfterCents / 100
                    }
                  };
                  const preparedReceipt = prepareReceiptCommit(redemptionDraft, settingsRequest.result, requestedSettings, currentReceipts);
                  const occurredAt = stableIso(input.occurredAt, preparedReceipt.receipt.completedAt);
                  const historyEntry = {
                    id: `voucher_history_${voucher.reference.replace(/[^A-Za-z0-9]+/g, "_")}_${preparedReceipt.receipt.id.replace(/[^A-Za-z0-9]+/g, "_")}`,
                    type: balanceAfterCents === 0 ? "full_redemption" : "partial_redemption",
                    occurredAt,
                    date: stringValue(input.date, preparedReceipt.receipt.date),
                    time: stringValue(input.time, preparedReceipt.receipt.time),
                    amountCents: input.amountCents,
                    amount: input.amountCents / 100,
                    balanceAfterCents,
                    balanceAfter: balanceAfterCents / 100,
                    receiptReference: preparedReceipt.receipt.id,
                    receiptNumber: preparedReceipt.receipt.number
                  };
                  voucher = normalizeVoucherEntry({
                    ...voucher,
                    currentValueCents: balanceAfterCents,
                    currentValue: balanceAfterCents / 100,
                    status: balanceAfterCents === 0 ? "redeemed" : "partially_redeemed",
                    redemptionReferences: [...voucher.redemptionReferences, preparedReceipt.receipt.number],
                    redemptionReceipts: [
                      ...(Array.isArray(voucher.redemptionReceipts) ? voucher.redemptionReceipts : []),
                      { id: preparedReceipt.receipt.id, number: preparedReceipt.receipt.number, amountCents: input.amountCents, occurredAt }
                    ],
                    history: [...voucher.history, historyEntry],
                    updatedAt: occurredAt
                  }, occurredAt);
                  validateVoucherCommitInvariant("redemption", preparedReceipt.receipt, voucher);
                  const voucherIndex = currentVouchers.vouchers.findIndex(entry => entry.reference === voucher.reference);
                  currentVouchers.vouchers.splice(voucherIndex, 1, voucher);
                  currentVouchers.updatedAt = new Date().toISOString();
                  committedResult = {
                    ...preparedReceipt,
                    voucher,
                    vouchersRecord: currentVouchers
                  };
                }

                const settingsPut = settingsStore.put(committedResult.settingsRecord);
                const receiptsPut = receiptsStore.put(stripExcludedReceiptsData(committedResult.receiptsRecord));
                const vouchersPut = vouchersStore.put(stripExcludedVouchersData(committedResult.vouchersRecord));
                settingsPut.onerror = () => fail("VOUCHER_COMMIT_FAILED", "Der Nummernstand des Gutscheinvorgangs konnte nicht gespeichert werden.", settingsPut.error);
                receiptsPut.onerror = () => fail("VOUCHER_COMMIT_FAILED", "Der verknüpfte Beleg konnte nicht gespeichert werden.", receiptsPut.error);
                vouchersPut.onerror = () => fail("VOUCHER_COMMIT_FAILED", "Der Gutschein und seine Historie konnten nicht gespeichert werden.", vouchersPut.error);
              } catch (error) {
                abortWith(error);
              }
            };
            settingsRequest.onerror = () => fail("VOUCHER_COMMIT_FAILED", "Der Nummernstand konnte nicht gelesen werden.", settingsRequest.error);
            receiptsRequest.onerror = () => fail("VOUCHER_COMMIT_FAILED", "Die vorhandenen Belege konnten nicht gelesen werden.", receiptsRequest.error);
            vouchersRequest.onerror = () => fail("VOUCHER_COMMIT_FAILED", "Die vorhandenen Gutscheine konnten nicht gelesen werden.", vouchersRequest.error);
            settingsRequest.onsuccess = () => { settingsReady = true; commitWhenReady(); };
            receiptsRequest.onsuccess = () => { receiptsReady = true; commitWhenReady(); };
            vouchersRequest.onsuccess = () => { vouchersReady = true; commitWhenReady(); };
          } catch (cause) {
            reject(new PersistenceError("VOUCHER_COMMIT_FAILED", "Der Gutscheinvorgang konnte nicht lokal gespeichert werden.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else if (!committedResult) reject(new PersistenceError("VOUCHER_COMMIT_FAILED", "Der Gutscheinvorgang wurde nicht bestätigt."));
            else resolve({
              ...committedResult,
              receipt: cloneSafe(committedResult.receipt),
              voucher: cloneSafe(committedResult.voucher),
              receiptsRecord: cloneSafe(committedResult.receiptsRecord),
              vouchersRecord: cloneSafe(committedResult.vouchersRecord),
              settingsRecord: cloneSafe(committedResult.settingsRecord)
            });
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", "Der Gutscheinvorgang wurde vollständig abgebrochen.", transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError("VOUCHER_COMMIT_FAILED", "Der Gutscheinvorgang konnte nicht lokal gespeichert werden.", transaction.error);
          };
        });
      });
    }

    function commitVoucherSale(receiptDraft, voucherDraft, settingsRecord, seedReceiptsRecord, seedVouchersRecord) {
      return commitVoucherReceiptTransaction("sale", receiptDraft, voucherDraft, settingsRecord, seedReceiptsRecord, seedVouchersRecord);
    }

    function commitVoucherRedemption(receiptDraft, redemptionInput, settingsRecord, seedReceiptsRecord, seedVouchersRecord) {
      return commitVoucherReceiptTransaction("redemption", receiptDraft, redemptionInput, settingsRecord, seedReceiptsRecord, seedVouchersRecord);
    }

    function mutateReceipts(seedReceiptsRecord, operation, failureCode, failureMessage) {
      let seedRecord;
      try {
        seedRecord = prepareReceiptsRecord(seedReceiptsRecord);
      } catch (error) {
        return Promise.reject(error);
      }
      return queued(async () => {
        const database = await openDatabase();
        return new Promise((resolve, reject) => {
          let settled = false;
          let transactionFailure = null;
          let operationResult = null;
          let transaction;
          try {
            transaction = database.transaction(receiptsStoreName, "readwrite");
            const store = transaction.objectStore(receiptsStoreName);
            const readRequest = store.get(tenantId);
            readRequest.onerror = () => {
              transactionFailure = new PersistenceError(failureCode, failureMessage, readRequest.error);
            };
            readRequest.onsuccess = () => {
              try {
                const record = readRequest.result
                  ? normalizeReceiptsRecord(readRequest.result, seedRecord, tenantId).record
                  : normalizeReceiptsRecord(seedRecord, seedRecord, tenantId).record;
                const outcome = operation(record) || {};
                record.updatedAt = new Date().toISOString();
                operationResult = { ...cloneSafe(outcome), record: cloneSafe(record) };
                if (outcome.changed === false) return;
                const putRequest = store.put(stripExcludedReceiptsData(record));
                putRequest.onerror = () => {
                  transactionFailure = new PersistenceError(failureCode, failureMessage, putRequest.error);
                };
              } catch (error) {
                transactionFailure = error instanceof PersistenceError
                  ? error
                  : new PersistenceError(failureCode, failureMessage, error);
                try { transaction.abort(); } catch (abortError) {
                  if (!settled) {
                    settled = true;
                    reject(transactionFailure);
                  }
                }
              }
            };
          } catch (cause) {
            reject(new PersistenceError(failureCode, failureMessage, cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else resolve(operationResult);
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError("TRANSACTION_ABORTED", failureMessage, transaction.error));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError(failureCode, failureMessage, transaction.error);
          };
        });
      });
    }

    function recordReceiptPayment(receiptNumber, paymentInput, seedReceiptsRecord) {
      let payment;
      try {
        payment = cloneSerializable(paymentInput);
      } catch (error) {
        return Promise.reject(error);
      }
      return mutateReceipts(seedReceiptsRecord, record => {
        const receipt = record.receipts.find(entry => entry.number === receiptNumber);
        if (!receipt) throw new PersistenceError("RECEIPT_NOT_FOUND", "Der Beleg wurde nicht gefunden.");
        if (receipt.receiptType !== "receipt" || receipt.status === "cancelled") {
          throw new PersistenceError("RECEIPT_NOT_PAYABLE", "Für diesen Beleg kann keine Zahlung erfasst werden.");
        }
        if (receipt.paymentStatus !== "open") return { changed: false, receipt, recorded: false };
        const recordedAt = stableIso(payment.recordedAt, new Date().toISOString());
        const amountCents = centsFrom(payment.amountCents, payment.amount ?? receipt.total);
        const paymentMethod = trimmedString(payment.paymentMethod);
        if (!paymentMethod) throw new PersistenceError("INVALID_DATA", "Bitte eine gültige Zahlungsart auswählen.");
        const event = {
          type: "payment_recorded",
          recordedAt,
          date: stringValue(payment.date),
          time: stringValue(payment.time),
          paymentMethod,
          amountCents,
          amount: amountCents / 100
        };
        receipt.paymentStatus = "paid";
        receipt.paymentMethod = paymentMethod;
        receipt.payment = paymentMethod;
        receipt.paymentRecordedAt = recordedAt;
        receipt.paymentEvents = Array.isArray(receipt.paymentEvents) ? receipt.paymentEvents : [];
        receipt.paymentEvents.push(event);
        receipt.activities = Array.isArray(receipt.activities) ? receipt.activities : [];
        receipt.activities.push({
          label: "Zahlung erfasst",
          date: stringValue(payment.displayDate, [payment.date, payment.time].filter(Boolean).join(" · ")),
          detail: stringValue(payment.detail),
          occurredAt: recordedAt
        });
        receipt.activity = receipt.activities;
        receipt.updatedAt = recordedAt;
        return { changed: true, receipt, recorded: true };
      }, "RECEIPT_PAYMENT_FAILED", "Die Zahlung konnte nicht lokal gespeichert werden.");
    }

    function saveReceiptNote(receiptNumber, note, activityInput, seedReceiptsRecord) {
      const safeNote = stringValue(note).trim();
      const activity = isPlainObject(activityInput) ? cloneSafe(activityInput) : {};
      return mutateReceipts(seedReceiptsRecord, record => {
        const receipt = record.receipts.find(entry => entry.number === receiptNumber);
        if (!receipt) throw new PersistenceError("RECEIPT_NOT_FOUND", "Der Beleg wurde nicht gefunden.");
        const occurredAt = stableIso(activity.occurredAt, new Date().toISOString());
        receipt.note = safeNote;
        receipt.internalNote = safeNote;
        receipt.activities = Array.isArray(receipt.activities) ? receipt.activities : [];
        receipt.activities.push({
          label: stringValue(activity.label, "Interne Notiz aktualisiert"),
          date: stringValue(activity.date),
          occurredAt
        });
        receipt.activity = receipt.activities;
        receipt.updatedAt = occurredAt;
        return { changed: true, receipt };
      }, "RECEIPT_NOTE_FAILED", "Die interne Notiz konnte nicht lokal gespeichert werden.");
    }

    function commitReceiptCorrection(sourceReceiptNumber, correctionDraft, seedReceiptsRecord) {
      let draft;
      try {
        draft = cloneSerializable(correctionDraft);
      } catch (error) {
        return Promise.reject(error);
      }
      if (!isPlainObject(draft) || !nullableStringId(draft.id) || !["cancellation", "credit"].includes(draft.type)) {
        return Promise.reject(new PersistenceError("INVALID_DATA", "Der Korrekturvorgang ist unvollständig."));
      }
      return mutateReceipts(seedReceiptsRecord, record => {
        const existingById = record.receipts.find(receipt => receipt.id === draft.id);
        if (existingById) return { changed: false, created: false, receipt: existingById };
        const source = record.receipts.find(receipt => receipt.number === sourceReceiptNumber);
        if (!source || source.receiptType !== "receipt") {
          throw new PersistenceError("RECEIPT_NOT_FOUND", "Der Ursprungsbeleg wurde nicht gefunden.");
        }
        const related = record.receipts.filter(receipt => receipt.reference === source.number);
        if (draft.type === "cancellation") {
          const existingCancellation = related.find(receipt => receipt.receiptType === "cancellation");
          if (existingCancellation || source.status === "cancelled") {
            return { changed: false, created: false, receipt: existingCancellation || null, sourceReceipt: source };
          }
        }
        if (source.status === "credited" || source.status === "cancelled") {
          throw new PersistenceError("RECEIPT_NOT_CORRECTABLE", "Für diesen Beleg ist keine weitere Korrektur möglich.");
        }

        const prefix = draft.type === "cancellation" ? "ST" : "GS";
        const sourceYear = String(source.number).match(/^(\d{4})-/)?.[1] || String(new Date().getFullYear());
        const numberPattern = new RegExp(`^${prefix}-${sourceYear}-(\\d{6})$`);
        let sequence = record.receipts.reduce((highest, receipt) => {
          const match = String(receipt.number || "").match(numberPattern);
          return match ? Math.max(highest, Number(match[1])) : highest;
        }, 100) + 1;
        const usedNumbers = new Set(record.receipts.map(receipt => receipt.number));
        let correctionNumber = `${prefix}-${sourceYear}-${String(sequence).padStart(6, "0")}`;
        while (usedNumbers.has(correctionNumber)) {
          sequence += 1;
          correctionNumber = `${prefix}-${sourceYear}-${String(sequence).padStart(6, "0")}`;
        }
        const completedAt = stableIso(draft.completedAt, new Date().toISOString());
        const amountCents = -Math.abs(centsFrom(draft.totalCents, draft.total));
        const correction = normalizeReceiptEntry({
          ...draft,
          number: correctionNumber,
          receiptNumber: correctionNumber,
          receiptType: draft.type,
          status: draft.type === "cancellation" ? "cancelled" : "credited",
          reference: source.number,
          references: { originalReceiptNumber: source.number, correctionNumbers: [] },
          businessAreaId: source.businessAreaId,
          businessAreaSnapshot: source.businessAreaSnapshot,
          serviceLocationId: source.serviceLocationId,
          serviceLocationSnapshot: source.serviceLocationSnapshot,
          companySnapshot: source.companySnapshot,
          brandingSnapshot: source.brandingSnapshot,
          contextSnapshot: source.contextSnapshot,
          customerId: source.customerId,
          customerSnapshot: source.customerSnapshot,
          customer: source.customerSnapshot,
          paymentStatus: source.paymentStatus,
          paymentMethod: source.paymentMethod,
          payment: source.paymentMethod,
          paymentRecordedAt: source.paymentRecordedAt,
          paymentEvents: source.paymentEvents,
          totalCents: amountCents,
          total: amountCents / 100,
          createdAt: completedAt,
          completedAt,
          updatedAt: completedAt
        }, completedAt);
        if (!correction) throw new PersistenceError("INVALID_DATA", "Der Korrekturbeleg konnte nicht erstellt werden.");

        record.receipts.unshift(correction);
        const sourceReferences = isPlainObject(source.references) ? source.references : {};
        source.references = {
          ...sourceReferences,
          originalReceiptNumber: nullableStringId(sourceReferences.originalReceiptNumber),
          correctionNumbers: uniqueStrings([...(sourceReferences.correctionNumbers || []), correction.number])
        };
        source.activities = Array.isArray(source.activities) ? source.activities : [];
        source.activities.push({
          label: draft.type === "cancellation"
            ? `Storniert durch ${correction.number}`
            : draft.isFull ? "Gesamtgutschrift erstellt" : `Teilgutschrift ${Math.abs(amountCents / 100).toFixed(2).replace(".", ",")} €`,
          date: stringValue(draft.sourceActivityDate),
          occurredAt: completedAt
        });
        source.activity = source.activities;
        source.updatedAt = completedAt;
        if (draft.type === "cancellation") {
          source.status = "cancelled";
        } else {
          const creditedCents = record.receipts
            .filter(receipt => receipt.reference === source.number && receipt.receiptType === "credit")
            .reduce((sum, receipt) => sum + Math.abs(centsFrom(receipt.totalCents, receipt.total)), 0);
          source.status = creditedCents >= Math.abs(centsFrom(source.totalCents, source.total)) ? "credited" : "partially-credited";
        }
        return { changed: true, created: true, receipt: correction, sourceReceipt: source };
      }, "RECEIPT_CORRECTION_FAILED", "Die Korrektur konnte nicht lokal gespeichert werden.");
    }

    function closeDatabase() {
      if (!databasePromise) return;
      databasePromise.then(database => database.close()).catch(() => {});
      databasePromise = null;
    }

    async function readTenantSnapshotCandidate(options = {}) {
      const fallbackRecords = isPlainObject(options.fallbackRecords) ? options.fallbackRecords : {};
      const database = await openDatabase();
      const storeNames = [storeName, catalogStoreName, customersStoreName, receiptsStoreName, vouchersStoreName];
      const recordKeys = tenantSnapshotConstants.storeKeys;
      const records = {};
      await new Promise((resolve, reject) => {
        let settled = false;
        let failure = null;
        let transaction;
        try {
          transaction = database.transaction(storeNames, "readonly");
          storeNames.forEach((currentStoreName, index) => {
            const request = transaction.objectStore(currentStoreName).get(tenantId);
            request.onsuccess = () => {
              records[recordKeys[index]] = request.result || cloneSafe(fallbackRecords[recordKeys[index]]) || null;
            };
            request.onerror = () => {
              failure = new PersistenceError("BACKUP_READ_FAILED", "Die lokalen Daten konnten nicht vollständig für die Sicherung gelesen werden.", request.error);
            };
          });
        } catch (cause) {
          reject(new PersistenceError("BACKUP_READ_FAILED", "Die lokalen Daten konnten nicht für die Sicherung gelesen werden.", cause));
          return;
        }
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          if (failure) reject(failure);
          else resolve();
        };
        transaction.onabort = () => {
          if (settled) return;
          settled = true;
          reject(failure || new PersistenceError("TRANSACTION_ABORTED", "Das Erstellen der Sicherung wurde abgebrochen.", transaction.error));
        };
        transaction.onerror = () => {
          if (!failure) failure = new PersistenceError("BACKUP_READ_FAILED", "Die lokalen Daten konnten nicht vollständig für die Sicherung gelesen werden.", transaction.error);
        };
      });
      return {
        backupFormat: tenantSnapshotConstants.backupFormat,
        backupFormatVersion: tenantSnapshotConstants.backupFormatVersion,
        appDataSchemaVersion: constants.databaseVersion,
        tenantId,
        createdAt: new Date().toISOString(),
        app: {
          version: trimmedString(options.appVersion, tenantSnapshotConstants.appVersion),
          build: trimmedString(options.appBuild)
        },
        stores: records
      };
    }

    function repairHistoricalDemoVoucherReceipts(options = {}) {
      const canonicalRecords = isPlainObject(options.canonicalRecords) ? options.canonicalRecords : null;
      if (!canonicalRecords) {
        return Promise.reject(new PersistenceError(
          "HISTORICAL_DEMO_REPAIR_CANONICAL_INPUT_INCOMPLETE",
          "Die freigegebenen historischen Testdaten stehen für die Reparatur nicht eindeutig zur Verfügung. Es wurden keine Daten verändert."
        ));
      }
      const fallbackRecords = isPlainObject(options.fallbackRecords) ? options.fallbackRecords : {};
      const allowTestFailure = databaseName.startsWith("frecka-test-")
        || databaseName.startsWith("frecka-backup-test-")
        || databaseName.startsWith("frecka-persist-smoke-");
      const simulateFailureAfterWrite = allowTestFailure && options.simulateFailureAfterWrite === true;

      return queued(async () => {
        const database = await openDatabase();
        const storeNames = [storeName, catalogStoreName, customersStoreName, receiptsStoreName, vouchersStoreName];
        const recordKeys = tenantSnapshotConstants.storeKeys;
        let preflightReport = null;
        let changed = false;

        await new Promise((resolve, reject) => {
          let settled = false;
          let transactionFailure = null;
          let requestsReady = 0;
          let transaction;
          const records = {};
          try {
            transaction = database.transaction(storeNames, "readwrite");
            const requests = storeNames.map((currentStoreName, index) => {
              const request = transaction.objectStore(currentStoreName).get(tenantId);
              request.onsuccess = () => {
                records[recordKeys[index]] = request.result || cloneSafe(fallbackRecords[recordKeys[index]]) || null;
                requestsReady += 1;
                if (requestsReady !== storeNames.length || transactionFailure) return;
                try {
                  const candidate = {
                    backupFormat: tenantSnapshotConstants.backupFormat,
                    backupFormatVersion: tenantSnapshotConstants.backupFormatVersion,
                    appDataSchemaVersion: constants.databaseVersion,
                    tenantId,
                    createdAt: new Date().toISOString(),
                    app: {
                      version: trimmedString(options.appVersion, tenantSnapshotConstants.appVersion),
                      build: trimmedString(options.appBuild)
                    },
                    stores: records
                  };
                  const prepared = prepareHistoricalDemoVoucherReceiptRepair(candidate, canonicalRecords, tenantId);
                  preflightReport = prepared.report;
                  if (prepared.report.status === "blocked") {
                    transactionFailure = new PersistenceError(
                      "HISTORICAL_DEMO_REPAIR_BLOCKED",
                      "Die historischen Testdaten können nicht automatisch repariert werden. Es wurden keine Daten verändert.",
                      null,
                      { repair: prepared.report }
                    );
                    return;
                  }
                  if (prepared.report.status === "no-op") return;
                  const putRequest = transaction.objectStore(receiptsStoreName).put(
                    stripExcludedReceiptsData(prepared.candidateSnapshot.stores.receipts)
                  );
                  putRequest.onerror = () => {
                    transactionFailure = new PersistenceError(
                      "HISTORICAL_DEMO_REPAIR_WRITE_FAILED",
                      "Die historischen Testdaten konnten nicht sicher repariert werden. Es wurden keine Teiländerungen übernommen.",
                      putRequest.error
                    );
                  };
                  putRequest.onsuccess = () => {
                    if (simulateFailureAfterWrite) {
                      transactionFailure = new PersistenceError(
                        "HISTORICAL_DEMO_REPAIR_TEST_ABORT",
                        "Simulierter Abbruch der historischen Testdatenreparatur."
                      );
                      transaction.abort();
                      return;
                    }
                    changed = true;
                  };
                } catch (error) {
                  transactionFailure = error instanceof PersistenceError
                    ? error
                    : new PersistenceError(
                      "HISTORICAL_DEMO_REPAIR_PREFLIGHT_FAILED",
                      "Die historischen Testdaten konnten nicht eindeutig geprüft werden. Es wurden keine Daten verändert.",
                      error
                    );
                }
              };
              request.onerror = () => {
                transactionFailure = new PersistenceError(
                  "HISTORICAL_DEMO_REPAIR_READ_FAILED",
                  "Die lokalen Daten konnten nicht vollständig geprüft werden. Es wurden keine Daten verändert.",
                  request.error
                );
              };
              return request;
            });
            void requests;
          } catch (cause) {
            reject(new PersistenceError(
              "HISTORICAL_DEMO_REPAIR_READ_FAILED",
              "Die lokale Reparaturprüfung konnte nicht gestartet werden. Es wurden keine Daten verändert.",
              cause
            ));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (transactionFailure) reject(transactionFailure);
            else if (!preflightReport) reject(new PersistenceError(
              "HISTORICAL_DEMO_REPAIR_PREFLIGHT_FAILED",
              "Die historischen Testdaten konnten nicht vollständig geprüft werden. Es wurden keine Daten verändert."
            ));
            else resolve();
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(transactionFailure || new PersistenceError(
              "HISTORICAL_DEMO_REPAIR_WRITE_FAILED",
              "Die historischen Testdaten konnten nicht sicher repariert werden. Es wurden keine Teiländerungen übernommen.",
              transaction.error
            ));
          };
          transaction.onerror = () => {
            if (!transactionFailure) transactionFailure = new PersistenceError(
              "HISTORICAL_DEMO_REPAIR_WRITE_FAILED",
              "Die historischen Testdaten konnten nicht sicher repariert werden. Es wurden keine Teiländerungen übernommen.",
              transaction.error
            );
          };
        });

        const postCandidate = await readTenantSnapshotCandidate(options);
        const postValidation = validateTenantSnapshot(postCandidate, tenantId);
        const postPlan = prepareHistoricalDemoVoucherReceiptRepair(postValidation.snapshot, canonicalRecords, tenantId);
        if (postPlan.report.status !== "no-op") {
          throw new PersistenceError(
            "HISTORICAL_DEMO_REPAIR_POST_VALIDATION_FAILED",
            "Die lokale Reparatur konnte nicht als vollständig konsistent bestätigt werden.",
            null,
            { repair: postPlan.report }
          );
        }
        return {
          changed,
          report: Object.freeze(cloneSafe({
            ...preflightReport,
            status: changed ? "repaired" : "no-op",
            canRepair: false,
            noOp: !changed,
            postValidation: "consistent"
          })),
          records: cloneSafe(postValidation.snapshot.stores),
          summary: cloneSafe(postValidation.summary)
        };
      });
    }

    function exportTenantSnapshot(options = {}) {
      return queued(async () => {
        const candidate = await readTenantSnapshotCandidate(options);
        return validateTenantSnapshot(candidate, tenantId).snapshot;
      });
    }

    function diagnoseTenantIntegrity(options = {}) {
      return queued(async () => {
        const candidate = await readTenantSnapshotCandidate(options);
        return diagnoseTenantSnapshot(candidate, tenantId, {
          createdAt: candidate.createdAt,
          appVersion: options.appVersion,
          appBuild: options.appBuild,
          canonicalRecords: options.canonicalRecords
        });
      });
    }

    function restoreTenantSnapshot(snapshotInput, options = {}) {
      const validated = validateTenantSnapshot(snapshotInput, tenantId);
      return queued(async () => {
        const database = await openDatabase();
        const storeNames = [storeName, catalogStoreName, customersStoreName, receiptsStoreName, vouchersStoreName];
        const recordKeys = tenantSnapshotConstants.storeKeys;
        const allowTestFailure = databaseName.startsWith("frecka-test-")
          || databaseName.startsWith("frecka-backup-test-")
          || databaseName.startsWith("frecka-persist-smoke-");
        const simulatedFailureAfterStore = allowTestFailure && Number.isInteger(options.simulateFailureAfterStore)
          ? options.simulateFailureAfterStore
          : null;
        const restoredRecords = cloneSafe(validated.snapshot.stores);
        await new Promise((resolve, reject) => {
          let settled = false;
          let failure = null;
          let transaction;
          try {
            transaction = database.transaction(storeNames, "readwrite");
            const writeStore = (currentStoreName, index, record) => {
              const request = transaction.objectStore(currentStoreName).put(cloneSafe(record));
              request.onerror = () => {
                if (!failure) failure = new PersistenceError("BACKUP_RESTORE_FAILED", "Die Wiederherstellung ist fehlgeschlagen. Der bisherige Datenstand bleibt erhalten.", request.error);
              };
              if (simulatedFailureAfterStore === index) {
                request.onsuccess = () => {
                  failure = new PersistenceError("BACKUP_RESTORE_TEST_ABORT", "Simulierter Abbruch der Wiederherstellung.");
                  transaction.abort();
                };
              }
            };
            storeNames.slice(1).forEach((currentStoreName, offset) => {
              const index = offset + 1;
              writeStore(currentStoreName, index, restoredRecords[recordKeys[index]]);
            });
            const settingsStore = transaction.objectStore(storeName);
            const currentSettingsRequest = settingsStore.get(tenantId);
            currentSettingsRequest.onerror = () => {
              if (!failure) failure = new PersistenceError("BACKUP_RESTORE_FAILED", "Der lokale Sicherungsstatus konnte vor der Wiederherstellung nicht gelesen werden.", currentSettingsRequest.error);
              try { transaction.abort(); } catch {}
            };
            currentSettingsRequest.onsuccess = () => {
              try {
                const currentReminder = normalizeBackupReminder(
                  currentSettingsRequest.result?.backupReminder,
                  null,
                  new Date().toISOString()
                );
                restoredRecords.settings.backupReminder = currentReminder;
                writeStore(storeName, 0, restoredRecords.settings);
              } catch (error) {
                failure = error instanceof PersistenceError
                  ? error
                  : new PersistenceError("BACKUP_RESTORE_FAILED", "Der lokale Sicherungsstatus konnte nicht erhalten werden.", error);
                transaction.abort();
              }
            };
          } catch (cause) {
            reject(new PersistenceError("BACKUP_RESTORE_FAILED", "Die Wiederherstellung konnte nicht gestartet werden. Der bisherige Datenstand bleibt erhalten.", cause));
            return;
          }
          transaction.oncomplete = () => {
            if (settled) return;
            settled = true;
            if (failure) reject(failure);
            else resolve();
          };
          transaction.onabort = () => {
            if (settled) return;
            settled = true;
            reject(failure || new PersistenceError("BACKUP_RESTORE_FAILED", "Die Wiederherstellung ist fehlgeschlagen. Der bisherige Datenstand bleibt erhalten.", transaction.error));
          };
          transaction.onerror = () => {
            if (!failure) failure = new PersistenceError("BACKUP_RESTORE_FAILED", "Die Wiederherstellung ist fehlgeschlagen. Der bisherige Datenstand bleibt erhalten.", transaction.error);
          };
        });
        return {
          snapshot: cloneSafe({ ...validated.snapshot, stores: restoredRecords }),
          records: cloneSafe(restoredRecords),
          summary: cloneSafe(validated.summary)
        };
      });
    }

    return Object.freeze({
      openDatabase,
      readSettings,
      writeSettings,
      deleteSettings,
      readCatalog,
      writeCatalog,
      deleteCatalog,
      readCustomers,
      writeCustomers,
      deleteCustomers,
      readReceipts,
      writeReceipts,
      deleteReceipts,
      readVouchers,
      writeVouchers,
      deleteVouchers,
      commitReceipt,
      commitVoucherSale,
      commitVoucherRedemption,
      recordReceiptPayment,
      saveReceiptNote,
      commitReceiptCorrection,
      exportTenantSnapshot,
      diagnoseTenantIntegrity,
      repairHistoricalDemoVoucherReceipts,
      validateTenantSnapshot: snapshot => validateTenantSnapshot(snapshot, tenantId),
      diagnoseTenantSnapshot: snapshot => diagnoseTenantSnapshot(snapshot, tenantId),
      validateVoucherReceiptInvariant,
      inspectVoucherReceiptInvariant,
      restoreTenantSnapshot,
      closeDatabase,
      tenantId
    });
  }

  const defaultPersistence = createSettingsPersistence();
  globalThis.FRECKA_PERSISTENCE = Object.freeze({
    ...defaultPersistence,
    createSettingsPersistence,
    snapshotSettings,
    normalizeSettingsRecord,
    normalizeBackupReminder,
    backupReminderIsDue,
    snoozeBackupReminder,
    completeBackupReminder,
    normalizeCompanyLogo,
    companyIdentity,
    snapshotCatalog,
    normalizeCatalogRecord,
    snapshotCustomers,
    normalizeCustomersRecord,
    snapshotReceipts,
    normalizeReceiptsRecord,
    snapshotVouchers,
    normalizeVouchersRecord,
    validateVoucherReceiptInvariant,
    inspectVoucherReceiptInvariant,
    validateTenantSnapshot,
    diagnoseTenantSnapshot,
    planHistoricalDemoVoucherReceiptRepair,
    tenantSnapshotConstants,
    integrityDiagnosticConstants,
    historicalDemoVoucherReceiptRepairConstants,
    customerMatchesSearch,
    PersistenceError,
    constants
  });
})();
