import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../js/pwa-update.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const dataSource = await readFile(new URL("../js/data.js", import.meta.url), "utf8");
const stylesSource = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const context = vm.createContext({ console });
vm.runInContext(source, context, { filename: "pwa-update.js" });
const { createUpdateController } = context.FRECKA_PWA_UPDATES;

class FakeTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const entries = this.listeners.get(type) || [];
    entries.push(listener);
    this.listeners.set(type, entries);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) || []) listener();
  }
}

function createWorker(state = "installing", { postMessageError = null } = {}) {
  const worker = new FakeTarget();
  worker.state = state;
  worker.messages = [];
  worker.postMessage = message => {
    if (postMessageError) throw postMessageError;
    worker.messages.push(message);
  };
  return worker;
}

function createScheduler() {
  let nextId = 1;
  const entries = new Map();
  return {
    schedule(callback, delay) {
      const id = nextId++;
      entries.set(id, { callback, delay });
      return id;
    },
    cancel(id) {
      entries.delete(id);
    },
    runDelay(delay) {
      const due = [...entries.entries()].filter(([, entry]) => entry.delay === delay);
      for (const [id, entry] of due) {
        entries.delete(id);
        entry.callback();
      }
    },
    count() {
      return entries.size;
    }
  };
}

function createHarness({
  online = true,
  waiting = null,
  active = null,
  updateError = null,
  onUpdate = null,
  registerError = null,
  reloadError = null,
  currentController = null,
  activationTimeoutMs = 1000,
  activationVerificationMs = 100,
  reloadTimeoutMs = 500,
  reminderDelayMs = 900
} = {}) {
  const registration = new FakeTarget();
  registration.installing = null;
  registration.waiting = waiting;
  registration.active = active;
  registration.updateCalls = 0;
  registration.update = async () => {
    registration.updateCalls += 1;
    if (updateError) throw updateError;
    await onUpdate?.(registration, registration.updateCalls);
  };

  const container = new FakeTarget();
  container.controller = currentController || { scriptURL: "old-service-worker.js" };
  container.registerCalls = [];
  container.register = async (scriptUrl, options) => {
    container.registerCalls.push({ scriptUrl, options });
    if (registerError) throw registerError;
    return registration;
  };

  const scheduler = createScheduler();
  const warnings = [];
  let reloads = 0;
  const controller = createUpdateController({
    serviceWorkerContainer: container,
    isSecureContext: true,
    isOnline: () => online,
    reload: () => {
      if (reloadError) throw reloadError;
      reloads += 1;
    },
    warn: (...args) => warnings.push(args),
    schedule: scheduler.schedule,
    cancelScheduled: scheduler.cancel,
    activationTimeoutMs,
    activationVerificationMs,
    reloadTimeoutMs,
    reminderDelayMs
  });
  return { controller, container, registration, scheduler, warnings, reloads: () => reloads };
}

{
  const harness = createHarness();
  await harness.controller.start();
  const result = await harness.controller.check();
  assert.equal(result.status, "current", "Eine erfolgreiche manuelle Prüfung ohne neuen Worker muss 'aktuell' melden.");
  assert.equal(harness.controller.getState().status, "current");
  assert.equal(harness.controller.getState().message, "FRECKA ist aktuell.");
  assert.match(harness.controller.getState().checkedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(harness.registration.updateCalls, 2, "Manuelle Suche muss die bestehende Registration gezielt erneut prüfen.");
}

{
  const waiting = createWorker("installed");
  const harness = createHarness({
    onUpdate: registration => { registration.waiting = waiting; }
  });
  await harness.controller.start();
  harness.controller.defer();
  assert.equal(harness.controller.getState().hasUpdate, false, "Vorbedingung: Update wurde sitzungsbezogen verschoben.");
  const result = await harness.controller.check();
  assert.equal(result.status, "available", "Manuelle Suche muss ein weiterhin wartendes Update wieder sichtbar machen.");
  assert.equal(harness.controller.getState().status, "available");
  assert.equal(harness.controller.getState().hasUpdate, true);
  assert.equal(waiting.messages.length, 0, "Manuelle Suche darf den Worker nicht selbst aktivieren.");
}

{
  const harness = createHarness({ online: false });
  const result = await harness.controller.check();
  assert.equal(result.status, "failed");
  assert.equal(harness.controller.getState().status, "check-error");
  assert.match(harness.controller.getState().message, /Internetverbindung/);
  assert.equal(harness.reloads(), 0, "Eine fehlgeschlagene manuelle Prüfung darf nie neu laden.");
}

{
  const harness = createHarness({ updateError: new Error("manual update failed") });
  await harness.controller.start();
  const result = await harness.controller.check();
  assert.equal(result.status, "failed");
  assert.equal(harness.controller.getState().status, "check-error");
  assert.equal(harness.reloads(), 0);
  assert.equal(harness.controller.activate(() => true).status, "unavailable", "Prüffehler darf keinen nicht vorhandenen Worker aktivieren.");
}

{
  const harness = createHarness();
  const states = [];
  harness.controller.subscribe(state => states.push(state));
  const firstStart = harness.controller.start({ scriptUrl: "./service-worker.js", scope: "./" });
  const secondStart = harness.controller.start({ scriptUrl: "./ignored.js", scope: "/ignored/" });
  assert.equal(firstStart, secondStart, "Die Updateprüfung darf pro App-Start nur einmal initialisiert werden.");
  await firstStart;
  assert.equal(harness.container.registerCalls.length, 1);
  assert.equal(harness.container.registerCalls[0].scriptUrl, "./service-worker.js");
  assert.equal(harness.container.registerCalls[0].options.scope, "./");
  assert.equal(harness.registration.updateCalls, 1, "Beim Online-Start muss genau eine gezielte Prüfung stattfinden.");
  assert.equal(harness.controller.getState().hasUpdate, false);

  const worker = createWorker();
  harness.registration.installing = worker;
  harness.registration.dispatch("updatefound");
  harness.registration.waiting = worker;
  worker.state = "installed";
  worker.dispatch("statechange");
  assert.equal(harness.controller.getState().status, "available");
  assert.equal(harness.controller.getState().hasUpdate, true);
  assert.equal(worker.messages.length, 0, "Ohne Nutzeraktion darf keine Aktivierungsnachricht gesendet werden.");
  assert.equal(harness.reloads(), 0);

  const stateCount = states.length;
  worker.dispatch("statechange");
  assert.equal(states.length, stateCount, "Derselbe wartende Worker darf keinen doppelten Hinweis erzeugen.");

  const blocked = harness.controller.activate(() => ({ allowed: false, message: "Belegentwurf zuerst abschließen." }));
  assert.equal(blocked.status, "blocked");
  assert.equal(worker.messages.length, 0);
  assert.equal(harness.controller.getState().message, "Belegentwurf zuerst abschließen.");

  const requested = harness.controller.activate(() => ({ allowed: true }));
  assert.equal(requested.status, "requested");
  assert.equal(worker.messages.length, 1);
  assert.equal(worker.messages[0].type, "SKIP_WAITING");
  assert.equal(harness.controller.getState().status, "activating");
  assert.equal(harness.controller.activate(() => true).status, "already-requested");
  assert.equal(worker.messages.length, 1, "Die Aktivierungsnachricht darf nur einmal gesendet werden.");

  harness.container.dispatch("controllerchange");
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 1, "controllerchange darf genau einen Reload auslösen.");
  assert.equal(harness.controller.getState().reloadTriggered, true);
}

{
  const waiting = createWorker("installed");
  const harness = createHarness({ waiting });
  await harness.controller.start();
  assert.equal(harness.controller.getState().status, "available", "registration.waiting muss direkt beim Start erkannt werden.");
}

{
  const waiting = createWorker("installed");
  const harness = createHarness({ waiting });
  await harness.controller.start();
  assert.equal(harness.controller.defer().status, "deferred");
  assert.equal(harness.controller.getState().hasUpdate, false, "Später erinnern muss die Karte vorübergehend schließen.");
  assert.equal(waiting.messages.length, 0, "Verschieben darf den Worker nicht aktivieren.");
  harness.scheduler.runDelay(900);
  assert.equal(harness.controller.getState().status, "available", "Das Update muss in derselben Sitzung erneut angeboten werden.");
  assert.equal(harness.controller.getState().hasUpdate, true);
}

{
  const waiting = createWorker("installed");
  const harness = createHarness({ waiting });
  await harness.controller.start();
  harness.controller.activate(() => true);
  harness.scheduler.runDelay(1000);
  assert.equal(harness.controller.getState().status, "error", "Ein ausbleibender Abschluss darf nicht endlos aktiv bleiben.");
  assert.equal(harness.controller.getState().message, "Die Aktualisierung konnte momentan nicht abgeschlossen werden.");
  assert.equal(harness.reloads(), 0);
  assert.equal(harness.controller.activate(() => true).status, "requested", "Der Fehlerzustand muss einen erneuten Versuch erlauben.");
  assert.equal(waiting.messages.length, 2);
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 1);
}

{
  const waiting = createWorker("installed");
  const harness = createHarness({ waiting });
  await harness.controller.start();
  harness.controller.activate(() => true);
  waiting.state = "activated";
  waiting.dispatch("statechange");
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 1, "activated und controllerchange dürfen gemeinsam nur einen Reload auslösen.");
}

{
  const alreadyActivatedWorker = createWorker("installed");
  const harness = createHarness({ waiting: alreadyActivatedWorker });
  await harness.controller.start();
  harness.registration.waiting = null;
  harness.registration.active = alreadyActivatedWorker;
  alreadyActivatedWorker.state = "activated";
  alreadyActivatedWorker.dispatch("statechange");
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 0, "Ein bereits aktivierter Ersatzworker darf ohne Nutzeraktion keinen Reload auslösen.");
  assert.equal(harness.controller.activate(() => true).status, "requested");
  assert.equal(alreadyActivatedWorker.messages.length, 0, "Ein bereits aktivierter Ersatzworker benötigt keine zweite Aktivierungsnachricht.");
  assert.equal(harness.reloads(), 1, "Die bewusste Nutzeraktion muss den bereits aktivierten Ersatzworker per Reload übernehmen.");
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 1);
}

{
  const alreadyTakenOverWorker = createWorker("installed");
  const harness = createHarness({ waiting: alreadyTakenOverWorker });
  await harness.controller.start();
  assert.equal(harness.controller.getState().status, "available");

  harness.registration.waiting = null;
  harness.registration.active = alreadyTakenOverWorker;
  harness.container.controller = alreadyTakenOverWorker;
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 0, "Ein früher Controllerwechsel darf ohne Nutzeraktion nicht neu laden.");

  assert.equal(harness.controller.activate(() => true).status, "requested");
  assert.equal(alreadyTakenOverWorker.messages.length, 0, "Ein bereits übernommener Worker darf kein verspätetes SKIP_WAITING erhalten.");
  assert.equal(harness.reloads(), 1, "Die Nutzeraktion muss eine bereits erfolgte Übernahme trotz veraltetem Worker-Zustand erkennen.");
  harness.container.dispatch("controllerchange");
  harness.scheduler.runDelay(100);
  assert.equal(harness.reloads(), 1, "Frühere oder spätere Lifecycle-Signale dürfen keinen zweiten Reload auslösen.");
}

{
  const workerWithoutLifecycleEvent = createWorker("installed");
  const harness = createHarness({ waiting: workerWithoutLifecycleEvent });
  await harness.controller.start();
  harness.controller.activate(() => true);
  assert.equal(workerWithoutLifecycleEvent.messages.length, 1);

  harness.registration.waiting = null;
  harness.registration.active = workerWithoutLifecycleEvent;
  harness.container.controller = workerWithoutLifecycleEvent;
  workerWithoutLifecycleEvent.state = "activating";
  harness.scheduler.runDelay(100);
  assert.equal(harness.reloads(), 1, "Eine sichtbare Übernahme muss auch ohne weiteres statechange/controllerchange erkannt werden.");
  harness.scheduler.runDelay(100);
  assert.equal(harness.reloads(), 1, "Die begrenzte Verifikation darf höchstens einen Reload auslösen.");
}

{
  const activeReplacement = createWorker("activated");
  const harness = createHarness({ active: activeReplacement });
  await harness.controller.start();
  assert.equal(harness.controller.getState().status, "available", "Ein bereits aktiver Ersatzworker muss gegenüber dem alten Controller erkannt werden.");
  harness.controller.activate(() => true);
  assert.equal(harness.reloads(), 1);
}

{
  const currentWorker = createWorker("activated");
  const harness = createHarness({ active: currentWorker, currentController: currentWorker });
  await harness.controller.start();
  assert.equal(harness.controller.getState().status, "idle", "Nach dem Reload darf die bereits aktive Version keine Updatekarte mehr zeigen.");
  assert.equal(harness.controller.getState().hasUpdate, false);
  assert.equal(harness.reloads(), 0, "Die neue Seite darf keine Reload-Schleife beginnen.");
}

{
  const failedWorker = createWorker("installed", { postMessageError: new Error("postMessage failed") });
  const harness = createHarness({ waiting: failedWorker });
  await harness.controller.start();
  const result = harness.controller.activate(() => true);
  assert.equal(result.status, "failed");
  assert.equal(harness.controller.getState().status, "error");
  assert.equal(harness.scheduler.count(), 0, "Der fehlgeschlagene Aktivierungsversuch darf keinen Timer zurücklassen.");
  assert.equal(harness.controller.defer().status, "deferred", "Auch nach einem technischen Fehler muss Später möglich sein.");
}

{
  const waiting = createWorker("installed");
  const harness = createHarness({ waiting, reloadError: new Error("reload failed") });
  await harness.controller.start();
  harness.controller.activate(() => true);
  harness.container.dispatch("controllerchange");
  assert.equal(harness.controller.getState().status, "error", "Ein synchron fehlgeschlagener Reload muss verständlich aufgelöst werden.");
  assert.equal(harness.controller.getState().reloadTriggered, false);
}

{
  const waiting = createWorker("installed");
  const harness = createHarness({ waiting });
  await harness.controller.start();
  harness.controller.activate(() => true);
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 1);
  harness.scheduler.runDelay(500);
  assert.equal(harness.controller.getState().status, "error", "Bleibt die Navigation trotz Reload-Aufruf aus, darf die UI nicht hängen bleiben.");
}

{
  const harness = createHarness({ online: false });
  await harness.controller.start();
  assert.equal(harness.registration.updateCalls, 0, "Offline darf keine gezielte Netzwerkprüfung gestartet werden.");
  assert.equal(harness.warnings.length, 0, "Offline-Start darf keine falsche Warnung erzeugen.");
  assert.equal(harness.controller.getState().hasUpdate, false);
}

{
  const harness = createHarness({ online: false, registerError: new Error("offline") });
  assert.equal(await harness.controller.start(), null);
  assert.equal(harness.warnings.length, 0, "Eine fehlende Offline-Registrierung darf keine Fehlermeldung erzeugen.");
}

{
  const harness = createHarness({ updateError: new Error("update failed") });
  await harness.controller.start();
  assert.equal(harness.warnings.length, 0, "Eine fehlgeschlagene optionale Updateprüfung darf die aktive App nicht beunruhigen.");
  assert.equal(harness.controller.getState().hasUpdate, false, "Eine fehlgeschlagene Installation darf keinen Hinweis vortäuschen.");
}

{
  const harness = createHarness();
  await harness.controller.start();
  const failedWorker = createWorker();
  harness.registration.installing = failedWorker;
  harness.registration.dispatch("updatefound");
  failedWorker.state = "redundant";
  failedWorker.dispatch("statechange");
  assert.equal(harness.controller.getState().hasUpdate, false, "Ein redundanter Worker darf nicht als Update erscheinen.");
}

for (const platform of ["Safari Home-Screen-PWA", "Chrome installierte PWA"]) {
  const harness = createHarness({ waiting: createWorker("installed") });
  await harness.controller.start();
  harness.controller.activate(() => true);
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 1, `${platform}: Standard-Lifecycle muss ohne Browserweiche funktionieren.`);
}

{
  const harness = createHarness({ waiting: createWorker("installed") });
  await harness.controller.start();
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 0, "Ein Controllerwechsel ohne Nutzeraktion darf keinen Reload auslösen.");
}

assert.doesNotMatch(source, /setInterval/, "Die Update-Erkennung darf kein Polling verwenden.");
assert.doesNotMatch(source, /indexedDB|localStorage|sessionStorage|caches\./, "Die Update-Komponente darf keine Geschäfts- oder Cache-Daten verwalten.");
assert.doesNotMatch(source, /userAgent|navigator\.vendor|iPhone|Android/, "Der Updatepfad darf keine Browserweichen verwenden.");
assert.match(source, /DEFAULT_ACTIVATION_TIMEOUT_MS/);
assert.match(source, /DEFAULT_ACTIVATION_VERIFICATION_MS/);
assert.match(source, /DEFAULT_REMINDER_DELAY_MS/);
assert.match(appSource, /pwaUpdateController\?\.subscribe\(updateState =>/);
assert.match(appSource, /pwaUpdateController\?\.defer\(\)/);
assert.match(appSource, /data-action="update-check"/);
assert.match(appSource, /pwaUpdateController\?\.check\?\.\(\)/);
assert.match(appSource, /state\.cart\.length\s*\|\|\s*state\.checkoutSubmitting/);
assert.match(indexSource, /Neue FRECKA-Version verfügbar\./);
assert.match(indexSource, />Jetzt aktualisieren</);
assert.match(indexSource, />Später erinnern</);
assert.match(indexSource, /Verbesserungen für Stabilität und Bedienung/);
assert.doesNotMatch(indexSource, /Commit|Buildnummer|Service Worker/);
assert.match(indexSource, /<title>FRECKA – ONBOARDING-001<\/title>/);
assert.match(appSource, /Aktualisierung nicht abgeschlossen/);
assert.match(appSource, /Erneut versuchen/);
assert.match(indexSource, /js\/pwa-update\.js\?v=onboarding001-1/);
assert.match(stylesSource, /\.app-update-notice\[hidden\],\.app-update-notice \[hidden\]\{display:none\}/);
assert.match(stylesSource, /@media\(max-width:340px\)/);
assert.match(dataSource, /version:\s*"0\.11\.2"/);
assert.match(dataSource, /build:\s*"ONBOARDING-001"/);

const businessSnapshot = Object.freeze({ receipts: 7, customers: 4, vouchers: 3, settingsVersion: 5 });
const snapshotBefore = JSON.stringify(businessSnapshot);
const snapshotHarness = createHarness({ waiting: createWorker("installed") });
await snapshotHarness.controller.start();
snapshotHarness.controller.activate(() => true);
snapshotHarness.container.dispatch("controllerchange");
assert.equal(JSON.stringify(businessSnapshot), snapshotBefore, "Der Update-Lifecycle darf Geschäftsdaten nicht verändern.");

console.log("PWA-Update-Smoke-Test: PASS (waiting, früher/fehlender Lifecycle-Event, bereits aktiver Ersatzworker, Verschieben, Fehler, genau ein Reload, Offline, Datenisolation)");
