(() => {
  "use strict";

  const resultsElement = document.getElementById("results");
  const summaryElement = document.getElementById("summary");
  const databaseNameElement = document.getElementById("databaseName");
  const cleanupNoteElement = document.getElementById("cleanupNote");
  const runButton = document.getElementById("runTests");
  const api = globalThis.FRECKA_PERSISTENCE;
  const licenseRuntimeApi = globalThis.FRECKA_LICENSE_RUNTIME;
  const backupApi = globalThis.FRECKA_BACKUP;
  const exportApi = globalThis.FRECKA_EXPORT;
  const exportPackageApi = globalThis.FRECKA_EXPORT_PACKAGE;
  const qrApi = globalThis.FRECKA_QR;
  const documentApi = globalThis.FRECKA_DOCUMENTS;
  const publicDocumentApi = globalThis.FRECKA_PUBLIC_DOCUMENTS;
  const sharingApi = globalThis.FRECKA_SHARING;
  const documentViewApi = globalThis.FRECKA_DOCUMENT_VIEW;
  const testDatabasePrefix = "frecka-persist-smoke-";
  let running = false;

  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const clone = value => JSON.parse(JSON.stringify(value));
  const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAA6ADAAQAAAABAAAAAgAAAABqvnfpAAAAGUlEQVQIHWOULEq2VdU8fOc6EwMQMDICCQA2ZAP112/IsQAAAABJRU5ErkJggg==";
  const alternatePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAABKADAAQAAAABAAAAAgAAAABKLAuiAAAAHUlEQVQIHWPkz4lxUNdhYGA4cPMqC5BiYAQRQAAARMsD33P5iogAAAAASUVORK5CYII=";
  const tinyJpegBase64 = "/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAA6ADAAQAAAABAAAAAgAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAAgADAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAAf/aAAwDAQACEQMRAD8A+bda/wCPyP8A69rX/wBER1k1r61/x+R/9e1r/wCiErIr3D+U6vxM/9k=";

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
      crc ^= bytes[index];
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function realisticPngBase64(targetBytes, seed = 1) {
    const original = Uint8Array.from(atob(tinyPngBase64), character => character.charCodeAt(0));
    const iendBytes = 12;
    const chunkOverhead = 12;
    const dataLength = targetBytes - original.length - chunkOverhead;
    if (dataLength < 16) throw new Error("Realistische PNG-Testgröße ist zu klein");
    const type = Uint8Array.from([0x74, 0x45, 0x58, 0x74]);
    const data = new Uint8Array(dataLength);
    Uint8Array.from([0x46, 0x52, 0x45, 0x43, 0x4b, 0x41, 0x00]).forEach((value, index) => { data[index] = value; });
    for (let index = 7; index < data.length; index += 1) data[index] = 32 + ((index + seed) % 90);
    const crcInput = new Uint8Array(type.length + data.length);
    crcInput.set(type);
    crcInput.set(data, type.length);
    const checksum = crc32(crcInput);
    const chunk = new Uint8Array(chunkOverhead + data.length);
    new DataView(chunk.buffer).setUint32(0, data.length);
    chunk.set(type, 4);
    chunk.set(data, 8);
    new DataView(chunk.buffer).setUint32(8 + data.length, checksum);
    const result = new Uint8Array(targetBytes);
    const iendOffset = original.length - iendBytes;
    result.set(original.subarray(0, iendOffset));
    result.set(chunk, iendOffset);
    result.set(original.subarray(iendOffset), iendOffset + chunk.length);
    let binary = "";
    for (let offset = 0; offset < result.length; offset += 0x4000) {
      binary += String.fromCharCode(...result.subarray(offset, Math.min(result.length, offset + 0x4000)));
    }
    return btoa(binary);
  }

  function realisticLogoAssetFixture(assetId, targetBytes, createdAt, seed = 1) {
    const base64 = realisticPngBase64(targetBytes, seed);
    return {
      formatVersion: 1,
      assetId,
      mimeType: "image/png",
      fileName: `${assetId}.png`,
      size: atob(base64).length,
      createdAt,
      dataUrl: `data:image/png;base64,${base64}`
    };
  }

  function companyLogoFixture(overrides = {}) {
    return {
      formatVersion: 1,
      id: "company-logo",
      name: "Testlogo.png",
      mimeType: "image/png",
      size: atob(tinyPngBase64).length,
      dataUrl: `data:image/png;base64,${tinyPngBase64}`,
      updatedAt: "2030-01-02T10:00:00.000Z",
      ...overrides
    };
  }

  function businessAreaLogoFixture(overrides = {}) {
    return {
      formatVersion: 1,
      id: "business-logo-hair",
      name: "Bereichslogo.jpg",
      mimeType: "image/jpeg",
      size: atob(tinyJpegBase64).length,
      dataUrl: `data:image/jpeg;base64,${tinyJpegBase64}`,
      updatedAt: "2030-01-03T10:00:00.000Z",
      ...overrides
    };
  }

  function logoAssetFixture(logo = companyLogoFixture(), overrides = {}) {
    return {
      formatVersion: 1,
      assetId: logo.id,
      mimeType: logo.mimeType,
      fileName: logo.name,
      size: logo.size,
      createdAt: logo.updatedAt,
      dataUrl: logo.dataUrl,
      ...overrides
    };
  }

  function logoReferenceFixture(logo = companyLogoFixture(), overrides = {}) {
    return {
      formatVersion: 1,
      assetId: logo.id,
      name: logo.name,
      mimeType: logo.mimeType,
      size: logo.size,
      updatedAt: logo.updatedAt,
      ...overrides
    };
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message} (erwartet: ${JSON.stringify(expected)}, erhalten: ${JSON.stringify(actual)})`);
    }
  }

  function assertDeepEqual(actual, expected, message) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
      throw new Error(`${message} (erwartet: ${expectedJson}, erhalten: ${actualJson})`);
    }
  }

  function sortedSerializable(value) {
    if (Array.isArray(value)) return value.map(sortedSerializable);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = sortedSerializable(value[key]);
      return result;
    }, {});
  }

  function assertEquivalent(actual, expected, message) {
    assertDeepEqual(sortedSerializable(actual), sortedSerializable(expected), message);
  }

  async function assertRejects(operation, expectedCode, message) {
    try {
      await operation();
    } catch (error) {
      assertEqual(error?.code, expectedCode, `${message}: falscher Fehlercode`);
      assert(typeof error?.userMessage === "string" && error.userMessage.length > 0, `${message}: verständliche Meldung fehlt`);
      return;
    }
    throw new Error(`${message}: Promise wurde nicht abgelehnt`);
  }

  async function assertRejectsOneOf(operation, expectedCodes, message) {
    try {
      await operation();
    } catch (error) {
      assert(expectedCodes.includes(error?.code), `${message}: falscher Fehlercode ${error?.code}`);
      assert(typeof error?.userMessage === "string" && error.userMessage.length > 0, `${message}: verständliche Meldung fehlt`);
      return;
    }
    throw new Error(`${message}: Promise wurde nicht abgelehnt`);
  }

  function assertThrows(operation, expectedCode, message) {
    try {
      operation();
    } catch (error) {
      assertEqual(error?.code, expectedCode, `${message}: falscher Fehlercode`);
      assert(typeof error?.userMessage === "string" && error.userMessage.length > 0, `${message}: verständliche Meldung fehlt`);
      return;
    }
    throw new Error(`${message}: Fehler wurde nicht ausgelöst`);
  }

  function runtimeFixture() {
    return {
      company: {
        name: "Teststudio Nord",
        owner: "Testperson",
        contactPerson: "Test Kontakt",
        street: "Testweg 10",
        houseNumber: "",
        zip: "12345",
        city: "Teststadt",
        country: "Deutschland",
        phone: "0123 456789",
        email: "test@example.invalid",
        website: "https://test.example.invalid/",
        taxNumber: "TEST-100",
        vatId: "",
        defaultTaxRate: 19,
        useAsServiceLocation: true,
        updatedAt: "2030-01-02T10:00:00.000Z",
        logo: companyLogoFixture()
      },
      serviceLocations: [
        {
          id: "location-company",
          name: "Hauptstudio",
          addressMode: "company",
          street: "",
          houseNumber: "",
          zip: "",
          city: "",
          phone: "0123 456789",
          voucherNote: "Nur nach Termin",
          active: true,
          businessAreaIds: ["hair", "coaching"]
        },
        {
          id: "location-mobile",
          name: "Mobiler Raum",
          addressMode: "own",
          street: "Nebenstraße",
          houseNumber: "7",
          zip: "54321",
          city: "Nebenstadt",
          phone: "",
          voucherNote: "",
          active: true,
          businessAreaIds: ["hair", "coaching"]
        }
      ],
      taxSettings: {
        status: "vat",
        rates: [
          { id: "tax-19", rate: 19, active: true },
          { id: "tax-7", rate: 7, active: true }
        ],
        defaultRate: 19
      },
      receiptSettings: {
        yearPrefix: "2030",
        nextNumber: 77,
        footerText: "Test-Fußtext",
        thankYouText: "Danke für den Test.",
        currency: "EUR",
        language: "Deutsch"
      },
      paymentChoices: [
        { id: "cash", title: "Bar", icon: "€", active: true },
        { id: "ec", title: "EC", icon: "K", active: true },
        { id: "voucher", title: "Gutschein", icon: "G", active: true }
      ],
      businessAreas: [
        {
          id: "hair",
          label: "Friseur",
          visibleName: "Test-Haarstudio",
          logoMode: "custom",
          logo: businessAreaLogoFixture(),
          active: true,
          isDefault: true,
          defaultServiceLocationId: "location-company"
        },
        {
          id: "coaching",
          label: "Coaching",
          visibleName: "Test-Coaching",
          logoMode: "custom",
          logo: businessAreaLogoFixture({
            id: "business-logo-coaching",
            name: "Coachinglogo.png",
            mimeType: "image/png",
            size: atob(tinyPngBase64).length,
            dataUrl: `data:image/png;base64,${tinyPngBase64}`
          }),
          active: true,
          isDefault: false,
          defaultServiceLocationId: "location-mobile"
        }
      ]
    };
  }

  function recordFixture(tenantId, setupStatus = "started") {
    return api.snapshotSettings(runtimeFixture(), setupStatus, tenantId);
  }

  function legacyLicenseFixture(tenantId, overrides = {}) {
    return {
      formatVersion: 1,
      licenseId: "license_legacy_001",
      tenantId,
      deviceId: "device_legacy_001",
      activatedAt: "2030-01-01T10:00:00.000Z",
      lastValidation: "2030-01-01T10:00:00.000Z",
      ...overrides
    };
  }

  function freshRuntimeFixture(tenantId = "local-default") {
    const runtime = clone(globalThis.PROTOTYPE_DATA);
    runtime.users.forEach(user => { user.tenantId = tenantId; });
    return runtime;
  }

  function catalogRuntimeFixture() {
    return {
      businessAreas: runtimeFixture().businessAreas,
      categories: [
        { id: "hair-services", businessAreaId: "hair", name: "Haarschnitt", type: "service", active: true, sortOrder: 20, source: "manual", createdAt: "2030-01-01T10:00:00.000Z", updatedAt: "2030-01-01T10:00:00.000Z" },
        { id: "hair-products", businessAreaId: "hair", name: "Produkte", type: "product", active: false, sortOrder: 10, source: "template", createdAt: "2030-01-01T10:00:00.000Z", updatedAt: "2030-01-02T10:00:00.000Z" }
      ],
      catalog: {
        hair: [
          {
            id: "service-cut", type: "service", businessAreaId: "hair", categoryId: "hair-services",
            name: "Testhaarschnitt", title: "Testhaarschnitt", priceCents: 3900, price: 39, taxRate: 19,
            active: true, favorite: true, sortOrder: 20, source: "manual", needsReview: false,
            priceConfirmed: true, taxRateConfirmed: true, description: "Testleistung", quantityAdjustable: false,
            icon: "✦", createdAt: "2030-01-01T10:00:00.000Z", updatedAt: "2030-01-01T10:00:00.000Z"
          },
          {
            id: "product-care", type: "product", businessAreaId: "hair", categoryId: "hair-products",
            name: "Testpflege", title: "Testpflege", priceCents: 1490, price: 14.9, taxRate: 7,
            active: false, favorite: false, sortOrder: 10, source: "template", needsReview: true,
            priceConfirmed: false, taxRateConfirmed: false, description: "Testprodukt", sku: "SKU-TEST",
            unit: "Stück", quantityAdjustable: true, icon: "▣", createdAt: "2030-01-01T10:00:00.000Z",
            updatedAt: "2030-01-02T10:00:00.000Z"
          },
          { id: "voucher-not-persisted", type: "voucher", title: "Gutschein", price: 25 }
        ],
        coaching: []
      },
      templateImportStatus: {
        hair: {
          templateKey: "hair",
          importedAt: "2030-01-01T10:00:00.000Z",
          lastCheckedAt: "2030-01-02T10:00:00.000Z",
          version: 1,
          status: "needs-review",
          needsReviewCount: 1
        }
      }
    };
  }

  function catalogRecordFixture(tenantId) {
    return api.snapshotCatalog(catalogRuntimeFixture(), tenantId);
  }

  function customersRuntimeFixture() {
    return {
      customers: [
        {
          id: "customer-anna", firstName: "Anna", lastName: "Muster", companyName: "Muster Studio GmbH",
          street: "Teststraße 12", zip: "93047", city: "Regensburg", phone: "+49 941 12-34",
          mobile: "0176 / 123 45 67", email: "Anna.Muster@example.invalid", note: "Nur fiktive Testdaten.",
          active: true, createdAt: "2030-01-01T10:00:00.000Z", updatedAt: "2030-01-02T10:00:00.000Z",
          receiptCount: 12, lastVisit: "01.01.2030", totalTurnover: 100,
          history: [{ number: "FORBIDDEN-HISTORY" }]
        },
        {
          id: "customer-bert", firstName: "Bert", lastName: "Beispiel", companyName: "",
          street: "", zip: "", city: "", phone: "00123", mobile: "", email: "", note: "",
          active: false, createdAt: "2030-01-03T10:00:00.000Z", updatedAt: "2030-01-03T10:00:00.000Z"
        }
      ]
    };
  }

  function customersRecordFixture(tenantId) {
    return api.snapshotCustomers(customersRuntimeFixture(), tenantId);
  }

  function receiptDraftFixture(id = "receipt-test-draft", overrides = {}) {
    const completedAt = overrides.completedAt || "2030-01-05T12:00:00.000Z";
    return {
      id,
      type: "receipt",
      status: "completed",
      date: "05.01.2030",
      time: "13:00",
      sortKey: completedAt,
      businessAreaId: "hair",
      businessAreaSnapshot: { id: "hair", label: "Friseur", visibleName: "Snapshot Studio" },
      serviceLocationId: "location-company",
      serviceLocationSnapshot: { id: "location-company", name: "Hauptstudio", street: "Testweg 10", zip: "12345", city: "Teststadt" },
      companySnapshot: { name: "Teststudio Nord", owner: "Testperson", street: "Testweg 10", zip: "12345", city: "Teststadt" },
      brandingSnapshot: { logoMode: "none", visibleName: "Snapshot Studio", logo: null },
      customerId: "customer-anna",
      customerSnapshot: { id: "customer-anna", name: "Anna Muster", email: "anna@example.invalid", street: "Altstraße 1", zip: "93047", city: "Regensburg" },
      items: [{ id: "service-cut", type: "service", title: "Testhaarschnitt", quantity: 1, unitPrice: 39, originalUnitPrice: 39, total: 39, originalTotal: 39, discountTotal: 0, taxRate: 19, netTotal: 32.77, taxAmount: 6.23 }],
      total: 39,
      originalTotal: 39,
      discountTotal: 0,
      netTotal: 32.77,
      taxTotal: 6.23,
      taxGroups: [{ rate: 19, net: 32.77, tax: 6.23, gross: 39 }],
      paymentStatus: "paid",
      paymentMethod: "Bar",
      paymentRecordedAt: completedAt,
      paymentEvents: [{ type: "payment_recorded", recordedAt: completedAt, paymentMethod: "Bar", amount: 39 }],
      activity: [{ label: "Beleg erstellt", date: "05.01.2030 · 13:00", occurredAt: completedAt }],
      receiptTextSnapshot: { footerText: "Snapshot-Fußtext", thankYouText: "Snapshot-Danke" },
      createdAt: completedAt,
      completedAt,
      updatedAt: completedAt,
      ...overrides
    };
  }

  function receiptsRuntimeFixture() {
    return { receipts: [{ ...receiptDraftFixture("receipt-existing"), number: "2030-000076" }] };
  }

  function receiptsRecordFixture(tenantId) {
    return api.snapshotReceipts(receiptsRuntimeFixture(), tenantId);
  }

  function voucherDraftFixture(id = "voucher-test-new", overrides = {}) {
    const createdAt = overrides.createdAt || "2030-01-05T12:00:00.000Z";
    const reference = overrides.reference || `vch_${id.replace(/[^a-z0-9]+/gi, "_")}`;
    const code = overrides.code || "FRKA-TEST-0001";
    const issuedValue = overrides.issuedValue ?? 100;
    const currentValue = overrides.currentValue ?? issuedValue;
    return {
      id,
      reference,
      code,
      status: currentValue === 0 ? "redeemed" : currentValue < issuedValue ? "partially_redeemed" : "active",
      issuedValue,
      currentValue,
      soldAt: "05.01.2030",
      soldTime: "13:00",
      createdAt,
      updatedAt: createdAt,
      payment: "Bar",
      customer: { id: "customer-anna", name: "Anna Muster" },
      customerId: "customer-anna",
      customerSnapshot: { id: "customer-anna", name: "Anna Muster", street: "Altstraße 1", postalCode: "93047", city: "Regensburg", phone: "0123", mobile: "0176", email: "anna@example.invalid" },
      saleReceipt: { id: `receipt-sale-${id}`, number: "", soldAt: createdAt, payment: "Bar", customerId: "customer-anna" },
      contextSnapshot: {
        company: { name: "Teststudio Nord", owner: "Testperson", street: "Testweg 10", zip: "12345", city: "Teststadt" },
        branding: { logoMode: "none", visibleName: "Snapshot Studio", logo: null },
        businessArea: { id: "hair", label: "Friseur", visibleName: "Snapshot Studio" },
        serviceLocation: { id: "location-company", name: "Hauptstudio", street: "Testweg 10", zip: "12345", city: "Teststadt" }
      },
      presentationSnapshot: { issuer: { name: "Teststudio Nord", owner: "Testperson" }, redemptionLocation: { id: "location-company", name: "Hauptstudio" } },
      qrReference: reference,
      qrLink: `https://example.invalid/app#/voucher/${reference}`,
      history: [{ type: "sold", occurredAt: createdAt, date: "05.01.2030", time: "13:00", amount: issuedValue, balanceAfter: issuedValue, receiptNumber: "" }],
      ...overrides
    };
  }

  function vouchersRuntimeFixture() {
    return { vouchers: [voucherDraftFixture("voucher-existing", { reference: "vch_existing", code: "FRKA-EXST-0001", saleReceipt: { id: "receipt-voucher-existing", number: "2030-000075", soldAt: "2030-01-01T09:00:00.000Z", payment: "Bar", customerId: "customer-anna" }, history: [{ type: "sold", occurredAt: "2030-01-01T09:00:00.000Z", date: "01.01.2030", time: "10:00", amount: 100, balanceAfter: 100, receiptNumber: "2030-000075" }] })] };
  }

  function vouchersRecordFixture(tenantId) {
    return api.snapshotVouchers(vouchersRuntimeFixture(), tenantId);
  }

  function completeTenantSnapshotFixture(tenantId, options = {}) {
    const settings = recordFixture(tenantId, "completed");
    settings.company.name = options.companyName || "Backup Teststudio";
    settings.receiptSettings.nextNumber = 77;
    const catalog = catalogRecordFixture(tenantId);
    const customers = customersRecordFixture(tenantId);
    const voucher = voucherDraftFixture("voucher-backup", {
      reference: "vch_backup",
      code: "FRKA-BACK-UP01",
      saleReceipt: {
        id: "receipt-sale-voucher-backup",
        number: "2030-000075",
        soldAt: "2030-01-01T09:00:00.000Z",
        payment: "Bar",
        customerId: "customer-anna"
      },
      history: [{
        type: "sold",
        occurredAt: "2030-01-01T09:00:00.000Z",
        date: "01.01.2030",
        time: "10:00",
        amount: 100,
        balanceAfter: 100,
        receiptNumber: "2030-000075"
      }]
    });
    const saleReceipt = voucherSaleReceiptFixture(voucher, "receipt-sale-voucher-backup");
    saleReceipt.number = "2030-000075";
    saleReceipt.voucherReference = voucher.reference;
    const normalReceipt = receiptDraftFixture("receipt-existing", { number: "2030-000076" });
    const receipts = api.snapshotReceipts({ receipts: [saleReceipt, normalReceipt] }, tenantId);
    const vouchers = api.snapshotVouchers({ vouchers: [voucher] }, tenantId);
    return {
      backupFormat: api.tenantSnapshotConstants.backupFormat,
      backupFormatVersion: api.tenantSnapshotConstants.backupFormatVersion,
      appDataSchemaVersion: api.constants.databaseVersion,
      tenantId,
      createdAt: options.createdAt || "2030-02-01T12:00:00.000Z",
      app: { version: "BACKUP-001", build: "test" },
      stores: { settings, catalog, customers, receipts, vouchers, prescriptions: api.emptyPrescriptionsRecord(tenantId), treatmentRecords: api.emptyTreatmentRecordsRecord(tenantId) }
    };
  }

  function historicallyInconsistentSnapshotFixture(tenantId) {
    const snapshot = completeTenantSnapshotFixture(tenantId);
    const historicalVoucher = snapshot.stores.vouchers.vouchers[0];
    snapshot.stores.receipts.receipts = snapshot.stores.receipts.receipts.filter(receipt => (
      receipt.id !== historicalVoucher.saleReceipt.id
    ));
    return snapshot;
  }

  function historicalSettingsSnapshotFixture(tenantId, variant) {
    const snapshot = completeTenantSnapshotFixture(tenantId);
    const settings = snapshot.stores.settings;
    const mutations = {
      "0.9.x": () => {
        delete settings.users;
        delete settings.activeUserId;
        delete settings.license;
        delete settings.tseSettings;
        delete settings.logoAssets;
        delete settings.backupReminder;
        delete settings.company.contactPerson;
        delete settings.company.houseNumber;
        delete settings.company.country;
        delete settings.company.website;
        delete settings.company.updatedAt;
        settings.businessAreas.forEach(area => {
          delete area.visibleName;
          delete area.logoMode;
          delete area.logo;
        });
        settings.serviceLocations.forEach(location => { delete location.houseNumber; });
      },
      "pre-USER-001": () => {
        delete settings.users;
        delete settings.activeUserId;
      },
      "pre-LICENSE-001": () => { delete settings.license; },
      "pre-SETTINGS-001-002": () => {
        settings.company.name = settings.company.owner;
        delete settings.company.owner;
        delete settings.company.contactPerson;
        delete settings.company.houseNumber;
        delete settings.company.country;
        delete settings.company.website;
        delete settings.company.updatedAt;
      },
      "pre-BRANDING-001-002": () => {
        delete settings.logoAssets;
        settings.company.logo = companyLogoFixture();
        settings.businessAreas[0].logoMode = "custom";
        settings.businessAreas[0].logo = businessAreaLogoFixture();
      },
      "pre-BACKUP-004": () => { delete settings.backupReminder.interval; },
      "pre-TSE-002": () => { delete settings.tseSettings; },
      combination: () => {
        mutations["0.9.x"]();
        settings.company.name = settings.company.owner;
        delete settings.company.owner;
        settings.company.logo = companyLogoFixture();
        settings.businessAreas[0].logoMode = "custom";
        settings.businessAreas[0].logo = businessAreaLogoFixture();
      }
    };
    const mutate = mutations[variant];
    if (!mutate) throw new Error(`Unbekannte historische Settingsfixture: ${variant}`);
    mutate();
    return snapshot;
  }

  function historicalDemoRepairSeed() {
    const seed = clone(globalThis.PROTOTYPE_DATA);
    const cases = api.historicalDemoVoucherReceiptRepairConstants?.cases || [];
    const receiptNumbers = new Set(cases.map(entry => entry.receiptNumber));
    const voucherReferences = new Set(cases.map(entry => entry.voucherReference));
    seed.receipts = (seed.historicalDemoRepairReceipts || []).filter(receipt => receiptNumbers.has(receipt.number));
    seed.vouchers = (seed.historicalDemoRepairVouchers || []).filter(voucher => voucherReferences.has(voucher.reference));
    assertEqual(cases.length, 4, "Historische Reparatur-Allowlist ist nicht exakt begrenzt");
    assertEqual(seed.receipts.length, 4, "Historische Reparaturquelle enthält nicht exakt vier Belege");
    assertEqual(seed.vouchers.length, 4, "Historische Reparaturquelle enthält nicht exakt vier Gutscheine");
    return seed;
  }

  function historicalDemoRepairCanonicalRecords(tenantId) {
    const seed = historicalDemoRepairSeed();
    return {
      receipts: api.snapshotReceipts(seed, tenantId),
      vouchers: api.snapshotVouchers(seed, tenantId)
    };
  }

  function historicalDemoRepairSnapshotFixture(tenantId, missingNumbers = []) {
    const seed = historicalDemoRepairSeed();
    seed.users.forEach(user => { user.tenantId = tenantId; });
    // Die Reparaturfixture bildet ausschließlich den bekannten historischen
    // Beta-Bestand ab. Der produktive Erststart bleibt bei aktuellem Jahr/1.
    seed.company.owner = "Angel Luzolo";
    seed.receiptSettings.yearPrefix = "2026";
    seed.receiptSettings.nextNumber = 132;
    const settings = api.snapshotSettings(seed, "completed", tenantId);
    const catalog = api.snapshotCatalog(seed, tenantId);
    const customers = api.snapshotCustomers(seed, tenantId);
    const receipts = api.snapshotReceipts(seed, tenantId);
    const vouchers = api.snapshotVouchers(seed, tenantId);
    const missing = new Set(missingNumbers);
    receipts.receipts = receipts.receipts.filter(receipt => !missing.has(receipt.number));
    return {
      backupFormat: api.tenantSnapshotConstants.backupFormat,
      backupFormatVersion: api.tenantSnapshotConstants.backupFormatVersion,
      appDataSchemaVersion: api.constants.databaseVersion,
      tenantId,
      createdAt: "2030-02-01T12:00:00.000Z",
      app: { version: "0.10.7", build: "PERSISTENCE-010-TEST" },
      stores: { settings, catalog, customers, receipts, vouchers, prescriptions: api.emptyPrescriptionsRecord(tenantId), treatmentRecords: api.emptyTreatmentRecordsRecord(tenantId) }
    };
  }

  async function writeHistoricalDemoRepairSnapshot(persistence, snapshot) {
    await persistence.writeSettings(snapshot.stores.settings);
    await persistence.writeCatalog(snapshot.stores.catalog);
    await persistence.writeCustomers(snapshot.stores.customers);
    await persistence.writeReceipts(snapshot.stores.receipts);
    await persistence.writeVouchers(snapshot.stores.vouchers);
  }

  async function writeRawSettingsRecord(persistence, settings) {
    const database = await persistence.openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction([api.constants.storeName, api.constants.prescriptionsStoreName, api.constants.treatmentRecordsStoreName], "readwrite");
      transaction.objectStore(api.constants.storeName).put(clone(settings));
      // This helper seeds a historical tenant in an already upgraded test DB.
      const store = transaction.objectStore(api.constants.prescriptionsStoreName);
      const request = store.get(persistence.tenantId);
      request.onsuccess = () => { if (!request.result) store.put(api.emptyPrescriptionsRecord(persistence.tenantId)); };
      const treatmentStore = transaction.objectStore(api.constants.treatmentRecordsStoreName);
      const treatmentRequest = treatmentStore.get(persistence.tenantId);
      treatmentRequest.onsuccess = () => { if (!treatmentRequest.result) treatmentStore.put(api.emptyTreatmentRecordsRecord(persistence.tenantId)); };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error("Historische Settingsfixture konnte nicht geschrieben werden"));
      transaction.onerror = () => reject(transaction.error || new Error("Historische Settingsfixture konnte nicht geschrieben werden"));
    });
  }

  function historicalDemoRepairOptions(snapshot) {
    return {
      fallbackRecords: snapshot.stores,
      canonicalRecords: historicalDemoRepairCanonicalRecords(snapshot.tenantId),
      appVersion: "0.10.7",
      appBuild: "PERSISTENCE-010-TEST"
    };
  }

  function completeExportSnapshotFixture(tenantId) {
    const snapshot = completeTenantSnapshotFixture(tenantId, {
      companyName: "Frisör Änne & Söhne",
      createdAt: "2030-02-01T12:00:00.000Z"
    });
    snapshot.app = { version: "EXPORT-001", build: "test" };
    const paid = receiptDraftFixture("receipt-export-paid", {
      number: "2030-000101",
      completedAt: "2030-01-05T09:15:00.000Z",
      createdAt: "2030-01-05T09:15:00.000Z",
      updatedAt: "2030-01-05T09:15:00.000Z",
      date: "05.01.2030",
      time: "09:15",
      items: [{
        id: "service-injection", type: "service", title: "=SUM(1+1); \"Ölpflege\"", quantity: 1,
        unitPrice: 65.43, originalUnitPrice: 70, total: 65.43, originalTotal: 70,
        discountTotal: 4.57, taxRate: 19, netTotal: 54.98, taxAmount: 10.45
      }],
      total: 65.43,
      originalTotal: 70,
      discountTotal: 4.57,
      netTotal: 54.98,
      taxTotal: 10.45,
      taxGroups: [{ rate: 19, net: 54.98, tax: 10.45, gross: 65.43 }],
      paymentMethod: "Bar"
    });
    const open = receiptDraftFixture("receipt-export-open", {
      number: "2030-000102",
      completedAt: "2030-01-10T10:30:00.000Z",
      createdAt: "2030-01-10T10:30:00.000Z",
      updatedAt: "2030-01-10T10:30:00.000Z",
      date: "10.01.2030",
      time: "10:30",
      paymentStatus: "open",
      paymentMethod: "later",
      paymentRecordedAt: null
    });
    const cancellation = receiptDraftFixture("receipt-export-cancellation", {
      number: "2030-000103",
      type: "cancellation",
      receiptType: "cancellation",
      status: "cancelled",
      reference: "2030-000101",
      completedAt: "2030-01-12T11:00:00.000Z",
      createdAt: "2030-01-12T11:00:00.000Z",
      updatedAt: "2030-01-12T11:00:00.000Z",
      date: "12.01.2030",
      time: "11:00",
      items: [{ title: "Storno Testhaarschnitt", type: "service", quantity: 1, unitPrice: -39, total: -39, taxRate: 19, netTotal: -32.77, taxAmount: -6.23 }],
      total: -39,
      originalTotal: -39,
      netTotal: -32.77,
      taxTotal: -6.23,
      taxGroups: [{ rate: 19, net: -32.77, tax: -6.23, gross: -39 }]
    });
    const coachingCredit = receiptDraftFixture("receipt-export-credit", {
      number: "2030-000104",
      type: "credit",
      receiptType: "credit",
      status: "credited",
      reference: "2030-000099",
      businessAreaId: "coaching",
      businessAreaSnapshot: { id: "coaching", label: "Coaching", visibleName: "Test-Coaching" },
      completedAt: "2030-01-15T12:00:00.000Z",
      createdAt: "2030-01-15T12:00:00.000Z",
      updatedAt: "2030-01-15T12:00:00.000Z",
      date: "15.01.2030",
      time: "12:00",
      items: [{ title: "Kulanz", type: "service", quantity: 1, unitPrice: -10, total: -10, taxRate: 19, netTotal: -8.4, taxAmount: -1.6 }],
      total: -10,
      originalTotal: -10,
      netTotal: -8.4,
      taxTotal: -1.6,
      taxGroups: [{ rate: 19, net: -8.4, tax: -1.6, gross: -10 }]
    });
    const february = receiptDraftFixture("receipt-export-february", {
      number: "2030-000105",
      completedAt: "2030-02-02T08:00:00.000Z",
      createdAt: "2030-02-02T08:00:00.000Z",
      updatedAt: "2030-02-02T08:00:00.000Z",
      date: "02.02.2030",
      time: "08:00"
    });
    const decemberVoucher = voucherDraftFixture("voucher-export-december", {
      reference: "vch_export_december",
      code: "FRKA-DEC0-0001",
      soldAt: "20.12.2029",
      soldTime: "09:00",
      createdAt: "2029-12-20T09:00:00.000Z",
      updatedAt: "2030-01-08T10:00:00.000Z",
      currentValue: 80,
      saleReceipt: { id: "receipt-voucher-december", number: "2029-000099", soldAt: "2029-12-20T09:00:00.000Z", payment: "Bar", customerId: "customer-anna" },
      history: [
        { type: "sold", occurredAt: "2029-12-20T09:00:00.000Z", amount: 100, balanceAfter: 100, receiptNumber: "2029-000099" },
        { type: "partial_redemption", occurredAt: "2030-01-08T10:00:00.000Z", amount: 20, balanceAfter: 80, receiptNumber: "2030-000100" }
      ]
    });
    const januaryVoucher = voucherDraftFixture("voucher-export-january", {
      reference: "vch_export_january",
      code: "FRKA-JAN0-0001",
      soldAt: "10.01.2030",
      soldTime: "09:00",
      createdAt: "2030-01-10T09:00:00.000Z",
      updatedAt: "2030-01-25T15:00:00.000Z",
      currentValue: 0,
      saleReceipt: { id: "receipt-voucher-january", number: "2030-000106", soldAt: "2030-01-10T09:00:00.000Z", payment: "Karte", customerId: "customer-anna" },
      history: [
        { type: "sold", occurredAt: "2030-01-10T09:00:00.000Z", amount: 100, balanceAfter: 100, receiptNumber: "2030-000106" },
        { type: "partial_redemption", occurredAt: "2030-01-20T14:00:00.000Z", amount: 40, balanceAfter: 60, receiptNumber: "2030-000107" },
        { type: "full_redemption", occurredAt: "2030-01-25T15:00:00.000Z", amount: 60, balanceAfter: 0, receiptNumber: "2030-000108" }
      ]
    });
    const coachingVoucher = voucherDraftFixture("voucher-export-coaching", {
      reference: "vch_export_coaching",
      code: "FRKA-COAC-0001",
      businessAreaId: "coaching",
      soldAt: "18.01.2030",
      soldTime: "09:00",
      createdAt: "2030-01-18T09:00:00.000Z",
      saleReceipt: { id: "receipt-voucher-coaching", number: "2030-000109", soldAt: "2030-01-18T09:00:00.000Z", payment: "Bar", customerId: "customer-anna" },
      contextSnapshot: {
        company: { name: "Frisör Änne & Söhne" },
        branding: { logoMode: "none", visibleName: "Test-Coaching", logo: null },
        businessArea: { id: "coaching", label: "Coaching", visibleName: "Test-Coaching" },
        serviceLocation: { id: "location-mobile", name: "Mobiler Raum" }
      },
      history: [{ type: "sold", occurredAt: "2030-01-18T09:00:00.000Z", amount: 100, balanceAfter: 100, receiptNumber: "2030-000109" }]
    });
    snapshot.stores.vouchers = api.snapshotVouchers({ vouchers: [decemberVoucher, januaryVoucher, coachingVoucher] }, tenantId);
    snapshot.stores.receipts = api.snapshotReceipts({
      receipts: [
        paid,
        open,
        cancellation,
        coachingCredit,
        february,
        exportVoucherSaleReceiptFixture(decemberVoucher),
        exportVoucherSaleReceiptFixture(januaryVoucher),
        exportVoucherSaleReceiptFixture(coachingVoucher)
      ]
    }, tenantId);
    return snapshot;
  }

  function voucherSaleReceiptFixture(voucher, id = `receipt-sale-${voucher.id}`) {
    return receiptDraftFixture(id, {
      receiptKind: "voucher-sale",
      voucherReference: voucher.reference,
      items: [{ type: "voucher-sale", title: "Gutschein", quantity: 1, unitPrice: voucher.issuedValue, total: voucher.issuedValue }],
      total: voucher.issuedValue,
      originalTotal: voucher.issuedValue,
      netTotal: 0,
      taxTotal: 0,
      taxGroups: [],
      completedAt: voucher.createdAt,
      createdAt: voucher.createdAt,
      updatedAt: voucher.createdAt
    });
  }

  function exportVoucherSaleReceiptFixture(voucher) {
    const receipt = voucherSaleReceiptFixture(voucher, voucher.saleReceipt.id);
    receipt.number = voucher.saleReceipt.number;
    receipt.date = voucher.soldAt;
    receipt.time = voucher.soldTime;
    receipt.sortKey = voucher.saleReceipt.soldAt;
    receipt.payment = voucher.saleReceipt.payment;
    receipt.paymentMethod = voucher.saleReceipt.payment;
    receipt.paymentRecordedAt = voucher.saleReceipt.soldAt;
    receipt.paymentEvents = [{
      type: "payment_recorded",
      recordedAt: voucher.saleReceipt.soldAt,
      paymentMethod: voucher.saleReceipt.payment,
      amount: voucher.issuedValue
    }];
    receipt.contextSnapshot = clone(voucher.contextSnapshot);
    receipt.companySnapshot = clone(voucher.contextSnapshot.company);
    receipt.brandingSnapshot = clone(voucher.contextSnapshot.branding);
    receipt.businessAreaId = voucher.contextSnapshot.businessArea.id;
    receipt.businessAreaSnapshot = clone(voucher.contextSnapshot.businessArea);
    receipt.serviceLocationId = voucher.contextSnapshot.serviceLocation.id;
    receipt.serviceLocationSnapshot = clone(voucher.contextSnapshot.serviceLocation);
    return receipt;
  }

  const documentLogoAssets = () => [
    logoAssetFixture(),
    logoAssetFixture(businessAreaLogoFixture())
  ];

  const documentOptions = (logoAssets = documentLogoAssets()) => ({
    qrService: qrApi,
    companyIdentity: api.companyIdentity,
    resolveLogoAsset: assetId => api.resolveLogoAsset(assetId, logoAssets),
    baseUrl: "https://app.example.invalid/frecka/"
  });

  function receiptDocumentFixture(overrides = {}) {
    return receiptDraftFixture(overrides.id || "receipt-document-test", {
      number: "2030-000099",
      ...overrides
    });
  }

  function pdfHeader(bytes) {
    return new TextDecoder("ascii").decode(bytes.slice(0, 8));
  }

  function visiblePdfText(pdf) {
    const hexText = [];
    pdf.getPages().forEach(page => {
      const contents = page.node.Contents();
      const references = contents?.asArray ? contents.asArray() : contents ? [contents] : [];
      references.forEach(reference => {
        const stream = pdf.context.lookup(reference);
        const decoded = globalThis.PDFLib.decodePDFRawStream(stream).decode();
        const source = new TextDecoder("latin1").decode(decoded);
        source.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/gu).forEach(match => {
          let text = "";
          for (let index = 0; index < match[1].length; index += 2) {
            text += String.fromCharCode(Number.parseInt(match[1].slice(index, index + 2), 16));
          }
          hexText.push(text);
        });
      });
    });
    return hexText.join(" ");
  }

  function resultMarkup(name, passed, error = null) {
    const item = document.createElement("li");
    item.className = `result ${passed ? "is-pass" : "is-fail"}`;
    const title = document.createElement("strong");
    title.textContent = `${passed ? "PASS" : "FAIL"} · ${name}`;
    item.append(title);
    if (error) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Fehlerdetails";
      const output = document.createElement("pre");
      output.textContent = `${error.name || "Error"}: ${error.message || String(error)}`;
      details.append(summary, output);
      item.append(details);
    }
    return item;
  }

  function createDatabaseName() {
    const randomPart = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${Date.now()}`;
    return `${testDatabasePrefix}${randomPart}`;
  }

  function deleteTestDatabase(databaseName) {
    if (!databaseName.startsWith(testDatabasePrefix) || databaseName === api.constants.databaseName) {
      return Promise.reject(new Error("Unsicherer Datenbankname: Cleanup wurde verweigert."));
    }
    return new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Testdatenbank konnte nicht gelöscht werden."));
      request.onblocked = () => reject(new Error("Testdatenbank wird noch von einer Verbindung blockiert."));
    });
  }

  function createLegacySettingsDatabase(databaseName, record) {
    return new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(api.constants.storeName)) {
          request.result.createObjectStore(api.constants.storeName, { keyPath: "tenantId" });
        }
      };
      request.onerror = () => reject(request.error || new Error("Legacy-Testdatenbank konnte nicht geöffnet werden."));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(api.constants.storeName, "readwrite");
        transaction.objectStore(api.constants.storeName).put(record);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error("Legacy-Einstellungen konnten nicht geschrieben werden."));
        };
      };
    });
  }

  function createLegacyV2Database(databaseName, settingsRecord, catalogRecord) {
    return new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(databaseName, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(api.constants.storeName)) {
          request.result.createObjectStore(api.constants.storeName, { keyPath: "tenantId" });
        }
        if (!request.result.objectStoreNames.contains(api.constants.catalogStoreName)) {
          request.result.createObjectStore(api.constants.catalogStoreName, { keyPath: "tenantId" });
        }
      };
      request.onerror = () => reject(request.error || new Error("Legacy-v2-Testdatenbank konnte nicht geöffnet werden."));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction([api.constants.storeName, api.constants.catalogStoreName], "readwrite");
        transaction.objectStore(api.constants.storeName).put(settingsRecord);
        transaction.objectStore(api.constants.catalogStoreName).put(catalogRecord);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error("Legacy-v2-Daten konnten nicht geschrieben werden."));
        };
      };
    });
  }

  function createLegacyV3Database(databaseName, settingsRecord, catalogRecord, customersRecord) {
    return new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(databaseName, 3);
      request.onupgradeneeded = () => {
        [api.constants.storeName, api.constants.catalogStoreName, api.constants.customersStoreName].forEach(storeName => {
          if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: "tenantId" });
        });
      };
      request.onerror = () => reject(request.error || new Error("Legacy-v3-Testdatenbank konnte nicht geöffnet werden."));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction([api.constants.storeName, api.constants.catalogStoreName, api.constants.customersStoreName], "readwrite");
        transaction.objectStore(api.constants.storeName).put(settingsRecord);
        transaction.objectStore(api.constants.catalogStoreName).put(catalogRecord);
        transaction.objectStore(api.constants.customersStoreName).put(customersRecord);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error("Legacy-v3-Daten konnten nicht geschrieben werden."));
        };
      };
    });
  }

  function createLegacyV4Database(databaseName, settingsRecord, catalogRecord, customersRecord, receiptsRecord) {
    return new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(databaseName, 4);
      request.onupgradeneeded = () => {
        [api.constants.storeName, api.constants.catalogStoreName, api.constants.customersStoreName, api.constants.receiptsStoreName].forEach(storeName => {
          if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: "tenantId" });
        });
      };
      request.onerror = () => reject(request.error || new Error("Legacy-v4-Testdatenbank konnte nicht geöffnet werden."));
      request.onsuccess = () => {
        const database = request.result;
        const stores = [api.constants.storeName, api.constants.catalogStoreName, api.constants.customersStoreName, api.constants.receiptsStoreName];
        const transaction = database.transaction(stores, "readwrite");
        transaction.objectStore(api.constants.storeName).put(settingsRecord);
        transaction.objectStore(api.constants.catalogStoreName).put(catalogRecord);
        transaction.objectStore(api.constants.customersStoreName).put(customersRecord);
        transaction.objectStore(api.constants.receiptsStoreName).put(receiptsRecord);
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onabort = () => { database.close(); reject(transaction.error || new Error("Legacy-v4-Daten konnten nicht geschrieben werden.")); };
      };
    });
  }

  function createLegacyV5Database(databaseName, records) {
    return new Promise((resolve, reject) => {
      const storeNames = [
        api.constants.storeName,
        api.constants.catalogStoreName,
        api.constants.customersStoreName,
        api.constants.receiptsStoreName,
        api.constants.vouchersStoreName
      ];
      const recordKeys = ["settings", "catalog", "customers", "receipts", "vouchers"];
      const request = globalThis.indexedDB.open(databaseName, 5);
      request.onupgradeneeded = () => {
        storeNames.forEach(storeName => {
          if (!request.result.objectStoreNames.contains(storeName)) {
            request.result.createObjectStore(storeName, { keyPath: "tenantId" });
          }
        });
      };
      request.onerror = () => reject(request.error || new Error("Legacy-v5-Testdatenbank konnte nicht geöffnet werden."));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(storeNames, "readwrite");
        storeNames.forEach((storeName, index) => {
          transaction.objectStore(storeName).put(records[recordKeys[index]]);
        });
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error("Legacy-v5-Daten konnten nicht geschrieben werden."));
        };
      };
    });
  }

  function createLegacyV7Database(databaseName, records, licenseRuntimeRecord) {
    return new Promise((resolve, reject) => {
      const tenantStores = [
        api.constants.storeName,
        api.constants.catalogStoreName,
        api.constants.customersStoreName,
        api.constants.receiptsStoreName,
        api.constants.vouchersStoreName,
        api.constants.prescriptionsStoreName
      ];
      const recordKeys = ["settings", "catalog", "customers", "receipts", "vouchers", "prescriptions"];
      const request = globalThis.indexedDB.open(databaseName, 7);
      request.onupgradeneeded = () => {
        tenantStores.forEach(storeName => request.result.createObjectStore(storeName, { keyPath: "tenantId" }));
        request.result.createObjectStore(api.constants.licenseRuntimeStoreName, { keyPath: "localTenantId" });
      };
      request.onerror = () => reject(request.error || new Error("Legacy-v7-Testdatenbank konnte nicht geöffnet werden."));
      request.onsuccess = () => {
        const database = request.result;
        const storeNames = [...tenantStores, api.constants.licenseRuntimeStoreName];
        const transaction = database.transaction(storeNames, "readwrite");
        tenantStores.forEach((storeName, index) => transaction.objectStore(storeName).put(records[recordKeys[index]]));
        transaction.objectStore(api.constants.licenseRuntimeStoreName).put(licenseRuntimeRecord);
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error("Legacy-v7-Daten konnten nicht geschrieben werden."));
        };
      };
    });
  }

  function prescriptionFixture(tenantId, overrides = {}) {
    return { id: "prescription-one", tenantId, customerId: "customer-anna", businessAreaId: "hair",
      prescribedOn: "2026-08-31", treatmentText: "PRIVATE-TREATMENT-ÄÖÜ", catalogItemId: null,
      prescribedUnits: 6, internalNote: "PRIVATE-NOTE-<script>vertraulich</script>", active: true,
      createdAt: "2026-08-31T10:00:00.000Z", updatedAt: "2026-08-31T10:00:00.000Z", formatVersion: 1, ...overrides };
  }

  function prescriptionSnapshot(tenantId, entries = [prescriptionFixture(tenantId)]) {
    const snapshot = completeTenantSnapshotFixture(tenantId);
    snapshot.stores.settings.businessAreas[0].features = { prescriptionDocumentation: true };
    snapshot.stores.prescriptions = api.snapshotPrescriptions({ prescriptions: entries }, tenantId);
    return snapshot;
  }

  async function writeRawPrescriptionRecord(client, record) {
    const database = await client.openDatabase();
    await new Promise((resolve, reject) => {
      const tx = database.transaction("prescriptions", "readwrite");
      tx.objectStore("prescriptions").put(record);
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
  }

  function treatmentTemplateFixture(overrides = {}) {
    return {
      formatVersion: 1,
      id: "treatment-template-internal",
      businessAreaId: "hair",
      purpose: "internal-documentation",
      title: "Standarddokumentation",
      text: "PRIVATE-TEMPLATE-INTERNAL-ÄÖÜ",
      active: true,
      createdAt: "2030-01-01T10:00:00.000Z",
      updatedAt: "2030-01-01T10:00:00.000Z",
      ...overrides
    };
  }

  function treatmentSnapshot(tenantId, options = {}) {
    const snapshot = prescriptionSnapshot(tenantId, options.prescriptions || []);
    snapshot.stores.receipts = api.snapshotReceipts({ receipts: options.receipts || [] }, tenantId);
    snapshot.stores.vouchers = api.snapshotVouchers({ vouchers: [] }, tenantId);
    snapshot.stores.settings.receiptSettings.nextNumber = options.nextNumber || 1;
    snapshot.stores.settings.treatmentTemplates = clone(options.templates || []);
    snapshot.stores.treatmentRecords = options.treatmentRecords || api.emptyTreatmentRecordsRecord(tenantId);
    return snapshot;
  }

  async function writeRawTreatmentRecord(client, record) {
    const database = await client.openDatabase();
    await new Promise((resolve, reject) => {
      const tx = database.transaction(api.constants.treatmentRecordsStoreName, "readwrite");
      tx.objectStore(api.constants.treatmentRecordsStoreName).put(record);
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
  }

  function buildPrescriptionTests(context) {
    return [
      { name: "PODOLOGY-001: Capability ist optional, unabhängig vom Namen und historisch standardmäßig aus", run: async () => {
        const defaults = recordFixture("test-capability");
        assert(defaults.businessAreas.every(area => area.features.prescriptionDocumentation === false), "Default ist nicht aus");
        const legacy = clone(defaults);
        legacy.businessAreas.forEach(area => { delete area.features; area.label = "Podologie"; });
        const prepared = api.prepareHistoricalSettingsRecord(legacy, defaults, legacy.tenantId);
        assert(prepared.compatible && prepared.changed, "Additive Kompatibilität fehlt");
        assert(prepared.record.businessAreas.every(area => !area.features.prescriptionDocumentation), "Branchenname aktivierte Capability");
        const enabled = clone(prepared.record);
        enabled.businessAreas[0].features.prescriptionDocumentation = true;
        assert(api.normalizeSettingsRecord(enabled, defaults, legacy.tenantId).record.businessAreas[0].features.prescriptionDocumentation, "Aktivierung geht verloren");
        assert(!api.prepareHistoricalSettingsRecord(prepared.record, defaults, legacy.tenantId).changed, "Nicht idempotent");
        enabled.businessAreas[0].features.prescriptionDocumentation = "true";
        assertThrows(() => api.normalizeSettingsRecord(enabled, defaults, legacy.tenantId), "PRESCRIPTION_CAPABILITY_INVALID", "Nicht boolesche Capability");
      } },
      { name: "PODOLOGY-003: Schema 7→8 ergänzt nur einen leeren Behandlungsstore und lässt alle bisherigen Stores bytegleich", run: async () => {
        const name = createDatabaseName();
        const snapshot = completeTenantSnapshotFixture("test-prescription-upgrade");
        delete snapshot.stores.settings.businessAreas[0].features;
        delete snapshot.stores.settings.treatmentTemplates;
        const runtime = { localTenantId: snapshot.tenantId, marker: "UNCHANGED-LOCAL-RUNTIME" };
        await createLegacyV7Database(name, snapshot.stores, runtime);
        const client = api.createSettingsPersistence({ databaseName: name, tenantId: snapshot.tenantId });
        try {
          const database = await client.openDatabase();
          assertEqual(database.version, 8, "Upgrade fehlt");
          assertEqual(database.objectStoreNames.length, 8, "Zusätzlicher Store angelegt");
          for (const key of ["settings", "catalog", "customers", "receipts", "vouchers", "licenseRuntime"]) {
            const record = await new Promise((resolve, reject) => {
              const request = database.transaction(key).objectStore(key).get(snapshot.tenantId);
              request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
            });
            assertDeepEqual(record, key === "licenseRuntime" ? runtime : snapshot.stores[key], `Upgrade veränderte ${key}`);
          }
          assertDeepEqual(await client.readPrescriptions(), api.emptyPrescriptionsRecord(snapshot.tenantId), "Initialisierung ist nicht leer");
          assertDeepEqual(await client.readTreatmentRecords(), api.emptyTreatmentRecordsRecord(snapshot.tenantId), "Behandlungsstore ist nicht leer initialisiert");
        } finally { client.closeDatabase(); await deleteTestDatabase(name); }
      } },
      { name: "PODOLOGY-003: Abgebrochenes Schema-7→8-Upgrade hinterlässt weder Schema 8 noch halbe Daten", run: async () => {
        const name = createDatabaseName();
        const before = completeTenantSnapshotFixture("test-prescription-upgrade-abort");
        delete before.stores.settings.treatmentTemplates;
        await createLegacyV7Database(name, before.stores, { localTenantId: before.tenantId, marker: "UNCHANGED" });
        const factory = { open(db, version) {
          const request = indexedDB.open(db, version);
          return new Proxy(request, {
            get(target, key) { const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value; },
            set(target, key, value) {
              target[key] = key === "onupgradeneeded" ? event => { value(event); target.transaction.abort(); } : value;
              return true;
            }
          });
        } };
        const client = api.createSettingsPersistence({ databaseName: name, tenantId: before.tenantId, indexedDBFactory: factory });
        try {
          await assertRejects(() => client.openDatabase(), "OPEN_FAILED", "Upgrade-Abbruch");
          await new Promise((resolve, reject) => {
            const request = indexedDB.open(name, 7);
            request.onsuccess = () => {
              const database = request.result;
              try { assert(!database.objectStoreNames.contains("treatmentRecords"), "Abgebrochenes Upgrade behielt neuen Store"); }
              catch (error) { database.close(); reject(error); return; }
              const tx = database.transaction("settings"); const read = tx.objectStore("settings").get(before.tenantId);
              tx.oncomplete = () => { database.close(); try { assertDeepEqual(read.result, before.stores.settings, "Upgrade-Abbruch veränderte Settings"); resolve(); } catch (error) { reject(error); } };
              tx.onabort = () => { database.close(); reject(tx.error); };
            };
            request.onerror = () => reject(request.error);
          });
        } finally { client.closeDatabase(); await deleteTestDatabase(name); }
      } },
      { name: "PODOLOGY-001: Mehrere Rezepte speichern, neu laden, bearbeiten und archivieren ohne Fremddatenänderung", run: async () => {
        const client = context.makeClient("prescription-crud");
        const snapshot = prescriptionSnapshot(client.tenantId, []);
        await client.restoreTenantSnapshot(snapshot);
        const before = await client.exportTenantSnapshot();
        const first = (await client.savePrescription(prescriptionFixture(client.tenantId))).prescription;
        await client.savePrescription(prescriptionFixture(client.tenantId, { id: "prescription-two" }));
        const secondCustomer = snapshot.stores.customers.customers[1];
        const customers = await client.readCustomers(); customers.customers[1].active = true;
        await client.writeCustomers(customers);
        const beforeCustomers = await client.readCustomers();
        await client.savePrescription(prescriptionFixture(client.tenantId, { id: "other-customer", customerId: secondCustomer.id, prescribedUnits: 1 }));
        client.closeDatabase();
        assertEqual((await client.readPrescriptions()).prescriptions.length, 3, "Reload verlor ein Rezept");
        const edited = (await client.savePrescription({ ...first, treatmentText: "Geändert", prescribedUnits: 8 }, first.updatedAt)).prescription;
        assertEqual(edited.createdAt, first.createdAt, "createdAt verändert");
        assert(edited.updatedAt > first.updatedAt, "updatedAt nicht fortgeschrieben");
        await client.savePrescription({ ...edited, active: false }, edited.updatedAt);
        const stored = await client.exportTenantSnapshot();
        assertEqual(stored.stores.prescriptions.prescriptions.length, 3, "Archivierung löschte Rezept");
        assertEqual(stored.stores.prescriptions.prescriptions[0].active, false, "Archivierung fehlt");
        for (const key of ["settings", "catalog", "receipts", "vouchers"]) assertDeepEqual(stored.stores[key], before.stores[key], `Rezeptschreiben veränderte ${key}`);
        assertDeepEqual(stored.stores.customers, beforeCustomers, "Rezeptschreiben veränderte Kunden");
      } },
      { name: "PODOLOGY-001: Datum, Einheiten, Texte, Mandant, Metadaten und zukünftige Formate werden strikt validiert", run: async () => {
        const client = context.makeClient("prescription-validation");
        await client.restoreTenantSnapshot(prescriptionSnapshot(client.tenantId, []));
        const cases = [
          [{ prescribedOn: "2026-02-30" }, "PRESCRIPTION_DATE_INVALID"],
          [{ prescribedOn: "" }, "PRESCRIPTION_DATE_INVALID"],
          [{ prescribedUnits: 0 }, "PRESCRIPTION_UNITS_INVALID"],
          [{ prescribedUnits: -1 }, "PRESCRIPTION_UNITS_INVALID"],
          [{ prescribedUnits: 1.5 }, "PRESCRIPTION_UNITS_INVALID"],
          [{ prescribedUnits: Number.MAX_SAFE_INTEGER + 1 }, "PRESCRIPTION_UNITS_INVALID"],
          [{ treatmentText: "  " }, "PRESCRIPTION_TEXT_INVALID"],
          [{ treatmentText: "x".repeat(201) }, "PRESCRIPTION_TEXT_INVALID"],
          [{ internalNote: "x".repeat(2001) }, "PRESCRIPTION_NOTE_INVALID"],
          [{ tenantId: "foreign" }, "PRESCRIPTION_TENANT_INVALID"],
          [{ active: "true" }, "PRESCRIPTION_METADATA_INVALID"],
          [{ usedUnits: 1 }, "PRESCRIPTION_FORMAT_INVALID"],
          [{ formatVersion: 2 }, "PRESCRIPTION_FORMAT_INVALID"]
        ];
        for (const [overrides, code] of cases) await assertRejects(() => client.savePrescription(prescriptionFixture(client.tenantId, overrides)), code, code);
        assertEqual((await client.readPrescriptions()).prescriptions.length, 0, "Fehlerhafte Eingabe wurde gespeichert");
      } },
      { name: "PODOLOGY-001: Doppelte IDs und konkurrierende Bearbeitung werden ohne Überschreiben abgewiesen", run: async () => {
        const client = context.makeClient("prescription-concurrency");
        await client.restoreTenantSnapshot(prescriptionSnapshot(client.tenantId, []));
        const saved = (await client.savePrescription(prescriptionFixture(client.tenantId))).prescription;
        await assertRejects(() => client.savePrescription(saved), "PRESCRIPTION_EDIT_CONFLICT", "Doppeltes Anlegen");
        const newer = await client.savePrescription({ ...saved, internalNote: "Neu" }, saved.updatedAt);
        await assertRejects(() => client.savePrescription(saved, saved.updatedAt), "PRESCRIPTION_EDIT_CONFLICT", "Veralteter Stand");
        assertDeepEqual(await client.readPrescriptions(), newer.record, "Konflikt veränderte Bestand");
      } },
      { name: "PODOLOGY-001: Fehlende Referenzen, doppelte IDs und beschädigte Stores bleiben fail closed", run: async () => {
        const tenantId = "test-prescription-integrity";
        for (const [field, code] of [["customerId", "PRESCRIPTION_CUSTOMER_MISSING"], ["businessAreaId", "PRESCRIPTION_AREA_MISSING"]]) {
          const snapshot = prescriptionSnapshot(tenantId, [prescriptionFixture(tenantId, { [field]: "missing" })]);
          assertThrows(() => api.validateTenantSnapshot(snapshot, tenantId), code, field);
        }
        const duplicate = prescriptionSnapshot(tenantId);
        duplicate.stores.prescriptions.prescriptions.push(clone(duplicate.stores.prescriptions.prescriptions[0]));
        assertThrows(() => api.validateTenantSnapshot(duplicate, tenantId), "PRESCRIPTION_ID_DUPLICATE", "Duplikat");
        const incomplete = prescriptionSnapshot(tenantId);
        delete incomplete.stores.prescriptions;
        assertThrows(() => api.validateTenantSnapshot(incomplete, tenantId), "BACKUP_INCOMPLETE", "Schema 8 ohne Rezeptstore");
        const invalid = prescriptionSnapshot(tenantId);
        invalid.stores.prescriptions.prescriptions = "bad";
        assertThrows(() => api.validateTenantSnapshot(invalid, tenantId), "PRESCRIPTIONS_RECORD_INVALID", "Beschädigter Store");
      } },
      { name: "PODOLOGY-001: Capability/Kunde deaktiviert lässt Bestand lesbar, aber nicht bearbeitbar", run: async () => {
        const client = context.makeClient("prescription-disabled");
        for (const mode of ["capability", "customer", "area"]) {
          const snapshot = prescriptionSnapshot(client.tenantId);
          if (mode === "capability") snapshot.stores.settings.businessAreas[0].features.prescriptionDocumentation = false;
          if (mode === "customer") snapshot.stores.customers.customers[0].active = false;
          if (mode === "area") {
            snapshot.stores.settings.businessAreas[0].active = false;
            snapshot.stores.settings.businessAreas[0].isDefault = false;
            snapshot.stores.settings.businessAreas[1].active = true;
            snapshot.stores.settings.businessAreas[1].isDefault = true;
          }
          await client.restoreTenantSnapshot(snapshot);
          const entry = (await client.readPrescriptions()).prescriptions[0];
          await assertRejects(() => client.savePrescription({ ...entry, internalNote: "Nicht speichern" }, entry.updatedAt), "PRESCRIPTION_EDIT_DISABLED", mode);
          await assertRejects(() => client.savePrescription({ ...entry, id: "new" }), "PRESCRIPTION_EDIT_DISABLED", `${mode}: Anlegen`);
          assertDeepEqual((await client.readPrescriptions()).prescriptions[0], entry, "Readonly änderte Bestand");
        }
      } },
      { name: "PODOLOGY-001: Rezeptzuordnung und Aktivierung bleiben je Geschäftsbereich getrennt", run: async () => {
        const client = context.makeClient("prescription-areas");
        const snapshot = prescriptionSnapshot(client.tenantId, []);
        snapshot.stores.settings.businessAreas[1].features.prescriptionDocumentation = true;
        await client.restoreTenantSnapshot(snapshot);
        await client.savePrescription(prescriptionFixture(client.tenantId));
        const other = (await client.savePrescription(prescriptionFixture(client.tenantId, { id: "other-area", businessAreaId: "coaching" }))).prescription;
        const settings = await client.readSettings(); settings.businessAreas[0].features.prescriptionDocumentation = false;
        await client.writeSettings(settings);
        await client.savePrescription({ ...other, prescribedUnits: 1 }, other.updatedAt);
        const entries = (await client.readPrescriptions()).prescriptions;
        assertEqual(entries.length, 2, "Deaktivierung entfernte Daten");
        assertEqual(entries[0].businessAreaId, "hair", "Erste Zuordnung verloren");
        assertEqual(entries[1].businessAreaId, "coaching", "Zweite Zuordnung verloren");
        assertEqual(entries[1].prescribedUnits, 1, "Fremde Deaktivierung sperrte aktiven Bereich");
      } },
      { name: "PODOLOGY-001: Optionale Katalogleistung und historische fehlende Leistung erhalten den Rezepttext", run: async () => {
        const client = context.makeClient("prescription-catalog");
        await client.restoreTenantSnapshot(prescriptionSnapshot(client.tenantId, []));
        const saved = (await client.savePrescription(prescriptionFixture(client.tenantId, { catalogItemId: "service-cut" }))).prescription;
        const catalog = await client.readCatalog();
        catalog.items = catalog.items.filter(item => item.id !== "service-cut");
        await client.writeCatalog(catalog);
        assertEqual((await client.readPrescriptions()).prescriptions[0].treatmentText, saved.treatmentText, "Katalog beeinflusst gespeicherten Text");
        await client.savePrescription({ ...saved, internalNote: "Trotz historischer Referenz" }, saved.updatedAt);
        await assertRejects(() => client.savePrescription(prescriptionFixture(client.tenantId, { id: "new", catalogItemId: "missing" })), "PRESCRIPTION_CATALOG_INVALID", "Neue fehlende Katalogreferenz");
        api.validateTenantSnapshot(await client.exportTenantSnapshot(), client.tenantId);
      } },
      { name: "PODOLOGY-001: Verschlüsseltes Backup/Restore erhält Rezepte und archivierte Stände vollständig", run: async () => {
        const client = context.makeClient("prescription-backup");
        const snapshot = prescriptionSnapshot(client.tenantId, [prescriptionFixture(client.tenantId), prescriptionFixture(client.tenantId, { id: "archived", active: false })]);
        await client.restoreTenantSnapshot(snapshot);
        const exported = await client.exportTenantSnapshot();
        const encrypted = await backupApi.encryptTenantSnapshot(exported, "Langer sicherer Rezept Testsatz 2026");
        assert(!encrypted.includes("PRIVATE-"), "Backupdatei enthält Klartext");
        const restored = await backupApi.decryptTenantSnapshot(encrypted, "Langer sicherer Rezept Testsatz 2026");
        await client.restoreTenantSnapshot(restored);
        assertDeepEqual(await client.readPrescriptions(), exported.stores.prescriptions, "Backup/Restore verlor Rezeptdaten");
        for (const schema of [5, 6]) {
          const old = clone(snapshot); old.appDataSchemaVersion = schema; delete old.stores.prescriptions;
          old.stores.settings.businessAreas.forEach(area => { delete area.features; });
          await client.restoreTenantSnapshot(old);
          assertEqual((await client.readPrescriptions()).prescriptions.length, 0, "Alter Vollrestore darf keine späteren Rezepte behalten");
          assert(!(await client.readSettings()).businessAreas[0].features.prescriptionDocumentation, "Alter Restore aktiviert Capability");
        }
      } },
      { name: "PODOLOGY-001/003: Restore-Abbruch nach Behandlungsstore rollt alle sieben Fachstores zurück", run: async () => {
        const client = context.makeClient("prescription-rollback");
        const before = prescriptionSnapshot(client.tenantId);
        await client.restoreTenantSnapshot(before);
        const stored = await client.exportTenantSnapshot();
        const after = clone(before);
        after.stores.prescriptions.prescriptions[0].internalNote = "NEVER-COMMIT";
        after.stores.settings.company.name = "NEVER-COMMIT";
        await assertRejects(() => client.restoreTenantSnapshot(after, { simulateFailureAfterStore: 6 }), "BACKUP_RESTORE_TEST_ABORT", "Abbruch nach siebtem Store");
        assertDeepEqual((await client.exportTenantSnapshot()).stores, stored.stores, "Abbruch hinterließ Teilrestore");
      } },
      { name: "PODOLOGY-001/002: Diagnose, Exporte, PDF-Modelle und Public-QR enthalten weder Rezept- noch Zuordnungsdaten", run: async () => {
        const snapshot = prescriptionSnapshot("test-prescription-privacy");
        const assignedReceipt = snapshot.stores.receipts.receipts.find(receipt => receipt.receiptKind !== "voucher-sale");
        assignedReceipt.prescriptionAssignment = {
          formatVersion: 1, prescriptionId: "prescription-one", units: 1, prescribedOn: "2026-08-31",
          treatmentText: "PRIVATE-TREATMENT-ÄÖÜ", prescribedUnits: 6, businessAreaId: "hair",
          customerId: "customer-anna", catalogItemId: null, overrunConfirmed: false
        };
        const before = clone(snapshot);
        const diagnostic = api.diagnoseTenantSnapshot(snapshot, snapshot.tenantId);
        assertEqual(diagnostic.status, "consistent", "Konsistenter Bestand abgelehnt");
        assert(!JSON.stringify(diagnostic).includes("PRIVATE-"), "Diagnose verrät Rezepttext");
        snapshot.stores.prescriptions.prescriptions[0].customerId = "missing";
        assert(!JSON.stringify(api.diagnoseTenantSnapshot(snapshot, snapshot.tenantId)).includes("PRIVATE-"), "Fehlerdiagnose verrät Rezepttext");
        snapshot.stores.prescriptions = before.stores.prescriptions;
        for (const exportType of ["own-data", "tax-advisor"]) {
          const exported = exportApi.createExportFiles(snapshot, { exportType, includeCustomers: true, periodType: "custom", dateFrom: "2030-01-01", dateTo: "2030-01-31", businessAreaId: "all" });
          assert(!JSON.stringify(exported).includes("PRIVATE-"), `${exportType} verrät Rezepttext`);
          assert(!exported.files.some(file => /Rezept|prescription/i.test(file.name)), "Medizinischer Export erzeugt");
        }
        const packageResult = await exportPackageApi.createTaxAdvisorPackage(snapshot, {
          periodType: "custom", dateFrom: "2030-01-01", dateTo: "2030-01-31",
          businessAreaId: "all", generatedAt: "2030-02-01T12:34:00.000Z"
        });
        const archive = await globalThis.JSZip.loadAsync(await packageResult.packageFile.content.arrayBuffer(), { checkCRC32: true });
        for (const [path, file] of Object.entries(archive.files)) {
          assert(!/PRIVATE-|Rezept|prescription/i.test(path), "ZIP-Metadaten verraten Rezeptdaten");
          if (!file.dir) {
            const bytes = await file.async("uint8array");
            assert(!new TextDecoder().decode(bytes).includes("PRIVATE-"), `ZIP-Eintrag ${path} verrät Rezepttext`);
          }
        }
        for (const receipt of snapshot.stores.receipts.receipts) {
          const model = documentApi.createReceiptDocumentModel(receipt, documentOptions());
          assert(!JSON.stringify(model).includes("PRIVATE-"), "Dokumentmodell enthält Rezepttext");
          const pdf = await documentApi.createPdfBytes(model);
          assert(!new TextDecoder().decode(pdf).includes("PRIVATE-"), "PDF enthält Klartext-Rezeptmarker");
          const bundle = await publicDocumentApi.createPublicBundle(model, { baseUrl: "https://app.example.invalid/", qrService: qrApi });
          const decoded = await publicDocumentApi.decodePublicLink(bundle.link, { qrService: qrApi });
          assert(!JSON.stringify(decoded).includes("PRIVATE-"), "Public-QR enthält Rezeptmarker");
        }
        assertDeepEqual(snapshot, before, "Projektion veränderte Daten");
      } },
      { name: "PODOLOGY-001: Kunden-/Settingsreset sperrt auch archivierte Rezepte ohne Datenverlust", run: async () => {
        const client = context.makeClient("prescription-reset");
        await client.restoreTenantSnapshot(prescriptionSnapshot(client.tenantId, [prescriptionFixture(client.tenantId, { active: false })]));
        const before = await client.exportTenantSnapshot();
        await assertRejects(() => client.deleteCustomers(), "PRESCRIPTION_RESET_BLOCKED", "Kundenreset");
        await assertRejects(() => client.deleteSettings(), "PRESCRIPTION_RESET_BLOCKED", "Settingsreset");
        assertDeepEqual((await client.exportTenantSnapshot()).stores, before.stores, "Reset veränderte Daten");
      } },
      { name: "PODOLOGY-001: Beschädigter Rezeptbestand wird nicht durch einen leeren Laufzeit-Fallback ersetzt", run: async () => {
        const client = context.makeClient("prescription-corrupt");
        const snapshot = prescriptionSnapshot(client.tenantId);
        await client.restoreTenantSnapshot(snapshot);
        await writeRawPrescriptionRecord(client, { ...snapshot.stores.prescriptions, prescriptions: null });
        await assertRejects(() => client.readPrescriptions(), "PRESCRIPTIONS_RECORD_INVALID", "Startlesepfad");
        await assertRejects(() => client.exportTenantSnapshot({ fallbackRecords: snapshot.stores }), "PRESCRIPTIONS_RECORD_INVALID", "Snapshot-Fallback");
        await assertRejects(() => client.savePrescription(prescriptionFixture(client.tenantId, { id: "new" })), "PRESCRIPTIONS_RECORD_INVALID", "Schreiben in defekten Store");
      } },
      { name: "PODOLOGY-002: Verbrauch 0→1→2→3→4 bleibt nach Rezept, Kunde und Geschäftsbereich getrennt", run: async () => {
        const tenantId = "test-prescription-derived-usage";
        const main = prescriptionFixture(tenantId, { prescribedUnits: 3, internalNote: "" });
        const otherPrescription = prescriptionFixture(tenantId, { id: "prescription-other", prescribedUnits: 2, internalNote: "" });
        const otherCustomer = prescriptionFixture(tenantId, { id: "prescription-customer-bert", customerId: "customer-bert", prescribedUnits: 2, internalNote: "" });
        const otherArea = prescriptionFixture(tenantId, { id: "prescription-coaching", businessAreaId: "coaching", prescribedUnits: 2, internalNote: "" });
        const assignedReceipt = (prescription, id, minute) => receiptDraftFixture(id, {
          number: `2030-${String(900 + minute).padStart(6, "0")}`,
          completedAt: `2030-01-05T12:${String(minute).padStart(2, "0")}:00.000Z`,
          sortKey: `2030-01-05T12:${String(minute).padStart(2, "0")}:00.000Z`,
          customerId: prescription.customerId,
          customerSnapshot: { id: prescription.customerId, name: "Historischer Kunde" },
          businessAreaId: prescription.businessAreaId,
          businessAreaSnapshot: { id: prescription.businessAreaId, label: "Historischer Bereich" },
          prescriptionAssignment: {
            formatVersion: 1, prescriptionId: prescription.id, units: 1,
            prescribedOn: prescription.prescribedOn, treatmentText: prescription.treatmentText,
            prescribedUnits: prescription.prescribedUnits, businessAreaId: prescription.businessAreaId,
            customerId: prescription.customerId, catalogItemId: prescription.catalogItemId,
            overrunConfirmed: minute > prescription.prescribedUnits
          }
        });
        const receipts = [];
        assertEqual(api.prescriptionUsage(main, receipts).usedUnits, 0, "Leerer Bestand startet nicht bei 0/3");
        for (let index = 1; index <= 3; index += 1) {
          receipts.push(assignedReceipt(main, `prescription-main-${index}`, index));
          const usage = api.prescriptionUsage(main, receipts);
          assertEqual(usage.usedUnits, index, `Verbrauch erreichte nicht ${index}/3`);
          assertEqual(usage.availableUnits, 3 - index, `Verfügbarkeit nach ${index}/3 ist falsch`);
        }
        receipts.push({ ...receiptDraftFixture("prescription-unassigned"), number: "2030-000904" });
        assertEqual(api.prescriptionUsage(main, receipts).usedUnits, 3, "Beleg ohne Rezept verbrauchte eine Einheit");
        receipts.push(assignedReceipt(otherPrescription, "prescription-other-one", 5));
        receipts.push(assignedReceipt(otherCustomer, "prescription-customer-one", 6));
        receipts.push(assignedReceipt(otherArea, "prescription-area-one", 7));
        assertEqual(api.prescriptionUsage(main, receipts).usedUnits, 3, "Fremdes Rezept, Kunde oder Bereich veränderte den Hauptverbrauch");
        assertEqual(api.prescriptionUsage(otherPrescription, receipts).usedUnits, 1, "Getrenntes Rezept wurde nicht getrennt gezählt");
        assertEqual(api.prescriptionUsage(otherCustomer, receipts).usedUnits, 1, "Getrennter Kunde wurde nicht getrennt gezählt");
        assertEqual(api.prescriptionUsage(otherArea, receipts).usedUnits, 1, "Getrennter Geschäftsbereich wurde nicht getrennt gezählt");
        receipts.push(assignedReceipt(main, "prescription-main-four", 8));
        const overdrawn = api.prescriptionUsage(main, receipts);
        assertEqual(overdrawn.usedUnits, 4, "Bestätigte vierte Nutzung wurde nicht als 4/3 abgeleitet");
        assertEqual(overdrawn.availableUnits, 0, "Überzogene Verfügbarkeit wurde nicht auf 0 begrenzt");
        assertEqual(overdrawn.status, "overdrawn", "4/3 wurde nicht als überzogen markiert");
        assertEqual(api.prescriptionUsage({ ...main, active: false }, receipts).status, "archived", "Archivstatus wird nicht abgeleitet");
      } },
      { name: "PODOLOGY-002: Zuordnung verbraucht genau eine Einheit, ist idempotent und speichert nur den unveränderlichen Snapshot", run: async () => {
        const client = context.makeClient("prescription-use");
        const snapshot = prescriptionSnapshot(client.tenantId, [prescriptionFixture(client.tenantId, {
          treatmentText: "Testhaarschnitt", catalogItemId: "service-cut", prescribedUnits: 2
        })]);
        snapshot.stores.receipts.receipts = [];
        snapshot.stores.vouchers = api.snapshotVouchers({ vouchers: [] }, client.tenantId);
        snapshot.stores.settings.receiptSettings.nextNumber = 1;
        await client.restoreTenantSnapshot(snapshot);
        const settings = await client.readSettings();
        const seed = await client.readReceipts();
        const draft = receiptDraftFixture("prescription-use-one");
        const review = await client.reviewPrescriptionAssignment(draft, { prescriptionId: "prescription-one" }, seed);
        assertEqual(review.usage.usedUnits, 0, "Vorprüfung meldet einen erfundenen Verbrauch");
        assert(!review.overrunRequired && !review.plausibilityRequired, "Passende offene Zuordnung verlangt Bestätigung");
        const committed = await client.commitReceipt(draft, settings, seed, {
          prescriptionId: "prescription-one", reviewToken: review.reviewToken,
          overrunConfirmed: false, plausibilityConfirmed: false
        });
        assertEqual(committed.receipt.prescriptionAssignment.units, 1, "Zuordnung verbraucht nicht exakt eine Einheit");
        assertEqual(committed.receipt.prescriptionAssignment.treatmentText, "Testhaarschnitt", "Behandlungssnapshot fehlt");
        assert(!hasOwn(committed.receipt.prescriptionAssignment, "internalNote"), "Interne Notiz gelangte in den Belegsnapshot");
        const repeated = await client.commitReceipt(draft, settings, seed, {
          prescriptionId: "prescription-one", reviewToken: review.reviewToken,
          overrunConfirmed: false, plausibilityConfirmed: false
        });
        assertEqual(repeated.created, false, "Wiederholung erzeugte einen zweiten Beleg");
        const prescription = (await client.readPrescriptions()).prescriptions[0];
        assertEqual(api.prescriptionUsage(prescription, (await client.readReceipts()).receipts).usedUnits, 1, "Idempotente Wiederholung verbrauchte doppelt");
        assert(!JSON.stringify(await client.exportTenantSnapshot()).includes('"usedUnits"'), "Abgeleiteter Verbrauch wurde persistiert");
      } },
      { name: "PODOLOGY-002: Ausschöpfung, Überziehung und Plausibilitätswarnung erfordern eine aktuelle bewusste Bestätigung", run: async () => {
        const client = context.makeClient("prescription-overrun");
        const snapshot = prescriptionSnapshot(client.tenantId, [prescriptionFixture(client.tenantId, {
          treatmentText: "Testhaarschnitt", catalogItemId: "service-cut", prescribedUnits: 1
        })]);
        snapshot.stores.receipts.receipts = [];
        snapshot.stores.vouchers = api.snapshotVouchers({ vouchers: [] }, client.tenantId);
        await client.restoreTenantSnapshot(snapshot);
        const settings = await client.readSettings();
        const seed = await client.readReceipts();
        const firstDraft = receiptDraftFixture("prescription-overrun-first");
        const firstReview = await client.reviewPrescriptionAssignment(firstDraft, { prescriptionId: "prescription-one" }, seed);
        await client.commitReceipt(firstDraft, settings, seed, { prescriptionId: "prescription-one", reviewToken: firstReview.reviewToken,
          overrunConfirmed: false, plausibilityConfirmed: false });
        const overrunDraft = receiptDraftFixture("prescription-overrun-second", { completedAt: "2030-01-05T12:05:00.000Z" });
        const overrunReview = await client.reviewPrescriptionAssignment(overrunDraft, { prescriptionId: "prescription-one" }, seed);
        assert(overrunReview.overrunRequired, "Ausgeschöpftes Rezept verlangt keine Bestätigung");
        await assertRejects(() => client.commitReceipt(overrunDraft, settings, seed, { prescriptionId: "prescription-one",
          reviewToken: overrunReview.reviewToken, overrunConfirmed: false, plausibilityConfirmed: false }),
        "PRESCRIPTION_CONFIRMATION_REQUIRED", "Überziehung ohne Bestätigung");
        await client.commitReceipt(overrunDraft, settings, seed, { prescriptionId: "prescription-one",
          reviewToken: overrunReview.reviewToken, overrunConfirmed: true, plausibilityConfirmed: false });
        const prescription = (await client.readPrescriptions()).prescriptions[0];
        const usage = api.prescriptionUsage(prescription, (await client.readReceipts()).receipts);
        assertEqual(usage.usedUnits, 2, "Überziehung wurde fälschlich gekappt");
        assertEqual(usage.availableUnits, 0, "Verfügbarkeit darf nicht negativ dargestellt werden");
        assertEqual(usage.status, "overdrawn", "Überzogener Status fehlt");

        const mismatchDraft = receiptDraftFixture("prescription-mismatch", { items: [{ ...receiptDraftFixture().items[0], id: "other", catalogItemId: "other", title: "Andere Leistung" }] });
        const mismatchReview = await client.reviewPrescriptionAssignment(mismatchDraft, { prescriptionId: "prescription-one" }, seed);
        assert(mismatchReview.plausibilityRequired && mismatchReview.overrunRequired, "Abweichende Behandlung wurde nicht gewarnt");
        await assertRejects(() => client.commitReceipt(mismatchDraft, settings, seed, { prescriptionId: "prescription-one",
          reviewToken: mismatchReview.reviewToken, overrunConfirmed: true, plausibilityConfirmed: false }),
        "PRESCRIPTION_CONFIRMATION_REQUIRED", "Plausibilitätswarnung ohne Bestätigung");
      } },
      { name: "PODOLOGY-002: Vollstorno gibt genau eine Nutzung frei, Gutschriften verändern den Verbrauch nicht", run: async () => {
        const client = context.makeClient("prescription-corrections");
        const snapshot = prescriptionSnapshot(client.tenantId, [prescriptionFixture(client.tenantId, {
          treatmentText: "Testhaarschnitt", catalogItemId: "service-cut", prescribedUnits: 2
        })]);
        snapshot.stores.receipts.receipts = [];
        snapshot.stores.vouchers = api.snapshotVouchers({ vouchers: [] }, client.tenantId);
        await client.restoreTenantSnapshot(snapshot);
        const settings = await client.readSettings();
        const seed = await client.readReceipts();
        const draft = receiptDraftFixture("prescription-cancel-source");
        const review = await client.reviewPrescriptionAssignment(draft, { prescriptionId: "prescription-one" }, seed);
        const original = await client.commitReceipt(draft, settings, seed, { prescriptionId: "prescription-one", reviewToken: review.reviewToken,
          overrunConfirmed: false, plausibilityConfirmed: false });
        const credit = await client.commitReceiptCorrection(original.receipt.number, {
          id: "prescription-credit", type: "credit", total: -10,
          items: [{ title: "Kulanz", quantity: 1, unitPrice: -10, total: -10 }],
          completedAt: "2030-01-06T09:00:00.000Z", isFull: false
        }, original.receiptsRecord);
        const prescription = (await client.readPrescriptions()).prescriptions[0];
        assertEqual(api.prescriptionUsage(prescription, credit.record.receipts).usedUnits, 1, "Gutschrift gab eine Rezeptnutzung frei");
        const ignoredCorrections = [
          receiptDraftFixture("prescription-full-credit", {
            type: "credit", receiptType: "credit", status: "credited", number: "GS-2030-000998",
            reference: original.receipt.number, total: -39, totalCents: -3900,
            completedAt: "2030-01-06T09:10:00.000Z"
          }),
          receiptDraftFixture("prescription-product-credit", {
            type: "credit", receiptType: "credit", status: "credited", number: "GS-2030-000999",
            reference: original.receipt.number, total: -5, totalCents: -500,
            items: [{ id: "product-care", type: "product", title: "Pflegeprodukt", quantity: 1, unitPrice: -5, total: -5 }],
            completedAt: "2030-01-06T09:20:00.000Z"
          }),
          receiptDraftFixture("prescription-no-assignment-source", {
            number: "2030-000997", completedAt: "2030-01-06T09:30:00.000Z"
          }),
          receiptDraftFixture("prescription-no-assignment-cancellation", {
            type: "cancellation", receiptType: "cancellation", status: "cancelled", number: "ST-2030-000997",
            reference: "2030-000997", total: -39, totalCents: -3900,
            completedAt: "2030-01-06T09:40:00.000Z"
          })
        ];
        assertEqual(api.prescriptionUsage(prescription, [...credit.record.receipts, ...ignoredCorrections]).usedUnits, 1,
          "Gesamt-, Produktgutschrift oder Storno ohne Rezept veränderten den Verbrauch");
        const cancelled = await client.commitReceiptCorrection(original.receipt.number, {
          id: "prescription-cancellation", type: "cancellation", total: -39,
          items: original.receipt.items.map(item => ({ ...item, unitPrice: -39, total: -39 })),
          completedAt: "2030-01-06T10:00:00.000Z"
        }, credit.record);
        assertEqual(api.prescriptionUsage(prescription, cancelled.record.receipts).usedUnits, 0, "Vollstorno gab nicht genau eine Nutzung frei");
        const repeated = await client.commitReceiptCorrection(original.receipt.number, {
          id: "prescription-cancellation-repeat", type: "cancellation", total: -39,
          items: original.receipt.items, completedAt: "2030-01-06T10:01:00.000Z"
        }, cancelled.record);
        assertEqual(api.prescriptionUsage(prescription, repeated.record.receipts).usedUnits, 0, "Wiederholter Storno veränderte Verbrauch erneut");
      } },
      { name: "PODOLOGY-002: Verwendete Stammdaten und interne Notiz sind gesperrt, Archivierung bleibt möglich", run: async () => {
        const client = context.makeClient("prescription-readonly-used");
        const snapshot = prescriptionSnapshot(client.tenantId, [prescriptionFixture(client.tenantId, {
          treatmentText: "Testhaarschnitt", catalogItemId: "service-cut"
        })]);
        snapshot.stores.receipts.receipts = [];
        snapshot.stores.vouchers = api.snapshotVouchers({ vouchers: [] }, client.tenantId);
        await client.restoreTenantSnapshot(snapshot);
        const prescription = (await client.readPrescriptions()).prescriptions[0];
        const draft = receiptDraftFixture("prescription-lock-source");
        const review = await client.reviewPrescriptionAssignment(draft, { prescriptionId: prescription.id }, await client.readReceipts());
        await client.commitReceipt(draft, await client.readSettings(), await client.readReceipts(), { prescriptionId: prescription.id,
          reviewToken: review.reviewToken, overrunConfirmed: false, plausibilityConfirmed: false });
        const used = (await client.readPrescriptions()).prescriptions[0];
        const historicalAssignment = clone((await client.readReceipts()).receipts[0].prescriptionAssignment);
        for (const mutation of [{ treatmentText: "Geändert" }, { prescribedUnits: 99 }, { internalNote: "Neue vertrauliche Notiz" }]) {
          await assertRejects(() => client.savePrescription({ ...used, ...mutation }, used.updatedAt), "PRESCRIPTION_USED_READ_ONLY", "Verwendetes Rezept bearbeitet");
        }
        const catalog = await client.readCatalog();
        const service = catalog.items.find(item => item.id === "service-cut");
        service.title = "Später umbenannte Katalogleistung";
        await client.writeCatalog(catalog);
        assertDeepEqual((await client.readReceipts()).receipts[0].prescriptionAssignment, historicalAssignment,
          "Katalogänderung veränderte den historischen Rezept-Snapshot");
        const archived = (await client.savePrescription({ ...used, active: false }, used.updatedAt)).prescription;
        assertEqual(archived.active, false, "Verwendetes Rezept konnte nicht archiviert werden");
        await assertRejects(async () => client.reviewPrescriptionAssignment(receiptDraftFixture("prescription-archived-reuse"),
          { prescriptionId: archived.id }, await client.readReceipts()), "PRESCRIPTION_SELECTION_UNAVAILABLE", "Archiviertes Rezept neu ausgewählt");
        const customers = await client.readCustomers();
        customers.customers.find(customer => customer.id === archived.customerId).active = false;
        await client.writeCustomers(customers);
        const settings = await client.readSettings();
        settings.businessAreas.find(area => area.id === archived.businessAreaId).features.prescriptionDocumentation = false;
        await client.writeSettings(settings);
        assertDeepEqual((await client.readReceipts()).receipts[0].prescriptionAssignment, historicalAssignment,
          "Archivierung, Kundendeaktivierung oder Capability-Änderung veränderte den historischen Rezept-Snapshot");
      } },
      { name: "PODOLOGY-002: Zwei parallele Abschlüsse lesen atomar neu und verbrauchen nicht unbestätigt über das Limit", run: async () => {
        const first = context.makeClient("prescription-race");
        const second = api.createSettingsPersistence({ databaseName: context.databaseName, tenantId: first.tenantId });
        const snapshot = prescriptionSnapshot(first.tenantId, [prescriptionFixture(first.tenantId, {
          treatmentText: "Testhaarschnitt", catalogItemId: "service-cut", prescribedUnits: 1
        })]);
        snapshot.stores.receipts.receipts = [];
        snapshot.stores.vouchers = api.snapshotVouchers({ vouchers: [] }, first.tenantId);
        await first.restoreTenantSnapshot(snapshot);
        const settings = await first.readSettings();
        const seed = await first.readReceipts();
        const draftA = receiptDraftFixture("prescription-race-a");
        const draftB = receiptDraftFixture("prescription-race-b", { completedAt: "2030-01-05T12:00:01.000Z" });
        const [reviewA, reviewB] = await Promise.all([
          first.reviewPrescriptionAssignment(draftA, { prescriptionId: "prescription-one" }, seed),
          second.reviewPrescriptionAssignment(draftB, { prescriptionId: "prescription-one" }, seed)
        ]);
        const results = await Promise.allSettled([
          first.commitReceipt(draftA, settings, seed, { prescriptionId: "prescription-one", reviewToken: reviewA.reviewToken, overrunConfirmed: false, plausibilityConfirmed: false }),
          second.commitReceipt(draftB, settings, seed, { prescriptionId: "prescription-one", reviewToken: reviewB.reviewToken, overrunConfirmed: false, plausibilityConfirmed: false })
        ]);
        assertEqual(results.filter(result => result.status === "fulfilled").length, 1, "Parallele Abschlüsse wurden beide unbestätigt gespeichert");
        assertEqual(results.find(result => result.status === "rejected")?.reason?.code, "PRESCRIPTION_CONFIRMATION_REQUIRED", "Race wurde nicht als neue Bestätigung erkannt");
        assertEqual(api.prescriptionUsage((await first.readPrescriptions()).prescriptions[0], (await first.readReceipts()).receipts).usedUnits, 1, "Race verbrauchte mehr als eine Einheit");
        second.closeDatabase();
      } },
      { name: "PODOLOGY-002: Fehlgeschlagener atomarer Abschluss hinterlässt weder Beleg, Nummer noch Verbrauch", run: async () => {
        const client = context.makeClient("prescription-write-failure");
        const snapshot = prescriptionSnapshot(client.tenantId, [prescriptionFixture(client.tenantId, {
          treatmentText: "Testhaarschnitt", catalogItemId: "service-cut"
        })]);
        snapshot.stores.receipts.receipts = [];
        snapshot.stores.vouchers = api.snapshotVouchers({ vouchers: [] }, client.tenantId);
        await client.restoreTenantSnapshot(snapshot);
        const settings = await client.readSettings();
        const seed = await client.readReceipts();
        const draft = receiptDraftFixture("prescription-failed");
        const review = await client.reviewPrescriptionAssignment(draft, { prescriptionId: "prescription-one" }, seed);
        (await client.openDatabase()).close();
        await assertRejects(() => client.commitReceipt(draft, settings, seed, { prescriptionId: "prescription-one",
          reviewToken: review.reviewToken, overrunConfirmed: false, plausibilityConfirmed: false }), "RECEIPT_COMMIT_FAILED", "Atomarer Schreibabbruch");
        client.closeDatabase();
        assertEqual((await client.readReceipts()).receipts.length, 0, "Fehlgeschlagener Abschluss hinterließ einen Beleg");
        assertEqual((await client.readSettings()).receiptSettings.nextNumber, settings.receiptSettings.nextNumber, "Fehlgeschlagener Abschluss verbrauchte eine Nummer");
        assertEqual(api.prescriptionUsage((await client.readPrescriptions()).prescriptions[0], []).usedUnits, 0, "Fehlgeschlagener Abschluss verbrauchte ein Rezept");
      } },
      { name: "PODOLOGY-001: Kunden- und Geschäftsbereichsoberfläche bei 320/390/411 px, Reload und Readonly", run: async () => {
        const index = await (await fetch("../index.html", { cache: "no-store" })).text();
        const waitFor = async predicate => {
          for (let i = 0; i < 160; i += 1) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
          throw new Error(`Rezeptoberfläche wurde nicht rechtzeitig bereit: ${predicate.toString()}`);
        };
        for (const width of [320, 390, 411]) {
          const client = context.makeClient(`prescription-ui-${width}`);
          const initial = prescriptionSnapshot(client.tenantId, []);
          initial.stores.settings.businessAreas[0].features.prescriptionDocumentation = false;
          await client.restoreTenantSnapshot(initial);
          const frame = document.createElement("iframe");
          frame.title = `Rezeptverwaltung ${width} px`;
          frame.style.cssText = `position:fixed;left:-2000px;top:0;width:${width}px;height:807px;border:0`;
          setIsolatedAppFrame(frame, isolatedAppMarkup(index, client, "customers", context.databaseName));
          document.body.append(frame);
          try {
            const doc = () => frame.contentDocument;
            const click = selector => { const element = doc().querySelector(selector); assert(element, `UI fehlt: ${selector}`); element.click(); };
            const fill = (name, value) => { const element = doc().querySelector(`[name="${name}"]`); assert(element, `Feld fehlt: ${name}`); element.value = value; element.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true })); };
            const noOverflow = () => assert(doc().documentElement.scrollWidth <= frame.contentWindow.innerWidth, `Horizontaler Überlauf bei ${width} px`);
            await waitFor(() => doc()?.querySelector('[data-open-customer="customer-anna"]'));
            click('[data-open-customer="customer-anna"]');
            assert(!doc().querySelector(".customer-prescriptions"), "Funktion bei Capability aus sichtbar");
            frame.contentWindow.location.hash = "#/settings-business-areas";
            await waitFor(() => doc().querySelector('[name="prescriptions:hair"]'));
            noOverflow();
            const checkbox = doc().querySelector('[name="prescriptions:hair"]'); checkbox.checked = true;
            checkbox.closest("form").requestSubmit();
            await waitFor(() => !doc().querySelector('button[type="submit"]:disabled'));
            // Wait for the committed capability, not merely a changed DOM checkbox.
            for (let attempt = 0; attempt < 160; attempt += 1) {
              if ((await client.readSettings()).businessAreas[0].features.prescriptionDocumentation) break;
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            frame.contentWindow.location.hash = "#/customers";
            await waitFor(() => doc().querySelector('[data-open-customer="customer-anna"]'));
            click('[data-open-customer="customer-anna"]');
            assert(doc().body.textContent.includes("Noch keine Rezepte hinterlegt"), "Aktiver Kunde ohne Rezept erhält keinen klaren Leerzustand");
            click("[data-prescription-new]");
            noOverflow();
            fill("prescribedOn", "2026-08-31"); fill("prescribedUnits", "6");
            const catalogSelect = doc().querySelector('[name="catalogItemId"]'); catalogSelect.value = "service-cut";
            catalogSelect.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
            assertEqual(doc().querySelector('[name="treatmentText"]').value, "Testhaarschnitt", "Katalogübernahme fehlt");
            const longTreatment = "ÄÖÜ-Lange-Behandlungsbezeichnung-".repeat(6);
            fill("treatmentText", `  ${longTreatment}  `); fill("internalNote", "PRIVATE-NOTE-<b>kein HTML</b>");
            doc().querySelector("#prescriptionForm").requestSubmit();
            await waitFor(() => doc().querySelector("[data-prescription-edit]"));
            noOverflow();
            assert(!doc().querySelector(".prescription-details b"), "Notiz wurde als HTML ausgegeben");
            const stored = (await client.readPrescriptions()).prescriptions[0];
            assertEqual(stored.treatmentText, longTreatment, "UI-Trim fehlt");
            click("[data-prescription-edit]"); fill("prescribedUnits", "8");
            doc().querySelector("#prescriptionForm").requestSubmit();
            await waitFor(() => doc().querySelector("[data-prescription-archive]"));
            click("[data-prescription-archive]");
            await waitFor(() => doc().querySelector(".prescription-details")?.textContent.includes("Archiviert"));
            const archived = (await client.readPrescriptions()).prescriptions[0];
            assertEqual(archived.active, false, "UI archivierte nicht");
            assertEqual(archived.prescribedUnits, 8, "UI-Änderung fehlt");
            // A second recipe must remain independently reachable in the same profile.
            click("[data-prescription-back]"); click("[data-prescription-new]");
            fill("prescribedOn", "2026-08-30"); fill("prescribedUnits", "1"); fill("treatmentText", "Zweites Rezept");
            doc().querySelector("#prescriptionForm").requestSubmit();
            await waitFor(() => doc().querySelector("[data-prescription-edit]"));
            click("[data-prescription-back]");
            assertEqual(doc().querySelectorAll("[data-open-prescription]").length, 2, "Zweites Rezept fehlt im Profil");
            noOverflow();
            assertDeepEqual(frame.contentWindow.FRECKA_PRESCRIPTION_UI_ERRORS, [], "UI-Laufzeitfehler vor Reload");
            const settings = await client.readSettings(); settings.businessAreas[0].features.prescriptionDocumentation = false;
            await client.writeSettings(settings);
            frame.contentWindow.FRECKA_PERSISTENCE.closeDatabase();
            setIsolatedAppFrame(frame, isolatedAppMarkup(index, client, "customers", context.databaseName));
            await waitFor(() => doc()?.querySelector('[data-open-customer="customer-anna"]'));
            click('[data-open-customer="customer-anna"]');
            assert(doc().querySelector(".customer-prescriptions"), "Vorhandene Rezepte nach Deaktivierung versteckt");
            assert(!doc().querySelector("[data-prescription-new]"), "Anlegen nach Deaktivierung möglich");
            click("[data-open-prescription]");
            assert(!doc().querySelector("[data-prescription-edit]"), "Readonly-Bearbeitung sichtbar");
            noOverflow();
            assertDeepEqual(frame.contentWindow.FRECKA_PRESCRIPTION_UI_ERRORS, [], "UI-Laufzeitfehler");
          } finally { frame.contentWindow?.FRECKA_PERSISTENCE?.closeDatabase(); frame.remove(); }
        }
      } },
      { name: "PODOLOGY-002/003: Checkout, Behandlungsdokumentation, Fehlererhalt und mobile Einhandansicht funktionieren bei 320/390/411 px", run: async () => {
        const index = await (await fetch("../index.html", { cache: "no-store" })).text();
        const waitFor = async predicate => {
          for (let i = 0; i < 200; i += 1) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
          throw new Error(`PODOLOGY-002-Checkout wurde nicht rechtzeitig bereit: ${predicate.toString()}`);
        };
        for (const width of [320, 390, 411]) {
          const client = context.makeClient(`prescription-checkout-ui-${width}`);
          const initial = prescriptionSnapshot(client.tenantId, [prescriptionFixture(client.tenantId, {
            treatmentText: "Testhaarschnitt", catalogItemId: "service-cut", prescribedUnits: 1, internalNote: "PRIVATE-CHECKOUT-NOTE"
          })]);
          initial.stores.receipts.receipts = [];
          initial.stores.vouchers = api.snapshotVouchers({ vouchers: [] }, client.tenantId);
          initial.stores.settings.receiptSettings.nextNumber = 1;
          initial.stores.settings.treatmentTemplates = [
            treatmentTemplateFixture(),
            treatmentTemplateFixture({ id: "checkout-care-template", purpose: "customer-care", title: "Pflege zuhause", text: "PRIVATE-UI-CARE" })
          ];
          await client.restoreTenantSnapshot(initial);
          const frame = document.createElement("iframe");
          frame.title = `Rezeptcheckout ${width} px`;
          frame.style.cssText = `position:fixed;left:-2000px;top:0;width:${width}px;height:807px;border:0`;
          setIsolatedAppFrame(frame, isolatedAppMarkup(index, client, "catalog", context.databaseName));
          document.body.append(frame);
          try {
            const doc = () => frame.contentDocument;
            const click = selector => { const element = doc().querySelector(selector); assert(element, `Checkout-UI fehlt: ${selector}`); element.click(); };
            const noOverflow = () => assert(doc().documentElement.scrollWidth <= frame.contentWindow.innerWidth, `Checkout hat horizontalen Überlauf bei ${width} px`);
            const prepareCheckout = async () => {
              await waitFor(() => doc()?.querySelector('[data-toggle-item="service-cut"]'));
              click('[data-toggle-item="service-cut"]'); click('[data-route="checkout"]');
              click('[data-route="customer-picker"]');
              await waitFor(() => doc().querySelector('[data-select-customer="customer-anna"]'));
              click('[data-select-customer="customer-anna"]');
              await waitFor(() => doc().querySelector('[data-select-checkout-prescription="prescription-one"]'));
              noOverflow();
              click('[data-select-checkout-prescription="prescription-one"]');
              assert(doc().querySelector("#checkoutInternalDocumentation") && doc().querySelector("#checkoutCustomerCareAdvice"), "Behandlungsfelder fehlen");
              assert(!doc().body.textContent.includes("PRIVATE-CHECKOUT-NOTE"), "Interne Rezeptnotiz wurde im Checkout ausgegeben");
              noOverflow();
            };
            await prepareCheckout();
            click('[data-apply-treatment-template="treatment-template-internal"]');
            click('[data-apply-treatment-template="checkout-care-template"]');
            assertEqual(doc().querySelector("#checkoutInternalDocumentation").value, "PRIVATE-TEMPLATE-INTERNAL-ÄÖÜ", "Interne Vorlage wurde nicht in den Entwurf kopiert");
            assertEqual(doc().querySelector("#checkoutCustomerCareAdvice").value, "PRIVATE-UI-CARE", "Pflegevorlage wurde nicht in den Entwurf kopiert");
            click('[data-action="finish-demo"]');
            await waitFor(() => frame.contentWindow.location.hash === "#/receipt-success");
            let receipts = await client.readReceipts();
            assertEqual(receipts.receipts.length, 1, "Erste UI-Zuordnung erzeugte keinen Beleg");
            assertEqual(receipts.receipts[0].prescriptionAssignment?.prescriptionId, "prescription-one", "UI-Zuordnung fehlt im Beleg");
            let treatmentRecords = await client.readTreatmentRecords();
            assertEqual(treatmentRecords.treatmentRecords.length, 1, "UI-Abschluss erzeugte keine Behandlungsdokumentation");
            click('[data-route="receipts"]');
            await waitFor(() => doc().querySelector(`[data-open-receipt="${receipts.receipts[0].number}"]`));
            click(`[data-open-receipt="${receipts.receipts[0].number}"]`);
            await waitFor(() => doc().querySelector(`[data-preview-receipt="${receipts.receipts[0].number}"]`));
            click(`[data-preview-receipt="${receipts.receipts[0].number}"]`);
            await waitFor(() => doc().querySelector(".receipt-paper-customer-supplements"));
            const customerDocument = doc().querySelector(".receipt-paper").textContent;
            assert(customerDocument.includes("Rezept vom:") && customerDocument.includes("31.08.2026"), "App-Belegvorschau enthält das historische Rezeptdatum nicht");
            assert(customerDocument.includes("Pflegehinweis:") && customerDocument.includes("PRIVATE-UI-CARE"), "App-Belegvorschau enthält den Pflegehinweis nicht");
            assert(!customerDocument.includes("PRIVATE-TEMPLATE-INTERNAL-ÄÖÜ"), "App-Belegvorschau enthält interne Behandlungsdokumentation");
            noOverflow();
            frame.contentWindow.location.hash = "#/catalog";
            await prepareCheckout();
            click('[data-apply-treatment-template="treatment-template-internal"]');
            const careField = doc().querySelector("#checkoutCustomerCareAdvice");
            careField.value = "PRIVATE-UI-RETRY";
            careField.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true }));
            assert(doc().body.textContent.includes("bereits ausgeschöpft"), "Ausgeschöpfter Status fehlt im Checkout");
            click('[data-action="finish-demo"]');
            await waitFor(() => doc().querySelector("[data-confirm-prescription-overrun]"));
            assert(frame.contentWindow.location.hash === "#/checkout", "Unbestätigte Überziehung schloss den Beleg ab");
            assertEqual(doc().querySelector("#checkoutInternalDocumentation").value, "PRIVATE-TEMPLATE-INTERNAL-ÄÖÜ", "Fehler löschte interne Dokumentation");
            assertEqual(doc().querySelector("#checkoutCustomerCareAdvice").value, "PRIVATE-UI-RETRY", "Fehler löschte Pflegehinweis");
            click("[data-confirm-prescription-overrun]");
            click('[data-action="finish-demo"]');
            await waitFor(() => frame.contentWindow.location.hash === "#/receipt-success");
            receipts = await client.readReceipts();
            treatmentRecords = await client.readTreatmentRecords();
            assertEqual(treatmentRecords.treatmentRecords.length, 2, "Bestätigter zweiter Abschluss verlor Behandlungsdaten");
            const usage = api.prescriptionUsage((await client.readPrescriptions()).prescriptions[0], receipts.receipts);
            assertEqual(usage.usedUnits, 2, "Bestätigte UI-Überziehung wurde nicht real gezählt");
            assertEqual(usage.status, "overdrawn", "UI-Überziehung erhielt falschen Status");
            if (width === 390) {
              frame.contentWindow.location.hash = "#/customers";
              await waitFor(() => doc().querySelector('[data-open-customer="customer-anna"]'));
              click('[data-open-customer="customer-anna"]');
              await waitFor(() => doc().querySelector(".customer-treatment-history"));
              assert(doc().querySelector(".customer-treatment-history").textContent.includes("PRIVATE-TEMPLATE-INTERNAL-ÄÖÜ"),
                "Interner Behandlungsverlauf fehlt im Kundenprofil");
              assert(doc().querySelector(".customer-treatment-history").textContent.includes("PRIVATE-UI-RETRY"),
                "Pflegehinweis fehlt im Kundenprofil");
              noOverflow();
              const customers = await client.readCustomers();
              customers.customers.find(customer => customer.id === "customer-anna").active = false;
              await client.writeCustomers(customers);
              frame.contentWindow.FRECKA_PERSISTENCE.closeDatabase();
              setIsolatedAppFrame(frame, isolatedAppMarkup(index, client, "customers", context.databaseName));
              await waitFor(() => doc()?.querySelector('[data-customer-filter="all"]'));
              click('[data-customer-filter="all"]');
              await waitFor(() => doc()?.querySelector('[data-open-customer="customer-anna"]'));
              click('[data-open-customer="customer-anna"]');
              await waitFor(() => doc().querySelector(".customer-treatment-history"));
              assert(doc().querySelector(".customer-treatment-history").textContent.includes("PRIVATE-UI-RETRY"),
                "Deaktivierter Kunde verlor lesbare Behandlungshistorie");
              noOverflow();
            }
            if (width === 320) {
              const duplicatedSource = receipts.receipts[0];
              click('[data-route="receipts"]');
              await waitFor(() => doc().querySelector(`[data-open-receipt="${duplicatedSource.number}"]`));
              click(`[data-open-receipt="${duplicatedSource.number}"]`);
              await waitFor(() => doc().querySelector('[data-action="copy-receipt"]'));
              click('[data-action="copy-receipt"]');
              await waitFor(() => frame.contentWindow.location.hash === "#/edit-cart");
              click('[data-route="checkout"]');
              await waitFor(() => doc().querySelector('[data-select-checkout-prescription="prescription-one"]'));
              assert(!doc().querySelector(".checkout-prescription-choice.is-selected"), "Duplizierter Beleg übernahm die Rezeptzuordnung");
              assertEqual(doc().querySelector("#checkoutInternalDocumentation").value, "", "Duplizierter Beleg übernahm interne Dokumentation");
              assertEqual(doc().querySelector("#checkoutCustomerCareAdvice").value, "", "Duplizierter Beleg übernahm Pflegehinweis");
            }
            noOverflow();
            assertDeepEqual(frame.contentWindow.FRECKA_PRESCRIPTION_UI_ERRORS, [], "PODOLOGY-002-UI-Laufzeitfehler");
          } finally { frame.contentWindow?.FRECKA_PERSISTENCE?.closeDatabase(); frame.remove(); }
        }
      } }
    ];
  }

  function buildTreatmentTests(context) {
    async function commitTreatment(client, id, treatmentInput, prescription = null, overrides = {}) {
      const settings = await client.readSettings();
      const receipts = await client.readReceipts();
      const draft = receiptDraftFixture(id, overrides);
      let prescriptionInput = null;
      if (prescription) {
        const review = await client.reviewPrescriptionAssignment(draft, { prescriptionId: prescription.id }, receipts);
        prescriptionInput = {
          prescriptionId: prescription.id,
          reviewToken: review.reviewToken,
          overrunConfirmed: review.overrunRequired,
          plausibilityConfirmed: review.plausibilityRequired
        };
      }
      return client.commitReceipt(draft, settings, receipts, prescriptionInput, treatmentInput);
    }

    return [
      { name: "PODOLOGY-003: Interne Dokumentation und Pflegehinweis werden atomar mit dem normalen Originalbeleg gespeichert", run: async () => {
        const client = context.makeClient("treatment-atomic");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        const result = await commitTreatment(client, "treatment-atomic-receipt", {
          internalDocumentation: "  PRIVATE-INTERNAL-ÄÖÜ  ",
          customerCareAdvice: "  PRIVATE-CARE-Hinweis  "
        });
        assert(result.created && result.treatmentRecord, "Atomarer Abschluss erzeugte keine Behandlungsdokumentation");
        assertEqual(result.treatmentRecord.internalDocumentation, "PRIVATE-INTERNAL-ÄÖÜ", "Interner Text wurde nicht getrimmt");
        assertEqual(result.treatmentRecord.customerCareAdvice, "PRIVATE-CARE-Hinweis", "Pflegehinweis wurde nicht getrimmt");
        assertEqual(result.treatmentRecord.receiptId, result.receipt.id, "Belegreferenz fehlt");
        assertEqual(result.treatmentRecord.receiptNumber, result.receipt.number, "Belegnummernsnapshot fehlt");
        assertEqual(result.treatmentRecord.customerId, "customer-anna", "Kundenreferenz fehlt");
        assertEqual(result.treatmentRecord.businessAreaId, "hair", "Geschäftsbereichsreferenz fehlt");
        assertEqual(result.treatmentRecord.performedAt, result.receipt.completedAt, "Behandlungszeitpunkt weicht vom Belegabschluss ab");
        assertDeepEqual(result.treatmentRecord.customerSnapshot, result.receipt.customerSnapshot, "Kundensnapshot stammt nicht aus dem Beleg");
        assertDeepEqual(result.treatmentRecord.businessAreaSnapshot, result.receipt.businessAreaSnapshot, "Bereichssnapshot stammt nicht aus dem Beleg");
        assert(!JSON.stringify(result.receipt).includes("PRIVATE-INTERNAL") && !JSON.stringify(result.receipt).includes("PRIVATE-CARE"), "Interne Texte gelangten in den Beleg");
        client.closeDatabase();
        const reloaded = await client.readTreatmentRecords();
        assertEqual(reloaded.treatmentRecords.length, 1, "Reload verlor die Behandlungsdokumentation");
        assertDeepEqual(reloaded.treatmentRecords[0], result.treatmentRecord, "Reload veränderte den historischen Snapshot");
      } },
      { name: "PODOLOGY-003: Dokumentation und Pflegehinweis funktionieren getrennt bis zu ihren exakten Grenzen", run: async () => {
        const client = context.makeClient("treatment-separate-fields");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        const internalText = `PRIVATE-INTERNAL-LIMIT-${"i".repeat(3977)}`;
        const careText = `PRIVATE-CARE-LIMIT-${"p".repeat(281)}`;
        assertEqual(internalText.length, 4000, "Interner Grenztest besitzt falsche Länge");
        assertEqual(careText.length, 300, "Pflegehinweis-Grenztest besitzt falsche Länge");
        const internalOnly = await commitTreatment(client, "treatment-internal-only", {
          internalDocumentation: internalText,
          customerCareAdvice: ""
        });
        const careOnly = await commitTreatment(client, "treatment-care-only", {
          internalDocumentation: "",
          customerCareAdvice: careText
        });
        assertEqual(internalOnly.treatmentRecord.internalDocumentation.length, 4000, "Interner Text wurde gekürzt");
        assertEqual(internalOnly.treatmentRecord.customerCareAdvice, "", "Interner Datensatz erhielt einen Pflegehinweis");
        assertEqual(careOnly.treatmentRecord.internalDocumentation, "", "Pflegedatensatz erhielt interne Dokumentation");
        assertEqual(careOnly.treatmentRecord.customerCareAdvice.length, 300, "Pflegehinweis wurde gekürzt");
        assertEqual((await client.readTreatmentRecords()).treatmentRecords.length, 2, "Getrennte Eingaben erzeugten nicht genau zwei Datensätze");
      } },
      { name: "PODOLOGY-003: Dokumentation mit Rezept speichert nur die optionale Referenz und den unveränderlichen Zuordnungssnapshot", run: async () => {
        const client = context.makeClient("treatment-prescription");
        const prescription = prescriptionFixture(client.tenantId, {
          treatmentText: "Testhaarschnitt", catalogItemId: "service-cut", prescribedUnits: 2
        });
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId, { prescriptions: [prescription] }));
        const result = await commitTreatment(client, "treatment-prescription-receipt", {
          internalDocumentation: "PRIVATE-WITH-PRESCRIPTION",
          customerCareAdvice: ""
        }, prescription);
        assertEqual(result.treatmentRecord.prescriptionId, prescription.id, "Rezeptreferenz fehlt");
        assertDeepEqual(result.treatmentRecord.prescriptionSnapshot, result.receipt.prescriptionAssignment, "Rezeptsnapshot ist nicht identisch zur Belegzuordnung");
        assert(!hasOwn(result.treatmentRecord.prescriptionSnapshot, "internalNote"), "Interne Rezeptnotiz gelangte in den Behandlungssnapshot");
        assertEqual(api.prescriptionUsage((await client.readPrescriptions()).prescriptions[0], (await client.readReceipts()).receipts).usedUnits, 1,
          "Atomarer Abschluss verbrauchte nicht genau eine Rezepteinheit");
      } },
      { name: "PODOLOGY-003: Ein normaler Gutschein-Einlösungsbeleg schreibt die Behandlung im selben atomaren Abschluss", run: async () => {
        const client = context.makeClient("treatment-voucher-redemption");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        await client.writeReceipts(receiptsRecordFixture(client.tenantId));
        await client.writeVouchers(vouchersRecordFixture(client.tenantId));
        const settings = await client.readSettings();
        const receipts = await client.readReceipts();
        const vouchers = await client.readVouchers();
        const receipt = receiptDraftFixture("treatment-voucher-receipt", {
          voucherReference: "vch_existing", total: 30, originalTotal: 30, paymentMethod: "Gutschein"
        });
        const result = await client.commitVoucherRedemption(receipt, {
          voucherReference: "vch_existing", amountCents: 3000, occurredAt: "2030-01-06T10:00:00.000Z",
          date: "06.01.2030", time: "11:00"
        }, settings, receipts, vouchers, null, {
          internalDocumentation: "PRIVATE-VOUCHER-TREATMENT", customerCareAdvice: "PRIVATE-VOUCHER-CARE"
        });
        assert(result.created && result.treatmentRecord, "Gutscheineinlösung erzeugte keinen atomaren Behandlungsdatensatz");
        assertEqual(result.treatmentRecord.receiptId, result.receipt.id, "Gutscheinbeleg und Behandlung sind nicht verknüpft");
        assertEqual((await client.readTreatmentRecords()).treatmentRecords.length, 1, "Gutscheineinlösung erzeugte nicht genau einen Datensatz");
      } },
      { name: "PODOLOGY-003: Leere Eingaben erzeugen keinen Datensatz; Grenzen, Kunde und Capability werden fail closed geprüft", run: async () => {
        const client = context.makeClient("treatment-validation");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        const empty = await commitTreatment(client, "treatment-empty", { internalDocumentation: "  ", customerCareAdvice: "\n" });
        assertEqual(empty.treatmentRecord, null, "Leere Eingabe erzeugte Behandlungsdaten");
        assertEqual((await client.readTreatmentRecords()).treatmentRecords.length, 0, "Leere Eingabe wurde persistiert");

        for (const [id, input] of [
          ["treatment-internal-too-long", { internalDocumentation: "x".repeat(4001), customerCareAdvice: "" }],
          ["treatment-care-too-long", { internalDocumentation: "", customerCareAdvice: "x".repeat(301) }]
        ]) {
          const beforeSettings = await client.readSettings();
          const beforeReceipts = await client.readReceipts();
          await assertRejects(() => client.commitReceipt(receiptDraftFixture(id), beforeSettings, beforeReceipts, null, input),
            "TREATMENT_RECORD_CONTENT_INVALID", id);
          assertEqual((await client.readReceipts()).receipts.length, 1, "Ungültige Behandlung erzeugte einen Beleg");
          assertEqual((await client.readSettings()).receiptSettings.nextNumber, beforeSettings.receiptSettings.nextNumber,
            "Ungültige Behandlung verbrauchte eine Belegnummer");
        }

        const noCustomerDraft = receiptDraftFixture("treatment-no-customer", { customerId: null, customerSnapshot: null });
        const currentSettings = await client.readSettings();
        const currentReceipts = await client.readReceipts();
        await assertRejects(() => client.commitReceipt(noCustomerDraft, currentSettings, currentReceipts, null,
          { internalDocumentation: "Nicht speichern", customerCareAdvice: "" }), "TREATMENT_DOCUMENTATION_DISABLED", "Behandlung ohne Kunde");
        const inactiveCustomers = await client.readCustomers();
        inactiveCustomers.customers.find(customer => customer.id === "customer-anna").active = false;
        await client.writeCustomers(inactiveCustomers);
        const inactiveCustomerSettings = await client.readSettings();
        const inactiveCustomerReceipts = await client.readReceipts();
        await assertRejects(() => client.commitReceipt(receiptDraftFixture("treatment-inactive-customer"), inactiveCustomerSettings, inactiveCustomerReceipts, null,
          { internalDocumentation: "Nicht speichern", customerCareAdvice: "" }), "TREATMENT_DOCUMENTATION_DISABLED", "Behandlung bei deaktiviertem Kunden");
        inactiveCustomers.customers.find(customer => customer.id === "customer-anna").active = true;
        await client.writeCustomers(inactiveCustomers);
        const disabledSettings = await client.readSettings();
        disabledSettings.businessAreas[0].features.prescriptionDocumentation = false;
        await client.writeSettings(disabledSettings);
        const settingsAfterDisable = await client.readSettings();
        const receiptsAfterDisable = await client.readReceipts();
        await assertRejects(() => client.commitReceipt(receiptDraftFixture("treatment-disabled"), settingsAfterDisable, receiptsAfterDisable, null,
          { internalDocumentation: "Nicht speichern", customerCareAdvice: "" }), "TREATMENT_DOCUMENTATION_DISABLED", "Behandlung bei deaktivierter Capability");
        assertEqual((await client.readTreatmentRecords()).treatmentRecords.length, 0, "Abgewiesene Eingaben wurden gespeichert");
      } },
      { name: "PODOLOGY-003: Mehrfachaufruf ist idempotent, abgeschlossene Dokumentation unveränderlich", run: async () => {
        const client = context.makeClient("treatment-idempotent");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        const settings = await client.readSettings();
        const seed = await client.readReceipts();
        const draft = receiptDraftFixture("treatment-idempotent-receipt");
        const input = { internalDocumentation: "PRIVATE-IDEMPOTENT", customerCareAdvice: "Pflege" };
        const first = await client.commitReceipt(draft, settings, seed, null, input);
        const repeated = await client.commitReceipt(draft, settings, seed, null, input);
        assertEqual(repeated.created, false, "Mehrfachaufruf erzeugte einen zweiten Beleg");
        assertEqual((await client.readTreatmentRecords()).treatmentRecords.length, 1, "Mehrfachaufruf erzeugte eine zweite Dokumentation");
        await assertRejects(() => client.commitReceipt(draft, settings, seed, null,
          { ...input, internalDocumentation: "PRIVATE-CHANGED" }), "TREATMENT_RECORD_IMMUTABLE", "Nachträgliches Überschreiben");
        assertDeepEqual((await client.readTreatmentRecords()).treatmentRecords[0], first.treatmentRecord, "Fehlversuch veränderte die Dokumentation");
      } },
      { name: "PODOLOGY-003: Defekter Behandlungsstore bricht den gesamten Abschluss ohne Beleg, Nummer oder Teilstand ab", run: async () => {
        const client = context.makeClient("treatment-write-failure");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        const settings = await client.readSettings();
        const receipts = await client.readReceipts();
        await writeRawTreatmentRecord(client, { ...api.emptyTreatmentRecordsRecord(client.tenantId), treatmentRecords: null });
        await assertRejects(() => client.commitReceipt(receiptDraftFixture("treatment-failed"), settings, receipts, null,
          { internalDocumentation: "PRIVATE-FAIL", customerCareAdvice: "" }), "TREATMENT_RECORDS_RECORD_INVALID", "Defekter Store");
        assertEqual((await client.readReceipts()).receipts.length, 0, "Abbruch hinterließ einen Beleg");
        assertEqual((await client.readSettings()).receiptSettings.nextNumber, settings.receiptSettings.nextNumber, "Abbruch verbrauchte eine Nummer");
      } },
      { name: "PODOLOGY-003: Storno, Gutschrift, Kunden- und Capability-Deaktivierung lassen den historischen Datensatz lesbar und bytegleich", run: async () => {
        const client = context.makeClient("treatment-lifecycle");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        const committed = await commitTreatment(client, "treatment-lifecycle-receipt", {
          internalDocumentation: "PRIVATE-LIFECYCLE", customerCareAdvice: "Pflegehinweis"
        });
        const historical = clone(committed.treatmentRecord);
        const credit = await client.commitReceiptCorrection(committed.receipt.number, {
          id: "treatment-credit", type: "credit", total: -10,
          items: [{ title: "Kulanz", quantity: 1, unitPrice: -10, total: -10 }],
          completedAt: "2030-01-06T09:00:00.000Z", isFull: false
        }, committed.receiptsRecord);
        assertDeepEqual((await client.readTreatmentRecords()).treatmentRecords[0], historical, "Gutschrift veränderte Behandlungssnapshot");
        await client.commitReceiptCorrection(committed.receipt.number, {
          id: "treatment-cancellation", type: "cancellation", total: -39,
          items: committed.receipt.items.map(item => ({ ...item, unitPrice: -39, total: -39 })),
          completedAt: "2030-01-06T10:00:00.000Z"
        }, credit.record);
        const customers = await client.readCustomers();
        customers.customers.find(customer => customer.id === historical.customerId).active = false;
        await client.writeCustomers(customers);
        const settings = await client.readSettings();
        const historicalArea = settings.businessAreas.find(area => area.id === historical.businessAreaId);
        historicalArea.features.prescriptionDocumentation = false;
        historicalArea.active = false;
        historicalArea.isDefault = false;
        settings.businessAreas.find(area => area.id === "coaching").isDefault = true;
        await client.writeSettings(settings);
        assertDeepEqual((await client.readTreatmentRecords()).treatmentRecords[0], historical,
          "Lebenszyklus oder Deaktivierung veränderte bzw. versteckte die Historie");
      } },
      { name: "PODOLOGY-003: Bereichsvorlagen bleiben nach Zweck getrennt, archiviert erhalten und strikt validiert", run: async () => {
        const client = context.makeClient("treatment-templates");
        const templates = [
          treatmentTemplateFixture(),
          treatmentTemplateFixture({ id: "treatment-template-care", purpose: "customer-care", title: "Pflege zuhause", text: "PRIVATE-TEMPLATE-CARE" }),
          treatmentTemplateFixture({ id: "treatment-template-archived", active: false, title: "Archiviert", text: "PRIVATE-TEMPLATE-ARCHIVE" })
        ];
        const snapshot = treatmentSnapshot(client.tenantId, { templates });
        await client.restoreTenantSnapshot(snapshot);
        let stored = await client.readSettings();
        assertDeepEqual(stored.treatmentTemplates, templates, "Vorlagen wurden nicht vollständig gespeichert");
        const historical = (await commitTreatment(client, "treatment-template-snapshot", {
          internalDocumentation: "PRIVATE-TEMPLATE-CUSTOMIZED", customerCareAdvice: ""
        })).treatmentRecord;
        stored = await client.readSettings();
        stored.treatmentTemplates[0].text = "PRIVATE-TEMPLATE-LATER-CHANGED";
        stored.treatmentTemplates[0].updatedAt = "2030-02-01T10:00:00.000Z";
        await client.writeSettings(stored);
        assertDeepEqual((await client.readTreatmentRecords()).treatmentRecords[0], historical,
          "Spätere Vorlagenänderung veränderte den tatsächlich gespeicherten Textsnapshot");
        stored = await client.readSettings();
        const templatesAfterEdit = clone(stored.treatmentTemplates);
        stored.businessAreas[0].features.prescriptionDocumentation = false;
        await client.writeSettings(stored);
        assertDeepEqual((await client.readSettings()).treatmentTemplates, templatesAfterEdit, "Deaktivierung löschte bestehende Vorlagen");
        for (const [overrides, code] of [
          [{ purpose: "diagnosis" }, "TREATMENT_TEMPLATE_PURPOSE_INVALID"],
          [{ businessAreaId: "missing" }, "TREATMENT_TEMPLATE_AREA_MISSING"],
          [{ title: "" }, "TREATMENT_TEMPLATE_CONTENT_INVALID"],
          [{ text: "x".repeat(4001) }, "TREATMENT_TEMPLATE_CONTENT_INVALID"],
          [{ purpose: "customer-care", text: "x".repeat(301) }, "TREATMENT_TEMPLATE_CONTENT_INVALID"]
        ]) assertThrows(() => api.normalizeTreatmentTemplates([treatmentTemplateFixture(overrides)], snapshot.stores.settings.businessAreas), code, code);
        assertThrows(() => api.normalizeTreatmentTemplates([templates[0], clone(templates[0])], snapshot.stores.settings.businessAreas),
          "TREATMENT_TEMPLATE_ID_DUPLICATE", "Doppelte Vorlagen-ID");
      } },
      { name: "PODOLOGY-003: Vollbackup, Restore, Altbackup-Kompatibilität und atomarer Sieben-Store-Rollback sind deterministisch", run: async () => {
        const client = context.makeClient("treatment-backup");
        const templates = [treatmentTemplateFixture(), treatmentTemplateFixture({ id: "care", purpose: "customer-care", title: "Pflege", text: "PRIVATE-BACKUP-CARE" })];
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId, { templates }));
        await commitTreatment(client, "treatment-backup-receipt", { internalDocumentation: "PRIVATE-BACKUP-INTERNAL", customerCareAdvice: "PRIVATE-BACKUP-ADVICE" });
        const exported = await client.exportTenantSnapshot();
        const encrypted = await backupApi.encryptTenantSnapshot(exported, "Sicherer Behandlungsbackup Testsatz 2030");
        assert(!encrypted.includes("PRIVATE-BACKUP"), "Verschlüsseltes Backup enthält Klartext");
        const decrypted = await backupApi.decryptTenantSnapshot(encrypted, "Sicherer Behandlungsbackup Testsatz 2030");
        await client.restoreTenantSnapshot(decrypted);
        assertDeepEqual(await client.readTreatmentRecords(), exported.stores.treatmentRecords, "Backup/Restore verlor Behandlungsdaten");
        assertDeepEqual((await client.readSettings()).treatmentTemplates, templates, "Backup/Restore verlor Vorlagen");

        const legacy = clone(exported);
        legacy.appDataSchemaVersion = 7;
        delete legacy.stores.treatmentRecords;
        await client.restoreTenantSnapshot(legacy);
        assertEqual((await client.readTreatmentRecords()).treatmentRecords.length, 0, "Schema-7-Restore erfand Behandlungsdaten");
        const incomplete = clone(exported);
        delete incomplete.stores.treatmentRecords;
        assertThrows(() => api.validateTenantSnapshot(incomplete, client.tenantId), "BACKUP_INCOMPLETE", "Schema 8 ohne Behandlungstore");

        await client.restoreTenantSnapshot(exported);
        const before = await client.exportTenantSnapshot();
        const changed = clone(before);
        changed.stores.settings.company.name = "NEVER-COMMIT";
        changed.stores.treatmentRecords.treatmentRecords[0].internalDocumentation = "NEVER-COMMIT";
        await assertRejects(() => client.restoreTenantSnapshot(changed, { simulateFailureAfterStore: 6 }),
          "BACKUP_RESTORE_TEST_ABORT", "Abbruch nach siebtem Store");
        assertDeepEqual((await client.exportTenantSnapshot()).stores, before.stores, "Abbruch hinterließ Teilrestore");
      } },
      { name: "PODOLOGY-003: Referenzen und Eindeutigkeit werden im Backup vor jedem Restore fail closed validiert", run: async () => {
        const client = context.makeClient("treatment-references");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId, { prescriptions: [prescriptionFixture(client.tenantId, {
          treatmentText: "Testhaarschnitt", catalogItemId: "service-cut"
        })] }));
        const prescription = (await client.readPrescriptions()).prescriptions[0];
        await commitTreatment(client, "treatment-reference-receipt", { internalDocumentation: "PRIVATE-REF", customerCareAdvice: "" }, prescription);
        const valid = await client.exportTenantSnapshot();
        for (const [field, value] of [["customerId", "missing"], ["businessAreaId", "missing"], ["receiptId", "missing"], ["userId", "missing"], ["prescriptionId", "missing"]]) {
          const invalid = clone(valid);
          invalid.stores.treatmentRecords.treatmentRecords[0][field] = value;
          assertThrows(() => api.validateTenantSnapshot(invalid, client.tenantId), "TREATMENT_RECORD_REFERENCE_INVALID", field);
        }
        const duplicate = clone(valid);
        duplicate.stores.treatmentRecords.treatmentRecords.push({ ...clone(duplicate.stores.treatmentRecords.treatmentRecords[0]), id: "treatment-duplicate" });
        assertThrows(() => api.validateTenantSnapshot(duplicate, client.tenantId), "TREATMENT_RECORD_DUPLICATE", "Doppelte Belegreferenz");
      } },
      { name: "PODOLOGY-004: Kundendokumentprojektion gibt ausschließlich historisches Rezeptdatum und Pflegehinweis frei", run: async () => {
        const receipt = receiptDocumentFixture({
          id: "receipt-podology-document",
          number: "2030-000151",
          prescriptionAssignment: {
            formatVersion: 1,
            prescriptionId: "prescription-document-private",
            prescribedOn: "2026-08-31",
            treatmentText: "PRIVATE-PRESCRIPTION-TEXT",
            units: 1,
            prescribedUnits: 3,
            overrunConfirmed: false
          }
        });
        const treatment = {
          receiptId: receipt.id,
          receiptNumber: receipt.number,
          customerCareAdvice: "Zweimal wöchentlich Fußbad und Zehenzwischenräume trocken halten.",
          internalDocumentation: "PRIVATE-INTERNAL-DOCUMENTATION"
        };
        const customerModel = documentApi.createReceiptDocumentModel(receipt, {
          ...documentOptions(), outputMode: "customer", treatmentRecord: treatment
        });
        assertEqual(customerModel.prescriptionDate, "31.08.2026", "Historisches Rezeptdatum fehlt oder ist nicht deutsch formatiert");
        assertEqual(customerModel.customerCareAdvice, treatment.customerCareAdvice, "Historischer Pflegehinweis fehlt");
        const customerJson = JSON.stringify(customerModel);
        ["PRIVATE-INTERNAL-DOCUMENTATION", "PRIVATE-PRESCRIPTION-TEXT", "prescription-document-private", "prescribedUnits", "overrunConfirmed"].forEach(secret => {
          assert(!customerJson.includes(secret), `Nicht freigegebenes Rezept-/Behandlungsfeld gelangte ins Kundendokument: ${secret}`);
        });
        const markup = documentViewApi.renderReceipt(customerModel, { interactiveQr: false });
        assert(markup.includes("Rezept vom:") && markup.includes("31.08.2026"), "Rezeptdatum fehlt in der internen Belegansicht");
        assert(markup.includes("Pflegehinweis:") && markup.includes("Zweimal wöchentlich"), "Pflegehinweis fehlt in der internen Belegansicht");
        assert(!markup.includes("PRIVATE-"), "Interne Dokumentation gelangte in die interne Kundenbelegansicht");

        const pdf = await globalThis.PDFLib.PDFDocument.load(await documentApi.createPdfBytes(customerModel));
        const pdfText = visiblePdfText(pdf);
        assert(pdfText.includes("Rezept vom: 31.08.2026"), "Rezeptdatum fehlt im tatsächlich erzeugten Kunden-PDF");
        assert(pdfText.includes("Pflegehinweis:"), "Pflegehinweis fehlt im tatsächlich erzeugten Kunden-PDF");
        assert(!pdfText.includes("PRIVATE-INTERNAL") && !pdfText.includes("PRIVATE-PRESCRIPTION"), "Internes Feld gelangte ins Kunden-PDF");

        const careOnlyReceipt = receiptDocumentFixture({ id: "receipt-care-only", number: "2030-000152" });
        const careOnly = documentApi.createReceiptDocumentModel(careOnlyReceipt, {
          ...documentOptions(), outputMode: "customer",
          treatmentRecord: { receiptId: careOnlyReceipt.id, receiptNumber: careOnlyReceipt.number, customerCareAdvice: "Nur Pflegehinweis", internalDocumentation: "PRIVATE-ONLY" }
        });
        assertEqual(careOnly.prescriptionDate, "", "Beleg ohne Rezept erhielt ein Rezeptdatum");
        assertEqual(careOnly.customerCareAdvice, "Nur Pflegehinweis", "Pflegehinweis ohne Rezept wurde unterdrückt");

        const internalOnly = documentApi.createReceiptDocumentModel(careOnlyReceipt, {
          ...documentOptions(), outputMode: "customer",
          treatmentRecord: { receiptId: careOnlyReceipt.id, receiptNumber: careOnlyReceipt.number, customerCareAdvice: "", internalDocumentation: "PRIVATE-ONLY" }
        });
        assertEqual(internalOnly.customerCareAdvice, "", "Nur interne Dokumentation erzeugte eine Kundenausgabe");

        const restricted = documentApi.createReceiptDocumentModel(receipt, { ...documentOptions(), outputMode: "restricted", treatmentRecord: treatment });
        const taxAdvisor = documentApi.createReceiptDocumentModel(receipt, { ...documentOptions(), outputMode: "tax-advisor", treatmentRecord: treatment });
        for (const model of [restricted, taxAdvisor]) {
          assertEqual(model.prescriptionDate, "", "Eingeschränkter Dokumentmodus enthält ein Rezeptdatum");
          assertEqual(model.customerCareAdvice, "", "Eingeschränkter Dokumentmodus enthält einen Pflegehinweis");
        }

        const correction = documentApi.createReceiptDocumentModel({ ...receipt, id: "credit-podology-document", number: "GS-2030-000151", type: "credit" }, {
          ...documentOptions(), outputMode: "customer",
          treatmentRecord: { ...treatment, receiptId: "credit-podology-document", receiptNumber: "GS-2030-000151" }
        });
        assertEqual(correction.prescriptionDate, "", "Gutschrift wiederholt das Rezeptdatum");
        assertEqual(correction.customerCareAdvice, "", "Gutschrift wiederholt den Pflegehinweis");

        const brokenDate = documentApi.createReceiptDocumentModel({ ...receipt, prescriptionAssignment: { ...receipt.prescriptionAssignment, prescribedOn: "2026-02-31" } }, {
          ...documentOptions(), outputMode: "customer", treatmentRecord: treatment
        });
        assertEqual(brokenDate.prescriptionDate, "", "Ungültiges Snapshotdatum wurde erfunden oder ausgegeben");
        assertThrows(() => documentApi.createReceiptDocumentModel(receipt, { ...documentOptions(), outputMode: "public" }), "DOCUMENT_OUTPUT_MODE_INVALID", "Unbekannter Dokumentmodus");
        assertThrows(() => documentApi.createReceiptDocumentModel(receipt, {
          ...documentOptions(), outputMode: "customer", treatmentRecord: { ...treatment, receiptId: "wrong-receipt" }
        }), "DOCUMENT_TREATMENT_INVALID", "Falsch zugeordneter Pflegehinweis");
      } },
      { name: "PODOLOGY-004: Zentraler PDF-Textumbruch zerlegt auch das erste überlange Einzelwort verlustfrei", run: async () => {
        const font = {
          encodeText() { return {}; },
          widthOfTextAtSize(value, size) { return Array.from(value).length * size; }
        };
        const cases = [
          "Kurzer Pflegehinweis mit mehreren Sätzen. Alles bleibt lesbar.",
          "x".repeat(300),
          "SehrLangesErstesEinzelwortOhneTrennmoeglichkeitUndOhneLeerzeichen",
          "https://beispiel.invalid/pflege/hinweis?abschnitt=sehr-langer-wert",
          "Hornhaut-Pflege-Zehenzwischenräume-trocken-halten",
          "ÄÖÜ äöü ß Fußpflege Übergröße",
          "Zehenpflege 👣 Unicode bleibt deterministisch",
          "Erster Satz. Zweiter kurzer Satz. Dritter kurzer Satz."
        ];
        cases.forEach((source, index) => {
          const lines = documentApi.wrapText(font, source, 1, 20);
          assert(lines.length > 0, `Textfall ${index + 1} erzeugte keine Zeile`);
          assert(lines.every(line => font.widthOfTextAtSize(line, 1) <= 20), `Textfall ${index + 1} überschreitet die PDF-Breite`);
          assertEqual(lines.join("").replace(/\s/gu, ""), source.replace(/\s/gu, ""), `Textfall ${index + 1} wurde gekürzt oder verändert`);
        });
        assert(documentApi.wrapText(font, cases[2], 1, 20).length > 1, "Überlanges erstes Einzelwort wurde nicht umgebrochen");
      } },
      { name: "PODOLOGY-004: 300-Zeichen-Pflegehinweis bleibt in HTML und mehrseitigem 80-mm-PDF vollständig", run: async () => {
        const customerCareAdvice = `START ${"x".repeat(289)} ENDE`;
        assertEqual(customerCareAdvice.length, 300, "Layoutfixture besitzt nicht exakt 300 Zeichen");
        const items = Array.from({ length: 35 }, (_, index) => ({
          id: `podology-layout-${index}`,
          title: `Ausführliche Fußpflege mit Umlaut ÄÖÜ Nummer ${index + 1}`,
          type: "service",
          quantity: 1,
          originalUnitPrice: 10,
          unitPrice: 10,
          total: 10,
          netTotal: 8.4,
          taxAmount: 1.6,
          taxRate: 19
        }));
        const receipt = receiptDocumentFixture({
          id: "receipt-podology-layout",
          number: "2030-000153",
          customerSnapshot: {
            id: "customer-anna",
            name: "Anna Maria Mustermann mit einem ungewöhnlich langen Kundennamen",
            street: "Sehr lange Beispielstraße 123",
            zip: "93047",
            city: "Regensburg"
          },
          brandingSnapshot: { logoMode: "custom", visibleName: "Podologie Änne", logo: { assetId: "business-logo-hair", source: "business-area", label: "Bereichslogo" } },
          prescriptionAssignment: { prescriptionId: "prescription-layout", prescribedOn: "2026-08-31" },
          items,
          originalTotal: 350,
          netTotal: 294,
          taxTotal: 56,
          total: 350,
          taxGroups: [{ rate: 19, net: 294, tax: 56, gross: 350 }]
        });
        const model = documentApi.createReceiptDocumentModel(receipt, {
          ...documentOptions(), outputMode: "customer",
          treatmentRecord: { receiptId: receipt.id, receiptNumber: receipt.number, customerCareAdvice, internalDocumentation: "LAYOUT-INTERNAL-SECRET" }
        });
        const markup = documentViewApi.renderReceipt(model, { interactiveQr: false });
        assert(markup.includes(customerCareAdvice), "HTML kürzt den 300-Zeichen-Pflegehinweis");
        assert(!markup.includes("LAYOUT-INTERNAL-SECRET"), "HTML enthält interne Dokumentation");

        const measure = width => new Promise((resolve, reject) => {
          const frame = document.createElement("iframe");
          const timeout = window.setTimeout(() => { frame.remove(); reject(new Error(`PODOLOGY-004-Layout ${width}px Timeout`)); }, 8000);
          frame.title = `PODOLOGY-004 Kundendokument ${width} Pixel`;
          frame.style.cssText = `position:fixed;left:-2000px;top:0;width:${width}px;height:900px;border:0`;
          frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="../styles.css"><style>body{margin:0;padding:8px;background:#eef3f1}</style></head><body>${markup}</body></html>`;
          frame.addEventListener("load", () => window.requestAnimationFrame(() => {
            try {
              const root = frame.contentDocument.documentElement;
              const supplement = frame.contentDocument.querySelector(".receipt-paper-customer-supplements");
              const result = {
                viewportWidth: frame.contentWindow.innerWidth,
                scrollWidth: root.scrollWidth,
                clientWidth: root.clientWidth,
                overflowWrap: frame.contentWindow.getComputedStyle(supplement).overflowWrap,
                text: supplement.textContent
              };
              window.clearTimeout(timeout);
              frame.remove();
              resolve(result);
            } catch (error) {
              window.clearTimeout(timeout);
              frame.remove();
              reject(error);
            }
          }), { once: true });
          document.body.append(frame);
        });
        for (const width of [320, 360, 390, 411]) {
          const layout = await measure(width);
          assertEqual(layout.viewportWidth, width, `Falscher Dokumentviewport bei ${width} px`);
          assert(layout.scrollWidth <= layout.clientWidth, `Kundendokument läuft bei ${width} px horizontal über`);
          assertEqual(layout.overflowWrap, "anywhere", `Pflegehinweis wird bei ${width} px nicht robust umgebrochen`);
          assert(layout.text.includes("START") && layout.text.includes("ENDE"), `Pflegehinweis ist bei ${width} px unvollständig`);
        }

        const pdf = await globalThis.PDFLib.PDFDocument.load(await documentApi.createPdfBytes(model));
        assert(pdf.getPageCount() > 1, "Langer 80-mm-Kundenbeleg wurde nicht sauber umgebrochen");
        pdf.getPages().forEach(page => assert(Math.abs(page.getWidth() - 226.77) < 0.02, "PDF-Seite besitzt nicht 80-mm-Breite"));
        const text = visiblePdfText(pdf);
        assert(text.includes("Rezept vom: 31.08.2026"), "Mehrseitiges PDF verlor das Rezeptdatum");
        assert(text.includes("Pflegehinweis: START") && text.includes("ENDE"), "Mehrseitiges PDF verlor den Pflegehinweis");
        assert(text.includes("Digitaler Beleg"), "Mehrseitiges PDF verlor den QR-Abschluss");
        assert(!text.includes("LAYOUT-INTERNAL-SECRET"), "Mehrseitiges PDF enthält interne Dokumentation");
      } },
      { name: "PODOLOGY-004: Public-Projektion und Steuerberater-PDF bleiben medizinisch restriktiv", run: async () => {
        const client = context.makeClient("podology-document-privacy");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId, { prescriptions: [prescriptionFixture(client.tenantId)] }));
        const prescription = (await client.readPrescriptions()).prescriptions[0];
        const committed = await commitTreatment(client, "podology-document-private-receipt", {
          internalDocumentation: "PODOLOGY004-INTERNAL-MARKER",
          customerCareAdvice: "PODOLOGY004-CARE-MARKER"
        }, prescription);
        const exportedSnapshot = await client.exportTenantSnapshot();
        const receipt = committed.receipt;
        const customerModel = documentApi.createReceiptDocumentModel(receipt, {
          ...documentOptions(), outputMode: "customer", treatmentRecord: committed.treatmentRecord
        });
        const publicProjection = JSON.stringify(publicDocumentApi.projectDocument(customerModel));
        const publicBundle = await publicDocumentApi.createPublicBundle(customerModel, { baseUrl: "https://app.example.invalid/", qrService: qrApi });
        const publicDecoded = JSON.stringify(await publicDocumentApi.decodePublicLink(publicBundle.link, { qrService: qrApi }));
        ["31.08.2026", "PODOLOGY004-CARE-MARKER", "PODOLOGY004-INTERNAL-MARKER", "prescription-one", "prescriptionDate", "customerCareAdvice"].forEach(secret => {
          assert(!publicProjection.includes(secret), `Public-Projektion enthält medizinischen Marker: ${secret}`);
          assert(!publicDecoded.includes(secret), `Public-Link/Public Viewer enthält medizinischen Marker: ${secret}`);
          assert(!publicBundle.link.includes(secret), `QR-Link enthält medizinischen Klartext: ${secret}`);
        });

        const packageResult = await exportPackageApi.createTaxAdvisorPackage(exportedSnapshot, {
          periodType: "custom", dateFrom: "2030-01-01", dateTo: "2030-01-31", businessAreaId: "all",
          generatedAt: "2030-02-01T12:34:00.000Z"
        });
        const archive = await globalThis.JSZip.loadAsync(await packageResult.packageFile.content.arrayBuffer(), { checkCRC32: true });
        for (const [path, file] of Object.entries(archive.files)) {
          if (file.dir) continue;
          const bytes = await file.async("uint8array");
          if (path.endsWith(".pdf")) {
            const text = visiblePdfText(await globalThis.PDFLib.PDFDocument.load(bytes));
            assert(!text.includes("Rezept vom:") && !text.includes("Pflegehinweis:"), `Steuerberater-PDF ${path} enthält medizinische Zusatzfelder`);
          } else {
            const text = new TextDecoder().decode(bytes);
            ["PODOLOGY004-CARE-MARKER", "PODOLOGY004-INTERNAL-MARKER", "31.08.2026"].forEach(secret => {
              assert(!text.includes(secret), `Steuerberaterdatei ${path} enthält medizinischen Marker: ${secret}`);
            });
          }
        }
        for (const exportType of ["own-data", "tax-advisor"]) {
          const exported = exportApi.createExportFiles(exportedSnapshot, {
            exportType, includeCustomers: true, periodType: "custom", dateFrom: "2030-01-01", dateTo: "2030-01-31", businessAreaId: "all"
          });
          const serialized = JSON.stringify(exported);
          assert(!serialized.includes("PODOLOGY004-CARE-MARKER") && !serialized.includes("PODOLOGY004-INTERNAL-MARKER"), `${exportType} enthält Behandlungsmarker`);
        }
        assert(!JSON.stringify(api.diagnoseTenantSnapshot(exportedSnapshot, client.tenantId)).includes("PODOLOGY004-"), "Diagnose enthält Behandlungsmarker");
      } },
      { name: "PODOLOGY-004: Backup/Restore rekonstruiert dasselbe historische Kundendokument ohne Liveauflösung", run: async () => {
        const client = context.makeClient("podology-document-restore");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId, {
          prescriptions: [prescriptionFixture(client.tenantId)],
          templates: [treatmentTemplateFixture({ id: "care-restore", purpose: "customer-care", title: "Pflege", text: "Ursprüngliche Vorlage" })]
        }));
        const prescription = (await client.readPrescriptions()).prescriptions[0];
        const committed = await commitTreatment(client, "podology-document-restore-receipt", {
          internalDocumentation: "RESTORE-INTERNAL-MARKER",
          customerCareAdvice: "Historischer Pflegehinweis nach Restore"
        }, prescription);
        const beforeModel = documentApi.createReceiptDocumentModel(committed.receipt, {
          ...documentOptions(), outputMode: "customer", treatmentRecord: committed.treatmentRecord
        });
        const encrypted = await backupApi.encryptTenantSnapshot(await client.exportTenantSnapshot(), "Sicherer PODOLOGY-004 Restore Testsatz");
        const restoredSnapshot = await backupApi.decryptTenantSnapshot(encrypted, "Sicherer PODOLOGY-004 Restore Testsatz");
        await client.restoreTenantSnapshot(restoredSnapshot);
        const storedPrescription = (await client.readPrescriptions()).prescriptions[0];
        await client.savePrescription({ ...storedPrescription, active: false }, storedPrescription.updatedAt);
        const settings = await client.readSettings();
        settings.treatmentTemplates[0].text = "SPÄTERE-VORLAGE";
        settings.treatmentTemplates[0].updatedAt = "2031-01-01T10:00:00.000Z";
        settings.businessAreas[0].active = false;
        await client.writeSettings(settings);
        const customers = await client.readCustomers();
        customers.customers[0].active = false;
        await client.writeCustomers(customers);
        const restoredReceipt = (await client.readReceipts()).receipts.find(entry => entry.id === committed.receipt.id);
        const restoredTreatment = (await client.readTreatmentRecords()).treatmentRecords.find(entry => entry.receiptId === committed.receipt.id);
        const afterModel = documentApi.createReceiptDocumentModel(restoredReceipt, {
          ...documentOptions(), outputMode: "customer", treatmentRecord: restoredTreatment
        });
        assertEqual(afterModel.prescriptionDate, beforeModel.prescriptionDate, "Restore/Archivierung änderte das historische Rezeptdatum");
        assertEqual(afterModel.customerCareAdvice, beforeModel.customerCareAdvice, "Restore/Vorlagenänderung änderte den historischen Pflegehinweis");
        assert(!JSON.stringify(afterModel).includes("RESTORE-INTERNAL-MARKER"), "Interne Dokumentation gelangte nach Restore ins Kundendokument");
      } },
      { name: "PODOLOGY-003: Diagnose, Steuer-/Eigene-Daten-Export, ZIP, PDF und Public Viewer geben keine Behandlungsdaten aus", run: async () => {
        const client = context.makeClient("treatment-privacy");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        await commitTreatment(client, "treatment-privacy-receipt", {
          internalDocumentation: "PRIVATE-TREATMENT-EXPORT-ÄÖÜ",
          customerCareAdvice: "PRIVATE-CARE-EXPORT"
        });
        const snapshot = await client.exportTenantSnapshot();
        const before = clone(snapshot);
        const diagnostic = api.diagnoseTenantSnapshot(snapshot, client.tenantId);
        assertEqual(diagnostic.status, "consistent", "Konsistenter Bestand abgelehnt");
        assert(!JSON.stringify(diagnostic).includes("PRIVATE-"), "Diagnose verrät Behandlungsdaten");
        for (const exportType of ["own-data", "tax-advisor"]) {
          const exported = exportApi.createExportFiles(snapshot, {
            exportType, includeCustomers: true, periodType: "custom", dateFrom: "2030-01-01", dateTo: "2030-01-31", businessAreaId: "all"
          });
          assert(!JSON.stringify(exported).includes("PRIVATE-"), `${exportType} verrät Behandlungsdaten`);
          assert(!exported.files.some(file => /Behandlung|Pflege|treatment/i.test(file.name)), "Export erzeugte interne Fachdatei");
        }
        const packageResult = await exportPackageApi.createTaxAdvisorPackage(snapshot, {
          periodType: "custom", dateFrom: "2030-01-01", dateTo: "2030-01-31", businessAreaId: "all",
          generatedAt: "2030-02-01T12:34:00.000Z"
        });
        const archive = await globalThis.JSZip.loadAsync(await packageResult.packageFile.content.arrayBuffer(), { checkCRC32: true });
        for (const [path, file] of Object.entries(archive.files)) {
          assert(!/Behandlung|Pflege|treatment/i.test(path), "ZIP-Pfad verrät Behandlungsdaten");
          if (!file.dir) assert(!new TextDecoder().decode(await file.async("uint8array")).includes("PRIVATE-"), `ZIP-Eintrag ${path} verrät Behandlungsdaten`);
        }
        for (const receipt of snapshot.stores.receipts.receipts) {
          const model = documentApi.createReceiptDocumentModel(receipt, documentOptions());
          assert(!JSON.stringify(model).includes("PRIVATE-"), "Dokumentmodell enthält Behandlungsdaten");
          assert(!new TextDecoder().decode(await documentApi.createPdfBytes(model)).includes("PRIVATE-"), "PDF enthält Behandlungsdaten");
          const bundle = await publicDocumentApi.createPublicBundle(model, { baseUrl: "https://app.example.invalid/", qrService: qrApi });
          assert(!JSON.stringify(await publicDocumentApi.decodePublicLink(bundle.link, { qrService: qrApi })).includes("PRIVATE-"), "Public Viewer enthält Behandlungsdaten");
        }
        assertDeepEqual(snapshot, before, "Projektion veränderte den Snapshot");
      } },
      { name: "PODOLOGY-003: Vorlagen-UI legt getrennte Zwecke an, bearbeitet, archiviert und reaktiviert ohne horizontalen Überlauf", run: async () => {
        const index = await (await fetch("../index.html", { cache: "no-store" })).text();
        const client = context.makeClient("treatment-template-ui");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        const frame = document.createElement("iframe");
        frame.title = "Behandlungsvorlagen 320 px";
        frame.style.cssText = "position:fixed;left:-2000px;top:0;width:320px;height:807px;border:0";
        setIsolatedAppFrame(frame, isolatedAppMarkup(index, client, "settings-business-areas", context.databaseName));
        document.body.append(frame);
        const waitFor = async predicate => {
          for (let index = 0; index < 200; index += 1) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
          throw new Error(`Vorlagenoberfläche wurde nicht rechtzeitig bereit: ${predicate.toString()}`);
        };
        try {
          const doc = () => frame.contentDocument;
          const click = selector => { const element = doc().querySelector(selector); assert(element, `Vorlagen-UI fehlt: ${selector}`); element.click(); };
          const fill = (selector, value) => {
            const element = doc().querySelector(selector); assert(element, `Vorlagenfeld fehlt: ${selector}`);
            element.value = value; element.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true }));
          };
          const noOverflow = () => assert(doc().documentElement.scrollWidth <= frame.contentWindow.innerWidth, "Vorlagen-UI hat horizontalen Überlauf bei 320 px");
          await waitFor(() => {
            const button = doc()?.querySelector('[data-new-treatment-template="hair"][data-treatment-template-purpose="internal-documentation"]');
            return button && !button.disabled;
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
          const newInternalButton = doc().querySelector('[data-new-treatment-template="hair"][data-treatment-template-purpose="internal-documentation"]');
          let clickObserved = false;
          doc().addEventListener("click", () => { clickObserved = true; }, { once: true });
          newInternalButton.click();
          try {
            await waitFor(() => doc().querySelector("#treatmentTemplateTitle"));
          } catch (error) {
            throw new Error(`Vorlageneditor blieb geschlossen (click=${clickObserved}, disabled=${newInternalButton.disabled}, purpose=${newInternalButton.dataset.treatmentTemplatePurpose}, errors=${JSON.stringify(frame.contentWindow.FRECKA_PRESCRIPTION_UI_ERRORS)})`);
          }
          fill("#treatmentTemplateTitle", "Interner Standard");
          fill("#treatmentTemplateText", "PRIVATE-UI-TEMPLATE-INTERNAL");
          click('[data-action="treatment-template-save"]');
          await waitFor(() => doc().querySelector('[data-edit-treatment-template]'));
          let stored = await client.readSettings();
          assertEqual(stored.treatmentTemplates.length, 1, "Interne Vorlage wurde nicht gespeichert");
          assertEqual(stored.treatmentTemplates[0].purpose, "internal-documentation", "Interne Vorlage erhielt falschen Zweck");
          click('[data-edit-treatment-template]');
          await waitFor(() => doc().querySelector("#treatmentTemplateTitle"));
          fill("#treatmentTemplateTitle", "Interner Standard geändert");
          click('[data-action="treatment-template-save"]');
          await waitFor(() => doc().querySelector(".treatment-template-list")?.textContent.includes("geändert"));
          click('[data-toggle-treatment-template]');
          await waitFor(() => doc().querySelector(".treatment-template-list")?.textContent.includes("Archiviert"));
          assertEqual((await client.readSettings()).treatmentTemplates[0].active, false, "Archivierung fehlt");
          click('[data-toggle-treatment-template]');
          for (let attempt = 0; attempt < 160; attempt += 1) {
            if ((await client.readSettings()).treatmentTemplates[0]?.active === true) break;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          assertEqual((await client.readSettings()).treatmentTemplates[0].active, true, "Reaktivierung fehlt");
          click('[data-new-treatment-template="hair"][data-treatment-template-purpose="customer-care"]');
          try {
            await waitFor(() => doc().querySelector("#treatmentTemplateTitle"));
          } catch (error) {
            throw new Error("Pflegevorlageneditor blieb nach der Reaktivierung geschlossen");
          }
          fill("#treatmentTemplateTitle", "Pflege zuhause");
          fill("#treatmentTemplateText", "PRIVATE-UI-TEMPLATE-CARE");
          click('[data-action="treatment-template-save"]');
          for (let attempt = 0; attempt < 160; attempt += 1) {
            stored = await client.readSettings();
            if (stored.treatmentTemplates.length === 2) break;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          assertEqual(stored.treatmentTemplates.length, 2, "Pflegevorlage wurde nicht gespeichert");
          assertEqual(stored.treatmentTemplates.filter(entry => entry.purpose === "customer-care").length, 1, "Pflegezweck wurde vermischt");
          noOverflow();
          assertDeepEqual(frame.contentWindow.FRECKA_PRESCRIPTION_UI_ERRORS, [], "PODOLOGY-003-Vorlagen-UI-Laufzeitfehler");
        } finally { frame.contentWindow?.FRECKA_PERSISTENCE?.closeDatabase(); frame.remove(); }
      } },
      { name: "PODOLOGY-003: Kunden-, Beleg- und Settingsreset sind bei historischer Behandlungsdokumentation gesperrt", run: async () => {
        const client = context.makeClient("treatment-reset");
        await client.restoreTenantSnapshot(treatmentSnapshot(client.tenantId));
        await commitTreatment(client, "treatment-reset-receipt", { internalDocumentation: "PRIVATE-RESET", customerCareAdvice: "" });
        const before = await client.exportTenantSnapshot();
        await assertRejects(() => client.deleteCustomers(), "TREATMENT_RECORD_RESET_BLOCKED", "Kundenreset");
        await assertRejects(() => client.deleteReceipts(), "TREATMENT_RECORD_RESET_BLOCKED", "Belegreset");
        await assertRejects(() => client.deleteSettings(), "TREATMENT_RECORD_RESET_BLOCKED", "Settingsreset");
        assertDeepEqual((await client.exportTenantSnapshot()).stores, before.stores, "Resetversuch veränderte Daten");
      } }
    ];
  }

  function isolatedAppMarkup(index, client, route, databaseName) {
    // Test-only wiring: production source and DOM, isolated tenant/DB, no Service Worker.
    assert(databaseName?.startsWith(testDatabasePrefix), "UI-Test benötigt eine isolierte Testdatenbank");
    const base = new URL("../", window.location.href).href;
    const setup = `<script>
      window.FRECKA_DISABLE_SERVICE_WORKER = true;
      window.FRECKA_PRESCRIPTION_UI_ERRORS = [];
      addEventListener('error', () => window.FRECKA_PRESCRIPTION_UI_ERRORS.push('error'));
      addEventListener('unhandledrejection', () => window.FRECKA_PRESCRIPTION_UI_ERRORS.push('rejection'));
      const testSnapshotSettings = window.FRECKA_PERSISTENCE.snapshotSettings;
      window.FRECKA_PERSISTENCE = Object.freeze({ ...window.FRECKA_PERSISTENCE,
        ...window.FRECKA_PERSISTENCE.createSettingsPersistence(${JSON.stringify({ databaseName, tenantId: client.tenantId })}),
        snapshotSettings: (data, status, tenant = ${JSON.stringify(client.tenantId)}) => testSnapshotSettings(data, status, tenant)
      });
      window.PROTOTYPE_DATA.users.forEach(user => { user.tenantId = ${JSON.stringify(client.tenantId)}; });
      location.hash = ${JSON.stringify(`#/` + route)};
    <\/script>`;
    return index.replace('<script src="js/app.js', `${setup}<script src="js/app.js`)
      .replace(/\b(src|href)="(?!#|https?:|data:)([^"]+)"/g, (_, attribute, path) => `${attribute}="${new URL(path, base).href}"`);
  }

  function setIsolatedAppFrame(frame, markup) {
    frame.addEventListener("load", () => {
      frame.contentDocument.open();
      frame.contentDocument.write(markup);
      frame.contentDocument.close();
    }, { once: true });
    frame.src = new URL(`app-frame.html?run=${crypto.randomUUID()}`, window.location.href).href;
  }

  function buildTests(context) {
    const cryptoPassphrase = "Sehr sicherer Backup Testsatz 2030";
    const wrongCryptoPassphrase = "Ganz andere sichere Passphrase";
    const cryptoPayload = {
      backupFormat: "TEST_PAYLOAD",
      company: "Vertrauliches Teststudio",
      customers: [{ name: "Vertrauliche Testperson" }]
    };
    let encryptedFixturePromise = null;
    const encryptedFixture = () => {
      encryptedFixturePromise ||= backupApi.encryptTenantSnapshot(cryptoPayload, cryptoPassphrase);
      return encryptedFixturePromise;
    };
    return [
      ...buildPrescriptionTests(context),
      ...buildTreatmentTests(context),
      {
        name: "Zentraler QR-Service ist vollständig und versioniert geladen",
        run: async () => {
          assert(qrApi && typeof qrApi.create === "function", "FRECKA_QR wurde nicht geladen");
          assertEqual(qrApi.QR_VERSION, "QR-001", "Falsche QR-Service-Version");
          assertEqual(typeof qrApi.buildAppLink, "function", "App-Link-Funktion fehlt");
          assertEqual(typeof qrApi.encodeAppLink, "function", "Allgemeine QR-Kodierung fehlt");
          assertEqual(typeof qrApi.parseAppLink, "function", "App-Link-Auflösung fehlt");
        }
      },
      {
        name: "Beleg-App-Link verwendet ausschließlich die stabile Referenz",
        run: async () => {
          const link = qrApi.buildAppLink("receipt", "receipt_ä/42", "https://app.example.invalid/frecka/index.html?debug=1#/home");
          const url = new URL(link);
          assertEqual(url.origin, "https://app.example.invalid", "App-Ursprung wurde verändert");
          assertEqual(url.pathname, "/frecka/index.html", "App-Pfad wurde verändert");
          assertEqual(url.search, "", "Query-Parameter gelangten in den QR-Link");
          assertEqual(decodeURIComponent(url.hash.slice("#/receipt/".length)), "receipt_ä/42", "Belegreferenz ging verloren");
        }
      },
      {
        name: "Gutschein-App-Link und Deep-Link-Auflösung verwenden dieselbe Referenz",
        run: async () => {
          const link = qrApi.buildAppLink("voucher", "vch_8f4c2a91d7e6", "https://app.example.invalid/frecka/");
          const parsed = qrApi.parseAppLink(link, "https://app.example.invalid/frecka/");
          assertEqual(parsed.kind, "voucher", "Gutscheinart wurde nicht aufgelöst");
          assertEqual(parsed.reference, "vch_8f4c2a91d7e6", "Gutscheinreferenz wurde verändert");
        }
      },
      {
        name: "QR-Erzeugung liefert eine echte quadratische Matrix und laufzeitbasiertes SVG",
        run: async () => {
          const qr = qrApi.create("receipt", "receipt_test_001", { baseUrl: "https://app.example.invalid/frecka/" });
          assert(qr.size >= 21 && qr.size <= 177, "QR-Matrixgröße liegt außerhalb des Standards");
          assertEqual(qr.matrix.length, qr.size, "QR-Matrix ist nicht quadratisch");
          assert(qr.matrix.every(row => row.length === qr.size), "QR-Zeile besitzt falsche Breite");
          assert(qr.svg.includes(`<svg`) && qr.svg.includes(`viewBox="0 0 ${qr.size + 8} ${qr.size + 8}"`), "SVG oder Vier-Modul-Ruhezone fehlt");
          assert(qr.svg.includes("shape-rendering=\"crispEdges\""), "Modulscharfe SVG-Darstellung fehlt");
          assert(!qr.svg.includes(qr.appLink), "App-Link wurde als Klartext in das SVG geschrieben");
          assert(Object.isFrozen(qr) && Object.isFrozen(qr.matrix), "QR-Laufzeitergebnis ist veränderbar");
          assert(!["png", "image", "blob", "dataUrl"].some(key => Object.prototype.hasOwnProperty.call(qr, key)), "QR-Bilddaten werden im Ergebnis gehalten");
        }
      },
      {
        name: "QR-Matrix enthält die drei normgerechten Suchmuster",
        run: async () => {
          const qr = qrApi.create("voucher", "voucher_test_001", { baseUrl: "https://app.example.invalid/frecka/" });
          const assertFinder = (left, top) => {
            for (let y = 0; y < 7; y += 1) {
              for (let x = 0; x < 7; x += 1) {
                const expected = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
                assertEqual(qr.matrix[top + y][left + x], expected, `Suchmuster bei ${left}/${top} ist fehlerhaft`);
              }
            }
          };
          assertFinder(0, 0);
          assertFinder(qr.size - 7, 0);
          assertFinder(0, qr.size - 7);
        }
      },
      {
        name: "Beliebige spätere FRECKA-App-Links nutzen dieselbe QR-Engine",
        run: async () => {
          const qr = qrApi.encodeAppLink("https://app.example.invalid/frecka/#/future/document_42");
          assertEqual(qr.appLink, "https://app.example.invalid/frecka/#/future/document_42", "Allgemeiner App-Link wurde verändert");
          assert(qr.svg.includes("frecka-qr-svg"), "Zentrale SVG-Darstellung fehlt");
        }
      },
      {
        name: "Beleg- und Gutscheinreferenzen erzeugen getrennte QR-Inhalte",
        run: async () => {
          const options = { baseUrl: "https://app.example.invalid/frecka/" };
          const receipt = qrApi.create("receipt", "shared_reference", options);
          const voucher = qrApi.create("voucher", "shared_reference", options);
          assert(receipt.appLink !== voucher.appLink, "Beleg und Gutschein verwenden denselben App-Link");
          assert(JSON.stringify(receipt.matrix) !== JSON.stringify(voucher.matrix), "Beleg und Gutschein erzeugen dieselbe QR-Matrix");
        }
      },
      {
        name: "Ungültige QR-Referenzen und Linktypen liefern klare Fehler",
        run: async () => {
          assertThrows(() => qrApi.create("receipt", ""), "QR_REFERENCE_INVALID", "Leere Referenz");
          assertThrows(() => qrApi.create("mail", "ref-1"), "QR_KIND_INVALID", "Unbekannter QR-Typ");
          assertThrows(() => qrApi.encodeAppLink("javascript:alert(1)"), "QR_APP_LINK_INVALID", "Unsicheres Linkprotokoll");
          assertThrows(() => qrApi.parseAppLink("#/voucher/", "https://app.example.invalid/frecka/"), "QR_REFERENCE_INVALID", "Unvollständiger Gutscheinlink");
        }
      },
      {
        name: "Zentrale Dokumentenengine und produktive PDF-Bibliothek sind geladen",
        run: async () => {
          assert(documentApi && typeof documentApi.createReceiptDocumentModel === "function", "FRECKA_DOCUMENTS wurde nicht geladen");
          assertEqual(documentApi.DOCUMENT_VERSION, "DOCUMENT-001", "Falsche Dokumentenengine-Version");
          assertEqual(typeof documentApi.createVoucherDocumentModel, "function", "Gutscheinprojektion fehlt");
          assertEqual(typeof documentApi.createPdfBytes, "function", "PDF-Erzeugung fehlt");
          assert(globalThis.PDFLib?.PDFDocument, "Lokale PDF-Bibliothek wurde nicht geladen");
        }
      },
      {
        name: "Public-Dokument-, View- und Share-Services sind zentral und versioniert geladen",
        run: async () => {
          assertEqual(publicDocumentApi.PUBLIC_DOCUMENT_VERSION, "QR-002", "Falsche Public-Dokumentversion");
          assertEqual(publicDocumentApi.FORMAT_MARKER, "FPD", "Falsches Public-Formatkennzeichen");
          assertEqual(publicDocumentApi.FORMAT_VERSION, 1, "Falsche Public-Formatversion");
          assertEqual(publicDocumentApi.constants.errorCorrection, "M", "Falsche QR-Fehlerkorrektur");
          assertEqual(publicDocumentApi.constants.maxPositions, 25, "Positionsgrenze ist nicht dokumentiert");
          assertEqual(sharingApi.SHARE_VERSION, "ANDROID-002", "Falsche Share-Service-Version");
          assertEqual(typeof sharingApi.createShareService, "function", "Injizierbarer Share-Service fehlt");
          assertEqual(documentViewApi.DOCUMENT_VIEW_VERSION, "COMM-001", "Gemeinsame Dokumentansicht fehlt");
        }
      },
      {
        name: "Öffentlicher Beleg roundtript ohne lokale ID und mit identischen Centbeträgen",
        run: async () => {
          const source = receiptDocumentFixture({
            internalNote: "Darf nie öffentlich werden",
            customer: { id: "customer-private", name: "Anna Muster", email: "anna@example.invalid", phone: "0123", street: "Altstraße 1", zip: "93047", city: "Regensburg" },
            customerSnapshot: { id: "customer-private", name: "Anna Muster", email: "anna@example.invalid", phone: "0123", street: "Altstraße 1", zip: "93047", city: "Regensburg" }
          });
          const before = clone(source);
          const localModel = documentApi.createReceiptDocumentModel(source, documentOptions());
          const bundle = await publicDocumentApi.createPublicBundle(localModel, { baseUrl: "https://app.example.invalid/frecka/", qrService: qrApi });
          const decoded = await publicDocumentApi.decodePublicLink(bundle.link, { qrService: qrApi });
          assert(bundle.link.includes("#/p/r/1/d/"), "Public-Link nutzt nicht die eigene Fragmentroute");
          assert(!bundle.link.includes("#/receipt/"), "Interner Beleg-Deep-Link wurde öffentlich verwendet");
          assertEqual(decoded.model.totals.grossCents, localModel.totals.grossCents, "Bruttobetrag änderte sich im Transport");
          assertEqual(decoded.model.totals.netCents, localModel.totals.netCents, "Nettobetrag änderte sich im Transport");
          assertEqual(decoded.model.totals.taxCents, localModel.totals.taxCents, "Steuerbetrag änderte sich im Transport");
          assertEqual(decoded.model.customer.name, "Anna Muster", "Sichtbarer Kundenname fehlt");
          assertEqual(decoded.model.serviceLocation, null, "Normaler Public-Beleg enthält einen Leistungsort");
          assertDeepEqual(source, before, "Public-Projektion veränderte den Geschäftsbeleg");
        }
      },
      {
        name: "Public-Payload ist datensparsam und enthält keine Kontakte, Notizen, Historien oder Rohsnapshots",
        run: async () => {
          const source = receiptDocumentFixture({
            id: "receipt-secret-internal-id",
            internalNote: "INTERN-NOTIZ-SECRET",
            activity: [{ label: "HISTORY-SECRET" }],
            companySnapshot: { name: "Studio", owner: "Testperson", phone: "COMPANY-PHONE-SECRET", email: "COMPANY-MAIL-SECRET@example.invalid", website: "https://COMPANY-WEBSITE-SECRET.invalid", logo: { dataUrl: "COMPANY-LOGO-DATA-SECRET" }, street: "Testweg 1", zip: "12345", city: "Teststadt" },
            customerSnapshot: { id: "CUSTOMER-ID-SECRET", name: "Sichtbarer Name", phone: "CUSTOMER-PHONE-SECRET", email: "CUSTOMER-MAIL-SECRET@example.invalid", street: "Sichtweg 1", zip: "12345", city: "Teststadt" }
          });
          const model = documentApi.createReceiptDocumentModel(source, documentOptions());
          const publicModel = { ...model, issuer: { ...model.issuer, taxNumber: "COMPANY-TAX-SECRET", vatId: "COMPANY-VAT-SECRET" } };
          const serialized = JSON.stringify(publicDocumentApi.projectDocument(publicModel));
          ["receipt-secret-internal-id", "INTERN-NOTIZ-SECRET", "HISTORY-SECRET", "COMPANY-PHONE-SECRET", "COMPANY-MAIL-SECRET", "COMPANY-WEBSITE-SECRET", "COMPANY-TAX-SECRET", "COMPANY-VAT-SECRET", "COMPANY-LOGO-DATA-SECRET", "CUSTOMER-ID-SECRET", "CUSTOMER-PHONE-SECRET", "CUSTOMER-MAIL-SECRET", "contextSnapshot", "history", "internalNote"].forEach(secret => {
            assert(!serialized.includes(secret), `Nicht öffentliche Information gelangte in die Payload: ${secret}`);
          });
          const bundle = await publicDocumentApi.createPublicBundle(publicModel, { baseUrl: "https://app.example.invalid/frecka/", qrService: qrApi });
          const decoded = await publicDocumentApi.decodePublicLink(bundle.link, { qrService: qrApi });
          assertEqual(decoded.model.issuer.taxNumber, "", "Öffentlicher Beleg rekonstruierte eine ausgeschlossene Steuernummer");
          assertEqual(decoded.model.issuer.vatId, "", "Öffentlicher Beleg rekonstruierte eine ausgeschlossene USt-IdNr.");
        }
      },
      {
        name: "Öffentlicher Gutschein enthält Einlöseort, aber keine Kunden- oder Verkaufsbelegreferenz",
        run: async () => {
          const voucher = voucherDraftFixture("voucher-public", { displayName: "Für Zoë", currentValue: 35 });
          voucher.customerSnapshot = { id: "customer-secret", name: "Interner Kunde", email: "secret@example.invalid", phone: "0123" };
          voucher.saleReceipt = { id: "receipt-secret", number: "2030-SECRET" };
          const localModel = documentApi.createVoucherDocumentModel(voucher, documentOptions());
          const publicModel = { ...localModel, issuer: { ...localModel.issuer, taxNumber: "TAX-SECRET", vatId: "VAT-SECRET" } };
          const bundle = await publicDocumentApi.createPublicBundle(publicModel, { baseUrl: "https://app.example.invalid/frecka/", qrService: qrApi });
          const decoded = await publicDocumentApi.decodePublicLink(bundle.link, { qrService: qrApi });
          assert(bundle.link.includes("#/p/v/1/d/"), "Gutschein nutzt nicht die Public-Viewer-Route");
          assertEqual(decoded.model.redemptionLocation.name, localModel.redemptionLocation.name, "Einlöseort fehlt");
          assertEqual(decoded.model.customer, null, "Kundenstammdaten gelangten in den Public-Gutschein");
          assertEqual(decoded.model.saleReceipt, null, "Interne Verkaufsbelegreferenz gelangte in den Public-Gutschein");
          const publicProjection = JSON.stringify(publicDocumentApi.projectDocument(publicModel));
          assert(!publicProjection.includes("secret@example.invalid"), "Kunden-E-Mail gelangte in die Gutscheinpayload");
          assert(!publicProjection.includes("TAX-SECRET") && !publicProjection.includes("VAT-SECRET"), "Nicht dargestellte Steuerangaben gelangten in die Gutscheinpayload");
          assertEqual(decoded.model.issuer.taxNumber, "", "Öffentlicher Gutschein rekonstruierte eine nicht dargestellte Steuernummer");
        }
      },
      {
        name: "Kleine, normale, lange und Umlaut-Belege bleiben innerhalb der harten QR-Grenzen",
        run: async () => {
          const cases = [
            ["klein", 1, "Haarschnitt"],
            ["normal", 3, "Pflege & Styling"],
            ["umlaute", 5, "Färben ÄÖÜ ß & Pflege"],
            ["lang", 25, "Ausführliche Leistung"]
          ];
          for (const [label, count, title] of cases) {
            const items = Array.from({ length: count }, (_, index) => ({
              id: `${label}-${index}`, title: `${title} ${index + 1}`, type: "service", quantity: 1,
              originalUnitPrice: 10 + index, unitPrice: 10 + index, total: 10 + index,
              netTotal: 8.4 + index, taxAmount: 1.6, taxRate: 19
            }));
            const total = items.reduce((sum, item) => sum + item.total, 0);
            const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture({ items, originalTotal: total, netTotal: total - 1.6 * count, taxTotal: 1.6 * count, total, taxGroups: [{ rate: 19, net: total - 1.6 * count, tax: 1.6 * count, gross: total }] }), documentOptions());
            const bundle = await publicDocumentApi.createPublicBundle(model, { baseUrl: "https://app.example.invalid/frecka/", qrService: qrApi });
            assert(bundle.urlLength <= publicDocumentApi.constants.maxUrlLength, `${label}: Link ist zu lang`);
            assert(bundle.qrVersion <= publicDocumentApi.constants.maxQrVersion, `${label}: QR ist zu dicht`);
            assertEqual(bundle.qrSize, 17 + bundle.qrVersion * 4, `${label}: Matrix passt nicht zur QR-Version`);
          }
        }
      },
      {
        name: "Public-Link lehnt Übergröße, Beschädigung und unbekannte Version klar ab",
        run: async () => {
          const tooManyItems = Array.from({ length: 26 }, (_, index) => ({ title: `Position ${index + 1}`, quantity: 1, originalUnitPrice: 10, unitPrice: 10, total: 10, netTotal: 8.4, taxAmount: 1.6, taxRate: 19 }));
          const tooLarge = documentApi.createReceiptDocumentModel(receiptDocumentFixture({ items: tooManyItems, total: 260, originalTotal: 260, netTotal: 218.4, taxTotal: 41.6, taxGroups: [{ rate: 19, net: 218.4, tax: 41.6, gross: 260 }] }), documentOptions());
          await assertRejects(() => publicDocumentApi.createPublicBundle(tooLarge, { baseUrl: "https://app.example.invalid/frecka/", qrService: qrApi }), "PUBLIC_DOCUMENT_TOO_LARGE", "26 Positionen");

          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture(), documentOptions());
          const bundle = await publicDocumentApi.createPublicBundle(model, { baseUrl: "https://app.example.invalid/frecka/", qrService: qrApi });
          const damaged = `${bundle.link.slice(0, -1)}${bundle.link.endsWith("A") ? "B" : "A"}`;
          await assertRejects(() => publicDocumentApi.decodePublicLink(damaged, { qrService: qrApi }), "PUBLIC_INTEGRITY_FAILED", "Beschädigte Prüfsumme");
          await assertRejects(() => publicDocumentApi.decodePublicLink(bundle.link.replace("#/p/r/1/", "#/p/r/2/"), { qrService: qrApi }), "PUBLIC_VERSION_UNSUPPORTED", "Unbekannte Formatversion");
          await assertRejectsOneOf(() => publicDocumentApi.decodePublicLink("https://app.example.invalid/frecka/#/p/r/1/d/ungueltig.ungueltig", { qrService: qrApi }), ["PUBLIC_INTEGRITY_INVALID", "PUBLIC_COMPRESSION_FAILED", "PUBLIC_INTEGRITY_FAILED", "PUBLIC_PAYLOAD_INVALID"], "Ungültige Payload");
          await assertRejects(() => publicDocumentApi.decodePublicLink(bundle.link.replace("/#/", "/?tracking=1#/"), { qrService: qrApi }), "PUBLIC_LINK_INVALID", "Nicht kanonische Query");
          await assertRejects(() => publicDocumentApi.decodePublicLink(bundle.link.replace(/\.[A-Za-z0-9_-]{43}$/u, `.${"A".repeat(44)}`), { qrService: qrApi }), "PUBLIC_INTEGRITY_INVALID", "Falsche Digestlänge");
          await assertRejects(() => publicDocumentApi.decodePublicLink(`https://app.example.invalid/${"a".repeat(publicDocumentApi.constants.maxUrlLength)}#/p/r/1/d/a.${"A".repeat(43)}`, { qrService: qrApi }), "PUBLIC_LINK_TOO_LARGE", "Zu langer Eingangslink");
        }
      },
      {
        name: "Public-Dokumentansicht escaped Inhalte und erzeugt ein echtes PDF ohne lokale Datenbank",
        run: async () => {
          const source = receiptDocumentFixture();
          const localModel = documentApi.createReceiptDocumentModel(source, documentOptions());
          const bundle = await publicDocumentApi.createPublicBundle(localModel, { baseUrl: "https://app.example.invalid/frecka/", qrService: qrApi });
          const decoded = await publicDocumentApi.decodePublicLink(bundle.link, { qrService: qrApi });
          const hostile = clone(decoded.model);
          hostile.positions[0].title = '<img src=x onerror="alert(1)">';
          const markup = documentViewApi.renderReceipt(hostile, { interactiveQr: false });
          assert(!markup.includes("<img src=x"), "Public-Viewer gab nicht vertrauenswürdiges HTML aus");
          assert(markup.includes("&lt;img"), "Public-Viewer escaped den Text nicht sichtbar");
          const bytes = await documentApi.createPdfBytes(decoded.model);
          assert(pdfHeader(bytes).startsWith("%PDF-"), "Public-Viewer-Modell erzeugt kein PDF");
          assertEqual(decoded.model.serviceLocation, null, "Public-PDF eines Belegs erhielt einen Leistungsort");
        }
      },
      {
        name: "Share-Service erkennt sichere Kontexte und prüft tatsächliche PDF-Dateien",
        run: async () => {
          const canShareCalls = [];
          const shareCalls = [];
          const service = sharingApi.createShareService({
            navigator: {
              canShare(data) { canShareCalls.push(data); return Array.isArray(data.files); },
              async share(data) { shareCalls.push(data); }
            },
            isSecureContext: true,
            File,
            Blob,
            baseUrl: "https://app.example.invalid/"
          });
          const file = service.createFile(new Blob(["pdf"], { type: "application/pdf" }), { name: "FRECKA-Beleg-Test.pdf", type: "application/pdf", lastModified: 1 });
          assertEqual(file.type, "application/pdf", "PDF-File besitzt falschen MIME-Type");
          assert(service.canShareFiles([file]), "Teilbare Datei wurde abgelehnt");
          assertDeepEqual(Object.keys(canShareCalls[0]), ["files"], "canShare erhielt mehr als die tatsächlichen Dateien");
          const result = await service.shareFiles([file], { title: "Beleg" });
          assertEqual(result.status, "shared", "File-Sharing wurde nicht ausgeführt");
          assertEqual(shareCalls.length, 1, "Share-Dialog wurde mehrfach ausgelöst");
          const insecure = sharingApi.createShareService({ navigator: { share() {}, canShare() { return true; } }, isSecureContext: false, File, Blob });
          assert(!insecure.canShareFiles([file]) && !insecure.canShareUrl("https://app.example.invalid/"), "Unsicherer Kontext wurde als teilbar behandelt");
        }
      },
      {
        name: "Share-Abbruch bleibt Abbruch und löst keinen automatischen Fallback aus",
        run: async () => {
          let downloads = 0;
          const service = sharingApi.createShareService({
            navigator: { canShare: () => true, share: async () => { throw new DOMException("Abgebrochen", "AbortError"); } },
            isSecureContext: true,
            File,
            Blob,
            document: { createElement() { downloads += 1; }, body: { append() {} } },
            urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() {} }
          });
          const file = service.createFile("pdf", { name: "Beleg.pdf", type: "application/pdf" });
          const result = await service.sharePreferred({ files: [file], url: "https://app.example.invalid/#/p/r/1/n/x.y", downloadFile: file });
          assertEqual(result.status, "cancelled", "Share-Abbruch wurde als Erfolg oder Fallback behandelt");
          assertEqual(downloads, 0, "Share-Abbruch löste einen Download aus");
        }
      },
      {
        name: "Share bevorzugt Dateien und nutzt bei vorab fehlender File-Capability genau einen Download",
        run: async () => {
          const shareCalls = [];
          const urlService = sharingApi.createShareService({
            navigator: {
              canShare(data) { return Boolean(data.url); },
              async share(data) { shareCalls.push(data); }
            },
            isSecureContext: true,
            File,
            Blob,
            baseUrl: "https://app.example.invalid/"
          });
          const file = urlService.createFile("pdf", { name: "Beleg.pdf", type: "application/pdf" });
          const publicUrl = "https://app.example.invalid/frecka/#/p/r/1/n/abc.def";
          const unsupported = await urlService.sharePreferred({ files: [file], url: publicUrl });
          assertEqual(unsupported.status, "unsupported", "Fehlendes File-Sharing startete ungefragt einen anderen Share-Pfad");
          assertEqual(shareCalls.length, 0, "Fehlendes File-Sharing löste ungefragt einen Public-Link-Share aus");

          let clicks = 0;
          let revokes = 0;
          const downloadService = sharingApi.createShareService({
            navigator: {},
            isSecureContext: true,
            File,
            Blob,
            document: { createElement() { return { click() { clicks += 1; }, remove() {} }; }, body: { append() {} } },
            urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() { revokes += 1; } },
            setTimeout(callback) { callback(); }
          });
          const downloadFile = downloadService.createFile("pdf", { name: "Beleg.pdf", type: "application/pdf" });
          const downloadResult = await downloadService.sharePreferred({ files: [downloadFile], url: publicUrl, downloadFile });
          assertEqual(downloadResult.status, "downloaded", "Fehlende Web-Share-API fiel nicht auf Download zurück");
          assertEqual(clicks, 1, "Download wurde nicht genau einmal ausgelöst");
          assertEqual(revokes, 1, "Objekt-URL wurde nicht widerrufen");
        }
      },
      {
        name: "Beleg-, Gutschein- und Gutscheinverkaufs-PDF werden als echte Files vorbereitet",
        run: async () => {
          const voucher = voucherDraftFixture("voucher-share-file", { code: "FRKA-SHAR-0001" });
          const voucherSaleReceipt = voucherSaleReceiptFixture(voucher);
          voucherSaleReceipt.number = "2030-000100";
          const models = [
            documentApi.createReceiptDocumentModel(receiptDocumentFixture(), documentOptions()),
            documentApi.createVoucherDocumentModel(voucher, documentOptions()),
            documentApi.createReceiptDocumentModel(voucherSaleReceipt, { ...documentOptions(), linkedVoucher: voucher })
          ];
          const files = [];
          for (const model of models) {
            const blob = await documentApi.createPdfBlob(model);
            files.push(sharingApi.createFile(blob, { name: model.filename, type: "application/pdf" }));
          }
          assert(files.every(file => file instanceof File && file.type === "application/pdf" && file.size > 4000), "Dokumentausgabe erzeugte kein teilbares PDF-File");
          assertEqual(models[2].type, "receipt", "Gutscheinverkaufsbeleg nahm einen Gutschein-Sonderweg");
          assertEqual(models[2].kind.code, "voucher-sale", "Gutscheinverkaufsbeleg verlor seine Belegart");
        }
      },
      {
        name: "ANDROID-002 bietet PDF- und Export-Fallback ausschließlich als explizite Folgeaktion an",
        run: async () => {
          const [appResponse, viewerResponse] = await Promise.all([
            fetch("../js/app.js", { cache: "no-store" }),
            fetch("../js/public-viewer.js", { cache: "no-store" })
          ]);
          assert(appResponse.ok && viewerResponse.ok, "ANDROID-002-Laufzeitquellen konnten nicht geladen werden");
          const source = await appResponse.text();
          const viewer = await viewerResponse.text();
          const documentStart = source.indexOf("async function handleDocumentOutputAction");
          const documentEnd = source.indexOf("function openPendingPdfWindow", documentStart);
          const documentBlock = source.slice(documentStart, documentEnd);
          const exportStart = source.indexOf('if (event.target.closest("[data-export-share-save]"))');
          const exportEnd = source.indexOf('const catalogView = event.target.closest("[data-catalog-manager-view]")', exportStart);
          const exportBlock = source.slice(exportStart, exportEnd);
          assert(documentBlock.includes('action === "save"') && documentBlock.includes("shareService.downloadFallback(file)"), "Explizite PDF-Speichern-Aktion fehlt");
          assert(documentBlock.includes("shareService.shareFiles([file]") && !documentBlock.includes("shareService.sharePreferred"), "PDF-Share besitzt weiterhin einen automatischen zweiten Ausgabepfad");
          assert(documentBlock.includes('result.status === "cancelled"') && documentBlock.includes('result.status === "fallback-required"'), "PDF-UX trennt Abbruch und notwendigen Fallback nicht");
          assert(exportBlock.includes("showExportShareFallback") && exportBlock.includes("data-export-share-save"), "Exportfehler bietet keinen expliziten Speichern-Fallback");
          assert(exportBlock.includes("downloadExportFile(state.exportResult.packageFile)") && exportBlock.includes("return;"), "Erfolgreiches ZIP-Speichern läuft in eine nachgelagerte Fehlermeldung");
          assert(viewer.includes("sharing.shareFiles([file], metadata)") && viewer.includes("Du kannst das PDF stattdessen speichern"), "Public Viewer besitzt keinen neutralen expliziten PDF-Fallback");
        }
      },
      {
        name: "Mehrere ausgewählte Exportdateien werden nur nach exakter canShare-Prüfung gemeinsam geteilt",
        run: async () => {
          const shared = [];
          const service = sharingApi.createShareService({
            navigator: { canShare: data => data.files?.length === 3, share: async data => { shared.push(data); } },
            isSecureContext: true,
            File,
            Blob
          });
          const files = ["Belege.csv", "Belegpositionen.csv", "Export-Info.txt"].map(name => service.createFile("Inhalt", { name, type: name.endsWith(".csv") ? "text/csv" : "text/plain" }));
          assert(service.canShareFiles(files), "Exakte Mehrfachauswahl wurde abgelehnt");
          await service.shareFiles(files, { title: "FRECKA-Export" });
          assertEqual(shared.length, 1, "Mehrfachauswahl wurde in mehrere Share-Aufrufe aufgeteilt");
          assertDeepEqual(shared[0].files.map(file => file.name), ["Belege.csv", "Belegpositionen.csv", "Export-Info.txt"], "Geteilte Dateiauswahl wurde verändert");
          assert(!service.canShareFiles(files.slice(0, 2)), "Nicht unterstützte Dateikombination wurde als teilbar behauptet");
        }
      },
      {
        name: "Belegprojektion ist rein, unveränderlich und snapshotbasiert",
        run: async () => {
          const receipt = receiptDocumentFixture();
          const before = clone(receipt);
          const model = documentApi.createReceiptDocumentModel(receipt, documentOptions());
          assertDeepEqual(receipt, before, "Dokumentprojektion veränderte den Beleg");
          assert(Object.isFrozen(model) && Object.isFrozen(model.positions) && Object.isFrozen(model.qr.matrix), "Dokumentmodell ist veränderbar");
          assertEqual(model.issuer.displayName, "Teststudio Nord", "Unternehmenssnapshot wurde nicht verwendet");
          assertEqual(model.branding.visibleName, "Snapshot Studio", "Branding-Snapshot wurde nicht verwendet");
        }
      },
      {
        name: "Normale Belege enthalten keinen Leistungserbringungsort",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture(), documentOptions());
          assertEqual(model.serviceLocation, null, "Leistungsort gelangte in das Belegdokument");
          assert(!JSON.stringify(model).includes("Hauptstudio"), "Leistungsort wurde an anderer Stelle des Belegmodells ausgegeben");
        }
      },
      {
        name: "Beleg ohne Kunde bleibt ohne leere Kundendarstellung",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture({ customer: null, customerSnapshot: null, customerId: null }), documentOptions());
          assertEqual(model.customer, null, "Leerer Kunde wurde als Dokumentkunde angelegt");
        }
      },
      {
        name: "Beleg mit Kunde übernimmt ausschließlich den Kundensnapshot",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture(), documentOptions());
          assertEqual(model.customer.name, "Anna Muster", "Kundenname fehlt");
          assertEqual(model.customer.street, "Altstraße 1", "Kundenanschrift fehlt");
          assertEqual(model.customer.cityLine, "93047 Regensburg", "Kundenort fehlt");
        }
      },
      {
        name: "Rabattbeleg übernimmt gespeicherte Positions- und Summenwerte",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            items: [{ title: "Waschen & Schneiden", quantity: 1, originalUnitPrice: 50, unitPrice: 45, discountTotal: 5, discountLabel: "Treuerabatt", total: 45, netTotal: 37.82, taxAmount: 7.18, taxRate: 19 }],
            originalTotal: 50, discountTotal: 5, netTotal: 37.82, taxTotal: 7.18, total: 45,
            taxGroups: [{ rate: 19, net: 37.82, tax: 7.18, gross: 45 }]
          }), documentOptions());
          assertEqual(model.positions[0].discountCents, 500, "Positionsrabatt wurde neu oder falsch berechnet");
          assertEqual(model.totals.discountCents, 500, "Gesamtrabatt wurde neu oder falsch berechnet");
          assertEqual(model.totals.grossCents, 4500, "Belegsumme wurde verändert");
        }
      },
      {
        name: "Mehrere Steuersätze bleiben getrennte Dokumentzeilen",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            taxGroups: [{ rate: 19, tax: 6.23, net: 32.77, gross: 39 }, { rate: 7, tax: 0.98, net: 14.02, gross: 15 }],
            netTotal: 46.79, taxTotal: 7.21, total: 54
          }), documentOptions());
          assertEqual(model.taxes.length, 2, "Steuergruppen wurden zusammengeführt");
          assertEqual(model.taxes[0].taxCents, 623, "19-Prozent-Steuerwert wurde verändert");
          assertEqual(model.taxes[1].taxCents, 98, "7-Prozent-Steuerwert wurde verändert");
        }
      },
      {
        name: "Offene Zahlung bleibt fachlich von bezahltem Beleg getrennt",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture({ paymentStatus: "open", paymentMethod: null, payment: null }), documentOptions());
          assertEqual(model.paymentStatus, "open", "Offener Zahlungsstatus ging verloren");
          assertEqual(model.paymentStatusLabel, "Offen", "Offene Zahlung ist falsch beschriftet");
        }
      },
      {
        name: "Gutscheinzahlung und Restzahlung bleiben getrennt im Belegmodell",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            total: 130,
            voucherPayment: { reference: "vch_existing", code: "FRKA-EXST-0001", amount: 100, balanceAfter: 0 },
            remainderPayment: { method: "Bar", amount: 30 },
            paymentMethod: "Gutschein + Bar"
          }), documentOptions());
          assertEqual(model.voucherPayment.amountCents, 10000, "Gutscheinbetrag ist falsch");
          assertEqual(model.remainderPayment.amountCents, 3000, "Restzahlung ist falsch");
          assertEqual(model.remainderPayment.method, "Bar", "Restzahlungsart ist falsch");
        }
      },
      {
        name: "Storno und Gutschrift behalten negative Beträge und Korrekturbezug",
        run: async () => {
          const correction = receiptDocumentFixture({
            id: "receipt-credit-document", number: "2030-000100", type: "credit", status: "credited", reference: "2030-000099",
            brandingSnapshot: { logoMode: "company", visibleName: "", logo: { assetId: "company-logo", source: "company", label: "Unternehmenslogo" } },
            items: [{ title: "Gutschrift Testhaarschnitt", quantity: 1, originalUnitPrice: -39, unitPrice: -39, total: -39, netTotal: -32.77, taxAmount: -6.23, taxRate: 19 }],
            originalTotal: -39, netTotal: -32.77, taxTotal: -6.23, total: -39,
            taxGroups: [{ rate: 19, net: -32.77, tax: -6.23, gross: -39 }]
          });
          const credit = documentApi.createReceiptDocumentModel(correction, documentOptions());
          const cancellation = documentApi.createReceiptDocumentModel({ ...correction, id: "receipt-cancel-document", number: "2030-000101", type: "cancellation", status: "cancelled" }, documentOptions());
          assertEqual(credit.kind.label, "Gutschrift", "Gutschriftbelegart fehlt");
          assertEqual(cancellation.kind.label, "Stornobeleg", "Stornobelegart fehlt");
          assertEqual(credit.totals.grossCents, -3900, "Negativer Korrekturbetrag wurde umgedeutet");
          assertEqual(credit.correctionReference, "2030-000099", "Korrekturbezug fehlt");
          assert((await documentApi.createPdfBytes(credit)).length > 4000, "Gutschrift-PDF mit Logo wurde nicht erzeugt");
          assert((await documentApi.createPdfBytes(cancellation)).length > 4000, "Storno-PDF mit Logo wurde nicht erzeugt");
        }
      },
      {
        name: "Gutscheinverkaufsbeleg bleibt eigener Belegtyp ohne Steuerneuberechnung",
        run: async () => {
          const voucher = voucherDraftFixture("voucher-document-sale", { reference: "vch_document_sale", code: "FRKA-DOCU-0001" });
          const receipt = { ...voucherSaleReceiptFixture(voucher), number: "2030-000102" };
          receipt.brandingSnapshot = { logoMode: "company", visibleName: "", logo: { assetId: "company-logo", source: "company", label: "Unternehmenslogo" } };
          const model = documentApi.createReceiptDocumentModel(receipt, { ...documentOptions(), linkedVoucher: voucher });
          assertEqual(model.kind.code, "voucher-sale", "Gutscheinverkauf wurde normalem Beleg gleichgesetzt");
          assertEqual(model.taxes.length, 0, "Gutscheinverkauf erhielt erfundene Steuerzeilen");
          assertEqual(model.linkedVoucher.code, "FRKA-DOCU-0001", "Verknüpfter Gutscheincode fehlt");
          assert((await documentApi.createPdfBytes(model)).length > 4000, "Gutscheinverkaufsbeleg-PDF mit Logo wurde nicht erzeugt");
        }
      },
      {
        name: "Gutscheindokument enthält Aussteller, Einlöseort und unveränderliche Werte",
        run: async () => {
          const voucher = voucherDraftFixture("voucher-document");
          const model = documentApi.createVoucherDocumentModel(voucher, documentOptions());
          assertEqual(model.issuer.displayName, "Teststudio Nord", "Gutscheinaussteller fehlt");
          assertEqual(model.redemptionLocation.name, "Hauptstudio", "Einlöseort fehlt");
          assertEqual(model.issuedValueCents, 10000, "Ursprungswert ist falsch");
          assertEqual(model.currentValueCents, 10000, "Restwert ist falsch");
          assertEqual(model.saleReceipt.number, "", "Verkaufsbeleg wurde erfunden");
        }
      },
      {
        name: "Teil- und Volleinlösung erscheinen korrekt im Gutscheindokument",
        run: async () => {
          const partial = documentApi.createVoucherDocumentModel(voucherDraftFixture("voucher-partial-document", { currentValue: 35 }), documentOptions());
          const redeemed = documentApi.createVoucherDocumentModel(voucherDraftFixture("voucher-redeemed-document", { currentValue: 0 }), documentOptions());
          assertEqual(partial.statusLabel, "Teilweise eingelöst", "Teilstatus fehlt");
          assertEqual(partial.currentValueCents, 3500, "Teilrestwert ist falsch");
          assertEqual(redeemed.statusLabel, "Vollständig eingelöst", "Vollstatus fehlt");
          assertEqual(redeemed.currentValueCents, 0, "Voll eingelöster Gutschein hat Restwert");
        }
      },
      {
        name: "Bildschirmmodell und PDF verwenden exakt denselben Beleg-QR-Link",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture(), documentOptions());
          assertEqual(model.qr.appLink, qrApi.buildAppLink("receipt", model.id, documentOptions().baseUrl), "Beleg-QR-Link weicht vom QR-Service ab");
          assertDeepEqual(model.qr.matrix, qrApi.create("receipt", model.id, { baseUrl: documentOptions().baseUrl }).matrix, "Beleg-QR-Matrix weicht vom QR-Service ab");
        }
      },
      {
        name: "Bildschirmmodell und PDF verwenden exakt denselben Gutschein-QR-Link",
        run: async () => {
          const model = documentApi.createVoucherDocumentModel(voucherDraftFixture("voucher-qr-document"), documentOptions());
          assertEqual(model.qr.appLink, qrApi.buildAppLink("voucher", model.reference, documentOptions().baseUrl), "Gutschein-QR-Link weicht vom QR-Service ab");
          assertDeepEqual(model.qr.matrix, qrApi.create("voucher", model.reference, { baseUrl: documentOptions().baseUrl }).matrix, "Gutschein-QR-Matrix weicht vom QR-Service ab");
        }
      },
      {
        name: "Dokumentdatum ist deutsch und enthält keinen ISO-Zeitstempel",
        run: async () => {
          const receipt = documentApi.createReceiptDocumentModel(receiptDocumentFixture({ date: "", time: "", completedAt: "2030-01-05T12:34:56.789Z" }), documentOptions());
          const voucher = documentApi.createVoucherDocumentModel(voucherDraftFixture("voucher-date-document", { soldAt: "", soldTime: "", soldAtIso: "2030-01-05T12:34:56.789Z" }), documentOptions());
          [receipt.dateTime, voucher.soldAt].forEach(value => {
            assert(/^\d{2}\.\d{2}\.\d{4} • \d{2}:\d{2}$/u.test(value), `Deutsches Dokumentdatum fehlt: ${value}`);
            assert(!/T|Z$|\d{2}:\d{2}:\d{2}|\.\d{3}(?:Z|$)/u.test(value), `ISO-Bestandteil sichtbar: ${value}`);
          });
        }
      },
      {
        name: "Unternehmerdarstellung und Branding-Priorität werden im Modell vereinheitlicht",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            companySnapshot: { name: "", owner: "Alex Beispiel", street: "Testweg 1", zip: "12345", city: "Teststadt" },
            brandingSnapshot: { logoMode: "custom", visibleName: "Salon Licht", logo: { assetId: "business-logo-hair", source: "business-area", label: "Bereichslogo", simulated: false } }
          }), documentOptions());
          assertEqual(model.issuer.name, "", "Leere Geschäftsbezeichnung wurde ausgegeben");
          assertEqual(model.issuer.owner, "Alex Beispiel", "Pflichtangabe Unternehmer fehlt");
          assertEqual(model.branding.visibleName, "Salon Licht", "Sichtbare Geschäftsbezeichnung fehlt");
          assertEqual(model.branding.logo.initials, "GB", "Geschäftsbereichslogo verlor seine Priorität");
          assertEqual(model.branding.logo.image?.mimeType, "image/jpeg", "Geschäftsbereichslogo wurde nicht aus dem Asset-Register aufgelöst");
          const companyFallback = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            brandingSnapshot: { logoMode: "company", visibleName: "Salon Licht", logo: { assetId: "company-logo", source: "company", label: "Unternehmenslogo", simulated: false } }
          }), documentOptions());
          assertEqual(companyFallback.branding.logo.initials, "UN", "Fallback auf das Unternehmenslogo fehlt");
          assertEqual(companyFallback.branding.logo.image?.mimeType, "image/png", "Unternehmenslogo wurde nicht aus dem Asset-Register aufgelöst");
          const withoutLogo = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            brandingSnapshot: { logoMode: "none", visibleName: "Salon Licht", logo: { assetId: "stale-logo", source: "business-area" } }
          }), documentOptions());
          assertEqual(withoutLogo.branding.logo, null, "Logo-Modus ‚kein Logo‘ ließ ein altes Logo sichtbar");
          const missingAsset = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            brandingSnapshot: { logoMode: "custom", visibleName: "Salon Licht", logo: { assetId: "missing-logo", source: "business-area", label: "Bereichslogo" } }
          }), documentOptions());
          assertEqual(missingAsset.branding.logo.image, null, "Fehlendes Logoasset wurde als Bild ausgegeben");
          assert(!documentViewApi.renderReceipt(missingAsset, { interactiveQr: false }).includes("<img"), "Fehlendes Logoasset erzeugt ein defektes Bild in der internen Ansicht");
          assert(documentViewApi.renderReceipt(model, { interactiveQr: false }).includes("<img"), "Aufgelöstes Logo fehlt in der internen Dokumentansicht");
        }
      },
      {
        name: "Beleg-PDF wird lokal als echtes PDF mit Metadaten erzeugt",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture(), documentOptions());
          const bytes = await documentApi.createPdfBytes(model);
          assert(pdfHeader(bytes).startsWith("%PDF-"), "Belegausgabe ist kein PDF");
          assert(bytes.length > 4000, "Beleg-PDF ist unerwartet klein");
          const parsed = await globalThis.PDFLib.PDFDocument.load(bytes);
          assertEqual(parsed.getTitle(), `FRECKA Beleg ${model.number}`, "PDF-Titel ist falsch");
          assertEqual(parsed.getPageCount(), 1, "Normaler Beleg wurde unnötig auf mehrere Seiten verteilt");
        }
      },
      {
        name: "PNG- und JPEG-Logoassets erscheinen proportional in interner Ansicht und PDF",
        run: async () => {
          const documentsResponse = await fetch("../js/documents.js", { cache: "no-store" });
          const documentsSource = await documentsResponse.text();
          const imageCount = pdf => [...pdf.context.enumerateIndirectObjects()].filter(([, object]) => (
            (object?.dict?.get?.(globalThis.PDFLib.PDFName.of("Subtype"))
              || object?.get?.(globalThis.PDFLib.PDFName.of("Subtype")))?.toString() === "/Image"
          )).length;
          const receipt = receiptDocumentFixture({
            brandingSnapshot: { logoMode: "company", visibleName: "", logo: { assetId: "company-logo", source: "company", label: "Unternehmenslogo" } }
          });
          const receiptModel = documentApi.createReceiptDocumentModel(receipt, documentOptions());
          const receiptMarkup = documentViewApi.renderReceipt(receiptModel, { interactiveQr: false });
          assert(receiptMarkup.includes(`src="data:image/png;base64,`), "PNG fehlt in der internen Belegansicht");
          assert(receiptMarkup.includes("document-brand-logo has-image"), "Echtes Bildlogo besitzt keine gezielte Layout-Kennzeichnung");
          const receiptPdf = await globalThis.PDFLib.PDFDocument.load(await documentApi.createPdfBytes(receiptModel));
          assert(imageCount(receiptPdf) > 0, "PNG wurde nicht in das Beleg-PDF eingebettet");

          const voucher = voucherDraftFixture("voucher-logo-pdf");
          voucher.contextSnapshot.branding = { logoMode: "custom", visibleName: "", logo: { assetId: "business-logo-hair", source: "business-area", label: "Geschäftsbereichslogo" } };
          const voucherModel = documentApi.createVoucherDocumentModel(voucher, documentOptions());
          const voucherMarkup = documentViewApi.renderVoucher(voucherModel, { interactiveQr: false });
          assert(voucherMarkup.includes(`src="data:image/jpeg;base64,`), "JPEG fehlt in der internen Gutscheinansicht");
          const voucherPdf = await globalThis.PDFLib.PDFDocument.load(await documentApi.createPdfBytes(voucherModel));
          assert(imageCount(voucherPdf) > 0, "JPEG wurde nicht in das Gutschein-PDF eingebettet");

          const measureImageLogoLayout = (markup, width) => new Promise((resolve, reject) => {
            const frame = document.createElement("iframe");
            const timeout = window.setTimeout(() => {
              frame.remove();
              reject(new Error(`Dokumentansicht wurde bei ${width} px nicht rechtzeitig gerendert`));
            }, 8000);
            frame.title = `Dokument mit Bildlogo bei ${width} Pixel`;
            frame.style.cssText = `position:fixed;left:-2000px;top:0;width:${width}px;height:900px;border:0;`;
            frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="../styles.css"><style>body{margin:0;padding:8px;background:#eef3f1}</style></head><body>${markup}</body></html>`;
            frame.addEventListener("load", () => window.requestAnimationFrame(() => {
              try {
                const contentDocument = frame.contentDocument;
                const documentElement = contentDocument.documentElement;
                const logo = contentDocument.querySelector(".document-brand-logo.has-image");
                const following = logo?.nextElementSibling;
                if (!logo || !following) throw new Error("Bildlogo oder Folgeblock fehlt");
                const gap = following.getBoundingClientRect().top - logo.getBoundingClientRect().bottom;
                const result = {
                  viewportWidth: frame.contentWindow.innerWidth,
                  scrollWidth: documentElement.scrollWidth,
                  clientWidth: documentElement.clientWidth,
                  marginBottom: Number.parseFloat(frame.contentWindow.getComputedStyle(logo).marginBottom),
                  gap
                };
                window.clearTimeout(timeout);
                frame.remove();
                resolve(result);
              } catch (error) {
                window.clearTimeout(timeout);
                frame.remove();
                reject(error);
              }
            }), { once: true });
            document.body.append(frame);
          });
          for (const width of [320, 390]) {
            for (const markup of [receiptMarkup, voucherMarkup]) {
              const layout = await measureImageLogoLayout(markup, width);
              assertEqual(layout.viewportWidth, width, `Falscher Dokument-Viewport bei ${width} px`);
              assert(layout.scrollWidth <= layout.clientWidth, `Dokument erzeugt horizontalen Überlauf bei ${width} px`);
              assertEqual(layout.marginBottom, 10, `Bildlogo-Abstand ist bei ${width} px nicht gezielt gesetzt`);
              assert(layout.gap >= 10 && layout.gap <= 20, `Optischer Bildlogo-Abstand ist bei ${width} px nicht klein und sichtbar: ${layout.gap}px`);
            }
          }

          const textFallback = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            brandingSnapshot: { logoMode: "company", visibleName: "", logo: { assetId: "missing-logo", source: "company", label: "Unternehmenslogo" } }
          }), documentOptions());
          const textFallbackMarkup = documentViewApi.renderReceipt(textFallback, { interactiveQr: false });
          assert(textFallbackMarkup.includes("document-brand-logo") && !textFallbackMarkup.includes("document-brand-logo has-image"), "Textfallback erhielt fälschlich den Bildlogo-Abstand");
          const textFallbackPdf = await globalThis.PDFLib.PDFDocument.load(await documentApi.createPdfBytes(textFallback));
          assertEqual(imageCount(textFallbackPdf), 0, "Textfallback erzeugte fälschlich ein PDF-Bildlogo");
          assertEqual(textFallbackPdf.getPageCount(), 1, "Textfallback destabilisiert den PDF-Seitenumbruch");
          const noLogo = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            brandingSnapshot: { logoMode: "none", visibleName: "", logo: null }
          }), documentOptions());
          assert(!documentViewApi.renderReceipt(noLogo, { interactiveQr: false }).includes("document-brand-logo"), "Kein-Logo-Modus erhielt fälschlich einen Logoabstand");
          const noLogoPdf = await globalThis.PDFLib.PDFDocument.load(await documentApi.createPdfBytes(noLogo));
          assertEqual(imageCount(noLogoPdf), 0, "Kein-Logo-Modus erzeugte fälschlich ein PDF-Bildlogo");
          assertEqual(noLogoPdf.getPageCount(), 1, "Kein-Logo-Modus destabilisiert den PDF-Seitenumbruch");
          assert(documentsSource.includes("return y - height - PDF_IMAGE_LOGO_TEXT_GAP") && documentsSource.includes("const PDF_IMAGE_LOGO_TEXT_GAP = 14"), "PDF-Bildlogo-Abstand verwendet nicht die tatsächliche Bildunterkante");
          assert(documentsSource.includes("return y - maxHeight - 8"), "PDF-Textfallback wurde unerwartet verändert");

          const wide = documentApi.fitLogoDimensions(1200, 300, 124, 46);
          const tall = documentApi.fitLogoDimensions(200, 900, 124, 46);
          assert(Math.abs(wide.width / wide.height - 4) < 0.0001, "Breites Logo wurde verzerrt");
          assert(Math.abs(tall.width / tall.height - (200 / 900)) < 0.0001, "Hohes Logo wurde verzerrt");
          assert(wide.width <= 124 && wide.height <= 46 && tall.width <= 124 && tall.height <= 46, "Logo überschreitet den definierten PDF-Headerbereich");
        }
      },
      {
        name: "Gutschein-PDF wird lokal als echtes PDF mit stabiler Dateibenennung erzeugt",
        run: async () => {
          const model = documentApi.createVoucherDocumentModel(voucherDraftFixture("voucher-pdf-document", { code: "FRKA-ÄNNE-0001" }), documentOptions());
          const bytes = await documentApi.createPdfBytes(model);
          assert(pdfHeader(bytes).startsWith("%PDF-"), "Gutscheinausgabe ist kein PDF");
          assertEqual(model.filename, "FRECKA-Gutschein-FRKA-ANNE-0001.pdf", "Gutschein-Dateiname ist nicht stabil oder dateisystemsicher");
          const parsed = await globalThis.PDFLib.PDFDocument.load(bytes);
          assertEqual(parsed.getPageCount(), 1, "Gutschein-PDF passt nicht auf eine Seite");
        }
      },
      {
        name: "Langer Beleg wird vollständig auf mehrere schmale Seiten umgebrochen",
        run: async () => {
          const items = Array.from({ length: 35 }, (_, index) => ({
            id: `long-${index}`, title: `Ausführliche Leistung mit Umlaut ÄÖÜ Nummer ${index + 1}`, quantity: 1,
            originalUnitPrice: 10, unitPrice: 10, total: 10, netTotal: 8.4, taxAmount: 1.6, taxRate: 19
          }));
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            items,
            total: 350,
            originalTotal: 350,
            netTotal: 294,
            taxTotal: 56,
            taxGroups: [{ rate: 19, net: 294, tax: 56, gross: 350 }],
            brandingSnapshot: { logoMode: "company", visibleName: "Sehr lange sichtbare Geschäftsbezeichnung für den mehrseitigen Dokumenttest", logo: { assetId: "company-logo", source: "company", label: "Unternehmenslogo" } }
          }), documentOptions());
          const bytes = await documentApi.createPdfBytes(model);
          const parsed = await globalThis.PDFLib.PDFDocument.load(bytes);
          assert(parsed.getPageCount() > 1, "Langer Beleg wurde abgeschnitten statt umgebrochen");
        }
      },
      {
        name: "PDF-Blob trägt den korrekten Dateityp und enthält keine persistierten Bilddaten",
        run: async () => {
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture(), documentOptions());
          const blob = await documentApi.createPdfBlob(model);
          assertEqual(blob.type, "application/pdf", "PDF-Blob besitzt falschen MIME-Type");
          assert(blob.size > 4000, "PDF-Blob ist leer");
          assert(!["png", "dataUrl", "qrImage"].some(key => Object.prototype.hasOwnProperty.call(model.qr, key)), "QR-Bilddaten gelangten ins Dokumentmodell");
        }
      },
      {
        name: "Ungültige Dokumentdaten liefern klare Fehler statt leerer PDFs",
        run: async () => {
          assertThrows(() => documentApi.createReceiptDocumentModel({}, documentOptions()), "DOCUMENT_RECEIPT_INVALID", "Beleg ohne Referenz");
          assertThrows(() => documentApi.createVoucherDocumentModel({ reference: "vch_invalid", code: "FRKA-TEST", issuedValue: 50, currentValue: 60, contextSnapshot: { company: { owner: "Test" } } }, documentOptions()), "DOCUMENT_VOUCHER_VALUE_INVALID", "Ungültiger Gutscheinwert");
          assertThrows(() => documentApi.createVoucherDocumentModel({ reference: "vch_without_location", code: "FRKA-ORT-0001", issuedValue: 50, currentValue: 50, contextSnapshot: { company: { owner: "Test" } } }, documentOptions()), "DOCUMENT_LOCATION_INVALID", "Gutschein ohne Einlöseort");
          await assertRejects(() => documentApi.createPdfBytes({ documentVersion: "falsch", type: "receipt" }), "DOCUMENT_MODEL_VERSION_INVALID", "Falsche Dokumentversion");
        }
      },
      {
        name: "Bereits projizierte Dokumente ändern sich nicht durch spätere Stammdatenänderungen",
        run: async () => {
          const receipt = receiptDocumentFixture();
          const model = documentApi.createReceiptDocumentModel(receipt, documentOptions());
          receipt.companySnapshot.name = "Nachträglich geändert";
          receipt.customerSnapshot.name = "Andere Person";
          receipt.serviceLocationSnapshot.name = "Anderer Ort";
          receipt.brandingSnapshot = { logoMode: "company", logo: { assetId: "new-logo", source: "company" } };
          assertEqual(model.issuer.displayName, "Teststudio Nord", "Dokumentmodell änderte den Aussteller rückwirkend");
          assertEqual(model.customer.name, "Anna Muster", "Dokumentmodell änderte den Kunden rückwirkend");
          assert(!JSON.stringify(model).includes("Anderer Ort"), "Dokumentmodell änderte den Leistungsort rückwirkend");
          assert(!JSON.stringify(model).includes("new-logo"), "Dokumentmodell änderte das Logo rückwirkend");
        }
      },
      {
        name: "Historische Belege behalten ihre Logo-Version nach Ersetzen und Entfernen",
        run: async () => {
          const logoV1 = logoAssetFixture();
          const logoV2Source = companyLogoFixture({
            id: "company-logo-v2",
            name: "Unternehmenslogo-v2.png",
            size: atob(alternatePngBase64).length,
            dataUrl: `data:image/png;base64,${alternatePngBase64}`,
            updatedAt: "2030-02-01T10:00:00.000Z"
          });
          const assets = [logoV1, logoAssetFixture(logoV2Source)];
          const options = documentOptions(assets);
          const receiptA = receiptDocumentFixture({
            id: "receipt-logo-history-a",
            number: "2030-000201",
            brandingSnapshot: { logoMode: "company", logo: { assetId: "company-logo", source: "company", label: "Unternehmenslogo" } }
          });
          const modelA = documentApi.createReceiptDocumentModel(receiptA, options);
          const receiptB = receiptDocumentFixture({
            id: "receipt-logo-history-b",
            number: "2030-000202",
            brandingSnapshot: { logoMode: "company", logo: { assetId: "company-logo-v2", source: "company", label: "Unternehmenslogo" } }
          });
          const modelB = documentApi.createReceiptDocumentModel(receiptB, options);
          assertEqual(modelA.branding.logo.image.dataUrl, logoV1.dataUrl, "Beleg A verlor Logo-Version 1 nach dem Ersetzen");
          assertEqual(modelB.branding.logo.image.dataUrl, logoV2Source.dataUrl, "Beleg B erhielt nicht Logo-Version 2");
          assert(modelA.branding.logo.image.dataUrl !== modelB.branding.logo.image.dataUrl, "Zwei Belegversionen zeigen dasselbe Logoasset");

          const afterActiveRemoval = documentApi.createReceiptDocumentModel(receiptA, options);
          const fallbackReceipt = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            id: "receipt-logo-history-c",
            number: "2030-000203",
            brandingSnapshot: { logoMode: "company", logo: null }
          }), options);
          assertEqual(afterActiveRemoval.branding.logo.image.dataUrl, logoV1.dataUrl, "Entfernen der aktiven Zuordnung änderte Beleg A");
          assertEqual(fallbackReceipt.branding.logo, null, "Neuer Beleg nach Logoentfernung erhielt ein historisches Asset");
        }
      },
      {
        name: "Unternehmensdarstellung trennt optionale Geschäftsbezeichnung und verpflichtenden Unternehmer",
        run: async () => {
          assertEqual(typeof api.companyIdentity, "function", "Zentrale Unternehmensdarstellung fehlt");
          assertDeepEqual(api.companyIdentity({ name: "Studio Nord", owner: "Alex Beispiel" }), {
            name: "Studio Nord", owner: "Alex Beispiel", displayName: "Studio Nord"
          }, "Geschäftsbezeichnung und Unternehmer wurden nicht getrennt");
          assertDeepEqual(api.companyIdentity({ name: "", owner: "Alex Beispiel" }), {
            name: "", owner: "Alex Beispiel", displayName: "Alex Beispiel"
          }, "Unternehmer ohne Geschäftsbezeichnung wird nicht allein dargestellt");
          assertDeepEqual(api.companyIdentity({ name: "Alex Beispiel", owner: "alex beispiel" }), {
            name: "", owner: "alex beispiel", displayName: "alex beispiel"
          }, "Doppelte Unternehmensdarstellung wurde nicht entfernt");
        }
      },
      {
        name: "Settings-Snapshot erlaubt leere Geschäftsbezeichnung und repariert fehlenden Unternehmer",
        run: async () => {
          const runtime = runtimeFixture();
          runtime.company.name = "";
          runtime.company.owner = "Solo Unternehmerin";
          const snapshot = api.snapshotSettings(runtime, "started", "test-company-identity");
          assertEqual(snapshot.company.name, "", "Optionale Geschäftsbezeichnung wurde künstlich befüllt");
          assertEqual(snapshot.company.owner, "Solo Unternehmerin", "Verpflichtender Unternehmer fehlt im Snapshot");

          const defaults = recordFixture("test-company-legacy");
          const legacy = clone(defaults);
          legacy.company.name = "Legacy Unternehmer";
          legacy.company.owner = "";
          const normalized = api.normalizeSettingsRecord(legacy, defaults, "test-company-legacy");
          assertEqual(normalized.record.company.name, "", "Legacy-Name wurde doppelt als Geschäftsbezeichnung behalten");
          assertEqual(normalized.record.company.owner, "Legacy Unternehmer", "Fehlender Legacy-Unternehmer wurde nicht sicher übernommen");
          assert(normalized.repairs.includes("COMPANY_OWNER_REPAIRED"), "Migration des verpflichtenden Unternehmers wurde nicht ausgewiesen");

          const legacyReceipt = receiptDraftFixture("receipt-company-legacy", {
            number: "2030-009999",
            companySnapshot: { name: "Historischer Unternehmer", street: "Altweg 1", zip: "12345", city: "Altstadt" }
          });
          const receiptSnapshot = api.snapshotReceipts({ receipts: [legacyReceipt] }, "test-company-legacy").receipts[0].companySnapshot;
          assertEqual(receiptSnapshot.name, "", "Legacy-Belegsnapshot zeigt den Unternehmer doppelt");
          assertEqual(receiptSnapshot.owner, "Historischer Unternehmer", "Legacy-Belegsnapshot verlor den Unternehmer");
        }
      },
      {
        name: "SETTINGS-001 nutzt eine zentrale Unternehmensseite mit validiertem lokalen Logo",
        run: async () => {
          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für SETTINGS-001 konnte nicht geladen werden");
          const source = await response.text();
          const renderStart = source.indexOf("function renderCompanySettings()");
          const renderEnd = source.indexOf("function renderServiceLocationSettings()", renderStart);
          const applyStart = source.indexOf("function normalizeCompanyWebsite(value)");
          const applyEnd = source.indexOf("function applyServiceLocationForm", applyStart);
          const snapshotStart = source.indexOf("function companyContextSnapshot()");
          const snapshotEnd = source.indexOf("function serviceLocationAvailable", snapshotStart);
          const logoStart = source.indexOf("function companyLogoCardMarkup()");
          const logoEnd = source.indexOf("function showCompanySettingsNotice", logoStart);
          const renderSource = source.slice(renderStart, renderEnd);
          const applySource = source.slice(applyStart, applyEnd);
          const snapshotSource = source.slice(snapshotStart, snapshotEnd);
          const logoSource = source.slice(logoStart, logoEnd);
          assert(source.includes('{ id: "settings-company", icon: "▣", title: "Unternehmen"'), "Einstellungsbereich Unternehmen fehlt");
          ["name", "owner", "contactPerson", "street", "houseNumber", "zip", "city", "country", "phone", "email", "website", "taxNumber", "vatId"].forEach(field => {
            assert(renderSource.includes(`name="${field}"`), `Unternehmensfeld fehlt: ${field}`);
          });
          assert(renderSource.includes("Geschäftsbezeichnung (Firmenname)") && renderSource.includes("Unternehmer/in"), "Geschäftsbezeichnung und rechtliche Person sind nicht getrennt");
          assert(renderSource.includes("Bestehende kombinierte Straßenangabe erkannt"), "Verlustfreie Legacy-Adressbehandlung ist nicht erklärt");
          assert(applySource.includes("legacyCombinedStreetUnchanged"), "Historische kombinierte Straße wird nicht geschützt");
          assert(applySource.includes("new URL(") && applySource.includes("https://${submitted}"), "Website wird nicht zentral normalisiert");
          assert(applySource.includes("candidate.email") && applySource.includes("gültige E-Mail-Adresse"), "E-Mail-Validierung fehlt");
          assert(applySource.includes("if (!changed)") && applySource.includes("updatedAt: new Date().toISOString()"), "company.updatedAt ist nicht an tatsächliche Änderungen gebunden");
          assert(logoSource.includes('accept="image/png,image/jpeg,.png,.jpg,.jpeg"'), "Logoauswahl ist nicht auf PNG/JPEG begrenzt");
          assert(!logoSource.includes(".svg") && !logoSource.includes("image/svg"), "Logoauswahl lässt SVG zu");
          assert(source.includes("companyLogoMaxBytes || 1024 * 1024"), "1-MB-Grenze des Logos fehlt");
          assert(logoSource.includes("data-company-logo-select") && source.includes("selectButton?.addEventListener(\"click\", () => input?.click())"), "iOS-robuste explizite Logoauswahl fehlt");
          assert(source.includes("await persistCurrentSettings()") && source.includes("async function saveCompanyLogo"), "Logo verwendet nicht den zentralen Settings-Writer");
          assert(source.includes("persistence.registerLogoAsset(data.logoAssets, nextLogo)"), "Logo wird nicht über das zentrale Asset-Register versioniert");
          assert(source.includes("persistence?.resolveLogoAsset?.(assetId, data.logoAssets)"), "Zentraler Logoasset-Resolver fehlt in der App");
          assert(!snapshotSource.includes("dataUrl"), "Echte Logo-Bilddaten werden in Geschäftsvorgang-Snapshots kopiert");
          assert(source.includes("company: { ...data.company, street: companyStreetLine(data.company)"), "PDF-/Beleg-Fallback kombiniert getrennte Adressfelder nicht verlustfrei");
          assert(source.includes("async function saveBusinessAreaLogo") && source.includes("data-business-logo-input"), "Persistenter Geschäftsbereichslogo-Upload fehlt");
          assert(!source.includes("business-logo-simulation"), "Alte Geschäftsbereichslogo-Simulation ist noch aktiv");
        }
      },
      {
        name: "SETTINGS-002 bündelt bestehende betriebliche Vorgaben ohne Parallelmodell",
        run: async () => {
          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für SETTINGS-002 konnte nicht geladen werden");
          const source = await response.text();
          const menuStart = source.indexOf("const settingsSections = [");
          const menuEnd = source.indexOf("const setupSteps", menuStart);
          const renderStart = source.indexOf("function renderOperatingSettings()");
          const renderEnd = source.indexOf("function renderBusinessAreaSettings()", renderStart);
          const submitStart = source.indexOf('const operatingSettingsForm = event.target.closest("#operatingSettingsForm")');
          const submitEnd = source.indexOf('const businessAreaSettingsForm = event.target.closest("#businessAreaSettingsForm")', submitStart);
          const setupStart = source.indexOf("function setupStepContent()");
          const setupEnd = source.indexOf("function attachSetupStepBehavior()", setupStart);
          const menuSource = source.slice(menuStart, menuEnd);
          const renderSource = source.slice(renderStart, renderEnd);
          const submitSource = source.slice(submitStart, submitEnd);
          const setupSource = source.slice(setupStart, setupEnd);
          assert(menuSource.includes('{ id: "settings-operations", icon: "%", title: "Betrieb"'), "Einstellungsbereich Betrieb fehlt");
          assert(!menuSource.includes('{ id: "settings-taxes"') && !menuSource.includes('{ id: "settings-payments"'), "Alte parallele Menüeinträge blieben sichtbar");
          assert(renderSource.includes('id="operatingSettingsForm"'), "Zentrales Betriebsformular fehlt");
          ["taxStatus", "activeTaxRate", "defaultTaxRate", "defaultBusinessArea", "footerText", "thankYouText"].forEach(field => {
            assert(renderSource.includes(`name="${field}"`), `Betriebliche Einstellung fehlt: ${field}`);
          });
          assert(renderSource.includes("Währung</span><strong>EUR") && !renderSource.includes('name="currency"'), "EUR ist nicht eindeutig schreibgeschützt");
          assert(renderSource.includes("data-payment-toggle") && renderSource.includes("data-payment-move"), "Bestehende Zahlungsartensteuerung wurde nicht wiederverwendet");
          assert(!renderSource.includes('name="yearPrefix"') && !renderSource.includes('name="nextNumber"'), "Produktiver Nummernkreis ist weiterhin frei bearbeitbar");
          assert(renderSource.includes("ST-${escapeHtml(receiptSettings.yearPrefix)}-000101") && renderSource.includes("GS-${escapeHtml(receiptSettings.yearPrefix)}-000101"), "Getrennte Nummernkreise werden nicht ausgewiesen");
          assert(!setupSource.includes('name="yearPrefix"') && !setupSource.includes('name="nextNumber"'), "Erneut gestarteter Assistent umgeht den Nummernkreisschutz");
          assert(!submitSource.includes("receiptSettings.nextNumber") && !submitSource.includes("receiptCounter"), "Betriebsformular verändert den Nummernstand");
          assert(submitSource.includes("data.businessAreas.forEach(area => { area.isDefault = area.id === defaultAreaId; })"), "Bestehendes Standardbereichsmodell wird nicht verwendet");
        }
      },
      {
        name: "TSE-002 speichert nur die deaktivierte fiskaly-Vorbereitung und hält Belege frei von TSE-Platzhaltern",
        run: async () => {
          const tenantId = "test-tse-settings";
          const settings = recordFixture(tenantId, "completed");
          assertDeepEqual(settings.tseSettings, {
            formatVersion: 1,
            provider: "fiskaly SIGN DE",
            enabled: false,
            setupStatus: "not-configured",
            connectionStatus: "not-connected"
          }, "Sichere TSE-Standardvorbereitung ist nicht eindeutig");
          assertDeepEqual(
            Object.keys(settings.tseSettings).sort(),
            ["formatVersion", "provider", "enabled", "setupStatus", "connectionStatus"].sort(),
            "TSE-Vorbereitung besitzt unerwartete Felder"
          );

          const legacy = clone(settings);
          delete legacy.tseSettings;
          const normalizedLegacy = api.normalizeSettingsRecord(legacy, settings, tenantId);
          assert(normalizedLegacy.repairs.includes("TSE_SETTINGS_DEFAULTED"), "Historische Settings weisen die sichere TSE-Ergänzung nicht aus");
          assertDeepEqual(normalizedLegacy.record.tseSettings, settings.tseSettings, "Historische Settings erhielten nicht den deaktivierten Standard");

          const unsafe = clone(settings);
          unsafe.tseSettings.apiKey = "secret-api-key";
          const normalizedUnsafe = api.normalizeSettingsRecord(unsafe, settings, tenantId);
          assert(normalizedUnsafe.repairs.includes("TSE_SETTINGS_REPAIRED"), "Nicht erlaubtes TSE-Feld wurde nicht ausgewiesen");
          assert(!hasOwn(normalizedUnsafe.record.tseSettings, "apiKey"), "TSE-Zugangsdaten wurden im Settings-Modell behalten");
          const future = clone(settings);
          future.tseSettings.formatVersion = 2;
          assertThrows(() => api.normalizeSettingsRecord(future, settings, tenantId), "UNSUPPORTED_FORMAT", "Künftige TSE-Einstellungen");

          const receipt = receiptDraftFixture("receipt-tse-guard", {
            number: "2030-000999",
            tse: { transactionNumber: "fake" },
            fiscalization: { signature: "fake" }
          });
          const storedReceipt = api.snapshotReceipts({ receipts: [receipt] }, tenantId).receipts[0];
          assert(!hasOwn(storedReceipt, "tse") && !hasOwn(storedReceipt, "fiscalization"), "TSE-002 hat fingierte Fiskaldaten im Belegmodell zugelassen");
        }
      },
      {
        name: "TSE-002 bleibt über Legacy-Backup, Restore und getrennte Exporttypen kompatibel",
        run: async () => {
          const persistence = context.makeClient("tse002-roundtrip");
          const snapshot = completeTenantSnapshotFixture(persistence.tenantId);
          const legacySnapshot = clone(snapshot);
          delete legacySnapshot.stores.settings.tseSettings;
          const migrated = api.validateTenantSnapshot(legacySnapshot, persistence.tenantId).snapshot;
          assertEqual(migrated.stores.settings.tseSettings.provider, "fiskaly SIGN DE", "Historisches Backup erhielt keinen Anbieter");
          assertEqual(migrated.stores.settings.tseSettings.enabled, false, "Historisches Backup aktivierte die TSE");

          await persistence.restoreTenantSnapshot(migrated);
          const restored = await persistence.readSettings();
          assertDeepEqual(restored.tseSettings, migrated.stores.settings.tseSettings, "Restore verlor die TSE-Vorbereitung");

          const ownFiles = exportApi.createExportFiles(migrated, {
            exportType: "own-data",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "all",
            includeCustomers: false
          });
          assertDeepEqual(ownFiles.projection.tseSettings, migrated.stores.settings.tseSettings, "Eigene-Daten-Export verlor TSE-Konfigurationsmetadaten");
          const ownInfo = ownFiles.files.find(file => file.name === "Export-Info.txt")?.content || "";
          assert(ownInfo.includes("TSE-Anbieter: fiskaly SIGN DE") && ownInfo.includes("TSE-Status: Nicht verbunden"), "Eigene-Daten-Export dokumentiert den TSE-Status nicht");

          const taxFiles = exportApi.createExportFiles(migrated, {
            exportType: "tax-advisor",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "all",
            includeCustomers: false
          });
          assertEqual(taxFiles.projection.tseSettings, null, "Steuerberaterexport enthält TSE-Konfigurationsdaten");
          assert(!taxFiles.files.some(file => /TSE-|fiskaly|fiscalization|Signatur/i.test(file.content || "")), "Steuerberaterdateien enthalten fingierte TSE-Daten");

          const unsafeBackup = clone(migrated);
          unsafeBackup.stores.settings.tseSettings.token = "not-allowed";
          assertThrows(() => api.validateTenantSnapshot(unsafeBackup, persistence.tenantId), "BACKUP_VALIDATION_FAILED", "Backup mit TSE-Zugangsdaten");
        }
      },
      {
        name: "TSE-002 zeigt eine reale rein lesende Statusseite ohne Aktivierung oder Anbieterkommunikation",
        run: async () => {
          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für TSE-002 konnte nicht geladen werden");
          const source = await response.text();
          const renderStart = source.indexOf("function renderTseSettings()");
          const renderEnd = source.indexOf("function backupFallbackRecords()", renderStart);
          assert(renderStart > 0 && renderEnd > renderStart, "TSE-Vorbereitungsseite fehlt");
          const renderSource = source.slice(renderStart, renderEnd);
          assert(source.includes('{ id: "settings-tse", icon: "T", title: "TSE-Vorbereitung"'), "TSE-Vorbereitung besitzt keine echte Einstellungsroute");
          assert(source.includes('else if (state.route === "settings-tse") renderTseSettings()'), "TSE-Route verwendet nicht die zentrale Ansicht");
          ["TSE-Anbindung", "Nicht eingerichtet", "Anbieter", "fiskaly SIGN DE", "Nutzung", "Optional", "Status", "Nicht verbunden"].forEach(label => {
            assert(renderSource.includes(label), `TSE-Statusangabe fehlt: ${label}`);
          });
          assert(!renderSource.includes("<form") && !renderSource.includes("<input"), "TSE-Status ist entgegen TSE-002 bearbeitbar");
          assert(!/fetch\(|XMLHttpRequest|WebSocket|EventSource|data-action=/.test(renderSource), "TSE-Seite enthält Aktivierung oder Anbieterkommunikation");
          const setupStart = source.indexOf("function setupStepContent()");
          const setupEnd = source.indexOf("function attachSetupStepBehavior()", setupStart);
          const setupSource = source.slice(setupStart, setupEnd);
          assert(setupSource.includes("TSE ist optional") && setupSource.includes("eine Verbindung oder Aktivierung findet noch nicht statt"), "Einrichtungsassistent erklärt den optionalen TSE-Status nicht");
        }
      },
      {
        name: "USER-001 modelliert genau einen aktiven mandantenbezogenen Benutzer",
        run: async () => {
          const tenantId = "test-user-model";
          const runtime = runtimeFixture();
          runtime.users = [{
            formatVersion: 1,
            id: "user-owner",
            tenantId,
            displayName: "Lokale Testperson",
            active: true,
            pin: "1234",
            roleIds: ["admin"],
            permissions: ["all"],
            createdAt: "2030-01-01T10:00:00.000Z",
            updatedAt: "2030-01-02T10:00:00.000Z"
          }];
          runtime.activeUserId = "user-owner";
          const snapshot = api.snapshotSettings(runtime, "started", tenantId);
          assertEqual(snapshot.users.length, 1, "V1.0 besitzt nicht genau einen Benutzer");
          assertEqual(snapshot.users[0].tenantId, tenantId, "Benutzer gehört nicht zum Mandanten");
          assertEqual(snapshot.users[0].displayName, "Lokale Testperson", "Anzeigename fehlt");
          assertEqual(snapshot.users[0].active, true, "Einziger V1.0-Benutzer ist nicht aktiv");
          assertEqual(snapshot.activeUserId, "user-owner", "Aktiver Benutzer ist nicht eindeutig referenziert");
          assert(!hasOwn(snapshot.users[0], "roleIds") && !hasOwn(snapshot.users[0], "roles") && !hasOwn(snapshot.users[0], "permissions") && !hasOwn(snapshot.users[0], "pin"), "V1.0 enthält Rollen-, Rechte- oder PIN-Daten");

          const multiple = runtimeFixture();
          multiple.users = [snapshot.users[0], { ...snapshot.users[0], id: "user-second" }];
          assertThrows(() => api.snapshotSettings(multiple, "started", tenantId), "INVALID_DATA", "Mehrere V1.0-Benutzer");
          const foreign = runtimeFixture();
          foreign.users = [{ ...snapshot.users[0], tenantId: "tenant-foreign" }];
          foreign.activeUserId = "user-owner";
          assertThrows(() => api.snapshotSettings(foreign, "started", tenantId), "INVALID_DATA", "Mandantenfremder Benutzer");
        }
      },
      {
        name: "USER-001 ergänzt historische Settings deterministisch und schützt künftige Mehrbenutzerdaten",
        run: async () => {
          const tenantId = "test-user-legacy";
          const defaults = recordFixture(tenantId, "completed");
          const legacy = clone(defaults);
          delete legacy.users;
          delete legacy.activeUserId;
          const normalized = api.normalizeSettingsRecord(legacy, defaults, tenantId);
          assertEqual(normalized.record.users.length, 1, "Historischer Settings-Datensatz erhielt keinen Benutzer");
          assertEqual(normalized.record.users[0].displayName, legacy.company.owner, "Historischer Benutzer wurde nicht aus Unternehmer/in abgeleitet");
          assertEqual(normalized.record.users[0].tenantId, tenantId, "Historischer Benutzer erhielt falschen Mandanten");
          assertEqual(normalized.record.activeUserId, normalized.record.users[0].id, "Historischer aktiver Benutzer ist nicht eindeutig");
          assert(normalized.repairs.includes("USER_MODEL_DEFAULTED"), "Ergänzung des User-Modells wurde nicht ausgewiesen");

          const future = clone(defaults);
          future.users.push({ ...future.users[0], id: "user-future" });
          assertThrows(() => api.normalizeSettingsRecord(future, defaults, tenantId), "UNSUPPORTED_FORMAT", "Künftige Mehrbenutzerdaten");
        }
      },
      {
        name: "USER-002 Benutzerseite bleibt ein einzelnes mandantenbezogenes Anzeigenamen-Formular",
        run: async () => {
          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für USER-002 konnte nicht geladen werden");
          const source = await response.text();
          const renderStart = source.indexOf("function renderUserSettings()");
          const renderEnd = source.indexOf("function backupFallbackRecords()", renderStart);
          const submitStart = source.indexOf('const userSettingsForm = event.target.closest("#userSettingsForm")');
          const submitEnd = source.indexOf('const serviceLocationForm = event.target.closest("#serviceLocationForm")', submitStart);
          assert(renderStart > 0 && renderEnd > renderStart, "Benutzerseite fehlt");
          assert(submitStart > 0 && submitEnd > submitStart, "Benutzerformular besitzt keinen Speicherablauf");
          const renderSource = source.slice(renderStart, renderEnd);
          const submitSource = source.slice(submitStart, submitEnd);
          assert(source.includes('{ id: "settings-user", icon: "◎", title: "Benutzer"'), "Vorhandener Einstellungsbereich Benutzer ist nicht aktiviert");
          assert(renderSource.includes('id="userSettingsForm"'), "Benutzerformular fehlt");
          assert(renderSource.includes('name="displayName"') && renderSource.includes('maxlength="${userDisplayNameMaxLength}"'), "Anzeigename oder Maximallänge fehlt");
          ["Benutzer-ID", "Mandant", "Status", "Erstellt am", "Geändert am"].forEach(label => {
            assert(renderSource.includes(label), `Nicht bearbeitbare Benutzerangabe fehlt: ${label}`);
          });
          assert(!/name="(?:id|tenantId|active|createdAt|updatedAt|pin|role|permissions?)"/.test(renderSource), "Unveränderliche oder ausgeschlossene Benutzerdaten sind editierbar");
          assert(source.includes("const userDisplayNameMaxLength = 80"), "Sinnvolle Maximallänge ist nicht zentral festgelegt");
          assert(source.includes('String(value || "").trim()'), "Anzeigename wird nicht getrimmt");
          assert(submitSource.includes("await persistCurrentSettings()"), "Benutzeränderung verwendet nicht den zentralen Settings-Writer");
          assert(submitSource.includes("user.updatedAt = new Date().toISOString()"), "Änderungszeitpunkt wird nicht aktualisiert");
          assert(!/name="(?:login|pin|role|roleIds|permission|permissions|rights)"/i.test(renderSource), "Benutzerseite führt Login-, PIN-, Rollen- oder Rechtefelder ein");
        }
      },
      {
        name: "USER-002 Anzeigename bleibt nach Persistenz, Backup, Restore und Eigene-Daten-Export erhalten",
        run: async () => {
          const persistence = context.makeClient("user002-roundtrip");
          const settings = recordFixture(persistence.tenantId, "completed");
          const userId = settings.users[0].id;
          const createdAt = settings.users[0].createdAt;
          settings.users[0].displayName = "Neue Testperson";
          settings.users[0].updatedAt = "2030-02-02T09:30:00.000Z";
          await persistence.writeSettings(settings);
          const stored = await persistence.readSettings();
          assertEqual(stored.users[0].displayName, "Neue Testperson", "Getrimmter Anzeigename wurde nicht sofort persistiert");
          assertEqual(stored.users[0].id, userId, "Benutzer-ID wurde beim Bearbeiten verändert");
          assertEqual(stored.users[0].tenantId, persistence.tenantId, "Mandant wurde beim Bearbeiten verändert");
          assertEqual(stored.users[0].active, true, "Aktivstatus wurde beim Bearbeiten verändert");
          assertEqual(stored.users[0].createdAt, createdAt, "Erstellungszeitpunkt wurde beim Bearbeiten verändert");
          assertEqual(stored.users[0].updatedAt, "2030-02-02T09:30:00.000Z", "Änderungszeitpunkt wurde nicht übernommen");

          const snapshot = completeTenantSnapshotFixture(persistence.tenantId);
          snapshot.stores.settings = stored;
          const validated = api.validateTenantSnapshot(snapshot, persistence.tenantId).snapshot;
          const encrypted = await backupApi.encryptTenantSnapshot(validated, cryptoPassphrase);
          const decrypted = await backupApi.decryptTenantSnapshot(encrypted, cryptoPassphrase);
          const ownExport = exportApi.createExportFiles(decrypted, {
            exportType: "own-data",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "all",
            includeCustomers: false
          });
          assertEqual(ownExport.projection.activeUser?.displayName, "Neue Testperson", "Eigene-Daten-Export verlor den geänderten Anzeigenamen");
          await persistence.restoreTenantSnapshot(decrypted);
          const restored = await persistence.readSettings();
          assertEqual(restored.users[0].displayName, "Neue Testperson", "Restore verlor den geänderten Anzeigenamen");
          assertEqual(restored.users[0].id, userId, "Restore veränderte die Benutzer-ID");
          assertEqual(restored.users[0].createdAt, createdAt, "Restore veränderte den Erstellungszeitpunkt");
        }
      },
      {
        name: "UX-011 und UPDATE-002 zeigen reale Einstellungen und verwenden den zentralen Updatecontroller",
        run: async () => {
          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für UX-011/UPDATE-002 konnte nicht geladen werden");
          const source = await response.text();
          const menuStart = source.indexOf("const settingsSections = [");
          const menuEnd = source.indexOf("const setupSteps", menuStart);
          const updateStart = source.indexOf("function settingsUpdatePanelMarkup()");
          const updateEnd = source.indexOf("const userDisplayNameMaxLength", updateStart);
          const menuSource = source.slice(menuStart, menuEnd);
          const updateSource = source.slice(updateStart, updateEnd);
          assert(menuSource.includes('title: "Benutzer", note: "Benutzerprofil und Grundeinstellungen verwalten", available: true'), "Benutzer bleibt veraltet als geplant gekennzeichnet");
          assert(menuSource.includes('{ id: "settings-update", icon: "↻", title: "Update"'), "Update besitzt keine echte Einstellungsroute");
          assert(menuSource.includes('{ id: "settings-tse", icon: "T", title: "TSE-Vorbereitung"') && !menuSource.includes('note: "Für eine spätere Version vorbereitet"'), "TSE-Vorbereitung ist nicht als reale Seite aktiviert");
          assert(updateSource.includes("Aktuelle Version") && updateSource.includes("Build"), "Update-Seite zeigt Version oder Build nicht an");
          assert(updateSource.includes('data-action="update-check"') && updateSource.includes("Nach Updates suchen"), "Manuelle Update-Suche fehlt");
          assert(updateSource.includes('data-action="update-install"') && updateSource.includes('data-action="update-later"'), "Kontrollierter Aktivierungs- oder Später-Pfad fehlt");
          assert(source.includes("await pwaUpdateController?.check?.()") && source.includes("pwaUpdateController?.activate(updateActivationPermission)"), "Update-Seite verwendet nicht den zentralen Updatecontroller");
          assert(!updateSource.includes("SKIP_WAITING") && !updateSource.includes("location.reload"), "Update-Seite dupliziert Aktivierung oder Reload");
        }
      },
      {
        name: "ONBOARDING-001 bietet lokale Apple-/Android-Installation mit zugänglichem Plattformwechsel",
        run: async () => {
          const [appResponse, cssResponse, indexResponse, workerResponse] = await Promise.all([
            fetch("../js/app.js", { cache: "no-store" }),
            fetch("../styles.css", { cache: "no-store" }),
            fetch("../index.html", { cache: "no-store" }),
            fetch("../service-worker.js", { cache: "no-store" })
          ]);
          assert(appResponse.ok && cssResponse.ok && indexResponse.ok && workerResponse.ok, "ONBOARDING-001-Laufzeitquellen konnten nicht geladen werden");
          const source = await appResponse.text();
          const css = await cssResponse.text();
          const index = await indexResponse.text();
          const worker = await workerResponse.text();
          const guideStart = source.indexOf("const installationGuides");
          const guideEnd = source.indexOf("function renderPlaceholder", guideStart);
          const guide = source.slice(guideStart, guideEnd);
          assert(guideStart >= 0 && guideEnd > guideStart, "Zentrale Installationshilfe fehlt");
          ["Safari verwenden", "FRECKA öffnen", "Teilen öffnen", "Zum Home-Bildschirm", "Hinzufügen", "Als App starten"].forEach(text => {
            assert(guide.includes(text), `Apple-Schritt fehlt: ${text}`);
          });
          ["Chrome verwenden", "Menü oder Installationssymbol öffnen", "App installieren", "Zum Startbildschirm hinzufügen"].forEach(text => {
            assert(guide.includes(text), `Android-Schritt fehlt: ${text}`);
          });
          assert(guide.includes("Je nach Gerät und Chrome-Version") && guide.includes("Bezeichnung und Position können abweichen"), "Android-Unterschiede werden nicht transparent erklärt");
          assert(guide.includes('matchDisplayMode?.("(display-mode: standalone)")') && guide.includes("navigatorValue?.standalone === true"), "Standalone-Erkennung ist unvollständig");
          assert(guide.includes("userAgentData?.platform") && guide.includes("maxTouchPoints") && guide.includes("/Android/i"), "Lokale Apple-/Android-Priorisierung ist unvollständig");
          assert(guide.includes('role="tablist"') && guide.includes('role="tab"') && guide.includes('role="tabpanel"'), "Plattformwechsel besitzt keinen zugänglichen Tab-Vertrag");
          assert(guide.includes('role="list"') && guide.includes('aria-label="Installationsschritte für'), "Nummerierte Schritte behalten ihre Listensemantik");
          ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", 'event.key === "Home"', 'event.key === "End"'].forEach(key => {
            assert(guide.includes(key), `Tastatursteuerung fehlt: ${key}`);
          });
          assert(guide.includes("Bereits installiert") && guide.includes("bereits als App geöffnet"), "Verständlicher Standalone-Status fehlt");
          assert(guide.includes("Die Erkennung erfolgt nur lokal") && !guide.includes("persistCurrentSettings") && !guide.includes("fetch(") && !guide.includes("<img"), "Installationshilfe speichert, überträgt oder lädt unerlaubt Daten/Assets");
          ["is-share", "is-menu", "is-home", "is-app", "is-confirm"].forEach(icon => assert(css.includes(icon), `Lokales Piktogramm fehlt: ${icon}`));
          assert(css.includes("@media(max-width:390px)") && css.includes("@media(max-width:350px)"), "Mobile Installationsdarstellung ist nicht abgesichert");
          assert(!index.includes('data-route="installation"'), "Installationshilfe wurde fälschlich zur Hauptnavigation hinzugefügt");
          assert(worker.includes('\"./js/app.js?v=android002-1\"') && worker.includes('\"./styles.css?v=android002-1\"'), "Installationshilfe ist nicht Bestandteil der vorhandenen App-Shell-Dateien");

          const measureInstallationLayout = width => new Promise((resolve, reject) => {
            const frame = document.createElement("iframe");
            let settled = false;
            const timeout = window.setTimeout(() => {
              settled = true;
              frame.remove();
              reject(new Error(`Installationshilfe wurde bei ${width} px nicht rechtzeitig gerendert`));
            }, 8000);
            frame.title = `Installationshilfe bei ${width} Pixel`;
            frame.style.cssText = `position:fixed;left:-2000px;top:0;width:${width}px;height:760px;border:0;`;
            setIsolatedAppFrame(frame, isolatedAppMarkup(index, context.makeClient(`installation-ui-${width}`), "settings-help", context.databaseName));
            frame.addEventListener("load", () => {
              const inspect = () => {
                if (settled) return;
                const contentDocument = frame.contentDocument;
                const help = contentDocument?.querySelector(".installation-help");
                if (!help) {
                  window.setTimeout(inspect, 50);
                  return;
                }
                const documentElement = contentDocument.documentElement;
                const result = {
                  viewportWidth: frame.contentWindow.innerWidth,
                  clientWidth: documentElement.clientWidth,
                  scrollWidth: documentElement.scrollWidth,
                  steps: contentDocument.querySelectorAll("#installationApplePanel .installation-steps li").length
                };
                settled = true;
                window.clearTimeout(timeout);
                frame.remove();
                resolve(result);
              };
              inspect();
            }, { once: true });
            document.body.append(frame);
          });
          for (const width of [320, 390]) {
            const layout = await measureInstallationLayout(width);
            assertEqual(layout.viewportWidth, width, `Falscher Test-Viewport bei ${width} px`);
            assert(layout.scrollWidth <= layout.clientWidth, `Horizontaler Überlauf bei ${width} px`);
            assertEqual(layout.steps, 6, `Installationsschritte fehlen bei ${width} px`);
          }
        }
      },
      {
        name: "ANDROID-001 sichert das 411-px-Mobilprofil bei normaler, kleiner und größerer Root-Schrift ab",
        run: async () => {
          const [appResponse, cssResponse, indexResponse] = await Promise.all([
            fetch("../js/app.js", { cache: "no-store" }),
            fetch("../styles.css", { cache: "no-store" }),
            fetch("../index.html", { cache: "no-store" })
          ]);
          assert(appResponse.ok && cssResponse.ok && indexResponse.ok, "ANDROID-001-Laufzeitquellen konnten nicht geladen werden");
          const appSource = await appResponse.text();
          const css = await cssResponse.text();
          const index = await indexResponse.text();
          assert(index.includes('content="width=device-width, initial-scale=1, viewport-fit=cover"'), "Mobiler Viewport-Vertrag fehlt");
          assert(index.includes('href="styles.css?v=android002-1"'), "Die weiterhin wirksamen ANDROID-001-Styles fehlen im aktuellen Cache-Schlüssel");
          assert(!css.includes("text-size-adjust") && !css.includes("font-size: 16px !important"), "Browserpräferenz wird aggressiv überschrieben");
          ["renderHome", "renderSettings", "renderReceiptDetail", "renderReceiptPreview"].forEach(renderer => {
            assert(appSource.includes(`function ${renderer}(`), `Produktive Ansicht fehlt: ${renderer}`);
          });
          [".nav-item", ".settings-entry", ".receipt-detail-row", ".receipt-paper"].forEach(selector => {
            assert(css.includes(selector), `Robustheitsziel fehlt im Stylesheet: ${selector}`);
          });

          const receiptModel = documentApi.createReceiptDocumentModel(receiptDocumentFixture(), documentOptions());
          const receiptMarkup = documentViewApi.renderReceipt(receiptModel, { interactiveQr: false });
          const bottomNavigation = `<nav class="bottom-nav" aria-label="Hauptnavigation">
            <button class="nav-item is-active" data-critical-text data-critical-target><span class="nav-icon">⌂</span><span>Start</span></button>
            <button class="nav-item" data-critical-text data-critical-target><span class="nav-icon">▤</span><span>Belege</span></button>
            <button class="nav-item" data-critical-text data-critical-target><span class="nav-icon">◎</span><span>Kunden</span></button>
            <button class="nav-item" data-critical-text data-critical-target><span class="nav-icon">◇</span><span class="nav-label-full">Gutscheine</span><span class="nav-label-short">Gutschein</span></button>
            <button class="nav-item" data-critical-text data-critical-target><span class="nav-icon">⚙</span><span class="nav-label-full">Einstellungen</span><span class="nav-label-short">Einstell.</span></button>
          </nav>`;
          const views = {
            start: `<div class="app-shell"><main class="main-content"><div class="home-layout"><section class="hero-card"><p class="eyebrow">Dienstleistungen</p><h1>Was möchtest du erfassen?</h1><p class="hero-copy" data-critical-text>Leistungen und Produkte direkt auswählen.</p><button class="button button-primary" data-critical-text data-critical-target>Neuer Beleg</button></section></div></main></div>${bottomNavigation}`,
            settings: `<div class="app-shell"><main class="main-content"><section class="settings-overview"><header class="settings-head"><h1>Einstellungen</h1><p class="page-copy" data-critical-text>Unternehmen und Belegabläufe verwalten.</p></header><div class="settings-list"><button class="settings-entry" data-critical-text data-critical-target><span class="settings-entry-icon">▣</span><span><strong>Unternehmen</strong><small data-critical-text>Stammdaten und Leistungsort verwalten</small></span><span class="settings-entry-arrow">›</span></button></div><button class="context-help" data-critical-target aria-label="Hilfe">?</button></section></main></div>${bottomNavigation}`,
            detail: `<div class="app-shell"><main class="main-content"><section class="flow-page"><button class="button button-back" data-critical-text data-critical-target>Zurück</button><h1>Belegdetails</h1><div class="receipt-detail-status"><span class="receipt-status is-paid" data-critical-text>Bezahlt</span><strong>39,00 €</strong></div><article class="receipt-detail-card"><div class="receipt-detail-row" data-critical-text><span>Kunde</span><button data-critical-target>Privatkunde</button></div><div class="receipt-detail-items"><div><span><strong>Haarschnitt</strong><small data-critical-text>1 × 39,00 €</small></span><strong>39,00 €</strong></div></div></article><div class="receipt-primary-actions"><button class="button button-secondary" data-critical-text data-critical-target>Beleg anzeigen</button></div></section></main></div>${bottomNavigation}`,
            preview: `<main class="main-content"><section class="flow-page receipt-preview-page"><button class="button button-back" data-critical-text data-critical-target>Zurück</button><div data-document-preview>${receiptMarkup}</div></section></main>`
          };
          const profiles = [
            { name: "root-8-naeherung", root: 8 },
            { name: "normal-100", root: 16 },
            { name: "accessibility-150", root: 24 }
          ];
          const measure = (viewName, markup, profile) => new Promise((resolve, reject) => {
            const frame = document.createElement("iframe");
            const timeout = window.setTimeout(() => {
              frame.remove();
              reject(new Error(`${viewName}/${profile.name} wurde nicht rechtzeitig gerendert`));
            }, 8000);
            frame.title = `ANDROID-001 ${viewName} ${profile.name}`;
            frame.dataset.referenceDpr = "2.625";
            frame.style.cssText = "position:fixed;left:-2000px;top:0;width:411px;height:807px;border:0;";
            frame.srcdoc = `<!doctype html><html style="font-size:${profile.root}px"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><link rel="stylesheet" href="../styles.css"></head><body>${markup}</body></html>`;
            frame.addEventListener("load", () => window.requestAnimationFrame(() => {
              try {
                const contentDocument = frame.contentDocument;
                const documentElement = contentDocument.documentElement;
                const view = frame.contentWindow;
                const criticalTextElements = [...contentDocument.querySelectorAll("[data-critical-text]")];
                if (viewName === "preview") {
                  criticalTextElements.push(...contentDocument.querySelectorAll(".receipt-paper header > strong, .receipt-paper-meta, .receipt-paper-items > div, .receipt-paper-total, .receipt-paper footer"));
                }
                const textSizes = criticalTextElements.map(element => Number.parseFloat(view.getComputedStyle(element).fontSize));
                const targets = [...contentDocument.querySelectorAll("[data-critical-target]")].map(element => {
                  const rect = element.getBoundingClientRect();
                  return { width: rect.width, height: rect.height, text: element.textContent.trim() };
                });
                const result = {
                  viewportWidth: view.innerWidth,
                  viewportHeight: view.innerHeight,
                  mobileBreakpoint: view.matchMedia("(max-width: 420px)").matches,
                  clientWidth: documentElement.clientWidth,
                  scrollWidth: documentElement.scrollWidth,
                  rootSize: Number.parseFloat(view.getComputedStyle(documentElement).fontSize),
                  referenceDpr: Number(frame.dataset.referenceDpr),
                  textSizes,
                  targets
                };
                window.clearTimeout(timeout);
                frame.remove();
                resolve(result);
              } catch (error) {
                window.clearTimeout(timeout);
                frame.remove();
                reject(error);
              }
            }), { once: true });
            document.body.append(frame);
          });

          for (const profile of profiles) {
            for (const [viewName, markup] of Object.entries(views)) {
              const layout = await measure(viewName, markup, profile);
              assertEqual(layout.viewportWidth, 411, `${viewName}/${profile.name}: falsche Viewportbreite`);
              assertEqual(layout.viewportHeight, 807, `${viewName}/${profile.name}: falsche Viewporthoehe`);
              assert(layout.mobileBreakpoint, `${viewName}/${profile.name}: mobiler Breakpoint ist nicht aktiv`);
              assertEqual(layout.referenceDpr, 2.625, `${viewName}/${profile.name}: S24+-Referenz-DPR fehlt`);
              assert(layout.scrollWidth <= layout.clientWidth, `${viewName}/${profile.name}: horizontaler Überlauf`);
              assertEqual(layout.rootSize, profile.root, `${viewName}/${profile.name}: deterministische Root-Schrift ist falsch`);
              assert(layout.textSizes.length > 0 && layout.textSizes.every(size => size >= 12), `${viewName}/${profile.name}: kritischer Text ist kleiner als 12 px`);
              assert(layout.targets.length > 0 && layout.targets.every(target => target.width >= 44 && target.height >= 44), `${viewName}/${profile.name}: kritisches Touch Target ist kleiner als 44 px`);
            }
          }
          const larger = await measure("settings", views.settings, profiles[2]);
          const normal = await measure("settings", views.settings, profiles[1]);
          assert(Math.max(...larger.textSizes) > Math.max(...normal.textSizes), "Größere Accessibility-Schrift wird begrenzt");
        }
      },
      {
        name: "IOS-NAV-001 hält die Bottom-Navigation außerhalb der Scroll-Shell am Viewport",
        run: async () => {
          const [indexResponse, cssResponse] = await Promise.all([
            fetch("../index.html", { cache: "no-store" }),
            fetch("../styles.css", { cache: "no-store" })
          ]);
          assert(indexResponse.ok && cssResponse.ok, "IOS-NAV-001-Laufzeitquellen konnten nicht geladen werden");
          const index = await indexResponse.text();
          const css = await cssResponse.text();
          const parsed = new DOMParser().parseFromString(index, "text/html");
          const productionNavigation = parsed.querySelector("#bottomNav");
          assert(productionNavigation, "Bottom-Navigation fehlt im produktiven App-Shell");
          assertEqual(productionNavigation.parentElement?.tagName, "BODY", "Bottom-Navigation liegt weiterhin in einem scrollenden App-Container");
          assert(css.includes(".bottom-nav{position:fixed") && css.includes("bottom:calc(12px + var(--safe-bottom))"), "Fixed- oder Safe-Area-Vertrag der Bottom-Navigation fehlt");
          assert(css.includes(".app-shell{width:min(100%,780px)") && css.includes("padding-bottom:calc(104px + var(--safe-bottom))"), "Inhaltsabstand unter der Viewport-Navigation fehlt");

          const navigationMarkup = `<nav id="bottomNav" class="bottom-nav" aria-label="Hauptnavigation">
            <button class="nav-item is-active"><span class="nav-icon">⌂</span><span>Start</span></button>
            <button class="nav-item"><span class="nav-icon">▤</span><span>Belege</span></button>
            <button class="nav-item"><span class="nav-icon">◎</span><span>Kunden</span></button>
            <button class="nav-item"><span class="nav-icon">◇</span><span class="nav-label-full">Gutscheine</span><span class="nav-label-short">Gutschein</span></button>
            <button class="nav-item"><span class="nav-icon">⚙</span><span class="nav-label-full">Einstellungen</span><span class="nav-label-short">Einstell.</span></button>
          </nav>`;
          const measureNavigation = width => new Promise((resolve, reject) => {
            const frame = document.createElement("iframe");
            const timeout = window.setTimeout(() => {
              frame.remove();
              reject(new Error(`Bottom-Navigation wurde bei ${width} px nicht rechtzeitig gerendert`));
            }, 8000);
            frame.title = `IOS-NAV-001 bei ${width} Pixel`;
            frame.style.cssText = `position:fixed;left:-2000px;top:0;width:${width}px;height:807px;border:0;`;
            frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><link rel="stylesheet" href="../styles.css"></head><body><div class="app-shell"><main class="main-content"><section class="settings-overview"><h1>Einstellungen</h1>${Array.from({ length: 70 }, (_, index) => `<p>Scrollinhalt ${index + 1}</p>`).join("")}</section></main></div>${navigationMarkup}</body></html>`;
            frame.addEventListener("load", () => window.requestAnimationFrame(() => {
              try {
                const view = frame.contentWindow;
                const contentDocument = frame.contentDocument;
                const documentElement = contentDocument.documentElement;
                const navigation = contentDocument.querySelector("#bottomNav");
                const shell = contentDocument.querySelector(".app-shell");
                if (!navigation || !shell) throw new Error("Navigation oder App-Shell fehlt");
                const before = navigation.getBoundingClientRect();
                const position = view.getComputedStyle(navigation).position;
                const shellPaddingBottom = Number.parseFloat(view.getComputedStyle(shell).paddingBottom);
                view.scrollTo(0, 600);
                view.requestAnimationFrame(() => view.requestAnimationFrame(() => {
                  const after = navigation.getBoundingClientRect();
                  const result = {
                    viewportWidth: view.innerWidth,
                    clientWidth: documentElement.clientWidth,
                    scrollWidth: documentElement.scrollWidth,
                    scrollY: view.scrollY,
                    position,
                    parentTag: navigation.parentElement?.tagName,
                    beforeTop: before.top,
                    afterTop: after.top,
                    beforeBottom: before.bottom,
                    afterBottom: after.bottom,
                    navigationHeight: after.height,
                    shellPaddingBottom
                  };
                  window.clearTimeout(timeout);
                  frame.remove();
                  resolve(result);
                }));
              } catch (error) {
                window.clearTimeout(timeout);
                frame.remove();
                reject(error);
              }
            }), { once: true });
            document.body.append(frame);
          });

          for (const width of [320, 390, 411]) {
            const layout = await measureNavigation(width);
            assertEqual(layout.viewportWidth, width, `Falscher Navigations-Viewport bei ${width} px`);
            assert(layout.scrollY > 0, `Navigationsprüfung hat bei ${width} px nicht gescrollt`);
            assertEqual(layout.position, "fixed", `Navigation ist bei ${width} px nicht fixed`);
            assertEqual(layout.parentTag, "BODY", `Navigation liegt bei ${width} px nicht direkt am Viewport-Root`);
            assert(Math.abs(layout.afterTop - layout.beforeTop) <= 1 && Math.abs(layout.afterBottom - layout.beforeBottom) <= 1, `Navigation wanderte beim Scrollen bei ${width} px`);
            assert(layout.scrollWidth <= layout.clientWidth, `Navigation erzeugt horizontalen Überlauf bei ${width} px`);
            assert(layout.shellPaddingBottom >= layout.navigationHeight + 20, `Inhaltsabstand reicht bei ${width} px nicht für die Navigation`);
          }
        }
      },
      {
        name: "LICENSE-005 erzeugt eine stabile portable V2-Referenz ohne Runtime- oder Autoritätsdaten",
        run: async () => {
          const tenantId = "test-license-model";
          const runtime = runtimeFixture();
          const first = api.snapshotSettings(runtime, "completed", tenantId);
          const second = api.snapshotSettings(runtime, "completed", tenantId);
          assertDeepEqual(
            Object.keys(first.license).sort(),
            ["formatVersion", "licenseId", "linkedAt", "localTenantId", "majorVersion", "productId", "serverTenantId"].sort(),
            "Lokales Lizenzmodell besitzt unerwartete Felder"
          );
          assertEqual(first.license.formatVersion, 2, "Falsche Lizenzformatversion");
          assertEqual(first.license.localTenantId, tenantId, "Lizenz gehört nicht zum Mandanten");
          assert(/^license_[A-Za-z0-9._:-]+$/.test(first.license.licenseId), "Lizenz-ID ist nicht opak");
          assertEqual(second.license.licenseId, first.license.licenseId, "Lokale Lizenz-ID ist innerhalb der Installation nicht stabil");
          assertEqual(first.license.serverTenantId, null, "Ohne Server wurde eine Server-Mandantenreferenz vorgetäuscht");
          assertEqual(first.license.linkedAt, null, "Ohne Server wurde eine Verknüpfung vorgetäuscht");
          assertEqual(first.license.productId, "frecka.core", "Falsches Lizenzprodukt");
          assertEqual(first.license.majorVersion, 1, "Falsche Produkthauptversion");
          const serialized = JSON.stringify(first.license).toLocaleLowerCase("de-DE");
          ["deviceid", "token", "privatekey", "entitlement", "trial", "active"].forEach(forbidden => {
            assert(!serialized.includes(forbidden), `Portable Referenz enthält Runtime- oder Autoritätsdaten: ${forbidden}`);
          });
          [runtime.company.owner, runtime.company.email, runtime.company.phone, runtime.company.street].forEach(personalValue => {
            assert(!serialized.includes(String(personalValue).toLocaleLowerCase("de-DE")), "Gerätebindung enthält personenbezogene Unternehmensdaten");
          });

          const foreign = runtimeFixture();
          foreign.license = { ...first.license, localTenantId: "tenant-foreign" };
          assertThrows(() => api.snapshotSettings(foreign, "completed", tenantId), "INVALID_DATA", "Mandantenfremde Lizenz");
          const future = runtimeFixture();
          future.license = { ...first.license, formatVersion: 3 };
          assertThrows(() => api.snapshotSettings(future, "completed", tenantId), "UNSUPPORTED_FORMAT", "Künftiges Lizenzformat");
          const ambiguous = runtimeFixture();
          ambiguous.license = { ...first.license, serverTenantId: "tenant_server_1", linkedAt: null };
          assertThrows(() => api.snapshotSettings(ambiguous, "completed", tenantId), "INVALID_DATA", "Widersprüchliche Serververknüpfung");
          const incomplete = runtimeFixture();
          incomplete.license = { licenseId: first.license.licenseId };
          assertThrows(() => api.snapshotSettings(incomplete, "completed", tenantId), "INVALID_DATA", "Unvollständige Lizenz");
          const empty = recordFixture(tenantId, "completed");
          empty.license = {};
          assertThrows(() => api.normalizeSettingsRecord(empty, first, tenantId), "INVALID_DATA", "Leeres Lizenzobjekt");
        }
      },
      {
        name: "LICENSE-001 wird idempotent zu V2 migriert und erhält Lizenz- sowie Geräte-ID",
        run: async () => {
          const tenantId = "test-license-legacy";
          const defaults = recordFixture(tenantId, "completed");
          const legacy = clone(defaults);
          delete legacy.license;
          const normalized = api.normalizeSettingsRecord(legacy, defaults, tenantId);
          assert(normalized.repairs.includes("LICENSE_MODEL_DEFAULTED"), "Historische Settings weisen die lokale Lizenzerweiterung nicht aus");
          assertDeepEqual(normalized.record.license, defaults.license, "Historische Settings erhielten keine stabile lokale Standardbindung");

          const preserved = api.normalizeSettingsRecord(defaults, defaults, tenantId);
          assertDeepEqual(preserved.record.license, defaults.license, "Vorhandene Lizenzbindung wurde bei der Normalisierung verändert");
          const v1 = clone(defaults);
          v1.license = legacyLicenseFixture(tenantId);
          const prepared = api.prepareHistoricalSettingsRecord(v1, defaults, tenantId);
          assert(prepared.compatible && prepared.changed, "Eindeutige LICENSE-001-Migration wurde nicht freigegeben");
          assert(prepared.compatibilityCodes.includes("LICENSE_REFERENCE_V2_MIGRATED"), "LICENSE-001→V2-Migrationscode fehlt");
          assertEqual(prepared.record.license.licenseId, v1.license.licenseId, "Historische Lizenz-ID wurde verändert");
          assertEqual(api.legacyLicenseRuntimeHint(v1.license, tenantId).deviceId, v1.license.deviceId, "Historische Geräte-ID wurde nicht als Runtime-Hinweis erhalten");
          const repeated = api.prepareHistoricalSettingsRecord(prepared.record, defaults, tenantId);
          assert(!repeated.changed, "LICENSE-001→V2-Migration ist nicht idempotent");
          const newer = clone(defaults);
          newer.license.formatVersion = 3;
          assertThrows(() => api.normalizeSettingsRecord(newer, defaults, tenantId), "UNSUPPORTED_FORMAT", "Neuere Lizenzbindung");
        }
      },
      {
        name: "LICENSE-005 zeigt V2 und sicheren Runtime-Status ohne Aktivierungsbehauptung",
        run: async () => {
          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für LICENSE-002 konnte nicht geladen werden");
          const source = await response.text();
          const renderStart = source.indexOf("function renderLicenseSettings()");
          const renderEnd = source.indexOf("function renderTseSettings()", renderStart);
          assert(renderStart > 0 && renderEnd > renderStart, "Lizenz- und Geräteseite fehlt");
          const renderSource = source.slice(renderStart, renderEnd);
          assert(source.includes('{ id: "settings-license", icon: "✓", title: "Lizenz & Gerät"'), "Einstellungsbereich Lizenz & Gerät fehlt");
          assert(source.includes('else if (state.route === "settings-license") renderLicenseSettings()'), "Lizenzroute verwendet nicht die zentrale Ansicht");
          ["Lizenz-ID", "Lokaler Mandant", "Lizenzdienst-Mandant", "Produkt", "Verknüpfung", "Geräteschlüssel", "Schlüsselprüfung", "Sicherer Vergleichswert", "Lizenznachweis", "Technischer Status"].forEach(label => {
            assert(renderSource.includes(label), `Lizenzangabe fehlt: ${label}`);
          });
          ["licenseId", "localTenantId", "serverTenantId", "productId", "majorVersion", "linkedAt"].forEach(field => {
            assert(renderSource.includes(`license.${field}`), `Vorhandenes Lizenzfeld wird nicht angezeigt: ${field}`);
          });
          assert(!renderSource.includes("<form") && !renderSource.includes("<input"), "Lizenzdaten sind entgegen LICENSE-002 bearbeitbar");
          assert(!/license\.(?:licenseId|localTenantId|serverTenantId|productId|majorVersion|linkedAt)\s*=/.test(renderSource), "Lizenzansicht verändert das V2-Datenmodell");
          assert(!/<strong>Aktiv<\/strong>|Testzeitraum aktiv|Trial aktiv/i.test(renderSource), "Lokale Vorbereitung täuscht Lizenzautorität vor");
          assert(!/Gerät wechseln|Gerätebindung aufheben|neues Gerät aktivieren|Notfallübernahme/i.test(renderSource), "LICENSE-002 täuscht bereits einen Gerätewechsel vor");
        }
      },
      {
        name: "Erststart liefert null und initialisiert Settings-, Katalog-, Kunden-, Beleg- und Gutscheinschema",
        run: async () => {
          const persistence = context.makeClient("first-start");
          const database = await persistence.openDatabase();
          assertEqual(database.name, context.databaseName, "Falsche Testdatenbank geöffnet");
          assertEqual(database.version, api.constants.databaseVersion, "Falsche Schema-Version");
          assert(database.objectStoreNames.contains(api.constants.storeName), "Settings-Store fehlt");
          assert(database.objectStoreNames.contains(api.constants.catalogStoreName), "Katalog-Store fehlt");
          assert(database.objectStoreNames.contains(api.constants.customersStoreName), "Kunden-Store fehlt");
          assert(database.objectStoreNames.contains(api.constants.receiptsStoreName), "Receipt-Store fehlt");
          assert(database.objectStoreNames.contains(api.constants.vouchersStoreName), "Voucher-Store fehlt");
          assert(database.objectStoreNames.contains(api.constants.licenseRuntimeStoreName), "licenseRuntime-Store fehlt");
          assert(!database.objectStoreNames.contains("licenses"), "Es wurde ein paralleler Lizenz-Fachstore angelegt");
          assertEqual(await persistence.readSettings(), null, "Leerer Tenant muss null liefern");
          assertEqual(await persistence.readCatalog(), null, "Leerer Katalog-Tenant muss null liefern");
          assertEqual(await persistence.readCustomers(), null, "Leerer Kunden-Tenant muss null liefern");
          assertEqual(await persistence.readReceipts(), null, "Leerer Beleg-Tenant muss null liefern");
          assertEqual(await persistence.readVouchers(), null, "Leerer Gutschein-Tenant muss null liefern");
        }
      },
     {
       name: "Produktiver Erststart enthält ausschließlich neutrale technische Defaults und keine Geschäftsdaten",
        run: async () => {
          const runtime = freshRuntimeFixture("test-fresh-defaults");
          assertEqual(runtime.businessAreas.length, 1, "Erststart benötigt genau einen neutralen Geschäftsbereich");
          assertEqual(runtime.businessAreas[0].id, "general", "Erststart verwendet keinen neutralen Geschäftsbereich");
          assertEqual(runtime.serviceLocations.length, 1, "Erststart benötigt genau einen neutralen Leistungsort");
          assertEqual(runtime.categories.length, 0, "Erststart enthält Kategorien");
          assertEqual(Object.values(runtime.catalog).flat().length, 0, "Erststart enthält Leistungen oder Produkte");
          assertEqual(runtime.customers.length, 0, "Erststart enthält Kunden");
          assertEqual(runtime.receipts.length, 0, "Erststart enthält Belege, Stornos oder Gutschriften");
          assertEqual(runtime.vouchers.length, 0, "Erststart enthält Gutscheine");
          assertEqual(runtime.logoAssets.length, 0, "Erststart enthält Logoassets");
          assertEqual(runtime.company.name, "", "Erststart enthält eine Geschäftsbezeichnung");
          assertEqual(runtime.company.owner, "", "Erststart enthält eine Unternehmerangabe");
          assertEqual(runtime.company.contactPerson, "", "Erststart enthält einen Ansprechpartner");
          assertEqual(runtime.company.logo, null, "Erststart enthält ein Unternehmenslogo");
          assertEqual(runtime.receiptSettings.nextNumber, 1, "Erststart beginnt nicht mit der ersten Belegnummer");
          assertEqual(runtime.receiptSettings.yearPrefix, String(new Date().getFullYear()), "Erststart verwendet nicht das aktuelle Belegjahr");
          assertEqual(runtime.taxSettings.status, "undecided", "Steuerstatus wurde ohne Nutzerentscheidung vorbelegt");
          assertDeepEqual(runtime.paymentChoices.filter(choice => choice.active).map(choice => choice.id), ["cash", "ec", "voucher"], "Produktive Standard-Zahlungsarten sind inkonsistent");
          assertEqual(runtime.tseSettings.setupStatus, undefined, "Erststart täuscht eine eingerichtete TSE vor");
          assertEqual(runtime.historicalDemoRepairReceipts.length, 4, "Historische Reparaturquelle ist nicht exakt begrenzt");
          assertEqual(runtime.historicalDemoRepairVouchers.length, 4, "Historische Gutschein-Reparaturquelle ist nicht exakt begrenzt");
        }
     },
      {
        name: "LICENSE-005 migriert IndexedDB 5→6 ohne Fachstore-Veränderung",
        run: async () => {
          const databaseName = createDatabaseName();
          const tenantId = "test-license-schema-upgrade";
          const snapshot = completeTenantSnapshotFixture(tenantId);
          snapshot.stores.settings.license = legacyLicenseFixture(tenantId, {
            licenseId: "license_schema_legacy",
            deviceId: "device_schema_legacy"
          });
          await createLegacyV5Database(databaseName, snapshot.stores);
          const persistence = api.createSettingsPersistence({ databaseName, tenantId });
          try {
            const database = await persistence.openDatabase();
            assertEqual(database.version, 8, "IndexedDB wurde nicht auf Schema 8 angehoben");
            ["settingsStoreName", "catalogStoreName", "customersStoreName", "receiptsStoreName", "vouchersStoreName", "licenseRuntimeStoreName"].forEach(constantName => {
              assert(database.objectStoreNames.contains(api.constants[constantName]), `Store fehlt nach 5→6: ${constantName}`);
            });
            const legacySettings = await persistence.readSettings();
            assertEqual(legacySettings.license.formatVersion, 1, "Schema-Upgrade hat Settings außerhalb der Settingsmigration verändert");
            assertDeepEqual(await persistence.readCatalog(), snapshot.stores.catalog, "Schema-Upgrade veränderte den Katalogstore");
            assertDeepEqual(await persistence.readCustomers(), snapshot.stores.customers, "Schema-Upgrade veränderte den Kundenstore");
            assertDeepEqual(await persistence.readReceipts(), snapshot.stores.receipts, "Schema-Upgrade veränderte den Receipt-Store");
            assertDeepEqual(await persistence.readVouchers(), snapshot.stores.vouchers, "Schema-Upgrade veränderte den Voucher-Store");
            const defaults = recordFixture(tenantId, "completed");
            const prepared = api.prepareHistoricalSettingsRecord(legacySettings, defaults, tenantId);
            assert(prepared.compatible && prepared.changed, "LICENSE-001-Settings wurden nicht eindeutig vorbereitet");
            await persistence.writeSettings(prepared.record);
            const runtime = await persistence.ensureLicenseRuntime(prepared.record.license, { legacyLicense: legacySettings.license });
            assertEqual(runtime.deviceId, "device_schema_legacy", "Historische Geräte-ID ging bei 5→6 verloren");
            assertEqual(runtime.licenseId, "license_schema_legacy", "Historische Lizenz-ID ging bei 5→6 verloren");
          } finally {
            persistence.closeDatabase();
            await new Promise(resolve => setTimeout(resolve, 0));
            await deleteTestDatabase(databaseName);
          }
        }
      },
      {
        name: "LICENSE-005 persistiert genau ein nicht exportierbares P-256-Geräteschlüsselpaar",
        run: async () => {
          const persistence = context.makeClient("license-runtime-key");
          const settings = recordFixture(persistence.tenantId, "completed");
          await persistence.writeSettings(settings);
          const first = await persistence.ensureLicenseRuntime(settings.license);
          assertEqual(first.formatVersion, 1, "Falsche Runtime-Formatversion");
          assertEqual(first.localTenantId, persistence.tenantId, "Runtime gehört zum falschen Mandanten");
          assert(/^device_[A-Za-z0-9._:-]+$/.test(first.deviceId), "Runtime-Geräte-ID ist nicht opak");
          assertEqual(first.devicePrivateKey.type, "private", "Privater CryptoKey fehlt");
          assertEqual(first.devicePrivateKey.extractable, false, "Privater CryptoKey ist exportierbar");
          assertEqual(first.devicePrivateKey.algorithm.name, "ECDSA", "Falscher Schlüsselalgorithmus");
          assertEqual(first.devicePrivateKey.algorithm.namedCurve, "P-256", "Falsche Schlüsselkurve");
          assertEqual(first.devicePublicKey.extractable, true, "Öffentlicher CryptoKey ist nicht exportierbar");
          const publicJwk = await crypto.subtle.exportKey("jwk", first.devicePublicKey);
          assertEqual(publicJwk.crv, "P-256", "Öffentlicher Schlüssel ist nicht P-256");
          let privateExported = false;
          try {
            await crypto.subtle.exportKey("jwk", first.devicePrivateKey);
            privateExported = true;
          } catch (error) {
            assert(error instanceof DOMException || error instanceof Error, "Privatkey-Export scheiterte ohne Fehlerobjekt");
          }
          assert(!privateExported, "Privater Geräteschlüssel konnte exportiert werden");
          await licenseRuntimeApi.validateDeviceIdentity(first.devicePrivateKey, first.devicePublicKey, first.devicePublicKeyThumbprint);
          persistence.closeDatabase();
          const reloaded = await persistence.readLicenseRuntime();
          assertEqual(reloaded.deviceId, first.deviceId, "Geräte-ID wurde beim Reload regeneriert");
          assertEqual(reloaded.devicePublicKeyThumbprint, first.devicePublicKeyThumbprint, "Geräteschlüssel wurde beim Reload regeneriert");
          const ensuredAgain = await persistence.ensureLicenseRuntime(settings.license);
          assertEqual(ensuredAgain.devicePublicKeyThumbprint, first.devicePublicKeyThumbprint, "Wiederholte Initialisierung ersetzte den Schlüssel");
          await persistence.writeSettings({
            ...settings,
            licenseRuntime: { signedLicenseToken: "forbidden", devicePrivateKey: "forbidden" }
          });
          assert(!hasOwn(await persistence.readSettings(), "licenseRuntime"), "Runtime-Daten wurden in den Settings-Store übernommen");
          const complete = completeTenantSnapshotFixture(persistence.tenantId);
          complete.stores.settings = settings;
          await persistence.writeCatalog(complete.stores.catalog);
          await persistence.writeCustomers(complete.stores.customers);
          await persistence.writeReceipts(complete.stores.receipts);
          await persistence.writeVouchers(complete.stores.vouchers);
          const tenantSnapshot = await persistence.exportTenantSnapshot();
          assert(!hasOwn(tenantSnapshot.stores, "licenseRuntime"), "Tenant-Snapshot enthält den Runtime-Store");
          const serializedSnapshot = JSON.stringify(tenantSnapshot);
          ["devicePrivateKey", "devicePublicKey", "devicePublicKeyThumbprint", "signedLicenseToken", first.deviceId].forEach(forbidden => {
            assert(!serializedSnapshot.includes(forbidden), `Tenant-Snapshot enthält Runtime-Daten: ${forbidden}`);
          });
          await persistence.restoreTenantSnapshot(tenantSnapshot);
          const afterRestore = await persistence.readLicenseRuntime();
          assertEqual(afterRestore.devicePublicKeyThumbprint, first.devicePublicKeyThumbprint, "Restore ersetzte den lokalen Geräteschlüssel");
          const status = await persistence.inspectLocalLicenseRuntime(settings.license);
          assertEqual(status.code, "LICENSE_RUNTIME_READY_UNLINKED", "Lokale Runtime täuscht einen Serverstatus vor");
          assertEqual(status.keyValidationStatus, "verified", "Lokaler Signatur-Selbsttest wurde nicht bestätigt");
          assert(/^P256-[A-Za-z0-9_-]{8}-[A-Za-z0-9_-]{8}$/.test(status.keyComparisonValue), "Sicherer Schlüsselvergleichswert fehlt");
          assert(!status.keyComparisonValue.includes(first.deviceId), "Schlüsselvergleichswert enthält die Geräte-ID");
          assert(!status.keyComparisonValue.includes(first.devicePublicKeyThumbprint), "Schlüsselvergleichswert enthält den vollständigen Thumbprint");
          assert(!["deviceId", "devicePrivateKey", "devicePublicKey", "devicePublicKeyThumbprint", "signedLicenseToken"].some(key => hasOwn(status, key)), "Sicherer Runtime-Status enthält geheime oder exportgesperrte Felder");
          assertEqual(status.accessMode, "not_enforced", "LICENSE-005 aktiviert unerwartet eine Produktsperre");
        }
      },
      {
        name: "LICENSE-005 prüft Compact-JWS strikt und vertraut nie ungeprüften Signaturen",
        run: async () => {
          const encode = value => {
            const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
            let binary = "";
            bytes.forEach(byte => { binary += String.fromCharCode(byte); });
            return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
          };
          const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
          assertEqual(pair.publicKey.type, "public", "Test-Prüfschlüssel besitzt den falschen Typ");
          assertEqual(pair.publicKey.algorithm.name, "ECDSA", "Test-Prüfschlüssel besitzt den falschen Algorithmus");
          assertEqual(pair.publicKey.algorithm.namedCurve, "P-256", "Test-Prüfschlüssel besitzt die falsche Kurve");
          assert(Array.from(pair.publicKey.usages).includes("verify"), "Test-Prüfschlüssel besitzt keine Verify-Verwendung");
          const deviceIdentity = await licenseRuntimeApi.createDeviceIdentity();
          const header = { alg: "ES256", typ: "frecka-license+jwt", kid: "key_test_1" };
          const claims = {
            iss: "https://license.frecka.app", aud: "frecka-pwa", sub: "license_test_1", jti: "token_test_1",
            iat: 2000000000, nbf: 1999999940, exp: 2000100000, token_version: 1, tenant_id: "tenant_server_1",
            device_id: "device_test_1", binding_version: 1, license_status: "active", trial_ends_at: null,
            product_id: "frecka.core", product_major: 1, entitlements: ["frecka.core.v1"],
            next_validation_at: 2000050000, cnf: { jkt: deviceIdentity.publicKeyThumbprint }
          };
          const compact = async (tokenHeader = header, tokenClaims = claims, signingKey = pair.privateKey) => {
            const signingInput = encode(new TextEncoder().encode(JSON.stringify(tokenHeader))) + "." + encode(new TextEncoder().encode(JSON.stringify(tokenClaims)));
            const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, new TextEncoder().encode(signingInput)));
            return signingInput + "." + encode(signature);
          };
          const token = await compact();
          const inspected = licenseRuntimeApi.inspectCompactJws(token);
          assertEqual(inspected.verificationStatus, "unverified", "Strukturprüfung behandelte die Signatur als gültig");
          await assertRejects(() => licenseRuntimeApi.verifyCompactJws(token), "LICENSE_TOKEN_TRUST_MISSING", "Token ohne Vertrauensschlüssel");
          const verified = await licenseRuntimeApi.verifyCompactJws(token, {
            trustedPublicKey: pair.publicKey, expectedIssuer: claims.iss, expectedAudience: claims.aud,
            expectedLicenseId: claims.sub, expectedServerTenantId: claims.tenant_id, expectedDeviceId: claims.device_id,
            expectedBindingVersion: claims.binding_version, expectedPublicKeyThumbprint: claims.cnf.jkt, expectedKeyId: header.kid
          });
          assertEqual(verified.verificationStatus, "verified", "Testfixture wurde mit explizitem Vertrauensschlüssel nicht verifiziert");
          assertThrows(() => licenseRuntimeApi.inspectCompactJws("a.b"), "LICENSE_TOKEN_SYNTAX_INVALID", "Unvollständiges Compact-JWS");
          const algorithmNoneToken = await compact({ ...header, alg: "none" });
          const wrongAlgorithmToken = await compact({ ...header, alg: "HS256" });
          assertThrows(() => licenseRuntimeApi.inspectCompactJws(algorithmNoneToken), "LICENSE_TOKEN_ALGORITHM_UNSUPPORTED", "alg:none");
          assertThrows(() => licenseRuntimeApi.inspectCompactJws(wrongAlgorithmToken), "LICENSE_TOKEN_ALGORITHM_UNSUPPORTED", "Falscher Algorithmus");
          const noKid = { alg: "ES256", typ: "frecka-license+jwt" };
          const noKidToken = await compact(noKid);
          const criticalHeaderToken = await compact({ ...header, crit: ["x"] });
          const unknownClaimToken = await compact(header, { ...claims, unexpected: true });
          const wrongClaimTypeToken = await compact(header, { ...claims, exp: "2000100000" });
          assertThrows(() => licenseRuntimeApi.inspectCompactJws(noKidToken), "LICENSE_TOKEN_KEY_ID_MISSING", "Fehlendes kid");
          assertThrows(() => licenseRuntimeApi.inspectCompactJws(criticalHeaderToken), "LICENSE_TOKEN_HEADER_UNSUPPORTED", "Unbekannter kritischer Header");
          assertThrows(() => licenseRuntimeApi.inspectCompactJws(unknownClaimToken), "LICENSE_TOKEN_CLAIMS_UNSUPPORTED", "Unbekannter Claim");
          assertThrows(() => licenseRuntimeApi.inspectCompactJws(wrongClaimTypeToken), "LICENSE_TOKEN_CLAIMS_INVALID", "Falscher Claimtyp");
          const tokenSegments = token.split(".");
          const manipulated = tokenSegments[0] + "." + encode(new TextEncoder().encode(JSON.stringify({ ...claims, device_id: "device_other" }))) + "." + tokenSegments[2];
          await assertRejects(() => licenseRuntimeApi.verifyCompactJws(manipulated, {
            trustedPublicKey: pair.publicKey, expectedIssuer: claims.iss, expectedAudience: claims.aud,
            expectedLicenseId: claims.sub, expectedServerTenantId: claims.tenant_id, expectedDeviceId: "device_other",
            expectedBindingVersion: claims.binding_version, expectedPublicKeyThumbprint: claims.cnf.jkt, expectedKeyId: header.kid
          }), "LICENSE_TOKEN_SIGNATURE_INVALID", "Manipulierter Payload");
        }
      },
      {
        name: "Produktiver Erststart projiziert leere Fachstores ohne historische Reparaturdaten",
        run: async () => {
          const tenantId = "test-fresh-projection";
          const runtime = freshRuntimeFixture(tenantId);
          const settings = api.snapshotSettings(runtime, "not-started", tenantId);
          const catalog = api.snapshotCatalog(runtime, tenantId);
          const customers = api.snapshotCustomers(runtime, tenantId);
          const receipts = api.snapshotReceipts(runtime, tenantId);
          const vouchers = api.snapshotVouchers(runtime, tenantId);
          assertEqual(settings.setup.status, "not-started", "Ersteinrichtung wurde ohne Nutzeraktion abgeschlossen");
          assertEqual(settings.users.length, 1, "Technischer Erststartbenutzer fehlt");
          assertEqual(settings.users[0].tenantId, tenantId, "Erststartbenutzer gehört zum falschen Mandanten");
          assertEqual(settings.license.localTenantId, tenantId, "Lokale Lizenzgrundlage gehört zum falschen Mandanten");
          assertEqual(settings.tseSettings.enabled, false, "TSE ist beim Erststart aktiv");
          assertEqual(settings.tseSettings.setupStatus, "not-configured", "TSE ist beim Erststart als eingerichtet markiert");
          assertEqual(settings.logoAssets.length, 0, "Settings-Snapshot enthält Logoassets");
          assertEqual(catalog.categories.length, 0, "Katalog-Snapshot enthält Kategorien");
          assertEqual(catalog.items.length, 0, "Katalog-Snapshot enthält Positionen");
          assertEqual(customers.customers.length, 0, "Kunden-Snapshot enthält Datensätze");
          assertEqual(receipts.receipts.length, 0, "Beleg-Snapshot enthält Datensätze");
          assertEqual(vouchers.vouchers.length, 0, "Gutschein-Snapshot enthält Datensätze");
        }
      },
      {
        name: "Erste Beleg-, Storno-, Gutschrift- und Gutscheinverkaufsnummer starten kollisionsfrei",
        run: async () => {
          const year = String(new Date().getFullYear());
          const receiptClient = context.makeClient("fresh-number-receipt");
          const receiptRuntime = freshRuntimeFixture(receiptClient.tenantId);
          const receiptSettings = api.snapshotSettings(receiptRuntime, "completed", receiptClient.tenantId);
          const emptyReceipts = api.snapshotReceipts(receiptRuntime, receiptClient.tenantId);
          const normal = await receiptClient.commitReceipt(receiptDraftFixture("fresh-receipt", {
            businessAreaId: "general",
            businessAreaSnapshot: { id: "general", label: "Geschäftsbereich", visibleName: "" },
            serviceLocationId: "location-default",
            serviceLocationSnapshot: { id: "location-default", name: "Leistungsort", street: "", zip: "", city: "" },
            companySnapshot: { name: "", owner: "", street: "", zip: "", city: "" },
            customerId: null,
            customerSnapshot: null
          }), receiptSettings, emptyReceipts);
          assertEqual(normal.receipt.number, `${year}-000001`, "Erster normaler Beleg erhielt nicht Nummer 000001");
          assertEqual(normal.settingsRecord.receiptSettings.nextNumber, 2, "Nummernstand wurde nach erstem Beleg nicht fortgeschrieben");

          const cancellation = await receiptClient.commitReceiptCorrection(normal.receipt.number, {
            id: "fresh-cancellation",
            type: "cancellation",
            total: -39,
            items: normal.receipt.items.map(item => ({ ...item, unitPrice: -39, total: -39 })),
            completedAt: new Date().toISOString(),
            sourceActivityDate: "14.08.2026 · 12:00",
            activity: []
          }, normal.receiptsRecord);
          assertEqual(cancellation.receipt.number, `ST-${year}-000101`, "Erstes Storno erhielt nicht Nummer 000101");

          const creditClient = context.makeClient("fresh-number-credit");
          const creditRuntime = freshRuntimeFixture(creditClient.tenantId);
          const creditSettings = api.snapshotSettings(creditRuntime, "completed", creditClient.tenantId);
          const creditSource = await creditClient.commitReceipt(receiptDraftFixture("fresh-credit-source", {
            businessAreaId: "general",
            customerId: null,
            customerSnapshot: null
          }), creditSettings, api.snapshotReceipts(creditRuntime, creditClient.tenantId));
          const credit = await creditClient.commitReceiptCorrection(creditSource.receipt.number, {
            id: "fresh-credit",
            type: "credit",
            total: -10,
            items: [{ title: "Gutschrift", quantity: 1, unitPrice: -10, total: -10 }],
            completedAt: new Date().toISOString(),
            sourceActivityDate: "14.08.2026 · 12:05",
            isFull: false
          }, creditSource.receiptsRecord);
          assertEqual(credit.receipt.number, `GS-${year}-000101`, "Erste Gutschrift erhielt nicht Nummer 000101");

          const voucherClient = context.makeClient("fresh-number-voucher");
          const voucherRuntime = freshRuntimeFixture(voucherClient.tenantId);
          const voucherSettings = api.snapshotSettings(voucherRuntime, "completed", voucherClient.tenantId);
          const voucherRecord = api.snapshotVouchers(voucherRuntime, voucherClient.tenantId);
          const voucher = voucherDraftFixture("fresh-voucher", {
            reference: "vch_fresh_start",
            code: "FRKA-FRESH-001",
            customer: null,
            customerId: null,
            customerSnapshot: null
          });
          const voucherReceipt = voucherSaleReceiptFixture(voucher);
          voucherReceipt.businessAreaId = "general";
          voucherReceipt.customerId = null;
          voucherReceipt.customerSnapshot = null;
          const voucherSale = await voucherClient.commitVoucherSale(
            voucherReceipt,
            voucher,
            voucherSettings,
            api.snapshotReceipts(voucherRuntime, voucherClient.tenantId),
            voucherRecord
          );
          assertEqual(voucherSale.receipt.number, `${year}-000001`, "Erster Gutscheinverkaufsbeleg erhielt nicht Nummer 000001");
          assertEqual(voucherSale.voucher.saleReceipt.number, `${year}-000001`, "Gutschein und Verkaufsbeleg sind nicht identisch nummeriert verknüpft");
        }
      },
      {
        name: "Bestehende Mandantendaten haben Vorrang vor neutralen Erststartdefaults",
        run: async () => {
          const tenantId = "test-existing-tenant-preserved";
          const runtime = freshRuntimeFixture(tenantId);
          const defaultsSettings = api.snapshotSettings(runtime, "not-started", tenantId);
          const defaultsCatalog = api.snapshotCatalog(runtime, tenantId);
          const defaultsCustomers = api.snapshotCustomers(runtime, tenantId);
          const defaultsReceipts = api.snapshotReceipts(runtime, tenantId);
          const defaultsVouchers = api.snapshotVouchers(runtime, tenantId);
          const existingSettings = recordFixture(tenantId, "completed");
          const existingCatalog = catalogRecordFixture(tenantId);
          const existingCustomers = customersRecordFixture(tenantId);
          const existingReceipts = receiptsRecordFixture(tenantId);
          const existingVouchers = vouchersRecordFixture(tenantId);

          const settings = api.normalizeSettingsRecord(existingSettings, defaultsSettings, tenantId).record;
          const catalog = api.normalizeCatalogRecord(existingCatalog, defaultsCatalog, settings.businessAreas, tenantId).record;
          const customers = api.normalizeCustomersRecord(existingCustomers, defaultsCustomers, tenantId).record;
          const receipts = api.normalizeReceiptsRecord(existingReceipts, defaultsReceipts, tenantId).record;
          const vouchers = api.normalizeVouchersRecord(existingVouchers, defaultsVouchers, tenantId).record;
          assertEqual(settings.company.name, "Teststudio Nord", "Bestehende Unternehmensdaten wurden durch Erststartdefaults ersetzt");
          assertEqual(settings.receiptSettings.nextNumber, 77, "Bestehender Nummernstand wurde durch Erststartdefaults ersetzt");
          assertEqual(settings.setup.status, "completed", "Bestehender Einrichtungsstatus wurde zurückgesetzt");
          assertEqual(catalog.items.length, 2, "Bestehender Katalog wurde geleert");
          assertEqual(customers.customers.length, 2, "Bestehende Kunden wurden geleert");
          assertEqual(receipts.receipts.length, 1, "Bestehende Belege wurden geleert");
          assertEqual(vouchers.vouchers.length, 1, "Bestehende Gutscheine wurden geleert");
        }
      },
      {
        name: "Vollständiger Settings-Roundtrip",
        run: async () => {
          const persistence = context.makeClient("roundtrip");
          const requested = recordFixture(persistence.tenantId, "started");
          const written = await persistence.writeSettings(requested);
          const stored = await persistence.readSettings();
          assertEqual(stored.company.name, "Teststudio Nord", "Unternehmensdaten fehlen");
          assertEqual(stored.company.street, "Testweg 10", "Unternehmensanschrift fehlt");
          assertEqual(stored.taxSettings.defaultRate, 19, "Steuerstatus fehlt");
          assertDeepEqual(stored.taxSettings.rates.filter(rate => rate.active).map(rate => rate.rate), [19, 7], "Aktive Steuersätze fehlen");
          assertEqual(stored.receiptSettings.nextNumber, 77, "Nummernkreis fehlt");
          assertEqual(stored.receiptSettings.footerText, "Test-Fußtext", "Beleg-Fußtext fehlt");
          assertEqual(stored.receiptSettings.thankYouText, "Danke für den Test.", "Beleg-Dankestext fehlt");
          assertEqual(stored.receiptSettings.currency, "EUR", "Währung wurde verändert");
          assertDeepEqual(stored.paymentChoices.map(choice => choice.id), ["cash", "ec", "voucher"], "Zahlungsarten oder Reihenfolge fehlen");
          assertEqual(stored.businessAreas.length, 2, "Geschäftsbereiche fehlen");
          assertEqual(stored.businessAreas.find(area => area.isDefault)?.id, "hair", "Standard-Geschäftsbereich fehlt");
          assertDeepEqual(stored.businessAreas.find(area => area.id === "hair")?.logo, logoReferenceFixture(businessAreaLogoFixture()), "Geschäftsbereichslogo-Referenz fehlt");
          assertDeepEqual(stored.logoAssets.find(asset => asset.assetId === "business-logo-hair"), logoAssetFixture(businessAreaLogoFixture()), "Geschäftsbereichslogo-Asset fehlt");
          assertEqual(stored.setup.status, "started", "Einrichtungsstatus fehlt");
          assertEqual(stored.users.length, 1, "Lokaler Benutzer fehlt im Settings-Store");
          assertEqual(stored.users[0].tenantId, persistence.tenantId, "Persistierter Benutzer gehört zum falschen Mandanten");
          assertEqual(stored.activeUserId, stored.users[0].id, "Persistierter aktiver Benutzer ist nicht eindeutig");
          assertEqual(stored.license.localTenantId, persistence.tenantId, "Persistierte Lizenz gehört zum falschen Mandanten");
          assertEqual(stored.license.licenseId, requested.license.licenseId, "Persistierte Lizenz-ID wurde verändert");
          assertEqual(stored.license.serverTenantId, null, "Persistierte Lizenz täuscht eine Serverbindung vor");
          assert(!Number.isNaN(Date.parse(written.updatedAt)), "updatedAt ist kein gültiger Zeitstempel");
          assertEqual(stored.tenantId, persistence.tenantId, "Tenant-ID wurde verändert");
        }
      },
      {
        name: "Mehrere Leistungsorte, n:m-Zuordnung und Standardorte",
        run: async () => {
          const persistence = context.makeClient("locations");
          const defaults = recordFixture(persistence.tenantId);
          await persistence.writeSettings(defaults);
          const stored = await persistence.readSettings();
          const normalized = api.normalizeSettingsRecord(stored, defaults, persistence.tenantId).record;
          assertEqual(normalized.serviceLocations.length, 2, "Leistungsortliste wurde reduziert");
          assertDeepEqual(normalized.serviceLocations[0].businessAreaIds, ["hair", "coaching"], "n:m-Zuordnung am ersten Ort fehlt");
          assertDeepEqual(normalized.serviceLocations[1].businessAreaIds, ["hair", "coaching"], "n:m-Zuordnung am zweiten Ort fehlt");
          assertEqual(normalized.businessAreas.find(area => area.id === "hair")?.defaultServiceLocationId, "location-company", "Standardort Friseur falsch");
          assertEqual(normalized.businessAreas.find(area => area.id === "coaching")?.defaultServiceLocationId, "location-mobile", "Standardort Coaching falsch");
          assertEqual(normalized.serviceLocations[1].street, "Nebenstraße", "Eigene Leistungsortadresse fehlt");
          assertEqual(normalized.company.street, "Testweg 10", "Unternehmensanschrift wurde mit Leistungsort vermischt");
        }
      },
      {
        name: "Ungültige Referenzen und fehlende Felder werden sicher normalisiert",
        run: async () => {
          const tenantId = "test-normalization";
          const defaults = recordFixture(tenantId, "not-started");
          const raw = {
            formatVersion: 1,
            tenantId,
            company: { name: "Teilbestand" },
            businessAreas: [
              { id: "hair", label: "Friseur", active: false, isDefault: false, defaultServiceLocationId: "missing-location" },
              { id: "coaching", label: "Coaching", active: false, isDefault: true, defaultServiceLocationId: "ghost-location" }
            ],
            serviceLocations: [
              {
                id: "location-repair",
                name: "Reparierter Ort",
                addressMode: "own",
                street: "Prüfstraße",
                houseNumber: "1",
                zip: "11111",
                city: "Prüfort",
                active: true,
                businessAreaIds: ["hair", "unknown-area"]
              }
            ]
          };
          const normalized = api.normalizeSettingsRecord(raw, defaults, tenantId);
          const hair = normalized.record.businessAreas.find(area => area.id === "hair");
          assert(normalized.record.businessAreas.some(area => area.active), "Kein aktiver Geschäftsbereich wiederhergestellt");
          assertEqual(normalized.record.businessAreas.filter(area => area.active && area.isDefault).length, 1, "Aktiver Standardbereich nicht eindeutig");
          assertDeepEqual(normalized.record.serviceLocations[0].businessAreaIds, ["hair"], "Verwaiste Geschäftsbereichsreferenz blieb erhalten");
          assertEqual(hair.defaultServiceLocationId, "location-repair", "Verwaister Standard-Leistungsort wurde nicht repariert");
          assert(normalized.record.taxSettings.rates.length > 0, "Fehlende Steuersätze nicht ergänzt");
          assert(normalized.record.paymentChoices.some(choice => choice.id !== "voucher" && choice.active), "Keine normale Zahlungsart wiederhergestellt");
          assertEqual(normalized.record.receiptSettings.yearPrefix, "2030", "Fehlende Belegeinstellungen nicht ergänzt");
          assertEqual(normalized.record.setup.status, "not-started", "Fehlender Setupstatus nicht sicher ergänzt");
          assertEqual(hair.logo, null, "Historischer Geschäftsbereich ohne Logo wurde nicht kompatibel normalisiert");
          assert(normalized.repairs.length > 0, "Reparaturen wurden nicht dokumentiert");
        }
      },
      {
        name: "Unbekannte Felder bleiben bei Read-Modify-Write erhalten",
        run: async () => {
          const persistence = context.makeClient("unknown-fields");
          const initial = recordFixture(persistence.tenantId);
          initial.futureRoot = { schemaHint: "vNext" };
          initial.company.futureCompanyFlag = "behalten";
          initial.businessAreas[0].futureAreaField = { enabled: true };
          await persistence.writeSettings(initial);

          const next = recordFixture(persistence.tenantId, "completed");
          next.company.name = "Geänderter Name";
          await persistence.writeSettings(next);
          const stored = await persistence.readSettings();
          const normalized = api.normalizeSettingsRecord(stored, next, persistence.tenantId).record;

          assertDeepEqual(stored.futureRoot, { schemaHint: "vNext" }, "Unbekanntes Root-Feld ging verloren");
          assertEqual(stored.company.futureCompanyFlag, "behalten", "Unbekanntes Unternehmensfeld ging verloren");
          assertDeepEqual(stored.businessAreas.find(area => area.id === "hair")?.futureAreaField, { enabled: true }, "Unbekanntes Bereichsfeld ging verloren");
          assertEqual(stored.company.name, "Geänderter Name", "Bekannte Änderung wurde nicht geschrieben");
          assertDeepEqual(normalized.futureRoot, { schemaHint: "vNext" }, "Normalisierung verwarf unbekanntes Root-Feld");
          assertEqual(normalized.company.futureCompanyFlag, "behalten", "Normalisierung verwarf unbekanntes Unternehmensfeld");
        }
      },
      {
        name: "Unternehmens- und Bereichslogos bleiben zentral, ausgeschlossene Geschäftsdaten und Logo-Nebenfelder nicht",
        run: async () => {
          const persistence = context.makeClient("scope-exclusions");
          const record = recordFixture(persistence.tenantId);
          Object.assign(record, {
            catalog: { hair: [{ id: "forbidden-catalog" }] },
            categories: [{ id: "forbidden-category" }],
            customers: [{ id: "forbidden-customer" }],
            receipts: [{ number: "FORBIDDEN-1" }],
            vouchers: [{ code: "FORBIDDEN" }],
            histories: [{ id: "forbidden-history" }],
            drafts: [{ id: "forbidden-draft" }],
            cancellations: [{ id: "forbidden-cancellation" }],
            credits: [{ id: "forbidden-credit" }]
          });
          record.company.logo.privateMetadata = "forbidden";
          record.company.logoData = "forbidden";
          record.businessAreas[0].logo.privateMetadata = "forbidden";
          record.logoAssets[0].privateMetadata = "forbidden";
          record.businessAreas[0].logoFile = "forbidden";
          record.businessAreas[0].logoMode = "custom";

          await persistence.writeSettings(record);
          const stored = await persistence.readSettings();
          const forbiddenKeys = ["catalog", "categories", "customers", "receipts", "vouchers", "histories", "drafts", "cancellations", "credits"];
          forbiddenKeys.forEach(key => assert(!hasOwn(stored, key), `Ausgeschlossenes Root-Feld gespeichert: ${key}`));
          assertDeepEqual(stored.company.logo, logoReferenceFixture(), "Unternehmenslogo-Referenz wurde nicht verlustfrei gespeichert");
          assert(!hasOwn(stored.company.logo, "privateMetadata"), "Unbekanntes Logo-Nebenfeld wurde gespeichert");
          assert(!hasOwn(stored.company, "logoData"), "Nicht freigegebenes Logo-Nebenfeld wurde gespeichert");
          assertDeepEqual(stored.businessAreas[0].logo, logoReferenceFixture(businessAreaLogoFixture()), "Geschäftsbereichslogo-Referenz wurde nicht verlustfrei gespeichert");
          assert(!hasOwn(stored.businessAreas[0].logo, "privateMetadata") && !hasOwn(stored.businessAreas[0], "logoFile"), "Nicht freigegebenes Bereichslogo-Nebenfeld wurde gespeichert");
          assert(!hasOwn(stored.logoAssets[0], "privateMetadata"), "Nicht freigegebenes Asset-Nebenfeld wurde gespeichert");
          assertEqual(stored.businessAreas[0].logoMode, "custom", "Zulässige Branding-Einstellung wurde entfernt");
        }
      },
      {
        name: "Unternehmensfelder, getrennte Adresse und eigener Änderungszeitpunkt überstehen Reload",
        run: async () => {
          const persistence = context.makeClient("company-settings-roundtrip");
          const unrelatedRuntime = runtimeFixture();
          const beforeUnrelatedChange = api.snapshotSettings(unrelatedRuntime, "completed", persistence.tenantId);
          unrelatedRuntime.receiptSettings.footerText = "Nur eine Belegtextänderung";
          const afterUnrelatedChange = api.snapshotSettings(unrelatedRuntime, "completed", persistence.tenantId);
          assertEqual(afterUnrelatedChange.company.updatedAt, beforeUnrelatedChange.company.updatedAt, "Unabhängige Einstellungsänderung hat company.updatedAt verändert");
          const record = recordFixture(persistence.tenantId, "completed");
          Object.assign(record.company, {
            name: "Testatelier",
            owner: "Tessa Beispiel",
            contactPerson: "Alex Kontakt",
            street: "Neue Straße",
            houseNumber: "17 a",
            zip: "93047",
            city: "Regensburg",
            country: "Deutschland",
            phone: "+49 941 123",
            email: "kontakt@test.invalid",
            website: "https://test.invalid/",
            taxNumber: "123/456/789",
            vatId: "DE123456789",
            updatedAt: "2030-02-03T04:05:00.000Z"
          });
          await persistence.writeSettings(record);
          persistence.closeDatabase();
          const stored = await persistence.readSettings();
          assertEqual(stored.company.contactPerson, "Alex Kontakt", "Ansprechpartner ging beim Reload verloren");
          assertEqual(stored.company.street, "Neue Straße", "Straße ging beim Reload verloren");
          assertEqual(stored.company.houseNumber, "17 a", "Hausnummer ging beim Reload verloren");
          assertEqual(stored.company.website, "https://test.invalid/", "Website ging beim Reload verloren");
          assertEqual(stored.company.updatedAt, "2030-02-03T04:05:00.000Z", "Unternehmens-Änderungszeitpunkt wurde überschrieben");
          assertDeepEqual(stored.company.logo, logoReferenceFixture(), "Unternehmenslogo-Referenz ging beim Reload verloren");
          assertDeepEqual(stored.businessAreas.find(area => area.id === "hair")?.logo, logoReferenceFixture(businessAreaLogoFixture()), "Geschäftsbereichslogo-Referenz ging beim Reload verloren");
          assertDeepEqual(api.resolveLogoAsset("company-logo", stored.logoAssets), logoAssetFixture(), "Unternehmenslogo-Asset ging beim Reload verloren");
        }
      },
      {
        name: "Historische kombinierte Straßenangaben werden nicht automatisch zerlegt",
        run: async () => {
          const tenantId = "test-company-legacy-address";
          const defaults = recordFixture(tenantId);
          const legacy = clone(defaults);
          legacy.company.street = "Historischer Weg 12 B";
          delete legacy.company.houseNumber;
          const normalized = api.normalizeSettingsRecord(legacy, defaults, tenantId).record;
          assertEqual(normalized.company.street, "Historischer Weg 12 B", "Historische Straßenangabe wurde verändert");
          assertEqual(normalized.company.houseNumber, "", "Historische Straßenangabe wurde automatisch zerlegt");
        }
      },
      {
        name: "Unternehmens- und Geschäftsbereichslogos akzeptieren nur vollständige PNG-/JPEG-Daten bis 1 MB",
        run: async () => {
          assertDeepEqual(api.normalizeCompanyLogo(companyLogoFixture()), companyLogoFixture(), "Gültiges PNG-Logo wurde verändert");
          const companyJpeg = businessAreaLogoFixture({ id: "company-logo-jpeg", name: "Unternehmenslogo.jpg" });
          assertDeepEqual(api.normalizeCompanyLogo(companyJpeg), companyJpeg, "Gültiges JPEG-Unternehmenslogo wurde verändert");
          assertDeepEqual(api.normalizeBusinessAreaLogo(businessAreaLogoFixture()), businessAreaLogoFixture(), "Gültiges JPEG-Bereichslogo wurde verändert");
          assertThrows(
            () => api.normalizeCompanyLogo(companyLogoFixture({ mimeType: "image/svg+xml", dataUrl: "data:image/svg+xml;base64,PHN2Zy8+" })),
            "INVALID_DATA",
            "SVG-Unternehmenslogo"
          );
          assertThrows(
            () => api.normalizeCompanyLogo(companyLogoFixture({ size: api.constants.companyLogoMaxBytes + 1 })),
            "INVALID_DATA",
            "Unternehmenslogo über 1 MB"
          );
          assertThrows(
            () => api.normalizeCompanyLogo(companyLogoFixture({ size: 7 })),
            "INVALID_DATA",
            "Abweichende Logogröße"
          );
          assertThrows(
            () => api.normalizeCompanyLogo(companyLogoFixture({ mimeType: "image/jpeg", dataUrl: `data:image/jpeg;base64,${tinyPngBase64}` })),
            "INVALID_DATA",
            "Falsche Logo-Dateisignatur"
          );
          assertThrows(
            () => api.normalizeCompanyLogo(companyLogoFixture({ formatVersion: 2 })),
            "UNSUPPORTED_FORMAT",
            "Zukünftiges Logoformat"
          );
          assertThrows(
            () => api.normalizeBusinessAreaLogo(businessAreaLogoFixture({ mimeType: "image/png", dataUrl: `data:image/png;base64,${tinyJpegBase64}` })),
            "INVALID_DATA",
            "Falsche Bereichslogo-Dateisignatur"
          );
          assertThrows(
            () => api.normalizeBusinessAreaLogo(businessAreaLogoFixture({ size: api.constants.companyLogoMaxBytes + 1 })),
            "INVALID_DATA",
            "Geschäftsbereichslogo über 1 MB"
          );
        }
      },
      {
        name: "Logo-Asset-Register versioniert, dedupliziert und erhält historische Versionen",
        run: async () => {
          const migrated = api.snapshotSettings(runtimeFixture(), "completed", "test-logo-assets");
          assertEqual(migrated.logoAssets.length, 3, "Bestehende BRANDING-001-Logos wurden nicht in das Register übernommen");
          assertDeepEqual(migrated.company.logo, logoReferenceFixture(), "Unternehmenslogo blieb als Rohbild statt Referenz gespeichert");
          assert(!hasOwn(migrated.company.logo, "dataUrl"), "Aktive Unternehmenszuordnung enthält Bildrohdaten");
          assert(api.resolveLogoAsset(migrated.company.logo.assetId, migrated.logoAssets)?.dataUrl, "Unternehmenslogo ist nicht zentral auflösbar");

          const replacement = companyLogoFixture({
            id: "company-logo-v2",
            name: "Logo-neu.png",
            size: atob(alternatePngBase64).length,
            dataUrl: `data:image/png;base64,${alternatePngBase64}`,
            updatedAt: "2030-02-01T10:00:00.000Z"
          });
          const registered = api.registerLogoAsset(migrated.logoAssets, replacement);
          assert(registered.added, "Ersetztes Logo erzeugte keine neue Asset-Version");
          assertEqual(registered.assets.length, 4, "Historische Asset-Version wurde beim Ersetzen gelöscht");
          assert(api.resolveLogoAsset("company-logo", registered.assets)?.dataUrl, "Altes Unternehmenslogo ist nach Ersetzen nicht mehr auflösbar");
          assert(api.resolveLogoAsset("company-logo-v2", registered.assets)?.dataUrl, "Neues Unternehmenslogo ist nicht auflösbar");

          const duplicate = api.registerLogoAsset(registered.assets, companyLogoFixture({ id: "unused-duplicate-id", updatedAt: "2030-03-01T10:00:00.000Z" }));
          assert(!duplicate.added, "Identischer Bildinhalt wurde unnötig dupliziert");
          assertEqual(duplicate.reference.assetId, "company-logo", "Identisches Logo verwendete nicht die bestehende Asset-ID");
          assertEqual(duplicate.assets.length, registered.assets.length, "Identisches Logo vergrößerte das Register");

          const afterRemoval = clone(registered.assets);
          assert(api.resolveLogoAsset("company-logo", afterRemoval), "Entfernen der aktiven Zuordnung würde das historische Asset verlieren");
          assertEqual(api.resolveLogoAsset("missing-logo", afterRemoval), null, "Fehlende Asset-ID liefert keinen sicheren Fallback");
          const corrupt = clone(afterRemoval);
          corrupt[0].dataUrl = "data:image/png;base64,AAAA";
          assertEqual(api.resolveLogoAsset(corrupt[0].assetId, corrupt), null, "Defektes Asset liefert keinen sicheren Fallback");

          const emptyRuntime = runtimeFixture();
          emptyRuntime.company.logo = null;
          emptyRuntime.businessAreas.forEach(area => { area.logo = null; area.logoMode = "company"; });
          delete emptyRuntime.logoAssets;
          const historicalWithoutRegister = api.snapshotSettings(emptyRuntime, "completed", "test-logo-assets-empty");
          assertDeepEqual(historicalWithoutRegister.logoAssets, [], "Historische Einstellungen ohne Logos erhielten künstliche Assets");

          const persistence = context.makeClient("logo-assets-immutable");
          const tenantRecord = api.snapshotSettings(runtimeFixture(), "completed", persistence.tenantId);
          await persistence.writeSettings(tenantRecord);
          const withoutHistoricalAsset = clone(tenantRecord);
          withoutHistoricalAsset.logoAssets = withoutHistoricalAsset.logoAssets.slice(1);
          const retained = await persistence.writeSettings(withoutHistoricalAsset);
          assert(api.resolveLogoAsset("company-logo", retained.logoAssets), "Normaler Settings-Write löschte eine historische Asset-Version");
          const conflicting = clone(retained);
          conflicting.logoAssets[0].dataUrl = `data:image/png;base64,${alternatePngBase64}`;
          conflicting.logoAssets[0].size = atob(alternatePngBase64).length;
          await assertRejects(() => persistence.writeSettings(conflicting), "INVALID_DATA", "Überschreiben einer bestehenden Asset-ID");
        }
      },
      {
        name: "Vollständiger Katalog-Roundtrip",
        run: async () => {
          const persistence = context.makeClient("catalog-roundtrip");
          const requested = catalogRecordFixture(persistence.tenantId);
          await persistence.writeCatalog(requested);
          const stored = await persistence.readCatalog();
          const normalized = api.normalizeCatalogRecord(stored, requested, catalogRuntimeFixture().businessAreas, persistence.tenantId).record;
          const service = normalized.items.find(item => item.id === "service-cut");
          const product = normalized.items.find(item => item.id === "product-care");
          assertEqual(normalized.categories.length, 2, "Kategorien fehlen");
          assertEqual(service?.categoryId, "hair-services", "Kategoriezuordnung der Leistung fehlt");
          assertEqual(service?.businessAreaId, "hair", "Geschäftsbereichszuordnung der Leistung fehlt");
          assertEqual(service?.favorite, true, "Favoritenstatus ging verloren");
          assertEqual(service?.sortOrder, 20, "Leistungssortierung ging verloren");
          assertEqual(product?.active, false, "Deaktivierter Produktstatus ging verloren");
          assertEqual(product?.sortOrder, 10, "Produktsortierung ging verloren");
          assertEqual(product?.needsReview, true, "Prüfstatus ging verloren");
          assertEqual(product?.sku, "SKU-TEST", "Produktartikelnummer ging verloren");
          assertEqual(product?.unit, "Stück", "Produkteinheit ging verloren");
          assert(Number.isInteger(product?.priceCents), "priceCents ist nicht ganzzahlig");
          assertEqual(normalized.templateImports[0]?.templateId, "hair", "Vorlagenimportstatus fehlt");
          assertEqual(normalized.templateImports[0]?.version, 1, "Vorlagenversion fehlt");
          assert(!normalized.items.some(item => item.type === "voucher"), "Gutschein wurde unzulässig im Katalog gespeichert");
        }
      },
      {
        name: "Katalog erhält unbekannte Felder und schließt Fremddaten aus",
        run: async () => {
          const persistence = context.makeClient("catalog-unknown-fields");
          const first = catalogRecordFixture(persistence.tenantId);
          first.futureCatalogField = { versionHint: 2 };
          first.categories[0].futureCategoryField = "behalten";
          first.items[0].futureItemField = { enabled: true };
          first.items[0].imageData = "nicht-speichern";
          first.customers = [{ id: "forbidden-customer" }];
          first.receipts = [{ number: "forbidden-receipt" }];
          await persistence.writeCatalog(first);

          const next = catalogRecordFixture(persistence.tenantId);
          next.items[0].name = "Manuell geändert";
          await persistence.writeCatalog(next);
          const stored = await persistence.readCatalog();
          const normalized = api.normalizeCatalogRecord(stored, next, catalogRuntimeFixture().businessAreas, persistence.tenantId).record;
          assertDeepEqual(stored.futureCatalogField, { versionHint: 2 }, "Unbekanntes Katalogfeld ging verloren");
          assertEqual(stored.categories[0].futureCategoryField, "behalten", "Unbekanntes Kategorienfeld ging verloren");
          assertDeepEqual(stored.items[0].futureItemField, { enabled: true }, "Unbekanntes Eintragsfeld ging verloren");
          assertEqual(stored.items[0].name, "Manuell geändert", "Manuelle Änderung wurde überschrieben");
          assert(!hasOwn(stored.items[0], "imageData"), "Bilddaten wurden unzulässig gespeichert");
          assert(!hasOwn(stored, "customers") && !hasOwn(stored, "receipts"), "Fremde Geschäftsdaten wurden im Katalog gespeichert");
          assertDeepEqual(normalized.futureCatalogField, { versionHint: 2 }, "Normalisierung verwarf unbekanntes Katalogfeld");
        }
      },
      {
        name: "Ungültige Katalogreferenzen werden sicher behandelt",
        run: async () => {
          const tenantId = "test-catalog-normalization";
          const defaults = catalogRecordFixture(tenantId);
          const raw = clone(defaults);
          raw.items[0].categoryId = "missing-category";
          raw.items[1].businessAreaId = "missing-area";
          raw.items[1].categoryId = "hair-products";
          raw.items[1].priceCents = 14.9;
          raw.categories.push({
            id: "orphan-category", businessAreaId: "missing-area", name: "Verwaist", type: "product",
            active: true, sortOrder: 30, createdAt: "2030-01-01T10:00:00.000Z", updatedAt: "2030-01-01T10:00:00.000Z"
          });
          const normalized = api.normalizeCatalogRecord(raw, defaults, catalogRuntimeFixture().businessAreas, tenantId);
          const service = normalized.record.items.find(item => item.id === "service-cut");
          const orphanProduct = normalized.record.items.find(item => item.id === "product-care");
          const orphanCategory = normalized.record.categories.find(category => category.id === "orphan-category");
          assertEqual(service.categoryId, null, "Ungültige Kategorie-Referenz blieb erhalten");
          assertEqual(orphanProduct.active, false, "Eintrag eines fehlenden Geschäftsbereichs blieb aktiv");
          assertEqual(orphanProduct.categoryId, null, "Bereichsfremde Kategorie-Referenz blieb erhalten");
          assert(Number.isInteger(orphanProduct.priceCents), "Ungültiger Centbetrag wurde nicht repariert");
          assertEqual(orphanCategory.active, false, "Kategorie eines fehlenden Geschäftsbereichs blieb aktiv");
          assert(normalized.repairs.length > 0, "Katalogreparaturen wurden nicht ausgewiesen");
        }
      },
      {
        name: "Vorlagenimport bleibt dedupliziert und nachvollziehbar",
        run: async () => {
          const tenantId = "test-template-deduplication";
          const defaults = catalogRecordFixture(tenantId);
          const raw = clone(defaults);
          raw.items[0].name = "Manuell angepasster Vorlageneintrag";
          raw.items.push(clone(raw.items[0]));
          raw.categories.push(clone(raw.categories[0]));
          raw.templateImports.push(clone(raw.templateImports[0]));
          const normalized = api.normalizeCatalogRecord(raw, defaults, catalogRuntimeFixture().businessAreas, tenantId).record;
          assertEqual(normalized.items.filter(item => item.id === "service-cut").length, 1, "Erneuter Import erzeugte einen doppelten Eintrag");
          assertEqual(normalized.categories.filter(category => category.id === "hair-services").length, 1, "Erneuter Import erzeugte eine doppelte Kategorie");
          assertEqual(normalized.templateImports.filter(entry => entry.businessAreaId === "hair").length, 1, "Importstatus wurde dupliziert");
          assertEqual(normalized.items.find(item => item.id === "service-cut")?.name, "Manuell angepasster Vorlageneintrag", "Manuelle Änderung wurde beim Deduplizieren überschrieben");
        }
      },
      {
        name: "Katalogreset lässt Einstellungen und andere Tenants unverändert",
        run: async () => {
          const firstTenant = context.makeClient("catalog-reset-a");
          const secondTenant = context.makeClient("catalog-reset-b");
          const settings = recordFixture(firstTenant.tenantId, "completed");
          settings.company.name = "Settings bleiben";
          await firstTenant.writeSettings(settings);
          await firstTenant.writeCatalog(catalogRecordFixture(firstTenant.tenantId));
          await secondTenant.writeCatalog(catalogRecordFixture(secondTenant.tenantId));

          await firstTenant.deleteCatalog();

          assertEqual(await firstTenant.readCatalog(), null, "Katalog des zurückgesetzten Tenants ist noch vorhanden");
          assertEqual((await firstTenant.readSettings())?.company?.name, "Settings bleiben", "Settings wurden beim Katalogreset verändert");
          assertEqual((await secondTenant.readCatalog())?.items?.length, 2, "Katalog eines anderen Tenants wurde verändert");
        }
      },
      {
        name: "Katalog-Write-Queue läuft nach einem Transaktionsfehler weiter",
        run: async () => {
          const persistence = context.makeClient("catalog-queue-recovery");
          const closedDatabase = await persistence.openDatabase();
          closedDatabase.close();
          await assertRejects(
            () => persistence.writeCatalog(catalogRecordFixture(persistence.tenantId)),
            "CATALOG_WRITE_FAILED",
            "Katalogschreiben auf geschlossener Verbindung"
          );
          persistence.closeDatabase();
          await persistence.writeCatalog(catalogRecordFixture(persistence.tenantId));
          assertEqual((await persistence.readCatalog())?.items?.length, 2, "Katalogqueue blieb nach Schreibfehler blockiert");
        }
      },
      {
        name: "Vollständiger Kunden-Roundtrip mit optionalen Feldern und Status",
        run: async () => {
          const persistence = context.makeClient("customers-roundtrip");
          const requested = customersRecordFixture(persistence.tenantId);
          await persistence.writeCustomers(requested);
          const stored = await persistence.readCustomers();
          const normalized = api.normalizeCustomersRecord(stored, requested, persistence.tenantId).record;
          const first = normalized.customers.find(customer => customer.id === "customer-anna");
          const second = normalized.customers.find(customer => customer.id === "customer-bert");
          assertEqual(normalized.customers.length, 2, "Kundenanzahl ging verloren");
          assertEqual(first?.firstName, "Anna", "Vorname ging verloren");
          assertEqual(first?.lastName, "Muster", "Nachname ging verloren");
          assertEqual(first?.companyName, "Muster Studio GmbH", "Firma ging verloren");
          assertEqual(first?.postalCode, "93047", "Postleitzahl ging verloren");
          assertEqual(first?.phone, "+49 941 12-34", "Telefonnummer wurde typverändert");
          assertEqual(first?.mobile, "0176 / 123 45 67", "Mobilnummer ging verloren");
          assertEqual(first?.email, "Anna.Muster@example.invalid", "E-Mail-Darstellung wurde unnötig verändert");
          assertEqual(first?.notes, "Nur fiktive Testdaten.", "Kundennotiz ging verloren");
          assertEqual(second?.active, false, "Aktivstatus ging verloren");
          assertEqual(first?.id, "customer-anna", "Stabile Kunden-ID wurde verändert");
          assert(!Number.isNaN(Date.parse(first?.createdAt)), "createdAt ist kein gültiger Zeitstempel");
          assert(!Number.isNaN(Date.parse(first?.updatedAt)), "updatedAt ist kein gültiger Zeitstempel");
          assert(!hasOwn(first, "history") && !hasOwn(first, "receiptCount"), "Historie oder abgeleitete Kennzahl wurde gespeichert");
        }
      },
      {
        name: "Kundenänderung bleibt stabil und Mehrfachspeicherung dupliziert nicht",
        run: async () => {
          const persistence = context.makeClient("customers-edit");
          const first = customersRecordFixture(persistence.tenantId);
          await persistence.writeCustomers(first);
          const next = clone(first);
          next.customers[0].lastName = "Geändert";
          next.customers[0].phone = "0099 88-77";
          next.customers[0].updatedAt = "2030-01-05T10:00:00.000Z";
          await persistence.writeCustomers(next);
          await persistence.writeCustomers(next);
          const stored = await persistence.readCustomers();
          assertEqual(stored.customers.filter(customer => customer.id === "customer-anna").length, 1, "Mehrfachspeicherung erzeugte einen doppelten Kunden");
          assertEqual(stored.customers.find(customer => customer.id === "customer-anna")?.lastName, "Geändert", "Kundenänderung ging verloren");
          assertEqual(stored.customers.find(customer => customer.id === "customer-anna")?.phone, "0099 88-77", "Geänderte Telefonnummer ging verloren");
          assertEqual(stored.customers.find(customer => customer.id === "customer-anna")?.id, "customer-anna", "Kunden-ID änderte sich beim Bearbeiten");
        }
      },
      {
        name: "Kundendeaktivierung bleibt reversibel und verändert keine Historien",
        run: async () => {
          const persistence = context.makeClient("customers-status-lifecycle");
          const snapshot = completeTenantSnapshotFixture(persistence.tenantId);
          await persistence.restoreTenantSnapshot(snapshot);
          const receiptsBefore = await persistence.readReceipts();
          const vouchersBefore = await persistence.readVouchers();
          const customers = await persistence.readCustomers();
          customers.customers[0].active = false;
          customers.customers[0].updatedAt = "2030-02-02T12:00:00.000Z";
          await persistence.writeCustomers(customers);
          assertEqual((await persistence.readCustomers()).customers[0].active, false, "Kunde wurde nicht deaktiviert gespeichert");
          assertDeepEqual(await persistence.readReceipts(), receiptsBefore, "Beleg- oder Kundenhistorie wurde bei Deaktivierung verändert");
          assertDeepEqual(await persistence.readVouchers(), vouchersBefore, "Gutschein oder Kundensnapshot wurde bei Deaktivierung verändert");
          customers.customers[0].active = true;
          customers.customers[0].updatedAt = "2030-02-03T12:00:00.000Z";
          await persistence.writeCustomers(customers);
          assertEqual((await persistence.readCustomers()).customers[0].active, true, "Kunde konnte nicht wieder aktiviert werden");
        }
      },
      {
        name: "Kundensuche findet Name, Firma, Straße, PLZ und Ort in einer Suchlogik",
        run: async () => {
          const customer = customersRecordFixture("search-name").customers[0];
          assert(api.customerMatchesSearch(customer, "anna muster"), "Vollständiger Name wurde nicht gefunden");
          assert(api.customerMatchesSearch(customer, "studio gmbh"), "Firma wurde nicht gefunden");
          assert(api.customerMatchesSearch(customer, "teststraße 12"), "Straße wurde nicht gefunden");
          assert(api.customerMatchesSearch(customer, "93047"), "PLZ wurde nicht gefunden");
          assert(api.customerMatchesSearch(customer, "regensburg"), "Ort wurde nicht gefunden");
          assert(!api.customerMatchesSearch(customer, "nicht vorhanden"), "Unpassende Suche lieferte einen Treffer");
        }
      },
      {
        name: "Kundensuche ignoriert übliche Telefontrennzeichen",
        run: async () => {
          const customer = customersRecordFixture("search-phone").customers[0];
          assert(api.customerMatchesSearch(customer, "+499411234"), "Telefonnummer ohne Trennzeichen wurde nicht gefunden");
          assert(api.customerMatchesSearch(customer, "0176 1234567"), "Mobilnummer mit anderer Gruppierung wurde nicht gefunden");
        }
      },
      {
        name: "Kundensuche findet E-Mail ohne Beachtung der Großschreibung",
        run: async () => {
          const customer = customersRecordFixture("search-email").customers[0];
          assert(api.customerMatchesSearch(customer, "anna.muster@EXAMPLE.INVALID"), "E-Mail wurde nicht gefunden");
        }
      },
      {
        name: "Kunden erhalten unbekannte Felder und schließen Historien sowie Fremddaten aus",
        run: async () => {
          const persistence = context.makeClient("customers-unknown-fields");
          const first = customersRecordFixture(persistence.tenantId);
          first.futureCustomersField = { versionHint: 2 };
          first.customers[0].futureCustomerField = "behalten";
          first.customers[0].history = [{ number: "FORBIDDEN" }];
          first.customers[0].receipts = [{ number: "FORBIDDEN" }];
          first.receipts = [{ number: "FORBIDDEN" }];
          first.vouchers = [{ code: "FORBIDDEN" }];
          await persistence.writeCustomers(first);

          const next = customersRecordFixture(persistence.tenantId);
          next.customers[0].firstName = "Manuell";
          await persistence.writeCustomers(next);
          const stored = await persistence.readCustomers();
          assertDeepEqual(stored.futureCustomersField, { versionHint: 2 }, "Unbekanntes Root-Feld ging verloren");
          assertEqual(stored.customers[0].futureCustomerField, "behalten", "Unbekanntes Kundenfeld ging verloren");
          assertEqual(stored.customers[0].firstName, "Manuell", "Manuelle Kundenänderung wurde überschrieben");
          assert(!hasOwn(stored.customers[0], "history") && !hasOwn(stored.customers[0], "receipts"), "Historie wurde unzulässig im Kunden gespeichert");
          assert(!hasOwn(stored, "receipts") && !hasOwn(stored, "vouchers"), "Fremde Geschäftsdaten wurden im Kundenstore gespeichert");
        }
      },
      {
        name: "Kundennormalisierung ergänzt optionale Felder und entfernt ID-Duplikate",
        run: async () => {
          const tenantId = "customers-normalization";
          const defaults = customersRecordFixture(tenantId);
          const raw = clone(defaults);
          delete raw.customers[0].companyName;
          delete raw.customers[0].mobile;
          delete raw.customers[0].notes;
          raw.customers.push(clone(raw.customers[0]));
          const normalized = api.normalizeCustomersRecord(raw, defaults, tenantId);
          assertEqual(normalized.record.customers.filter(customer => customer.id === "customer-anna").length, 1, "Doppelte Kunden-ID blieb erhalten");
          assertEqual(typeof normalized.record.customers[0].companyName, "string", "Optionale Firma wurde nicht ergänzt");
          assertEqual(typeof normalized.record.customers[0].mobile, "string", "Optionale Mobilnummer wurde nicht ergänzt");
          assertEqual(typeof normalized.record.customers[0].notes, "string", "Optionale Notiz wurde nicht ergänzt");
          assert(normalized.repairs.includes("CUSTOMER_DUPLICATE_REMOVED"), "Duplikatreparatur wurde nicht ausgewiesen");
        }
      },
      {
        name: "Kundenreset lässt Settings, Katalog und andere Tenants unverändert",
        run: async () => {
          const firstTenant = context.makeClient("customers-reset-a");
          const secondTenant = context.makeClient("customers-reset-b");
          const settings = recordFixture(firstTenant.tenantId, "completed");
          settings.company.name = "Settings bleiben";
          await firstTenant.writeSettings(settings);
          await firstTenant.writeCatalog(catalogRecordFixture(firstTenant.tenantId));
          await firstTenant.writeCustomers(customersRecordFixture(firstTenant.tenantId));
          await secondTenant.writeCustomers(customersRecordFixture(secondTenant.tenantId));

          await firstTenant.deleteCustomers();

          assertEqual(await firstTenant.readCustomers(), null, "Kunden des zurückgesetzten Tenants sind noch vorhanden");
          assertEqual((await firstTenant.readSettings())?.company?.name, "Settings bleiben", "Settings wurden beim Kundenreset verändert");
          assertEqual((await firstTenant.readCatalog())?.items?.length, 2, "Katalog wurde beim Kundenreset verändert");
          assertEqual((await secondTenant.readCustomers())?.customers?.length, 2, "Kunden eines anderen Tenants wurden verändert");
        }
      },
      {
        name: "Kunden-Write-Queue läuft nach einem Transaktionsfehler weiter",
        run: async () => {
          const persistence = context.makeClient("customers-queue-recovery");
          const closedDatabase = await persistence.openDatabase();
          closedDatabase.close();
          await assertRejects(
            () => persistence.writeCustomers(customersRecordFixture(persistence.tenantId)),
            "CUSTOMERS_WRITE_FAILED",
            "Kundenschreiben auf geschlossener Verbindung"
          );
          persistence.closeDatabase();
          await persistence.writeCustomers(customersRecordFixture(persistence.tenantId));
          assertEqual((await persistence.readCustomers())?.customers?.length, 2, "Kundenqueue blieb nach Schreibfehler blockiert");
        }
      },
      {
        name: "Belegformat speichert Centwerte, Snapshots und Aktivitäten ohne vollständige Gutscheine",
        run: async () => {
          const persistence = context.makeClient("receipts-roundtrip");
          const requested = receiptsRecordFixture(persistence.tenantId);
          requested.receipts[0].voucherReference = "vch-reference-only";
          requested.receipts[0].voucher = { code: "FORBIDDEN", history: [{ amount: 39 }] };
          requested.receipts[0].emailStatus = "FORBIDDEN";
          await persistence.writeReceipts(requested);
          const stored = await persistence.readReceipts();
          const receipt = stored.receipts[0];
          assertEqual(receipt.receiptNumber, "2030-000076", "Belegnummer fehlt");
          assertEqual(receipt.totalCents, 3900, "Gesamtbetrag wurde nicht als Centwert gespeichert");
          assertEqual(receipt.positions[0].unitPriceCents, 3900, "Positionspreis wurde nicht als Centwert gespeichert");
          assertEqual(receipt.businessAreaSnapshot.label, "Friseur", "Geschäftsbereichssnapshot fehlt");
          assertEqual(receipt.serviceLocationSnapshot.name, "Hauptstudio", "Leistungsortsnapshot fehlt");
          assertEqual(receipt.companySnapshot.name, "Teststudio Nord", "Unternehmenssnapshot fehlt");
          assertEqual(receipt.companySnapshot.owner, "Testperson", "Unternehmer fehlt im Belegsnapshot");
          assertEqual(receipt.customerSnapshot.name, "Anna Muster", "Kundensnapshot fehlt");
          assertEqual(receipt.voucherReference, "vch-reference-only", "Erlaubte Gutscheinreferenz ging verloren");
          assert(!hasOwn(receipt, "voucher") && !hasOwn(receipt, "emailStatus"), "Ausgeschlossene Gutschein- oder Versanddaten wurden gespeichert");
          assert(!Number.isNaN(Date.parse(receipt.completedAt)), "completedAt ist kein stabiler ISO-Zeitstempel");
        }
      },
      {
        name: "Belegabschluss vergibt Nummer und Settings-Nummernstand atomar und idempotent",
        run: async () => {
          const persistence = context.makeClient("receipt-commit");
          const settings = recordFixture(persistence.tenantId, "completed");
          const seed = receiptsRecordFixture(persistence.tenantId);
          await persistence.writeSettings(settings);
          await persistence.writeReceipts(seed);
          const first = await persistence.commitReceipt(receiptDraftFixture("receipt-new-a"), settings, seed);
          assertEqual(first.receipt.number, "2030-000077", "Falsche nächste Belegnummer vergeben");
          assertEqual(first.settingsRecord.receiptSettings.nextNumber, 78, "Nummernstand wurde nicht fortgeschrieben");
          const repeated = await persistence.commitReceipt(receiptDraftFixture("receipt-new-a"), settings, seed);
          assertEqual(repeated.created, false, "Wiederholter Abschluss wurde nicht als idempotent erkannt");
          assertEqual(repeated.receipt.number, "2030-000077", "Wiederholter Abschluss erhielt eine neue Nummer");
          const second = await persistence.commitReceipt(receiptDraftFixture("receipt-new-b", { completedAt: "2030-01-05T12:05:00.000Z" }), settings, seed);
          assertEqual(second.receipt.number, "2030-000078", "Zweite eindeutige Nummer wurde nicht vergeben");
          const numbers = (await persistence.readReceipts()).receipts.map(receipt => receipt.number);
          assertEqual(new Set(numbers).size, numbers.length, "Doppelte Belegnummer gespeichert");
          assertEqual((await persistence.readSettings()).receiptSettings.nextNumber, 79, "Persistierter Nummernstand ist inkonsistent");
        }
      },
      {
        name: "Belegsnapshot bleibt nach Änderungen an Kunde, Settings und Katalog unverändert",
        run: async () => {
          const persistence = context.makeClient("receipt-snapshot");
          const settings = recordFixture(persistence.tenantId, "completed");
          const seed = receiptsRecordFixture(persistence.tenantId);
          await persistence.writeSettings(settings);
          const committed = await persistence.commitReceipt(receiptDraftFixture("receipt-snapshot-fixed"), settings, seed);
          const customer = customersRecordFixture(persistence.tenantId);
          customer.customers[0].lastName = "Nachträglich geändert";
          await persistence.writeCustomers(customer);
          const changedSettings = clone(settings);
          changedSettings.company.name = "Neuer Unternehmensname";
          await persistence.writeSettings(changedSettings);
          const catalog = catalogRecordFixture(persistence.tenantId);
          catalog.items[0].name = "Neuer Leistungsname";
          await persistence.writeCatalog(catalog);
          const stored = (await persistence.readReceipts()).receipts.find(receipt => receipt.id === committed.receipt.id);
          assertEqual(stored.companySnapshot.name, "Teststudio Nord", "Unternehmenssnapshot änderte sich rückwirkend");
          assertEqual(stored.customerSnapshot.name, "Anna Muster", "Kundensnapshot änderte sich rückwirkend");
          assertEqual(stored.positions[0].name, "Testhaarschnitt", "Positionssnapshot änderte sich rückwirkend");
        }
      },
      {
        name: "Offene Zahlung wird gespeichert und später mit Aktivität vollständig erfasst",
        run: async () => {
          const persistence = context.makeClient("receipt-open-payment");
          const settings = recordFixture(persistence.tenantId, "completed");
          const seed = receiptsRecordFixture(persistence.tenantId);
          const draft = receiptDraftFixture("receipt-open", { paymentStatus: "open", paymentMethod: null, paymentRecordedAt: null, paymentEvents: [], activity: [{ label: "Zahlung offen gelassen", date: "05.01.2030 · 13:00", occurredAt: "2030-01-05T12:00:00.000Z" }] });
          const committed = await persistence.commitReceipt(draft, settings, seed);
          assertEqual(committed.receipt.paymentStatus, "open", "Offener Zahlungsstatus ging verloren");
          assertEqual(committed.receipt.paymentMethod, null, "Offener Beleg erhielt eine Zahlungsart");
          const payment = await persistence.recordReceiptPayment(committed.receipt.number, {
            recordedAt: "2030-01-06T09:00:00.000Z", date: "06.01.2030", time: "10:00",
            displayDate: "06.01.2030 · 10:00", paymentMethod: "EC", amountCents: 3900, detail: "EC · 39,00 €"
          }, committed.receiptsRecord);
          assertEqual(payment.recorded, true, "Zahlung wurde nicht erfasst");
          assertEqual(payment.receipt.paymentStatus, "paid", "Zahlungsstatus wurde nicht auf bezahlt gesetzt");
          assertEqual(payment.receipt.paymentEvents.at(-1).amountCents, 3900, "Zahlungsbetrag fehlt");
          assertEqual(payment.receipt.activities.at(-1).label, "Zahlung erfasst", "Zahlungsaktivität fehlt");
          const repeated = await persistence.recordReceiptPayment(committed.receipt.number, { paymentMethod: "Bar", amountCents: 3900 }, payment.record);
          assertEqual(repeated.recorded, false, "Bereits erfasste Zahlung wurde ein zweites Mal angelegt");
        }
      },
      {
        name: "Storno ist atomar verknüpft und Mehrfachaufruf erzeugt kein Duplikat",
        run: async () => {
          const persistence = context.makeClient("receipt-cancellation");
          const settings = recordFixture(persistence.tenantId, "completed");
          const seed = receiptsRecordFixture(persistence.tenantId);
          const original = await persistence.commitReceipt(receiptDraftFixture("receipt-cancel-source"), settings, seed);
          const draft = {
            id: "cancellation-stable", type: "cancellation", total: -39,
            items: original.receipt.items.map(item => ({ ...item, unitPrice: -39, total: -39 })),
            completedAt: "2030-01-06T10:00:00.000Z", date: "06.01.2030", time: "11:00",
            sourceActivityDate: "06.01.2030 · 11:00",
            activity: [{ label: "Stornobeleg erstellt", date: "06.01.2030 · 11:00", occurredAt: "2030-01-06T10:00:00.000Z" }]
          };
          const cancelled = await persistence.commitReceiptCorrection(original.receipt.number, draft, original.receiptsRecord);
          assert(cancelled.receipt.number.startsWith("ST-2030-"), "Stornonummer besitzt das falsche Format");
          assertEqual(cancelled.sourceReceipt.status, "cancelled", "Ursprungsstatus wurde nicht konsistent fortgeschrieben");
          assert(cancelled.sourceReceipt.references.correctionNumbers.includes(cancelled.receipt.number), "Stornoreferenz fehlt am Ursprung");
          assertEqual(cancelled.receipt.reference, original.receipt.number, "Rückreferenz zum Ursprung fehlt");
          const repeated = await persistence.commitReceiptCorrection(original.receipt.number, { ...draft, id: "cancellation-second-click" }, cancelled.record);
          assertEqual(repeated.created, false, "Mehrfachklick erzeugte einen zweiten Storno");
          assertEqual(repeated.record.receipts.filter(receipt => receipt.type === "cancellation" && receipt.reference === original.receipt.number).length, 1, "Doppelter Stornodatensatz vorhanden");
        }
      },
      {
        name: "Teil- und Gesamtgutschrift bleiben referenziert und aktualisieren nur den Lebenszyklus",
        run: async () => {
          const persistence = context.makeClient("receipt-credits");
          const settings = recordFixture(persistence.tenantId, "completed");
          const seed = receiptsRecordFixture(persistence.tenantId);
          const original = await persistence.commitReceipt(receiptDraftFixture("receipt-credit-source"), settings, seed);
          const partial = await persistence.commitReceiptCorrection(original.receipt.number, {
            id: "credit-partial", type: "credit", total: -10, items: [{ title: "Kulanz", quantity: 1, unitPrice: -10, total: -10 }],
            completedAt: "2030-01-06T10:00:00.000Z", sourceActivityDate: "06.01.2030 · 11:00", isFull: false
          }, original.receiptsRecord);
          assert(partial.receipt.number.startsWith("GS-2030-"), "Gutschriftsnummer besitzt das falsche Format");
          assertEqual(partial.sourceReceipt.status, "partially-credited", "Teilgutschrift setzte falschen Ursprungsstatus");
          const full = await persistence.commitReceiptCorrection(original.receipt.number, {
            id: "credit-rest", type: "credit", total: -29, items: [{ title: "Restgutschrift", quantity: 1, unitPrice: -29, total: -29 }],
            completedAt: "2030-01-06T10:05:00.000Z", sourceActivityDate: "06.01.2030 · 11:05", isFull: true
          }, partial.record);
          assertEqual(full.sourceReceipt.status, "credited", "Vollständige Gutschrift setzte falschen Ursprungsstatus");
          assertEqual(full.sourceReceipt.positions[0].name, "Testhaarschnitt", "Unveränderlicher Positionssnapshot des Ursprungs wurde manipuliert");
          assertEqual(full.sourceReceipt.references.correctionNumbers.length, 2, "Gutschriften sind nicht vollständig referenziert");
        }
      },
      {
        name: "Schreibfehler beim Abschluss verbraucht keine Nummer und Queue erholt sich",
        run: async () => {
          const persistence = context.makeClient("receipt-write-failure");
          const settings = recordFixture(persistence.tenantId, "completed");
          const seed = receiptsRecordFixture(persistence.tenantId);
          await persistence.writeSettings(settings);
          await persistence.writeReceipts(seed);
          const closedDatabase = await persistence.openDatabase();
          closedDatabase.close();
          await assertRejects(
            () => persistence.commitReceipt(receiptDraftFixture("receipt-failed"), settings, seed),
            "RECEIPT_COMMIT_FAILED",
            "Belegabschluss auf geschlossener Verbindung"
          );
          persistence.closeDatabase();
          assertEqual((await persistence.readSettings()).receiptSettings.nextNumber, 77, "Nummer wurde trotz fehlgeschlagener Transaktion verbraucht");
          const recovered = await persistence.commitReceipt(receiptDraftFixture("receipt-recovered"), settings, seed);
          assertEqual(recovered.receipt.number, "2030-000077", "Wiederholung verwendete nicht dieselbe sichere nächste Nummer");
        }
      },
      {
        name: "Receipt-Reset ist mandanten- und storeisoliert",
        run: async () => {
          const first = context.makeClient("receipts-reset-a");
          const second = context.makeClient("receipts-reset-b");
          await first.writeSettings(recordFixture(first.tenantId, "completed"));
          await first.writeCatalog(catalogRecordFixture(first.tenantId));
          await first.writeCustomers(customersRecordFixture(first.tenantId));
          await first.writeReceipts(receiptsRecordFixture(first.tenantId));
          await second.writeReceipts(receiptsRecordFixture(second.tenantId));
          await first.deleteReceipts();
          assertEqual(await first.readReceipts(), null, "Receipt-Store des ersten Tenants wurde nicht gelöscht");
          assertEqual((await first.readSettings()).receiptSettings.nextNumber, 77, "Nummernstand wurde beim Receipt-Reset verändert");
          assertEqual((await first.readCatalog()).items.length, 2, "Katalog wurde beim Receipt-Reset verändert");
          assertEqual((await first.readCustomers()).customers.length, 2, "Kunden wurden beim Receipt-Reset verändert");
          assertEqual((await second.readReceipts()).receipts.length, 1, "Belege eines anderen Tenants wurden gelöscht");
        }
      },
      {
        name: "Gutscheinformat speichert Werte, Referenzen, Snapshots, Historie und QR-Link ohne Binär- oder Versanddaten",
        run: async () => {
          const persistence = context.makeClient("vouchers-roundtrip");
          const requested = vouchersRecordFixture(persistence.tenantId);
          requested.vouchers[0].pdf = "FORBIDDEN";
          requested.vouchers[0].qrImage = "FORBIDDEN";
          requested.vouchers[0].mailStatus = "FORBIDDEN";
          requested.vouchers[0].cameraData = { frame: "FORBIDDEN" };
          requested.vouchers[0].printStatus = "FORBIDDEN";
          await persistence.writeVouchers(requested);
          const stored = await persistence.readVouchers();
          const voucher = stored.vouchers[0];
          assertEqual(voucher.issuedValueCents, 10000, "Ursprungswert wurde nicht als Centwert gespeichert");
          assertEqual(voucher.currentValueCents, 10000, "Restwert wurde nicht als Centwert gespeichert");
          assertEqual(voucher.saleReceipt.number, "2030-000075", "Verkaufsbelegreferenz fehlt");
          assertEqual(voucher.companySnapshot.name, "Teststudio Nord", "Unternehmenssnapshot fehlt");
          assertEqual(voucher.companySnapshot.owner, "Testperson", "Unternehmer fehlt im Gutscheinsnapshot");
          assertEqual(voucher.businessAreaSnapshot.label, "Friseur", "Geschäftsbereichssnapshot fehlt");
          assertEqual(voucher.serviceLocationSnapshot.name, "Hauptstudio", "Leistungsortsnapshot fehlt");
          assertEqual(voucher.customerSnapshot.name, "Anna Muster", "Kundensnapshot fehlt");
          assertEqual(voucher.qrReference, "vch_existing", "QR-Referenz fehlt");
          assert(voucher.qrLink.includes("#/voucher/"), "QR-App-Link fehlt");
          assertEqual(voucher.history[0].type, "sold", "Verkaufshistorie fehlt");
          ["pdf", "qrImage", "mailStatus", "cameraData", "printStatus"].forEach(key => assert(!hasOwn(voucher, key), `${key} wurde unzulässig gespeichert`));
        }
      },
      {
        name: "Globale Gutschein-Bestandsprüfung bleibt Hinweis und wird nicht zum Writer-Gate",
        run: async () => {
          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für Writer-Gate-Regression konnte nicht geladen werden");
          const source = await response.text();
          const start = source.indexOf("if (state.receiptsReadyForWrites && state.vouchersReadyForWrites)");
          const end = source.indexOf("refreshSettingsDerivedState();", start);
          assert(start >= 0 && end > start, "Startprüfung der Gutschein-/Beleginvariante fehlt");
          const invariantBlock = source.slice(start, end);
          assert(!/receiptsReadyForWrites\s*=\s*false/.test(invariantBlock), "Globale Invariante sperrt erneut alle Receipt-Writer");
          assert(!/vouchersReadyForWrites\s*=\s*false/.test(invariantBlock), "Globale Invariante sperrt erneut alle Voucher-Writer");
          assert(invariantBlock.includes("settingsStorageNotice"), "Historische Abweichung bleibt nicht sichtbar");
        }
      },
      {
        name: "Historische Gutscheinabweichung blockiert keinen unabhängigen neuen Beleg und wird nicht repariert",
        run: async () => {
          const persistence = context.makeClient("historical-invariant-receipt-write");
          const snapshot = historicallyInconsistentSnapshotFixture(persistence.tenantId);
          const historicalVoucherBefore = clone(snapshot.stores.vouchers.vouchers[0]);
          await persistence.writeSettings(snapshot.stores.settings);
          await persistence.writeCatalog(snapshot.stores.catalog);
          await persistence.writeCustomers(snapshot.stores.customers);
          await persistence.writeReceipts(snapshot.stores.receipts);
          await persistence.writeVouchers(snapshot.stores.vouchers);
          assertThrows(
            () => api.validateVoucherReceiptInvariant(snapshot.stores.receipts, snapshot.stores.vouchers),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Vorbedingung des inkonsistenten Altbestands"
          );

          const committed = await persistence.commitReceipt(
            receiptDraftFixture("receipt-after-historical-invariant"),
            snapshot.stores.settings,
            snapshot.stores.receipts
          );
          assertEqual(committed.created, true, "Unabhängiger Beleg wurde nicht angelegt");
          assertEqual(committed.receipt.number, "2030-000077", "Neue Belegnummer ist nicht kollisionsfrei");
          api.validateVoucherReceiptInvariant([committed.receipt], []);

          const reloadedReceipts = await persistence.readReceipts();
          const reloadedVouchers = await persistence.readVouchers();
          assert(reloadedReceipts.receipts.some(receipt => receipt.id === committed.receipt.id), "Reload verlor den neuen Beleg");
          assertDeepEqual(reloadedVouchers.vouchers[0], historicalVoucherBefore, "Der historische Gutschein wurde stillschweigend verändert");
          assertThrows(
            () => api.validateVoucherReceiptInvariant(reloadedReceipts, reloadedVouchers),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Globale Abweichung nach neuem Beleg"
          );
          await assertRejects(
            () => persistence.exportTenantSnapshot(),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Backup des weiterhin inkonsistenten Bestands"
          );

          const exportSnapshot = clone(snapshot);
          exportSnapshot.stores.settings = await persistence.readSettings();
          exportSnapshot.stores.receipts = reloadedReceipts;
          exportSnapshot.stores.vouchers = reloadedVouchers;
          assertThrows(
            () => exportApi.createExportFiles(exportSnapshot, {
              exportType: "tax-advisor",
              periodType: "custom",
              dateFrom: "2030-01-01",
              dateTo: "2030-01-31",
              businessAreaId: "all"
            }),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Export des weiterhin inkonsistenten Bestands"
          );
        }
      },
      {
        name: "Historische Gutscheinabweichung blockiert keinen neuen atomaren Gutscheinverkauf",
        run: async () => {
          const persistence = context.makeClient("historical-invariant-voucher-sale");
          const snapshot = historicallyInconsistentSnapshotFixture(persistence.tenantId);
          const historicalVoucherBefore = clone(snapshot.stores.vouchers.vouchers[0]);
          await persistence.writeSettings(snapshot.stores.settings);
          await persistence.writeReceipts(snapshot.stores.receipts);
          await persistence.writeVouchers(snapshot.stores.vouchers);

          const voucher = voucherDraftFixture("voucher-after-historical-invariant", {
            reference: "vch_after_historical_invariant",
            code: "FRKA-NEW0-0001"
          });
          const receipt = voucherSaleReceiptFixture(voucher);
          const committed = await persistence.commitVoucherSale(
            receipt,
            voucher,
            snapshot.stores.settings,
            snapshot.stores.receipts,
            snapshot.stores.vouchers
          );
          api.validateVoucherReceiptInvariant([committed.receipt], [committed.voucher]);

          const reloadedReceipts = await persistence.readReceipts();
          const reloadedVouchers = await persistence.readVouchers();
          const reloadedReceipt = reloadedReceipts.receipts.find(entry => entry.id === committed.receipt.id);
          const reloadedVoucher = reloadedVouchers.vouchers.find(entry => entry.reference === committed.voucher.reference);
          api.validateVoucherReceiptInvariant([reloadedReceipt], [reloadedVoucher]);
          assertDeepEqual(
            reloadedVouchers.vouchers.find(entry => entry.reference === historicalVoucherBefore.reference),
            historicalVoucherBefore,
            "Der alte inkonsistente Gutschein wurde beim neuen Verkauf verändert"
          );
          assertThrows(
            () => api.validateVoucherReceiptInvariant(reloadedReceipts, reloadedVouchers),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Globale Abweichung nach neuem Gutscheinverkauf"
          );
        }
      },
      {
        name: "Neue kaputte Gutschein-Gegenreferenz wird auch bei historischem Altfehler atomar abgewiesen",
        run: async () => {
          const persistence = context.makeClient("historical-invariant-broken-new-sale");
          const snapshot = historicallyInconsistentSnapshotFixture(persistence.tenantId);
          await persistence.writeSettings(snapshot.stores.settings);
          await persistence.writeReceipts(snapshot.stores.receipts);
          await persistence.writeVouchers(snapshot.stores.vouchers);
          const voucher = voucherDraftFixture("voucher-broken-counter-reference", {
            reference: "vch_broken_counter_reference",
            code: "FRKA-BROK-0001"
          });
          const receipt = voucherSaleReceiptFixture(voucher);
          receipt.voucherReference = "vch_wrong_counter_reference";
          await assertRejects(
            () => persistence.commitVoucherSale(receipt, voucher, snapshot.stores.settings, snapshot.stores.receipts, snapshot.stores.vouchers),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Kaputte neue Gegenreferenz"
          );
          assertEqual((await persistence.readSettings()).receiptSettings.nextNumber, 77, "Abgewiesene Gegenreferenz verbrauchte eine Nummer");
          assertEqual((await persistence.readReceipts()).receipts.length, snapshot.stores.receipts.receipts.length, "Abgewiesene Gegenreferenz hinterließ einen Beleg");
          assertEqual((await persistence.readVouchers()).vouchers.length, snapshot.stores.vouchers.vouchers.length, "Abgewiesene Gegenreferenz hinterließ einen Gutschein");
        }
      },
      {
        name: "Receipt-ID-Kollision eines neuen Gutscheinverkaufs bleibt atomar blockiert",
        run: async () => {
          const persistence = context.makeClient("voucher-sale-receipt-id-collision");
          const settings = recordFixture(persistence.tenantId, "completed");
          const receipts = receiptsRecordFixture(persistence.tenantId);
          const vouchers = vouchersRecordFixture(persistence.tenantId);
          await persistence.writeSettings(settings);
          await persistence.writeReceipts(receipts);
          await persistence.writeVouchers(vouchers);
          const voucher = voucherDraftFixture("voucher-receipt-id-collision", {
            reference: "vch_receipt_id_collision",
            code: "FRKA-COLL-0001"
          });
          const collidingReceipt = voucherSaleReceiptFixture(voucher, "receipt-existing");
          await assertRejects(
            () => persistence.commitVoucherSale(collidingReceipt, voucher, settings, receipts, vouchers),
            "VOUCHER_ATOMIC_CONFLICT",
            "Receipt-ID-Kollision"
          );
          assertEqual((await persistence.readSettings()).receiptSettings.nextNumber, 77, "ID-Kollision verbrauchte eine Nummer");
        }
      },
      {
        name: "Gutscheinverkauf speichert Beleg, Gutschein, Historie und Nummer atomar und reload-stabil",
        run: async () => {
          const persistence = context.makeClient("voucher-sale");
          const initialSnapshot = completeTenantSnapshotFixture(persistence.tenantId);
          const settings = initialSnapshot.stores.settings;
          const catalog = initialSnapshot.stores.catalog;
          const customers = initialSnapshot.stores.customers;
          const receipts = initialSnapshot.stores.receipts;
          const vouchers = initialSnapshot.stores.vouchers;
          await persistence.writeSettings(settings);
          await persistence.writeCatalog(catalog);
          await persistence.writeCustomers(customers);
          await persistence.writeReceipts(receipts);
          await persistence.writeVouchers(vouchers);
          const voucher = voucherDraftFixture("voucher-sale-new", { reference: "vch_sale_new", code: "FRKA-SALE-0001" });
          const receipt = voucherSaleReceiptFixture(voucher);
          const committed = await persistence.commitVoucherSale(receipt, voucher, settings, receipts, vouchers);
          assertEqual(committed.receipt.number, "2030-000077", "Verkaufsbeleg erhielt die falsche Nummer");
          assertEqual(committed.voucher.saleReceipt.number, committed.receipt.number, "Verkaufsbeleg ist nicht am Gutschein verknüpft");
          assertEqual(committed.voucher.history[0].receiptNumber, committed.receipt.number, "Historie ist nicht mit dem Verkaufsbeleg verknüpft");
          assertEqual(committed.settingsRecord.receiptSettings.nextNumber, 78, "Nummernstand wurde nicht atomar fortgeschrieben");
          const reloadedVoucher = (await persistence.readVouchers()).vouchers.find(entry => entry.reference === voucher.reference);
          const reloadedReceipt = (await persistence.readReceipts()).receipts.find(entry => entry.id === receipt.id);
          assertEqual(reloadedVoucher.saleReceipt.number, reloadedReceipt.number, "Reload verlor die Belegverknüpfung");
          assertEqual(reloadedVoucher.qrLink, voucher.qrLink, "Reload verlor den QR-Link");
          const tenantSnapshot = await persistence.exportTenantSnapshot();
          const validated = api.validateTenantSnapshot(tenantSnapshot, persistence.tenantId);
          assertEqual(validated.snapshot.stores.vouchers.vouchers.length, 2, "Validierter Snapshot verlor den neuen Gutschein");
          const packageResult = await exportPackageApi.createTaxAdvisorPackage(tenantSnapshot, {
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "all",
            generatedAt: "2030-02-01T12:34:00.000Z"
          }, {
            createReceiptPdf: currentReceipt => {
              const linkedVoucher = tenantSnapshot.stores.vouchers.vouchers.find(entry => entry.reference === currentReceipt.voucherReference) || null;
              const model = documentApi.createReceiptDocumentModel(currentReceipt, { ...documentOptions(), linkedVoucher });
              return documentApi.createPdfBytes(model);
            }
          });
          const newSalePdf = packageResult.entries.find(entry => entry.kind === "receipt-pdf" && entry.receiptNumber === committed.receipt.number);
          assert(newSalePdf, "End-to-End-Export enthält den neuen Gutscheinverkaufsbeleg nicht als PDF");
          const repeated = await persistence.commitVoucherSale(receipt, voucher, settings, receipts, vouchers);
          assertEqual(repeated.created, false, "Wiederholter Verkauf wurde nicht idempotent erkannt");
          assertEqual(repeated.settingsRecord.receiptSettings.nextNumber, 78, "Idempotente Wiederholung setzte den Nummernstand zurück");
          assertEqual((await persistence.readVouchers()).vouchers.filter(entry => entry.reference === voucher.reference).length, 1, "Wiederholung erzeugte einen doppelten Gutschein");
        }
      },
      {
        name: "Doppelter Gutscheincode wird vor Nummernverbrauch vollständig abgewiesen",
        run: async () => {
          const persistence = context.makeClient("voucher-duplicate-code");
          const settings = recordFixture(persistence.tenantId, "completed");
          const receipts = receiptsRecordFixture(persistence.tenantId);
          const vouchers = vouchersRecordFixture(persistence.tenantId);
          await persistence.writeSettings(settings);
          await persistence.writeReceipts(receipts);
          await persistence.writeVouchers(vouchers);
          const duplicate = voucherDraftFixture("voucher-duplicate", { reference: "vch_duplicate", code: "frka exst 0001" });
          await assertRejects(
            () => persistence.commitVoucherSale(voucherSaleReceiptFixture(duplicate), duplicate, settings, receipts, vouchers),
            "VOUCHER_DUPLICATE",
            "Doppelter sichtbarer Gutscheincode"
          );
          assertEqual((await persistence.readSettings()).receiptSettings.nextNumber, 77, "Fehlgeschlagener Verkauf verbrauchte eine Nummer");
          assertEqual((await persistence.readReceipts()).receipts.length, 1, "Fehlgeschlagener Verkauf legte einen Beleg an");
          assertEqual((await persistence.readVouchers()).vouchers.length, 1, "Fehlgeschlagener Verkauf legte einen Gutschein an");
        }
      },
      {
        name: "Historische Reparaturquelle besitzt exakt vier eindeutige kanonische Gutscheinverkaufsbelege",
        run: async () => {
          const seed = historicalDemoRepairSeed();
          const receipts = api.snapshotReceipts(seed, "test-demo-invariant");
          const vouchers = api.snapshotVouchers(seed, "test-demo-invariant");
          const result = api.validateVoucherReceiptInvariant(receipts, vouchers);
          assertEqual(result.vouchersWithSaleReceipt, 4, "Nicht alle Demo-Gutscheine besitzen einen Verkaufsbeleg");
          assertEqual(result.voucherSaleReceipts, 4, "Demo-Daten enthalten verwaiste oder zusätzliche Gutscheinverkaufsbelege");
          const expected = [
            ["2026-000118", "hair", 2500, "Bar", "c-anna"],
            ["2026-000121", "podiatry", 4000, "Karte", null],
            ["2026-000124", "hair", 5000, "Bar", "c-sabine"],
            ["2026-000131", "podiatry", 10000, "Karte", null]
          ];
          expected.forEach(([number, areaId, totalCents, paymentMethod, customerId]) => {
            const receipt = receipts.receipts.find(entry => entry.number === number);
            assert(receipt, `Demo-Gutscheinverkaufsbeleg ${number} fehlt`);
            assertEqual(receipt.receiptKind, "voucher-sale", `${number} besitzt die falsche Belegart`);
            assertEqual(receipt.businessAreaId, areaId, `${number} besitzt den falschen Geschäftsbereich`);
            assertEqual(receipt.totalCents, totalCents, `${number} besitzt den falschen Betrag`);
            assertEqual(receipt.paymentMethod, paymentMethod, `${number} besitzt die falsche Zahlungsart`);
            assertEqual(receipt.customerId, customerId, `${number} besitzt den falschen Kundenbezug`);
          });
          assertEqual(globalThis.PROTOTYPE_DATA.receipts.length, 0, "Reparaturbelege sind im aktiven Erststartbestand sichtbar");
          assertEqual(globalThis.PROTOTYPE_DATA.vouchers.length, 0, "Reparaturgutscheine sind im aktiven Erststartbestand sichtbar");
        }
      },
      {
        name: "Historische Demo-Reparaturplanung erkennt einen, mehrere und alle vier fehlenden Verkaufsbelege vollständig",
        run: async () => {
          assertEqual(api.historicalDemoVoucherReceiptRepairConstants?.cases?.length, 4, "Reparatur-Allowlist ist nicht exakt auf vier Fälle begrenzt");
          const variants = [
            ["2026-000124"],
            ["2026-000118", "2026-000131"],
            ["2026-000118", "2026-000121", "2026-000124", "2026-000131"]
          ];
          variants.forEach((missingNumbers, index) => {
            const snapshot = historicalDemoRepairSnapshotFixture(`test-demo-repair-plan-${index}`, missingNumbers);
            const before = clone(snapshot);
            const plan = api.planHistoricalDemoVoucherReceiptRepair(
              snapshot,
              historicalDemoRepairCanonicalRecords(snapshot.tenantId),
              snapshot.tenantId
            );
            assertEqual(plan.status, "repairable", `Reparierbarer Teilbestand ${index + 1} wurde blockiert: ${JSON.stringify(plan.findings)}`);
            assertEqual(plan.additions.length, missingNumbers.length, `Teilbestand ${index + 1} enthält falsche Ergänzungsanzahl`);
            assertEqual(plan.invariantFindings.length, missingNumbers.length, `Vorprüfung ${index + 1} brach vor dem letzten fehlenden Beleg ab`);
            assertDeepEqual(snapshot, before, `Read-only-Reparaturplanung ${index + 1} veränderte den Snapshot`);
          });
        }
      },
      {
        name: "Historische Demo-Reparatur erkennt vollständigen Bestand als NO-OP und lässt den Nummernstand unverändert",
        run: async () => {
          const snapshot = historicalDemoRepairSnapshotFixture("test-demo-repair-noop");
          const plan = api.planHistoricalDemoVoucherReceiptRepair(
            snapshot,
            historicalDemoRepairCanonicalRecords(snapshot.tenantId),
            snapshot.tenantId
          );
          assertEqual(plan.status, "no-op", `Konsistenter Demo-Bestand wurde nicht als NO-OP erkannt: ${JSON.stringify(plan.findings)}`);
          assertEqual(plan.additions.length, 0, "NO-OP plant dennoch Ergänzungen");
          assertEqual(plan.receiptSequence.changed, false, "NO-OP verändert die Belegnummernfolge");
          assertEqual(plan.customerHistory.persisted, false, "Nicht persistierte Kundenhistorie wurde als IndexedDB-Datum behandelt");
          assertEqual(plan.customerHistory.action, "none", "Sabine-Keller-Historie würde unzulässig verändert");
        }
      },
      {
        name: "Historische Demo-Reparatur stoppt bei ID-, Nummern- und Geschäftsdatenkollision",
        run: async () => {
          const idCollision = historicalDemoRepairSnapshotFixture("test-demo-repair-id-collision", ["2026-000124"]);
          idCollision.stores.receipts.receipts.push(receiptDraftFixture("receipt_demo_2026_000124", { number: "2026-009999" }));
          const idPlan = api.planHistoricalDemoVoucherReceiptRepair(idCollision, historicalDemoRepairCanonicalRecords(idCollision.tenantId), idCollision.tenantId);
          assertEqual(idPlan.status, "blocked", "ID-Kollision wurde nicht hart blockiert");

          const numberCollision = historicalDemoRepairSnapshotFixture("test-demo-repair-number-collision", ["2026-000124"]);
          numberCollision.stores.receipts.receipts.push(receiptDraftFixture("receipt-collision-number", { number: "2026-000124" }));
          const numberPlan = api.planHistoricalDemoVoucherReceiptRepair(numberCollision, historicalDemoRepairCanonicalRecords(numberCollision.tenantId), numberCollision.tenantId);
          assertEqual(numberPlan.status, "blocked", "Nummernkollision wurde nicht hart blockiert");

          const businessMismatch = historicalDemoRepairSnapshotFixture("test-demo-repair-business-mismatch");
          businessMismatch.stores.receipts.receipts.find(receipt => receipt.number === "2026-000124").totalCents += 1;
          const businessPlan = api.planHistoricalDemoVoucherReceiptRepair(businessMismatch, historicalDemoRepairCanonicalRecords(businessMismatch.tenantId), businessMismatch.tenantId);
          assertEqual(businessPlan.status, "blocked", "Widersprüchlicher vorhandener Receipt wurde nicht blockiert");
          assert(businessPlan.findings.some(finding => finding.invariant === "RECEIPT_CANONICAL_DATA_MISMATCH"), "Geschäftsdatenabweichung wurde nicht benannt");
        }
      },
      {
        name: "Historische Demo-Reparatur stoppt bei falscher Voucher-Referenz und doppeltem Voucher-Anspruch",
        run: async () => {
          const wrongReference = historicalDemoRepairSnapshotFixture("test-demo-repair-wrong-reference", ["2026-000124"]);
          const voucher = wrongReference.stores.vouchers.vouchers.find(entry => entry.code === "FRKA-7Q2M-9K4X");
          voucher.saleReceipt.id = "receipt_demo_2026_009999";
          voucher.saleReceiptReference = "receipt_demo_2026_009999";
          const wrongPlan = api.planHistoricalDemoVoucherReceiptRepair(wrongReference, historicalDemoRepairCanonicalRecords(wrongReference.tenantId), wrongReference.tenantId);
          assertEqual(wrongPlan.status, "blocked", "Falsche Voucher-Referenz wurde nicht hart blockiert");

          const duplicateClaim = historicalDemoRepairSnapshotFixture("test-demo-repair-duplicate-claim", ["2026-000124"]);
          const secondVoucher = duplicateClaim.stores.vouchers.vouchers.find(entry => entry.code === "FRKA-3N8R-6W5P");
          secondVoucher.saleReceipt.id = "receipt_demo_2026_000124";
          secondVoucher.saleReceipt.number = "2026-000124";
          secondVoucher.saleReceiptReference = "receipt_demo_2026_000124";
          const duplicatePlan = api.planHistoricalDemoVoucherReceiptRepair(duplicateClaim, historicalDemoRepairCanonicalRecords(duplicateClaim.tenantId), duplicateClaim.tenantId);
          assertEqual(duplicatePlan.status, "blocked", "Doppelter Voucher-Anspruch wurde nicht hart blockiert");
          assert(duplicatePlan.findings.some(finding => finding.invariant === "VOUCHER_RECEIPT_MULTIPLE_CLAIMS"), "Doppelter Voucher-Anspruch wurde nicht benannt");
        }
      },
      {
        name: "Historische Demo-Reparatur ergänzt alle fehlenden Receipts atomar und erhält alle anderen Stores",
        run: async () => {
          const persistence = context.makeClient("demo-repair-success");
          const missing = ["2026-000118", "2026-000121", "2026-000124", "2026-000131"];
          const snapshot = historicalDemoRepairSnapshotFixture(persistence.tenantId, missing);
          await writeHistoricalDemoRepairSnapshot(persistence, snapshot);
          const before = {
            settings: clone(await persistence.readSettings()),
            catalog: clone(await persistence.readCatalog()),
            customers: clone(await persistence.readCustomers()),
            receipts: clone(await persistence.readReceipts()),
            vouchers: clone(await persistence.readVouchers())
          };
          const result = await persistence.repairHistoricalDemoVoucherReceipts(historicalDemoRepairOptions(snapshot));
          assertEqual(result.changed, true, "Reparatur meldet keine Änderung");
          assertEqual(result.report.status, "repaired", "Reparatur wurde nicht als erfolgreich bestätigt");
          assertEqual(result.report.postValidation, "consistent", "Vollständige Nachvalidierung fehlt");
          assertEqual(result.report.additions.length, 4, "Nicht alle fehlenden Demo-Belege wurden ergänzt");
          const afterReceipts = await persistence.readReceipts();
          missing.forEach(number => assert(afterReceipts.receipts.some(receipt => receipt.number === number), `${number} fehlt nach Reparatur`));
          assertDeepEqual(await persistence.readSettings(), before.settings, "Reparatur veränderte Einstellungen oder Belegnummernfolge");
          assertDeepEqual(await persistence.readCatalog(), before.catalog, "Reparatur veränderte den Katalog");
          assertDeepEqual(await persistence.readCustomers(), before.customers, "Reparatur veränderte Kunden");
          assertDeepEqual(await persistence.readVouchers(), before.vouchers, "Reparatur veränderte Gutscheine");
          const regularBefore = before.receipts.receipts.filter(receipt => !missing.includes(receipt.number));
          const regularAfter = afterReceipts.receipts.filter(receipt => !missing.includes(receipt.number));
          assertDeepEqual(regularAfter, regularBefore, "Reparatur veränderte reguläre Belege");

          const tenantSnapshot = await persistence.exportTenantSnapshot();
          persistence.validateTenantSnapshot(tenantSnapshot);
          await backupApi.encryptTenantSnapshot(tenantSnapshot, cryptoPassphrase);
          const exportResult = exportApi.createExportFiles(tenantSnapshot, {
            exportType: "tax-advisor",
            periodType: "custom",
            dateFrom: "2026-01-01",
            dateTo: "2026-12-31",
            businessAreaId: "all",
            generatedAt: "2030-02-01T12:00:00.000Z"
          });
          assert(exportResult.files.some(file => file.name === "Belege.csv"), "Steuerberaterexport bleibt nach Reparatur blockiert");
        }
      },
      {
        name: "Historische Demo-Reparatur ist nach Reload idempotent",
        run: async () => {
          const persistence = context.makeClient("demo-repair-idempotent");
          const snapshot = historicalDemoRepairSnapshotFixture(persistence.tenantId, ["2026-000124"]);
          await writeHistoricalDemoRepairSnapshot(persistence, snapshot);
          const options = historicalDemoRepairOptions(snapshot);
          const first = await persistence.repairHistoricalDemoVoucherReceipts(options);
          assertEqual(first.changed, true, "Erster Reparaturlauf war kein Schreibvorgang");
          persistence.closeDatabase();
          const reloaded = api.createSettingsPersistence({ databaseName: context.databaseName, tenantId: persistence.tenantId });
          const second = await reloaded.repairHistoricalDemoVoucherReceipts(options);
          assertEqual(second.changed, false, "Zweiter Reparaturlauf war nicht idempotent");
          assertEqual(second.report.status, "no-op", "Zweiter Reparaturlauf wurde nicht als NO-OP erkannt");
          assertEqual((await reloaded.readReceipts()).receipts.filter(receipt => receipt.number === "2026-000124").length, 1, "Idempotenz erzeugte ein Duplikat");
          reloaded.closeDatabase();
        }
      },
      {
        name: "Historische Demo-Reparatur rollt einen künstlichen Schreibfehler ohne Teiländerung zurück",
        run: async () => {
          const persistence = context.makeClient("demo-repair-rollback");
          const snapshot = historicalDemoRepairSnapshotFixture(persistence.tenantId, ["2026-000118", "2026-000124"]);
          await writeHistoricalDemoRepairSnapshot(persistence, snapshot);
          const beforeReceipts = clone(await persistence.readReceipts());
          await assertRejects(
            () => persistence.repairHistoricalDemoVoucherReceipts({
              ...historicalDemoRepairOptions(snapshot),
              simulateFailureAfterWrite: true
            }),
            "HISTORICAL_DEMO_REPAIR_TEST_ABORT",
            "Simulierter Reparaturabbruch"
          );
          assertDeepEqual(await persistence.readReceipts(), beforeReceipts, "Fehlgeschlagene Reparatur hinterließ Teiländerungen");
        }
      },
      {
        name: "Historische Demo-Reparatur ändert bei harter Stop-Bedingung keinen Store",
        run: async () => {
          const persistence = context.makeClient("demo-repair-hard-stop");
          const snapshot = historicalDemoRepairSnapshotFixture(persistence.tenantId, ["2026-000124"]);
          snapshot.stores.receipts.receipts.push(receiptDraftFixture("receipt-id-collision", { number: "2026-000124" }));
          await writeHistoricalDemoRepairSnapshot(persistence, snapshot);
          const before = {
            settings: clone(await persistence.readSettings()),
            catalog: clone(await persistence.readCatalog()),
            customers: clone(await persistence.readCustomers()),
            receipts: clone(await persistence.readReceipts()),
            vouchers: clone(await persistence.readVouchers())
          };
          await assertRejects(
            () => persistence.repairHistoricalDemoVoucherReceipts(historicalDemoRepairOptions(snapshot)),
            "HISTORICAL_DEMO_REPAIR_BLOCKED",
            "Harte Reparatur-Stop-Bedingung"
          );
          assertDeepEqual(await persistence.readSettings(), before.settings, "Stop-Bedingung veränderte Einstellungen");
          assertDeepEqual(await persistence.readCatalog(), before.catalog, "Stop-Bedingung veränderte Katalog");
          assertDeepEqual(await persistence.readCustomers(), before.customers, "Stop-Bedingung veränderte Kunden");
          assertDeepEqual(await persistence.readReceipts(), before.receipts, "Stop-Bedingung veränderte Belege");
          assertDeepEqual(await persistence.readVouchers(), before.vouchers, "Stop-Bedingung veränderte Gutscheine");
        }
      },
      {
        name: "Historische Demo-Reparatur bleibt bewusst ausgelöst und in die Diagnose-UI integriert",
        run: async () => {
          const snapshot = historicalDemoRepairSnapshotFixture("test-demo-repair-diagnostic", ["2026-000124"]);
          const report = api.diagnoseTenantSnapshot(snapshot, snapshot.tenantId, {
            canonicalRecords: historicalDemoRepairCanonicalRecords(snapshot.tenantId)
          });
          assertEqual(report.status, "inconsistent", "Historischer Altbestand wurde nicht diagnostiziert");
          assertEqual(report.historicalDemoRepair.status, "repairable", "Diagnose bietet den eindeutigen Reparaturfall nicht an");
          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für Reparatur-UI-Test konnte nicht geladen werden");
          const source = await response.text();
          assert(source.includes("Historische Testdaten reparieren"), "Bewusste Reparaturaktion fehlt in der Diagnose-UI");
          assert(source.includes("repair-historical-demo-voucher-receipts"), "Bestätigter Reparaturablauf fehlt");
          const startupStart = source.indexOf("if (state.receiptsReadyForWrites && state.vouchersReadyForWrites)");
          const startupEnd = source.indexOf("refreshSettingsDerivedState();", startupStart);
          assert(startupStart >= 0 && startupEnd > startupStart, "Startprüfung konnte nicht abgegrenzt werden");
          assert(!source.slice(startupStart, startupEnd).includes("repairHistoricalDemoVoucherReceipts"), "Reparatur läuft unzulässig automatisch beim App-Start");
        }
      },
      {
        name: "Zentrale Invariante lehnt fehlenden Gutscheinverkaufsbeleg ab",
        run: async () => {
          const snapshot = completeTenantSnapshotFixture("test-invariant-missing");
          snapshot.stores.receipts.receipts = snapshot.stores.receipts.receipts.filter(receipt => receipt.receiptKind !== "voucher-sale");
          assertThrows(
            () => api.validateVoucherReceiptInvariant(snapshot.stores.receipts, snapshot.stores.vouchers),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Fehlender Gutscheinverkaufsbeleg"
          );
        }
      },
      {
        name: "Zentrale Invariante lehnt falsche ID-/Nummernpaarung und Belegart ab",
        run: async () => {
          const wrongNumber = completeTenantSnapshotFixture("test-invariant-number");
          wrongNumber.stores.vouchers.vouchers[0].saleReceipt.number = "2030-999999";
          assertThrows(
            () => api.validateVoucherReceiptInvariant(wrongNumber.stores.receipts, wrongNumber.stores.vouchers),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Falsche Verkaufsbelegnummer"
          );
          const wrongKind = completeTenantSnapshotFixture("test-invariant-kind");
          wrongKind.stores.receipts.receipts.find(receipt => receipt.receiptKind === "voucher-sale").receiptKind = "standard";
          assertThrows(
            () => api.validateVoucherReceiptInvariant(wrongKind.stores.receipts, wrongKind.stores.vouchers),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Falsche Verkaufsbelegart"
          );
        }
      },
      {
        name: "Zentrale Invariante lehnt falsche Gegenreferenz und verwaisten Verkaufsbeleg ab",
        run: async () => {
          const wrongCounterReference = completeTenantSnapshotFixture("test-invariant-counter");
          wrongCounterReference.stores.receipts.receipts.find(receipt => receipt.receiptKind === "voucher-sale").voucherReference = "vch_unknown";
          assertThrows(
            () => api.validateVoucherReceiptInvariant(wrongCounterReference.stores.receipts, wrongCounterReference.stores.vouchers),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Falsche Gutschein-Gegenreferenz"
          );
          const orphan = completeTenantSnapshotFixture("test-invariant-orphan");
          orphan.stores.vouchers.vouchers = [];
          assertThrows(
            () => api.validateVoucherReceiptInvariant(orphan.stores.receipts, orphan.stores.vouchers),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Verwaister Gutscheinverkaufsbeleg"
          );
        }
      },
      {
        name: "Read-only-Diagnose meldet einen konsistenten Bestand ohne falschen Fehler",
        run: async () => {
          assert(typeof api.diagnoseTenantSnapshot === "function", "Zentrale Snapshot-Diagnose fehlt");
          assertEqual(api.integrityDiagnosticConstants?.format, "FRECKA_INTEGRITY_DIAGNOSTIC", "Diagnoseformat fehlt");
          const snapshot = completeTenantSnapshotFixture("test-diagnostic-consistent");
          const before = clone(snapshot);
          const report = api.diagnoseTenantSnapshot(snapshot, snapshot.tenantId, {
            createdAt: "2030-02-02T10:00:00.000Z",
            appVersion: "0.10.7",
            appBuild: "PERSISTENCE-010"
          });
          assertEqual(report.status, "consistent", "Konsistenter Bestand wurde als fehlerhaft gemeldet");
          assertEqual(report.diagnosticFormatVersion, 2, "Datenschutzgehärtetes Diagnoseformat fehlt");
          assertEqual(report.validation.invariant, "TENANT_SNAPSHOT_VALID", "Erfolgreiche zentrale Invariante fehlt");
          assertEqual(report.details, null, "Konsistenter Bestand enthält falsche Fehlerdetails");
          assertDeepEqual(snapshot, before, "Diagnose hat den Eingabe-Snapshot verändert");
          const serialized = JSON.stringify(report);
          ["Testperson", "Anna Muster", "Testweg 10", "test@example.invalid", "Sicheres Testkennwort"].forEach(value => {
            assert(!serialized.includes(value), `Diagnose enthält unzulässige Geschäftsdaten: ${value}`);
          });
          assertEqual(report.recordVersionAssessment.status, "not-determinable", "Nicht belegbare Versionszuordnung wurde behauptet");
        }
      },
      {
        name: "Read-only-Diagnose klassifiziert einen fehlenden Gutscheinverkaufsbeleg ohne Identifikatoren",
        run: async () => {
          const snapshot = completeTenantSnapshotFixture("test-diagnostic-missing-sale");
          const voucher = snapshot.stores.vouchers.vouchers[0];
          snapshot.stores.receipts.receipts = snapshot.stores.receipts.receipts.filter(receipt => receipt.id !== voucher.saleReceipt.id);
          const report = api.diagnoseTenantSnapshot(snapshot, snapshot.tenantId);
          assertEqual(report.status, "inconsistent", "Fehlender Verkaufsbeleg wurde nicht erkannt");
          assertEqual(report.validation.code, "VOUCHER_RECEIPT_INVARIANT_INVALID", "Falscher zentraler Fehlercode");
          assertEqual(report.validation.invariant, "VOUCHER_SALE_RECEIPT_NOT_FOUND", "Fehlende Verkaufsbeleg-Invariante wurde nicht benannt");
          assert(report.details.invariants.includes("VOUCHER_SALE_RECEIPT_NOT_FOUND"), "Sichere technische Invariante fehlt");
          assert(report.details.dataTypes.includes("VOUCHER") && report.details.dataTypes.includes("RECEIPT"), "Betroffene Datentypen fehlen");
          const serialized = JSON.stringify(report);
          [voucher.id, voucher.code, voucher.reference, voucher.saleReceipt.id, voucher.saleReceipt.number].forEach(value => {
            assert(!serialized.includes(value), `Diagnose enthält unzulässigen Identifikator: ${value}`);
          });
        }
      },
      {
        name: "Read-only-Diagnose klassifiziert falsche Belegpaarung ohne Nummern",
        run: async () => {
          const snapshot = completeTenantSnapshotFixture("test-diagnostic-wrong-number");
          const voucher = snapshot.stores.vouchers.vouchers[0];
          voucher.saleReceipt.number = "2030-999999";
          const report = api.diagnoseTenantSnapshot(snapshot, snapshot.tenantId);
          assertEqual(report.validation.invariant, "VOUCHER_SALE_RECEIPT_NOT_FOUND", "Falsche Verkaufsbelegnummer wurde nicht eingegrenzt");
          assert(report.details.invariants.includes("VOUCHER_SALE_RECEIPT_NOT_FOUND"), "Technische Paarungsinvariante fehlt");
          const serialized = JSON.stringify(report);
          ["2030-999999", voucher.saleReceipt.id, voucher.id, voucher.code].forEach(value => {
            assert(!serialized.includes(value), `Paarungsdiagnose enthält unzulässigen Identifikator: ${value}`);
          });
        }
      },
      {
        name: "Read-only-Diagnose klassifiziert eine falsche Gutschein-Gegenreferenz ohne IDs",
        run: async () => {
          const snapshot = completeTenantSnapshotFixture("test-diagnostic-counter-reference");
          const receipt = snapshot.stores.receipts.receipts.find(entry => entry.receiptKind === "voucher-sale");
          receipt.voucherReference = "vch_unknown";
          const report = api.diagnoseTenantSnapshot(snapshot, snapshot.tenantId);
          assertEqual(report.validation.invariant, "VOUCHER_SALE_RECEIPT_COUNTER_REFERENCE_MISMATCH", "Falsche Gegenreferenz wurde nicht benannt");
          assert(report.details.dataTypes.includes("RECEIPT"), "Betroffener Belegdatentyp fehlt");
          const serialized = JSON.stringify(report);
          [receipt.id, receipt.number, "vch_unknown"].forEach(value => {
            assert(!serialized.includes(value), `Gegenreferenzdiagnose enthält unzulässigen Identifikator: ${value}`);
          });
        }
      },
      {
        name: "Read-only-Diagnose klassifiziert einen verwaisten Gutscheinverkaufsbeleg ohne IDs",
        run: async () => {
          const snapshot = completeTenantSnapshotFixture("test-diagnostic-orphan-sale");
          const receipt = snapshot.stores.receipts.receipts.find(entry => entry.receiptKind === "voucher-sale");
          snapshot.stores.vouchers.vouchers = [];
          const report = api.diagnoseTenantSnapshot(snapshot, snapshot.tenantId);
          assertEqual(report.validation.invariant, "VOUCHER_SALE_RECEIPT_ORPHANED", "Verwaister Gutscheinverkaufsbeleg wurde nicht benannt");
          assert(report.details.invariants.includes("VOUCHER_SALE_RECEIPT_ORPHANED"), "Verwaiste technische Invariante fehlt");
          const serialized = JSON.stringify(report);
          [receipt.id, receipt.number, receipt.voucherReference].forEach(value => {
            assert(!serialized.includes(value), `Verwaisungsdiagnose enthält unzulässigen Identifikator: ${value}`);
          });
        }
      },
      {
        name: "Read-only-Diagnose begrenzt doppelte Belege auf sichere Kategorien",
        run: async () => {
          const snapshot = completeTenantSnapshotFixture("test-diagnostic-duplicate-receipt");
          for (let index = 0; index < 25; index += 1) {
            const duplicate = clone(snapshot.stores.receipts.receipts[0]);
            duplicate.number = `2030-${String(200 + index).padStart(6, "0")}`;
            duplicate.receiptNumber = duplicate.number;
            snapshot.stores.receipts.receipts.push(duplicate);
          }
          const report = api.diagnoseTenantSnapshot(snapshot, snapshot.tenantId);
          assertEqual(report.validation.code, "BACKUP_VALIDATION_FAILED", "Doppelte Belegdaten umgehen die zentrale Snapshotprüfung");
          assertEqual(report.validation.invariant, "RECEIPT_ID_OR_NUMBER_DUPLICATE", "Doppelte Receipt-ID wurde nicht konkret benannt");
          assertEqual(report.details.findingsTruncated, 5, "Ausgeblendete Diagnosefunde werden nicht ausgewiesen");
          assert(report.details.repairs.includes("RECEIPT_DUPLICATE_REMOVED"), "Sicherer Duplikatcode fehlt");
          assert(report.details.dataTypes.includes("RECEIPT"), "Betroffener Datentyp fehlt");
          const serialized = JSON.stringify(report);
          ["Testperson", snapshot.stores.receipts.receipts[0].id, snapshot.stores.receipts.receipts[0].number, "2030-000200"].forEach(value => {
            assert(!serialized.includes(value), `Duplikatdiagnose enthält unzulässige Daten: ${value}`);
          });
        }
      },
      {
        name: "Gerätediagnose liest IndexedDB ohne Änderung, Webspeicher oder Serverübertragung",
        run: async () => {
          const persistence = context.makeClient("diagnostic-read-only");
          assert(typeof persistence.diagnoseTenantIntegrity === "function", "Gerätebezogene Diagnose-API fehlt");
          const snapshot = completeTenantSnapshotFixture(persistence.tenantId);
          await persistence.writeSettings(snapshot.stores.settings);
          await persistence.writeCatalog(snapshot.stores.catalog);
          await persistence.writeCustomers(snapshot.stores.customers);
          await persistence.writeReceipts(snapshot.stores.receipts);
          await persistence.writeVouchers(snapshot.stores.vouchers);
          const before = {
            settings: await persistence.readSettings(),
            catalog: await persistence.readCatalog(),
            customers: await persistence.readCustomers(),
            receipts: await persistence.readReceipts(),
            vouchers: await persistence.readVouchers()
          };
          const report = await persistence.diagnoseTenantIntegrity({
            appVersion: "0.10.7",
            appBuild: "PERSISTENCE-010"
          });
          const after = {
            settings: await persistence.readSettings(),
            catalog: await persistence.readCatalog(),
            customers: await persistence.readCustomers(),
            receipts: await persistence.readReceipts(),
            vouchers: await persistence.readVouchers()
          };
          assertEqual(report.status, "consistent", "Gerätediagnose meldet Testbestand fälschlich inkonsistent");
          assertDeepEqual(after, before, "Gerätediagnose hat IndexedDB verändert");
          const diagnosticSources = `${api.diagnoseTenantSnapshot.toString()} ${persistence.diagnoseTenantIntegrity.toString()}`;
          ["localStorage", "sessionStorage", "fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket"].forEach(token => {
            assert(!diagnosticSources.includes(token), `Diagnose verwendet unzulässigen Pfad: ${token}`);
          });
          assertEqual(report.privacy.dataAccess, "read-only", "Read-only-Grenze fehlt im Bericht");
          assertEqual(report.privacy.automaticRepair, false, "Diagnose behauptet oder startet eine Reparatur");
          assertEqual(report.privacy.serverTransfer, false, "Diagnose behauptet eine Serverübertragung");
        }
      },
      {
        name: "Gutschein-Snapshots bleiben nach Änderungen an Unternehmen, Kunde und Leistungsort unverändert",
        run: async () => {
          const persistence = context.makeClient("voucher-snapshot");
          const settings = recordFixture(persistence.tenantId, "completed");
          const receipts = receiptsRecordFixture(persistence.tenantId);
          const vouchers = vouchersRecordFixture(persistence.tenantId);
          const voucher = voucherDraftFixture("voucher-snapshot-fixed", { reference: "vch_snapshot_fixed", code: "FRKA-SNAP-0001" });
          await persistence.commitVoucherSale(voucherSaleReceiptFixture(voucher), voucher, settings, receipts, vouchers);
          const changedSettings = clone(settings);
          changedSettings.company.name = "Nachträglich geändertes Unternehmen";
          changedSettings.serviceLocations[0].name = "Nachträglich geänderter Ort";
          await persistence.writeSettings(changedSettings);
          const changedCustomers = customersRecordFixture(persistence.tenantId);
          changedCustomers.customers[0].lastName = "Nachträglich geändert";
          await persistence.writeCustomers(changedCustomers);
          const stored = (await persistence.readVouchers()).vouchers.find(entry => entry.reference === voucher.reference);
          assertEqual(stored.companySnapshot.name, "Teststudio Nord", "Unternehmenssnapshot änderte sich rückwirkend");
          assertEqual(stored.serviceLocationSnapshot.name, "Hauptstudio", "Leistungsortsnapshot änderte sich rückwirkend");
          assertEqual(stored.customerSnapshot.name, "Anna Muster", "Kundensnapshot änderte sich rückwirkend");
          assertEqual(stored.businessAreaSnapshot.visibleName, "Snapshot Studio", "Geschäftsbereichssnapshot änderte sich rückwirkend");
        }
      },
      {
        name: "Teil-Einlösung aktualisiert Restwert, Status, Historie und Einlösungsbeleg atomar",
        run: async () => {
          const persistence = context.makeClient("voucher-partial-redemption");
          const settings = recordFixture(persistence.tenantId, "completed");
          const receipts = receiptsRecordFixture(persistence.tenantId);
          const vouchers = vouchersRecordFixture(persistence.tenantId);
          await persistence.writeSettings(settings);
          await persistence.writeReceipts(receipts);
          await persistence.writeVouchers(vouchers);
          const receipt = receiptDraftFixture("receipt-voucher-partial", { voucherReference: "vch_existing", total: 30, originalTotal: 30, paymentMethod: "Gutschein" });
          const result = await persistence.commitVoucherRedemption(receipt, {
            voucherReference: "vch_existing", amountCents: 3000, occurredAt: "2030-01-06T10:00:00.000Z", date: "06.01.2030", time: "11:00"
          }, settings, receipts, vouchers);
          assertEqual(result.voucher.currentValueCents, 7000, "Teil-Einlösung berechnete falschen Restwert");
          assertEqual(result.voucher.status, "partially_redeemed", "Teil-Einlösung setzte falschen Status");
          assertEqual(result.voucher.history.at(-1).type, "partial_redemption", "Historientyp der Teil-Einlösung ist falsch");
          assertEqual(result.voucher.history.at(-1).receiptNumber, result.receipt.number, "Einlösungshistorie ist nicht mit dem Beleg verknüpft");
          assertEqual(result.receipt.voucherPayment.balanceAfterCents, 7000, "Beleg enthält falschen Restwert");
          assert(result.voucher.redemptionReferences.includes(result.receipt.number), "Einlösungsreferenz fehlt");
        }
      },
      {
        name: "Voll-Einlösung setzt Restwert null und bleibt bei Wiederholung idempotent",
        run: async () => {
          const persistence = context.makeClient("voucher-full-redemption");
          const settings = recordFixture(persistence.tenantId, "completed");
          const receipts = receiptsRecordFixture(persistence.tenantId);
          const vouchers = vouchersRecordFixture(persistence.tenantId);
          const receipt = receiptDraftFixture("receipt-voucher-full", { voucherReference: "vch_existing", total: 100, originalTotal: 100, paymentMethod: "Gutschein" });
          const input = { voucherReference: "vch_existing", amountCents: 10000, occurredAt: "2030-01-06T10:00:00.000Z", date: "06.01.2030", time: "11:00" };
          const result = await persistence.commitVoucherRedemption(receipt, input, settings, receipts, vouchers);
          assertEqual(result.voucher.currentValueCents, 0, "Voll-Einlösung ließ einen Restwert zurück");
          assertEqual(result.voucher.status, "redeemed", "Voll-Einlösung setzte falschen Status");
          assertEqual(result.voucher.history.at(-1).type, "full_redemption", "Historientyp der Voll-Einlösung ist falsch");
          const repeated = await persistence.commitVoucherRedemption(receipt, input, settings, receipts, vouchers);
          assertEqual(repeated.created, false, "Wiederholte Einlösung wurde nicht idempotent erkannt");
          assertEqual(repeated.voucher.history.filter(entry => entry.receiptNumber === result.receipt.number).length, 1, "Wiederholung duplizierte die Historie");
        }
      },
      {
        name: "Ungültige Restwerte und nachträgliche Historienänderungen werden abgewiesen",
        run: async () => {
          const persistence = context.makeClient("voucher-invariants");
          await assertRejects(
            () => Promise.resolve().then(() => api.snapshotVouchers({ vouchers: [voucherDraftFixture("voucher-negative", { currentValue: -1 })] }, persistence.tenantId)),
            "INVALID_VOUCHER_VALUE",
            "Negativer Restwert"
          );
          await assertRejects(
            () => Promise.resolve().then(() => api.snapshotVouchers({ vouchers: [voucherDraftFixture("voucher-too-high", { issuedValue: 50, currentValue: 60 })] }, persistence.tenantId)),
            "INVALID_VOUCHER_VALUE",
            "Restwert über Ursprungswert"
          );
          const record = vouchersRecordFixture(persistence.tenantId);
          await persistence.writeVouchers(record);
          const changed = clone(record);
          changed.vouchers[0].history[0].amount = 99;
          changed.vouchers[0].history[0].amountCents = 9900;
          await assertRejects(() => persistence.writeVouchers(changed), "VOUCHER_HISTORY_IMMUTABLE", "Bestehende Historie ändern");
          const changedSnapshot = clone(record);
          changedSnapshot.vouchers[0].companySnapshot.name = "Rückwirkend geändert";
          await assertRejects(() => persistence.writeVouchers(changedSnapshot), "VOUCHER_SNAPSHOT_IMMUTABLE", "Verkaufssnapshot ändern");
        }
      },
      {
        name: "Voucher-Reset löscht nur den Voucher-Store des gewählten Mandanten",
        run: async () => {
          const first = context.makeClient("vouchers-reset-a");
          const second = context.makeClient("vouchers-reset-b");
          await first.writeSettings(recordFixture(first.tenantId, "completed"));
          await first.writeCatalog(catalogRecordFixture(first.tenantId));
          await first.writeCustomers(customersRecordFixture(first.tenantId));
          await first.writeReceipts(receiptsRecordFixture(first.tenantId));
          await first.writeVouchers(vouchersRecordFixture(first.tenantId));
          await second.writeVouchers(vouchersRecordFixture(second.tenantId));
          await first.deleteVouchers();
          assertEqual(await first.readVouchers(), null, "Voucher-Store des ersten Tenants wurde nicht gelöscht");
          assertEqual((await first.readSettings()).receiptSettings.nextNumber, 77, "Nummernstand wurde beim Voucher-Reset verändert");
          assertEqual((await first.readCatalog()).items.length, 2, "Katalog wurde beim Voucher-Reset verändert");
          assertEqual((await first.readCustomers()).customers.length, 2, "Kunden wurden beim Voucher-Reset verändert");
          assertEqual((await first.readReceipts()).receipts.length, 1, "Belege wurden beim Voucher-Reset verändert");
          assertEqual((await second.readVouchers()).vouchers.length, 1, "Gutscheine eines anderen Tenants wurden gelöscht");
        }
      },
      {
        name: "Schreibfehler beim Gutscheinverkauf hinterlässt weder Beleg noch Gutschein noch Nummernlücke",
        run: async () => {
          const persistence = context.makeClient("voucher-write-failure");
          const settings = recordFixture(persistence.tenantId, "completed");
          const receipts = receiptsRecordFixture(persistence.tenantId);
          const vouchers = vouchersRecordFixture(persistence.tenantId);
          await persistence.writeSettings(settings);
          await persistence.writeReceipts(receipts);
          await persistence.writeVouchers(vouchers);
          const voucher = voucherDraftFixture("voucher-failed", { reference: "vch_failed", code: "FRKA-FAIL-0001" });
          const receipt = voucherSaleReceiptFixture(voucher);
          const closedDatabase = await persistence.openDatabase();
          closedDatabase.close();
          await assertRejects(
            () => persistence.commitVoucherSale(receipt, voucher, settings, receipts, vouchers),
            "VOUCHER_COMMIT_FAILED",
            "Gutscheinverkauf auf geschlossener Verbindung"
          );
          persistence.closeDatabase();
          assertEqual((await persistence.readSettings()).receiptSettings.nextNumber, 77, "Fehler verbrauchte eine Nummer");
          assertEqual((await persistence.readReceipts()).receipts.length, 1, "Fehler hinterließ einen halben Beleg");
          assertEqual((await persistence.readVouchers()).vouchers.length, 1, "Fehler hinterließ einen halben Gutschein");
        }
      },
      {
        name: "Schema-Upgrade von Version 4 erhält alle bisherigen Stores und ergänzt Voucher- sowie Runtime-Store",
        run: async () => {
          const legacyDatabaseName = `${context.databaseName}-legacy-v4`;
          const tenantId = "legacy-v4-tenant";
          let migratedClient = null;
          try {
            await createLegacyV4Database(
              legacyDatabaseName,
              recordFixture(tenantId, "completed"),
              catalogRecordFixture(tenantId),
              customersRecordFixture(tenantId),
              receiptsRecordFixture(tenantId)
            );
            migratedClient = api.createSettingsPersistence({ databaseName: legacyDatabaseName, tenantId });
            const database = await migratedClient.openDatabase();
            assertEqual(database.version, 8, "Datenbank wurde nicht auf Schema-Version 8 aktualisiert");
            assert(database.objectStoreNames.contains(api.constants.vouchersStoreName), "Voucher-Store wurde beim Upgrade nicht ergänzt");
            assert(database.objectStoreNames.contains(api.constants.licenseRuntimeStoreName), "licenseRuntime-Store wurde beim Upgrade nicht ergänzt");
            assertEqual((await migratedClient.readSettings()).company.name, "Teststudio Nord", "Settings gingen beim Upgrade verloren");
            assertEqual((await migratedClient.readCatalog()).items.length, 2, "Katalog ging beim Upgrade verloren");
            assertEqual((await migratedClient.readCustomers()).customers.length, 2, "Kunden gingen beim Upgrade verloren");
            assertEqual((await migratedClient.readReceipts()).receipts.length, 1, "Belege gingen beim Upgrade verloren");
            assertEqual(await migratedClient.readVouchers(), null, "Upgrade hat ungefragt Gutscheine importiert");
          } finally {
            migratedClient?.closeDatabase();
            await new Promise(resolve => setTimeout(resolve, 0));
            await deleteTestDatabase(legacyDatabaseName);
          }
        }
      },
      {
        name: "Schema-Upgrade von Version 3 erhält Settings, Katalog und Kunden und ergänzt den Receipt-Store",
        run: async () => {
          const legacyDatabaseName = `${context.databaseName}-legacy-v3`;
          const tenantId = "legacy-v3-tenant";
          let migratedClient = null;
          try {
            await createLegacyV3Database(
              legacyDatabaseName,
              recordFixture(tenantId, "completed"),
              catalogRecordFixture(tenantId),
              customersRecordFixture(tenantId)
            );
            migratedClient = api.createSettingsPersistence({ databaseName: legacyDatabaseName, tenantId });
            const database = await migratedClient.openDatabase();
            assertEqual(database.version, api.constants.databaseVersion, "Datenbank wurde nicht auf die aktuelle Schema-Version aktualisiert");
            assert(database.objectStoreNames.contains(api.constants.receiptsStoreName), "Receipt-Store wurde beim Upgrade nicht ergänzt");
            assertEqual((await migratedClient.readSettings()).company.name, "Teststudio Nord", "Settings gingen beim Upgrade verloren");
            assertEqual((await migratedClient.readCatalog()).items.length, 2, "Katalog ging beim Upgrade verloren");
            assertEqual((await migratedClient.readCustomers()).customers.length, 2, "Kunden gingen beim Upgrade verloren");
            assertEqual(await migratedClient.readReceipts(), null, "Upgrade hat ungefragt Belege importiert");
          } finally {
            migratedClient?.closeDatabase();
            await new Promise(resolve => setTimeout(resolve, 0));
            await deleteTestDatabase(legacyDatabaseName);
          }
        }
      },
      {
        name: "Schema-Upgrade von Version 2 erhält Settings und Katalog und ergänzt den Kundenstore",
        run: async () => {
          const legacyDatabaseName = `${context.databaseName}-legacy-v2`;
          const tenantId = "legacy-v2-tenant";
          const settings = recordFixture(tenantId, "completed");
          const catalog = catalogRecordFixture(tenantId);
          let migratedClient = null;
          try {
            await createLegacyV2Database(legacyDatabaseName, settings, catalog);
            migratedClient = api.createSettingsPersistence({ databaseName: legacyDatabaseName, tenantId });
            const database = await migratedClient.openDatabase();
            assertEqual(database.version, api.constants.databaseVersion, "Datenbank wurde nicht auf die aktuelle Schema-Version aktualisiert");
            assert(database.objectStoreNames.contains(api.constants.customersStoreName), "Kundenstore wurde beim Upgrade nicht ergänzt");
            assert(database.objectStoreNames.contains(api.constants.receiptsStoreName), "Receipt-Store wurde beim Upgrade nicht ergänzt");
            assertEqual((await migratedClient.readSettings())?.company?.name, "Teststudio Nord", "Vorhandene Settings gingen beim Upgrade verloren");
            assertEqual((await migratedClient.readCatalog())?.items?.length, 2, "Vorhandener Katalog ging beim Upgrade verloren");
            assertEqual(await migratedClient.readCustomers(), null, "Upgrade hat ungefragt Kundendaten importiert");
            assertEqual(await migratedClient.readReceipts(), null, "Upgrade hat ungefragt Belege importiert");
          } finally {
            migratedClient?.closeDatabase();
            await new Promise(resolve => setTimeout(resolve, 0));
            await deleteTestDatabase(legacyDatabaseName);
          }
        }
      },
      {
        name: "Schema-Upgrade von Version 1 erhält Settings und ergänzt Katalog- sowie Kundenstore",
        run: async () => {
          const legacyDatabaseName = `${context.databaseName}-legacy-v1`;
          const tenantId = "legacy-tenant";
          const legacyRecord = recordFixture(tenantId, "completed");
          legacyRecord.company.name = "Legacy bleibt erhalten";
          let migratedClient = null;
          try {
            await createLegacySettingsDatabase(legacyDatabaseName, legacyRecord);
            migratedClient = api.createSettingsPersistence({ databaseName: legacyDatabaseName, tenantId });
            const database = await migratedClient.openDatabase();
            assertEqual(database.version, api.constants.databaseVersion, "Datenbank wurde nicht auf die aktuelle Schema-Version aktualisiert");
            assert(database.objectStoreNames.contains(api.constants.catalogStoreName), "Katalogstore wurde beim Upgrade nicht ergänzt");
            assert(database.objectStoreNames.contains(api.constants.customersStoreName), "Kundenstore wurde beim Upgrade nicht ergänzt");
            assert(database.objectStoreNames.contains(api.constants.receiptsStoreName), "Receipt-Store wurde beim Upgrade nicht ergänzt");
            assertEqual((await migratedClient.readSettings())?.company?.name, "Legacy bleibt erhalten", "Vorhandene Settings gingen beim Upgrade verloren");
            assertEqual(await migratedClient.readCatalog(), null, "Upgrade hat ungefragt einen Katalogdatensatz importiert");
            assertEqual(await migratedClient.readCustomers(), null, "Upgrade hat ungefragt Kundendaten importiert");
            assertEqual(await migratedClient.readReceipts(), null, "Upgrade hat ungefragt Belege importiert");
          } finally {
            migratedClient?.closeDatabase();
            await new Promise(resolve => setTimeout(resolve, 0));
            await deleteTestDatabase(legacyDatabaseName);
          }
        }
      },
      {
        name: "Abgeschlossener Einrichtungsstatus bleibt erhalten",
        run: async () => {
          const persistence = context.makeClient("setup-completed");
          await persistence.writeSettings(recordFixture(persistence.tenantId, "completed"));
          const stored = await persistence.readSettings();
          const normalized = api.normalizeSettingsRecord(stored, recordFixture(persistence.tenantId), persistence.tenantId).record;
          assertEqual(normalized.setup.status, "completed", "Abgeschlossener Assistentenstatus ging verloren");
        }
      },
      {
        name: "Parallele Schreibanforderungen werden serialisiert (last wins)",
        run: async () => {
          const persistence = context.makeClient("write-queue");
          const first = recordFixture(persistence.tenantId);
          const second = recordFixture(persistence.tenantId);
          first.company.name = "Serial A";
          second.company.name = "Serial B";
          await Promise.all([
            persistence.writeSettings(first),
            persistence.writeSettings(second)
          ]);
          const stored = await persistence.readSettings();
          assertEqual(stored.company.name, "Serial B", "Letzte Schreibanforderung hat nicht gewonnen");
        }
      },
      {
        name: "Nicht serialisierbare Einstellungen melden einen Schreibfehler",
        run: async () => {
          const persistence = context.makeClient("serialization-error");
          const invalidRecord = recordFixture(persistence.tenantId);
          invalidRecord.company.unsupportedValue = () => "nicht speicherbar";
          await assertRejects(
            () => persistence.writeSettings(invalidRecord),
            "SERIALIZE_FAILED",
            "Nicht serialisierbarer Einstellungsdatensatz"
          );
          assertEqual(await persistence.readSettings(), null, "Fehlgeschlagener Schreibvorgang hat dennoch Daten angelegt");
        }
      },
      {
        name: "Write-Queue läuft nach einem Transaktionsfehler weiter",
        run: async () => {
          const persistence = context.makeClient("queue-recovery");
          const closedDatabase = await persistence.openDatabase();
          closedDatabase.close();
          await assertRejects(
            () => persistence.writeSettings(recordFixture(persistence.tenantId)),
            "WRITE_FAILED",
            "Schreiben auf geschlossener Verbindung"
          );
          persistence.closeDatabase();
          const recoveryRecord = recordFixture(persistence.tenantId, "completed");
          recoveryRecord.company.name = "Queue wieder bereit";
          await persistence.writeSettings(recoveryRecord);
          assertEqual((await persistence.readSettings()).company.name, "Queue wieder bereit", "Queue blieb nach Schreibfehler blockiert");
        }
      },
      {
        name: "Synchroner Öffnungsfehler kann erneut versucht werden",
        run: async () => {
          let calls = 0;
          const retryFactory = {
            open(...args) {
              calls += 1;
              if (calls === 1) throw new Error("simulierter synchroner Öffnungsfehler");
              return globalThis.indexedDB.open(...args);
            }
          };
          const persistence = api.createSettingsPersistence({
            indexedDBFactory: retryFactory,
            databaseName: context.databaseName,
            tenantId: `test-open-retry-${Date.now()}`
          });
          await assertRejects(() => persistence.openDatabase(), "OPEN_FAILED", "Erster Öffnungsversuch");
          const database = await persistence.openDatabase();
          assertEqual(database.name, context.databaseName, "Retry öffnete nicht die Testdatenbank");
          assertEqual(calls, 2, "Factory wurde beim Retry nicht erneut aufgerufen");
          database.close();
          persistence.closeDatabase();
        }
      },
      {
        name: "Backup- und Snapshot-APIs sind zentral verfügbar",
        run: async () => {
          const persistence = context.makeClient("backup-api");
          assert(typeof persistence.exportTenantSnapshot === "function", "exportTenantSnapshot fehlt");
          assert(typeof persistence.validateTenantSnapshot === "function", "validateTenantSnapshot fehlt");
          assert(typeof persistence.restoreTenantSnapshot === "function", "restoreTenantSnapshot fehlt");
          assert(typeof backupApi?.encryptTenantSnapshot === "function", "Verschlüsselungs-API fehlt");
          assert(typeof backupApi?.deliverBackup === "function", "Zentrale Backup-Ausgabe fehlt");
          assert(typeof backupApi?.sharePreparedBackup === "function", "Explizite Backup-Share-Aktion fehlt");
          assert(typeof backupApi?.createBackup === "function", "Deterministischer Backup-Workflow fehlt");
          assertEqual(api.constants.databaseVersion, 8, "Backup verwendet nicht die erwartete Schema-Version");
        }
      },
      {
        name: "BACKUP-004 berechnet 48 Stunden, 5 Tage und wöchentlich deterministisch",
        run: async () => {
          const baseline = Date.parse("2030-01-01T10:00:00.000Z");
          const reminder = api.normalizeBackupReminder({}, null, new Date(baseline).toISOString());
          assertEqual(reminder.interval, "weekly", "Standardintervall ist nicht wöchentlich");
          assert(!api.backupReminderIsDue(reminder, baseline + api.constants.backupReminderDelayMs - 1), "Erinnerung erschien vor sieben Tagen");
          assert(api.backupReminderIsDue(reminder, baseline + api.constants.backupReminderDelayMs), "Erinnerung erschien nach sieben Tagen nicht");

          const fiveDays = api.setBackupReminderInterval(reminder, "5-days");
          assertEqual(fiveDays.baselineAt, reminder.baselineAt, "Intervallwechsel veränderte den Fristbeginn");
          assert(!api.backupReminderIsDue(fiveDays, baseline + api.constants.backupReminderIntervals["5-days"] - 1), "Fünf-Tage-Erinnerung erschien zu früh");
          assert(api.backupReminderIsDue(fiveDays, baseline + api.constants.backupReminderIntervals["5-days"]), "Fünf-Tage-Erinnerung erschien nicht fristgerecht");

          const fortyEightHours = api.setBackupReminderInterval(reminder, "48-hours");
          assert(!api.backupReminderIsDue(fortyEightHours, baseline + api.constants.backupReminderIntervals["48-hours"] - 1), "48-Stunden-Erinnerung erschien zu früh");
          assert(api.backupReminderIsDue(fortyEightHours, baseline + api.constants.backupReminderIntervals["48-hours"]), "48-Stunden-Erinnerung erschien nicht fristgerecht");

          const snoozedAt = baseline + api.constants.backupReminderDelayMs;
          const snoozed = api.snoozeBackupReminder(fortyEightHours, snoozedAt);
          assert(!api.backupReminderIsDue(snoozed, snoozedAt + api.constants.backupReminderSnoozeMs - 1), "Snooze endete vor 24 Stunden");
          assert(api.backupReminderIsDue(snoozed, snoozedAt + api.constants.backupReminderSnoozeMs), "Erinnerung kehrte nach 24 Stunden nicht zurück");
          const snoozedWeekly = api.setBackupReminderInterval(snoozed, "weekly");
          assertEqual(snoozedWeekly.snoozedUntil, snoozed.snoozedUntil, "Intervallwechsel umging den bestehenden Snooze");
          assert(!api.backupReminderIsDue(snoozedWeekly, snoozedAt + api.constants.backupReminderSnoozeMs - 1), "Intervallwechsel machte die Erinnerung trotz Snooze fällig");

          const completedAt = snoozedAt + 60_000;
          const completed = api.completeBackupReminder(fiveDays, completedAt);
          assertEqual(completed.lastSuccessfulAt, new Date(completedAt).toISOString(), "Erfolgreiche Sicherung setzte keinen neuen Referenzzeitpunkt");
          assertEqual(completed.snoozedUntil, null, "Erfolgreiche Sicherung ließ den Snooze aktiv");
          assertEqual(completed.interval, "5-days", "Erfolgreiche Sicherung veränderte die Intervallwahl");
          assert(!api.backupReminderIsDue(completed, completedAt + api.constants.backupReminderIntervals["5-days"] - 1), "Neue Sicherung startete das gewählte Intervall nicht neu");
          assert(api.backupReminderIsDue(completed, completedAt + api.constants.backupReminderIntervals["5-days"]), "Neues Fünf-Tage-Intervall endete nicht deterministisch");
          assertThrows(() => api.setBackupReminderInterval(reminder, "off"), "INVALID_DATA", "Ausgeschaltetes Sicherungsintervall");
        }
      },
      {
        name: "BACKUP-004 verwendet für Erstinstallation und historischen Bestand wöchentlich",
        run: async () => {
          const initializedAt = "2030-04-01T08:00:00.000Z";
          const defaults = recordFixture("backup-reminder-legacy");
          defaults.backupReminder = api.normalizeBackupReminder({}, null, initializedAt);
          const historical = clone(defaults);
          delete historical.backupReminder;
          const normalized = api.normalizeSettingsRecord(historical, defaults, "backup-reminder-legacy");
          assert(normalized.repairs.includes("BACKUP_REMINDER_DEFAULTED"), "Historischer Bestand weist die Ergänzung nicht aus");
          assertEqual(normalized.record.backupReminder.interval, "weekly", "Historischer Bestand erhielt nicht das wöchentliche Standardintervall");
          assertEqual(normalized.record.backupReminder.baselineAt, initializedAt, "Historischer Bestand erhielt keinen deterministischen lokalen Startzeitpunkt");
          assert(!api.backupReminderIsDue(normalized.record.backupReminder, Date.parse(initializedAt)), "Historischer Bestand wurde sofort aggressiv erinnert");
        }
      },
      {
        name: "BACKUP-004 persistiert genau eine Intervallwahl und stellt sie nach Reload wieder her",
        run: async () => {
          const persistence = context.makeClient("backup-interval-reload");
          const settings = recordFixture(persistence.tenantId, "completed");
          settings.backupReminder = api.setBackupReminderInterval(settings.backupReminder, "48-hours");
          await persistence.writeSettings(settings);
          const reloaded = await persistence.readSettings();
          assertEqual(reloaded.backupReminder.interval, "48-hours", "Intervall ging beim Reload verloren");
          assertDeepEqual(Object.keys(api.constants.backupReminderIntervals), ["48-hours", "5-days", "weekly"], "Intervallvertrag enthält eine unerlaubte Auswahl");
          assert(!Object.keys(api.constants.backupReminderIntervals).includes("off"), "Sicherungserinnerung kann ausgeschaltet werden");
        }
      },
      {
        name: "BACKUP-004 UI bietet drei exklusive Optionen und reine lokale Speicherhilfe",
        run: async () => {
          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für BACKUP-004-UI konnte nicht geladen werden");
          const source = await response.text();
          const intervalStart = source.indexOf("function backupIntervalSettingsMarkup()");
          const helpStart = source.indexOf("function backupStorageHelpMarkup()", intervalStart);
          const behaviorStart = source.indexOf("function attachBackupReminderSettingsBehavior()", helpStart);
          const intervalBlock = source.slice(intervalStart, helpStart);
          const helpBlock = source.slice(helpStart, behaviorStart);
          assert(intervalStart >= 0 && helpStart > intervalStart && behaviorStart > helpStart, "BACKUP-004-Komponenten fehlen");
          assert(intervalBlock.includes('type="radio"') && intervalBlock.includes('name="backupInterval"'), "Intervallauswahl ist nicht exklusiv als Radiogruppe umgesetzt");
          ["48-hours", "5-days", "weekly"].forEach(value => assert(source.includes(`value: "${value}"`), `Intervall ${value} fehlt`));
          assert(!intervalBlock.includes('value="off"'), "UI bietet eine unerlaubte Aus-Option");
          assert(helpBlock.includes("iPhone und iPad") && helpBlock.includes("Android"), "Gerätebezogene Speicherhilfe fehlt");
          assert(helpBlock.includes("iCloud Drive") && helpBlock.includes("Google Drive") && helpBlock.includes("OneDrive"), "Beispiele für persönliche Cloud-Ordner fehlen");
          assert(helpBlock.includes("FRECKA selbst erhält keinen Zugriff"), "Datenschutzgrenze der Speicherhilfe fehlt");
          assert(!helpBlock.includes("fetch(") && !helpBlock.includes("OAuth") && !helpBlock.includes("<button"), "Speicherhilfe enthält eine externe oder funktionslose Integration");
        }
      },
      {
        name: "BACKUP-006 normalisiert freigegebene historische Settings vollständig und idempotent",
        run: async () => {
          assert(typeof api.prepareHistoricalSettingsRecord === "function", "Zentrale historische Settingsnormalisierung fehlt");
          const current = recordFixture("backup006-current", "completed");
          const currentPrepared = api.prepareHistoricalSettingsRecord(current, current, "backup006-current");
          assert(currentPrepared.compatible && !currentPrepared.changed, "Aktuelle saubere Settings wurden verändert");
          assertDeepEqual(currentPrepared.record, current, "Aktuelle saubere Settings sind nicht bytegleich geblieben");
          const variants = [
            "0.9.x",
            "pre-USER-001",
            "pre-LICENSE-001",
            "pre-SETTINGS-001-002",
            "pre-BRANDING-001-002",
            "pre-BACKUP-004",
            "pre-TSE-002",
            "combination"
          ];
          for (const [index, variant] of variants.entries()) {
            const persistence = context.makeClient(`backup006-${index}`);
            const historical = historicalSettingsSnapshotFixture(persistence.tenantId, variant);
            await writeRawSettingsRecord(persistence, historical.stores.settings);
            await persistence.writeCatalog(historical.stores.catalog);
            await persistence.writeCustomers(historical.stores.customers);
            await persistence.writeReceipts(historical.stores.receipts);
            await persistence.writeVouchers(historical.stores.vouchers);

            const before = await persistence.readSettings();
            const defaults = recordFixture(persistence.tenantId, "completed");
            const prepared = api.prepareHistoricalSettingsRecord(before, defaults, persistence.tenantId);
            assert(prepared.compatible && prepared.changed, `${variant}: eindeutige Startnormalisierung wurde nicht freigegeben`);
            await persistence.writeSettings(prepared.record);
            const persisted = await persistence.readSettings();
            const repeated = api.prepareHistoricalSettingsRecord(persisted, defaults, persistence.tenantId);
            if (variant === "pre-BACKUP-004") {
              const reminderKeys = Object.keys(persisted.backupReminder);
              assertEqual(reminderKeys[reminderKeys.length - 1], "interval", "Testfixture bildet die reale, durch Merge entstandene Feldreihenfolge nicht ab");
              assert(!repeated.repairs.includes("BACKUP_REMINDER_REPAIRED"), "Reine Reminder-Feldreihenfolge wird weiterhin als Inkonsistenz bewertet");
            }
            assert(repeated.compatible && !repeated.changed, `${variant}: Startnormalisierung ist nicht idempotent (${JSON.stringify({ repairs: repeated.repairs, compatibilityCodes: repeated.compatibilityCodes, blockedCode: repeated.blockedCode })})`);

            const snapshot = await persistence.exportTenantSnapshot();
            const preparedBackup = await backupApi.createBackup({
              passphrase: cryptoPassphrase,
              createSnapshot: async () => snapshot
            });
            const decrypted = await backupApi.decryptTenantSnapshot(preparedBackup.serializedBackup, cryptoPassphrase);
            api.validateTenantSnapshot(decrypted, persistence.tenantId);
            await persistence.restoreTenantSnapshot(decrypted);
            const restored = await persistence.exportTenantSnapshot();
            api.validateTenantSnapshot(restored, persistence.tenantId);
            assertEquivalent(restored.stores.settings, snapshot.stores.settings, `${variant}: Backup/Restore veränderte die normalisierten Settings`);
            assertDeepEqual(restored.stores.receipts, snapshot.stores.receipts, `${variant}: Belege wurden verändert`);
            assertDeepEqual(restored.stores.vouchers, snapshot.stores.vouchers, `${variant}: Gutscheine wurden verändert`);
          }
        }
      },
      {
        name: "BACKUP-006 bleibt bei mehrdeutigen Settings fail closed und löscht keine Daten",
        run: async () => {
          const tenantId = "backup006-fail-closed";
          const ambiguous = completeTenantSnapshotFixture(tenantId);
          ambiguous.stores.settings.businessAreas.push(clone(ambiguous.stores.settings.businessAreas[0]));
          ambiguous.stores.settings.backupReminder.baselineAt = "kein-zeitpunkt";
          const before = clone(ambiguous);
          const prepared = api.prepareHistoricalSettingsRecord(
            ambiguous.stores.settings,
            recordFixture(tenantId, "completed"),
            tenantId
          );
          assert(!prepared.compatible && !prepared.changed, "Mehrdeutiger Settingssatz wurde zur Reparatur freigegeben");
          assertThrows(() => api.validateTenantSnapshot(ambiguous, tenantId), "BACKUP_VALIDATION_FAILED", "Mehrdeutiger historischer Settingssatz");
          assertDeepEqual(ambiguous, before, "Fail-closed-Prüfung hat Eingabedaten gelöscht oder verändert");
        }
      },
      {
        name: "BACKUP-006 kombiniert Settingsnormalisierung mit der PERSISTENCE-010-Reparatur",
        run: async () => {
          const persistence = context.makeClient("backup006-persistence010");
          const historical = historicalDemoRepairSnapshotFixture(persistence.tenantId, ["2026-000124"]);
          const legacySettings = historicalSettingsSnapshotFixture(persistence.tenantId, "combination").stores.settings;
          historical.stores.settings = legacySettings;
          historical.stores.settings.receiptSettings.yearPrefix = "2026";
          historical.stores.settings.receiptSettings.nextNumber = 132;
          await writeHistoricalDemoRepairSnapshot(persistence, historical);
          await writeRawSettingsRecord(persistence, historical.stores.settings);

          const prepared = api.prepareHistoricalSettingsRecord(
            await persistence.readSettings(),
            recordFixture(persistence.tenantId, "completed"),
            persistence.tenantId
          );
          assert(prepared.compatible && prepared.changed, "Kombinierter historischer Settingssatz wurde nicht vorbereitet");
          await persistence.writeSettings(prepared.record);
          const repaired = await persistence.repairHistoricalDemoVoucherReceipts(historicalDemoRepairOptions(historical));
          assert(repaired.changed, "PERSISTENCE-010 ergänzte den bekannten historischen Beleg nicht");
          const snapshot = await persistence.exportTenantSnapshot();
          const encrypted = await backupApi.encryptTenantSnapshot(snapshot, cryptoPassphrase);
          const decrypted = await backupApi.decryptTenantSnapshot(encrypted, cryptoPassphrase);
          await persistence.restoreTenantSnapshot(decrypted);
          const finalSnapshot = await persistence.exportTenantSnapshot();
          api.validateTenantSnapshot(finalSnapshot, persistence.tenantId);
          const repeated = api.prepareHistoricalSettingsRecord(
            finalSnapshot.stores.settings,
            finalSnapshot.stores.settings,
            persistence.tenantId
          );
          assert(repeated.compatible && !repeated.changed, "Kombinierter Reparaturpfad ist nicht idempotent");
        }
      },
      {
        name: "Backup-Workflow bereitet einen erfolgreichen Bestand ohne vorzeitige Ausgabe vor",
        run: async () => {
          const calls = [];
          let prematureOutputs = 0;
          const prepared = await backupApi.createBackup({
            passphrase: "Sicheres Testkennwort 2030",
            createSnapshot: async () => {
              calls.push("snapshot");
              return { createdAt: "2030-02-01T12:34:00.000Z" };
            },
            encrypt: async (_snapshot, passphrase) => {
              calls.push("encrypt");
              assertEqual(passphrase, "Sicheres Testkennwort 2030", "Workflow reichte das Sicherungskennwort nicht weiter");
              return "verschlüsselte-testdatei";
            },
            deliver: async () => { prematureOutputs += 1; }
          });
          assertDeepEqual(calls, ["snapshot", "encrypt"], "Backup-Vorbereitung lief nicht deterministisch nacheinander");
          assertEqual(prematureOutputs, 0, "Backup-Vorbereitung startete bereits eine Ausgabe");
          assertEqual(prepared.serializedBackup, "verschlüsselte-testdatei", "Workflow veränderte die verschlüsselte Datei");
          assert(prepared.filename.endsWith(".frecka-backup"), "Workflow erzeugte keinen Backup-Dateinamen");

          let shares = 0;
          const shared = await backupApi.deliverBackup(prepared.serializedBackup, prepared.filename, {
            shareService: {
              createFile: (_content, options) => ({ name: options.name }),
              canShareFiles: () => true,
              shareFiles: async () => {
                shares += 1;
                return { status: "shared", mode: "files" };
              }
            }
          });
          assertEqual(shared.status, "shared", "Explizite Ausgabe wurde nicht bestätigt");
          assertEqual(shares, 1, "Explizite Ausgabe öffnete den Share-Dialog nicht genau einmal");

          let downloads = 0;
          const fallback = await backupApi.deliverBackup(prepared.serializedBackup, prepared.filename, {
            shareService: {
              createFile: (_content, options) => ({ name: options.name }),
              canShareFiles: () => false,
              shareFiles: async () => ({ status: "shared", mode: "files" })
            },
            download: () => { downloads += 1; }
          });
          assertEqual(fallback.status, "downloaded", "Browser ohne File-Share erhielt keinen lokalen Download");
          assertEqual(downloads, 1, "Lokaler Backup-Fallback wurde nicht genau einmal ausgelöst");
        }
      },
      {
        name: "Backup-Workflow stoppt historischen Altbestand vor Verschlüsselung und Ausgabe",
        run: async () => {
          let encrypted = false;
          let delivered = false;
          const invariantError = new api.PersistenceError(
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Interne Testreferenz darf nicht in der Oberfläche erscheinen."
          );
          await assertRejects(
            () => backupApi.createBackup({
              passphrase: "Sicheres Testkennwort 2030",
              createSnapshot: async () => { throw invariantError; },
              encrypt: async () => { encrypted = true; },
              deliver: async () => { delivered = true; }
            }),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Historisch inkonsistenter Backup-Bestand"
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          assert(!encrypted && !delivered, "Gesperrter Bestand wurde verschlüsselt oder als Datei ausgegeben");

          const response = await fetch("../js/app.js", { cache: "no-store" });
          assert(response.ok, "App-Quelle für Backup-UX-Regression konnte nicht geladen werden");
          const source = await response.text();
          const errorMessageStart = source.indexOf("function backupPreparationErrorMessage");
          const busyHelperStart = source.indexOf("function setBackupCreateFormBusy", errorMessageStart);
          const handlerStart = source.indexOf('const backupCreateForm = event.target.closest("#backupCreateForm")');
          const handlerEnd = source.indexOf('const backupUnlockForm = event.target.closest("#backupUnlockForm")', handlerStart);
          const outputActionStart = source.indexOf('if (action === "backup-output-ready")');
          const outputActionEnd = source.indexOf('if (action === "backup-restore-cancel")', outputActionStart);
          const navigateStart = source.indexOf("function navigate(route, pushHistory = true)");
          const navigateEnd = source.indexOf("function startNewReceipt", navigateStart);
          assert(errorMessageStart >= 0 && busyHelperStart > errorMessageStart, "Eigene Backup-Fehlerabbildung fehlt");
          assert(handlerStart >= 0 && handlerEnd > handlerStart, "Backup-Submit-Handler fehlt");
          const errorMessageBlock = source.slice(errorMessageStart, busyHelperStart);
          const handlerBlock = source.slice(handlerStart, handlerEnd);
          const outputActionBlock = source.slice(outputActionStart, outputActionEnd);
          const navigateBlock = source.slice(navigateStart, navigateEnd);
          assert(errorMessageBlock.includes("VOUCHER_RECEIPT_INVARIANT_INVALID"), "Historische Invariante erhält keine eigene verständliche Meldung");
          assert(errorMessageBlock.includes("Neue Belege können weiterhin erstellt werden"), "Hinweis auf weiterhin mögliche Belege fehlt");
          assert(!errorMessageBlock.includes("error?.userMessage"), "Interne Invariantenmeldung wird ungefiltert ausgegeben");
          const mismatchStart = handlerBlock.indexOf("if (passphrase !== confirmation)");
          const busyStart = handlerBlock.indexOf("state.backupBusy = true", mismatchStart);
          assert(mismatchStart >= 0 && busyStart > mismatchStart, "Kennwortvergleich fehlt");
          assert(!handlerBlock.slice(mismatchStart, busyStart).includes("renderSettingsBackup"), "Kennwortabweichung leert die Eingaben erneut");
          const catchStart = handlerBlock.indexOf("} catch (error)");
          assert(catchStart >= 0, "Backup-Fehlerpfad fehlt");
          assert(!handlerBlock.slice(catchStart).includes("renderSettingsBackup"), "Backup-Fehlerpfad ersetzt weiterhin die Kennwortfelder");
          assert(handlerBlock.slice(catchStart).includes("showBackupCreateNotice"), "Backup-Fehler wird nicht sichtbar am Formular ausgegeben");
          assert(handlerBlock.slice(catchStart).includes('recordBackupFailure("preparation", error)'), "Backup-Vorbereitungsfehler wird nicht datensparsam klassifiziert");
          assert(source.includes("function backupOutputErrorMessage"), "Getrennte Meldung für Backup-Ausgabefehler fehlt");
          assert(source.includes("console.info(`[FRECKA] Sicherung ${safeStage} fehlgeschlagen: ${backupErrorCode(error)}`)"), "Interne Backup-Diagnose protokolliert nicht ausschließlich Phase und Fehlercode");
          assert(handlerBlock.includes("pendingBackupOutput = prepared"), "Verschlüsselte Sicherung wird nicht ausschließlich als explizit auszugebender Zustand gehalten");
          assert(!handlerBlock.includes("backup.deliverBackup"), "Backup-Submit startet weiterhin selbst eine Datei- oder Share-Ausgabe");
          assert(handlerBlock.includes("isCurrentBackupCreation(creationEpoch, backupCreateForm)"), "Veraltete asynchrone Backup-Ergebnisse werden nicht verworfen");
          assert(handlerBlock.slice(catchStart).includes("discardPendingBackupOutput()"), "Backup-Fehler verwirft den vorbereiteten Ausgabezustand nicht");
          assert(source.includes("function discardPendingBackupOutput()"), "Zentrale Verwerfung des Backup-Ausgabezustands fehlt");
          assert(!source.includes("pendingBackupShareFile"), "Alter File-Pending-State bleibt im App-Code erhalten");
          assert(outputActionStart >= 0 && outputActionEnd > outputActionStart, "Explizite Backup-Ausgabeaktion fehlt");
          assert(outputActionBlock.includes("discardPendingBackupOutput()"), "Explizite Ausgabe nimmt den Pending-State nicht vor dem Systemdialog aus dem UI-State");
          assert(outputActionBlock.includes("backup.deliverBackup(prepared.serializedBackup, prepared.filename)"), "Datei-/Share-Ausgabe ist nicht auf die explizite Nutzeraktion begrenzt");
          assert(outputActionBlock.indexOf("discardPendingBackupOutput()") < outputActionBlock.indexOf("backup.deliverBackup"), "Pending-State wird erst nach Öffnen des Systemdialogs verworfen");
          assert(!outputActionBlock.includes("downloadBackup"), "Share-Abbruch besitzt weiterhin einen separaten Download-Fallback");
          const cancelledResultStart = outputActionBlock.indexOf('if (result.status === "cancelled")');
          const successfulResultStart = outputActionBlock.indexOf('if (!["shared", "downloaded"].includes(result.status))');
          const successfulRenderStart = outputActionBlock.indexOf("renderSettingsBackup()", successfulResultStart);
          const outputCatchStart = outputActionBlock.indexOf("} catch (error)", successfulRenderStart);
          assert(cancelledResultStart >= 0 && successfulResultStart > cancelledResultStart, "Share-Abbruch wird nicht vor der Erfolgsbehandlung beendet");
          assert(outputActionBlock.slice(cancelledResultStart, successfulResultStart).includes("return"), "Share-Abbruch kann bis zum Leeren der Kennwortfelder weiterlaufen");
          assert(!outputActionBlock.slice(cancelledResultStart, successfulResultStart).includes("recordSuccessfulBackup"), "Share-Abbruch setzt fälschlich den Sicherungszeitpunkt zurück");
          assert(outputActionBlock.slice(successfulResultStart).includes("recordSuccessfulBackup"), "Bestätigte Backup-Ausgabe setzt den Sicherungszeitpunkt nicht zurück");
          assert(successfulRenderStart > successfulResultStart, "Kennwortfelder werden nicht ausschließlich nach bestätigter Ausgabe neu gerendert");
          assert(outputCatchStart > successfulRenderStart && !outputActionBlock.slice(outputCatchStart).includes("renderSettingsBackup"), "Ausgabefehler leeren weiterhin die Kennwortfelder");
          assert(navigateBlock.includes('state.route === "settings-backup" || nextRoute === "settings-backup"'), "Navigation invalidiert laufende Backup-Versuche nicht zentral");
          assert(navigateBlock.includes("resetRestoreFlow()"), "Navigation verwirft den Backup-Ausgabezustand nicht");
        }
      },
      {
        name: "Verspätete Backup-Vorbereitung bleibt ohne explizite Nutzeraktion ausgabefrei",
        run: async () => {
          let finishEncryption;
          let outputs = 0;
          const encryptionGate = new Promise(resolve => { finishEncryption = resolve; });
          const preparation = backupApi.createBackup({
            passphrase: "Sicheres Testkennwort 2030",
            createSnapshot: async () => ({ createdAt: "2030-02-01T12:34:00.000Z" }),
            encrypt: async () => {
              await encryptionGate;
              return "verschlüsselte-testdatei";
            },
            deliver: async () => { outputs += 1; }
          });
          finishEncryption();
          const prepared = await preparation;
          await new Promise(resolve => setTimeout(resolve, 50));
          assertEqual(prepared.serializedBackup, "verschlüsselte-testdatei", "Vorbereitung ging unerwartet verloren");
          assertEqual(outputs, 0, "Asynchrone Vorbereitung löste ohne explizite Ausgabeaktion einen späteren Dialog aus");
        }
      },
      {
        name: "Backup-Workflow stoppt einen Verschlüsselungsfehler vor der Dateiausgabe",
        run: async () => {
          let delivered = false;
          await assertRejects(
            () => backupApi.createBackup({
              passphrase: "Sicheres Testkennwort 2030",
              createSnapshot: async () => ({ createdAt: "2030-02-01T12:34:00.000Z" }),
              encrypt: async () => { throw new backupApi.BackupError("BACKUP_ENCRYPT_FAILED", "Simulierter Verschlüsselungsfehler"); },
              deliver: async () => { delivered = true; }
            }),
            "BACKUP_ENCRYPT_FAILED",
            "Simulierter Verschlüsselungsfehler"
          );
          assert(!delivered, "Nach Verschlüsselungsfehler wurde eine Datei ausgegeben");
        }
      },
      {
        name: "Backup-Workflow meldet einen Dateifehler ohne Download-Fallback",
        run: async () => {
          let downloads = 0;
          await assertRejects(
            () => backupApi.deliverBackup("verschlüsselte-testdatei", "FRECKA-Backup-Test.frecka-backup", {
              shareService: {
                createFile() {
                  const error = new Error("Simulierter Dateifehler");
                  error.code = "SHARE_FILE_INVALID";
                  error.userMessage = "Simulierter Dateifehler";
                  throw error;
                },
                canShareFiles: () => true,
                shareFiles: async () => ({ status: "shared", mode: "files" })
              },
              download: () => { downloads += 1; }
            }),
            "SHARE_FILE_INVALID",
            "Simulierter Backup-Dateifehler"
          );
          assertEqual(downloads, 0, "Dateifehler löste einen zweiten Ausgabeversuch aus");
        }
      },
      {
        name: "Backup-Workflow behandelt Share-Abbruch ohne Datei oder Erfolg",
        run: async () => {
          let shares = 0;
          let downloads = 0;
          const shareService = {
            createFile: (_content, options) => ({ name: options.name }),
            canShareFiles: () => true,
            shareFiles: async () => {
              shares += 1;
              return { status: "cancelled", mode: "files" };
            }
          };
          const result = await backupApi.deliverBackup(
            "verschlüsselte-testdatei",
            "FRECKA-Backup-Test.frecka-backup",
            {
              shareService,
              download: () => { downloads += 1; }
            }
          );
          assertEqual(result.status, "cancelled", "Share-Abbruch wurde als Erfolg behandelt");
          await new Promise(resolve => setTimeout(resolve, 50));
          assertEqual(shares, 1, "Share-Abbruch löste nicht genau einen Share-Aufruf aus");
          assertEqual(downloads, 0, "Share-Abbruch löste unerwartet einen Download aus");
        }
      },
      {
        name: "Exportkern ist rein snapshotbasiert und verändert das Datenbankschema nicht",
        run: async () => {
          assert(typeof exportApi?.createExportProjection === "function", "Zentrale Exportprojektion fehlt");
          assert(typeof exportApi?.createExportFiles === "function", "Exportdatei-API fehlt");
          assert(typeof exportApi?.createSummaryFile === "function", "Exportübersicht fehlt");
          assert(typeof exportPackageApi?.createTaxAdvisorPackage === "function", "ZIP-Paketadapter fehlt");
          assertEqual(exportPackageApi?.JSZIP_VERSION, "3.10.1", "ZIP-Paketadapter erwartet eine falsche JSZip-Version");
          assertEqual(globalThis.JSZip?.version, "3.10.1", "Lokal vendorte JSZip-Version ist falsch");
          assertEqual(exportApi.constants.exportFormatVersion, 1, "Falsche Exportformatversion");
          assertEqual(api.constants.databaseVersion, 8, "Export verwendet nicht die erwartete Schema-Version");
        }
      },
      {
        name: "Exportzeitraum löst aktuellen, letzten und eigenen Monat korrekt auf",
        run: async () => {
          const reference = new Date(2030, 1, 15, 12, 0, 0);
          assertDeepEqual(exportApi.resolvePeriod("current-month", reference), { type: "current-month", dateFrom: "2030-02-01", dateTo: "2030-02-28" }, "Aktueller Monat ist falsch");
          assertDeepEqual(exportApi.resolvePeriod("last-month", reference), { type: "last-month", dateFrom: "2030-01-01", dateTo: "2030-01-31" }, "Letzter Monat ist falsch");
          assertDeepEqual(exportApi.resolvePeriod({ type: "custom", dateFrom: "2030-01-05", dateTo: "2030-01-18" }), { type: "custom", dateFrom: "2030-01-05", dateTo: "2030-01-18" }, "Eigener Zeitraum ist falsch");
          let invalidCode = "";
          try {
            exportApi.resolvePeriod({ type: "custom", dateFrom: "2030-02-10", dateTo: "2030-02-01" });
          } catch (error) {
            invalidCode = error.code;
          }
          assertEqual(invalidCode, "INVALID_PERIOD", "Umgekehrter Zeitraum wurde nicht abgelehnt");
        }
      },
      {
        name: "Steuerberaterexport stoppt bei inkonsistenter Gutschein-Verkaufsbelegreferenz ohne Rekonstruktion",
        run: async () => {
          const snapshot = completeExportSnapshotFixture("test-export-invariant-stop");
          snapshot.stores.receipts.receipts = snapshot.stores.receipts.receipts.filter(receipt => receipt.id !== "receipt-voucher-january");
          const before = clone(snapshot);
          assertThrows(
            () => exportApi.createExportFiles(snapshot, {
              exportType: "tax-advisor",
              periodType: "custom",
              dateFrom: "2030-01-01",
              dateTo: "2030-01-31",
              businessAreaId: "all"
            }),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Inkonsistenter Steuerberaterexport"
          );
          assertDeepEqual(snapshot, before, "Fehlgeschlagener Export hat den Snapshot verändert oder einen Beleg rekonstruiert");
        }
      },
      {
        name: "Zeitraum und Geschäftsbereich filtern Belege, Gutscheine und Historie konsistent",
        run: async () => {
          const snapshot = completeExportSnapshotFixture("test-export-filter");
          const projection = exportApi.createExportProjection(snapshot, {
            exportType: "tax-advisor",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "hair",
            generatedAt: "2030-02-01T12:00:00.000Z"
          });
          assertDeepEqual(projection.receipts.map(row => row.receiptNumber), ["2030-000101", "2030-000106", "2030-000102", "2030-000103"], "Belegfilter ist falsch");
          assertDeepEqual(projection.vouchers.map(row => row.code), ["FRKA-JAN0-0001"], "Gutscheinfilter ist falsch");
          assertEqual(projection.voucherHistory.length, 4, "Historienfilter ließ Ereignisse eines früher ausgestellten Gutscheins aus");
          assert(projection.voucherHistory.some(row => row.code === "FRKA-DEC0-0001"), "Einlösung eines älteren Gutscheins fehlt im Zeitraum");
        }
      },
      {
        name: "Offene Zahlungen, Storno und Gutschrift bleiben im Export unterscheidbar",
        run: async () => {
          const projection = exportApi.createExportProjection(completeExportSnapshotFixture("test-export-status"), {
            exportType: "tax-advisor",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "all"
          });
          const open = projection.receipts.find(row => row.receiptNumber === "2030-000102");
          const cancellation = projection.receipts.find(row => row.receiptNumber === "2030-000103");
          const credit = projection.receipts.find(row => row.receiptNumber === "2030-000104");
          assertEqual(open.paymentStatus, "Offen", "Offene Zahlung wurde als bezahlt exportiert");
          assertEqual(open.paymentMethod, "Später", "Zahlungsart der offenen Zahlung ist falsch");
          assertEqual(cancellation.receiptType, "Stornobeleg", "Stornobelegart fehlt");
          assertEqual(cancellation.cancellation, "Stornobeleg", "Stornokennzeichnung fehlt");
          assertEqual(cancellation.gross, "-39,00", "Negativer Stornobetrag ist falsch");
          assertEqual(credit.receiptType, "Gutschrift", "Gutschriftbelegart fehlt");
          assertEqual(credit.credit, "Gutschrift", "Gutschriftkennzeichnung fehlt");
          assertEqual(credit.gross, "-10,00", "Negativer Gutschriftsbetrag ist falsch");
        }
      },
      {
        name: "CSV nutzt UTF-8-BOM, Semikolon, deutsche Centwerte, Escaping und Injection-Schutz",
        run: async () => {
          const exported = exportApi.createExportFiles(completeExportSnapshotFixture("test-export-csv"), {
            exportType: "tax-advisor",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "hair"
          });
          const receiptsCsv = exported.files.find(file => file.name === "Belege.csv")?.content || "";
          const positionsCsv = exported.files.find(file => file.name === "Belegpositionen.csv")?.content || "";
          assert(receiptsCsv.startsWith("\uFEFF\"Belegnummer\";\"Belegart\""), "UTF-8-BOM oder Semikolonheader fehlt");
          assert(receiptsCsv.includes("\"65,43\""), "Centwert besitzt keine deutsche Dezimaldarstellung");
          assert(positionsCsv.includes("\"'=SUM(1+1); \"\"Ölpflege\"\"\""), "Formel, Semikolon, Umlaute oder Anführungszeichen wurden nicht sicher escaped");
          assertEqual(exportApi.protectCsvValue(" +CMD"), "' +CMD", "Formel mit führendem Leerzeichen blieb aktivierbar");
          assertEqual(exportApi.protectCsvValue("-10,00"), "-10,00", "Fachlicher negativer Betrag wurde in Text umgewandelt");
          assertEqual(exportApi.protectCsvValue("-10+CMD"), "'-10+CMD", "Nichtnumerischer Minuswert blieb aktivierbar");
          assertEqual(exportApi.protectCsvValue("Normal"), "Normal", "Ungefährlicher Text wurde verändert");
        }
      },
      {
        name: "Gutschein-Historie bleibt eine eigene chronologische CSV ohne Mehrfachwerte",
        run: async () => {
          const exported = exportApi.createExportFiles(completeExportSnapshotFixture("test-export-history"), {
            exportType: "tax-advisor",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "hair"
          });
          const names = exported.files.map(file => file.name);
          assert(names.includes("Gutscheine.csv"), "Gutscheindatei fehlt");
          assert(names.includes("Gutschein-Historie.csv"), "Eigene Historiendatei fehlt");
          const history = exported.projection.voucherHistory;
          assertDeepEqual(history.map(row => row.date), ["08.01.2030", "10.01.2030", "20.01.2030", "25.01.2030"], "Historie ist nicht chronologisch");
          assert(history.every(row => Object.values(row).every(value => !Array.isArray(value))), "Historienzeile enthält einen Mehrfachwert");
          assertEqual(history.at(-1).balanceAfter, "0,00", "Vollständige Einlösung besitzt falschen Restwert");
        }
      },
      {
        name: "Steuerberatung exportiert keine Kunden, Eigene Daten nur zugeordnete Kunden",
        run: async () => {
          const snapshot = completeExportSnapshotFixture("test-export-privacy");
          snapshot.stores.settings.backupReminder = api.setBackupReminderInterval(snapshot.stores.settings.backupReminder, "5-days");
          const options = { periodType: "custom", dateFrom: "2030-01-01", dateTo: "2030-01-31", businessAreaId: "hair", includeCustomers: true };
          const taxFiles = exportApi.createExportFiles(snapshot, { ...options, exportType: "tax-advisor" });
          const ownFiles = exportApi.createExportFiles(snapshot, { ...options, exportType: "own-data" });
          assert(!taxFiles.files.some(file => file.name === "Kunden.csv"), "Steuerberatungsexport enthält Kundenstammdaten");
          assertDeepEqual(taxFiles.files.map(file => file.name), ["Belege.csv", "Belegpositionen.csv", "Gutscheine.csv", "Gutschein-Historie.csv", "Export-Info.txt"], "Bestehende Steuerberater-Einzeldatei-API wurde verändert");
          assertEqual(taxFiles.projection.activeUser, null, "Steuerberatungsexport enthält Benutzerstammdaten");
          assertEqual(taxFiles.projection.license, null, "Steuerberatungsexport enthält Lizenzdaten");
          assertEqual(taxFiles.projection.company, null, "Steuerberatungsexport enthält zusätzliche Unternehmensstammdaten");
          assertEqual(taxFiles.projection.operatingSettings, null, "Steuerberatungsexport enthält reine App-Einstellungen");
          assert(ownFiles.files.some(file => file.name === "Kunden.csv"), "Eigene Daten enthalten trotz Auswahl keine Kundendatei");
          assertDeepEqual(ownFiles.projection.customers.map(customer => customer.id), ["customer-anna"], "Nicht zugeordnete Kunden wurden exportiert");
          assertEqual(ownFiles.projection.activeUser?.displayName, "Testperson", "Eigene-Daten-Projektion enthält den aktiven Benutzer nicht");
          assertEqual(ownFiles.projection.activeUser?.tenantId, snapshot.tenantId, "Exportierter Benutzer gehört zum falschen Mandanten");
          assertDeepEqual(ownFiles.projection.license, snapshot.stores.settings.license, "Eigene-Daten-Projektion enthält die lokale Lizenz nicht vollständig");
          assertEqual(ownFiles.projection.company?.contactPerson, "Test Kontakt", "Eigene-Daten-Projektion enthält den Ansprechpartner nicht");
          assertEqual(ownFiles.projection.company?.website, "https://test.example.invalid/", "Eigene-Daten-Projektion enthält die Website nicht");
          assertEqual(ownFiles.projection.company?.houseNumber, "", "Historische kombinierte Straße wurde im Export künstlich zerlegt");
          assertEqual(ownFiles.projection.company?.logo?.name, "Testlogo.png", "Eigene-Daten-Projektion enthält keine Logo-Metadaten");
          assert(!hasOwn(ownFiles.projection.company?.logo || {}, "dataUrl"), "Eigene-Daten-Projektion enthält unnötige Logo-Bilddaten");
          assertEqual(ownFiles.projection.operatingSettings?.currency, "EUR", "Eigene-Daten-Projektion enthält die Währung nicht");
          assertEqual(ownFiles.projection.operatingSettings?.defaultTaxRate, 19, "Eigene-Daten-Projektion enthält die Standard-MwSt. nicht");
          assertEqual(ownFiles.projection.operatingSettings?.defaultBusinessArea?.id, "hair", "Eigene-Daten-Projektion enthält den Standard-Geschäftsbereich nicht");
          assertEqual(ownFiles.projection.company.logo?.assetId, "company-logo", "Eigene-Daten-Projektion kann das aktive Unternehmenslogo nicht den Asset-Metadaten zuordnen");
          assertEqual(ownFiles.projection.operatingSettings?.businessAreas[0]?.logo?.assetId, "business-logo-hair", "Eigene-Daten-Projektion kann das aktive Bereichslogo nicht den Asset-Metadaten zuordnen");
          assertEqual(ownFiles.projection.operatingSettings?.businessAreas[0]?.logo?.name, "Bereichslogo.jpg", "Eigene-Daten-Projektion enthält keine Bereichslogo-Metadaten");
          assert(!hasOwn(ownFiles.projection.operatingSettings?.businessAreas[0]?.logo || {}, "dataUrl"), "Eigene-Daten-Projektion enthält Bereichslogo-Bilddaten");
          assertEqual(ownFiles.projection.operatingSettings?.logoAssets.length, snapshot.stores.settings.logoAssets.length, "Eigene-Daten-Projektion enthält nicht alle Logoasset-Metadaten");
          assert(ownFiles.projection.operatingSettings.logoAssets.every(asset => !hasOwn(asset, "dataUrl")), "Eigene-Daten-Projektion enthält Logoasset-Bildrohdaten");
          assertEqual(taxFiles.projection.operatingSettings, null, "Steuerberatungsexport enthält Logoasset-Metadaten");
          assertDeepEqual(ownFiles.projection.operatingSettings?.paymentChoices.map(choice => choice.id), ["cash", "ec", "voucher"], "Eigene-Daten-Projektion verändert die Zahlungsartenreihenfolge");
          assertEqual(ownFiles.projection.operatingSettings?.receiptNumbering.nextNumber, 77, "Eigene-Daten-Projektion enthält den Nummernstand nicht");
          assertEqual(ownFiles.projection.operatingSettings?.receiptTexts.footerText, "Test-Fußtext", "Eigene-Daten-Projektion enthält den Beleg-Fußtext nicht");
          assertDeepEqual(ownFiles.projection.operatingSettings?.backupReminder, { interval: "5-days" }, "Eigene-Daten-Projektion enthält nicht ausschließlich die Intervallwahl");
          const taxInfo = taxFiles.files.find(file => file.name === "Export-Info.txt")?.content || "";
          const ownInfo = ownFiles.files.find(file => file.name === "Export-Info.txt")?.content || "";
          assert(!taxInfo.includes("Aktiver Benutzer:"), "Steuerberatungsexport weist den internen Benutzer aus");
          assert(!taxInfo.includes("Lizenz-ID:") && !taxInfo.includes("Geräte-ID:"), "Steuerberatungsexport weist Lizenz- oder Gerätedaten aus");
          assert(!taxInfo.includes("Ansprechpartner:") && !taxInfo.includes("Website:"), "Steuerberatungsexport wurde um eigene Unternehmensstammdaten erweitert");
          assert(!taxInfo.includes("Standard-MwSt.:") && !taxInfo.includes("Aktive Zahlungsarten:"), "Steuerberatungsexport weist reine App-Einstellungen aus");
          assert(!taxInfo.includes("Sicherungsintervall:"), "Steuerberatungsexport weist das lokale Sicherungsintervall aus");
          assert(ownInfo.includes("Aktiver Benutzer: Testperson"), "Eigene-Daten-Export dokumentiert den aktiven Benutzer nicht");
          assert(ownInfo.includes("Ansprechpartner: Test Kontakt"), "Eigene-Daten-Export dokumentiert den Ansprechpartner nicht");
          assert(ownInfo.includes("Website: https://test.example.invalid/"), "Eigene-Daten-Export dokumentiert die Website nicht");
          assert(ownInfo.includes(`Lizenz-ID: ${snapshot.stores.settings.license.licenseId}`), "Eigene-Daten-Export dokumentiert die Lizenz-ID nicht");
          assert(ownInfo.includes("Lizenzprodukt: frecka.core · Version 1"), "Eigene-Daten-Export dokumentiert das Lizenzprodukt nicht");
          assert(!ownInfo.includes("Geräte-ID:") && !ownInfo.includes("signedLicenseToken") && !ownInfo.includes("devicePrivateKey"), "Eigene-Daten-Export enthält lokale Runtime-Daten");
          assert(ownInfo.includes("Währung: EUR"), "Eigene-Daten-Export dokumentiert die Währung nicht");
          assert(ownInfo.includes("Steuerstatus: Umsatzsteuer wird berechnet"), "Eigene-Daten-Export dokumentiert den Steuerstatus nicht verständlich");
          assert(ownInfo.includes("Standard-MwSt.: 19,00 %"), "Eigene-Daten-Export dokumentiert die Standard-MwSt. nicht");
          assert(ownInfo.includes("Standard-Geschäftsbereich: Friseur"), "Eigene-Daten-Export dokumentiert den Standard-Geschäftsbereich nicht");
          assert(ownInfo.includes("Aktive Zahlungsarten: Bar, EC, Gutschein"), "Eigene-Daten-Export dokumentiert die aktiven Zahlungsarten nicht");
          assert(ownInfo.includes("Nächste Belegnummer: 2030-000077"), "Eigene-Daten-Export dokumentiert den geschützten Nummernstand nicht");
          assert(ownInfo.includes("Sicherungsintervall: Alle 5 Tage"), "Eigene-Daten-Export dokumentiert die Intervallwahl nicht");
        }
      },
      {
        name: "Export-Info dokumentiert Version, Filter, Zählungen und DATEV-Grenze korrekt",
        run: async () => {
          const exported = exportApi.createExportFiles(completeExportSnapshotFixture("test-export-info"), {
            exportType: "tax-advisor",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "hair",
            generatedAt: "2030-02-01T12:34:00.000Z"
          });
          const info = exported.files.find(file => file.name === "Export-Info.txt")?.content || "";
          assert(info.includes("FRECKA-Version: EXPORT-001"), "FRECKA-Version fehlt");
          assert(info.includes("Geschäftsbezeichnung: Frisör Änne & Söhne"), "Geschäftsbezeichnung fehlt");
          assert(info.includes("Unternehmer/in: Testperson"), "Unternehmer fehlt");
          assert(info.includes("Exportdatum: 01.02.2030 • 12:34"), "Exportdatum ist nicht deutsch formatiert");
          assert(info.includes("Zeitraum: 01.01.2030 bis 31.01.2030"), "Dokumentierter Zeitraum ist falsch");
          assert(info.includes("Anzahl Belege: 4"), "Belegzählung ist falsch");
          assert(info.includes("Anzahl Gutscheine: 1"), "Gutscheinzählung ist falsch");
          assert(info.includes("Dies ist ein FRECKA-Export.\r\nKeine bestätigte DATEV-Importschnittstelle."), "DATEV-Hinweis fehlt oder behauptet zu viel");
        }
      },
      {
        name: "Export zeigt ohne Geschäftsbezeichnung ausschließlich den Unternehmer",
        run: async () => {
          const snapshot = completeExportSnapshotFixture("test-export-owner-only");
          snapshot.stores.settings.company.name = "";
          snapshot.stores.settings.company.owner = "Solo Unternehmerin";
          const exported = exportApi.createExportFiles(snapshot, {
            exportType: "tax-advisor",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "all"
          });
          const info = exported.files.find(file => file.name === "Export-Info.txt")?.content || "";
          assert(!info.includes("Geschäftsbezeichnung:"), "Leere Geschäftsbezeichnung wurde ausgegeben");
          assertEqual((info.match(/Solo Unternehmerin/g) || []).length, 1, "Unternehmer wurde im Export doppelt dargestellt");
        }
      },
      {
        name: "Export erzeugt nur die freigegebenen Dateien und verändert den Snapshot nicht",
        run: async () => {
          const snapshot = completeExportSnapshotFixture("test-export-immutable");
          const before = clone(snapshot);
          const exported = exportApi.createExportFiles(snapshot, {
            exportType: "own-data",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "all",
            includeCustomers: true
          });
          assertDeepEqual(exported.files.map(file => file.name), ["Belege.csv", "Belegpositionen.csv", "Gutscheine.csv", "Gutschein-Historie.csv", "Kunden.csv", "Export-Info.txt"], "Dateisatz enthält fehlende oder zusätzliche Dateien");
          assert(!exported.files.some(file => /qr|pdf|mail|synology|zip/i.test(file.name)), "Nicht freigegebener Exporttyp wurde erzeugt");
          assertDeepEqual(snapshot, before, "Export hat den zentralen Snapshot verändert");
        }
      },
      {
        name: "Übersicht summiert gespeicherte Werte je Geschäftsbereich und Steuersatz",
        run: async () => {
          const snapshot = completeExportSnapshotFixture("test-export-summary");
          const projection = exportApi.createExportProjection(snapshot, {
            exportType: "tax-advisor",
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "all"
          });
          assertDeepEqual(projection.summary, [
            { rowType: "Steuersatz", businessArea: "Snapshot Studio", taxRate: "0,00", receiptCount: 1, net: "100,00", tax: "0,00", gross: "100,00" },
            { rowType: "Steuersatz", businessArea: "Snapshot Studio", taxRate: "19,00", receiptCount: 3, net: "54,98", tax: "10,45", gross: "65,43" },
            { rowType: "Geschäftsbereich gesamt", businessArea: "Snapshot Studio", taxRate: "", receiptCount: 4, net: "54,98", tax: "10,45", gross: "165,43" },
            { rowType: "Steuersatz", businessArea: "Test-Coaching", taxRate: "0,00", receiptCount: 1, net: "100,00", tax: "0,00", gross: "100,00" },
            { rowType: "Steuersatz", businessArea: "Test-Coaching", taxRate: "19,00", receiptCount: 1, net: "-8,40", tax: "-1,60", gross: "-10,00" },
            { rowType: "Geschäftsbereich gesamt", businessArea: "Test-Coaching", taxRate: "", receiptCount: 2, net: "-8,40", tax: "-1,60", gross: "90,00" },
            { rowType: "Gesamtsumme", businessArea: "Alle Geschäftsbereiche", taxRate: "", receiptCount: 6, net: "46,58", tax: "8,85", gross: "255,43" }
          ], "Übersicht enthält falsche Bereichs-, Steuersatz- oder Gesamtsummen");
          const summaryFile = exportApi.createSummaryFile(projection);
          assertEqual(summaryFile.name, "Übersicht.csv", "Übersichtsdatei besitzt einen falschen Namen");
          assert(summaryFile.content.startsWith("\uFEFF\"Zeilenart\";\"Geschäftsbereich\";\"Steuersatz\""), "Übersicht verwendet nicht dieselben sicheren CSV-Regeln");
        }
      },
      {
        name: "Steuerberaterpaket enthält Daten und echte PDFs aller Belegarten in genau einem ZIP",
        run: async () => {
          const tenantId = "test-export-package";
          const snapshot = completeExportSnapshotFixture(tenantId);
          const receipts = snapshot.stores.receipts.receipts.map(receipt => clone(receipt));
          const cancellation = receipts.find(receipt => receipt.id === "receipt-export-cancellation");
          const credit = receipts.find(receipt => receipt.id === "receipt-export-credit");
          cancellation.number = "ST-2030-000101";
          cancellation.receiptNumber = "ST-2030-000101";
          credit.number = "GS-2030-000099";
          credit.receiptNumber = "GS-2030-000099";
          snapshot.stores.receipts = api.snapshotReceipts({ receipts }, tenantId);
          const before = clone(snapshot);
          const packageResult = await exportPackageApi.createTaxAdvisorPackage(snapshot, {
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "all",
            generatedAt: "2030-02-01T12:34:00.000Z"
          }, {
            createReceiptPdf: receipt => {
              const linkedVoucher = snapshot.stores.vouchers.vouchers.find(voucher => voucher.reference === receipt.voucherReference) || null;
              const model = documentApi.createReceiptDocumentModel(receipt, { ...documentOptions(), linkedVoucher });
              return documentApi.createPdfBytes(model);
            }
          });
          assertEqual(packageResult.packageFile.name, "FRECKA-Steuerberatung-2030-01.zip", "ZIP-Dateiname ist nicht periodenbezogen");
          assertEqual(packageResult.packageFile.mimeType, "application/zip", "ZIP besitzt einen falschen Medientyp");
          assert(packageResult.packageFile.content instanceof Blob && packageResult.packageFile.size > 0, "ZIP wurde nicht als lokale Binärdatei erzeugt");
          assertEqual(packageResult.pdfCount, 6, "ZIP enthält nicht zu jedem gefilterten Beleg ein PDF");
          assertDeepEqual(packageResult.files.map(file => file.name), ["Übersicht.csv", "Belege.csv", "Belegpositionen.csv", "Gutscheine.csv", "Gutschein-Historie.csv", "Export-Info.txt"], "Datenstruktur des ZIP-Pakets ist falsch");
          assert(!packageResult.entries.some(entry => entry.name === "Kunden.csv"), "Steuerberaterpaket enthält Kundenstammdaten");

          const archive = await globalThis.JSZip.loadAsync(await packageResult.packageFile.content.arrayBuffer(), { checkCRC32: true });
          const paths = Object.keys(archive.files).sort();
          const root = "FRECKA-Steuerberatung-2030-01";
          const expectedPaths = [
            `${root}/Belege.csv`,
            `${root}/Belegpositionen.csv`,
            `${root}/Export-Info.txt`,
            `${root}/Gutschein-Historie.csv`,
            `${root}/Gutscheine.csv`,
            `${root}/Übersicht.csv`,
            `${root}/Belege/2030-000101.pdf`,
            `${root}/Belege/2030-000102.pdf`,
            `${root}/Belege/2030-000106.pdf`,
            `${root}/Belege/2030-000109.pdf`,
            `${root}/Belege/GS-2030-000099.pdf`,
            `${root}/Belege/ST-2030-000101.pdf`
          ].sort();
          assertDeepEqual(paths, expectedPaths, "ZIP besitzt nicht die vereinbarte Paketstruktur");
          for (const path of paths.filter(path => path.endsWith(".pdf"))) {
            const bytes = await archive.file(path).async("uint8array");
            assert(pdfHeader(bytes).startsWith("%PDF-"), `ZIP-Eintrag ${path} ist kein echtes PDF`);
          }
          assertDeepEqual(snapshot, before, "Paketexport hat den zentralen Snapshot verändert");
        }
      },
      {
        name: "Steuerberaterpaket löst PDF-Logos zentral auf und exportiert keine Bildrohdaten",
        run: async () => {
          const snapshot = completeExportSnapshotFixture("test-export-package-branding");
          const brandedReceipt = snapshot.stores.receipts.receipts[0];
          brandedReceipt.brandingSnapshot = {
            logoMode: "company",
            visibleName: "",
            logo: { assetId: "company-logo", source: "company", label: "Unternehmenslogo" }
          };
          const packageResult = await exportPackageApi.createTaxAdvisorPackage(snapshot, {
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "hair",
            generatedAt: "2030-02-01T12:34:00.000Z"
          });
          const archive = await globalThis.JSZip.loadAsync(await packageResult.packageFile.content.arrayBuffer(), { checkCRC32: true });
          const pdfPath = Object.keys(archive.files).find(path => path.endsWith(`/${brandedReceipt.number}.pdf`));
          const pdf = await globalThis.PDFLib.PDFDocument.load(await archive.file(pdfPath).async("uint8array"));
          const imageCount = [...pdf.context.enumerateIndirectObjects()].filter(([, object]) => (
            (object?.dict?.get?.(globalThis.PDFLib.PDFName.of("Subtype"))
              || object?.get?.(globalThis.PDFLib.PDFName.of("Subtype")))?.toString() === "/Image"
          )).length;
          assert(imageCount > 0, "Steuerberater-PDF enthält das historische Logoasset nicht");
          const textEntries = packageResult.entries.filter(entry => entry.kind === "data");
          for (const entry of textEntries) {
            const content = await archive.file(entry.path).async("string");
            assert(!content.includes("data:image/") && !content.includes(tinyPngBase64), `Exportdatei ${entry.name} enthält Logo-Bildrohdaten`);
          }
        }
      },
      {
        name: "ZIP-Paket wendet Zeitraum und Geschäftsbereich identisch auf CSV und PDFs an",
        run: async () => {
          const snapshot = completeExportSnapshotFixture("test-export-package-filter");
          const packageResult = await exportPackageApi.createTaxAdvisorPackage(snapshot, {
            periodType: "custom",
            dateFrom: "2030-01-01",
            dateTo: "2030-01-31",
            businessAreaId: "hair",
            generatedAt: "2030-02-01T12:34:00.000Z"
          }, {
            createReceiptPdf: () => new TextEncoder().encode("%PDF-1.7\nfilter-test")
          });
          assertEqual(packageResult.rootDirectory, "FRECKA-Steuerberatung-2030-01-Friseur", "Gefiltertes Paket kennzeichnet den Geschäftsbereich nicht");
          assertEqual(packageResult.pdfCount, 4, "PDF-Auswahl weicht vom Belegfilter ab");
          assertDeepEqual(
            packageResult.entries.filter(entry => entry.kind === "receipt-pdf").map(entry => entry.receiptNumber),
            packageResult.projection.receipts.map(receipt => receipt.receiptNumber),
            "PDFs und CSV-Belege verwenden nicht dieselbe zentrale Auswahl"
          );
          assert(packageResult.projection.summary.every(row => row.businessArea !== "Test-Coaching"), "Gefilterte Übersicht enthält einen fremden Geschäftsbereich");
          assert(!packageResult.entries.some(entry => entry.name === "2030-000104.pdf"), "Gefiltertes Paket enthält das Coaching-PDF");
        }
      },
      {
        name: "Backup-Dateiname und neutraler Downloadtyp sind iOS-robust",
        run: async () => {
          const localDate = new Date(2030, 1, 1, 12, 34, 59);
          assertEqual(
            backupApi.backupFilename(localDate.toISOString()),
            "FRECKA-Backup-2030-02-01-1234.frecka-backup",
            "Backup-Dateiname ist nicht chronologisch oder enthält unerwartete Zeichen"
          );
          assertEqual(backupApi.constants.downloadMimeType, "application/octet-stream", "Download verwendet keinen neutralen Binärtyp");
        }
      },
      {
        name: "Vollständiger Tenant-Snapshot wird ohne Reparatur validiert",
        run: async () => {
          const tenantId = "test-backup-valid";
          const snapshot = completeTenantSnapshotFixture(tenantId);
          const validated = api.validateTenantSnapshot(snapshot, tenantId);
          assertEqual(validated.snapshot.backupFormatVersion, 1, "Falsche Backup-Formatversion");
          assertEqual(validated.summary.companyName, "Backup Teststudio", "Geschäftsbezeichnung fehlt in der Backup-Vorschau");
          assertEqual(validated.summary.companyOwner, "Testperson", "Unternehmer fehlt in der Backup-Vorschau");
          assertEqual(validated.summary.catalogItems, 2, "Katalogzählung ist falsch");
          assertEqual(validated.summary.customers, 2, "Kundenzählung ist falsch");
          assertEqual(validated.summary.receipts, 2, "Belegzählung ist falsch");
          assertEqual(validated.summary.vouchers, 1, "Gutscheinzählung ist falsch");
          assertEqual(validated.snapshot.stores.settings.users.length, 1, "Benutzer fehlt im Backup-Snapshot");
          assertEqual(validated.snapshot.stores.settings.users[0].tenantId, tenantId, "Backup-Benutzer gehört zum falschen Mandanten");
          assertEqual(validated.snapshot.stores.settings.license.localTenantId, tenantId, "Backup-Lizenz gehört zum falschen Mandanten");
          assertEqual(validated.snapshot.stores.settings.license.licenseId, snapshot.stores.settings.license.licenseId, "Backup veränderte die portable Lizenzreferenz");
          const historicalSchemaFive = clone(snapshot);
          historicalSchemaFive.appDataSchemaVersion = 5;
          const migratedSchemaFive = api.validateTenantSnapshot(historicalSchemaFive, tenantId).snapshot;
          assertEqual(migratedSchemaFive.appDataSchemaVersion, 8, "Historisches Schema-5-Backup wurde nicht auf die aktuelle Snapshotprojektion angehoben");
        }
      },
      {
        name: "Historische BRANDING-001-Settings werden vor Backup und Restore verlustfrei migriert",
        run: async () => {
          const persistence = context.makeClient("backup-branding-legacy");
          const tenantId = persistence.tenantId;
          const legacy = completeTenantSnapshotFixture(tenantId);
          delete legacy.stores.settings.logoAssets;
          legacy.stores.settings.company.logo = companyLogoFixture();
          legacy.stores.settings.businessAreas[0].logoMode = "custom";
          legacy.stores.settings.businessAreas[0].logo = businessAreaLogoFixture();

          const validated = api.validateTenantSnapshot(legacy, tenantId).snapshot;
          assertEqual(validated.stores.settings.logoAssets.length, 2, "Historische Inline-Logos wurden nicht in das zentrale Register übernommen");
          assertEqual(validated.stores.settings.company.logo.assetId, "company-logo", "Unternehmenslogo erhielt keine stabile Asset-Referenz");
          assertEqual(validated.stores.settings.businessAreas[0].logo.assetId, "business-logo-hair", "Geschäftsbereichslogo erhielt keine stabile Asset-Referenz");

          const encrypted = await backupApi.encryptTenantSnapshot(validated, cryptoPassphrase);
          const decrypted = await backupApi.decryptTenantSnapshot(encrypted, cryptoPassphrase);
          const roundtrip = api.validateTenantSnapshot(decrypted, tenantId).snapshot;
          assertDeepEqual(roundtrip.stores.settings.logoAssets, validated.stores.settings.logoAssets, "Verschlüsselungs-Roundtrip verlor migrierte Logoassets");

          await writeRawSettingsRecord(persistence, legacy.stores.settings);
          await persistence.writeCatalog(legacy.stores.catalog);
          await persistence.writeCustomers(legacy.stores.customers);
          await persistence.writeReceipts(legacy.stores.receipts);
          await persistence.writeVouchers(legacy.stores.vouchers);
          const persistedLegacy = await persistence.readSettings();
          assertEqual(persistedLegacy.logoAssets, undefined, "Testfixture wurde vor der Startnormalisierung unerwartet verändert");
          const startupDefaults = api.snapshotSettings(freshRuntimeFixture(tenantId), "not-started", tenantId);
          const startupNormalization = api.normalizeSettingsRecord(persistedLegacy, startupDefaults, tenantId);
          assert(startupNormalization.repairs.includes("LOGO_ASSET_REGISTER_DEFAULTED"), "Startnormalisierung erkannte das fehlende Asset-Register nicht");
          assert(startupNormalization.repairs.includes("LEGACY_LOGO_ASSET_REGISTERED"), "Startnormalisierung erkannte historische Inline-Logos nicht");
          await persistence.writeSettings(startupNormalization.record);
          const persistedNormalized = await persistence.readSettings();
          assertEqual(persistedNormalized.logoAssets.length, 2, "Startnormalisierung wurde nicht dauerhaft in IndexedDB übernommen");
          assertEqual(persistedNormalized.company.logo.assetId, "company-logo", "Persistierte Startnormalisierung verlor die Unternehmenslogo-Referenz");
          const persistedBackup = await backupApi.createBackup({
            passphrase: cryptoPassphrase,
            createSnapshot: () => persistence.exportTenantSnapshot()
          });
          const persistedBackupSnapshot = await backupApi.decryptTenantSnapshot(persistedBackup.serializedBackup, cryptoPassphrase);
          assertEqual(persistedBackupSnapshot.stores.settings.logoAssets.length, 2, "IndexedDB-Backup verlor die migrierten Logoassets");

          const historicalWithoutLogos = completeTenantSnapshotFixture(`${tenantId}-empty`);
          delete historicalWithoutLogos.stores.settings.logoAssets;
          historicalWithoutLogos.stores.settings.company.logo = null;
          historicalWithoutLogos.stores.settings.businessAreas.forEach(area => {
            area.logoMode = "company";
            area.logo = null;
          });
          const emptyValidated = api.validateTenantSnapshot(historicalWithoutLogos, `${tenantId}-empty`).snapshot;
          assertDeepEqual(emptyValidated.stores.settings.logoAssets, [], "Historische Sicherung ohne Logos erhielt künstliche Assets");

          const appResponse = await fetch("../js/app.js", { cache: "no-store" });
          assert(appResponse.ok, "App-Quelle für BRANDING-002-Startmigration konnte nicht geladen werden");
          const appSource = await appResponse.text();
          assert(appSource.includes("persistence.prepareHistoricalSettingsRecord"), "Startpfad verwendet die zentrale historische Settingsnormalisierung nicht");
          assert(appSource.includes("prepared.compatible && prepared.changed"), "Startpfad persistiert eine freigegebene historische Normalisierung nicht");
        }
      },
      {
        name: "Realistischer Mehrlogo-Bestand durchläuft Snapshot, Verschlüsselung, Datei, Share und Restore",
        run: async () => {
          const persistence = context.makeClient("backup-realistic-logo-payload");
          const snapshot = completeTenantSnapshotFixture(persistence.tenantId);
          const logoAssets = [
            realisticLogoAssetFixture("company-logo-current", 700000, "2030-01-01T10:00:00.000Z", 1),
            realisticLogoAssetFixture("business-logo-current", 700000, "2030-01-02T10:00:00.000Z", 2),
            realisticLogoAssetFixture("company-logo-historical", 700000, "2029-12-01T10:00:00.000Z", 3)
          ];
          const logoReference = asset => ({
            formatVersion: 1,
            assetId: asset.assetId,
            name: asset.fileName,
            mimeType: asset.mimeType,
            size: asset.size,
            updatedAt: asset.createdAt
          });
          snapshot.stores.settings.logoAssets = logoAssets;
          snapshot.stores.settings.company.logo = logoReference(logoAssets[0]);
          snapshot.stores.settings.businessAreas.forEach(area => {
            area.logoMode = "company";
            area.logo = null;
          });
          snapshot.stores.settings.businessAreas[0].logoMode = "custom";
          snapshot.stores.settings.businessAreas[0].logo = logoReference(logoAssets[1]);
          snapshot.stores.settings.backupReminder = {
            formatVersion: 1,
            interval: "5-days",
            baselineAt: "2030-01-01T08:00:00.000Z",
            lastSuccessfulAt: "2030-01-05T08:00:00.000Z",
            snoozedUntil: null
          };

          const validated = api.validateTenantSnapshot(snapshot, persistence.tenantId).snapshot;
          const prepared = await backupApi.createBackup({
            passphrase: cryptoPassphrase,
            createSnapshot: async () => validated
          });
          assert(new Blob([prepared.serializedBackup]).size > 2_000_000, "Mehrlogo-Test bildet keine realistische Sicherungsgröße ab");
          const decrypted = await backupApi.decryptTenantSnapshot(prepared.serializedBackup, cryptoPassphrase);
          assertEqual(decrypted.stores.settings.logoAssets.length, 3, "Verschlüsselung verlor historische Logoassets");

          let sharedFile = null;
          const output = await backupApi.deliverBackup(prepared.serializedBackup, prepared.filename, {
            shareService: {
              createFile: (content, options) => new File([content], options.name, { type: options.type }),
              canShareFiles: files => files.length === 1 && files[0] instanceof File,
              shareFiles: async files => {
                sharedFile = files[0];
                return { status: "shared", mode: "files" };
              }
            }
          });
          assertEqual(output.status, "shared", "Realistische Sicherungsdatei erreichte den Share-Pfad nicht");
          assertEqual(sharedFile?.name, prepared.filename, "Share-Pfad veränderte den Sicherungsdateinamen");
          assertEqual(sharedFile?.type, backupApi.constants.downloadMimeType, "Share-Pfad veränderte den Sicherungsdateityp");

          await persistence.restoreTenantSnapshot(decrypted);
          const restored = await persistence.exportTenantSnapshot();
          assertDeepEqual(restored.stores.settings.logoAssets, logoAssets, "Restore verlor aktuelle oder historische Logoassets");
          assertEqual(restored.stores.settings.backupReminder.interval, "5-days", "Restore verlor das BACKUP-004-Intervall");
          assertEqual(restored.stores.settings.users.length, 1, "Restore verlor den aktiven Benutzer");
          assertEqual(restored.stores.settings.license.localTenantId, persistence.tenantId, "Restore verlor die portable Lizenzreferenz");
          assertEqual(restored.stores.settings.tseSettings.enabled, false, "Restore veränderte die TSE-Vorbereitung");
        }
      },
      {
        name: "Historische Sicherung ohne USER-001 wird beim Restore deterministisch ergänzt",
        run: async () => {
          const tenantId = "test-backup-user-legacy";
          const legacy = completeTenantSnapshotFixture(tenantId);
          delete legacy.stores.settings.users;
          delete legacy.stores.settings.activeUserId;
          const validated = api.validateTenantSnapshot(legacy, tenantId);
          assertEqual(validated.snapshot.stores.settings.users.length, 1, "Historische Sicherung erhielt keinen Benutzer");
          assertEqual(validated.snapshot.stores.settings.users[0].displayName, legacy.stores.settings.company.owner, "Historischer Backup-Benutzer wurde nicht deterministisch abgeleitet");
          assertEqual(validated.snapshot.stores.settings.activeUserId, validated.snapshot.stores.settings.users[0].id, "Historischer Backup-Benutzer ist nicht aktiv referenziert");

          const persistence = context.makeClient("backup-user-legacy-restore");
          legacy.tenantId = persistence.tenantId;
          Object.values(legacy.stores).forEach(store => { store.tenantId = persistence.tenantId; });
          legacy.stores.settings.license.localTenantId = persistence.tenantId;
          await persistence.restoreTenantSnapshot(legacy);
          const restored = await persistence.readSettings();
          assertEqual(restored.users.length, 1, "Restore persistierte den ergänzten Benutzer nicht");
          assertEqual(restored.users[0].tenantId, persistence.tenantId, "Restore persistierte einen mandantenfremden Benutzer");
        }
      },
      {
        name: "Historische Sicherung ohne LICENSE-001 erhält beim Restore eine stabile lokale Bindung",
        run: async () => {
          const tenantId = "test-backup-license-legacy";
          const legacy = completeTenantSnapshotFixture(tenantId);
          delete legacy.stores.settings.license;
          let firstValidation;
          try {
            firstValidation = api.validateTenantSnapshot(legacy, tenantId).snapshot;
          } catch (error) {
            throw new Error(`Historische LICENSE-001-Migration wurde abgelehnt: ${error.code || error.name} ${JSON.stringify(error.diagnostic || {})}`);
          }
          const secondValidation = api.validateTenantSnapshot(legacy, tenantId).snapshot;
          assertEqual(firstValidation.stores.settings.license.localTenantId, tenantId, "Historische Sicherung erhielt eine mandantenfremde Lizenz");
          assertEqual(firstValidation.stores.settings.license.licenseId, secondValidation.stores.settings.license.licenseId, "Lokale Lizenzmigration ist innerhalb der Installation nicht stabil");

          const persistence = context.makeClient("backup-license-legacy-restore");
          legacy.tenantId = persistence.tenantId;
          Object.values(legacy.stores).forEach(store => { store.tenantId = persistence.tenantId; });
          legacy.stores.settings.users.forEach(user => { user.tenantId = persistence.tenantId; });
          await persistence.restoreTenantSnapshot(legacy);
          const restored = await persistence.readSettings();
          assertEqual(restored.license.localTenantId, persistence.tenantId, "Restore persistierte eine mandantenfremde Lizenz");
          assert(restored.license.licenseId && restored.license.formatVersion === 2, "Restore persistierte die portable Lizenzreferenz nicht");
          assertEqual(await persistence.readLicenseRuntime(), null, "Restore stellte fälschlich eine Geräteautorisierung her");
        }
      },
      {
        name: "Historisches LICENSE-001-Backup wird portabel migriert und stellt keine Runtime wieder her",
        run: async () => {
          const sourceTenantId = "test-backup-license-v1";
          const historical = completeTenantSnapshotFixture(sourceTenantId);
          historical.appDataSchemaVersion = 5;
          historical.stores.settings.license = legacyLicenseFixture(sourceTenantId, {
            licenseId: "license_backup_v1",
            deviceId: "device_backup_v1"
          });
          const validated = api.validateTenantSnapshot(historical, sourceTenantId).snapshot;
          assertEqual(validated.stores.settings.license.formatVersion, 2, "Historische Backup-Lizenz wurde nicht zu V2 migriert");
          assertEqual(validated.stores.settings.license.licenseId, "license_backup_v1", "Historische Backup-Lizenz-ID wurde verändert");
          assert(!hasOwn(validated.stores.settings.license, "deviceId"), "Historische Geräte-ID gelangte in die portable Referenz");

          const persistence = context.makeClient("backup-license-v1-restore");
          const targetTenantId = persistence.tenantId;
          historical.tenantId = targetTenantId;
          Object.values(historical.stores).forEach(store => { store.tenantId = targetTenantId; });
          historical.stores.settings.users.forEach(user => { user.tenantId = targetTenantId; });
          historical.stores.settings.license.tenantId = targetTenantId;
          await persistence.restoreTenantSnapshot(historical);
          const restored = await persistence.readSettings();
          assertEqual(restored.license.formatVersion, 2, "Restore persistierte nicht die portable V2-Referenz");
          assertEqual(restored.license.licenseId, "license_backup_v1", "Restore veränderte die historische Lizenz-ID");
          assertEqual(await persistence.readLicenseRuntime(), null, "Restore importierte Geräte-ID oder Schlüsselruntime");
        }
      },
      {
        name: "Unvollständiger Snapshot wird vor jeder Wiederherstellung abgelehnt",
        run: async () => {
          const tenantId = "test-backup-incomplete";
          const snapshot = completeTenantSnapshotFixture(tenantId);
          delete snapshot.stores.customers;
          await assertRejects(
            () => api.validateTenantSnapshot(snapshot, tenantId),
            "BACKUP_INCOMPLETE",
            "Fehlender Kundenstore"
          );
        }
      },
      {
        name: "Restore lehnt inkonsistente Gutschein-Verkaufsbelege vor jeder Schreibtransaktion ab",
        run: async () => {
          const persistence = context.makeClient("restore-invariant-stop");
          const snapshot = completeTenantSnapshotFixture(persistence.tenantId);
          snapshot.stores.receipts.receipts.find(receipt => receipt.receiptKind === "voucher-sale").voucherReference = "vch_wrong";
          await assertRejects(
            () => persistence.restoreTenantSnapshot(snapshot),
            "VOUCHER_RECEIPT_INVARIANT_INVALID",
            "Inkonsistente Gutschein-Verkaufsbelege im Restore"
          );
          assertEqual(await persistence.readSettings(), null, "Abgelehnter Restore hat trotz Vorprüfung Daten geschrieben");
        }
      },
      {
        name: "Mandantenfremde Sicherung wird abgelehnt",
        run: async () => {
          const snapshot = completeTenantSnapshotFixture("tenant-fremd");
          await assertRejects(
            () => api.validateTenantSnapshot(snapshot, "tenant-lokal"),
            "BACKUP_TENANT_MISMATCH",
            "Fremder Tenant"
          );
        }
      },
      {
        name: "Ungültige Referenztypen werden vor dem Restore abgelehnt",
        run: async () => {
          const tenantId = "test-backup-reference";
          const snapshot = completeTenantSnapshotFixture(tenantId);
          snapshot.stores.vouchers.vouchers[0].redemptionReferences.push(42);
          await assertRejects(
            () => api.validateTenantSnapshot(snapshot, tenantId),
            "BACKUP_VALIDATION_FAILED",
            "Ungültiger Referenztyp"
          );
          const invalidHistory = completeTenantSnapshotFixture(tenantId);
          invalidHistory.stores.vouchers.vouchers[0].history[0].balanceAfterCents = 9000;
          invalidHistory.stores.vouchers.vouchers[0].history[0].balanceAfter = 90;
          await assertRejects(
            () => api.validateTenantSnapshot(invalidHistory, tenantId),
            "BACKUP_VOUCHER_HISTORY_INVALID",
            "Widersprüchlicher Historienwert"
          );
        }
      },
      {
        name: "Kollisionsgefährlicher Belegnummernstand wird abgelehnt",
        run: async () => {
          const tenantId = "test-backup-number";
          const snapshot = completeTenantSnapshotFixture(tenantId);
          snapshot.stores.settings.receiptSettings.nextNumber = 76;
          await assertRejects(
            () => api.validateTenantSnapshot(snapshot, tenantId),
            "BACKUP_NUMBER_SEQUENCE_INVALID",
            "Unsicherer Nummernstand"
          );
        }
      },
      {
        name: "AES-GCM-Sicherung lässt sich mit der richtigen Passphrase entschlüsseln",
        run: async () => {
          const encrypted = await encryptedFixture();
          const decrypted = await backupApi.decryptTenantSnapshot(encrypted, cryptoPassphrase);
          assertDeepEqual(decrypted, cryptoPayload, "Entschlüsselter Inhalt weicht ab");
        }
      },
      {
        name: "Gleiche Daten und Passphrase erzeugen unterschiedliche Ciphertexte",
        run: async () => {
          const first = await encryptedFixture();
          const second = await backupApi.encryptTenantSnapshot(cryptoPayload, cryptoPassphrase);
          assert(first !== second, "Salt und IV erzeugten keinen neuen Ciphertext");
        }
      },
      {
        name: "Sicherungsdatei enthält keine Geschäftsdaten oder Passphrase im Klartext",
        run: async () => {
          const encrypted = await encryptedFixture();
          assert(!encrypted.includes("Vertrauliches Teststudio"), "Unternehmensname steht im Klartext in der Datei");
          assert(!encrypted.includes("Vertrauliche Testperson"), "Kundenname steht im Klartext in der Datei");
          assert(!encrypted.includes(cryptoPassphrase), "Passphrase steht im Klartext in der Datei");
          const envelope = JSON.parse(encrypted);
          assertEqual(envelope.crypto.kdf.iterations, 600000, "PBKDF2-Iterationszahl ist falsch");
          assertEqual(envelope.crypto.cipher.name, "AES-GCM", "Falsches Verschlüsselungsverfahren");
          assert(!hasOwn(envelope, "key") && !hasOwn(envelope.crypto, "passphrase"), "Schlüsselmaterial wurde gespeichert");
        }
      },
      {
        name: "Falsche Passphrase liefert einen klaren Entschlüsselungsfehler",
        run: async () => {
          await assertRejects(
            async () => backupApi.decryptTenantSnapshot(await encryptedFixture(), wrongCryptoPassphrase),
            "BACKUP_DECRYPT_FAILED",
            "Falsche Passphrase"
          );
        }
      },
      {
        name: "Manipulierter Ciphertext wird durch AES-GCM erkannt",
        run: async () => {
          const envelope = JSON.parse(await encryptedFixture());
          const index = Math.max(1, Math.floor(envelope.payload.length / 2));
          envelope.payload = `${envelope.payload.slice(0, index)}${envelope.payload[index] === "A" ? "B" : "A"}${envelope.payload.slice(index + 1)}`;
          await assertRejects(
            () => backupApi.decryptTenantSnapshot(JSON.stringify(envelope), cryptoPassphrase),
            "BACKUP_DECRYPT_FAILED",
            "Manipulierter Ciphertext"
          );
        }
      },
      {
        name: "Manipulierter Dateikopf wird authentifiziert",
        run: async () => {
          const envelope = JSON.parse(await encryptedFixture());
          envelope.crypto.cipher.iv = envelope.crypto.cipher.iv.replace(/^./, value => value === "A" ? "B" : "A");
          await assertRejects(
            () => backupApi.decryptTenantSnapshot(JSON.stringify(envelope), cryptoPassphrase),
            "BACKUP_DECRYPT_FAILED",
            "Manipulierter Header"
          );
        }
      },
      {
        name: "Abgeschnittene und unbekannte Sicherungsformate werden getrennt gemeldet",
        run: async () => {
          await assertRejects(
            () => backupApi.decryptTenantSnapshot("{\"backupFormat\":", cryptoPassphrase),
            "BACKUP_FILE_INVALID",
            "Abgeschnittene Datei"
          );
          const envelope = JSON.parse(await encryptedFixture());
          envelope.backupFormatVersion = 999;
          await assertRejects(
            () => backupApi.decryptTenantSnapshot(JSON.stringify(envelope), cryptoPassphrase),
            "BACKUP_FORMAT_UNSUPPORTED",
            "Unbekannte Dateiversion"
          );
        }
      },
      {
        name: "Export ergänzt leere Stores ausschließlich aus zentralen Laufzeit-Snapshots",
        run: async () => {
          const persistence = context.makeClient("backup-export-fallback");
          const fallback = completeTenantSnapshotFixture(persistence.tenantId);
          const exported = await persistence.exportTenantSnapshot({
            fallbackRecords: fallback.stores,
            appVersion: "BACKUP-001",
            appBuild: "smoke"
          });
          assertEqual(exported.stores.settings.company.name, "Backup Teststudio", "Settings-Fallback fehlt");
          assertEqual(exported.stores.catalog.items.length, 2, "Katalog-Fallback fehlt");
          assertEqual(exported.stores.customers.customers.length, 2, "Kunden-Fallback fehlt");
          assertEqual(exported.stores.receipts.receipts.length, 2, "Beleg-Fallback fehlt");
          assertEqual(exported.stores.vouchers.vouchers.length, 1, "Gutschein-Fallback fehlt");
        }
      },
      {
        name: "Persistierte Stores haben beim Export Vorrang vor Fallbackdaten",
        run: async () => {
          const persistence = context.makeClient("backup-export-stored");
          const stored = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Persistierter Betrieb" });
          const fallback = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Fallback Betrieb" });
          await persistence.restoreTenantSnapshot(stored);
          const exported = await persistence.exportTenantSnapshot({ fallbackRecords: fallback.stores });
          assertEqual(exported.stores.settings.company.name, "Persistierter Betrieb", "Fallback überschrieb persistierte Daten");
        }
      },
      {
        name: "Restore befüllt einen vollständig leeren Testmandanten",
        run: async () => {
          const persistence = context.makeClient("backup-restore-empty");
          assertEqual(await persistence.readSettings(), null, "Testmandant enthielt bereits Einstellungen");
          assertEqual(await persistence.readCatalog(), null, "Testmandant enthielt bereits Katalogdaten");
          assertEqual(await persistence.readCustomers(), null, "Testmandant enthielt bereits Kundendaten");
          assertEqual(await persistence.readReceipts(), null, "Testmandant enthielt bereits Belege");
          assertEqual(await persistence.readVouchers(), null, "Testmandant enthielt bereits Gutscheine");
          const target = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Neu wiederhergestellt" });
          await persistence.restoreTenantSnapshot(target);
          const restoredSettings = await persistence.readSettings();
          assertEqual(restoredSettings.company.name, "Neu wiederhergestellt", "Settings fehlen nach Leer-Restore");
          assertDeepEqual(restoredSettings.license, target.stores.settings.license, "Lizenzbindung fehlt nach Leer-Restore");
          assertEqual((await persistence.readCatalog()).items.length, 2, "Katalog fehlt nach Leer-Restore");
          assertEqual((await persistence.readCustomers()).customers.length, 2, "Kunden fehlen nach Leer-Restore");
          assertEqual((await persistence.readReceipts()).receipts.length, 2, "Belege fehlen nach Leer-Restore");
          assertEqual((await persistence.readVouchers()).vouchers.length, 1, "Gutscheine fehlen nach Leer-Restore");
        }
      },
      {
        name: "Restore überschreibt alle sieben Fachstores gemeinsam",
        run: async () => {
          const persistence = context.makeClient("backup-restore-full");
          const before = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Vorher" });
          const target = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Nachher", createdAt: "2030-03-01T12:00:00.000Z" });
          target.stores.customers.customers[0].lastName = "Wiederhergestellt";
          target.stores.catalog.items[0].name = "Wiederhergestellte Leistung";
          target.stores.receipts.receipts[1].note = "Wiederhergestellter Beleg";
          target.stores.vouchers.vouchers[0].qrLink = "https://example.invalid/restored";
          await persistence.restoreTenantSnapshot(before);
          const restored = await persistence.restoreTenantSnapshot(target);
          assertEqual(restored.records.settings.company.name, "Nachher", "Settings wurden nicht ersetzt");
          assertEqual((await persistence.readCustomers()).customers[0].lastName, "Wiederhergestellt", "Kunden wurden nicht ersetzt");
          assertEqual((await persistence.readCatalog()).items[0].name, "Wiederhergestellte Leistung", "Katalog wurde nicht ersetzt");
          assertEqual((await persistence.readReceipts()).receipts[1].note, "Wiederhergestellter Beleg", "Belege wurden nicht ersetzt");
          assertEqual((await persistence.readVouchers()).vouchers[0].qrLink, "https://example.invalid/restored", "Gutscheine wurden nicht ersetzt");
        }
      },
      {
        name: "Restore übernimmt die BACKUP-004-Intervallwahl und bewahrt lokale Zeitpunkte atomar",
        run: async () => {
          const persistence = context.makeClient("backup-reminder-restore");
          const current = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Aktueller Betrieb" });
          current.stores.settings.backupReminder = {
            formatVersion: 1,
            interval: "48-hours",
            baselineAt: "2030-03-01T09:00:00.000Z",
            lastSuccessfulAt: "2030-03-10T09:00:00.000Z",
            snoozedUntil: "2030-03-18T09:00:00.000Z"
          };
          await persistence.writeSettings(current.stores.settings);

          const target = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Wiederhergestellter Betrieb" });
          target.stores.settings.backupReminder = {
            formatVersion: 1,
            interval: "5-days",
            baselineAt: "2029-01-01T09:00:00.000Z",
            lastSuccessfulAt: "2029-01-02T09:00:00.000Z",
            snoozedUntil: null
          };
          const restored = await persistence.restoreTenantSnapshot(target);
          const expectedReminder = { ...current.stores.settings.backupReminder, interval: "5-days" };
          assertDeepEqual(restored.records.settings.backupReminder, expectedReminder, "Restore behandelte Intervallwahl und lokale Reminder-Zeitpunkte nicht getrennt");
          assertDeepEqual((await persistence.readSettings()).backupReminder, expectedReminder, "Persistierter Reminder-Vertrag ist nach Restore inkonsistent");
          assertEqual((await persistence.readSettings()).backupReminder.lastSuccessfulAt, current.stores.settings.backupReminder.lastSuccessfulAt, "Restore zählte fälschlich als erfolgreiche Sicherung");
          assertEqual((await persistence.readSettings()).backupReminder.snoozedUntil, current.stores.settings.backupReminder.snoozedUntil, "Restore umging den lokalen Snooze");
          assertEqual((await persistence.readSettings()).company.name, "Wiederhergestellter Betrieb", "Reminder-Schutz verhinderte den fachlichen Restore");
        }
      },
      {
        name: "Simulierter Restore-Fehler rollt alle Stores atomar zurück",
        run: async () => {
          const persistence = context.makeClient("backup-restore-rollback");
          const before = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Unverändert" });
          const target = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Darf nicht bleiben" });
          target.stores.catalog.items[0].name = "Darf nicht bleiben";
          await persistence.restoreTenantSnapshot(before);
          await assertRejects(
            () => persistence.restoreTenantSnapshot(target, { simulateFailureAfterStore: 1 }),
            "BACKUP_RESTORE_TEST_ABORT",
            "Simulierter Restore-Abbruch"
          );
          assertEqual((await persistence.readSettings()).company.name, "Unverändert", "Settings wurden trotz Abbruch verändert");
          assertEqual((await persistence.readCatalog()).items[0].name, before.stores.catalog.items[0].name, "Katalog wurde trotz Abbruch verändert");
          assertDeepEqual(await persistence.readCustomers(), before.stores.customers, "Kunden wurden trotz Abbruch verändert");
          assertDeepEqual(await persistence.readReceipts(), before.stores.receipts, "Belege wurden trotz Abbruch verändert");
          assertDeepEqual(await persistence.readVouchers(), before.stores.vouchers, "Gutscheine wurden trotz Abbruch verändert");
        }
      },
      {
        name: "Nach Restore kann sofort wieder vollständig gesichert werden",
        run: async () => {
          const persistence = context.makeClient("backup-after-restore");
          const target = completeTenantSnapshotFixture(persistence.tenantId, { companyName: "Rundlauf Betrieb" });
          await persistence.restoreTenantSnapshot(target);
          const exported = await persistence.exportTenantSnapshot();
          const encrypted = await backupApi.encryptTenantSnapshot(exported, cryptoPassphrase);
          const decrypted = await backupApi.decryptTenantSnapshot(encrypted, cryptoPassphrase);
          const validated = persistence.validateTenantSnapshot(decrypted);
          assertEqual(validated.snapshot.stores.settings.company.name, "Rundlauf Betrieb", "Restore-Export-Rundlauf verlor Einstellungen");
          assertEqual(validated.snapshot.stores.settings.users.length, 1, "Restore-Export-Rundlauf verlor den Benutzer");
          assertEqual(validated.snapshot.stores.settings.activeUserId, validated.snapshot.stores.settings.users[0].id, "Restore-Export-Rundlauf verlor den aktiven Benutzer");
          assertDeepEqual(validated.snapshot.stores.settings.company.logo, logoReferenceFixture(), "Restore-Export-Rundlauf verlor die Unternehmenslogo-Referenz");
          assertDeepEqual(validated.snapshot.stores.settings.logoAssets, target.stores.settings.logoAssets, "Restore-Export-Rundlauf verlor historische Logoassets");
          assertDeepEqual(validated.snapshot.stores.settings.businessAreas.map(area => area.logo), target.stores.settings.businessAreas.map(area => area.logo), "Restore-Export-Rundlauf verlor Geschäftsbereichslogos");
          const restoredLogoModel = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            brandingSnapshot: { logoMode: "company", logo: { assetId: "company-logo", source: "company", label: "Unternehmenslogo" } }
          }), {
            ...documentOptions(validated.snapshot.stores.settings.logoAssets),
            resolveLogoAsset: assetId => api.resolveLogoAsset(assetId, validated.snapshot.stores.settings.logoAssets)
          });
          assert((await documentApi.createPdfBytes(restoredLogoModel)).length > 4000, "Nach Restore konnte kein PDF mit historischem Logoasset erzeugt werden");
          assertEqual(validated.snapshot.stores.settings.company.contactPerson, "Test Kontakt", "Restore-Export-Rundlauf verlor den Ansprechpartner");
          assertEqual(validated.snapshot.stores.vouchers.vouchers[0].history.length, 1, "Gutscheinhistorie ging im Rundlauf verloren");
          assertEqual(validated.snapshot.stores.receipts.receipts[0].companySnapshot.name, "Teststudio Nord", "Belegsnapshot ging im Rundlauf verloren");
        }
      },
      {
        name: "Fehlende IndexedDB-Factory liefert einen verständlichen Fehler",
        run: async () => {
          const unavailable = api.createSettingsPersistence({
            indexedDBFactory: null,
            databaseName: `${context.databaseName}-unavailable`,
            tenantId: "test-unavailable"
          });
          await assertRejects(
            () => unavailable.openDatabase(),
            "INDEXEDDB_UNAVAILABLE",
            "Fehlende IndexedDB-Factory"
          );
        }
      },
      {
        name: "Reset löscht genau einen Tenant",
        run: async () => {
          const firstTenant = context.makeClient("reset-a");
          const secondTenant = context.makeClient("reset-b");
          const firstRecord = recordFixture(firstTenant.tenantId);
          const secondRecord = recordFixture(secondTenant.tenantId);
          firstRecord.company.name = "Tenant A";
          secondRecord.company.name = "Tenant B";
          await firstTenant.writeSettings(firstRecord);
          await secondTenant.writeSettings(secondRecord);

          await firstTenant.deleteSettings();

          assertEqual(await firstTenant.readSettings(), null, "Zurückgesetzter Tenant ist noch vorhanden");
          assertEqual((await secondTenant.readSettings())?.company?.name, "Tenant B", "Zweiter Tenant wurde beim Reset verändert oder gelöscht");
        }
      },
      {
        name: "Browserlauf bleibt ohne Konsolen-, Ressourcen- und Laufzeitfehler",
        run: async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
          assertDeepEqual(globalThis.FRECKA_BROWSER_TEST_ERRORS || [], [], "Browserlauf hat einen Konsolen-, Ressourcen- oder Laufzeitfehler gemeldet");
        }
      }
    ];
  }

  async function closeClients(clients) {
    const databases = await Promise.allSettled([...clients].map(client => client.openDatabase()));
    databases.forEach(result => {
      if (result.status === "fulfilled") result.value.close();
    });
    clients.forEach(client => client.closeDatabase());
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  async function runTests() {
    if (running) return;
    running = true;
    runButton.disabled = true;
    resultsElement.replaceChildren();
    cleanupNoteElement.textContent = "";
    summaryElement.className = "summary";
    summaryElement.textContent = "Tests laufen …";

    const databaseName = createDatabaseName();
    databaseNameElement.textContent = databaseName;
    const clients = new Set();
    let tenantCounter = 0;
    let passed = 0;
    let failed = 0;

    const context = {
      databaseName,
      makeClient(label) {
        const tenantId = `test-${label}-${++tenantCounter}`;
        const client = api.createSettingsPersistence({ databaseName, tenantId });
        clients.add(client);
        return client;
      }
    };

    if (!api || typeof api.createSettingsPersistence !== "function") {
      const error = new Error("FRECKA_PERSISTENCE wurde nicht geladen.");
      resultsElement.append(resultMarkup("Persistence-API verfügbar", false, error));
      summaryElement.className = "summary is-fail";
      summaryElement.textContent = "0 bestanden, 1 fehlgeschlagen";
      runButton.disabled = false;
      running = false;
      return;
    }

    if (databaseName === api.constants.databaseName || !databaseName.startsWith(testDatabasePrefix)) {
      const error = new Error("Testdatenbankname ist nicht sicher vom Produktionsnamen getrennt.");
      resultsElement.append(resultMarkup("Sicherer Testdatenbankname", false, error));
      summaryElement.className = "summary is-fail";
      summaryElement.textContent = "0 bestanden, 1 fehlgeschlagen";
      runButton.disabled = false;
      running = false;
      return;
    }

    try {
      for (const test of buildTests(context)) {
        try {
          await test.run();
          passed += 1;
          resultsElement.append(resultMarkup(test.name, true));
        } catch (error) {
          failed += 1;
          resultsElement.append(resultMarkup(test.name, false, error));
        }
      }
    } finally {
      try {
        await closeClients(clients);
        await deleteTestDatabase(databaseName);
        cleanupNoteElement.textContent = "Cleanup PASS: Die Testdatenbank wurde vollständig gelöscht.";
      } catch (error) {
        failed += 1;
        resultsElement.append(resultMarkup("Testdatenbank-Cleanup", false, error));
        cleanupNoteElement.textContent = "Cleanup FAIL: Die ausschließlich für diesen Lauf angelegte Testdatenbank konnte nicht gelöscht werden.";
      }
    }

    summaryElement.className = `summary ${failed ? "is-fail" : "is-pass"}`;
    summaryElement.textContent = `${passed} bestanden, ${failed} fehlgeschlagen`;
    runButton.disabled = false;
    running = false;
  }

  runButton.addEventListener("click", runTests);
  runTests().catch(error => {
    resultsElement.append(resultMarkup("Unerwarteter Testfehler", false, error));
    summaryElement.className = "summary is-fail";
    summaryElement.textContent = "Testlauf unerwartet abgebrochen";
    runButton.disabled = false;
    running = false;
  });
})();
