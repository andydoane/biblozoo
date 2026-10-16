# Daily Feeding Game — Classic Baseline

This document records the existing Classic feeding-game contract before the
feeding reward is expanded into multiple gameplay modes. Patch 01 intentionally
does not change `daily_questions_feed_game.js`; it documents and validates the
current behavior so later patches can detect accidental Classic regressions.

## Public module contract

`window.BibloZooDailyFeedGame` is frozen and currently exposes:

- `version: 1`
- `prepareAudio()`
- `render({ session, profilePictureHtml = "" } = {})`
- `start(rootEl, { session, onComplete, onBackToZoo } = {})`
- `stop()`
- `getResultCopy(score, caughtCount, petName)`

### `prepareAudio()`

- Takes no arguments.
- Returns a prepared `AudioContext` when Web Audio is available, otherwise
  returns `null`.
- Reuses and resumes the existing prepared context when possible.
- Begins loading the star and chomp sound buffers.
- Failure to create the context is non-fatal and returns `null`.

### `render({ session, profilePictureHtml })`

- Returns the Classic feeding-game HTML string.
- Uses `session.petName`, defaulting to `BibloPet`.
- Uses `session.dailyTodoSnack === true` to choose the Daily snack result copy
  and Back Home button.
- Injects the supplied `profilePictureHtml` into the live catcher and result art.
- Produces the score badge, canvas, pet catcher, start overlay, result overlay,
  and the DOM hooks expected by `start()`.
- Classic instructions are `Catch the BibloSnacks!` and `Tilt to steer`.

### `start(rootEl, { session, onComplete, onBackToZoo })`

- Stops any previous feeding runtime before creating the new one while
  preserving an already prepared audio context.
- Returns `null` when `rootEl` or `session` is missing, required feeding DOM is
  absent, or a 2D canvas context is unavailable.
- If the stage is temporarily too small (`width < 120` or `height < 260`), it
  schedules a retry on the next animation frame and returns `null`.
- Clamps `session.earnedStarPegCount` to the supported 0-2 input range before
  creating the peg field.
- Uses `session.rewardTiltEnabled === true` to decide whether orientation input
  is enabled.
- Installs start-overlay and result-button handlers immediately. Gameplay
  pointer/orientation listeners are installed when the round begins.
- Calls `onComplete({ score, caughtCount })` exactly when gameplay completes.
- Calls `onBackToZoo()` from the result button. A return value of `false`
  prevents closing; otherwise the game calls `stop()`.
- If `session.rewardComplete` is already true, restores `rewardScore` and
  `rewardCaught` and opens the result state without replaying the round.

### `stop()`

- Clears the active runtime reference and marks the runtime as not running.
- Cancels the active animation frame.
- Detaches orientation and pointer gameplay input.
- Removes the start-overlay and result-button handlers.
- Releases pointer capture when necessary.
- Stops/reset fallback star and chomp `Audio` elements.
- Closes the runtime AudioContext.
- Closes and clears any separately prepared AudioContext.
- Is safe to call when no game is active.

## Classic gameplay baseline

### Scheduled snacks and scoring

- Each normal round schedules exactly seven snacks.
- The first six are one each of red, yellow, orange, green, blue, and purple in
  shuffled order.
- The rainbow snack is always the seventh scheduled snack.
- Normal snacks use the default value of 1 point.
- The rainbow snack is worth 5 points.
- Star-bonus snacks are additional and do not count toward the seven scheduled
  snacks.
- Scheduled snacks arrive roughly every 4-5 seconds.

### Peg field and Question stars

- The Classic board has 9 staggered rows.
- Even rows contain 5 pegs and odd rows contain 4, for 41 pegs total.
- Question stars add to one base star peg:
  - 0 earned Question stars => 1 star peg.
  - 1 earned Question star => 2 star pegs.
  - 2 earned Question stars => 3 star pegs.
- Star pegs are selected from interior rows rather than the first/last row.
- A star peg is consumed after one hit.
- Hitting a star peg creates the star burst/sound and immediately spawns three
  simultaneous bonus snacks at approximately 20%, 50%, and 80% of stage width.

### Pet and input

- The pet catcher begins centered at the bottom of the game.
- Tilt input calibrates for 750 ms using the device's resting gamma as neutral.
- Tilt is limited to a relative range of -25 to +25 degrees and smoothed before
  mapping to the pet's horizontal travel.
- Pointer dragging is always available during an active round and directly moves
  the catcher horizontally.
- Dragging temporarily takes precedence over tilt.
- The pet visually leans in response to horizontal movement.

### Physics and catch behavior

- Classic uses gravity and circular peg collisions.
- Frame delta is clamped to at most 0.032 seconds.
- Each rendered frame performs two half-step ball physics updates.
- Balls collide with the left/right walls, pegs, and each other.
- A catch occurs when the snack circle intersects the pet catch circle.
- Catching increments `score` by the snack's point value and increments
  `caughtCount` by one.
- A successful catch updates the score badge, displays a score popup, plays the
  chomp sound, and triggers the pet catch animation.
- Missed snacks are removed after passing below the stage.
- A ball also has a 22-second lifetime failsafe.

### Background and overlays

- Background scene is randomly selected from the existing 11-scene set.
- Aspect ratio `width / height >= 0.66` selects the tablet background asset;
  narrower layouts select the phone asset.
- Start overlay title: `Catch the BibloSnacks!`
- Start overlay instruction: `Tilt to steer`
- Start overlay ignores taps for the first 800 ms.

### Completion and results

- Completion requires every scheduled snack to have spawned and zero active
  snacks remaining.
- Once that condition is reached, the result waits 900 ms before completing.
- `onComplete` receives `{ score, caughtCount }`.
- Daily Zoo To-Do snack results show:
  - `Thanks for the snack, [ZOOKEEPER NAME]!`
  - `Score: X`
  - `Zoo To-Do Complete!`
  - `Back Home`
- Non-Daily results continue to use `getResultCopy()`.

## Automated baseline validation

Run:

```bash
npm run validate:daily-feed-game
```

The validator checks the current Classic public API, render hooks/copy, scheduled
snack composition, peg layout, Question-star counts, three-snack star bonus,
background format selection, catch geometry, completion delay, result thresholds,
timing/physics constants, input/cleanup wiring, and missing-input start behavior.

The validation script instruments an in-memory copy of the feeding source only so
it can call selected private pure helpers. It does not change or expose those
helpers in the application runtime.

## Manual regression checklist

Use this checklist on the actual app because Node validation cannot prove sensor,
canvas, audio, layout, or navigation behavior.

### Normal Daily snack

- [ ] Complete enough of Daily Zoo To-Do to unlock `Feed me a snack`.
- [ ] Launch the snack normally; there is no mode selector and Classic opens.
- [ ] The existing Classic peg board appears with the pet at the bottom.
- [ ] The start overlay still reads `Catch the BibloSnacks!` / `Tilt to steer`.

### Question stars

Test separate sessions/preview states as available:

- [ ] 0 earned Question stars produces 1 total star peg.
- [ ] 1 earned Question star produces 2 total star pegs.
- [ ] 2 earned Question stars produces 3 total star pegs.
- [ ] Hitting a star peg consumes it and produces exactly 3 bonus snacks.

### Tilt and pointer fallback

- [ ] With motion permission granted, hold the device naturally during the
      calibration period and verify the pet centers around the resting angle.
- [ ] Tilt left/right and verify smooth horizontal pet movement.
- [ ] Drag the pet with touch/pointer and verify direct horizontal control.
- [ ] If motion permission is denied/unavailable, verify dragging still makes the
      game fully playable.

### Scoring, audio, and completion

- [ ] Normal catches add 1 point.
- [ ] Rainbow catch adds 5 points.
- [ ] Peg hits and star/chomp sounds behave as before when audio is available.
- [ ] Missing snacks never creates a failure/game-over state.
- [ ] After all scheduled/bonus snacks resolve, the result appears after the
      familiar short delay.
- [ ] Daily result shows the zookeeper thank-you, score, Zoo To-Do Complete, and
      Back Home.

### Cleanup and repeated launch

- [ ] Tap Back Home and confirm navigation completes normally.
- [ ] No feeding sounds continue after leaving the screen.
- [ ] Reopen the feeding game and verify there is only one animation loop,
      one set of controls, and no doubled spawning/catches.
- [ ] Leave the feeding screen during an active round and verify gameplay/audio
      stop immediately.

### Layout smoke test

- [ ] iPhone portrait: score, board, pet, overlays, and result fit correctly.
- [ ] iPad: tablet background is used and board/pet remain correctly sized.
- [ ] PWA/browser pointer fallback remains playable.

## Patch 01 acceptance criteria

Patch 01 passes when:

- `daily_questions_feed_game.js` has no diff.
- `npm run validate:daily-feed-game` passes.
- The manual Classic smoke test passes on the intended device(s).
- No new feeding modes are visible.
- No persisted Daily behavior or progress logic has changed.
