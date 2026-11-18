// R16a / AUDIO-01: source-level regression for the real native Swift boundaries.
// Does not prove audible iPhone output or compile/link against the iOS SDK.
// The project workflow separately runs its Swift parser, web build and tests.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const scene = fs.readFileSync(path.join(root, "ios/App/App/SceneDelegate.swift"), "utf8");
const sound = fs.readFileSync(path.join(root, "ios/App/App/BibloZooNativeSoundPlugin.swift"), "utf8");
const plist = fs.readFileSync(path.join(root, "ios/App/App/Info.plist"), "utf8");

function block(source, start, stop) {
  const a = source.indexOf(start);
  assert(a >= 0, "missing " + start);
  const b = source.indexOf(stop, a + start.length);
  assert(b > a, "missing trailing boundary " + stop);
  return source.slice(a, b);
}
function has(source, literal, reason) {
  assert(source.includes(literal), reason || "missing " + literal);
}
function lacks(source, literal, reason) {
  assert(!source.includes(literal), reason || "unexpected " + literal);
}

const policy = block(scene, "enum BibloZooEssentialVoiceSession {", "class SceneDelegate:");
has(policy, "UIApplication.shared.applicationState == .active", "voice lease must be foreground only");
has(policy, "session.category == .soloAmbient", "voice lease must require existing nonvoice category");
has(policy, "session.setCategory(.playback, mode: .default, options: [])", "essential voice must use playback");
has(policy, "session.setCategory(.soloAmbient, mode: .default, options: [])", "restore original sound policy");
has(policy, "if owner == requested", "idempotent same-owner only");
has(policy, "guard owner == nil", "do not overlap independent audio owners");
lacks(policy, "setActive(", "lease must never grab priority without existing gesture");
lacks(policy, "UIBackgroundModes", "no background policy in voice lease");
lacks(plist, "<key>UIBackgroundModes</key>", "no background audio capability authorized");

const narr = block(sound, "private func nativeNarrationURL(", "private func narrationSnapshot()");
has(narr, "publishedLearnVerseIDs.contains(verseId)", "verse files must remain validated and published");
has(narr, "flashcardInstructions", "short Flashcards speech remains allowlisted");
has(narr, "learn-instruction-", "short Learn speech remains allowlisted");
has(narr, "BibloZooEssentialVoiceSession.end(owner: \"native-narration\")", "stop must restore category");

const play = block(sound, "@objc func playNarration(", "@objc func pauseNarration(");
has(play, "self.unavailableReason()", "only preflighted foreground output can play");
has(play, "BibloZooEssentialVoiceSession.begin(", "narrator must lease voice category");
has(play, "owner: \"native-narration\"", "narration lease ownership");
has(play, "self.stopNarrationPlayer(reason: \"play-denied\")", "failed player starts must restore");
const pause = block(sound, "@objc func pauseNarration(", "@objc func seekNarration(");
has(pause, "BibloZooEssentialVoiceSession.end(owner: \"native-narration\")", "pause must restore");
const ended = block(sound, "func audioPlayerDidFinishPlaying(", "\n\n}");
has(ended, "BibloZooEssentialVoiceSession.end(owner: \"native-narration\")", "normal end must restore");
const route = block(sound, "forName: AVAudioSession.routeChangeNotification,", "forName: AVAudioSession.mediaServicesWereLostNotification,");
has(route, "RouteChangeReason.categoryChange.rawValue", "own category changes must not look like lost AirPods");
has(route, "self.forgetPlayback()", "real route changes must still stop current output");

const effects = block(sound, "@objc func play(_ call:", "@objc func stop(_ call:");
has(effects, "self.unavailableReason()", "decorative effects must retain soloAmbient guard");
const guards = block(sound, "private func unavailableReason()", "@objc func activateFromGesture(");
has(guards, "session.category != .soloAmbient", "no SFX under leased playback");

const flashPlay = block(scene, "@objc func playCapture(", "@objc func stopCapturePlayback(");
has(flashPlay, "session.category == .soloAmbient", "Flashcards replay must start from stable session");
has(flashPlay, "try session.setActive(true)", "only a real replay request activates OS audio");
has(flashPlay, "BibloZooEssentialVoiceSession.begin(", "Flashcards must lease after output activation");
has(flashPlay, 'owner: "flashcards-replay"', "Flashcards lease is separately owned");
has(flashPlay, '"reason": "voice-session-unavailable"', "failed lease must abort safely");
has(flashPlay, "session.category == .playback", "fresh output graph must match voice category");
const replayStop = block(scene, "private func stopPlaybackInternal(", "@objc func stopCapturePlayback(");
has(replayStop, 'BibloZooEssentialVoiceSession.end(owner: "flashcards-replay")', "replay finish/stop/interrupt must restore");

const record = block(scene, "@objc func prepareCapture(", "@objc func beginCapture(");
has(record, "guard session.category == .soloAmbient", "Record never inherits playback category");
has(record, "session.setCategory(.playAndRecord", "Record remains microphone-owned");
lacks(record, "BibloZooEssentialVoiceSession.begin", "never change recording via voice policy");
const read = block(scene, "final class BibloZooNativeReadOutputPlugin", "// Ghost Writer only");
has(read, "category == .soloAmbient", "Read still requires normal nonvoice category to activate");
has(read, 'BibloZooEssentialVoiceSession.begin(', "R16b later adds separately owned, music-free Read verse lease");
has(read, 'owner: "read-narration"', "R16b Read never borrows R16a native narration owner");
has(read, 'self.clips.isEmpty, self.cues.isEmpty', "R16b must reject overlapping Read music/effects");
has(read, 'category == .soloAmbient else', "R16b still gates incidental Read sound");

console.log("R16a voice-session source boundaries: PASS (not a physical Silent Mode or Xcode test)");
