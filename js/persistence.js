(() => {
  "use strict";

  const constants = Object.freeze({
    databaseName: "frecka",
    databaseVersion: 4,
    storeName: "settings",
    settingsStoreName: "settings",
    catalogStoreName: "catalog",
    customersStoreName: "customers",
    receiptsStoreName: "receipts",
    tenantId: "local-default",
    formatVersion: 1,
    settingsFormatVersion: 1,
    catalogFormatVersion: 1,
    customersFormatVersion: 1,
    receiptsFormatVersion: 1
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
    "drafts", "cancellations", "credits", "images", "logos"
  ]);
  const customersForbiddenRootKeys = new Set([
    "company", "serviceLocations", "businessAreas", "taxSettings", "receiptSettings",
    "paymentChoices", "setup", "catalog", "categories", "businessTemplates",
    "templateImportStatus", "customerChoices", "receipts", "vouchers", "histories",
    "openReceipt", "drafts", "cancellations", "credits", "emailStatus"
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
    "openReceipt", "drafts", "cancellations", "credits", "images", "logos"
  ]);
  const receiptForbiddenKeys = new Set([
    "voucher", "voucherObject", "voucherHistory", "emailStatus", "emailHistory",
    "pdf", "pdfFile", "qrData", "tse", "fiscalization"
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

  function stableIso(value, fallback = epochIso) {
    if (typeof value === "string" && value.trim()) {
      const timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
    }
    const fallbackTimestamp = Date.parse(fallback);
    return Number.isFinite(fallbackTimestamp) ? new Date(fallbackTimestamp).toISOString() : epochIso;
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
      customer.email
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
      ? cloneSafe(receipt.companySnapshot)
      : isPlainObject(contextSnapshot.company) ? cloneSafe(contextSnapshot.company) : null;
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
    const seenIds = new Set();
    const seenNumbers = new Set();
    const receipts = source.flatMap(entry => {
      const normalized = normalizeReceiptEntry(entry, raw.updatedAt || epochIso);
      if (!normalized) {
        repairs.add("RECEIPT_REMOVED");
        return [];
      }
      if (seenIds.has(normalized.id) || seenNumbers.has(normalized.number)) {
        repairs.add("RECEIPT_DUPLICATE_REMOVED");
        return [];
      }
      seenIds.add(normalized.id);
      seenNumbers.add(normalized.number);
      return [normalized];
    });
    return {
      record: stripExcludedReceiptsData(mergePreservingUnknown(raw, {
        formatVersion: constants.receiptsFormatVersion,
        tenantId: nullableStringId(expectedTenantId) || constants.tenantId,
        updatedAt: stableIso(raw.updatedAt, epochIso),
        receipts
      })),
      repairs: [...repairs]
    };
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
            || !database.objectStoreNames.contains(receiptsStoreName)) {
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
                const existingSettings = settingsRequest.result;
                if (existingSettings?.formatVersion > constants.settingsFormatVersion) {
                  throw new PersistenceError("UNSUPPORTED_FORMAT", "Die gespeicherten Einstellungen stammen aus einer neueren FRECKA-Version.");
                }
                const currentReceipts = receiptsRequest.result
                  ? normalizeReceiptsRecord(receiptsRequest.result, seedRecord, tenantId).record
                  : normalizeReceiptsRecord(seedRecord, seedRecord, tenantId).record;
                const existingById = currentReceipts.receipts.find(receipt => receipt.id === draft.id);
                const mergedSettings = stripExcludedData(mergePreservingUnknown(existingSettings, requestedSettings));
                mergedSettings.formatVersion = constants.settingsFormatVersion;
                mergedSettings.tenantId = tenantId;
                mergedSettings.updatedAt = new Date().toISOString();
                if (existingById) {
                  committedResult = {
                    created: false,
                    receipt: cloneSafe(existingById),
                    receiptsRecord: cloneSafe(currentReceipts),
                    settingsRecord: cloneSafe(mergedSettings)
                  };
                  return;
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

                const settingsPut = settingsStore.put(mergedSettings);
                const receiptsPut = receiptsStore.put(stripExcludedReceiptsData(currentReceipts));
                settingsPut.onerror = () => fail("RECEIPT_COMMIT_FAILED", "Der Belegabschluss konnte nicht lokal gespeichert werden.", settingsPut.error);
                receiptsPut.onerror = () => fail("RECEIPT_COMMIT_FAILED", "Der Belegabschluss konnte nicht lokal gespeichert werden.", receiptsPut.error);
                committedResult = {
                  created: true,
                  receipt: cloneSafe(receipt),
                  receiptsRecord: cloneSafe(currentReceipts),
                  settingsRecord: cloneSafe(mergedSettings)
                };
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
      commitReceipt,
      recordReceiptPayment,
      saveReceiptNote,
      commitReceiptCorrection,
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
    snapshotCatalog,
    normalizeCatalogRecord,
    snapshotCustomers,
    normalizeCustomersRecord,
    snapshotReceipts,
    normalizeReceiptsRecord,
    customerMatchesSearch,
    PersistenceError,
    constants
  });
})();
