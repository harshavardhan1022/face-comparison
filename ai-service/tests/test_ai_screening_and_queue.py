"""
Unit tests for AI-Generated Image Screening (FFT) and Async Inference Queue
"""
import pytest
import numpy as np
import cv2
from fastapi.testclient import TestClient
from app.main import app
from app.preprocessing.ai_detector import get_ai_image_detector
from app.services.job_queue import inference_queue

client = TestClient(app)

def create_synthetic_test_image():
    # 250x250 RGB
    img = np.ones((250, 250, 3), dtype=np.uint8) * 200
    # Add face shapes
    cv2.circle(img, (125, 125), 60, (220, 200, 180), -1)
    cv2.circle(img, (105, 110), 6, (40, 30, 20), -1)
    cv2.circle(img, (145, 110), 6, (40, 30, 20), -1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

def test_ai_screening_algorithm():
    detector = get_ai_image_detector()
    img = np.ones((250, 250, 3), dtype=np.uint8) * 128
    result = detector.screen_image(img)
    assert "is_synthetic" in result
    assert "confidence" in result
    assert "status" in result
    assert 0.0 <= result["confidence"] <= 1.0

def test_screen_ai_endpoint():
    img_bytes = create_synthetic_test_image()
    files = {"image": ("test.jpg", img_bytes, "image/jpeg")}
    response = client.post("/api/v1/screen-ai", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "screening" in data

def test_health_queue_telemetry():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "queue" in data
    assert "active_workers" in data["queue"]
    assert "queue_depth" in data["queue"]

def test_async_job_submission():
    img_bytes = create_synthetic_test_image()
    files = {
        "image1": ("face1.jpg", img_bytes, "image/jpeg"),
        "image2": ("face2.jpg", img_bytes, "image/jpeg"),
    }
    response = client.post("/api/v1/jobs/compare", files=files, data={"bypass_ai_screen": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "job_id" in data
    assert data["status"] == "QUEUED"

    # Poll status
    job_id = data["job_id"]
    poll_res = client.get(f"/api/v1/jobs/{job_id}")
    assert poll_res.status_code == 200
    poll_data = poll_res.json()
    assert poll_data["job_id"] == job_id
    assert poll_data["status"] in ("QUEUED", "PROCESSING", "COMPLETED", "FAILED")

