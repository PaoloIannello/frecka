(() => {
  "use strict";

  const constants = Object.freeze({
    backupFormat: "FRECKA_ENCRYPTED_BACKUP",
    backupFormatVersion: 1,
    kdfName: "PBKDF2",
    kdfHash: "SHA-256",
    kdfIterations: 600000,
    saltBytes: 16,
    cipherName: "AES-GCM",
    keyLength: 256,
    ivBytes: 12,
    tagLength: 128,
    minimumPassphraseLength: 12,
    maximumPassphraseLength: 1024,
    maximumFileBytes: 64 * 1024 * 1024,
    fileExtension: ".frecka-backup"
  });

  class BackupError extends Error {
    constructor(code, userMessage, cause = null) {
      super(userMessage);
      this.name = "BackupError";
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

  function requireWebCrypto() {
    if (!globalThis.crypto?.subtle || typeof globalThis.crypto.getRandomValues !== "function") {
      throw new BackupError("CRYPTO_UNAVAILABLE", "Dieser Browser unterstützt die sichere Verschlüsselung nicht.");
    }
    return globalThis.crypto;
  }

  function validatePassphrase(passphrase) {
    if (typeof passphrase !== "string" || passphrase.length < constants.minimumPassphraseLength) {
      throw new BackupError("PASSPHRASE_TOO_SHORT", `Die Passphrase muss mindestens ${constants.minimumPassphraseLength} Zeichen lang sein.`);
    }
    if (passphrase.length > constants.maximumPassphraseLength) {
      throw new BackupError("PASSPHRASE_TOO_LONG", "Die Passphrase ist zu lang.");
    }
    return passphrase;
  }

  function bytesToBase64(bytesInput) {
    const bytes = bytesInput instanceof Uint8Array ? bytesInput : new Uint8Array(bytesInput);
    const chunkSize = 0x8000;
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize)));
    }
    return btoa(binary);
  }

  function base64ToBytes(value, label) {
    if (typeof value !== "string" || !value.length || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      throw new BackupError("BACKUP_FILE_INVALID", `${label} der Sicherungsdatei ist beschädigt.`);
    }
    let binary;
    try {
      binary = atob(value);
    } catch (cause) {
      throw new BackupError("BACKUP_FILE_INVALID", `${label} der Sicherungsdatei ist beschädigt.`, cause);
    }
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function authenticatedHeader(envelope) {
    return {
      backupFormat: envelope.backupFormat,
      backupFormatVersion: envelope.backupFormatVersion,
      crypto: {
        kdf: {
          name: envelope.crypto.kdf.name,
          hash: envelope.crypto.kdf.hash,
          iterations: envelope.crypto.kdf.iterations,
          salt: envelope.crypto.kdf.salt
        },
        cipher: {
          name: envelope.crypto.cipher.name,
          keyLength: envelope.crypto.cipher.keyLength,
          iv: envelope.crypto.cipher.iv,
          tagLength: envelope.crypto.cipher.tagLength
        }
      }
    };
  }

  function validateEnvelope(envelope) {
    if (!isPlainObject(envelope)
      || envelope.backupFormat !== constants.backupFormat
      || envelope.backupFormatVersion !== constants.backupFormatVersion) {
      throw new BackupError("BACKUP_FORMAT_UNSUPPORTED", "Diese Datei besitzt kein unterstütztes FRECKA-Sicherungsformat.");
    }
    const kdf = envelope.crypto?.kdf;
    const cipher = envelope.crypto?.cipher;
    if (!isPlainObject(kdf) || !isPlainObject(cipher)
      || kdf.name !== constants.kdfName
      || kdf.hash !== constants.kdfHash
      || kdf.iterations !== constants.kdfIterations
      || cipher.name !== constants.cipherName
      || cipher.keyLength !== constants.keyLength
      || cipher.tagLength !== constants.tagLength) {
      throw new BackupError("BACKUP_CRYPTO_UNSUPPORTED", "Die Verschlüsselung dieser Sicherung wird von dieser FRECKA-Version nicht unterstützt.");
    }
    const salt = base64ToBytes(kdf.salt, "Der Schlüsselparameter");
    const iv = base64ToBytes(cipher.iv, "Der Verschlüsselungsparameter");
    const payload = base64ToBytes(envelope.payload, "Der verschlüsselte Inhalt");
    if (salt.length !== constants.saltBytes || iv.length !== constants.ivBytes || payload.length <= constants.tagLength / 8) {
      throw new BackupError("BACKUP_FILE_INVALID", "Die Sicherungsdatei ist unvollständig oder beschädigt.");
    }
    return { envelope, salt, iv, payload };
  }

  async function deriveKey(passphrase, salt, usages) {
    const cryptoProvider = requireWebCrypto();
    const passphraseBytes = new TextEncoder().encode(validatePassphrase(passphrase));
    try {
      const keyMaterial = await cryptoProvider.subtle.importKey(
        "raw",
        passphraseBytes,
        constants.kdfName,
        false,
        ["deriveKey"]
      );
      return await cryptoProvider.subtle.deriveKey(
        { name: constants.kdfName, hash: constants.kdfHash, salt, iterations: constants.kdfIterations },
        keyMaterial,
        { name: constants.cipherName, length: constants.keyLength },
        false,
        usages
      );
    } finally {
      passphraseBytes.fill(0);
    }
  }

  async function encryptTenantSnapshot(snapshot, passphrase) {
    if (!isPlainObject(snapshot)) {
      throw new BackupError("BACKUP_DATA_INVALID", "Die lokalen Daten konnten nicht für die Sicherung vorbereitet werden.");
    }
    const cryptoProvider = requireWebCrypto();
    const salt = cryptoProvider.getRandomValues(new Uint8Array(constants.saltBytes));
    const iv = cryptoProvider.getRandomValues(new Uint8Array(constants.ivBytes));
    const envelope = {
      backupFormat: constants.backupFormat,
      backupFormatVersion: constants.backupFormatVersion,
      crypto: {
        kdf: {
          name: constants.kdfName,
          hash: constants.kdfHash,
          iterations: constants.kdfIterations,
          salt: bytesToBase64(salt)
        },
        cipher: {
          name: constants.cipherName,
          keyLength: constants.keyLength,
          iv: bytesToBase64(iv),
          tagLength: constants.tagLength
        }
      }
    };
    const additionalData = new TextEncoder().encode(JSON.stringify(authenticatedHeader(envelope)));
    const plaintext = new TextEncoder().encode(JSON.stringify(snapshot));
    try {
      const key = await deriveKey(passphrase, salt, ["encrypt"]);
      const ciphertext = await cryptoProvider.subtle.encrypt(
        { name: constants.cipherName, iv, additionalData, tagLength: constants.tagLength },
        key,
        plaintext
      );
      const serialized = JSON.stringify({ ...envelope, payload: bytesToBase64(ciphertext) });
      if (new Blob([serialized]).size > constants.maximumFileBytes) {
        throw new BackupError("BACKUP_FILE_TOO_LARGE", "Der lokale Datenbestand ist für eine einzelne Sicherungsdatei zu groß.");
      }
      return serialized;
    } catch (cause) {
      if (cause instanceof BackupError) throw cause;
      throw new BackupError("BACKUP_ENCRYPT_FAILED", "Die Sicherung konnte nicht verschlüsselt werden.", cause);
    } finally {
      plaintext.fill(0);
    }
  }

  async function inputToText(input) {
    if (typeof input === "string") {
      if (new Blob([input]).size > constants.maximumFileBytes) throw new BackupError("BACKUP_FILE_TOO_LARGE", "Die Sicherungsdatei ist zu groß.");
      return input;
    }
    if (input instanceof Blob) {
      if (input.size > constants.maximumFileBytes) throw new BackupError("BACKUP_FILE_TOO_LARGE", "Die Sicherungsdatei ist zu groß.");
      return input.text();
    }
    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
      const bytes = input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      if (bytes.byteLength > constants.maximumFileBytes) throw new BackupError("BACKUP_FILE_TOO_LARGE", "Die Sicherungsdatei ist zu groß.");
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    throw new BackupError("BACKUP_FILE_INVALID", "Die Sicherungsdatei konnte nicht gelesen werden.");
  }

  async function decryptTenantSnapshot(input, passphrase) {
    validatePassphrase(passphrase);
    let envelope;
    try {
      envelope = JSON.parse(await inputToText(input));
    } catch (cause) {
      if (cause instanceof BackupError) throw cause;
      throw new BackupError("BACKUP_FILE_INVALID", "Die Sicherungsdatei ist unvollständig oder beschädigt.", cause);
    }
    const parsed = validateEnvelope(envelope);
    const additionalData = new TextEncoder().encode(JSON.stringify(authenticatedHeader(parsed.envelope)));
    try {
      const key = await deriveKey(passphrase, parsed.salt, ["decrypt"]);
      const plaintext = await requireWebCrypto().subtle.decrypt(
        { name: constants.cipherName, iv: parsed.iv, additionalData, tagLength: constants.tagLength },
        key,
        parsed.payload
      );
      try {
        const snapshot = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
        if (!isPlainObject(snapshot)) throw new Error("Invalid snapshot root");
        return snapshot;
      } catch (cause) {
        throw new BackupError("BACKUP_PAYLOAD_INVALID", "Die entschlüsselten Sicherungsdaten sind beschädigt.", cause);
      }
    } catch (cause) {
      if (cause instanceof BackupError) throw cause;
      throw new BackupError("BACKUP_DECRYPT_FAILED", "Die Passphrase ist falsch oder die Datei wurde verändert.", cause);
    }
  }

  function backupFilename(createdAt = new Date().toISOString(), suffix = "") {
    const date = Number.isFinite(Date.parse(createdAt)) ? new Date(createdAt) : new Date();
    const stamp = date.toISOString().replace(/[:.]/g, "-");
    const safeSuffix = String(suffix).trim().replace(/[^A-Za-z0-9_-]+/g, "-");
    return `frecka-sicherung-${stamp}${safeSuffix ? `-${safeSuffix}` : ""}${constants.fileExtension}`;
  }

  function downloadBackup(serializedBackup, filename) {
    if (typeof serializedBackup !== "string") throw new BackupError("BACKUP_DATA_INVALID", "Die Sicherungsdatei ist nicht verfügbar.");
    const blob = new Blob([serializedBackup], { type: "application/vnd.frecka.backup+json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename || backupFilename();
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  globalThis.FRECKA_BACKUP = Object.freeze({
    encryptTenantSnapshot,
    decryptTenantSnapshot,
    backupFilename,
    downloadBackup,
    BackupError,
    constants
  });
})();
