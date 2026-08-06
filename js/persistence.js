(() => {
  "use strict";

  const constants = Object.freeze({
    databaseName: "frecka",
    databaseVersion: 1,
    storeName: "settings",
    tenantId: "local-default",
    formatVersion: 1
  });

  const forbiddenRootKeys = new Set([
    "catalog", "categories", "businessTemplates", "templateImportStatus",
    "customers", "customerChoices", "receipts", "vouchers", "histories",
    "openReceipt", "drafts", "cancellations", "credits"
  ]);
  const dangerousKeys = new Set(["__proto__", "prototype", "constructor"]);
  const sensitiveKeyPattern = /(password|passphrase|credential|secret|access.?token|refresh.?token|private.?key)/i;
  const setupStatuses = new Set(["not-started", "started", "completed"]);

  class PersistenceError extends Error {
    constructor(code, userMessage, cause = null) {
      super(userMessage);
      this.name = "PersistenceError";
      this.code = code;
      this.userMessage = userMessage;
      if (cause) this.cause = cause;
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
        "Die Einstellungen konnten nicht für die lokale Speicherung vorbereitet werden.",
        cause
      );
    }
  }

  const stringValue = (value, fallback = "") => typeof value === "string" ? value : fallback;
  const booleanValue = (value, fallback = false) => typeof value === "boolean" ? value : fallback;
  const finiteNumber = (value, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const nullableStringId = value => typeof value === "string" && value.trim() ? value : null;
  const uniqueStrings = values => [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === "string" && value.trim()))];
  const validLogoMode = value => ["company", "custom", "none"].includes(value) ? value : "company";
  const validSetupStatus = value => setupStatuses.has(value) ? value : "not-started";

  function snapshotSettings(runtimeData, setupStatus = "not-started", tenantId = constants.tenantId) {
    if (!runtimeData || !isPlainObject(runtimeData.company)) {
      throw new PersistenceError("INVALID_DATA", "Die zentralen Einstellungen sind nicht verfügbar.");
    }

    const company = runtimeData.company;
    const taxSettings = runtimeData.taxSettings || {};
    const receiptSettings = runtimeData.receiptSettings || {};
    const snapshot = {
      formatVersion: constants.formatVersion,
      tenantId: nullableStringId(tenantId) || constants.tenantId,
      updatedAt: new Date().toISOString(),
      company: {
        name: stringValue(company.name),
        owner: stringValue(company.owner),
        street: stringValue(company.street),
        zip: stringValue(company.zip),
        city: stringValue(company.city),
        country: stringValue(company.country, "Deutschland"),
        phone: stringValue(company.phone),
        email: stringValue(company.email),
        taxNumber: stringValue(company.taxNumber),
        vatId: stringValue(company.vatId),
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
      setup: { status: validSetupStatus(typeof setupStatus === "string" ? setupStatus : setupStatus?.status) }
    };

    return cloneSafe(snapshot);
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
    const company = {
      name: stringValue(rawCompany.name, stringValue(defaultCompany.name)),
      owner: stringValue(rawCompany.owner, stringValue(defaultCompany.owner)),
      street: stringValue(rawCompany.street, stringValue(defaultCompany.street)),
      zip: stringValue(rawCompany.zip, stringValue(defaultCompany.zip)),
      city: stringValue(rawCompany.city, stringValue(defaultCompany.city)),
      country: stringValue(rawCompany.country, stringValue(defaultCompany.country, "Deutschland")),
      phone: stringValue(rawCompany.phone, stringValue(defaultCompany.phone)),
      email: stringValue(rawCompany.email, stringValue(defaultCompany.email)),
      taxNumber: stringValue(rawCompany.taxNumber, stringValue(defaultCompany.taxNumber)),
      vatId: stringValue(rawCompany.vatId, stringValue(defaultCompany.vatId)),
      defaultTaxRate: finiteNumber(rawCompany.defaultTaxRate, finiteNumber(defaultCompany.defaultTaxRate, 19)),
      useAsServiceLocation: booleanValue(rawCompany.useAsServiceLocation, defaultCompany.useAsServiceLocation !== false)
    };

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

    const normalizedKnownFields = {
        formatVersion: constants.formatVersion,
        tenantId: nullableStringId(expectedTenantId) || constants.tenantId,
        updatedAt: stringValue(raw.updatedAt),
        company,
        serviceLocations,
        taxSettings,
        receiptSettings,
        paymentChoices,
        businessAreas,
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
      const keyed = next.every(entry => isPlainObject(entry) && nullableStringId(entry.id));
      if (!keyed) return cloneSafe(next);
      const existingById = new Map(existing.filter(entry => isPlainObject(entry) && nullableStringId(entry.id)).map(entry => [entry.id, entry]));
      return next.map(entry => mergePreservingUnknown(existingById.get(entry.id), entry));
    }
    if (!isPlainObject(next)) return cloneSafe(next);
    const result = isPlainObject(existing) ? cloneSafe(existing) : {};
    Object.keys(next).forEach(key => {
      if (dangerousKeys.has(key) || sensitiveKeyPattern.test(key)) return;
      result[key] = mergePreservingUnknown(isPlainObject(existing) || Array.isArray(existing) ? existing[key] : undefined, next[key]);
    });
    return result;
  }

  function stripExcludedData(record) {
    const cleaned = cloneSafe(record) || {};
    forbiddenRootKeys.forEach(key => { delete cleaned[key]; });
    if (isPlainObject(cleaned.company)) {
      Object.keys(cleaned.company).forEach(key => {
        if (key.toLowerCase().startsWith("logo")) delete cleaned.company[key];
      });
    }
    if (Array.isArray(cleaned.businessAreas)) {
      cleaned.businessAreas.forEach(area => {
        if (!isPlainObject(area)) return;
        Object.keys(area).forEach(key => {
          if (key !== "logoMode" && key.toLowerCase().startsWith("logo")) delete area[key];
        });
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
        };
        request.onsuccess = () => {
          const database = request.result;
          if (settled) {
            database.close();
            return;
          }
          if (!database.objectStoreNames.contains(storeName)) {
            settled = true;
            database.close();
            reject(new PersistenceError("SCHEMA_MISSING", "Die lokale Datenbank besitzt nicht das erwartete Einstellungsschema."));
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

    function closeDatabase() {
      if (!databasePromise) return;
      databasePromise.then(database => database.close()).catch(() => {});
      databasePromise = null;
    }

    return Object.freeze({ openDatabase, readSettings, writeSettings, deleteSettings, closeDatabase, tenantId });
  }

  const defaultPersistence = createSettingsPersistence();
  globalThis.FRECKA_PERSISTENCE = Object.freeze({
    ...defaultPersistence,
    createSettingsPersistence,
    snapshotSettings,
    normalizeSettingsRecord,
    PersistenceError,
    constants
  });
})();
