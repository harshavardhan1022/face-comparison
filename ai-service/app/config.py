"""
Configuration settings for AI Face Similarity Inference Engine
"""
import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(case_sensitive=True)

    APP_NAME: str = "AI Face Similarity Inference Engine"
    APP_VERSION: str = "2.4.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Server host & port
    HOST: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    
    # Allowed CORS Origins — extend via CORS_ORIGINS env var (comma-separated)
    CORS_ORIGINS: list[str] = []

    @property
    def get_cors_origins(self) -> list[str]:
        base = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
        ]
        extra_raw = os.getenv("CORS_ORIGINS", "")
        extra = [u.strip() for u in extra_raw.split(",") if u.strip()]
        return list(dict.fromkeys(base + extra))  # deduplicated, order preserved
    
    # Image constraints
    MAX_FILE_SIZE_MB: int = 10
    MIN_IMAGE_DIMENSION: int = 64
    MAX_IMAGE_DIMENSION: int = 4096
    
    # Calibration parameters (derived from ArcFace benchmark ROC on LFW / CFP-FP)
    # Cosine threshold at FAR = 0.1% is 0.38
    CALIBRATION_TAU: float = 0.38
    CALIBRATION_STEEPNESS: float = 8.5
    
    # Category thresholds
    THRESHOLD_HIGH_SIMILARITY: float = 0.48
    THRESHOLD_MODERATE_SIMILARITY: float = 0.38
    THRESHOLD_LOW_SIMILARITY: float = 0.20
    
    # Quality thresholds
    MIN_SHARPNESS_LAPLACIAN: float = 50.0  # Blur detection threshold
    MIN_FACE_CONFIDENCE: float = 0.60

settings = Settings()
