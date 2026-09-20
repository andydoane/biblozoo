/* =========================================================
   BibloZoo Daily Pet Questions
   ========================================================= */

(function () {
    "use strict";

    /*
      The Daily Pet Questions feature will live in this module.
  
      app.js will remain responsible for:
        - global app navigation
        - profile progress storage
        - shared verse/audio helpers
        - deciding whether the feature is enabled
  
      This file will eventually handle:
        - daily question eligibility
        - question session state
        - title-screen question offer
        - question and verse-help screens
        - "Something to Chew On"
        - snack reward
        - feeding game
        - debug testing helpers
    */

    const MODULE_VERSION = 1;

    window.BibloZooDailyQuestions =
        Object.freeze({
            version: MODULE_VERSION
        });

})();