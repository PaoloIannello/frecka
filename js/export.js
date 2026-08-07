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
    return Object.freeze({
      exportFormat: constants.exportFormat,
      exportFormatVersion: constants.exportFormatVersion,
      exportType: normalized.exportType,
      generatedAt: normalized.generatedAt,
      tenantId: text(snapshot.tenantId),
      appVersion: text(snapshot.app?.version) || "Unbekannt",
      companyName: text(settings.company?.name) || "Ohne Bezeichnung",
      range: Object.freeze(clone(normalized.range)),
      businessAreaId: normalized.businessAreaId,
      businessAreasLabel: normalized.businessAreaId === "all" ? "Alle" : text(selectedArea?.label) || normalized.businessAreaId,
      includeCustomers: normalized.includeCustomers,
      receipts: Object.freeze(receipts.rows.map(row => Object.freeze(row))),
      receiptPositions: Object.freeze(receipts.positionRows.map(row => Object.freeze(row))),
      vouchers: Object.freeze(vouchers.rows.map(row => Object.freeze(row))),
      voucherHistory: Object.freeze(vouchers.historyRows.map(row => Object.freeze(row))),
      customers: Object.freeze(customerRows.map(row => Object.freeze(row)))
    });
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
    const lines = [
      "FRECKA-Export",
      "",
      `FRECKA-Version: ${projection.appVersion}`,
      `Exportdatum: ${formatDateKey(projection.generatedAt)} ${formatTime(projection.generatedAt)}`.trim(),
      `Zeitraum: ${formatDateKey(projection.range.dateFrom)} bis ${formatDateKey(projection.range.dateTo)}`,
      `Exporttyp: ${projection.exportType === "own-data" ? "Eigene Daten" : "Steuerberatung"}`,
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

  globalThis.FRECKA_EXPORT = Object.freeze({
    constants,
    csvDefinitions,
    ExportError,
    resolvePeriod,
    createExportProjection,
    createExportFiles,
    protectCsvValue,
    escapeCsvValue,
    createCsv
  });
})();
