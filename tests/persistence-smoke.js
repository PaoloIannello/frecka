(() => {
  "use strict";

  const resultsElement = document.getElementById("results");
  const summaryElement = document.getElementById("summary");
  const databaseNameElement = document.getElementById("databaseName");
  const cleanupNoteElement = document.getElementById("cleanupNote");
  const runButton = document.getElementById("runTests");
  const api = globalThis.FRECKA_PERSISTENCE;
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
        street: "Testweg 10",
        zip: "12345",
        city: "Teststadt",
        country: "Deutschland",
        phone: "0123 456789",
        email: "test@example.invalid",
        taxNumber: "TEST-100",
        vatId: "",
        defaultTaxRate: 19,
        useAsServiceLocation: true,
        logo: { id: "simulated-company-logo", simulated: true }
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
          logo: { id: "simulated-area-logo", simulated: true },
          active: true,
          isDefault: true,
          defaultServiceLocationId: "location-company"
        },
        {
          id: "coaching",
          label: "Coaching",
          visibleName: "Test-Coaching",
          logoMode: "none",
          logo: null,
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
      stores: { settings, catalog, customers, receipts, vouchers }
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
    snapshot.stores.receipts = api.snapshotReceipts({ receipts: [paid, open, cancellation, coachingCredit, february] }, tenantId);

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

  const documentOptions = () => ({
    qrService: qrApi,
    companyIdentity: api.companyIdentity,
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
          assertEqual(sharingApi.SHARE_VERSION, "COMM-001", "Falsche Share-Service-Version");
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
            companySnapshot: { name: "Studio", owner: "Testperson", phone: "COMPANY-PHONE-SECRET", email: "COMPANY-MAIL-SECRET@example.invalid", street: "Testweg 1", zip: "12345", city: "Teststadt" },
            customerSnapshot: { id: "CUSTOMER-ID-SECRET", name: "Sichtbarer Name", phone: "CUSTOMER-PHONE-SECRET", email: "CUSTOMER-MAIL-SECRET@example.invalid", street: "Sichtweg 1", zip: "12345", city: "Teststadt" }
          });
          const model = documentApi.createReceiptDocumentModel(source, documentOptions());
          const serialized = JSON.stringify(publicDocumentApi.projectDocument(model));
          ["receipt-secret-internal-id", "INTERN-NOTIZ-SECRET", "HISTORY-SECRET", "COMPANY-PHONE-SECRET", "COMPANY-MAIL-SECRET", "CUSTOMER-ID-SECRET", "CUSTOMER-PHONE-SECRET", "CUSTOMER-MAIL-SECRET", "contextSnapshot", "history", "internalNote"].forEach(secret => {
            assert(!serialized.includes(secret), `Nicht öffentliche Information gelangte in die Payload: ${secret}`);
          });
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
        name: "Share bevorzugt PDF, fällt auf Public-URL und zuletzt genau einen Download zurück",
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
          const urlResult = await urlService.sharePreferred({ files: [file], url: publicUrl, downloadFile: file });
          assertEqual(urlResult.mode, "url", "Fehlendes File-Sharing fiel nicht auf URL zurück");
          assertEqual(shareCalls[0].url, publicUrl, "URL-Fallback verwendete nicht den öffentlichen Kundenlink");
          assert(!shareCalls[0].url.includes("#/receipt/"), "URL-Fallback verwendete internen Deep-Link");

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
        }
      },
      {
        name: "Gutscheinverkaufsbeleg bleibt eigener Belegtyp ohne Steuerneuberechnung",
        run: async () => {
          const voucher = voucherDraftFixture("voucher-document-sale", { reference: "vch_document_sale", code: "FRKA-DOCU-0001" });
          const receipt = { ...voucherSaleReceiptFixture(voucher), number: "2030-000102" };
          const model = documentApi.createReceiptDocumentModel(receipt, { ...documentOptions(), linkedVoucher: voucher });
          assertEqual(model.kind.code, "voucher-sale", "Gutscheinverkauf wurde normalem Beleg gleichgesetzt");
          assertEqual(model.taxes.length, 0, "Gutscheinverkauf erhielt erfundene Steuerzeilen");
          assertEqual(model.linkedVoucher.code, "FRKA-DOCU-0001", "Verknüpfter Gutscheincode fehlt");
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
            brandingSnapshot: { logoMode: "custom", visibleName: "Salon Licht", logo: { id: "area-logo", source: "business-area", label: "Bereichslogo", simulated: true } }
          }), documentOptions());
          assertEqual(model.issuer.name, "", "Leere Geschäftsbezeichnung wurde ausgegeben");
          assertEqual(model.issuer.owner, "Alex Beispiel", "Pflichtangabe Unternehmer fehlt");
          assertEqual(model.branding.visibleName, "Salon Licht", "Sichtbare Geschäftsbezeichnung fehlt");
          assertEqual(model.branding.logo.initials, "GB", "Geschäftsbereichslogo verlor seine Priorität");
          const withoutLogo = documentApi.createReceiptDocumentModel(receiptDocumentFixture({
            brandingSnapshot: { logoMode: "none", visibleName: "Salon Licht", logo: { id: "stale-logo", source: "business-area" } }
          }), documentOptions());
          assertEqual(withoutLogo.branding.logo, null, "Logo-Modus ‚kein Logo‘ ließ ein altes Logo sichtbar");
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
          const model = documentApi.createReceiptDocumentModel(receiptDocumentFixture({ items, total: 350, originalTotal: 350, netTotal: 294, taxTotal: 56, taxGroups: [{ rate: 19, net: 294, tax: 56, gross: 350 }] }), documentOptions());
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
          assertEqual(model.issuer.displayName, "Teststudio Nord", "Dokumentmodell änderte den Aussteller rückwirkend");
          assertEqual(model.customer.name, "Anna Muster", "Dokumentmodell änderte den Kunden rückwirkend");
          assert(!JSON.stringify(model).includes("Anderer Ort"), "Dokumentmodell änderte den Leistungsort rückwirkend");
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
          assertEqual(await persistence.readSettings(), null, "Leerer Tenant muss null liefern");
          assertEqual(await persistence.readCatalog(), null, "Leerer Katalog-Tenant muss null liefern");
          assertEqual(await persistence.readCustomers(), null, "Leerer Kunden-Tenant muss null liefern");
          assertEqual(await persistence.readReceipts(), null, "Leerer Beleg-Tenant muss null liefern");
          assertEqual(await persistence.readVouchers(), null, "Leerer Gutschein-Tenant muss null liefern");
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
          assertEqual(stored.receiptSettings.nextNumber, 77, "Nummernkreis fehlt");
          assertDeepEqual(stored.paymentChoices.map(choice => choice.id), ["cash", "ec", "voucher"], "Zahlungsarten oder Reihenfolge fehlen");
          assertEqual(stored.businessAreas.length, 2, "Geschäftsbereiche fehlen");
          assertEqual(stored.setup.status, "started", "Einrichtungsstatus fehlt");
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
        name: "Geschäftsdaten und simulierte Logos werden nicht gespeichert",
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
          record.company.logo = { id: "forbidden-company-logo", data: "binary-placeholder" };
          record.company.logoData = "forbidden";
          record.businessAreas[0].logo = { id: "forbidden-area-logo" };
          record.businessAreas[0].logoFile = "forbidden";
          record.businessAreas[0].logoMode = "custom";

          await persistence.writeSettings(record);
          const stored = await persistence.readSettings();
          const forbiddenKeys = ["catalog", "categories", "customers", "receipts", "vouchers", "histories", "drafts", "cancellations", "credits"];
          forbiddenKeys.forEach(key => assert(!hasOwn(stored, key), `Ausgeschlossenes Root-Feld gespeichert: ${key}`));
          assert(!hasOwn(stored.company, "logo") && !hasOwn(stored.company, "logoData"), "Simuliertes Unternehmenslogo gespeichert");
          assert(!hasOwn(stored.businessAreas[0], "logo") && !hasOwn(stored.businessAreas[0], "logoFile"), "Simuliertes Geschäftsbereichslogo gespeichert");
          assertEqual(stored.businessAreas[0].logoMode, "custom", "Zulässige Branding-Einstellung wurde entfernt");
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
        name: "Gutscheinverkauf speichert Beleg, Gutschein, Historie und Nummer atomar und reload-stabil",
        run: async () => {
          const persistence = context.makeClient("voucher-sale");
          const settings = recordFixture(persistence.tenantId, "completed");
          const receipts = receiptsRecordFixture(persistence.tenantId);
          const vouchers = vouchersRecordFixture(persistence.tenantId);
          await persistence.writeSettings(settings);
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
        name: "Schema-Upgrade von Version 4 erhält alle bisherigen Stores und ergänzt nur den Voucher-Store",
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
            assertEqual(database.version, 5, "Datenbank wurde nicht auf Schema-Version 5 aktualisiert");
            assert(database.objectStoreNames.contains(api.constants.vouchersStoreName), "Voucher-Store wurde beim Upgrade nicht ergänzt");
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
          assertEqual(api.constants.databaseVersion, 5, "Backup führte unerwartet eine neue Schema-Version ein");
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
          assertEqual(api.constants.databaseVersion, 5, "Export führte unerwartet eine neue Schema-Version ein");
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
          assertDeepEqual(projection.receipts.map(row => row.receiptNumber), ["2030-000101", "2030-000102", "2030-000103"], "Belegfilter ist falsch");
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
          const options = { periodType: "custom", dateFrom: "2030-01-01", dateTo: "2030-01-31", businessAreaId: "hair", includeCustomers: true };
          const taxFiles = exportApi.createExportFiles(snapshot, { ...options, exportType: "tax-advisor" });
          const ownFiles = exportApi.createExportFiles(snapshot, { ...options, exportType: "own-data" });
          assert(!taxFiles.files.some(file => file.name === "Kunden.csv"), "Steuerberatungsexport enthält Kundenstammdaten");
          assertDeepEqual(taxFiles.files.map(file => file.name), ["Belege.csv", "Belegpositionen.csv", "Gutscheine.csv", "Gutschein-Historie.csv", "Export-Info.txt"], "Bestehende Steuerberater-Einzeldatei-API wurde verändert");
          assert(ownFiles.files.some(file => file.name === "Kunden.csv"), "Eigene Daten enthalten trotz Auswahl keine Kundendatei");
          assertDeepEqual(ownFiles.projection.customers.map(customer => customer.id), ["customer-anna"], "Nicht zugeordnete Kunden wurden exportiert");
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
          assert(info.includes("Anzahl Belege: 3"), "Belegzählung ist falsch");
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
            { rowType: "Steuersatz", businessArea: "Snapshot Studio", taxRate: "19,00", receiptCount: 3, net: "54,98", tax: "10,45", gross: "65,43" },
            { rowType: "Geschäftsbereich gesamt", businessArea: "Snapshot Studio", taxRate: "", receiptCount: 3, net: "54,98", tax: "10,45", gross: "65,43" },
            { rowType: "Steuersatz", businessArea: "Test-Coaching", taxRate: "19,00", receiptCount: 1, net: "-8,40", tax: "-1,60", gross: "-10,00" },
            { rowType: "Geschäftsbereich gesamt", businessArea: "Test-Coaching", taxRate: "", receiptCount: 1, net: "-8,40", tax: "-1,60", gross: "-10,00" },
            { rowType: "Gesamtsumme", businessArea: "Alle Geschäftsbereiche", taxRate: "", receiptCount: 4, net: "46,58", tax: "8,85", gross: "55,43" }
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
          const voucherSale = receiptDraftFixture("receipt-voucher-january", {
            number: "2030-000106",
            receiptKind: "voucher-sale",
            voucherReference: "vch_export_january",
            completedAt: "2030-01-10T09:00:00.000Z",
            createdAt: "2030-01-10T09:00:00.000Z",
            updatedAt: "2030-01-10T09:00:00.000Z",
            date: "10.01.2030",
            time: "09:00",
            items: [{ type: "voucher-sale", title: "Gutschein", quantity: 1, unitPrice: 100, total: 100 }],
            total: 100,
            originalTotal: 100,
            netTotal: 0,
            taxTotal: 0,
            taxGroups: [],
            paymentMethod: "Karte"
          });
          snapshot.stores.receipts = api.snapshotReceipts({ receipts: [...receipts, voucherSale] }, tenantId);
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
          assertEqual(packageResult.pdfCount, 5, "ZIP enthält nicht zu jedem gefilterten Beleg ein PDF");
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
          assertEqual(packageResult.pdfCount, 3, "PDF-Auswahl weicht vom Belegfilter ab");
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
          const validated = api.validateTenantSnapshot(completeTenantSnapshotFixture(tenantId), tenantId);
          assertEqual(validated.snapshot.backupFormatVersion, 1, "Falsche Backup-Formatversion");
          assertEqual(validated.summary.companyName, "Backup Teststudio", "Geschäftsbezeichnung fehlt in der Backup-Vorschau");
          assertEqual(validated.summary.companyOwner, "Testperson", "Unternehmer fehlt in der Backup-Vorschau");
          assertEqual(validated.summary.catalogItems, 2, "Katalogzählung ist falsch");
          assertEqual(validated.summary.customers, 2, "Kundenzählung ist falsch");
          assertEqual(validated.summary.receipts, 2, "Belegzählung ist falsch");
          assertEqual(validated.summary.vouchers, 1, "Gutscheinzählung ist falsch");
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
          assertEqual((await persistence.readSettings()).company.name, "Neu wiederhergestellt", "Settings fehlen nach Leer-Restore");
          assertEqual((await persistence.readCatalog()).items.length, 2, "Katalog fehlt nach Leer-Restore");
          assertEqual((await persistence.readCustomers()).customers.length, 2, "Kunden fehlen nach Leer-Restore");
          assertEqual((await persistence.readReceipts()).receipts.length, 2, "Belege fehlen nach Leer-Restore");
          assertEqual((await persistence.readVouchers()).vouchers.length, 1, "Gutscheine fehlen nach Leer-Restore");
        }
      },
      {
        name: "Restore überschreibt alle fünf Stores gemeinsam",
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
