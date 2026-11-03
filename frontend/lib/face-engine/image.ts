import sharp from 'sharp';
import { settings } from './config';
import { ImageValidationError } from './errors';

/** Decoded 8-bit RGB image, interleaved (R,G,B,R,G,B,...). */
export interface RgbImage {
  width: number;
  height: number;
  data: Uint8Array;
}

const MAX_PIXELS = 25_000_000;

function hasPrefix(buf: Uint8Array, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[offset + i] !== sig[i]) return false;
  return true;
}

/**
 * Port of validate_image_bytes(): magic-byte check, size and dimension limits,
 * decompression-bomb guard, and decode to RGB.
 */
export async function validateImageBytes(fileBytes: Buffer): Promise<RgbImage> {
  if (fileBytes.length === 0) {
    throw new ImageValidationError('Uploaded image file is empty.', 'EMPTY_FILE');
  }

  const sizeMb = fileBytes.length / (1024 * 1024);
  if (sizeMb > settings.MAX_FILE_SIZE_MB) {
    throw new ImageValidationError(
      `File size (${sizeMb.toFixed(2)} MB) exceeds maximum allowed ${settings.MAX_FILE_SIZE_MB} MB.`,
      'FILE_TOO_LARGE'
    );
  }

  const isJpeg = hasPrefix(fileBytes, [0xff, 0xd8, 0xff]);
  const isPng = hasPrefix(fileBytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isWebp =
    fileBytes.length > 12 &&
    hasPrefix(fileBytes, [0x52, 0x49, 0x46, 0x46]) &&
    hasPrefix(fileBytes, [0x57, 0x45, 0x42, 0x50], 8);

  if (!(isJpeg || isPng || isWebp)) {
    throw new ImageValidationError(
      'Invalid file signature. Only authentic JPEG, PNG, and WebP files are supported.',
      'INVALID_SIGNATURE'
    );
  }

  let width: number;
  let height: number;
  try {
    const meta = await sharp(fileBytes, { limitInputPixels: false }).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch (e: any) {
    throw new ImageValidationError(`Corrupt or unreadable image: ${e?.message || e}`, 'CORRUPT_IMAGE');
  }

  if (width * height > 2 * MAX_PIXELS) {
    throw new ImageValidationError('Image rejected: Potential decompression bomb attack.', 'DECOMPRESSION_BOMB');
  }

  if (width < settings.MIN_IMAGE_DIMENSION || height < settings.MIN_IMAGE_DIMENSION) {
    throw new ImageValidationError(
      `Image dimensions (${width}x${height}) are below minimum ${settings.MIN_IMAGE_DIMENSION}x${settings.MIN_IMAGE_DIMENSION} px.`,
      'DIMENSIONS_TOO_SMALL'
    );
  }
  if (width > settings.MAX_IMAGE_DIMENSION || height > settings.MAX_IMAGE_DIMENSION) {
    throw new ImageValidationError(
      `Image dimensions (${width}x${height}) exceed maximum ${settings.MAX_IMAGE_DIMENSION}x${settings.MAX_IMAGE_DIMENSION} px.`,
      'DIMENSIONS_TOO_LARGE'
    );
  }

  try {
    // No auto-rotation, alpha dropped: same as PIL's Image.convert("RGB").
    const { data, info } = await sharp(fileBytes, { limitInputPixels: MAX_PIXELS * 2, failOn: 'error' })
      .removeAlpha()
      .toColourspace('srgb')
      .raw({ depth: 'uchar' })
      .toBuffer({ resolveWithObject: true });

    let rgb: Uint8Array;
    if (info.channels === 3) {
      rgb = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else {
      const n = info.width * info.height;
      const c = info.channels;
      rgb = new Uint8Array(n * 3);
      for (let i = 0; i < n; i++) {
        const g = data[i * c];
        rgb[i * 3] = c >= 3 ? data[i * c] : g;
        rgb[i * 3 + 1] = c >= 3 ? data[i * c + 1] : g;
        rgb[i * 3 + 2] = c >= 3 ? data[i * c + 2] : g;
      }
    }
    return { width: info.width, height: info.height, data: rgb };
  } catch (e: any) {
    throw new ImageValidationError(`Corrupt or unreadable image: ${e?.message || e}`, 'CORRUPT_IMAGE');
  }
}

/** OpenCV COLOR_RGB2GRAY (bit-exact fixed-point coefficients). */
export function toGray(img: RgbImage): Uint8Array {
  const n = img.width * img.height;
  const out = new Uint8Array(n);
  const d = img.data;
  for (let i = 0, j = 0; i < n; i++, j += 3) {
    out[i] = (d[j] * 4899 + d[j + 1] * 9617 + d[j + 2] * 1868 + 8192) >> 14;
  }
  return out;
}

/** BORDER_REFLECT_101 index. */
export function reflect101(i: number, n: number): number {
  if (n === 1) return 0;
  while (i < 0 || i >= n) {
    if (i < 0) i = -i;
    if (i >= n) i = 2 * n - 2 - i;
  }
  return i;
}
