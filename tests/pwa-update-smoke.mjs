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

function createWorker(state = "installing") {
  const worker = new FakeTarget();
  worker.state = state;
  worker.messages = [];
  worker.postMessage = message => worker.messages.push(message);
  return worker;
}

function createHarness({ online = true, waiting = null, updateError = null, registerError = null } = {}) {
  const registration = new FakeTarget();
  registration.installing = null;
  registration.waiting = waiting;
  registration.updateCalls = 0;
  registration.update = async () => {
    registration.updateCalls += 1;
    if (updateError) throw updateError;
  };

  const container = new FakeTarget();
  container.controller = { scriptURL: "old-service-worker.js" };
  container.registerCalls = [];
  container.register = async (scriptUrl, options) => {
    container.registerCalls.push({ scriptUrl, options });
    if (registerError) throw registerError;
    return registration;
  };

  const warnings = [];
  let reloads = 0;
  const controller = createUpdateController({
    serviceWorkerContainer: container,
    isSecureContext: true,
    isOnline: () => online,
    reload: () => { reloads += 1; },
    warn: (...args) => warnings.push(args)
  });
  return { controller, container, registration, warnings, reloads: () => reloads };
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

{
  const harness = createHarness({ waiting: createWorker("installed") });
  await harness.controller.start();
  harness.container.dispatch("controllerchange");
  assert.equal(harness.reloads(), 0, "Ein Controllerwechsel ohne Nutzeraktion darf keinen Reload auslösen.");
}

assert.doesNotMatch(source, /setInterval|setTimeout/, "Die Update-Erkennung darf kein Polling verwenden.");
assert.doesNotMatch(source, /indexedDB|localStorage|sessionStorage|caches\./, "Die Update-Komponente darf keine Geschäfts- oder Cache-Daten verwalten.");
assert.match(appSource, /pwaUpdateController\?\.subscribe\(renderPwaUpdateState\)/);
assert.match(appSource, /state\.cart\.length\s*\|\|\s*state\.checkoutSubmitting/);
assert.match(indexSource, /Neue FRECKA-Version verfügbar\./);
assert.match(indexSource, />Jetzt aktualisieren</);
assert.match(indexSource, /js\/pwa-update\.js\?v=persistence010-1/);
assert.match(stylesSource, /\.app-update-notice\[hidden\]\{display:none\}/);
assert.match(dataSource, /version:\s*"0\.10\.7"/);
assert.match(dataSource, /build:\s*"PERSISTENCE-010"/);

const businessSnapshot = Object.freeze({ receipts: 7, customers: 4, vouchers: 3, settingsVersion: 5 });
const snapshotBefore = JSON.stringify(businessSnapshot);
const snapshotHarness = createHarness({ waiting: createWorker("installed") });
await snapshotHarness.controller.start();
snapshotHarness.controller.activate(() => true);
snapshotHarness.container.dispatch("controllerchange");
assert.equal(JSON.stringify(businessSnapshot), snapshotBefore, "Der Update-Lifecycle darf Geschäftsdaten nicht verändern.");

console.log("PWA-Update-Smoke-Test: PASS (waiting, updatefound, Nutzeraktion, Offline, Fehler, genau ein Reload, Datenisolation)");
