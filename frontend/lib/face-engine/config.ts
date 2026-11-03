// Mirrors ai-service/app/config.py so results match the original Python service.
export const settings = {
  APP_VERSION: '2.4.0',

  MAX_FILE_SIZE_MB: 10,
  MIN_IMAGE_DIMENSION: 64,
  MAX_IMAGE_DIMENSION: 4096,

  CALIBRATION_TAU: 0.38,
  CALIBRATION_STEEPNESS: 8.5,

  THRESHOLD_HIGH_SIMILARITY: 0.48,
  THRESHOLD_MODERATE_SIMILARITY: 0.38,
  THRESHOLD_LOW_SIMILARITY: 0.2,

  MIN_SHARPNESS_LAPLACIAN: 50.0,
  MIN_FACE_CONFIDENCE: 0.6,
} as const;

/** Python-style round(x, n) (half away from zero is close enough for display values). */
export function roundTo(x: number, n: number): number {
  const f = Math.pow(10, n);
  return Math.round(x * f) / f;
}

export function clip(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}
