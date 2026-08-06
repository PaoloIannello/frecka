(() => {
  "use strict";

  const resultsElement = document.getElementById("results");
  const summaryElement = document.getElementById("summary");
  const databaseNameElement = document.getElementById("databaseName");
  const cleanupNoteElement = document.getElementById("cleanupNote");
  const runButton = document.getElementById("runTests");
  const api = globalThis.FRECKA_PERSISTENCE;
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
      companySnapshot: { name: "Teststudio Nord", street: "Testweg 10", zip: "12345", city: "Teststadt" },
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

  function buildTests(context) {
    return [
      {
        name: "Erststart liefert null und initialisiert Settings-, Katalog-, Kunden- und Belegschema",
        run: async () => {
          const persistence = context.makeClient("first-start");
          const database = await persistence.openDatabase();
          assertEqual(database.name, context.databaseName, "Falsche Testdatenbank geöffnet");
          assertEqual(database.version, api.constants.databaseVersion, "Falsche Schema-Version");
          assert(database.objectStoreNames.contains(api.constants.storeName), "Settings-Store fehlt");
          assert(database.objectStoreNames.contains(api.constants.catalogStoreName), "Katalog-Store fehlt");
          assert(database.objectStoreNames.contains(api.constants.customersStoreName), "Kunden-Store fehlt");
          assert(database.objectStoreNames.contains(api.constants.receiptsStoreName), "Receipt-Store fehlt");
          assertEqual(await persistence.readSettings(), null, "Leerer Tenant muss null liefern");
          assertEqual(await persistence.readCatalog(), null, "Leerer Katalog-Tenant muss null liefern");
          assertEqual(await persistence.readCustomers(), null, "Leerer Kunden-Tenant muss null liefern");
          assertEqual(await persistence.readReceipts(), null, "Leerer Beleg-Tenant muss null liefern");
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
        name: "Kundensuche findet Name und Firma",
        run: async () => {
          const customer = customersRecordFixture("search-name").customers[0];
          assert(api.customerMatchesSearch(customer, "anna muster"), "Vollständiger Name wurde nicht gefunden");
          assert(api.customerMatchesSearch(customer, "studio gmbh"), "Firma wurde nicht gefunden");
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
            assertEqual(database.version, 4, "Datenbank wurde nicht auf Schema-Version 4 aktualisiert");
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
            assertEqual(database.version, 4, "Datenbank wurde nicht auf Schema-Version 4 aktualisiert");
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
            assertEqual(database.version, 4, "Datenbank wurde nicht auf Schema-Version 4 aktualisiert");
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
