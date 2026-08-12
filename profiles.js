/* =========================================================
   BibloZoo Zookeeper Profiles
   Phase 1: profile registry and per-profile storage foundation

   Exposes:
     window.BibloZooProfiles
   ========================================================= */

(function () {
  "use strict";

  const PROFILE_REGISTRY_STORAGE_KEY = "biblozooProfiles";
  const PROFILE_REGISTRY_VERSION = 1;
  const LEGACY_PROGRESS_STORAGE_KEY = "verseMemoryProgress";
  const LEGACY_PROGRESS_MIGRATION_VERSION = 1;
  const PROFILE_NAME_MAX_LENGTH = 16;

  const PROFILE_PICTURE_DIR = "profile_pictures/";
  const PROFILE_PICTURE_MANIFEST_URL =
    `${PROFILE_PICTURE_DIR}profile_pictures.json`;
  const PROFILE_PICTURE_FALLBACK_FILE =
    "profile_picture_fallback.png";

  const PROFILE_PICTURE_MANIFEST_MODES = Object.freeze({
    LISTED: "listed",
    ALL_VERSES: "all-verses"
  });

  let profilePictureManifest = null;
  let profilePictureManifestLoadPromise = null;
  let profilePictureCatalog = [];

  const loadedProfilePictureVerseIds = new Set();
  const missingProfilePictureVerseIds = new Set();
  const profilePictureLoadPromises = new Map();

  const LEGACY_MIGRATION_STATUS = Object.freeze({
    UNINITIALIZED: "uninitialized",
    PENDING: "pending",
    COMPLETED: "completed",
    FAILED: "failed",
    NOT_NEEDED: "not_needed"
  });

  function cloneJson(value) {
    if (value == null) return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function normalizeWhitespace(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeProfileNameForComparison(value) {
    return normalizeWhitespace(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function getSharedNameValidationApi() {
    return window.BibloZooNameValidation || null;
  }

  function getProfileNameMaxLength() {
    const sharedMaxLength = Number(
      getSharedNameValidationApi()?.MAX_LENGTH
    );

    return Number.isFinite(sharedMaxLength) && sharedMaxLength > 0
      ? Math.floor(sharedMaxLength)
      : PROFILE_NAME_MAX_LENGTH;
  }

  function cleanProfileName(value) {
    const sharedCleaner =
      getSharedNameValidationApi()?.cleanDisplayName;

    if (typeof sharedCleaner === "function") {
      return sharedCleaner(value, getProfileNameMaxLength());
    }

    return normalizeWhitespace(value)
      .slice(0, getProfileNameMaxLength());
  }

  function validateProfileName(value, {
    excludeProfileId = ""
  } = {}) {
    const untrimmedName = normalizeWhitespace(value);
    const maxLength = getProfileNameMaxLength();

    if (!untrimmedName) {
      return {
        ok: false,
        code: "blank",
        name: "",
        message: "Please enter a Zookeeper name."
      };
    }

    if (untrimmedName.length > maxLength) {
      return {
        ok: false,
        code: "too_long",
        name: cleanProfileName(untrimmedName),
        message: `Zookeeper names can be up to ${maxLength} characters.`
      };
    }

    const cleanName = cleanProfileName(untrimmedName);
    const sharedBlockChecker =
      getSharedNameValidationApi()?.isDisplayNameBlocked;

    if (
      typeof sharedBlockChecker === "function" &&
      sharedBlockChecker(cleanName)
    ) {
      return {
        ok: false,
        code: "blocked",
        name: cleanName,
        message: "Please choose a different name."
      };
    }

    if (isProfileNameInUse(cleanName, excludeProfileId)) {
      return {
        ok: false,
        code: "duplicate",
        name: cleanName,
        message: "That Zookeeper name is already being used."
      };
    }

    return {
      ok: true,
      code: "",
      name: cleanName,
      message: ""
    };
  }

  function createDefaultLegacyMigrationState(overrides = {}) {
    const requestedStatus = String(overrides.status || "");

    const status = Object.values(LEGACY_MIGRATION_STATUS)
      .includes(requestedStatus)
      ? requestedStatus
      : LEGACY_MIGRATION_STATUS.UNINITIALIZED;

    const pendingAt = Number(overrides.pendingAt);
    const completedAt = Number(overrides.completedAt);
    const failedAt = Number(overrides.failedAt);

    return {
      legacyProgressVersion: LEGACY_PROGRESS_MIGRATION_VERSION,
      status,
      profileId: String(overrides.profileId || "").trim(),
      pendingAt: Number.isFinite(pendingAt) && pendingAt > 0
        ? pendingAt
        : 0,
      completedAt: Number.isFinite(completedAt) && completedAt > 0
        ? completedAt
        : 0,
      failedAt: Number.isFinite(failedAt) && failedAt > 0
        ? failedAt
        : 0,
      error: String(overrides.error || "").slice(0, 500)
    };
  }

  function normalizeLegacyMigrationState(rawMigration) {
    if (!rawMigration || typeof rawMigration !== "object") {
      return createDefaultLegacyMigrationState();
    }

    return createDefaultLegacyMigrationState(rawMigration);
  }

  function createEmptyProfileRegistry() {
    return {
      version: PROFILE_REGISTRY_VERSION,
      activeProfileId: "",
      profiles: [],
      migration: createDefaultLegacyMigrationState()
    };
  }

  function generateProfileId() {
    try {
      if (globalThis.crypto?.randomUUID) {
        return `profile_${globalThis.crypto.randomUUID().replace(/-/g, "")}`;
      }
    } catch (err) {
      // Fall through to the compatibility generator.
    }

    const timePart = Date.now().toString(36);
    const randomPart = Math.random().toString(36).slice(2, 12);
    return `profile_${timePart}_${randomPart}`;
  }

  function normalizeProfileRecord(rawProfile, usedIds = new Set()) {
    if (!rawProfile || typeof rawProfile !== "object") return null;

    let id = String(rawProfile.id || "").trim();

    if (!id || usedIds.has(id)) {
      id = generateProfileId();

      while (usedIds.has(id)) {
        id = generateProfileId();
      }
    }

    const name = normalizeWhitespace(rawProfile.name);
    const avatarVerseId = String(rawProfile.avatarVerseId || "").trim();

    if (!name) return null;

    const now = Date.now();
    const createdAtValue = Number(rawProfile.createdAt);
    const updatedAtValue = Number(rawProfile.updatedAt);

    usedIds.add(id);

    return {
      id,
      name,
      avatarVerseId,
      createdAt: Number.isFinite(createdAtValue) && createdAtValue > 0
        ? createdAtValue
        : now,
      updatedAt: Number.isFinite(updatedAtValue) && updatedAtValue > 0
        ? updatedAtValue
        : now
    };
  }

  function normalizeProfileRegistry(rawRegistry) {
    const registry = rawRegistry && typeof rawRegistry === "object"
      ? rawRegistry
      : {};

    const usedIds = new Set();
    const profiles = Array.isArray(registry.profiles)
      ? registry.profiles
        .map(profile => normalizeProfileRecord(profile, usedIds))
        .filter(Boolean)
      : [];

    let activeProfileId = String(registry.activeProfileId || "").trim();

    if (!profiles.some(profile => profile.id === activeProfileId)) {
      activeProfileId = "";
    }

    return {
      version: PROFILE_REGISTRY_VERSION,
      activeProfileId,
      profiles,
      migration: normalizeLegacyMigrationState(registry.migration)
    };
  }

  function loadProfileRegistry() {
    try {
      const raw = localStorage.getItem(PROFILE_REGISTRY_STORAGE_KEY);

      if (!raw) {
        return createEmptyProfileRegistry();
      }

      const parsed = JSON.parse(raw);
      const normalized = normalizeProfileRegistry(parsed);

      if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
        saveProfileRegistry(normalized);
      }

      return normalized;
    } catch (err) {
      console.warn("Could not load BibloZoo profile registry", err);
      return createEmptyProfileRegistry();
    }
  }

  function saveProfileRegistry(registry) {
    const normalized = normalizeProfileRegistry(registry);

    try {
      localStorage.setItem(
        PROFILE_REGISTRY_STORAGE_KEY,
        JSON.stringify(normalized)
      );
    } catch (err) {
      console.warn("Could not save BibloZoo profile registry", err);
      throw err;
    }

    return cloneJson(normalized);
  }

  function getAllProfiles() {
    return cloneJson(loadProfileRegistry().profiles);
  }

  function hasProfiles() {
    return loadProfileRegistry().profiles.length > 0;
  }

  function getProfileById(profileId) {
    const id = String(profileId || "").trim();
    if (!id) return null;

    const profile = loadProfileRegistry().profiles.find(item => item.id === id);
    return profile ? cloneJson(profile) : null;
  }

  function getActiveProfileId() {
    return loadProfileRegistry().activeProfileId || "";
  }

  function getActiveProfile() {
    const registry = loadProfileRegistry();

    if (!registry.activeProfileId) return null;

    const profile = registry.profiles.find(
      item => item.id === registry.activeProfileId
    );

    return profile ? cloneJson(profile) : null;
  }

  function setActiveProfile(profileId) {
    const id = String(profileId || "").trim();
    const registry = loadProfileRegistry();

    if (!id) {
      registry.activeProfileId = "";
      saveProfileRegistry(registry);
      return null;
    }

    const profile = registry.profiles.find(item => item.id === id);

    if (!profile) {
      throw new Error("The selected Zookeeper profile does not exist.");
    }

    registry.activeProfileId = profile.id;
    saveProfileRegistry(registry);

    return cloneJson(profile);
  }

  function clearActiveProfile() {
    return setActiveProfile("");
  }

  function isProfileNameInUse(name, excludeProfileId = "") {
    const comparisonName = normalizeProfileNameForComparison(name);

    if (!comparisonName) return false;

    const excludedId = String(excludeProfileId || "").trim();

    return loadProfileRegistry().profiles.some(profile => {
      if (excludedId && profile.id === excludedId) return false;

      return normalizeProfileNameForComparison(profile.name) === comparisonName;
    });
  }

  function createProfile({
    name,
    avatarVerseId = "",
    makeActive = true,
    id = ""
  } = {}) {
    const validation = validateProfileName(name);

    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const cleanName = validation.name;
    const registry = loadProfileRegistry();
    const usedIds = new Set(registry.profiles.map(profile => profile.id));

    let profileId = String(id || "").trim();

    if (!profileId || usedIds.has(profileId)) {
      profileId = generateProfileId();

      while (usedIds.has(profileId)) {
        profileId = generateProfileId();
      }
    }

    const now = Date.now();
    const profile = {
      id: profileId,
      name: cleanName,
      avatarVerseId: String(avatarVerseId || "").trim(),
      createdAt: now,
      updatedAt: now
    };

    registry.profiles.push(profile);

    if (makeActive || registry.profiles.length === 1) {
      registry.activeProfileId = profile.id;
    }

    saveProfileRegistry(registry);

    return cloneJson(profile);
  }

  function updateProfile(profileId, updates = {}) {
    const id = String(profileId || "").trim();

    if (!id) {
      throw new Error("A Zookeeper profile ID is required.");
    }

    const registry = loadProfileRegistry();
    const profileIndex = registry.profiles.findIndex(profile => profile.id === id);

    if (profileIndex < 0) {
      throw new Error("The Zookeeper profile could not be found.");
    }

    const currentProfile = registry.profiles[profileIndex];
    const requestedName = Object.prototype.hasOwnProperty.call(updates, "name")
      ? updates.name
      : currentProfile.name;

    const validation = validateProfileName(requestedName, {
      excludeProfileId: id
    });

    if (!validation.ok) {
      throw new Error(validation.message);
    }

    const nextName = validation.name;

    const nextAvatarVerseId = Object.prototype.hasOwnProperty.call(
      updates,
      "avatarVerseId"
    )
      ? String(updates.avatarVerseId || "").trim()
      : currentProfile.avatarVerseId;

    const updatedProfile = {
      ...currentProfile,
      name: nextName,
      avatarVerseId: nextAvatarVerseId,
      updatedAt: Date.now()
    };

    registry.profiles[profileIndex] = updatedProfile;
    saveProfileRegistry(registry);

    return cloneJson(updatedProfile);
  }

  function getProfileProgressStorageKey(profileId = getActiveProfileId()) {
    const id = String(profileId || "").trim();

    if (!id) return "";

    return `${LEGACY_PROGRESS_STORAGE_KEY}:${id}`;
  }

  function deleteProfile(profileId, { removeProgress = false } = {}) {
    const id = String(profileId || "").trim();

    if (!id) {
      throw new Error("A Zookeeper profile ID is required.");
    }

    const registry = loadProfileRegistry();
    const existingProfile = registry.profiles.find(profile => profile.id === id);

    if (!existingProfile) return false;

    registry.profiles = registry.profiles.filter(profile => profile.id !== id);

    if (registry.activeProfileId === id) {
      registry.activeProfileId = "";
    }

    saveProfileRegistry(registry);

    if (removeProgress) {
      const progressKey = getProfileProgressStorageKey(id);

      if (progressKey) {
        try {
          localStorage.removeItem(progressKey);
        } catch (err) {
          console.warn("Could not remove Zookeeper progress", err);
        }
      }
    }

    return true;
  }

  function profileHasSavedProgress(profileId) {
    const key = getProfileProgressStorageKey(profileId);
    if (!key) return false;

    try {
      return localStorage.getItem(key) !== null;
    } catch (err) {
      return false;
    }
  }

  function hasLegacyProgress() {
    try {
      return localStorage.getItem(LEGACY_PROGRESS_STORAGE_KEY) !== null;
    } catch (err) {
      return false;
    }
  }

  function getLegacyProgressStorageKey() {
    return LEGACY_PROGRESS_STORAGE_KEY;
  }

  function profileRegistryStorageExists() {
    try {
      return localStorage.getItem(PROFILE_REGISTRY_STORAGE_KEY) !== null;
    } catch (err) {
      return false;
    }
  }

  function readLegacyProgressRaw() {
    try {
      return localStorage.getItem(LEGACY_PROGRESS_STORAGE_KEY);
    } catch (err) {
      throw new Error("The old progress data could not be read.");
    }
  }

  function parseLegacyProgressRaw(rawValue) {
    if (rawValue === null) {
      return {
        ok: false,
        code: "missing",
        progress: null,
        message: "No old progress was found."
      };
    }

    try {
      const parsed = JSON.parse(rawValue);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return {
          ok: false,
          code: "malformed",
          progress: null,
          message: "The old progress data is not a valid progress object."
        };
      }

      return {
        ok: true,
        code: "ready",
        progress: parsed,
        message: ""
      };
    } catch (err) {
      return {
        ok: false,
        code: "malformed",
        progress: null,
        message: "The old progress data contains invalid JSON."
      };
    }
  }

  function getLegacyMigrationState() {
    let registryRaw = null;

    try {
      registryRaw = localStorage.getItem(
        PROFILE_REGISTRY_STORAGE_KEY
      );
    } catch (err) {
      return {
        code: "profiles_already_initialized",
        registryExists: true,
        registryMalformed: true,
        hasLegacyProgress: hasLegacyProgress(),
        migration: createDefaultLegacyMigrationState(),
        message: "The profile registry could not be read."
      };
    }

    if (registryRaw !== null) {
      try {
        const parsedRegistry = JSON.parse(registryRaw);
        const registry = normalizeProfileRegistry(parsedRegistry);
        const migration = registry.migration;

        if (migration.status === LEGACY_MIGRATION_STATUS.PENDING) {
          return {
            code: "migration_pending",
            registryExists: true,
            registryMalformed: false,
            hasLegacyProgress: hasLegacyProgress(),
            migration: cloneJson(migration),
            message: "Old progress is waiting to be added to a profile."
          };
        }

        if (migration.status === LEGACY_MIGRATION_STATUS.COMPLETED) {
          return {
            code: "migration_completed",
            registryExists: true,
            registryMalformed: false,
            hasLegacyProgress: hasLegacyProgress(),
            migration: cloneJson(migration),
            message: "Old progress has already been migrated."
          };
        }

        if (migration.status === LEGACY_MIGRATION_STATUS.FAILED) {
          return {
            code: "migration_failed",
            registryExists: true,
            registryMalformed: false,
            hasLegacyProgress: hasLegacyProgress(),
            migration: cloneJson(migration),
            message: migration.error || "Old progress migration failed."
          };
        }

        if (migration.status === LEGACY_MIGRATION_STATUS.NOT_NEEDED) {
          return {
            code: "migration_not_needed",
            registryExists: true,
            registryMalformed: false,
            hasLegacyProgress: hasLegacyProgress(),
            migration: cloneJson(migration),
            message: "There was no old progress to migrate."
          };
        }

        return {
          code: "profiles_already_initialized",
          registryExists: true,
          registryMalformed: false,
          hasLegacyProgress: hasLegacyProgress(),
          migration: cloneJson(migration),
          message: "Zookeeper profiles have already been initialized."
        };
      } catch (err) {
        return {
          code: "profiles_already_initialized",
          registryExists: true,
          registryMalformed: true,
          hasLegacyProgress: hasLegacyProgress(),
          migration: createDefaultLegacyMigrationState(),
          message: "The existing profile registry contains invalid JSON."
        };
      }
    }

    const rawLegacyProgress = readLegacyProgressRaw();

    if (rawLegacyProgress === null) {
      return {
        code: "no_legacy_progress",
        registryExists: false,
        registryMalformed: false,
        hasLegacyProgress: false,
        migration: createDefaultLegacyMigrationState(),
        message: "No old progress was found."
      };
    }

    const parsedLegacyProgress =
      parseLegacyProgressRaw(rawLegacyProgress);

    if (!parsedLegacyProgress.ok) {
      return {
        code: "legacy_progress_malformed",
        registryExists: false,
        registryMalformed: false,
        hasLegacyProgress: true,
        migration: createDefaultLegacyMigrationState(),
        message: parsedLegacyProgress.message
      };
    }

    return {
      code: "legacy_progress_ready",
      registryExists: false,
      registryMalformed: false,
      hasLegacyProgress: true,
      migration: createDefaultLegacyMigrationState(),
      message: "Old progress is ready to be added to a profile."
    };
  }

  function updateLegacyMigrationState(status, updates = {}) {
    const registry = loadProfileRegistry();

    registry.migration = createDefaultLegacyMigrationState({
      ...registry.migration,
      ...updates,
      status
    });

    saveProfileRegistry(registry);

    return cloneJson(registry.migration);
  }

  function markLegacyMigrationPending(profileId = "") {
    const rawLegacyProgress = readLegacyProgressRaw();
    const parsedLegacyProgress =
      parseLegacyProgressRaw(rawLegacyProgress);

    if (!parsedLegacyProgress.ok) {
      throw new Error(parsedLegacyProgress.message);
    }

    return updateLegacyMigrationState(
      LEGACY_MIGRATION_STATUS.PENDING,
      {
        profileId: String(profileId || "").trim(),
        pendingAt: Date.now(),
        completedAt: 0,
        failedAt: 0,
        error: ""
      }
    );
  }

  function markLegacyMigrationCompleted(profileId) {
    return updateLegacyMigrationState(
      LEGACY_MIGRATION_STATUS.COMPLETED,
      {
        profileId: String(profileId || "").trim(),
        completedAt: Date.now(),
        failedAt: 0,
        error: ""
      }
    );
  }

  function markLegacyMigrationFailed(profileId, error) {
    return updateLegacyMigrationState(
      LEGACY_MIGRATION_STATUS.FAILED,
      {
        profileId: String(profileId || "").trim(),
        failedAt: Date.now(),
        error: String(
          error?.message ||
          error ||
          "Old progress migration failed."
        )
      }
    );
  }

  function markLegacyMigrationNotNeeded() {
    return updateLegacyMigrationState(
      LEGACY_MIGRATION_STATUS.NOT_NEEDED,
      {
        profileId: "",
        completedAt: Date.now(),
        failedAt: 0,
        error: ""
      }
    );
  }

  function migrateLegacyProgressToProfile(profileId, {
    prepareProgress,
    allowOverwrite = false
  } = {}) {
    const id = String(profileId || "").trim();

    if (!id) {
      throw new Error("A destination Zookeeper profile is required.");
    }

    const profile = getProfileById(id);

    if (!profile) {
      throw new Error("The destination Zookeeper profile does not exist.");
    }

    const rawLegacyProgress = readLegacyProgressRaw();
    const parsedLegacyProgress =
      parseLegacyProgressRaw(rawLegacyProgress);

    if (!parsedLegacyProgress.ok) {
      throw new Error(parsedLegacyProgress.message);
    }

    markLegacyMigrationPending(id);

    try {
      let preparedProgress = cloneJson(
        parsedLegacyProgress.progress
      );

      if (typeof prepareProgress === "function") {
        preparedProgress = prepareProgress(
          cloneJson(parsedLegacyProgress.progress)
        );
      }

      if (
        !preparedProgress ||
        typeof preparedProgress !== "object" ||
        Array.isArray(preparedProgress)
      ) {
        throw new Error(
          "The old progress could not be prepared for migration."
        );
      }

      const destinationKey =
        getProfileProgressStorageKey(id);

      if (!destinationKey) {
        throw new Error(
          "The destination progress key could not be created."
        );
      }

      const serializedProgress =
        JSON.stringify(preparedProgress);

      const existingDestination =
        localStorage.getItem(destinationKey);

      if (
        existingDestination !== null &&
        existingDestination !== serializedProgress &&
        !allowOverwrite
      ) {
        throw new Error(
          "This Zookeeper already has different saved progress."
        );
      }

      if (
        existingDestination === null ||
        allowOverwrite
      ) {
        localStorage.setItem(
          destinationKey,
          serializedProgress
        );
      }

      const verifiedRaw =
        localStorage.getItem(destinationKey);

      if (verifiedRaw !== serializedProgress) {
        throw new Error(
          "The migrated progress could not be verified."
        );
      }

      const verifiedProgress = JSON.parse(verifiedRaw);

      if (
        !verifiedProgress ||
        typeof verifiedProgress !== "object" ||
        Array.isArray(verifiedProgress)
      ) {
        throw new Error(
          "The migrated progress failed its verification check."
        );
      }

      const migration =
        markLegacyMigrationCompleted(id);

      return {
        ok: true,
        profile: cloneJson(profile),
        progressKey: destinationKey,
        progress: cloneJson(verifiedProgress),
        migration
      };
    } catch (err) {
      try {
        markLegacyMigrationFailed(id, err);
      } catch (markerError) {
        console.warn(
          "Could not record legacy migration failure",
          markerError
        );
      }

      throw err;
    }
  }

  function normalizeProfilePictureVerseId(value) {
    const verseId = String(value || "")
      .trim()
      .toLowerCase();

    if (!/^[a-z0-9_]+$/.test(verseId)) {
      return "";
    }

    return verseId;
  }

  function getProfilePictureSrc(verseId) {
    const cleanVerseId =
      normalizeProfilePictureVerseId(verseId);

    if (!cleanVerseId) return "";

    return `${PROFILE_PICTURE_DIR}profile_picture_${cleanVerseId}.png`;
  }

  function getProfilePictureFallbackSrc() {
    return `${PROFILE_PICTURE_DIR}${PROFILE_PICTURE_FALLBACK_FILE}`;
  }

  function normalizeProfilePictureManifest(rawManifest) {
    const manifest =
      rawManifest &&
      typeof rawManifest === "object" &&
      !Array.isArray(rawManifest)
        ? rawManifest
        : {};

    const requestedMode = String(manifest.mode || "");

    const mode =
      requestedMode === PROFILE_PICTURE_MANIFEST_MODES.LISTED
        ? PROFILE_PICTURE_MANIFEST_MODES.LISTED
        : PROFILE_PICTURE_MANIFEST_MODES.ALL_VERSES;

    const seenVerseIds = new Set();

    const verseIds = Array.isArray(manifest.verseIds)
      ? manifest.verseIds
          .map(normalizeProfilePictureVerseId)
          .filter((verseId) => {
            if (!verseId || seenVerseIds.has(verseId)) {
              return false;
            }

            seenVerseIds.add(verseId);
            return true;
          })
      : [];

    return {
      version: 1,
      mode,
      verseIds
    };
  }

  function getProfilePictureManifest() {
    return cloneJson(
      profilePictureManifest ||
      normalizeProfilePictureManifest(null)
    );
  }

  async function loadProfilePictureManifest({
    forceReload = false
  } = {}) {
    if (profilePictureManifest && !forceReload) {
      return cloneJson(profilePictureManifest);
    }

    if (profilePictureManifestLoadPromise && !forceReload) {
      return profilePictureManifestLoadPromise;
    }

    profilePictureManifestLoadPromise = fetch(
      PROFILE_PICTURE_MANIFEST_URL,
      { cache: "no-store" }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      })
      .then((json) => {
        profilePictureManifest =
          normalizeProfilePictureManifest(json);

        return cloneJson(profilePictureManifest);
      })
      .catch((err) => {
        console.warn(
          "Could not load profile-picture manifest; assuming all verses have pictures.",
          err
        );

        profilePictureManifest =
          normalizeProfilePictureManifest({
            mode: PROFILE_PICTURE_MANIFEST_MODES.ALL_VERSES
          });

        return cloneJson(profilePictureManifest);
      })
      .finally(() => {
        profilePictureManifestLoadPromise = null;
      });

    return profilePictureManifestLoadPromise;
  }

  function buildProfilePictureCatalog(
    verseList,
    manifest = profilePictureManifest
  ) {
    const normalizedManifest =
      normalizeProfilePictureManifest(manifest);

    const listedVerseIds = new Set(
      normalizedManifest.verseIds
    );

    const seenVerseIds = new Set();

    const officialVerseIds = Array.isArray(verseList)
      ? verseList
          .map((item) =>
            normalizeProfilePictureVerseId(item?.id)
          )
          .filter((verseId) => {
            if (!verseId || seenVerseIds.has(verseId)) {
              return false;
            }

            seenVerseIds.add(verseId);
            return true;
          })
      : [];

    if (
      normalizedManifest.mode ===
      PROFILE_PICTURE_MANIFEST_MODES.LISTED
    ) {
      return officialVerseIds.filter((verseId) =>
        listedVerseIds.has(verseId)
      );
    }

    return officialVerseIds;
  }

  function getProfilePictureCatalog({
    includeMissing = false
  } = {}) {
    const catalog = includeMissing
      ? profilePictureCatalog
      : profilePictureCatalog.filter(
          (verseId) =>
            !missingProfilePictureVerseIds.has(verseId)
        );

    return [...catalog];
  }

  function markProfilePictureLoaded(verseId) {
    const cleanVerseId =
      normalizeProfilePictureVerseId(verseId);

    if (!cleanVerseId) return false;

    loadedProfilePictureVerseIds.add(cleanVerseId);
    missingProfilePictureVerseIds.delete(cleanVerseId);

    return true;
  }

  function markProfilePictureMissing(verseId) {
    const cleanVerseId =
      normalizeProfilePictureVerseId(verseId);

    if (!cleanVerseId) return false;

    missingProfilePictureVerseIds.add(cleanVerseId);
    loadedProfilePictureVerseIds.delete(cleanVerseId);

    return true;
  }

  function isProfilePictureLoaded(verseId) {
    const cleanVerseId =
      normalizeProfilePictureVerseId(verseId);

    return !!cleanVerseId &&
      loadedProfilePictureVerseIds.has(cleanVerseId);
  }

  function isProfilePictureMissing(verseId) {
    const cleanVerseId =
      normalizeProfilePictureVerseId(verseId);

    return !!cleanVerseId &&
      missingProfilePictureVerseIds.has(cleanVerseId);
  }

  function preloadProfilePicture(verseId) {
    const cleanVerseId =
      normalizeProfilePictureVerseId(verseId);

    if (!cleanVerseId) {
      return Promise.resolve(false);
    }

    if (loadedProfilePictureVerseIds.has(cleanVerseId)) {
      return Promise.resolve(true);
    }

    if (missingProfilePictureVerseIds.has(cleanVerseId)) {
      return Promise.resolve(false);
    }

    if (profilePictureLoadPromises.has(cleanVerseId)) {
      return profilePictureLoadPromises.get(cleanVerseId);
    }

    const src = getProfilePictureSrc(cleanVerseId);

    if (!src) {
      return Promise.resolve(false);
    }

    const loadPromise = new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        markProfilePictureLoaded(cleanVerseId);
        resolve(true);
      };

      img.onerror = () => {
        markProfilePictureMissing(cleanVerseId);
        resolve(false);
      };

      img.src = src;
    }).finally(() => {
      profilePictureLoadPromises.delete(cleanVerseId);
    });

    profilePictureLoadPromises.set(
      cleanVerseId,
      loadPromise
    );

    return loadPromise;
  }

  function preloadProfilePictureNeighborhood(verseId) {
    const catalog = getProfilePictureCatalog({
      includeMissing: true
    });

    if (!catalog.length) {
      return Promise.resolve([]);
    }

    const cleanVerseId =
      normalizeProfilePictureVerseId(verseId);

    let centerIndex = catalog.indexOf(cleanVerseId);

    if (centerIndex < 0) {
      centerIndex = 0;
    }

    const nearbyVerseIds = [-1, 0, 1]
      .map((offset) => {
        const index =
          ((centerIndex + offset) % catalog.length +
            catalog.length) % catalog.length;

        return catalog[index];
      })
      .filter((item, index, items) =>
        item && items.indexOf(item) === index
      );

    return Promise.all(
      nearbyVerseIds.map((nearbyVerseId) =>
        preloadProfilePicture(nearbyVerseId)
      )
    );
  }

  function handleProfilePictureLoad(img) {
    if (!img) return;

    const isFallback =
      img.dataset.profilePictureFallback === "1";

    if (!isFallback) {
      markProfilePictureLoaded(
        img.dataset.profilePictureVerseId
      );
    }

    const fallback =
      img.parentElement?.querySelector?.(
        ".profile-picture-fallback"
      );

    if (fallback) {
      fallback.classList.add("is-hidden");
    }

    img.hidden = false;
    img.classList.add("is-loaded");
    img.classList.remove("is-missing");
  }

  function handleProfilePictureError(img) {
    if (!img) return;

    const verseId =
      normalizeProfilePictureVerseId(
        img.dataset.profilePictureVerseId
      );

    if (verseId) {
      markProfilePictureMissing(verseId);
    }

    img.classList.remove("is-loaded");
    img.classList.add("is-missing");

    if (img.dataset.profilePictureFallback !== "1") {
      img.dataset.profilePictureFallback = "1";
      img.dataset.profilePictureVerseId = "";
      img.src = getProfilePictureFallbackSrc();
      return;
    }

    const fallback =
      img.parentElement?.querySelector?.(
        ".profile-picture-fallback"
      );

    if (fallback) {
      fallback.classList.remove("is-hidden");
    }

    img.hidden = true;
    img.removeAttribute("src");
  }

  async function loadProfilePictureCatalog(
    verseList,
    {
      forceReloadManifest = false
    } = {}
  ) {
    const manifest =
      await loadProfilePictureManifest({
        forceReload: forceReloadManifest
      });

    profilePictureCatalog =
      buildProfilePictureCatalog(
        verseList,
        manifest
      );

    return getProfilePictureCatalog();
  }

  function resetProfilePictureSessionCache() {
    loadedProfilePictureVerseIds.clear();
    missingProfilePictureVerseIds.clear();
    profilePictureLoadPromises.clear();
  }

  window.BibloZooProfiles = Object.freeze({
    PROFILE_REGISTRY_STORAGE_KEY,
    PROFILE_REGISTRY_VERSION,
    LEGACY_PROGRESS_STORAGE_KEY,

    createEmptyProfileRegistry,
    normalizeProfileRegistry,
    loadProfileRegistry,
    saveProfileRegistry,

    getAllProfiles,
    hasProfiles,
    getProfileById,
    getActiveProfileId,
    getActiveProfile,
    setActiveProfile,
    clearActiveProfile,

    createProfile,
    updateProfile,
    deleteProfile,
    isProfileNameInUse,

    PROFILE_NAME_MAX_LENGTH,
    cleanProfileName,
    validateProfileName,
    normalizeProfileNameForComparison,
    getProfileProgressStorageKey,
    profileHasSavedProgress,

    LEGACY_PROGRESS_MIGRATION_VERSION,
    LEGACY_MIGRATION_STATUS,
    profileRegistryStorageExists,
    hasLegacyProgress,
    getLegacyProgressStorageKey,
    readLegacyProgressRaw,
    parseLegacyProgressRaw,
    getLegacyMigrationState,
    markLegacyMigrationPending,
    markLegacyMigrationCompleted,
    markLegacyMigrationFailed,
    markLegacyMigrationNotNeeded,
    migrateLegacyProgressToProfile,

    PROFILE_PICTURE_DIR,
    PROFILE_PICTURE_MANIFEST_URL,
    PROFILE_PICTURE_FALLBACK_FILE,
    PROFILE_PICTURE_MANIFEST_MODES,
    normalizeProfilePictureVerseId,
    getProfilePictureSrc,
    getProfilePictureFallbackSrc,
    normalizeProfilePictureManifest,
    getProfilePictureManifest,
    loadProfilePictureManifest,
    buildProfilePictureCatalog,
    loadProfilePictureCatalog,
    getProfilePictureCatalog,
    preloadProfilePicture,
    preloadProfilePictureNeighborhood,
    handleProfilePictureLoad,
    handleProfilePictureError,
    markProfilePictureLoaded,
    markProfilePictureMissing,
    isProfilePictureLoaded,
    isProfilePictureMissing,
    resetProfilePictureSessionCache
  });
})();
