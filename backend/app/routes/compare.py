"""
API Route for Face Comparison, AI-Generated Image Screening, and High-Concurrency Job Queue
"""
import asyncio
from fastapi import APIRouter, File, UploadFile, HTTPException, Form, status
from app.services.inference_service import get_inference_service, AiGeneratedImageDetectedError
from app.preprocessing.image_validator import validate_image_bytes, ImageValidationError
from app.preprocessing.ai_detector import get_ai_image_detector
from app.models.face_pipeline import FacePipelineError
from app.schemas.face_schemas import ComparisonResponse
from app.services.job_queue import inference_queue

router = APIRouter(prefix="/api/v1", tags=["Facial Comparison & AI Screening"])

@router.post(
    "/screen-ai",
    summary="Screen single photograph for synthetic/AI artifacts",
    description="Analyzes an image using FFT 2D Fourier spectrum anomalies, chromatic coherence, and texture entropy."
)
async def screen_single_image(
    image: UploadFile = File(..., description="Image photograph to screen")
):
    try:
        image_bytes = await image.read()
        cv2_img, _ = validate_image_bytes(image_bytes)
        detector = get_ai_image_detector()
        result = detector.screen_image(cv2_img)
        return {
            "success": True,
            "filename": image.filename,
            "screening": result
        }
    except ImageValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "SCREENING_ERROR", "message": f"Screening failed: {str(e)}"}
        )

@router.post(
    "/compare",
    response_model=ComparisonResponse,
    summary="Compare two facial photographs (concurrency-protected)",
    description="Validates image signatures, screens for synthetic AI artifacts, detects faces, aligns landmarks, extracts deep embeddings, and calculates calibrated similarity index with backpressure protection."
)
async def compare_faces(
    image1: UploadFile = File(..., description="First photograph (JPEG, PNG, WebP)"),
    image2: UploadFile = File(..., description="Second photograph (JPEG, PNG, WebP)"),
    bypass_ai_screen: bool = Form(False, description="Bypass synthetic image rejection (if authorized)")
):
    try:
        bytes1 = await image1.read()
        bytes2 = await image2.read()

        # Check queue capacity for backpressure
        queue_stats = inference_queue.get_stats()
        if queue_stats["queue_depth"] >= queue_stats["capacity"]:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"code": "CONCURRENCY_SATURATED", "message": "Inference server is under peak load. Please retry shortly."}
            )

        async with inference_queue.semaphore:
            service = get_inference_service()
            result = await service.compare_faces(bytes1, bytes2, bypass_ai_screen=bypass_ai_screen)
            return result

    except AiGeneratedImageDetectedError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "AI_GENERATED_IMAGE_DETECTED",
                "message": e.message,
                "flagged_slot": e.slot,
                "confidence": e.confidence,
                "details": e.details
            }
        )
    except ImageValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message}
        )
    except FacePipelineError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": e.code, "message": e.message}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_INFERENCE_ERROR", "message": f"Inference pipeline encountered an unexpected error: {str(e)}"}
        )

def _sync_compare_worker(bytes1: bytes, bytes2: bytes, bypass_ai_screen: bool):
    """Synchronous worker function executed in threadpool"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        service = get_inference_service()
        return loop.run_until_complete(service.compare_faces(bytes1, bytes2, bypass_ai_screen=bypass_ai_screen))
    finally:
        loop.close()

@router.post(
    "/jobs/compare",
    summary="Submit asynchronous face comparison job",
    description="Submits an asynchronous comparison job returning immediately with a job_id for background processing and queue management."
)
async def submit_async_comparison(
    image1: UploadFile = File(..., description="First photograph"),
    image2: UploadFile = File(..., description="Second photograph"),
    bypass_ai_screen: bool = Form(False)
):
    try:
        bytes1 = await image1.read()
        bytes2 = await image2.read()

        job_id = await inference_queue.submit_job(
            _sync_compare_worker,
            bytes1,
            bytes2,
            bypass_ai_screen
        )
        return {
            "success": True,
            "job_id": job_id,
            "status": "QUEUED",
            "message": "Job queued for asynchronous AI worker processing."
        }
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "QUEUE_SATURATED", "message": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "JOB_SUBMIT_FAILED", "message": str(e)}
        )

@router.get(
    "/jobs/{job_id}",
    summary="Poll status of asynchronous comparison job"
)
async def get_job_status(job_id: str):
    record = inference_queue.get_job(job_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "JOB_NOT_FOUND", "message": f"Job {job_id} not found."}
        )
    return {
        "job_id": record.job_id,
        "status": record.status,
        "created_at": record.created_at,
        "started_at": record.started_at,
        "completed_at": record.completed_at,
        "result": record.result,
        "error": record.error
    }
