"use client";

/**
 * Client-side media preparation for chat.
 *
 * Photos are downscaled and re-encoded as JPEG so a 4 MB camera shot
 * becomes a ~100 KB message — fast on 2G/3G and small enough for the demo
 * store. Videos are size-capped (production streams them to S3/R2).
 */

const MAX_IMAGE_EDGE = 1000;
const IMAGE_QUALITY = 0.72;
export const MAX_VIDEO_BYTES = 2_500_000; // ~2.5 MB demo cap

export class MediaTooLargeError extends Error {
  constructor() {
    super(`Video is too large for the demo (max ${Math.round(MAX_VIDEO_BYTES / 1e6)} MB). Record a shorter clip.`);
    this.name = "MediaTooLargeError";
  }
}

/** Downscale + compress an image file into a JPEG data URL. */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/** Read a short video into a data URL, enforcing the demo size cap. */
export function readVideo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_VIDEO_BYTES) return reject(new MediaTooLargeError());
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read video"));
    reader.readAsDataURL(file);
  });
}
