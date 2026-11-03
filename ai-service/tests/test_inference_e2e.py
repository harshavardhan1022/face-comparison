"""
End-to-End API Route Tests with TestClient
"""
import io
import pytest
from fastapi.testclient import TestClient
import numpy as np
import cv2
from PIL import Image

from app.main import app

client = TestClient(app)

def create_synthetic_face_image_bytes(draw_face=True) -> bytes:
    """Creates a synthetic JPEG image bytes buffer."""
    img = np.full((320, 320, 3), 200, dtype=np.uint8)
    if draw_face:
        # Draw realistic skin-tone face oval
        cv2.ellipse(img, (160, 160), (70, 95), 0, 0, 360, (180, 195, 235), -1)
        # Eyes
        cv2.circle(img, (135, 140), 9, (60, 40, 20), -1)
        cv2.circle(img, (185, 140), 9, (60, 40, 20), -1)
        # Nose
        cv2.line(img, (160, 150), (160, 175), (140, 150, 190), 3)
        # Mouth
        cv2.ellipse(img, (160, 200), (24, 10), 0, 0, 180, (80, 70, 160), -1)

    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()

def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "OpenCV YuNet" in data["ai_engine"]

def test_evaluate_endpoint():
    res = client.get("/api/v1/evaluate")
    assert res.status_code == 200
    data = res.json()
    assert data["accuracy"] > 0.95
    assert data["roc_auc"] > 0.95
    assert "calibration_parameters" in data

def test_compare_rejects_non_image():
    files = {
        "image1": ("test1.txt", b"plain text content", "text/plain"),
        "image2": ("test2.txt", b"plain text content", "text/plain")
    }
    res = client.post("/api/v1/compare", files=files)
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "INVALID_SIGNATURE"

