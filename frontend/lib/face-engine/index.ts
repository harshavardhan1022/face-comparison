import { settings, roundTo, clip } from './config';
import { AiGeneratedImageDetectedError, FacePipelineError } from './errors';
import { validateImageBytes, toGray } from './image';
import { evaluateImageQuality, ImageQuality } from './quality';
import { screenImage } from './aiScreen';
import { detectFace, alignCrop, extractEmbedding, FaceBBox, FacialLandmarks, getSessions } from './models';

export { ImageValidationError, FacePipelineError, AiGeneratedImageDetectedError } from './errors';

export interface FaceDetectionResult {
  face_detected: boolean;
  bbox: FaceBBox;
  landmarks: FacialLandmarks;
  quality: ImageQuality;
  ai_screening: { is_synthetic: boolean; confidence: number; status: string; details: string };
  aligned_crop_size: [number, number];
}

export interface ComparisonResponse {
  success: true;
  similarity_score: number;
  raw_cosine_similarity: number;
  similarity_category: string;
  model_version: string;
  calibrated_explanation: string;
  image1_analysis: FaceDetectionResult;
  image2_analysis: FaceDetectionResult;
  inference_time_ms: number;
  timestamp: string;
}

export const ENGINE_NAME = 'YuNet + SFace (ArcFace-calibrated), ONNX Runtime';

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return clip(dot / (Math.sqrt(na) * Math.sqrt(nb)), -1, 1);
}

export function calibrateSimilarityIndex(raw: number): number {
  const exponent = clip(-settings.CALIBRATION_STEEPNESS * (raw - settings.CALIBRATION_TAU), -50, 50);
  let v = 100 / (1 + Math.exp(exponent));
  if (raw < 0) v = Math.max(1, v * (1 + raw));
  return roundTo(clip(v, 1, 99.5), 1);
}

export function determineSimilarityCategory(idx: number, raw: number): [string, string] {
  if (raw >= settings.THRESHOLD_HIGH_SIMILARITY) {
    return ['High Similarity',
      `The AI extracted facial representations exhibit strong geometric and feature congruence (calibrated index ${idx.toFixed(1)}%). The structural facial markers closely align with genuine match distributions.`];
  }
  if (raw >= settings.THRESHOLD_MODERATE_SIMILARITY) {
    return ['Moderate Similarity',
      `Noticeable facial feature overlap detected (calibrated index ${idx.toFixed(1)}%). Commonalities in bone structure and landmark spacing are present, though variations in pose, lighting, or aging may be influencing divergence.`];
  }
  if (raw >= settings.THRESHOLD_LOW_SIMILARITY) {
    return ['Low Similarity',
      `Distinctive facial landmarks and embedding topologies diverge substantially (calibrated index ${idx.toFixed(1)}%). The feature vectors reflect characteristics typical of different individuals.`];
  }
  return ['Inconclusive',
    `Minimal facial representation concordance detected (calibrated index ${idx.toFixed(1)}%). The facial embeddings demonstrate significant divergence across all measured dimensions.`];
}

/** Warm up / health check: loads both models. */
export async function engineHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getSessions();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/** Port of InferenceService.compare_faces(). */
export async function compareFaces(image1: Buffer, image2: Buffer, bypassAiScreen = false): Promise<ComparisonResponse> {
  const start = performance.now();

  const img1 = await validateImageBytes(image1);
  const gray1 = toGray(img1);
  const quality1 = evaluateImageQuality(gray1, img1.width, img1.height);

  const img2 = await validateImageBytes(image2);
  const gray2 = toGray(img2);
  const quality2 = evaluateImageQuality(gray2, img2.width, img2.height);

  const ai1 = screenImage(img1, gray1);
  const ai2 = screenImage(img2, gray2);

  if (!bypassAiScreen) {
    if (ai1.is_synthetic) {
      throw new AiGeneratedImageDetectedError('IMAGE_1',
        'Photograph 1 appears to contain AI-generated or synthetically manipulated content.', ai1.confidence, ai1.details);
    }
    if (ai2.is_synthetic) {
      throw new AiGeneratedImageDetectedError('IMAGE_2',
        'Photograph 2 appears to contain AI-generated or synthetically manipulated content.', ai2.confidence, ai2.details);
    }
  }

  const screening = (r: typeof ai1) => ({ is_synthetic: r.is_synthetic, confidence: r.confidence, status: r.status, details: r.details });

  let det1, det2;
  try {
    det1 = await detectFace(img1);
  } catch (e) {
    if (e instanceof FacePipelineError) throw new FacePipelineError(`Photograph 1 Error: ${e.message}`, `IMG1_${e.code}`);
    throw e;
  }
  try {
    det2 = await detectFace(img2);
  } catch (e) {
    if (e instanceof FacePipelineError) throw new FacePipelineError(`Photograph 2 Error: ${e.message}`, `IMG2_${e.code}`);
    throw e;
  }

  const emb1 = await extractEmbedding(alignCrop(img1, det1.faceRow));
  const emb2 = await extractEmbedding(alignCrop(img2, det2.faceRow));

  const raw = cosineSimilarity(emb1, emb2);
  const score = calibrateSimilarityIndex(raw);
  const [category, explanation] = determineSimilarityCategory(score, raw);

  return {
    success: true,
    similarity_score: score,
    raw_cosine_similarity: roundTo(raw, 4),
    similarity_category: category,
    model_version: `SFace-ArcFace-${settings.APP_VERSION}`,
    calibrated_explanation: explanation,
    image1_analysis: {
      face_detected: true, bbox: det1.bbox, landmarks: det1.landmarks, quality: quality1,
      ai_screening: screening(ai1), aligned_crop_size: [112, 112],
    },
    image2_analysis: {
      face_detected: true, bbox: det2.bbox, landmarks: det2.landmarks, quality: quality2,
      ai_screening: screening(ai2), aligned_crop_size: [112, 112],
    },
    inference_time_ms: roundTo(performance.now() - start, 2),
    timestamp: new Date().toISOString(),
  };
}
