(function () {
  "use strict";

  const GAME_ID = "ghost_writer";
  const GAME_TITLE = "Ghost Writer";
  const GAME_ICON = "👻";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);
  const HELP_OVERLAY_ID = "ghostWriterHelpOverlay";
  const MENU_OVERLAY_ID = "ghostWriterGameMenuOverlay";

  const GAME_THEME = {
    bg: "linear-gradient(180deg, #101114 0%, #252733 48%, #111217 100%)",
    accent: "#d8d3ff",
    helpTitleBg: "#252733",
    helpTitleColor: "#ffffff",
    helpCloseBg: "#252733",
    helpCloseColor: "#ffffff"
  };

  const MODES = [
    { id: "beginner", label: "Beginner" },
    { id: "advanced", label: "Advanced" }
  ];

  const ENABLE_PUNCTUATION_RECORDER = false;
  const PUNCTUATION_RECORDER_LONG_PRESS_MS = 1500;
  const PUNCTUATION_RECORDER_VARIATIONS = 3;
  const PUNCTUATION_RECORDER_CHARS = [".", ",", ":", ";", "'", "\"", "-", "!", "?"];
  const BUILT_IN_PUNCTUATION_GLYPHS_URL = "./ghost-writer-punctuation-glyphs.json";
  const SOUND_BASE_PATH = "./ghost_writer_sounds/";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";
  const AUDIO_UNLOCK_SRC = "../../verse_audio/silence.mp3";

  const SOUND_FILES = {
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`,
    spooky1: `${SOUND_BASE_PATH}ghost_writer_spooky_1.mp3`,
    spooky2: `${SOUND_BASE_PATH}ghost_writer_spooky_2.mp3`,
    spooky3: `${SOUND_BASE_PATH}ghost_writer_spooky_3.mp3`,
    spooky4: `${SOUND_BASE_PATH}ghost_writer_spooky_4.mp3`,
    spooky5: `${SOUND_BASE_PATH}ghost_writer_spooky_5.mp3`
  };

  const GHOST_SPOOKY_SOUND_KEYS = [
    "spooky1",
    "spooky2",
    "spooky3",
    "spooky4",
    "spooky5"
  ];

  const SOUND_TUNING = {
    masterVolume: 0.82,
    volumes: {
      uiTap: 0.42,
      ghostSpooky: 0.34
    },
    spookyGapMs: {
      min: 900,
      max: 1150
    }
  };

  const SPOOKY_SOUND_OPTIONS = {
    on: { label: "On" },
    off: { label: "Off" }
  };
  

  const COLOR_PALETTE = {
    red: { label: "Red", value: "#ff5a51" },
    orange: { label: "Orange", value: "#ffa351" },
    yellow: { label: "Yellow", value: "#ffc751" },
    green: { label: "Green", value: "#a7cb6f" },
    teal: { label: "Blue", value: "#40b9c5" },
    purple: { label: "Purple", value: "#7f66c6" },
    darkGray: { label: "Dark Gray", value: "#333333" },
    lightGray: { label: "White", value: "#ffffff" },
    brown: { label: "Brown", value: "#a36f44" }
  };


  const BACKGROUNDS = {
    ghost: {
      label: "Ghost Black",
      kind: "special",
      value: "#101114",
      cardClass: "",
      texture: "flat"
    },
    red: { ...COLOR_PALETTE.red, kind: "solid", cardClass: "" },
    orange: { ...COLOR_PALETTE.orange, kind: "solid", cardClass: "" },
    yellow: { ...COLOR_PALETTE.yellow, kind: "solid", cardClass: "" },
    green: { ...COLOR_PALETTE.green, kind: "solid", cardClass: "" },
    teal: { ...COLOR_PALETTE.teal, kind: "solid", cardClass: "" },
    purple: { ...COLOR_PALETTE.purple, kind: "solid", cardClass: "" },
    darkGray: { ...COLOR_PALETTE.darkGray, kind: "solid", cardClass: "" },
    lightGray: { ...COLOR_PALETTE.lightGray, kind: "solid", cardClass: "" },
    brown: { ...COLOR_PALETTE.brown, kind: "solid", cardClass: "" },

    chalkboard: {
      label: "Chalkboard",
      kind: "special",
      value: "#15352d",
      cardClass: "is-chalkboard",
      texture: "chalkboard"
    },
    paper: {
      label: "Paper",
      kind: "special",
      value: "#fff8e8",
      cardClass: "is-paper",
      texture: "paper"
    },
    notebook: {
      label: "Notebook Paper",
      kind: "special",
      value: "#fbfdff",
      cardClass: "",
      texture: "notebook"
    },
    starryNight: {
      label: "Starry Night",
      kind: "special",
      value: "#071126",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_starry_night.png"
    },
    purpleMist: {
      label: "Purple Mist",
      kind: "special",
      value: "#21142f",
      cardClass: "",
      texture: "purpleMist"
    },
    treasureMap: {
      label: "Treasure Map",
      kind: "special",
      value: "#d9b874",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_treasure_map.png"
    },
    rainbow: {
      label: "Rainbow",
      kind: "special",
      value: "#f8f1ff",
      cardClass: "",
      texture: "rainbow"
    },
    wood: {
      label: "Wood",
      kind: "special",
      value: "#8d5a32",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_wood.jpg"
    },
    moss: {
      label: "Moss",
      kind: "special",
      value: "#5f8f24",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_moss.jpg"
    },
    clouds: {
      label: "Clouds",
      kind: "special",
      value: "#bde5ff",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_clouds.jpg"
    },
    sand: {
      label: "Sand",
      kind: "special",
      value: "#f2c77d",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_sand.jpg"
    },
    ice: {
      label: "Ice",
      kind: "special",
      value: "#cdefff",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_ice.jpg"
    },
    rain: {
      label: "Rain",
      kind: "special",
      value: "#0d326b",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_rain.jpg"
    },
    aurora: {
      label: "Aurora",
      kind: "special",
      value: "#123461",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_aurora.jpg"
    },
    snow: {
      label: "Snow",
      kind: "special",
      value: "#e8f6ff",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_snow.jpg"
    },
    water: {
      label: "Water",
      kind: "special",
      value: "#21aee3",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_water.jpg"
    },
    crackedStone: {
      label: "Cracked Stone",
      kind: "special",
      value: "#787d83",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_cracked_stone.png"
    },
    grass: {
      label: "Green Grass",
      kind: "special",
      value: "#7dbc53",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_grass.png"
    },
    aquaRed: {
      label: "Swoosh Red",
      kind: "special",
      value: "#d85b61",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_aqua_red.jpg"
    },
    aquaOrange: {
      label: "Swoosh Orange",
      kind: "special",
      value: "#d98b4c",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_aqua_orange.jpg"
    },
    aquaYellow: {
      label: "Swoosh Yellow",
      kind: "special",
      value: "#d8ba54",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_aqua_yellow.jpg"
    },
    aquaGreen: {
      label: "Swoosh Green",
      kind: "special",
      value: "#5eac74",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_aqua_green.jpg"
    },
    aquaBlue: {
      label: "Swoosh Blue",
      kind: "special",
      value: "#4d8fcb",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_aqua_blue.jpg"
    },
    aquaPurple: {
      label: "Swoosh Purple",
      kind: "special",
      value: "#8f71c8",
      cardClass: "",
      texture: "image",
      imageSrc: "./ghost_writer_images/ghost_writer_bg_aqua_purple.jpg"
    }
  };

  const TEXT_COLORS = {
    ...COLOR_PALETTE,
    rainbow: { label: "Rainbow", value: "rainbow" }
  };

  const RAINBOW_INKS = [
    "#ff5a51",
    "#ffa351",
    "#ffc751",
    "#a7cb6f",
    "#40b9c5",
    "#7f66c6"
  ];



  const SPEEDS = {
    slow: { label: "Slow", multiplier: 1.8, pauseMultiplier: 1.8 },
    normal: { label: "Normal", multiplier: .85, pauseMultiplier: .85 },
    fast: { label: "Fast", multiplier: .32, pauseMultiplier: .35 }
  };

  const THICKNESS = {
    thin: { label: "Thin", multiplier: .78 },
    normal: { label: "Normal", multiplier: 1 },
    thick: { label: "Thick", multiplier: 1.35 },
    superThick: { label: "Super Thick", multiplier: 1.9 }
  };

  const BORDER_STYLES = {
    none: { label: "None" },
    solid: { label: "Solid" },
    dashed: { label: "Dashed" },
    dotted: { label: "Dotted" },
    double: { label: "Double" },
    glow: { label: "Glow" },
    doodleHeart: { label: "Doodle Hearts" },
    doodleStar: { label: "Doodle Stars" },
    doodleCross: { label: "Doodle Crosses" },
    doodleFlower: { label: "Doodle Flowers" },
    doodleFish: { label: "Doodle Fish" },
    doodleBolt: { label: "Doodle Bolts" },
    doodleFace: { label: "Doodle Faces" },
    doodleCloud: { label: "Doodle Clouds" },
    doodleSwirl: { label: "Doodle Swirls" },
    doodleSquiggle: { label: "Doodle Squiggles" },
    doodleAsterisk: { label: "Doodle Asterisks" },
    doodleBible: { label: "Doodle Bibles" },
    doodleCrown: { label: "Doodle Crowns" },
    doodleFlame: { label: "Doodle Flames" },
    doodleLeaf: { label: "Doodle Leaves" }
  };

  const DOODLE_BORDER_SVGS = {
    doodleHeart: {
      label: "Doodle Hearts",
      src: "./ghost_writer_images/ghost_writer_border_heart.svg"
    },
    doodleStar: {
      label: "Doodle Stars",
      src: "./ghost_writer_images/ghost_writer_border_star.svg"
    },
    doodleCross: {
      label: "Doodle Crosses",
      src: "./ghost_writer_images/ghost_writer_border_cross.svg"
    },
    doodleFlower: {
      label: "Doodle Flowers",
      src: "./ghost_writer_images/ghost_writer_border_flower.svg"
    },
    doodleFish: {
      label: "Doodle Fish",
      src: "./ghost_writer_images/ghost_writer_border_fish.svg"
    },
    doodleBolt: {
      label: "Doodle Bolts",
      src: "./ghost_writer_images/ghost_writer_border_bolt.svg"
    },
    doodleFace: {
      label: "Doodle Faces",
      src: "./ghost_writer_images/ghost_writer_border_face.svg"
    },
    doodleCloud: {
      label: "Doodle Clouds",
      src: "./ghost_writer_images/ghost_writer_border_cloud.svg"
    },
    doodleSwirl: {
      label: "Doodle Swirls",
      src: "./ghost_writer_images/ghost_writer_border_swirl.svg"
    },
    doodleSquiggle: {
      label: "Doodle Squiggles",
      src: "./ghost_writer_images/ghost_writer_border_squiggle.svg"
    },
    doodleAsterisk: {
      label: "Doodle Asterisks",
      src: "./ghost_writer_images/ghost_writer_border_asterisk.svg"
    },
    doodleBible: {
      label: "Doodle Bibles",
      src: "./ghost_writer_images/ghost_writer_border_bible.svg"
    },
    doodleCrown: {
      label: "Doodle Crowns",
      src: "./ghost_writer_images/ghost_writer_border_crown.svg"
    },
    doodleFlame: {
      label: "Doodle Flames",
      src: "./ghost_writer_images/ghost_writer_border_flame.svg"
    },
    doodleLeaf: {
      label: "Doodle Leaves",
      src: "./ghost_writer_images/ghost_writer_border_leaf.svg"
    }
  };

  const BORDER_THICKNESS = {
    thin: { label: "Thin", size: 4 },
    medium: { label: "Medium", size: 8 },
    thick: { label: "Thick", size: 13 }
  };

  const PLAYBACK_TOOL = {
    baseRotationDeg: -8,
    idleWobbleDeg: 1.2,
    directionWiggleDeg: 4.5,
    directionWiggleDecay: .82,
    visible: true
  };

  const PLAYBACK_TOOLS = {
    pencil: {
      label: "Pencil",
      src: "./ghost_writer_images/ghost_writer_pencil.png",
      className: "is-pencil-tool",
      baseRotationDeg: -8
    },
    chalk: {
      label: "Chalk",
      src: "./ghost_writer_images/ghost_writer_chalk.png",
      className: "is-chalk-tool",
      baseRotationDeg: -8
    },
    crayon: {
      label: "Crayon",
      src: "",
      className: "is-crayon-tool",
      baseRotationDeg: -8
    }
  };

  const CRAYON_TOOL_IMAGES = {
    red: "./ghost_writer_images/ghost_writer_crayon_red.png",
    orange: "./ghost_writer_images/ghost_writer_crayon_orange.png",
    yellow: "./ghost_writer_images/ghost_writer_crayon_yellow.png",
    green: "./ghost_writer_images/ghost_writer_crayon_green.png",
    teal: "./ghost_writer_images/ghost_writer_crayon_blue.png",
    purple: "./ghost_writer_images/ghost_writer_crayon_purple.png",
    darkGray: "./ghost_writer_images/ghost_writer_crayon_gray.png",
    lightGray: "./ghost_writer_images/ghost_writer_crayon_white.png",
    brown: "./ghost_writer_images/ghost_writer_crayon_brown.png",
    rainbow: "./ghost_writer_images/ghost_writer_crayon_rainbow.png"
  };

  const VAPOR_LEVELS = {
    off: {
      label: "Off",
      enabled: false,
      max: 0,
      spawnDistance: Infinity,
      alpha: 0,
      radius: 0,
      radiusJitter: 0,
      life: 0,
      lifeJitter: 0,
      driftY: 0
    },

    normal: {
      label: "Normal",
      enabled: true,
      max: 54,
      spawnDistance: 5,
      alpha: .18,
      radius: 7,
      radiusJitter: 13,
      life: 520,
      lifeJitter: 260,
      driftY: 18
    },
    spooky: {
      label: "Spooky",
      enabled: true,
      max: 86,
      spawnDistance: 3,
      alpha: .26,
      radius: 10,
      radiusJitter: 18,
      life: 760,
      lifeJitter: 360,
      driftY: 26
    }
  };

  const PLAYBACK_PAUSES = {
    word: 115,
    punctuation: 175,
    line: 330
  };

  const LINE_SPACING = {
    base: 1.24,
    max: 1.56,
    extraSpaceUse: .72
  };

  const EXPORT_IMAGE = {
    filenamePrefix: "ghost-writer"
  };

  const EXPORT_VIDEO = {
    fps: 30,
    endHoldMs: 700,
    mimeTypes: [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ]
  };

  const EXPORT_SIZES = {
    square: {
      label: "Square",
      width: 1080,
      height: 1080,
      filenameLabel: "square"
    },
    phone: {
      label: "Tall",
      width: 1290,
      height: 2796,
      filenameLabel: "tall"
    },
    wide: {
      label: "Wide",
      width: 1920,
      height: 1080,
      filenameLabel: "wide"
    }
  };

  const GUIDE_FIT = {
    letterWidth: .86,
    letterHeight: .88,
    symbolWidth: .68,
    skinnySymbolWidth: .42,
    symbolHeight: .76,
    maxLetterSize: 1.28,
    maxSymbolSize: 1.18,
    minSize: .32
  };

  const CENTERED_TRAINING_GUIDES = new Set([".", ",", ":", ";", "'", '"', "-"]);

  const GUIDE_RENDER_PROFILES = {
    ".": { yOffset: -.24 },
    ",": { yOffset: -.34 },
    ":": { yOffset: -.02 },
    ";": { yOffset: -.08 },
    "'": { yOffset: .10 },
    "\"": { yOffset: .10 },
    "-": { yOffset: 0 }
  };

  const REFERENCE_DECORATION_STYLES = ["box", "divider", "underline", "loop", "cloud", "stars"];

  const REFERENCE_DECORATION_OPTIONS = {
    box: { label: "Box" },
    divider: { label: "Squiggle Divider" },
    underline: { label: "Scribble Underline" },
    loop: { label: "Loopy Circle" },
    cloud: { label: "Cloud Puff" },
    stars: { label: "Stars" }
  };

  const REFERENCE_DECORATION = {
    refScale: .62,
    beforeGapLines: .28,
    zoneHeightLines: 1,
    dividerExtraLines: .28,
    boxPadX: .40,
    boxPadY: .16,
    cloudPadX: .70,
    cloudPadY: .32,
    loopPadX: .68,
    loopPadY: .28,
    starPadX: 1.25
  };

  const REFERENCE_OUTLINE_CACHE = new Map();

  const CLOUD_SVG_VIEWBOX = {
    width: 105.83333,
    height: 41.275
  };

  const CLOUD_SVG_PATH = `M 57.806218,0.29969428 A 6.4331029,6.4259246 0 0 0 52.259651,3.4978984 6.4331029,6.4259246 0 0 0 47.664355,1.5671433 6.4331029,6.4259246 0 0 0 41.750129,5.4909076 6.4331029,6.4259246 0 0 0 35.882001,1.6938834 6.4331029,6.4259246 0 0 0 30.94335,4.0142793 6.4331029,6.4259246 0 0 0 27.231677,2.8345825 6.4331029,6.4259246 0 0 0 21.674078,6.052962 6.4331029,6.4259246 0 0 0 16.337529,3.2148222 6.4331029,6.4259246 0 0 0 9.9043757,9.6406787 a 6.4331029,6.4259246 0 0 0 0.037132,0.5191163 6.4331029,6.4259246 0 0 0 -0.9054294,-0.06479 6.4331029,6.4259246 0 0 0 -6.4330358,6.425994 6.4331029,6.4259246 0 0 0 0.9753071,3.390299 6.4331029,6.4259246 0 0 0 -2.87637701,5.347037 6.4331029,6.4259246 0 0 0 6.43303601,6.425994 6.4331029,6.4259246 0 0 0 1.9264593,-0.302748 6.4331029,6.4259246 0 0 0 -0.045327,0.633098 6.4331029,6.4259246 0 0 0 6.4331651,6.425867 6.4331029,6.4259246 0 0 0 5.891187,-3.862004 6.4331029,6.4259246 0 0 0 5.891167,3.862004 6.4331029,6.4259246 0 0 0 3.643521,-1.143801 6.4331029,6.4259246 0 0 0 5.006813,2.411249 6.4331029,6.4259246 0 0 0 6.165018,-4.595119 6.4331029,6.4259246 0 0 0 5.617326,3.327671 6.4331029,6.4259246 0 0 0 4.171635,-1.538755 6.4331029,6.4259246 0 0 0 5.970228,4.073651 6.4331029,6.4259246 0 0 0 6.164901,-4.595236 6.4331029,6.4259246 0 0 0 5.617453,3.327788 6.4331029,6.4259246 0 0 0 5.0068,-2.411249 6.4331029,6.4259246 0 0 0 3.643514,1.143801 6.4331029,6.4259246 0 0 0 5.256744,-2.74482 6.4331029,6.4259246 0 0 0 5.256747,2.74482 6.4331029,6.4259246 0 0 0 6.389673,-5.818999 6.4331029,6.4259246 0 0 0 3.556285,1.078563 6.4331029,6.4259246 0 0 0 6.433042,-6.425867 6.4331029,6.4259246 0 0 0 -3.71218,-5.822077 6.4331029,6.4259246 0 0 0 2.20702,-4.843177 6.4331029,6.4259246 0 0 0 -6.43304,-6.425977 6.4331029,6.4259246 0 0 0 -0.745953,0.05334 A 6.4331029,6.4259246 0 0 0 90.021227,4.1021007 6.4331029,6.4259246 0 0 0 84.604008,7.0635241 6.4331029,6.4259246 0 0 0 78.238866,1.5672025 6.4331029,6.4259246 0 0 0 73.238008,3.9705315 6.4331029,6.4259246 0 0 0 69.588552,2.8346416 6.4331029,6.4259246 0 0 0 64.17134,5.7963219 6.4331029,6.4259246 0 0 0 57.806198,0.29975343 Z`;

  const CLOUD_LONG_SVG_VIEWBOX = {
    width: 169,
    height: 45.275
  };

  const CLOUD_LONG_SVG_PATH = `M 99.343744,1.9584738 A 7.2894396,5.4769513 82.382513 0 0 95.298825,5.0912862 6.051927,7.263244 6.8601341 0 0 90.261715,2.1362081 6.051927,7.263244 6.8601341 0 0 84.691403,6.80613 c -1.159535,-1.7517328 -3.14581,-2.8866188 -5.367188,-2.8867188 -1.944957,0.00479 -3.782469,0.88925 -5,2.4042969 C 73.251045,5.5844734 71.977429,5.1875235 70.673825,5.1869894 68.480741,5.1873292 66.44011,6.3048403 65.257809,8.14988 64.79596,4.9935759 62.085979,2.6519946 58.892575,2.6518331 56.606102,2.6575558 54.494184,3.876145 53.3457,5.8510519 52.135991,4.6166783 50.479297,3.9198889 48.749996,3.9194112 46.169105,3.9238789 43.840893,5.4686925 42.835934,7.8432394 41.79926,5.5335949 39.50273,4.0471461 36.968746,4.0463644 35.059365,4.0494097 33.249197,4.8994463 32.029293,6.3666769 30.943836,5.5997717 29.647896,5.187653 28.318356,5.1869894 26.023783,5.1929649 23.90511,6.419673 22.759762,8.4057394 21.564487,6.6316678 19.564631,5.568007 17.423825,5.5678488 13.870927,5.567821 10.990268,8.4446965 10.990231,11.99363 c 0.0053,0.173468 0.01772,0.347064 0.03711,0.519531 -0.299906,-0.04287 -0.603289,-0.06418 -0.90625,-0.06445 -3.5529053,3.7e-5 -6.4316792,2.87684 -6.4316408,6.425781 0.00213,1.198851 0.3392631,2.373529 0.9746094,3.390625 -1.7942437,1.189171 -2.8744591,3.194832 -2.8769531,5.345703 -3.84e-5,3.548941 2.8806881,6.425745 6.4335937,6.425782 0.653824,-0.0025 1.3027614,-0.104617 1.9257818,-0.302735 -0.02554,0.210158 -0.04026,0.423116 -0.04492,0.634766 3.2e-5,3.548942 2.880688,6.425815 6.433594,6.425781 2.557719,-0.003 4.870106,-1.520589 5.890625,-3.863281 1.020516,2.342685 3.334867,3.860229 5.892578,3.863281 1.30242,-0.0041 2.571987,-0.403638 3.642578,-1.144531 1.217271,1.519635 3.059436,2.405235 5.007812,2.410156 2.84643,-6.46e-4 5.353089,-1.868338 6.164063,-4.59375 1.127649,2.046732 3.278381,3.321348 5.617187,3.328125 1.529455,-0.0013 3.008664,-0.547107 4.171876,-1.539062 0.965665,2.452182 3.332692,4.06556 5.970703,4.072265 2.846417,-7.13e-4 5.353143,-1.868334 6.164062,-4.59375 1.12764,2.046816 3.27831,3.319418 5.617188,3.326172 1.948373,-0.0049 3.790544,-0.890525 5.007812,-2.410156 1.070589,0.740891 2.340161,1.14047 3.642578,1.144531 2.095175,-0.0053 4.05759,-1.03067 5.257813,-2.746094 l 0.06055,-1.5625 a 7.2894396,5.4769513 82.382512 0 0 5.171875,5.291016 7.2894396,5.4769513 82.382512 0 0 4.267578,-2.232422 6.051927,7.263244 6.8601341 0 0 5.42383,3.736328 6.051927,7.263244 6.8601341 0 0 5.537106,-4.560546 c 1.19793,1.29639 2.8913,2.068968 4.70313,2.074218 1.52945,-0.0013 3.00866,-0.547107 4.17187,-1.539062 0.96567,2.452182 3.33074,4.06556 5.96875,4.072265 2.84642,-7.13e-4 5.3551,-1.868334 6.16602,-4.59375 1.12764,2.046816 3.27831,3.319418 5.61718,3.326172 1.94838,-0.0049 3.7886,-0.890525 5.00586,-2.410156 1.07059,0.740891 2.34211,1.14047 3.64454,1.144531 2.09515,-0.0053 4.05563,-1.030672 5.25585,-2.746094 1.20022,1.715424 3.16264,2.740818 5.25782,2.746094 3.3119,-0.0075 6.07587,-2.526883 6.38867,-5.820312 1.05338,0.701187 2.29079,1.07593 3.55664,1.078125 3.55286,-3.4e-5 6.43356,-2.876888 6.43359,-6.425781 -3e-4,-2.496167 -1.44846,-4.764543 -3.71289,-5.820313 1.40174,-1.219985 2.20655,-2.986643 2.20703,-4.84375 3e-5,-3.548936 -2.87874,-6.425746 -6.43164,-6.425781 -0.24948,0.0033 -0.49869,0.02052 -0.74609,0.05273 -0.15611,-3.4317927 -2.98857,-6.1345025 -6.42774,-6.1347655 -2.19302,2.813e-4 -4.23365,1.1179469 -5.41601,2.9628906 -0.46196,-3.156206 -3.17192,-5.4979032 -6.36523,-5.4980469 -1.94497,0.00479 -3.78443,0.88925 -5.00196,2.4042969 -1.07317,-0.7392347 -2.34484,-1.1361846 -3.64844,-1.1367187 -2.19308,3.398e-4 -4.23566,1.1178509 -5.41796,2.9628906 -0.46185,-3.1563041 -3.17184,-5.4978854 -6.36524,-5.4980469 -2.28648,0.00572 -4.39644,1.2243119 -5.54492,3.1992188 -1.20971,-1.2343736 -2.8664,-1.931163 -4.5957,-1.9316407 -1.90647,0.0033 -3.67185,0.8521394 -4.8711,2.25 a 7.2894396,5.4769513 82.382513 0 0 -4.81054,-4.2011718 7.2894396,5.4769513 82.382513 0 0 -0.720706,-0.00977 z`;

  const CLOUD_SUPER_LONG_SVG_VIEWBOX = {
    width: 220,
    height: 45.275
  };

  const CLOUD_SUPER_LONG_SVG_PATH = `M 118.26758,1.4472656 A 7.5747123,7.5747123 0 0 0 111.04297,6.7734375 6.460784,7.5747123 0 0 0 105.12305,2.2285156 6.460784,7.5747123 0 0 0 99.558592,5.9863281 7.4633193,6.349391 0 0 0 92.869139,2.4511719 7.4633193,6.349391 0 0 0 85.773436,6.9257812 V 6.8066406 C 84.613901,5.0549078 82.627627,3.9200219 80.406249,3.9199219 c -1.944957,0.00479 -3.782469,0.8892499 -5,2.4042969 C 74.333079,5.5849841 73.059462,5.1880341 71.755858,5.1875 69.562774,5.1878398 67.522143,6.3053509 66.339842,8.1503906 65.877993,4.9940865 63.168012,2.6525051 59.974608,2.6523438 57.688135,2.6580663 55.576217,3.8766556 54.427733,5.8515625 53.218024,4.6171889 51.561331,3.9203996 49.83203,3.9199219 47.251139,3.9243896 44.922926,5.4692031 43.917968,7.84375 42.881293,5.5341055 40.584764,4.0476567 38.05078,4.046875 36.141399,4.0499203 34.331231,4.8999569 33.111327,6.3671875 32.02587,5.6002823 30.729929,5.1881636 29.400389,5.1875 27.105816,5.1934755 24.987144,6.4201836 23.841796,8.40625 22.646521,6.6321784 20.646664,5.5685176 18.505858,5.5683594 c -3.552898,-2.78e-5 -6.433557,2.8768469 -6.433594,6.4257816 0.0053,0.173468 0.01772,0.347064 0.03711,0.519531 -0.299906,-0.04287 -0.603289,-0.06418 -0.90625,-0.06445 -3.5529057,3.7e-5 -6.431679,2.87684 -6.4316406,6.425781 0.00213,1.198851 0.3392631,2.373529 0.9746094,3.390625 -1.7942437,1.189171 -2.8744591,3.194832 -2.8769531,5.345703 -3.84e-5,3.548941 2.8806881,6.425744 6.4335937,6.425781 0.653824,-0.0025 1.3027616,-0.104616 1.9257806,-0.302734 -0.02554,0.210158 -0.04026,0.423116 -0.04492,0.634766 3.4e-5,3.548942 2.880688,6.425815 6.433594,6.425781 2.557719,-0.003 4.870106,-1.520589 5.890625,-3.863281 1.020516,2.342685 3.334867,3.860229 5.892578,3.863281 1.30242,-0.0041 2.571986,-0.403638 3.642579,-1.144531 1.217269,1.519635 3.059436,2.405235 5.007812,2.410156 2.84643,-6.46e-4 5.353088,-1.868338 6.164062,-4.59375 1.127649,2.046732 3.278382,3.321348 5.617188,3.328125 1.529455,-0.0013 3.008663,-0.547108 4.171875,-1.539063 0.965665,2.452182 3.332692,4.065561 5.970703,4.072266 2.846417,-7.13e-4 5.353144,-1.868334 6.164063,-4.59375 1.12764,2.046816 3.278309,3.319418 5.617187,3.326172 1.948373,-0.0049 3.790545,-0.890525 5.007813,-2.410156 1.070589,0.740891 2.340161,1.14047 3.642578,1.144531 1.797486,-0.0045 3.465316,-0.79405 4.669922,-2.091797 A 6.266563,7.6628113 15.880736 0 0 90.17578,42.5 a 6.266563,7.6628113 15.880736 0 0 5.808594,-3.648438 6.4774103,7.6781408 18.386585 0 0 4.611326,2.535157 6.4774103,7.6781408 18.386585 0 0 5.81445,-3.34961 7.3112435,7.975303 52.217711 0 0 6.63282,4.707032 7.3112435,7.975303 52.217711 0 0 7.86328,-5.236329 6.4774103,7.6781408 18.386585 0 0 5.57031,4.601563 6.4774103,7.6781408 18.386585 0 0 6.0332,-3.693359 6.2966144,7.6482688 79.802849 0 0 6.44141,3.603515 6.2966144,7.6482688 79.802849 0 0 5.42969,-1.722656 c 1.11237,1.945778 2.99552,3.085574 5.04297,2.984375 2.39007,-0.124302 4.5576,-1.909555 5.53711,-4.560547 1.19793,1.29639 2.89129,2.068969 4.70312,2.074219 1.52945,-0.0013 3.00867,-0.547108 4.17188,-1.539063 0.96567,2.452182 3.33074,4.065561 5.96875,4.072266 2.84642,-7.13e-4 5.35509,-1.868334 6.16601,-4.59375 1.12764,2.046816 3.27832,3.319418 5.61719,3.326172 1.94838,-0.0049 3.7886,-0.890525 5.00586,-2.410156 1.07059,0.740891 2.3421,1.14047 3.64453,1.144531 2.09515,-0.0053 4.05564,-1.030672 5.25586,-2.746094 1.20022,1.715424 3.16263,2.740818 5.25781,2.746094 3.3119,-0.0075 6.07587,-2.526884 6.38867,-5.820313 1.05338,0.701187 2.29079,1.07593 3.55664,1.078125 3.55286,-3.4e-5 6.43357,-2.876888 6.4336,-6.425781 -3e-4,-2.496167 -1.44846,-4.764542 -3.71289,-5.820312 1.40174,-1.219985 2.20655,-2.986643 2.20703,-4.84375 3e-5,-3.548936 -2.87874,-6.425747 -6.43164,-6.425782 -0.24948,0.0033 -0.4987,0.02053 -0.7461,0.05274 -0.15611,-3.4317934 -2.98856,-6.1345029 -6.42773,-6.1347659 -2.19302,2.813e-4 -4.23366,1.1179468 -5.41602,2.9628907 -0.46196,-3.1562062 -3.17192,-5.4979032 -6.36523,-5.4980469 -1.94497,0.00479 -3.78442,0.8892498 -5.00195,2.4042969 -1.07317,-0.7392347 -2.34484,-1.1361847 -3.64844,-1.1367188 -2.19308,3.398e-4 -4.23567,1.1178509 -5.41797,2.9628906 -0.46185,-3.1563041 -3.17183,-5.4978855 -6.36523,-5.4980468 -2.28648,0.00572 -4.39645,1.2243118 -5.54493,3.1992187 -1.20971,-1.2343736 -2.8664,-1.9311629 -4.5957,-1.9316406 -1.90647,0.0033 -3.67184,0.8521394 -4.87109,2.25 -0.97164,-2.3902972 -2.81213,-3.9976316 -4.81055,-4.2011719 -0.24102,-0.02404 -0.48176,-0.027296 -0.7207,-0.00977 -1.44016,0.1054557 -2.7103,0.9918725 -3.59375,2.3847656 a 6.2379985,7.5747123 0 0 0 -4.89844,-2.8964844 6.2379985,7.5747123 0 0 0 -5.35352,3.7128906 6.460784,7.5747123 0 0 0 -4.7832,-2.4863281 6.460784,7.5747123 0 0 0 -5.38867,3.4042969 7.5747123,7.5747123 0 0 0 -6.97656,-4.63086 z`;

  const GLYPH_RENDER_PROFILES = {
    ".": {
      widthScale: .34,
      heightScale: .18,
      verticalAlign: "bottom",
      yOffset: -.02
    },
    ",": {
      widthScale: .36,
      heightScale: .26,
      verticalAlign: "bottom",
      yOffset: .07
    },
    ":": {
      widthScale: .38,
      heightScale: .50,
      verticalAlign: "middle",
      yOffset: 0
    },
    ";": {
      widthScale: .40,
      heightScale: .56,
      verticalAlign: "middle",
      yOffset: .04
    },
    "'": {
      widthScale: .30,
      heightScale: .34,
      verticalAlign: "top",
      yOffset: .03
    },
    "\"": {
      widthScale: .46,
      heightScale: .34,
      verticalAlign: "top",
      yOffset: .03
    },
    "-": {
      widthScale: .58,
      heightScale: .24,
      verticalAlign: "middle",
      yOffset: 0
    }
  };

  const app = document.getElementById("app");

  const DEBUG_GHOST_WRITER = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("gwDebug") === "1" || localStorage.getItem("ghostWriterDebug") === "1";
    } catch (err) {
      return false;
    }
  })();

  // Debug capture for handwriting issues.
  // Enable with ?gwDebug=1 or localStorage.setItem("ghostWriterDebug", "1").
  // Then run this in DevTools after testing:
  // copy(window.getGhostWriterDebugJson())
  window.GHOST_WRITER_DEBUG_LOG = Array.isArray(window.GHOST_WRITER_DEBUG_LOG)
    ? window.GHOST_WRITER_DEBUG_LOG
    : [];

  window.getGhostWriterDebugJson = function () {
    return JSON.stringify(window.GHOST_WRITER_DEBUG_LOG || [], null, 2);
  };

  window.clearGhostWriterDebugLog = function () {
    window.GHOST_WRITER_DEBUG_LOG = [];
    return true;
  };

  let ctx = {
    verseId: "",
    verseText: "",
    verseRef: "",
    translation: ""
  };

  let parsedRef = null;
  let selectedMode = "beginner";
  let muted = false;
  let audioContext = null;
  let audioUnlocked = false;
  let audioUnlockPromise = null;
  let silenceAudio = null;
  let soundLoadPromise = null;
  let uiSoundFlip = false;
  let spookySoundActive = false;
  let spookySoundToken = 0;
  let spookySoundQueue = [];
  let spookyLastKey = "";
  let spookySource = null;
  let spookyTimer = 0;
  let guideTimer = null;
  let playbackRaf = 0;
  let trainingResizeRaf = 0;
  let playbackState = null;
  let builtInPunctuationGlyphs = {};
  const backgroundImageCache = new Map();
  const borderDoodleImageCache = new Map();
  const tintedBorderDoodleCache = new Map();
  const soundBuffers = new Map();

  const punctuationRecorder = {
    charIndex: 0,
    variationIndex: 0,
    glyphs: {}
  };

  const state = {
    screen: "intro",
    fullText: "",
    verseTextOnly: "",
    referenceText: "",
    displayLines: [],
    requiredChars: [],
    referenceDecorationStyle: "box",
    currentCharIndex: 0,
    currentStrokes: [],
    currentStroke: null,
    glyphs: new Map(),
    hasDrawnCurrent: false,
    practiceMarked: false,
    guideVisible: true,
    trainingIntroShown: false,
    trainingIntroActive: false,
    remixMode: "simple",
    remix: makeDefaultRemixOptions()
  };

  function makeDefaultRemixOptions() {
    return {
      background: "ghost",
      textColor: "lightGray",
      referenceTextColor: "lightGray",
      referenceDecorationColor: "lightGray",
      borderStyle: "none",
      borderThickness: "medium",
      borderColor: "lightGray",
      tool: "pencil",
      vapor: "normal",
      spookySounds: "on",
      exportSize: "square",
      style: "ghost",
      speed: "normal",
      thickness: "normal",
      jitter: "off",
      wobble: "off"
    };
  }

  function shell() {
    return window.VerseGameShell || {};
  }

  function bridge() {
    return window.VerseGameBridge || {};
  }

  function getAudioContext() {
    if (audioContext) return audioContext;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    try {
      audioContext = new AudioContextClass();
      return audioContext;
    } catch (err) {
      console.warn("Ghost Writer could not create audio context", err);
      return null;
    }
  }

  async function unlockAudio() {
    if (audioUnlocked) return true;
    if (audioUnlockPromise) return audioUnlockPromise;

    audioUnlockPromise = (async () => {
      const ac = getAudioContext();

      if (!ac) return false;

      try {
        if (!silenceAudio) {
          silenceAudio = new Audio(AUDIO_UNLOCK_SRC);
          silenceAudio.preload = "auto";
          silenceAudio.loop = false;
          silenceAudio.volume = 0.001;
          silenceAudio.setAttribute("playsinline", "true");
        }

        try {
          silenceAudio.currentTime = 0;
          await silenceAudio.play();
          silenceAudio.pause();
          silenceAudio.currentTime = 0;
        } catch (err) {
          // iOS sometimes blocks the silence file even during valid gestures.
          // The oscillator below still gives Web Audio a chance to unlock.
        }

        if (ac.state === "suspended") {
          await ac.resume();
        }

        const oscillator = ac.createOscillator();
        const gain = ac.createGain();

        gain.gain.value = 0.0001;
        oscillator.connect(gain);
        gain.connect(ac.destination);
        oscillator.start();
        oscillator.stop(ac.currentTime + 0.03);

        audioUnlocked = true;
        void loadSoundBuffers();

        return true;
      } catch (err) {
        console.warn("Ghost Writer audio unlock failed", err);
        return false;
      } finally {
        audioUnlockPromise = null;
      }
    })();

    return audioUnlockPromise;
  }

  async function loadSoundBuffers() {
    if (soundLoadPromise) return soundLoadPromise;

    const ac = getAudioContext();

    if (!ac) return false;

    soundLoadPromise = (async () => {
      const entries = Object.entries(SOUND_FILES);

      await Promise.all(entries.map(async ([key, src]) => {
        if (soundBuffers.has(key)) return;

        try {
          const response = await fetch(src, { cache: "force-cache" });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.arrayBuffer();
          const buffer = await ac.decodeAudioData(data.slice(0));
          soundBuffers.set(key, buffer);
        } catch (err) {
          console.warn(`Ghost Writer could not load sound: ${key}`, err);
        }
      }));

      return true;
    })();

    return soundLoadPromise;
  }

  function getSoundVolume(volumeKey) {
    const master = Number(SOUND_TUNING.masterVolume);

    if (!Number.isFinite(master) || master <= 0) {
      return 0;
    }

    const named = Number(SOUND_TUNING.volumes?.[volumeKey]);

    if (!Number.isFinite(named)) {
      return clamp(master, 0, 1);
    }

    return clamp(master * named, 0, 1);
  }

  function playGameSound(key, volumeKey = key) {
    if (muted) return;

    void (async () => {
      const unlocked = await unlockAudio();

      if (!unlocked || muted) return;

      await loadSoundBuffers();

      const ac = getAudioContext();
      const buffer = soundBuffers.get(key);

      if (!ac || !buffer) return;

      try {
        const source = ac.createBufferSource();
        const gain = ac.createGain();

        source.buffer = buffer;
        gain.gain.value = getSoundVolume(volumeKey);

        source.connect(gain);
        gain.connect(ac.destination);
        source.start(0);
      } catch (err) {
        console.warn(`Ghost Writer could not play sound: ${key}`, err);
      }
    })();
  }

  function playUiTapSound() {
    const key = uiSoundFlip ? "uiTap2" : "uiTap1";
    uiSoundFlip = !uiSoundFlip;
    playGameSound(key, "uiTap");
  }

  function unlockAudioSoon() {
    void unlockAudio();
  }

  function clearSpookyTimer() {
    if (spookyTimer) {
      clearTimeout(spookyTimer);
      spookyTimer = 0;
    }
  }

  function getRandomSpookyGapMs() {
    const min = Number(SOUND_TUNING.spookyGapMs?.min) || 1000;
    const max = Number(SOUND_TUNING.spookyGapMs?.max) || min;
    const low = Math.min(min, max);
    const high = Math.max(min, max);

    return clamp(low + Math.random() * (high - low), 0, 5000);
  }

  function shuffleGhostSpookySoundKeys() {
    const available = GHOST_SPOOKY_SOUND_KEYS.filter((key) => soundBuffers.has(key));
    const out = [...available];

    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }

    if (out.length > 1 && out[0] === spookyLastKey) {
      const swapIndex = out.findIndex((key) => key !== spookyLastKey);

      if (swapIndex > 0) {
        [out[0], out[swapIndex]] = [out[swapIndex], out[0]];
      }
    }

    return out;
  }

  function chooseGhostSpookySoundKey() {
    if (!spookySoundQueue.length) {
      spookySoundQueue = shuffleGhostSpookySoundKeys();
    }

    return spookySoundQueue.shift() || "";
  }

  function stopCurrentSpookySource() {
    const source = spookySource;
    spookySource = null;

    if (!source) return;

    try {
      source.onended = null;
      source.stop(0);
    } catch (err) {
      // The source may already be stopped. That is okay.
    }
  }

  function stopGhostSpookySounds({ finishCurrent = false } = {}) {
    spookySoundActive = false;
    spookySoundToken += 1;
    spookySoundQueue = [];
    clearSpookyTimer();

    if (!finishCurrent) {
      stopCurrentSpookySource();
    }
  }

  function queueNextGhostSpookySound(token, delayMs = 0) {
    clearSpookyTimer();

    spookyTimer = setTimeout(() => {
      spookyTimer = 0;
      playNextGhostSpookySound(token);
    }, Math.max(0, delayMs));
  }

  function playNextGhostSpookySound(token) {
    if (!spookySoundActive || token !== spookySoundToken || muted) return;

    const ac = getAudioContext();

    if (!ac) return;

    const key = chooseGhostSpookySoundKey();
    const buffer = key ? soundBuffers.get(key) : null;

    if (!key || !buffer) return;

    try {
      const source = ac.createBufferSource();
      const gain = ac.createGain();

      source.buffer = buffer;
      gain.gain.value = getSoundVolume("ghostSpooky");

      source.connect(gain);
      gain.connect(ac.destination);

      spookyLastKey = key;
      spookySource = source;

      source.onended = () => {
        if (spookySource === source) {
          spookySource = null;
        }

        if (!spookySoundActive || token !== spookySoundToken || muted) return;

        queueNextGhostSpookySound(token, getRandomSpookyGapMs());
      };

      source.start(0);
    } catch (err) {
      console.warn(`Ghost Writer could not play spooky sound: ${key}`, err);
    }
  }

  function startGhostSpookySounds() {
    stopGhostSpookySounds();

    if (muted) return;

    spookySoundActive = true;
    spookySoundToken += 1;
    spookySoundQueue = [];

    const token = spookySoundToken;

    void (async () => {
      const unlocked = await unlockAudio();

      if (!unlocked || !spookySoundActive || token !== spookySoundToken || muted) return;

      await loadSoundBuffers();

      if (!spookySoundActive || token !== spookySoundToken || muted) return;

      playNextGhostSpookySound(token);
    })();
  }

  function escapeHtml(value) {
    if (shell().escapeHtml) return shell().escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clamp(value, min, max) {
    if (shell().clamp) return shell().clamp(value, min, max);
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function normalizeTextForGhost(text) {
    return String(text ?? "")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—−]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function buildFullText() {
    parsedRef = shell().parseReferenceParts
      ? shell().parseReferenceParts(ctx.verseRef, ctx.translation, ctx.verseId)
      : { book: ctx.verseRef || "", reference: "", display: ctx.verseRef || "" };

    const verse = normalizeTextForGhost(ctx.verseText || "");
    const ref = normalizeTextForGhost(
      [parsedRef?.book || "", parsedRef?.reference || ""].filter(Boolean).join(" ")
    );

    state.verseTextOnly = verse || "WRITE THE VERSE";
    state.referenceText = ref;
    state.displayLines = ref ? [state.verseTextOnly, ref] : [state.verseTextOnly];
    state.fullText = state.displayLines.join("\n");
    state.requiredChars = extractRequiredChars(state.fullText);
  }


  function extractRequiredChars(text) {
    const out = [];
    const seen = new Set();

    for (const char of String(text || "")) {
      if (/\s/.test(char)) continue;
      if (seen.has(char)) continue;
      seen.add(char);
      out.push(char);
    }

    return out;
  }

  function chooseReferenceDecorationStyle() {
    const index = Math.floor(Math.random() * REFERENCE_DECORATION_STYLES.length);
    return REFERENCE_DECORATION_STYLES[index] || "box";
  }

  function helpHtml() {
    return `
      <ul class="ghost-help-list">
        <li>Write each letter using your finger.</li>
        <li>When finished, watch the ghost write the verse in your own handwriting.</li>
      </ul>
    `;
  }

  function renderIntro() {
    stopPlayback();
    clearGuideTimer();
    state.screen = "intro";

    shell().renderTitleScreen({
      app,
      title: GAME_TITLE,
      icon: GAME_ICON,
      iconHtml: GAME_ICON_HTML,
      debugBadge: "GW 3.2",
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      startText: "Start",
      helpText: "How to Play",
      backLabel: "Back to Playground",
      theme: GAME_THEME,
      onBack: () => {
        playUiTapSound();
        bridge().exitGame?.();
      },
      onStart: () => {
        playUiTapSound();
        renderModeSelect();
      }
    });

    wirePunctuationRecorderTitleHotspot();
  }

  function renderModeSelect() {
    stopPlayback();
    clearGuideTimer();
    state.screen = "mode";
    app?.classList.add("ghost-writer-mode-select");

    shell().renderModeSelect({
      app,
      title: "Choose Your Ghost",
      icon: GAME_ICON,
      iconHtml: GAME_ICON_HTML,
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      backLabel: "Back to Ghost Writer title",
      theme: GAME_THEME,
      modes: MODES,
      onBack: () => {
        playUiTapSound();
        renderIntro();
      },
      onSelect: (mode) => {
        playUiTapSound();
        startRun(mode);
      }
    });
  }

  function startRun(mode) {
    stopPlayback();
    clearGuideTimer();

    selectedMode = mode === "advanced" ? "advanced" : "beginner";
    state.requiredChars = getRequiredCharsForMode(state.fullText, selectedMode);
    state.screen = "training";
    state.currentCharIndex = 0;
    state.currentStrokes = [];
    state.currentStroke = null;
    state.glyphs = new Map();
    seedBuiltInPunctuationGlyphsForBeginner();
    state.hasDrawnCurrent = false;
    state.practiceMarked = false;
    state.guideVisible = true;
    state.trainingIntroShown = false;
    state.trainingIntroActive = false;
    state.referenceDecorationStyle = chooseReferenceDecorationStyle();
    state.remix = makeDefaultRemixOptions();

    renderTraining();
  }

  function rootHtml(inner, { wide = false, menu = true, rootClass = "" } = {}) {
    const safeRootClass = rootClass ? ` ${escapeHtml(rootClass)}` : "";

    return `
      <div class="ghost-writer-root${safeRootClass}">
        ${menu ? `<button class="ghost-menu-pill no-zoom" id="ghostMenuPill" type="button" aria-label="Open game menu">☰</button>` : ""}
        <div class="ghost-writer-stage ${wide ? "is-wide" : ""}">
          ${inner}
        </div>
        ${shell().helpOverlayHtml ? shell().helpOverlayHtml({ id: HELP_OVERLAY_ID, title: "How to Play", body: helpHtml(), closeText: "Close" }) : ""}
        ${shell().gameMenuHtml ? shell().gameMenuHtml({
      id: MENU_OVERLAY_ID,
      title: "Ghost Writer Menu",
      muted,
      showModeSelect: true,
      exitText: "Back to Playground",
      modeSelectText: "Mode Select"
    }) : ""}
      </div>
    `;
  }


  function wireMenu() {
    if (!shell().wireGameMenu) return;

    shell().wireGameMenu({
      id: MENU_OVERLAY_ID,
      menuButtonId: "ghostMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        if (muted) {
          muted = false;
          playUiTapSound();
          return muted;
        }

        playUiTapSound();
        muted = true;
        stopGhostSpookySounds();
        return muted;
      },
      onModeSelect: () => {
        playUiTapSound();
        renderModeSelect();
      },
      onExit: () => {
        playUiTapSound();
        bridge().exitGame?.();
      },
      onOpen: () => {
        playUiTapSound();
        return true;
      },
      onClose: () => {
        playUiTapSound();
      },
      onBackFromHelp: () => { }
    });
  }

  function currentChar() {
    if (state.screen === "punctuationRecorder") {
      return punctuationRecorderCurrentChar();
    }

    return state.requiredChars[state.currentCharIndex] || "";
  }

  function isSymbolChar(char) {
    return !/[A-Z0-9]/.test(char);
  }

  function isAlphaNumericChar(char) {
    return /^[A-Z0-9]$/.test(String(char || ""));
  }

  function allowsDotStroke(char) {
    return [".", ":", ";", "!", "?"].includes(String(char || ""));
  }

  function getGuideRenderProfile(char) {
    return GUIDE_RENDER_PROFILES[String(char || "")] || null;
  }


  function charLabel(char) {
    if (char === "\"") return "quotation mark";
    if (char === "'") return "apostrophe";
    if (char === ":") return "colon";
    if (char === ";") return "semicolon";
    if (char === ",") return "comma";
    if (char === ".") return "period";
    if (char === "!") return "exclamation mark";
    if (char === "?") return "question mark";
    if (char === "-") return "dash";
    return char;
  }

  function wirePunctuationRecorderTitleHotspot() {
    if (!ENABLE_PUNCTUATION_RECORDER || state.screen !== "intro") return;

    let timer = null;
    let startX = 0;
    let startY = 0;
    let armed = false;
    let opened = false;

    const cancel = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      armed = false;
    };

    const targetLooksLikeTitleGhost = (target) => {
      let node = target;

      while (node && node !== app && node !== document.body) {
        const text = String(node.textContent || "").trim();

        if (text.includes(GAME_ICON) && text.length <= 6) {
          return true;
        }

        node = node.parentElement;
      }

      return false;
    };

    app.addEventListener("pointerdown", (event) => {
      if (!ENABLE_PUNCTUATION_RECORDER || state.screen !== "intro") return;
      if (!targetLooksLikeTitleGhost(event.target)) return;

      event.preventDefault();

      opened = false;
      armed = true;
      startX = event.clientX || 0;
      startY = event.clientY || 0;
      cancel();
      armed = true;

      timer = setTimeout(() => {
        if (!armed || state.screen !== "intro") return;

        opened = true;
        timer = null;
        renderPunctuationRecorder();
      }, PUNCTUATION_RECORDER_LONG_PRESS_MS);
    }, { capture: true });

    app.addEventListener("pointermove", (event) => {
      if (!armed) return;

      const dx = Math.abs((event.clientX || 0) - startX);
      const dy = Math.abs((event.clientY || 0) - startY);

      if (dx > 18 || dy > 18) cancel();
    }, { capture: true });

    app.addEventListener("pointerup", (event) => {
      if (!armed && !opened) return;

      if (opened) event.preventDefault();
      cancel();
    }, { capture: true });

    app.addEventListener("pointercancel", cancel, { capture: true });

    app.addEventListener("selectstart", (event) => {
      if (state.screen !== "intro") return;
      if (!targetLooksLikeTitleGhost(event.target)) return;

      event.preventDefault();
    }, { capture: true });
  }

  function resetPunctuationRecorder() {
    punctuationRecorder.charIndex = 0;
    punctuationRecorder.variationIndex = 0;
    punctuationRecorder.glyphs = {};

    for (const char of PUNCTUATION_RECORDER_CHARS) {
      punctuationRecorder.glyphs[char] = [];
    }
  }

  function punctuationRecorderCurrentChar() {
    return PUNCTUATION_RECORDER_CHARS[punctuationRecorder.charIndex] || PUNCTUATION_RECORDER_CHARS[0] || ".";
  }

  function punctuationRecorderIsComplete() {
    return PUNCTUATION_RECORDER_CHARS.every((char) => {
      return (punctuationRecorder.glyphs[char] || []).length >= PUNCTUATION_RECORDER_VARIATIONS;
    });
  }

  function punctuationRecorderSavedCount() {
    return PUNCTUATION_RECORDER_CHARS.reduce((total, char) => {
      return total + Math.min(PUNCTUATION_RECORDER_VARIATIONS, (punctuationRecorder.glyphs[char] || []).length);
    }, 0);
  }

  function punctuationRecorderTotalCount() {
    return PUNCTUATION_RECORDER_CHARS.length * PUNCTUATION_RECORDER_VARIATIONS;
  }

  function punctuationRecorderExportData() {
    const out = {};

    for (const char of PUNCTUATION_RECORDER_CHARS) {
      out[char] = (punctuationRecorder.glyphs[char] || [])
        .slice(0, PUNCTUATION_RECORDER_VARIATIONS)
        .map((glyph) => ({
          char: glyph.char,
          strokes: glyph.strokes,
          bounds: glyph.bounds,
          widthRatio: glyph.widthRatio,
          heightRatio: glyph.heightRatio
        }));
    }

    return out;
  }

  function punctuationRecorderJson() {
    return JSON.stringify(punctuationRecorderExportData(), null, 2);
  }

  function renderPunctuationRecorder({ keepData = false } = {}) {
    stopPlayback();
    clearGuideTimer();
    state.screen = "punctuationRecorder";

    if (!keepData) resetPunctuationRecorder();

    renderPunctuationRecorderStep();
  }

  function renderPunctuationRecorderStep() {
    clearGuideTimer();
    state.screen = "punctuationRecorder";
    state.currentStrokes = [];
    state.currentStroke = null;
    state.hasDrawnCurrent = false;

    const char = punctuationRecorderCurrentChar();
    const saved = punctuationRecorderSavedCount();
    const total = punctuationRecorderTotalCount();
    const progress = total ? saved / total : 0;
    const variationNumber = Math.min(
      PUNCTUATION_RECORDER_VARIATIONS,
      (punctuationRecorder.glyphs[char] || []).length + 1
    );
    const isComplete = punctuationRecorderIsComplete();

    app.innerHTML = rootHtml(`
      <div class="ghost-card ghost-recorder-card">
        <div class="ghost-topline">
          <span class="ghost-pill">Recorder</span>
          <div class="ghost-progress-track" aria-hidden="true"><div class="ghost-progress-fill" style="width:${Math.round(progress * 100)}%"></div></div>
          <span class="ghost-pill">${escapeHtml(String(saved))}/${escapeHtml(String(total))}</span>
        </div>

        <div class="ghost-prompt">
          <div class="ghost-prompt-title">Record: ${escapeHtml(char)}</div>
          <div class="ghost-prompt-sub">Draw ${escapeHtml(charLabel(char))} variation ${escapeHtml(String(variationNumber))} of ${escapeHtml(String(PUNCTUATION_RECORDER_VARIATIONS))}.</div>
        </div>

        <div class="ghost-draw-wrap" id="ghostDrawWrap">
          <div class="ghost-guide-text ${isSymbolChar(char) ? "is-symbol" : ""}" id="ghostGuideText">${escapeHtml(char)}</div>
          <canvas id="ghostDrawCanvas" aria-label="Record ${escapeHtml(charLabel(char))}"></canvas>
        </div>

        <div class="ghost-train-actions ghost-recorder-actions">
          <button class="vm-btn vm-btn-secondary" id="ghostClearBtn" type="button">Clear</button>
          <button class="vm-btn" id="ghostSaveBtn" type="button" disabled>Save Variation</button>
          <button class="vm-btn vm-btn-secondary" id="ghostRecorderUndoBtn" type="button">Undo Last Save</button>
          <button class="vm-btn vm-btn-secondary" id="ghostRecorderBackBtn" type="button">Back to Title</button>
        </div>

        <div class="ghost-recorder-export">
          <div class="ghost-recorder-export-title">${isComplete ? "✅ All punctuation recorded!" : "Export will fill in as you save."}</div>
          <div class="ghost-recorder-export-actions">
            <button class="vm-btn" id="ghostRecorderCopyBtn" type="button">Copy JSON</button>
            <button class="vm-btn vm-btn-secondary" id="ghostRecorderDownloadBtn" type="button">Download JSON</button>
          </div>
          <textarea id="ghostRecorderJsonBox" class="ghost-recorder-json" readonly spellcheck="false">${escapeHtml(punctuationRecorderJson())}</textarea>
        </div>
      </div>
    `, { menu: false, rootClass: "is-recorder-screen" });

    setupDrawingCanvas();
    fitGuideCharacter();
    updateSaveButton();

    document.getElementById("ghostClearBtn")?.addEventListener("click", clearCurrentDrawing);
    document.getElementById("ghostSaveBtn")?.addEventListener("click", savePunctuationRecorderVariation);
    document.getElementById("ghostRecorderUndoBtn")?.addEventListener("click", undoPunctuationRecorderSave);
    document.getElementById("ghostRecorderBackBtn")?.addEventListener("click", renderIntro);
    document.getElementById("ghostRecorderCopyBtn")?.addEventListener("click", copyPunctuationRecorderJson);
    document.getElementById("ghostRecorderDownloadBtn")?.addEventListener("click", downloadPunctuationRecorderJson);
  }

  function savePunctuationRecorderVariation() {
    if (!state.hasDrawnCurrent) return;

    const char = punctuationRecorderCurrentChar();
    const glyph = makeGlyph(char, state.currentStrokes);
    const list = punctuationRecorder.glyphs[char] || [];
    list.push(glyph);
    punctuationRecorder.glyphs[char] = list.slice(0, PUNCTUATION_RECORDER_VARIATIONS);

    if (punctuationRecorder.glyphs[char].length >= PUNCTUATION_RECORDER_VARIATIONS) {
      punctuationRecorder.charIndex = Math.min(
        punctuationRecorder.charIndex + 1,
        PUNCTUATION_RECORDER_CHARS.length - 1
      );
    }

    renderPunctuationRecorderStep();
  }

  function undoPunctuationRecorderSave() {
    let char = punctuationRecorderCurrentChar();
    let list = punctuationRecorder.glyphs[char] || [];

    if (!list.length && punctuationRecorder.charIndex > 0) {
      punctuationRecorder.charIndex -= 1;
      char = punctuationRecorderCurrentChar();
      list = punctuationRecorder.glyphs[char] || [];
    }

    list.pop();
    punctuationRecorder.glyphs[char] = list;
    renderPunctuationRecorderStep();
  }

  async function copyPunctuationRecorderJson() {
    const json = punctuationRecorderJson();
    const box = document.getElementById("ghostRecorderJsonBox");

    try {
      await navigator.clipboard.writeText(json);
      flashPunctuationRecorderExportTitle("Copied JSON!");
    } catch (err) {
      if (box) {
        box.focus();
        box.select();
      }
      flashPunctuationRecorderExportTitle("Clipboard blocked. Select and copy the box.");
    }
  }

  function downloadPunctuationRecorderJson() {
    const json = punctuationRecorderJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ghost-writer-punctuation-glyphs.json";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function flashPunctuationRecorderExportTitle(message) {
    const title = document.querySelector(".ghost-recorder-export-title");
    if (!title) return;

    title.textContent = message;
    setTimeout(() => {
      if (state.screen === "punctuationRecorder") {
        title.textContent = punctuationRecorderIsComplete()
          ? "✅ All punctuation recorded!"
          : "Export will fill in as you save.";
      }
    }, 1400);
  }

  function isBuiltInPunctuationChar(char) {
    return PUNCTUATION_RECORDER_CHARS.includes(String(char || ""));
  }

  function sanitizeBuiltInGlyph(char, glyph) {
    if (!glyph || !Array.isArray(glyph.strokes)) return null;

    const strokes = glyph.strokes
      .map((stroke) => (stroke || []).map((p) => ({
        x: clamp(Number(p.x), 0, 1),
        y: clamp(Number(p.y), 0, 1),
        t: Number(p.t) || 0
      })))
      .filter((stroke) => stroke.length);

    if (!strokes.length) return null;

    const bounds = glyph.bounds && Number.isFinite(Number(glyph.bounds.width)) && Number.isFinite(Number(glyph.bounds.height))
      ? {
        minX: clamp(Number(glyph.bounds.minX), 0, 1),
        minY: clamp(Number(glyph.bounds.minY), 0, 1),
        maxX: clamp(Number(glyph.bounds.maxX), 0, 1),
        maxY: clamp(Number(glyph.bounds.maxY), 0, 1),
        width: clamp(Number(glyph.bounds.width), .04, 1),
        height: clamp(Number(glyph.bounds.height), .04, 1)
      }
      : computeBounds(strokes);

    return {
      char,
      strokes,
      rawStrokeCount: strokes.length,
      filteredStrokeCount: strokes.length,
      bounds,
      widthRatio: clamp(Number(glyph.widthRatio) || bounds.width || .24, .10, .92),
      heightRatio: clamp(Number(glyph.heightRatio) || bounds.height || .24, .10, .92)
    };
  }

  function normalizeBuiltInPunctuationGlyphs(data) {
    const out = {};

    for (const char of PUNCTUATION_RECORDER_CHARS) {
      const list = Array.isArray(data?.[char]) ? data[char] : [];
      const cleanList = list
        .map((glyph) => sanitizeBuiltInGlyph(char, glyph))
        .filter(Boolean)
        .slice(0, PUNCTUATION_RECORDER_VARIATIONS);

      if (cleanList.length) {
        out[char] = cleanList;
      }
    }

    return out;
  }

  async function loadBuiltInPunctuationGlyphs() {
    builtInPunctuationGlyphs = {};

    try {
      const response = await fetch(BUILT_IN_PUNCTUATION_GLYPHS_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      builtInPunctuationGlyphs = normalizeBuiltInPunctuationGlyphs(data);

      if (DEBUG_GHOST_WRITER) {
        console.info("Ghost Writer loaded built-in punctuation glyphs", builtInPunctuationGlyphs);
      }
    } catch (err) {
      builtInPunctuationGlyphs = {};
      console.warn("Ghost Writer could not load built-in punctuation glyphs. Beginner will train punctuation instead.", err);
    }
  }

  function getBuiltInPunctuationGlyphList(char) {
    const list = builtInPunctuationGlyphs[String(char || "")];
    return Array.isArray(list) ? list : [];
  }

  function getRequiredCharsForMode(text, mode) {
    const chars = extractRequiredChars(text);

    if (mode !== "beginner") {
      return chars;
    }

    return chars.filter((char) => {
      if (isAlphaNumericChar(char)) return true;

      const builtInGlyphs = getBuiltInPunctuationGlyphList(char);

      if (isBuiltInPunctuationChar(char) && builtInGlyphs.length) {
        return false;
      }

      return true;
    });
  }

  function seedBuiltInPunctuationGlyphsForBeginner() {
    if (selectedMode !== "beginner") return;

    for (const char of PUNCTUATION_RECORDER_CHARS) {
      if (!String(state.fullText || "").includes(char)) continue;

      const list = getBuiltInPunctuationGlyphList(char);

      if (list.length) {
        state.glyphs.set(char, list);
      }
    }
  }

  function getGlyphVariationIndex(char, variantKey, length) {
    if (!length) return 0;

    const seed = `${ctx.verseId || ""}|${state.fullText || ""}|${char}|${variantKey}`;
    let hash = 0;

    for (let i = 0; i < seed.length; i += 1) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash) % length;
  }

  function syncGuideVisibility() {
    const guide = document.getElementById("ghostGuideText");
    const btn = document.getElementById("ghostGuideToggleBtn");

    if (guide) {
      guide.classList.toggle("is-faded", !state.guideVisible || state.trainingIntroActive);
    }

    if (btn) {
      btn.classList.toggle("is-on", state.guideVisible);
      btn.classList.toggle("is-off", !state.guideVisible);
      btn.setAttribute("aria-label", state.guideVisible ? "Hide letter guide" : "Show letter guide");
      btn.setAttribute("aria-pressed", state.guideVisible ? "true" : "false");
    }
  }

  function toggleGuideVisibility() {
    state.guideVisible = !state.guideVisible;
    syncGuideVisibility();
  }


  function renderTraining() {
    clearGuideTimer();
    state.screen = "training";
    state.trainingIntroActive = false;

    const char = currentChar();
    const total = Math.max(1, state.requiredChars.length);
    const showIntroMessage = !state.trainingIntroShown;

    if (showIntroMessage) {
      state.trainingIntroActive = true;
    }

    app.innerHTML = rootHtml(`
      <div class="ghost-training-card">
        <div class="ghost-training-topline">
          <div class="ghost-training-title">Write: <span>${escapeHtml(char)}</span></div>
          <span class="ghost-training-count">${escapeHtml(String(state.currentCharIndex + 1))}/${escapeHtml(String(total))}</span>
        </div>

        <div class="ghost-training-draw-pad">
          <div class="ghost-draw-wrap" id="ghostDrawWrap">
            <div class="ghost-draw-instruction ${showIntroMessage ? "" : "is-hidden"}" id="ghostDrawInstruction">
              <span>Draw each</span>
              <span>letter nice</span>
              <span>and big!</span>
            </div>
            <div class="ghost-guide-text ${isSymbolChar(char) ? "is-symbol" : ""} ${showIntroMessage || !state.guideVisible ? "is-faded" : ""}" id="ghostGuideText">${escapeHtml(char)}</div>
            <canvas id="ghostDrawCanvas" aria-label="Draw ${escapeHtml(charLabel(char))}"></canvas>
          </div>
        </div>

        <div class="ghost-train-actions">
          <button
            class="ghost-guide-toggle ${state.guideVisible ? "is-on" : "is-off"}"
            id="ghostGuideToggleBtn"
            type="button"
            aria-label="${state.guideVisible ? "Hide letter guide" : "Show letter guide"}"
            aria-pressed="${state.guideVisible ? "true" : "false"}"
          >👁️</button>
          <button class="vm-btn vm-btn-secondary" id="ghostClearBtn" type="button" aria-label="Clear drawing">Clear</button>
          <button class="vm-btn vm-btn-secondary" id="ghostUndoStrokeBtn" type="button" aria-label="Undo last stroke">↩️</button>
          <button class="vm-btn" id="ghostSaveBtn" type="button" disabled>Next</button>
        </div>

        <div class="ghost-validation-message" id="ghostValidationMessage" aria-live="polite"></div>
      </div>
    `, { menu: true, rootClass: "is-training-screen" });

    wireMenu();
    setupDrawingCanvas();
    fitGuideCharacter();
    syncGuideVisibility();
    updateSaveButton();

    document.getElementById("ghostGuideToggleBtn")?.addEventListener("click", () => {
      playUiTapSound();
      toggleGuideVisibility();
    });

    document.getElementById("ghostClearBtn")?.addEventListener("click", () => {
      playUiTapSound();
      clearCurrentDrawing();
    });

    document.getElementById("ghostUndoStrokeBtn")?.addEventListener("click", () => {
      playUiTapSound();
      undoLastStroke();
    });

    document.getElementById("ghostSaveBtn")?.addEventListener("click", () => {
      playUiTapSound();
      saveCurrentGlyph();
    });

    if (showIntroMessage) {
      state.trainingIntroShown = true;
      guideTimer = setTimeout(() => {
        state.trainingIntroActive = false;
        document.getElementById("ghostDrawInstruction")?.classList.add("is-hidden");
        syncGuideVisibility();
      }, 1500);
    }
  }

  function setupCanvasForDpr(canvas, cssWidth, cssHeight) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.dataset.cssWidth = String(cssWidth);
    canvas.dataset.cssHeight = String(cssHeight);
    return c;
  }

  function setupDrawingCanvas() {
    const canvas = document.getElementById("ghostDrawCanvas");
    const wrap = document.getElementById("ghostDrawWrap");
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const c = setupCanvasForDpr(canvas, rect.width, rect.height);
    c.clearRect(0, 0, rect.width, rect.height);
    drawAllTrainingStrokes(c, rect.width, rect.height);

    const getPoint = (event) => {
      const r = canvas.getBoundingClientRect();
      const x = clamp((event.clientX - r.left) / Math.max(1, r.width), 0, 1);
      const y = clamp((event.clientY - r.top) / Math.max(1, r.height), 0, 1);
      return { x, y, t: performance.now() };
    };

    canvas.onpointerdown = (event) => {
      event.preventDefault();
      unlockAudioSoon();
      canvas.setPointerCapture?.(event.pointerId);
      const point = getPoint(event);
      state.currentStroke = [point];
      state.currentStrokes.push(state.currentStroke);
      state.hasDrawnCurrent = true;
      drawTrainingPoint(c, point, rect.width, rect.height);
      updateSaveButton();
    };

    canvas.onpointermove = (event) => {
      if (!state.currentStroke) return;
      event.preventDefault();
      const point = getPoint(event);
      const stroke = state.currentStroke;
      const previous = stroke[stroke.length - 1];
      stroke.push(point);
      drawTrainingSegment(c, previous, point, rect.width, rect.height);
      updateSaveButton();
    };

    const endStroke = (event) => {
      if (!state.currentStroke) return;
      event.preventDefault?.();
      const stroke = state.currentStroke;
      if (stroke.length === 1) {
        drawTrainingPoint(c, stroke[0], rect.width, rect.height);
      }
      state.currentStroke = null;
      updateSaveButton();
    };

    canvas.onpointerup = endStroke;
    canvas.onpointercancel = endStroke;
    canvas.onpointerleave = endStroke;
  }

  function drawTrainingPoint(c, point, width, height) {
    c.save();
    c.fillStyle = "#16171d";
    c.beginPath();
    c.arc(point.x * width, point.y * height, Math.max(3.5, width * .011), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawTrainingSegment(c, a, b, width, height) {
    c.save();
    c.strokeStyle = "#16171d";
    c.lineWidth = Math.max(7, width * .022);
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(a.x * width, a.y * height);
    c.lineTo(b.x * width, b.y * height);
    c.stroke();
    c.restore();
  }

  function drawAllTrainingStrokes(c, width, height) {
    for (const stroke of state.currentStrokes) {
      if (!stroke || !stroke.length) continue;
      if (stroke.length === 1) {
        drawTrainingPoint(c, stroke[0], width, height);
        continue;
      }
      for (let i = 1; i < stroke.length; i += 1) {
        drawTrainingSegment(c, stroke[i - 1], stroke[i], width, height);
      }
    }
  }

  function hasCurrentDrawingStrokes() {
    return (state.currentStrokes || []).some((stroke) => stroke && stroke.length);
  }

  function redrawCurrentDrawing() {
    const canvas = document.getElementById("ghostDrawCanvas");
    if (!canvas) return;

    const width = Number(canvas.dataset.cssWidth) || canvas.getBoundingClientRect().width;
    const height = Number(canvas.dataset.cssHeight) || canvas.getBoundingClientRect().height;
    const c = setupCanvasForDpr(canvas, width, height);
    c.clearRect(0, 0, width, height);
    drawAllTrainingStrokes(c, width, height);
  }

  function clearCurrentDrawing() {
    state.currentStrokes = [];
    state.currentStroke = null;
    state.hasDrawnCurrent = false;
    redrawCurrentDrawing();
    updateSaveButton();
  }

  function undoLastStroke() {
    if (!hasCurrentDrawingStrokes()) return;

    state.currentStroke = null;
    state.currentStrokes.pop();
    state.hasDrawnCurrent = hasCurrentDrawingStrokes();
    redrawCurrentDrawing();
    updateSaveButton();
  }

  function resizeTrainingCanvasIfNeeded() {
    if (state.screen !== "training" && state.screen !== "punctuationRecorder") return;

    const canvas = document.getElementById("ghostDrawCanvas");
    const wrap = document.getElementById("ghostDrawWrap");
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const nextWidth = Math.max(1, rect.width);
    const nextHeight = Math.max(1, rect.height);
    const oldWidth = Number(canvas.dataset.cssWidth) || 0;
    const oldHeight = Number(canvas.dataset.cssHeight) || 0;
    const changed = Math.abs(nextWidth - oldWidth) > 1 || Math.abs(nextHeight - oldHeight) > 1;

    if (changed) {
      const c = setupCanvasForDpr(canvas, nextWidth, nextHeight);
      c.clearRect(0, 0, nextWidth, nextHeight);
      drawAllTrainingStrokes(c, nextWidth, nextHeight);
    }

    fitGuideCharacter();
    syncGuideVisibility();
    updateSaveButton();
  }

  function scheduleTrainingCanvasResize() {
    if (state.screen !== "training" && state.screen !== "punctuationRecorder") return;

    if (trainingResizeRaf) {
      cancelAnimationFrame(trainingResizeRaf);
      trainingResizeRaf = 0;
    }

    trainingResizeRaf = requestAnimationFrame(() => {
      trainingResizeRaf = 0;
      resizeTrainingCanvasIfNeeded();
    });
  }

  function getDrawingStats(strokes) {
    let strokeCount = 0;
    let pointCount = 0;
    let travel = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const stroke of strokes || []) {
      if (!stroke || !stroke.length) continue;

      strokeCount += 1;
      pointCount += stroke.length;

      for (const point of stroke) {
        if (!point) continue;

        const x = clamp(Number(point.x), 0, 1);
        const y = clamp(Number(point.y), 0, 1);

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      travel += strokeDistance(stroke);
    }

    if (!Number.isFinite(minX)) {
      minX = .5;
      minY = .5;
      maxX = .5;
      maxY = .5;
    }

    return {
      strokeCount,
      pointCount,
      travel,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY)
    };
  }

  function validateCurrentDrawing(char) {
    if (!state.hasDrawnCurrent) {
      return { ok: false, message: "" };
    }

    if (!isAlphaNumericChar(char)) {
      return { ok: true, message: "" };
    }

    const stats = getDrawingStats(state.currentStrokes);
    const isMeaningful =
      stats.strokeCount >= 1 &&
      stats.pointCount >= 6 &&
      stats.travel >= .08 &&
      Math.max(stats.width, stats.height) >= .07;

    if (isMeaningful) {
      return { ok: true, message: "" };
    }

    return {
      ok: false,
      message: "Make it a little bigger for the ghost."
    };
  }

  function updateSaveButton() {
    const btn = document.getElementById("ghostSaveBtn");
    const clearBtn = document.getElementById("ghostClearBtn");
    const undoBtn = document.getElementById("ghostUndoStrokeBtn");
    const message = document.getElementById("ghostValidationMessage");
    if (!btn) return;

    const hasStrokes = hasCurrentDrawingStrokes();
    const result = validateCurrentDrawing(currentChar());
    btn.disabled = !result.ok;

    if (clearBtn) clearBtn.disabled = !hasStrokes;
    if (undoBtn) undoBtn.disabled = !hasStrokes;

    if (message) {
      message.textContent = state.currentStroke ? "" : (result.message || "");
    }
  }

  function saveCurrentGlyph() {
    const char = currentChar();
    const validation = validateCurrentDrawing(char);

    if (!validation.ok) {
      updateSaveButton();
      return;
    }
    const glyph = makeGlyph(char, state.currentStrokes);
    state.glyphs.set(char, glyph);

    state.currentCharIndex += 1;
    state.currentStrokes = [];
    state.currentStroke = null;
    state.hasDrawnCurrent = false;

    if (state.currentCharIndex >= state.requiredChars.length) {
      renderReady();
      return;
    }

    renderTraining();
  }

  function makeGlyph(char, strokes) {
    const raw = (strokes || [])
      .map((stroke) => (stroke || []).map((p) => ({
        x: clamp(p.x, 0, 1),
        y: clamp(p.y, 0, 1),
        t: Number(p.t) || 0
      })))
      .filter((stroke) => stroke.length);

    let filtered = raw;

    // Letters and numbers should not accidentally save tap-dots.
    // Punctuation such as periods, colons, and question marks still needs dots,
    // so it is allowed to keep single-point / tiny strokes.
    if (isAlphaNumericChar(char) && !allowsDotStroke(char)) {
      filtered = raw.filter((stroke) => {
        if (!stroke || stroke.length < 2) return false;
        return strokeDistance(stroke) >= .012;
      });

      // If filtering would erase the whole glyph, keep the original data so a
      // child does not lose a very small but intentional mark.
      if (!filtered.length && raw.length) {
        filtered = raw;
      }
    }

    const bounds = computeBounds(filtered);
    const glyph = {
      char,
      strokes: filtered,
      rawStrokeCount: raw.length,
      filteredStrokeCount: filtered.length,
      bounds,
      widthRatio: clamp(bounds.width || .24, .10, .92),
      heightRatio: clamp(bounds.height || .24, .10, .92)
    };

    logGlyphDebug(glyph, raw);

    return glyph;
  }

  function strokeDistance(stroke) {
    let total = 0;
    for (let i = 1; i < (stroke?.length || 0); i += 1) {
      const a = stroke[i - 1];
      const b = stroke[i];
      const dx = (b.x || 0) - (a.x || 0);
      const dy = (b.y || 0) - (a.y || 0);
      total += Math.hypot(dx, dy);
    }
    return total;
  }

  function strokeBounds(stroke) {
    return computeBounds([stroke || []]);
  }

  function round4(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 10000) / 10000;
  }

  function logGlyphDebug(glyph, rawStrokes) {
    const raw = Array.isArray(rawStrokes) ? rawStrokes : [];
    const keptSet = new Set(glyph.strokes || []);

    const rawStrokeDetails = raw.map((stroke, index) => {
      const bounds = strokeBounds(stroke);
      const distance = strokeDistance(stroke);
      const points = stroke?.length || 0;
      const isTiny = points <= 1 || distance < .012 || (bounds.width <= .045 && bounds.height <= .045);

      return {
        index,
        kept: keptSet.has(stroke),
        points,
        distance: round4(distance),
        bounds: {
          minX: round4(bounds.minX),
          minY: round4(bounds.minY),
          maxX: round4(bounds.maxX),
          maxY: round4(bounds.maxY),
          width: round4(bounds.width),
          height: round4(bounds.height)
        },
        first: stroke?.[0]
          ? { x: round4(stroke[0].x), y: round4(stroke[0].y), t: round4(stroke[0].t) }
          : null,
        last: stroke?.length
          ? {
            x: round4(stroke[stroke.length - 1].x),
            y: round4(stroke[stroke.length - 1].y),
            t: round4(stroke[stroke.length - 1].t)
          }
          : null,
        tinyOrTap: isTiny
      };
    });

    const suspicious = rawStrokeDetails.filter((item) => item.tinyOrTap);

    const summary = {
      char: glyph.char,
      timestamp: new Date().toISOString(),
      verseId: ctx.verseId || "",
      mode: selectedMode,
      rawStrokeCount: raw.length,
      savedStrokeCount: glyph.strokes.length,
      removedStrokeCount: raw.length - glyph.strokes.length,
      pointsPerRawStroke: raw.map((stroke) => stroke.length),
      pointsPerSavedStroke: glyph.strokes.map((stroke) => stroke.length),
      suspiciousRawStrokeIndexes: suspicious.map((item) => item.index),
      glyphBounds: {
        minX: round4(glyph.bounds.minX),
        minY: round4(glyph.bounds.minY),
        maxX: round4(glyph.bounds.maxX),
        maxY: round4(glyph.bounds.maxY),
        width: round4(glyph.bounds.width),
        height: round4(glyph.bounds.height)
      },
      widthRatio: round4(glyph.widthRatio),
      heightRatio: round4(glyph.heightRatio),
      rawStrokeDetails
    };

    if (DEBUG_GHOST_WRITER) {
      window.GHOST_WRITER_DEBUG_LOG.push(summary);
      console.info(`GW_DEBUG ${JSON.stringify(summary)}`);
    }

    if (DEBUG_GHOST_WRITER && suspicious.length) {
      console.warn("Ghost Writer glyph had tiny/tap strokes", {
        char: summary.char,
        suspiciousRawStrokeIndexes: summary.suspiciousRawStrokeIndexes,
        removedStrokeCount: summary.removedStrokeCount,
        copyCommand: "copy(window.getGhostWriterDebugJson())",
        summary
      });
    }
  }

  function computeBounds(strokes) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const stroke of strokes || []) {
      for (const p of stroke || []) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }

    if (!Number.isFinite(minX)) {
      return { minX: .35, minY: .35, maxX: .65, maxY: .65, width: .30, height: .30 };
    }

    const pad = .035;
    minX = clamp(minX - pad, 0, 1);
    minY = clamp(minY - pad, 0, 1);
    maxX = clamp(maxX + pad, 0, 1);
    maxY = clamp(maxY + pad, 0, 1);

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(.04, maxX - minX),
      height: Math.max(.04, maxY - minY)
    };
  }

  function renderReady() {
    clearGuideTimer();
    state.screen = "ready";

    app.innerHTML = rootHtml(`
      <div class="ghost-card ghost-ready-card">
        <div class="ghost-ready-icon" aria-hidden="true">👻</div>
        <div class="ghost-ready-title">The ghost learned your handwriting!</div>
        <div class="ghost-ready-sub">Now it can write the whole verse and reference.</div>
        <div class="ghost-ready-actions">
          <button class="vm-btn" id="ghostWriteBtn" type="button">Ghost Write!</button>
        </div>
      </div>
    `, { menu: true });

    wireMenu();
    document.getElementById("ghostWriteBtn")?.addEventListener("click", () => {
      playUiTapSound();
      renderPlayback({
        options: makeDefaultRemixOptions(),
        markPractice: true,
        returnTo: "remix"
      });
    });
  }

  function renderPlayback({ options = state.remix, markPractice = false, returnTo = "remix" } = {}) {
    stopPlayback();
    clearGuideTimer();
    state.screen = "playback";

    const cleanOptions = sanitizeRemixOptions({ ...options });
    const background = getBackgroundConfig(cleanOptions);
    const toolConfig = getPlaybackToolConfig(cleanOptions);
    const isDefaultGhostPlayback = getBackgroundKey(cleanOptions) === "ghost";

    app.innerHTML = `
      <div class="ghost-playback-root${isDefaultGhostPlayback ? " is-default-ghost" : ""}">
        <div class="ghost-playback-card ${escapeHtml(background.cardClass || "")}" id="ghostPlaybackCard">
          <canvas id="ghostPlaybackCanvas" aria-label="Ghost writing playback"></canvas>
          <img
            class="ghost-playback-tool ${escapeHtml(toolConfig.className || "")}"
            id="ghostPlaybackTool"
            src="${escapeHtml(toolConfig.src)}"
            alt=""
            draggable="false"
          >

          <button class="ghost-playback-remix-btn" id="ghostPlaybackRemixBtn" type="button" aria-label="Open remix screen">
            🔄 Remix
          </button>
        </div>
      </div>
    `;

    const canvas = document.getElementById("ghostPlaybackCanvas");
    const card = document.getElementById("ghostPlaybackCard");
    const remixBtn = document.getElementById("ghostPlaybackRemixBtn");
    if (!canvas || !card) return;

    remixBtn?.addEventListener("click", () => {
      playUiTapSound();

      if (returnTo === "remix") {
        state.remixMode = "simple";
        renderRemix();
      }
    });

    requestAnimationFrame(() => {
      startPlayback(canvas, card, cleanOptions, async () => {
        if (markPractice && !state.practiceMarked) {
          state.practiceMarked = true;
          await markVersePracticed();
        }

        showPlaybackRemixButton();
      });
    });
  }

  function showPlaybackRemixButton() {
    const remixBtn = document.getElementById("ghostPlaybackRemixBtn");
    remixBtn?.classList.add("is-visible");
  }

  function renderRemix() {
    stopPlayback();
    clearGuideTimer();
    state.screen = "remix";
    state.remixMode = state.remixMode === "more" ? "more" : "simple";
    sanitizeRemixOptions(state.remix);

    if (state.remixMode === "simple") {
      state.remix.referenceTextColor = state.remix.textColor;
      state.remix.referenceDecorationColor = state.remix.textColor;
      state.remix.borderColor = state.remix.textColor;
      sanitizeRemixOptions(state.remix);
    }

    const background = getBackgroundConfig(state.remix);
    const isSimple = state.remixMode !== "more";

    const settingsHtml = isSimple ? `
          <div class="ghost-remix-section">
            <div class="ghost-section-title">🖼️ Background</div>
            <div class="ghost-options">
              ${selectBackgroundHtml("ghostBackgroundSelect", "Background", state.remix.background)}
            </div>
          </div>

          <div class="ghost-remix-section">
            <div class="ghost-section-title">✏️ Writing</div>
            <div class="ghost-options">
              ${selectTextColorHtml("ghostTextColorSelect", "Writing Color", state.remix.textColor, state.remix.background)}
              ${selectOptionHtml("ghostThicknessSelect", "Line Size", state.remix.thickness, THICKNESS)}
            </div>
          </div>

          <div class="ghost-remix-section">
            <div class="ghost-section-title">🏷️ Verse Tag</div>
            <div class="ghost-options">
              ${selectOptionHtml("ghostReferenceDesignSelect", "Verse Design", state.referenceDecorationStyle || "box", REFERENCE_DECORATION_OPTIONS)}
            </div>
          </div>

          <div class="ghost-remix-section">
            <div class="ghost-section-title">👻 Ghost Effect</div>
            <div class="ghost-options">
              ${selectOptionHtml("ghostVaporSelect", "Ghost Trail", state.remix.vapor || "normal", VAPOR_LEVELS)}
              ${selectOptionHtml("ghostSpeedSelect", "Ghost Speed", state.remix.speed, SPEEDS)}
            </div>
          </div>

          <div class="ghost-remix-section">
            <div class="ghost-section-title">🔲 Frame</div>
            <div class="ghost-options">
              ${selectOptionHtml("ghostBorderStyleSelect", "Frame Style", state.remix.borderStyle, BORDER_STYLES)}
            </div>
          </div>

          <div class="ghost-remix-section ghost-remix-section-actions">
            <div class="ghost-section-title">🎬 Actions</div>
            <div class="ghost-remix-actions">
              <button class="vm-btn" id="ghostReplayBtn" type="button">Replay</button>
              <button class="vm-btn vm-btn-secondary" id="ghostSaveImageBtn" type="button">Save Picture</button>
              <button class="vm-btn vm-btn-secondary" id="ghostAgainBtn" type="button">Start Over</button>
              <button class="vm-btn vm-btn-secondary ghost-full" id="ghostBackBtn" type="button">Back to Playground</button>
            </div>
          </div>
    ` : `
          <div class="ghost-remix-section">
            <div class="ghost-section-title">🖼️ Background</div>
            <div class="ghost-options">
              ${selectBackgroundHtml("ghostBackgroundSelect", "Background", state.remix.background)}
            </div>
          </div>

          <div class="ghost-remix-section">
            <div class="ghost-section-title">✏️ Writing</div>
            <div class="ghost-options">
              ${selectTextColorHtml("ghostTextColorSelect", "Writing Color", state.remix.textColor, state.remix.background)}
              ${selectOptionHtml("ghostThicknessSelect", "Line Size", state.remix.thickness, THICKNESS)}
              ${selectSimpleHtml("ghostJitterSelect", "Wiggly Placement", state.remix.jitter, { off: "Off", on: "On" })}
              ${selectSimpleHtml("ghostWobbleSelect", "Wobble Letters", state.remix.wobble, { off: "Off", on: "On" })}
            </div>
          </div>

          <div class="ghost-remix-section">
            <div class="ghost-section-title">🏷️ Verse Tag</div>
            <div class="ghost-options">
              ${selectOptionHtml("ghostReferenceDesignSelect", "Verse Design", state.referenceDecorationStyle || "box", REFERENCE_DECORATION_OPTIONS)}
              ${selectTextColorHtml("ghostReferenceTextColorSelect", "Verse Words Color", state.remix.referenceTextColor || state.remix.textColor, state.remix.background)}
              ${selectTextColorHtml("ghostReferenceDecorationColorSelect", "Verse Design Color", state.remix.referenceDecorationColor || state.remix.referenceTextColor || state.remix.textColor, state.remix.background)}
            </div>
          </div>

          <div class="ghost-remix-section">
            <div class="ghost-section-title">👻 Ghost Effect</div>
            <div class="ghost-options">
              ${selectOptionHtml("ghostToolSelect", "Writing Tool", state.remix.tool || "pencil", PLAYBACK_TOOLS)}
              ${selectOptionHtml("ghostVaporSelect", "Ghost Trail", state.remix.vapor || "normal", VAPOR_LEVELS)}
              ${selectOptionHtml("ghostSpookySoundsSelect", "Spooky Sounds", state.remix.spookySounds || "on", SPOOKY_SOUND_OPTIONS)}
              ${selectOptionHtml("ghostSpeedSelect", "Ghost Speed", state.remix.speed, SPEEDS)}
            </div>
          </div>

          <div class="ghost-remix-section">
            <div class="ghost-section-title">🔲 Frame</div>
            <div class="ghost-options">
              ${selectOptionHtml("ghostBorderStyleSelect", "Frame Style", state.remix.borderStyle, BORDER_STYLES)}
              ${selectOptionHtml("ghostBorderThicknessSelect", "Frame Size", state.remix.borderThickness, BORDER_THICKNESS)}
              ${selectOptionHtml("ghostBorderColorSelect", "Frame Color", state.remix.borderColor, COLOR_PALETTE)}
            </div>
          </div>

          <div class="ghost-remix-section ghost-remix-section-actions">
            <div class="ghost-section-title">🎬 Actions &amp; Download</div>
            <div class="ghost-remix-actions">
              <button class="vm-btn" id="ghostReplayBtn" type="button">Replay</button>
              <button class="vm-btn vm-btn-secondary" id="ghostAgainBtn" type="button">Start Over</button>
              ${selectOptionHtml("ghostExportSizeSelect", "Picture Shape", state.remix.exportSize || "square", EXPORT_SIZES)}
              <button class="vm-btn vm-btn-secondary" id="ghostSaveImageBtn" type="button">Save Picture</button>
              
              <button class="vm-btn vm-btn-secondary ghost-full" id="ghostBackBtn" type="button">Back to Playground</button>
            </div>
          </div>
    `;

    app.innerHTML = rootHtml(`
      <div class="ghost-remix-header">
        <div class="ghost-remix-title">Remix Your Verse</div>
      </div>

      <div class="ghost-card ghost-remix-card">
        <div class="ghost-remix-preview ${escapeHtml(background.cardClass || "")}" id="ghostRemixPreview">
          <canvas id="ghostRemixCanvas" aria-label="Ghost Writer preview"></canvas>
        </div>

        <div class="ghost-remix-mode-toggle" role="group" aria-label="Remix settings mode">
          <button
            class="ghost-remix-mode-btn ${isSimple ? "is-active" : "is-inactive"}"
            type="button"
            data-remix-mode="simple"
            aria-pressed="${isSimple ? "true" : "false"}"
          >Simple</button>
          <button
            class="ghost-remix-mode-btn ${!isSimple ? "is-active" : "is-inactive"}"
            type="button"
            data-remix-mode="more"
            aria-pressed="${!isSimple ? "true" : "false"}"
          >More Options</button>
        </div>

        <div class="ghost-remix-scroll">
          ${settingsHtml}
        </div>
      </div>

      <div class="ghost-confirm-overlay" id="ghostStartOverConfirm" hidden>
        <div
          class="ghost-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ghostStartOverTitle"
          aria-describedby="ghostStartOverText"
        >
          <div class="ghost-confirm-title" id="ghostStartOverTitle">Start over?</div>
          <p class="ghost-confirm-text" id="ghostStartOverText">
            This will erase your handwriting practice for this verse.
          </p>
          <div class="ghost-confirm-actions">
            <button class="vm-btn vm-btn-secondary" id="ghostStartOverCancelBtn" type="button">Cancel</button>
            <button class="vm-btn" id="ghostStartOverConfirmBtn" type="button">Start Over</button>
          </div>
        </div>
      </div>
    `, { menu: true, wide: true, rootClass: "is-remix-screen" });

    wireMenu();
    wireRemixControls();
    drawRemixPreview();
  }


  function selectOptionHtml(id, label, value, source) {
    const options = Object.entries(source).map(([key, obj]) => {
      const selected = key === value ? " selected" : "";
      return `<option value="${escapeHtml(key)}"${selected}>${escapeHtml(obj.label || key)}</option>`;
    }).join("");

    return `
      <div class="ghost-option">
        <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
        <select id="${escapeHtml(id)}">${options}</select>
      </div>
    `;
  }

  function selectSimpleHtml(id, label, value, source) {
    const options = Object.entries(source).map(([key, labelText]) => {
      const selected = key === value ? " selected" : "";
      return `<option value="${escapeHtml(key)}"${selected}>${escapeHtml(labelText)}</option>`;
    }).join("");

    return `
      <div class="ghost-option">
        <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
        <select id="${escapeHtml(id)}">${options}</select>
      </div>
    `;
  }

  function selectBackgroundHtml(id, label, value) {
    const options = Object.entries(BACKGROUNDS).map(([key, obj]) => {
      const selected = key === value ? " selected" : "";
      return `<option value="${escapeHtml(key)}"${selected}>${escapeHtml(obj.label || key)}</option>`;
    }).join("");

    return `
      <div class="ghost-option">
        <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
        <select id="${escapeHtml(id)}">${options}</select>
      </div>
    `;
  }

  function selectTextColorHtml(id, label, value, backgroundKey) {
    const options = Object.entries(TEXT_COLORS).map(([key, obj]) => {
      const selected = key === value ? " selected" : "";
      const disabled = isTextColorAllowedForBackground(key, backgroundKey) ? "" : " disabled";
      const note = disabled ? " · unavailable" : "";

      return `<option value="${escapeHtml(key)}"${selected}${disabled}>${escapeHtml(obj.label || key)}${note}</option>`;
    }).join("");

    return `
      <div class="ghost-option">
        <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
        <select id="${escapeHtml(id)}">${options}</select>
      </div>
    `;
  }

  function wireRemixControls() {
    const background = document.getElementById("ghostBackgroundSelect");
    const textColor = document.getElementById("ghostTextColorSelect");
    const speed = document.getElementById("ghostSpeedSelect");
    const thickness = document.getElementById("ghostThicknessSelect");
    const jitter = document.getElementById("ghostJitterSelect");
    const wobble = document.getElementById("ghostWobbleSelect");
    const tool = document.getElementById("ghostToolSelect");
    const vapor = document.getElementById("ghostVaporSelect");
    const spookySounds = document.getElementById("ghostSpookySoundsSelect");
    const referenceDesign = document.getElementById("ghostReferenceDesignSelect");
    const referenceTextColor = document.getElementById("ghostReferenceTextColorSelect");
    const referenceDecorationColor = document.getElementById("ghostReferenceDecorationColorSelect");
    const exportSize = document.getElementById("ghostExportSizeSelect");
    const borderStyle = document.getElementById("ghostBorderStyleSelect");
    const borderThickness = document.getElementById("ghostBorderThicknessSelect");
    const borderColor = document.getElementById("ghostBorderColorSelect");
    const remixModeButtons = Array.from(document.querySelectorAll("[data-remix-mode]"));

    const update = () => {
      state.remix.background = background?.value || state.remix.background;
      state.remix.style = state.remix.background;
      state.remix.textColor = textColor?.value || state.remix.textColor;
      state.remix.speed = speed?.value || state.remix.speed;
      state.remix.thickness = thickness?.value || state.remix.thickness;
      state.remix.jitter = jitter?.value || state.remix.jitter;
      state.remix.wobble = wobble?.value || state.remix.wobble;
      state.remix.tool = tool?.value || state.remix.tool;
      state.remix.vapor = vapor?.value || state.remix.vapor;
      state.remix.spookySounds = spookySounds?.value || state.remix.spookySounds || "on";

      if (referenceDesign?.value && REFERENCE_DECORATION_STYLES.includes(referenceDesign.value)) {
        state.referenceDecorationStyle = referenceDesign.value;
      }

      state.remix.referenceTextColor = referenceTextColor?.value || state.remix.referenceTextColor || state.remix.textColor;
      state.remix.referenceDecorationColor = referenceDecorationColor?.value || state.remix.referenceDecorationColor || state.remix.referenceTextColor || state.remix.textColor;

      state.remix.exportSize = exportSize?.value || state.remix.exportSize;
      state.remix.borderStyle = borderStyle?.value || state.remix.borderStyle;
      state.remix.borderThickness = borderThickness?.value || state.remix.borderThickness;
      state.remix.borderColor = borderColor?.value || state.remix.borderColor;

      sanitizeRemixOptions(state.remix);

      if (state.remixMode === "simple") {
        state.remix.referenceTextColor = state.remix.textColor;
        state.remix.referenceDecorationColor = state.remix.textColor;
        state.remix.borderColor = state.remix.textColor;
        sanitizeRemixOptions(state.remix);
      }

      if (textColor && textColor.value !== state.remix.textColor) {
        textColor.value = state.remix.textColor;
      }

      if (referenceTextColor && referenceTextColor.value !== state.remix.referenceTextColor) {
        referenceTextColor.value = state.remix.referenceTextColor;
      }

      if (referenceDecorationColor && referenceDecorationColor.value !== state.remix.referenceDecorationColor) {
        referenceDecorationColor.value = state.remix.referenceDecorationColor;
      }

      refreshTextColorOptions();

      const preview = document.getElementById("ghostRemixPreview");
      if (preview) {
        preview.classList.remove("is-chalkboard", "is-paper");
        const backgroundConfig = getBackgroundConfig(state.remix);
        if (backgroundConfig.cardClass) preview.classList.add(backgroundConfig.cardClass);
      }

      drawRemixPreview();
    };

    [background, textColor, speed, thickness, jitter, wobble, tool, vapor, spookySounds, referenceDesign, referenceTextColor, referenceDecorationColor, exportSize, borderStyle, borderThickness, borderColor].forEach((el) => {
      if (el) el.onchange = update;
    });

    remixModeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextMode = btn.dataset.remixMode === "more" ? "more" : "simple";
        if (state.remixMode === nextMode) return;

        playUiTapSound();
        state.remixMode = nextMode;
        renderRemix();
      });
    });

    document.getElementById("ghostReplayBtn")?.addEventListener("click", () => {
      playUiTapSound();
      sanitizeRemixOptions(state.remix);
      renderPlayback({ options: { ...state.remix }, markPractice: false, returnTo: "remix" });
    });

    document.getElementById("ghostSaveImageBtn")?.addEventListener("click", () => {
      playUiTapSound();
      sanitizeRemixOptions(state.remix);

      const imageOptions = state.remixMode === "simple"
        ? { ...state.remix, exportSize: "phone" }
        : { ...state.remix };

      saveGhostWriterImage(imageOptions);
    });

    const saveVideoBtn = document.getElementById("ghostSaveVideoBtn");

    if (saveVideoBtn && !isReplayVideoSupported()) {
      saveVideoBtn.hidden = true;
    }

    saveVideoBtn?.addEventListener("click", async () => {
      playUiTapSound();

      if (!isReplayVideoSupported()) {
        saveVideoBtn.hidden = true;
        return;
      }

      sanitizeRemixOptions(state.remix);

      const originalText = saveVideoBtn.textContent;
      saveVideoBtn.disabled = true;
      saveVideoBtn.textContent = "Making Video...";

      try {
        await saveGhostWriterReplayVideo({ ...state.remix });
      } catch (err) {
        console.warn("Ghost Writer video export failed", err);
        alert("Sorry, this browser could not save the replay video.");
      } finally {
        saveVideoBtn.disabled = false;
        saveVideoBtn.textContent = originalText || "Save Replay Video";
      }
    });

    const startOverBtn = document.getElementById("ghostAgainBtn");
    const startOverConfirm = document.getElementById("ghostStartOverConfirm");
    const startOverCancelBtn = document.getElementById("ghostStartOverCancelBtn");
    const startOverConfirmBtn = document.getElementById("ghostStartOverConfirmBtn");

    const closeStartOverConfirm = () => {
      if (!startOverConfirm) return;
      startOverConfirm.hidden = true;
      startOverBtn?.focus?.();
    };

    const openStartOverConfirm = () => {
      if (!startOverConfirm) return;
      startOverConfirm.hidden = false;
      startOverConfirmBtn?.focus?.();
    };

    startOverBtn?.addEventListener("click", () => {
      playUiTapSound();
      openStartOverConfirm();
    });

    startOverCancelBtn?.addEventListener("click", () => {
      playUiTapSound();
      closeStartOverConfirm();
    });

    startOverConfirmBtn?.addEventListener("click", () => {
      playUiTapSound();
      startRun(selectedMode);
    });

    startOverConfirm?.addEventListener("click", (event) => {
      if (event.target !== startOverConfirm) return;
      playUiTapSound();
      closeStartOverConfirm();
    });

    startOverConfirm?.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      playUiTapSound();
      closeStartOverConfirm();
    });

    document.getElementById("ghostBackBtn")?.addEventListener("click", () => {
      playUiTapSound();
      bridge().exitGame?.();
    });

    refreshTextColorOptions();
  }

  function refreshTextColorOptions() {
    const selects = [
      document.getElementById("ghostTextColorSelect"),
      document.getElementById("ghostReferenceTextColorSelect"),
      document.getElementById("ghostReferenceDecorationColorSelect")
    ].filter(Boolean);

    const backgroundKey = state.remix.background;

    for (const select of selects) {
      for (const option of Array.from(select.options)) {
        const allowed = isTextColorAllowedForBackground(option.value, backgroundKey);
        option.disabled = !allowed;
        option.textContent = `${TEXT_COLORS[option.value]?.label || option.value}${allowed ? "" : " · unavailable"}`;
      }
    }
  }


  function getGlyph(char, variantKey = 0) {
    const stored = state.glyphs.get(char);

    if (Array.isArray(stored)) {
      if (!stored.length) return null;
      return stored[getGlyphVariationIndex(char, variantKey, stored.length)] || stored[0] || null;
    }

    return stored || null;
  }

  function glyphWidthUnits(char) {
    if (/\s/.test(char)) return .38;
    const glyph = getGlyph(char);
    if (!glyph) return .65;
    const minimum = isSymbolChar(char) ? .20 : .42;
    return clamp(glyph.widthRatio + .16, minimum, .98);
  }

  function getGlyphRenderProfile(char) {
    return GLYPH_RENDER_PROFILES[String(char || "")] || null;
  }

  function getGlyphUsableArea(char, fontSize, cellW) {
    const profile = getGlyphRenderProfile(char);
    const defaultH = fontSize * 1.04;
    const defaultW = Math.max(fontSize * .14, cellW * .88);

    if (!profile) {
      return {
        usableW: defaultW,
        usableH: defaultH,
        verticalAlign: "normal",
        yOffset: 0
      };
    }

    return {
      usableW: Math.max(fontSize * .10, Math.min(defaultW, fontSize * profile.widthScale)),
      usableH: Math.max(fontSize * .10, fontSize * profile.heightScale),
      verticalAlign: profile.verticalAlign || "middle",
      yOffset: profile.yOffset || 0
    };
  }

  function getGlyphBaseYForProfile(baselineY, fontSize, usableH, drawH, profileInfo) {
    const align = profileInfo?.verticalAlign || "normal";
    const offset = (profileInfo?.yOffset || 0) * fontSize;

    if (align === "top") {
      return baselineY - fontSize * .82 + offset;
    }

    if (align === "middle") {
      return baselineY - fontSize * .80 + (fontSize * 1.04 - usableH) / 2 + (usableH - drawH) / 2 + offset;
    }

    if (align === "bottom") {
      return baselineY - drawH + fontSize * .17 + offset;
    }

    return baselineY - usableH * .80 + (usableH - drawH) / 2 + offset;
  }

  function makeLayout(width, height, options = {}) {
    const contentRect = getCanvasContentRect(width, height, options);
    const safeWidth = Math.max(120, contentRect.width);
    const safeHeight = Math.max(120, contentRect.height);
    const maxWidth = safeWidth * .94;
    const maxHeight = safeHeight * .88;

    const dynamicMax = Math.min(
      safeWidth * .17,
      safeHeight * .24,
      132
    );

    const maxFontSize = Math.max(28, dynamicMax);
    const minFontSize = 12;
    let best = null;

    for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
      const layout = layoutVerseAndReferenceForFontSize(
        fontSize,
        maxWidth,
        maxHeight,
        safeWidth,
        safeHeight,
        contentRect.x,
        contentRect.y
      );

      if (!layout.overflows) {
        best = layout;
        break;
      }
    }

    if (best) return best;

    return layoutVerseAndReferenceForFontSize(
      minFontSize,
      maxWidth,
      maxHeight,
      safeWidth,
      safeHeight,
      contentRect.x,
      contentRect.y
    );
  }

  function getDynamicVerseLineHeightMultiplier({
    verseLayout,
    fontSize,
    maxHeight,
    referenceGap = 0,
    dividerExtra = 0,
    referenceZoneHeight = 0
  }) {
    const lineCount = Math.max(1, verseLayout?.lineCount || 1);

    if (lineCount <= 1) {
      return LINE_SPACING.base;
    }

    const fixedReferenceHeight = referenceGap + dividerExtra + referenceZoneHeight;
    const baseTotalHeight = (verseLayout?.height || 0) + fixedReferenceHeight;
    const extraSpace = Math.max(0, maxHeight - baseTotalHeight);

    if (extraSpace <= 0) {
      return LINE_SPACING.base;
    }

    const usableExtra = extraSpace * LINE_SPACING.extraSpaceUse;
    const maxExtra = (LINE_SPACING.max - LINE_SPACING.base) * fontSize * lineCount;
    const appliedExtra = Math.min(usableExtra, maxExtra);

    return clamp(
      LINE_SPACING.base + appliedExtra / Math.max(1, fontSize * lineCount),
      LINE_SPACING.base,
      LINE_SPACING.max
    );
  }

  function layoutVerseAndReferenceForFontSize(fontSize, maxWidth, maxHeight, canvasWidth, canvasHeight, offsetX = 0, offsetY = 0) {
    const verseText = state.verseTextOnly || state.fullText || "";
    const refText = state.referenceText || "";
    const hasReference = Boolean(refText);
    const baseLineHeight = fontSize * LINE_SPACING.base;
    const referenceStyle = state.referenceDecorationStyle || "box";
    const refFontSize = Math.max(10, fontSize * REFERENCE_DECORATION.refScale);
    const referenceZoneHeight = hasReference ? baseLineHeight * REFERENCE_DECORATION.zoneHeightLines : 0;
    const referenceGap = hasReference ? baseLineHeight * REFERENCE_DECORATION.beforeGapLines : 0;
    const dividerExtra = hasReference && referenceStyle === "divider" ? baseLineHeight * REFERENCE_DECORATION.dividerExtraLines : 0;
    const verseMaxHeight = Math.max(40, maxHeight - referenceGap - dividerExtra - referenceZoneHeight);

    const baseVerseLayout = layoutForFontSize(
      verseText,
      fontSize,
      maxWidth,
      verseMaxHeight,
      canvasWidth,
      verseMaxHeight,
      offsetX,
      0,
      {
        verticalAlign: "top",
        lineHeightMultiplier: LINE_SPACING.base
      }
    );

    const verseLineHeightMultiplier = getDynamicVerseLineHeightMultiplier({
      verseLayout: baseVerseLayout,
      fontSize,
      maxHeight,
      referenceGap,
      dividerExtra,
      referenceZoneHeight
    });

    const verseLayout = verseLineHeightMultiplier === LINE_SPACING.base
      ? baseVerseLayout
      : layoutForFontSize(
        verseText,
        fontSize,
        maxWidth,
        verseMaxHeight,
        canvasWidth,
        verseMaxHeight,
        offsetX,
        0,
        {
          verticalAlign: "top",
          lineHeightMultiplier: verseLineHeightMultiplier
        }
      );

    const totalHeight = verseLayout.height + referenceGap + dividerExtra + referenceZoneHeight;
    const startY = offsetY + Math.max(fontSize * .9, (canvasHeight - totalHeight) / 2 + fontSize * .76);

    const placements = verseLayout.placements.map((item) => ({
      ...item,
      y: item.y + startY - fontSize * .76,
      section: "verse"
    }));

    let referenceDecoration = null;

    if (hasReference) {
      const referenceZoneTop = startY - fontSize * .76 + verseLayout.height + referenceGap + dividerExtra;
      const referenceBaselineY = referenceZoneTop + referenceZoneHeight * .62;
      const referenceItems = makeReferenceLinePlacements(
        refText,
        refFontSize,
        maxWidth,
        canvasWidth,
        offsetX,
        referenceBaselineY
      );

      for (const item of referenceItems.placements) {
        placements.push(item);
      }

      referenceDecoration = makeReferenceDecorationLayout({
        style: referenceStyle,
        referenceItems,
        referenceZoneTop,
        referenceZoneHeight,
        referenceBaselineY,
        lineHeight: baseLineHeight,
        fontSize,
        refFontSize,
        maxWidth,
        canvasWidth,
        offsetX
      });
    }

    const usedWidth = Math.max(verseLayout.width, referenceDecoration?.width || 0);
    const overflows = verseLayout.overflows || usedWidth > maxWidth + 1 || totalHeight > maxHeight + 1;

    return {
      placements,
      fontSize,
      lineHeight: verseLayout.lineHeight,
      verseLineHeightMultiplier,
      height: totalHeight,
      width: usedWidth,
      lineCount: verseLayout.lineCount + (hasReference ? 1 : 0),
      referenceDecoration,
      overflows
    };
  }

  function makeReferenceLinePlacements(text, fontSize, maxWidth, canvasWidth, offsetX, baselineY) {
    const chars = Array.from(String(text || ""));
    const items = [];
    const rawWidth = chars.reduce((sum, char) => sum + fontSize * glyphWidthUnits(char), 0);
    const safeWidth = Math.min(rawWidth, maxWidth);
    let scaleDown = rawWidth > maxWidth ? maxWidth / Math.max(1, rawWidth) : 1;
    const finalFontSize = Math.max(8, fontSize * scaleDown);
    const finalWidth = chars.reduce((sum, char) => sum + finalFontSize * glyphWidthUnits(char), 0);

    let x = offsetX + (canvasWidth - finalWidth) / 2;

    for (const char of chars) {
      const w = finalFontSize * glyphWidthUnits(char);
      items.push({
        char,
        x,
        y: baselineY,
        w,
        h: finalFontSize,
        fontSize: finalFontSize,
        section: "reference"
      });
      x += w;
    }

    return {
      placements: items,
      x: offsetX + (canvasWidth - finalWidth) / 2,
      y: baselineY,
      width: safeWidth,
      finalWidth,
      fontSize: finalFontSize
    };
  }

  function makeReferenceDecorationLayout(info) {
    const items = info.referenceItems?.placements || [];
    const visible = items.filter((item) => item && !/\s/.test(item.char));
    const first = visible[0] || items[0];
    const last = visible[visible.length - 1] || items[items.length - 1] || first;

    if (!first || !last) return null;

    const refLeft = first.x;
    const refRight = last.x + last.w;
    const refCenterX = (refLeft + refRight) / 2;
    const refWidth = Math.max(20, refRight - refLeft);
    const style = info.style || "box";
    const fontSize = info.fontSize;
    const refFontSize = info.referenceItems.fontSize || info.refFontSize;
    const zoneTop = info.referenceZoneTop;
    const zoneHeight = info.referenceZoneHeight;
    const zoneBottom = zoneTop + zoneHeight;
    const zoneCenterY = zoneTop + zoneHeight / 2;

    let padX = fontSize * REFERENCE_DECORATION.boxPadX;
    let padY = fontSize * REFERENCE_DECORATION.boxPadY;

    if (style === "cloud") {
      padX = fontSize * REFERENCE_DECORATION.cloudPadX;
      padY = fontSize * REFERENCE_DECORATION.cloudPadY;
    }

    if (style === "loop") {
      padX = fontSize * REFERENCE_DECORATION.loopPadX;
      padY = fontSize * REFERENCE_DECORATION.loopPadY;
    }

    if (style === "stars") {
      padX = fontSize * REFERENCE_DECORATION.starPadX;
      padY = fontSize * .18;
    }

    let boxW = refWidth + padX * 2;
    let boxH = Math.min(zoneHeight * .94, Math.max(refFontSize * 1.35, zoneHeight * .74));

    // Tweak Settings for Cloud Puff Verse Tag
    if (style === "cloud") {
      const cloudExtraWidth = 1.8;
      const cloudHeight = 2.2;

      boxW = refWidth + refFontSize * cloudExtraWidth;
      boxH = refFontSize * cloudHeight;
    }

    const boxX = refCenterX - boxW / 2;
    const boxY = zoneCenterY - boxH / 2;

    const dividerY = zoneTop - info.lineHeight * .15;
    const dividerW = Math.min(info.maxWidth * .72, Math.max(refWidth * 1.25, fontSize * 5.4));
    const dividerX = info.offsetX + info.canvasWidth / 2 - dividerW / 2;

    return {
      type: "referenceDecoration",
      style,
      x: boxX,
      y: boxY,
      w: boxW,
      h: boxH,
      refLeft,
      refRight,
      refCenterX,
      refBaselineY: info.referenceBaselineY,
      zoneTop,
      zoneBottom,
      zoneCenterY,
      dividerX,
      dividerY,
      dividerW,
      fontSize,
      refFontSize,
      width: Math.max(boxW, dividerW)
    };
  }

  function layoutForFontSize(text, fontSize, maxWidth, maxHeight, canvasWidth, canvasHeight, offsetX = 0, offsetY = 0, options = {}) {
    const lineHeightMultiplier = options.lineHeightMultiplier || LINE_SPACING.base;
    const lineHeight = fontSize * lineHeightMultiplier;
    const placements = [];
    const lines = [];
    const verticalAlign = options.verticalAlign || "center";
    let line = [];
    let lineWidth = 0;
    let pendingSpace = false;
    let splitLongToken = false;

    const pushLine = () => {
      lines.push({ items: line, width: lineWidth });
      line = [];
      lineWidth = 0;
      pendingSpace = false;
    };

    const makeItem = (char) => {
      const widthUnits = glyphWidthUnits(char);
      const w = fontSize * widthUnits;
      return { char, w, fontSize };
    };

    const appendItems = (items, width) => {
      line.push(...items);
      lineWidth += width;
    };

    const addCharEmergency = (char) => {
      const item = makeItem(char);

      if (line.length && lineWidth + item.w > maxWidth) {
        pushLine();
      }

      appendItems([item], item.w);
    };

    const tokens = String(text || "").match(/\n|\s+|\S+/g) || [];

    for (const token of tokens) {
      if (token === "\n") {
        pushLine();
        continue;
      }

      if (/^\s+$/.test(token)) {
        pendingSpace = line.length > 0;
        continue;
      }

      const chars = Array.from(token);
      const tokenItems = chars.map(makeItem);
      const tokenWidth = tokenItems.reduce((sum, item) => sum + item.w, 0);
      const spaceItem = makeItem(" ");
      const spaceWidth = pendingSpace && line.length ? spaceItem.w : 0;

      // If a whole word can fit on an empty line, keep it together.
      // This prevents layouts like UNDERSTANDI / NG.
      if (tokenWidth <= maxWidth) {
        if (line.length && lineWidth + spaceWidth + tokenWidth > maxWidth) {
          pushLine();
        }

        if (pendingSpace && line.length) {
          appendItems([spaceItem], spaceWidth);
        }

        appendItems(tokenItems, tokenWidth);
        pendingSpace = false;
        continue;
      }

      // Emergency fallback only: the word is wider than the whole allowed line.
      // Mark this layout as overflowing so the fitter tries a smaller font first.
      splitLongToken = true;

      if (line.length) {
        pushLine();
      }

      for (const char of chars) {
        addCharEmergency(char);
      }

      pendingSpace = false;
    }

    if (line.length || !lines.length) pushLine();

    const totalHeight = lines.length * lineHeight;
    const startBaseline = verticalAlign === "top"
      ? offsetY + fontSize * .76
      : offsetY + Math.max(fontSize * .9, (canvasHeight - totalHeight) / 2 + fontSize * .76);

    let y = startBaseline;

    for (const currentLine of lines) {
      let x = offsetX + (canvasWidth - currentLine.width) / 2;
      for (const item of currentLine.items) {
        placements.push({
          char: item.char,
          x,
          y,
          w: item.w,
          h: fontSize,
          fontSize
        });
        x += item.w;
      }
      y += lineHeight;
    }

    const usedWidth = Math.max(...lines.map((l) => l.width), 0);

    return {
      placements,
      fontSize,
      lineHeight,
      lineHeightMultiplier,
      height: totalHeight,
      width: usedWidth,
      lineCount: lines.length,
      overflows: splitLongToken || usedWidth > maxWidth + 1 || totalHeight > maxHeight + 1
    };
  }


  function drawGlyph(c, glyph, x, baselineY, cellW, fontSize, options = {}, partial = 1) {
    if (!glyph || !glyph.strokes || !glyph.strokes.length) return;

    const ink = getInkForOptions(options);
    const thickness = THICKNESS[options.thickness] || THICKNESS.normal;
    const jitterOn = options.jitter === "on";
    const wobbleOn = options.wobble === "on";

    const bounds = glyph.bounds || computeBounds(glyph.strokes);
    const profileInfo = getGlyphUsableArea(glyph.char, fontSize, cellW);
    const usableH = profileInfo.usableH;
    const usableW = profileInfo.usableW;
    const scale = Math.min(
      usableW / Math.max(.04, bounds.width),
      usableH / Math.max(.04, bounds.height)
    );

    const drawW = bounds.width * scale;
    const drawH = bounds.height * scale;
    const baseX = x + (cellW - drawW) / 2 - bounds.minX * scale;
    const baseY = getGlyphBaseYForProfile(baselineY, fontSize, usableH, drawH, profileInfo) - bounds.minY * scale;

    const jitterX = jitterOn ? stableNoise(`${glyph.char}-${x}-x`) * fontSize * .08 : 0;
    const jitterY = jitterOn ? stableNoise(`${glyph.char}-${x}-y`) * fontSize * .06 : 0;
    const rotation = wobbleOn ? stableNoise(`${glyph.char}-${x}-r`) * .09 : 0;

    c.save();
    c.translate(x + cellW / 2 + jitterX, baselineY - fontSize * .36 + jitterY);
    c.rotate(rotation);
    c.translate(-(x + cellW / 2), -(baselineY - fontSize * .36));

    c.strokeStyle = ink;
    c.fillStyle = ink;
    c.lineWidth = Math.max(1.8, fontSize * .075 * thickness.multiplier);
    c.lineCap = "round";
    c.lineJoin = "round";
    c.shadowColor = getShadowForInk(ink, options);
    c.shadowBlur = getBackgroundKey(options) === "ghost" ? fontSize * .16 : fontSize * .045;

    const safePartial = clamp(partial, 0, 1);
    const strokeUnits = glyph.strokes.map((stroke) => getStrokePlaybackUnits(stroke));
    const totalUnits = strokeUnits.reduce((sum, units) => sum + units, 0) || 1;
    let remainingUnits = totalUnits * safePartial;

    for (let strokeIndex = 0; strokeIndex < glyph.strokes.length; strokeIndex += 1) {
      const stroke = glyph.strokes[strokeIndex];
      const units = strokeUnits[strokeIndex] || 1;

      if (!stroke || !stroke.length) continue;

      if (remainingUnits <= 0) {
        break;
      }

      const strokeProgress = clamp(remainingUnits / units, 0, 1);

      if (stroke.length === 1) {
        if (strokeProgress >= 1) {
          const p = stroke[0];
          c.beginPath();
          c.arc(baseX + p.x * scale, baseY + p.y * scale, c.lineWidth * 1.08, 0, Math.PI * 2);
          c.fill();
        }

        remainingUnits -= units;
        continue;
      }

      drawStrokeProgress(c, stroke, baseX, baseY, scale, strokeProgress);

      remainingUnits -= units;

      if (strokeProgress < 1) {
        break;
      }
    }

    c.restore();
  }

  function getStrokePlaybackUnits(stroke) {
    if (!stroke || !stroke.length) return 1;
    if (stroke.length === 1) return 1;
    return Math.max(1, stroke.length - 1);
  }

  function drawReferenceDecoration(c, decoration, options = {}, partial = 1) {
    if (!decoration) return;

    const strokes = getReferenceDecorationStrokes(decoration);
    if (!strokes.length) return;

    const ink = getInkForColorKey(getReferenceDecorationColorKey(options), options);
    const thickness = THICKNESS[options.thickness] || THICKNESS.normal;
    const fontSize = decoration.fontSize || 44;

    c.save();
    c.strokeStyle = ink;
    c.fillStyle = ink;
    c.lineWidth = Math.max(1.8, fontSize * .045 * thickness.multiplier);
    c.lineCap = "round";
    c.lineJoin = "round";
    c.shadowColor = getShadowForInk(ink, options);
    c.shadowBlur = getBackgroundKey(options) === "ghost" ? fontSize * .10 : fontSize * .035;

    drawPointStrokesProgress(c, strokes, clamp(partial, 0, 1));

    c.restore();
  }

  function getReferenceDecorationPieceCount(decoration) {
    return getReferenceDecorationStrokes(decoration).reduce((sum, stroke) => {
      return sum + Math.max(1, stroke.length - 1);
    }, 0) || 1;
  }

  function getReferenceDecorationTip(decoration, options = {}, partial = 1) {
    const strokes = getReferenceDecorationStrokes(decoration);
    const point = getPointFromPointStrokes(strokes, partial);

    if (!point) return null;

    return {
      x: point.x,
      y: point.y,
      angleDeg: point.angleDeg || 0
    };
  }

  function getReferenceDecorationStrokes(decoration) {
    if (!decoration) return [];

    if (decoration.style === "divider") return makeDividerStrokes(decoration);
    if (decoration.style === "underline") return makeUnderlineStrokes(decoration);
    if (decoration.style === "loop") return makeLoopStrokes(decoration);
    if (decoration.style === "cloud") return makeCloudStrokes(decoration);
    if (decoration.style === "stars") return makeStarStrokes(decoration);

    return makeBoxStrokes(decoration);
  }

  function drawPointStrokesProgress(c, strokes, progress) {
    const safeProgress = clamp(progress, 0, 1);
    const strokeUnits = strokes.map((stroke) => Math.max(1, (stroke?.length || 0) - 1));
    const totalUnits = strokeUnits.reduce((sum, units) => sum + units, 0) || 1;
    let remainingUnits = totalUnits * safeProgress;

    for (let strokeIndex = 0; strokeIndex < strokes.length; strokeIndex += 1) {
      const stroke = strokes[strokeIndex];
      const units = strokeUnits[strokeIndex] || 1;

      if (!stroke || stroke.length < 2) continue;
      if (remainingUnits <= 0) break;

      const strokeProgress = clamp(remainingUnits / units, 0, 1);
      drawRawPointStrokeProgress(c, stroke, strokeProgress);
      remainingUnits -= units;

      if (strokeProgress < 1) break;
    }
  }

  function drawRawPointStrokeProgress(c, stroke, progress) {
    const safeProgress = clamp(progress, 0, 1);
    const segmentCount = stroke.length - 1;
    const piecesToDraw = segmentCount * safeProgress;

    if (piecesToDraw <= .08) return;

    c.beginPath();
    c.moveTo(stroke[0].x, stroke[0].y);

    let drewAnyLine = false;

    for (let i = 1; i < stroke.length; i += 1) {
      const previousPieceIndex = i - 1;

      if (previousPieceIndex + 1 <= piecesToDraw) {
        c.lineTo(stroke[i].x, stroke[i].y);
        drewAnyLine = true;
        continue;
      }

      const remain = piecesToDraw - previousPieceIndex;

      if (remain > .08) {
        const a = stroke[i - 1];
        const b = stroke[i];
        c.lineTo(a.x + (b.x - a.x) * remain, a.y + (b.y - a.y) * remain);
        drewAnyLine = true;
      }

      break;
    }

    if (drewAnyLine) c.stroke();
  }

  function getPointFromPointStrokes(strokes, progress) {
    const safeProgress = clamp(progress, 0, 1);
    const strokeUnits = strokes.map((stroke) => Math.max(1, (stroke?.length || 0) - 1));
    const totalUnits = strokeUnits.reduce((sum, units) => sum + units, 0) || 1;
    let remainingUnits = totalUnits * safeProgress;

    for (let strokeIndex = 0; strokeIndex < strokes.length; strokeIndex += 1) {
      const stroke = strokes[strokeIndex];
      const units = strokeUnits[strokeIndex] || 1;

      if (!stroke || stroke.length < 2) continue;

      if (remainingUnits > units) {
        remainingUnits -= units;
        continue;
      }

      const strokeProgress = clamp(remainingUnits / units, 0, 1);
      return getPointOnRawStroke(stroke, strokeProgress);
    }

    const lastStroke = strokes[strokes.length - 1];
    return lastStroke?.[lastStroke.length - 1] || null;
  }

  function getPointOnRawStroke(stroke, progress) {
    if (!stroke || !stroke.length) return null;
    if (stroke.length === 1) return stroke[0];

    const safeProgress = clamp(progress, 0, 1);
    const segmentCount = stroke.length - 1;
    const pieces = segmentCount * safeProgress;
    const index = Math.min(segmentCount - 1, Math.floor(pieces));
    const remain = clamp(pieces - index, 0, 1);
    const a = stroke[index];
    const b = stroke[index + 1] || a;

    return {
      x: a.x + (b.x - a.x) * remain,
      y: a.y + (b.y - a.y) * remain,
      angleDeg: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
    };
  }

  function makeBoxStrokes(d) {
    const over = d.fontSize * .045;
    const wobble = d.fontSize * .022;
    const x1 = d.x - over;
    const y1 = d.y;
    const x2 = d.x + d.w + over;
    const y2 = d.y + d.h;

    return [
      [
        { x: x1, y: y1 + wobble },
        { x: d.x + d.w * .32, y: y1 - wobble },
        { x: d.x + d.w * .68, y: y1 + wobble },
        { x: x2, y: y1 }
      ],
      [
        { x: x2 - wobble, y: y1 - over },
        { x: x2 + wobble, y: d.y + d.h * .50 },
        { x: x2 - wobble, y: y2 + over }
      ],
      [
        { x: x2, y: y2 - wobble },
        { x: d.x + d.w * .66, y: y2 + wobble },
        { x: d.x + d.w * .33, y: y2 - wobble },
        { x: x1, y: y2 }
      ],
      [
        { x: x1 + wobble, y: y2 + over },
        { x: x1 - wobble, y: d.y + d.h * .50 },
        { x: x1 + wobble, y: y1 - over }
      ]
    ];
  }

  function makeDividerStrokes(d) {
    const points = [];
    const steps = 44;
    const amp = Math.max(2, d.fontSize * .035);

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      points.push({
        x: d.dividerX + d.dividerW * t,
        y: d.dividerY + Math.sin(t * Math.PI * 18) * amp
      });
    }

    return [points];
  }

  function makeUnderlineStrokes(d) {
    const strokes = [];
    const y = d.refBaselineY + d.refFontSize * .36;
    const left = d.refLeft - d.refFontSize * .18;
    const right = d.refRight + d.refFontSize * .18;

    for (let pass = 0; pass < 3; pass += 1) {
      const fromLeft = pass % 2 === 0;
      const points = [];
      const steps = 18;
      const startX = fromLeft ? left : right;
      const endX = fromLeft ? right : left;

      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        points.push({
          x: startX + (endX - startX) * t,
          y: y + pass * d.refFontSize * .095 + Math.sin(t * Math.PI * 5) * d.refFontSize * .025
        });
      }

      strokes.push(points);
    }

    return strokes;
  }

  function makeLoopStrokes(d) {
    return [
      makePillLoopStroke(d, {
        expandX: d.fontSize * .06,
        expandY: d.fontSize * .04,
        offsetX: 0,
        offsetY: 0,
        seed: "loop-a"
      }),
      makePillLoopStroke(d, {
        expandX: d.fontSize * .095,
        expandY: d.fontSize * .06,
        offsetX: d.fontSize * .018,
        offsetY: -d.fontSize * .012,
        seed: "loop-b"
      })
    ];
  }

  function makePillLoopStroke(d, {
    expandX = 0,
    expandY = 0,
    offsetX = 0,
    offsetY = 0,
    seed = "loop"
  } = {}) {
    const x = d.x - expandX + offsetX;
    const y = d.y - expandY + offsetY;
    const w = d.w + expandX * 2;
    const h = d.h + expandY * 2;
    const r = Math.min(h / 2, w / 2);
    const left = x;
    const right = x + w;
    const top = y;
    const bottom = y + h;
    const cxLeft = left + r;
    const cxRight = right - r;
    const cy = top + h / 2;
    const points = [];
    const wobble = Math.max(1.1, d.fontSize * .018);
    let pointIndex = 0;

    function pushPoint(px, py) {
      points.push({
        x: px + stableNoise(`${seed}-x-${pointIndex}`) * wobble,
        y: py + stableNoise(`${seed}-y-${pointIndex}`) * wobble
      });
      pointIndex += 1;
    }

    const topSteps = 12;
    const arcSteps = 18;
    const bottomSteps = 12;

    for (let i = 0; i <= topSteps; i += 1) {
      const t = i / topSteps;
      pushPoint(cxLeft + (cxRight - cxLeft) * t, top);
    }

    for (let i = 1; i <= arcSteps; i += 1) {
      const t = i / arcSteps;
      const a = -Math.PI / 2 + t * Math.PI;
      pushPoint(cxRight + Math.cos(a) * r, cy + Math.sin(a) * r);
    }

    for (let i = 1; i <= bottomSteps; i += 1) {
      const t = i / bottomSteps;
      pushPoint(cxRight + (cxLeft - cxRight) * t, bottom);
    }

    for (let i = 1; i <= arcSteps; i += 1) {
      const t = i / arcSteps;
      const a = Math.PI / 2 + t * Math.PI;
      pushPoint(cxLeft + Math.cos(a) * r, cy + Math.sin(a) * r);
    }

    if (points.length) {
      points.push({ ...points[0] });
    }

    return points;
  }

  function makeCloudStrokes(d) {
    const referenceCharCount = String(state.referenceText || "")
      .replace(/\s+/g, " ")
      .trim()
      .length;

    const targetRatio = d.h ? d.w / d.h : 0;
    const useSuperLongCloud = referenceCharCount
      ? referenceCharCount >= 12
      : targetRatio >= 3.25;

    const cloudPath = useSuperLongCloud ? CLOUD_SUPER_LONG_SVG_PATH : CLOUD_LONG_SVG_PATH;
    const cloudViewBox = useSuperLongCloud ? CLOUD_SUPER_LONG_SVG_VIEWBOX : CLOUD_LONG_SVG_VIEWBOX;
    const cloudSeed = useSuperLongCloud ? "cloud-super-long" : "cloud-long";

    const template = getSvgOutlineTemplatePoints(
      cloudPath,
      cloudViewBox.width,
      cloudViewBox.height,
      240
    );

    return [
      fitSvgTemplateToRect(template, {
        sourceWidth: cloudViewBox.width,
        sourceHeight: cloudViewBox.height,
        x: d.x,
        y: d.y,
        w: d.w,
        h: d.h,
        seed: cloudSeed,
        stretch: true
      })
    ];
  }

  function getSvgOutlineTemplatePoints(pathData, viewWidth, viewHeight, sampleCount = 180) {
    const cacheKey = `${viewWidth}|${viewHeight}|${sampleCount}|${pathData}`;
    const cached = REFERENCE_OUTLINE_CACHE.get(cacheKey);

    if (cached) {
      return cached;
    }

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
    svg.setAttribute("width", String(viewWidth));
    svg.setAttribute("height", String(viewHeight));
    svg.style.position = "absolute";
    svg.style.left = "-9999px";
    svg.style.top = "-9999px";
    svg.style.width = "0";
    svg.style.height = "0";
    svg.style.overflow = "hidden";
    svg.style.pointerEvents = "none";
    svg.style.opacity = "0";

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "none");

    svg.appendChild(path);
    document.body.appendChild(svg);

    const totalLength = Math.max(1, path.getTotalLength());
    const points = [];

    for (let i = 0; i <= sampleCount; i += 1) {
      const lengthAt = totalLength * (i / sampleCount);
      const point = path.getPointAtLength(lengthAt);

      points.push({
        x: point.x,
        y: point.y
      });
    }

    document.body.removeChild(svg);
    REFERENCE_OUTLINE_CACHE.set(cacheKey, points);

    return points;
  }

  function fitSvgTemplateToRect(templatePoints, {
    sourceWidth,
    sourceHeight,
    x,
    y,
    w,
    h,
    seed = "shape",
    stretch = false
  }) {
    const scaleX = stretch ? (w * .985) / sourceWidth : Math.min((w * .985) / sourceWidth, (h * .985) / sourceHeight);
    const scaleY = stretch ? (h * .985) / sourceHeight : scaleX;
    const drawW = sourceWidth * scaleX;
    const drawH = sourceHeight * scaleY;
    const offsetX = x + (w - drawW) / 2;
    const offsetY = y + (h - drawH) / 2;
    const wobble = Math.max(.45, Math.min(drawW, drawH) * .008);

    return templatePoints.map((point, index) => ({
      x: offsetX + point.x * scaleX + stableNoise(`${seed}-x-${index}`) * wobble,
      y: offsetY + point.y * scaleY + stableNoise(`${seed}-y-${index}`) * wobble
    }));
  }

  function makeStarStrokes(d) {
    const size = Math.max(12, d.refFontSize * .52);
    const y = d.refBaselineY - d.refFontSize * .38;
    const gap = d.refFontSize * 1.05;
    const leftX = d.refLeft - gap;
    const rightX = d.refRight + gap;

    return [
      makePentagramStroke(leftX, y, size, "left"),
      makePentagramStroke(rightX, y, size, "right")
    ];
  }

  function makePentagramStroke(cx, cy, r, seed = "star") {
    const order = [0, 2, 4, 1, 3, 0];
    const outer = [];

    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const pointR = r * (1 + stableNoise(`${seed}-star-r-${i}`) * .11);
      outer.push({
        x: cx + Math.cos(a) * pointR + stableNoise(`${seed}-star-x-${i}`) * r * .12,
        y: cy + Math.sin(a) * pointR + stableNoise(`${seed}-star-y-${i}`) * r * .12
      });
    }

    return order.map((index, i) => ({
      x: outer[index].x + stableNoise(`${seed}-star-line-x-${i}`) * r * .06,
      y: outer[index].y + stableNoise(`${seed}-star-line-y-${i}`) * r * .06
    }));
  }

  function drawStrokeProgress(c, stroke, baseX, baseY, scale, progress) {
    const safeProgress = clamp(progress, 0, 1);

    if (!stroke || stroke.length < 2) return;

    const segmentCount = stroke.length - 1;
    const piecesToDraw = segmentCount * safeProgress;

    if (piecesToDraw <= .08) {
      return;
    }

    c.beginPath();
    c.moveTo(baseX + stroke[0].x * scale, baseY + stroke[0].y * scale);

    let drewAnyLine = false;

    for (let i = 1; i < stroke.length; i += 1) {
      const previousPieceIndex = i - 1;

      if (previousPieceIndex + 1 <= piecesToDraw) {
        c.lineTo(baseX + stroke[i].x * scale, baseY + stroke[i].y * scale);
        drewAnyLine = true;
        continue;
      }

      const remain = piecesToDraw - previousPieceIndex;

      if (remain > .08) {
        const a = stroke[i - 1];
        const b = stroke[i];
        const x1 = a.x + (b.x - a.x) * remain;
        const y1 = a.y + (b.y - a.y) * remain;

        c.lineTo(baseX + x1 * scale, baseY + y1 * scale);
        drewAnyLine = true;
      }

      break;
    }

    if (drewAnyLine) {
      c.stroke();
    }
  }

  function countStrokePieces(strokes) {
    let total = 0;
    for (const stroke of strokes || []) {
      total += Math.max(1, (stroke?.length || 0) - 1);
    }
    return Math.max(1, total);
  }

  function stableNoise(seed) {
    let h = 2166136261;
    const text = String(seed || "");
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) / 4294967295) * 2 - 1;
  }

  function getBackgroundKey(options = {}) {
    return options.background || options.style || "ghost";
  }

  function getBackgroundConfig(options = {}) {
    const key = getBackgroundKey(options);
    return BACKGROUNDS[key] || BACKGROUNDS.ghost;
  }

  function getBackgroundImage(src) {
    if (!src) return null;

    if (backgroundImageCache.has(src)) {
      return backgroundImageCache.get(src);
    }

    const img = new Image();
    img.decoding = "async";
    img.src = src;

    backgroundImageCache.set(src, img);

    img.onload = () => {
      if (state.screen === "remix") {
        drawRemixPreview();
      }
    };

    return img;
  }

  function drawCoverImage(c, img, width, height) {
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) {
      return false;
    }

    const imageRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = width / height;

    let sourceX = 0;
    let sourceY = 0;
    let sourceW = img.naturalWidth;
    let sourceH = img.naturalHeight;

    if (imageRatio > canvasRatio) {
      sourceW = img.naturalHeight * canvasRatio;
      sourceX = (img.naturalWidth - sourceW) / 2;
    } else {
      sourceH = img.naturalWidth / canvasRatio;
      sourceY = (img.naturalHeight - sourceH) / 2;
    }

    c.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, width, height);
    return true;
  }

  function getTextColorKey(options = {}) {
    return options._inkColorKey || options.textColor || defaultTextColorForBackground(getBackgroundKey(options));
  }

  function getColorValue(key) {
    return COLOR_PALETTE[key]?.value || "";
  }

  function defaultTextColorForBackground(backgroundKey) {
    const background = BACKGROUNDS[backgroundKey] || BACKGROUNDS.ghost;

    if (backgroundKey === "lightGray" || backgroundKey === "paper" || backgroundKey === "yellow") {
      return "darkGray";
    }

    return "lightGray";
  }

  function isRainbowAllowedForBackground(backgroundKey) {
    return [
      "ghost",
      "snow",
      "paper",
      "notebook",
      "treasureMap",
      "crackedStone",
      "lightGray",
      "darkGray"
    ].includes(backgroundKey);
  }

  function isTextColorAllowedForBackground(textColorKey, backgroundKey) {
    if (textColorKey === "rainbow") {
      return isRainbowAllowedForBackground(backgroundKey);
    }

    const background = BACKGROUNDS[backgroundKey] || BACKGROUNDS.ghost;
    const textValue = getColorValue(textColorKey);

    if (!textValue) return false;

    return background.kind !== "solid" || background.value.toLowerCase() !== textValue.toLowerCase();
  }

  function sanitizeRemixOptions(options = state.remix) {
    const backgroundKey = getBackgroundKey(options);
    let textColorKey = getTextColorKey(options);
    let referenceTextColorKey = options.referenceTextColor || textColorKey;
    let referenceDecorationColorKey = options.referenceDecorationColor || referenceTextColorKey;

    if (!isTextColorAllowedForBackground(textColorKey, backgroundKey)) {
      textColorKey = defaultTextColorForBackground(backgroundKey);

      if (!isTextColorAllowedForBackground(textColorKey, backgroundKey)) {
        textColorKey = backgroundKey === "lightGray" ? "darkGray" : "lightGray";
      }
    }

    if (!isTextColorAllowedForBackground(referenceTextColorKey, backgroundKey)) {
      referenceTextColorKey = textColorKey;

      if (!isTextColorAllowedForBackground(referenceTextColorKey, backgroundKey)) {
        referenceTextColorKey = defaultTextColorForBackground(backgroundKey);
      }
    }

    if (!isTextColorAllowedForBackground(referenceDecorationColorKey, backgroundKey)) {
      referenceDecorationColorKey = referenceTextColorKey;

      if (!isTextColorAllowedForBackground(referenceDecorationColorKey, backgroundKey)) {
        referenceDecorationColorKey = textColorKey;
      }
    }

    options.background = backgroundKey;
    options.textColor = textColorKey;
    options.referenceTextColor = referenceTextColorKey;
    options.referenceDecorationColor = referenceDecorationColorKey;
    options.style = backgroundKey;
    options.spookySounds = options.spookySounds === "off" ? "off" : "on";

    return options;
  }

  function getInkForOptions(options = {}) {
    return getInkForColorKey(getTextColorKey(options), options);
  }

  function getReferenceTextColorKey(options = {}) {
    return options.referenceTextColor || getTextColorKey(options);
  }

  function getReferenceDecorationColorKey(options = {}) {
    return options.referenceDecorationColor || getReferenceTextColorKey(options);
  }

  function getInkForColorKey(colorKey, options = {}) {
    const backgroundKey = getBackgroundKey(options);
    const safeColorKey = colorKey || getTextColorKey(options);

    if (safeColorKey === "rainbow" && isRainbowAllowedForBackground(backgroundKey)) {
      const index = Number(options._colorIndex) || 0;
      return RAINBOW_INKS[index % RAINBOW_INKS.length];
    }

    return getColorValue(safeColorKey) || COLOR_PALETTE.lightGray.value;
  }

  function getShadowForInk(ink, options = {}) {
    const backgroundKey = getBackgroundKey(options);

    if (backgroundKey === "lightGray" || backgroundKey === "paper" || backgroundKey === "yellow") {
      return "rgba(0,0,0,.14)";
    }

    if (getTextColorKey(options) === "rainbow") {
      return "rgba(255,255,255,.24)";
    }

    if (ink === "#333333" || ink === "#a36f44") {
      return "rgba(0,0,0,.18)";
    }

    return "rgba(255,255,255,.25)";
  }

  function getCrayonToolSrc(options = {}) {
    const textColorKey = getTextColorKey(options);
    const crayonKey = textColorKey === "rainbow" ? "rainbow" : textColorKey;

    return CRAYON_TOOL_IMAGES[crayonKey] || CRAYON_TOOL_IMAGES.red;
  }

  function getPlaybackToolConfig(options = {}) {
    const toolKey = options.tool || "pencil";
    const baseTool = PLAYBACK_TOOLS[toolKey] || PLAYBACK_TOOLS.pencil;
    const src = toolKey === "crayon" ? getCrayonToolSrc(options) : baseTool.src;

    return {
      ...PLAYBACK_TOOL,
      ...baseTool,
      src
    };
  }

  function getVaporConfig(options = {}) {
    return VAPOR_LEVELS[options.vapor || "normal"] || VAPOR_LEVELS.normal;
  }

  function getBorderColorValue(options = {}) {
    return getColorValue(options.borderColor || "lightGray") || COLOR_PALETTE.lightGray.value;
  }

  function isDoodleBorderStyle(style) {
    return Boolean(DOODLE_BORDER_SVGS[style]);
  }

  function getDoodleBorderImage(src) {
    if (!src) return null;

    if (borderDoodleImageCache.has(src)) {
      return borderDoodleImageCache.get(src);
    }

    const img = new Image();
    img.decoding = "async";
    img.src = src;

    borderDoodleImageCache.set(src, img);

    img.onload = () => {
      if (state.screen === "remix") {
        drawRemixPreview();
      }
    };

    return img;
  }

  function getTintedDoodleCanvas(img, color, size) {
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return null;

    const safeSize = Math.max(8, Math.round(size));
    const cacheKey = `${img.src}|${color}|${safeSize}`;

    if (tintedBorderDoodleCache.has(cacheKey)) {
      return tintedBorderDoodleCache.get(cacheKey);
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = safeSize;
    offscreen.height = safeSize;

    const oc = offscreen.getContext("2d");
    oc.clearRect(0, 0, safeSize, safeSize);
    oc.drawImage(img, 0, 0, safeSize, safeSize);
    oc.globalCompositeOperation = "source-in";
    oc.fillStyle = color;
    oc.fillRect(0, 0, safeSize, safeSize);
    oc.globalCompositeOperation = "source-over";

    tintedBorderDoodleCache.set(cacheKey, offscreen);
    return offscreen;
  }

  function getDoodleBorderSizing(width, height, options = {}) {
    const thicknessConfig = BORDER_THICKNESS[options.borderThickness] || BORDER_THICKNESS.medium;
    const base = Math.min(width, height);
    const size = clamp(base * (.052 + thicknessConfig.size * .0026), 28, 88);
    const spacing = size * 1.22;
    const inset = Math.max(size * .72, base * .042);

    return { size, spacing, inset };
  }

  function makeDoodleBorderPositions(x, y, w, h, spacing) {
    const left = x;
    const top = y;
    const right = x + w;
    const bottom = y + h;
    const spanX = Math.max(1, right - left);
    const spanY = Math.max(1, bottom - top);
    const targetSpacing = Math.max(18, spacing);

    const baseGapCountH = Math.max(1, Math.round(spanX / targetSpacing));
    const baseGapCountV = Math.max(1, Math.round(spanY / targetSpacing));

    let best = null;

    for (let gapCountH = Math.max(1, baseGapCountH - 2); gapCountH <= baseGapCountH + 2; gapCountH += 1) {
      for (let gapCountV = Math.max(1, baseGapCountV - 2); gapCountV <= baseGapCountV + 2; gapCountV += 1) {
        const spacingH = spanX / gapCountH;
        const spacingV = spanY / gapCountV;
        const spacingDiff = Math.abs(spacingH - spacingV);
        const targetPenalty = Math.abs(spacingH - targetSpacing) + Math.abs(spacingV - targetSpacing);
        const countPenalty = Math.abs(gapCountH - baseGapCountH) + Math.abs(gapCountV - baseGapCountV);
        const score = spacingDiff * 2.5 + targetPenalty * .6 + countPenalty * 1.2;

        if (!best || score < best.score) {
          best = {
            gapCountH,
            gapCountV,
            spacingH,
            spacingV,
            score
          };
        }
      }
    }

    const positions = [];
    const spacingH = best.spacingH;
    const spacingV = best.spacingV;

    for (let i = 0; i <= best.gapCountH; i += 1) {
      positions.push({
        x: left + spacingH * i,
        y: top,
        side: "top",
        corner: i === 0 || i === best.gapCountH
      });
    }

    for (let i = 1; i <= best.gapCountV; i += 1) {
      positions.push({
        x: right,
        y: top + spacingV * i,
        side: "right",
        corner: i === best.gapCountV
      });
    }

    for (let i = 1; i <= best.gapCountH; i += 1) {
      positions.push({
        x: right - spacingH * i,
        y: bottom,
        side: "bottom",
        corner: i === best.gapCountH
      });
    }

    for (let i = 1; i < best.gapCountV; i += 1) {
      positions.push({
        x: left,
        y: bottom - spacingV * i,
        side: "left",
        corner: false
      });
    }

    return {
      positions,
      spacingH,
      spacingV,
      gapCountH: best.gapCountH,
      gapCountV: best.gapCountV
    };
  }


  function drawSvgDoodleBorder(c, width, height, options = {}) {
    const style = options.borderStyle || "none";
    const doodle = DOODLE_BORDER_SVGS[style];
    if (!doodle) return false;

    const img = getDoodleBorderImage(doodle.src);
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return true;

    const borderColor = getBorderColorValue(options);
    const sizing = getDoodleBorderSizing(width, height, options);
    const stamp = getTintedDoodleCanvas(img, borderColor, sizing.size);
    if (!stamp) return true;

    const x = sizing.inset;
    const y = sizing.inset;
    const w = Math.max(1, width - sizing.inset * 2);
    const h = Math.max(1, height - sizing.inset * 2);
    const placement = makeDoodleBorderPositions(x, y, w, h, sizing.spacing);
    const positions = placement.positions;

    c.save();

    for (let i = 0; i < positions.length; i += 1) {
      const pos = positions[i];
      const wiggle = pos.corner ? sizing.size * .04 : sizing.size * .07;
      const px = pos.x + stableNoise(`${style}-border-x-${i}-${pos.side}`) * wiggle;
      const py = pos.y + stableNoise(`${style}-border-y-${i}-${pos.side}`) * wiggle;
      const tilt = stableNoise(`${style}-border-tilt-${i}`) * .07;

      c.save();
      c.translate(px, py);
      c.rotate(tilt);
      c.drawImage(stamp, -sizing.size / 2, -sizing.size / 2, sizing.size, sizing.size);
      c.restore();
    }

    c.restore();
    return true;
  }

  function drawRemixBorder(c, width, height, options = {}) {
    const style = options.borderStyle || "none";
    if (style === "none") return;

    if (isDoodleBorderStyle(style)) {
      drawSvgDoodleBorder(c, width, height, options);
      return;
    }

    const thicknessConfig = BORDER_THICKNESS[options.borderThickness] || BORDER_THICKNESS.medium;
    const borderColor = getBorderColorValue(options);
    const lineWidth = thicknessConfig.size;
    const inset = Math.max(14, lineWidth * 2.2);
    const radius = Math.max(20, Math.min(width, height) * .045);
    const x = inset;
    const y = inset;
    const w = Math.max(1, width - inset * 2);
    const h = Math.max(1, height - inset * 2);

    c.save();
    c.strokeStyle = borderColor;
    c.lineWidth = lineWidth;
    c.lineJoin = "round";
    c.lineCap = "round";

    if (style === "dashed") {
      c.setLineDash([lineWidth * 2.8, lineWidth * 1.7]);
    }

    if (style === "dotted") {
      c.setLineDash([lineWidth * .2, lineWidth * 1.8]);
      c.lineCap = "round";
    }

    if (style === "glow") {
      c.shadowColor = borderColor;
      c.shadowBlur = lineWidth * 3.4;
      c.globalAlpha = .72;
      roundRectPath(c, x, y, w, h, radius);
      c.stroke();

      c.shadowBlur = lineWidth * 1.2;
      c.globalAlpha = 1;
      c.lineWidth = Math.max(2, lineWidth * .55);
      roundRectPath(c, x, y, w, h, radius);
      c.stroke();

      c.restore();
      return;
    }

    if (style === "double") {
      c.lineWidth = Math.max(2, lineWidth * .55);
      roundRectPath(c, x, y, w, h, radius);
      c.stroke();

      const gap = Math.max(7, lineWidth * 1.25);
      roundRectPath(c, x + gap, y + gap, Math.max(1, w - gap * 2), Math.max(1, h - gap * 2), Math.max(8, radius - gap * .6));
      c.stroke();

      c.restore();
      return;
    }

    roundRectPath(c, x, y, w, h, radius);
    c.stroke();
    c.restore();
  }

  function getCanvasContentRect(width, height, options = {}) {
    const style = options.borderStyle || "none";

    if (style === "none") {
      return {
        x: 0,
        y: 0,
        width,
        height
      };
    }

    const thicknessConfig = BORDER_THICKNESS[options.borderThickness] || BORDER_THICKNESS.medium;
    const lineWidth = thicknessConfig.size;

    if (isDoodleBorderStyle(style)) {
      const sizing = getDoodleBorderSizing(width, height, options);
      const inset = sizing.inset + sizing.size * .72;

      return {
        x: inset,
        y: inset,
        width: Math.max(80, width - inset * 2),
        height: Math.max(80, height - inset * 2)
      };
    }

    const borderInset = Math.max(14, lineWidth * 2.2);
    const extraGap = Math.max(26, lineWidth * 3.2);
    const inset = borderInset + extraGap;

    return {
      x: inset,
      y: inset,
      width: Math.max(80, width - inset * 2),
      height: Math.max(80, height - inset * 2)
    };
  }

  function roundRectPath(c, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));

    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + width - r, y);
    c.quadraticCurveTo(x + width, y, x + width, y + r);
    c.lineTo(x + width, y + height - r);
    c.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    c.lineTo(x + r, y + height);
    c.quadraticCurveTo(x, y + height, x, y + height - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function clearPlaybackCanvas(c, width, height, options) {
    const background = getBackgroundConfig(options);

    c.save();
    c.fillStyle = background.value;
    c.fillRect(0, 0, width, height);

    if (background.texture === "image") {
      const img = getBackgroundImage(background.imageSrc);

      if (!drawCoverImage(c, img, width, height)) {
        c.fillStyle = background.value;
        c.fillRect(0, 0, width, height);
      }

      c.restore();

      drawRemixBorder(c, width, height, options);
      return;
    }

    if (background.texture === "ghost") {
      c.globalAlpha = .16;
      const glow = c.createRadialGradient(width * .5, height * .18, 0, width * .5, height * .18, Math.max(width, height) * .58);
      glow.addColorStop(0, "rgba(255,255,255,.42)");
      glow.addColorStop(.46, "rgba(150,160,255,.16)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = glow;
      c.fillRect(0, 0, width, height);
    }

    if (background.texture === "chalkboard") {
      const boardGlow = c.createRadialGradient(width * .5, height * .35, 0, width * .5, height * .35, Math.max(width, height) * .72);
      boardGlow.addColorStop(0, "rgba(255,255,255,.08)");
      boardGlow.addColorStop(.55, "rgba(255,255,255,.025)");
      boardGlow.addColorStop(1, "rgba(0,0,0,.16)");
      c.fillStyle = boardGlow;
      c.fillRect(0, 0, width, height);



      c.globalAlpha = .09;
      c.fillStyle = "#ffffff";

      for (let i = 0; i < 56; i += 1) {
        const x = (stableNoise(`chalk-dust-x-${i}`) * .5 + .5) * width;
        const y = (stableNoise(`chalk-dust-y-${i}`) * .5 + .5) * height;
        const r = Math.max(10, Math.min(width, height) * (.018 + (stableNoise(`chalk-dust-r-${i}`) * .5 + .5) * .035));
        const dust = c.createRadialGradient(x, y, 0, x, y, r);
        dust.addColorStop(0, "rgba(255,255,255,.22)");
        dust.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = dust;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }

    if (background.texture === "paper") {
      c.globalAlpha = .18;
      c.fillStyle = "#d7b98b";

      for (let y = 32; y < height; y += 32) {
        c.fillRect(0, y, width, 1);
      }

      c.globalAlpha = .05;
      for (let x = 0; x < width; x += 22) {
        c.fillRect(x, 0, 1, height);
      }
    }

    if (background.texture === "notebook") {
      const paperGlow = c.createLinearGradient(0, 0, 0, height);
      paperGlow.addColorStop(0, "#ffffff");
      paperGlow.addColorStop(1, "#eef7ff");
      c.globalAlpha = 1;
      c.fillStyle = paperGlow;
      c.fillRect(0, 0, width, height);

      c.globalAlpha = .24;
      c.fillStyle = "#80b7e8";
      const lineGap = Math.max(24, height * .055);

      for (let y = lineGap; y < height; y += lineGap) {
        c.fillRect(0, y, width, Math.max(1, height * .002));
      }

      c.globalAlpha = .04;
      c.fillStyle = "#53606f";
      for (let i = 0; i < 120; i += 1) {
        const x = (stableNoise(`notebook-speck-x-${i}`) * .5 + .5) * width;
        const y = (stableNoise(`notebook-speck-y-${i}`) * .5 + .5) * height;
        c.fillRect(x, y, 1.5, 1.5);
      }
    }

    if (background.texture === "starryNight") {
      const sky = c.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#071126");
      sky.addColorStop(.55, "#101c3f");
      sky.addColorStop(1, "#02040b");
      c.globalAlpha = 1;
      c.fillStyle = sky;
      c.fillRect(0, 0, width, height);

      const moonGlow = c.createRadialGradient(width * .78, height * .20, 0, width * .78, height * .20, Math.max(width, height) * .38);
      moonGlow.addColorStop(0, "rgba(255,255,230,.30)");
      moonGlow.addColorStop(.42, "rgba(200,215,255,.12)");
      moonGlow.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = moonGlow;
      c.fillRect(0, 0, width, height);

      for (let i = 0; i < 120; i += 1) {
        const x = (stableNoise(`star-x-${i}`) * .5 + .5) * width;
        const y = (stableNoise(`star-y-${i}`) * .5 + .5) * height;
        const r = Math.max(.8, Math.min(width, height) * (.0015 + (stableNoise(`star-r-${i}`) * .5 + .5) * .003));
        c.globalAlpha = .35 + (stableNoise(`star-a-${i}`) * .5 + .5) * .55;
        c.fillStyle = "#ffffff";
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }

    if (background.texture === "purpleMist") {
      const mistBg = c.createLinearGradient(0, 0, width, height);
      mistBg.addColorStop(0, "#191221");
      mistBg.addColorStop(.45, "#2b1742");
      mistBg.addColorStop(1, "#0e1019");
      c.globalAlpha = 1;
      c.fillStyle = mistBg;
      c.fillRect(0, 0, width, height);

      for (let i = 0; i < 12; i += 1) {
        const x = (stableNoise(`mist-x-${i}`) * .5 + .5) * width;
        const y = (stableNoise(`mist-y-${i}`) * .5 + .5) * height;
        const r = Math.max(width, height) * (.16 + (stableNoise(`mist-r-${i}`) * .5 + .5) * .22);
        const mist = c.createRadialGradient(x, y, 0, x, y, r);
        mist.addColorStop(0, "rgba(180,130,255,.18)");
        mist.addColorStop(.5, "rgba(120,190,230,.07)");
        mist.addColorStop(1, "rgba(255,255,255,0)");
        c.globalAlpha = 1;
        c.fillStyle = mist;
        c.fillRect(0, 0, width, height);
      }
    }

    if (background.texture === "treasureMap") {
      const parchment = c.createRadialGradient(width * .5, height * .45, 0, width * .5, height * .45, Math.max(width, height) * .72);
      parchment.addColorStop(0, "#f0d89c");
      parchment.addColorStop(.62, "#d9b874");
      parchment.addColorStop(1, "#9e6f38");
      c.globalAlpha = 1;
      c.fillStyle = parchment;
      c.fillRect(0, 0, width, height);

      c.globalAlpha = .12;
      c.strokeStyle = "#6f451f";
      c.lineWidth = Math.max(1, Math.min(width, height) * .004);

      for (let i = 0; i < 18; i += 1) {
        const y = (i + 1) * height / 19;
        c.beginPath();
        c.moveTo(width * .05, y + stableNoise(`map-line-a-${i}`) * 12);
        c.bezierCurveTo(
          width * .28,
          y + stableNoise(`map-line-b-${i}`) * 22,
          width * .62,
          y + stableNoise(`map-line-c-${i}`) * 22,
          width * .95,
          y + stableNoise(`map-line-d-${i}`) * 12
        );
        c.stroke();
      }

      c.globalAlpha = .13;
      c.fillStyle = "#5f3b1a";
      for (let i = 0; i < 90; i += 1) {
        const x = (stableNoise(`map-speck-x-${i}`) * .5 + .5) * width;
        const y = (stableNoise(`map-speck-y-${i}`) * .5 + .5) * height;
        const r = Math.max(1.2, Math.min(width, height) * (.002 + (stableNoise(`map-speck-r-${i}`) * .5 + .5) * .006));
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }

    if (background.texture === "rainbow") {
      const rainbow = c.createLinearGradient(0, 0, width, height);
      rainbow.addColorStop(0, "#ff5a51");
      rainbow.addColorStop(.18, "#ffa351");
      rainbow.addColorStop(.34, "#ffc751");
      rainbow.addColorStop(.50, "#a7cb6f");
      rainbow.addColorStop(.68, "#40b9c5");
      rainbow.addColorStop(.84, "#7f66c6");
      rainbow.addColorStop(1, "#ff9bd2");
      c.globalAlpha = 1;
      c.fillStyle = rainbow;
      c.fillRect(0, 0, width, height);

      c.globalAlpha = .24;
      c.fillStyle = "#ffffff";
      for (let i = 0; i < 14; i += 1) {
        const y = (i - 2) * height / 10;
        c.beginPath();
        c.ellipse(width * .5, y, width * .78, height * .12, -.24, 0, Math.PI * 2);
        c.fill();
      }
    }

    if (background.texture === "wood") {
      const wood = c.createLinearGradient(0, 0, width, height);
      wood.addColorStop(0, "#a36f44");
      wood.addColorStop(.5, "#7c4d2b");
      wood.addColorStop(1, "#5d351d");
      c.globalAlpha = 1;
      c.fillStyle = wood;
      c.fillRect(0, 0, width, height);

      c.globalAlpha = .22;
      c.strokeStyle = "#3e2414";
      c.lineWidth = Math.max(1, Math.min(width, height) * .004);

      for (let y = 0; y < height; y += Math.max(18, height * .055)) {
        c.beginPath();
        c.moveTo(0, y);
        for (let x = 0; x <= width; x += width / 8) {
          c.lineTo(x, y + stableNoise(`wood-${x}-${y}`) * height * .018);
        }
        c.stroke();
      }

      c.globalAlpha = .16;
      for (let i = 0; i < 8; i += 1) {
        const x = (stableNoise(`knot-x-${i}`) * .5 + .5) * width;
        const y = (stableNoise(`knot-y-${i}`) * .5 + .5) * height;
        c.beginPath();
        c.ellipse(x, y, width * .045, height * .018, stableNoise(`knot-r-${i}`), 0, Math.PI * 2);
        c.stroke();
      }
    }

    if (background.texture === "crackedStone") {
      const stone = c.createRadialGradient(width * .5, height * .42, 0, width * .5, height * .42, Math.max(width, height) * .72);
      stone.addColorStop(0, "#a0a6ad");
      stone.addColorStop(.55, "#777d83");
      stone.addColorStop(1, "#4b5056");
      c.globalAlpha = 1;
      c.fillStyle = stone;
      c.fillRect(0, 0, width, height);

      c.globalAlpha = .20;
      c.strokeStyle = "#2d3135";
      c.lineWidth = Math.max(1.2, Math.min(width, height) * .004);

      for (let i = 0; i < 18; i += 1) {
        let x = (stableNoise(`crack-x-${i}`) * .5 + .5) * width;
        let y = (stableNoise(`crack-y-${i}`) * .5 + .5) * height;
        c.beginPath();
        c.moveTo(x, y);

        for (let j = 0; j < 4; j += 1) {
          x += stableNoise(`crack-x-${i}-${j}`) * width * .10;
          y += stableNoise(`crack-y-${i}-${j}`) * height * .10;
          c.lineTo(x, y);
        }

        c.stroke();
      }

      c.globalAlpha = .10;
      c.fillStyle = "#ffffff";
      for (let i = 0; i < 70; i += 1) {
        const x = (stableNoise(`stone-speck-x-${i}`) * .5 + .5) * width;
        const y = (stableNoise(`stone-speck-y-${i}`) * .5 + .5) * height;
        c.fillRect(x, y, 2, 2);
      }
    }

    if (background.texture === "grass") {
      const skyGrass = c.createLinearGradient(0, 0, 0, height);
      skyGrass.addColorStop(0, "#dff7ff");
      skyGrass.addColorStop(.48, "#eefdf0");
      skyGrass.addColorStop(.49, "#92d36d");
      skyGrass.addColorStop(1, "#3e8c32");
      c.globalAlpha = 1;
      c.fillStyle = skyGrass;
      c.fillRect(0, 0, width, height);

      c.globalAlpha = .25;
      c.strokeStyle = "#1f6f25";
      c.lineWidth = Math.max(1, width * .002);

      for (let i = 0; i < 120; i += 1) {
        const x = (stableNoise(`grass-x-${i}`) * .5 + .5) * width;
        const baseY = height * (.58 + (stableNoise(`grass-y-${i}`) * .5 + .5) * .38);
        const bladeH = height * (.025 + (stableNoise(`grass-h-${i}`) * .5 + .5) * .055);
        c.beginPath();
        c.moveTo(x, baseY);
        c.lineTo(x + stableNoise(`grass-lean-${i}`) * width * .014, baseY - bladeH);
        c.stroke();
      }
    }

    c.restore();

    drawRemixBorder(c, width, height, options);
  }



  function drawCompleteText(c, width, height, options) {
    const cleanOptions = sanitizeRemixOptions({ ...options });
    const layout = makeLayout(width, height, cleanOptions);
    clearPlaybackCanvas(c, width, height, cleanOptions);

    drawLayoutGlyphs(c, layout, cleanOptions, 1);

    if (layout.referenceDecoration) {
      drawReferenceDecoration(c, layout.referenceDecoration, cleanOptions, 1);
    }
  }

  function drawLayoutGlyphs(c, layout, options, partial = 1) {
    let colorIndex = 0;

    for (const item of layout.placements || []) {
      if (/\s/.test(item.char)) continue;

      drawGlyph(
        c,
        getGlyph(item.char, colorIndex),
        item.x,
        item.y,
        item.w,
        item.fontSize,
        {
          ...options,
          _colorIndex: colorIndex,
          _inkColorKey: item.section === "reference" ? getReferenceTextColorKey(options) : getTextColorKey(options)
        },
        partial
      );

      colorIndex += 1;
    }
  }

  function drawCompletedPlaybackItem(c, item, options) {
    if (!item) return;

    if (item.type === "referenceDecoration") {
      drawReferenceDecoration(c, item.decoration, options, 1);
      return;
    }

    drawGlyph(
      c,
      getGlyph(item.char, item.colorIndex || 0),
      item.x,
      item.y,
      item.w,
      item.fontSize,
      {
        ...options,
        _colorIndex: item.colorIndex || 0,
        _inkColorKey: item.section === "reference" ? getReferenceTextColorKey(options) : getTextColorKey(options)
      },
      1
    );
  }

  async function saveGhostWriterImage(options = state.remix) {
    const cleanOptions = sanitizeRemixOptions({ ...options });
    const size = EXPORT_SIZES[cleanOptions.exportSize || "square"] || EXPORT_SIZES.square;
    await waitForExportAssets(cleanOptions);

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const c = canvas.getContext("2d");
    if (!c) return;

    c.setTransform(1, 0, 0, 1, 0, 0);
    drawCompleteText(c, size.width, size.height, cleanOptions);

    const filename = makeExportFilename(size);

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          downloadCanvasDataUrl(canvas, filename);
          return;
        }

        downloadBlob(blob, filename);
      }, "image/png");

      return;
    }

    downloadCanvasDataUrl(canvas, filename);
  }

  function isReplayVideoSupported() {
    return typeof MediaRecorder !== "undefined"
      && typeof HTMLCanvasElement !== "undefined"
      && typeof HTMLCanvasElement.prototype.captureStream === "function";
  }

  function getBestVideoMimeType() {
    if (typeof MediaRecorder === "undefined") return "";

    for (const type of EXPORT_VIDEO.mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "";
  }

  async function saveGhostWriterReplayVideo(options = state.remix) {
    if (!isReplayVideoSupported()) {
      throw new Error("Replay video export is not supported in this browser.");
    }

    const cleanOptions = sanitizeRemixOptions({ ...options });
    const size = EXPORT_SIZES[cleanOptions.exportSize || "square"] || EXPORT_SIZES.square;

    await waitForExportAssets(cleanOptions);

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const c = canvas.getContext("2d");
    if (!c) {
      throw new Error("Could not create video canvas.");
    }

    c.setTransform(1, 0, 0, 1, 0, 0);

    const layout = makeLayout(size.width, size.height, cleanOptions);
    const placements = buildPlaybackPlacements(layout);
    const speed = SPEEDS[cleanOptions.speed] || SPEEDS.normal;

    const videoState = {
      running: true,
      c,
      width: size.width,
      height: size.height,
      options: cleanOptions,
      placements,
      index: 0,
      charStart: performance.now(),
      pauseUntil: 0,
      speed,
      toolConfig: null,
      toolEl: null,
      lastTip: null,
      lastDirectionDeg: null,
      directionWiggle: 0,
      vaporTrail: []
    };

    clearPlaybackCanvas(c, size.width, size.height, cleanOptions);

    const stream = canvas.captureStream(EXPORT_VIDEO.fps);
    const mimeType = getBestVideoMimeType();
    const recorderOptions = mimeType ? { mimeType } : undefined;
    const recorder = new MediaRecorder(stream, recorderOptions);
    const chunks = [];

    const stopped = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        reject(recorder.error || new Error("Video recorder failed."));
      };

      recorder.onstop = () => {
        const type = mimeType || "video/webm";
        resolve(new Blob(chunks, { type }));
      };
    });

    recorder.start();

    await new Promise((resolve) => {
      function tick(now) {
        const done = drawReplayVideoFrame(videoState, now);

        if (done) {
          setTimeout(resolve, EXPORT_VIDEO.endHoldMs);
          return;
        }

        requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    const blob = await stopped;

    if (!blob || !blob.size) {
      throw new Error("No video data was recorded.");
    }

    downloadBlob(blob, makeExportVideoFilename(size));
  }

  function drawReplayVideoFrame(ps, now) {
    if (!ps || !ps.running) return true;

    const placements = ps.placements || [];

    if (ps.pauseUntil && now < ps.pauseUntil) {
      clearPlaybackCanvas(ps.c, ps.width, ps.height, ps.options);
      drawVaporTrail(ps, now);

      for (let i = 0; i < ps.index; i += 1) {
        drawCompletedPlaybackItem(ps.c, placements[i], ps.options);
      }

      return false;
    }

    if (ps.pauseUntil && now >= ps.pauseUntil) {
      ps.pauseUntil = 0;
      ps.charStart = now;
    }

    if (ps.index >= placements.length) {
      drawCompleteText(ps.c, ps.width, ps.height, ps.options);
      ps.running = false;
      return true;
    }

    const current = placements[ps.index];
    const isDecoration = current?.type === "referenceDecoration";
    const glyph = isDecoration ? null : getGlyph(current.char, current.colorIndex || 0);
    const pieces = isDecoration
      ? getReferenceDecorationPieceCount(current.decoration)
      : (glyph ? countStrokePieces(glyph.strokes) : 1);

    const duration = isDecoration
      ? clamp((160 + pieces * 18) * (ps.speed?.multiplier || 1), 180, 900)
      : clamp((92 + pieces * 15) * (ps.speed?.multiplier || 1), 65, 480);

    const progress = clamp((now - ps.charStart) / duration, 0, 1);
    const tip = isDecoration
      ? getReferenceDecorationTip(current.decoration, ps.options, progress)
      : getGlyphPlaybackTip(glyph, current, ps.options, progress);

    clearPlaybackCanvas(ps.c, ps.width, ps.height, ps.options);

    if (tip) {
      ps.lastTip = tip;
      addVaporPuff(ps, tip, now);
    }

    drawVaporTrail(ps, now);

    for (let i = 0; i < ps.index; i += 1) {
      drawCompletedPlaybackItem(ps.c, placements[i], ps.options);
    }

    if (isDecoration) {
      drawReferenceDecoration(ps.c, current.decoration, ps.options, progress);
    } else {
      drawGlyph(
        ps.c,
        glyph,
        current.x,
        current.y,
        current.w,
        current.fontSize,
        {
          ...ps.options,
          _colorIndex: current.colorIndex || 0,
          _inkColorKey: current.section === "reference" ? getReferenceTextColorKey(ps.options) : getTextColorKey(ps.options)
        },
        progress
      );
    }

    if (progress >= 1) {
      ps.index += 1;

      if (current.pauseAfter) {
        ps.pauseUntil = now + current.pauseAfter * (ps.speed?.pauseMultiplier || 1);
      } else {
        ps.charStart = now;
      }
    }

    return false;
  }

  async function waitForExportAssets(options = {}) {
    const background = getBackgroundConfig(options);

    if (background.texture === "image") {
      await waitForBackgroundImage(background.imageSrc);
    }

    if (isDoodleBorderStyle(options.borderStyle)) {
      await waitForDoodleBorderImage(options.borderStyle);
    }
  }

  function waitForDoodleBorderImage(style) {
    const doodle = DOODLE_BORDER_SVGS[style];
    if (!doodle?.src) return Promise.resolve();

    const img = getDoodleBorderImage(doodle.src);

    if (!img) return Promise.resolve();
    if (img.complete && img.naturalWidth && img.naturalHeight) return Promise.resolve();

    return new Promise((resolve) => {
      const done = () => resolve();

      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });

      setTimeout(done, 1200);
    });
  }

  function makeExportVideoFilename(size = EXPORT_SIZES.square) {
    const ref = String(parsedRef?.display || ctx.verseRef || "verse")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42);

    const suffix = ref || "verse";
    const sizeLabel = size.filenameLabel || "video";

    return `${EXPORT_IMAGE.filenamePrefix}-${suffix}-${sizeLabel}.webm`;
  }

  function waitForBackgroundImage(src) {
    const img = getBackgroundImage(src);

    if (!img) return Promise.resolve();
    if (img.complete && img.naturalWidth && img.naturalHeight) return Promise.resolve();

    return new Promise((resolve) => {
      const done = () => resolve();

      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });

      setTimeout(done, 1200);
    });
  }

  function makeExportFilename(size = EXPORT_SIZES.square) {
    const ref = String(parsedRef?.display || ctx.verseRef || "verse")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42);

    const suffix = ref || "verse";
    const sizeLabel = size.filenameLabel || "image";

    return `${EXPORT_IMAGE.filenamePrefix}-${suffix}-${sizeLabel}.png`;
  }


  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function downloadCanvasDataUrl(canvas, filename) {
    const link = document.createElement("a");

    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function startPlayback(canvas, card, options, onDone) {
    const rect = card.getBoundingClientRect();
    const c = setupCanvasForDpr(canvas, rect.width, rect.height);
    const layout = makeLayout(rect.width, rect.height, options);
    const placements = buildPlaybackPlacements(layout);
    const speed = SPEEDS[options.speed] || SPEEDS.normal;
    const toolConfig = getPlaybackToolConfig(options);
    const toolEl = document.getElementById("ghostPlaybackTool");

    playbackState = {
      running: true,
      c,
      width: rect.width,
      height: rect.height,
      options,
      placements,
      index: 0,
      charStart: performance.now(),
      pauseUntil: 0,
      speed,
      toolConfig,
      toolEl,
      lastTip: null,
      lastDirectionDeg: null,
      directionWiggle: 0,
      vaporTrail: [],
      onDone
    };

    clearPlaybackCanvas(c, rect.width, rect.height, options);
    hidePlaybackTool(playbackState);

    if (options.spookySounds !== "off") {
      startGhostSpookySounds();
    }

    playbackRaf = requestAnimationFrame(playbackFrame);
  }

  function buildPlaybackPlacements(layout) {
    const all = Array.isArray(layout?.placements) ? layout.placements : [];
    const out = [];

    for (let i = 0; i < all.length; i += 1) {
      const item = all[i];
      if (!item || /\s/.test(item.char)) continue;

      const pauseAfter = getPauseAfterPlacement(all, i);

      out.push({
        ...item,
        pauseAfter,
        colorIndex: out.length
      });
    }

    if (layout?.referenceDecoration) {
      out.push({
        type: "referenceDecoration",
        decoration: layout.referenceDecoration,
        pauseAfter: 0,
        colorIndex: out.length
      });
    }

    return out;
  }


  function getPauseAfterPlacement(allPlacements, index) {
    const current = allPlacements[index];
    if (!current) return 0;

    const char = String(current.char || "");
    const isPunctuation = /[.,;:!?]/.test(char);

    let sawSpace = false;
    let next = null;

    for (let i = index + 1; i < allPlacements.length; i += 1) {
      const item = allPlacements[i];
      if (!item) continue;

      if (/\s/.test(item.char)) {
        sawSpace = true;
        continue;
      }

      next = item;
      break;
    }

    if (!next) {
      return isPunctuation ? PLAYBACK_PAUSES.punctuation : 0;
    }

    const lineJump = next.y > current.y + Math.max(8, current.fontSize * .45);

    if (lineJump) {
      return PLAYBACK_PAUSES.line;
    }

    if (isPunctuation) {
      return PLAYBACK_PAUSES.punctuation;
    }

    if (sawSpace) {
      return PLAYBACK_PAUSES.word;
    }

    return 0;
  }

  function playbackFrame(now) {
    const ps = playbackState;
    if (!ps || !ps.running) return;

    const placements = ps.placements;

    if (ps.pauseUntil && now < ps.pauseUntil) {
      clearPlaybackCanvas(ps.c, ps.width, ps.height, ps.options);
      drawVaporTrail(ps, now);

      for (let i = 0; i < ps.index; i += 1) {
        drawCompletedPlaybackItem(ps.c, placements[i], ps.options);
      }

      if (ps.lastTip) {
        updatePlaybackTool(ps, ps.lastTip, now, false);
      }

      playbackRaf = requestAnimationFrame(playbackFrame);
      return;
    }

    if (ps.pauseUntil && now >= ps.pauseUntil) {
      ps.pauseUntil = 0;
      ps.charStart = now;
    }

    if (ps.index >= placements.length) {
      drawCompleteText(ps.c, ps.width, ps.height, ps.options);
      hidePlaybackTool(ps);
      stopGhostSpookySounds({ finishCurrent: true });

      const done = ps.onDone;
      playbackState = null;
      playbackRaf = 0;

      if (typeof done === "function") done();
      return;
    }

    const current = placements[ps.index];
    const isDecoration = current?.type === "referenceDecoration";
    const glyph = isDecoration ? null : getGlyph(current.char, current.colorIndex || 0);
    const pieces = isDecoration ? getReferenceDecorationPieceCount(current.decoration) : (glyph ? countStrokePieces(glyph.strokes) : 1);
    const duration = isDecoration
      ? clamp((160 + pieces * 18) * (ps.speed?.multiplier || 1), 180, 900)
      : clamp((92 + pieces * 15) * (ps.speed?.multiplier || 1), 65, 480);
    const progress = clamp((now - ps.charStart) / duration, 0, 1);
    const tip = isDecoration
      ? getReferenceDecorationTip(current.decoration, ps.options, progress)
      : getGlyphPlaybackTip(glyph, current, ps.options, progress);

    clearPlaybackCanvas(ps.c, ps.width, ps.height, ps.options);

    if (tip) {
      ps.lastTip = tip;
      addVaporPuff(ps, tip, now);
    }

    drawVaporTrail(ps, now);

    for (let i = 0; i < ps.index; i += 1) {
      drawCompletedPlaybackItem(ps.c, placements[i], ps.options);
    }

    if (isDecoration) {
      drawReferenceDecoration(ps.c, current.decoration, ps.options, progress);
    } else {
      drawGlyph(
        ps.c,
        glyph,
        current.x,
        current.y,
        current.w,
        current.fontSize,
        {
          ...ps.options,
          _colorIndex: current.colorIndex || 0,
          _inkColorKey: current.section === "reference" ? getReferenceTextColorKey(ps.options) : getTextColorKey(ps.options)
        },
        progress
      );
    }

    if (tip) {
      updatePlaybackTool(ps, tip, now, true);
    }

    if (progress >= 1) {
      ps.index += 1;

      if (current.pauseAfter) {
        ps.pauseUntil = now + current.pauseAfter * (ps.speed?.pauseMultiplier || 1);
      } else {
        ps.charStart = now;
      }
    }

    playbackRaf = requestAnimationFrame(playbackFrame);
  }

  function hidePlaybackTool(ps) {
    const tool = ps?.toolEl;
    if (!tool) return;

    tool.classList.remove("is-visible");
  }

  function updatePlaybackTool(ps, tip, now, moving) {
    const tool = ps?.toolEl;
    if (!tool || !tip) return;

    const toolConfig = ps.toolConfig || PLAYBACK_TOOL;

    if (moving && Number.isFinite(tip.angleDeg)) {
      if (ps.lastDirectionDeg === null || ps.lastDirectionDeg === undefined) {
        ps.lastDirectionDeg = tip.angleDeg;
      } else {
        const delta = shortestAngleDelta(ps.lastDirectionDeg, tip.angleDeg);

        if (Math.abs(delta) > 12) {
          ps.directionWiggle += clamp(
            delta * .10,
            -toolConfig.directionWiggleDeg,
            toolConfig.directionWiggleDeg
          );
        }

        ps.lastDirectionDeg = tip.angleDeg;
      }
    }

    ps.directionWiggle = clamp(
      (ps.directionWiggle || 0) * toolConfig.directionWiggleDecay,
      -toolConfig.directionWiggleDeg,
      toolConfig.directionWiggleDeg
    );

    const idleWobble = Math.sin(now / 180) * toolConfig.idleWobbleDeg;
    const tinyHandJitter = moving
      ? stableNoise(`${Math.floor(now / 120)}-${tip.x}-${tip.y}`) * .65
      : 0;

    const angle =
      toolConfig.baseRotationDeg +
      ps.directionWiggle +
      idleWobble +
      tinyHandJitter;

    tool.style.left = `${tip.x}px`;
    tool.style.top = `${tip.y}px`;
    tool.style.transform = `translateY(-100%) rotate(${angle}deg)`;
    tool.classList.add("is-visible");
  }


  function shortestAngleDelta(fromDeg, toDeg) {
    let delta = (toDeg - fromDeg) % 360;

    if (delta > 180) {
      delta -= 360;
    }

    if (delta < -180) {
      delta += 360;
    }

    return delta;
  }

  function addVaporPuff(ps, tip, now) {
    if (!ps || !tip) return;

    const vapor = getVaporConfig(ps.options);

    if (!vapor.enabled) {
      ps.vaporTrail = [];
      return;
    }

    const last = ps.vaporTrail[ps.vaporTrail.length - 1];

    if (last) {
      const dx = tip.x - last.x;
      const dy = tip.y - last.y;
      if (Math.hypot(dx, dy) < vapor.spawnDistance) {
        return;
      }
    }

    ps.vaporTrail.push({
      x: tip.x + stableNoise(`vap-x-${now}`) * 4,
      y: tip.y + stableNoise(`vap-y-${now}`) * 4,
      born: now,
      life: vapor.life + Math.random() * vapor.lifeJitter,
      radius: vapor.radius + Math.random() * vapor.radiusJitter,
      alpha: vapor.alpha,
      driftY: vapor.driftY
    });

    if (ps.vaporTrail.length > vapor.max) {
      ps.vaporTrail.splice(0, ps.vaporTrail.length - vapor.max);
    }
  }

  function drawVaporTrail(ps, now) {
    if (!ps || !Array.isArray(ps.vaporTrail) || !ps.vaporTrail.length) return;

    const c = ps.c;
    const alive = [];

    c.save();
    c.globalCompositeOperation = "lighter";

    for (const puff of ps.vaporTrail) {
      const age = now - puff.born;
      const t = clamp(age / puff.life, 0, 1);

      if (t >= 1) continue;

      alive.push(puff);

      const alpha = (1 - t) * (puff.alpha ?? .18);
      const radius = puff.radius * (1 + t * 1.7);
      const driftY = -(puff.driftY ?? 18) * t;
      const driftX = stableNoise(`drift-${puff.born}`) * 10 * t;

      const gradient = c.createRadialGradient(
        puff.x + driftX,
        puff.y + driftY,
        0,
        puff.x + driftX,
        puff.y + driftY,
        radius
      );

      gradient.addColorStop(0, `rgba(235,240,255,${alpha})`);
      gradient.addColorStop(.55, `rgba(190,200,255,${alpha * .45})`);
      gradient.addColorStop(1, "rgba(235,240,255,0)");

      c.fillStyle = gradient;
      c.beginPath();
      c.arc(puff.x + driftX, puff.y + driftY, radius, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();

    ps.vaporTrail = alive;
  }

  function getGlyphPlaybackTip(glyph, item, options = {}, partial = 1) {
    if (!glyph || !glyph.strokes || !glyph.strokes.length || !item) return null;

    const metrics = getGlyphDrawMetrics(glyph, item, options);
    const safePartial = clamp(partial, 0, 1);
    const strokeUnits = glyph.strokes.map((stroke) => getStrokePlaybackUnits(stroke));
    const totalUnits = strokeUnits.reduce((sum, units) => sum + units, 0) || 1;
    let remainingUnits = totalUnits * safePartial;

    if (remainingUnits <= 0) {
      const firstStroke = glyph.strokes[0];
      const firstPoint = firstStroke?.[0];

      return firstPoint ? transformGlyphPoint(firstPoint, metrics) : null;
    }

    for (let strokeIndex = 0; strokeIndex < glyph.strokes.length; strokeIndex += 1) {
      const stroke = glyph.strokes[strokeIndex];
      const units = strokeUnits[strokeIndex] || 1;

      if (!stroke || !stroke.length) continue;

      if (remainingUnits > units) {
        remainingUnits -= units;
        continue;
      }

      const strokeProgress = clamp(remainingUnits / units, 0, 1);
      const local = getStrokePointAtProgress(stroke, strokeProgress);

      return local ? transformGlyphPoint(local, metrics) : null;
    }

    const lastStroke = glyph.strokes[glyph.strokes.length - 1];
    const lastPoint = lastStroke?.[lastStroke.length - 1];

    return lastPoint ? transformGlyphPoint(lastPoint, metrics) : null;
  }

  function getGlyphDrawMetrics(glyph, item, options = {}) {
    const glyphBounds = glyph.bounds || computeBounds(glyph.strokes);
    const fontSize = item.fontSize;
    const cellW = item.w;
    const x = item.x;
    const baselineY = item.y;
    const jitterOn = options.jitter === "on";
    const wobbleOn = options.wobble === "on";

    const profileInfo = getGlyphUsableArea(glyph.char, fontSize, cellW);
    const usableH = profileInfo.usableH;
    const usableW = profileInfo.usableW;
    const scale = Math.min(
      usableW / Math.max(.04, glyphBounds.width),
      usableH / Math.max(.04, glyphBounds.height)
    );

    const drawW = glyphBounds.width * scale;
    const drawH = glyphBounds.height * scale;
    const baseX = x + (cellW - drawW) / 2 - glyphBounds.minX * scale;
    const baseY = getGlyphBaseYForProfile(baselineY, fontSize, usableH, drawH, profileInfo) - glyphBounds.minY * scale;

    const jitterX = jitterOn ? stableNoise(`${glyph.char}-${x}-x`) * fontSize * .08 : 0;
    const jitterY = jitterOn ? stableNoise(`${glyph.char}-${x}-y`) * fontSize * .06 : 0;
    const rotation = wobbleOn ? stableNoise(`${glyph.char}-${x}-r`) * .09 : 0;

    return {
      baseX,
      baseY,
      scale,
      originX: x + cellW / 2,
      originY: baselineY - fontSize * .36,
      jitterX,
      jitterY,
      rotation
    };
  }


  function getStrokePointAtProgress(stroke, progress) {
    const safeProgress = clamp(progress, 0, 1);

    if (!stroke || !stroke.length) return null;

    if (stroke.length === 1) {
      return {
        x: stroke[0].x,
        y: stroke[0].y,
        angleDeg: 0
      };
    }

    const segmentCount = stroke.length - 1;
    const pieces = segmentCount * safeProgress;

    if (pieces <= 0) {
      const a = stroke[0];
      const b = stroke[1] || a;

      return {
        x: a.x,
        y: a.y,
        angleDeg: Math.atan2((b.y || a.y) - a.y, (b.x || a.x) - a.x) * 180 / Math.PI
      };
    }

    const index = Math.min(segmentCount - 1, Math.floor(pieces));
    const remain = clamp(pieces - index, 0, 1);
    const a = stroke[index];
    const b = stroke[index + 1] || a;

    return {
      x: a.x + ((b.x || a.x) - a.x) * remain,
      y: a.y + ((b.y || a.y) - a.y) * remain,
      angleDeg: Math.atan2((b.y || a.y) - a.y, (b.x || a.x) - a.x) * 180 / Math.PI
    };
  }

  function transformGlyphPoint(point, metrics) {
    const rawX = metrics.baseX + point.x * metrics.scale;
    const rawY = metrics.baseY + point.y * metrics.scale;
    const dx = rawX - metrics.originX;
    const dy = rawY - metrics.originY;
    const cos = Math.cos(metrics.rotation);
    const sin = Math.sin(metrics.rotation);

    return {
      x: metrics.originX + metrics.jitterX + dx * cos - dy * sin,
      y: metrics.originY + metrics.jitterY + dx * sin + dy * cos,
      angleDeg: (point.angleDeg || 0) + metrics.rotation * 180 / Math.PI
    };
  }

  function stopPlayback() {
    stopGhostSpookySounds();

    if (playbackState) {
      hidePlaybackTool(playbackState);
    }

    if (playbackRaf) {
      cancelAnimationFrame(playbackRaf);
      playbackRaf = 0;
    }

    playbackState = null;
  }

  function drawRemixPreview() {
    const canvas = document.getElementById("ghostRemixCanvas");
    const preview = document.getElementById("ghostRemixPreview");
    if (!canvas || !preview) return;

    const rect = preview.getBoundingClientRect();
    const c = setupCanvasForDpr(canvas, rect.width, rect.height);
    drawCompleteText(c, rect.width, rect.height, state.remix);
  }

  async function markVersePracticed() {
    const verseId = ctx.verseId;
    if (!verseId) return { ok: false };

    if (typeof bridge().markVersePracticed === "function") {
      try {
        return bridge().markVersePracticed({ verseId });
      } catch (err) {
        console.warn("Ghost Writer bridge markVersePracticed failed; falling back.", err);
      }
    }

    try {
      const raw = localStorage.getItem("verseMemoryProgress");
      const progress = raw ? JSON.parse(raw) : { version: 1, verses: {} };

      if (!progress || typeof progress !== "object") return { ok: false };
      if (!progress.verses || typeof progress.verses !== "object") progress.verses = {};
      if (!progress.version) progress.version = 1;

      if (!progress.verses[verseId]) {
        progress.verses[verseId] = {
          learnCompleted: false,
          games: {}
        };
      }

      progress.verses[verseId].lastPracticedAt = Date.now();
      localStorage.setItem("verseMemoryProgress", JSON.stringify(progress));
      return { ok: true };
    } catch (err) {
      console.warn("Ghost Writer could not mark verse as practiced", err);
      return { ok: false };
    }
  }

  function fitGuideCharacter() {
    const guide = document.getElementById("ghostGuideText");
    const wrap = document.getElementById("ghostDrawWrap");
    if (!guide || !wrap) return;

    const char = currentChar();
    const rect = wrap.getBoundingClientRect();
    const box = Math.max(1, Math.min(rect.width, rect.height));
    const centeredGuide = CENTERED_TRAINING_GUIDES.has(char);
    const guideProfile = getGuideRenderProfile(char);
    const guideOffsetY = (guideProfile?.yOffset || 0) * box;

    guide.style.top = centeredGuide ? "50%" : "";
    guide.style.bottom = centeredGuide ? "auto" : "";
    guide.style.height = centeredGuide ? "auto" : "";
    guide.style.transform = centeredGuide
      ? `translateY(calc(-50% + ${guideOffsetY}px))`
      : "";

    const probe = document.createElement("span");
    probe.textContent = char || "A";
    probe.style.position = "absolute";
    probe.style.left = "-9999px";
    probe.style.top = "-9999px";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "nowrap";
    probe.style.fontFamily = window.getComputedStyle(guide).fontFamily;
    probe.style.fontWeight = window.getComputedStyle(guide).fontWeight;
    probe.style.lineHeight = ".92";
    document.body.appendChild(probe);

    const symbol = isSymbolChar(char);
    const skinnySymbol = [".", ",", ":", ";", "'", '"'].includes(char);
    const targetW = box * (symbol ? (skinnySymbol ? GUIDE_FIT.skinnySymbolWidth : GUIDE_FIT.symbolWidth) : GUIDE_FIT.letterWidth);
    const targetH = box * (symbol ? GUIDE_FIT.symbolHeight : GUIDE_FIT.letterHeight);
    const maxSize = box * (symbol ? GUIDE_FIT.maxSymbolSize : GUIDE_FIT.maxLetterSize);
    const minSize = box * GUIDE_FIT.minSize;

    let low = minSize;
    let high = maxSize;
    let best = minSize;

    for (let i = 0; i < 14; i += 1) {
      const mid = (low + high) / 2;
      probe.style.fontSize = `${mid}px`;
      const w = probe.offsetWidth || 1;
      const h = probe.offsetHeight || 1;

      if (w <= targetW && h <= targetH) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    document.body.removeChild(probe);
    guide.style.fontSize = `${Math.round(best)}px`;
  }



  function clearGuideTimer() {
    if (guideTimer) {
      clearTimeout(guideTimer);
      guideTimer = null;
    }
  }

  window.addEventListener("resize", () => {
    if (state.screen === "remix") drawRemixPreview();
    if (state.screen === "training" || state.screen === "punctuationRecorder") {
      scheduleTrainingCanvasResize();
    }
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      if (state.screen === "training" || state.screen === "punctuationRecorder") {
        scheduleTrainingCanvasResize();
      }
    });
  }

  async function boot() {
    try {
      ctx = await bridge().getVerseContext?.() || ctx;
    } catch (err) {
      console.warn("Ghost Writer could not load verse context", err);
    }

    await loadBuiltInPunctuationGlyphs();

    buildFullText();
    renderIntro();
  }

  boot();
})();
