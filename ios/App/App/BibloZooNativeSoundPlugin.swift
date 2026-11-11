import Foundation
import UIKit
import Capacitor
import AVFAudio
import Darwin // mach_absolute_time for bounded native Jam beat lookahead

// N3b native-only iOS session owner: fixed predecoded PCM star/chomp plus
// six locally synthesized native peg tones with bounded overlapping voices.
// DEV pilot-unlock remains a native AVAudioPlayer control. No Web Audio or
// HTML fallback. Only an explicit Start/Resume/DEV tap may request a bounded
// setActive(true) retry AFTER a completed foreground return. This plugin never
// calls setCategory/setMode, deactivates, or automatically resumes sound.
// Three allowlisted MP3 resources are packaged; peg notes are Swift-generated PCM.
@objc(BibloZooNativeSoundPlugin)
final class BibloZooNativeSoundPlugin: CAPPlugin, CAPBridgedPlugin, AVAudioPlayerDelegate {
    public let identifier = "BibloZooNativeSoundPlugin"
    public let jsName = "BibloZooNativeSound"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "preload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        // N7b DEV-only barrier: stop output worker before mic session proof.
        CAPPluginMethod(name: "devPrepareForMicrophone", returnType: CAPPluginReturnPromise),
        // N6o: cut only the bounded Scripture Scrub mower clip at the
        // end of its 1250ms visual pass; keep other PCM clips prepared.
        CAPPluginMethod(name: "stopEffect", returnType: CAPPluginReturnPromise),
        // Debug-only data tracing: fixed Verse Jam phase/word timing, no audio.
        CAPPluginMethod(name: "traceJamTransition", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "activateFromGesture", returnType: CAPPluginReturnPromise),
        // Read-only, bounded native session history; never activates audio.
        CAPPluginMethod(name: "getDebugState", returnType: CAPPluginReturnPromise),
        // N2.2 one-tap user-initiated diagnostics. No logging to disk/network.
        CAPPluginMethod(name: "copyTimingReport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "markRecentChompLate", returnType: CAPPluginReturnPromise),
        // N5b.1 DEV-only long narration contract. Not wired to Learn UI yet.
        CAPPluginMethod(name: "prepareNarration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playNarration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseNarration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seekNarration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getNarrationState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopNarration", returnType: CAPPluginReturnPromise)
    ]

    // All MP3s are checked-in project assets explicitly copied into the
    // iOS app bundle. No URLs or caller-controlled filesystem paths.
    // C.1 prepares separate players: preloading feed-star cannot evict
    // feed-chomp or the already-verified pilot-unlock sample.
    private let soundResources: [String: String] = [
        "pilot-unlock": "ui_pet_unlock",
        "feed-star": "dq_feed_star",
        "feed-chomp": "dq_feed_chomp",
        "ui-pop-1": "ui_sound_pop_1",
        "ui-pop-2": "ui_sound_pop_2"
    ]
    // N7h: original Daily Questions answer effects, native PCM only.
    // Both live in the Capacitor public folder; no web playback or URLs.
    private let dailyQuestionSoundResources: [String: String] = [
        "daily-question-correct": "dq_correct",
        "daily-question-incorrect": "dq_incorrect"
    ]
    // N6b fixed sound IDs map only to bundled Scripture Snake MP3 assets.
    private let snakeSoundResources: [String: String] = [
        "snake-correct": "verse_snake_correct",
        "snake-wrong": "verse_snake_wrong",
        "snake-fruit": "verse_snake_fruit",
        "snake-boost": "verse_snake_boost",
        "snake-bonus-start": "verse_snake_bonus_start",
        "snake-eat": "verse_snake_eat",
        "snake-bonus-result": "verse_snake_bonus_result"
    ]
    // N6c: fixed Bible Bugs MP3 sound inventory, decoded through the same
    // existing prewarmed worker AVAudioEngine; no caller-controlled paths.
    private let bibleBugsSoundResources: [String: String] = [
        "bugs-tongue": "bible_bugs_tongue",
        "bugs-pop-1": "bible_bugs_pop_1",
        "bugs-pop-2": "bible_bugs_pop_2",
        "bugs-pop-3": "bible_bugs_pop_3",
        "bugs-pop-4": "bible_bugs_pop_4",
        "bugs-pop-5": "bible_bugs_pop_5",
        "bugs-correct": "bible_bugs_correct",
        "bugs-incorrect": "bible_bugs_incorrect",
        "bugs-streak": "bible_bugs_streak",
        "bugs-bonus-start": "bible_bugs_bonus_start",
        "bugs-bonus-end": "bible_bugs_bonus_end",
        "bugs-stink-bug": "bible_bugs_stink_bug"
    ]
    // N6d: Food Slice fixed packaged MP3s. No caller-chosen filenames/URLs.
    private let foodSliceSoundResources: [String: String] = [
        "slice-bomb": "food_slice_bomb",
        "slice-wrong": "food_slice_wrong",
        "slice-cut-1": "food_slice_slice_1",
        "slice-cut-2": "food_slice_slice_2",
        "slice-cut-3": "food_slice_slice_3",
        "slice-cut-4": "food_slice_slice_4",
        "slice-cut-5": "food_slice_slice_5",
        "slice-swoosh-1": "food_slice_swoosh_1",
        "slice-swoosh-2": "food_slice_swoosh_2",
        "slice-swoosh-3": "food_slice_swoosh_3"
    ]
    // N6e fixed Verse Splat MP3 bank: ONLY shipped filenames, not JS paths.
    private let verseSplatSoundResources: [String: String] = [
        "splat-pop-1": "verse_splat_pop_1",
        "splat-pop-2": "verse_splat_pop_2",
        "splat-pop-3": "verse_splat_pop_3",
        "splat-pop-4": "verse_splat_pop_4",
        "splat-pop-5": "verse_splat_pop_5",
        "splat-correct-1": "verse_splat_correct_1",
        "splat-correct-2": "verse_splat_correct_2",
        "splat-correct-3": "verse_splat_correct_3",
        "splat-wrong": "verse_splat_wrong",
        "splat-streak": "verse_splat_streak",
        "splat-paint-score": "verse_splat_paint_score",
        "splat-start": "verse_splat_start",
        "splat-positive": "verse_splat_positive"
    ]
    // N6f Dino Dash: eight fixed, bundled game MP3 effects.
    // Same .soloAmbient session and serialized AVAudioEngine PCM worker.
    private let dinoDashSoundResources: [String: String] = [
        "dino-collision": "dino_dash_collision",
        "dino-correct": "dino_dash_correct",
        "dino-fall": "dino_dash_fall",
        "dino-finish": "dino_dash_finish",
        "dino-jump": "dino_dash_jump",
        "dino-jump2": "dino_dash_jump_2",
        "dino-streak": "dino_dash_streak",
        "dino-wrong": "dino_dash_wrong"
    ]
    // N6g Verse Invaders: 13 exact packaged MP3s; aliases share one PCM.
    private let verseInvadersSoundResources: [String: String] = [
        "inv-launch": "verse_invaders_launch",
        "inv-correct": "verse_invaders_correct",
        "inv-wrong": "verse_invaders_wrong",
        "inv-abduction": "verse_invaders_abduction",
        "inv-streak": "verse_invaders_streak",
        "inv-bonus-start": "verse_invaders_bonus_start",
        "inv-pop-1": "verse_invaders_pop_1",
        "inv-pop-2": "verse_invaders_pop_2",
        "inv-pop-3": "verse_invaders_pop_3",
        "inv-pop-4": "verse_invaders_pop_4",
        "inv-pop-5": "verse_invaders_pop_5",
        "inv-bonus-penalty": "verse_invaders_wrong_2",
        "inv-bonus-reveal": "verse_invaders_bonus_result"
    ]
    // N6h Verse Munch: 13 fixed original MP3 assets + shared UI PCM.
    private let verseMunchSoundResources: [String: String] = [
        "munch-word-tap1": "verse_munch_tap_1",
        "munch-word-tap2": "verse_munch_tap_2",
        "munch-chew1": "verse_munch_chew_1",
        "munch-chew2": "verse_munch_chew_2",
        "munch-chew3": "verse_munch_chew_3",
        "munch-chomp": "verse_munch_chomp",
        "munch-correct": "verse_munch_correct",
        "munch-spew": "verse_munch_spew",
        "munch-dizzy": "verse_munch_dizzy",
        "munch-streak": "verse_munch_streak",
        "munch-bonus-start": "verse_munch_bonus_start",
        "munch-bonus-result": "verse_munch_bonus_result",
        "munch-wrong-fruit": "verse_munch_wrong_fruit"
    ]
    // N6i: eleven shipped Versey Bird effects, never dynamic paths or URLs.
    private let verseyBirdSoundResources: [String: String] = [
        "bird-flap-1": "versey_bird_flap_1",
        "bird-flap-2": "versey_bird_flap_2",
        "bird-flap-3": "versey_bird_flap_3",
        "bird-flap-4": "versey_bird_flap_4",
        "bird-boulder": "versey_bird_boulder",
        "bird-correct": "versey_bird_correct",
        "bird-pipe-cleared": "versey_bird_pipe_cleared",
        "bird-pipe-crash": "versey_bird_pipe_crash",
        "bird-streak": "versey_bird_streak",
        "bird-wrong": "versey_bird_wrong",
        "bird-bee-hit": "versey_bird_bee_hit"
    ]
    // N6j: fixed Tower of Bible effects (the unused place.mp3 stays unused).
    // Correct/wrong cues are synthesized once on the existing PCM worker.
    private let towerBibleSoundResources: [String: String] = [
        "tower-brick-land": "tower_bible_land",
        "tower-warning": "tower_bible_warning_1",
        "tower-danger-warning": "tower_bible_warning_2",
        "tower-collapse": "tower_bible_collapse",
        "tower-brick-break": "tower_bible_break",
        "tower-streak": "tower_bible_success"
    ]
    private let towerWordToneIDs: Set<String> = [
        "tower-correct-word", "tower-wrong-word"
    ]
    // N6k Verse Launch: eight actual gameplay MP3 clips. WordAdded and
    // starCollected share the same shipped collect clip/one fixed PCM ID.
    private let verseLaunchSoundResources: [String: String] = [
        "launch-correct": "verse_launch_zoom",
        "launch-wrong": "verse_launch_wrong",
        "launch-collect": "verse_launch_collect",
        "launch-explode": "verse_launch_explode",
        "launch-hit": "verse_launch_explode_2",
        "launch-land": "verse_launch_land",
        "launch-launch": "verse_launch_launch",
        "launch-enter": "verse_launch_launch_2"
    ]
    // Four exact, non-parametric sine/triangle recipes for native preflight.
    private let verseLaunchToneIDs: Set<String> = [
        "launch-countdown-low", "launch-countdown-high",
        "launch-projectile-tick", "launch-projectile-tock"
    ]
    // N6l: 1 exact packaged zoom file; all thirteen fixed Web-style
    // tones/truck tunes/8 unique bonus streak pairs are prebuilt native PCM.
    private let trafficTapSoundResources: [String: String] = [
        "traffic-zoom": "sound_zoom"
    ]
    private let trafficTapToneIDs: Set<String> = [
        "traffic-correct",
        "traffic-wrong",
        "traffic-truck-intro",
        "traffic-truck-outro",
        "traffic-rainbow",
        "traffic-bonus-1",
        "traffic-bonus-2",
        "traffic-bonus-3",
        "traffic-bonus-4",
        "traffic-bonus-5",
        "traffic-bonus-6",
        "traffic-bonus-7",
        "traffic-bonus-8"
    ]
    // N6m: final standalone Verse Scramble. Its source-selected correct
    // melody uses 8 distinct MIDI pitches across 1..10-letter words.
    // All pitch IDs and 8 other sound recipes are fixed; never accept
    // dynamic frequencies, Web output or additional AVAudioSession owners.
    private let scramblePitchMIDIs: Set<Int> = [60, 62, 64, 65, 67, 69, 71, 72]
    private let scrambleToneIDs: Set<String> = [
        "scramble-note-60",
        "scramble-note-62",
        "scramble-note-64",
        "scramble-note-65",
        "scramble-note-67",
        "scramble-note-69",
        "scramble-note-71",
        "scramble-note-72",
        "scramble-wrong-letter",
        "scramble-word-complete",
        "scramble-letters-fall",
        "scramble-message-pop",
        "scramble-bonus-start",
        "scramble-bonus-you-win",
        "scramble-bonus-iwin",
        "scramble-bonus-final"
    ]
    // N6n: Verse Typer, first Playground migration. Nine source-selected
    // correct MIDI notes (including the Mega pillar's MIDI 55), and eight
    // fixed generated effect recipes. No dynamic caller pitches or paths.
    private let typerNoteMIDIs: Set<Int> = [55, 60, 62, 64, 65, 67, 69, 71, 72]
    private let typerToneIDs: Set<String> = [
        "typer-note-55",
        "typer-note-60",
        "typer-note-62",
        "typer-note-64",
        "typer-note-65",
        "typer-note-67",
        "typer-note-69",
        "typer-note-71",
        "typer-note-72",
        "typer-wrong",
        "typer-word-done",
        "typer-popup",
        "typer-cocoon",
        "typer-flap0",
        "typer-flap1",
        "typer-flap2",
        "typer-fly-away"
    ]
    // N6o: Scripture Scrub original packaged effects; unused peel.mp3 is
    // intentionally excluded because the game never references it.
    private let scrubSoundResources: [String: String] = [
        "scrub-bite1": "scripture_scrub_bite_1",
        "scrub-bite2": "scripture_scrub_bite_2",
        "scrub-bite3": "scripture_scrub_bite_3",
        "scrub-chalk": "scripture_scrub_chalk",
        "scrub-complete": "scripture_scrub_complete",
        "scrub-dig": "scripture_scrub_dig",
        "scrub-glow": "scripture_scrub_glow",
        "scrub-leaves": "scripture_scrub_leaves",
        "scrub-mower": "scripture_scrub_mower",
        "scrub-pop1": "scripture_scrub_pop_1",
        "scrub-pop2": "scripture_scrub_pop_2",
        "scrub-pop3": "scripture_scrub_pop_3",
        "scrub-pop4": "scripture_scrub_pop_4",
        "scrub-pop5": "scripture_scrub_pop_5",
        "scrub-rainbow": "scripture_scrub_rainbow",
        "scrub-splat": "scripture_scrub_splat",
        "scrub-squeak": "scripture_scrub_squeak",
        "scrub-popup": "scripture_scrub_popup"
    ]
    // The original 2%-increment melody repeats seven source frequencies.
    // These are seven fixed (not 49 arbitrary) 75ms PCM tones plus the
    // four-note completion fanfare.
    private let scrubProgressFrequencies: [String: Double] = [
        "scrub-progress-g3": 196,
        "scrub-progress-c4": 261.63,
        "scrub-progress-d4": 293.66,
        "scrub-progress-e4": 329.63,
        "scrub-progress-f4": 349.23,
        "scrub-progress-g4": 392,
        "scrub-progress-a4": 440
    ]
    private let scrubToneIDs: Set<String> = [
        "scrub-progress-g3",
        "scrub-progress-c4",
        "scrub-progress-d4",
        "scrub-progress-e4",
        "scrub-progress-f4",
        "scrub-progress-g4",
        "scrub-progress-a4",
        "scrub-completion-arpeggio"
    ]
    // N6p Wheel of Bible: ALL 36 exact source tone recipes for spin,
    // keyword challenge, cash, prizes, bad, hint and fireworks. The JS
    // caller selects a fixed preset ID (midi,duration,gain,waveform)
    // instead of constructing any oscillator or passing arbitrary Hz.
    private let wheelToneRecipes: [String: (Int, Int, Int, String)] = [
        "wheel-note-50-45-120-q": (50, 45, 120, "q"),
        "wheel-note-53-45-120-q": (53, 45, 120, "q"),
        "wheel-note-56-45-120-q": (56, 45, 120, "q"),
        "wheel-note-67-100-240-t": (67, 100, 240, "t"),
        "wheel-note-71-100-240-t": (71, 100, 240, "t"),
        "wheel-note-75-100-240-t": (75, 100, 240, "t"),
        "wheel-note-72-100-280-t": (72, 100, 280, "t"),
        "wheel-note-79-140-220-t": (79, 140, 220, "t"),
        "wheel-note-60-130-480-t": (60, 130, 480, "t"),
        "wheel-note-62-130-480-t": (62, 130, 480, "t"),
        "wheel-note-64-130-480-t": (64, 130, 480, "t"),
        "wheel-note-65-130-480-t": (65, 130, 480, "t"),
        "wheel-note-67-130-480-t": (67, 130, 480, "t"),
        "wheel-note-69-130-480-t": (69, 130, 480, "t"),
        "wheel-note-71-130-480-t": (71, 130, 480, "t"),
        "wheel-note-72-130-480-t": (72, 130, 480, "t"),
        "wheel-note-43-130-320-s": (43, 130, 320, "s"),
        "wheel-note-38-120-240-s": (38, 120, 240, "s"),
        "wheel-note-64-80-180-t": (64, 80, 180, "t"),
        "wheel-note-66-80-180-t": (66, 80, 180, "t"),
        "wheel-note-68-80-180-t": (68, 80, 180, "t"),
        "wheel-note-70-80-180-t": (70, 80, 180, "t"),
        "wheel-note-72-80-180-t": (72, 80, 180, "t"),
        "wheel-note-72-100-250-t": (72, 100, 250, "t"),
        "wheel-note-76-100-240-t": (76, 100, 240, "t"),
        "wheel-note-84-180-280-t": (84, 180, 280, "t"),
        "wheel-note-67-80-180-t": (67, 80, 180, "t"),
        "wheel-note-72-90-180-t": (72, 90, 180, "t"),
        "wheel-note-76-120-160-t": (76, 120, 160, "t"),
        "wheel-note-72-35-70-t": (72, 35, 70, "t"),
        "wheel-note-73-35-70-t": (73, 35, 70, "t"),
        "wheel-note-74-35-70-t": (74, 35, 70, "t"),
        "wheel-note-75-35-70-t": (75, 35, 70, "t"),
        "wheel-note-76-35-70-t": (76, 35, 70, "t"),
        "wheel-note-77-35-70-t": (77, 35, 70, "t"),
        "wheel-note-78-35-70-t": (78, 35, 70, "t")
    ]
    private lazy var wheelToneIDs: Set<String> =
        Set(wheelToneRecipes.keys)

    // N6q finite original Verse Jam note/bpm inventory. Prepared once on
    // the serial AVAudioEngine worker; the hot path selects a fixed buffer.
    private lazy var jamNoteRecipes: [String: (Int, Int, String)] = {
        var recipes: [String: (Int, Int, String)] = [:]
        func add(_ midi: Int, _ ms: Int, _ wave: String) {
            recipes["\(midi)-\(ms)-\(wave)"] = (midi, ms, wave)
        }
        for midi in [60,62,64,67,69,72,74,76,79,81,84] {
            for wave in ["t", "q"] { add(midi,220,wave) }
            add(midi,120,"t")
            add(midi,110,"q")
            add(midi,160,"t")
        }
        let extras: [(Int,Int,String)] = [
            (72,55,"q"),(84,45,"q"),(79,75,"q"),(84,85,"q"),
            (43,160,"s"),(38,130,"s"),(60,80,"t"),
            (60,120,"q"),(64,120,"q"),(67,120,"q"),
            (72,110,"q"),(76,120,"q"),(79,140,"q"),
            (84,120,"q"),(88,130,"q"),(91,150,"q"),
            (67,150,"q"),(69,150,"q"),(67,220,"q"),
            (64,150,"q"),(62,150,"q"),(60,360,"t"),
            (48,1300,"t"),(52,1220,"t"),(55,1160,"t"),(60,1100,"t"),
            (60,420,"t"),(67,420,"t"),(72,460,"t"),
            (76,160,"q"),(79,180,"q"),(84,160,"t"),
            (72,140,"q"),(76,140,"q"),(79,200,"q"),
            (67,160,"t"),(72,160,"q"),(79,220,"q"),
            (84,140,"t"),(60,160,"q"),(64,160,"q"),
            (67,180,"q"),(72,220,"q"),(76,240,"t"),
            (79,280,"t"),(84,420,"t"),(91,180,"t"),
            (72,120,"q"),(76,130,"q"),(79,180,"t")
        ]
        for (midi, ms, wave) in extras { add(midi,ms,wave) }
        return recipes
    }()
    private let jamBPMs: [Int] = [92,100,104,108,112,120,128]
    private let jamPadBeats: [Int] = [4,8,12,16]
    private let jamVoices = ["boom","hey","woo","yeah","yo"]
    private let jamDrums = ["kick","snare","hat","extra"]
    private lazy var jamIDs: Set<String> = {
        Set(["jam-note","jam-pad"] +
            jamDrums.map { "jam-drum-" + $0 } +
            jamVoices.map { "jam-voice-" + $0 })
    }()
    private lazy var jamVoiceResources: [String:String] = {
        Dictionary(uniqueKeysWithValues: jamVoices.map {
            ("jam-voice-" + $0,"verse_jam_voice_" + $0)
        })
    }()
    // N6r: Ghost Writer's five source-used spooky recordings only.
    // Six dormant ghost_writer_scribble_*.mp3 files are deliberately excluded.
    private let ghostWriterSoundResources: [String: String] = [
        "ghost-spooky-1": "ghost_writer_spooky_1",
        "ghost-spooky-2": "ghost_writer_spooky_2",
        "ghost-spooky-3": "ghost_writer_spooky_3",
        "ghost-spooky-4": "ghost_writer_spooky_4",
        "ghost-spooky-5": "ghost_writer_spooky_5"
    ]
    // Worker owns all players, PCM effect buffers, AVAudioPlayerNodes and
    // AVAudioEngine. Swift main queue owns AVAudioSession/session history only.
    // PCM decode + engine startup occur on an explicit Got It!/Resume/DEV
    // preload, NEVER on the hot collision-to-sound path.
    private let playbackQueue = DispatchQueue(
        label: "biblozoo.native-output.player", qos: .userInitiated
    )
    private let playbackEpochLock = NSLock()
    private var playbackEpoch = 0
    private var players: [String: AVAudioPlayer] = [:] // pilot-unlock only
    // N5b.1: long-form narration is an independent AVAudioPlayer, not a
    // short PCM effect. Exactly one fixed local DEV clip is permitted here;
    // no arbitrary URLs, paths or client-supplied verse IDs. Later N5b
    // slices will review a bundled verse manifest before wiring Learn.
    private let narrationSoundID = "learn-john-3-16"
    private let narrationResourceName = "john_3_16"
    // N5b.2: the Capacitor public folder is already an Xcode folder resource
    // and contains the production verse_audio and verse_data directories.
    // The on-device published manifest is the authority, never JS paths.
    private lazy var publishedLearnVerseIDs: Set<String> = {
        guard let url = Bundle.main.url(
            forResource: "verse_list", withExtension: "json",
            subdirectory: "public/verse_data"),
              let data = try? Data(contentsOf: url),
              let ids = try? JSONDecoder().decode([String].self, from: data)
        else { return [] }
        return Set(ids.filter {
            $0.count <= 80 &&
            $0.range(
                of: "^[0-9a-z]+(?:_[0-9a-z]+)*$",
                options: .regularExpression
            ) != nil
        })
    }()
    private var narrationCurrentSoundID: String?
    private var narrationPlayer: AVAudioPlayer? // main thread only
    private var narrationRequestId: Int? // opaque local ID, never a verse/profile
    private var narrationCompleted = false
    // Only these two fixed IDs use predecoded buffers. Unchanged native
    // AVAudioPlayer pet-unlock is a useful DEV A/B reference for latency.
    private let pcmEffectIDs: Set<String> = [
        "feed-star", "feed-chomp", "ui-pop-1", "ui-pop-2",
        "daily-question-correct", "daily-question-incorrect",
        "snake-correct", "snake-wrong", "snake-fruit", "snake-boost",
        "snake-bonus-start", "snake-eat", "snake-bonus-result",
        "bugs-tongue", "bugs-pop-1", "bugs-pop-2", "bugs-pop-3",
        "bugs-pop-4", "bugs-pop-5", "bugs-correct", "bugs-incorrect",
        "bugs-streak", "bugs-bonus-start", "bugs-bonus-end",
        "bugs-stink-bug",
        "slice-bomb", "slice-wrong",
        "slice-cut-1", "slice-cut-2", "slice-cut-3",
        "slice-cut-4", "slice-cut-5",
        "slice-swoosh-1", "slice-swoosh-2", "slice-swoosh-3",
        "splat-pop-1", "splat-pop-2", "splat-pop-3",
        "splat-pop-4", "splat-pop-5",
        "splat-correct-1", "splat-correct-2", "splat-correct-3",
        "splat-wrong", "splat-streak", "splat-paint-score",
        "splat-start", "splat-positive",
        "dino-collision", "dino-correct", "dino-fall", "dino-finish",
        "dino-jump", "dino-jump2", "dino-streak", "dino-wrong",
        "inv-launch", "inv-correct", "inv-wrong", "inv-abduction",
        "inv-streak", "inv-bonus-start",
        "inv-pop-1", "inv-pop-2", "inv-pop-3", "inv-pop-4", "inv-pop-5",
        "inv-bonus-penalty", "inv-bonus-reveal",
        "munch-word-tap1", "munch-word-tap2",
        "munch-chew1", "munch-chew2", "munch-chew3",
        "munch-chomp", "munch-correct", "munch-spew",
        "munch-dizzy", "munch-streak", "munch-bonus-start",
        "munch-bonus-result", "munch-wrong-fruit",
        "bird-flap-1", "bird-flap-2", "bird-flap-3", "bird-flap-4",
        "bird-boulder", "bird-correct", "bird-pipe-cleared",
        "bird-pipe-crash", "bird-streak", "bird-wrong", "bird-bee-hit",
        "tower-brick-land", "tower-warning", "tower-danger-warning",
        "tower-collapse", "tower-brick-break", "tower-streak",
        "tower-correct-word", "tower-wrong-word",
        "launch-correct", "launch-wrong", "launch-collect",
        "launch-explode", "launch-hit", "launch-land",
        "launch-launch", "launch-enter",
        "launch-countdown-low", "launch-countdown-high",
        "launch-projectile-tick", "launch-projectile-tock",
        "traffic-zoom",
        "traffic-correct",
        "traffic-wrong",
        "traffic-truck-intro",
        "traffic-truck-outro",
        "traffic-rainbow",
        "traffic-bonus-1",
        "traffic-bonus-2",
        "traffic-bonus-3",
        "traffic-bonus-4",
        "traffic-bonus-5",
        "traffic-bonus-6",
        "traffic-bonus-7",
        "traffic-bonus-8",
        "scramble-note-60",
        "scramble-note-62",
        "scramble-note-64",
        "scramble-note-65",
        "scramble-note-67",
        "scramble-note-69",
        "scramble-note-71",
        "scramble-note-72",
        "scramble-wrong-letter",
        "scramble-word-complete",
        "scramble-letters-fall",
        "scramble-message-pop",
        "scramble-bonus-start",
        "scramble-bonus-you-win",
        "scramble-bonus-iwin",
        "scramble-bonus-final",
        "typer-note-55",
        "typer-note-60",
        "typer-note-62",
        "typer-note-64",
        "typer-note-65",
        "typer-note-67",
        "typer-note-69",
        "typer-note-71",
        "typer-note-72",
        "typer-wrong",
        "typer-word-done",
        "typer-popup",
        "typer-cocoon",
        "typer-flap0",
        "typer-flap1",
        "typer-flap2",
        "typer-fly-away",
        "scrub-bite1",
        "scrub-bite2",
        "scrub-bite3",
        "scrub-chalk",
        "scrub-complete",
        "scrub-dig",
        "scrub-glow",
        "scrub-leaves",
        "scrub-mower",
        "scrub-pop1",
        "scrub-pop2",
        "scrub-pop3",
        "scrub-pop4",
        "scrub-pop5",
        "scrub-rainbow",
        "scrub-splat",
        "scrub-squeak",
        "scrub-popup",
        "scrub-progress-g3",
        "scrub-progress-c4",
        "scrub-progress-d4",
        "scrub-progress-e4",
        "scrub-progress-f4",
        "scrub-progress-g4",
        "scrub-progress-a4",
        "scrub-completion-arpeggio",
        "wheel-note-50-45-120-q",
        "wheel-note-53-45-120-q",
        "wheel-note-56-45-120-q",
        "wheel-note-67-100-240-t",
        "wheel-note-71-100-240-t",
        "wheel-note-75-100-240-t",
        "wheel-note-72-100-280-t",
        "wheel-note-79-140-220-t",
        "wheel-note-60-130-480-t",
        "wheel-note-62-130-480-t",
        "wheel-note-64-130-480-t",
        "wheel-note-65-130-480-t",
        "wheel-note-67-130-480-t",
        "wheel-note-69-130-480-t",
        "wheel-note-71-130-480-t",
        "wheel-note-72-130-480-t",
        "wheel-note-43-130-320-s",
        "wheel-note-38-120-240-s",
        "wheel-note-64-80-180-t",
        "wheel-note-66-80-180-t",
        "wheel-note-68-80-180-t",
        "wheel-note-70-80-180-t",
        "wheel-note-72-80-180-t",
        "wheel-note-72-100-250-t",
        "wheel-note-76-100-240-t",
        "wheel-note-84-180-280-t",
        "wheel-note-67-80-180-t",
        "wheel-note-72-90-180-t",
        "wheel-note-76-120-160-t",
        "wheel-note-72-35-70-t",
        "wheel-note-73-35-70-t",
        "wheel-note-74-35-70-t",
        "wheel-note-75-35-70-t",
        "wheel-note-76-35-70-t",
        "wheel-note-77-35-70-t",
        "wheel-note-78-35-70-t",
        "jam-note", "jam-pad", "jam-drum-kick", "jam-drum-snare",
        "jam-drum-hat", "jam-drum-extra", "jam-voice-boom",
        "jam-voice-hey", "jam-voice-woo", "jam-voice-yeah", "jam-voice-yo",
        "ghost-spooky-1", "ghost-spooky-2", "ghost-spooky-3",
        "ghost-spooky-4", "ghost-spooky-5"
    ]
    private let nativeSnakeOrbSoundID = "snake-orb"
    private let snakeOrbMidiNotes: [Int] = [72, 74, 76, 79, 81, 84]
    private let snakeOrbVoiceLimit = 4
    private let nativePegSoundID = "feed-peg"
    private let nativeMelodySoundID = "feed-melody"
    // All current Melody tune MIDI notes fall in this bounded 55...83 bank.
    private let melodyMidiRange = 55...83
    private let melodyVoiceLimit = 6
    // Matches Classic's existing six-note Web oscillator scale. Never pass
    // raw frequencies/oscillator parameters through the Capacitor bridge.
    private let pegFrequencies: [Double] = [
        523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98
    ]
    private let sampleVoiceLimit = 2
    private let pegVoiceLimit = 4
    private var effectsEngine: AVAudioEngine? // playbackQueue only
    private var effectBuffers: [String: AVAudioPCMBuffer] = [:] // worker only
    private var pegToneBuffers: [Int: AVAudioPCMBuffer] = [:] // worker only
    private var melodyToneBuffers: [Int: AVAudioPCMBuffer] = [:] // worker only
    private var snakeOrbToneBuffers: [Int: AVAudioPCMBuffer] = [:] // worker only
    private var jamNoteBuffers: [String: AVAudioPCMBuffer] = [:] // worker only
    private var jamPadBuffers: [String: AVAudioPCMBuffer] = [:] // worker only
    private var effectNodes: [String: [AVAudioPlayerNode]] = [:] // worker only
    private var nextEffectVoice: [String: Int] = [:] // worker only
    private let maximumEffectFrames: AVAudioFramePosition = 1_500_000
    // First cold launch now activates the session on the user's actual
    // Got It!/Resume/DEV tap instead of assuming "no interruption" means
    // an output session was already accepted by iOS.
    private var hasGestureActivatedSession = false
    private let maxPreflightEvents = 18
    private var preflightEvents: [[String: Any]] = []
    private var lastNativeBackend = "none"
    private var lastNativePrepareMs = -1
    private var lastNativePlayQueueMs = -1
    private var lastNativePlayCallMs = -1
    private var lastNativePlayedSoundId = "none"
    // Bounded in-memory diagnostics. No pet/profile/verse, media audio,
    // permissions, device identifiers or route names. Main thread only.
    private let maxSoundTimingEvents = 80
    private var soundTimingEvents: [[String: Any]] = []
    private var timingEventSequence = 0
    private var lateChompMarks = 0
    // Only a confirmed, current .began event blocks a fresh tap. iOS can
    // deliver delayed "wasSuspended" .began events on resume; those are
    // historical and must not latch the pilot into a permanent error.
    private var interrupted = false
    // An OS .ended clears "pending" but does NOT reactivate the nonmixable
    // .soloAmbient session. A new real user gesture must call setActive(true).
    // PiP can interrupt us while UIApplication remains .active.
    private var needsGestureAfterInterruption = false
    private var leftForegroundDuringInterruption = false
    private var returnedToForegroundDuringInterruption = false
    private var lastInterruptionSignal = "none"
    private var interruptionEventCount = 0
    private var beganEventCount = 0
    private var endedEventCount = 0
    private var suspendedEventCount = 0
    private var routeEventCount = 0
    private var lastInterruptionAt: Date?
    private var lastInterruptionReasonCode = -1
    private var lastInterruptionRawType = -1
    // Single authoritative native-output session state in this app. The older
    // Web-clock recovery bridge remains registered for compatibility but is
    // disabled in the .audiotest bundle; read-only diagnostics may also observe.
    private let createdAt = Date()
    private let maxTraceEvents = 28
    private var eventSequence = 0
    private var eventTrace: [[String: Any]] = []
    private var foregroundEpoch = 0
    private var wasOutsideForeground = false
    private var mediaResetCount = 0
    private var needsGestureAfterReset = false
    private var lastRouteReasonCode = -1
    private let minimumActivationInterval: TimeInterval = 4
    private let maximumActivationAttemptsPerForeground = 2
    private var lastActivationAt: Date?
    private var activationAttemptsThisForeground = 0
    private var activationAttemptsTotal = 0
    private var lastActivationResult = "none"
    private var observers: [NSObjectProtocol] = []

    public override func load() {
        super.load()
        let center = NotificationCenter.default
        // Stop immediately when leaving the foreground, never queue old
        // effects to resume after a task switch, phone call or route change.
        observers.append(center.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in self?.leftForeground() })
        observers.append(center.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.leftForeground()
            // Count at most two OS reactivation attempts between backgrounds.
            self?.activationAttemptsThisForeground = 0
            self?.lastActivationAt = nil
            self?.appendTrace("app-background")
        })
        observers.append(center.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in self?.returnedToForeground() })
        observers.append(center.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in self?.handleInterruption(note) })
        observers.append(center.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in
            guard let self = self else { return }
            self.routeEventCount += 1
            self.lastRouteReasonCode =
                (note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? NSNumber)?.intValue ?? -1
            self.forgetPlayback()
            self.appendTrace("route-changed")
        })
        observers.append(center.addObserver(
            forName: AVAudioSession.mediaServicesWereLostNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.forgetPlayback()
            self?.appendTrace("media-services-lost")
        })
        observers.append(center.addObserver(
            forName: AVAudioSession.mediaServicesWereResetNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            self.forgetPlayback()
            self.mediaResetCount += 1
            self.needsGestureAfterReset = true
            self.appendTrace("media-services-reset")
        })
        appendTrace("plugin-loaded")
    }

    deinit {
        for token in observers { NotificationCenter.default.removeObserver(token) }
    }

    // Fixed-schema in-memory trace. The only fields are event code, monotonic
    // sequence, elapsed time, public app lifecycle and numeric session codes.
    // Never include verse text, pet names, microphone data or device IDs.
    private func appendTrace(_ kind: String) {
        eventSequence += 1
        let appState: String
        switch UIApplication.shared.applicationState {
        case .active: appState = "active"
        case .inactive: appState = "inactive"
        case .background: appState = "background"
        @unknown default: appState = "unknown"
        }
        eventTrace.append([
            "seq": eventSequence,
            "kind": kind,
            "elapsedMs": max(0, Int(Date().timeIntervalSince(createdAt) * 1000)),
            "appState": appState,
            "foregroundEpoch": foregroundEpoch,
            "pending": interrupted,
            "reasonCode": lastInterruptionReasonCode
        ])
        if eventTrace.count > maxTraceEvents {
            eventTrace.removeFirst(eventTrace.count - maxTraceEvents)
        }
    }

    // Lifecycle callbacks immediately invalidate old queued effects. Work
    // already in flight is stopped by the serial worker, with no auto-replay.
    private func playbackEpochSnapshot() -> Int {
        playbackEpochLock.lock()
        defer { playbackEpochLock.unlock() }
        return playbackEpoch
    }

    private func isCurrentPlaybackEpoch(_ token: Int) -> Bool {
        playbackEpochLock.lock()
        defer { playbackEpochLock.unlock() }
        return playbackEpoch == token
    }

    // Cross-bridge wall-clock times are approximate: JavaScript Date.now()
    // and Swift Date share the device clock but may be affected by clock
    // adjustments. Invalid/skewed values are reported as -1, not a real
    // playback delay. Worker queue and play call time use monotonic uptime.
    private func safeAgeMs(_ newer: Double, _ older: Double?) -> Int {
        guard let older = older, older.isFinite, older > 0,
              newer.isFinite else { return -1 }
        let delta = newer - older
        return delta >= 0 && delta <= 60000 ? Int(delta) : -1
    }

    private func optionalEpochMs(_ call: CAPPluginCall, key: String) -> Double? {
        guard let value = call.getDouble(key), value.isFinite,
              value > 1_500_000_000_000, value < 4_000_000_000_000 else { return nil }
        return value
    }

    private func timingId(_ call: CAPPluginCall) -> String {
        guard let value = call.getString("eventId"),
              value.range(of: #"^(?:feed|dev)-[0-9]{1,10}$"#,
                          options: .regularExpression) != nil else {
            return "unlabeled"
        }
        return value
    }

    private func recordSoundTiming(_ event: [String: Any]) {
        timingEventSequence += 1
        var row = event
        row["seq"] = timingEventSequence
        row["markedLate"] = false
        // Internal only, for "Mark recent chomp late" within 60 seconds.
        row["recordedAtUptime"] = ProcessInfo.processInfo.systemUptime
        soundTimingEvents.append(row)
        if soundTimingEvents.count > maxSoundTimingEvents {
            soundTimingEvents.removeFirst(soundTimingEvents.count - maxSoundTimingEvents)
        }
    }


    // Bounded, fixed-schema, main-thread-only diagnostic history. Each item
    // comes from an actual native call resolution, with a validated sound ID
    // and a code-defined result. No verse/profile/mic/device content, no
    // disk/network upload and no audio operation from a debug read.
    private func resolvePreflight(_ call: CAPPluginCall,
                                  _ response: [String: Any],
                                  phase: String, soundId: String) {
        let outcome = response["reason"] as? String ?? "unknown"
        let duration = response["prepareMs"] as? Int ?? -1
        preflightEvents.append([
            "phase": phase, "soundId": soundId, "result": outcome,
            "success": (response["ready"] as? Bool == true) ||
                       (response["prepared"] as? Bool == true),
            "prepareMs": duration,
            "foregroundEpoch": foregroundEpoch,
            "pending": interrupted,
            "active": UIApplication.shared.applicationState == .active
        ])
        if preflightEvents.count > maxPreflightEvents {
            preflightEvents.removeFirst(preflightEvents.count - maxPreflightEvents)
        }
        call.resolve(response)
    }

    private func timingReportText() -> String {
        let appState = UIApplication.shared.applicationState == .active
            ? "active" : "not-active"
        var lines = [
            "BibloZoo Audio Test | N2.2 Native Timing Report",
            "Manually copied from DEV panel; no automatic upload.",
            "App state: \(appState); interruption pending: \(interrupted); " +
                "foreground epoch: \(foregroundEpoch); late chomp marks: \(lateChompMarks)",
            "Rows: \(soundTimingEvents.count) of max \(maxSoundTimingEvents) " +
                "(oldest first). -1 = unavailable/clock skew.",
            "Collision/JS/bridge deltas use device wall time; queue/play use monotonic uptime.",
            "Native dispatch = predecoded PCM scheduleBuffer() for star/chomp, " +
                "AVAudioPlayer.play() for pilot. NOT proof of speaker audibility.",
            "seq | event | sound | result | collision->JS | JS->bridge | " +
                "bridge->worker | worker call | collision->native dispatch | " +
                "marked late | backend"
        ]
        var slow = 0
        for row in soundTimingEvents {
            func number(_ key: String) -> Int { row[key] as? Int ?? -1 }
            func word(_ key: String) -> String { row[key] as? String ?? "unknown" }
            let latency = number("collisionToNativeDispatchMs")
            if latency >= 120 { slow += 1 }
            lines.append([
                String(number("seq")),
                word("eventId"),
                word("soundId"),
                word("result"),
                String(number("collisionToRequestMs")),
                String(number("bridgeMs")),
                String(number("queueMs")),
                String(number("playCallMs")),
                String(latency),
                (row["markedLate"] as? Bool == true) ? "YES" : "no",
                word("backend")
            ].joined(separator: " | "))
        }
        lines.insert("Native dispatch >=120 ms: \(slow) records (diagnostic threshold, " +
                     "not an audible-delay verdict).", at: 4)
        lines.append("")
        lines.append("Native first-tap preflight: \(preflightEvents.count) " +
                     "of max \(maxPreflightEvents) (oldest first).")
        lines.append("First gesture OS activation accepted: " +
                     (hasGestureActivatedSession ? "yes" : "no"))
        lines.append("phase | sound | result | accepted | prepareMs | " +
                     "foregroundEpoch | pending | appActive")
        for row in preflightEvents {
            func textValue(_ key: String) -> String {
                return row[key] as? String ?? "unknown"
            }
            func numberValue(_ key: String) -> Int {
                return row[key] as? Int ?? -1
            }
            func boolValue(_ key: String) -> String {
                return row[key] as? Bool == true ? "yes" : "no"
            }
            lines.append([
                textValue("phase"), textValue("soundId"),
                textValue("result"), boolValue("success"),
                String(numberValue("prepareMs")),
                String(numberValue("foregroundEpoch")),
                boolValue("pending"), boolValue("active")
            ].joined(separator: " | "))
        }
        lines.append("Preflight accepted does NOT prove speaker sound. " +
                     "If silent, copy this report BEFORE restarting the app.")
        return lines.joined(separator: "\n")
    }

    // Copy synchronously on the native main thread *after* the user's actual
    // button tap. WKWebView clipboard permission or lost JS gesture cannot
    // cause a misleading success message. Clipboard stays on the device
    // until the user explicitly pastes it into a chat.
    @objc func copyTimingReport(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["copied": false, "reason": "unavailable"]); return
            }
            guard UIApplication.shared.applicationState == .active else {
                call.resolve(["copied": false, "reason": "not-foreground"]); return
            }
            UIPasteboard.general.string = self.timingReportText()
            call.resolve(["copied": true, "count": self.soundTimingEvents.count,
                          "lateChompMarks": self.lateChompMarks])
        }
    }

    // Optional owner feedback, only if they can conveniently return to the
    // panel within one minute. Marks the newest chomp, never fabricates a
    // measured latency or alters playback. No personal content is stored.
    @objc func markRecentChompLate(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["marked": false, "reason": "unavailable"]); return
            }
            let now = ProcessInfo.processInfo.systemUptime
            guard let index = self.soundTimingEvents.lastIndex(where: {
                ($0["soundId"] as? String) == "feed-chomp"
            }), let stamped = self.soundTimingEvents[index]["recordedAtUptime"] as? Double,
                now - stamped <= 60, now - stamped >= 0 else {
                call.resolve(["marked": false, "reason": "no-recent-chomp"]); return
            }
            if self.soundTimingEvents[index]["markedLate"] as? Bool != true {
                self.soundTimingEvents[index]["markedLate"] = true
                self.lateChompMarks += 1
            }
            call.resolve(["marked": true,
                          "seq": self.soundTimingEvents[index]["seq"] ?? 0])
        }
    }

    // Worker-only graph reset. Never keep an AVAudioEngine or scheduled PCM
    // clip alive after background/interruption/route or media-services reset.
    // A new explicit gesture must preload and warm the engine again.
    private func discardEffectsOnWorker() {
        for nodes in effectNodes.values {
            for node in nodes { node.stop() }
        }
        effectsEngine?.stop()
        effectNodes.removeAll()
        nextEffectVoice.removeAll()
        effectBuffers.removeAll()
        pegToneBuffers.removeAll()
        melodyToneBuffers.removeAll()
        snakeOrbToneBuffers.removeAll()
        jamNoteBuffers.removeAll()
        jamPadBuffers.removeAll()
        effectsEngine = nil
    }


    // N3b: bounded voice pools are constructed and warmed during explicit
    // Got It!/Resume/DEV preflight. All graph/node mutations stay serialized.
    // Collision callbacks only choose a prestarted voice and schedule memory.
    private func preparePCMEffectOnWorker(soundId: String, url: URL)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        if let buffer = effectBuffers[soundId], effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], nodes.count == sampleVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, Int(Double(buffer.frameLength) /
                              buffer.format.sampleRate * 1000), "prepared")
        }
        do {
            let file = try AVAudioFile(forReading: url)
            guard file.length > 0, file.length <= maximumEffectFrames else {
                return (false, 0, "effect-too-large-or-empty")
            }
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: file.processingFormat,
                frameCapacity: AVAudioFrameCount(file.length)) else {
                return (false, 0, "pcm-allocation-failed")
            }
            try file.read(into: buffer)
            guard buffer.frameLength > 0 else { return (false, 0, "pcm-empty") }
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<sampleVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: buffer.format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: buffer.frameLength)
                node.play() // warm, with NO audible buffer scheduled
            }
            effectsEngine = engine
            effectNodes[soundId] = nodes
            nextEffectVoice[soundId] = 0
            effectBuffers[soundId] = buffer
            return (true, Int(Double(buffer.frameLength) /
                              buffer.format.sampleRate * 1000), "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "pcm-decode-or-engine-start-failed")
        }
    }

    // Same sine-note pitches as the original Classic peg oscillator.
    // Generate all SIX envelopes exactly once, before the round begins.
    // 8ms attack, fade by 95ms, silent at 105ms; no Web Audio is ever used.
    private func preparePegTonesOnWorker()
        -> (prepared: Bool, durationMs: Int, reason: String) {
        if pegToneBuffers.count == pegFrequencies.count,
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[nativePegSoundID],
           nodes.count == pegVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, 105, "prepared")
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "tone-format-failed")
        }
        let frames = AVAudioFrameCount(ceil(format.sampleRate * 0.105))
        var buffers: [Int: AVAudioPCMBuffer] = [:]
        for (note, frequency) in pegFrequencies.enumerated() {
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: format, frameCapacity: frames),
                  let samples = buffer.floatChannelData?[0] else {
                return (false, 0, "tone-allocation-failed")
            }
            buffer.frameLength = frames
            for frame in 0..<Int(frames) {
                let t = Double(frame) / format.sampleRate
                // Bounded smooth attack/decay so repeated collisions click
                // less than hard-starting and abruptly cutting a sine.
                let envelope: Double
                if t < 0.008 {
                    envelope = t / 0.008
                } else if t < 0.095 {
                    envelope = (0.095 - t) / (0.095 - 0.008)
                } else {
                    envelope = 0
                }
                samples[frame] = Float(
                    sin(2 * Double.pi * frequency * t) * envelope)
            }
            buffers[note] = buffer
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<pegVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // silent until a real Classic peg collision
            }
            effectsEngine = engine
            effectNodes[nativePegSoundID] = nodes
            nextEffectVoice[nativePegSoundID] = 0
            pegToneBuffers = buffers
            return (true, 105, "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "tone-engine-start-failed")
        }
    }


    // N3d engine groundwork only; real Melody mode routing belongs to N4.
    // Precompute bounded triangle PCM notes under one explicit DEV gesture.
    private func prepareMelodyTonesOnWorker()
        -> (prepared: Bool, durationMs: Int, reason: String) {
        if melodyToneBuffers.count == melodyMidiRange.count,
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[nativeMelodySoundID],
           nodes.count == melodyVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, 220, "prepared")
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "melody-format-failed")
        }
        let frames = AVAudioFrameCount(ceil(format.sampleRate * 0.22))
        var buffers: [Int: AVAudioPCMBuffer] = [:]
        for midi in melodyMidiRange {
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: format, frameCapacity: frames),
                  let samples = buffer.floatChannelData?[0] else {
                return (false, 0, "melody-allocation-failed")
            }
            buffer.frameLength = frames
            let frequency = 440.0 * pow(2.0, Double(midi - 69) / 12.0)
            for frame in 0..<Int(frames) {
                let time = Double(frame) / format.sampleRate
                let phase = (frequency * time)
                    .truncatingRemainder(dividingBy: 1.0)
                let triangle = 1.0 - 4.0 * abs(phase - 0.5)
                // 12ms attack then fade to silence at 220ms, like Web Melody.
                let envelope: Double
                if time < 0.012 {
                    envelope = time / 0.012
                } else {
                    envelope = max(0.0, (0.22 - time) / (0.22 - 0.012))
                }
                samples[frame] = Float(triangle * envelope)
            }
            buffers[midi] = buffer
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<melodyVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // warm silently until a deliberate native note
            }
            effectsEngine = engine
            effectNodes[nativeMelodySoundID] = nodes
            nextEffectVoice[nativeMelodySoundID] = 0
            melodyToneBuffers = buffers
            return (true, 220, "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "melody-engine-start-failed")
        }
    }

    // N6b: precomputed six-note C5–C6 triangle orb bank. No Web Audio
    // oscillator or audio-engine start on a hot gameplay collision.
    private func prepareSnakeOrbTonesOnWorker()
        -> (prepared: Bool, durationMs: Int, reason: String) {
        if snakeOrbToneBuffers.count == snakeOrbMidiNotes.count,
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[nativeSnakeOrbSoundID],
           nodes.count == snakeOrbVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, 180, "prepared")
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "snake-orb-format-failed")
        }
        let frames = AVAudioFrameCount(ceil(format.sampleRate * 0.18))
        var buffers: [Int: AVAudioPCMBuffer] = [:]
        for (index, midi) in snakeOrbMidiNotes.enumerated() {
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: format, frameCapacity: frames),
                  let samples = buffer.floatChannelData?[0] else {
                return (false, 0, "snake-orb-allocation-failed")
            }
            buffer.frameLength = frames
            let frequency = 440.0 * pow(2.0, Double(midi - 69) / 12.0)
            for frame in 0..<Int(frames) {
                let t = Double(frame) / format.sampleRate
                let phase = (frequency * t).truncatingRemainder(dividingBy: 1.0)
                let triangle = 1.0 - 4.0 * abs(phase - 0.5)
                let envelope: Double
                if t < 0.012 {
                    envelope = t / 0.012
                } else {
                    envelope = max(0.0, (0.18 - t) / (0.18 - 0.012))
                }
                samples[frame] = Float(triangle * envelope)
            }
            buffers[index] = buffer
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<snakeOrbVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // no sample is scheduled yet
            }
            effectsEngine = engine
            effectNodes[nativeSnakeOrbSoundID] = nodes
            nextEffectVoice[nativeSnakeOrbSoundID] = 0
            snakeOrbToneBuffers = buffers
            return (true, 180, "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "snake-orb-engine-failed")
        }
    }

    // N6j: immutable Tower of Bible correct/wrong word cues.
    // Browser originals mix four sine notes (C5/E5/G5/C6) for correct and
    // two triangle downward tones for wrong. All waves/envelopes are rendered
    // into bounded native PCM at preflight; no oscillator or engine setup on a
    // brick tap, and the JS bridge cannot send arbitrary frequencies.
    // Original Web sound multipliers 3.40 / 3.60 are baked into samples
    // because native play volume is restricted to 0...1.
    private func prepareTowerWordToneOnWorker(soundId: String)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        guard towerWordToneIDs.contains(soundId) else {
            return (false, 0, "invalid-tower-tone")
        }
        if let buffer = effectBuffers[soundId],
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], nodes.count == sampleVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, Int(Double(buffer.frameLength) /
                              buffer.format.sampleRate * 1000), "prepared")
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "tower-tone-format-failed")
        }
        let correct = soundId == "tower-correct-word"
        // offset (s), duration (s), initial Hz, final Hz, base peak, triangle
        let notes: [(Double, Double, Double, Double, Double, Bool)] = correct
            ? [(0.00, 0.08, 523, 523, 0.07, false),
               (0.07, 0.08, 659, 659, 0.07, false),
               (0.14, 0.12, 784, 784, 0.08, false),
               (0.20, 0.16, 1046, 1046, 0.06, false)]
            : [(0.00, 0.08, 220, 170, 0.10, true),
               (0.07, 0.09, 170, 170, 0.07, true)]
        let length = correct ? 0.46 : 0.27
        let frames = AVAudioFrameCount(ceil(format.sampleRate * length))
        guard let buffer = AVAudioPCMBuffer(
            pcmFormat: format, frameCapacity: frames),
              let samples = buffer.floatChannelData?[0] else {
            return (false, 0, "tower-tone-allocation-failed")
        }
        buffer.frameLength = frames
        let volumeMultiplier = correct ? 3.40 : 3.60
        for frame in 0..<Int(frames) {
            let time = Double(frame) / format.sampleRate
            var mixed = 0.0
            for note in notes {
                let (offset, duration, hz, endingHz, peak, triangle) = note
                let elapsed = time - offset
                if elapsed < 0 || elapsed > duration + 0.10 { continue }
                let attack = 0.005
                let release = 0.06
                let high = peak * volumeMultiplier
                // WebAudio setValueAtTime(.0001) -> exponential attack ->
                // exponential release; phase continues beyond frequency ramp.
                let envelope: Double
                if elapsed < attack {
                    envelope = 0.0001 * pow(high / 0.0001,
                                            elapsed / attack)
                } else if elapsed < duration + release {
                    envelope = high * pow(0.0001 / high,
                        (elapsed - attack) / (duration + release - attack))
                } else {
                    envelope = 0.0001
                }
                let sweep = min(elapsed, duration)
                let ratio = log(endingHz / hz)
                let turns = abs(ratio) < 0.000001
                    ? hz * sweep
                    : hz * duration * (exp(ratio * sweep / duration) - 1) / ratio
                let phase = turns + max(0, elapsed - duration) * endingHz
                let cycle = phase - floor(phase)
                let wave = triangle
                    ? 1.0 - 4.0 * abs(cycle - 0.5)
                    : sin(2.0 * Double.pi * phase)
                mixed += wave * envelope
            }
            samples[frame] = Float(max(-0.95, min(0.95, mixed)))
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<sampleVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // no sound until a child's gameplay effect
            }
            effectsEngine = engine
            effectNodes[soundId] = nodes
            nextEffectVoice[soundId] = 0
            effectBuffers[soundId] = buffer
            return (true, Int(length * 1000), "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "tower-tone-engine-failed")
        }
    }

    // N6k: pre-render a bounded PCM clip per original Verse Launch Web
    // oscillator: C4/C5 160ms beeps, and fast 58ms rising triangle shots.
    // No hot oscillator, extra session, variable frequency or caller path.
    // Original SOUND_TUNING master 0.90 is baked with each authored gain
    // so native play uses volume 1 for these four exact recipes.
    private func prepareVerseLaunchToneOnWorker(soundId: String)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        guard verseLaunchToneIDs.contains(soundId) else {
            return (false, 0, "invalid-launch-tone")
        }
        if let buffer = effectBuffers[soundId],
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], nodes.count == sampleVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, Int(Double(buffer.frameLength) /
                              buffer.format.sampleRate * 1000), "prepared")
        }
        let isProjectile = soundId.hasPrefix("launch-projectile-")
        let isHigh = soundId == "launch-countdown-high"
        let isTock = soundId == "launch-projectile-tock"
        let freqStart: Double = isProjectile
            ? (isTock ? 620.0 : 880.0)
            : (isHigh ? 523.25 : 261.63)
        let freqEnd: Double = isProjectile
            ? (isTock ? 820.0 : 1180.0) : freqStart
        let toneDuration: Double = isProjectile ? 0.058 : 0.18
        let rampDuration: Double = isProjectile ? 0.058 : 0.16
        let attack: Double = isProjectile ? 0.008 : 0.015
        let peak = 0.90 * (isProjectile
            ? (isTock ? 0.085 : 0.12)
            : (isHigh ? 0.52 : 0.92))
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "launch-tone-format-failed")
        }
        let frames = AVAudioFrameCount(ceil(format.sampleRate * toneDuration))
        guard let buffer = AVAudioPCMBuffer(
            pcmFormat: format, frameCapacity: frames),
              let samples = buffer.floatChannelData?[0] else {
            return (false, 0, "launch-tone-allocation-failed")
        }
        buffer.frameLength = frames
        for frame in 0..<Int(frames) {
            let t = Double(frame) / format.sampleRate
            let sustainTime = min(t, rampDuration)
            let ratio = log(freqEnd / freqStart)
            let turns = abs(ratio) < 0.000001
                ? freqStart * sustainTime
                : freqStart * rampDuration *
                    (exp(ratio * sustainTime / rampDuration) - 1) / ratio
            let phase = turns + max(0.0, t - rampDuration) * freqEnd
            let cycle = phase - floor(phase)
            let wave = isProjectile
                ? 1.0 - 4.0 * abs(cycle - 0.5)
                : sin(2.0 * Double.pi * phase)
            let envelope: Double
            if t < attack {
                envelope = 0.0001 * pow(peak / 0.0001, t / attack)
            } else if t < rampDuration {
                envelope = peak * pow(0.0001 / peak,
                    (t - attack) / (rampDuration - attack))
            } else {
                envelope = 0.0001
            }
            samples[frame] = Float(max(-0.95, min(0.95, wave * envelope)))
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<sampleVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // no samples scheduled until a game event
            }
            effectsEngine = engine
            effectNodes[soundId] = nodes
            nextEffectVoice[soundId] = 0
            effectBuffers[soundId] = buffer
            return (true, Int(toneDuration * 1000), "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "launch-tone-engine-failed")
        }
    }

    // N6l: fixed offline synthesis of original Traffic Tap WebAudio.
    // Tempo = 0.65; only these 13 allowlisted presets may be requested.
    // Eight bonus streak steps keep their original alternating pitches.
    // Decoded PCM shares existing serialized AVAudioEngine/soloAmbient.
    private func prepareTrafficTapToneOnWorker(soundId: String)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        guard trafficTapToneIDs.contains(soundId) else {
            return (false, 0, "invalid-traffic-tone")
        }
        if let buffer = effectBuffers[soundId],
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], nodes.count == sampleVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, Int(Double(buffer.frameLength) /
                              buffer.format.sampleRate * 1000), "prepared")
        }
        // offset/duration seconds, source/target Hz, source gain including
        // authored SOUND_TUNING multiplier, triangle oscillator flag.
        var notes: [(Double, Double, Double, Double, Double, Bool)] = []
        if soundId == "traffic-correct" {
            notes = [(0, 0.09, 659, 784, 0.30 * 0.85, true)]
        } else if soundId == "traffic-wrong" {
            notes = [(0, 0.08, 220, 170, 0.10 * 3.40, true),
                     (0.07, 0.09, 170, 170, 0.07 * 3.40, true)]
        } else if soundId.hasPrefix("traffic-bonus-") {
            let pairs: [(Double, Double)] = [
                (523.25, 659.25), (587.33, 783.99),
                (659.25, 880.00), (783.99, 1046.50),
                (880.00, 1318.51), (783.99, 1046.50),
                (659.25, 880.00), (587.33, 783.99)
            ]
            guard let suffix = Int(soundId.dropFirst("traffic-bonus-".count)),
                  suffix >= 1, suffix <= pairs.count else {
                return (false, 0, "invalid-traffic-bonus")
            }
            let (a, b) = pairs[suffix - 1]
            notes = [(0, 0.055, a, a * 1.015, 0.075 * 1.15, false),
                     (0.045, 0.075, b, b * 1.015, 0.06 * 1.15, true)]
        } else {
            // Truck intro/outro and rainbow melodies use original TT_TUNES.
            let tune: [(Double, Double, Double, Double)]
            let volume: Double
            switch soundId {
            case "traffic-truck-intro":
                tune = [(587.33, 0, 0.05, 0.045),
                        (659.25, 0.055, 0.05, 0.045),
                        (783.99, 0.11, 0.10, 0.05)]
                volume = 3.00
            case "traffic-truck-outro":
                tune = [(1046.50, 0, 0.07, 0.045),
                        (783.99, 0.06, 0.07, 0.045),
                        (1318.51, 0.13, 0.13, 0.05)]
                volume = 3.00
            case "traffic-rainbow":
                tune = [(783.99, 0, 0.06, 0.04),
                        (1046.50, 0.055, 0.07, 0.045),
                        (1318.51, 0.12, 0.09, 0.045),
                        (1046.50, 0.23, 0.16, 0.05)]
                volume = 3.20
            default:
                return (false, 0, "invalid-traffic-tune")
            }
            notes = tune.enumerated().map { index, note in
                let (hz, offset, duration, gain) = note
                return (offset / 0.65, duration / 0.65,
                        hz, hz * 1.015, gain * volume,
                        index % 3 == 1)
            }
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "traffic-tone-format-failed")
        }
        let length = notes.reduce(0.0) { max($0, $1.0 + $1.1 + 0.10) }
        let frames = AVAudioFrameCount(ceil(format.sampleRate * length))
        guard let buffer = AVAudioPCMBuffer(
            pcmFormat: format, frameCapacity: frames),
              let samples = buffer.floatChannelData?[0] else {
            return (false, 0, "traffic-tone-allocation-failed")
        }
        buffer.frameLength = frames
        for frame in 0..<Int(frames) {
            let t = Double(frame) / format.sampleRate
            var mixed = 0.0
            for note in notes {
                let (offset, duration, hz, endHz, peak, triangle) = note
                let elapsed = t - offset
                if elapsed < 0 || elapsed > duration + 0.10 { continue }
                let attack = 0.005
                let release = 0.06
                let envelope: Double
                if elapsed < attack {
                    envelope = 0.0001 * pow(peak / 0.0001,
                                            elapsed / attack)
                } else if elapsed < duration + release {
                    envelope = peak * pow(0.0001 / peak,
                        (elapsed - attack) / (duration + release - attack))
                } else {
                    envelope = 0.0001
                }
                let sweep = min(elapsed, duration)
                let ratio = log(endHz / hz)
                let turns = abs(ratio) < 0.000001
                    ? hz * sweep
                    : hz * duration * (exp(ratio * sweep / duration) - 1) / ratio
                let phase = turns + max(0.0, elapsed - duration) * endHz
                let cycle = phase - floor(phase)
                let wave = triangle
                    ? 1.0 - 4.0 * abs(cycle - 0.5)
                    : sin(2.0 * Double.pi * phase)
                mixed += wave * envelope
            }
            samples[frame] = Float(max(-0.95, min(0.95, mixed)))
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<sampleVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // warm without audible samples
            }
            effectsEngine = engine
            effectNodes[soundId] = nodes
            nextEffectVoice[soundId] = 0
            effectBuffers[soundId] = buffer
            return (true, Int(length * 1000), "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "traffic-tone-engine-failed")
        }
    }


    // N6m: the eight source MIDI notes plus eight exact, bounded original
    // Web-style recipes are rendered ONCE on playbackQueue, during a child's
    // explicit mode/Menu Close/Welcome Back preflight. No hot oscillator,
    // caller frequency, extra audio session, Web decoder or HTML sound.
    private func prepareScrambleToneOnWorker(soundId: String)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        guard scrambleToneIDs.contains(soundId) else {
            return (false, 0, "invalid-scramble-tone")
        }
        if let buffer = effectBuffers[soundId],
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], nodes.count == sampleVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, Int(Double(buffer.frameLength) /
                buffer.format.sampleRate * 1000), "prepared")
        }
        // source offset (s), duration (s), from/to Hz, authored peak,
        // triangle oscillator (otherwise sine)
        var notes: [(Double, Double, Double, Double, Double, Bool)] = []
        let fridgeSlide = soundId == "scramble-letters-fall"
        if soundId.hasPrefix("scramble-note-") {
            guard let midi = Int(soundId.dropFirst("scramble-note-".count)),
                  scramblePitchMIDIs.contains(midi) else {
                return (false, 0, "invalid-scramble-midi")
            }
            let hz = 440.0 * pow(2.0, Double(midi - 69) / 12.0)
            notes = [(0, 0.13, hz, hz, 0.48 * 0.85, true)]
        } else if soundId == "scramble-wrong-letter" {
            notes = [(0, 0.08, 220, 170, 0.10 * 3.60, true),
                     (0.07, 0.09, 170, 170, 0.07 * 3.60, true)]
        } else if soundId == "scramble-word-complete" {
            notes = [(0, 0.08, 523, 523, 0.07 * 3.40, false),
                     (0.07, 0.08, 659, 659, 0.07 * 3.40, false),
                     (0.14, 0.12, 784, 784, 0.08 * 3.40, false),
                     (0.20, 0.16, 1046, 1046, 0.06 * 3.40, false)]
        } else if fridgeSlide {
            // Original 650 Hz filtered-noise Fridge Slide + 240→110 sine.
            notes = [(0.18, 0.18, 240, 110, 0.035 * 2.40, false)]
        } else {
            let source: [(Double, Double, Double, Double)]
            let volume: Double
            switch soundId {
            case "scramble-message-pop":
                // TitleIntro C5/E5/A5/G5 at original TUNE_TEMPO 0.65
                source = [(523.25, 0, 0.065, 0.052),
                          (659.25, 0.06, 0.065, 0.052),
                          (880.00, 0.12, 0.075, 0.05),
                          (783.99, 0.20, 0.13, 0.045)]
                volume = 3.60
            case "scramble-bonus-start":
                source = [(587.33, 0, 0.05, 0.045),
                          (659.25, 0.055, 0.05, 0.045),
                          (783.99, 0.11, 0.10, 0.05)]
                volume = 3.20
            case "scramble-bonus-you-win":
                source = [(1046.50, 0, 0.07, 0.045),
                          (783.99, 0.06, 0.07, 0.045),
                          (1318.51, 0.13, 0.13, 0.05)]
                volume = 3.20
            case "scramble-bonus-iwin":
                source = [(659.25, 0, 0.08, 0.045),
                          (587.33, 0.08, 0.08, 0.045),
                          (523.25, 0.16, 0.13, 0.045)]
                volume = 3.20
            case "scramble-bonus-final":
                source = [(783.99, 0, 0.06, 0.04),
                          (1046.50, 0.055, 0.07, 0.045),
                          (1318.51, 0.12, 0.09, 0.045),
                          (1046.50, 0.23, 0.16, 0.05)]
                volume = 3.20
            default:
                return (false, 0, "invalid-scramble-recipe")
            }
            notes = source.enumerated().map { index, note in
                let (hz, offset, duration, gain) = note
                return (offset / 0.65, duration / 0.65,
                        hz, hz * 1.015, gain * volume,
                        index % 3 == 1)
            }
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "scramble-tone-format-failed")
        }
        let noteDuration = notes.reduce(0.0) {
            max($0, $1.0 + $1.1 + 0.10)
        }
        let length = max(noteDuration, fridgeSlide ? 0.53 : 0.0)
        let frames = AVAudioFrameCount(ceil(format.sampleRate * length))
        guard let buffer = AVAudioPCMBuffer(
            pcmFormat: format, frameCapacity: frames),
              let samples = buffer.floatChannelData?[0] else {
            return (false, 0, "scramble-tone-allocation-failed")
        }
        buffer.frameLength = frames
        let sampleRate = format.sampleRate
        // Fixed deterministic noise/one-pole 650 Hz lowpass is generated only
        // during preflight. Original WebNoise used a random lowpass source.
        var seed: UInt32 = 0x39c8a1
        var filtered = 0.0
        let alpha = exp(-2.0 * Double.pi * 650.0 / sampleRate)
        for frame in 0..<Int(frames) {
            let t = Double(frame) / sampleRate
            var mixed = 0.0
            for note in notes {
                let (offset, duration, hz, endHz, peak, triangle) = note
                let elapsed = t - offset
                if elapsed < 0 || elapsed > duration + 0.10 { continue }
                let attack = 0.005
                let release = 0.06
                let envelope: Double
                if elapsed < attack {
                    envelope = 0.0001 * pow(peak / 0.0001,
                                            elapsed / attack)
                } else if elapsed < duration + release {
                    envelope = peak * pow(0.0001 / peak,
                        (elapsed - attack) / (duration + release - attack))
                } else {
                    envelope = 0.0001
                }
                let sweep = min(elapsed, duration)
                let ratio = log(endHz / hz)
                let turns = abs(ratio) < 0.000001
                    ? hz * sweep
                    : hz * duration *
                        (exp(ratio * sweep / duration) - 1) / ratio
                let phase = turns + max(0.0, elapsed - duration) * endHz
                let cycle = phase - floor(phase)
                let wave = triangle
                    ? 1.0 - 4.0 * abs(cycle - 0.5)
                    : sin(2.0 * Double.pi * phase)
                mixed += wave * envelope
            }
            if fridgeSlide && t <= 0.43 {
                seed = seed &* 1664525 &+ 1013904223
                let white = Double(seed) / Double(UInt32.max) * 2.0 - 1.0
                filtered = (1.0 - alpha) * white + alpha * filtered
                let peak = 0.09 * 2.40
                let envelope: Double
                if t < 0.002 {
                    envelope = 0.0001 * pow(peak / 0.0001, t / 0.002)
                } else if t < 0.43 {
                    envelope = peak * pow(0.0001 / peak,
                        (t - 0.002) / (0.43 - 0.002))
                } else {
                    envelope = 0.0001
                }
                mixed += filtered * envelope
            }
            samples[frame] = Float(max(-0.95, min(0.95, mixed)))
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<sampleVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // no samples until a child's actual gameplay event
            }
            effectsEngine = engine
            effectNodes[soundId] = nodes
            nextEffectVoice[soundId] = 0
            effectBuffers[soundId] = buffer
            return (true, Int(length * 1000), "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "scramble-tone-engine-failed")
        }
    }

    // N6n: original Typer Web Audio oscillator shapes/gains rendered
    // only during real gesture preflight, not in hot typing callbacks.
    // Tuple: delay, duration, MIDI pitch, source volume, sine vs triangle.
    private func prepareTyperToneOnWorker(soundId: String)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        guard typerToneIDs.contains(soundId) else {
            return (false, 0, "invalid-typer-tone")
        }
        if let b = effectBuffers[soundId],
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], nodes.count == sampleVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, Int(Double(b.frameLength) / b.format.sampleRate * 1000), "prepared")
        }
        var notes: [(Double, Double, Int, Double, Bool)] = []
        if soundId.hasPrefix("typer-note-") {
            guard let midi = Int(soundId.dropFirst("typer-note-".count)),
                  typerNoteMIDIs.contains(midi) else {
                return (false, 0, "invalid-typer-midi")
            }
            notes = [(0, 0.13, midi, 0.48, false)]
        } else {
            switch soundId {
            case "typer-wrong":
                notes = [(0, 0.13, 43, 0.40, true),
                         (0.055, 0.11, 38, 0.30, true)]
            case "typer-word-done":
                notes = [(0, 0.14, 72, 0.38, false),
                         (0.07, 0.18, 76, 0.34, false)]
            case "typer-popup":
                notes = [(0, 0.10, 67, 0.26, false),
                         (0.058, 0.13, 72, 0.22, false)]
            case "typer-cocoon":
                notes = [(0, 0.10, 60, 0.32, false),
                         (0.082, 0.11, 64, 0.34, false),
                         (0.164, 0.12, 67, 0.36, false),
                         (0.248, 0.18, 72, 0.40, false)]
            case "typer-flap0", "typer-flap1", "typer-flap2":
                let suffix = Int(String(soundId.suffix(1))) ?? 0
                let base = 76 + (suffix % 3) * 2
                notes = [(0, 0.09, base, 0.28, false),
                         (0.052, 0.11, base + 7, 0.24, false)]
            case "typer-fly-away":
                notes = [(0, 0.08, 72, 0.28, false),
                         (0.07, 0.08, 76, 0.30, false),
                         (0.14, 0.10, 79, 0.32, false),
                         (0.22, 0.18, 84, 0.34, false)]
            default:
                return (false, 0, "invalid-typer-recipe")
            }
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "typer-tone-format-failed")
        }
        let duration = notes.reduce(0.0) { max($0, $1.0 + $1.1 + 0.04) }
        let frames = AVAudioFrameCount(ceil(format.sampleRate * duration))
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames),
              let samples = buffer.floatChannelData?[0] else {
            return (false, 0, "typer-tone-allocation-failed")
        }
        buffer.frameLength = frames
        for i in 0..<Int(frames) {
            let t = Double(i) / format.sampleRate
            var mixed = 0.0
            for note in notes {
                let (offset, length, midi, gain, sine) = note
                let elapsed = t - offset
                if elapsed < 0 || elapsed >= length { continue }
                let hz = 440.0 * pow(2.0, Double(midi - 69) / 12.0)
                let phase = hz * elapsed
                let cycle = phase - floor(phase)
                let wave = sine ? sin(2.0 * Double.pi * phase) :
                    (1.0 - 4.0 * abs(cycle - 0.5))
                let peak = max(0.001, gain * 0.85) // original Web master
                let envelope = elapsed < 0.012 ?
                    0.0001 * pow(peak / 0.0001, elapsed / 0.012) :
                    peak * pow(0.0001 / peak,
                        (elapsed - 0.012) / max(0.001, length - 0.012))
                mixed += wave * envelope
            }
            samples[i] = Float(max(-0.95, min(0.95, mixed)))
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<sampleVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // no samples until a real game event
            }
            effectsEngine = engine
            effectNodes[soundId] = nodes
            nextEffectVoice[soundId] = 0
            effectBuffers[soundId] = buffer
            return (true, Int(duration * 1000), "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "typer-tone-engine-failed")
        }
    }


    // N6o: fixed original Scripture Scrub notes at 2% coverage steps.
    // AudioContext sine tones were 75ms with ~12ms exponential attack,
    // volume 1.00; the completion fanfare is G4/C5/E5/G5 at 95ms gaps.
    // No new AVAudioSession, JS-supplied frequency, hot oscillator or Web
    // fallback. All work happens on existing playbackQueue during preflight.
    private func prepareScrubToneOnWorker(soundId: String)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        guard scrubToneIDs.contains(soundId) else {
            return (false,0,"invalid-scrub-tone")
        }
        if let buffer = effectBuffers[soundId],
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], nodes.count == sampleVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true,Int(Double(buffer.frameLength) /
                buffer.format.sampleRate * 1000),"prepared")
        }
        let notes: [(Double, Double, Double, Double)]
        if let hz = scrubProgressFrequencies[soundId] {
            notes = [(0, 0.075, hz, 1.0)]
        } else if soundId == "scrub-completion-arpeggio" {
            notes = [(0,0.13,392.00,0.98),
                     (0.095,0.13,523.25,0.98),
                     (0.190,0.13,659.25,0.98),
                     (0.285,0.13,783.99,0.98)]
        } else { return (false,0,"invalid-scrub-fanfare") }
        guard let format=AVAudioFormat(
            standardFormatWithSampleRate:44_100,channels:1) else {
            return (false,0,"scrub-tone-format-failed")
        }
        let duration=notes.reduce(0.0) {max($0,$1.0+$1.1+0.025)}
        let frames=AVAudioFrameCount(ceil(format.sampleRate*duration))
        guard let buffer=AVAudioPCMBuffer(
            pcmFormat:format,frameCapacity:frames),
            let channel=buffer.floatChannelData?[0] else {
            return (false,0,"scrub-tone-allocation-failed")
        }
        buffer.frameLength=frames
        for i in 0..<Int(frames) {
            let time=Double(i)/format.sampleRate
            var sum=0.0
            for note in notes {
                let (delay,length,hz,volume)=note
                let t=time-delay
                if t<0 || t>=length {continue}
                let peak=max(0.0001,volume)
                let env=t<0.012
                    ? 0.0001*pow(peak/0.0001,t/0.012)
                    : peak*pow(0.0001/peak,
                        (t-0.012)/max(0.001,length-0.012))
                sum+=sin(2.0*Double.pi*hz*t)*env
            }
            channel[i]=Float(max(-0.95,min(0.95,sum)))
        }
        do {
            let engine=effectsEngine ?? AVAudioEngine()
            var nodes:[AVAudioPlayerNode]=[]
            for _ in 0..<sampleVoiceLimit {
                let node=AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node,to:engine.mainMixerNode,format:format)
                nodes.append(node)
            }
            if !engine.isRunning {try engine.start()}
            for node in nodes {
                node.prepare(withFrameCount:frames)
                node.play()
            }
            effectsEngine=engine
            effectNodes[soundId]=nodes
            nextEffectVoice[soundId]=0
            effectBuffers[soundId]=buffer
            return (true,Int(duration*1000),"prepared")
        }catch{
            discardEffectsOnWorker()
            return (false,0,"scrub-tone-engine-failed")
        }
    }

    // Source mower uses looped MP3 for an animation lasting 1250ms, with
    // 120ms fade-in and 35%-duration fade-out. Prebuild that exact bounded
    // loop/fade from the original packaged MP3; no loop decoder on hot tap.
    // The optional stopEffect cuts any remainder when animation ends.
    private func prepareScrubMowerOnWorker(soundId:String,url:URL)
        -> (prepared:Bool,durationMs:Int,reason:String) {
        let original=preparePCMEffectOnWorker(soundId:soundId,url:url)
        guard original.prepared,let source=effectBuffers[soundId],
              source.frameLength>0,
              let input=source.floatChannelData else {return original}
        let format=source.format
        let duration=1.25
        let frameCount=AVAudioFrameCount(ceil(format.sampleRate*duration))
        guard let loop=AVAudioPCMBuffer(
            pcmFormat:format,frameCapacity:frameCount),
              let output=loop.floatChannelData else {
            return (false,0,"scrub-mower-loop-allocation-failed")
        }
        loop.frameLength=frameCount
        let channelCount=Int(format.channelCount)
        let sourceFrames=Int(source.frameLength)
        for frame in 0..<Int(frameCount) {
            let t=Double(frame)/format.sampleRate
            let volumeEnvelope:Double
            if t<0.12 {volumeEnvelope=max(0.0001,t/0.12)}
            else if t<duration*0.65 {volumeEnvelope=1.0}
            else {volumeEnvelope=max(0.0001,
                (duration-t)/(duration*0.35))}
            for channel in 0..<channelCount {
                output[channel][frame]=input[channel][frame % sourceFrames] *
                    Float(volumeEnvelope)
            }
        }
        effectBuffers[soundId]=loop
        return (true,1250,"prepared")
    }


    // N6p: offline PCM rendering of exact Wheel-of-Bible source triangle,
    // square and sine oscillator notes, no new session and no hot synth.

    // N6q: one worker-only AVAudioEngine; no hot oscillator, decode or
    // per-note dynamic buffer allocation. Voice bits use the existing
    // packaged-MP3 PCM preloader. Pads are original four-note triangle
    // chords, pre-rendered at every source BPM / measure length.
    private func prepareJamOnWorker(soundId: String)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        guard jamIDs.contains(soundId),
              soundId == "jam-note" || soundId == "jam-pad" ||
                  soundId.hasPrefix("jam-drum-") else {
            return (false, 0, "invalid-jam-id")
        }
        if effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], !nodes.isEmpty,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, soundId == "jam-pad" ? 1800 : 220, "prepared")
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "jam-format-failed")
        }
        let rate = format.sampleRate
        func make(_ seconds: Double,
                  sample: (Double) -> Double) -> AVAudioPCMBuffer? {
            let frames = AVAudioFrameCount(ceil(rate * seconds))
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: format, frameCapacity: frames),
                  let values = buffer.floatChannelData?[0] else { return nil }
            buffer.frameLength = frames
            for i in 0..<Int(frames) {
                values[i] = Float(max(-0.96, min(0.96,
                    sample(Double(i) / rate))))
            }
            return buffer
        }
        func triangle(_ hz: Double, _ t: Double) -> Double {
            let cycle = hz*t - floor(hz*t)
            return 1.0 - 4.0*abs(cycle-0.5)
        }
        func envelope(_ t: Double, _ duration: Double,
                      _ peak: Double, _ attack: Double) -> Double {
            if t >= duration { return 0 }
            if t < attack {
                return 0.0001*pow(peak/0.0001,t/attack)
            }
            return peak*pow(0.0001/peak,
                (t-attack)/max(0.001,duration-attack))
        }
        var maxDuration = 220
        if soundId == "jam-note" {
            var bank: [String: AVAudioPCMBuffer] = [:]
            for (key, (midi, ms, wave)) in jamNoteRecipes {
                let duration = Double(ms)/1000.0
                let hz = 440.0*pow(2.0,Double(midi-69)/12.0)
                // Precompute the exponential gain ratio once per note.
                // Previously pow() ran on each of ~1M generated PCM frames.
                let attackFrames = max(1,Int(ceil(rate*0.01)))
                let activeFrames = max(attackFrames+1,Int(ceil(rate*duration)))
                let rise = pow(1.0/0.0001,1.0/Double(attackFrames))
                let fadeFrames = Double(max(1, activeFrames - attackFrames))
                let decay = pow(0.0001, 1.0 / fadeFrames)
                var frameIndex = 0
                var gain = 0.0001
                guard let buffer = make(duration+0.03, sample: { t in
                    defer { frameIndex += 1 }
                    if frameIndex >= activeFrames { return 0 }
                    let cycle = hz*t-floor(hz*t)
                    let shape = wave == "q"
                        ? (cycle < 0.5 ? 1.0 : -1.0)
                        : (wave == "s" ? sin(2.0*Double.pi*hz*t) :
                            triangle(hz,t))
                    let value = shape*gain
                    gain *= frameIndex < attackFrames ? rise : decay
                    return value
                }) else { return (false,0,"jam-note-allocation-failed") }
                bank[key] = buffer
            }
            jamNoteBuffers = bank
            maxDuration = 1350
        } else if soundId == "jam-pad" {
            var bank: [String: AVAudioPCMBuffer] = [:]
            for bpm in jamBPMs {
                for beats in jamPadBeats {
                    let duration = (Double(beats)-0.25)*60.0/Double(bpm)
                    let freqs = [48,52,55,60].map {
                        440.0*pow(2.0,Double($0-69)/12.0)
                    }
                    // Seven BPMs × four long pads used pow() per sample
                    // across millions of frames. Retain the same exponential
                    // envelope with one ratio per pre-rendered chord.
                    let attackFrames = max(1,Int(ceil(rate*0.01)))
                    let activeFrames = max(attackFrames+1,Int(ceil(rate*duration)))
                    let rise = pow(0.016/0.0001,1.0/Double(attackFrames))
                    let fadeFrames = Double(max(1, activeFrames - attackFrames))
                    let decay = pow(0.0001 / 0.016, 1.0 / fadeFrames)
                    var frameIndex = 0
                    var gain = 0.0001
                    guard let buffer = make(duration+0.03, sample: { t in
                        defer { frameIndex += 1 }
                        if frameIndex >= activeFrames { return 0 }
                        let volume = gain*1.5
                        gain *= frameIndex < attackFrames ? rise : decay
                        let chord = triangle(freqs[0], t) + triangle(freqs[1], t)
                            + triangle(freqs[2], t) + triangle(freqs[3], t)
                        return chord * volume
                    }) else { return (false,0,"jam-pad-allocation-failed") }
                    bank["\(bpm)-\(beats)"] = buffer
                    maxDuration = max(maxDuration,Int(duration*1000)+30)
                }
            }
            jamPadBuffers = bank
        } else {
            let sound = String(soundId.dropFirst("jam-drum-".count))
            let duration: Double = sound == "kick" ? 0.20 : 0.13
            guard let buffer = make(duration, sample: { t in
                let peak = (sound == "kick" ? 0.22 :
                    (sound == "snare" ? 0.09 : 0.045))*2.0*1.5
                let end = sound == "kick" ? 0.18 :
                    (sound == "snare" ? 0.11 : 0.045)
                let attack = sound == "kick" ? 0.006 : 0.004
                let gain = envelope(t,end,peak,attack)
                let hz: Double = sound == "snare" ? 185.0 :
                    (sound == "extra" ? 320.0 : 520.0)
                let cycle: Double
                if sound == "kick" {
                    let logRatio = log(48.0/120.0)
                    let before = min(t,0.14)
                    let first = 120.0*0.14/logRatio *
                        (pow(48.0/120.0,before/0.14)-1.0)
                    cycle = first + 48.0*max(0,t-0.14)
                } else { cycle = hz*t }
                return (sound == "kick" ? sin(2.0*Double.pi*cycle) :
                    (cycle-floor(cycle) < 0.5 ? 1.0 : -1.0))*gain
            }) else { return (false,0,"jam-drum-allocation-failed") }
            effectBuffers[soundId] = buffer
            maxDuration = Int(duration*1000)
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            let count = soundId == "jam-note" ? 12 : 4
            for _ in 0..<count {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node,to:engine.mainMixerNode,format:format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: AVAudioFrameCount(
                    ceil(rate*Double(maxDuration+40)/1000.0)))
                node.play()
            }
            effectsEngine = engine
            effectNodes[soundId] = nodes
            nextEffectVoice[soundId] = 0
            return (true,maxDuration,"prepared")
        } catch {
            discardEffectsOnWorker()
            return (false,0,"jam-engine-start-failed")
        }
    }

    private func prepareWheelToneOnWorker(soundId: String)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        guard let (midi, milliseconds, volumeMilli, wave) =
            wheelToneRecipes[soundId] else {
            return (false, 0, "invalid-wheel-tone")
        }
        if let buffer = effectBuffers[soundId],
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], nodes.count == sampleVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, Int(Double(buffer.frameLength) /
                buffer.format.sampleRate * 1000), "prepared")
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "wheel-tone-format-failed")
        }
        let originalDuration=Double(milliseconds)/1000.0
        let totalDuration=originalDuration+0.04
        let frames=AVAudioFrameCount(ceil(format.sampleRate*totalDuration))
        guard let buffer=AVAudioPCMBuffer(
            pcmFormat:format,frameCapacity:frames),
              let samples=buffer.floatChannelData?[0] else {
            return (false, 0, "wheel-tone-allocation-failed")
        }
        buffer.frameLength=frames
        let hz=440.0*pow(2.0,Double(midi-69)/12.0)
        let peak=Double(volumeMilli)/1000.0*0.82
        for i in 0..<Int(frames) {
            let t=Double(i)/format.sampleRate
            if t>=originalDuration { samples[i]=0; continue }
            let cycle=hz*t-floor(hz*t)
            let waveform:Double
            if wave=="q" {
                waveform=cycle<0.5 ? 1.0 : -1.0
            } else if wave=="s" {
                waveform=sin(2.0*Double.pi*hz*t)
            } else {
                waveform=1.0-4.0*abs(cycle-0.5)
            }
            let gain:Double
            if t<0.012 {
                gain=0.0001*pow(peak/0.0001,t/0.012)
            } else {
                gain=peak*pow(0.0001/peak,
                    (t-0.012)/max(0.001,originalDuration-0.012))
            }
            samples[i]=Float(max(-0.95,min(0.95,waveform*gain)))
        }
        do {
            let engine=effectsEngine ?? AVAudioEngine()
            var nodes:[AVAudioPlayerNode]=[]
            for _ in 0..<sampleVoiceLimit {
                let node=AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node,to:engine.mainMixerNode,format:format)
                nodes.append(node)
            }
            if !engine.isRunning {try engine.start()}
            for node in nodes {
                node.prepare(withFrameCount:frames)
                node.play() // silent until the existing hot scheduleBuffer
            }
            effectsEngine=engine
            effectNodes[soundId]=nodes
            nextEffectVoice[soundId]=0
            effectBuffers[soundId]=buffer
            return (true,Int(totalDuration*1000),"prepared")
        }catch {
            discardEffectsOnWorker()
            return (false,0,"wheel-tone-engine-failed")
        }
    }

    private func nextWarmVoiceOnWorker(soundId: String) -> AVAudioPlayerNode? {
        guard let nodes = effectNodes[soundId], !nodes.isEmpty else { return nil }
        let index = (nextEffectVoice[soundId] ?? 0) % nodes.count
        nextEffectVoice[soundId] = (index + 1) % nodes.count
        return nodes[index]
    }

    private func forgetPlayback() {
        // Stop long narration immediately with UIKit inactivity/interruptions;
        // invalidate the request before an old player completion can fire.
        stopNarrationPlayer(reason: "interrupted")
        playbackEpochLock.lock()
        playbackEpoch &+= 1
        playbackEpochLock.unlock()
        playbackQueue.async { [weak self] in
            guard let self = self else { return }
            for sound in self.players.values { sound.stop() }
            self.players.removeAll()
            self.discardEffectsOnWorker()
        }
    }

    private func leftForeground() {
        forgetPlayback()
        if !wasOutsideForeground {
            wasOutsideForeground = true
            appendTrace("app-left-active")
            // N4a.1: opening the iOS app-switcher makes the app INACTIVE
            // without necessarily hiding WKWebView or firing pagehide.
            // JS must freeze its physics/song clock before another catch.
            // This event is state only: never unlock/restart sound.
            notifyListeners("biblozooAppLifecycle", data: [
                "active": false,
                "foregroundEpoch": foregroundEpoch
            ])
        }
        if interrupted { leftForegroundDuringInterruption = true }
    }

    private func returnedToForeground() {
        // Foreground is evidence of a lifecycle transition, NOT audio health.
        // A new explicit tap may now ask the OS to activate; this method
        // never clears a pending interruption and never starts playback.
        if wasOutsideForeground {
            wasOutsideForeground = false
            foregroundEpoch += 1
            if interrupted && leftForegroundDuringInterruption {
                returnedToForegroundDuringInterruption = true
            }
        }
        appendTrace("app-active")
        // If an inactive event was held while WebKit was suspended, the
        // matching return event also forces the JS game to pause. Only a
        // later real Welcome Back tap is permitted to re-preload sounds.
        notifyListeners("biblozooAppLifecycle", data: [
            "active": true,
            "foregroundEpoch": foregroundEpoch
        ])
    }

    private func handleInterruption(_ note: Notification) {
        forgetPlayback()
        // Counters are in-memory only, exposed on explicit developer taps.
        // Never log verse text, profiles, recordings or device identifiers.
        interruptionEventCount += 1
        lastInterruptionAt = Date()
        lastInterruptionRawType =
            (note.userInfo?[AVAudioSessionInterruptionTypeKey] as? NSNumber)?.intValue ?? -1
        lastInterruptionReasonCode =
            (note.userInfo?[AVAudioSessionInterruptionReasonKey] as? NSNumber)?.intValue ?? -1
        guard let raw = (note.userInfo?[AVAudioSessionInterruptionTypeKey] as? NSNumber)?.uintValue,
              let kind = AVAudioSession.InterruptionType(rawValue: raw) else {
            // An absent/unrecognized type is not evidence of a fresh .began.
            lastInterruptionSignal = "unrecognized"
            appendTrace("interruption-unrecognized")
            return
        }
        switch kind {
        case .began:
            beganEventCount += 1
            let wasSuspended =
                (note.userInfo?[AVAudioSessionInterruptionWasSuspendedKey] as? NSNumber)?.boolValue == true
            if wasSuspended {
                suspendedEventCount += 1
                // iOS 10+: delayed message saying the session was deactivated
                // WHEN THE PROCESS WAS SUSPENDED. Ignore it as a fresh active
                // interruption; keep an unrelated earlier pending .began intact.
                lastInterruptionSignal = "suspended-began"
                appendTrace("interruption-suspended-history")
                return
            }
            // A new external takeover starts a fresh, bounded gesture
            // recovery budget. Attempts made before YouTube started should
            // not prevent recovery after the video is paused.
            if !interrupted {
                activationAttemptsThisForeground = 0
                lastActivationAt = nil
            }
            interrupted = true
            needsGestureAfterInterruption = true
            leftForegroundDuringInterruption =
                UIApplication.shared.applicationState != .active
            returnedToForegroundDuringInterruption = false
            lastInterruptionSignal = "began"
            appendTrace("interruption-began")
            if UIApplication.shared.applicationState == .active {
                // The PiP overlay can steal audio WITHOUT resigning UIKit
                // active. Treat this as pause + show plain Welcome Back for
                // native games, never a fatal PCM failure or auto-resume.
                notifyListeners("biblozooAppLifecycle", data: [
                    "active": false, "reason": "audio-interruption",
                    "foregroundEpoch": foregroundEpoch
                ])
                notifyListeners("biblozooAppLifecycle", data: [
                    "active": true, "reason": "audio-interruption",
                    "foregroundEpoch": foregroundEpoch
                ])
            }
        case .ended:
            endedEventCount += 1
            // Still requires gesture even though the interruption is over.
            // Never tell the next child tap "not-needed" after iOS silently
            // deactivated our session.
            needsGestureAfterInterruption = true
            interrupted = false
            leftForegroundDuringInterruption = false
            returnedToForegroundDuringInterruption = false
            lastInterruptionSignal = "ended"
            appendTrace("interruption-ended")
        @unknown default:
            lastInterruptionSignal = "unrecognized"
            appendTrace("interruption-unrecognized")
        }
    }

    private func onMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread { work() }
        else { DispatchQueue.main.async(execute: work) }
    }

    private func unavailableReason() -> String? {
        if UIApplication.shared.applicationState != .active { return "not-foreground" }
        let session = AVAudioSession.sharedInstance()
        if session.category != .soloAmbient {
            return "category-not-soloambient"
        }
        // A hot play/preload never steals YouTube's audio. Only an explicit
        // activateFromGesture (below) can request session priority. Preserve
        // the busy reason for calls outside a real child gesture.
        if session.isOtherAudioPlaying { return "other-audio-playing" }
        // Never clear a genuine .began merely because the app became active.
        // See activateFromGesture: a bounded OS decision is required after a
        // full inactive->active transition, or wait for a real .ended event.
        if interrupted { return "interruption-pending" }
        if needsGestureAfterInterruption {
            return "gesture-required-after-interruption"
        }
        if needsGestureAfterReset { return "media-reset-requires-gesture" }
        return nil
    }

    // The ONLY native audio-session activation entrypoint in the .audiotest
    // app. Called explicitly from Got It!/Resume or a DEV sound tap; no
    // foreground observer, status inspection or queued effect invokes this.
    @objc func activateFromGesture(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["ready": false, "reason": "unavailable"]); return
            }
            func finish(_ result: [String: Any]) {
                self.resolvePreflight(call, result, phase: "gesture",
                                      soundId: "session")
            }
            let purpose = call.getString("purpose") ?? ""
            guard purpose == "dev" || purpose == "feeding" || purpose == "ui" ||
                  purpose == "learn" || purpose == "game" else {
                finish(["ready": false, "reason": "invalid-purpose"]); return
            }
            // N6h.2: do NOT deny the real child's tap simply because YouTube
            // PiP is currently playing. A nonmixable .soloAmbient session is
            // intended to pause competing audio when this foreground app
            // explicitly calls setActive(true). N6h.1's unconditional
            // "other-audio-playing" gate trapped Home and every game's mode
            // screen whenever PiP was still audible.
            if let blocked = self.unavailableReason(), blocked != "interruption-pending",
               blocked != "gesture-required-after-interruption",
               blocked != "media-reset-requires-gesture",
               blocked != "other-audio-playing" {
                self.lastActivationResult = blocked
                self.appendTrace("activation-denied")
                finish(["ready": false, "reason": blocked]); return
            }
            let firstTap = !self.hasGestureActivatedSession
            let needsRecovery = firstTap || self.interrupted ||
                self.needsGestureAfterInterruption || self.needsGestureAfterReset ||
                AVAudioSession.sharedInstance().isOtherAudioPlaying
            if !needsRecovery {
                self.lastActivationResult = "not-needed"
                self.appendTrace("activation-not-needed")
                finish(["ready": true, "attempted": false, "reason": "not-needed"])
                return
            }
            // An active .began does not prohibit a new explicit foreground
            // tap: that is exactly when the child can reclaim the soloAmbient
            // speaker from PiP. Never do this automatically on a .began,
            // .ended, route change or foreground notification. iOS alone
            // decides whether the setActive(true) call is accepted; telephone
            // calls or higher-priority audio can still reject it. Keep the
            // existing bounded attempt/cooldown budget and real failure reason.
            let now = Date()
            if let last = self.lastActivationAt,
               now.timeIntervalSince(last) < self.minimumActivationInterval {
                self.lastActivationResult = "activation-cooldown"
                self.appendTrace("activation-deferred")
                finish(["ready": false, "attempted": false,
                              "reason": "activation-cooldown"])
                return
            }
            guard self.activationAttemptsThisForeground <
                    self.maximumActivationAttemptsPerForeground else {
                self.lastActivationResult = "foreground-attempt-limit"
                self.appendTrace("activation-deferred")
                finish(["ready": false, "attempted": false,
                              "reason": "foreground-attempt-limit"])
                return
            }
            self.lastActivationAt = now
            self.activationAttemptsThisForeground += 1
            self.activationAttemptsTotal += 1
            do {
                // This is OS acceptance only, not speaker audibility. Category
                // and mode are never changed, even after media-services reset.
                try AVAudioSession.sharedInstance().setActive(true)
                self.interrupted = false
                self.needsGestureAfterInterruption = false
                self.needsGestureAfterReset = false
                self.hasGestureActivatedSession = true
                self.leftForegroundDuringInterruption = false
                self.returnedToForegroundDuringInterruption = false
                self.lastInterruptionSignal = firstTap
                    ? "initial-activation-accepted"
                    : "foreground-activation-accepted"
                self.lastActivationResult = "os-accepted"
                self.appendTrace("activation-os-accepted")
                finish(["ready": true, "attempted": true,
                              "reason": "os-accepted", "backend": "avfoundation"])
            } catch let error as NSError {
                // Never clear pending state or claim sound output on failure.
                self.lastActivationResult = "activation-os-rejected"
                self.appendTrace("activation-os-rejected")
                finish(["ready": false, "attempted": true,
                              "reason": "activation-os-rejected",
                              "errorDomain": error.domain, "errorCode": error.code])
            }
        }
    }

    private func requestedId(_ call: CAPPluginCall) -> String? {
        guard let soundId = call.getString("soundId"),
              soundResources[soundId] != nil ||
              dailyQuestionSoundResources[soundId] != nil ||
              snakeSoundResources[soundId] != nil ||
              bibleBugsSoundResources[soundId] != nil ||
              foodSliceSoundResources[soundId] != nil ||
              verseSplatSoundResources[soundId] != nil ||
              dinoDashSoundResources[soundId] != nil ||
              verseInvadersSoundResources[soundId] != nil ||
              verseMunchSoundResources[soundId] != nil ||
              verseyBirdSoundResources[soundId] != nil ||
              towerBibleSoundResources[soundId] != nil ||
              towerWordToneIDs.contains(soundId) ||
              verseLaunchSoundResources[soundId] != nil ||
              verseLaunchToneIDs.contains(soundId) ||
              trafficTapSoundResources[soundId] != nil ||
              trafficTapToneIDs.contains(soundId) ||
              scrambleToneIDs.contains(soundId) ||
              typerToneIDs.contains(soundId) ||
              scrubSoundResources[soundId] != nil ||
              scrubToneIDs.contains(soundId) ||
              wheelToneIDs.contains(soundId) ||
              jamIDs.contains(soundId) ||
              ghostWriterSoundResources[soundId] != nil ||
              soundId == nativeSnakeOrbSoundID ||
              soundId == nativePegSoundID ||
              soundId == nativeMelodySoundID else { return nil }
        return soundId
    }

    // No audio API is invoked here. This snapshot describes notification
    // history, not whether the speaker was audible or AVAudioSession is active
    // (Apple exposes no public isActive property).
    @objc func getDebugState(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["available": false])
                return
            }
            let state: String
            switch UIApplication.shared.applicationState {
            case .active: state = "active"
            case .inactive: state = "inactive"
            case .background: state = "background"
            @unknown default: state = "unknown"
            }
            let ageMs = self.lastInterruptionAt.map {
                max(0, Int(Date().timeIntervalSince($0) * 1000))
            } ?? -1
            call.resolve([
                "available": true,
                "appState": state,
                "category": AVAudioSession.sharedInstance().category.rawValue,
                "pending": self.interrupted,
                "needsGestureAfterInterruption": self.needsGestureAfterInterruption,
                "otherAudioPlaying": AVAudioSession.sharedInstance().isOtherAudioPlaying,
                "lastSignal": self.lastInterruptionSignal,
                "eventCount": self.interruptionEventCount,
                "beganCount": self.beganEventCount,
                "endedCount": self.endedEventCount,
                "suspendedCount": self.suspendedEventCount,
                "routeCount": self.routeEventCount,
                "lastReasonCode": self.lastInterruptionReasonCode,
                "lastRawType": self.lastInterruptionRawType,
                "lastAgeMs": ageMs,
                "foregroundEpoch": self.foregroundEpoch,
                "eventSequence": self.eventSequence,
                "recentEvents": self.eventTrace,
                "mediaResetCount": self.mediaResetCount,
                "needsGestureAfterReset": self.needsGestureAfterReset,
                "lastRouteReasonCode": self.lastRouteReasonCode,
                "activationAttemptsThisForeground": self.activationAttemptsThisForeground,
                "activationAttemptsTotal": self.activationAttemptsTotal,
                "lastActivationResult": self.lastActivationResult,
                "hasGestureActivatedSession": self.hasGestureActivatedSession,
                "preflightEventCount": self.preflightEvents.count,
                "lastPreflight": self.preflightEvents.last ?? [:],
                "lastNativePrepareMs": self.lastNativePrepareMs,
                "lastNativePlayQueueMs": self.lastNativePlayQueueMs,
                "lastNativePlayCallMs": self.lastNativePlayCallMs,
                "lastNativePlayedSoundId": self.lastNativePlayedSoundId,
                "lastNativeBackend": self.lastNativeBackend,
                "timingEventCount": self.soundTimingEvents.count,
                "lateChompMarks": self.lateChompMarks
            ])
        }
    }


    // Guard native session on main; schedule ALL potentially synchronous
    // AVAudioPlayer operations on the dedicated serial queue. No Web fallback.
    @objc func preload(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["prepared": false, "reason": "unavailable"])
                return
            }
            func finish(_ result: [String: Any]) {
                self.resolvePreflight(call, result, phase: "preload",
                    soundId: self.requestedId(call) ?? "invalid")
            }
            guard let soundId = self.requestedId(call) else {
                finish(["prepared": false, "reason": "invalid-sound-id"])
                return
            }
            if let reason = self.unavailableReason() {
                finish(["prepared": false, "reason": reason])
                return
            }
            let url: URL?
            if soundId == self.nativePegSoundID ||
               soundId == self.nativeMelodySoundID ||
               soundId == self.nativeSnakeOrbSoundID ||
               self.towerWordToneIDs.contains(soundId) ||
               self.verseLaunchToneIDs.contains(soundId) ||
               self.trafficTapToneIDs.contains(soundId) ||
               self.scrambleToneIDs.contains(soundId) ||
               self.typerToneIDs.contains(soundId) ||
               self.scrubToneIDs.contains(soundId) ||
               self.wheelToneIDs.contains(soundId) ||
                (self.jamIDs.contains(soundId) &&
                 self.jamVoiceResources[soundId] == nil) {
                // Fixed Swift-generated PCM banks, never downloaded assets.
                url = nil
            } else if let resourceName = self.ghostWriterSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_playground/ghost_writer/ghost_writer_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.jamVoiceResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_playground/verse_jam/verse_jam_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.scrubSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_playground/scripture_scrub/scripture_scrub_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.dailyQuestionSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_images/daily_questions") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.snakeSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/verse_snake/verse_snake_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.bibleBugsSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/bible_bugs/bible_bugs_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.trafficTapSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/traffic_tap/traffic_tap_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.verseLaunchSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/verse_launch/verse_launch_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.towerBibleSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/tower_bible/tower_bible_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.verseyBirdSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/versey_bird/versey_bird_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.verseMunchSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/verse_munch/verse_munch_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.verseInvadersSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/verse_invaders/verse_invaders_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.dinoDashSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/dino_dash/dino_dash_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.verseSplatSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/verse_splat/verse_splat_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.foodSliceSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/foodslice/food_slice_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.soundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else {
                finish(["prepared": false, "reason": "invalid-sound-id"])
                return
            }
            let epoch = self.playbackEpochSnapshot()
            self.playbackQueue.async { [weak self] in
                guard let self = self else {
                    DispatchQueue.main.async {
                        finish(["prepared": false, "reason": "unavailable"])
                    }
                    return
                }
                guard self.isCurrentPlaybackEpoch(epoch) else {
                    DispatchQueue.main.async {
                        finish(["prepared": false, "reason": "stale"])
                    }
                    return
                }
                let startedAt = ProcessInfo.processInfo.systemUptime
                var prepared = false
                var durationMs = 0
                var failed = "prepare-failed"
                let backend: String
                if self.jamIDs.contains(soundId) &&
                    self.jamVoiceResources[soundId] == nil {
                    let result = self.prepareJamOnWorker(soundId: soundId)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-jam"
                } else if self.wheelToneIDs.contains(soundId) {
                    let result = self.prepareWheelToneOnWorker(soundId: soundId)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-wheel-tone"
                } else if self.scrubToneIDs.contains(soundId) {
                    let result = self.prepareScrubToneOnWorker(soundId: soundId)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-scrub-tone"
                } else if self.typerToneIDs.contains(soundId) {
                    let result = self.prepareTyperToneOnWorker(soundId: soundId)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-typer-tone"
                } else if self.scrambleToneIDs.contains(soundId) {
                    let result = self.prepareScrambleToneOnWorker(soundId: soundId)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-scramble-tone"
                } else if self.trafficTapToneIDs.contains(soundId) {
                    let result = self.prepareTrafficTapToneOnWorker(soundId: soundId)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-traffic-tone"
                } else if self.verseLaunchToneIDs.contains(soundId) {
                    let result = self.prepareVerseLaunchToneOnWorker(soundId: soundId)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-launch-tone"
                } else if self.towerWordToneIDs.contains(soundId) {
                    let result = self.prepareTowerWordToneOnWorker(soundId: soundId)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-tower-tone"
                } else if soundId == self.nativeSnakeOrbSoundID {
                    let result = self.prepareSnakeOrbTonesOnWorker()
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-snake-orb"
                } else if soundId == self.nativePegSoundID {
                    let result = self.preparePegTonesOnWorker()
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-tone"
                } else if soundId == self.nativeMelodySoundID {
                    let result = self.prepareMelodyTonesOnWorker()
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-melody"
                } else if self.pcmEffectIDs.contains(soundId), let url = url {
                    // MP3 decoding ONLY happens during explicit preflight.
                    // N6o mower: loop predecoded original clip to one 1.25s
                    // bounded pre-ramped PCM pass (no hot decoder/loop).
                    let result = soundId == "scrub-mower"
                        ? self.prepareScrubMowerOnWorker(soundId:soundId,url:url)
                        : self.preparePCMEffectOnWorker(soundId:soundId,url:url)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-pcm"
                } else if let url = url {
                    // DEV pet-unlock comparison stays native AVAudioPlayer.
                    self.players.removeValue(forKey: soundId)?.stop()
                    do {
                        let player = try AVAudioPlayer(contentsOf: url)
                        player.numberOfLoops = 0
                        if player.prepareToPlay() {
                            prepared = true
                            durationMs = Int(player.duration * 1000)
                            if self.isCurrentPlaybackEpoch(epoch) {
                                self.players[soundId] = player
                            } else {
                                prepared = false
                                player.stop()
                            }
                        }
                    } catch { failed = "decode-error" }
                    backend = "avfoundation-player"
                } else {
                    backend = "unavailable"
                }
                let prepareMs = max(0, Int(
                    (ProcessInfo.processInfo.systemUptime - startedAt) * 1000))
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else {
                        finish(["prepared": false, "reason": "unavailable"])
                        return
                    }
                    guard self.isCurrentPlaybackEpoch(epoch) else {
                        finish(["prepared": false, "reason": "stale"])
                        return
                    }
                    if let reason = self.unavailableReason() {
                        finish(["prepared": false, "reason": reason])
                        return
                    }
                    self.lastNativePrepareMs = prepareMs
                    guard prepared else {
                        finish(["prepared": false, "reason": failed])
                        return
                    }
                    // Prepared engine/player is NOT human-audible proof.
                    finish([
                        "prepared": true,
                        "reason": "prepared",
                        "backend": backend,
                        "lastInterruptionSignal": self.lastInterruptionSignal,
                        "foregroundEpoch": self.foregroundEpoch,
                        "durationMs": durationMs,
                        "prepareMs": prepareMs
                    ])
                }
            }
        }
    }

    @objc func play(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["accepted": false, "reason": "unavailable"])
                return
            }
            guard let soundId = self.requestedId(call) else {
                call.resolve(["accepted": false, "reason": "invalid-sound-id"])
                return
            }
            guard let volume = call.getDouble("volume"), volume.isFinite,
                  volume >= 0, volume <= 1 else {
                call.resolve(["accepted": false, "reason": "invalid-volume"])
                return
            }
            let requestedNoteIndex: Int?
            if soundId == self.nativePegSoundID ||
               soundId == self.nativeSnakeOrbSoundID {
                let count = soundId == self.nativeSnakeOrbSoundID
                    ? self.snakeOrbMidiNotes.count : self.pegFrequencies.count
                guard let noteIndex = call.getInt("noteIndex"),
                      (0..<count).contains(noteIndex) else {
                    call.resolve(["accepted": false, "reason": "invalid-peg-note"])
                    return
                }
                requestedNoteIndex = noteIndex
            } else {
                requestedNoteIndex = nil
            }
            // Jam's source-backed finite recipes are verified on main before worker.
            let jamTraceCue: String?
            if soundId == "jam-note",
               let cue = call.getString("jamCue"),
               ["transition-sting","transition-word"].contains(cue) {
                jamTraceCue = cue
            } else {
                jamTraceCue = nil
            }
            let requestedJamNote: String?
            if soundId == "jam-note" {
                guard let noteId = call.getString("noteId"),
                      self.jamNoteRecipes[noteId] != nil else {
                    call.resolve(["accepted": false, "reason": "invalid-jam-note"])
                    return
                }
                requestedJamNote = noteId
            } else { requestedJamNote = nil }
            let requestedJamPad: String?
            if soundId == "jam-pad" {
                guard let padId = call.getString("padId"),
                      padId.split(separator: "-").count == 2,
                      self.jamBPMs.contains(Int(padId.split(separator: "-")[0]) ?? -1),
                      self.jamPadBeats.contains(Int(padId.split(separator: "-")[1]) ?? -1) else {
                    call.resolve(["accepted": false, "reason": "invalid-jam-pad"])
                    return
                }
                requestedJamPad = padId
            } else { requestedJamPad = nil }
            // Only fixed Jam IDs may schedule a very near-future beat.
            // Revalidate after the bridge/serial queue; other games unchanged.
            let requestedJamDueEpochMs: Double?
            if self.jamIDs.contains(soundId),
               let due=call.getDouble("scheduledEpochMs"), due.isFinite {
                let now=Date().timeIntervalSince1970*1000.0
                requestedJamDueEpochMs = due >= now-160 && due <= now+350
                    ? due : nil
            } else {
                requestedJamDueEpochMs = nil
            }
            let requestedMidi: Int?
            if soundId == self.nativeMelodySoundID {
                guard let midi = call.getInt("midi"),
                      self.melodyMidiRange.contains(midi) else {
                    call.resolve(["accepted": false,
                                  "reason": "invalid-melody-midi"])
                    return
                }
                requestedMidi = midi
            } else {
                requestedMidi = nil
            }
            if let reason = self.unavailableReason() {
                self.forgetPlayback()
                call.resolve(["accepted": false, "reason": reason])
                return
            }
            let epoch = self.playbackEpochSnapshot()
            let enqueuedAt = ProcessInfo.processInfo.systemUptime
            let receivedAtEpochMs = Date().timeIntervalSince1970 * 1000
            let collisionAt = self.optionalEpochMs(call, key: "collisionEpochMs")
            let requestedAt = self.optionalEpochMs(call, key: "requestEpochMs")
            let eventId = self.timingId(call)
            let bridgeMs = self.safeAgeMs(receivedAtEpochMs, requestedAt)
            let collisionToRequestMs = self.safeAgeMs(
                requestedAt ?? -1, collisionAt)
            self.playbackQueue.async { [weak self] in
                guard let self = self else {
                    DispatchQueue.main.async {
                        call.resolve(["accepted": false, "reason": "unavailable"])
                    }
                    return
                }
                guard self.isCurrentPlaybackEpoch(epoch) else {
                    DispatchQueue.main.async {
                        call.resolve(["accepted": false, "reason": "stale"])
                    }
                    return
                }
                let startedAt = ProcessInfo.processInfo.systemUptime
                let queueMs = max(0, Int((startedAt - enqueuedAt) * 1000))
                let started: Bool
                let durationMs: Int
                let backend: String
                let resultReason: String
                if self.pcmEffectIDs.contains(soundId) ||
                   soundId == self.nativeSnakeOrbSoundID ||
                   soundId == self.nativePegSoundID ||
                   soundId == self.nativeMelodySoundID {
                    // One hot path for sample and note voice pools: choose a
                    // prestarted node and schedule only an in-memory buffer.
                    // No decode, allocation, engine start or Web fallback.
                    guard let engine = self.effectsEngine, engine.isRunning,
                          let nodes = self.effectNodes[soundId], !nodes.isEmpty,
                          nodes.allSatisfy({ $0.isPlaying }) else {
                        DispatchQueue.main.async {
                            call.resolve(["accepted": false,
                                          "reason": "pcm-not-preloaded"])
                        }
                        return
                    }
                    let buffer: AVAudioPCMBuffer?
                    if soundId == "jam-note" {
                        buffer = self.jamNoteBuffers[requestedJamNote ?? ""]
                    } else if soundId == "jam-pad" {
                        buffer = self.jamPadBuffers[requestedJamPad ?? ""]
                    } else if soundId == self.nativeSnakeOrbSoundID {
                        buffer = self.snakeOrbToneBuffers[requestedNoteIndex ?? -1]
                    } else if soundId == self.nativePegSoundID {
                        buffer = self.pegToneBuffers[requestedNoteIndex ?? -1]
                    } else if soundId == self.nativeMelodySoundID {
                        buffer = self.melodyToneBuffers[requestedMidi ?? -1]
                    } else {
                        buffer = self.effectBuffers[soundId]
                    }
                    guard let readyBuffer = buffer,
                          let node = self.nextWarmVoiceOnWorker(soundId: soundId) else {
                        DispatchQueue.main.async {
                            call.resolve(["accepted": false,
                                          "reason": "pcm-not-preloaded"])
                        }
                        return
                    }
                    node.volume = Float(volume)
                    // Use the AVAudioEngine host timeline for beat-aligned
                    // Jam buffers; never invoke JS callbacks at the audible
                    // deadline and hope the Capacitor bridge is instantaneous.
                    let remaining = requestedJamDueEpochMs.map { dueEpochMs in
                        let nowEpochMs = Date().timeIntervalSince1970 * 1000.0
                        return max(0.0, min(0.30,
                            (dueEpochMs - nowEpochMs) / 1000.0))
                    } ?? 0.0
                    let scheduledAt: AVAudioTime? = remaining >= 0.010
                        ? AVAudioTime(hostTime: mach_absolute_time() +
                            AVAudioTime.hostTime(forSeconds: remaining))
                        : nil
                    // A reused voice interrupts its old buffer; distinct
                    // voices keep a small bounded number of overlaps.
                    if self.jamIDs.contains(soundId),
                       let scheduledAt = scheduledAt {
                        node.scheduleBuffer(readyBuffer, at: scheduledAt,
                                            options: [.interrupts],
                                            completionHandler: nil)
                    } else {
                        // Every non-Jam game retains its original immediate
                        // PCM path, including the N3a hot-collision contract.
                        node.scheduleBuffer(readyBuffer, at: nil,
                                            options: [.interrupts],
                                            completionHandler: nil)
                    }
                    #if DEBUG
                    if let cue = jamTraceCue {
                        let actualEpochMs = Date().timeIntervalSince1970*1000.0
                        let leadMs = requestedJamDueEpochMs.map {
                            Int(($0-actualEpochMs).rounded())
                        } ?? -999
                        NSLog("[VerseJamTiming] pcm cue=\(cue) " +
                              "recipe=\(requestedJamNote ?? "?") " +
                              "leadMs=\(leadMs) queueMs=\(queueMs) " +
                              "hostScheduled=\(scheduledAt != nil) " +
                              "workerEpochMs=\(Int(actualEpochMs))")
                    }
                    #endif
                    started = true // scheduled only, not speaker confirmation
                    durationMs = Int(Double(readyBuffer.frameLength) /
                                     readyBuffer.format.sampleRate * 1000)
                    backend = soundId == self.nativePegSoundID
                        ? "avengine-tone"
                        : (soundId == self.nativeMelodySoundID
                            ? "avengine-melody" : (soundId == self.nativeSnakeOrbSoundID
                                ? "avengine-snake-orb" : "avengine-pcm"))
                    resultReason = "scheduled"
                } else {
                    guard let sound = self.players[soundId] else {
                        DispatchQueue.main.async {
                            call.resolve(["accepted": false,
                                          "reason": "not-preloaded"])
                        }
                        return
                    }
                    // Pilot unlock remains the independent native player
                    // reference case; do not regress its existing DEV sound.
                    sound.currentTime = 0
                    sound.volume = Float(volume)
                    started = sound.play()
                    durationMs = Int(sound.duration * 1000)
                    backend = "avfoundation-player"
                    resultReason = started ? "started" : "play-denied"
                }
                let nativeDispatchEpochMs = Date().timeIntervalSince1970 * 1000
                let playCallMs = max(0, Int(
                    (ProcessInfo.processInfo.systemUptime - startedAt) * 1000))
                let collisionToNativeDispatchMs =
                    self.safeAgeMs(nativeDispatchEpochMs, collisionAt)
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else {
                        call.resolve(["accepted": false, "reason": "unavailable"])
                        return
                    }
                    guard self.isCurrentPlaybackEpoch(epoch) else {
                        call.resolve(["accepted": false, "reason": "stale"])
                        return
                    }
                    self.lastNativePlayedSoundId = soundId
                    self.lastNativePlayQueueMs = queueMs
                    self.lastNativePlayCallMs = playCallMs
                    self.lastNativeBackend = backend
                    self.recordSoundTiming([
                        "eventId": eventId, "soundId": soundId,
                        "result": resultReason, "backend": backend,
                        "collisionToRequestMs": collisionToRequestMs,
                        "bridgeMs": bridgeMs, "queueMs": queueMs,
                        "playCallMs": playCallMs,
                        "collisionToNativeDispatchMs": collisionToNativeDispatchMs
                    ])
                    // Native scheduling/player request is NOT acoustic proof.
                    call.resolve([
                        "accepted": started,
                        "reason": resultReason,
                        "backend": backend,
                        "durationMs": durationMs,
                        "queueMs": queueMs,
                        "playCallMs": playCallMs
                    ])
                }
            }
        }
    }



    // N6q.4: correlate each original Verse Jam interstitial word's JS DOM
    // insertion epoch with Swift queue/PCM scheduling in Xcode Debug Console.
    // Never touches AVAudioSession/AVAudioEngine, media, child or verse data.
    // Release builds acknowledge fixed markers but produce no NSLog.
    @objc func traceJamTransition(_ call: CAPPluginCall) {
        onMain {
            guard let phase = call.getString("phase"),
                  ["stop-request","stop-complete","phrase-scheduled",
                   "word-visible","next-groove"].contains(phase),
                  let round = call.getInt("round"),
                  (1...4).contains(round),
                  let wordIndex = call.getInt("wordIndex"),
                  (-1...2).contains(wordIndex),
                  let jsEpochMs = call.getDouble("clientEpochMs"),
                  jsEpochMs.isFinite else {
                call.resolve(["ok":false,"reason":"invalid-jam-marker"])
                return
            }
            let nowEpochMs = Date().timeIntervalSince1970*1000.0
            guard abs(nowEpochMs-jsEpochMs) < 10_000 else {
                call.resolve(["ok":false,"reason":"stale-jam-marker"])
                return
            }
            #if DEBUG
            NSLog("[VerseJamTiming] word phase=\(phase) round=\(round) " +
                  "index=\(wordIndex) jsMs=\(Int(jsEpochMs)) " +
                  "nativeReceiveMs=\(Int(nowEpochMs))")
            #endif
            call.resolve(["ok":true])
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["stopped": false, "reason": "unavailable"])
                return
            }
            guard let soundId = self.requestedId(call) else {
                call.resolve(["stopped": false, "reason": "invalid-sound-id"])
                return
            }
            self.playbackQueue.async { [weak self] in
                guard let self = self else {
                    DispatchQueue.main.async {
                        call.resolve(["stopped": false, "reason": "unavailable"])
                    }
                    return
                }
                if self.pcmEffectIDs.contains(soundId) ||
                   soundId == self.nativeSnakeOrbSoundID ||
                   soundId == self.nativePegSoundID ||
                   soundId == self.nativeMelodySoundID {
                    // A paused/exited round tears down all prepared effect
                    // voices; the next Got It!/Resume must explicitly warm.
                    self.discardEffectsOnWorker()
                } else {
                    self.players.removeValue(forKey: soundId)?.stop()
                }
                DispatchQueue.main.async {
                    call.resolve(["stopped": true, "reason": "stopped"])
                }
            }
        }
    }

    // N7b DEV only. A separate microphone meter temporarily owns the SAME
    // OS AVAudioSession, but may not race the existing serial AVAudioEngine
    // output worker. It must request this barrier from the real DEV tap.
    // This method never setsCategory/mode or deactivates the audio session;
    // the DEV probe must restore it, and the next sound requires a NEW tap.
    @objc func devPrepareForMicrophone(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self,
                  Bundle.main.bundleIdentifier ==
                    "com.andydoane.biblozoo.audiotest",
                  UIApplication.shared.applicationState == .active,
                  AVAudioSession.sharedInstance().category == .soloAmbient else {
                call.resolve(["prepared":false,"reason":"unsafe-session-state"])
                return
            }
            self.needsGestureAfterInterruption = true
            self.hasGestureActivatedSession = false
            self.activationAttemptsThisForeground = 0
            self.lastActivationAt = nil
            self.appendTrace("mic-dev-handoff")
            self.forgetPlayback()
            // forgetPlayback enqueues disposal. This subsequent barrier
            // acknowledges that all earlier output work has actually stopped.
            self.playbackQueue.async {
                DispatchQueue.main.async {
                    call.resolve(["prepared":true,"reason":"output-worker-idle"])
                }
            }
        }
    }

    // N6o only: cancel the mower's 1250ms sound when a visual sweep ends
    // without discarding the entire 28-ID warm PCM bank (other sounds stay
    // playable). This never activates/deactivates AVAudioSession.
    @objc func stopEffect(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self=self,
                  let soundId=call.getString("soundId"),
                  (soundId == "scrub-mower" ||
                   soundId == "daily-question-correct" ||
                   soundId == "daily-question-incorrect" ||
                   soundId == "jam-group" ||
                   soundId == "jam-groove" ||
                   soundId == "ghost-spooky-group") else {
                call.resolve(["stopped":false,"reason":"invalid-sound-id"])
                return
            }
            let epoch=self.playbackEpochSnapshot()
            #if DEBUG
            if soundId == "jam-groove" {
                NSLog("[VerseJamTiming] groove-stop queued " +
                      "nativeEpochMs=\(Int(Date().timeIntervalSince1970*1000.0))")
            }
            #endif
            self.playbackQueue.async { [weak self] in
                guard let self=self,self.isCurrentPlaybackEpoch(epoch) else {
                    DispatchQueue.main.async {
                        call.resolve(["stopped":false,"reason":"stale"])
                    }
                    return
                }
                let group: [String]
                if soundId == "jam-group" {
                    group = ["jam-note", "jam-pad", "jam-drum-kick",
                             "jam-drum-snare", "jam-drum-hat",
                             "jam-drum-extra"] +
                        self.jamVoices.map { "jam-voice-" + $0 }
                } else if soundId == "jam-groove" {
                    // Don't stop/reprepare twelve note nodes while the
                    // "Great!" completion arpeggio is starting.
                    group = ["jam-pad", "jam-drum-kick", "jam-drum-snare",
                             "jam-drum-hat", "jam-drum-extra"] +
                        self.jamVoices.map { "jam-voice-" + $0 }
                } else if soundId == "ghost-spooky-group" {
                    group = ["ghost-spooky-1", "ghost-spooky-2",
                             "ghost-spooky-3", "ghost-spooky-4",
                             "ghost-spooky-5"]
                } else {
                    group = [soundId]
                }
                if let engine=self.effectsEngine,engine.isRunning {
                    for item in group {
                        guard let nodes=self.effectNodes[item] else { continue }
                        for node in nodes {
                            node.stop()
                            // Preserve the original N6o mower preparation and
                            // also rewarm Jam's shared note/chord pools.
                            if let buffer=self.effectBuffers[item] {
                                node.prepare(withFrameCount:buffer.frameLength)
                            } else if item == "jam-note" {
                                node.prepare(withFrameCount:60_000)
                            } else if item == "jam-pad" {
                                node.prepare(withFrameCount:500_000)
                            }
                            node.play()
                        }
                    }
                }
                #if DEBUG
                if soundId == "jam-groove" {
                    NSLog("[VerseJamTiming] groove-stop finished " +
                          "workerEpochMs=\(Int(Date().timeIntervalSince1970*1000.0))")
                }
                #endif
                DispatchQueue.main.async {
                    call.resolve(["stopped":true,"reason":"stopped"])
                }
            }
        }
    }

    // N5b.2 keeps DEV John 3:16 and adds only published local Learn
    // reference/full-verse files from the existing Capacitor public folder.
    // Do not accept caller-controlled URLs, arbitrary paths, chunks or Echo.
    private func nativeNarrationURL(for soundId: String) -> URL? {
        if soundId == narrationSoundID {
            return Bundle.main.url(
                forResource: narrationResourceName, withExtension: "mp3")
        }
        // Short Learn instruction prompts are static, application-owned
        // files. The JS caller only supplies a fixed allowlisted key.
        let instructions: [String: String] = [
            "listen": "instructions_listen",
            "meaning": "instructions_meaning",
            "chunks1": "instructions_chunks1",
            "chunks2": "instructions_chunks2",
            "echo1": "instructions_echo1",
            "echo_start": "instructions_echo_start",
            "remove": "instructions_remove",
            "final": "instructions_final",
            "games": "instructions_games"
        ]
        if soundId.hasPrefix("learn-instruction-") {
            let key = String(soundId.dropFirst("learn-instruction-".count))
            guard let filename = instructions[key] else { return nil }
            return Bundle.main.url(
                forResource: filename, withExtension: "mp3",
                subdirectory: "public/verse_audio")
        }

        let reference = soundId.hasPrefix("learn-ref-")
        let verse = soundId.hasPrefix("learn-verse-")
        let chunk = soundId.hasPrefix("learn-part-")
        guard reference || verse || chunk else { return nil }

        let verseId: String
        var chunkIndex: Int? = nil
        if chunk {
            let encoded = String(soundId.dropFirst("learn-part-".count))
            guard let separator = encoded.lastIndex(of: "-"),
                  let index = Int(encoded[encoded.index(after: separator)...]),
                  index >= 0, index <= 26 else { return nil }
            verseId = String(encoded[..<separator])
            chunkIndex = index
        } else {
            let prefix = reference ? "learn-ref-" : "learn-verse-"
            verseId = String(soundId.dropFirst(prefix.count))
        }

        guard publishedLearnVerseIDs.contains(verseId),
              let jsonURL = Bundle.main.url(
                forResource: verseId, withExtension: "json",
                subdirectory: "public/verse_data"),
              let data = try? Data(contentsOf: jsonURL),
              let json = (try? JSONSerialization.jsonObject(with: data))
                as? [String: Any],
              json["published"] as? Bool == true,
              json["verseId"] as? String == verseId else { return nil }

        let file: String
        if let index = chunkIndex {
            let parts = json["echoParts"] as? [String] ?? []
            let maximumPart = parts.isEmpty ? 1 : parts.count
            guard index <= maximumPart else { return nil }
            if index == 0 {
                file = verseId + "_ref"
            } else if parts.isEmpty {
                file = verseId
            } else {
                let ascii = 96 + index
                guard let suffix = UnicodeScalar(ascii) else { return nil }
                file = verseId + String(Character(suffix))
            }
        } else {
            file = verseId + (reference ? "_ref" : "")
        }
        return Bundle.main.url(
            forResource: file, withExtension: "mp3",
            subdirectory: "public/verse_audio")
    }

    // N5b.1: One fixed packaged John 3:16 narrator proves the long-form
    // player contract before touching child-facing Learn progress. All
    // methods execute on main, matching AVAudioPlayerDelegate's run loop.
    // These outcomes are player state, never proof of speaker audibility.
    private func stopNarrationPlayer(reason: String? = nil) {
        let oldId = narrationRequestId
        narrationPlayer?.delegate = nil
        narrationPlayer?.stop()
        narrationPlayer = nil
        narrationRequestId = nil
        narrationCurrentSoundID = nil
        narrationCompleted = false
        if let reason = reason, let oldId = oldId {
            notifyListeners("biblozooNarration", data: [
                "type": "invalidated",
                "requestId": oldId,
                "reason": reason
            ])
        }
    }

    private func narrationSnapshot() -> [String: Any] {
        guard let player = narrationPlayer,
              let requestId = narrationRequestId else {
            return ["prepared": false, "playing": false,
                    "ended": false, "positionMs": 0, "durationMs": 0]
        }
        let durationMs = max(0, Int(player.duration * 1000))
        let positionMs = max(0, min(durationMs, Int(player.currentTime * 1000)))
        return [
            "prepared": true,
            "soundId": narrationCurrentSoundID ?? narrationSoundID,
            "requestId": requestId,
            "playing": player.isPlaying,
            "ended": narrationCompleted,
            "positionMs": positionMs,
            "durationMs": durationMs,
            "foregroundEpoch": foregroundEpoch
        ]
    }

    @objc func prepareNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["prepared": false, "reason": "unavailable"]); return
            }
            guard let soundId = call.getString("soundId"),
                  let requestId = call.getInt("requestId"),
                  requestId > 0 else {
                call.resolve(["prepared": false, "reason": "invalid-request"]); return
            }
            if let reason = self.unavailableReason() {
                call.resolve(["prepared": false, "reason": reason]); return
            }
            guard let url = self.nativeNarrationURL(for: soundId) else {
                call.resolve(["prepared": false, "reason": "not-published-or-missing"])
                return
            }
            self.stopNarrationPlayer()
            do {
                let player = try AVAudioPlayer(contentsOf: url)
                player.delegate = self
                player.numberOfLoops = 0
                guard player.prepareToPlay(), player.duration > 0 else {
                    call.resolve(["prepared": false, "reason": "prepare-failed"])
                    return
                }
                self.narrationPlayer = player
                self.narrationCurrentSoundID = soundId
                self.narrationRequestId = requestId
                self.narrationCompleted = false
                call.resolve([
                    "prepared": true,
                    "reason": "prepared",
                    "soundId": soundId,
                    "requestId": requestId,
                    "durationMs": Int(player.duration * 1000),
                    "backend": "avfoundation-narration"
                ])
            } catch {
                call.resolve(["prepared": false, "reason": "decode-error"])
            }
        }
    }

    @objc func playNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["accepted": false, "reason": "unavailable"]); return
            }
            guard let requestId = call.getInt("requestId"),
                  requestId > 0, requestId == self.narrationRequestId,
                  let player = self.narrationPlayer else {
                call.resolve(["accepted": false, "reason": "stale-request"]); return
            }
            if let reason = self.unavailableReason() {
                self.stopNarrationPlayer(reason: reason)
                call.resolve(["accepted": false, "reason": reason]); return
            }
            // End is terminal for this request: only a fresh human DEV tap
            // may prepare another one. Do not silently restart completed audio.
            guard !self.narrationCompleted else {
                call.resolve(["accepted": false, "reason": "already-ended"]); return
            }
            let accepted = player.play()
            var state = self.narrationSnapshot()
            state["accepted"] = accepted
            state["reason"] = accepted ? "started" : "play-denied"
            call.resolve(state)
        }
    }

    @objc func pauseNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self,
                  let requestId = call.getInt("requestId"),
                  requestId > 0, requestId == self.narrationRequestId,
                  let player = self.narrationPlayer else {
                call.resolve(["paused": false, "reason": "stale-request"]); return
            }
            player.pause()
            var state = self.narrationSnapshot()
            state["paused"] = true
            call.resolve(state)
        }
    }

    @objc func seekNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self,
                  let requestId = call.getInt("requestId"),
                  requestId > 0, requestId == self.narrationRequestId,
                  let player = self.narrationPlayer else {
                call.resolve(["seeked": false, "reason": "stale-request"]); return
            }
            guard let positionMs = call.getInt("positionMs"),
                  positionMs >= 0, positionMs <= Int(player.duration * 1000) else {
                call.resolve(["seeked": false, "reason": "invalid-position"]); return
            }
            guard !self.narrationCompleted else {
                call.resolve(["seeked": false, "reason": "already-ended"]); return
            }
            // Seeking does not start playback or activate the iOS session.
            player.currentTime = Double(positionMs) / 1000
            var state = self.narrationSnapshot()
            state["seeked"] = true
            call.resolve(state)
        }
    }

    @objc func getNarrationState(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["prepared": false, "reason": "unavailable"]); return
            }
            call.resolve(self.narrationSnapshot())
        }
    }

    @objc func stopNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["stopped": false, "reason": "unavailable"]); return
            }
            // Reject a stale request instead of cutting a newer narrator.
            guard let requestId = call.getInt("requestId"),
                  requestId > 0, requestId == self.narrationRequestId else {
                call.resolve(["stopped": false, "reason": "stale-request"]); return
            }
            self.stopNarrationPlayer()
            call.resolve(["stopped": true, "reason": "stopped"])
        }
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        onMain { [weak self] in
            guard let self = self,
                  self.narrationPlayer === player,
                  let requestId = self.narrationRequestId,
                  UIApplication.shared.applicationState == .active,
                  !self.interrupted else { return }
            self.narrationCompleted = flag
            self.notifyListeners("biblozooNarration", data: [
                "type": flag ? "ended" : "failed",
                "requestId": requestId,
                "soundId": self.narrationCurrentSoundID ?? self.narrationSoundID,
                "positionMs": max(0, Int(player.currentTime * 1000)),
                "durationMs": max(0, Int(player.duration * 1000))
            ])
        }
    }


}
