window.PROTOTYPE_DATA = Object.freeze({
  version: "0.11.4",
  build: "BACKUP-006",
  users: [
    {
      formatVersion: 1,
      id: "user-primary",
      tenantId: "local-default",
      displayName: "Benutzer/in",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  userSettings: { activeUserId: "user-primary" },
  license: {},
  tseSettings: {},
  backupReminder: {},
  logoAssets: [],
  company: {
    name: "",
    owner: "",
    contactPerson: "",
    street: "",
    houseNumber: "",
    zip: "",
    city: "",
    country: "Deutschland",
    phone: "",
    email: "",
    website: "",
    taxNumber: "",
    vatId: "",
    defaultTaxRate: 19,
    useAsServiceLocation: true,
    updatedAt: "1970-01-01T00:00:00.000Z",
    logo: null
  },
  serviceLocations: [
    {
      id: "location-default",
      name: "Leistungsort",
      addressMode: "company",
      street: "",
      houseNumber: "",
      zip: "",
      city: "",
      phone: "",
      voucherNote: "",
      active: true,
      businessAreaIds: ["general"]
    }
  ],
  taxSettings: {
    status: "undecided",
    rates: [
      { id: "tax-19", rate: 19, active: true },
      { id: "tax-7", rate: 7, active: false }
    ],
    defaultRate: 19
  },
  receiptSettings: {
    yearPrefix: String(new Date().getFullYear()),
    nextNumber: 1,
    footerText: "",
    thankYouText: "Vielen Dank für Ihren Besuch.",
    currency: "EUR",
    language: "Deutsch"
  },
  businessAreas: [
    { id: "general", label: "Geschäftsbereich", visibleName: "", logoMode: "company", logo: null, active: true, isDefault: true, defaultServiceLocationId: "location-default" }
  ],
  catalog: { general: [] },
  categories: [],
  templateImportStatus: {},
  businessTemplates: {
    hair: {
      label: "Friseur",
      categories: [
        ["cuts", "Haarschnitt", "service"], ["color", "Farbe", "service"], ["styling", "Styling", "service"],
        ["care", "Pflege", "service"], ["products", "Produkte", "product"]
      ],
      services: [
        ["women-cut", "Damenhaarschnitt", "cuts"], ["men-cut", "Herrenhaarschnitt", "cuts"], ["child-cut", "Kinderhaarschnitt", "cuts"],
        ["wash-blow", "Waschen und Föhnen", "styling"], ["root-color", "Ansatzfarbe", "color"], ["full-color", "Komplettfarbe", "color"],
        ["highlights", "Strähnen", "color"], ["intensive-care", "Intensivpflege", "care"]
      ],
      products: [["shampoo", "Shampoo", "products"], ["conditioner", "Conditioner", "products"], ["styling-product", "Stylingprodukt", "products"]]
    },
    podiatry: {
      label: "Podologie",
      categories: [
        ["treatments", "Behandlungen", "service"], ["partial", "Teilbehandlungen", "service"],
        ["extras", "Zusatzleistungen", "service"], ["care-products", "Pflegeprodukte", "product"]
      ],
      services: [
        ["complex-treatment", "Podologische Komplexbehandlung", "treatments"], ["partial-treatment", "Teilbehandlung", "partial"],
        ["nail-treatment", "Nagelbehandlung", "partial"], ["pressure-protection", "Druckschutz", "extras"],
        ["orthosis-consultation", "Orthosenberatung", "extras"]
      ],
      products: [["foot-cream", "Fußpflegecreme", "care-products"], ["nail-care", "Nagelpflegeprodukt", "care-products"]]
    },
    cosmetics: {
      label: "Kosmetik",
      categories: [["facial", "Gesichtsbehandlungen", "service"], ["eyes", "Augen und Brauen", "service"], ["extras", "Zusatzleistungen", "service"], ["products", "Pflegeprodukte", "product"]],
      services: [["basic-facial", "Kosmetische Basisbehandlung", "facial"], ["intensive-facial", "Intensivbehandlung", "facial"], ["brow-shaping", "Augenbrauen formen", "eyes"], ["lash-tint", "Wimpern färben", "eyes"], ["facial-massage", "Gesichtsmassage", "extras"]],
      products: [["facial-cream", "Gesichtscreme", "products"], ["cleanser", "Reinigungsprodukt", "products"]]
    },
    nail_studio: {
      label: "Nagelstudio",
      categories: [["manicure", "Maniküre", "service"], ["modeling", "Modellage", "service"], ["design", "Design", "service"], ["products", "Pflegeprodukte", "product"]],
      services: [["classic-manicure", "Klassische Maniküre", "manicure"], ["new-modeling", "Neumodellage", "modeling"], ["refill", "Auffüllen", "modeling"], ["remove-modeling", "Modellage entfernen", "modeling"], ["nail-design", "Nageldesign", "design"]],
      products: [["nail-oil", "Nagelöl", "products"], ["hand-care", "Handpflege", "products"]]
    },
    foot_care: {
      label: "Fußpflege",
      categories: [["care", "Fußpflege", "service"], ["nails", "Nagelpflege", "service"], ["extras", "Zusatzpflege", "service"], ["products", "Pflegeprodukte", "product"]],
      services: [["basic-care", "Kosmetische Fußpflege", "care"], ["short-care", "Kurze Fußpflege", "care"], ["nail-care", "Kosmetische Nagelpflege", "nails"], ["foot-massage", "Fußmassage", "extras"]],
      products: [["foot-balm", "Fußbalsam", "products"], ["care-oil", "Pflegeöl", "products"]]
    },
    massage: {
      label: "Massage",
      categories: [["massages", "Massagen", "service"], ["short", "Kurzbehandlungen", "service"], ["extras", "Ergänzungen", "service"], ["products", "Pflegeprodukte", "product"]],
      services: [["back-massage", "Rückenmassage", "massages"], ["full-body", "Ganzkörpermassage", "massages"], ["head-massage", "Kopf- und Nackenmassage", "short"], ["relaxation", "Entspannungsmassage", "massages"], ["warm-compress", "Warme Kompresse", "extras"]],
      products: [["massage-oil", "Massageöl", "products"]]
    },
    coaching: {
      label: "Coaching",
      categories: [["sessions", "Einzelsitzungen", "service"], ["groups", "Gruppenangebote", "service"], ["follow-up", "Begleitung", "service"], ["materials", "Materialien", "product"]],
      services: [["intro", "Kennenlerngespräch", "sessions"], ["single-session", "Coaching-Einzelsitzung", "sessions"], ["follow-up-session", "Folgesitzung", "follow-up"], ["group-session", "Gruppensitzung", "groups"]],
      products: [["workbook", "Arbeitsheft", "materials"], ["card-set", "Reflexionskarten", "materials"]]
    },
    therapy: {
      label: "Therapie",
      categories: [["sessions", "Sitzungen", "service"], ["groups", "Gruppenangebote", "service"], ["consultation", "Beratung", "service"], ["materials", "Arbeitsmaterialien", "product"]],
      services: [["initial-talk", "Erstgespräch", "consultation"], ["individual-session", "Einzelsitzung", "sessions"], ["follow-up", "Folgesitzung", "sessions"], ["group-offer", "Gruppenangebot", "groups"]],
      products: [["exercise-book", "Übungsheft", "materials"], ["information-pack", "Informationsmaterial", "materials"]]
    },
    dog_grooming: {
      label: "Hundesalon",
      categories: [["grooming", "Fellpflege", "service"], ["cutting", "Schneiden und Trimmen", "service"], ["extras", "Zusatzpflege", "service"], ["products", "Pflegeprodukte", "product"]],
      services: [["wash-dry", "Waschen und Trocknen", "grooming"], ["brush", "Bürsten und Entfilzen", "grooming"], ["cut", "Fell schneiden", "cutting"], ["trim", "Trimmen", "cutting"], ["paw-care", "Pfotenpflege", "extras"]],
      products: [["dog-shampoo", "Hundeshampoo", "products"], ["coat-care", "Fellpflegeprodukt", "products"]]
    }
  },


  // Ausschließlich kanonische Quelle für die eng begrenzte PERSISTENCE-010-
  // Reparatur. Diese Datensätze gehören nie zum aktiven Erststartbestand.
  historicalDemoRepairReceipts: [
    {
      id: "receipt_demo_2026_000131", number: "2026-000131", type: "receipt", receiptKind: "voucher-sale", status: "completed",
      date: "01.08.2026", time: "09:30", sortKey: "2026-08-01T09:30:00", createdAt: "2026-08-01T09:30:00",
      completedAt: "2026-08-01T09:30:00", updatedAt: "2026-08-01T09:30:00", payment: "Karte", paymentStatus: "paid",
      paymentMethod: "Karte", paymentRecordedAt: "2026-08-01T09:30:00",
      paymentEvents: [{ type: "payment_recorded", recordedAt: "2026-08-01T09:30:00", date: "01.08.2026", time: "09:30", paymentMethod: "Karte", amount: 100 }],
      customer: null,
      contextSnapshot: {
        company: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", zip: "12345", city: "Musterstadt", country: "Deutschland", phone: "0941 123456", email: "studio@example.de", taxNumber: "123/456/78901", vatId: "" },
        businessArea: { id: "podiatry", label: "Podologie", visibleName: "Podologie im Studio Beispiel", logoMode: "company", logo: null },
        serviceLocation: { id: "location-podiatry", name: "Studio Beispiel · Podologie", addressMode: "own", street: "Prüfeninger Straße 20", streetName: "Prüfeninger Straße", houseNumber: "20", zip: "93049", city: "Regensburg", phone: "0941 123456", voucherNote: "Einlösbar nach Terminvereinbarung" }
      },
      presentationSnapshot: {
        issuer: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", city: "12345 Musterstadt" },
        redemptionLocation: { name: "Studio Beispiel · Podologie", street: "Prüfeninger Straße 20", city: "93049 Regensburg" }
      },
      voucherReference: "vch_1b7e93a4c5d8",
      items: [{ title: "Gutschein", type: "voucher-sale", quantity: 1, unitPrice: 100, total: 100 }],
      total: 100, taxTreatment: "undetermined-prototype",
      activity: [{ label: "Gutschein verkauft", date: "01.08.2026 · 09:30", occurredAt: "2026-08-01T09:30:00" }]
    },
    {
      id: "receipt_demo_2026_000124", number: "2026-000124", type: "receipt", receiptKind: "voucher-sale", status: "completed",
      date: "28.07.2026", time: "10:15", sortKey: "2026-07-28T10:15:00", createdAt: "2026-07-28T10:15:00",
      completedAt: "2026-07-28T10:15:00", updatedAt: "2026-07-28T10:15:00", payment: "Bar", paymentStatus: "paid",
      paymentMethod: "Bar", paymentRecordedAt: "2026-07-28T10:15:00",
      paymentEvents: [{ type: "payment_recorded", recordedAt: "2026-07-28T10:15:00", date: "28.07.2026", time: "10:15", paymentMethod: "Bar", amount: 50 }],
      customer: { id: "c-sabine", firstName: "Sabine", lastName: "Keller", name: "Sabine Keller", phone: "0151 98765432", email: "sabine.keller@example.de", street: "Bahnhofstraße 21", zip: "93047", city: "Regensburg" },
      contextSnapshot: {
        company: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", zip: "12345", city: "Musterstadt", country: "Deutschland", phone: "0941 123456", email: "studio@example.de", taxNumber: "123/456/78901", vatId: "" },
        businessArea: { id: "hair", label: "Friseur", visibleName: "", logoMode: "company", logo: null },
        serviceLocation: { id: "location-default", name: "Studio Beispiel", addressMode: "company", street: "Musterstraße 12", streetName: "Musterstraße 12", houseNumber: "", zip: "12345", city: "Musterstadt", phone: "0941 123456", voucherNote: "Einlösbar nach Terminvereinbarung" }
      },
      presentationSnapshot: {
        issuer: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", city: "12345 Musterstadt" },
        redemptionLocation: { name: "Studio Beispiel", street: "Musterstraße 12", city: "12345 Musterstadt" }
      },
      voucherReference: "vch_8f4c2a91d7e6",
      items: [{ title: "Gutschein", type: "voucher-sale", quantity: 1, unitPrice: 50, total: 50 }],
      total: 50, taxTreatment: "undetermined-prototype",
      activity: [{ label: "Gutschein verkauft", date: "28.07.2026 · 10:15", occurredAt: "2026-07-28T10:15:00" }]
    },
    {
      id: "receipt_demo_2026_000121", number: "2026-000121", type: "receipt", receiptKind: "voucher-sale", status: "completed",
      date: "22.07.2026", time: "14:05", sortKey: "2026-07-22T14:05:00", createdAt: "2026-07-22T14:05:00",
      completedAt: "2026-07-22T14:05:00", updatedAt: "2026-07-22T14:05:00", payment: "Karte", paymentStatus: "paid",
      paymentMethod: "Karte", paymentRecordedAt: "2026-07-22T14:05:00",
      paymentEvents: [{ type: "payment_recorded", recordedAt: "2026-07-22T14:05:00", date: "22.07.2026", time: "14:05", paymentMethod: "Karte", amount: 40 }],
      customer: null,
      contextSnapshot: {
        company: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", zip: "12345", city: "Musterstadt", country: "Deutschland", phone: "0941 123456", email: "studio@example.de", taxNumber: "123/456/78901", vatId: "" },
        businessArea: { id: "podiatry", label: "Podologie", visibleName: "Podologie im Studio Beispiel", logoMode: "company", logo: null },
        serviceLocation: { id: "location-podiatry", name: "Studio Beispiel · Podologie", addressMode: "own", street: "Prüfeninger Straße 20", streetName: "Prüfeninger Straße", houseNumber: "20", zip: "93049", city: "Regensburg", phone: "0941 123456", voucherNote: "Einlösbar nach Terminvereinbarung" }
      },
      presentationSnapshot: {
        issuer: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", city: "12345 Musterstadt" },
        redemptionLocation: { name: "Studio Beispiel · Podologie", street: "Prüfeninger Straße 20", city: "93049 Regensburg" }
      },
      voucherReference: "vch_3c9f7a2e5b84",
      items: [{ title: "Gutschein", type: "voucher-sale", quantity: 1, unitPrice: 40, total: 40 }],
      total: 40, taxTreatment: "undetermined-prototype",
      activity: [{ label: "Gutschein verkauft", date: "22.07.2026 · 14:05", occurredAt: "2026-07-22T14:05:00" }]
    },

    {
      id: "receipt_demo_2026_000118", number: "2026-000118", type: "receipt", receiptKind: "voucher-sale", status: "completed",
      date: "14.07.2026", time: "16:40", sortKey: "2026-07-14T16:40:00", createdAt: "2026-07-14T16:40:00",
      completedAt: "2026-07-14T16:40:00", updatedAt: "2026-07-14T16:40:00", payment: "Bar", paymentStatus: "paid",
      paymentMethod: "Bar", paymentRecordedAt: "2026-07-14T16:40:00",
      paymentEvents: [{ type: "payment_recorded", recordedAt: "2026-07-14T16:40:00", date: "14.07.2026", time: "16:40", paymentMethod: "Bar", amount: 25 }],
      customer: { id: "c-anna", firstName: "Anna", lastName: "Müller", name: "Anna Müller", phone: "0176 23456789", email: "anna.mueller@example.de", street: "Gartenstraße 8", zip: "93047", city: "Regensburg" },
      contextSnapshot: {
        company: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", zip: "12345", city: "Musterstadt", country: "Deutschland", phone: "0941 123456", email: "studio@example.de", taxNumber: "123/456/78901", vatId: "" },
        businessArea: { id: "hair", label: "Friseur", visibleName: "", logoMode: "company", logo: null },
        serviceLocation: { id: "location-default", name: "Studio Beispiel", addressMode: "company", street: "Musterstraße 12", streetName: "Musterstraße 12", houseNumber: "", zip: "12345", city: "Musterstadt", phone: "0941 123456", voucherNote: "Einlösbar nach Terminvereinbarung" }
      },
      presentationSnapshot: {
        issuer: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", city: "12345 Musterstadt" },
        redemptionLocation: { name: "Studio Beispiel", street: "Musterstraße 12", city: "12345 Musterstadt" }
      },
      voucherReference: "vch_6d2a84f9b3c1",
      items: [{ title: "Gutschein", type: "voucher-sale", quantity: 1, unitPrice: 25, total: 25 }],
      total: 25, taxTreatment: "undetermined-prototype",
      activity: [{ label: "Gutschein verkauft", date: "14.07.2026 · 16:40", occurredAt: "2026-07-14T16:40:00" }]
    },
  ],
  receipts: [],
  customers: [],
  customerChoices: [
    { id: "none", title: "Ohne Kunde", note: "Keine persönlichen Daten", icon: "→" },
    { id: "existing", title: "Bestehender Kunde", note: "Kundensuche folgt später", icon: "◎" },
    { id: "new", title: "Neuer Kunde", note: "Erfassung folgt später", icon: "+" }
  ],
  paymentChoices: [
    { id: "cash", title: "Bar", icon: "€", active: true },
    { id: "ec", title: "EC", icon: "▣", active: true },
    { id: "visa", title: "Visa", icon: "V", active: false },
    { id: "mastercard", title: "Mastercard", icon: "M", active: false },
    { id: "paypal", title: "PayPal", icon: "P", active: false },
    { id: "transfer", title: "Überweisung", icon: "↗", active: false },
    { id: "voucher", title: "Gutschein", icon: "◇", active: true }
  ],
  historicalDemoRepairVouchers: [
    {
      reference: "vch_8f4c2a91d7e6",
      code: "FRKA-7Q2M-9K4X",
      status: "partially_redeemed",
      issuedValue: 50,
      currentValue: 18.5,
      soldAt: "28.07.2026",
      soldTime: "10:15",
      payment: "Bar",
      customer: { id: "c-sabine", name: "Sabine Keller" },
      displayName: "Für Familie Keller",
      saleReceipt: { id: "receipt_demo_2026_000124", number: "2026-000124", soldAt: "2026-07-28T10:15:00", payment: "Bar", customerId: "c-sabine" },
      presentationSnapshot: {
        issuer: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", city: "12345 Musterstadt" },
        redemptionLocation: { name: "Studio Beispiel", street: "Musterstraße 12", city: "12345 Musterstadt" }
      },
      history: [
        { type: "sold", date: "28.07.2026", time: "10:15", amount: 50, balanceAfter: 50, receiptNumber: "2026-000124" },
        { type: "partial_redemption", date: "30.07.2026", time: "15:20", amount: 20, balanceAfter: 30, receiptNumber: "2026-000129" },
        { type: "partial_redemption", date: "03.08.2026", time: "11:05", amount: 11.5, balanceAfter: 18.5, receiptNumber: "2026-000130" }
      ]
    },
    {
      reference: "vch_1b7e93a4c5d8",
      code: "FRKA-3N8R-6W5P",
      status: "active",
      issuedValue: 100,
      currentValue: 100,
      soldAt: "01.08.2026",
      soldTime: "09:30",
      payment: "Karte",
      customer: null,
      displayName: "Für Maria",
      saleReceipt: { id: "receipt_demo_2026_000131", number: "2026-000131", soldAt: "2026-08-01T09:30:00", payment: "Karte", customerId: null },
      presentationSnapshot: {
        issuer: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", city: "12345 Musterstadt" },
        redemptionLocation: { name: "Studio Beispiel · Podologie", street: "Prüfeninger Straße 20", city: "93049 Regensburg" }
      },
      history: [
        { type: "sold", date: "01.08.2026", time: "09:30", amount: 100, balanceAfter: 100, receiptNumber: "2026-000131" }
      ]
    },
    {
      reference: "vch_6d2a84f9b3c1",
      code: "FRKA-5T9L-2H7C",
      status: "redeemed",
      issuedValue: 25,
      currentValue: 0,
      soldAt: "14.07.2026",
      soldTime: "16:40",
      payment: "Bar",
      customer: { id: "c-anna", name: "Anna Müller" },
      displayName: "",
      saleReceipt: { id: "receipt_demo_2026_000118", number: "2026-000118", soldAt: "2026-07-14T16:40:00", payment: "Bar", customerId: "c-anna" },
      presentationSnapshot: {
        issuer: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", city: "12345 Musterstadt" },
        redemptionLocation: { name: "Studio Beispiel", street: "Musterstraße 12", city: "12345 Musterstadt" }
      },
      history: [
        { type: "sold", date: "14.07.2026", time: "16:40", amount: 25, balanceAfter: 25, receiptNumber: "2026-000118" },
        { type: "full_redemption", date: "31.07.2026", time: "12:10", amount: 25, balanceAfter: 0, receiptNumber: "2026-000128" }
      ]
    },
    {
      reference: "vch_3c9f7a2e5b84",
      code: "FRKA-8D3K-4M7R",
      status: "cancelled",
      issuedValue: 40,
      currentValue: 0,
      soldAt: "22.07.2026",
      soldTime: "14:05",
      payment: "Karte",
      customer: null,
      displayName: "",
      saleReceipt: { id: "receipt_demo_2026_000121", number: "2026-000121", soldAt: "2026-07-22T14:05:00", payment: "Karte", customerId: null },
      presentationSnapshot: {
        issuer: { name: "Studio Beispiel", owner: "Angel Luzolo", street: "Musterstraße 12", city: "12345 Musterstadt" },
        redemptionLocation: { name: "Studio Beispiel · Podologie", street: "Prüfeninger Straße 20", city: "93049 Regensburg" }
      },
      history: [
        { type: "sold", date: "22.07.2026", time: "14:05", amount: 40, balanceAfter: 40, receiptNumber: "2026-000121" },
        { type: "cancelled", date: "22.07.2026", time: "14:12", amount: 40, balanceAfter: 0, receiptNumber: "ST-2026-000101" }
      ]
    }
  ],
  vouchers: [],
  placeholders: {
    receipts: { title: "Belege", icon: "▤", note: "Die Belegübersicht folgt in einem späteren UX-Block." },
    customers: { title: "Kunden", icon: "◎", note: "Kunden suchen, auswählen und neu anlegen." },
    settings: { title: "Einstellungen", icon: "⚙", note: "Unternehmensdaten und Leistungsort können im Arbeitsspeicher bearbeitet werden." }
  }
});
