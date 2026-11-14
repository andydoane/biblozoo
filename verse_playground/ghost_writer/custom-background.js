/* Ghost Writer session-only imported photo background.
 * The user's selected File is decoded into a bounded canvas in RAM.
 * No storage APIs, uploads, file paths, EXIF metadata, or profile persistence.
 */
(function (root) {
  "use strict";

  const MAX_FILE_BYTES = 18 * 1024 * 1024;
  const MAX_SOURCE_PIXELS = 80 * 1000 * 1000;
  const MAX_EDGE = 2560;
  const ACCEPTED_TYPES = new Set([
    "image/jpeg", "image/png", "image/webp", "image/heic",
    "image/heif", "image/gif"
  ]);
  const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif|gif)$/i;

  function create(doc = root.document) {
    let current = null;
    let revision = 0;

    function release() {
      if (current?.canvas) {
        current.canvas.width = 0;
        current.canvas.height = 0;
      }
      current = null;
    }

    function clear() {
      revision++;
      release();
    }

    async function importFile(file) {
      if (!file || !Number.isFinite(file.size) || file.size <= 0 ||
          file.size > MAX_FILE_BYTES) {
        throw new Error("Choose a photo smaller than 18 MB.");
      }
      const mime = String(file.type || "").toLowerCase();
      if (!(ACCEPTED_TYPES.has(mime) ||
            (!mime && ACCEPTED_EXTENSIONS.test(file.name || "")))) {
        throw new Error("Choose a JPG, PNG, WebP, HEIC, or GIF photo.");
      }
      const id = ++revision;
      let url;
      try {
        url = root.URL.createObjectURL(file);
        const image = await new Promise((resolve, reject) => {
          const img = new root.Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(
            "This photo couldn't be opened. Try a JPG or PNG."
          ));
          img.src = url;
        });
        if (id !== revision) return null;
        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;
        if (!(sourceWidth > 0 && sourceHeight > 0) ||
            sourceWidth * sourceHeight > MAX_SOURCE_PIXELS) {
          throw new Error("That photo is too large. Try a smaller image.");
        }
        const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = doc.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("The photo couldn't be prepared.");
        // Flatten transparency so the image remains an opaque background.
        context.fillStyle = "#101114";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        if (id !== revision) {
          canvas.width = canvas.height = 0;
          return null;
        }
        release(); // release the previous photo only after the new one works
        current = { canvas, name: String(file.name || "My Photo"), width, height };
        return { name: current.name, width, height };
      } finally {
        if (url) root.URL.revokeObjectURL(url);
      }
    }

    return Object.freeze({
      importFile,
      clear,
      getCanvas: () => current?.canvas || null,
      hasImage: () => !!current?.canvas,
      getName: () => current?.name || ""
    });
  }

  root.BibloZooGhostCustomBackground = Object.freeze({ create });
})(window);
