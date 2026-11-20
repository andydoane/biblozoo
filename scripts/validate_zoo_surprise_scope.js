#!/usr/bin/env node
"use strict";
/* Only 2 Home Zoo To-Do entries, 12 Practice Games and 4 non-Jam Playground
 * Welcome Back activities may roll Zoo Break / Pet Escape. Source contract
 * also protects the original owner-driven recovery and native audio policy. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const shared=read("verse_games/shared/welcome-back-return.js");
const shell=read("verse_games/shared/game-shell.js");
const app=read("app.js"), readMyVerse=read("read_my_verse.js");
const feed=read("daily_questions_feed_game.js");
const flashcards=read("flashcards/flashcards.js");
const questions=read("daily_questions.js");
const zoo=read("verse_games/shared/welcome-back-zoo-escape.js");
const games=["bible_bugs","dino_dash","foodslice","tower_bible",
  "traffic_tap","verse_invaders","verse_launch","verse_munch",
  "verse_scramble_neo","verse_snake","verse_splat","versey_bird"];
const playground=["ghost_writer","scripture_scrub","verse_typer","wheel_of_bible"];
let checks=0;
function match(s,re,msg){assert.match(s,re,msg);checks++;}
function noMatch(s,re,msg){assert.doesNotMatch(s,re,msg);checks++;}
for(const [id,s] of Object.entries({shared,shell,app,readMyVerse,feed,flashcards,questions,zoo})){
  new vm.Script(s,{filename:id+".js"});checks++;
}
match(shared,/useZooEscape = false,\s*allowDevForceZooEscape = false/,
  "shared Welcome Back is surprise-free and DEV-force-free by default");
match(shared,/\(useZooEscape \|\| forceDevEscape\) && root\.BibloZooZooEscape\?\.create/,
  "explicit opt-in still uses shared cue-first recovery");
match(shared,/preselectWelcomeSurprise = false/,
  "quiet owner cannot preselect a cue by default");
match(shared,/surpriseEnabled: true,\s*preselectWelcomeSurprise/,
  "selected eligible surprise uses original verified shared controller");
for(const id of games){
  const src=read("verse_games/"+id+"/game.js");
  const start=src.indexOf("window.BibloZooWelcomeBackReturn?.attach?.({");
  assert(start>=0,id+" uses original activity owner");checks++;
  const owner=src.slice(start,start+1800);
  match(owner,/useZooEscape: true/,id+" native and Web eligible");
  match(owner,/preselectWelcomeSurprise: true/,id+" pet cue-first on first gesture");
  match(owner,/onContinue:/,id+" real original sound owner kept for final LOCK GATE");
}
match(shell,/useZooEscape: options\.allowZooSurprises !== false,/,
  "native Playground no longer globally excludes random surprises");
match(shell,/allowDevForceZooEscape: options\.allowZooSurprises !== false,/,
  "Verse Jam's explicit exclusion also protects against DEV force");
match(shell,/preselectWelcomeSurprise: options\.allowZooSurprises !== false,/,
  "Playground keeps original cue-first proof");
for(const id of playground){
  const src=read("verse_playground/"+id+"/game.js");
  match(src,/attachPlaygroundWelcomeBack\?\.\(\{/,id+" retains Playground owner");
  noMatch(src,/allowZooSurprises: false/,id+" does not opt out");
}
match(read("verse_playground/verse_jam/game.js"),/allowZooSurprises: false/,
  "Verse Jam excluded even with DEV Force");
match(app,/learnZooEscape = window\.BibloZooZooEscape\.create\(\{[\s\S]*?surpriseEnabled: false,\s*recoveryOnly: true,\s*preselectWelcomeSurprise: false/,
  "Learn Chunks and Echo retain recovery but no surprises");
match(app,/recoveryOnly: true/, "Learn engine forbids failure-driven Zoo stages");
match(app,/if \(!isNativeLearnListenMode\(\) &&/,
  "Learn Listen keeps plain native recovery even with DEV Force");
match(readMyVerse,/readZooEscape = root\.BibloZooZooEscape\.create\(\{[\s\S]*?surpriseEnabled: false,\s*recoveryOnly: true,\s*preselectWelcomeSurprise: false/,
  "all eight Read activities keep their original recovery but no surprises");
match(feed,/runtime\.zooEscape = window\.BibloZooZooEscape\.create\(\{[\s\S]*?surpriseEnabled: false,\s*recoveryOnly: true,\s*preselectWelcomeSurprise: false/,
  "all four Feeding modes keep their audio owner without surprises");
match(flashcards,/BibloZooWelcomeBackReturn\.attach\(\{/,
  "Flashcards ordinary Welcome Back retained");
match(questions,/BibloZooWelcomeBackReturn\.attach\(\{/,
  "Daily Questions ordinary Welcome Back retained");
match(app,/appActivityReturn = window\.BibloZooWelcomeBackReturn\.attach\(\{/,
  "Hide, Final Recall and Zoo To-Do hub retain ordinary Welcome Back");
for(const [id,s] of [["Flashcards",flashcards],["Daily Questions",questions]]){
  noMatch(s,/useZooEscape: true|allowDevForceZooEscape: true/,
    id+" never overrides surprise-free default");
}
match(app,/const kind = policy\.choose\(id, "daily"\)/,
  "both Home entrypoints preserve existing profile daily odds");
assert.equal((app.match(/openZooTodoWithSurprise\(\(\) => openDailyTodoPreview\(/g)||[]).length,
  2,"only Home popup and Home button directly roll Daily surprises");checks++;
match(zoo,/if \(from === "welcome" && surpriseEnabled && !recoveryOnly && !isDeveloperRun\(\)\)/,
  "recovery cannot roll surprise for an excluded owner");
match(zoo,/if \(recoveryOnly \|\| \(surpriseEnabled && !isDeveloperRun\(\)\)\)/,
  "recovery-only failures never cascade into pets, even under DEV Force");
match(zoo,/if \(source === "welcome" && forceWelcomePetEscapeEnabled\(\)\)/,
  "DEV Force works only through an opted-in Welcome Back controller");
console.log("Zoo surprise entrypoint scope PASS: "+checks+" checks, 2 Home, 12 Practice, 4 Playground, others excluded");
