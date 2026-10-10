(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.BibloZooSafeWordScramble = api;
  }
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  // A conservative blocklist for displaying rearranged letters to children.
  // Check the generated result, not just the original word.
  // This is a safeguard, not a substitute for reviewing child-facing content.
  const BLOCKED_WORDS = new Set([
    "ass", "arse", "bastard", "bitch", "bollocks", "boner",
    "cock", "crap", "cunt", "damn", "dick", "dildo", "fag",
    "faggot", "fuck", "fucker", "fucking", "hell", "hoe",
    "motherfucker", "nazi", "nigger", "piss", "porn", "prick",
    "pussy", "rape", "rapist", "sex", "shit", "shitty", "slut",
    "tits", "twat", "vagina", "wank", "whore"
  ]);

  function isSafeWord(word) {
    const normalized = String(word ?? "")
      .normalize("NFKD")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
    return normalized.length > 0 && !BLOCKED_WORDS.has(normalized);
  }

  return Object.freeze({ isSafeWord });
});
