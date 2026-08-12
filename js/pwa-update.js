(() => {
  "use strict";

  const DEFAULT_AVAILABLE_MESSAGE = "Deine lokalen Daten bleiben erhalten.";
  const DEFAULT_RELEASE_NOTE = "Enthält Verbesserungen für Stabilität und Bedienung.";
  const DEFAULT_BLOCKED_MESSAGE = "Schließe oder verwirf zuerst den offenen Belegentwurf.";
  const DEFAULT_FAILURE_MESSAGE = "Die Aktualisierung konnte momentan nicht abgeschlossen werden.";
  const DEFAULT_ACTIVATION_TIMEOUT_MS = 15000;
  const DEFAULT_ACTIVATION_VERIFICATION_MS = 250;
  const DEFAULT_RELOAD_TIMEOUT_MS = 8000;
  const DEFAULT_REMINDER_DELAY_MS = 15 * 60 * 1000;
  const DEFAULT_MANUAL_CHECK_TIMEOUT_MS = 15000;

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
    const activationVerificationMs = environment.activationVerificationMs ?? DEFAULT_ACTIVATION_VERIFICATION_MS;
    const reloadTimeoutMs = environment.reloadTimeoutMs ?? DEFAULT_RELOAD_TIMEOUT_MS;
    const reminderDelayMs = environment.reminderDelayMs ?? DEFAULT_REMINDER_DELAY_MS;
    const manualCheckTimeoutMs = environment.manualCheckTimeoutMs ?? DEFAULT_MANUAL_CHECK_TIMEOUT_MS;
    const now = environment.now || (() => new Date());
    const enabled = environment.enabled !== false;
    const listeners = new Set();
    const observedWorkers = new WeakSet();

    let registration = null;
    let waitingWorker = null;
    let startPromise = null;
    let activationRequested = false;
    let reloadTriggered = false;
    let activationTimer = null;
    let activationVerificationTimer = null;
    let reloadTimer = null;
    let reminderTimer = null;
    let manualCheckTimer = null;
    let manualCheckPending = false;
    let controllerAtAnnouncement = null;
    let activeWorkerAtAnnouncement = null;
    let state = Object.freeze({
      status: "idle",
      hasUpdate: false,
      message: "",
      releaseNote: DEFAULT_RELEASE_NOTE,
      activationRequested: false,
      reloadTriggered: false,
      checkedAt: ""
    });

    function publish(patch) {
      state = Object.freeze({ ...state, ...patch });
      listeners.forEach(listener => listener(state));
    }

    function clearTimer(timerName) {
      const timer = timerName === "activation"
        ? activationTimer
        : timerName === "activation-verification"
          ? activationVerificationTimer
          : timerName === "reload"
            ? reloadTimer
            : timerName === "reminder"
              ? reminderTimer
              : manualCheckTimer;
      if (timer !== null) cancelScheduled(timer);
      if (timerName === "activation") activationTimer = null;
      else if (timerName === "activation-verification") activationVerificationTimer = null;
      else if (timerName === "reload") reloadTimer = null;
      else if (timerName === "reminder") reminderTimer = null;
      else manualCheckTimer = null;
    }

    function checkedAtNow() {
      const value = now();
      const date = value instanceof Date ? value : new Date(value);
      return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
    }

    function finishManualCheck(status, message) {
      clearTimer("manual-check");
      manualCheckPending = false;
      publish({
        status,
        hasUpdate: status === "available",
        message,
        checkedAt: checkedAtNow(),
        activationRequested: false,
        reloadTriggered: false
      });
    }

    function publishFailure(error = null) {
      clearTimer("activation");
      clearTimer("activation-verification");
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
      clearTimer("activation-verification");
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

    function announceWaiting(worker, { force = false } = {}) {
      if (!worker || !serviceWorker?.controller) return;
      const sameWorkerAlreadyKnown = waitingWorker === worker
        && ["available", "activating", "deferred", "error"].includes(state.status);
      if (sameWorkerAlreadyKnown && !force) return;
      waitingWorker = worker;
      controllerAtAnnouncement = serviceWorker.controller;
      activeWorkerAtAnnouncement = registration?.active || null;
      const checkedAt = manualCheckPending ? checkedAtNow() : state.checkedAt;
      clearTimer("manual-check");
      manualCheckPending = false;
      publish({
        status: "available",
        hasUpdate: true,
        message: DEFAULT_AVAILABLE_MESSAGE,
        releaseNote: DEFAULT_RELEASE_NOTE,
        activationRequested: false,
        reloadTriggered: false,
        checkedAt
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
          return;
        }
        if (worker.state === "redundant" && manualCheckPending) {
          finishManualCheck("current", "FRECKA ist aktuell.");
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

    function replacementWasTakenOver(worker) {
      if (!worker) return false;
      if (worker.state === "activated" || registration?.active === worker) return true;
      if (controllerAtAnnouncement && serviceWorker?.controller !== controllerAtAnnouncement) return true;
      return Boolean(registration?.active && registration.active !== activeWorkerAtAnnouncement);
    }

    function verifyActivation(worker) {
      activationVerificationTimer = null;
      if (!activationRequested || reloadTriggered) return;
      if (replacementWasTakenOver(worker)) {
        triggerReload();
        return;
      }
      activationVerificationTimer = schedule(
        () => verifyActivation(worker),
        activationVerificationMs
      );
    }

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

    async function check() {
      if (activationRequested) return { status: "busy" };
      if (!enabled || !serviceWorker || !isSecureContext) {
        finishManualCheck("check-error", "Die Update-Prüfung ist in diesem Browser nicht verfügbar.");
        return { status: "failed" };
      }
      if (!isOnline()) {
        finishManualCheck("check-error", "Für die Update-Prüfung wird eine Internetverbindung benötigt.");
        return { status: "failed" };
      }

      publish({ status: "checking", hasUpdate: false, message: "FRECKA sucht nach Updates …" });
      try {
        const nextRegistration = await start();
        if (!nextRegistration) throw new Error("Service worker registration unavailable");
        manualCheckPending = true;
        await nextRegistration.update?.();
        const worker = nextRegistration.waiting || waitingWorker;
        if (worker) {
          announceWaiting(worker, { force: true });
          return { status: "available" };
        }
        if (nextRegistration.installing) {
          observeWorker(nextRegistration.installing);
          if (!manualCheckPending) {
            return { status: state.hasUpdate ? "available" : "current" };
          }
          manualCheckTimer = schedule(() => {
            if (manualCheckPending) finishManualCheck("check-error", "Die Update-Prüfung konnte nicht abgeschlossen werden. Bitte versuche es erneut.");
          }, manualCheckTimeoutMs);
          return { status: "checking" };
        }
        finishManualCheck("current", "FRECKA ist aktuell.");
        return { status: "current" };
      } catch (error) {
        finishManualCheck("check-error", "Die Update-Prüfung ist fehlgeschlagen. Bitte versuche es erneut.");
        warn("FRECKA-Update-Prüfung konnte nicht abgeschlossen werden.", error);
        return { status: "failed", error };
      }
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

      if (replacementWasTakenOver(worker)) {
        triggerReload();
        return { status: "requested" };
      }

      try {
        activationTimer = schedule(() => publishFailure(), activationTimeoutMs);
        worker.postMessage({ type: "SKIP_WAITING" });
        if (replacementWasTakenOver(worker)) triggerReload();
        else verifyActivation(worker);
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
      check,
      subscribe,
      activate,
      defer,
      getState: () => state
    });
  }

  globalThis.FRECKA_PWA_UPDATES = Object.freeze({ createUpdateController });
})();
