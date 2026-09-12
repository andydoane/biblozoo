const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const rootFiles = [
    "index.html",
    "app.js",
    "profiles.js",
    "styles.css",
    "profiles.css",
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
    "pet_images",
    "profile_pictures",
    "ui_audio",
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

if (!fs.existsSync(path.join(dist, "index.html"))) {
    throw new Error("Build failed: dist/index.html was not created.");
}

console.log("BibloZoo production build created in dist/.");