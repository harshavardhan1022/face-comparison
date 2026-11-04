"""
Unit and Integration Tests for AI Face Similarity Inference Engine
"""
import pytest
import numpy as np
import cv2
from app.models.calibration import (
    calculate_cosine_similarity,
    calibrate_similarity_index,
    determine_similarity_category
)
from app.preprocessing.image_validator import (
    validate_image_bytes,
    evaluate_image_quality,
    ImageValidationError
)
from app.evaluation.benchmark_eval import compute_benchmark_metrics

def test_cosine_similarity_orthogonal():
    v1 = np.array([1.0, 0.0, 0.0])
    v2 = np.array([0.0, 1.0, 0.0])
    sim = calculate_cosine_similarity(v1, v2)
    assert abs(sim - 0.0) < 1e-6

def test_cosine_similarity_identical():
    v1 = np.array([0.5, 0.5, 0.5, 0.5])
    sim = calculate_cosine_similarity(v1, v1)
    assert abs(sim - 1.0) < 1e-6

def test_cosine_similarity_opposite():
    v1 = np.array([1.0, 2.0, 3.0])
    v2 = np.array([-1.0, -2.0, -3.0])
    sim = calculate_cosine_similarity(v1, v2)
    assert abs(sim - (-1.0)) < 1e-6

def test_calibration_curve_thresholds():
    # At operational threshold tau = 0.38, sigmoid(0) is exactly 50%
    score_mid = calibrate_similarity_index(0.38)
    assert abs(score_mid - 50.0) < 1.0

    # At high genuine cosine score 0.70+, calibrated score should be >= 85%
    score_high = calibrate_similarity_index(0.72)
    assert score_high >= 85.0

    # At impostor cosine score 0.18, calibrated score should be <= 25%
    score_low = calibrate_similarity_index(0.18)
    assert score_low <= 25.0

def test_similarity_categories():
    cat_high, _ = determine_similarity_category(88.0, 0.65)
    assert cat_high == "High Similarity"

    cat_mod, _ = determine_similarity_category(58.0, 0.42)
    assert cat_mod == "Moderate Similarity"

    cat_low, _ = determine_similarity_category(30.0, 0.28)
    assert cat_low == "Low Similarity"

    cat_inc, _ = determine_similarity_category(12.0, 0.12)
    assert cat_inc == "Inconclusive"

def test_image_validator_rejects_empty():
    with pytest.raises(ImageValidationError) as exc_info:
        validate_image_bytes(b"")
    assert exc_info.value.code == "EMPTY_FILE"

def test_image_validator_rejects_invalid_magic_bytes():
    with pytest.raises(ImageValidationError) as exc_info:
        validate_image_bytes(b"NOT_AN_IMAGE_FILE_HEADER_TEXT")
    assert exc_info.value.code == "INVALID_SIGNATURE"

def test_image_quality_assessment():
    # Create a synthetic sharp image
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    cv2.rectangle(img, (50, 50), (150, 150), (255, 255, 255), -1)
    quality = evaluate_image_quality(img)
    assert quality.sharpness_score > 0
    assert 0.0 <= quality.overall_quality_score <= 1.0

def test_benchmark_metrics():
    metrics = compute_benchmark_metrics()
    assert metrics.accuracy > 0.95
    assert metrics.roc_auc > 0.95
    assert metrics.equal_error_rate < 0.05
    assert metrics.true_acceptance_rate > 0.95
    assert metrics.total_test_pairs == 6000

