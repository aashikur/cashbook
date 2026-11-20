/**
 * Client-Side Image Compression Utility
 * Docs ref: §4 Non-Functional Requirements & Guardrails:
 * "Android/PC clients must compress receipt photos to WebP (maxWidth: 1600px, quality: 0.8)
 * before storing in Dexie or uploading to R2."
 */

export interface CompressionResult {
  blob: Blob;
  mimeType: "image/webp";
  width: number;
  height: number;
  sizeBytes: number;
}

export async function compressReceiptImage(
  file: File | Blob,
  maxWidth = 1600,
  quality = 0.8
): Promise<CompressionResult> {
  // If browser does not support ImageBitmap or Canvas (e.g. non-browser env), fallback
  if (typeof window === "undefined") {
    return {
      blob: file,
      mimeType: "image/webp",
      width: 0,
      height: 0,
      sizeBytes: file.size,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down proportionally if larger than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to obtain 2D canvas context for compression"));
        return;
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Export as webp blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image compression to WebP failed"));
            return;
          }
          resolve({
            blob,
            mimeType: "image/webp",
            width,
            height,
            sizeBytes: blob.size,
          });
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = url;
  });
}
