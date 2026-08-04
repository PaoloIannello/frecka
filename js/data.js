window.PROTOTYPE_DATA = Object.freeze({
  version: "UX-020b",
  build: "2026-08-04",
  company: {
    name: "Studio Beispiel",
    owner: "Angel Luzolo",
    street: "Musterstraße 12",
    city: "12345 Musterstadt",
    taxNumber: "123/456/78901",
    vatId: "",
    defaultTaxRate: 19,
    logo: null
  },
  businessAreas: [
    { id: "hair", label: "Friseur" },
    { id: "podiatry", label: "Podologie" }
  ],
  catalog: {
    hair: [
      { id: "wash-cut", title: "Waschen + Schneiden", price: 39, type: "service", quantityAdjustable: false, category: "Favoriten", icon: "✂" },
      { id: "blow-dry", title: "Föhnen", price: 18, type: "service", quantityAdjustable: false, category: "Favoriten", icon: "≈" },
      { id: "color", title: "Farbe", price: 48, type: "service", quantityAdjustable: false, category: "Favoriten", icon: "●" },
      { id: "dry-cut", title: "Trockenschnitt", price: 28, type: "service", quantityAdjustable: false, category: "Favoriten", icon: "✂" },
      { id: "mens-cut", title: "Herrenschnitt", price: 27, type: "service", quantityAdjustable: false, category: "Favoriten", icon: "◆" },
      { id: "child-cut", title: "Kinderhaarschnitt", price: 19, type: "service", quantityAdjustable: false, category: "Favoriten", icon: "★" },
      { id: "highlights", title: "Strähnen", price: 59, type: "service", quantityAdjustable: false, category: "Favoriten", icon: "◒" },
      { id: "shampoo", title: "Shampoo", price: 14.9, type: "product", quantityAdjustable: true, category: "Favoriten", icon: "▣" },
      { id: "conditioner", title: "Conditioner", price: 16.9, type: "product", quantityAdjustable: true, category: "Favoriten", icon: "□" },
      { id: "hairspray", title: "Haarspray", price: 12.5, type: "product", quantityAdjustable: true, category: "Favoriten", icon: "✦" },

      { id: "balayage", title: "Balayage", price: 89, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "◐" },
      { id: "toning", title: "Tönung", price: 38, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "◉" },
      { id: "root-color", title: "Ansatzfarbe", price: 42, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "●" },
      { id: "full-color", title: "Komplettfarbe", price: 65, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "●" },
      { id: "perm", title: "Dauerwelle", price: 74, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "≈" },
      { id: "updo", title: "Hochsteckfrisur", price: 55, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "♢" },
      { id: "bridal", title: "Brautfrisur", price: 110, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "♕" },
      { id: "beard", title: "Bart schneiden", price: 14, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "⌁" },
      { id: "head-massage", title: "Kopfmassage", price: 12, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "◌" },
      { id: "care", title: "Intensivpflege", price: 16, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "✧" },
      { id: "glossing", title: "Glossing", price: 29, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "◇" },
      { id: "eyebrows", title: "Augenbrauen färben", price: 12, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "⌒" },
      { id: "lashes", title: "Wimpern färben", price: 14, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "⌣" },
      { id: "styling", title: "Styling", price: 22, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "✺" },
      { id: "consultation", title: "Farbberatung", price: 15, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "?" },

      { id: "color-shampoo", title: "Color Shampoo", price: 17.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "▣" },
      { id: "silver-shampoo", title: "Silbershampoo", price: 18.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "▨" },
      { id: "volume-shampoo", title: "Volumen Shampoo", price: 15.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "▤" },
      { id: "repair-mask", title: "Repair Maske", price: 21.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "◫" },
      { id: "hair-oil", title: "Haaröl", price: 19.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "◍" },
      { id: "hair-wax", title: "Haarwachs", price: 13.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "⬡" },
      { id: "styling-gel", title: "Styling Gel", price: 11.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "⬢" },
      { id: "mousse", title: "Schaumfestiger", price: 12.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "☁" },
      { id: "heat-protection", title: "Hitzeschutz", price: 16.5, type: "product", quantityAdjustable: true, category: "Produkte", icon: "♨" },
      { id: "leave-in", title: "Leave-in Pflege", price: 18.5, type: "product", quantityAdjustable: true, category: "Produkte", icon: "◈" },
      { id: "curl-cream", title: "Lockencreme", price: 17.5, type: "product", quantityAdjustable: true, category: "Produkte", icon: "≈" },
      { id: "dry-shampoo", title: "Trockenshampoo", price: 10.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "✺" },
      { id: "scalp-tonic", title: "Kopfhaut-Tonic", price: 19.5, type: "product", quantityAdjustable: true, category: "Produkte", icon: "◉" },
      { id: "round-brush", title: "Rundbürste", price: 24.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "⊙" },
      { id: "comb", title: "Kamm", price: 6.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "≡" },
      { id: "travel-set", title: "Reiseset", price: 22.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "▦" },

      { id: "voucher-25", title: "Gutschein 25 €", price: 25, type: "voucher", quantityAdjustable: false, category: "Gutscheine", icon: "◇" },
      { id: "voucher-50", title: "Gutschein 50 €", price: 50, type: "voucher", quantityAdjustable: false, category: "Gutscheine", icon: "◇" },
      { id: "voucher-100", title: "Gutschein 100 €", price: 100, type: "voucher", quantityAdjustable: false, category: "Gutscheine", icon: "◇" }
    ],
    podiatry: [
      { id: "basic-treatment", title: "Fußpflege", price: 42, type: "service", quantityAdjustable: false, category: "Favoriten", icon: "✦" },
      { id: "medical-treatment", title: "Podologische Behandlung", price: 58, type: "service", quantityAdjustable: false, category: "Favoriten", icon: "✦" },
      { id: "nail-correction", title: "Nagelkorrektur", price: 22, type: "service", quantityAdjustable: false, category: "Leistungen", icon: "+" },
      { id: "care-cream", title: "Pflegecreme", price: 12.9, type: "product", quantityAdjustable: true, category: "Produkte", icon: "▣" },
      { id: "voucher-50", title: "Gutschein 50 €", price: 50, type: "voucher", quantityAdjustable: false, category: "Gutscheine", icon: "◇" }
    ]
  },
  categories: ["Favoriten", "Leistungen", "Produkte", "Gutscheine"],


  receipts: [
    {
      number: "2026-000130", type: "receipt", status: "completed", date: "01.08.2026", time: "23:00",
      sortKey: "2026-08-01T23:00", payment: "Bar", total: 85.05,
      customer: null,
      items: [
        { title: "Waschen + Schneiden", quantity: 1, unitPrice: 29.25, total: 29.25 },
        { title: "Föhnen", quantity: 1, unitPrice: 18.00, total: 18.00 },
        { title: "Silbershampoo", quantity: 2, unitPrice: 18.90, total: 37.80 }
      ],
      activity: [
        { label: "Beleg erstellt", date: "01.08.2026 · 23:00" },
        { label: "Bar bezahlt", date: "01.08.2026 · 23:00" }
      ]
    },
    {
      number: "2026-000129", type: "receipt", status: "completed", date: "01.08.2026", time: "22:58",
      sortKey: "2026-08-01T22:58", payment: "Karte", total: 85.05,
      customer: { id: "c-anna", name: "Anna Müller", email: "anna.mueller@example.de", street: "Gartenstraße 8", zip: "93047", city: "Regensburg" },
      items: [
        { title: "Waschen + Schneiden", quantity: 1, unitPrice: 29.25, total: 29.25 },
        { title: "Föhnen", quantity: 1, unitPrice: 18.00, total: 18.00 },
        { title: "Silbershampoo", quantity: 2, unitPrice: 18.90, total: 37.80 }
      ],
      activity: [
        { label: "Beleg erstellt", date: "01.08.2026 · 22:58" },
        { label: "Per E-Mail versendet", date: "01.08.2026 · 22:59" }
      ]
    },
    {
      number: "2026-000128", type: "receipt", status: "partially-credited", date: "01.08.2026", time: "21:44",
      sortKey: "2026-08-01T21:44", payment: "Bar", total: 81.05,
      customer: { id: "c-anna", name: "Anna Müller", email: "anna.mueller@example.de", street: "Gartenstraße 8", zip: "93047", city: "Regensburg" },
      items: [
        { title: "Waschen + Schneiden", quantity: 1, unitPrice: 29.25, total: 29.25 },
        { title: "Föhnen", quantity: 1, unitPrice: 18.00, total: 18.00 },
        { title: "Conditioner", quantity: 2, unitPrice: 16.90, total: 33.80 }
      ],
      activity: [
        { label: "Beleg erstellt", date: "01.08.2026 · 21:44" },
        { label: "Teilgutschrift 10,00 €", date: "02.08.2026 · 09:15" }
      ]
    },
    {
      number: "GS-2026-000100", type: "credit", status: "credited", reference: "2026-000128",
      date: "02.08.2026", time: "09:15", sortKey: "2026-08-02T09:15", payment: "Bar", total: -10.00,
      customer: { id: "c-anna", name: "Anna Müller", email: "anna.mueller@example.de", street: "Gartenstraße 8", zip: "93047", city: "Regensburg" },
      items: [{ title: "Kulanz wegen Reklamation", quantity: 1, unitPrice: -10.00, total: -10.00 }],
      activity: [
        { label: "Teilgutschrift erstellt", date: "02.08.2026 · 09:15" },
        { label: "Bezug auf 2026-000128", date: "01.08.2026" }
      ]
    },
    {
      number: "2026-000127", type: "receipt", status: "completed", date: "24.07.2026", time: "11:20",
      sortKey: "2026-07-24T11:20", payment: "Bar", total: 92.50,
      customer: { id: "c-anna", name: "Anna Müller", email: "anna.mueller@example.de", street: "Gartenstraße 8", zip: "93047", city: "Regensburg" },
      items: [
        { title: "Waschen + Schneiden", quantity: 1, unitPrice: 39.00, total: 39.00 },
        { title: "Farbe", quantity: 1, unitPrice: 48.00, total: 48.00 },
        { title: "Intensivpflege", quantity: 1, unitPrice: 5.50, total: 5.50 }
      ],
      activity: [{ label: "Beleg erstellt", date: "24.07.2026 · 11:20" }]
    },
    {
      number: "2026-000126", type: "receipt", status: "completed", date: "22.07.2026", time: "16:45",
      sortKey: "2026-07-22T16:45", payment: "Später", total: 48.00,
      customer: { id: "c-maria", name: "Maria Schneider", email: "maria.schneider@example.de", street: "Domplatz 4", zip: "93047", city: "Regensburg" },
      items: [{ title: "Farbe", quantity: 1, unitPrice: 48.00, total: 48.00 }],
      activity: [{ label: "Beleg erstellt", date: "22.07.2026 · 16:45" }]
    },

    {
      number: "2026-000116", type: "receipt", status: "completed", date: "18.06.2026", time: "10:10",
      sortKey: "2026-06-18T10:10", payment: "Karte", total: 73.40,
      customer: { id: "c-anna", name: "Anna Müller", email: "anna.mueller@example.de", street: "Gartenstraße 8", zip: "93047", city: "Regensburg" },
      items: [{ title: "Farbe", quantity: 1, unitPrice: 48.00, total: 48.00 }, { title: "Color Shampoo", quantity: 1, unitPrice: 25.40, total: 25.40 }],
      activity: [{ label: "Beleg erstellt", date: "18.06.2026 · 10:10" }]
    },
    {
      number: "2026-000101", type: "receipt", status: "completed", date: "29.05.2026", time: "09:30",
      sortKey: "2026-05-29T09:30", payment: "Bar", total: 39.00,
      customer: { id: "c-anna", name: "Anna Müller", email: "anna.mueller@example.de", street: "Gartenstraße 8", zip: "93047", city: "Regensburg" },
      items: [{ title: "Waschen + Schneiden", quantity: 1, unitPrice: 39.00, total: 39.00 }],
      activity: [{ label: "Beleg erstellt", date: "29.05.2026 · 09:30" }]
    },
  ],
  customers: [
    {
      id: "c-anna", firstName: "Anna", lastName: "Müller", phone: "0176 23456789", email: "anna.mueller@example.de",
      street: "Gartenstraße 8", zip: "93047", city: "Regensburg", lastVisit: "24.07.2026", receiptCount: 12,
      totalTurnover: 684.90, note: "Bevorzugt Termine am Vormittag.",
      history: [
        { number: "2026-000127", date: "24.07.2026", total: 92.50, items: ["Waschen + Schneiden", "Farbe", "Intensivpflege"] },
        { number: "2026-000116", date: "18.06.2026", total: 73.40, items: ["Farbe", "Color Shampoo"] },
        { number: "2026-000101", date: "29.05.2026", total: 39.00, items: ["Waschen + Schneiden"] },
        { number: "2026-000084", date: "02.04.2026", total: 57.00, items: ["Waschen + Schneiden", "Föhnen"] },
        { number: "2026-000066", date: "20.02.2026", total: 86.90, items: ["Farbe", "Waschen + Schneiden", "Conditioner"] }
      ]
    },
    {
      id: "c-sabine", firstName: "Sabine", lastName: "Keller", phone: "0151 98765432", email: "sabine.keller@example.de",
      street: "Bahnhofstraße 21", zip: "93047", city: "Regensburg", lastVisit: "18.07.2026", receiptCount: 8,
      totalTurnover: 438.20, note: "",
      history: [
        { number: "2026-000124", date: "18.07.2026", total: 59.00, items: ["Strähnen"] },
        { number: "2026-000109", date: "07.06.2026", total: 45.90, items: ["Herrenschnitt", "Silbershampoo"] },
        { number: "2026-000092", date: "01.05.2026", total: 65.00, items: ["Komplettfarbe"] }
      ]
    },
    {
      id: "c-maria", firstName: "Maria", lastName: "Schneider", phone: "0160 11223344", email: "maria.schneider@example.de",
      street: "Domplatz 4", zip: "93047", city: "Regensburg", lastVisit: "02.07.2026", receiptCount: 5,
      totalTurnover: 271.50, note: "",
      history: [
        { number: "2026-000119", date: "02.07.2026", total: 55.00, items: ["Hochsteckfrisur"] },
        { number: "2026-000095", date: "08.05.2026", total: 48.00, items: ["Farbe"] },
        { number: "2026-000071", date: "05.03.2026", total: 57.00, items: ["Waschen + Schneiden", "Föhnen"] }
      ]
    },
    {
      id: "c-thomas", firstName: "Thomas", lastName: "Becker", phone: "0172 55667788", email: "thomas.becker@example.de",
      street: "Prüfeninger Straße 55", zip: "93049", city: "Regensburg", lastVisit: "20.06.2026", receiptCount: 3,
      totalTurnover: 94.90, note: "",
      history: [
        { number: "2026-000113", date: "20.06.2026", total: 40.90, items: ["Herrenschnitt", "Bart schneiden"] },
        { number: "2026-000078", date: "19.03.2026", total: 27.00, items: ["Herrenschnitt"] },
        { number: "2026-000041", date: "15.01.2026", total: 27.00, items: ["Herrenschnitt"] }
      ]
    }
  ],
  customerChoices: [
    { id: "none", title: "Ohne Kunde", note: "Keine persönlichen Daten", icon: "→" },
    { id: "existing", title: "Bestehender Kunde", note: "Kundensuche folgt später", icon: "◎" },
    { id: "new", title: "Neuer Kunde", note: "Erfassung folgt später", icon: "+" }
  ],
  paymentChoices: [
    { id: "cash", title: "Bar", icon: "€" },
    { id: "card", title: "Karte", icon: "▣" },
    { id: "later", title: "Später", icon: "…" }
  ],
  vouchers: [
    {
      reference: "vch_8f4c2a91d7e6",
      code: "FRKA-7Q2M-9K4X",
      status: "active",
      issuedValue: 50,
      currentValue: 18.5,
      soldAt: "28.07.2026"
    },
    {
      reference: "vch_1b7e93a4c5d8",
      code: "FRKA-3N8R-6W5P",
      status: "active",
      issuedValue: 100,
      currentValue: 100,
      soldAt: "01.08.2026"
    },
    {
      reference: "vch_6d2a84f9b3c1",
      code: "FRKA-5T9L-2H7C",
      status: "redeemed",
      issuedValue: 25,
      currentValue: 0,
      soldAt: "14.07.2026"
    }
  ],
  openReceipt: { exists: true, customer: "Ohne Kundenzuordnung", lastEdited: "vor wenigen Minuten", itemCount: 2 },
  placeholders: {
    receipts: { title: "Belege", icon: "▤", note: "Die Belegübersicht folgt in einem späteren UX-Block." },
    customers: { title: "Kunden", icon: "◎", note: "Kunden suchen, auswählen und neu anlegen." },
    settings: { title: "Einstellungen", icon: "⚙", note: "Die Einstellungen folgen in einem späteren UX-Block." }
  }
});
