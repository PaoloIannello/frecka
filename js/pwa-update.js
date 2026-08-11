(() => {
  "use strict";

  const DEFAULT_AVAILABLE_MESSAGE = "Deine lokalen Daten bleiben erhalten.";
  const DEFAULT_RELEASE_NOTE = "Enthält Verbesserungen für Stabilität und Bedienung.";
  const DEFAULT_BLOCKED_MESSAGE = "Schließe oder verwirf zuerst den offenen Belegentwurf.";
  const DEFAULT_FAILURE_MESSAGE = "Die Aktualisierung konnte momentan nicht abgeschlossen werden.";
  const DEFAULT_ACTIVATION_TIMEOUT_MS = 15000;
  const DEFAULT_RELOAD_TIMEOUT_MS = 8000;
  const DEFAULT_REMINDER_DELAY_MS = 15 * 60 * 1000;

  function createUpdateController(environment = {}) {
    const root = environment.globalScope || globalThis;
    const serviceWorker = environment.serviceWorkerContainer || root.navigator?.serviceWorker || null;
    const isSecureContext = environment.isSecureContext ?? root.isSecureContext === true;
    const isOnline = environment.isOnline || (() => root.navigator?.onLine !== false);
    const reload = environment.reload || (() => root.location?.reload?.());
    const warn = environment.warn || ((message, error) => root.console?.warn?.(message, error));
    const schedule = environment.schedule || ((callback, delay) => root.setTimeout(callback, delay));
    const cancelScheduled = environment.cancelScheduled || (timer => root.clearTimeout(timer));
    const activationTimeoutMs = environment.activationTimeoutMs ?? DEFAULT_ACTIVATION_TIMEOUT_MS;
    const reloadTimeoutMs = environment.reloadTimeoutMs ?? DEFAULT_RELOAD_TIMEOUT_MS;
    const reminderDelayMs = environment.reminderDelayMs ?? DEFAULT_REMINDER_DELAY_MS;
    const enabled = environment.enabled !== false;
    const listeners = new Set();
    const observedWorkers = new WeakSet();

    let registration = null;
    let waitingWorker = null;
    let startPromise = null;
    let activationRequested = false;
    let reloadTriggered = false;
    let activationTimer = null;
    let reloadTimer = null;
    let reminderTimer = null;
    let state = Object.freeze({
      status: "idle",
      hasUpdate: false,
      message: "",
      releaseNote: DEFAULT_RELEASE_NOTE,
      activationRequested: false,
      reloadTriggered: false
    });

    function publish(patch) {
      state = Object.freeze({ ...state, ...patch });
      listeners.forEach(listener => listener(state));
    }

    function clearTimer(timerName) {
      const timer = timerName === "activation"
        ? activationTimer
        : timerName === "reload"
          ? reloadTimer
          : reminderTimer;
      if (timer !== null) cancelScheduled(timer);
      if (timerName === "activation") activationTimer = null;
      else if (timerName === "reload") reloadTimer = null;
      else reminderTimer = null;
    }

    function publishFailure(error = null) {
      clearTimer("activation");
      clearTimer("reload");
      activationRequested = false;
      reloadTriggered = false;
      publish({
        status: "error",
        hasUpdate: true,
        message: DEFAULT_FAILURE_MESSAGE,
        activationRequested: false,
        reloadTriggered: false
      });
      if (error) warn("FRECKA-Aktualisierung konnte nicht abgeschlossen werden.", error);
    }

    function triggerReload() {
      if (!activationRequested || reloadTriggered) return false;
      clearTimer("activation");
      reloadTriggered = true;
      publish({
        status: "activating",
        hasUpdate: true,
        message: "FRECKA startet neu …",
        reloadTriggered: true
      });
      try {
        reload();
        reloadTimer = schedule(() => publishFailure(), reloadTimeoutMs);
        return true;
      } catch (error) {
        publishFailure(error);
        return false;
      }
    }

    function announceWaiting(worker) {
      if (!worker || !serviceWorker?.controller) return;
      const sameWorkerAlreadyKnown = waitingWorker === worker
        && ["available", "activating", "deferred", "error"].includes(state.status);
      if (sameWorkerAlreadyKnown) return;
      waitingWorker = worker;
      publish({
        status: "available",
        hasUpdate: true,
        message: DEFAULT_AVAILABLE_MESSAGE,
        releaseNote: DEFAULT_RELEASE_NOTE,
        activationRequested: false,
        reloadTriggered: false
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
        if (worker.state === "activated") {
          if (activationRequested) triggerReload();
          else announceWaiting(worker);
          return;
        }
        if (worker.state === "redundant" && waitingWorker === worker) {
          if (activationRequested) {
            publishFailure();
          } else {
            waitingWorker = null;
            publish({ status: "idle", hasUpdate: false, message: "" });
          }
        }
      };
      worker.addEventListener?.("statechange", inspect);
      inspect();
    }

    function observeRegistration(nextRegistration) {
      registration = nextRegistration;
      nextRegistration.addEventListener?.("updatefound", () => observeWorker(nextRegistration.installing));
      observeWorker(nextRegistration.installing);
      observeWorker(nextRegistration.waiting);
      announceWaiting(nextRegistration.waiting);
      const activeReplacement = nextRegistration.active;
      if (activeReplacement && serviceWorker?.controller && activeReplacement !== serviceWorker.controller) {
        observeWorker(activeReplacement);
        announceWaiting(activeReplacement);
      }
    }

    function handleControllerChange() {
      if (!activationRequested || reloadTriggered) return;
      triggerReload();
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
          observeWorker(nextRegistration.waiting);
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

      clearTimer("reminder");
      activationRequested = true;
      reloadTriggered = false;
      publish({
        status: "activating",
        hasUpdate: true,
        message: "FRECKA wird aktualisiert …",
        activationRequested: true,
        reloadTriggered: false
      });

      if (worker.state === "activated") {
        triggerReload();
        return { status: "requested" };
      }

      try {
        activationTimer = schedule(() => publishFailure(), activationTimeoutMs);
        worker.postMessage({ type: "SKIP_WAITING" });
        return { status: "requested" };
      } catch (error) {
        publishFailure(error);
        return { status: "failed", error };
      }
    }

    function defer() {
      if (!waitingWorker && !registration?.waiting) return { status: "unavailable" };
      if (activationRequested) return { status: "busy" };
      clearTimer("reminder");
      publish({
        status: "deferred",
        hasUpdate: false,
        message: "",
        activationRequested: false,
        reloadTriggered: false
      });
      reminderTimer = schedule(() => {
        reminderTimer = null;
        if (!activationRequested && waitingWorker) {
          publish({
            status: "available",
            hasUpdate: true,
            message: DEFAULT_AVAILABLE_MESSAGE,
            releaseNote: DEFAULT_RELEASE_NOTE
          });
        }
      }, reminderDelayMs);
      return { status: "deferred" };
    }

    return Object.freeze({
      start,
      subscribe,
      activate,
      defer,
      getState: () => state
    });
  }

  globalThis.FRECKA_PWA_UPDATES = Object.freeze({ createUpdateController });
})();
