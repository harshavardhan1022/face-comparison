import {
  compareFaces,
  AiGeneratedImageDetectedError,
  FacePipelineError,
  ImageValidationError,
} from './index';

/**
 * Runs a comparison with the built-in engine and returns the same
 * { status, body } shape the Python FastAPI service produced, so callers can
 * handle both identically.
 */
export async function runLocalComparison(
  image1: Buffer,
  image2: Buffer,
  bypassAiScreen: boolean
): Promise<{ status: number; body: any }> {
  try {
    const result = await compareFaces(image1, image2, bypassAiScreen);
    return { status: 200, body: result };
  } catch (e: any) {
    if (e instanceof AiGeneratedImageDetectedError) {
      return {
        status: 422,
        body: {
          detail: {
            code: 'AI_GENERATED_IMAGE_DETECTED',
            message: e.message,
            flagged_slot: e.slot,
            confidence: e.confidence,
            details: e.details,
          },
        },
      };
    }
    if (e instanceof ImageValidationError) {
      return { status: 400, body: { detail: { code: e.code, message: e.message } } };
    }
    if (e instanceof FacePipelineError) {
      return { status: 422, body: { detail: { code: e.code, message: e.message } } };
    }
    console.error('[face-engine] Unexpected inference error:', e);
    return {
      status: 500,
      body: {
        detail: {
          code: 'INTERNAL_INFERENCE_ERROR',
          message: `Inference pipeline encountered an unexpected error: ${e?.message || e}`,
        },
      },
    };
  }
}

const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|ai-service)$/i;

/**
 * An external Python service URL, if one is configured and reachable from the
 * public internet. Local addresses (localhost:8000, docker hostnames) can
 * never be reached from Netlify, so they are ignored and the built-in engine
 * is used instead.
 */
export function getRemoteAiServiceUrl(): string | null {
  const raw = process.env.AI_SERVICE_INTERNAL_URL || process.env.AI_SERVICE_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (LOCAL_HOST.test(u.hostname)) return null;
    return raw.replace(/\/+$/, '');
  } catch {
    return null;
  }
}
