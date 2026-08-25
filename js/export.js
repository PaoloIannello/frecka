(() => {
  "use strict";

  const constants = Object.freeze({
    exportFormat: "FRECKA_EXPORT",
    exportFormatVersion: 1,
    csvDelimiter: ";",
    csvLineEnding: "\r\n",
    csvBom: "\uFEFF",
    dateFormat: "TT.MM.JJJJ",
    timeFormat: "HH:mm",
    exportTypes: Object.freeze(["tax-advisor", "own-data"]),
    periodTypes: Object.freeze(["current-month", "last-month", "custom"])
  });

  const csvDefinitions = Object.freeze({
    receipts: Object.freeze({
      filename: "Belege.csv",
      columns: Object.freeze([
        ["Belegnummer", "receiptNumber"],
        ["Belegart", "receiptType"],
        ["Datum", "date"],
        ["Uhrzeit", "time"],
        ["Geschäftsbereich", "businessArea"],
        ["Kunde", "customer"],
        ["Netto", "net"],
        ["Steuer", "tax"],
        ["Brutto", "gross"],
        ["Zahlungsstatus", "paymentStatus"],
        ["Zahlungsart", "paymentMethod"],
        ["Storno", "cancellation"],
        ["Gutschrift", "credit"]
      ])
    }),
    positions: Object.freeze({
      filename: "Belegpositionen.csv",
      columns: Object.freeze([
        ["Belegnummer", "receiptNumber"],
        ["Position", "position"],
        ["Bezeichnung", "name"],
        ["Typ", "type"],
        ["Menge", "quantity"],
        ["Einzelpreis", "unitPrice"],
        ["Rabatt", "discount"],
        ["Steuersatz", "taxRate"],
        ["Netto", "net"],
        ["Steuer", "tax"],
        ["Brutto", "gross"]
      ])
    }),
    summary: Object.freeze({
      filename: "Übersicht.csv",
      columns: Object.freeze([
        ["Zeilenart", "rowType"],
        ["Geschäftsbereich", "businessArea"],
        ["Steuersatz", "taxRate"],
        ["Anzahl Belege", "receiptCount"],
        ["Netto", "net"],
        ["Steuer", "tax"],
        ["Brutto", "gross"]
      ])
    }),
    vouchers: Object.freeze({
      filename: "Gutscheine.csv",
      columns: Object.freeze([
        ["Code", "code"],
        ["Status", "status"],
        ["Ausstellungsdatum", "issuedDate"],
        ["Ursprungswert", "issuedValue"],
        ["Restwert", "balance"],
        ["Verkaufsbeleg", "saleReceipt"],
        ["Geschäftsbereich", "businessArea"],
        ["Kunde", "customer"]
      ])
    }),
    voucherHistory: Object.freeze({
      filename: "Gutschein-Historie.csv",
      columns: Object.freeze([
        ["Code", "code"],
        ["Ereignis", "event"],
        ["Datum", "date"],
        ["Uhrzeit", "time"],
        ["Betrag", "amount"],
        ["Restwert danach", "balanceAfter"],
        ["Belegnummer", "receiptNumber"]
      ])
    }),
    customers: Object.freeze({
      filename: "Kunden.csv",
      columns: Object.freeze([
        ["Kunden-ID", "id"],
        ["Status", "status"],
        ["Vorname", "firstName"],
        ["Nachname", "lastName"],
        ["Firma", "companyName"],
        ["Telefon", "phone"],
        ["Mobil", "mobile"],
        ["E-Mail", "email"],
        ["Straße", "street"],
        ["PLZ", "postalCode"],
        ["Ort", "city"],
        ["Erstellt", "createdAt"],
        ["Aktualisiert", "updatedAt"]
      ])
    })
  });

  class ExportError extends Error {
    constructor(code, message) {
      super(message);
      this.name = "ExportError";
      this.code = code;
      this.userMessage = message;
    }
  }

  const isPlainObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const text = value => value == null ? "" : String(value).trim();
  const finiteNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function snapshotCompanyIdentity(company) {
    const resolver = globalThis.FRECKA_PERSISTENCE?.companyIdentity;
    if (typeof resolver !== "function") {
      throw new ExportError("INVALID_SNAPSHOT", "Die Unternehmensdarstellung des FRECKA-Datensnapshots ist nicht verfügbar.");
    }
    return resolver(company);
  }

  function projectOwnCompany(company) {
    const identity = snapshotCompanyIdentity(company);
    return Object.freeze({
      name: identity.name,
      owner: identity.owner,
      contactPerson: text(company?.contactPerson),
      street: text(company?.street),
      houseNumber: text(company?.houseNumber),
      postalCode: text(company?.zip),
      city: text(company?.city),
      country: text(company?.country),
      phone: text(company?.phone),
      email: text(company?.email),
      website: text(company?.website),
      taxNumber: text(company?.taxNumber),
      vatId: text(company?.vatId),
      updatedAt: text(company?.updatedAt),
      logo: isPlainObject(company?.logo) ? Object.freeze({
        formatVersion: finiteNumber(company.logo.formatVersion, 1),
        assetId: text(company.logo.assetId),
        name: text(company.logo.name),
        mimeType: text(company.logo.mimeType),
        size: finiteNumber(company.logo.size),
        updatedAt: text(company.logo.updatedAt)
      }) : null
    });
  }

  function projectOwnOperatingSettings(settings) {
    const activeAreas = (Array.isArray(settings?.businessAreas) ? settings.businessAreas : [])
      .filter(area => area?.active !== false);
    const defaultArea = activeAreas.find(area => area?.isDefault === true) || activeAreas[0] || null;
    const taxSettings = isPlainObject(settings?.taxSettings) ? settings.taxSettings : {};
    const receiptSettings = isPlainObject(settings?.receiptSettings) ? settings.receiptSettings : {};
    const backupInterval = new Set(["48-hours", "5-days", "weekly"]).has(settings?.backupReminder?.interval)
      ? settings.backupReminder.interval
      : "weekly";
    const paymentChoices = (Array.isArray(settings?.paymentChoices) ? settings.paymentChoices : []).map((choice, index) => Object.freeze({
      id: text(choice?.id),
      title: text(choice?.title),
      active: choice?.active !== false,
      order: index + 1
    }));
    return Object.freeze({
      logoAssets: Object.freeze((Array.isArray(settings?.logoAssets) ? settings.logoAssets : []).map(asset => Object.freeze({
        formatVersion: finiteNumber(asset?.formatVersion, 1),
        assetId: text(asset?.assetId),
        fileName: text(asset?.fileName),
        mimeType: text(asset?.mimeType),
        size: finiteNumber(asset?.size),
        createdAt: text(asset?.createdAt)
      }))),
      currency: text(receiptSettings.currency) || "EUR",
      language: text(receiptSettings.language) || "Deutsch",
      taxStatus: text(taxSettings.status),
      defaultTaxRate: finiteNumber(taxSettings.defaultRate),
      activeTaxRates: Object.freeze((Array.isArray(taxSettings.rates) ? taxSettings.rates : [])
        .filter(rate => rate?.active !== false)
        .map(rate => finiteNumber(rate?.rate))),
      defaultBusinessArea: defaultArea ? Object.freeze({ id: text(defaultArea.id), label: text(defaultArea.label) }) : null,
      businessAreas: Object.freeze(activeAreas.map(area => Object.freeze({
        id: text(area.id),
        label: text(area.label),
        visibleName: text(area.visibleName),
        logoMode: ["company", "custom", "none"].includes(area.logoMode) ? area.logoMode : "company",
        logo: isPlainObject(area.logo) ? Object.freeze({
          formatVersion: finiteNumber(area.logo.formatVersion, 1),
          assetId: text(area.logo.assetId),
          name: text(area.logo.name),
          mimeType: text(area.logo.mimeType),
          size: finiteNumber(area.logo.size),
          updatedAt: text(area.logo.updatedAt)
        }) : null
      }))),
      paymentChoices: Object.freeze(paymentChoices),
      receiptNumbering: Object.freeze({
        yearPrefix: text(receiptSettings.yearPrefix),
        nextNumber: Number.isInteger(receiptSettings.nextNumber) ? receiptSettings.nextNumber : null
      }),
      receiptTexts: Object.freeze({
        footerText: text(receiptSettings.footerText),
        thankYouText: text(receiptSettings.thankYouText)
      }),
      backupReminder: Object.freeze({ interval: backupInterval })
    });
  }

  function projectActiveUser(settings, tenantId) {
    const users = Array.isArray(settings?.users) ? settings.users : [];
    const activeUser = users.find(user => text(user?.id) === text(settings?.activeUserId) && user?.active === true);
    if (users.length !== 1 || !activeUser || text(activeUser.tenantId) !== text(tenantId)) {
      throw new ExportError("INVALID_SNAPSHOT", "Der lokale Benutzer des FRECKA-Datensnapshots ist nicht eindeutig.");
    }
    return Object.freeze({
      formatVersion: finiteNumber(activeUser.formatVersion, 1),
      id: text(activeUser.id),
      tenantId: text(activeUser.tenantId),
      displayName: text(activeUser.displayName),
      active: true,
      createdAt: text(activeUser.createdAt),
      updatedAt: text(activeUser.updatedAt)
    });
  }

  function projectLocalLicense(settings, tenantId) {
    const license = settings?.license;
    const validTimestamp = value => typeof value === "string" && Number.isFinite(Date.parse(value));
    if (!isPlainObject(license)
      || license.formatVersion !== 1
      || !text(license.licenseId)
      || text(license.tenantId) !== text(tenantId)
      || !text(license.deviceId)
      || !validTimestamp(license.activatedAt)
      || !validTimestamp(license.lastValidation)) {
      throw new ExportError("INVALID_SNAPSHOT", "Die lokale Lizenz des FRECKA-Datensnapshots ist nicht eindeutig.");
    }
    return Object.freeze({
      formatVersion: license.formatVersion,
      licenseId: text(license.licenseId),
      tenantId: text(license.tenantId),
      deviceId: text(license.deviceId),
      activatedAt: text(license.activatedAt),
      lastValidation: text(license.lastValidation)
    });
  }

  function projectTseSettings(settings) {
    const tseSettings = settings?.tseSettings;
    if (!isPlainObject(tseSettings)
      || tseSettings.formatVersion !== 1
      || text(tseSettings.provider) !== "fiskaly SIGN DE"
      || tseSettings.enabled !== false
      || text(tseSettings.setupStatus) !== "not-configured"
      || text(tseSettings.connectionStatus) !== "not-connected") {
      throw new ExportError("INVALID_SNAPSHOT", "Die lokale TSE-Vorbereitung des FRECKA-Datensnapshots ist nicht eindeutig.");
    }
    return Object.freeze({
      formatVersion: tseSettings.formatVersion,
      provider: tseSettings.provider,
      enabled: false,
      setupStatus: tseSettings.setupStatus,
      connectionStatus: tseSettings.connectionStatus
    });
  }

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function assertSnapshot(snapshot) {
    if (!isPlainObject(snapshot) || !isPlainObject(snapshot.stores)) {
      throw new ExportError("INVALID_SNAPSHOT", "Der zentrale FRECKA-Datensnapshot ist nicht verfügbar.");
    }
    const required = ["settings", "customers", "receipts", "vouchers"];
    const missing = required.filter(store => !isPlainObject(snapshot.stores[store]));
    if (missing.length
      || !Array.isArray(snapshot.stores.settings.businessAreas)
      || !Array.isArray(snapshot.stores.customers.customers)
      || !Array.isArray(snapshot.stores.receipts.receipts)
      || !Array.isArray(snapshot.stores.vouchers.vouchers)) {
      throw new ExportError("INVALID_SNAPSHOT", "Der zentrale FRECKA-Datensnapshot ist unvollständig.");
    }
    const validateInvariant = globalThis.FRECKA_PERSISTENCE?.validateVoucherReceiptInvariant;
    if (typeof validateInvariant !== "function") {
      throw new ExportError("INVALID_SNAPSHOT", "Die Prüfung der Gutschein-Verkaufsbelege ist nicht verfügbar.");
    }
    try {
      validateInvariant(snapshot.stores.receipts, snapshot.stores.vouchers);
    } catch (error) {
      throw new ExportError(
        "VOUCHER_RECEIPT_INVARIANT_INVALID",
        error?.userMessage || "Die Gutschein-Verkaufsbelege sind unvollständig oder widersprüchlich. Der Export wurde nicht erstellt."
      );
    }
  }

  function dateKey(value) {
    const source = text(value);
    const iso = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const german = source.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (german) return `${german[3]}-${german[2]}-${german[1]}`;
    return "";
  }

  function validDateKey(value) {
    const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    return candidate.getUTCFullYear() === year
      && candidate.getUTCMonth() === month - 1
      && candidate.getUTCDate() === day;
  }

  function formatDateKey(value) {
    const key = dateKey(value);
    if (!key) return "";
    const [year, month, day] = key.split("-");
    return `${day}.${month}.${year}`;
  }

  function formatTime(value, fallback = "") {
    const source = text(value);
    const isoTime = source.match(/T(\d{2}):(\d{2})/);
    if (isoTime) return `${isoTime[1]}:${isoTime[2]}`;
    const direct = source.match(/^(\d{1,2}):(\d{2})/);
    if (direct) return `${direct[1].padStart(2, "0")}:${direct[2]}`;
    const fallbackTime = text(fallback).match(/^(\d{1,2}):(\d{2})/);
    return fallbackTime ? `${fallbackTime[1].padStart(2, "0")}:${fallbackTime[2]}` : "";
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function localDateTimeValue(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${localDateKey(date)}T${hours}:${minutes}:${seconds}`;
  }

  function resolvePeriod(period, referenceDate = new Date()) {
    const type = text(period?.type || period);
    if (!constants.periodTypes.includes(type)) {
      throw new ExportError("INVALID_PERIOD", "Bitte einen gültigen Exportzeitraum auswählen.");
    }
    if (type === "custom") {
      const dateFrom = text(period?.dateFrom);
      const dateTo = text(period?.dateTo);
      if (!validDateKey(dateFrom) || !validDateKey(dateTo) || dateFrom > dateTo) {
        throw new ExportError("INVALID_PERIOD", "Bitte einen gültigen eigenen Zeitraum auswählen.");
      }
      return { type, dateFrom, dateTo };
    }
    const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    if (!Number.isFinite(reference.getTime())) {
      throw new ExportError("INVALID_PERIOD", "Das Referenzdatum für den Export ist ungültig.");
    }
    const monthOffset = type === "last-month" ? -1 : 0;
    const start = new Date(reference.getFullYear(), reference.getMonth() + monthOffset, 1);
    const end = new Date(reference.getFullYear(), reference.getMonth() + monthOffset + 1, 0);
    return { type, dateFrom: localDateKey(start), dateTo: localDateKey(end) };
  }

  function inRange(value, range) {
    const key = dateKey(value);
    return Boolean(key) && key >= range.dateFrom && key <= range.dateTo;
  }

  function cents(source, centsKey, decimalKey) {
    if (Number.isInteger(source?.[centsKey])) return source[centsKey];
    return Math.round(finiteNumber(source?.[decimalKey]) * 100);
  }

  function germanDecimal(value, digits = 2) {
    const number = finiteNumber(value);
    return number.toFixed(digits).replace(".", ",");
  }

  function moneyFromCents(value) {
    return germanDecimal(finiteNumber(value) / 100, 2);
  }

  function quantity(value) {
    const number = finiteNumber(value, 1);
    return Number.isInteger(number) ? String(number) : germanDecimal(number, 3).replace(/0+$/, "").replace(/,$/, "");
  }

  function customerLabel(customer) {
    if (!isPlainObject(customer)) return "";
    const direct = text(customer.name);
    if (direct) return direct;
    const personal = [text(customer.firstName), text(customer.lastName)].filter(Boolean).join(" ");
    return personal || text(customer.companyName) || text(customer.id);
  }

  function areaSnapshot(source) {
    return source?.businessAreaSnapshot || source?.contextSnapshot?.businessArea || null;
  }

  function areaId(source) {
    return text(source?.businessAreaId) || text(areaSnapshot(source)?.id);
  }

  function areaLabel(source, settingsAreaById) {
    const snapshot = areaSnapshot(source);
    return text(snapshot?.visibleName) || text(snapshot?.label) || text(settingsAreaById.get(areaId(source))?.label) || areaId(source);
  }

  function matchesArea(source, selectedAreaId) {
    return selectedAreaId === "all" || areaId(source) === selectedAreaId;
  }

  function receiptDateValue(receipt) {
    return text(receipt.date) || text(receipt.completedAt) || text(receipt.createdAt) || text(receipt.sortKey);
  }

  function receiptTimeValue(receipt) {
    return text(receipt.time) || text(receipt.completedAt) || text(receipt.createdAt) || text(receipt.sortKey);
  }

  function voucherDateValue(voucher) {
    return text(voucher.soldAt) || text(voucher.soldAtIso) || text(voucher.saleReceipt?.soldAt) || text(voucher.createdAt);
  }

  function voucherTimeValue(voucher) {
    return text(voucher.soldTime) || text(voucher.soldAtIso) || text(voucher.saleReceipt?.soldAt) || text(voucher.createdAt);
  }

  function receiptTypeLabel(receipt) {
    if (receipt.receiptKind === "voucher-sale") return "Gutscheinverkauf";
    if (receipt.receiptType === "cancellation" || receipt.type === "cancellation") return "Stornobeleg";
    if (receipt.receiptType === "credit" || receipt.type === "credit") return "Gutschrift";
    return "Beleg";
  }

  function positionTypeLabel(type) {
    return ({ service: "Leistung", product: "Produkt", "voucher-sale": "Gutschein" })[type] || text(type) || "Position";
  }

  function paymentStatusLabel(receipt) {
    return receipt.paymentStatus === "open" ? "Offen" : "Bezahlt";
  }

  function paymentMethodLabel(receipt) {
    const method = text(receipt.paymentMethod) || text(receipt.payment);
    const labels = { cash: "Bar", card: "Karte", ec: "Karte", voucher: "Gutschein", later: "Später" };
    return labels[method.toLowerCase()] || method;
  }

  function cancellationLabel(receipt) {
    if (receipt.receiptType === "cancellation" || receipt.type === "cancellation") return "Stornobeleg";
    return receipt.status === "cancelled" ? "Storniert" : "Nein";
  }

  function creditLabel(receipt) {
    if (receipt.receiptType === "credit" || receipt.type === "credit") return "Gutschrift";
    if (receipt.status === "credited") return "Vollständig";
    if (receipt.status === "partially-credited") return "Teilweise";
    return "Nein";
  }

  function voucherStatusLabel(status) {
    return ({
      active: "Aktiv",
      partially_redeemed: "Teilweise eingelöst",
      redeemed: "Vollständig eingelöst",
      cancelled: "Storniert"
    })[status] || text(status);
  }

  function voucherEventLabel(type) {
    return ({
      sold: "Verkauft",
      partial_redemption: "Teilweise eingelöst",
      full_redemption: "Vollständig eingelöst",
      cancelled: "Storniert",
      credit: "Gutschrift"
    })[type] || text(type);
  }

  function sortByTimestamp(left, right) {
    const leftKey = `${dateKey(left.timestamp)}T${formatTime(left.timestamp, left.time)}`;
    const rightKey = `${dateKey(right.timestamp)}T${formatTime(right.timestamp, right.time)}`;
    return leftKey.localeCompare(rightKey, "de");
  }

  function projectReceipts(receipts, range, selectedAreaId, settingsAreaById) {
    const selected = receipts
      .filter(receipt => matchesArea(receipt, selectedAreaId) && inRange(receiptDateValue(receipt), range))
      .map(receipt => ({ receipt, timestamp: receiptDateValue(receipt), time: receiptTimeValue(receipt) }))
      .sort(sortByTimestamp)
      .map(entry => entry.receipt);
    const rows = selected.map(receipt => ({
      receiptNumber: text(receipt.receiptNumber) || text(receipt.number),
      receiptType: receiptTypeLabel(receipt),
      date: formatDateKey(receiptDateValue(receipt)),
      time: formatTime(receiptTimeValue(receipt)),
      businessArea: areaLabel(receipt, settingsAreaById),
      customer: customerLabel(receipt.customerSnapshot || receipt.customer),
      net: moneyFromCents(cents(receipt, "netTotalCents", "netTotal")),
      tax: moneyFromCents(cents(receipt, "taxTotalCents", "taxTotal")),
      gross: moneyFromCents(cents(receipt, "totalCents", "total")),
      paymentStatus: paymentStatusLabel(receipt),
      paymentMethod: paymentMethodLabel(receipt),
      cancellation: cancellationLabel(receipt),
      credit: creditLabel(receipt)
    }));
    const positionRows = selected.flatMap(receipt => {
      const positions = Array.isArray(receipt.positions) ? receipt.positions : Array.isArray(receipt.items) ? receipt.items : [];
      return positions.map((position, index) => ({
        receiptNumber: text(receipt.receiptNumber) || text(receipt.number),
        position: index + 1,
        name: text(position.name) || text(position.title),
        type: positionTypeLabel(position.type),
        quantity: quantity(position.quantity),
        unitPrice: moneyFromCents(cents(position, "unitPriceCents", "unitPrice")),
        discount: moneyFromCents(cents(position, "discountCents", "discountTotal")),
        taxRate: germanDecimal(position.taxRate, 2),
        net: moneyFromCents(cents(position, "netCents", "netTotal")),
        tax: moneyFromCents(cents(position, "taxCents", "taxAmount")),
        gross: moneyFromCents(cents(position, "grossCents", "total"))
      }));
    });
    return { selected, rows, positionRows };
  }

  function storedMoneyGroup(source) {
    const netCents = cents(source, "netCents", "net");
    const taxCents = cents(source, "taxCents", "tax");
    const hasGross = Number.isInteger(source?.grossCents) || Number.isFinite(Number(source?.gross));
    return {
      netCents,
      taxCents,
      grossCents: hasGross ? cents(source, "grossCents", "gross") : netCents + taxCents
    };
  }

  function receiptStoredTotals(receipt) {
    return {
      netCents: cents(receipt, "netTotalCents", "netTotal"),
      taxCents: cents(receipt, "taxTotalCents", "taxTotal"),
      grossCents: cents(receipt, "totalCents", "total")
    };
  }

  function storedTaxGroups(receipt) {
    const sourceGroups = Array.isArray(receipt.taxBreakdown)
      ? receipt.taxBreakdown
      : Array.isArray(receipt.taxGroups) ? receipt.taxGroups : [];
    if (sourceGroups.length) {
      return sourceGroups.map(group => ({
        rate: Number.isFinite(Number(group?.rate)) ? Number(group.rate) : null,
        ...storedMoneyGroup(group)
      }));
    }

    const positions = Array.isArray(receipt.positions) ? receipt.positions : Array.isArray(receipt.items) ? receipt.items : [];
    const byRate = new Map();
    positions.forEach(position => {
      const rate = position?.taxRate === "" || position?.taxRate == null || !Number.isFinite(Number(position.taxRate))
        ? null
        : Number(position.taxRate);
      const key = rate == null ? "unreported" : `rate:${rate}`;
      const current = byRate.get(key) || { rate, netCents: 0, taxCents: 0, grossCents: 0 };
      const stored = {
        netCents: cents(position, "netCents", "netTotal"),
        taxCents: cents(position, "taxCents", "taxAmount"),
        grossCents: cents(position, "grossCents", "total")
      };
      current.netCents += stored.netCents;
      current.taxCents += stored.taxCents;
      current.grossCents += stored.grossCents;
      byRate.set(key, current);
    });
    const grouped = [...byRate.values()];
    const groupedTotals = grouped.reduce((sum, group) => ({
      netCents: sum.netCents + group.netCents,
      taxCents: sum.taxCents + group.taxCents,
      grossCents: sum.grossCents + group.grossCents
    }), { netCents: 0, taxCents: 0, grossCents: 0 });
    const receiptTotals = receiptStoredTotals(receipt);
    const positionsHaveStoredValues = Object.values(groupedTotals).some(value => value !== 0)
      || Object.values(receiptTotals).every(value => value === 0);
    return grouped.length && positionsHaveStoredValues
      ? grouped
      : [{ rate: null, ...receiptTotals }];
  }

  function createSummaryRows(receipts, settingsAreaById) {
    const areaTotals = new Map();
    const taxTotals = new Map();
    const grand = { receiptIds: new Set(), netCents: 0, taxCents: 0, grossCents: 0 };

    receipts.forEach((receipt, index) => {
      const receiptId = text(receipt.id) || text(receipt.receiptNumber) || text(receipt.number) || `receipt-${index + 1}`;
      const businessAreaId = areaId(receipt) || "unassigned";
      const businessArea = areaLabel(receipt, settingsAreaById) || "Nicht zugeordnet";
      const receiptTotals = receiptStoredTotals(receipt);
      const area = areaTotals.get(businessAreaId) || {
        businessAreaId,
        businessArea,
        receiptIds: new Set(),
        netCents: 0,
        taxCents: 0,
        grossCents: 0
      };
      area.receiptIds.add(receiptId);
      area.netCents += receiptTotals.netCents;
      area.taxCents += receiptTotals.taxCents;
      area.grossCents += receiptTotals.grossCents;
      areaTotals.set(businessAreaId, area);

      grand.receiptIds.add(receiptId);
      grand.netCents += receiptTotals.netCents;
      grand.taxCents += receiptTotals.taxCents;
      grand.grossCents += receiptTotals.grossCents;

      storedTaxGroups(receipt).forEach(group => {
        const rateKey = group.rate == null ? "unreported" : `rate:${group.rate}`;
        const key = `${businessAreaId}\u0000${rateKey}`;
        const taxGroup = taxTotals.get(key) || {
          businessAreaId,
          businessArea,
          rate: group.rate,
          receiptIds: new Set(),
          netCents: 0,
          taxCents: 0,
          grossCents: 0
        };
        taxGroup.receiptIds.add(receiptId);
        taxGroup.netCents += group.netCents;
        taxGroup.taxCents += group.taxCents;
        taxGroup.grossCents += group.grossCents;
        taxTotals.set(key, taxGroup);
      });
    });

    const moneyRow = (rowType, businessArea, taxRate, totals) => Object.freeze({
      rowType,
      businessArea,
      taxRate,
      receiptCount: totals.receiptIds.size,
      net: moneyFromCents(totals.netCents),
      tax: moneyFromCents(totals.taxCents),
      gross: moneyFromCents(totals.grossCents)
    });
    const rows = [];
    [...areaTotals.values()]
      .sort((left, right) => left.businessArea.localeCompare(right.businessArea, "de"))
      .forEach(area => {
        [...taxTotals.values()]
          .filter(group => group.businessAreaId === area.businessAreaId)
          .sort((left, right) => {
            if (left.rate == null) return 1;
            if (right.rate == null) return -1;
            return left.rate - right.rate;
          })
          .forEach(group => rows.push(moneyRow(
            "Steuersatz",
            group.businessArea,
            group.rate == null ? "Nicht ausgewiesen" : germanDecimal(group.rate, 2),
            group
          )));
        rows.push(moneyRow("Geschäftsbereich gesamt", area.businessArea, "", area));
      });
    rows.push(moneyRow("Gesamtsumme", "Alle Geschäftsbereiche", "", grand));
    return Object.freeze(rows);
  }

  function projectVouchers(vouchers, range, selectedAreaId, settingsAreaById) {
    const areaVouchers = vouchers.filter(voucher => matchesArea(voucher, selectedAreaId));
    const selected = areaVouchers
      .filter(voucher => inRange(voucherDateValue(voucher), range))
      .map(voucher => ({ voucher, timestamp: voucherDateValue(voucher), time: voucherTimeValue(voucher) }))
      .sort(sortByTimestamp)
      .map(entry => entry.voucher);
    const rows = selected.map(voucher => ({
      code: text(voucher.code),
      status: voucherStatusLabel(voucher.status),
      issuedDate: formatDateKey(voucherDateValue(voucher)),
      issuedValue: moneyFromCents(cents(voucher, "issuedValueCents", "issuedValue")),
      balance: moneyFromCents(cents(voucher, "currentValueCents", "currentValue")),
      saleReceipt: text(voucher.saleReceipt?.number) || text(voucher.saleReceiptReference),
      businessArea: areaLabel(voucher, settingsAreaById),
      customer: customerLabel(voucher.customerSnapshot || voucher.customer)
    }));
    const historyEntries = areaVouchers.flatMap(voucher => (Array.isArray(voucher.history) ? voucher.history : []).map((history, index) => ({
      voucher,
      history,
      index,
      timestamp: text(history.date) || text(history.occurredAt),
      time: text(history.time) || text(history.occurredAt)
    })));
    const selectedHistoryEntries = historyEntries
      .filter(entry => inRange(entry.timestamp, range))
      .sort((left, right) => sortByTimestamp(left, right) || left.index - right.index);
    const historyRows = selectedHistoryEntries.map(({ voucher, history, timestamp, time }) => ({
      code: text(voucher.code),
      event: voucherEventLabel(history.type),
      date: formatDateKey(timestamp) || text(history.date),
      time: formatTime(time),
      amount: moneyFromCents(cents(history, "amountCents", "amount")),
      balanceAfter: moneyFromCents(cents(history, "balanceAfterCents", "balanceAfter")),
      receiptNumber: text(history.receiptNumber) || text(history.receiptReference)
    }));
    return { selected, rows, selectedHistoryEntries, historyRows };
  }

  function projectCustomers(customers, receiptSelection, voucherSelection, voucherHistorySelection) {
    const referencedIds = new Set();
    receiptSelection.forEach(receipt => {
      const id = text(receipt.customerId) || text(receipt.customerSnapshot?.id) || text(receipt.customer?.id);
      if (id) referencedIds.add(id);
    });
    [...voucherSelection, ...voucherHistorySelection.map(entry => entry.voucher)].forEach(voucher => {
      const id = text(voucher.customerId) || text(voucher.customerSnapshot?.id) || text(voucher.customer?.id);
      if (id) referencedIds.add(id);
    });
    return customers
      .filter(customer => referencedIds.has(text(customer.id)))
      .sort((left, right) => customerLabel(left).localeCompare(customerLabel(right), "de"))
      .map(customer => ({
        id: text(customer.id),
        status: customer.active === false ? "Deaktiviert" : "Aktiv",
        firstName: text(customer.firstName),
        lastName: text(customer.lastName),
        companyName: text(customer.companyName),
        phone: text(customer.phone),
        mobile: text(customer.mobile),
        email: text(customer.email),
        street: text(customer.street),
        postalCode: text(customer.postalCode) || text(customer.zip),
        city: text(customer.city),
        createdAt: formatDateKey(customer.createdAt),
        updatedAt: formatDateKey(customer.updatedAt)
      }));
  }

  function normalizeOptions(options = {}) {
    const exportType = text(options.exportType || options.type) || "tax-advisor";
    if (!constants.exportTypes.includes(exportType)) {
      throw new ExportError("INVALID_EXPORT_TYPE", "Bitte einen gültigen Exporttyp auswählen.");
    }
    const range = options.range?.dateFrom
      ? resolvePeriod({ type: "custom", dateFrom: options.range.dateFrom, dateTo: options.range.dateTo })
      : resolvePeriod({
        type: options.periodType || options.period || "current-month",
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      }, options.referenceDate || new Date());
    return {
      exportType,
      range,
      businessAreaId: text(options.businessAreaId) || "all",
      includeCustomers: exportType === "own-data" && options.includeCustomers === true,
      generatedAt: options.generatedAt || localDateTimeValue(new Date())
    };
  }

  function createExportProjection(snapshot, options = {}) {
    assertSnapshot(snapshot);
    const normalized = normalizeOptions(options);
    const settings = snapshot.stores.settings;
    const settingsAreaById = new Map(settings.businessAreas.map(area => [text(area.id), area]));
    if (normalized.businessAreaId !== "all" && !settingsAreaById.has(normalized.businessAreaId)) {
      throw new ExportError("INVALID_BUSINESS_AREA", "Der ausgewählte Geschäftsbereich ist im Snapshot nicht vorhanden.");
    }
    const receipts = projectReceipts(
      snapshot.stores.receipts.receipts,
      normalized.range,
      normalized.businessAreaId,
      settingsAreaById
    );
    const vouchers = projectVouchers(
      snapshot.stores.vouchers.vouchers,
      normalized.range,
      normalized.businessAreaId,
      settingsAreaById
    );
    const customerRows = normalized.includeCustomers
      ? projectCustomers(snapshot.stores.customers.customers, receipts.selected, vouchers.selected, vouchers.selectedHistoryEntries)
      : [];
    const selectedArea = settingsAreaById.get(normalized.businessAreaId);
    const company = snapshotCompanyIdentity(settings.company);
    const activeUser = projectActiveUser(settings, snapshot.tenantId);
    const localLicense = projectLocalLicense(settings, snapshot.tenantId);
    const tseSettings = normalized.exportType === "own-data" ? projectTseSettings(settings) : null;
    const projection = {
      exportFormat: constants.exportFormat,
      exportFormatVersion: constants.exportFormatVersion,
      exportType: normalized.exportType,
      generatedAt: normalized.generatedAt,
      tenantId: text(snapshot.tenantId),
      appVersion: text(snapshot.app?.version) || "Unbekannt",
      companyName: company.name,
      companyOwner: company.owner,
      companyDisplayName: company.displayName,
      company: normalized.exportType === "own-data" ? projectOwnCompany(settings.company) : null,
      activeUser: normalized.exportType === "own-data" ? activeUser : null,
      license: normalized.exportType === "own-data" ? localLicense : null,
      tseSettings,
      operatingSettings: normalized.exportType === "own-data" ? projectOwnOperatingSettings(settings) : null,
      range: Object.freeze(clone(normalized.range)),
      businessAreaId: normalized.businessAreaId,
      businessAreasLabel: normalized.businessAreaId === "all" ? "Alle" : text(selectedArea?.label) || normalized.businessAreaId,
      includeCustomers: normalized.includeCustomers,
      receipts: Object.freeze(receipts.rows.map(row => Object.freeze(row))),
      receiptPositions: Object.freeze(receipts.positionRows.map(row => Object.freeze(row))),
      summary: createSummaryRows(receipts.selected, settingsAreaById),
      vouchers: Object.freeze(vouchers.rows.map(row => Object.freeze(row))),
      voucherHistory: Object.freeze(vouchers.historyRows.map(row => Object.freeze(row))),
      customers: Object.freeze(customerRows.map(row => Object.freeze(row)))
    };
    Object.defineProperties(projection, {
      receiptRecords: { value: Object.freeze([...receipts.selected]), enumerable: false },
      voucherRecords: { value: Object.freeze([...vouchers.selected]), enumerable: false }
    });
    return Object.freeze(projection);
  }

  function protectCsvValue(value) {
    const source = value == null ? "" : String(value);
    if (/^-\d+(?:,\d+)?$/.test(source)) return source;
    return /^[\t\r\n ]*[=+\-@]/.test(source) || /^[\t\r\n]/.test(source) ? `'${source}` : source;
  }

  function escapeCsvValue(value) {
    return `"${protectCsvValue(value).replaceAll('"', '""')}"`;
  }

  function createCsv(rows, definition) {
    const lines = [definition.columns.map(([header]) => escapeCsvValue(header)).join(constants.csvDelimiter)];
    rows.forEach(row => {
      lines.push(definition.columns.map(([, key]) => escapeCsvValue(row[key])).join(constants.csvDelimiter));
    });
    return `${constants.csvBom}${lines.join(constants.csvLineEnding)}${constants.csvLineEnding}`;
  }

  function exportInfo(projection) {
    const taxStatusLabels = Object.freeze({
      vat: "Umsatzsteuer wird berechnet",
      "small-business": "Kleinunternehmerregelung",
      undecided: "Nicht festgelegt"
    });
    const backupIntervalLabels = Object.freeze({
      "48-hours": "Alle 48 Stunden",
      "5-days": "Alle 5 Tage",
      weekly: "Wöchentlich"
    });
    const lines = [
      "FRECKA-Export",
      "",
      `FRECKA-Version: ${projection.appVersion}`,
      ...(projection.companyName ? [`Geschäftsbezeichnung: ${projection.companyName}`] : []),
      `Unternehmer/in: ${projection.companyOwner}`,
      `Exportdatum: ${formatDateKey(projection.generatedAt)} • ${formatTime(projection.generatedAt)}`.trim(),
      `Zeitraum: ${formatDateKey(projection.range.dateFrom)} bis ${formatDateKey(projection.range.dateTo)}`,
      `Exporttyp: ${projection.exportType === "own-data" ? "Eigene Daten" : "Steuerberatung"}`,
      ...(projection.company ? [
        ...(projection.company.contactPerson ? [`Ansprechpartner: ${projection.company.contactPerson}`] : []),
        `Anschrift: ${[projection.company.street, projection.company.houseNumber].filter(Boolean).join(" ")}, ${[projection.company.postalCode, projection.company.city].filter(Boolean).join(" ")}`,
        `Land: ${projection.company.country}`,
        ...(projection.company.phone ? [`Telefon: ${projection.company.phone}`] : []),
        ...(projection.company.email ? [`E-Mail: ${projection.company.email}`] : []),
        ...(projection.company.website ? [`Website: ${projection.company.website}`] : []),
        ...(projection.company.taxNumber ? [`Steuernummer: ${projection.company.taxNumber}`] : []),
        ...(projection.company.vatId ? [`USt-IdNr.: ${projection.company.vatId}`] : []),
        ...(projection.company.updatedAt ? [`Unternehmensdaten geändert: ${formatDateKey(projection.company.updatedAt)} • ${formatTime(projection.company.updatedAt)}`] : []),
        ...(projection.company.logo ? [`Unternehmenslogo: ${projection.company.logo.name} (${projection.company.logo.mimeType}, ${projection.company.logo.size} Bytes)`] : [])
      ] : []),
      ...(projection.activeUser ? [`Aktiver Benutzer: ${projection.activeUser.displayName}`] : []),
      ...(projection.license ? [
        `Lizenz-ID: ${projection.license.licenseId}`,
        `Geräte-ID: ${projection.license.deviceId}`,
        `Lokal aktiviert: ${formatDateKey(projection.license.activatedAt)} • ${formatTime(projection.license.activatedAt)}`,
        `Letzte lokale Prüfung: ${formatDateKey(projection.license.lastValidation)} • ${formatTime(projection.license.lastValidation)}`
      ] : []),
      ...(projection.tseSettings ? [
        `TSE-Anbieter: ${projection.tseSettings.provider}`,
        "TSE-Nutzung: Optional",
        "TSE-Anbindung: Nicht eingerichtet",
        "TSE-Status: Nicht verbunden"
      ] : []),
      ...(projection.operatingSettings ? [
        `Währung: ${projection.operatingSettings.currency}`,
        `Sprache: ${projection.operatingSettings.language}`,
        `Steuerstatus: ${taxStatusLabels[projection.operatingSettings.taxStatus] || "Nicht festgelegt"}`,
        `Standard-MwSt.: ${germanDecimal(projection.operatingSettings.defaultTaxRate)} %`,
        `Standard-Geschäftsbereich: ${projection.operatingSettings.defaultBusinessArea?.label || "Nicht festgelegt"}`,
        `Aktive Zahlungsarten: ${projection.operatingSettings.paymentChoices.filter(choice => choice.active).map(choice => choice.title).join(", ") || "Keine"}`,
        `Nächste Belegnummer: ${projection.operatingSettings.receiptNumbering.yearPrefix}-${String(projection.operatingSettings.receiptNumbering.nextNumber || 0).padStart(6, "0")}`,
        `Beleg-Fußtext: ${projection.operatingSettings.receiptTexts.footerText || "Nicht hinterlegt"}`,
        `Beleg-Dankestext: ${projection.operatingSettings.receiptTexts.thankYouText || "Nicht hinterlegt"}`,
        `Sicherungsintervall: ${backupIntervalLabels[projection.operatingSettings.backupReminder.interval] || backupIntervalLabels.weekly}`
      ] : []),
      `Anzahl Belege: ${projection.receipts.length}`,
      `Anzahl Gutscheine: ${projection.vouchers.length}`,
      `Geschäftsbereiche: ${projection.businessAreasLabel}`,
      "",
      `Datumsformat: ${constants.dateFormat}`,
      `Uhrzeitformat: ${constants.timeFormat}`,
      "CSV-Format: UTF-8 mit BOM, Semikolon als Trennzeichen, deutsche Dezimaldarstellung.",
      projection.includeCustomers
        ? "Kunden.csv enthält ausschließlich Kundinnen und Kunden, die den gefilterten Belegen oder Gutscheinen zugeordnet sind."
        : "Kunden.csv: nicht enthalten.",
      "",
      "Dies ist ein FRECKA-Export.",
      "Keine bestätigte DATEV-Importschnittstelle."
    ];
    return `${lines.join("\r\n")}\r\n`;
  }

  function createExportFiles(snapshotOrProjection, options = {}) {
    const projection = snapshotOrProjection?.exportFormat === constants.exportFormat
      ? snapshotOrProjection
      : createExportProjection(snapshotOrProjection, options);
    const files = [
      { name: csvDefinitions.receipts.filename, mimeType: "text/csv;charset=utf-8", content: createCsv(projection.receipts, csvDefinitions.receipts) },
      { name: csvDefinitions.positions.filename, mimeType: "text/csv;charset=utf-8", content: createCsv(projection.receiptPositions, csvDefinitions.positions) },
      { name: csvDefinitions.vouchers.filename, mimeType: "text/csv;charset=utf-8", content: createCsv(projection.vouchers, csvDefinitions.vouchers) },
      { name: csvDefinitions.voucherHistory.filename, mimeType: "text/csv;charset=utf-8", content: createCsv(projection.voucherHistory, csvDefinitions.voucherHistory) }
    ];
    if (projection.includeCustomers) {
      files.push({ name: csvDefinitions.customers.filename, mimeType: "text/csv;charset=utf-8", content: createCsv(projection.customers, csvDefinitions.customers) });
    }
    files.push({ name: "Export-Info.txt", mimeType: "text/plain;charset=utf-8", content: exportInfo(projection) });
    return Object.freeze({
      projection,
      files: Object.freeze(files.map(file => Object.freeze(file)))
    });
  }

  function createSummaryFile(snapshotOrProjection, options = {}) {
    const projection = snapshotOrProjection?.exportFormat === constants.exportFormat
      ? snapshotOrProjection
      : createExportProjection(snapshotOrProjection, options);
    return Object.freeze({
      name: csvDefinitions.summary.filename,
      mimeType: "text/csv;charset=utf-8",
      content: createCsv(projection.summary, csvDefinitions.summary)
    });
  }

  globalThis.FRECKA_EXPORT = Object.freeze({
    constants,
    csvDefinitions,
    ExportError,
    resolvePeriod,
    createExportProjection,
    createExportFiles,
    createSummaryFile,
    protectCsvValue,
    escapeCsvValue,
    createCsv
  });
})();
