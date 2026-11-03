'use client';

// Netlify Functions accept request bodies up to ~6 MB, so two large phone photos
// cannot be uploaded as-is. Photos that are too big are downscaled and re-encoded
// as JPEG in the browser before upload; small photos are sent untouched.
const MAX_BYTES = 2.2 * 1024 * 1024;
const MAX_SIDE = 4096;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image'));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export async function prepareImageForUpload(file: File): Promise<File> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file; // let the server report the exact validation error
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (file.size <= MAX_BYTES && Math.max(w, h) <= MAX_SIDE) return file;

  const attempts: Array<[number, number]> = [
    [2048, 0.92],
    [2048, 0.85],
    [1600, 0.85],
    [1280, 0.8],
    [1024, 0.8],
  ];
  let best: Blob | null = null;
  for (const [side, quality] of attempts) {
    const scale = Math.min(1, side / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await toBlob(canvas, quality);
    if (!blob) continue;
    best = blob;
    if (blob.size <= MAX_BYTES) break;
  }
  if (!best) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([best], name, { type: 'image/jpeg', lastModified: Date.now() });
}

/** Parses a JSON response, returning a readable error object if the body isn't JSON (e.g. 413/504 pages). */
export async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 413) {
      return { success: false, message: 'The photos are too large to upload. Please use smaller images.' };
    }
    if (res.status === 504 || res.status === 502) {
      return { success: false, message: 'The comparison took too long to complete. Please try again.' };
    }
    return { success: false, message: `Server returned an unexpected response (HTTP ${res.status}).` };
  }
}
