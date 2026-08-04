(() => {
  "use strict";
  const data = window.PROTOTYPE_DATA;
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
    creditMode: "full",
    creditAmount: "",
    creditText: "Korrektur / Kulanz",
    finishedReceipt: null,
    successNotice: "",
    qrVisible: false
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
  const flowRoutes = new Set(["catalog", "edit-cart", "checkout", "customer-picker", "customer-new", "customer-edit", "customer-detail", "receipt-success", "receipt-preview", "receipt-detail", "receipt-credit"]);
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
    const current = Number(sessionStorage.getItem("prototypeReceiptCounter") || "127");
    const next = current + 1;
    sessionStorage.setItem("prototypeReceiptCounter", String(next));
    return `2026-${String(next).padStart(6, "0")}`;
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
  function customerCard(c, selectable=false) {
    return `<article class="customer-card ${state.selectedCustomerId===c.id?"is-selected":""}">
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
    const title=selectable?"Kunde auswählen":"Kunden";
    const back=selectable?'checkout':'home';
    mainContent.innerHTML=`<section class="flow-page customer-page page-enter">
      <div class="flow-head compact-flow-head"><button class="button button-back" type="button" data-route="${back}"><span aria-hidden="true">←</span> Zurück</button><p class="eyebrow">${selectable?'Neuer Beleg':'Verwaltung'}</p><h1 class="flow-title">${title}</h1><p class="page-copy">Nach Name, Telefon oder E-Mail suchen.</p></div>
      <div class="customer-toolbar"><label class="search-field"><span aria-hidden="true">⌕</span><input id="customerSearch" type="search" placeholder="Kunde suchen" value="${escapeHtml(state.customerSearch)}"></label><button class="button button-primary customer-new-button" type="button" data-route="customer-new">＋ Neuer Kunde</button></div>
      ${selectable?'<button class="customer-none" type="button" data-select-no-customer>Ohne Kunde fortfahren</button>':''}
      <div class="customer-list">${list.length?list.map(c=>customerCard(c,selectable)).join(''):'<div class="empty-state">Keine passenden Kunden gefunden.</div>'}</div>
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
      && !hasCancellation
      && receipt.status !== "cancelled"
      && receipt.status !== "credited"
      && remainingCredit > 0.009;
    mainContent.innerHTML = `<section class="flow-page receipt-detail-page page-enter">
      <div class="flow-head compact-work-head">
        <button class="button button-back" type="button" data-route="receipts"><span aria-hidden="true">←</span> Zurück</button>
        <p class="eyebrow">${receipt.type === "credit" ? "Gutschrift" : "Beleg"}</p>
        <h1 class="flow-title">${escapeHtml(receipt.number)}</h1>
        <p class="page-copy">${escapeHtml(receipt.date)} · ${escapeHtml(receipt.time)}</p>
      </div>

      <section class="receipt-detail-status">
        <span class="receipt-status ${receiptStatusClass(receipt)}">${escapeHtml(receiptStatusLabel(receipt))}</span>
        <strong>${formatCurrency(receipt.total)}</strong>
      </section>

      <section class="receipt-detail-card">
        <div class="receipt-detail-row"><span>Kunde</span><strong>${escapeHtml(receiptCustomerLabel(receipt))}</strong></div>
        <div class="receipt-detail-row"><span>Zahlungsart</span><strong>${escapeHtml(receipt.payment)}</strong></div>
        ${receipt.reference ? `<div class="receipt-detail-row"><span>Bezug</span><button type="button" data-open-receipt="${escapeHtml(receipt.reference)}">${escapeHtml(receipt.reference)}</button></div>` : ""}
      </section>

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
        <button class="button button-secondary" type="button" data-action="copy-receipt">Duplizieren</button>
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
      "receipt-preview"
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
    const existing = state.cart.find(item => item.id === id);
    if (existing) {
      state.cart = state.cart.filter(item => item.id !== id);
      if (!state.cart.length) state.cartExpanded = false;
      renderCatalog();
      return;
    }
    const product = (data.catalog[state.activeBusinessArea] ?? []).find(item => item.id === id);
    if (!product) return;
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
    if (selectCustomer) { state.selectedCustomerId = selectCustomer.dataset.selectCustomer; state.customerChoice = "existing"; navigate("checkout"); return; }
    if (event.target.closest("[data-select-no-customer]")) { state.selectedCustomerId = null; state.customerChoice = "none"; if(state.cart.length) navigate("checkout"); else renderCustomers(false); return; }
    const receiptFilter = event.target.closest("[data-receipt-filter]");
    if (receiptFilter) {
      state.receiptFilter = receiptFilter.dataset.receiptFilter;
      renderReceipts();
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
    const route = event.target.closest("[data-route]");
    if (route) { if ((route.dataset.route === "checkout" || route.dataset.route === "edit-cart") && !cartCount()) return; navigate(route.dataset.route); return; }
    const action = event.target.closest("[data-action]")?.dataset.action;
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
      if (receipt) {
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
