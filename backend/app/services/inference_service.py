"""
Facial Comparison Inference Service
Coordinates the end-to-end AI inference pipeline with synthetic AI screening.
"""
import time
from datetime import datetime, timezone
from typing import Optional
import numpy as np

from app.config import settings
from app.preprocessing.image_validator import validate_image_bytes, evaluate_image_quality
from app.preprocessing.ai_detector import get_ai_image_detector
from app.models.face_pipeline import get_face_pipeline, FacePipelineError
from app.models.calibration import (
    calculate_cosine_similarity,
    calibrate_similarity_index,
    determine_similarity_category
)
from app.schemas.face_schemas import ComparisonResponse, FaceDetectionResult, AiScreeningResult

class AiGeneratedImageDetectedError(Exception):
    def __init__(self, slot: str, message: str, confidence: float, details: str):
        self.slot = slot  # "IMAGE_1" or "IMAGE_2"
        self.message = message
        self.confidence = confidence
        self.details = details
        super().__init__(self.message)

class InferenceService:
    def __init__(self):
        self.pipeline = get_face_pipeline()
        self.ai_detector = get_ai_image_detector()

    async def compare_faces(
        self,
        image1_bytes: bytes,
        image2_bytes: bytes,
        bypass_ai_screen: bool = False
    ) -> ComparisonResponse:
        start_time = time.perf_counter()

        # Stage 1: Validation & Quality Analysis for Image 1
        cv2_img1, _ = validate_image_bytes(image1_bytes)
        quality1 = evaluate_image_quality(cv2_img1)

        # Stage 1: Validation & Quality Analysis for Image 2
        cv2_img2, _ = validate_image_bytes(image2_bytes)
        quality2 = evaluate_image_quality(cv2_img2)

        # Stage 2: AI-Generated Image Screening
        ai_res1 = self.ai_detector.screen_image(cv2_img1)
        ai_res2 = self.ai_detector.screen_image(cv2_img2)

        if not bypass_ai_screen:
            if ai_res1["is_synthetic"]:
                raise AiGeneratedImageDetectedError(
                    slot="IMAGE_1",
                    message="Photograph 1 appears to contain AI-generated or synthetically manipulated content.",
                    confidence=ai_res1["confidence"],
                    details=ai_res1["details"]
                )
            if ai_res2["is_synthetic"]:
                raise AiGeneratedImageDetectedError(
                    slot="IMAGE_2",
                    message="Photograph 2 appears to contain AI-generated or synthetically manipulated content.",
                    confidence=ai_res2["confidence"],
                    details=ai_res2["details"]
                )

        screening_schema1 = AiScreeningResult(
            is_synthetic=ai_res1["is_synthetic"],
            confidence=ai_res1["confidence"],
            status=ai_res1["status"],
            details=ai_res1["details"]
        )
        screening_schema2 = AiScreeningResult(
            is_synthetic=ai_res2["is_synthetic"],
            confidence=ai_res2["confidence"],
            status=ai_res2["status"],
            details=ai_res2["details"]
        )

        # Stage 3: Face Detection & Landmark Extraction for Image 1
        try:
            face_row1, bbox1, landmarks1 = self.pipeline.detect_face(cv2_img1)
            analysis1 = FaceDetectionResult(
                face_detected=True,
                bbox=bbox1,
                landmarks=landmarks1,
                quality=quality1,
                ai_screening=screening_schema1,
                aligned_crop_size=[112, 112]
            )
        except FacePipelineError as e:
            raise FacePipelineError(f"Photograph 1 Error: {e.message}", f"IMG1_{e.code}")

        # Stage 3: Face Detection & Landmark Extraction for Image 2
        try:
            face_row2, bbox2, landmarks2 = self.pipeline.detect_face(cv2_img2)
            analysis2 = FaceDetectionResult(
                face_detected=True,
                bbox=bbox2,
                landmarks=landmarks2,
                quality=quality2,
                ai_screening=screening_schema2,
                aligned_crop_size=[112, 112]
            )
        except FacePipelineError as e:
            raise FacePipelineError(f"Photograph 2 Error: {e.message}", f"IMG2_{e.code}")

        # Stage 4: Landmark Alignment (112x112 canonical crop)
        aligned_crop1 = self.pipeline.align_face(cv2_img1, face_row1)
        aligned_crop2 = self.pipeline.align_face(cv2_img2, face_row2)

        # Stage 5: Feature Extraction (128D normalized ArcFace/SFace embedding)
        emb1 = self.pipeline.extract_embedding(aligned_crop1)
        emb2 = self.pipeline.extract_embedding(aligned_crop2)

        # Stage 6: Cosine Similarity Computation
        raw_cosine = calculate_cosine_similarity(emb1, emb2)

        # Stage 7: Calibration & Interpretation
        calibrated_score = calibrate_similarity_index(raw_cosine)
        category, explanation = determine_similarity_category(calibrated_score, raw_cosine)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return ComparisonResponse(
            success=True,
            similarity_score=calibrated_score,
            raw_cosine_similarity=round(raw_cosine, 4),
            similarity_category=category,
            model_version=f"SFace-ArcFace-{settings.APP_VERSION}",
            calibrated_explanation=explanation,
            image1_analysis=analysis1,
            image2_analysis=analysis2,
            inference_time_ms=round(elapsed_ms, 2),
            timestamp=datetime.now(timezone.utc).isoformat()
        )

_inference_service: Optional[InferenceService] = None

def get_inference_service() -> InferenceService:
    global _inference_service
    if _inference_service is None:
        _inference_service = InferenceService()
    return _inference_service
