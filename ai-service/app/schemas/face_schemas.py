"""
Pydantic schemas for Face Comparison, Detection, and Benchmark Evaluation
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class Point2D(BaseModel):
    x: float
    y: float

class FaceBBox(BaseModel):
    x: int
    y: int
    width: int
    height: int
    confidence: float

class FacialLandmarks(BaseModel):
    left_eye: Point2D
    right_eye: Point2D
    nose_tip: Point2D
    left_mouth: Point2D
    right_mouth: Point2D

class ImageQuality(BaseModel):
    sharpness_score: float = Field(..., description="Laplacian variance blur score")
    is_sharp: bool
    brightness_mean: float
    is_well_lit: bool
    overall_quality_score: float = Field(..., description="Composite quality [0.0 - 1.0]")
    quality_label: str  # "Optimal", "Good", "Fair", "Suboptimal"

class AiScreeningResult(BaseModel):
    is_synthetic: bool
    confidence: float
    status: str  # "LIKELY_AUTHENTIC" | "LIKELY_AI" | "INCONCLUSIVE"
    details: str

class FaceDetectionResult(BaseModel):
    face_detected: bool
    bbox: Optional[FaceBBox] = None
    landmarks: Optional[FacialLandmarks] = None
    quality: ImageQuality
    ai_screening: Optional[AiScreeningResult] = None
    aligned_crop_size: List[int] = [112, 112]

class ComparisonResponse(BaseModel):
    success: bool
    similarity_score: float = Field(..., description="Calibrated similarity index [0 - 100]")
    raw_cosine_similarity: float = Field(..., description="Normalized dot product [-1.0 to 1.0]")
    similarity_category: str = Field(..., description="'High Similarity' | 'Moderate Similarity' | 'Low Similarity' | 'Inconclusive'")
    model_version: str
    calibrated_explanation: str
    image1_analysis: FaceDetectionResult
    image2_analysis: FaceDetectionResult
    inference_time_ms: float
    timestamp: str

class BenchmarkMetrics(BaseModel):
    model_name: str
    model_version: str
    benchmark_dataset: str
    accuracy: float
    precision: float
    recall: float
    roc_auc: float
    equal_error_rate: float
    false_acceptance_rate: float
    false_rejection_rate: float
    true_acceptance_rate: float
    total_test_pairs: int
    optimal_threshold_cosine: float
    calibration_parameters: Dict[str, float]

class HealthStatus(BaseModel):
    status: str
    version: str
    ai_engine: str
    device: str
    uptime_seconds: float
    queue: Optional[Dict[str, Any]] = None

