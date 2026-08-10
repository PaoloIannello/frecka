(() => {
  "use strict";

  const DEFAULT_AVAILABLE_MESSAGE = "Aktualisiere bewusst. Deine lokalen Daten bleiben erhalten.";
  const DEFAULT_BLOCKED_MESSAGE = "Schließe oder verwirf zuerst den offenen Belegentwurf.";

  function createUpdateController(environment = {}) {
    const root = environment.globalScope || globalThis;
    const serviceWorker = environment.serviceWorkerContainer || root.navigator?.serviceWorker || null;
    const isSecureContext = environment.isSecureContext ?? root.isSecureContext === true;
    const isOnline = environment.isOnline || (() => root.navigator?.onLine !== false);
    const reload = environment.reload || (() => root.location?.reload?.());
    const warn = environment.warn || ((message, error) => root.console?.warn?.(message, error));
    const enabled = environment.enabled !== false;
    const listeners = new Set();
    const observedWorkers = new WeakSet();

    let registration = null;
    let waitingWorker = null;
    let startPromise = null;
    let activationRequested = false;
    let reloadTriggered = false;
    let state = Object.freeze({
      status: "idle",
      hasUpdate: false,
      message: "",
      activationRequested: false,
      reloadTriggered: false
    });

    function publish(patch) {
      state = Object.freeze({ ...state, ...patch });
      listeners.forEach(listener => listener(state));
    }

    function announceWaiting(worker) {
      if (!worker || !serviceWorker?.controller) return;
      if (waitingWorker === worker && (state.status === "available" || state.status === "activating")) return;
      waitingWorker = worker;
      publish({
        status: "available",
        hasUpdate: true,
        message: DEFAULT_AVAILABLE_MESSAGE,
        activationRequested: false
      });
    }

    function observeWorker(worker) {
      if (!worker || observedWorkers.has(worker)) return;
      observedWorkers.add(worker);
      const inspect = () => {
        if (worker.state === "installed") {
          announceWaiting(registration?.waiting || worker);
          return;
        }
        if (worker.state === "redundant" && waitingWorker === worker && !activationRequested) {
          waitingWorker = null;
          publish({ status: "idle", hasUpdate: false, message: "" });
        }
      };
      worker.addEventListener?.("statechange", inspect);
      inspect();
    }

    function observeRegistration(nextRegistration) {
      registration = nextRegistration;
      nextRegistration.addEventListener?.("updatefound", () => observeWorker(nextRegistration.installing));
      observeWorker(nextRegistration.installing);
      announceWaiting(nextRegistration.waiting);
    }

    function handleControllerChange() {
      if (!activationRequested || reloadTriggered) return;
      reloadTriggered = true;
      publish({ reloadTriggered: true });
      reload();
    }

    serviceWorker?.addEventListener?.("controllerchange", handleControllerChange);

    function start({ scriptUrl = "./service-worker.js", scope = "./" } = {}) {
      if (startPromise) return startPromise;
      if (!enabled || !serviceWorker || !isSecureContext) {
        startPromise = Promise.resolve(null);
        return startPromise;
      }

      startPromise = Promise.resolve()
        .then(() => serviceWorker.register(scriptUrl, { scope }))
        .then(async nextRegistration => {
          observeRegistration(nextRegistration);
          if (isOnline()) {
            try {
              await nextRegistration.update?.();
            } catch {
              // Die aktive App-Shell bleibt vollständig nutzbar; eine spätere Online-Sitzung prüft erneut.
            }
          }
          announceWaiting(nextRegistration.waiting);
          return nextRegistration;
        })
        .catch(error => {
          if (isOnline()) warn("FRECKA App-Shell konnte nicht registriert werden.", error);
          return null;
        });
      return startPromise;
    }

    function subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    }

    function activate(canActivate = () => true) {
      if (activationRequested) return { status: "already-requested" };
      const worker = registration?.waiting || waitingWorker;
      if (!worker) return { status: "unavailable" };

      const permission = canActivate();
      const allowed = typeof permission === "object" ? permission.allowed !== false : permission !== false;
      if (!allowed) {
        publish({
          status: "available",
          hasUpdate: true,
          message: typeof permission === "object" && permission.message
            ? String(permission.message)
            : DEFAULT_BLOCKED_MESSAGE
        });
        return { status: "blocked" };
      }

      activationRequested = true;
      publish({
        status: "activating",
        hasUpdate: true,
        message: "FRECKA wird aktualisiert …",
        activationRequested: true
      });
      try {
        worker.postMessage({ type: "SKIP_WAITING" });
        return { status: "requested" };
      } catch (error) {
        activationRequested = false;
        publish({
          status: "available",
          hasUpdate: true,
          message: "Die Aktualisierung konnte noch nicht gestartet werden. Versuche es erneut.",
          activationRequested: false
        });
        return { status: "failed", error };
      }
    }

    return Object.freeze({
      start,
      subscribe,
      activate,
      getState: () => state
    });
  }

  globalThis.FRECKA_PWA_UPDATES = Object.freeze({ createUpdateController });
})();
