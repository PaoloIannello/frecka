(() => {
  "use strict";
  const data = window.PROTOTYPE_DATA;
  const receiptNumberPrefix = String(data.receiptSettings?.yearPrefix || new Date().getFullYear());
  const initialReceiptCounter = [...data.receipts, ...data.vouchers.map(voucher => ({ number: voucher.saleReceipt?.number }))].reduce((highest, receipt) => {
    const [prefix, sequence] = String(receipt.number || "").split("-");
    const match = prefix === receiptNumberPrefix && /^\d{6}$/.test(sequence || "") ? Number(sequence) : null;
    return match !== null ? Math.max(highest, match) : highest;
  }, Math.max(0, Number(data.receiptSettings?.nextNumber || 1) - 1));
  const state = {
    route: "home",
    activeBusinessArea: data.businessAreas.find(area => area.active !== false && area.isDefault)?.id
      ?? data.businessAreas.find(area => area.active !== false)?.id
      ?? null,
    activeCategory: "Favoriten",
    search: "",
    openReceiptVisible: Boolean(data.openReceipt?.exists),
    cart: [],
    cartExpanded: false,
    customerChoice: "none",
    paymentChoice: "cash",
    checkoutVoucherCode: "",
    checkoutVoucherReference: null,
    checkoutVoucherError: "",
    checkoutVoucherPickerOpen: false,
    checkoutVoucherRemainderPayment: "cash",
    checkoutSubmitting: false,
    priceEditorId: null,
    customerSearch: "",
    selectedCustomerId: null,
    customerDetailId: null,
    customerHistoryExpanded: false,
    customerHistoryOpenNumber: null,
    receiptInternalNote: "",
    pendingDialogAction: null,
    editingCustomerId: null,
    receiptFilter: "all",
    receiptSearch: "",
    receiptDetailNumber: null,
    receiptPreviewNumber: null,
    receiptPreviewReturnRoute: "receipt-success",
    receiptCounter: initialReceiptCounter,
    creditMode: "full",
    creditAmount: "",
    creditText: "Korrektur / Kulanz",
    finishedReceipt: null,
    successNotice: "",
    qrVisible: false,
    voucherSearch: "",
    voucherFilter: "open",
    voucherDetailReference: null,
    voucherNotice: "",
    voucherSaleAmountChoice: null,
    voucherSaleCustomAmount: "",
    voucherSalePaymentChoice: "cash",
    voucherSaleCustomerId: null,
    voucherSaleDisplayName: "",
    voucherSaleReturnRoute: "vouchers",
    customerPickerContext: "receipt",
    voucherSaleError: "",
    voucherSaleSubmitting: false,
    voucherSaleCreatedReference: null,
    settingsNotice: "",
    serviceLocationNotice: "",
    taxSettingsNotice: "",
    paymentSettingsNotice: "",
    businessAreaSettingsNotice: "",
    setupStep: 1,
    setupNotice: "",
    setupFirstStartVisible: true,
    setupCompleted: false,
    setupTestPreviewVisible: false,
    pendingBusinessTemplate: ""
  };

  const mainContent = document.getElementById("mainContent");
  const companyName = document.getElementById("companyName");
  const switcherWrap = document.getElementById("businessSwitcherWrap");
  const switcher = document.getElementById("businessSwitcher");
  const bottomNav = document.getElementById("bottomNav");
  const dialogBackdrop = document.getElementById("dialogBackdrop");
  const cancelDiscard = document.getElementById("cancelDiscard");
  const confirmDiscard = document.getElementById("confirmDiscard");
  const dialogTitle = document.getElementById("dialogTitle");
  const dialogText = document.getElementById("dialogText");
  const bottomSheetBackdrop = document.getElementById("bottomSheetBackdrop");
  const bottomSheet = document.getElementById("bottomSheet");
  const bottomSheetTitle = document.getElementById("bottomSheetTitle");
  const bottomSheetContent = document.getElementById("bottomSheetContent");
  const bottomSheetClose = document.getElementById("bottomSheetClose");
  const flowRoutes = new Set(["catalog", "edit-cart", "checkout", "customer-picker", "customer-new", "customer-edit", "customer-detail", "receipt-success", "receipt-preview", "receipt-detail", "receipt-credit", "voucher-detail", "voucher-preview", "voucher-sale", "voucher-sale-success", "settings-company", "settings-location", "settings-taxes", "settings-payments", "settings-business-areas", "settings-help", "setup-wizard"]);
  const validRoutes = new Set(["home", "receipts", "customers", "vouchers", "settings", ...flowRoutes]);

  const escapeHtml = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const formatCurrency = value => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  const addressCityLine = address => [address?.zip || "", address?.city || ""].filter(Boolean).join(" ");
  const getAreaLabel = () => data.businessAreas.find(area => area.id === state.activeBusinessArea)?.label ?? "Geschäftsbereich";
  const cartTotal = () => state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = () => state.cart.reduce((sum, item) => sum + item.quantity, 0);

  const activeBusinessAreas = () => data.businessAreas.filter(area => area.active !== false);
  const defaultBusinessArea = () => activeBusinessAreas().find(area => area.isDefault) ?? activeBusinessAreas()[0] ?? null;

  function refreshBusinessSwitcher() {
    companyName.textContent = data.company.name;
    const areas = activeBusinessAreas();
    if (!areas.some(area => area.id === state.activeBusinessArea)) state.activeBusinessArea = defaultBusinessArea()?.id ?? null;
    switcherWrap.hidden = areas.length <= 1;
    switcher.innerHTML = areas.map(area => `<option value="${escapeHtml(area.id)}">${escapeHtml(area.label)}</option>`).join("");
    switcher.value = state.activeBusinessArea || "";
  }

  function initHeader() {
    refreshBusinessSwitcher();
    switcher.addEventListener("change", event => {
      state.activeBusinessArea = event.target.value;
      state.activeCategory = "Favoriten";
      state.cart = [];
      state.search = "";
      renderRoute(false);
    });
  }

  function renderHome() {
    const openReceipt = state.openReceiptVisible ? `<section class="open-receipt" aria-labelledby="openReceiptTitle">
      <div class="open-receipt-header"><h2 id="openReceiptTitle">Offener Beleg</h2><span class="status-pill">Entwurf</span></div>
      <p>${data.openReceipt.itemCount} Positionen · ${escapeHtml(data.openReceipt.customer)} · ${escapeHtml(data.openReceipt.lastEdited)}</p>
      <div class="open-receipt-actions"><button class="button button-secondary" type="button" data-action="resume-receipt">Weiter bearbeiten</button><button class="button button-ghost" type="button" data-action="discard-receipt">Verwerfen</button></div>
    </section>` : "";
    mainContent.innerHTML = `<div class="home-layout page-enter">${state.setupFirstStartVisible ? setupStartHint() : ""}<section class="hero-card"><p class="eyebrow">${escapeHtml(getAreaLabel())}</p><h1>Was möchtest du erfassen?</h1><p class="hero-copy">Leistungen und Produkte direkt auswählen.</p><button class="button button-primary" type="button" data-action="new-receipt"><span aria-hidden="true">＋</span><span>Neuer Beleg</span></button></section>${openReceipt}</div>`;
  }

  function catalogItems() {
    const entries = data.catalog[state.activeBusinessArea] ?? [];
    const query = state.search.trim().toLowerCase();
    return entries.filter(item => query ? item.title.toLowerCase().includes(query) : item.category === state.activeCategory);
  }

  function quantityFor(id) { return state.cart.find(item => item.id === id)?.quantity ?? 0; }

  function renderCartRows() {
    if (!state.cart.length) return "";
    return `<div class="quick-cart-list">${state.cart.map(item => `<div class="quick-cart-row">
      <div class="quick-cart-name"><strong>${escapeHtml(item.title)}</strong><span>${formatCurrency(item.price)}</span></div>
      <div class="quantity-control" aria-label="Menge für ${escapeHtml(item.title)}">
        <button type="button" data-decrease-item="${escapeHtml(item.id)}" aria-label="Menge verringern">−</button>
        <strong>${item.quantity}</strong>
        <button type="button" data-increase-item="${escapeHtml(item.id)}" aria-label="Menge erhöhen">＋</button>
      </div>
      <button class="remove-item" type="button" data-remove-item="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} entfernen">Entfernen</button>
    </div>`).join("")}</div>`;
  }

  function renderCatalog() {
    const items = catalogItems();
    const count = cartCount();
    const total = cartTotal();
    const areaLabel = getAreaLabel();

    mainContent.innerHTML = `<section class="flow-page catalog-page">
      <header class="catalog-work-header">
        <div class="catalog-title-row">
          <button class="catalog-back" type="button" data-route="home" aria-label="Zur Startseite">
            <span aria-hidden="true">←</span>
            <span>Zurück</span>
          </button>
          <span class="catalog-area">${escapeHtml(areaLabel)}</span>
        </div>

        <div class="catalog-heading-line">
          <div>
            <p class="catalog-eyebrow">Neuer Beleg</p>
            <h1>Positionen</h1>
          </div>
          <p>Leistungen und Produkte auswählen.</p>
        </div>

        <label class="search-field catalog-search-field">
          <span aria-hidden="true">⌕</span>
          <input id="catalogSearch" type="search" placeholder="Leistung oder Produkt suchen" value="${escapeHtml(state.search)}">
        </label>

        <div class="category-tabs catalog-category-tabs" role="tablist" aria-label="Kategorien">
          ${data.categories.map(category => `<button class="category-tab ${state.activeCategory === category && !state.search ? "is-active" : ""}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}
        </div>
      </header>

      <div class="product-grid catalog-product-grid">
        ${items.length ? items.map(item => `<button class="product-tile ${quantityFor(item.id) ? "is-in-cart" : ""}" type="button" data-toggle-item="${escapeHtml(item.id)}" aria-pressed="${quantityFor(item.id) ? "true" : "false"}">
          <span class="product-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
          ${quantityFor(item.id) ? `<span class="tile-selected" aria-hidden="true">✓</span>` : ""}
          <span class="product-title">${escapeHtml(item.title)}</span>
          <span class="product-price">${formatCurrency(item.price)}</span>
        </button>`).join("") : `<div class="empty-state">Keine passenden Einträge gefunden.</div>`}
      </div>
    </section>

    <section class="compact-cart ${count ? "has-items" : "is-empty"} ${state.cartExpanded ? "is-expanded" : ""}" aria-label="Aktueller Beleg">
      ${state.cartExpanded && count ? `<div class="compact-cart-expanded">
        <div>
          <span>Aktueller Beleg</span>
          <strong>${count} ${count === 1 ? "Position" : "Positionen"} · ${formatCurrency(total)}</strong>
        </div>
        <button type="button" data-route="edit-cart">Positionen bearbeiten</button>
      </div>` : ""}

      <div class="compact-cart-row">
        <button class="compact-cart-summary" type="button" data-action="toggle-cart-expanded" ${count ? "" : "disabled"} aria-expanded="${state.cartExpanded ? "true" : "false"}">
          <span>${count} ${count === 1 ? "Position" : "Positionen"}</span>
          <strong>${formatCurrency(total)}</strong>
          ${count ? `<span class="compact-cart-chevron" aria-hidden="true">${state.cartExpanded ? "⌄" : "⌃"}</span>` : ""}
        </button>
        <button class="compact-cart-next" type="button" data-route="checkout" ${count ? "" : "disabled"}>Weiter</button>
      </div>
    </section>`;

    document.getElementById("catalogSearch")?.addEventListener("input", event => {
      state.search = event.target.value;
      renderCatalog();
      const input = document.getElementById("catalogSearch");
      input?.focus();
      input?.setSelectionRange(state.search.length, state.search.length);
    });
  }


  function itemTypeLabel(item) {
    if (item.type === "product") return "Produkt";
    if (item.type === "voucher") return "Gutschein";
    return "Dienstleistung";
  }

  function priceDetail(item) {
    const base = item.basePrice ?? item.price;
    if (item.discountType === "fixed" && item.discountAmount > 0) {
      return `${formatCurrency(base)} · ${formatCurrency(item.discountAmount)} Rabatt`;
    }
    if (item.discountType === "percent" && item.discountPercent > 0) {
      return `${formatCurrency(base)} · ${item.discountPercent}% Rabatt`;
    }
    if (item.priceOverride !== null && item.priceOverride !== undefined) {
      return `Standard ${formatCurrency(base)} · Preis manuell geändert`;
    }
    return `${formatCurrency(base)} regulär`;
  }

  function renderPriceEditor(item) {
    if (state.priceEditorId !== item.id) return "";
    const base = item.basePrice ?? item.price;
    const discountType = item.discountType || "percent";
    const discountValue = discountType === "fixed" ? (item.discountAmount || "") : (item.discountPercent || "");

    return `<form class="price-editor" data-price-form="${escapeHtml(item.id)}">
      <p class="price-editor-title">Preis oder Rabatt anpassen</p>

      <label class="price-mode-label">
        <span>Manueller Einzelpreis</span>
        <div class="money-input">
          <input name="manualPrice" type="number" inputmode="decimal" min="0" step="0.01"
            value="${item.priceOverride !== null && item.priceOverride !== undefined ? item.priceOverride.toFixed(2) : ""}"
            placeholder="${base.toFixed(2)}">
          <span>€</span>
        </div>
      </label>

      <div class="discount-block">
        <span class="discount-label">Rabatt</span>
        <div class="discount-switch" role="group" aria-label="Rabattart">
          <button type="button" class="${discountType === "percent" ? "is-active" : ""}" data-discount-type="percent" data-item-id="${escapeHtml(item.id)}">%</button>
          <button type="button" class="${discountType === "fixed" ? "is-active" : ""}" data-discount-type="fixed" data-item-id="${escapeHtml(item.id)}">€</button>
        </div>
        <div class="money-input">
          <input name="discountValue" type="number" inputmode="decimal" min="0"
            max="${discountType === "percent" ? "100" : base.toFixed(2)}"
            step="${discountType === "percent" ? "1" : "0.01"}"
            value="${discountValue}"
            placeholder="0">
          <span>${discountType === "percent" ? "%" : "€"}</span>
        </div>
      </div>

      <p class="price-editor-note">Manueller Preis und Rabatt schließen sich gegenseitig aus.</p>
      <div class="price-editor-actions">
        <button class="button button-secondary" type="button" data-price-reset="${escapeHtml(item.id)}">Zurücksetzen</button>
        <button class="button button-primary" type="submit">Übernehmen</button>
      </div>
    </form>`;
  }

  function renderCartEditor() {
    if (!state.cart.length) {
      navigate("catalog", false);
      return;
    }

    mainContent.innerHTML = `<section class="flow-page cart-editor-page page-enter">
      <div class="flow-head compact-work-head">
        <button class="button button-back" type="button" data-route="catalog"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Neuer Beleg</p>
        <h1 class="flow-title">Positionen bearbeiten</h1>
        <p class="page-copy">Preis, Rabatt oder Produktmenge anpassen.</p>
      </div>

      <section class="editor-list" aria-label="Positionen im aktuellen Beleg">
        ${state.cart.map(item => `<article class="editor-item">
          <div class="editor-item-main">
            <div>
              <span class="item-type">${itemTypeLabel(item)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${priceDetail(item)}</span>
            </div>
            <strong class="editor-line-total">${formatCurrency(item.price * item.quantity)}</strong>
          </div>

          <div class="editor-item-actions ${item.quantityAdjustable ? "" : "no-quantity"}">
            ${item.quantityAdjustable ? `<div class="editor-quantity" aria-label="Menge für ${escapeHtml(item.title)}">
              <button type="button" data-edit-decrease="${escapeHtml(item.id)}" aria-label="Menge verringern">−</button>
              <strong>${item.quantity}</strong>
              <button type="button" data-edit-increase="${escapeHtml(item.id)}" aria-label="Menge erhöhen">＋</button>
            </div>` : `<span class="fixed-quantity">1 ×</span>`}
            <button class="editor-price" type="button" data-edit-price="${escapeHtml(item.id)}">${state.priceEditorId === item.id ? "Schließen" : (item.type === "product" ? "Menge / Preis" : "Preis anpassen")}</button>
            <button class="editor-remove" type="button" data-edit-remove="${escapeHtml(item.id)}">Entfernen</button>
          </div>
          ${renderPriceEditor(item)}
        </article>`).join("")}
      </section>

      <section class="editor-total">
        <span>Gesamt</span>
        <strong>${formatCurrency(cartTotal())}</strong>
      </section>

      <div class="editor-actions">
        <button class="button button-secondary" type="button" data-route="catalog">Weitere Positionen</button>
        <button class="button button-primary" type="button" data-route="checkout">Weiter</button>
      </div>
    </section>`;
  }


  function selectedCustomer() {
    return data.customers.find(customer => customer.id === state.selectedCustomerId) ?? null;
  }

  const activePaymentChoices = () => data.paymentChoices.filter(choice => choice.active !== false);
  const isNormalPaymentChoice = choice => !["voucher", "later"].includes(choice.id);
  const activeNormalPaymentChoices = () => activePaymentChoices().filter(isNormalPaymentChoice);
  const preferredNormalPaymentId = () => activeNormalPaymentChoices()[0]?.id ?? null;
  const receiptNumberExists = number => data.receipts.some(receipt => receipt.number === number)
    || data.vouchers.some(voucher => voucher.saleReceipt?.number === number);

  function paymentLabel() {
    return data.paymentChoices.find(choice => choice.id === state.paymentChoice)?.title ?? "Nicht angegeben";
  }

  const normalizeVoucherCode = value => String(value || "").trim().toLocaleUpperCase("de-DE").replaceAll("-", "").replaceAll(" ", "");
  const eligibleCheckoutVouchers = () => data.vouchers.filter(isVoucherOpen);
  const selectedCheckoutVoucher = () => voucherByReference(state.checkoutVoucherReference);

  function resetCheckoutVoucher() {
    state.checkoutVoucherCode = "";
    state.checkoutVoucherReference = null;
    state.checkoutVoucherError = "";
    state.checkoutVoucherPickerOpen = false;
    state.checkoutVoucherRemainderPayment = preferredNormalPaymentId() || "cash";
  }

  function chooseCheckoutVoucher(voucher) {
    if (!voucher) return false;
    if (voucher.status === "cancelled") {
      state.checkoutVoucherError = "Dieser Gutschein wurde storniert.";
      return false;
    }
    if (voucher.status === "redeemed" || Number(voucher.currentValue) <= 0) {
      state.checkoutVoucherError = "Dieser Gutschein wurde bereits vollständig eingelöst.";
      return false;
    }
    if (!isVoucherOpen(voucher)) {
      state.checkoutVoucherError = "Dieser Gutschein kann nicht eingelöst werden.";
      return false;
    }
    state.checkoutVoucherReference = voucher.reference;
    state.checkoutVoucherCode = voucher.code;
    state.checkoutVoucherError = "";
    state.checkoutVoucherPickerOpen = false;
    return true;
  }

  function chooseCheckoutVoucherByCode() {
    const query = normalizeVoucherCode(state.checkoutVoucherCode);
    if (!query) {
      state.checkoutVoucherError = "Bitte einen Gutscheincode eingeben.";
      return false;
    }
    const matches = data.vouchers.filter(voucher => normalizeVoucherCode(voucher.code).includes(query));
    if (!matches.length) {
      state.checkoutVoucherError = "Gutschein wurde nicht gefunden.";
      return false;
    }
    if (matches.length > 1) {
      state.checkoutVoucherError = "Mehrere Gutscheine passen. Bitte den Code genauer eingeben.";
      return false;
    }
    return chooseCheckoutVoucher(matches[0]);
  }

  function checkoutVoucherAmounts(voucher = selectedCheckoutVoucher()) {
    const total = Math.round(cartTotal() * 100) / 100;
    const balanceBefore = Math.max(0, Number(voucher?.currentValue || 0));
    const voucherAmount = Math.min(total, balanceBefore);
    return {
      total,
      balanceBefore,
      voucherAmount: Math.round(voucherAmount * 100) / 100,
      balanceAfter: Math.round((balanceBefore - voucherAmount) * 100) / 100,
      remainder: Math.round((total - voucherAmount) * 100) / 100
    };
  }

  function nextReceiptNumber() {
    let number;
    const prefix = String(data.receiptSettings.yearPrefix || new Date().getFullYear()).trim();
    do {
      state.receiptCounter += 1;
      number = `${prefix}-${String(state.receiptCounter).padStart(6, "0")}`;
    } while (receiptNumberExists(number));
    data.receiptSettings.nextNumber = state.receiptCounter + 1;
    return number;
  }

  function finishReceipt() {
    if (state.checkoutSubmitting) return;
    const customer = selectedCustomer();
    if (!activePaymentChoices().some(choice => choice.id === state.paymentChoice)) {
      state.paymentChoice = preferredNormalPaymentId() || activePaymentChoices()[0]?.id || "cash";
      renderCheckout();
      return;
    }
    const voucher = state.paymentChoice === "voucher" ? selectedCheckoutVoucher() : null;
    if (state.paymentChoice === "voucher" && (!voucher || !isVoucherOpen(voucher))) {
      state.checkoutVoucherError = voucher?.status === "cancelled"
        ? "Dieser Gutschein wurde storniert."
        : voucher?.status === "redeemed" || Number(voucher?.currentValue || 0) <= 0
          ? "Dieser Gutschein wurde bereits vollständig eingelöst."
          : "Bitte einen gültigen Gutschein auswählen.";
      renderCheckout();
      return;
    }
    const voucherAmounts = voucher ? checkoutVoucherAmounts(voucher) : null;
    if (voucherAmounts?.remainder > 0 && !activeNormalPaymentChoices().some(choice => choice.id === state.checkoutVoucherRemainderPayment)) {
      state.checkoutVoucherError = "Bitte eine aktive Zahlungsart für die Restzahlung auswählen.";
      renderCheckout();
      return;
    }
    state.checkoutSubmitting = true;
    const defaultTaxRate = Number(data.taxSettings.defaultRate || data.company.defaultTaxRate || 19);

    const items = state.cart.map(item => {
      const quantity = Number(item.quantity || 1);
      const originalUnitPrice = Number(item.basePrice ?? item.price ?? 0);
      const unitPrice = Number(item.price || 0);
      const originalTotal = Math.round(originalUnitPrice * quantity * 100) / 100;
      const total = Math.round(unitPrice * quantity * 100) / 100;
      const discountTotal = Math.max(0, Math.round((originalTotal - total) * 100) / 100);
      const taxRate = Number(item.taxRate ?? defaultTaxRate);
      const netTotal = Math.round((total / (1 + taxRate / 100)) * 100) / 100;
      const taxAmount = Math.round((total - netTotal) * 100) / 100;

      let discountLabel = "";
      if (item.discountType === "percent" && Number(item.discountPercent || 0) > 0) {
        discountLabel = `${item.discountPercent}% Rabatt`;
      } else if (item.discountType === "fixed" && Number(item.discountAmount || 0) > 0) {
        discountLabel = `${formatCurrency(item.discountAmount)} Rabatt je Position`;
      } else if (item.priceOverride !== null && item.priceOverride !== undefined && unitPrice !== originalUnitPrice) {
        discountLabel = `Preis manuell geändert`;
      }

      return {
        title: item.title,
        quantity,
        originalUnitPrice,
        unitPrice,
        originalTotal,
        total,
        discountTotal,
        discountLabel,
        taxRate,
        netTotal,
        taxAmount
      };
    });

    const total = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
    const originalTotal = Math.round(items.reduce((sum, item) => sum + item.originalTotal, 0) * 100) / 100;
    const discountTotal = Math.max(0, Math.round((originalTotal - total) * 100) / 100);
    const netTotal = Math.round(items.reduce((sum, item) => sum + item.netTotal, 0) * 100) / 100;
    const taxTotal = Math.round(items.reduce((sum, item) => sum + item.taxAmount, 0) * 100) / 100;

    const taxGroups = Object.values(items.reduce((groups, item) => {
      const key = String(item.taxRate);
      if (!groups[key]) groups[key] = { rate: item.taxRate, net: 0, tax: 0, gross: 0 };
      groups[key].net += item.netTotal;
      groups[key].tax += item.taxAmount;
      groups[key].gross += item.total;
      return groups;
    }, {})).map(group => ({
      rate: group.rate,
      net: Math.round(group.net * 100) / 100,
      tax: Math.round(group.tax * 100) / 100,
      gross: Math.round(group.gross * 100) / 100
    }));

    const now = new Date();
    const receiptNumber = nextReceiptNumber();
    const receiptDate = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
    const receiptTime = new Intl.DateTimeFormat("de-DE", { timeStyle: "short" }).format(now);
    const remainderPayment = voucherAmounts?.remainder > 0
      ? data.paymentChoices.find(choice => choice.id === state.checkoutVoucherRemainderPayment)?.title || "Bar"
      : null;
    const receiptPayment = voucher
      ? voucherAmounts.remainder > 0 ? `Gutschein + ${remainderPayment}` : "Gutschein"
      : paymentLabel();
    const customerSnapshot = customer ? {
      id: customer.id,
      name: customerName(customer),
      email: customer.email || "",
      street: customer.street || "",
      zip: customer.zip || "",
      city: customer.city || ""
    } : null;
    const receipt = {
      id: `receipt_${crypto.randomUUID?.() || Date.now()}`,
      number: receiptNumber,
      type: "receipt",
      status: "completed",
      date: receiptDate,
      time: receiptTime,
      sortKey: now.toISOString(),
      total,
      originalTotal,
      discountTotal,
      netTotal,
      taxTotal,
      taxGroups,
      payment: receiptPayment,
      customer: customerSnapshot,
      customerEmail: customer?.email || "",
      createdAt: new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
      items,
      voucherPayment: voucher ? {
        reference: voucher.reference,
        code: voucher.code,
        amount: voucherAmounts.voucherAmount,
        balanceBefore: voucherAmounts.balanceBefore,
        balanceAfter: voucherAmounts.balanceAfter
      } : null,
      remainderPayment: voucherAmounts?.remainder > 0 ? { method: remainderPayment, amount: voucherAmounts.remainder } : null,
      activity: [
        { label: "Beleg erstellt", date: `${receiptDate} · ${receiptTime}` },
        ...(voucher ? [{ label: `Mit Gutschein ${voucher.code} bezahlt`, date: `${receiptDate} · ${receiptTime}` }] : [])
      ],
      receiptTextSnapshot: {
        footerText: data.receiptSettings.footerText || "",
        thankYouText: data.receiptSettings.thankYouText ?? "Vielen Dank für Ihren Besuch."
      }
    };
    const previousVoucher = voucher ? {
      currentValue: voucher.currentValue,
      status: voucher.status,
      historyLength: Array.isArray(voucher.history) ? voucher.history.length : 0
    } : null;
    let receiptInserted = false;
    try {
      if (voucher) {
        voucher.currentValue = voucherAmounts.balanceAfter;
        voucher.status = voucherAmounts.balanceAfter <= 0 ? "redeemed" : "partially_redeemed";
        voucher.history = Array.isArray(voucher.history) ? voucher.history : [];
        voucher.history.push({
          type: voucherAmounts.balanceAfter <= 0 ? "full_redemption" : "partial_redemption",
          date: receiptDate,
          time: receiptTime,
          amount: voucherAmounts.voucherAmount,
          balanceAfter: voucherAmounts.balanceAfter,
          receiptNumber
        });
      }
      data.receipts.unshift(receipt);
      receiptInserted = true;
      state.finishedReceipt = receipt;
    } catch (error) {
      if (receiptInserted) {
        const receiptIndex = data.receipts.indexOf(receipt);
        if (receiptIndex >= 0) data.receipts.splice(receiptIndex, 1);
      }
      if (voucher && previousVoucher) {
        voucher.currentValue = previousVoucher.currentValue;
        voucher.status = previousVoucher.status;
        voucher.history.splice(previousVoucher.historyLength);
      }
      state.checkoutSubmitting = false;
      state.checkoutVoucherError = "Beleg und Gutscheineinlösung konnten nicht gemeinsam abgeschlossen werden.";
      renderCheckout();
      return;
    }
    state.checkoutSubmitting = false;
    state.successNotice = "";
    state.qrVisible = false;
    state.openReceiptVisible = false;
    navigate("receipt-success");
  }

  function renderReceiptSuccess() {
    const receipt = state.finishedReceipt;
    if (!receipt) {
      navigate("home", false);
      return;
    }
    const paidVoucher = receipt.voucherPayment ? voucherByReference(receipt.voucherPayment.reference) : null;

    const qrCells = Array.from({ length: 81 }, (_, index) => {
      const on = [0,1,2,3,4,9,13,18,20,22,27,28,29,30,31,36,40,44,45,49,53,54,55,56,57,58,62,64,67,71,72,73,74,75,76,77,78,79,80].includes(index) || (index * 7 + 3) % 11 < 4;
      return `<i class="${on ? "on" : ""}"></i>`;
    }).join("");

    mainContent.innerHTML = `<section class="flow-page receipt-success-page page-enter">
      <div class="success-hero">
        <div class="success-mark" aria-hidden="true">✓</div>
        <p class="eyebrow">Beleg abgeschlossen</p>
        <h1>Beleg erfolgreich erstellt</h1>
        <p>Der Abschluss ist im Prototyp nur simuliert.</p>
      </div>

      <section class="receipt-success-summary">
        <div><span>Belegnummer</span><strong>${escapeHtml(receipt.number)}</strong></div>
        <div><span>Gesamt</span><strong>${formatCurrency(receipt.total)}</strong></div>
        ${receipt.customer ? `<div><span>Kunde</span><strong>${escapeHtml(receipt.customer.name)}</strong>${customerAddressLines(receipt.customer).map(line => `<small>${escapeHtml(line)}</small>`).join("")}</div>` : ""}
        <div><span>Zahlungsart</span><strong>${escapeHtml(receipt.payment)}</strong></div>
        ${receipt.voucherPayment ? `<div><span>Mit Gutschein bezahlt</span><strong>${formatCurrency(receipt.voucherPayment.amount)}</strong><small>${escapeHtml(receipt.voucherPayment.code)}</small></div>` : ""}
        ${receipt.remainderPayment ? `<div><span>Restzahlung</span><strong>${formatCurrency(receipt.remainderPayment.amount)}</strong><small>${escapeHtml(receipt.remainderPayment.method)}</small></div>` : ""}
      </section>

      ${state.successNotice ? `<div class="success-notice" role="status">${escapeHtml(state.successNotice)}</div>` : ""}

      ${state.qrVisible ? `<section class="demo-qr-panel">
        <div class="demo-qr" aria-label="Simulierter QR-Code">${qrCells}</div>
        <div><strong>QR-Code zum Beleg</strong><p>Im Produkt würde dieser Code zum digitalen Beleg führen.</p></div>
      </section>` : ""}

      <section class="success-actions" aria-label="Aktionen nach dem Belegabschluss">
        ${paidVoucher ? `<button class="success-action-card" type="button" data-open-linked-voucher="${escapeHtml(paidVoucher.reference)}"><span aria-hidden="true">◇</span><strong>Gutschein öffnen</strong><small>${escapeHtml(maskVoucherCode(paidVoucher.code))}</small></button>` : ""}
        <button class="success-action-card" type="button" data-route="receipt-preview">
          <span aria-hidden="true">▤</span><strong>PDF anzeigen</strong><small>Belegvorschau öffnen</small>
        </button>
        <button class="success-action-card" type="button" data-action="simulate-email">
          <span aria-hidden="true">✉</span><strong>Per E-Mail senden</strong><small>${receipt.customerEmail ? escapeHtml(receipt.customerEmail) : "Versand simulieren"}</small>
        </button>
        <button class="success-action-card" type="button" data-action="toggle-qr">
          <span aria-hidden="true">▦</span><strong>QR-Code anzeigen</strong><small>Digitalen Abruf simulieren</small>
        </button>
        <button class="success-action-card primary" type="button" data-action="new-after-finish">
          <span aria-hidden="true">＋</span><strong>Neuen Beleg erstellen</strong><small>Direkt weiterarbeiten</small>
        </button>
      </section>

      <div class="success-secondary-actions">
        <button class="button button-secondary" type="button" data-route="receipts">Belegliste öffnen</button>
        <button class="button button-ghost" type="button" data-action="home-after-finish">Zur Startseite</button>
      </div>
    </section>`;
  }

  function renderReceiptPreview() {
    const receipt = state.receiptPreviewNumber ? receiptByNumber(state.receiptPreviewNumber) : state.finishedReceipt;
    if (!receipt) {
      navigate(state.receiptPreviewNumber ? "receipts" : "home", false);
      return;
    }
    const isVoucherSale = receipt.receiptKind === "voucher-sale";
    const linkedVoucher = isVoucherSale
      ? voucherByReference(receipt.voucherReference)
      : receipt.voucherPayment ? voucherByReference(receipt.voucherPayment.reference) : null;
    const createdAt = receipt.createdAt || [receipt.date, receipt.time].filter(Boolean).join(" · ");
    const taxGroups = Array.isArray(receipt.taxGroups) ? receipt.taxGroups : [];
    const showTaxDetails = !isVoucherSale && Number.isFinite(Number(receipt.netTotal)) && taxGroups.length > 0;
    const receiptIssuer = isVoucherSale && receipt.presentationSnapshot?.issuer
      ? receipt.presentationSnapshot.issuer
      : data.company;

    mainContent.innerHTML = `<section class="flow-page receipt-preview-page page-enter">
      <div class="flow-head compact-flow-head">
        <button class="button button-back" type="button" data-route="${escapeHtml(state.receiptPreviewReturnRoute)}"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Kassenbon</p>
        <h1 class="flow-title">${isVoucherSale ? "Verkaufsbeleg" : "Digitaler Beleg"}</h1>
        <p class="page-copy">Kassenzettelansicht für Druck oder PDF-Sicherung.</p>
      </div>

      <article class="receipt-paper ${isVoucherSale ? "is-voucher-sale" : ""}">
        <header>
          <strong>${escapeHtml(receiptIssuer.name)}</strong>
          <span>${escapeHtml(receiptIssuer.owner || "")}</span>
          <small>${escapeHtml(receiptIssuer.street || "")}</small>
          <small>${escapeHtml(addressCityLine(receiptIssuer))}</small>
          <small>Steuernummer: ${escapeHtml(receiptIssuer.taxNumber || "nicht hinterlegt")}</small>
          ${receiptIssuer.vatId ? `<small>USt-IdNr.: ${escapeHtml(receiptIssuer.vatId)}</small>` : ""}
        </header>

        <div class="receipt-paper-meta">
          <span>Beleg ${escapeHtml(receipt.number)}</span>
          <span>${escapeHtml(createdAt)}</span>
        </div>
        <div class="receipt-paper-kind"><span>Belegart</span><strong>${escapeHtml(receiptKindLabel(receipt))}</strong></div>

        <div class="receipt-paper-items">
          ${receipt.items.map(item => `<div class="receipt-paper-item">
            <span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${item.quantity} × ${formatCurrency(item.originalUnitPrice ?? item.unitPrice)}</small>
              ${Number(item.discountTotal || 0) > 0 ? `<em>${escapeHtml(item.discountLabel || "Rabatt")} <b>−${formatCurrency(item.discountTotal)}</b></em>` : ""}
            </span>
            <strong>${formatCurrency(item.total)}</strong>
          </div>`).join("")}
        </div>

        ${receipt.customer ? `<div class="receipt-paper-customer"><span>Kunde</span><strong>${escapeHtml(receipt.customer.name)}</strong>${customerAddressLines(receipt.customer).map(line => `<small>${escapeHtml(line)}</small>`).join("")}</div>` : ""}
        <div class="receipt-paper-row"><span>Zahlungsart</span><strong>${escapeHtml(receipt.payment)}</strong></div>
        ${receipt.voucherPayment ? `<div class="receipt-paper-voucher-payment"><span><small>Bezahlt mit Gutschein</small><strong>${escapeHtml(maskVoucherCode(receipt.voucherPayment.code))}</strong></span><strong>${formatCurrency(receipt.voucherPayment.amount)}</strong></div>` : ""}
        ${receipt.remainderPayment ? `<div class="receipt-paper-row"><span>Restzahlung · ${escapeHtml(receipt.remainderPayment.method)}</span><strong>${formatCurrency(receipt.remainderPayment.amount)}</strong></div>` : ""}
        ${linkedVoucher ? `<div class="receipt-paper-voucher-link"><span>Verknüpfter Gutschein</span><strong>${escapeHtml(maskVoucherCode(linkedVoucher.code))}</strong></div>` : ""}

        ${showTaxDetails ? `<div class="receipt-paper-totals">
          ${receipt.discountTotal > 0 ? `<div><span>Zwischensumme</span><strong>${formatCurrency(receipt.originalTotal)}</strong></div>
          <div class="receipt-discount-total"><span>Rabatt gesamt</span><strong>−${formatCurrency(receipt.discountTotal)}</strong></div>` : ""}
          <div><span>Netto</span><strong>${formatCurrency(receipt.netTotal)}</strong></div>
          ${taxGroups.map(group => `<div><span>MwSt. ${group.rate}%</span><strong>${formatCurrency(group.tax)}</strong></div>`).join("")}
        </div>` : ""}

        <div class="receipt-paper-total"><span>${isVoucherSale ? "Gesamtbetrag" : "Gesamt brutto"}</span><strong>${formatCurrency(receipt.total)}</strong></div>
        <footer>${receipt.receiptTextSnapshot ? escapeHtml(receipt.receiptTextSnapshot.thankYouText || "") : "Vielen Dank für Ihren Besuch."}${receipt.receiptTextSnapshot?.footerText ? `<small>${escapeHtml(receipt.receiptTextSnapshot.footerText)}</small>` : ""}</footer>
      </article>

      <button class="button button-primary preview-download" type="button" data-action="receipt-print">Drucken / als PDF sichern</button>
    </section>`;
  }

  function renderCheckout() {
    const selectedCustomer = data.customers.find(c => c.id === state.selectedCustomerId);
    const checkoutVoucher = selectedCheckoutVoucher();
    const voucherAmounts = checkoutVoucher ? checkoutVoucherAmounts(checkoutVoucher) : null;
    const voucherQuery = normalizeVoucherCode(state.checkoutVoucherCode);
    const selectableVouchers = eligibleCheckoutVouchers().filter(voucher => !voucherQuery || normalizeVoucherCode(voucher.code).includes(voucherQuery));
    const customerCards = selectedCustomer
      ? `<div class="selected-customer"><div><strong>${escapeHtml(customerName(selectedCustomer))}</strong>${customerAddressLines(selectedCustomer).map(line => `<small>${escapeHtml(line)}</small>`).join("")}<small>${escapeHtml(selectedCustomer.phone || selectedCustomer.email || "Kunde ausgewählt")}</small></div><div class="selected-customer-actions"><button class="text-action" type="button" data-edit-customer="${selectedCustomer.id}">Bearbeiten</button><button class="text-action" type="button" data-route="customer-picker">Ändern</button></div></div>`
      : `<button class="mini-choice ${state.customerChoice === "none" ? "is-selected" : ""}" type="button" data-select-no-customer><span class="mini-choice-icon" aria-hidden="true">→</span><span><strong>Ohne Kunde</strong><small>Keine persönlichen Daten</small></span></button><button class="mini-choice" type="button" data-route="customer-picker"><span class="mini-choice-icon" aria-hidden="true">◎</span><span><strong>Kunde auswählen</strong><small>Suchen oder neu anlegen</small></span></button>`;
    const paymentCards = activePaymentChoices().map(choice => `<button class="payment-choice ${state.paymentChoice === choice.id ? "is-selected" : ""}" type="button" data-payment-choice="${choice.id}"><span aria-hidden="true">${choice.icon}</span><strong>${escapeHtml(choice.title)}</strong></button>`).join("");
    mainContent.innerHTML = `<section class="flow-page checkout-page page-enter">
      <div class="flow-head compact-work-head"><button class="button button-back" type="button" data-route="catalog"><span aria-hidden="true">←</span> Zurück</button><p class="eyebrow">Neuer Beleg</p><h1 class="flow-title">Beleg abschließen</h1><p class="page-copy">Prüfen, optional Kunde wählen und Zahlungsart simulieren.</p></div>
      <section class="checkout-section"><div class="section-title-row"><h2>Positionen</h2><button class="text-action" type="button" data-route="edit-cart">Bearbeiten</button></div><div class="checkout-items">${state.cart.map(item => `<div class="checkout-item"><span><strong>${escapeHtml(item.title)}</strong><small>${item.quantity} × ${formatCurrency(item.price)}</small></span><strong>${formatCurrency(item.price * item.quantity)}</strong></div>`).join("")}</div></section>
      <section class="checkout-section"><h2>Kunde <span>optional</span></h2><div class="mini-choice-grid">${customerCards}</div></section>
      <section class="checkout-section"><h2>Zahlungsart <span>nur Simulation</span></h2><div class="payment-grid">${paymentCards}</div></section>
      ${state.paymentChoice === "voucher" ? `<section class="checkout-section checkout-voucher-section" aria-labelledby="checkoutVoucherTitle">
        <div class="section-title-row"><h2 id="checkoutVoucherTitle">Gutschein einlösen</h2><span>1 Gutschein pro Beleg</span></div>
        <div class="checkout-voucher-code-row">
          <label><span>Gutscheincode</span><input id="checkoutVoucherCode" type="search" autocomplete="off" placeholder="FRKA-XXXX-XXXX" value="${escapeHtml(state.checkoutVoucherCode)}"></label>
          <button class="button button-secondary" type="button" data-action="checkout-voucher-code">Code anwenden</button>
        </div>
        <div class="checkout-voucher-entry-actions">
          <button class="button button-secondary" type="button" data-action="checkout-voucher-qr">QR-Code scannen <small>Simulation</small></button>
          <button class="button button-secondary" type="button" data-action="checkout-voucher-picker">Gutschein auswählen</button>
        </div>
        ${state.checkoutVoucherError ? `<p class="checkout-voucher-error" role="alert">${escapeHtml(state.checkoutVoucherError)}</p>` : ""}
        ${state.checkoutVoucherPickerOpen ? `<div class="checkout-voucher-picker" aria-label="Einlösbare Gutscheine">
          <p>Nur aktive Gutscheine mit Restwert.</p>
          ${selectableVouchers.length ? selectableVouchers.map(voucher => `<button type="button" data-select-checkout-voucher="${escapeHtml(voucher.reference)}"><span><strong>${escapeHtml(voucher.code)}</strong><small>${escapeHtml(voucherStatusLabel(voucher))}</small></span><span><small>Restwert</small><strong>${formatCurrency(voucher.currentValue)}</strong></span></button>`).join("") : `<div class="empty-state">Keine einlösbaren Gutscheine zu diesem Code.</div>`}
        </div>` : ""}
        ${checkoutVoucher ? `<div class="checkout-voucher-selected">
          <div class="checkout-voucher-selected-head"><span><small>Ausgewählter Gutschein</small><strong>${escapeHtml(checkoutVoucher.code)}</strong></span><button class="text-action" type="button" data-action="checkout-voucher-change">Ändern</button></div>
          <dl>
            <div><dt>Aktueller Restwert</dt><dd>${formatCurrency(checkoutVoucher.currentValue)}</dd></div>
            <div><dt>Verkauft am</dt><dd>${escapeHtml(checkoutVoucher.soldAt)}</dd></div>
            ${checkoutVoucher.customer ? `<div><dt>Zugeordneter Kunde</dt><dd>${escapeHtml(checkoutVoucher.customer.name)}</dd></div>` : ""}
          </dl>
          <div class="checkout-voucher-calculation">
            <div><span>Mit Gutschein bezahlt</span><strong>${formatCurrency(voucherAmounts.voucherAmount)}</strong></div>
            <div><span>Restwert danach</span><strong>${formatCurrency(voucherAmounts.balanceAfter)}</strong></div>
            ${voucherAmounts.balanceAfter <= 0 ? `<div><span>Status danach</span><strong>Vollständig eingelöst</strong></div>` : ""}
            ${voucherAmounts.remainder > 0 ? `<div class="checkout-voucher-remainder"><span>Restzahlung</span><strong>${formatCurrency(voucherAmounts.remainder)}</strong></div>` : ""}
          </div>
          ${voucherAmounts.remainder > 0 ? `<div class="checkout-remainder-payment"><span>Restzahlung mit</span><div role="group" aria-label="Zahlungsart für Restzahlung">${activeNormalPaymentChoices().map(choice => `<button class="${state.checkoutVoucherRemainderPayment === choice.id ? "is-selected" : ""}" type="button" data-voucher-remainder-payment="${choice.id}" aria-pressed="${state.checkoutVoucherRemainderPayment === choice.id}"><span aria-hidden="true">${choice.icon}</span><strong>${choice.title}</strong></button>`).join("")}</div></div>` : ""}
        </div>` : ""}
      </section>` : ""}
      <section class="checkout-total"><span>Gesamt</span><strong>${formatCurrency(cartTotal())}</strong></section>
      <p class="prototype-note">Keine echte Zahlung, Speicherung, QR-, Steuer- oder Fiskalisierungsfunktion.</p>
      <div class="checkout-action"><button class="button button-primary" type="button" data-action="finish-demo" ${state.checkoutSubmitting ? "disabled" : ""}>${state.checkoutSubmitting ? "Wird abgeschlossen …" : "Demo abschließen"}</button></div>
    </section>`;

    document.getElementById("checkoutVoucherCode")?.addEventListener("input", event => {
      state.checkoutVoucherCode = event.target.value;
      state.checkoutVoucherError = "";
      if (state.checkoutVoucherPickerOpen) {
        renderCheckout();
        const input = document.getElementById("checkoutVoucherCode");
        input?.focus();
        input?.setSelectionRange(state.checkoutVoucherCode.length, state.checkoutVoucherCode.length);
      }
    });
  }


  const customerName = customer => `${customer.firstName} ${customer.lastName}`.trim();
  const customerAddressLines = customer => [
    customer.street || "",
    [customer.zip || "", customer.city || ""].filter(Boolean).join(" ")
  ].filter(Boolean);
  function filteredCustomers() {
    const q = state.customerSearch.trim().toLowerCase();
    if (!q) return data.customers;
    return data.customers.filter(c => [customerName(c), c.phone, c.email].join(" ").toLowerCase().includes(q));
  }
  function customerCard(c, selectable=false, selectedId=state.selectedCustomerId) {
    return `<article class="customer-card ${selectedId===c.id?"is-selected":""}">
      <button type="button" class="customer-card-main" ${selectable?`data-select-customer="${c.id}"`:`data-open-customer="${c.id}"`}>
        <span class="customer-avatar" aria-hidden="true">${escapeHtml(c.firstName[0]+c.lastName[0])}</span>
        <span class="customer-card-text"><strong>${escapeHtml(customerName(c))}</strong><small>${escapeHtml(c.phone || "Keine Telefonnummer")}</small><small>${escapeHtml(c.email || "Keine E-Mail")}</small></span>
        <span class="customer-card-meta">${c.receiptCount} Belege<br>${escapeHtml(c.lastVisit)}</span>
      </button>
      ${selectable ? "" : `<button class="customer-card-edit" type="button" data-edit-customer="${c.id}">Bearbeiten</button>`}
    </article>`;
  }
  function renderCustomers(selectable=false) {
    const list=filteredCustomers();
    const voucherSelection=selectable && state.customerPickerContext === "voucher";
    const selectedId=voucherSelection ? state.voucherSaleCustomerId : state.selectedCustomerId;
    const title=selectable?"Kunde auswählen":"Kunden";
    const back=selectable?(voucherSelection?'voucher-sale':'checkout'):'home';
    mainContent.innerHTML=`<section class="flow-page customer-page page-enter">
      <div class="flow-head compact-flow-head"><button class="button button-back" type="button" data-route="${back}"><span aria-hidden="true">←</span> Zurück</button><p class="eyebrow">${selectable?(voucherSelection?'Gutscheinverkauf':'Neuer Beleg'):'Verwaltung'}</p><h1 class="flow-title">${title}</h1><p class="page-copy">Nach Name, Telefon oder E-Mail suchen.</p></div>
      <div class="customer-toolbar ${voucherSelection ? "is-picker-only" : ""}"><label class="search-field"><span aria-hidden="true">⌕</span><input id="customerSearch" type="search" placeholder="Kunde suchen" value="${escapeHtml(state.customerSearch)}"></label>${voucherSelection ? "" : `<button class="button button-primary customer-new-button" type="button" data-route="customer-new">＋ Neuer Kunde</button>`}</div>
      ${selectable?'<button class="customer-none" type="button" data-select-no-customer>Ohne Kunde fortfahren</button>':''}
      <div class="customer-list">${list.length?list.map(c=>customerCard(c,selectable,selectedId)).join(''):'<div class="empty-state">Keine passenden Kunden gefunden.</div>'}</div>
    </section>`;
    document.getElementById('customerSearch')?.addEventListener('input',e=>{state.customerSearch=e.target.value;renderCustomers(selectable);const i=document.getElementById('customerSearch');i?.focus();i?.setSelectionRange(state.customerSearch.length,state.customerSearch.length);});
  }
  function customerFormMarkup(customer=null) {
    const isEdit = Boolean(customer);
    return `<section class="flow-page customer-form-page page-enter">
      <div class="flow-head compact-work-head">
        <button class="button button-back" type="button" data-route="${isEdit ? "customer-detail" : (state.cart.length ? "customer-picker" : "customers")}"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Kunden</p>
        <h1 class="flow-title">${isEdit ? "Kunde bearbeiten" : "Neuer Kunde"}</h1>
        <p class="page-copy">${isEdit ? "Kontaktdaten aktualisieren." : "Nur Vor- und Nachname sind erforderlich."}</p>
      </div>
      <form class="customer-form" id="customerForm" data-mode="${isEdit ? "edit" : "new"}">
        <div class="form-grid">
          <label><span>Vorname *</span><input name="firstName" required autocomplete="given-name" value="${escapeHtml(customer?.firstName || "")}"></label>
          <label><span>Nachname *</span><input name="lastName" required autocomplete="family-name" value="${escapeHtml(customer?.lastName || "")}"></label>
          <label><span>Telefon</span><input name="phone" type="tel" inputmode="tel" value="${escapeHtml(customer?.phone || "")}"></label>
          <label><span>E-Mail</span><input name="email" type="email" inputmode="email" value="${escapeHtml(customer?.email || "")}"></label>
          <label class="full"><span>Straße</span><input name="street" value="${escapeHtml(customer?.street || "")}"></label>
          <label><span>PLZ</span><input name="zip" inputmode="numeric" value="${escapeHtml(customer?.zip || "")}"></label>
          <label><span>Ort</span><input name="city" value="${escapeHtml(customer?.city || "")}"></label>
          <label class="full"><span>Notiz</span><textarea name="note" rows="3">${escapeHtml(customer?.note || "")}</textarea></label>
        </div>
        <button class="button button-primary form-submit" type="submit">${isEdit ? "Änderungen speichern" : "Kunde übernehmen"}</button>
      </form>
    </section>`;
  }

  function renderCustomerNew() {
    mainContent.innerHTML = customerFormMarkup();
  }

  function renderCustomerEdit() {
    const customer = data.customers.find(c => c.id === state.editingCustomerId);
    if (!customer) { navigate("customers", false); return; }
    mainContent.innerHTML = customerFormMarkup(customer);
  }

  function customerReceipts(customer) {
    const customerId = customer?.id;
    if (!customerId) return [];

    return data.receipts
      .filter(receipt => receipt.customer?.id === customerId)
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }

  function receiptEconomicAmount(receipt) {
    return Number(receipt.total || 0);
  }

  function customerEconomicTurnover(customer) {
    return customerReceipts(customer).reduce((sum, receipt) => sum + receiptEconomicAmount(receipt), 0);
  }

  function relatedCustomerCorrections(receipt) {
    return data.receipts
      .filter(item => item.reference === receipt.number)
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }

  function customerHistoryStatus(receipt) {
    if (receipt.type === "credit") return { label: "Gutschrift", className: "is-credit" };
    if (receipt.type === "cancellation") return { label: "Stornobeleg", className: "is-cancelled" };
    if (receipt.status === "cancelled") return { label: "Storniert", className: "is-cancelled" };
    if (receipt.status === "credited") return { label: "Vollständig gutgeschrieben", className: "is-credit" };
    if (receipt.status === "partially-credited") return { label: "Teilgutschrift", className: "is-partial" };
    if (receipt.payment === "Später") return { label: "Offen", className: "is-open" };
    return { label: "Bezahlt", className: "is-paid" };
  }

  function renderCustomerDetail() {
    const c = data.customers.find(x => x.id === state.customerDetailId);
    if (!c) { navigate("customers", false); return; }

    const address = customerAddressLines(c);
    const allHistory = customerReceipts(c);
    const visibleHistory = allHistory.slice(0, 8);
    const turnover = customerEconomicTurnover(c);
    const latestOriginal = allHistory.find(receipt => receipt.type === "receipt");
    const lastVisit = latestOriginal?.date || c.lastVisit;
    const originalReceiptCount = allHistory.filter(receipt => receipt.type === "receipt").length || c.receiptCount;

    const historyMarkup = allHistory.length
      ? `<section class="customer-history customer-history-accordion ${state.customerHistoryExpanded ? "is-expanded" : ""}">
          <button class="customer-history-toggle" type="button" data-toggle-customer-history-section aria-expanded="${state.customerHistoryExpanded ? "true" : "false"}">
            <span>
              <strong>Belegverlauf</strong>
              <small>${allHistory.length} Vorgänge inklusive Korrekturen</small>
            </span>
            <span class="customer-history-chevron" aria-hidden="true">${state.customerHistoryExpanded ? "⌃" : "⌄"}</span>
          </button>

          ${state.customerHistoryExpanded ? `<div class="customer-history-panel">
            <div class="customer-history-list">
              ${visibleHistory.map(receipt => {
                const isOpen = state.customerHistoryOpenNumber === receipt.number;
                const status = customerHistoryStatus(receipt);
                const related = receipt.type === "receipt" ? relatedCustomerCorrections(receipt) : [];
                return `<article class="customer-history-item ${isOpen ? "is-open" : ""}">
                  <button type="button" data-toggle-customer-history="${escapeHtml(receipt.number)}" aria-expanded="${isOpen ? "true" : "false"}">
                    <span>
                      <strong>${escapeHtml(receipt.date)}</strong>
                      <small>${escapeHtml(receipt.number)}</small>
                    </span>
                    <span class="customer-history-right">
                      <strong>${formatCurrency(receipt.total)}</strong>
                      <small class="receipt-status ${status.className}">${escapeHtml(status.label)}</small>
                    </span>
                  </button>
                  ${isOpen ? `<div class="customer-history-detail">
                    ${receipt.items.map(item => `<span>${escapeHtml(item.title || item)}</span>`).join("")}
                    ${related.length ? `<div class="customer-history-related">
                      <strong>Verknüpfte Korrekturen</strong>
                      ${related.map(item => {
                        const relatedStatus = customerHistoryStatus(item);
                        return `<button type="button" data-open-receipt="${escapeHtml(item.number)}">
                          <span>${escapeHtml(item.number)}</span>
                          <span class="receipt-status ${relatedStatus.className}">${escapeHtml(relatedStatus.label)}</span>
                          <strong>${formatCurrency(item.total)}</strong>
                        </button>`;
                      }).join("")}
                    </div>` : ""}
                    <button class="customer-history-open-receipt" type="button" data-open-receipt="${escapeHtml(receipt.number)}">Vorgang öffnen</button>
                  </div>` : ""}
                </article>`;
              }).join("")}
            </div>
            ${allHistory.length > visibleHistory.length ? `<p class="customer-history-more">${allHistory.length - visibleHistory.length} ältere Vorgänge werden später über „Alle anzeigen“ erreichbar.</p>` : ""}
          </div>` : ""}
        </section>`
      : "";

    mainContent.innerHTML = `<section class="flow-page customer-detail-page page-enter">
      <div class="flow-head compact-work-head">
        <button class="button button-back" type="button" data-route="customers"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Kunde</p>
        <h1 class="flow-title">${escapeHtml(customerName(c))}</h1>
      </div>

      <section class="customer-detail-card">
        <div class="customer-avatar large">${escapeHtml(c.firstName[0] + c.lastName[0])}</div>
        <div>
          <strong>${escapeHtml(customerName(c))}</strong>
          ${address.map(line => `<p>${escapeHtml(line)}</p>`).join("")}
          <p>${escapeHtml(c.phone || "Keine Telefonnummer")}</p>
          <p>${escapeHtml(c.email || "Keine E-Mail")}</p>
        </div>
      </section>

      <section class="customer-facts">
        <div><span>Letzter Besuch</span><strong>${escapeHtml(lastVisit)}</strong></div>
        <div><span>Belege</span><strong>${originalReceiptCount}</strong></div>
        <div class="customer-turnover"><span>Gültiger Umsatz</span><strong>${formatCurrency(turnover)}</strong></div>
      </section>

      ${historyMarkup}

      ${c.note ? `<section class="customer-note"><h2>Notiz</h2><p>${escapeHtml(c.note)}</p></section>` : ""}

      <div class="customer-detail-actions">
        <button class="button button-secondary" type="button" data-edit-customer="${c.id}">Kunde bearbeiten</button>
        <button class="button button-primary" type="button" data-start-customer-receipt="${c.id}">Neuen Beleg erstellen</button>
      </div>
    </section>`;
  }

  function receiptStatusLabel(receipt) {
    if (receipt.status === "cancelled") return "Storniert";
    if (receipt.status === "credited") return "Gutgeschrieben";
    if (receipt.status === "partially-credited") return "Teilgutschrift";
    if (receipt.type === "credit") return "Gutschrift";
    return receipt.payment === "Später" ? "Offen" : "Bezahlt";
  }

  function receiptStatusClass(receipt) {
    if (receipt.status === "cancelled") return "is-cancelled";
    if (receipt.status === "credited" || receipt.type === "credit") return "is-credit";
    if (receipt.status === "partially-credited") return "is-partial";
    if (receipt.payment === "Später") return "is-open";
    return "is-paid";
  }

  function receiptCustomerLabel(receipt) {
    return receipt.customer?.name || "Ohne Kundenzuordnung";
  }

  function receiptByNumber(number) {
    return data.receipts.find(receipt => receipt.number === number) || null;
  }

  function receiptKindLabel(receipt) {
    if (receipt.receiptKind === "voucher-sale") return "Gutscheinverkauf";
    if (receipt.type === "credit") return "Gutschrift";
    if (receipt.type === "cancellation") return "Stornobeleg";
    return "Beleg";
  }

  function visibleReceipts() {
    const search = state.receiptSearch.trim().toLowerCase();
    return data.receipts
      .filter(receipt => {
        if (state.receiptFilter === "completed") return receipt.type !== "credit" && receipt.status !== "cancelled";
        if (state.receiptFilter === "cancelled") return receipt.status === "cancelled";
        if (state.receiptFilter === "credits") return receipt.type === "credit";
        if (state.receiptFilter === "open") return receipt.payment === "Später" && receipt.status !== "cancelled";
        return true;
      })
      .filter(receipt => {
        if (!search) return true;
        return [
          receipt.number,
          receiptKindLabel(receipt),
          receiptCustomerLabel(receipt),
          receipt.date,
          String(receipt.total).replace(".", ",")
        ].some(value => String(value).toLowerCase().includes(search));
      })
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }

  function renderReceipts() {
    const receipts = visibleReceipts();
    const total = receipts.reduce((sum, receipt) => sum + Number(receipt.total || 0), 0);
    mainContent.innerHTML = `<section class="receipts-page page-enter">
      <header class="receipt-list-head">
        <p class="eyebrow">Belegverwaltung</p>
        <h1>Belege</h1>
        <p>Alle Belege, Stornos und Gutschriften.</p>
        <label class="search-field receipt-search">
          <span aria-hidden="true">⌕</span>
          <input id="receiptSearch" type="search" placeholder="Beleg, Kunde, Betrag oder Datum" value="${escapeHtml(state.receiptSearch)}">
        </label>
        <div class="receipt-filter-tabs" role="tablist" aria-label="Belegstatus">
          ${[
            ["all", "Alle"],
            ["completed", "Abgeschlossen"],
            ["open", "Offen"],
            ["cancelled", "Storniert"],
            ["credits", "Gutschriften"]
          ].map(([key, label]) => `<button type="button" data-receipt-filter="${key}" class="${state.receiptFilter === key ? "is-active" : ""}">${label}</button>`).join("")}
        </div>
      </header>

      <div class="receipt-list-summary">
        <span>${receipts.length} ${receipts.length === 1 ? "Eintrag" : "Einträge"}</span>
        <strong>${formatCurrency(total)}</strong>
      </div>

      <div class="receipt-admin-list">
        ${receipts.length ? receipts.map(receipt => `<button class="receipt-admin-card" type="button" data-open-receipt="${escapeHtml(receipt.number)}">
          <span class="receipt-card-main">
            <span class="receipt-card-number">${escapeHtml(receipt.number)}</span>
            ${receipt.receiptKind === "voucher-sale" ? `<span class="receipt-card-kind">Gutscheinverkauf</span>` : ""}
            <strong>${escapeHtml(receiptCustomerLabel(receipt))}</strong>
            <small>${escapeHtml(receipt.date)} · ${escapeHtml(receipt.time)} · ${escapeHtml(receipt.payment)}</small>
          </span>
          <span class="receipt-card-side">
            <strong>${formatCurrency(receipt.total)}</strong>
            <span class="receipt-status ${receiptStatusClass(receipt)}">${escapeHtml(receiptStatusLabel(receipt))}</span>
          </span>
        </button>`).join("") : `<div class="empty-state receipt-empty">Keine Belege gefunden.</div>`}
      </div>
    </section>`;

    const input = document.getElementById("receiptSearch");
    input?.addEventListener("input", event => {
      state.receiptSearch = event.target.value;
      renderReceipts();
      const current = document.getElementById("receiptSearch");
      current?.focus();
      current?.setSelectionRange(state.receiptSearch.length, state.receiptSearch.length);
    });
  }

  function renderReceiptDetail() {
    const receipt = receiptByNumber(state.receiptDetailNumber);
    if (!receipt) { navigate("receipts", false); return; }
    const paidVoucher = receipt.voucherPayment ? voucherByReference(receipt.voucherPayment.reference) : null;
    const related = data.receipts.filter(item => item.reference === receipt.number || item.number === receipt.reference);
    const relatedCreditsTotal = data.receipts
      .filter(item => item.reference === receipt.number && item.type === "credit")
      .reduce((sum, item) => sum + Math.abs(Number(item.total || 0)), 0);
    const remainingCredit = Math.max(0, Number(receipt.total || 0) - relatedCreditsTotal);
    const hasCancellation = data.receipts.some(item => item.reference === receipt.number && item.type === "cancellation");
    const canCorrect = receipt.type === "receipt"
      && receipt.receiptKind !== "voucher-sale"
      && !receipt.voucherPayment
      && !hasCancellation
      && receipt.status !== "cancelled"
      && receipt.status !== "credited"
      && remainingCredit > 0.009;
    mainContent.innerHTML = `<section class="flow-page receipt-detail-page page-enter">
      <div class="flow-head compact-work-head">
        <button class="button button-back" type="button" data-route="receipts"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">${escapeHtml(receiptKindLabel(receipt))}</p>
        <h1 class="flow-title">${escapeHtml(receipt.number)}</h1>
        <p class="page-copy">${escapeHtml(receipt.date)} · ${escapeHtml(receipt.time)}</p>
      </div>

      <section class="receipt-detail-status">
        <span class="receipt-status ${receiptStatusClass(receipt)}">${escapeHtml(receiptStatusLabel(receipt))}</span>
        <strong>${formatCurrency(receipt.total)}</strong>
      </section>

      <section class="receipt-detail-card">
        <div class="receipt-detail-row"><span>Belegart</span><strong>${escapeHtml(receiptKindLabel(receipt))}</strong></div>
        <div class="receipt-detail-row"><span>Kunde</span><strong>${escapeHtml(receiptCustomerLabel(receipt))}</strong></div>
        <div class="receipt-detail-row"><span>Zahlungsart</span><strong>${escapeHtml(receipt.payment)}</strong></div>
        ${receipt.voucherPayment ? `<div class="receipt-detail-row"><span>Bezahlt mit Gutschein</span><strong>${formatCurrency(receipt.voucherPayment.amount)}</strong></div><div class="receipt-detail-row"><span>Gutscheincode</span><strong>${escapeHtml(receipt.voucherPayment.code)}</strong></div>` : ""}
        ${receipt.remainderPayment ? `<div class="receipt-detail-row"><span>Restzahlung · ${escapeHtml(receipt.remainderPayment.method)}</span><strong>${formatCurrency(receipt.remainderPayment.amount)}</strong></div>` : ""}
        ${receipt.reference ? `<div class="receipt-detail-row"><span>Bezug</span><button type="button" data-open-receipt="${escapeHtml(receipt.reference)}">${escapeHtml(receipt.reference)}</button></div>` : ""}
      </section>

      ${paidVoucher ? `<section class="receipt-detail-card voucher-receipt-link"><div class="receipt-section-title"><h2>Verwendeter Gutschein</h2></div><p>Dieser Gutschein wurde für die Bezahlung des Belegs verwendet.</p><button class="button button-primary" type="button" data-open-linked-voucher="${escapeHtml(paidVoucher.reference)}">Gutschein öffnen</button></section>` : ""}

      ${receipt.receiptKind === "voucher-sale" ? `<section class="receipt-detail-card voucher-receipt-link">
        <div class="receipt-section-title"><h2>Verknüpfter Gutschein</h2></div>
        <p>Dieser Beleg und der Gutschein wurden gemeinsam in einem Verkauf erzeugt.</p>
        <button class="button button-primary" type="button" data-open-linked-voucher="${escapeHtml(receipt.voucherReference || "")}">Gutschein öffnen</button>
      </section>
      <p class="prototype-note">Die steuerliche Behandlung des Gutscheinverkaufs ist in diesem UX-Prototyp ausdrücklich noch nicht festgelegt.</p>` : ""}

      <section class="receipt-detail-card">
        <div class="receipt-section-title"><h2>Positionen</h2><span>${receipt.items.length}</span></div>
        <div class="receipt-detail-items">
          ${receipt.items.map(item => `<div>
            <span><strong>${escapeHtml(item.title)}</strong><small>${item.quantity} × ${formatCurrency(item.unitPrice)}</small></span>
            <strong>${formatCurrency(item.total)}</strong>
          </div>`).join("")}
        </div>
        <div class="receipt-detail-total"><span>Gesamt</span><strong>${formatCurrency(receipt.total)}</strong></div>
      </section>

      ${related.length ? `<section class="receipt-detail-card">
        <div class="receipt-section-title"><h2>Verknüpfte Vorgänge</h2></div>
        ${related.map(item => `<button class="related-receipt" type="button" data-open-receipt="${escapeHtml(item.number)}">
          <span><strong>${escapeHtml(item.number)}</strong><small>${escapeHtml(receiptStatusLabel(item))}</small></span>
          <strong>${formatCurrency(item.total)}</strong>
        </button>`).join("")}
      </section>` : ""}

      <section class="receipt-detail-card activity-log">
        <div class="receipt-section-title"><h2>Aktivität</h2></div>
        ${(receipt.activity || []).map(entry => `<div><span>${escapeHtml(entry.label)}</span><small>${escapeHtml(entry.date)}</small></div>`).join("")}
      </section>

      <section class="receipt-detail-card receipt-internal-notes">
        <div class="receipt-section-title"><h2>Interne Notiz</h2></div>
        <textarea id="receiptInternalNote" rows="3" placeholder="Zum Beispiel: Kunde reklamierte Farbe.">${escapeHtml(receipt.internalNote || "")}</textarea>
        <button class="button button-secondary" type="button" data-action="save-receipt-note">Notiz speichern</button>
      </section>

      <section class="receipt-primary-actions">
        <button class="button button-secondary" type="button" data-preview-receipt="${escapeHtml(receipt.number)}">${receipt.receiptKind === "voucher-sale" ? "Kassenbon anzeigen" : "Beleg anzeigen"}</button>
        <button class="button button-secondary" type="button" data-action="receipt-email-demo">Erneut per E-Mail senden</button>
        ${receipt.receiptKind === "voucher-sale" ? "" : `<button class="button button-secondary" type="button" data-action="copy-receipt">Duplizieren</button>`}
      </section>

      ${canCorrect ? `<section class="receipt-correction-card">
        <p class="eyebrow">Korrekturen</p>
        <h2>Beleg korrigieren</h2>
        <p>Der ursprüngliche Beleg bleibt unverändert und nachvollziehbar.${receipt.status === "partially-credited" ? ` Noch gutschreibbar: ${formatCurrency(remainingCredit)}.` : ""}</p>
        <button class="button button-danger-outline" type="button" data-action="cancel-receipt">Gesamten Beleg stornieren</button>
        <button class="button button-primary" type="button" data-route="receipt-credit">Gutschrift erstellen</button>
      </section>` : ""}

      ${state.successNotice ? `<div class="success-notice receipt-action-notice" role="status">${escapeHtml(state.successNotice)}</div>` : ""}
    </section>`;
  }

  function renderReceiptCredit() {
    const receipt = receiptByNumber(state.receiptDetailNumber);
    if (!receipt) { navigate("receipts", false); return; }
    const alreadyCredited = data.receipts
      .filter(item => item.reference === receipt.number && item.type === "credit")
      .reduce((sum, item) => sum + Math.abs(Number(item.total || 0)), 0);
    const maximumCredit = Math.max(0, Number(receipt.total || 0) - alreadyCredited);
    if (maximumCredit <= 0.009 || receipt.status === "cancelled" || receipt.status === "credited") {
      state.successNotice = "Für diesen Beleg ist keine weitere Gutschrift möglich.";
      navigate("receipt-detail", false);
      return;
    }
    const proposed = state.creditMode === "full" ? maximumCredit : Math.max(0, Number(String(state.creditAmount).replace(",", ".")) || 0);
    mainContent.innerHTML = `<section class="flow-page receipt-credit-page page-enter">
      <div class="flow-head compact-work-head">
        <button class="button button-back" type="button" data-route="receipt-detail"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Korrektur</p>
        <h1 class="flow-title">Gutschrift</h1>
        <p class="page-copy">Zu ${escapeHtml(receipt.number)}</p>
      </div>

      <section class="credit-mode-card">
        <button type="button" data-credit-mode="full" class="${state.creditMode === "full" ? "is-active" : ""}">
          <strong>Gesamten Beleg gutschreiben</strong>
          <span>${formatCurrency(maximumCredit)}</span>
        </button>
        <button type="button" data-credit-mode="partial" class="${state.creditMode === "partial" ? "is-active" : ""}">
          <strong>Teilbetrag gutschreiben</strong>
          <span>Freien Betrag erfassen</span>
        </button>
      </section>

      ${state.creditMode === "partial" ? `<form id="creditForm" class="credit-form">
        <label><span>Grund der Gutschrift</span><input name="creditText" value="${escapeHtml(state.creditText)}" placeholder="Grund der Gutschrift" required></label>
        <label><span>Gutschriftsbetrag</span><div class="money-input"><input name="creditAmount" type="number" min="0.01" max="${maximumCredit}" step="0.01" inputmode="decimal" value="${escapeHtml(state.creditAmount)}" placeholder="0,00"><strong>€</strong></div></label>
        <p>Maximal ${formatCurrency(maximumCredit)}. Der Betrag wird als Minusposition ausgegeben.</p>
        <button class="button button-primary" type="submit">Teilgutschrift erstellen</button>
      </form>` : `<section class="credit-full-summary">
        <p>Alle Positionen des ursprünglichen Belegs werden negativ übernommen.</p>
        <strong>−${formatCurrency(proposed)}</strong>
        <button class="button button-primary" type="button" data-action="create-full-credit">Gesamtgutschrift erstellen</button>
      </section>`}
    </section>`;
  }

  function createCredit(receipt, amount, text, isFull) {
    const number = `GS-2026-${String(data.receipts.filter(item => item.type === "credit").length + 101).padStart(6, "0")}`;
    const items = isFull
      ? receipt.items.map(item => ({ ...item, total: -Math.abs(item.total), unitPrice: -Math.abs(item.unitPrice) }))
      : [{ title: text || "Korrektur / Kulanz", quantity: 1, unitPrice: -Math.abs(amount), total: -Math.abs(amount) }];
    const credit = {
      number,
      type: "credit",
      status: "credited",
      reference: receipt.number,
      date: "02.08.2026",
      time: "10:22",
      sortKey: `2026-08-02T10:22:${data.receipts.length}`,
      customer: receipt.customer,
      payment: receipt.payment,
      items,
      total: -Math.abs(amount),
      activity: [
        { label: "Gutschrift erstellt", date: "02.08.2026 · 10:22" },
        { label: `Bezug auf ${receipt.number}`, date: receipt.date }
      ]
    };
    data.receipts.unshift(credit);
    const totalCreditsAfter = data.receipts
      .filter(item => item.reference === receipt.number && item.type === "credit")
      .reduce((sum, item) => sum + Math.abs(Number(item.total || 0)), 0);
    receipt.status = totalCreditsAfter >= Number(receipt.total || 0) - 0.009 ? "credited" : "partially-credited";
    receipt.activity = receipt.activity || [];
    receipt.activity.push({ label: isFull ? "Gesamtgutschrift erstellt" : `Teilgutschrift ${formatCurrency(amount)}`, date: "02.08.2026 · 10:22" });
    state.receiptDetailNumber = credit.number;
    state.successNotice = `${isFull ? "Gesamtgutschrift" : "Teilgutschrift"} ${credit.number} wurde simuliert erstellt.`;
    navigate("receipt-detail");
  }

  const voucherByReference = reference => data.vouchers.find(voucher => voucher.reference === reference) ?? null;
  const linkedVoucherSaleReceipt = voucher => data.receipts.find(receipt =>
    receipt.id === voucher.saleReceipt?.id
      && receipt.number === voucher.saleReceipt?.number
      && receipt.voucherReference === voucher.reference
  ) ?? null;
  const voucherStatusLabel = voucher => {
    if (voucher.status === "redeemed") return "Vollständig eingelöst";
    if (voucher.status === "cancelled") return "Storniert";
    if (voucher.status === "partially_redeemed") return "Teilweise eingelöst";
    return "Aktiv";
  };
  const voucherStatusClass = voucher => {
    if (voucher.status === "redeemed") return "is-redeemed";
    if (voucher.status === "cancelled") return "is-cancelled";
    if (voucher.status === "partially_redeemed") return "is-partial";
    return "is-active";
  };
  const isVoucherOpen = voucher => ["active", "partially_redeemed"].includes(voucher.status) && Number(voucher.currentValue) > 0;
  const maskVoucherCode = code => {
    const parts = String(code).split("-");
    if (parts.length < 3) return code;
    return [parts[0], "••••", parts.at(-1)].join("-");
  };

  function currentServiceLocation() {
    return data.serviceLocations.find(location => location.id === data.defaultServiceLocationId)
      ?? data.serviceLocations[0]
      ?? { id: "location-default", mode: "company" };
  }

  function currentVoucherPresentationSnapshot() {
    const location = currentServiceLocation();
    const issuer = {
      name: data.company.name,
      owner: data.company.owner || "",
      street: data.company.street || "",
      zip: data.company.zip || "",
      city: data.company.city || "",
      country: data.company.country || "",
      phone: data.company.phone || "",
      email: data.company.email || "",
      taxNumber: data.company.taxNumber || "",
      vatId: data.company.vatId || ""
    };
    return {
      issuer,
      redemptionLocation: location.mode === "alternate" ? {
        mode: "alternate",
        name: location.name || "Leistungsort",
        street: location.street || "",
        zip: location.zip || "",
        city: location.city || "",
        phone: location.phone || "",
        voucherNote: location.voucherNote || ""
      } : { mode: "issuer" }
    };
  }

  function voucherPresentation(voucher) {
    return voucher.presentationSnapshot ?? currentVoucherPresentationSnapshot();
  }

  function sameVoucherAddress(issuer, redemptionLocation) {
    if (redemptionLocation?.mode === "issuer") return true;
    const normalize = value => String(value || "").trim().toLocaleLowerCase("de-DE");
    return normalize(issuer.street) === normalize(redemptionLocation.street)
      && normalize(issuer.zip || "") === normalize(redemptionLocation.zip || "")
      && normalize(issuer.city) === normalize(redemptionLocation.city);
  }

  const voucherHistoryLabel = type => ({
    sold: "Verkauft",
    partial_redemption: "Teilweise eingelöst",
    full_redemption: "Vollständig eingelöst",
    cancelled: "Storniert"
  })[type] ?? "Gutschein aktualisiert";

  function renderVoucherHistory(voucher) {
    const events = Array.isArray(voucher.history) ? voucher.history : [];
    const linkedReceipt = linkedVoucherSaleReceipt(voucher);
    return `<section class="voucher-history" aria-labelledby="voucherHistoryTitle">
      <div class="voucher-section-title"><h2 id="voucherHistoryTitle">Historie</h2><span>${events.length}</span></div>
      <div class="voucher-history-list">
        ${events.length ? events.map(event => {
          const eventReceipt = event.type === "sold"
            ? (linkedReceipt && event.receiptNumber === linkedReceipt.number ? linkedReceipt : null)
            : data.receipts.find(receipt => receipt.number === event.receiptNumber && receipt.voucherPayment?.reference === voucher.reference) ?? null;
          return `<article class="voucher-history-item voucher-history-${escapeHtml(event.type)}">
          <span class="voucher-history-marker" aria-hidden="true"></span>
          <div class="voucher-history-main">
            <div><strong>${escapeHtml(voucherHistoryLabel(event.type))}</strong><time>${escapeHtml([event.date, event.time].filter(Boolean).join(" · "))}</time></div>
            <dl>
              <div><dt>Betrag</dt><dd>${formatCurrency(event.amount)}</dd></div>
              <div><dt>Restwert danach</dt><dd>${formatCurrency(event.balanceAfter)}</dd></div>
              ${event.receiptNumber ? `<div><dt>Beleg</dt><dd>${escapeHtml(event.receiptNumber)}</dd></div>` : ""}
            </dl>
            ${eventReceipt ? `<button class="voucher-history-receipt-link" type="button" data-open-receipt="${escapeHtml(eventReceipt.number)}">${event.type === "sold" ? "Verkaufsbeleg" : "Beleg"} öffnen</button>` : ""}
          </div>
        </article>`;
        }).join("") : `<p class="voucher-history-empty">Noch keine historischen Vorgänge vorhanden.</p>`}
      </div>
    </section>`;
  }

  // App-Links contain only an opaque reference. A future resolver must look it up
  // in the local voucher store and show a clear not-found state when it is absent;
  // this URL structure does not imply a central voucher database or cross-device sync.
  function voucherAppLink(reference) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = `#/voucher/${encodeURIComponent(reference)}`;
    return url.href;
  }

  function voucherQrPlaceholder(voucher) {
    const size = 21;
    let seed = Array.from(voucher.reference).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
    const inFinder = (row, column, top, left) => {
      const localRow = row - top;
      const localColumn = column - left;
      if (localRow < 0 || localRow > 6 || localColumn < 0 || localColumn > 6) return null;
      return localRow === 0 || localRow === 6 || localColumn === 0 || localColumn === 6 || (localRow >= 2 && localRow <= 4 && localColumn >= 2 && localColumn <= 4);
    };
    const cells = Array.from({ length: size * size }, (_, index) => {
      const row = Math.floor(index / size);
      const column = index % size;
      const finder = inFinder(row, column, 0, 0) ?? inFinder(row, column, 0, size - 7) ?? inFinder(row, column, size - 7, 0);
      seed = ((seed * 1664525) + 1013904223) >>> 0;
      const active = finder ?? (((seed >>> 28) + row + column) % 3 === 0);
      return `<i class="${active ? "on" : ""}"></i>`;
    }).join("");
    const appLink = voucherAppLink(voucher.reference);
    return `<div class="voucher-qr" role="img" aria-label="Technisch vorbereiteter QR-Code-Platzhalter" data-voucher-app-link="${escapeHtml(appLink)}">${cells}</div>`;
  }

  function filteredVouchers() {
    const normalize = value => String(value || "").toLocaleLowerCase("de-DE").replaceAll("-", "").replaceAll(" ", "");
    const query = normalize(state.voucherSearch.trim());
    if (query) {
      return data.vouchers.filter(voucher => [
        voucher.code,
        voucher.customer?.name,
        voucher.displayName,
        voucher.saleReceipt?.number
      ].some(value => normalize(value).includes(query)));
    }
    if (state.voucherFilter === "redeemed") return data.vouchers.filter(voucher => voucher.status === "redeemed");
    if (state.voucherFilter === "cancelled") return data.vouchers.filter(voucher => voucher.status === "cancelled");
    if (state.voucherFilter === "all") return data.vouchers;
    return data.vouchers.filter(isVoucherOpen);
  }

  function renderVouchers() {
    const vouchers = filteredVouchers();
    mainContent.innerHTML = `<section class="voucher-overview page-enter">
      <header class="voucher-overview-head">
        <p class="eyebrow">Verwaltung</p>
        <h1>Gutscheine</h1>
        <p>Gutscheine verkaufen und vorhandene Gutscheine nachsehen.</p>
      </header>

      <button class="button button-primary voucher-sell-button" type="button" data-action="voucher-sell">＋ Gutschein verkaufen</button>
      ${state.voucherNotice ? `<div class="voucher-notice" role="status">${escapeHtml(state.voucherNotice)}</div>` : ""}

      <div class="voucher-filters" role="group" aria-label="Gutscheine filtern">
        ${[
          ["open", "Offen"],
          ["redeemed", "Eingelöst"],
          ["cancelled", "Storniert"],
          ["all", "Alle"]
        ].map(([id, label]) => `<button class="voucher-filter ${state.voucherFilter === id ? "is-active" : ""}" type="button" data-voucher-filter="${id}" aria-pressed="${state.voucherFilter === id}">${label}</button>`).join("")}
      </div>

      <label class="search-field voucher-search-field">
        <span aria-hidden="true">⌕</span>
        <input id="voucherSearch" type="search" inputmode="search" autocomplete="off" placeholder="Code, Kunde, Name oder Beleg" value="${escapeHtml(state.voucherSearch)}">
      </label>
      ${state.voucherSearch.trim() ? `<p class="voucher-search-note">Die Suche umfasst alle Gutscheine – unabhängig vom gewählten Filter.</p>` : ""}

      <div class="voucher-list" aria-label="Demo-Gutscheine">
        ${vouchers.length ? vouchers.map(voucher => `<button class="voucher-list-item" type="button" data-open-voucher="${escapeHtml(voucher.reference)}">
          <span class="voucher-list-symbol" aria-hidden="true">◇</span>
          <span class="voucher-list-main">
            <strong>${escapeHtml(maskVoucherCode(voucher.code))}</strong>
            <small class="voucher-status ${voucherStatusClass(voucher)}">${escapeHtml(voucherStatusLabel(voucher))}</small>
          </span>
          <span class="voucher-list-value ${isVoucherOpen(voucher) ? "" : "is-unavailable"}"><small>Restwert</small><strong>${formatCurrency(voucher.currentValue)}</strong></span>
          <span class="voucher-list-arrow" aria-hidden="true">›</span>
        </button>`).join("") : `<div class="empty-state">${state.voucherSearch.trim() ? "Keine passenden Gutscheine gefunden." : "Keine Gutscheine in diesem Filter."}</div>`}
      </div>

      <p class="prototype-note">Demo ohne dauerhafte Speicherung. Änderungen gehen beim Neuladen verloren.</p>
    </section>`;

    document.getElementById("voucherSearch")?.addEventListener("input", event => {
      state.voucherSearch = event.target.value;
      renderVouchers();
      const input = document.getElementById("voucherSearch");
      input?.focus();
      input?.setSelectionRange(state.voucherSearch.length, state.voucherSearch.length);
    });
  }

  const VOUCHER_SALE_MAX_AMOUNT = 1000;
  const VOUCHER_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

  function resetVoucherSaleDraft() {
    state.voucherSaleAmountChoice = null;
    state.voucherSaleCustomAmount = "";
    state.voucherSalePaymentChoice = preferredNormalPaymentId() || "cash";
    state.voucherSaleCustomerId = null;
    state.voucherSaleDisplayName = "";
    state.voucherSaleError = "";
    state.voucherSaleSubmitting = false;
    state.voucherSaleCreatedReference = null;
    state.voucherNotice = "";
  }

  function startVoucherSale(returnRoute = "vouchers", amount = null) {
    resetVoucherSaleDraft();
    state.voucherSaleReturnRoute = returnRoute;
    if (amount !== null) {
      const normalizedAmount = String(Number(amount));
      if (["25", "50", "100"].includes(normalizedAmount)) state.voucherSaleAmountChoice = normalizedAmount;
      else {
        state.voucherSaleAmountChoice = "custom";
        state.voucherSaleCustomAmount = normalizedAmount;
      }
    }
    navigate("voucher-sale");
  }

  function voucherSaleAmount() {
    if (["25", "50", "100"].includes(state.voucherSaleAmountChoice)) return Number(state.voucherSaleAmountChoice);
    if (state.voucherSaleAmountChoice !== "custom") return null;
    const normalized = state.voucherSaleCustomAmount.trim().replace(",", ".");
    if (!normalized) return null;
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  }

  function validateVoucherSaleAmount() {
    if (!state.voucherSaleAmountChoice) return "Bitte einen Gutscheinwert auswählen.";
    const amount = voucherSaleAmount();
    if (amount === null) return "Bitte einen gültigen Betrag eingeben.";
    if (amount <= 0) return "Der Gutscheinwert muss größer als 0 € sein.";
    if (amount > VOUCHER_SALE_MAX_AMOUNT) return `Im Prototyp sind höchstens ${formatCurrency(VOUCHER_SALE_MAX_AMOUNT)} möglich. Diese Grenze ist noch keine endgültige Produktregel.`;
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) return "Bitte höchstens zwei Nachkommastellen eingeben.";
    return "";
  }

  function voucherSalePaymentLabel() {
    return activeNormalPaymentChoices().find(choice => choice.id === state.voucherSalePaymentChoice)?.title ?? activeNormalPaymentChoices()[0]?.title ?? "Nicht angegeben";
  }

  function randomHex(byteCount) {
    const bytes = new Uint8Array(byteCount);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  }

  function randomVoucherCodePart(length = 4) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, value => VOUCHER_CODE_ALPHABET[value % VOUCHER_CODE_ALPHABET.length]).join("");
  }

  function createPrototypeVoucherSale(amount) {
    let code;
    do {
      code = `FRKA-${randomVoucherCodePart()}-${randomVoucherCodePart()}`;
    } while (data.vouchers.some(voucher => voucher.code === code));

    let reference;
    do {
      reference = `vch_${randomHex(8)}`;
    } while (data.vouchers.some(voucher => voucher.reference === reference));

    const now = new Date();
    const issuedValue = Math.round(amount * 100) / 100;
    const soldAt = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(now);
    const soldTime = new Intl.DateTimeFormat("de-DE", { timeStyle: "short" }).format(now);
    const customer = data.customers.find(entry => entry.id === state.voucherSaleCustomerId) ?? null;
    const saleReceiptId = `receipt_${randomHex(12)}`;
    const saleReceiptNumber = nextReceiptNumber();
    const presentationSnapshot = currentVoucherPresentationSnapshot();
    const customerSnapshot = customer ? {
      id: customer.id,
      name: customerName(customer),
      email: customer.email || "",
      street: customer.street || "",
      zip: customer.zip || "",
      city: customer.city || ""
    } : null;
    const voucher = {
      id: `voucher_${randomHex(12)}`,
      reference,
      code,
      status: "active",
      issuedValue,
      currentValue: issuedValue,
      soldAt,
      soldTime,
      createdAt: now.toISOString(),
      payment: voucherSalePaymentLabel(),
      customer: customerSnapshot ? { id: customerSnapshot.id, name: customerSnapshot.name } : null,
      displayName: state.voucherSaleDisplayName.trim(),
      saleReceipt: {
        id: saleReceiptId,
        number: saleReceiptNumber,
        soldAt: now.toISOString(),
        payment: voucherSalePaymentLabel(),
        customerId: customer?.id ?? null
      },
      presentationSnapshot,
      history: [
        { type: "sold", date: soldAt, time: soldTime, amount: issuedValue, balanceAfter: issuedValue, receiptNumber: saleReceiptNumber }
      ]
    };
    const receipt = {
      id: saleReceiptId,
      number: saleReceiptNumber,
      type: "receipt",
      receiptKind: "voucher-sale",
      status: "completed",
      date: soldAt,
      time: soldTime,
      sortKey: now.toISOString(),
      payment: voucherSalePaymentLabel(),
      customer: customerSnapshot,
      voucherReference: voucher.reference,
      presentationSnapshot,
      items: [{ title: "Gutschein", type: "voucher-sale", quantity: 1, unitPrice: issuedValue, total: issuedValue }],
      total: issuedValue,
      taxTreatment: "undetermined-prototype",
      activity: [
        { label: "Gutscheinverkauf abgeschlossen", date: `${soldAt} · ${soldTime}` },
        { label: `Gutschein ${voucher.code} verknüpft`, date: `${soldAt} · ${soldTime}` }
      ]
    };
    return { voucher, receipt };
  }

  function commitPrototypeVoucherSale(amount) {
    const sale = createPrototypeVoucherSale(amount);
    let receiptInserted = false;
    try {
      data.receipts.unshift(sale.receipt);
      receiptInserted = true;
      data.vouchers.unshift(sale.voucher);
      return sale;
    } catch (error) {
      const voucherIndex = data.vouchers.indexOf(sale.voucher);
      if (voucherIndex >= 0) data.vouchers.splice(voucherIndex, 1);
      if (receiptInserted) {
        const receiptIndex = data.receipts.indexOf(sale.receipt);
        if (receiptIndex >= 0) data.receipts.splice(receiptIndex, 1);
      }
      throw error;
    }
  }

  function updateVoucherSaleSummary() {
    const amount = voucherSaleAmount();
    const validAmount = amount !== null && amount > 0 && amount <= VOUCHER_SALE_MAX_AMOUNT && Math.abs(amount * 100 - Math.round(amount * 100)) <= 0.0001;
    const amountOutput = document.getElementById("voucherSaleSummaryAmount");
    if (amountOutput) amountOutput.textContent = validAmount ? formatCurrency(amount) : "Noch nicht festgelegt";
  }

  function renderVoucherSale() {
    const amount = voucherSaleAmount();
    const completedVoucher = voucherByReference(state.voucherSaleCreatedReference);
    const saleCustomer = data.customers.find(customer => customer.id === state.voucherSaleCustomerId) ?? null;
    const paymentChoices = activeNormalPaymentChoices();
    mainContent.innerHTML = `<section class="flow-page voucher-sale-page page-enter">
      <div class="flow-head compact-flow-head">
        <button class="button button-back" type="button" data-action="voucher-sale-cancel"><span aria-hidden="true">←</span> Abbrechen</button>
        <p class="eyebrow">Gutscheinverkauf</p>
        <h1 class="flow-title">Gutschein verkaufen</h1>
        <p class="page-copy">Wert und Zahlungsart wählen. Kunde und Gutscheinname sind optional.</p>
      </div>

      ${completedVoucher ? `<div class="voucher-notice" role="status">Dieser Verkauf wurde bereits abgeschlossen. Eine erneute Bestätigung erzeugt weder Gutschein noch Beleg.</div>` : ""}

      <form id="voucherSaleForm" class="voucher-sale-form" novalidate>
        <section class="voucher-sale-section" aria-labelledby="voucherAmountTitle">
          <h2 id="voucherAmountTitle">1. Gutscheinwert</h2>
          <div class="voucher-amount-grid">
            ${[25, 50, 100].map(value => `<button class="voucher-amount-choice ${state.voucherSaleAmountChoice === String(value) ? "is-selected" : ""}" type="button" data-voucher-sale-amount="${value}" aria-pressed="${state.voucherSaleAmountChoice === String(value)}" ${completedVoucher ? "disabled" : ""}>${formatCurrency(value)}</button>`).join("")}
            <button class="voucher-amount-choice ${state.voucherSaleAmountChoice === "custom" ? "is-selected" : ""}" type="button" data-voucher-sale-amount="custom" aria-pressed="${state.voucherSaleAmountChoice === "custom"}" ${completedVoucher ? "disabled" : ""}>Anderer Betrag</button>
          </div>
          ${state.voucherSaleAmountChoice === "custom" ? `<label class="voucher-custom-amount"><span>Eigener Gutscheinwert</span><div class="money-input"><input id="voucherCustomAmount" name="voucherCustomAmount" type="number" inputmode="decimal" min="0.01" max="${VOUCHER_SALE_MAX_AMOUNT}" step="0.01" placeholder="0,00" value="${escapeHtml(state.voucherSaleCustomAmount)}" ${completedVoucher ? "disabled" : ""}><strong>€</strong></div><small>Vorläufige UI-Grenze: ${formatCurrency(VOUCHER_SALE_MAX_AMOUNT)}</small></label>` : ""}
        </section>

        <section class="voucher-sale-section" aria-labelledby="voucherPaymentTitle">
          <h2 id="voucherPaymentTitle">2. Zahlungsart</h2>
          <div class="voucher-payment-grid">
            ${paymentChoices.map(choice => `<button class="voucher-payment-choice ${state.voucherSalePaymentChoice === choice.id ? "is-selected" : ""}" type="button" data-voucher-sale-payment="${escapeHtml(choice.id)}" aria-pressed="${state.voucherSalePaymentChoice === choice.id}" ${completedVoucher ? "disabled" : ""}><span aria-hidden="true">${escapeHtml(choice.icon)}</span><strong>${escapeHtml(choice.title)}</strong></button>`).join("")}
          </div>
        </section>

        <section class="voucher-sale-section" aria-labelledby="voucherCustomerTitle">
          <h2 id="voucherCustomerTitle">3. Kunde <span>optional</span></h2>
          ${saleCustomer ? `<div class="voucher-sale-customer"><div><strong>${escapeHtml(customerName(saleCustomer))}</strong><small>Bestehender Kunde zugeordnet</small></div><div><button class="text-action" type="button" data-action="voucher-customer-pick">Ändern</button><button class="text-action" type="button" data-action="voucher-customer-remove">Entfernen</button></div></div>` : `<button class="voucher-customer-choice" type="button" data-action="voucher-customer-pick"><span aria-hidden="true">◎</span><span><strong>Kunde auswählen</strong><small>Optional aus bestehenden Kunden</small></span><span aria-hidden="true">›</span></button>`}
        </section>

        <section class="voucher-sale-section" aria-labelledby="voucherNameTitle">
          <h2 id="voucherNameTitle">4. Name auf dem Gutschein <span>optional</span></h2>
          <label class="voucher-display-name"><span>Freier kurzer Text</span><input id="voucherDisplayName" name="voucherDisplayName" maxlength="60" autocomplete="off" placeholder="z. B. Für Maria" value="${escapeHtml(state.voucherSaleDisplayName)}" ${completedVoucher ? "disabled" : ""}><small>Wird nur auf Gutschein und Detailansicht gezeigt. Es wird kein Kunde angelegt.</small></label>
        </section>

        <section class="voucher-sale-summary" aria-labelledby="voucherSummaryTitle">
          <h2 id="voucherSummaryTitle">Zusammenfassung</h2>
          <div><span>Gutscheinwert</span><strong id="voucherSaleSummaryAmount">${amount !== null && !validateVoucherSaleAmount() ? formatCurrency(amount) : "Noch nicht festgelegt"}</strong></div>
          <div><span>Zahlungsart</span><strong>${escapeHtml(voucherSalePaymentLabel())}</strong></div>
          <div><span>Kunde</span><strong>${saleCustomer ? escapeHtml(customerName(saleCustomer)) : "Ohne Kundenzuordnung"}</strong></div>
          ${state.voucherSaleDisplayName.trim() ? `<div><span>Name auf Gutschein</span><strong>${escapeHtml(state.voucherSaleDisplayName.trim())}</strong></div>` : ""}
          <p>Eine Bestätigung erzeugt gemeinsam den Verkaufsbeleg, den Gutscheincode und die QR-Vorschau.</p>
        </section>

        ${state.voucherSaleError ? `<div class="voucher-sale-error" role="alert">${escapeHtml(state.voucherSaleError)}</div>` : ""}

        <button class="button button-primary voucher-sale-submit" type="submit" ${state.voucherSaleSubmitting || completedVoucher ? "disabled" : ""}>${state.voucherSaleSubmitting ? "Gutschein wird erstellt …" : completedVoucher ? "Gutschein bereits erstellt" : "Gutschein jetzt verkaufen"}</button>
        ${completedVoucher ? `<button class="button button-secondary voucher-sale-completed-link" type="button" data-route="voucher-sale-success">Zum verkauften Gutschein</button>` : ""}
        <p class="prototype-note">Nur Prototyp: Gutschein und Verkaufsbeleg bleiben bis zum Neuladen im Arbeitsspeicher.</p>
      </form>
    </section>`;

    document.getElementById("voucherCustomAmount")?.addEventListener("input", event => {
      state.voucherSaleCustomAmount = event.target.value;
      state.voucherSaleError = "";
      document.querySelector(".voucher-sale-error")?.remove();
      updateVoucherSaleSummary();
    });
    document.getElementById("voucherDisplayName")?.addEventListener("input", event => {
      state.voucherSaleDisplayName = event.target.value;
    });
  }

  function renderVoucherSaleSuccess() {
    const voucher = voucherByReference(state.voucherSaleCreatedReference);
    if (!voucher) {
      navigate("vouchers", false);
      return;
    }
    const saleReceipt = linkedVoucherSaleReceipt(voucher);
    mainContent.innerHTML = `<section class="flow-page voucher-sale-success-page page-enter">
      <div class="voucher-sale-success-hero">
        <div class="success-mark" aria-hidden="true">✓</div>
        <p class="eyebrow">Verkauf abgeschlossen</p>
        <h1>Gutschein verkauft</h1>
        <p>Gutschein und Verkaufsbeleg wurden gemeinsam im Arbeitsspeicher angelegt.</p>
      </div>

      ${state.voucherNotice ? `<div class="voucher-notice" role="status">${escapeHtml(state.voucherNotice)}</div>` : ""}

      <section class="voucher-sale-result">
        <div class="voucher-sale-result-value"><span>Gutscheinwert</span><strong>${formatCurrency(voucher.issuedValue)}</strong></div>
        <div class="voucher-code-block"><span>Gutscheincode</span><strong>${escapeHtml(voucher.code)}</strong><small>Zum Abschreiben auf einen eigenen vorgedruckten Gutschein</small></div>
        <div class="voucher-qr-block">
          ${voucherQrPlaceholder(voucher)}
          <div><strong>QR-Code · Prototyp</strong><small>Code und QR-Vorschau gehören zu derselben stabilen Gutscheinidentität.</small></div>
        </div>
        <div class="voucher-sale-result-meta"><span>Status</span><strong class="voucher-status is-active">Aktiv</strong></div>
        <div class="voucher-sale-result-meta"><span>Verkaufsbeleg</span><strong>${escapeHtml(saleReceipt?.number || "Demo-Bezug fehlt")}</strong></div>
        ${voucher.customer ? `<div class="voucher-sale-result-meta"><span>Kunde</span><strong>${escapeHtml(voucher.customer.name)}</strong></div>` : ""}
        ${voucher.displayName ? `<div class="voucher-sale-result-meta"><span>Name auf Gutschein</span><strong>${escapeHtml(voucher.displayName)}</strong></div>` : ""}
      </section>

      <section class="voucher-sale-success-actions" aria-label="Aktionen nach dem Gutscheinverkauf">
        <button class="button button-primary" type="button" data-route="voucher-preview">Gutschein anzeigen</button>
        ${saleReceipt ? `<button class="button button-secondary" type="button" data-preview-receipt="${escapeHtml(saleReceipt.number)}">Verkaufsbeleg anzeigen</button>` : ""}
        <button class="button button-secondary" type="button" data-action="voucher-pdf">Gutschein als PDF speichern</button>
        <button class="button button-secondary" type="button" data-action="voucher-email">Gutschein per E-Mail senden · Simulation</button>
        <button class="button button-ghost" type="button" data-route="vouchers">Zur Gutscheinübersicht</button>
      </section>
    </section>`;
  }

  function renderVoucherDetail() {
    const voucher = voucherByReference(state.voucherDetailReference);
    if (!voucher) {
      navigate("vouchers", false);
      return;
    }
    const appLink = voucherAppLink(voucher.reference);
    const presentation = voucherPresentation(voucher);
    const addressesMatch = sameVoucherAddress(presentation.issuer, presentation.redemptionLocation);
    const saleReceipt = linkedVoucherSaleReceipt(voucher);
    mainContent.innerHTML = `<section class="flow-page voucher-detail-page page-enter">
      <div class="flow-head compact-flow-head">
        <button class="button button-back" type="button" data-route="vouchers"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Gutschein</p>
        <h1 class="flow-title">Gutscheindetails</h1>
      </div>

      ${state.voucherNotice ? `<div class="voucher-notice" role="status">${escapeHtml(state.voucherNotice)}</div>` : ""}

      <section class="voucher-identity-card">
        <div class="voucher-code-block"><span>Gutscheincode</span><strong>${escapeHtml(voucher.code)}</strong><small>Zum Übertragen auf einen vorhandenen Papiergutschein</small></div>
        <div class="voucher-qr-block">
          ${voucherQrPlaceholder(voucher)}
          <div><strong>QR-Code · Prototyp</strong><small>Verweist auf dieselbe Gutscheinidentität wie der sichtbare Code.</small></div>
        </div>
        <p class="voucher-local-note">Der App-Link kann den Gutschein nur auf einem Gerät öffnen, auf dem dieser Gutschein lokal vorhanden ist. Eine geräteübergreifende Auflösung ist nicht eingerichtet.</p>
        <code class="voucher-app-link">${escapeHtml(appLink)}</code>
      </section>

      <section class="voucher-facts">
        <div><span>Status</span><strong class="voucher-status ${voucherStatusClass(voucher)}">${escapeHtml(voucherStatusLabel(voucher))}</strong></div>
        <div class="voucher-balance ${isVoucherOpen(voucher) ? "" : "is-unavailable"}"><span>Aktueller Restwert</span><strong>${formatCurrency(voucher.currentValue)}</strong></div>
        <div><span>Ursprünglicher Wert</span><strong>${formatCurrency(voucher.issuedValue)}</strong></div>
        <div><span>Verkauft am</span><strong>${escapeHtml([voucher.soldAt, voucher.soldTime].filter(Boolean).join(" · "))}</strong></div>
        <div><span>Zahlungsart beim Verkauf</span><strong>${escapeHtml(voucher.payment || "Nicht angegeben")}</strong></div>
        ${voucher.saleReceipt?.number ? `<div><span>Verkaufsbeleg</span>${saleReceipt ? `<button type="button" data-open-receipt="${escapeHtml(saleReceipt.number)}">${escapeHtml(saleReceipt.number)} · Verkaufsbeleg öffnen</button>` : `<strong>${escapeHtml(voucher.saleReceipt.number)}</strong>`}</div>` : ""}
        ${voucher.customer ? `<div><span>Zugeordneter Kunde</span><strong>${escapeHtml(voucher.customer.name)}</strong></div>` : ""}
        ${voucher.displayName ? `<div><span>Name auf dem Gutschein</span><strong>${escapeHtml(voucher.displayName)}</strong></div>` : ""}
      </section>

      <section class="voucher-parties" aria-labelledby="voucherPartiesTitle">
        <div class="voucher-section-title"><h2 id="voucherPartiesTitle">Ausstellung und Einlöseort</h2><span>Stand bei Verkauf</span></div>
        <div class="voucher-party-card">
          <span>Aussteller</span>
          <strong>${escapeHtml(presentation.issuer.name)}</strong>
          ${presentation.issuer.owner ? `<small>${escapeHtml(presentation.issuer.owner)}</small>` : ""}
          <small>${escapeHtml(presentation.issuer.street)}</small>
          <small>${escapeHtml(addressCityLine(presentation.issuer))}</small>
        </div>
        ${addressesMatch ? `<div class="voucher-location-same"><span>Einlöseort</span><strong>Ausstelleradresse</strong><small>Einlösbar an der oben genannten Adresse.</small></div>` : `<div class="voucher-party-card is-redemption-location">
          <span>Einlösbar bei</span>
          <strong>${escapeHtml(presentation.redemptionLocation.name || "Leistungsort")}</strong>
          <small>${escapeHtml(presentation.redemptionLocation.street)}</small>
          <small>${escapeHtml(addressCityLine(presentation.redemptionLocation))}</small>
          ${presentation.redemptionLocation.voucherNote ? `<small>${escapeHtml(presentation.redemptionLocation.voucherNote)}</small>` : ""}
        </div>`}
      </section>

      ${renderVoucherHistory(voucher)}

      <section class="voucher-detail-actions" aria-label="Gutscheinaktionen">
        <button class="button button-primary" type="button" data-route="voucher-preview">Gutschein anzeigen</button>
        <button class="button button-secondary" type="button" data-action="voucher-pdf">Als PDF speichern</button>
        <button class="button button-secondary" type="button" data-action="voucher-email">Per E-Mail senden</button>
      </section>
    </section>`;
  }

  function renderVoucherPreview() {
    const voucher = voucherByReference(state.voucherDetailReference);
    if (!voucher) {
      navigate("vouchers", false);
      return;
    }
    const presentation = voucherPresentation(voucher);
    const addressesMatch = sameVoucherAddress(presentation.issuer, presentation.redemptionLocation);
    mainContent.innerHTML = `<section class="flow-page voucher-preview-page page-enter">
      <div class="flow-head compact-flow-head voucher-preview-controls">
        <button class="button button-back" type="button" data-route="voucher-detail"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Feste Vorlage · Version 1.0</p>
        <h1 class="flow-title">Gutschein anzeigen</h1>
        <p class="page-copy">Neutrale Druckansicht ohne individuelle Designkonfiguration.</p>
      </div>

      ${state.voucherNotice ? `<div class="voucher-notice voucher-preview-controls" role="status">${escapeHtml(state.voucherNotice)}</div>` : ""}

      <article class="voucher-sheet">
        <header>
          <span>Gutschein</span>
          <small class="voucher-sheet-label">Aussteller</small>
          <strong>${escapeHtml(presentation.issuer.name)}</strong>
          ${presentation.issuer.owner ? `<small>${escapeHtml(presentation.issuer.owner)}</small>` : ""}
          <small>${escapeHtml(presentation.issuer.street)}</small>
          <small>${escapeHtml(addressCityLine(presentation.issuer))}</small>
        </header>
        ${voucher.displayName ? `<div class="voucher-sheet-recipient"><span>Name auf dem Gutschein</span><strong>${escapeHtml(voucher.displayName)}</strong></div>` : ""}
        <div class="voucher-sheet-value"><span>Wert</span><strong>${formatCurrency(voucher.issuedValue)}</strong></div>
        <div class="voucher-sheet-qr">
          ${voucherQrPlaceholder(voucher)}
          <small>QR-Code · technische Vorschau</small>
        </div>
        <div class="voucher-sheet-status"><span>Status</span><strong class="voucher-status ${voucherStatusClass(voucher)}">${escapeHtml(voucherStatusLabel(voucher))}</strong></div>
        <div class="voucher-sheet-code"><span>Gutscheincode</span><strong>${escapeHtml(voucher.code)}</strong></div>
        <div class="voucher-sheet-location ${addressesMatch ? "is-same" : ""}">
          <span>Einlösbar bei</span>
          ${addressesMatch ? `<strong>Ausstelleradresse</strong>` : `<strong>${escapeHtml(presentation.redemptionLocation.name || "Leistungsort")}</strong><small>${escapeHtml(presentation.redemptionLocation.street)}</small><small>${escapeHtml(addressCityLine(presentation.redemptionLocation))}</small>${presentation.redemptionLocation.voucherNote ? `<small>${escapeHtml(presentation.redemptionLocation.voucherNote)}</small>` : ""}`}
        </div>
        <footer>Bitte Gutscheincode oder QR-Code bei der Einlösung vorzeigen.</footer>
      </article>

      <p class="prototype-note voucher-preview-controls">Die Vorlage enthält Demo-Daten. Der QR-Bereich ist technisch vorbereitet, aber in diesem UX-Block noch kein scanbarer Produktions-QR-Code.</p>
      <button class="button button-primary voucher-print-button voucher-preview-controls" type="button" data-action="voucher-print">Drucken / als PDF sichern</button>
    </section>`;
  }

  const helpTopics = {
    company: ["Unternehmensdaten", ["Diese Angaben erscheinen auf neuen Belegen und Gutscheinen.", "Pflichtangaben sollten vor dem ersten echten Beleg vollständig geprüft werden.", "Änderungen gelten im Prototyp nur bis zum Neuladen."]],
    location: ["Leistungsort", ["Der Leistungsort zeigt, wo deine Leistungen normalerweise erbracht werden.", "Bei gleicher Anschrift wird keine zweite Adresse geführt.", "Der Ort wird auch für neue Gutscheine verwendet."]],
    taxes: ["Steuerstatus", ["Wähle den Status, der für dein Unternehmen fachlich bestätigt wurde.", "FRECKA nimmt keine steuerliche Bewertung vor.", "Unsichere Angaben solltest du mit Steuerberatung oder Finanzamt klären."]],
    business: ["Geschäftsbereiche", ["Geschäftsbereiche trennen unterschiedliche Angebote innerhalb derselben Instanz.", "Mindestens ein Bereich muss aktiv und als Standard gewählt sein.", "Sie sind keine Filialen und besitzen keine eigene Rechteverwaltung."]],
    payments: ["Zahlungsarten", ["Aktive Zahlungsarten erscheinen beim Belegabschluss.", "Mindestens eine normale Zahlungsart muss aktiv bleiben.", "Es besteht keine Verbindung zu Zahlungsanbietern."]],
    receiptTexts: ["Belegtexte", ["Dankes- und Fußtext sind freiwillig.", "Sie werden als Momentaufnahme in neue Belege übernommen.", "Bereits erstellte Belege ändern sich nicht rückwirkend."]],
    backup: ["Backup", ["Backups werden später verschlüsselt in einem Speicher des Kunden abgelegt.", "In diesem Prototyp ist noch keine Sicherung möglich.", "FRECKA speichert keine Kundendaten zentral."]],
    export: ["Export", ["Exporte werden später aus den lokalen Daten erzeugt.", "Format und Zeitraum sollen vor dem Export klar auswählbar sein.", "Aktuell wird noch keine Datei erstellt."]],
    update: ["Update", ["Updates ersetzen ausschließlich Programmcode.", "Geschäftsdaten bleiben lokal auf dem Endgerät.", "Die Synology ist nur als späterer Update-Server vorgesehen."]],
    tse: ["TSE", ["Dieser Prototyp besitzt keine TSE-Anbindung.", "Ob eine TSE erforderlich ist, wird nicht automatisch beurteilt.", "Vor produktiver Nutzung muss die konkrete Pflicht fachlich geprüft werden.", "Die spätere Einrichtung erhält einen eigenen Assistenten."]]
  };

  const businessTemplateNames = ["Friseur", "Podologie", "Kosmetik", "Nagelstudio", "Fußpflege", "Massage", "Coaching", "Therapie", "Hundesalon"];

  function helpButton(topic, label) {
    return `<button class="context-help" type="button" data-help="${escapeHtml(topic)}" aria-label="Hilfe zu ${escapeHtml(label)}">ⓘ</button>`;
  }

  function cardTitle(title, helpTopic) {
    return `<div class="settings-card-title"><h2>${escapeHtml(title)}</h2>${helpButton(helpTopic, title)}</div>`;
  }

  function openBottomSheet(title, content, modifier = "") {
    bottomSheetTitle.textContent = title;
    bottomSheetContent.innerHTML = content;
    bottomSheet.className = `bottom-sheet ${modifier}`.trim();
    bottomSheetBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    bottomSheetClose.focus();
  }

  function closeBottomSheet() {
    bottomSheetBackdrop.hidden = true;
    bottomSheet.className = "bottom-sheet";
    bottomSheetContent.innerHTML = "";
    document.body.style.overflow = "";
  }

  function openContextHelp(topic) {
    const [title, sentences] = helpTopics[topic] || ["Hilfe", ["Für diesen Bereich ist noch keine Hilfe hinterlegt."]];
    openBottomSheet(title, `<div class="context-help-copy">${sentences.slice(0, 5).map(sentence => `<p>${escapeHtml(sentence)}</p>`).join("")}</div>`);
  }

  function openBusinessTemplatePicker() {
    openBottomSheet("Welchen Geschäftsbereich möchtest du anlegen?", `<div class="template-choice-list">
      <button type="button" data-template-choice="custom"><strong>Eigenen Geschäftsbereich erstellen</strong><small>Mit einem leeren Bereich beginnen</small></button>
      ${businessTemplateNames.map(name => `<button type="button" data-template-choice="${escapeHtml(name)}"><strong>${escapeHtml(name)}</strong><small>Vorlage zunächst nur ansehen</small></button>`).join("")}
    </div>`, "business-template-sheet");
  }

  function openBusinessTemplateConfirmation(name, previewVisible = false) {
    state.pendingBusinessTemplate = name;
    openBottomSheet(name, `<div class="template-confirmation">
      <p>Für diesen Geschäftsbereich stehen vorbereitete Kategorien und Leistungen bereit.</p>
      ${previewVisible ? `<div class="template-preview-simulation"><strong>Vorschau der Vorbereitung</strong><span>Kategorien</span><span>Leistungen</span><span>Produkte</span><small>Nur Simulation – es werden noch keine Inhalte importiert.</small></div>` : ""}
      ${previewVisible ? "" : `<button class="button button-secondary" type="button" data-action="template-preview">Vorlage ansehen</button>`}
      <button class="button button-primary" type="button" data-action="template-use">Vorlage verwenden</button>
      <button class="button button-ghost" type="button" data-action="template-empty">Ohne Vorlage starten</button>
    </div>`, "business-template-sheet");
  }

  function addBusinessArea(label, templateSimulated = false) {
    const id = `area-${Date.now()}`;
    data.businessAreas.push({ id, label, active: true, isDefault: false });
    data.catalog[id] = [];
    closeBottomSheet();
    const message = templateSimulated
      ? `${label} wurde angelegt. Die Branchenvorlage ist in diesem UX-Prototyp nur simuliert; es wurden keine Leistungen importiert.`
      : `${label} wurde ohne Vorlage angelegt. Name und Standard können jetzt angepasst werden.`;
    if (state.route === "setup-wizard") {
      state.setupNotice = "";
      state.businessAreaSettingsNotice = message;
      renderSetupWizard();
    } else {
      state.businessAreaSettingsNotice = message;
      renderBusinessAreaSettings();
    }
  }

  const settingsSections = [
    { id: "settings-company", icon: "▣", title: "Unternehmensdaten", note: "Name, Anschrift und Kontaktdaten", available: true },
    { id: "settings-location", icon: "⌖", title: "Leistungsort", note: "Standardort für Leistungen und Gutscheine", available: true },
    { id: "settings-taxes", icon: "%", title: "Steuern und Belegangaben", note: "Steuerstatus, Nummern und Belegtexte", available: true },
    { id: "settings-payments", icon: "€", title: "Zahlungsarten", note: "Aktive Arten und Reihenfolge", available: true },
    { id: "settings-business-areas", icon: "◇", title: "Geschäftsbereiche", note: "Fachbereiche und Standardauswahl", available: true },
    { id: "settings-help", icon: "?", title: "Hilfe & Lernen", note: "Erste Schritte und häufige Fragen", available: true },
    { icon: "◎", title: "Benutzer", note: "Für eine spätere Version vorbereitet" },
    { icon: "↥", title: "Backup und Wiederherstellung", note: "Für eine spätere Version vorbereitet", help: "backup" },
    { icon: "⇥", title: "Export", note: "Für eine spätere Version vorbereitet", help: "export" },
    { icon: "↻", title: "Update", note: "Für eine spätere Version vorbereitet", help: "update" },
    { icon: "T", title: "TSE-Vorbereitung", note: "Für eine spätere Version vorbereitet", help: "tse" }
  ];

  const setupSteps = [
    "Willkommen", "Unternehmensdaten", "Leistungsort", "Steuerstatus", "Belegnummer",
    "Zahlungsarten", "Geschäftsbereich", "Belegtexte", "TSE-Hinweis", "Zusammenfassung",
    "Testbeleg", "Fertig"
  ];

  function setupStartHint() {
    return `<section class="setup-start-hint"><span class="setup-start-icon" aria-hidden="true">✓</span><div><strong>In etwa fünf Minuten ist FRECKA einsatzbereit.</strong><p>Wir richten gemeinsam alles ein. Du kannst jederzeit unterbrechen und später weitermachen.</p></div><button class="button button-primary" type="button" data-action="setup-start">Jetzt einrichten</button><button class="button button-ghost" type="button" data-action="setup-later">Später</button></section>`;
  }

  function applyCompanyForm(formData) {
    Object.assign(data.company, {
      name: String(formData.get("name") || "").trim(),
      owner: String(formData.get("owner") || "").trim(),
      street: String(formData.get("street") || "").trim(),
      zip: String(formData.get("zip") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      country: String(formData.get("country") || "Deutschland").trim() || "Deutschland",
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      taxNumber: String(formData.get("taxNumber") ?? data.company.taxNumber ?? "").trim(),
      vatId: String(formData.get("vatId") ?? data.company.vatId ?? "").trim()
    });
    companyName.textContent = data.company.name || "FRECKA";
  }

  function applyServiceLocationForm(formData) {
    const mode = formData.get("mode") === "alternate" ? "alternate" : "company";
    const location = mode === "alternate" ? {
      id: data.defaultServiceLocationId,
      mode,
      name: String(formData.get("name") || "").trim(),
      street: String(formData.get("street") || "").trim(),
      zip: String(formData.get("zip") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      voucherNote: String(formData.get("voucherNote") || "").trim()
    } : { id: data.defaultServiceLocationId, mode: "company" };
    const locationIndex = data.serviceLocations.findIndex(entry => entry.id === data.defaultServiceLocationId);
    if (locationIndex >= 0) data.serviceLocations.splice(locationIndex, 1, location);
    else data.serviceLocations.push(location);
  }

  function receiptNumberValidation(yearPrefix, nextNumber) {
    if (!/^\d{4}$/.test(yearPrefix) || !Number.isInteger(nextNumber) || nextNumber < 1) {
      return "Bitte ein vierstelliges Jahrespräfix und eine gültige nächste Belegnummer eingeben.";
    }
    const candidateNumber = `${yearPrefix}-${String(nextNumber).padStart(6, "0")}`;
    return receiptNumberExists(candidateNumber) ? "Bitte eine noch nicht vergebene nächste Belegnummer wählen." : "";
  }

  function applyBusinessAreaForm(formData) {
    const activeIds = formData.getAll("activeBusinessArea").map(String);
    const defaultId = String(formData.get("defaultBusinessArea") || "");
    const labels = new Map(data.businessAreas.map(area => [area.id, String(formData.get(`areaLabel:${area.id}`) || "").trim()]));
    if ([...labels.values()].some(label => !label)) return "Bitte für jeden Geschäftsbereich einen Namen eingeben.";
    if (!activeIds.length) return "Mindestens ein Geschäftsbereich muss aktiv bleiben.";
    if (!activeIds.includes(defaultId)) return "Bitte einen aktiven Geschäftsbereich als Standard festlegen.";
    data.businessAreas.forEach(area => {
      area.label = labels.get(area.id);
      area.active = activeIds.includes(area.id);
      area.isDefault = area.id === defaultId;
    });
    if (!state.cart.length || !activeIds.includes(state.activeBusinessArea)) state.activeBusinessArea = defaultId;
    refreshBusinessSwitcher();
    return "";
  }

  function setupActions(nextLabel = "Weiter") {
    return `<div class="setup-actions">
      ${state.setupStep > 1 ? `<button class="button button-secondary" type="button" data-setup-back>Zurück</button>` : ""}
      <button class="button button-primary" type="submit">${escapeHtml(nextLabel)}</button>
      <button class="setup-cancel" type="button" data-setup-cancel>Assistent abbrechen</button>
    </div>`;
  }

  function setupBusinessAreaRows() {
    return data.businessAreas.map(area => `<section class="business-area-row">
      <label class="setting-field"><span>Name</span><input name="areaLabel:${escapeHtml(area.id)}" value="${escapeHtml(area.label)}" required></label>
      <div class="business-area-controls">
        <label><input type="checkbox" name="activeBusinessArea" value="${escapeHtml(area.id)}" ${area.active !== false ? "checked" : ""}><span>Aktiv</span></label>
        <label><input type="radio" name="defaultBusinessArea" value="${escapeHtml(area.id)}" ${area.isDefault ? "checked" : ""}><span>Standard</span></label>
      </div>
    </section>`).join("");
  }

  function setupSummary() {
    const location = currentServiceLocation();
    const taxLabels = { vat: "Umsatzsteuer", "small-business": "Kleinunternehmen", undecided: "Noch nicht festgelegt" };
    const companyAddressComplete = [data.company.street, data.company.zip, data.company.city].every(Boolean);
    const companyComplete = [data.company.name, data.company.owner].every(Boolean) && companyAddressComplete;
    const locationComplete = location.mode === "alternate" ? [location.name, location.street, location.zip, location.city].every(Boolean) : companyAddressComplete;
    const taxComplete = data.taxSettings.status !== "undecided" && (data.taxSettings.status !== "vat" || [7, 19].includes(Number(data.taxSettings.defaultRate)));
    const numberComplete = /^\d{4}$/.test(String(data.receiptSettings.yearPrefix)) && Number.isInteger(Number(data.receiptSettings.nextNumber)) && Number(data.receiptSettings.nextNumber) > 0;
    const paymentComplete = activeNormalPaymentChoices().length > 0;
    const businessComplete = Boolean(defaultBusinessArea()) && activeBusinessAreas().some(area => area.id === defaultBusinessArea()?.id);
    const summary = [
      [2, "Unternehmen", data.company.name || "Nicht angegeben", companyComplete, companyComplete ? "Pflichtangaben vorhanden" : "Pflichtangaben prüfen"],
      [3, "Leistungsort", location.mode === "alternate" ? location.name || "Abweichender Ort" : "Unternehmensanschrift", locationComplete, locationComplete ? "Leistungsort ist festgelegt" : "Adresse vervollständigen"],
      [4, "Steuern", taxLabels[data.taxSettings.status] || taxLabels.undecided, taxComplete, taxComplete ? (data.taxSettings.status === "vat" ? `${data.taxSettings.defaultRate} % Standard` : "Status gewählt") : "Steuerstatus fachlich klären"],
      [5, "Belegnummer", `${data.receiptSettings.yearPrefix}-${String(data.receiptSettings.nextNumber).padStart(6, "0")}`, numberComplete, numberComplete ? "Nummernkreis vorbereitet" : "Nummernkreis prüfen"],
      [6, "Zahlungsarten", activePaymentChoices().map(choice => choice.title).join(", "), paymentComplete, paymentComplete ? "Normale Zahlungsart aktiv" : "Zahlungsart aktivieren"],
      [7, "Geschäftsbereiche", activeBusinessAreas().map(area => area.label).join(", "), businessComplete, businessComplete ? `Standard: ${defaultBusinessArea()?.label || "–"}` : "Standardbereich auswählen"],
      [8, "Belegtexte", data.receiptSettings.thankYouText || data.receiptSettings.footerText ? "Vorhanden" : "Nicht hinterlegt", true, "Optional – kann leer bleiben"],
      [9, "TSE", "Noch nicht eingerichtet", false, "Vor produktiver Nutzung fachlich prüfen"]
    ];
    return `<div class="setup-summary">${summary.map(([step, title, value, complete, note]) => `<article class="${complete ? "is-complete" : "is-incomplete"}">
      <div><span>${escapeHtml(title)}</span><strong>${escapeHtml(value || "–")}</strong><em>${complete ? "✓ vollständig" : "⚠ noch unvollständig"}</em>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>
      <button type="button" data-setup-jump="${step}">Ändern</button>
    </article>`).join("")}</div>`;
  }

  function setupTestReceipt() {
    const location = currentServiceLocation();
    const taxRate = Number(data.taxSettings.defaultRate || 19);
    const payment = activeNormalPaymentChoices()[0]?.title || "Zahlungsart";
    return `<article class="setup-test-receipt" aria-label="Testbeleg Vorschau">
      <strong class="setup-test-label">TESTBELEG · VORSCHAU</strong>
      <h3>${escapeHtml(data.company.name || "Unternehmen")}</h3>
      <p>${escapeHtml(data.company.street || "")}<br>${escapeHtml(addressCityLine(data.company))}</p>
      ${location.mode === "alternate" ? `<p>Leistungsort: ${escapeHtml(location.name || "Abweichender Leistungsort")}</p>` : ""}
      <div class="setup-test-line"><span>Testleistung</span><strong>${formatCurrency(10)}</strong></div>
      <div class="setup-test-line total"><span>Gesamt</span><strong>${formatCurrency(10)}</strong></div>
      <p>${data.taxSettings.status === "vat" ? `Enthaltene USt.: ${escapeHtml(taxRate)} %` : "Steuerstatus: " + escapeHtml(data.taxSettings.status === "small-business" ? "Kleinunternehmen" : "noch nicht festgelegt")}</p>
      <p>Zahlungsart: ${escapeHtml(payment)}</p>
      ${data.receiptSettings.footerText ? `<p>${escapeHtml(data.receiptSettings.footerText)}</p>` : ""}
      ${data.receiptSettings.thankYouText ? `<p>${escapeHtml(data.receiptSettings.thankYouText)}</p>` : ""}
      <strong>Keine produktive Belegnummer · keine TSE · keine Fiskalisierung</strong>
    </article>`;
  }

  function setupStepContent() {
    const company = data.company;
    const location = currentServiceLocation();
    const alternate = location.mode === "alternate";
    const receipt = data.receiptSettings;
    switch (state.setupStep) {
      case 1: return `<div class="setup-welcome"><div class="setup-welcome-symbol" aria-hidden="true">✓</div><h2>In etwa fünf Minuten ist FRECKA einsatzbereit.</h2><p>Wir richten gemeinsam alles ein.<br>Du kannst jederzeit unterbrechen und später weitermachen.</p><ul><li>Unternehmen und Leistungsort</li><li>Steuern und Belegnummern</li><li>Zahlungsarten und Geschäftsbereich</li></ul></div>${setupActions("Einrichtung starten")}`;
      case 2: return `<section class="settings-form-card"><h2>Unternehmen</h2>
        <label class="setting-field full"><span>Firmenname oder Geschäftsbezeichnung</span><input name="name" required value="${escapeHtml(company.name || "")}"></label>
        <label class="setting-field full"><span>Vor- und Nachname des Inhabers</span><input name="owner" required value="${escapeHtml(company.owner || "")}"></label>
        <label class="setting-field full"><span>Straße und Hausnummer</span><input name="street" required value="${escapeHtml(company.street || "")}"></label>
        <label class="setting-field"><span>PLZ</span><input name="zip" inputmode="numeric" required value="${escapeHtml(company.zip || "")}"></label>
        <label class="setting-field"><span>Ort</span><input name="city" required value="${escapeHtml(company.city || "")}"></label>
        <label class="setting-field"><span>E-Mail <small>optional</small></span><input name="email" type="email" value="${escapeHtml(company.email || "")}"></label>
        <label class="setting-field"><span>Telefon <small>optional</small></span><input name="phone" type="tel" value="${escapeHtml(company.phone || "")}"></label>
        <input type="hidden" name="country" value="${escapeHtml(company.country || "Deutschland")}"></section>${setupActions()}`;
      case 3: return `<section class="settings-form-card settings-single-column"><fieldset class="settings-location-choice"><legend>Arbeitest du an deiner Unternehmensanschrift?</legend>
        <label><input type="radio" name="mode" value="company" ${alternate ? "" : "checked"}><span><strong>Ja</strong><small>Die Unternehmensanschrift wird als Leistungsort verwendet.</small></span></label>
        <label><input type="radio" name="mode" value="alternate" ${alternate ? "checked" : ""}><span><strong>Nein</strong><small>Ich hinterlege einen abweichenden Leistungsort.</small></span></label></fieldset></section>
        <fieldset class="settings-form-card setup-location-fields" ${alternate ? "" : "hidden"}><legend>Abweichender Leistungsort</legend>
        <label class="setting-field full"><span>Bezeichnung</span><input name="name" value="${escapeHtml(location.name || "")}"></label>
        <label class="setting-field full"><span>Straße und Hausnummer</span><input name="street" value="${escapeHtml(location.street || "")}"></label>
        <label class="setting-field"><span>PLZ</span><input name="zip" inputmode="numeric" value="${escapeHtml(location.zip || "")}"></label>
        <label class="setting-field"><span>Ort</span><input name="city" value="${escapeHtml(location.city || "")}"></label>
        <label class="setting-field full"><span>Hinweis für Gutscheine <small>optional</small></span><textarea name="voucherNote" rows="3" placeholder="z. B. Einlösbar nach Terminvereinbarung">${escapeHtml(location.voucherNote || "")}</textarea></label></fieldset>${setupActions()}`;
      case 4: return `<section class="settings-form-card settings-single-column"><fieldset class="settings-option-list"><legend>Wie ist dein Steuerstatus?</legend>
        ${[["vat","Umsatzsteuer wird berechnet","Neue Belege zeigen den gewählten Standardsteuersatz."],["small-business","Kleinunternehmerregelung","Belege werden ohne ausgewiesene Umsatzsteuer vorbereitet."],["undecided","Noch nicht sicher","Du kannst fortfahren und die Auswahl später klären."]].map(([value,label,note]) => `<label><input type="radio" name="taxStatus" value="${value}" ${data.taxSettings.status === value ? "checked" : ""}><span><strong>${label}</strong><small>${note}</small></span></label>`).join("")}</fieldset>
        <div class="setup-tax-rate" ${data.taxSettings.status === "vat" ? "" : "hidden"}><span>Standard-Steuersatz</span><div class="setup-choice-row"><label><input type="radio" name="defaultTaxRate" value="19" ${data.taxSettings.defaultRate === 19 ? "checked" : ""}><span>19 %</span></label><label><input type="radio" name="defaultTaxRate" value="7" ${data.taxSettings.defaultRate === 7 ? "checked" : ""}><span>7 %</span></label></div></div>
        <p class="settings-neutral-note">Bitte kläre Unsicherheiten mit deiner Steuerberatung. FRECKA trifft keine rechtliche Entscheidung.</p></section>${setupActions()}`;
      case 5: return `<section class="settings-form-card"><h2>Belegnummern</h2><label class="setting-field"><span>Jahrespräfix</span><input id="setupReceiptPrefix" name="yearPrefix" inputmode="numeric" maxlength="4" value="${escapeHtml(receipt.yearPrefix)}"></label><label class="setting-field"><span>Nächste Belegnummer</span><input id="setupReceiptNext" name="nextNumber" type="number" min="1" step="1" value="${escapeHtml(receipt.nextNumber)}"></label><div class="receipt-number-preview full"><span>Vorschau</span><strong id="setupReceiptPreview">${escapeHtml(receipt.yearPrefix)}-${String(receipt.nextNumber).padStart(6,"0")}</strong><small>Änderungen wirken nur auf neue Belege. Bestehende Belege bleiben unverändert.</small></div></section><p class="settings-neutral-note">Nach dem produktiven Start sollte der Nummernkreis nicht ohne fachliche Prüfung geändert werden.</p>${setupActions()}`;
      case 6: return `<div class="payment-settings-list">${data.paymentChoices.map(choice => `<article class="payment-setting-row ${choice.id === "later" ? "is-later" : ""}"><span class="payment-setting-icon" aria-hidden="true">${escapeHtml(choice.icon)}</span><span class="payment-setting-name"><strong>${escapeHtml(choice.title)}</strong><small>${isNormalPaymentChoice(choice) ? "Normale Zahlungsart" : choice.id === "voucher" ? "Gutscheinsystem" : "Zahlung erfolgt später"}</small></span><label class="payment-setting-toggle"><input type="checkbox" data-payment-toggle="${escapeHtml(choice.id)}" ${choice.active !== false ? "checked" : ""}><span>${choice.active !== false ? "Aktiv" : "Inaktiv"}</span></label></article>`).join("")}</div><p class="prototype-note">Mindestens eine normale Zahlungsart muss aktiv bleiben.</p>${setupActions()}`;
      case 7: return `<div class="business-model-note"><strong>Eine Instanz entspricht einer Filiale.</strong><span>Hier legst du nur fachliche Geschäftsbereiche fest.</span></div><div class="business-area-list">${setupBusinessAreaRows()}</div><button class="button button-secondary business-area-add" type="button" data-action="business-area-add">＋ Geschäftsbereich</button>${setupActions()}`;
      case 8: return `<section class="settings-form-card settings-single-column"><h2>Optionale Belegtexte</h2><label class="setting-field full"><span>Dankestext <small>optional</small></span><input name="thankYouText" maxlength="120" placeholder="z. B. Vielen Dank für deinen Besuch." value="${escapeHtml(receipt.thankYouText || "")}"></label><label class="setting-field full"><span>Fußtext <small>optional</small></span><textarea name="footerText" rows="3" maxlength="240" placeholder="z. B. Termine bitte 24 Stunden vorher absagen.">${escapeHtml(receipt.footerText || "")}</textarea></label></section>${setupActions("Weiter oder überspringen")}`;
      case 9: return `<div class="setup-info-card"><div class="setup-info-symbol" aria-hidden="true">T</div><h2>TSE kommt später</h2><p>FRECKA hat in diesem Prototyp noch keine TSE-Anbindung. Ob eine TSE erforderlich ist, wird hier nicht automatisch beurteilt.</p><p>Vor produktiver Nutzung als elektronisches Aufzeichnungssystem muss die konkrete Pflicht fachlich geprüft werden. Die spätere TSE-Einrichtung erhält einen eigenen Assistenten.</p><button class="button button-primary" type="button" data-setup-tse>Verstanden</button><button class="button button-secondary" type="button" data-setup-tse>Später in Einstellungen prüfen</button></div><div class="setup-actions"><button class="button button-secondary" type="button" data-setup-back>Zurück</button><button class="setup-cancel" type="button" data-setup-cancel>Assistent abbrechen</button></div>`;
      case 10: return `${setupSummary()}${setupActions("Weiter zum Testbeleg")}`;
      case 11: return `<div class="setup-info-card"><h2>Jetzt einen Testbeleg erstellen</h2><p>Die Vorschau verwendet deine aktuellen Angaben, erzeugt aber keinen echten Beleg.</p><button class="button button-secondary" type="button" data-setup-test>${state.setupTestPreviewVisible ? "Vorschau aktualisieren" : "Testbeleg-Vorschau anzeigen"}</button></div>${state.setupTestPreviewVisible ? setupTestReceipt() : ""}${setupActions(state.setupTestPreviewVisible ? "Einrichtung abschließen" : "Testbeleg überspringen")}`;
      case 12: return `<div class="setup-finished"><div class="setup-welcome-symbol" aria-hidden="true">✓</div><h2>FRECKA ist startklar.</h2><p>Du kannst jetzt direkt deinen ersten Beleg erstellen.</p><small>Die Daten werden in diesem Prototyp nach einem Reload zurückgesetzt.</small><button class="button button-primary" type="button" data-action="new-receipt">Jetzt ersten Beleg erstellen</button><button class="button button-secondary" type="button" data-route="settings">Einstellungen öffnen</button></div>`;
      default: return "";
    }
  }

  function attachSetupStepBehavior() {
    const form = document.getElementById("setupWizardForm");
    form?.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener("change", () => {
      const alternate = form.querySelector('input[name="mode"]:checked')?.value === "alternate";
      const fields = form.querySelector(".setup-location-fields");
      if (fields) fields.hidden = !alternate;
    }));
    form?.querySelectorAll('input[name="taxStatus"]').forEach(input => input.addEventListener("change", () => {
      const rates = form.querySelector(".setup-tax-rate");
      if (rates) rates.hidden = input.value !== "vat";
    }));
    const updateNumber = () => {
      const prefix = String(document.getElementById("setupReceiptPrefix")?.value || "–").trim() || "–";
      const number = Math.max(1, Number(document.getElementById("setupReceiptNext")?.value || 1));
      const preview = document.getElementById("setupReceiptPreview");
      if (preview) preview.textContent = `${prefix}-${String(Math.trunc(number)).padStart(6, "0")}`;
    };
    document.getElementById("setupReceiptPrefix")?.addEventListener("input", updateNumber);
    document.getElementById("setupReceiptNext")?.addEventListener("input", updateNumber);
  }

  function renderSetupWizard() {
    const progress = Math.round((state.setupStep / setupSteps.length) * 100);
    mainContent.innerHTML = `<section class="flow-page setup-page page-enter">
      <header class="setup-head"><div><p class="eyebrow">Ersteinrichtung</p><span>Schritt ${state.setupStep} von ${setupSteps.length}</span></div><div class="setup-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${setupSteps.length}" aria-valuenow="${state.setupStep}"><span style="width:${progress}%"></span></div><h1>${escapeHtml(setupSteps[state.setupStep - 1])}</h1></header>
      ${state.setupNotice ? `<div class="settings-save-notice is-error" role="alert">${escapeHtml(state.setupNotice)}</div>` : ""}
      <form id="setupWizardForm" class="settings-form setup-form" data-setup-step="${state.setupStep}">${setupStepContent()}</form>
    </section>`;
    attachSetupStepBehavior();
  }

  function saveSetupStep(formData, validate = true) {
    if (state.setupStep === 2) {
      const required = ["name", "owner", "street", "zip", "city"];
      if (validate && required.some(name => !String(formData.get(name) || "").trim())) return "Bitte alle Pflichtangaben zum Unternehmen ausfüllen.";
      applyCompanyForm(formData);
    }
    if (state.setupStep === 3) {
      const alternate = formData.get("mode") === "alternate";
      if (validate && alternate && ["name", "street", "zip", "city"].some(name => !String(formData.get(name) || "").trim())) return "Bitte den abweichenden Leistungsort vollständig angeben.";
      applyServiceLocationForm(formData);
    }
    if (state.setupStep === 4) {
      const status = String(formData.get("taxStatus") || "undecided");
      const defaultRate = Number(formData.get("defaultTaxRate"));
      if (validate && status === "vat" && ![7, 19].includes(defaultRate)) return "Bitte einen Standard-Steuersatz auswählen.";
      data.taxSettings.status = ["vat", "small-business", "undecided"].includes(status) ? status : "undecided";
      if (status === "vat") {
        data.taxSettings.defaultRate = defaultRate;
        data.company.defaultTaxRate = defaultRate;
        data.taxSettings.rates.forEach(rate => { rate.active = rate.rate === defaultRate || rate.active; });
      }
    }
    if (state.setupStep === 5) {
      const yearPrefix = String(formData.get("yearPrefix") || "").trim();
      const nextNumber = Number(formData.get("nextNumber"));
      const error = receiptNumberValidation(yearPrefix, nextNumber);
      if (validate && error) return error;
      if (!error) {
        data.receiptSettings.yearPrefix = yearPrefix;
        data.receiptSettings.nextNumber = nextNumber;
        state.receiptCounter = nextNumber - 1;
      }
    }
    if (state.setupStep === 6 && !activeNormalPaymentChoices().length) return "Mindestens eine normale Zahlungsart muss aktiv bleiben.";
    if (state.setupStep === 7) {
      const error = applyBusinessAreaForm(formData);
      if (validate && error) return error;
    }
    if (state.setupStep === 8) {
      data.receiptSettings.footerText = String(formData.get("footerText") || "").trim();
      data.receiptSettings.thankYouText = String(formData.get("thankYouText") || "").trim();
    }
    return "";
  }

  function renderSettings() {
    mainContent.innerHTML = `<section class="settings-overview page-enter">
      <header class="settings-head">
        <p class="eyebrow">Verwaltung</p>
        <h1>Einstellungen</h1>
        <p>Grunddaten des Betriebs zentral verwalten.</p>
      </header>
      ${state.setupFirstStartVisible ? setupStartHint() : ""}
      <button class="button button-secondary setup-restart" type="button" data-action="setup-start">${state.setupCompleted ? "Ersteinrichtung erneut starten" : "Ersteinrichtung starten"}</button>
      <div class="settings-list" aria-label="Einstellungsbereiche">
        ${settingsSections.map(section => section.available ? `<button class="settings-entry" type="button" data-route="${escapeHtml(section.id)}">
          <span class="settings-entry-icon" aria-hidden="true">${escapeHtml(section.icon)}</span>
          <span><strong>${escapeHtml(section.title)}</strong><small>${escapeHtml(section.note)}</small></span>
          <span class="settings-entry-arrow" aria-hidden="true">›</span>
        </button>` : `<article class="settings-entry is-pending" aria-label="${escapeHtml(section.title)} – noch nicht verfügbar">
          <span class="settings-entry-icon" aria-hidden="true">${escapeHtml(section.icon)}</span>
          <span><strong>${escapeHtml(section.title)}</strong><small>${escapeHtml(section.note)}</small></span>
          <span class="settings-entry-tools">${section.help ? helpButton(section.help, section.title) : ""}<span class="settings-pending-badge">Geplant</span></span>
        </article>`).join("")}
      </div>
      <p class="prototype-note">Änderungen an den bedienbaren Bereichen bleiben nur bis zum Neuladen im Arbeitsspeicher.</p>
    </section>`;
  }

  function renderCompanySettings() {
    const company = data.company;
    mainContent.innerHTML = `<section class="flow-page settings-form-page page-enter">
      <div class="flow-head compact-flow-head">
        <button class="button button-back" type="button" data-route="settings"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Einstellungen</p>
        <h1 class="flow-title">Unternehmensdaten</h1>
        <p class="page-copy">Diese Angaben werden für neue Belege und Gutscheine vorbereitet.</p>
      </div>
      ${state.settingsNotice ? `<div class="settings-save-notice" role="status">${escapeHtml(state.settingsNotice)}</div>` : ""}
      <form id="companySettingsForm" class="settings-form">
        <section class="settings-form-card">
          ${cardTitle("Unternehmensdaten", "company")}
          <label class="setting-field full"><span>Firmenname oder Geschäftsbezeichnung</span><input name="name" autocomplete="organization" required value="${escapeHtml(company.name || "")}"></label>
          <label class="setting-field full"><span>Vor- und Nachname des Inhabers</span><input name="owner" autocomplete="name" value="${escapeHtml(company.owner || "")}"></label>
          <label class="setting-field full"><span>Straße und Hausnummer</span><input name="street" autocomplete="street-address" value="${escapeHtml(company.street || "")}"></label>
          <label class="setting-field"><span>PLZ</span><input name="zip" inputmode="numeric" autocomplete="postal-code" value="${escapeHtml(company.zip || "")}"></label>
          <label class="setting-field"><span>Ort</span><input name="city" autocomplete="address-level2" value="${escapeHtml(company.city || "")}"></label>
          <label class="setting-field full"><span>Land</span><input name="country" autocomplete="country-name" value="${escapeHtml(company.country || "Deutschland")}"></label>
        </section>
        <section class="settings-form-card">
          <h2>Kontakt und Belegangaben</h2>
          <label class="setting-field"><span>Telefon <small>optional</small></span><input name="phone" type="tel" autocomplete="tel" value="${escapeHtml(company.phone || "")}"></label>
          <label class="setting-field"><span>E-Mail <small>optional</small></span><input name="email" type="email" inputmode="email" autocomplete="email" value="${escapeHtml(company.email || "")}"></label>
          <label class="setting-field"><span>Steuernummer</span><input name="taxNumber" autocomplete="off" value="${escapeHtml(company.taxNumber || "")}"></label>
          <label class="setting-field"><span>USt-IdNr. <small>optional</small></span><input name="vatId" autocomplete="off" value="${escapeHtml(company.vatId || "")}"></label>
        </section>
        <section class="settings-form-card settings-logo-card">
          <div class="settings-logo-placeholder" aria-hidden="true">Logo</div>
          <div class="settings-logo-copy"><h2>Unternehmenslogo</h2><p>Der Upload wird in diesem Prototyp nur simuliert.</p><button class="button button-secondary logo-simulation-button" type="button" data-action="logo-simulation">Logo auswählen (Simulation)</button></div>
          <div class="logo-recommendations"><strong>Empfohlene Formate</strong><span>PNG · JPG · SVG</span><strong>Empfohlene Größe</strong><span>quadratisch · mindestens 600 × 600 Pixel · maximal 5 MB</span><small>Transparenter PNG-Hintergrund empfohlen.</small></div>
        </section>
        <p class="prototype-note">Das Speichern gilt nur für diese Sitzung. Nach einem Reload stehen wieder die Demo-Daten bereit.</p>
        <button class="button button-primary settings-save" type="submit">Änderungen speichern</button>
      </form>
    </section>`;
  }

  function renderServiceLocationSettings() {
    const location = currentServiceLocation();
    const alternate = location.mode === "alternate";
    mainContent.innerHTML = `<section class="flow-page settings-form-page page-enter">
      <div class="flow-head compact-flow-head">
        <button class="button button-back" type="button" data-route="settings"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Einstellungen</p>
        <h1 class="flow-title">Leistungsort</h1>
        <p class="page-copy">Für Version 1.0 wird genau ein Standard-Leistungsort verwendet.</p>
      </div>
      ${state.serviceLocationNotice ? `<div class="settings-save-notice" role="status">${escapeHtml(state.serviceLocationNotice)}</div>` : ""}
      <form id="serviceLocationForm" class="settings-form">
        <section class="settings-form-card">
          ${cardTitle("Leistungsort", "location")}
          <fieldset class="settings-location-choice">
            <legend class="sr-only">Wo werden die Leistungen normalerweise erbracht?</legend>
            <strong class="settings-question">Wo werden die Leistungen normalerweise erbracht?</strong>
            <label><input type="radio" name="mode" value="company" ${alternate ? "" : "checked"}><span><strong>An der Unternehmensanschrift</strong><small>Gutscheine verwenden die hinterlegte Unternehmensanschrift.</small></span></label>
            <label><input type="radio" name="mode" value="alternate" ${alternate ? "checked" : ""}><span><strong>An einem abweichenden Leistungsort</strong><small>Zum Beispiel in einem Salon oder einer Praxis.</small></span></label>
          </fieldset>
        </section>
        <div class="settings-company-location-note" ${alternate ? "hidden" : ""}>Auf neuen Gutscheinen wird die Unternehmensanschrift als Einlöseort verwendet. Es wird keine zweite Adresse gespeichert.</div>
        <fieldset class="settings-form-card settings-location-fields" ${alternate ? "" : "hidden"}>
          <legend>Abweichender Leistungsort</legend>
          <label class="setting-field full"><span>Bezeichnung des Ortes</span><input name="name" placeholder="z. B. Salon XY" value="${escapeHtml(location.name || "")}"></label>
          <label class="setting-field full"><span>Straße und Hausnummer</span><input name="street" autocomplete="street-address" value="${escapeHtml(location.street || "")}"></label>
          <label class="setting-field"><span>PLZ</span><input name="zip" inputmode="numeric" autocomplete="postal-code" value="${escapeHtml(location.zip || "")}"></label>
          <label class="setting-field"><span>Ort</span><input name="city" autocomplete="address-level2" value="${escapeHtml(location.city || "")}"></label>
          <label class="setting-field full"><span>Telefon <small>optional</small></span><input name="phone" type="tel" autocomplete="tel" value="${escapeHtml(location.phone || "")}"></label>
          <label class="setting-field full"><span>Hinweis für Gutscheine <small>optional</small></span><textarea name="voucherNote" rows="3" placeholder="z. B. Einlösbar nach Terminvereinbarung">${escapeHtml(location.voucherNote || "")}</textarea></label>
        </fieldset>
        <p class="prototype-note">Keine Kartenintegration, Standortberechtigung oder Verwaltung mehrerer Orte. Änderungen gehen beim Neuladen verloren.</p>
        <button class="button button-primary settings-save" type="submit">Leistungsort speichern</button>
      </form>
    </section>`;

    const form = document.getElementById("serviceLocationForm");
    form?.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener("change", () => {
      const showAlternate = form.querySelector('input[name="mode"]:checked')?.value === "alternate";
      form.querySelector(".settings-location-fields").hidden = !showAlternate;
      form.querySelector(".settings-company-location-note").hidden = showAlternate;
    }));
  }

  function renderTaxSettings() {
    const settings = data.taxSettings;
    const receiptSettings = data.receiptSettings;
    const previewNumber = `${receiptSettings.yearPrefix}-${String(receiptSettings.nextNumber).padStart(6, "0")}`;
    mainContent.innerHTML = `<section class="flow-page settings-form-page page-enter">
      <div class="flow-head compact-flow-head">
        <button class="button button-back" type="button" data-route="settings"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Einstellungen</p>
        <h1 class="flow-title">Steuern und Belegangaben</h1>
        <p class="page-copy">Zentrale Vorgaben für neue Belege. Keine automatische rechtliche Bewertung.</p>
      </div>
      ${state.taxSettingsNotice ? `<div class="settings-save-notice ${state.taxSettingsNotice.startsWith("Bitte") ? "is-error" : ""}" role="status">${escapeHtml(state.taxSettingsNotice)}</div>` : ""}
      <form id="taxSettingsForm" class="settings-form">
        <section class="settings-form-card settings-single-column">
          ${cardTitle("Steuerstatus", "taxes")}
          <fieldset class="settings-option-list">
            <legend class="sr-only">Steuerstatus</legend>
            ${[
              ["vat", "Umsatzsteuer wird berechnet"],
              ["small-business", "Kleinunternehmerregelung"],
              ["undecided", "Noch nicht festgelegt / mit Steuerberatung klären"]
            ].map(([value, label]) => `<label><input type="radio" name="taxStatus" value="${value}" ${settings.status === value ? "checked" : ""}><span>${label}</span></label>`).join("")}
          </fieldset>
          <p class="settings-neutral-note">Bitte die Auswahl mit der Steuerberatung abstimmen. FRECKA trifft keine rechtliche Entscheidung.</p>
        </section>

        <section class="settings-form-card settings-single-column">
          <h2>Standard-Steuersätze</h2>
          <div class="tax-rate-list">
            ${settings.rates.map(rate => `<div class="tax-rate-row">
              <label><input type="checkbox" name="activeTaxRate" value="${rate.rate}" ${rate.active ? "checked" : ""}><span>${rate.rate} % aktiv</span></label>
              <label><input type="radio" name="defaultTaxRate" value="${rate.rate}" ${settings.defaultRate === rate.rate ? "checked" : ""}><span>Standard</span></label>
            </div>`).join("")}
          </div>
          <p class="settings-neutral-note">Gutscheinverkäufe bleiben steuerlich offen und werden hier nicht automatisch bewertet.</p>
        </section>

        <section class="settings-form-card">
          <h2>Belegnummern</h2>
          <label class="setting-field"><span>Jahrespräfix</span><input id="receiptYearPrefix" name="yearPrefix" inputmode="numeric" maxlength="4" value="${escapeHtml(receiptSettings.yearPrefix)}"></label>
          <label class="setting-field"><span>Nächste Belegnummer</span><input id="receiptNextNumber" name="nextNumber" type="number" min="1" step="1" value="${escapeHtml(receiptSettings.nextNumber)}"></label>
          <div class="receipt-number-preview full"><span>Vorschau</span><strong id="receiptNumberPreview">${escapeHtml(previewNumber)}</strong><small>Normale Belege und Gutscheinverkäufe verwenden denselben Nummernkreis.</small></div>
        </section>

        <section class="settings-form-card settings-single-column">
          ${cardTitle("Belegtexte", "receiptTexts")}
          <label class="setting-field full"><span>Fußtext <small>optional</small></span><textarea name="footerText" rows="3" maxlength="240" placeholder="Kurzer Hinweis am Belegende">${escapeHtml(receiptSettings.footerText || "")}</textarea></label>
          <label class="setting-field full"><span>Dankestext <small>optional</small></span><input name="thankYouText" maxlength="120" value="${escapeHtml(receiptSettings.thankYouText || "")}"></label>
        </section>

        <section class="settings-fixed-values">
          <div><span>Währung</span><strong>EUR</strong></div>
          <div><span>Sprache</span><strong>Deutsch</strong></div>
        </section>
        <div class="settings-tse-note">TSE-Einrichtung folgt in einem eigenen Assistenten.</div>
        <p class="prototype-note">Nur In-Memory-Prototyp. Keine Steuerautomatik, Fiskalisierung oder TSE-Verbindung.</p>
        <button class="button button-primary settings-save" type="submit">Einstellungen speichern</button>
      </form>
    </section>`;

    const updateReceiptNumberPreview = () => {
      const prefix = String(document.getElementById("receiptYearPrefix")?.value || "").trim() || "–";
      const next = Math.max(1, Number(document.getElementById("receiptNextNumber")?.value || 1));
      const preview = document.getElementById("receiptNumberPreview");
      if (preview) preview.textContent = `${prefix}-${String(Math.trunc(next)).padStart(6, "0")}`;
    };
    document.getElementById("receiptYearPrefix")?.addEventListener("input", updateReceiptNumberPreview);
    document.getElementById("receiptNextNumber")?.addEventListener("input", updateReceiptNumberPreview);
  }

  function renderPaymentSettings() {
    mainContent.innerHTML = `<section class="flow-page settings-form-page page-enter">
      <div class="flow-head compact-flow-head">
        <button class="button button-back" type="button" data-route="settings"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Einstellungen</p>
        <h1 class="flow-title">Zahlungsarten</h1>
        <p class="page-copy">Aktive Zahlungsarten erscheinen im aktuellen Browserlauf im Belegabschluss.</p>
      </div>
      ${state.paymentSettingsNotice ? `<div class="settings-save-notice ${state.paymentSettingsNotice.startsWith("Mindestens") ? "is-error" : ""}" role="status">${escapeHtml(state.paymentSettingsNotice)}</div>` : ""}
      <div class="settings-standalone-title">${cardTitle("Zahlungsarten", "payments")}</div>
      <div class="payment-settings-list" aria-label="Zahlungsarten und Reihenfolge">
        ${data.paymentChoices.map((choice, index) => `<article class="payment-setting-row ${choice.id === "later" ? "is-later" : ""}">
          <span class="payment-setting-icon" aria-hidden="true">${escapeHtml(choice.icon)}</span>
          <span class="payment-setting-name"><strong>${escapeHtml(choice.title)}</strong>${choice.id === "later" ? `<small>Getrennter Fall: Zahlung erfolgt später</small>` : choice.id === "voucher" ? `<small>Gutschein aus dem Gutscheinsystem</small>` : `<small>Normale Zahlungsart</small>`}</span>
          <label class="payment-setting-toggle"><input type="checkbox" data-payment-toggle="${escapeHtml(choice.id)}" ${choice.active !== false ? "checked" : ""}><span>${choice.active !== false ? "Aktiv" : "Inaktiv"}</span></label>
          <span class="payment-order-actions">
            <button type="button" data-payment-move="${escapeHtml(choice.id)}" data-direction="up" aria-label="${escapeHtml(choice.title)} nach oben" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-payment-move="${escapeHtml(choice.id)}" data-direction="down" aria-label="${escapeHtml(choice.title)} nach unten" ${index === data.paymentChoices.length - 1 ? "disabled" : ""}>↓</button>
          </span>
        </article>`).join("")}
      </div>
      <p class="prototype-note">Mindestens eine normale Zahlungsart bleibt aktiv. Keine Verbindung zu Zahlungsanbietern.</p>
    </section>`;
  }

  function renderBusinessAreaSettings() {
    mainContent.innerHTML = `<section class="flow-page settings-form-page page-enter">
      <div class="flow-head compact-flow-head">
        <button class="button button-back" type="button" data-route="settings"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">Einstellungen</p>
        <h1 class="flow-title">Geschäftsbereiche</h1>
        <p class="page-copy">Fachliche Bereiche innerhalb dieser gebuchten Instanz verwalten.</p>
      </div>
      ${state.businessAreaSettingsNotice ? `<div class="settings-save-notice ${state.businessAreaSettingsNotice.startsWith("Bitte") || state.businessAreaSettingsNotice.startsWith("Mindestens") ? "is-error" : ""}" role="status">${escapeHtml(state.businessAreaSettingsNotice)}</div>` : ""}
      <div class="settings-standalone-title">${cardTitle("Geschäftsbereiche", "business")}</div>
      <div class="business-model-note"><strong>Eine Instanz entspricht einer Filiale.</strong><span>Friseur, Podologie oder weitere Angebote sind Geschäftsbereiche – keine Filialen.</span></div>
      <form id="businessAreaSettingsForm" class="settings-form">
        <div class="business-area-list">
          ${data.businessAreas.map(area => `<section class="business-area-row">
            <label class="setting-field"><span>Name</span><input name="areaLabel:${escapeHtml(area.id)}" value="${escapeHtml(area.label)}" required></label>
            <div class="business-area-controls">
              <label><input type="checkbox" name="activeBusinessArea" value="${escapeHtml(area.id)}" ${area.active !== false ? "checked" : ""}><span>Aktiv</span></label>
              <label><input type="radio" name="defaultBusinessArea" value="${escapeHtml(area.id)}" ${area.isDefault ? "checked" : ""}><span>Standard</span></label>
            </div>
          </section>`).join("")}
        </div>
        <button class="button button-secondary business-area-add" type="button" data-action="business-area-add">＋ Geschäftsbereich</button>
        <p class="prototype-note">Leistungen, Produkte und vorhandene Belege bleiben ihrem bisherigen Bereich zugeordnet. Keine Filial- oder Rechteverwaltung.</p>
        <button class="button button-primary settings-save" type="submit">Geschäftsbereiche speichern</button>
      </form>
    </section>`;
  }

  function renderHelpLearning() {
    const items = [
      ["↗", "Erste Schritte", "Ein kurzer Einstieg folgt später."],
      ["?", "Häufige Fragen", "Antworten werden noch ergänzt."],
      ["↥", "Datensicherung", "Anleitung zur verschlüsselten Sicherung folgt."],
      ["T", "TSE", "Fachliche Vorbereitung und Einrichtung folgen."],
      ["✉", "Kontakt", "Kontaktmöglichkeiten werden später ergänzt."]
    ];
    mainContent.innerHTML = `<section class="flow-page settings-form-page page-enter">
      <div class="flow-head compact-flow-head"><button class="button button-back" type="button" data-route="settings"><span aria-hidden="true">←</span> Zurück</button><p class="eyebrow">Einstellungen</p><h1 class="flow-title">Hilfe & Lernen</h1><p class="page-copy">Hier entsteht eine kompakte Hilfe direkt in FRECKA.</p></div>
      <div class="help-learning-list">${items.map(([icon, title, note]) => `<article><span aria-hidden="true">${escapeHtml(icon)}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(note)}</small></div><em>Demnächst</em></article>`).join("")}</div>
      <p class="prototype-note">Noch keine Inhalte, Videos oder externe Hilfe.</p>
    </section>`;
  }

  function renderPlaceholder(routeKey) {
    const page = data.placeholders[routeKey];
    const tools = routeKey === "settings" ? `<div class="prototype-tools"><label><input id="toggleOpenReceipt" type="checkbox" ${state.openReceiptVisible ? "checked" : ""}> Offenen Beleg auf der Startseite simulieren</label></div>` : "";
    mainContent.innerHTML = `<div class="placeholder-page page-enter"><section class="placeholder-card"><div class="placeholder-icon" aria-hidden="true">${page.icon}</div><p class="eyebrow">UX-019 Platzhalter</p><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.note)}</p>${tools}<p class="build-label">${data.version} · Build ${data.build}</p></section></div>`;
    document.getElementById("toggleOpenReceipt")?.addEventListener("change", event => { state.openReceiptVisible = event.target.checked; });
  }

  function renderRoute(pushHistory = true) {
    document.body.classList.toggle("catalog-mode", state.route === "catalog");
    document.body.classList.toggle("receipt-preview-mode", state.route === "receipt-preview");
    document.body.classList.toggle("work-mode", [
      "catalog",
      "edit-cart",
      "checkout",
      "customer-picker",
      "customer-new",
      "customer-edit",
      "customer-detail",
      "receipt-preview",
      "voucher-detail",
      "voucher-preview",
      "voucher-sale",
      "voucher-sale-success",
      "settings-company",
      "settings-location",
      "settings-taxes",
      "settings-payments",
      "settings-business-areas",
      "settings-help",
      "setup-wizard"
    ].includes(state.route));
    if (state.route === "home") renderHome();
    else if (state.route === "receipts") renderReceipts();
    else if (state.route === "receipt-detail") renderReceiptDetail();
    else if (state.route === "receipt-credit") renderReceiptCredit();
    else if (state.route === "catalog") renderCatalog();
    else if (state.route === "edit-cart") renderCartEditor();
    else if (state.route === "checkout") renderCheckout();
    else if (state.route === "customers") renderCustomers(false);
    else if (state.route === "customer-picker") renderCustomers(true);
    else if (state.route === "customer-new") renderCustomerNew();
    else if (state.route === "customer-edit") renderCustomerEdit();
    else if (state.route === "customer-detail") renderCustomerDetail();
    else if (state.route === "receipt-success") renderReceiptSuccess();
    else if (state.route === "receipt-preview") renderReceiptPreview();
    else if (state.route === "vouchers") renderVouchers();
    else if (state.route === "voucher-detail") renderVoucherDetail();
    else if (state.route === "voucher-preview") renderVoucherPreview();
    else if (state.route === "voucher-sale") renderVoucherSale();
    else if (state.route === "voucher-sale-success") renderVoucherSaleSuccess();
    else if (state.route === "settings") renderSettings();
    else if (state.route === "settings-company") renderCompanySettings();
    else if (state.route === "settings-location") renderServiceLocationSettings();
    else if (state.route === "settings-taxes") renderTaxSettings();
    else if (state.route === "settings-payments") renderPaymentSettings();
    else if (state.route === "settings-business-areas") renderBusinessAreaSettings();
    else if (state.route === "settings-help") renderHelpLearning();
    else if (state.route === "setup-wizard") renderSetupWizard();
    else renderPlaceholder(state.route);
    const isFlow = flowRoutes.has(state.route);
    bottomNav.hidden = isFlow;
    document.querySelector(".app-shell").style.paddingBottom = isFlow ? "calc(24px + var(--safe-bottom))" : "calc(88px + var(--safe-bottom))";
    document.querySelectorAll(".nav-item").forEach(button => {
      const active = button.dataset.route === state.route;
      button.classList.toggle("is-active", active);
      active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current");
    });
    mainContent.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
    if (pushHistory) {
      const hash = `#/${state.route}`;
      if (window.location.hash !== hash) history.pushState({ route: state.route }, "", hash);
    }
  }

  function navigate(route, pushHistory = true) {
    state.route = validRoutes.has(route) ? route : "home";
    renderRoute(pushHistory);
  }
  function startNewReceipt() {
    state.cart = [];
    state.customerChoice = "none";
    state.selectedCustomerId = null;
    state.paymentChoice = preferredNormalPaymentId() || activePaymentChoices()[0]?.id || "cash";
    resetCheckoutVoucher();
    state.checkoutSubmitting = false;
    state.activeCategory = "Favoriten";
    state.search = "";
    state.cartExpanded = false;
    navigate("catalog");
  }
  function toggleItem(id) {
    const product = (data.catalog[state.activeBusinessArea] ?? []).find(item => item.id === id);
    if (!product) return;
    if (product.type === "voucher") {
      startVoucherSale("catalog", product.price);
      return;
    }
    const existing = state.cart.find(item => item.id === id);
    if (existing) {
      state.cart = state.cart.filter(item => item.id !== id);
      if (!state.cart.length) state.cartExpanded = false;
      renderCatalog();
      return;
    }
    state.cart.push({
      ...product,
      quantity: 1,
      basePrice: product.price,
      priceOverride: null,
      discountType: "percent",
      discountPercent: 0,
      discountAmount: 0
    });
    renderCatalog();
  }
  function changeQuantity(id, delta) {
    const item = state.cart.find(entry => entry.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) state.cart = state.cart.filter(entry => entry.id !== id);
    if (!state.cart.length) state.cartExpanded = false;
    renderCatalog();
  }
  function removeItem(id) {
    state.cart = state.cart.filter(entry => entry.id !== id);
    if (!state.cart.length) state.cartExpanded = false;
    renderCatalog();
  }
  function openConfirmDialog({ title, text, confirmLabel, action, danger = true }) {
    state.pendingDialogAction = action;
    dialogTitle.textContent = title;
    dialogText.textContent = text;
    confirmDiscard.textContent = confirmLabel;
    confirmDiscard.className = `button ${danger ? "button-danger" : "button-primary"}`;
    dialogBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    cancelDiscard.focus();
  }

  function openDiscardDialog() {
    openConfirmDialog({
      title: "Offenen Beleg verwerfen?",
      text: "Der simulierte Entwurf wird entfernt. Es werden keine echten Daten gelöscht.",
      confirmLabel: "Beleg verwerfen",
      action: "discard-open-receipt",
      danger: true
    });
  }

  function closeDiscardDialog() {
    state.pendingDialogAction = null;
    dialogBackdrop.hidden = true;
    document.body.style.overflow = "";
  }

  document.addEventListener("click", event => {
    const contextHelp = event.target.closest("[data-help]");
    if (contextHelp) {
      openContextHelp(contextHelp.dataset.help);
      return;
    }
    const templateChoice = event.target.closest("[data-template-choice]");
    if (templateChoice) {
      const choice = templateChoice.dataset.templateChoice;
      if (choice === "custom") addBusinessArea("Neuer Geschäftsbereich");
      else openBusinessTemplateConfirmation(choice);
      return;
    }
    const sheetAction = event.target.closest("[data-action]")?.dataset.action;
    if (sheetAction === "template-preview") {
      openBusinessTemplateConfirmation(state.pendingBusinessTemplate, true);
      return;
    }
    if (sheetAction === "template-use") {
      addBusinessArea(state.pendingBusinessTemplate || "Neuer Geschäftsbereich", true);
      return;
    }
    if (sheetAction === "template-empty") {
      addBusinessArea(state.pendingBusinessTemplate || "Neuer Geschäftsbereich");
      return;
    }
    if (sheetAction === "logo-simulation") {
      openBottomSheet("Unternehmenslogo", `<div class="context-help-copy"><p>Die Dateiauswahl ist in diesem UX-Prototyp nur simuliert.</p><p>Es wird keine Datei geöffnet, übertragen oder gespeichert.</p></div>`);
      return;
    }
    const category = event.target.closest("[data-category]");
    if (category) { state.activeCategory = category.dataset.category; state.search = ""; renderCatalog(); return; }
    const toggle = event.target.closest("[data-toggle-item]");
    if (toggle) { toggleItem(toggle.dataset.toggleItem); return; }
    const increase = event.target.closest("[data-increase-item]");
    if (increase) { changeQuantity(increase.dataset.increaseItem, 1); return; }
    const decrease = event.target.closest("[data-decrease-item]");
    if (decrease) { changeQuantity(decrease.dataset.decreaseItem, -1); return; }
    const remove = event.target.closest("[data-remove-item]");
    if (remove) { removeItem(remove.dataset.removeItem); return; }
    const editCustomer = event.target.closest("[data-edit-customer]");
    if (editCustomer) {
      state.editingCustomerId = editCustomer.dataset.editCustomer;
      state.customerDetailId = editCustomer.dataset.editCustomer;
      navigate("customer-edit");
      return;
    }
    const openCustomer = event.target.closest("[data-open-customer]");
    if (openCustomer) {
      state.customerDetailId = openCustomer.dataset.openCustomer;
      state.customerHistoryExpanded = false;
      state.customerHistoryOpenNumber = null;
      navigate("customer-detail");
      return;
    }
    const selectCustomer = event.target.closest("[data-select-customer]");
    if (selectCustomer) {
      if (state.customerPickerContext === "voucher") {
        state.voucherSaleCustomerId = selectCustomer.dataset.selectCustomer;
        state.customerSearch = "";
        navigate("voucher-sale");
      } else {
        state.selectedCustomerId = selectCustomer.dataset.selectCustomer;
        state.customerChoice = "existing";
        navigate("checkout");
      }
      return;
    }
    if (event.target.closest("[data-select-no-customer]")) {
      if (state.customerPickerContext === "voucher") {
        state.voucherSaleCustomerId = null;
        state.customerSearch = "";
        navigate("voucher-sale");
      } else {
        state.selectedCustomerId = null;
        state.customerChoice = "none";
        if(state.cart.length) navigate("checkout"); else renderCustomers(false);
      }
      return;
    }
    const receiptFilter = event.target.closest("[data-receipt-filter]");
    if (receiptFilter) {
      state.receiptFilter = receiptFilter.dataset.receiptFilter;
      renderReceipts();
      return;
    }
    const openLinkedVoucher = event.target.closest("[data-open-linked-voucher]");
    if (openLinkedVoucher) {
      const voucher = voucherByReference(openLinkedVoucher.dataset.openLinkedVoucher);
      if (!voucher) return;
      state.voucherDetailReference = voucher.reference;
      state.voucherNotice = "";
      navigate("voucher-detail");
      return;
    }
    const previewReceipt = event.target.closest("[data-preview-receipt]");
    if (previewReceipt) {
      const receipt = receiptByNumber(previewReceipt.dataset.previewReceipt);
      if (!receipt) return;
      state.receiptDetailNumber = receipt.number;
      state.receiptPreviewNumber = receipt.number;
      state.receiptPreviewReturnRoute = "receipt-detail";
      navigate("receipt-preview");
      return;
    }
    const openReceipt = event.target.closest("[data-open-receipt]");
    if (openReceipt) {
      state.receiptDetailNumber = openReceipt.dataset.openReceipt;
      state.successNotice = "";
      navigate("receipt-detail");
      return;
    }
    const creditMode = event.target.closest("[data-credit-mode]");
    if (creditMode) {
      state.creditMode = creditMode.dataset.creditMode;
      renderReceiptCredit();
      return;
    }
    if (event.target.closest("[data-toggle-customer-history-section]")) {
      state.customerHistoryExpanded = !state.customerHistoryExpanded;
      if (!state.customerHistoryExpanded) state.customerHistoryOpenNumber = null;
      renderCustomerDetail();
      return;
    }
    const historyToggle = event.target.closest("[data-toggle-customer-history]");
    if (historyToggle) {
      const number = historyToggle.dataset.toggleCustomerHistory;
      state.customerHistoryOpenNumber = state.customerHistoryOpenNumber === number ? null : number;
      renderCustomerDetail();
      return;
    }
    const startCustomerReceipt = event.target.closest("[data-start-customer-receipt]");
    if (startCustomerReceipt) { startNewReceipt(); state.selectedCustomerId = startCustomerReceipt.dataset.startCustomerReceipt; state.customerChoice="existing"; return; }
    const customer = event.target.closest("[data-customer-choice]");
    if (customer) { state.customerChoice = customer.dataset.customerChoice; renderCheckout(); return; }
    const payment = event.target.closest("[data-payment-choice]");
    if (payment) {
      state.paymentChoice = payment.dataset.paymentChoice;
      if (state.paymentChoice !== "voucher") resetCheckoutVoucher();
      renderCheckout();
      return;
    }
    const checkoutVoucher = event.target.closest("[data-select-checkout-voucher]");
    if (checkoutVoucher) {
      chooseCheckoutVoucher(voucherByReference(checkoutVoucher.dataset.selectCheckoutVoucher));
      renderCheckout();
      return;
    }
    const remainderPayment = event.target.closest("[data-voucher-remainder-payment]");
    if (remainderPayment) {
      state.checkoutVoucherRemainderPayment = remainderPayment.dataset.voucherRemainderPayment;
      renderCheckout();
      return;
    }
    const editIncrease = event.target.closest("[data-edit-increase]");
    if (editIncrease) {
      const item = state.cart.find(entry => entry.id === editIncrease.dataset.editIncrease);
      if (item && item.quantityAdjustable) item.quantity += 1;
      renderCartEditor();
      return;
    }
    const editDecrease = event.target.closest("[data-edit-decrease]");
    if (editDecrease) {
      const item = state.cart.find(entry => entry.id === editDecrease.dataset.editDecrease);
      if (item && item.quantityAdjustable && item.quantity > 1) item.quantity -= 1;
      renderCartEditor();
      return;
    }
    const discountTypeButton = event.target.closest("[data-discount-type]");
    if (discountTypeButton) {
      const item = state.cart.find(entry => entry.id === discountTypeButton.dataset.itemId);
      if (item) {
        item.discountType = discountTypeButton.dataset.discountType;
        if (item.discountType === "percent") item.discountAmount = 0;
        else item.discountPercent = 0;
      }
      renderCartEditor();
      return;
    }

    const editPrice = event.target.closest("[data-edit-price]");
    if (editPrice) {
      state.priceEditorId = state.priceEditorId === editPrice.dataset.editPrice ? null : editPrice.dataset.editPrice;
      renderCartEditor();
      return;
    }
    const priceReset = event.target.closest("[data-price-reset]");
    if (priceReset) {
      const item = state.cart.find(entry => entry.id === priceReset.dataset.priceReset);
      if (item) {
        item.price = item.basePrice;
        item.priceOverride = null;
        item.discountPercent = 0;
      }
      state.priceEditorId = null;
      renderCartEditor();
      return;
    }
    const editRemove = event.target.closest("[data-edit-remove]");
    if (editRemove) {
      state.cart = state.cart.filter(entry => entry.id !== editRemove.dataset.editRemove);
      if (state.priceEditorId === editRemove.dataset.editRemove) state.priceEditorId = null;
      if (state.cart.length) renderCartEditor();
      else navigate("catalog");
      return;
    }
    const voucherSaleAmountButton = event.target.closest("[data-voucher-sale-amount]");
    if (voucherSaleAmountButton) {
      state.voucherSaleAmountChoice = voucherSaleAmountButton.dataset.voucherSaleAmount;
      state.voucherSaleError = "";
      if (state.voucherSaleAmountChoice !== "custom") state.voucherSaleCustomAmount = "";
      renderVoucherSale();
      if (state.voucherSaleAmountChoice === "custom") document.getElementById("voucherCustomAmount")?.focus();
      return;
    }
    const voucherSalePaymentButton = event.target.closest("[data-voucher-sale-payment]");
    if (voucherSalePaymentButton) {
      state.voucherSalePaymentChoice = voucherSalePaymentButton.dataset.voucherSalePayment;
      state.voucherSaleError = "";
      renderVoucherSale();
      return;
    }
    const voucherFilter = event.target.closest("[data-voucher-filter]");
    if (voucherFilter) {
      state.voucherFilter = voucherFilter.dataset.voucherFilter;
      renderVouchers();
      return;
    }
    const openVoucher = event.target.closest("[data-open-voucher]");
    if (openVoucher) {
      state.voucherDetailReference = openVoucher.dataset.openVoucher;
      state.voucherNotice = "";
      navigate("voucher-detail");
      return;
    }
    const setupBack = event.target.closest("[data-setup-back]");
    if (setupBack) {
      const form = document.getElementById("setupWizardForm");
      if (form) saveSetupStep(new FormData(form), false);
      state.setupNotice = "";
      state.setupStep = Math.max(1, state.setupStep - 1);
      renderSetupWizard();
      return;
    }
    const setupCancel = event.target.closest("[data-setup-cancel]");
    if (setupCancel) {
      const form = document.getElementById("setupWizardForm");
      if (form) saveSetupStep(new FormData(form), false);
      state.setupNotice = "";
      navigate("settings");
      return;
    }
    const setupJump = event.target.closest("[data-setup-jump]");
    if (setupJump) {
      state.setupStep = Math.min(setupSteps.length, Math.max(1, Number(setupJump.dataset.setupJump)));
      state.setupNotice = "";
      renderSetupWizard();
      return;
    }
    if (event.target.closest("[data-setup-tse]")) {
      state.setupStep = 10;
      state.setupNotice = "";
      renderSetupWizard();
      return;
    }
    if (event.target.closest("[data-setup-test]")) {
      state.setupTestPreviewVisible = true;
      renderSetupWizard();
      return;
    }
    const paymentToggle = event.target.closest("[data-payment-toggle]");
    if (paymentToggle) {
      const choice = data.paymentChoices.find(entry => entry.id === paymentToggle.dataset.paymentToggle);
      if (!choice) return;
      const showPaymentNotice = (message, isError = false) => {
        if (state.route === "setup-wizard") state.setupNotice = isError ? message : "";
        else state.paymentSettingsNotice = message;
        let notice = document.querySelector(".settings-save-notice");
        if (!notice) {
          notice = document.createElement("div");
          notice.className = "settings-save-notice";
          notice.setAttribute("role", "status");
          document.querySelector(".payment-settings-list")?.before(notice);
        }
        notice.classList.toggle("is-error", isError);
        notice.textContent = message;
      };
      const wantsActive = paymentToggle.checked;
      const remainingNormal = data.paymentChoices.filter(entry => entry.id !== choice.id && entry.active !== false && isNormalPaymentChoice(entry));
      if (!wantsActive && isNormalPaymentChoice(choice) && remainingNormal.length === 0) {
        paymentToggle.checked = true;
        showPaymentNotice("Mindestens eine normale Zahlungsart muss aktiv bleiben.", true);
        return;
      }
      choice.active = wantsActive;
      if (!activePaymentChoices().some(entry => entry.id === state.paymentChoice)) state.paymentChoice = preferredNormalPaymentId() || activePaymentChoices()[0]?.id || "cash";
      if (!activeNormalPaymentChoices().some(entry => entry.id === state.checkoutVoucherRemainderPayment)) state.checkoutVoucherRemainderPayment = preferredNormalPaymentId() || "cash";
      if (!activeNormalPaymentChoices().some(entry => entry.id === state.voucherSalePaymentChoice)) state.voucherSalePaymentChoice = preferredNormalPaymentId() || "cash";
      const label = paymentToggle.closest("label")?.querySelector("span");
      if (label) label.textContent = wantsActive ? "Aktiv" : "Inaktiv";
      showPaymentNotice(`${choice.title} ist für diese Sitzung ${wantsActive ? "aktiv" : "inaktiv"}.`);
      return;
    }
    const paymentMove = event.target.closest("[data-payment-move]");
    if (paymentMove) {
      const index = data.paymentChoices.findIndex(choice => choice.id === paymentMove.dataset.paymentMove);
      const targetIndex = paymentMove.dataset.direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= data.paymentChoices.length) return;
      const [choice] = data.paymentChoices.splice(index, 1);
      data.paymentChoices.splice(targetIndex, 0, choice);
      state.paymentSettingsNotice = "Reihenfolge wurde für diese Sitzung geändert.";
      renderPaymentSettings();
      return;
    }
    const route = event.target.closest("[data-route]");
    if (route) {
      if ((route.dataset.route === "checkout" || route.dataset.route === "edit-cart") && !cartCount()) return;
      if (route.dataset.route === "receipt-preview" && state.route === "receipt-success") {
        state.receiptPreviewNumber = null;
        state.receiptPreviewReturnRoute = "receipt-success";
      }
      if (route.dataset.route === "customer-picker") {
        state.customerPickerContext = state.route === "voucher-sale" ? "voucher" : "receipt";
        state.customerSearch = "";
      }
      if (route.dataset.route === "settings-company" && state.route !== "settings-company") state.settingsNotice = "";
      if (route.dataset.route === "settings-location" && state.route !== "settings-location") state.serviceLocationNotice = "";
      if (route.dataset.route === "settings-taxes" && state.route !== "settings-taxes") state.taxSettingsNotice = "";
      if (route.dataset.route === "settings-payments" && state.route !== "settings-payments") state.paymentSettingsNotice = "";
      if (route.dataset.route === "settings-business-areas" && state.route !== "settings-business-areas") state.businessAreaSettingsNotice = "";
      if (["vouchers", "voucher-detail", "voucher-preview"].includes(route.dataset.route)) state.voucherNotice = "";
      navigate(route.dataset.route);
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "setup-start") {
      state.setupStep = 1;
      state.setupNotice = "";
      state.setupTestPreviewVisible = false;
      state.setupFirstStartVisible = false;
      navigate("setup-wizard");
      return;
    }
    if (action === "setup-later") {
      state.setupFirstStartVisible = false;
      renderSettings();
      return;
    }
    if (action === "business-area-add") {
      if (state.route === "setup-wizard") {
        const form = document.getElementById("setupWizardForm");
        if (form) saveSetupStep(new FormData(form), false);
      }
      openBusinessTemplatePicker();
      return;
    }
    if (action === "checkout-voucher-code") {
      chooseCheckoutVoucherByCode();
      renderCheckout();
    }
    if (action === "checkout-voucher-qr") {
      const query = normalizeVoucherCode(state.checkoutVoucherCode);
      const matches = eligibleCheckoutVouchers().filter(voucher => !query || normalizeVoucherCode(voucher.code).includes(query));
      if (matches.length) chooseCheckoutVoucher(matches[0]);
      else state.checkoutVoucherError = "Gutschein wurde nicht gefunden.";
      renderCheckout();
    }
    if (action === "checkout-voucher-picker") {
      state.checkoutVoucherPickerOpen = !state.checkoutVoucherPickerOpen;
      state.checkoutVoucherError = "";
      renderCheckout();
    }
    if (action === "checkout-voucher-change") {
      state.checkoutVoucherReference = null;
      state.checkoutVoucherPickerOpen = true;
      state.checkoutVoucherError = "";
      renderCheckout();
    }
    if (action === "voucher-sell") {
      startVoucherSale("vouchers");
    }
    if (action === "voucher-sale-cancel") {
      const returnRoute = state.voucherSaleReturnRoute;
      resetVoucherSaleDraft();
      navigate(returnRoute);
    }
    if (action === "voucher-customer-pick") {
      state.customerPickerContext = "voucher";
      state.customerSearch = "";
      navigate("customer-picker");
    }
    if (action === "voucher-customer-remove") {
      state.voucherSaleCustomerId = null;
      renderVoucherSale();
    }
    if (action === "voucher-pdf") {
      state.voucherNotice = "Noch wurde keine PDF-Datei erzeugt. In der Druckansicht kann der Browserdialog zum Speichern als PDF geöffnet werden.";
      navigate("voucher-preview");
    }
    if (action === "voucher-email") {
      state.voucherNotice = "Der E-Mail-Versand ist in diesem Prototyp noch nicht eingerichtet. Es wurde keine E-Mail gesendet.";
      if (state.route === "voucher-sale-success") renderVoucherSaleSuccess();
      else renderVoucherDetail();
    }
    if (action === "voucher-print") window.print();
    if (action === "new-receipt") startNewReceipt();
    if (action === "resume-receipt") {
      state.cart = [{ ...(data.catalog.hair[0]), basePrice: data.catalog.hair[0].price, quantity: 1, discountPercent: 0, discountAmount: 0, discountType: "percent", priceOverride: null }, { ...(data.catalog.hair[1]), basePrice: data.catalog.hair[1].price, quantity: 1, discountPercent: 0, discountAmount: 0, discountType: "percent", priceOverride: null }];
      state.cartExpanded = true;
      navigate("catalog");
    }
    if (action === "discard-receipt") openDiscardDialog();
    if (action === "toggle-cart-expanded") {
      if (state.cart.length) {
        state.cartExpanded = !state.cartExpanded;
        renderCatalog();
      }
    }
    if (action === "save-receipt-note") {
      const receipt = receiptByNumber(state.receiptDetailNumber);
      const field = document.getElementById("receiptInternalNote");
      if (receipt && field) {
        receipt.internalNote = field.value.trim();
        receipt.activity = receipt.activity || [];
        receipt.activity.push({ label: "Interne Notiz aktualisiert", date: "02.08.2026 · 10:42" });
        state.successNotice = "Interne Notiz wurde im Prototyp gespeichert.";
        renderReceiptDetail();
      }
    }
    if (action === "receipt-email-demo") {
      const receipt = receiptByNumber(state.receiptDetailNumber);
      state.successNotice = receipt?.customer?.email
        ? `E-Mail-Versand an ${receipt.customer.email} wurde simuliert.`
        : "Für diesen Beleg ist keine E-Mail-Adresse hinterlegt.";
      renderReceiptDetail();
    }
    if (action === "receipt-print") window.print();
    if (action === "copy-receipt") {
      const receipt = receiptByNumber(state.receiptDetailNumber);
      if (receipt && receipt.receiptKind !== "voucher-sale") {
        state.cart = receipt.items.map((item, index) => ({
          id: `copy-${Date.now()}-${index}`,
          title: item.title,
          price: Math.abs(item.unitPrice),
          basePrice: Math.abs(item.unitPrice),
          quantity: item.quantity,
          type: "service",
          quantityAdjustable: item.quantity > 1,
          icon: "▤",
          category: "Favoriten",
          discountType: "percent",
          discountPercent: 0,
          discountAmount: 0,
          priceOverride: null
        }));
        state.selectedCustomerId = receipt.customer?.id || null;
        state.customerChoice = receipt.customer ? "existing" : "none";
        state.paymentChoice = "cash";
        navigate("edit-cart");
      }
    }
    if (action === "cancel-receipt") {
      const receipt = receiptByNumber(state.receiptDetailNumber);
      if (!receipt || receipt.status === "cancelled") return;
      openConfirmDialog({
        title: "Gesamten Beleg stornieren?",
        text: `Für ${receipt.number} wird ein eigener Stornobeleg über ${formatCurrency(receipt.total)} erstellt. Der ursprüngliche Beleg bleibt unverändert nachvollziehbar.`,
        confirmLabel: "Jetzt stornieren",
        action: "cancel-current-receipt",
        danger: true
      });
    }
    if (action === "create-full-credit") {
      const receipt = receiptByNumber(state.receiptDetailNumber);
      if (!receipt) return;
      const alreadyCredited = data.receipts
        .filter(item => item.reference === receipt.number && item.type === "credit")
        .reduce((sum, item) => sum + Math.abs(Number(item.total || 0)), 0);
      const maximumCredit = Math.max(0, Number(receipt.total || 0) - alreadyCredited);
      if (maximumCredit <= 0.009) return;
      openConfirmDialog({
        title: "Gesamten Restbetrag gutschreiben?",
        text: `Es wird eine Gesamtgutschrift über ${formatCurrency(maximumCredit)} zu ${receipt.number} erstellt.`,
        confirmLabel: "Gutschrift erstellen",
        action: "credit-current-receipt",
        danger: false
      });
    }
    if (action === "finish-demo") finishReceipt();
    if (action === "simulate-email") {
      const email = state.finishedReceipt?.customerEmail;
      state.successNotice = email ? `E-Mail-Versand an ${email} wurde simuliert.` : "E-Mail-Versand wurde simuliert.";
      renderReceiptSuccess();
    }
    if (action === "toggle-qr") {
      state.qrVisible = !state.qrVisible;
      state.successNotice = "";
      renderReceiptSuccess();
    }
    if (action === "simulate-pdf-download") {
      state.successNotice = "PDF-Download wurde simuliert.";
      navigate("receipt-success");
    }
    if (action === "new-after-finish") {
      state.finishedReceipt = null;
      startNewReceipt();
    }
    if (action === "home-after-finish") {
      state.finishedReceipt = null;
      state.cart = [];
      state.selectedCustomerId = null;
      state.customerChoice = "none";
      navigate("home");
    }
  });

  document.addEventListener("submit", event => {
    const setupWizardForm = event.target.closest("#setupWizardForm");
    if (setupWizardForm) {
      event.preventDefault();
      if (state.setupStep >= setupSteps.length) return;
      const error = saveSetupStep(new FormData(setupWizardForm));
      if (error) {
        state.setupNotice = error;
        renderSetupWizard();
        return;
      }
      state.setupNotice = "";
      state.setupStep += 1;
      if (state.setupStep === setupSteps.length) {
        state.setupCompleted = true;
        state.setupFirstStartVisible = false;
      }
      renderSetupWizard();
      return;
    }

    const companySettingsForm = event.target.closest("#companySettingsForm");
    if (companySettingsForm) {
      event.preventDefault();
      const formData = new FormData(companySettingsForm);
      applyCompanyForm(formData);
      state.settingsNotice = "Änderungen wurden für diese Sitzung übernommen. Nach einem Reload gehen sie verloren.";
      renderCompanySettings();
      return;
    }

    const serviceLocationForm = event.target.closest("#serviceLocationForm");
    if (serviceLocationForm) {
      event.preventDefault();
      const formData = new FormData(serviceLocationForm);
      applyServiceLocationForm(formData);
      state.serviceLocationNotice = "Leistungsort wurde für diese Sitzung übernommen. Nach einem Reload geht die Änderung verloren.";
      renderServiceLocationSettings();
      return;
    }

    const taxSettingsForm = event.target.closest("#taxSettingsForm");
    if (taxSettingsForm) {
      event.preventDefault();
      const formData = new FormData(taxSettingsForm);
      const activeRates = formData.getAll("activeTaxRate").map(Number);
      const defaultRate = Number(formData.get("defaultTaxRate"));
      const yearPrefix = String(formData.get("yearPrefix") || "").trim();
      const nextNumber = Number(formData.get("nextNumber"));
      if (!activeRates.length || !activeRates.includes(defaultRate)) {
        state.taxSettingsNotice = "Bitte mindestens einen aktiven Steuersatz wählen und diesen als Standard festlegen.";
        renderTaxSettings();
        return;
      }
      const numberError = receiptNumberValidation(yearPrefix, nextNumber);
      if (numberError) {
        state.taxSettingsNotice = numberError;
        renderTaxSettings();
        return;
      }
      data.taxSettings.status = ["vat", "small-business", "undecided"].includes(formData.get("taxStatus")) ? formData.get("taxStatus") : "undecided";
      data.taxSettings.rates.forEach(rate => { rate.active = activeRates.includes(rate.rate); });
      data.taxSettings.defaultRate = defaultRate;
      data.company.defaultTaxRate = defaultRate;
      Object.assign(data.receiptSettings, {
        yearPrefix,
        nextNumber,
        footerText: String(formData.get("footerText") || "").trim(),
        thankYouText: String(formData.get("thankYouText") || "").trim(),
        currency: "EUR",
        language: "Deutsch"
      });
      state.receiptCounter = nextNumber - 1;
      state.taxSettingsNotice = "Steuer- und Belegangaben wurden für diese Sitzung übernommen. Bestehende Belege bleiben unverändert.";
      renderTaxSettings();
      return;
    }

    const businessAreaSettingsForm = event.target.closest("#businessAreaSettingsForm");
    if (businessAreaSettingsForm) {
      event.preventDefault();
      const formData = new FormData(businessAreaSettingsForm);
      const businessError = applyBusinessAreaForm(formData);
      if (businessError) {
        state.businessAreaSettingsNotice = businessError;
        renderBusinessAreaSettings();
        return;
      }
      state.businessAreaSettingsNotice = "Geschäftsbereiche wurden für diese Sitzung übernommen. Leistungen und Belege wurden nicht verschoben.";
      renderBusinessAreaSettings();
      return;
    }

    const voucherSaleForm = event.target.closest("#voucherSaleForm");
    if (voucherSaleForm) {
      event.preventDefault();
      if (state.voucherSaleSubmitting || state.voucherSaleCreatedReference) return;

      state.voucherSaleError = validateVoucherSaleAmount();
      if (state.voucherSaleError) {
        renderVoucherSale();
        if (state.voucherSaleAmountChoice === "custom") document.getElementById("voucherCustomAmount")?.focus();
        return;
      }

      const amount = voucherSaleAmount();
      if (amount === null) return;
      state.voucherSaleSubmitting = true;
      const submitButton = voucherSaleForm.querySelector(".voucher-sale-submit");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Gutschein wird erstellt …";
      }

      let sale;
      try {
        sale = commitPrototypeVoucherSale(amount);
      } catch (error) {
        state.voucherSaleSubmitting = false;
        state.voucherSaleError = "Gutschein und Verkaufsbeleg konnten nicht gemeinsam erstellt werden. Es wurde kein Verkauf bestätigt.";
        renderVoucherSale();
        return;
      }
      state.voucherSaleCreatedReference = sale.voucher.reference;
      state.voucherDetailReference = sale.voucher.reference;
      state.voucherSaleSubmitting = false;
      state.voucherNotice = "";
      navigate("voucher-sale-success");
      return;
    }

    const customerForm = event.target.closest("#customerForm");
    if (customerForm) {
      event.preventDefault();
      const fd = new FormData(customerForm);
      const values = {
        firstName: String(fd.get("firstName")||"").trim(),
        lastName: String(fd.get("lastName")||"").trim(),
        phone: String(fd.get("phone")||"").trim(),
        email: String(fd.get("email")||"").trim(),
        street: String(fd.get("street")||"").trim(),
        zip: String(fd.get("zip")||"").trim(),
        city: String(fd.get("city")||"").trim(),
        note: String(fd.get("note")||"").trim()
      };
      if (!values.firstName || !values.lastName) return;

      if (customerForm.dataset.mode === "edit") {
        const existing = data.customers.find(c => c.id === state.editingCustomerId);
        if (!existing) return;
        Object.assign(existing, values);
        state.customerDetailId = existing.id;
        state.editingCustomerId = null;
        navigate(state.cart.length && state.selectedCustomerId === existing.id ? "checkout" : "customer-detail");
      } else {
        const c = { id:`c-${Date.now()}`, ...values, lastVisit:"Heute", receiptCount:0 };
        data.customers.unshift(c);
        state.selectedCustomerId=c.id;
        state.customerChoice="new";
        navigate(state.cart.length?"checkout":"customers");
      }
      return;
    }
    const creditForm = event.target.closest("#creditForm");
    if (creditForm) {
      event.preventDefault();
      const receipt = receiptByNumber(state.receiptDetailNumber);
      if (!receipt) return;
      const fd = new FormData(creditForm);
      const amount = Number(String(fd.get("creditAmount") || "").replace(",", "."));
      const text = String(fd.get("creditText") || "").trim();
      if (!Number.isFinite(amount) || amount <= 0 || amount > receipt.total || !text) return;
      state.creditAmount = String(amount);
      state.creditText = text;
      createCredit(receipt, amount, text, false);
      return;
    }
    const form = event.target.closest("[data-price-form]");
    if (!form) return;
    event.preventDefault();

    const item = state.cart.find(entry => entry.id === form.dataset.priceForm);
    if (!item) return;

    const formData = new FormData(form);
    const manualRaw = String(formData.get("manualPrice") ?? "").replace(",", ".").trim();
    const discountRaw = String(formData.get("discountValue") ?? "").replace(",", ".").trim();
    const manualPrice = manualRaw === "" ? null : Number(manualRaw);
    const discountValue = discountRaw === "" ? 0 : Number(discountRaw);
    const base = item.basePrice ?? item.price;

    if (manualPrice !== null && Number.isFinite(manualPrice) && manualPrice >= 0) {
      item.priceOverride = Math.round(manualPrice * 100) / 100;
      item.discountPercent = 0;
      item.discountAmount = 0;
      item.price = item.priceOverride;
    } else if (Number.isFinite(discountValue) && discountValue >= 0) {
      item.priceOverride = null;

      if ((item.discountType || "percent") === "fixed") {
        const safeAmount = Math.min(discountValue, base);
        item.discountAmount = Math.round(safeAmount * 100) / 100;
        item.discountPercent = 0;
        item.price = Math.max(0, Math.round((base - item.discountAmount) * 100) / 100);
      } else {
        const safePercent = Math.min(discountValue, 100);
        item.discountPercent = Math.round(safePercent * 100) / 100;
        item.discountAmount = 0;
        item.price = Math.max(0, Math.round(base * (1 - item.discountPercent / 100) * 100) / 100);
      }
    }

    state.priceEditorId = null;
    renderCartEditor();
  });

  cancelDiscard.addEventListener("click", closeDiscardDialog);
  confirmDiscard.addEventListener("click", () => {
    const pendingAction = state.pendingDialogAction;

    if (pendingAction === "discard-open-receipt") {
      state.openReceiptVisible = false;
      closeDiscardDialog();
      renderHome();
      return;
    }

    if (pendingAction === "cancel-current-receipt") {
      const receipt = receiptByNumber(state.receiptDetailNumber);
      if (!receipt || receipt.status === "cancelled") {
        closeDiscardDialog();
        return;
      }

      const cancelNumber = `ST-2026-${String(data.receipts.filter(item => item.type === "cancellation").length + 101).padStart(6, "0")}`;
      const cancellation = {
        number: cancelNumber,
        type: "cancellation",
        status: "cancelled",
        reference: receipt.number,
        date: "02.08.2026",
        time: "10:53",
        sortKey: `2026-08-02T10:53:${data.receipts.length}`,
        customer: receipt.customer,
        payment: receipt.payment,
        items: receipt.items.map(item => ({
          ...item,
          total: -Math.abs(Number(item.total || 0)),
          unitPrice: -Math.abs(Number(item.unitPrice || 0))
        })),
        total: -Math.abs(Number(receipt.total || 0)),
        activity: [
          { label: "Stornobeleg erstellt", date: "02.08.2026 · 10:53" },
          { label: `Bezug auf ${receipt.number}`, date: receipt.date }
        ]
      };

      data.receipts.unshift(cancellation);
      receipt.status = "cancelled";
      receipt.activity = receipt.activity || [];
      receipt.activity.push({
        label: `Storniert durch ${cancelNumber}`,
        date: "02.08.2026 · 10:53"
      });

      closeDiscardDialog();
      state.successNotice = `Stornobeleg ${cancelNumber} wurde simuliert erstellt.`;
      renderReceiptDetail();
      return;
    }

    if (pendingAction === "credit-current-receipt") {
      const receipt = receiptByNumber(state.receiptDetailNumber);
      if (!receipt) {
        closeDiscardDialog();
        return;
      }

      const alreadyCredited = data.receipts
        .filter(item => item.reference === receipt.number && item.type === "credit")
        .reduce((sum, item) => sum + Math.abs(Number(item.total || 0)), 0);
      const maximumCredit = Math.max(0, Number(receipt.total || 0) - alreadyCredited);

      closeDiscardDialog();
      if (maximumCredit > 0.009) {
        createCredit(receipt, maximumCredit, "Gesamtgutschrift", true);
      }
      return;
    }

    closeDiscardDialog();
  });

  dialogBackdrop.addEventListener("click", event => {
    if (event.target === dialogBackdrop) closeDiscardDialog();
  });
  bottomSheetClose.addEventListener("click", closeBottomSheet);
  bottomSheetBackdrop.addEventListener("click", event => {
    if (event.target === bottomSheetBackdrop) closeBottomSheet();
  });
  window.addEventListener("popstate", event => navigate(event.state?.route ?? (window.location.hash.replace("#/", "") || "home"), false));

  // Prototype deployments must always show the latest Netlify upload.
  // Remove service workers and caches left by older UX builds.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(() => {});
  }
  if ("caches" in window) {
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .catch(() => {});
  }


  function updateBrowserBottomOffset() {
    const viewport = window.visualViewport;
    if (!viewport) {
      document.documentElement.style.setProperty("--browser-bottom-offset", "0px");
      return;
    }

    const layoutHeight = document.documentElement.clientHeight;
    const visibleBottom = viewport.offsetTop + viewport.height;
    const coveredBottom = Math.max(0, Math.round(layoutHeight - visibleBottom));
    document.documentElement.style.setProperty("--browser-bottom-offset", `${coveredBottom}px`);
  }

  updateBrowserBottomOffset();
  window.addEventListener("resize", updateBrowserBottomOffset, { passive: true });
  window.addEventListener("orientationchange", updateBrowserBottomOffset, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateBrowserBottomOffset, { passive: true });
    window.visualViewport.addEventListener("scroll", updateBrowserBottomOffset, { passive: true });
  }

  initHeader();
  const initialRoute = validRoutes.has(window.location.hash.replace("#/", "")) ? window.location.hash.replace("#/", "") : "home";
  history.replaceState({ route: initialRoute }, "", `#/${initialRoute}`);
  navigate(initialRoute, false);
})();
