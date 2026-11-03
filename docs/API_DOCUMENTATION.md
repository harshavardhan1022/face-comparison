# API Reference Documentation

## AI Microservice (FastAPI on Port 8000)

### 1. Health Status
`GET /api/v1/health`

**Response (200 OK)**:
```json
{
  "status": "HEALTHY",
  "version": "2.4.0",
  "ai_engine": "OpenCV YuNet + SFace (ArcFace-calibrated)",
  "device": "CPU (Optimized SIMD)",
  "uptime_seconds": 184.25
}
```

### 2. Facial Comparison
`POST /api/v1/compare`

**Headers**: `Content-Type: multipart/form-data`

**Body**:
- `image1`: First facial photograph (JPEG, PNG, WebP)
- `image2`: Second facial photograph (JPEG, PNG, WebP)

**Response (200 OK)**:
```json
{
  "success": true,
  "similarity_score": 88.4,
  "raw_cosine_similarity": 0.6214,
  "similarity_category": "High Similarity",
  "model_version": "SFace-ArcFace-2.4.0",
  "calibrated_explanation": "The AI extracted facial representations exhibit strong geometric and feature congruence (calibrated index 88.4%). The structural facial markers closely align with genuine match distributions.",
  "image1_analysis": {
    "face_detected": true,
    "bbox": { "x": 82, "y": 64, "width": 156, "height": 182, "confidence": 0.982 },
    "landmarks": {
      "left_eye": { "x": 128.4, "y": 122.1 },
      "right_eye": { "x": 188.7, "y": 120.9 },
      "nose_tip": { "x": 158.2, "y": 154.6 },
      "left_mouth": { "x": 134.1, "y": 192.3 },
      "right_mouth": { "x": 182.5, "y": 191.8 }
    },
    "quality": {
      "sharpness_score": 242.15,
      "is_sharp": true,
      "brightness_mean": 134.2,
      "is_well_lit": true,
      "overall_quality_score": 0.92,
      "quality_label": "Optimal"
    },
    "aligned_crop_size": [112, 112]
  },
  "image2_analysis": { ... },
  "inference_time_ms": 142.3,
  "timestamp": "2026-11-03T10:00:00.000Z"
}
```

### 3. Model Benchmark Evaluation
`GET /api/v1/evaluate`

**Response (200 OK)**:
```json
{
  "model_name": "ArcFace-SFace-ResNet",
  "model_version": "v2.4.0",
  "benchmark_dataset": "LFW-Aligned (6,000 evaluation pairs)",
  "accuracy": 0.9982,
  "precision": 0.9978,
  "recall": 0.9985,
  "roc_auc": 0.9994,
  "equal_error_rate": 0.0018,
  "false_acceptance_rate": 0.001,
  "false_rejection_rate": 0.0015,
  "true_acceptance_rate": 0.9985,
  "total_test_pairs": 6000,
  "optimal_threshold_cosine": 0.38,
  "calibration_parameters": {
    "tau_decision_center": 0.38,
    "steepness_factor_k": 8.5,
    "high_similarity_cosine_min": 0.48,
    "moderate_similarity_cosine_min": 0.38,
    "low_similarity_cosine_min": 0.20
  }
}
```

---

## Next.js Application Endpoints (Port 3000)

- `POST /api/auth/login`: Authenticates user or administrator credentials, issues secure HTTP-only JWT cookie.
- `POST /api/auth/register`: Creates new user account.
- `GET /api/auth/me`: Returns currently authenticated user session.
- `POST /api/auth/logout`: Clears session cookie.
- `POST /api/compare`: Receives multipart photographs from client, validates, proxies to AI engine, saves record in Prisma database, logs audit record.
- `GET /api/history`: Fetches past comparison records for authenticated user.
- `GET /api/admin/stats`: Retrieves system telemetry, model evaluations, user counts, and audit logs.
- `GET /api/admin/users`: Lists users with status.
- `PATCH /api/admin/users`: Activates or suspends user account.

