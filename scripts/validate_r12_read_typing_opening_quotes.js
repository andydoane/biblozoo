"use strict";
// R12 / READ-01: execute the REAL Read My Verse chunk/typing module.
// Quotes move only as visual ownership between adjacent Typewriter/Keyboard
// chunks. Canonical text, original echoParts audio index/suffix, progression,
// other activities, and closing quotes must never change. No private data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const api = require("../read_my_verse.js");
const root = path.join(__dirname,"..");
const src = fs.readFileSync(path.join(root,"read_my_verse.js"),"utf8");
const workflow = fs.readFileSync(path.join(root,
  ".github/workflows/ios-prep-validation.yml"),"utf8");
assert(workflow.includes("node scripts/validate_r12_read_typing_opening_quotes.js"),
  "R12 must run in iOS integration CI");
const start = src.indexOf("  function groupTypingOpeningQuotes(");
const end = src.indexOf("  function getChunkAudioPath(", start);
assert(start>0 && end>start,"real visual-only quote helper is present");
const helper = src.slice(start,end);
assert(!helper.includes("getChunkAudioPath") &&
  !helper.includes("playCurrentChunk") &&
  !helper.includes("state.chunkAudioIndices"),
  "visual punctuation helper cannot own audio or progress");
assert(src.includes("originalChunks.join(\"\") === String(verse?.verseText || \"\")"),
  "non-canonical echoParts fallback must not be silently edited");
assert(src.includes("isTypingActivity(activityId)"),
  "only Typewriter and Keyboard receive punctuation grouping");
assert(src.includes("state.chunkAudioIndices =") &&
  src.includes("selectedChunks.audioIndices"),
  "source audio index mapping still comes from selected original parts");
assert(src.includes("state.revealCount =") &&
  src.includes("getInitialRevealCount(chunks[0])"),
  "typing begins at the first typeable character after prefix punctuation");
assert(src.includes("const nextCount = getNextRevealCount("),
  "typing advances by letters without requiring a quote tap");
assert(src.includes("getChunkAudioPath(\n      state.verseId,"),
  "spoken chunk playback still uses original numbered audio paths");

let checks=0;
function eq(actual,expected,message){assert.equal(actual,expected,message);checks++}
function same(actual,expected,message){assert.deepEqual(actual,expected,message);checks++}
function testTyping(verse,expected,description) {
  const raw=api.buildDisplayChunks(verse.verseText,verse.echoParts);
  eq(raw.join(""),verse.verseText,description+" raw retains canonical characters");
  for(const activity of ["typewriter","keyboard"]) {
    const s=api.selectActivityChunks(verse,activity);
    assert(s,description+" "+activity+" should be eligible");checks++;
    same(s.chunks,expected,description+" "+activity+" quote placement");
    eq(s.chunks.join(""),verse.verseText,
      description+" "+activity+" exact original punctuation and whitespace");
    same(s.audioIndices,expected.map((_,i)=>i),
      description+" "+activity+" original echoPart audio IDs");
    eq(s.usesChunkAudio,true,description+" "+activity+" stays chunk-narrated");
    s.chunks.forEach((chunk,index)=>{
      assert(chunk.trim().length>0,description+" has no empty visual chunk "+index);
      checks++;
      const start=api.getInitialRevealCount(chunk);
      eq(Array.from(chunk.slice(0,start)).some(api.isTypeableCharacter),false,
         description+" leading quote/space is automatically shown");
      let cursor=start, typed=0;
      while(cursor<Array.from(chunk).length){
        const next=api.getNextRevealCount(chunk,cursor);
        assert(next>cursor,description+" one character tap advances");
        checks++;
        const count=Array.from(chunk).slice(cursor,next)
          .filter(api.isTypeableCharacter).length;
        eq(count,1,description+" one typeable character per tap");
        cursor=next;typed++;
      }
      eq(typed,Array.from(chunk).filter(api.isTypeableCharacter).length,
         description+" no extra tap for quote or comma");
    });
  }
  // Non-typing activities must receive exactly the old unmodified grouping.
  for(const activity of ["chunk_sequence","tap_words_order","unscramble"]) {
    const other=api.selectActivityChunks(verse,activity);
    if(!other)continue; // some synthetic phrases are ineligible for games
    same(other.chunks,raw,description+" "+activity+" source segments unchanged");
    same(other.audioIndices,raw.map((_,i)=>i),
      description+" "+activity+" audio paths unchanged");
  }
}
const curly={
  id:"sample_quote",
  verseText:"They replied, ‘Believe in the Lord Jesus, and you will be saved.’",
  echoParts:["They replied","Believe in the Lord Jesus","and you will be saved."]
};
const curlyExpected=["They replied,"," ‘Believe in the Lord Jesus, ","and you will be saved.’"];
testTyping(curly,curlyExpected,"Acts 16:31 sample opening curly single");
const initiallyRaw=api.buildDisplayChunks(curly.verseText,curly.echoParts);
same(initiallyRaw,["They replied, ‘","Believe in the Lord Jesus, ","and you will be saved.’"],
  "raw echoParts-to-text mapping remains unchanged");
const second=api.selectActivityChunks(curly,"keyboard").chunks[1];
eq(api.getInitialRevealCount(second),2,
  "leading whitespace/open quote revealed at beginning of next chunk");
eq(second.slice(0,api.getNextRevealCount(second,2))," ‘B",
  "first Keyboard/Typewriter tap reveals the first letter, not the quote");
eq(api.getChunkAudioPath("sample_quote",0,3,true).endsWith("sample_quotea.mp3"),
  true,"first spoken file still numbered a");
eq(api.getChunkAudioPath("sample_quote",1,3,true).endsWith("sample_quoteb.mp3"),
  true,"next spoken file remains b");
eq(api.getChunkAudioPath("sample_quote",2,3,true).endsWith("sample_quotec.mp3"),
  true,"final spoken file remains c");

testTyping({
  id:"double_curly",
  verseText:"They replied, “Believe in the Lord.”",
  echoParts:["They replied","Believe in the Lord"]
},["They replied,"," “Believe in the Lord.”"],"curly double quote");
testTyping({
  id:"straight_double",
  verseText:'They replied, "Believe in the Lord."',
  echoParts:["They replied","Believe in the Lord"]
},["They replied,",' "Believe in the Lord."'],"straight double opening quote");
testTyping({
  id:"straight_single",
  verseText:"They replied 'Believe in the Lord.'",
  echoParts:["They replied","Believe in the Lord"]
},["They replied"," 'Believe in the Lord.'"],"straight single opening quote with space");
testTyping({
  id:"straight_after_comma",
  verseText:"They replied,'Believe in the Lord.'",
  echoParts:["They replied","Believe in the Lord"]
},["They replied,","'Believe in the Lord.'"],"straight quote after comma no whitespace");
testTyping({
  id:"paired_closing",
  verseText:"He said, 'Believe' and obey.",
  echoParts:["He said","Believe","and obey."]
},["He said,"," 'Believe' ","and obey."],
  "do not steal closing quote from second spoken phrase");
testTyping({
  id:"curly_closing",
  verseText:"He said, ‘Believe’ and obey.",
  echoParts:["He said","Believe","and obey."]
},["He said,"," ‘Believe’ ","and obey."],
  "do not steal curly closing quotation mark");
testTyping({
  id:"nested_quotes",
  verseText:"He said, “‘Believe’ is enough.”",
  echoParts:["He said","Believe","is enough."]
},["He said,"," “‘Believe’ ","is enough.”"],
  "consecutive nested curly opening quotes stay with next words");
testTyping({
  id:"already_quote_in_part",
  verseText:"He said, ‘Believe and trust.’",
  echoParts:["He said","‘Believe and trust.’"]
},["He said, ","‘Believe and trust.’"],
  "do not move quote already at next echoPart start");
testTyping({
  id:"closing_apostrophe",
  verseText:"He named Jesus' disciples.",
  echoParts:["He named Jesus","disciples."]
},["He named Jesus' ","disciples."],
  "word-ending apostrophe stays with preceding spoken phrase");
testTyping({
  id:"contraction",
  verseText:"Don't stop believing.",
  echoParts:["Don't stop","believing."]
},["Don't stop ","believing."],
  "internal apostrophe in contraction does not move");
testTyping({
  id:"unquoted",
  verseText:"They replied, believe and trust.",
  echoParts:["They replied","believe and trust."]
},["They replied, ","believe and trust."],
  "unquoted chunks and adjacent whitespace unaffected");

// No chunks/part mapping / one-chunk mode stay exactly as before.
for(const activity of ["typewriter","keyboard"]) {
 const all=api.selectActivityChunks(curly,activity,"one_chunk");
 same(all.chunks,[curly.verseText],activity+" one_chunk keeps whole original");
 same(all.audioIndices,[0],activity+" one_chunk uses one full-verse file");
 eq(all.usesChunkAudio,false,activity+" one_chunk selects full-verse narration");
 for(const mode of ["forced_short","forced_long"]){
   const original=api.buildDisplayChunks(curly.verseText,curly.echoParts);
   const indices=original.map((chunk,index)=>({index,length:Array.from(chunk).length}))
      .sort((a,b)=>mode==="forced_short" ? a.length-b.length : b.length-a.length);
   const forced=api.selectActivityChunks(curly,activity,mode);
   same(forced.audioIndices,[indices[0].index],
     activity+" "+mode+" must still select original spoken echoPart index");
   eq(forced.chunks.length,1,activity+" "+mode+" keeps one selected displayed phrase");
   eq(forced.usesChunkAudio,true,activity+" "+mode+" uses original numbered audio");
 }
 const fallback={
   verseText:"They replied, ‘Believe in the Lord.",
   echoParts:["They replied, ‘","Unavailable phrase"]
 };
 const raw=api.buildDisplayChunks(fallback.verseText,fallback.echoParts);
 same(api.selectActivityChunks(fallback,activity).chunks,raw,
   activity+" unmatched echoParts fallback is not rewritten");
 const noEcho={verseText:"‘Believe in the Lord.’",echoParts:[]};
 same(api.selectActivityChunks(noEcho,activity).chunks,[noEcho.verseText],
   activity+" no echoParts preserves original one-chunk text");
}
console.log("R12 actual Read Typewriter/Keyboard quote grouping and original audio mapping PASS ("+checks+" checks)");
