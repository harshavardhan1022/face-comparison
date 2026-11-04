"""
Health & Telemetry Route
"""
import time
from fastapi import APIRouter
from app.config import settings
from app.schemas.face_schemas import HealthStatus
from app.services.job_queue import inference_queue

router = APIRouter(prefix="/api/v1", tags=["Health & System"])
_start_time = time.time()

@router.get("/health", response_model=HealthStatus, summary="Check service health")
async def health_check():
    uptime = time.time() - _start_time
    inference_queue.cleanup_old_jobs()
    return HealthStatus(
        status="HEALTHY",
        version=settings.APP_VERSION,
        ai_engine="OpenCV YuNet + SFace (ArcFace-calibrated)",
        device="CPU (Optimized SIMD)",
        uptime_seconds=round(uptime, 2),
        queue=inference_queue.get_stats()
    )

