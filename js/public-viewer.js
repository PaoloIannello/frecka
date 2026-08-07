(() => {
  "use strict";

  const PUBLIC_VIEWER_VERSION = "QR-002";
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function isRequested(value = globalThis.location?.href) {
    const service = globalThis.FRECKA_PUBLIC_DOCUMENTS;
    if (service?.isPublicLink) return service.isPublicLink(value);
    try {
      return new URL(String(value || ""), globalThis.location?.href).hash.startsWith("#/p");
    } catch (error) {
      return String(value || "").startsWith("#/p");
    }
  }

  function setNotice(element, message, isError = false) {
    if (!element) return;
    element.hidden = !message;
    element.classList.toggle("is-error", isError);
    element.setAttribute("role", isError ? "alert" : "status");
    element.textContent = message;
  }

  async function mount(value = globalThis.location?.href) {
    if (!isRequested(value)) return false;
    const transport = globalThis.FRECKA_PUBLIC_DOCUMENTS;
    const documentService = globalThis.FRECKA_DOCUMENTS;
    const documentView = globalThis.FRECKA_DOCUMENT_VIEW;
    const sharing = globalThis.FRECKA_SHARING;
    const main = document.getElementById("mainContent");
    const app = document.getElementById("app");
    document.body.classList.add("public-document-mode");
    document.documentElement.dataset.publicViewer = "true";
    app?.classList.add("public-document-shell");
    app?.querySelector(".app-header")?.setAttribute("hidden", "");
    document.getElementById("bottomNav")?.setAttribute("hidden", "");
    if (!main) return true;
    main.removeAttribute("aria-busy");
    main.innerHTML = `<section class="public-viewer-loading" aria-live="polite"><span class="persistence-loading-spinner" aria-hidden="true"></span><strong>Digitales Dokument wird geöffnet …</strong></section>`;

    if (!transport?.decodePublicLink || !documentService?.createPdfBlob || !documentView?.renderDocument || !sharing?.downloadFallback || !sharing?.sharePreferred) {
      main.innerHTML = `<section class="public-viewer-error" role="alert"><span aria-hidden="true">!</span><h1>Dokument nicht verfügbar</h1><p>Diese FRECKA-Version kann den digitalen Link nicht öffnen.</p></section>`;
      return true;
    }

    let bundle;
    try {
      bundle = await transport.decodePublicLink(value);
      if (!bundle?.model) throw new Error("Missing public document");
    } catch (error) {
      main.innerHTML = `<section class="public-viewer-error" role="alert"><span aria-hidden="true">!</span><h1>Dokument nicht lesbar</h1><p>${escapeHtml(error?.userMessage || "Der digitale FRECKA-Link ist ungültig oder beschädigt.")}</p></section>`;
      return true;
    }

    const model = bundle.model;
    const heading = model.type === "receipt" ? model.kind.title : "Gutschein";
    const reference = model.type === "receipt" ? model.number : model.code;
    document.title = `${heading} ${reference} – FRECKA`;
    main.innerHTML = `<section class="public-viewer-page" data-public-viewer-mounted="true">
      <header class="public-viewer-head"><p class="eyebrow">FRECKA</p><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(reference)}</p></header>
      ${documentView.renderDocument(model, { interactiveQr: false })}
      <div id="publicViewerNotice" class="public-viewer-notice" hidden></div>
      <div class="public-viewer-actions" aria-label="Dokument verwenden">
        <button class="button button-secondary" type="button" data-public-viewer-action="pdf" disabled>PDF wird vorbereitet …</button>
        <button class="button button-primary" type="button" data-public-viewer-action="share" disabled>Teilen</button>
      </div>
      <p class="public-viewer-privacy">Dieses Dokument wird ausschließlich aus dem QR-Link gelesen und nicht in FRECKA gespeichert.</p>
    </section>`;

    const notice = document.getElementById("publicViewerNotice");
    const pdfButton = main.querySelector('[data-public-viewer-action="pdf"]');
    const shareButton = main.querySelector('[data-public-viewer-action="share"]');
    let pdfFile = null;
    const pdfPromise = documentService.createPdfBlob(model)
      .then(blob => {
        try {
          pdfFile = sharing.createFile?.(blob, { name: model.filename, type: "application/pdf" });
        } catch (error) {
          pdfFile = blob;
          try { Object.defineProperty(pdfFile, "name", { value: model.filename, configurable: true }); } catch (nameError) { /* Download nutzt notfalls den Standardnamen. */ }
        }
        if (!pdfFile) {
          pdfFile = blob;
          try { Object.defineProperty(pdfFile, "name", { value: model.filename, configurable: true }); } catch (nameError) { /* Download nutzt notfalls den Standardnamen. */ }
        }
        pdfButton.disabled = false;
        pdfButton.textContent = "PDF speichern";
        shareButton.disabled = false;
        return pdfFile;
      })
      .catch(error => {
        pdfButton.textContent = "PDF nicht verfügbar";
        shareButton.disabled = !sharing.canShareUrl?.(bundle.link);
        setNotice(notice, error?.userMessage || "Das PDF konnte in diesem Browser nicht erstellt werden.", true);
        return null;
      });

    main.addEventListener("click", async event => {
      const actionButton = event.target.closest("[data-public-viewer-action]");
      if (!actionButton || actionButton.disabled) return;
      actionButton.disabled = true;
      try {
        if (actionButton.dataset.publicViewerAction === "pdf") {
          const file = pdfFile || await pdfPromise;
          if (!file) throw new Error("PDF unavailable");
          sharing.downloadFallback(file);
          setNotice(notice, "Das PDF wurde zum Speichern auf diesem Gerät bereitgestellt.");
          return;
        }
        const file = pdfFile || await pdfPromise;
        const result = await sharing.sharePreferred({
          files: file ? [file] : [],
          url: bundle.link,
          metadata: {
            title: `${heading} ${reference}`,
            text: model.type === "receipt" ? "Digitaler FRECKA-Beleg" : "Digitaler FRECKA-Gutschein"
          },
          downloadFile: file
        });
        if (result.status === "shared") setNotice(notice, "Der Teilen-Dialog wurde an das Betriebssystem übergeben.");
        else if (result.status === "cancelled") setNotice(notice, "Teilen wurde abgebrochen.");
        else if (result.status === "downloaded") setNotice(notice, "Das PDF wurde stattdessen zum Speichern bereitgestellt.");
        else setNotice(notice, "Teilen ist in diesem Browser nicht verfügbar.", true);
      } catch (error) {
        setNotice(notice, error?.userMessage || "Die Aktion konnte nicht ausgeführt werden.", true);
      } finally {
        actionButton.disabled = false;
      }
    });
    return true;
  }

  globalThis.FRECKA_PUBLIC_VIEWER = Object.freeze({
    PUBLIC_VIEWER_VERSION,
    isRequested,
    mount
  });
})();
