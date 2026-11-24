/* Family/profile backup support for the two independent per-Zookeeper Zoo stores.
 * v3 backups carry a precise copy of each present record; null means no record.
 * Only data owned by these two prefixes may be read/written/deleted.
 * Browser global: BibloZooZooBackup. Node: module.exports for fake-storage tests.
 */
(function installZooBackup(root) {
  "use strict";
  const RESCUE_PREFIX = "biblozooZooEscapeStats:v1:";
  const SURPRISE_PREFIX = "biblozooZooSurprise:v2:";
  const PREFIXES = [RESCUE_PREFIX, SURPRISE_PREFIX];
  const COUNTERS = ["petsRescued", "zooBreaksStopped", "pendingPets", "pendingBreaks"];

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function profileId(value) {
    const id = String(value || "").trim();
    if (!id || id.length > 128 || /[\x00-\x1f]/.test(id)) {
      throw new Error("The Zookeeper identifier is not valid for Zoo backup.");
    }
    return id;
  }

  function normalizeRescueStats(value) {
    if (!isObject(value)) throw new Error("Invalid Zoo rescue statistics in backup.");
    const result = {};
    for (const counter of COUNTERS) {
      const number = value[counter];
      if (!Number.isSafeInteger(number) || number < 0) {
        throw new Error("Invalid Zoo rescue counter in backup.");
      }
      result[counter] = number;
    }
    return result;
  }

  function normalizeSurprise(value) {
    if (!isObject(value) || typeof value.day !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value.day) ||
        !Number.isSafeInteger(value.breaksTriggered) || value.breaksTriggered < 0) {
      throw new Error("Invalid Zoo surprise day/odds record in backup.");
    }
    return { day: value.day, breaksTriggered: value.breaksTriggered };
  }

  function normalize(value) {
    if (!isObject(value) ||
        !Object.prototype.hasOwnProperty.call(value, "rescueStats") ||
        !Object.prototype.hasOwnProperty.call(value, "surprise")) {
      throw new Error("The v3 backup is missing its Zoo rescue/surprise records.");
    }
    return {
      rescueStats: value.rescueStats === null ? null : normalizeRescueStats(value.rescueStats),
      surprise: value.surprise === null ? null : normalizeSurprise(value.surprise)
    };
  }

  function key(prefix, id) {
    return prefix + profileId(id);
  }

  function readRecord(storage, prefix, id, validate, label) {
    const raw = storage.getItem(key(prefix, id));
    if (raw === null || raw === undefined) return null;
    try {
      return validate(JSON.parse(raw));
    } catch (_) {
      // Never silently export zeroed counters if a real stored record is damaged.
      throw new Error("Stored Zoo " + label + " could not be read. Backup cancelled to avoid losing information.");
    }
  }

  function read(storage, id) {
    return {
      rescueStats: readRecord(storage, RESCUE_PREFIX, id, normalizeRescueStats, "rescue statistics"),
      surprise: readRecord(storage, SURPRISE_PREFIX, id, normalizeSurprise, "surprise history")
    };
  }

  function writeOne(storage, storageKey, value) {
    const raw = value === null ? null : JSON.stringify(value);
    if (raw === null) storage.removeItem(storageKey);
    else storage.setItem(storageKey, raw);
    if (storage.getItem(storageKey) !== raw) {
      throw new Error("Restored Zoo record did not match the backup.");
    }
  }

  function write(storage, id, value) {
    const data = normalize(value);
    writeOne(storage, key(RESCUE_PREFIX, id), data.rescueStats);
    writeOne(storage, key(SURPRISE_PREFIX, id), data.surprise);
  }

  function storedKeys(storage) {
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const candidate = storage.key(i);
      if (typeof candidate === "string" && PREFIXES.some(prefix => candidate.startsWith(prefix))) {
        keys.push(candidate);
      }
    }
    return keys.sort();
  }

  function snapshot(storage) {
    const result = {};
    for (const storedKey of storedKeys(storage)) {
      result[storedKey] = storage.getItem(storedKey);
    }
    return result;
  }

  function restoreSnapshot(storage, values) {
    if (!isObject(values) || Object.keys(values).some(k =>
      !PREFIXES.some(prefix => k.startsWith(prefix)) || typeof values[k] !== "string")) {
      throw new Error("The previous Zoo storage snapshot is invalid.");
    }
    for (const storedKey of storedKeys(storage)) storage.removeItem(storedKey);
    for (const [storedKey, raw] of Object.entries(values)) storage.setItem(storedKey, raw);
    const actualKeys = storedKeys(storage);
    const expectedKeys = Object.keys(values).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys) ||
        expectedKeys.some(k => storage.getItem(k) !== values[k])) {
      throw new Error("Previous Zoo rescue/surprise information could not be restored.");
    }
  }

  function cleanupOrphans(storage, validProfileIds) {
    const valid = new Set(Array.from(validProfileIds, profileId));
    for (const storedKey of storedKeys(storage)) {
      const prefix = PREFIXES.find(p => storedKey.startsWith(p));
      if (valid.has(storedKey.slice(prefix.length))) continue;
      storage.removeItem(storedKey);
      if (storage.getItem(storedKey) !== null) {
        throw new Error("Old Zoo records could not be cleaned up after family replacement.");
      }
    }
  }

  function clear(storage, id) {
    write(storage, id, { rescueStats: null, surprise: null });
  }

  const api = Object.freeze({
    read, normalize, write, snapshot, restoreSnapshot, cleanupOrphans, clear,
    RESCUE_PREFIX, SURPRISE_PREFIX
  });
  if (root) root.BibloZooZooBackup = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : null);
