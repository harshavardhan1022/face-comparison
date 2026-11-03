import { clip, roundTo } from './config';
import { RgbImage, reflect101 } from './image';

// ---------- FFT (radix-2 + Bluestein for arbitrary sizes) ----------

function fftRadix2(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

interface FftPlan {
  n: number;
  pow2: boolean;
  m: number;
  wr: Float64Array; // chirp
  wi: Float64Array;
  br: Float64Array; // FFT of conj chirp kernel
  bi: Float64Array;
}

function makePlan(n: number): FftPlan {
  const pow2 = (n & (n - 1)) === 0;
  if (pow2) {
    return { n, pow2, m: n, wr: new Float64Array(0), wi: new Float64Array(0), br: new Float64Array(0), bi: new Float64Array(0) };
  }
  let m = 1;
  while (m < 2 * n - 1) m <<= 1;
  const wr = new Float64Array(n);
  const wi = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const a = (Math.PI * ((k * k) % (2 * n))) / n;
    wr[k] = Math.cos(a);
    wi[k] = -Math.sin(a);
  }
  const br = new Float64Array(m);
  const bi = new Float64Array(m);
  br[0] = wr[0]; bi[0] = -wi[0];
  for (let k = 1; k < n; k++) {
    br[k] = br[m - k] = wr[k];
    bi[k] = bi[m - k] = -wi[k];
  }
  fftRadix2(br, bi);
  return { n, pow2, m, wr, wi, br, bi };
}

function fft1d(plan: FftPlan, re: Float64Array, im: Float64Array): void {
  if (plan.pow2) {
    fftRadix2(re, im);
    return;
  }
  const { n, m, wr, wi, br, bi } = plan;
  const ar = new Float64Array(m);
  const ai = new Float64Array(m);
  for (let k = 0; k < n; k++) {
    ar[k] = re[k] * wr[k] - im[k] * wi[k];
    ai[k] = re[k] * wi[k] + im[k] * wr[k];
  }
  fftRadix2(ar, ai);
  for (let k = 0; k < m; k++) {
    const r = ar[k] * br[k] - ai[k] * bi[k];
    const i = ar[k] * bi[k] + ai[k] * br[k];
    ar[k] = r;
    ai[k] = -i; // conj for inverse via forward FFT
  }
  fftRadix2(ar, ai);
  for (let k = 0; k < n; k++) {
    const r = ar[k] / m;
    const i = -ai[k] / m;
    re[k] = r * wr[k] - i * wi[k];
    im[k] = r * wi[k] + i * wr[k];
  }
}

/** Returns |FFT2(x)| for a dim x dim real matrix (row-major). */
function fft2Magnitude(src: Float64Array, dim: number): Float64Array {
  const plan = makePlan(dim);
  const re = new Float64Array(dim * dim);
  const im = new Float64Array(dim * dim);
  const rr = new Float64Array(dim);
  const ri = new Float64Array(dim);
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) { rr[x] = src[y * dim + x]; ri[x] = 0; }
    fft1d(plan, rr, ri);
    for (let x = 0; x < dim; x++) { re[y * dim + x] = rr[x]; im[y * dim + x] = ri[x]; }
  }
  const out = new Float64Array(dim * dim);
  for (let x = 0; x < dim; x++) {
    for (let y = 0; y < dim; y++) { rr[y] = re[y * dim + x]; ri[y] = im[y * dim + x]; }
    fft1d(plan, rr, ri);
    for (let y = 0; y < dim; y++) out[y * dim + x] = Math.hypot(rr[y], ri[y]);
  }
  return out;
}

// ---------- Screening analyses (port of ai_detector.py) ----------

export function analyzeFrequencySpectrum(gray: Uint8Array, w: number, h: number): number {
  const dim = Math.min(h, w, 512);
  const sy = Math.floor((h - dim) / 2);
  const sx = Math.floor((w - dim) / 2);
  const crop = new Float64Array(dim * dim);
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) crop[y * dim + x] = gray[(sy + y) * w + sx + x];
  }
  const mag = fft2Magnitude(crop, dim);

  const half = Math.floor(dim / 2);
  const cy = half;
  const cx = half;
  const rInner = 0.35 * half;
  const rOuter = 0.85 * half;

  // Iterate over the fftshift-ed grid; shifted[i] = orig[(i - n//2) mod n]
  const vals: number[] = [];
  for (let i = 0; i < dim; i++) {
    const yy = i - cy;
    const oi = (((i - half) % dim) + dim) % dim;
    for (let j = 0; j < dim; j++) {
      const xx = j - cx;
      const r = Math.sqrt(xx * xx + yy * yy);
      if (r >= rInner && r <= rOuter) {
        const oj = (((j - half) % dim) + dim) % dim;
        vals.push(20 * Math.log(mag[oi * dim + oj] + 1.0));
      }
    }
  }
  if (vals.length === 0) return 0.5;

  let s = 0;
  for (const v of vals) s += v;
  const mean = s / vals.length;
  let sq = 0;
  for (const v of vals) sq += (v - mean) * (v - mean);
  const std = Math.sqrt(sq / vals.length);

  const thr = mean + 2.2 * std;
  let peaks = 0;
  for (const v of vals) if (v > thr) peaks++;
  const peakRatio = peaks / Math.max(1, vals.length);

  const centerVal = 20 * Math.log(mag[0] + 1.0); // shifted[cy,cx] == DC
  const tailRatio = mean / Math.max(1e-5, centerVal);

  return clip(peakRatio * 35.0 + tailRatio * 0.6, 0.05, 0.95);
}

export function analyzeChromaticCoherence(img: RgbImage): number {
  const { width: w, height: h, data } = img;
  // Sobel(ksize=3) dx + dy for R and B channels, BORDER_REFLECT_101; streaming stats.
  let sr = 0, sb = 0, srr = 0, sbb = 0, srb = 0;
  for (let y = 0; y < h; y++) {
    const y0 = reflect101(y - 1, h) * w;
    const y1 = y * w;
    const y2 = reflect101(y + 1, h) * w;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : reflect101(x - 1, w);
      const x2 = x < w - 1 ? x + 1 : reflect101(x + 1, w);
      const p00 = (y0 + x0) * 3, p01 = (y0 + x) * 3, p02 = (y0 + x2) * 3;
      const p10 = (y1 + x0) * 3, p12 = (y1 + x2) * 3;
      const p20 = (y2 + x0) * 3, p21 = (y2 + x) * 3, p22 = (y2 + x2) * 3;
      let gr = 0;
      let gb = 0;
      for (let ch = 0; ch < 3; ch += 2) {
        const a00 = data[p00 + ch], a01 = data[p01 + ch], a02 = data[p02 + ch];
        const a10 = data[p10 + ch], a12 = data[p12 + ch];
        const a20 = data[p20 + ch], a21 = data[p21 + ch], a22 = data[p22 + ch];
        const dx = a02 - a00 + 2 * (a12 - a10) + a22 - a20;
        const dy = a20 - a00 + 2 * (a21 - a01) + a22 - a02;
        if (ch === 0) gr = dx + dy;
        else gb = dx + dy;
      }
      sr += gr; sb += gb; srr += gr * gr; sbb += gb * gb; srb += gr * gb;
    }
  }
  const n = w * h;
  const mr = sr / n;
  const mb = sb / n;
  const stdR = Math.sqrt(Math.max(0, srr / n - mr * mr));
  const stdB = Math.sqrt(Math.max(0, sbb / n - mb * mb));
  if (stdR === 0 || stdB === 0) return 0.5;

  const corr = (srb / n - mr * mb) / (stdR * stdB);
  let synth: number;
  if (corr > 0.985) synth = 0.75 + (corr - 0.985) * 15.0;
  else if (corr < 0.72) synth = 0.65 + (0.72 - corr) * 1.5;
  else synth = 0.25;
  return clip(synth, 0.1, 0.95);
}

// cv2.getGaussianKernel(5, 1.0) quantised to 8 fractional bits (OpenCV bit-exact path) => [14,62,104,62,14]
const GK = [14, 62, 104, 62, 14];

export function analyzeTextureEntropy(gray: Uint8Array, w: number, h: number): number {
  // Horizontal pass (units of 1/256)
  const tmp = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -2; k <= 2; k++) {
        const xx = x + k >= 0 && x + k < w ? x + k : reflect101(x + k, w);
        s += GK[k + 2] * gray[row + xx];
      }
      tmp[row + x] = s;
    }
  }
  let sum = 0;
  let sq = 0;
  for (let y = 0; y < h; y++) {
    const rows = [-2, -1, 0, 1, 2].map((k) => (y + k >= 0 && y + k < h ? y + k : reflect101(y + k, h)) * w);
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = 0; k < 5; k++) s += GK[k] * tmp[rows[k] + x];
      let b = (s + 32768) >>> 16;
      if (b > 255) b = 255;
      const res = Math.abs(gray[y * w + x] - b);
      sum += res;
      sq += res * res;
    }
  }
  const n = w * h;
  const mean = sum / n;
  const std = Math.sqrt(Math.max(0, sq / n - mean * mean));
  const cv = std / Math.max(1e-4, mean);

  let score: number;
  if (cv > 1.75) score = 0.7 + Math.min(0.25, (cv - 1.75) * 0.4);
  else if (cv < 0.75) score = 0.65 + Math.min(0.25, (0.75 - cv) * 0.5);
  else score = 0.2;
  return clip(score, 0.1, 0.95);
}

export interface AiScreeningResult {
  is_synthetic: boolean;
  confidence: number;
  status: 'LIKELY_AUTHENTIC' | 'LIKELY_AI' | 'INCONCLUSIVE';
  details: string;
  breakdown: { frequency_score: number; chromatic_score: number; texture_score: number };
}

const AI_THRESHOLD = 0.65;
const INCONCLUSIVE_MIN = 0.45;

export function screenImage(img: RgbImage, gray: Uint8Array): AiScreeningResult {
  const freq = analyzeFrequencySpectrum(gray, img.width, img.height);
  const color = analyzeChromaticCoherence(img);
  const texture = analyzeTextureEntropy(gray, img.width, img.height);

  const composite = 0.45 * freq + 0.3 * color + 0.25 * texture;
  const confidence = roundTo(clip(composite, 0.05, 0.98), 3);
  const pct = (confidence * 100).toFixed(1);

  let status: AiScreeningResult['status'];
  let isSynthetic: boolean;
  let details: string;
  if (confidence >= AI_THRESHOLD) {
    status = 'LIKELY_AI';
    isSynthetic = true;
    details =
      `Synthetic generation markers detected (confidence ${pct}%). ` +
      'High-frequency Fourier grid artifacts and unnatural cross-channel gradient covariance identified.';
  } else if (confidence >= INCONCLUSIVE_MIN) {
    status = 'INCONCLUSIVE';
    isSynthetic = false;
    details =
      `Authenticity indicators inconclusive (confidence ${pct}%). ` +
      'Image exhibits partial spectral irregularities, possibly due to aggressive compression or filters.';
  } else {
    status = 'LIKELY_AUTHENTIC';
    isSynthetic = false;
    details =
      `Image exhibits optical camera sensor characteristics (confidence ${pct}%). ` +
      'Frequency spectra and chromatic dispersion align with natural photography.';
  }

  return {
    is_synthetic: isSynthetic,
    confidence,
    status,
    details,
    breakdown: {
      frequency_score: roundTo(freq, 3),
      chromatic_score: roundTo(color, 3),
      texture_score: roundTo(texture, 3),
    },
  };
}
