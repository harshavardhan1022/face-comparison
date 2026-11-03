import { settings, roundTo, clip } from './config';
import { reflect101 } from './image';

export interface ImageQuality {
  sharpness_score: number;
  is_sharp: boolean;
  brightness_mean: number;
  is_well_lit: boolean;
  overall_quality_score: number;
  quality_label: string;
}

/** Port of evaluate_image_quality(): Laplacian variance, mean/std luminance. */
export function evaluateImageQuality(gray: Uint8Array, w: number, h: number): ImageQuality {
  // cv2.Laplacian(gray, CV_64F) with ksize=1 => kernel [0 1 0; 1 -4 1; 0 1 0], BORDER_REFLECT_101
  let lsum = 0;
  let lsq = 0;
  let gsum = 0;
  let gsq = 0;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    const up = reflect101(y - 1, h) * w;
    const dn = reflect101(y + 1, h) * w;
    for (let x = 0; x < w; x++) {
      const c = gray[row + x];
      const l = gray[row + (x > 0 ? x - 1 : reflect101(x - 1, w))];
      const r = gray[row + (x < w - 1 ? x + 1 : reflect101(x + 1, w))];
      const v = gray[up + x] + gray[dn + x] + l + r - 4 * c;
      lsum += v;
      lsq += v * v;
      gsum += c;
      gsq += c * c;
    }
  }
  const n = w * h;
  const lmean = lsum / n;
  const sharpness = Math.max(0, lsq / n - lmean * lmean);
  const isSharp = sharpness >= settings.MIN_SHARPNESS_LAPLACIAN;

  const brightness = gsum / n;
  const std = Math.sqrt(Math.max(0, gsq / n - brightness * brightness));
  const isWellLit = brightness >= 45.0 && brightness <= 215.0;

  const sharpnessNorm = Math.min(1.0, sharpness / 350.0);
  const brightnessNorm = 1.0 - Math.abs(brightness - 128.0) / 128.0;
  const contrastNorm = Math.min(1.0, std / 60.0);

  let overall = 0.5 * sharpnessNorm + 0.3 * brightnessNorm + 0.2 * contrastNorm;
  overall = roundTo(clip(overall, 0.05, 0.99), 3);

  let label: string;
  if (overall >= 0.8) label = 'Optimal';
  else if (overall >= 0.6) label = 'Good';
  else if (overall >= 0.4) label = 'Fair';
  else label = 'Suboptimal';

  return {
    sharpness_score: roundTo(sharpness, 2),
    is_sharp: isSharp,
    brightness_mean: roundTo(brightness, 2),
    is_well_lit: isWellLit,
    overall_quality_score: overall,
    quality_label: label,
  };
}
