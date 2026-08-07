(() => {
  "use strict";

  const DOCUMENT_VIEW_VERSION = "COMM-001";
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const formatCurrency = cents => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(cents || 0) / 100);

  function companyIdentityMarkup(company, ownerTag = "span") {
    const name = String(company?.name || "").trim();
    const owner = String(company?.owner || "").trim();
    const primary = name || owner || "Unternehmen";
    return `<strong class="company-identity-name">${escapeHtml(primary)}</strong>${name && owner ? `<${ownerTag} class="company-identity-owner">${escapeHtml(owner)}</${ownerTag}>` : ""}`;
  }

  function brandingLogoMarkup(branding) {
    if (!branding?.logo || branding.logoMode === "none") return "";
    const initials = String(branding.logo.initials || (branding.logo.source === "business-area" ? "GB" : "UN")).slice(0, 8);
    const caption = initials === "GB" ? "Bereich" : "Firma";
    return `<span class="document-brand-logo" aria-label="${escapeHtml(branding.logo.label || "Logo")}"><strong>${escapeHtml(initials)}</strong><small>${caption}</small></span>`;
  }

  function maskedVoucherCode(value) {
    const code = String(value || "");
    const parts = code.split("-").filter(Boolean);
    return parts.length >= 3 ? `${parts[0]}-••••-${parts.at(-1)}` : code;
  }

  function voucherStatusClass(status) {
    if (status === "redeemed") return "is-redeemed";
    if (status === "cancelled") return "is-cancelled";
    if (status === "partially_redeemed") return "is-partial";
    return "is-active";
  }

  function qrMarkup(qr, { variant, caption = "", interactive = true, qrKey = "", label }) {
    if (!qr?.svg) return `<div class="frecka-qr-error" role="alert">Der QR-Code konnte nicht erzeugt werden.</div>`;
    const contents = `${qr.svg}${caption ? `<span>${escapeHtml(caption)}</span>` : ""}`;
    if (!interactive) return `<div class="frecka-qr frecka-qr-${escapeHtml(variant)}" aria-label="${escapeHtml(label)}">${contents}</div>`;
    if (!qrKey) return `<div class="frecka-qr-error" role="alert">Der QR-Code konnte nicht geöffnet werden.</div>`;
    return `<button class="frecka-qr frecka-qr-${escapeHtml(variant)}" type="button" data-public-qr-key="${escapeHtml(qrKey)}" aria-label="${escapeHtml(label)}">${contents}</button>`;
  }

  function renderReceipt(model, options = {}) {
    if (!model || model.type !== "receipt") throw new TypeError("Receipt document model required");
    const isVoucherSale = model.kind.code === "voucher-sale";
    return `<article class="receipt-paper ${isVoucherSale ? "is-voucher-sale" : ""}">
      <header>
        ${brandingLogoMarkup(model.branding)}
        ${model.branding.visibleName ? `<em class="document-visible-name">${escapeHtml(model.branding.visibleName)}</em>` : ""}
        ${companyIdentityMarkup(model.issuer)}
        ${model.issuer.street ? `<small>${escapeHtml(model.issuer.street)}</small>` : ""}
        ${model.issuer.cityLine ? `<small>${escapeHtml(model.issuer.cityLine)}</small>` : ""}
        ${model.issuer.taxNumber ? `<small>Steuernummer: ${escapeHtml(model.issuer.taxNumber)}</small>` : ""}
        ${model.issuer.vatId ? `<small>USt-IdNr.: ${escapeHtml(model.issuer.vatId)}</small>` : ""}
      </header>
      <div class="receipt-paper-meta"><span>Beleg ${escapeHtml(model.number)}</span><span>${escapeHtml(model.dateTime)}</span></div>
      <div class="receipt-paper-kind"><span>Belegart</span><strong>${escapeHtml(model.kind.label)}</strong></div>
      <div class="receipt-paper-items">
        ${model.positions.map(item => `<div class="receipt-paper-item"><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.quantity)} × ${formatCurrency(item.originalUnitCents)}</small>${item.discountCents > 0 ? `<em>${escapeHtml(item.discountLabel)} <b>−${formatCurrency(item.discountCents)}</b></em>` : ""}</span><strong>${formatCurrency(item.totalCents)}</strong></div>`).join("")}
      </div>
      ${model.customer ? `<div class="receipt-paper-customer"><span>Kunde</span><strong>${escapeHtml(model.customer.name)}</strong>${[model.customer.street, model.customer.cityLine].filter(Boolean).map(line => `<small>${escapeHtml(line)}</small>`).join("")}</div>` : ""}
      <div class="receipt-paper-row"><span>Zahlungsstatus</span><strong>${escapeHtml(model.paymentStatusLabel)}</strong></div>
      ${model.paymentStatus === "open" ? "" : `<div class="receipt-paper-row"><span>Zahlungsart</span><strong>${escapeHtml(model.paymentMethod)}</strong></div>`}
      ${model.voucherPayment ? `<div class="receipt-paper-voucher-payment"><span><small>Bezahlt mit Gutschein</small><strong>${escapeHtml(maskedVoucherCode(model.voucherPayment.code))}</strong></span><strong>${formatCurrency(model.voucherPayment.amountCents)}</strong></div>` : ""}
      ${model.remainderPayment ? `<div class="receipt-paper-row"><span>Restzahlung · ${escapeHtml(model.remainderPayment.method)}</span><strong>${formatCurrency(model.remainderPayment.amountCents)}</strong></div>` : ""}
      ${model.linkedVoucher?.code ? `<div class="receipt-paper-voucher-link"><span>Verknüpfter Gutschein</span><strong>${escapeHtml(maskedVoucherCode(model.linkedVoucher.code))}</strong></div>` : ""}
      ${model.correctionReference ? `<div class="receipt-paper-row"><span>Bezug</span><strong>${escapeHtml(model.correctionReference)}</strong></div>` : ""}
      ${!isVoucherSale && model.taxes.length ? `<div class="receipt-paper-totals">${model.totals.discountCents > 0 ? `<div><span>Zwischensumme</span><strong>${formatCurrency(model.totals.subtotalCents)}</strong></div><div class="receipt-discount-total"><span>Rabatt gesamt</span><strong>−${formatCurrency(model.totals.discountCents)}</strong></div>` : ""}<div><span>Netto</span><strong>${formatCurrency(model.totals.netCents)}</strong></div>${model.taxes.map(group => `<div><span>MwSt. ${escapeHtml(group.rate)}%</span><strong>${formatCurrency(group.taxCents)}</strong></div>`).join("")}</div>` : ""}
      <div class="receipt-paper-total"><span>${isVoucherSale ? "Gesamtbetrag" : "Gesamt brutto"}</span><strong>${formatCurrency(model.totals.grossCents)}</strong></div>
      <footer>${escapeHtml(model.texts.thankYou)}${model.texts.footer ? `<small>${escapeHtml(model.texts.footer)}</small>` : ""}</footer>
      <div class="receipt-paper-qr">${qrMarkup(model.qr, { variant: "receipt", caption: "Digitaler Beleg", interactive: options.interactiveQr !== false, qrKey: options.qrKey, label: "QR-Code zum digitalen Beleg im Vollbild anzeigen" })}</div>
    </article>`;
  }

  function renderVoucher(model, options = {}) {
    if (!model || model.type !== "voucher") throw new TypeError("Voucher document model required");
    return `<article class="voucher-sheet">
      <header>
        <span>Gutschein</span>
        ${brandingLogoMarkup(model.branding)}
        ${model.branding.visibleName ? `<em class="document-visible-name">${escapeHtml(model.branding.visibleName)}</em>` : ""}
        <small class="voucher-sheet-label">Aussteller</small>
        ${companyIdentityMarkup(model.issuer, "small")}
        ${model.issuer.street ? `<small>${escapeHtml(model.issuer.street)}</small>` : ""}
        ${model.issuer.cityLine ? `<small>${escapeHtml(model.issuer.cityLine)}</small>` : ""}
      </header>
      ${model.displayName ? `<div class="voucher-sheet-recipient"><span>Name auf dem Gutschein</span><strong>${escapeHtml(model.displayName)}</strong></div>` : ""}
      <div class="voucher-sheet-value"><span>Wert</span><strong>${formatCurrency(model.issuedValueCents)}</strong></div>
      ${model.currentValueCents !== model.issuedValueCents ? `<div class="voucher-sheet-status"><span>Restwert</span><strong>${formatCurrency(model.currentValueCents)}</strong></div>` : ""}
      <div class="voucher-sheet-qr">${qrMarkup(model.qr, { variant: "voucher-sheet", interactive: options.interactiveQr !== false, qrKey: options.qrKey, label: "Gutschein-QR-Code im Vollbild anzeigen" })}</div>
      <div class="voucher-sheet-status"><span>Status</span><strong class="voucher-status ${voucherStatusClass(model.status)}">${escapeHtml(model.statusLabel)}</strong></div>
      <div class="voucher-sheet-code"><span>Gutscheincode</span><strong>${escapeHtml(model.code)}</strong></div>
      <div class="voucher-sheet-location"><span>Einlösbar bei</span><strong>${escapeHtml(model.redemptionLocation.name)}</strong>${model.redemptionLocation.street ? `<small>${escapeHtml(model.redemptionLocation.street)}</small>` : ""}${model.redemptionLocation.cityLine ? `<small>${escapeHtml(model.redemptionLocation.cityLine)}</small>` : ""}${model.redemptionLocation.voucherNote ? `<small>${escapeHtml(model.redemptionLocation.voucherNote)}</small>` : ""}</div>
      <footer>Bitte Gutscheincode oder QR-Code bei der Einlösung vorzeigen.</footer>
    </article>`;
  }

  globalThis.FRECKA_DOCUMENT_VIEW = Object.freeze({
    DOCUMENT_VIEW_VERSION,
    renderReceipt,
    renderVoucher,
    renderDocument(model, options = {}) {
      return model?.type === "voucher" ? renderVoucher(model, options) : renderReceipt(model, options);
    }
  });
})();
