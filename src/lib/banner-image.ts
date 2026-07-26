"use client";

/**
 * Prepares an uploaded picture for a home banner.
 *
 * Whatever the owner picks — a portrait phone snap, a 12-megapixel export, a
 * PNG screenshot — comes back as the same shape: a centre-cropped 16:9 JPEG at
 * a fixed size, small enough to load on a village 3G connection. That is what
 * makes "upload any image" safe: the banner's layout never depends on what was
 * chosen, so it cannot be broken by a bad file.
 */

/** Matches the banner's own aspect. Twice the display width, for retina. */
export const BANNER_W = 960;
export const BANNER_H = 540;

/** Roughly 200 KB of base64 once encoded — kind to slow connections. */
const MAX_BYTES = 150_000;

export class ImageTooBigError extends Error {
  constructor() {
    super("That picture is very large. Try a smaller one, or export it at a lower quality.");
    this.name = "ImageTooBigError";
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image we can read."));
    };
    img.src = url;
  });
}

/** Base64 payload length → rough byte count. */
function byteSize(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  return Math.ceil(((dataUrl.length - i - 1) * 3) / 4);
}

/**
 * Centre-crop to 16:9 and scale to the banner size, then compress until it
 * fits the budget. Returns a `data:` URL ready to store in the banner
 * document — no upload service needed.
 */
export async function prepareBannerImage(file: File): Promise<string> {
  const img = await loadImage(file);

  const canvas = document.createElement("canvas");
  canvas.width = BANNER_W;
  canvas.height = BANNER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process the image.");

  // Cover-crop: fill the frame, centred, never squashed.
  const target = BANNER_W / BANNER_H;
  const source = img.width / img.height;
  let sw = img.width;
  let sh = img.height;
  if (source > target) {
    sw = img.height * target; // too wide — trim the sides
  } else {
    sh = img.width / target; // too tall — trim top and bottom
  }
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;

  ctx.fillStyle = "#0a4d37"; // KAAM green, in case of transparency
  ctx.fillRect(0, 0, BANNER_W, BANNER_H);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, BANNER_W, BANNER_H);

  // Step the quality down until it fits, rather than guessing once.
  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
    const out = canvas.toDataURL("image/jpeg", quality);
    if (byteSize(out) <= MAX_BYTES) return out;
  }
  throw new ImageTooBigError();
}

/** True for a picture the owner uploaded, as opposed to a file in the repo. */
export function isUploaded(src: string | undefined): boolean {
  return Boolean(src?.startsWith("data:"));
}
