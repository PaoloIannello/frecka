(() => {
  "use strict";

  // Leer bedeutet: aktuelle HTTPS-Deployment-Adresse verwenden. Für eine spätere
  // FRECKA-Domain muss ausschließlich dieser Wert angepasst werden.
  globalThis.FRECKA_CONFIG = Object.freeze({
    publicViewerBaseUrl: ""
  });
})();
