/* N7e EXPERIMENTAL iOS ONLY: tiny manual DEV drawer in place of two
 * permanently open overlay panels. No audio/microphone work on mount.
 */
(function installNativeDevDock(root) {
  "use strict";
  const doc = root.document;
  if (!doc) return;
  const allowed = () => root.BibloZooNativeOnlyOutput?.enabled === true &&
    root.Capacitor?.isNativePlatform?.() === true &&
    root.Capacitor?.getPlatform?.() === "ios";
  // DEV-only opt-in, shared by main app and same-origin standalone pages.
  // Never enable this on Web/PWA/Android or in an ordinary release build.
  const FORCE_PET_ESCAPE_KEY = "biblozooDevForceWelcomePetEscape:v1";
  function forcePetEscapeEnabled() {
    if (!allowed()) return false;
    try { return root.localStorage?.getItem(FORCE_PET_ESCAPE_KEY) === "1"; }
    catch (_) { return false; }
  }
  function setForcePetEscape(enabled) {
    if (!allowed()) return false;
    try {
      if (enabled) root.localStorage?.setItem(FORCE_PET_ESCAPE_KEY, "1");
      else root.localStorage?.removeItem(FORCE_PET_ESCAPE_KEY);
    } catch (_) { return false; }
    updateButtons();
    return forcePetEscapeEnabled();
  }
  const panels = new Map();
  let drawer = null;
  let dock = null;

  function register(panel) {
    if (!allowed() || !panel?.id) return;
    panels.set(panel.id, panel);
    // Important: the panels are still mounted, with all DEV controls intact.
    // They just no longer cover the Home view on every test-app launch.
    panel.hidden = true;
    if (panel.style) panel.style.display = "none";
    updateButtons();
  }
  function flip(panelId) {
    const node = panels.get(panelId);
    if (!node || !node.isConnected) return;
    const opening = node.hidden || node.style.display === "none";
    node.hidden = !opening;
    node.style.display = opening ? "block" : "none";
    updateButtons();
  }
  function action(label, handler) {
    const button = doc.createElement("button");
    button.type = "button";
    button.setAttribute("data-no-ui-sound", "");
    button.textContent = label;
    button.style.cssText = "display:block;box-sizing:border-box;width:100%;" +
      "min-height:36px;margin:4px 0;background:#fff;color:#122c34;" +
      "border:1px solid #587c88;border-radius:7px;font:600 12px sans-serif;";
    button.addEventListener("click", handler);
    return button;
  }
  function updateButtons() {
    if (!drawer) return;
    drawer.replaceChildren();
    const audioId = "biblozoo-native-sound-smoke";
    const micId = "biblozoo-n7b-microphone-probe";
    for (const [id, label] of [[audioId, "Native Audio"],
                                [micId, "Microphone Test"]]) {
      const node = panels.get(id);
      if (!node?.isConnected) continue;
      drawer.appendChild(action(
        (node.hidden ? "Show " : "Hide ") + label,
        () => flip(id)));
    }
    drawer.appendChild(action("Wacky Lab · 10 Effects", () => {
      drawer.hidden = true;
      root.BibloZooWackyLab?.open?.();
    }));
    // N7e.1: entirely separate owner-audition surface; original ten
    // child effects and existing Wacky Lab stay untouched.
    drawer.appendChild(action("Demon / Chorus Lab · 5 + 5", () => {
      drawer.hidden = true;
      root.BibloZooWackyLab?.openVariants?.();
    }));
    // N7f.2: no microphone; six alternate native timbres for two short
    // Read My Verse cues. Choices are DEV-only and never saved.
    drawer.appendChild(action("Read Beep Lab · 6 Waveforms", () => {
      drawer.hidden = true;
      root.BibloZooNativeReadCueLab?.open?.();
    }));
    const force = forcePetEscapeEnabled();
    const toggle = action("Force Pet Escape on Let's go!: " +
      (force ? "ON ✓" : "OFF"), () => setForcePetEscape(!force));
    toggle.setAttribute("aria-pressed", String(force));
    toggle.setAttribute("aria-label",
      "Force a pet escape after each successfully recovered Welcome Back tap");
    drawer.appendChild(toggle);
  }
  function mount() {
    if (!allowed() || !doc.body || dock) return;
    dock = doc.createElement("div");
    dock.id = "biblozoo-n7e-dev-dock";
    dock.setAttribute("data-no-ui-sound", "");
    dock.style.cssText =
      "position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 6px);" +
      "right:6px;z-index:11999;max-width:185px;" +
      "font:12px sans-serif;";
    const toggle = action("DEV Tools", () => {
      drawer.hidden = !drawer.hidden;
      if (!drawer.hidden) updateButtons();
    });
    toggle.setAttribute("aria-label", "Toggle native experiment developer tools");
    toggle.style.cssText += "padding:5px 9px;min-height:30px;" +
      "border-radius:18px;background:#173e49;color:#fff;";
    drawer = doc.createElement("div");
    drawer.hidden = true;
    drawer.style.cssText =
      "background:#f5fcff;border:1px solid #527b86;border-radius:9px;" +
      "padding:7px;box-shadow:0 2px 6px #0004;max-height:45vh;overflow-y:auto;";
    dock.appendChild(toggle);
    dock.appendChild(drawer);
    doc.body.appendChild(dock);
    updateButtons();
  }
  root.BibloZooDevTools = Object.freeze({
    register, forcePetEscapeEnabled, setForcePetEscape, open: () => {
    if (!allowed()) return;
    mount();
    if (drawer) { drawer.hidden = false; updateButtons(); }
  }});
  if (doc.readyState === "complete") mount();
  else root.addEventListener("load", mount, {once:true});
  root.setTimeout(mount, 1500);
})(window);
