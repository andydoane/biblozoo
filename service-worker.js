/* =========================================================
   BibloZoo PWA service worker
   App scope: /eatyourbible/pwa/verse/
   ========================================================= */

const CACHE_VERSION = "2026_Aug_12_b";
const SHELL_CACHE =
  `biblozoo-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE =
  `biblozoo-runtime-${CACHE_VERSION}`;
const CACHE_PREFIX = "biblozoo-";

const APP_ROOT =
  new URL("./", self.location.href);

const APP_INDEX_URL =
  new URL("./index.html", APP_ROOT).href;

const PROFILE_FALLBACK_URL =
  new URL(
    "./profile_pictures/profile_picture_fallback.png",
    APP_ROOT
  ).href;

const CORE_PATHS = [
  "./",
  "./index.html",
  "./styles.css",
  "./profiles.css",
  "./profiles.js",
  "./app.js",

  "./verse_games/registry.js",
  "./verse_playground/registry.js",

  "./site.webmanifest",
  "./privacy_policy.html",

  "./verse_fonts/Baloo2.ttf",

  "./biblopet_name_blocklist.json",
  "./pet_random_names.json",

  "./profile_pictures/profile_pictures.json",
  "./profile_pictures/profile_picture_fallback.png",

  "./verse_data/verse_list.json",

  "./verse_images/eyb_logo_1.png",
  "./verse_images/title_biblozoo.png",
  "./verse_images/settings_gear.png",

  "./android-chrome-192x192.png",
  "./android-chrome-512x512.png",
  "./apple-touch-icon.png",
  "./favicon-32x32.png",
  "./favicon-16x16.png",
  "./favicon.ico"
];

const CORE_URLS = CORE_PATHS.map(
  (path) => new URL(path, APP_ROOT).href
);

function isCacheableResponse(response) {
  return !!(
    response &&
    response.ok &&
    response.status !== 206 &&
    response.type !== "opaque"
  );
}

async function storeResponse(
  cacheName,
  key,
  response
) {
  if (!isCacheableResponse(response)) {
    return;
  }

  const cache = await caches.open(cacheName);

  await cache.put(
    key,
    response.clone()
  );
}

async function cacheAllVerseData(cache) {
  const listUrl =
    new URL(
      "./verse_data/verse_list.json",
      APP_ROOT
    ).href;

  try {
    const listResponse = await fetch(
      listUrl,
      {
        cache: "no-store"
      }
    );

    if (!listResponse.ok) {
      throw new Error(
        `HTTP ${listResponse.status}`
      );
    }

    await cache.put(
      listUrl,
      listResponse.clone()
    );

    const verseList =
      await listResponse.json();

    const verseUrls =
      Array.isArray(verseList)
        ? verseList
          .map((item) =>
            String(item?.id || "").trim()
          )
          .filter(Boolean)
          .map((verseId) =>
            new URL(
              `./verse_data/${verseId}.json`,
              APP_ROOT
            ).href
          )
        : [];

    await Promise.allSettled(
      verseUrls.map(async (verseUrl) => {
        const response = await fetch(
          verseUrl,
          {
            cache: "no-store"
          }
        );

        if (response.ok) {
          await cache.put(
            verseUrl,
            response
          );
        }
      })
    );
  } catch (err) {
    console.warn(
      "Could not precache all BibloZoo verse data",
      err
    );
  }
}

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil((async () => {
      const cache =
        await caches.open(SHELL_CACHE);

      await cache.addAll(CORE_URLS);
      await cacheAllVerseData(cache);
    })());
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil((async () => {
      const validCaches = new Set([
        SHELL_CACHE,
        RUNTIME_CACHE
      ]);

      const cacheNames =
        await caches.keys();

      await Promise.all(
        cacheNames
          .filter((cacheName) =>
            cacheName.startsWith(
              CACHE_PREFIX
            ) &&
            !validCaches.has(cacheName)
          )
          .map((cacheName) =>
            caches.delete(cacheName)
          )
      );

      await self.clients.claim();
    })());
  }
);

async function networkFirst(
  request,
  fallbackUrl = ""
) {
  try {
    const response =
      await fetch(request);

    await storeResponse(
      RUNTIME_CACHE,
      request.url,
      response
    );

    return response;
  } catch (err) {
    const cached =
      await caches.match(request.url);

    if (cached) {
      return cached;
    }

    if (fallbackUrl) {
      const fallback =
        await caches.match(fallbackUrl);

      if (fallback) {
        return fallback;
      }
    }

    throw err;
  }
}

async function cacheFirst(
  request,
  fallbackUrl = ""
) {
  const cached =
    await caches.match(request.url);

  if (cached) {
    return cached;
  }

  try {
    const response =
      await fetch(request);

    await storeResponse(
      RUNTIME_CACHE,
      request.url,
      response
    );

    return response;
  } catch (err) {
    if (fallbackUrl) {
      const fallback =
        await caches.match(fallbackUrl);

      if (fallback) {
        return fallback;
      }
    }

    throw err;
  }
}

self.addEventListener(
  "fetch",
  (event) => {
    const request = event.request;

    if (request.method !== "GET") {
      return;
    }

    if (
      request.cache === "only-if-cached" &&
      request.mode !== "same-origin"
    ) {
      return;
    }

    /*
      Partial audio responses require separate
      range-request handling. Leave those requests
      to the browser for now.
    */
    if (request.headers.has("range")) {
      return;
    }

    const url =
      new URL(request.url);

    const scopeUrl =
      new URL(
        self.registration.scope
      );

    if (
      url.origin !== self.location.origin ||
      !url.pathname.startsWith(
        scopeUrl.pathname
      )
    ) {
      return;
    }

    /*
      Pages use network-first so deployed updates
      appear promptly. The cached index is the
      offline fallback.
    */
    if (request.mode === "navigate") {
      event.respondWith(
        networkFirst(
          request,
          APP_INDEX_URL
        )
      );

      return;
    }

    const isProfilePicture =
      url.pathname.includes(
        "/profile_pictures/"
      ) &&
      url.pathname.endsWith(".png");

    const isMediaAsset =
      request.destination === "image" ||
      request.destination === "audio" ||
      request.destination === "font";

    /*
      Images, profile pictures, audio, and fonts
      use cache-first after their first request.
    */
    if (
      isProfilePicture ||
      isMediaAsset
    ) {
      event.respondWith(
        cacheFirst(
          request,
          isProfilePicture
            ? PROFILE_FALLBACK_URL
            : ""
        )
      );

      return;
    }

    /*
      JavaScript, CSS, JSON, and other same-origin
      resources use network-first with cached
      offline fallback.
    */
    event.respondWith(
      networkFirst(request)
    );
  }
);
