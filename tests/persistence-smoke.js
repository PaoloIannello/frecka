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

  function buildTests(context) {
    return [
      {
        name: "Erststart liefert null und initialisiert das Settings-Schema",
        run: async () => {
          const persistence = context.makeClient("first-start");
          const database = await persistence.openDatabase();
          assertEqual(database.name, context.databaseName, "Falsche Testdatenbank geöffnet");
          assertEqual(database.version, api.constants.databaseVersion, "Falsche Schema-Version");
          assert(database.objectStoreNames.contains(api.constants.storeName), "Settings-Store fehlt");
          assertEqual(await persistence.readSettings(), null, "Leerer Tenant muss null liefern");
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
