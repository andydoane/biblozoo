const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const rootFiles = [
    "index.html",
    "app.js",
    "profiles.js",
    "daily_zoo_todo.js",
    "daily_zoo_todo_ui.js",
    "daily_questions_feed_game.js",
    "safe_word_scramble.js",
    "daily_question_generators.js",
    "daily_question_sessions.js",
    "daily_questions.js",
    "read_my_verse.js",
    "styles.css",
    "daily_zoo_todo.css",
    "profiles.css",
    "daily_questions.css",
    "daily_questions_feed_game.css",
    "read_my_verse.css",
    "site.webmanifest",
    "service-worker.js",
    "privacy_policy.html",
    "biblopet_name_blocklist.json",
    "pet_random_names.json",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
    "apple-touch-icon.png",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "favicon.ico"
];

const runtimeDirs = [
    "flashcards",
    "pet_images",
    "profile_pictures",
    "ui_audio",
    "utilities",
    "verse_audio",
    "verse_data",
    "verse_fonts",
    "verse_games",
    "verse_images",
    "verse_playground"
];

function copyEntry(name) {
    const source = path.join(root, name);
    const target = path.join(dist, name);

    if (!fs.existsSync(source)) {
        throw new Error(`Required runtime asset is missing: ${name}`);
    }

    fs.cpSync(source, target, { recursive: true });
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of rootFiles) copyEntry(file);
for (const dir of runtimeDirs) copyEntry(dir);

/*
 * N1: An early output guard must run on EVERY Capacitor HTML entrypoint,
 * including standalone games and Playground pages. Inject into the built
 * web assets, not the source HTML, so the normal web/PWA/Android deployment
 * stays unaffected. Never apply the gate to the original BibloZoo app ID.
 */
const NATIVE_AUDIO_TEST_ID = "com.andydoane.biblozoo.audiotest";
const NATIVE_ONLY_GATE_PATH = "verse_games/shared/native-only-ios-output.js";
const capConfig = JSON.parse(fs.readFileSync(path.join(root, "capacitor.config.json"), "utf8"));

function injectNativeOnlyAudioGuard() {
    if (capConfig.appId !== NATIVE_AUDIO_TEST_ID) return 0;
    const scriptFile = path.join(dist, NATIVE_ONLY_GATE_PATH);
    if (!fs.existsSync(scriptFile)) {
        throw new Error("N1 native-only output gate is missing from the app bundle.");
    }
    let injected = 0;
    const visit = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const filePath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                visit(filePath);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
                const before = fs.readFileSync(filePath, "utf8");
                if (before.includes("data-biblozoo-native-only-output")) {
                    throw new Error("N1 native-only output gate is already injected: " + filePath);
                }
                const relative = path.relative(path.dirname(filePath), scriptFile)
                    .split(path.sep).join("/");
                const source = relative.startsWith(".") ? relative : "./" + relative;
                const tag = '<script src="' + source +
                    '" data-biblozoo-native-only-output></script>';
                if (!/<head(?:\s[^>]*)?>/i.test(before)) {
                    throw new Error("N1 cannot guard HTML without a head: " + filePath);
                }
                const after = before.replace(/<head(?:\s[^>]*)?>/i,
                    (opening) => opening + "\n  " + tag);
                fs.writeFileSync(filePath, after);
                injected += 1;
            }
        }
    };
    visit(dist);
    return injected;
}

const protectedPages = injectNativeOnlyAudioGuard();
if (protectedPages) {
    console.log("N1 native-only output gate injected into " + protectedPages +
        " packaged HTML entrypoints (runtime check: Capacitor iOS only).");
}

if (!fs.existsSync(path.join(dist, "index.html"))) {
    throw new Error("Build failed: dist/index.html was not created.");
}

console.log("BibloZoo production build created in dist/.");
