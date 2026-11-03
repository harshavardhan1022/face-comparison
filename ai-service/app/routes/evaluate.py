"""
Model Evaluation and Benchmark Route
"""
from fastapi import APIRouter
from app.schemas.face_schemas import BenchmarkMetrics
from app.evaluation.benchmark_eval import compute_benchmark_metrics

router = APIRouter(prefix="/api/v1", tags=["Model Evaluation"])

@router.get(
    "/evaluate",
    response_model=BenchmarkMetrics,
    summary="Get model benchmark evaluation metrics",
    description="Returns benchmark performance metrics including Accuracy, ROC-AUC, EER, FAR, FRR, and TAR on the LFW dataset."
)
async def get_evaluation_metrics():
    return compute_benchmark_metrics()

