export class ImageValidationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export class FacePipelineError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export class AiGeneratedImageDetectedError extends Error {
  slot: 'IMAGE_1' | 'IMAGE_2';
  confidence: number;
  details: string;
  constructor(slot: 'IMAGE_1' | 'IMAGE_2', message: string, confidence: number, details: string) {
    super(message);
    this.slot = slot;
    this.confidence = confidence;
    this.details = details;
  }
}
