(() => {
  "use strict";
  const data = window.PROTOTYPE_DATA;
  const initialReceiptCounter = [...data.receipts, ...data.vouchers.map(voucher => ({ number: voucher.saleReceipt?.number }))].reduce((highest, receipt) => {
    const match = /^2026-(\d{6})$/.exec(receipt.number || "");
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  const state = {
    route: "home",
    activeBusinessArea: data.businessAreas[0]?.id ?? null,
    activeCategory: "Favoriten",
    search: "",
    openReceiptVisible: Boolean(data.openReceipt?.exists),
    cart: [],
    cartExpanded: false,
    customerChoice: "none",
    paymentChoice: "cash",
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
    voucherSaleCreatedReference: null
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
  const flowRoutes = new Set(["catalog", "edit-cart", "checkout", "customer-picker", "customer-new", "customer-edit", "customer-detail", "receipt-success", "receipt-preview", "receipt-detail", "receipt-credit", "voucher-detail", "voucher-preview", "voucher-sale", "voucher-sale-success"]);
  const validRoutes = new Set(["home", "receipts", "customers", "vouchers", "settings", ...flowRoutes]);

  const escapeHtml = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const formatCurrency = value => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  const getAreaLabel = () => data.businessAreas.find(area => area.id === state.activeBusinessArea)?.label ?? "Geschäftsbereich";
  const cartTotal = () => state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = () => state.cart.reduce((sum, item) => sum + item.quantity, 0);

  function initHeader() {
    companyName.textContent = data.company.name;
    if (data.businessAreas.length > 1) {
      switcherWrap.hidden = false;
      switcher.innerHTML = data.businessAreas.map(area => `<option value="${escapeHtml(area.id)}">${escapeHtml(area.label)}</option>`).join("");
      switcher.value = state.activeBusinessArea;
      switcher.addEventListener("change", event => {
        state.activeBusinessArea = event.target.value;
        state.activeCategory = "Favoriten";
        state.cart = [];
        state.search = "";
        renderRoute(false);
      });
    }
  }

  function renderHome() {
    const openReceipt = state.openReceiptVisible ? `<section class="open-receipt" aria-labelledby="openReceiptTitle">
      <div class="open-receipt-header"><h2 id="openReceiptTitle">Offener Beleg</h2><span class="status-pill">Entwurf</span></div>
      <p>${data.openReceipt.itemCount} Positionen · ${escapeHtml(data.openReceipt.customer)} · ${escapeHtml(data.openReceipt.lastEdited)}</p>
      <div class="open-receipt-actions"><button class="button button-secondary" type="button" data-action="resume-receipt">Weiter bearbeiten</button><button class="button button-ghost" type="button" data-action="discard-receipt">Verwerfen</button></div>
    </section>` : "";
    mainContent.innerHTML = `<div class="home-layout page-enter"><section class="hero-card"><p class="eyebrow">${escapeHtml(getAreaLabel())}</p><h1>Was möchtest du erfassen?</h1><p class="hero-copy">Leistungen und Produkte direkt auswählen.</p><button class="button button-primary" type="button" data-action="new-receipt"><span aria-hidden="true">＋</span><span>Neuer Beleg</span></button></section>${openReceipt}</div>`;
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

  function paymentLabel() {
    return data.paymentChoices.find(choice => choice.id === state.paymentChoice)?.title ?? "Nicht angegeben";
  }

  function nextReceiptNumber() {
    let number;
    do {
      state.receiptCounter += 1;
      number = `2026-${String(state.receiptCounter).padStart(6, "0")}`;
    } while (data.receipts.some(receipt => receipt.number === number));
    return number;
  }

  function finishReceipt() {
    const customer = selectedCustomer();
    const defaultTaxRate = Number(data.company.defaultTaxRate || 19);

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

    state.finishedReceipt = {
      number: nextReceiptNumber(),
      total,
      originalTotal,
      discountTotal,
      netTotal,
      taxTotal,
      taxGroups,
      payment: paymentLabel(),
      customer: customer ? {
        name: customerName(customer),
        street: customer.street || "",
        zip: customer.zip || "",
        city: customer.city || ""
      } : null,
      customerEmail: customer?.email || "",
      createdAt: new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
      items
    };
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
      </section>

      ${state.successNotice ? `<div class="success-notice" role="status">${escapeHtml(state.successNotice)}</div>` : ""}

      ${state.qrVisible ? `<section class="demo-qr-panel">
        <div class="demo-qr" aria-label="Simulierter QR-Code">${qrCells}</div>
        <div><strong>QR-Code zum Beleg</strong><p>Im Produkt würde dieser Code zum digitalen Beleg führen.</p></div>
      </section>` : ""}

      <section class="success-actions" aria-label="Aktionen nach dem Belegabschluss">
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
    const receipt = state.finishedReceipt;
    if (!receipt) {
      navigate("home", false);
      return;
    }

    mainContent.innerHTML = `<section class="flow-page receipt-preview-page page-enter">
      <div class="flow-head compact-flow-head">
        <button class="button button-back" type="button" data-route="receipt-success"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">PDF-Vorschau</p>
        <h1 class="flow-title">Digitaler Beleg</h1>
        <p class="page-copy">Vorschau ohne echte PDF-Erstellung.</p>
      </div>

      <article class="receipt-paper">
        <header>
          <strong>${escapeHtml(data.company.name)}</strong>
          <span>${escapeHtml(data.company.owner || "")}</span>
          <small>${escapeHtml(data.company.street || "")}</small>
          <small>${escapeHtml(data.company.city || "")}</small>
          <small>Steuernummer: ${escapeHtml(data.company.taxNumber || "nicht hinterlegt")}</small>
          ${data.company.vatId ? `<small>USt-IdNr.: ${escapeHtml(data.company.vatId)}</small>` : ""}
        </header>

        <div class="receipt-paper-meta">
          <span>Beleg ${escapeHtml(receipt.number)}</span>
          <span>${escapeHtml(receipt.createdAt)}</span>
        </div>

        <div class="receipt-paper-items">
          ${receipt.items.map(item => `<div class="receipt-paper-item">
            <span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${item.quantity} × ${formatCurrency(item.originalUnitPrice)}</small>
              ${item.discountTotal > 0 ? `<em>${escapeHtml(item.discountLabel || "Rabatt")} <b>−${formatCurrency(item.discountTotal)}</b></em>` : ""}
            </span>
            <strong>${formatCurrency(item.total)}</strong>
          </div>`).join("")}
        </div>

        ${receipt.customer ? `<div class="receipt-paper-customer"><span>Kunde</span><strong>${escapeHtml(receipt.customer.name)}</strong>${customerAddressLines(receipt.customer).map(line => `<small>${escapeHtml(line)}</small>`).join("")}</div>` : ""}
        <div class="receipt-paper-row"><span>Zahlungsart</span><strong>${escapeHtml(receipt.payment)}</strong></div>

        <div class="receipt-paper-totals">
          ${receipt.discountTotal > 0 ? `<div><span>Zwischensumme</span><strong>${formatCurrency(receipt.originalTotal)}</strong></div>
          <div class="receipt-discount-total"><span>Rabatt gesamt</span><strong>−${formatCurrency(receipt.discountTotal)}</strong></div>` : ""}
          <div><span>Netto</span><strong>${formatCurrency(receipt.netTotal)}</strong></div>
          ${receipt.taxGroups.map(group => `<div><span>MwSt. ${group.rate}%</span><strong>${formatCurrency(group.tax)}</strong></div>`).join("")}
        </div>

        <div class="receipt-paper-total"><span>Gesamt brutto</span><strong>${formatCurrency(receipt.total)}</strong></div>
        <footer>Vielen Dank für Ihren Besuch.</footer>
      </article>

      <button class="button button-primary preview-download" type="button" data-action="simulate-pdf-download">PDF-Download simulieren</button>
    </section>`;
  }

  function renderCheckout() {
    const selectedCustomer = data.customers.find(c => c.id === state.selectedCustomerId);
    const customerCards = selectedCustomer
      ? `<div class="selected-customer"><div><strong>${escapeHtml(customerName(selectedCustomer))}</strong>${customerAddressLines(selectedCustomer).map(line => `<small>${escapeHtml(line)}</small>`).join("")}<small>${escapeHtml(selectedCustomer.phone || selectedCustomer.email || "Kunde ausgewählt")}</small></div><div class="selected-customer-actions"><button class="text-action" type="button" data-edit-customer="${selectedCustomer.id}">Bearbeiten</button><button class="text-action" type="button" data-route="customer-picker">Ändern</button></div></div>`
      : `<button class="mini-choice ${state.customerChoice === "none" ? "is-selected" : ""}" type="button" data-select-no-customer><span class="mini-choice-icon" aria-hidden="true">→</span><span><strong>Ohne Kunde</strong><small>Keine persönlichen Daten</small></span></button><button class="mini-choice" type="button" data-route="customer-picker"><span class="mini-choice-icon" aria-hidden="true">◎</span><span><strong>Kunde auswählen</strong><small>Suchen oder neu anlegen</small></span></button>`;
    const paymentCards = data.paymentChoices.map(choice => `<button class="payment-choice ${state.paymentChoice === choice.id ? "is-selected" : ""}" type="button" data-payment-choice="${choice.id}"><span aria-hidden="true">${choice.icon}</span><strong>${escapeHtml(choice.title)}</strong></button>`).join("");
    mainContent.innerHTML = `<section class="flow-page checkout-page page-enter">
      <div class="flow-head compact-work-head"><button class="button button-back" type="button" data-route="catalog"><span aria-hidden="true">←</span> Zurück</button><p class="eyebrow">Neuer Beleg</p><h1 class="flow-title">Beleg abschließen</h1><p class="page-copy">Prüfen, optional Kunde wählen und Zahlungsart simulieren.</p></div>
      <section class="checkout-section"><div class="section-title-row"><h2>Positionen</h2><button class="text-action" type="button" data-route="edit-cart">Bearbeiten</button></div><div class="checkout-items">${state.cart.map(item => `<div class="checkout-item"><span><strong>${escapeHtml(item.title)}</strong><small>${item.quantity} × ${formatCurrency(item.price)}</small></span><strong>${formatCurrency(item.price * item.quantity)}</strong></div>`).join("")}</div></section>
      <section class="checkout-section"><h2>Kunde <span>optional</span></h2><div class="mini-choice-grid">${customerCards}</div></section>
      <section class="checkout-section"><h2>Zahlungsart <span>nur Simulation</span></h2><div class="payment-grid">${paymentCards}</div></section>
      <section class="checkout-total"><span>Gesamt</span><strong>${formatCurrency(cartTotal())}</strong></section>
      <p class="prototype-note">Keine echte Zahlung, Speicherung, PDF-, E-Mail-, QR- oder Fiskalisierungsfunktion.</p>
      <div class="checkout-action"><button class="button button-primary" type="button" data-action="finish-demo">Demo abschließen</button></div>
    </section>`;
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
    const related = data.receipts.filter(item => item.reference === receipt.number || item.number === receipt.reference);
    const relatedCreditsTotal = data.receipts
      .filter(item => item.reference === receipt.number && item.type === "credit")
      .reduce((sum, item) => sum + Math.abs(Number(item.total || 0)), 0);
    const remainingCredit = Math.max(0, Number(receipt.total || 0) - relatedCreditsTotal);
    const hasCancellation = data.receipts.some(item => item.reference === receipt.number && item.type === "cancellation");
    const canCorrect = receipt.type === "receipt"
      && receipt.receiptKind !== "voucher-sale"
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
        ${receipt.reference ? `<div class="receipt-detail-row"><span>Bezug</span><button type="button" data-open-receipt="${escapeHtml(receipt.reference)}">${escapeHtml(receipt.reference)}</button></div>` : ""}
      </section>

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
        <button class="button button-secondary" type="button" data-action="receipt-preview-demo">Beleg anzeigen</button>
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
    return "Aktiv";
  };
  const voucherStatusClass = voucher => {
    if (voucher.status === "redeemed") return "is-redeemed";
    if (voucher.status === "cancelled") return "is-cancelled";
    return "is-active";
  };
  const maskVoucherCode = code => {
    const parts = String(code).split("-");
    if (parts.length < 3) return code;
    return [parts[0], "••••", parts.at(-1)].join("-");
  };

  function currentVoucherPresentationSnapshot() {
    return {
      issuer: {
        name: data.company.name,
        owner: data.company.owner || "",
        street: data.company.street || "",
        city: data.company.city || ""
      },
      redemptionLocation: {
        name: data.voucherDemoRedemptionLocation?.name || data.company.name,
        street: data.voucherDemoRedemptionLocation?.street || data.company.street || "",
        city: data.voucherDemoRedemptionLocation?.city || data.company.city || ""
      }
    };
  }

  function voucherPresentation(voucher) {
    return voucher.presentationSnapshot ?? currentVoucherPresentationSnapshot();
  }

  function sameVoucherAddress(issuer, redemptionLocation) {
    const normalize = value => String(value || "").trim().toLocaleLowerCase("de-DE");
    return normalize(issuer.street) === normalize(redemptionLocation.street)
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
        ${events.length ? events.map(event => `<article class="voucher-history-item voucher-history-${escapeHtml(event.type)}">
          <span class="voucher-history-marker" aria-hidden="true"></span>
          <div class="voucher-history-main">
            <div><strong>${escapeHtml(voucherHistoryLabel(event.type))}</strong><time>${escapeHtml([event.date, event.time].filter(Boolean).join(" · "))}</time></div>
            <dl>
              <div><dt>Betrag</dt><dd>${formatCurrency(event.amount)}</dd></div>
              <div><dt>Restwert danach</dt><dd>${formatCurrency(event.balanceAfter)}</dd></div>
              ${event.receiptNumber ? `<div><dt>Beleg</dt><dd>${escapeHtml(event.receiptNumber)}</dd></div>` : ""}
            </dl>
            ${linkedReceipt && event.type === "sold" && event.receiptNumber === linkedReceipt.number ? `<button class="voucher-history-receipt-link" type="button" data-open-receipt="${escapeHtml(linkedReceipt.number)}">Beleg öffnen</button>` : ""}
          </div>
        </article>`).join("") : `<p class="voucher-history-empty">Noch keine historischen Vorgänge vorhanden.</p>`}
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
    return data.vouchers.filter(voucher => voucher.status === "active" && Number(voucher.currentValue) > 0);
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
          <span class="voucher-list-value ${voucher.status === "active" ? "" : "is-unavailable"}"><small>Restwert</small><strong>${formatCurrency(voucher.currentValue)}</strong></span>
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
    state.voucherSalePaymentChoice = "cash";
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
    return data.paymentChoices.find(choice => choice.id === state.voucherSalePaymentChoice)?.title ?? "Bar";
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
      presentationSnapshot: currentVoucherPresentationSnapshot(),
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
    const paymentChoices = data.paymentChoices.filter(choice => choice.id === "cash" || choice.id === "card");
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
        ${saleReceipt ? `<button class="button button-secondary" type="button" data-open-receipt="${escapeHtml(saleReceipt.number)}">Beleg anzeigen</button>` : ""}
        <button class="button button-secondary" type="button" data-action="voucher-pdf">Als PDF speichern</button>
        <button class="button button-secondary" type="button" data-action="voucher-email">Per E-Mail senden</button>
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
        <div class="voucher-balance ${voucher.status === "active" ? "" : "is-unavailable"}"><span>Aktueller Restwert</span><strong>${formatCurrency(voucher.currentValue)}</strong></div>
        <div><span>Ursprünglicher Wert</span><strong>${formatCurrency(voucher.issuedValue)}</strong></div>
        <div><span>Verkauft am</span><strong>${escapeHtml([voucher.soldAt, voucher.soldTime].filter(Boolean).join(" · "))}</strong></div>
        <div><span>Zahlungsart beim Verkauf</span><strong>${escapeHtml(voucher.payment || "Nicht angegeben")}</strong></div>
        ${voucher.saleReceipt?.number ? `<div><span>Verkaufsbeleg</span>${saleReceipt ? `<button type="button" data-open-receipt="${escapeHtml(saleReceipt.number)}">${escapeHtml(saleReceipt.number)} · Beleg öffnen</button>` : `<strong>${escapeHtml(voucher.saleReceipt.number)}</strong>`}</div>` : ""}
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
          <small>${escapeHtml(presentation.issuer.city)}</small>
        </div>
        ${addressesMatch ? `<div class="voucher-location-same"><span>Einlöseort</span><strong>Ausstelleradresse</strong><small>Einlösbar an der oben genannten Adresse.</small></div>` : `<div class="voucher-party-card is-redemption-location">
          <span>Einlösbar bei</span>
          <strong>${escapeHtml(presentation.redemptionLocation.name || "Leistungsort")}</strong>
          <small>${escapeHtml(presentation.redemptionLocation.street)}</small>
          <small>${escapeHtml(presentation.redemptionLocation.city)}</small>
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
          <small>${escapeHtml(presentation.issuer.city)}</small>
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
          ${addressesMatch ? `<strong>Ausstelleradresse</strong>` : `<strong>${escapeHtml(presentation.redemptionLocation.name || "Leistungsort")}</strong><small>${escapeHtml(presentation.redemptionLocation.street)}</small><small>${escapeHtml(presentation.redemptionLocation.city)}</small>`}
        </div>
        <footer>Bitte Gutscheincode oder QR-Code bei der Einlösung vorzeigen.</footer>
      </article>

      <p class="prototype-note voucher-preview-controls">Die Vorlage enthält Demo-Daten. Der QR-Bereich ist technisch vorbereitet, aber in diesem UX-Block noch kein scanbarer Produktions-QR-Code.</p>
      <button class="button button-primary voucher-print-button voucher-preview-controls" type="button" data-action="voucher-print">Drucken / als PDF sichern</button>
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
      "voucher-sale-success"
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
    state.paymentChoice = "cash";
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
    if (payment) { state.paymentChoice = payment.dataset.paymentChoice; renderCheckout(); return; }
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
    const route = event.target.closest("[data-route]");
    if (route) {
      if ((route.dataset.route === "checkout" || route.dataset.route === "edit-cart") && !cartCount()) return;
      if (route.dataset.route === "customer-picker") {
        state.customerPickerContext = state.route === "voucher-sale" ? "voucher" : "receipt";
        state.customerSearch = "";
      }
      if (["vouchers", "voucher-detail", "voucher-preview"].includes(route.dataset.route)) state.voucherNotice = "";
      navigate(route.dataset.route);
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
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
    if (action === "receipt-preview-demo") {
      state.successNotice = "Die vollständige Belegansicht wurde bereits im vorherigen UX-Block geprüft. Hier wird das Öffnen simuliert.";
      renderReceiptDetail();
    }
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
