(() => {
  "use strict";

  const constants = Object.freeze({
    runtimeFormatVersion: 1,
    tokenVersion: 1,
    algorithm: "ES256",
    namedCurve: "P-256",
    tokenType: "frecka-license+jwt",
    productId: "frecka.core",
    productMajor: 1
  });
  const headerKeys = new Set(["alg", "typ", "kid"]);
  const claimKeys = new Set([
    "iss", "aud", "sub", "jti", "iat", "nbf", "exp", "token_version",
    "tenant_id", "device_id", "binding_version", "license_status", "trial_ends_at",
    "product_id", "product_major", "entitlements", "next_validation_at", "cnf"
  ]);

  class LicenseRuntimeError extends Error {
    constructor(code, userMessage, cause = null) {
      super(userMessage);
      this.name = "LicenseRuntimeError";
      this.code = code;
      this.userMessage = userMessage;
      if (cause) this.cause = cause;
    }
  }

  const isPlainObject = value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  };
  const opaqueId = value => typeof value === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value);
  const base64UrlValue = value => typeof value === "string"
    && /^[A-Za-z0-9_-]+$/u.test(value);
  const p256Value = value => base64UrlValue(value) && value.length === 43;

  function base64Url(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x4000) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 0x4000)));
    }
    return globalThis.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
  }

  function decodeBase64Url(segment, label) {
    if (typeof segment !== "string" || !segment || !/^[A-Za-z0-9_-]+$/u.test(segment)) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SYNTAX_INVALID", "Der " + label + " des Lizenznachweises ist ungültig.");
    }
    const remainder = segment.length % 4;
    if (remainder === 1) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SYNTAX_INVALID", "Der " + label + " des Lizenznachweises ist ungültig.");
    }
    try {
      const encoded = segment.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - remainder) % 4);
      const binary = globalThis.atob(encoded);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      if (base64Url(bytes) !== segment) throw new Error("non-canonical base64url");
      return bytes;
    } catch (cause) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SYNTAX_INVALID", "Der " + label + " des Lizenznachweises ist ungültig.", cause);
    }
  }

  function parseJsonSegment(segment, label) {
    const bytes = decodeBase64Url(segment, label);
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (cause) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SYNTAX_INVALID", "Der " + label + " des Lizenznachweises ist nicht UTF-8-kodiert.", cause);
    }
    try {
      const value = JSON.parse(text);
      if (!isPlainObject(value)) throw new Error("object required");
      return value;
    } catch (cause) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SYNTAX_INVALID", "Der " + label + " des Lizenznachweises ist kein gültiges JSON-Objekt.", cause);
    }
  }

  function assertExactKeys(value, allowedKeys, code, label) {
    if (Object.keys(value).some(key => !allowedKeys.has(key))) {
      throw new LicenseRuntimeError(code, label + " enthält nicht unterstützte Felder.");
    }
  }
  function assertString(value, name) {
    if (typeof value !== "string" || !value.trim()) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_CLAIMS_INVALID", "Der Lizenznachweis enthält kein gültiges Feld " + name + ".");
    }
  }
  function assertInteger(value, name, minimum = 0) {
    if (!Number.isSafeInteger(value) || value < minimum) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_CLAIMS_INVALID", "Der Lizenznachweis enthält kein gültiges Feld " + name + ".");
    }
  }

  function validateHeader(header) {
    assertExactKeys(header, headerKeys, "LICENSE_TOKEN_HEADER_UNSUPPORTED", "Der JOSE-Header");
    if (header.alg !== constants.algorithm) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_ALGORITHM_UNSUPPORTED", "Der Lizenznachweis verwendet keinen unterstützten Signaturalgorithmus.");
    }
    if (header.typ !== constants.tokenType) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_TYPE_UNSUPPORTED", "Der Lizenznachweis besitzt keinen unterstützten Typ.");
    }
    if (!opaqueId(header.kid)) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_KEY_ID_MISSING", "Der Lizenznachweis enthält keine gültige Schlüsselkennung.");
    }
    return Object.freeze({ alg: header.alg, typ: header.typ, kid: header.kid });
  }

  function validateClaims(claims) {
    assertExactKeys(claims, claimKeys, "LICENSE_TOKEN_CLAIMS_UNSUPPORTED", "Der Lizenznachweis");
    ["iss", "aud", "sub", "jti", "tenant_id", "device_id", "license_status", "product_id"].forEach(name => {
      assertString(claims[name], name);
    });
    ["iat", "nbf", "exp", "token_version", "binding_version", "product_major", "next_validation_at"].forEach(name => {
      assertInteger(claims[name], name, name === "binding_version" ? 1 : 0);
    });
    if (claims.token_version !== constants.tokenVersion) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_VERSION_UNSUPPORTED", "Der Lizenznachweis benötigt eine andere Tokenversion.");
    }
    if (claims.product_id !== constants.productId || claims.product_major !== constants.productMajor) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_PRODUCT_UNSUPPORTED", "Der Lizenznachweis gehört zu einem anderen Produkt.");
    }
    if (!new Set(["trial", "active"]).has(claims.license_status)) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_STATUS_UNSUPPORTED", "Der Lizenznachweis besitzt keinen produktiv auswertbaren Status.");
    }
    if (claims.license_status === "trial") {
      assertInteger(claims.trial_ends_at, "trial_ends_at");
    } else if (claims.trial_ends_at !== null && claims.trial_ends_at !== undefined) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_CLAIMS_INVALID", "Der aktive Lizenznachweis enthält einen unerwarteten Testzeitraum.");
    }
    if (!Array.isArray(claims.entitlements)
      || claims.entitlements.some(value => !opaqueId(value))
      || new Set(claims.entitlements).size !== claims.entitlements.length
      || claims.entitlements.some((value, index) => index > 0 && claims.entitlements[index - 1] >= value)) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_CLAIMS_INVALID", "Der Lizenznachweis enthält keine gültige Berechtigungsliste.");
    }
    if (!isPlainObject(claims.cnf) || Object.keys(claims.cnf).length !== 1 || !p256Value(claims.cnf.jkt)) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_CLAIMS_INVALID", "Der Lizenznachweis enthält keine gültige Schlüsselbindung.");
    }
    const maximumNextValidation = claims.license_status === "trial" ? 24 * 60 * 60 : 30 * 24 * 60 * 60;
    const maximumOfflineValidity = claims.license_status === "trial" ? 72 * 60 * 60 : 180 * 24 * 60 * 60;
    if (claims.nbf < claims.iat - 60 || claims.nbf > claims.iat || claims.exp <= claims.iat
      || claims.next_validation_at < claims.iat || claims.next_validation_at > claims.exp
      || claims.next_validation_at - claims.iat > maximumNextValidation
      || claims.exp - claims.iat > maximumOfflineValidity
      || (claims.license_status === "trial" && claims.exp > claims.trial_ends_at)) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_TIME_INVALID", "Die Zeitgrenzen des Lizenznachweises sind widersprüchlich.");
    }
    return Object.freeze({
      ...claims,
      entitlements: Object.freeze([...claims.entitlements]),
      cnf: Object.freeze({ jkt: claims.cnf.jkt })
    });
  }

  function inspectCompactJws(compactJws) {
    if (typeof compactJws !== "string") {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SYNTAX_INVALID", "Der Lizenznachweis ist unvollständig.");
    }
    const segments = compactJws.split(".");
    if (segments.length !== 3 || segments.some(segment => !segment)) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SYNTAX_INVALID", "Der Lizenznachweis besitzt keine gültige Compact-JWS-Struktur.");
    }
    const header = validateHeader(parseJsonSegment(segments[0], "Header"));
    const claims = validateClaims(parseJsonSegment(segments[1], "Payload"));
    const signature = decodeBase64Url(segments[2], "Signatur");
    if (signature.length !== 64) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SIGNATURE_INVALID", "Der Lizenznachweis besitzt keine gültige ES256-Signaturstruktur.");
    }
    return Object.freeze({
      header,
      claims,
      signingInput: segments[0] + "." + segments[1],
      signature,
      verificationStatus: "unverified"
    });
  }

  function cryptoApi() {
    if (!globalThis.crypto?.subtle) {
      throw new LicenseRuntimeError("LICENSE_CRYPTO_UNAVAILABLE", "Die sichere lokale Gerätebindung wird von diesem Browser nicht bereitgestellt.");
    }
    return globalThis.crypto.subtle;
  }

  function assertCryptoKey(key, expectedType, expectedUsage, requirePublicExtractable = true) {
    if (!key || typeof key !== "object"
      || key.type !== expectedType
      || key.algorithm?.name !== "ECDSA"
      || key.algorithm?.namedCurve !== constants.namedCurve
      || !Array.from(key.usages || []).includes(expectedUsage)) {
      throw new LicenseRuntimeError("LICENSE_DEVICE_KEY_INVALID", "Der lokale Geräteschlüssel ist ungültig.");
    }
    if (expectedType === "private" && key.extractable !== false) {
      throw new LicenseRuntimeError("LICENSE_DEVICE_KEY_EXTRACTABLE", "Der private lokale Geräteschlüssel ist nicht ausreichend geschützt.");
    }
    if (expectedType === "public" && requirePublicExtractable && key.extractable !== true) {
      throw new LicenseRuntimeError("LICENSE_DEVICE_PUBLIC_KEY_UNAVAILABLE", "Der öffentliche lokale Geräteschlüssel kann nicht verwendet werden.");
    }
  }

  async function publicKeyThumbprint(publicKey) {
    assertCryptoKey(publicKey, "public", "verify");
    let jwk;
    try {
      jwk = await cryptoApi().exportKey("jwk", publicKey);
    } catch (cause) {
      throw new LicenseRuntimeError("LICENSE_DEVICE_PUBLIC_KEY_UNAVAILABLE", "Der öffentliche lokale Geräteschlüssel kann nicht gelesen werden.", cause);
    }
    if (jwk.kty !== "EC" || jwk.crv !== constants.namedCurve || !p256Value(jwk.x) || !p256Value(jwk.y) || jwk.d !== undefined) {
      throw new LicenseRuntimeError("LICENSE_DEVICE_PUBLIC_KEY_INVALID", "Der öffentliche lokale Geräteschlüssel ist ungültig.");
    }
    const canonical = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y });
    const digest = await cryptoApi().digest("SHA-256", new TextEncoder().encode(canonical));
    return base64Url(new Uint8Array(digest));
  }

  async function createDeviceIdentity() {
    let pair;
    try {
      pair = await cryptoApi().generateKey(
        { name: "ECDSA", namedCurve: constants.namedCurve },
        false,
        ["sign", "verify"]
      );
    } catch (cause) {
      throw new LicenseRuntimeError("LICENSE_DEVICE_KEY_CREATE_FAILED", "Der lokale Geräteschlüssel konnte nicht erstellt werden.", cause);
    }
    assertCryptoKey(pair.privateKey, "private", "sign");
    assertCryptoKey(pair.publicKey, "public", "verify");
    return Object.freeze({
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
      publicKeyThumbprint: await publicKeyThumbprint(pair.publicKey)
    });
  }

  async function validateDeviceIdentity(privateKey, publicKey, expectedThumbprint) {
    assertCryptoKey(privateKey, "private", "sign");
    assertCryptoKey(publicKey, "public", "verify");
    const thumbprint = await publicKeyThumbprint(publicKey);
    if (typeof expectedThumbprint !== "string" || thumbprint !== expectedThumbprint) {
      throw new LicenseRuntimeError("LICENSE_DEVICE_KEY_MISMATCH", "Der lokale Geräteschlüssel stimmt nicht mit seiner Referenz überein.");
    }
    const challenge = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const signature = await cryptoApi().sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, challenge);
    const verified = await cryptoApi().verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signature, challenge);
    if (!verified) {
      throw new LicenseRuntimeError("LICENSE_DEVICE_KEY_MISMATCH", "Das lokale Geräteschlüsselpaar ist nicht konsistent.");
    }
    return Object.freeze({ valid: true, publicKeyThumbprint: thumbprint });
  }

  async function verifyCompactJws(compactJws, options = {}) {
    const inspected = inspectCompactJws(compactJws);
    if (!options.trustedPublicKey) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_TRUST_MISSING", "Für diesen Lizenznachweis ist kein vertrauenswürdiger Prüfschlüssel hinterlegt.");
    }
    assertCryptoKey(options.trustedPublicKey, "public", "verify", false);
    const expected = {
      issuer: options.expectedIssuer,
      audience: options.expectedAudience,
      licenseId: options.expectedLicenseId,
      serverTenantId: options.expectedServerTenantId,
      deviceId: options.expectedDeviceId,
      bindingVersion: options.expectedBindingVersion,
      publicKeyThumbprint: options.expectedPublicKeyThumbprint,
      keyId: options.expectedKeyId
    };
    Object.entries(expected).forEach(([name, value]) => {
      if (value === undefined || value === null || value === "") {
        throw new LicenseRuntimeError("LICENSE_TOKEN_CONTEXT_INCOMPLETE", "Der Prüfkontext " + name + " fehlt.");
      }
    });
    const claims = inspected.claims;
    if (inspected.header.kid !== expected.keyId
      || claims.iss !== expected.issuer
      || claims.aud !== expected.audience
      || claims.sub !== expected.licenseId
      || claims.tenant_id !== expected.serverTenantId
      || claims.device_id !== expected.deviceId
      || claims.binding_version !== expected.bindingVersion
      || claims.cnf.jkt !== expected.publicKeyThumbprint) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_BINDING_MISMATCH", "Der Lizenznachweis passt nicht zur lokalen Lizenz- und Gerätebindung.");
    }
    let verified = false;
    try {
      verified = await cryptoApi().verify(
        { name: "ECDSA", hash: "SHA-256" },
        options.trustedPublicKey,
        inspected.signature,
        new TextEncoder().encode(inspected.signingInput)
      );
    } catch (cause) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SIGNATURE_INVALID", "Die Signatur des Lizenznachweises konnte nicht geprüft werden.", cause);
    }
    if (!verified) {
      throw new LicenseRuntimeError("LICENSE_TOKEN_SIGNATURE_INVALID", "Die Signatur des Lizenznachweises ist ungültig.");
    }
    return Object.freeze({ header: inspected.header, claims, verificationStatus: "verified" });
  }

  globalThis.FRECKA_LICENSE_RUNTIME = Object.freeze({
    constants,
    LicenseRuntimeError,
    createDeviceIdentity,
    validateDeviceIdentity,
    publicKeyThumbprint,
    inspectCompactJws,
    verifyCompactJws
  });
})();
