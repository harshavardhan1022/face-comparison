import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as ort from 'onnxruntime-web';
import { settings, roundTo } from './config';
import { FacePipelineError } from './errors';
import { RgbImage } from './image';

// ---------- Model loading ----------

const DETECTOR_FILE = 'face_detection_yunet_2023mar.onnx';
const RECOGNIZER_FILE = 'face_recognition_sface_2021dec.onnx';

function searchDown(root: string, depth: number): string | null {
  try {
    const direct = path.join(root, 'ai-models');
    if (fs.existsSync(path.join(direct, RECOGNIZER_FILE))) return direct;
    if (depth <= 0) return null;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.next')) continue;
      const found = searchDown(path.join(root, entry.name), depth - 1);
      if (found) return found;
    }
  } catch {
    // unreadable directory
  }
  return null;
}

let modelsDir: string | null = null;

function findModelsDir(): string {
  if (modelsDir) return modelsDir;
  const roots = [
    process.env.FACE_MODELS_DIR ? path.dirname(process.env.FACE_MODELS_DIR) : '',
    process.cwd(),
    path.join(process.cwd(), 'frontend'),
    process.env.LAMBDA_TASK_ROOT || '',
  ].filter(Boolean);
  if (process.env.FACE_MODELS_DIR && fs.existsSync(path.join(process.env.FACE_MODELS_DIR, RECOGNIZER_FILE))) {
    return (modelsDir = process.env.FACE_MODELS_DIR);
  }
  for (const r of roots) {
    const d = path.join(r, 'ai-models');
    if (fs.existsSync(path.join(d, RECOGNIZER_FILE))) return (modelsDir = d);
  }
  for (const r of roots) {
    const found = searchDown(r, 4);
    if (found) return (modelsDir = found);
  }
  throw new Error(`Face model weights not found (searched from: ${roots.join(', ')})`);
}

interface Sessions {
  detector: ort.InferenceSession;
  recognizer: ort.InferenceSession;
}

let sessionsPromise: Promise<Sessions> | null = null;

export function getSessions(): Promise<Sessions> {
  if (!sessionsPromise) {
    sessionsPromise = (async () => {
      // Single-threaded WASM: no worker threads needed inside serverless functions.
      ort.env.wasm.numThreads = 1;
      ort.env.logLevel = 'error';
      const dir = findModelsDir();
      const opts: ort.InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        logSeverityLevel: 3,
      };
      const detector = await ort.InferenceSession.create(fs.readFileSync(path.join(dir, DETECTOR_FILE)), opts);
      const recognizer = await ort.InferenceSession.create(fs.readFileSync(path.join(dir, RECOGNIZER_FILE)), opts);
      return { detector, recognizer };
    })().catch((e) => {
      sessionsPromise = null;
      throw e;
    });
  }
  return sessionsPromise;
}

// ---------- Detection (YuNet, port of OpenCV FaceDetectorYN) ----------

/** [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score] */
export type FaceRow = number[];

export interface FaceBBox { x: number; y: number; width: number; height: number; confidence: number }
export interface Point2D { x: number; y: number }
export interface FacialLandmarks {
  left_eye: Point2D; right_eye: Point2D; nose_tip: Point2D; left_mouth: Point2D; right_mouth: Point2D;
}

const NMS_THRESHOLD = 0.3;
const TOP_K = 5000;
const STRIDES = [8, 16, 32];
const MAX_DETECT_PIXELS = 2048 * 2048;

function rectIoU(a: number[], b: number[]): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const iw = x2 - x1;
  const ih = y2 - y1;
  const inter = iw > 0 && ih > 0 ? iw * ih : 0;
  const union = a[2] * a[3] + b[2] * b[3] - inter;
  return union > 0 ? inter / union : 0;
}

async function runDetector(img: RgbImage): Promise<FaceRow[]> {
  const { detector } = await getSessions();
  const { width: w, height: h } = img;

  // Like OpenCV FaceDetectorYN: run at native resolution, zero-padded bottom/right to a multiple of 32.
  // Very large photos are downscaled to keep serverless memory bounded.
  const scale = Math.min(1, Math.sqrt(MAX_DETECT_PIXELS / (w * h)));
  let src = img.data;
  let sw = w;
  let sh = h;
  if (scale < 1) {
    sw = Math.max(1, Math.round(w * scale));
    sh = Math.max(1, Math.round(h * scale));
    src = new Uint8Array(
      await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), {
        raw: { width: w, height: h, channels: 3 },
      })
        .resize(sw, sh, { kernel: 'linear', fit: 'fill' })
        .raw()
        .toBuffer()
    );
  }
  const sx = sw / w;
  const sy = sh / h;

  const padW = (Math.floor((sw - 1) / 32) + 1) * 32;
  const padH = (Math.floor((sh - 1) / 32) + 1) * 32;
  const plane = padW * padH;
  const input = new Float32Array(3 * plane);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const p = (y * sw + x) * 3;
      const o = y * padW + x;
      input[o] = src[p + 2]; // B
      input[plane + o] = src[p + 1]; // G
      input[2 * plane + o] = src[p]; // R
    }
  }

  const outputs = await detector.run({ [detector.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, padH, padW]) });

  const faces: FaceRow[] = [];
  for (const stride of STRIDES) {
    const cols = Math.floor(padW / stride);
    const rows = Math.floor(padH / stride);
    const cls = outputs[`cls_${stride}`].data as Float32Array;
    const obj = outputs[`obj_${stride}`].data as Float32Array;
    const bbox = outputs[`bbox_${stride}`].data as Float32Array;
    const kps = outputs[`kps_${stride}`].data as Float32Array;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const cs = Math.min(1, Math.max(0, cls[idx]));
        const os = Math.min(1, Math.max(0, obj[idx]));
        const score = Math.sqrt(cs * os);
        if (score < settings.MIN_FACE_CONFIDENCE) continue;
        const cx = (c + bbox[idx * 4]) * stride;
        const cy = (r + bbox[idx * 4 + 1]) * stride;
        const bw = Math.exp(bbox[idx * 4 + 2]) * stride;
        const bh = Math.exp(bbox[idx * 4 + 3]) * stride;
        const face: FaceRow = [cx - bw / 2, cy - bh / 2, bw, bh];
        for (let n = 0; n < 5; n++) {
          face.push((kps[idx * 10 + 2 * n] + c) * stride, (kps[idx * 10 + 2 * n + 1] + r) * stride);
        }
        face.push(score);
        faces.push(face);
      }
    }
  }

  let kept = faces;
  if (faces.length > 1) {
    const boxes = faces.map((f) => [Math.trunc(f[0]), Math.trunc(f[1]), Math.trunc(f[2]), Math.trunc(f[3])]);
    const order = faces
      .map((f, i) => ({ s: f[14], i }))
      .filter((o) => o.s > settings.MIN_FACE_CONFIDENCE)
      .sort((a, b) => b.s - a.s) // Array.prototype.sort is stable
      .slice(0, TOP_K)
      .map((o) => o.i);
    const keep: number[] = [];
    for (const i of order) {
      let ok = true;
      for (const k of keep) {
        if (rectIoU(boxes[i], boxes[k]) > NMS_THRESHOLD) { ok = false; break; }
      }
      if (ok) keep.push(i);
    }
    kept = keep.map((i) => faces[i]);
  }

  // Map back to original image coordinates.
  return kept.map((f) => {
    const out = f.slice();
    for (let i = 0; i < 14; i++) out[i] = i % 2 === 0 ? f[i] / sx : f[i] / sy;
    return out;
  });
}

export async function detectFace(img: RgbImage): Promise<{ faceRow: FaceRow; bbox: FaceBBox; landmarks: FacialLandmarks }> {
  const faces = await runDetector(img);
  if (faces.length === 0) {
    throw new FacePipelineError(
      'No human face could be detected in the photograph. Please ensure the face is clearly visible, well-lit, and unoccluded.',
      'NO_FACE_DETECTED'
    );
  }

  let best = faces[0];
  let maxProminence = -1;
  for (const f of faces) {
    const prominence = f[2] * f[3] * f[14];
    if (prominence > maxProminence) {
      maxProminence = prominence;
      best = f;
    }
  }

  const x = Math.trunc(best[0]);
  const y = Math.trunc(best[1]);
  const bw = Math.trunc(best[2]);
  const bh = Math.trunc(best[3]);

  const landmarks: FacialLandmarks = {
    left_eye: { x: best[4], y: best[5] },
    right_eye: { x: best[6], y: best[7] },
    nose_tip: { x: best[8], y: best[9] },
    left_mouth: { x: best[10], y: best[11] },
    right_mouth: { x: best[12], y: best[13] },
  };
  const bbox: FaceBBox = {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.min(img.width, bw),
    height: Math.min(img.height, bh),
    confidence: roundTo(best[14], 4),
  };
  return { faceRow: best, bbox, landmarks };
}

// ---------- Alignment (port of FaceRecognizerSF::alignCrop) ----------

const DST = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];
const DST_MEAN = [56.0262, 71.9008];

/** 2x3 similarity transform (Umeyama) mapping the 5 landmarks to the ArcFace template. */
export function similarityTransform(faceRow: FaceRow): number[] {
  const src = [0, 1, 2, 3, 4].map((i) => [faceRow[4 + i * 2], faceRow[5 + i * 2]]);
  const m0 = src.reduce((s, p) => s + p[0], 0) / 5;
  const m1 = src.reduce((s, p) => s + p[1], 0) / 5;
  let A00 = 0, A01 = 0, A10 = 0, A11 = 0, var1 = 0, var2 = 0;
  for (let i = 0; i < 5; i++) {
    const sx = src[i][0] - m0;
    const sy = src[i][1] - m1;
    const dx = DST[i][0] - DST_MEAN[0];
    const dy = DST[i][1] - DST_MEAN[1];
    A00 += dx * sx; A01 += dx * sy; A10 += dy * sx; A11 += dy * sy;
    var1 += sx * sx; var2 += sy * sy;
  }
  A00 /= 5; A01 /= 5; A10 /= 5; A11 /= 5; var1 /= 5; var2 /= 5;

  // Closed form of U * diag(1, sign(detA)) * Vt and (s0*d0 + s1*d1) for a 2x2 matrix.
  const detA = A00 * A11 - A01 * A10;
  let T00: number, T01: number, T10: number, T11: number, sigma: number;
  if (detA >= 0) {
    const phi = Math.atan2(A10 - A01, A00 + A11);
    const c = Math.cos(phi), s = Math.sin(phi);
    T00 = c; T01 = -s; T10 = s; T11 = c;
    sigma = Math.hypot(A00 + A11, A10 - A01);
  } else {
    const phi = Math.atan2(A01 + A10, A00 - A11);
    const c = Math.cos(phi), s = Math.sin(phi);
    T00 = c; T01 = s; T10 = s; T11 = -c;
    sigma = Math.hypot(A00 - A11, A01 + A10);
  }
  const scale = var1 + var2 > 0 ? sigma / (var1 + var2) : 1;
  const tx = DST_MEAN[0] - scale * (T00 * m0 + T01 * m1);
  const ty = DST_MEAN[1] - scale * (T10 * m0 + T11 * m1);
  return [scale * T00, scale * T01, tx, scale * T10, scale * T11, ty];
}

/** cv2.warpAffine(INTER_LINEAR, BORDER_CONSTANT=0) to 112x112, returning interleaved RGB. */
export function alignCrop(img: RgbImage, faceRow: FaceRow, size = 112): Uint8Array {
  const M = similarityTransform(faceRow);
  // Invert affine (dst -> src mapping), as OpenCV does.
  let D = M[0] * M[4] - M[1] * M[3];
  D = D !== 0 ? 1 / D : 0;
  const i0 = M[4] * D, i1 = -M[1] * D, i3 = -M[3] * D, i4 = M[0] * D;
  const i2 = -i0 * M[2] - i1 * M[5];
  const i5 = -i3 * M[2] - i4 * M[5];

  const { width: w, height: h, data } = img;
  const out = new Uint8Array(size * size * 3);
  // Float bilinear sampling (OpenCV >= 4.11 warp implementation), BORDER_CONSTANT = 0.
  const f32 = Math.fround;
  const pix = (yy: number, xx: number, ch: number) =>
    xx >= 0 && xx < w && yy >= 0 && yy < h ? data[(yy * w + xx) * 3 + ch] : 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sxf = f32(f32(f32(i0 * x) + f32(i1 * y)) + i2);
      const syf = f32(f32(f32(i3 * x) + f32(i4 * y)) + i5);
      const sx = Math.floor(sxf);
      const sy = Math.floor(syf);
      const fx = f32(sxf - sx);
      const fy = f32(syf - sy);
      const o = (y * size + x) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const p00 = pix(sy, sx, ch), p01 = pix(sy, sx + 1, ch);
        const p10 = pix(sy + 1, sx, ch), p11 = pix(sy + 1, sx + 1, ch);
        const top = f32(p00 + f32(fx * f32(p01 - p00)));
        const bot = f32(p10 + f32(fx * f32(p11 - p10)));
        const v = f32(top + f32(fy * f32(bot - top)));
        let r = Math.round(v);
        if (r - v === 0.5 && r % 2 !== 0) r -= 1; // cvRound: half to even
        out[o + ch] = r > 255 ? 255 : r < 0 ? 0 : r;
      }
    }
  }
  return out;
}

// ---------- Embedding (SFace) ----------

export async function extractEmbedding(alignedRgb: Uint8Array, size = 112): Promise<Float32Array> {
  const { recognizer } = await getSessions();
  const plane = size * size;
  const input = new Float32Array(3 * plane);
  // blobFromImage(swapRB=true) on a BGR crop == RGB planes, scale 1, no mean.
  for (let i = 0; i < plane; i++) {
    input[i] = alignedRgb[i * 3];
    input[plane + i] = alignedRgb[i * 3 + 1];
    input[2 * plane + i] = alignedRgb[i * 3 + 2];
  }
  const res = await recognizer.run({ [recognizer.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, size, size]) });
  const feat = Float32Array.from(res[recognizer.outputNames[0]].data as Float32Array);
  let norm = 0;
  for (const v of feat) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < feat.length; i++) feat[i] /= norm;
  return feat;
}
