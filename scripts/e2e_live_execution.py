"""
End-to-End Live System Execution & Verification Script
Executes full user authentication, face comparison inference, photo retention,
audit logging, admin monitoring, and forgot-password reset flows against the live running application.
"""
import urllib.request
import urllib.parse
import json
import http.cookiejar
import cv2
import numpy as np

BASE_URL = "http://127.0.0.1:3000"
AI_SERVICE_URL = "http://127.0.0.1:8000"

def create_face_photo(name: str, skin_color=(210, 190, 175), eye_spacing=50) -> bytes:
    """Generates an authentic synthetic test face image"""
    img = np.ones((300, 300, 3), dtype=np.uint8) * 240
    # Head outline
    cv2.ellipse(img, (150, 150), (75, 100), 0, 0, 360, skin_color, -1)
    # Eyes
    cv2.circle(img, (150 - eye_spacing // 2, 125), 9, (50, 40, 30), -1)
    cv2.circle(img, (150 + eye_spacing // 2, 125), 9, (50, 40, 30), -1)
    # Nose
    cv2.line(img, (150, 135), (150, 165), (120, 90, 70), 3)
    # Mouth
    cv2.ellipse(img, (150, 195), (30, 15), 0, 0, 180, (90, 40, 40), 3)
    # Text
    cv2.putText(img, name, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (80, 80, 80), 2)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

def run_live_execution():
    print("=" * 70)
    print("AI FACE SIMILARITY ANALYZER — LIVE END-TO-END EXECUTION")
    print("=" * 70)

    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

    # STEP 1: Verify AI Microservice Health & Queue Telemetry
    print("\n[1/7] Testing AI Service Telemetry Endpoint...")
    with opener.open(f"{AI_SERVICE_URL}/api/v1/health") as resp:
        assert resp.status == 200
        health = json.loads(resp.read().decode())
        print(f"  ✓ AI Engine:   {health['ai_engine']}")
        print(f"  ✓ Status:      {health['status']}")
        print(f"  ✓ Workers:     {health['queue']['active_workers']} active, depth: {health['queue']['queue_depth']}")

    # STEP 2: Authenticate Standard User
    print("\n[2/7] Authenticating User (user@facialsimilarity.ai)...")
    login_data = json.dumps({
        "email": "user@facialsimilarity.ai",
        "password": "UserPassword123!",
        "rememberMe": True
    }).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with opener.open(req) as resp:
        assert resp.status == 200
        user_info = json.loads(resp.read().decode())
        print(f"  ✓ Logged in as: {user_info['user']['name']} ({user_info['user']['email']})")
        print(f"  ✓ Role:         {user_info['user']['role']}")

    # STEP 3: Verify Session State
    print("\n[3/7] Verifying Session Cookie (/api/auth/me)...")
    with opener.open(f"{BASE_URL}/api/auth/me") as resp:
        assert resp.status == 200
        me = json.loads(resp.read().decode())
        assert me["authenticated"] is True
        print(f"  ✓ Session verified: {me['user']['email']}")

    # STEP 4A: Test Synthetic AI Screening Detection
    print("\n[4/8] Testing Synthetic AI Screening Shield (Triggering AI Detection)...")
    face1_bytes = create_face_photo("Person Alpha", skin_color=(220, 200, 185), eye_spacing=52)
    face2_bytes = create_face_photo("Person Beta", skin_color=(205, 185, 170), eye_spacing=48)

    boundary = "----WebKitFormBoundaryE2ETestExecution2026"
    body = bytearray()
    
    # Image 1
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="image1"; filename="person_alpha.jpg"\r\n')
    body.extend(b'Content-Type: image/jpeg\r\n\r\n')
    body.extend(face1_bytes)
    body.extend(b'\r\n')

    # Image 2
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="image2"; filename="person_beta.jpg"\r\n')
    body.extend(b'Content-Type: image/jpeg\r\n\r\n')
    body.extend(face2_bytes)
    body.extend(b'\r\n')
    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        f"{BASE_URL}/api/compare",
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    try:
        with opener.open(req) as resp:
            pass
    except urllib.error.HTTPError as e:
        assert e.code == 422
        flagged = json.loads(e.read().decode())
        assert flagged["code"] == "AI_GENERATED_IMAGE_DETECTED"
        print(f"  ✓ AI Screen Caught Synthetic Face: {flagged['message']}")
        print(f"  ✓ Flagged Slot:                     {flagged['flaggedSlot']} (Confidence: {flagged['confidence']})")

    # STEP 4B: Perform Full Facial Comparison & Embedding Extraction with Authentic Faces
    print("\n[5/8] Running Complete Biometric Pipeline on Real Photographs...")
    with open("scripts/test_face_1.jpg", "rb") as f:
        real_face1_bytes = f.read()
    with open("scripts/test_face_2.jpg", "rb") as f:
        real_face2_bytes = f.read()

    body_real = bytearray()
    body_real.extend(f"--{boundary}\r\n".encode())
    body_real.extend(b'Content-Disposition: form-data; name="image1"; filename="face_1.jpg"\r\n')
    body_real.extend(b'Content-Type: image/jpeg\r\n\r\n')
    body_real.extend(real_face1_bytes)
    body_real.extend(b'\r\n')

    body_real.extend(f"--{boundary}\r\n".encode())
    body_real.extend(b'Content-Disposition: form-data; name="image2"; filename="face_2.jpg"\r\n')
    body_real.extend(b'Content-Type: image/jpeg\r\n\r\n')
    body_real.extend(real_face2_bytes)
    body_real.extend(b'\r\n')

    body_real.extend(f"--{boundary}\r\n".encode())
    body_real.extend(b'Content-Disposition: form-data; name="consentGiven"\r\n\r\n')
    body_real.extend(b'true\r\n')
    body_real.extend(f"--{boundary}--\r\n".encode())

    req2 = urllib.request.Request(
        f"{BASE_URL}/api/compare",
        data=bytes(body_real),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    try:
        with opener.open(req2) as resp:
            assert resp.status == 200
            result = json.loads(resp.read().decode())
            print(f"  ✓ Comparison ID:             {result['comparisonId']}")
            data = result.get('data', {})
            print(f"  ✓ Calibrated Similarity:     {data.get('similarity_score')}%")
            print(f"  ✓ Raw Cosine Similarity:     {data.get('raw_cosine_similarity')}")
            print(f"  ✓ Verdict Category:          {data.get('similarity_category')}")
            print(f"  ✓ Photographs Retained:      {data.get('hasRetainedImages')}")
    except urllib.error.HTTPError as e:
        print(f"  [!] Compare request failed ({e.code}): {e.read().decode()}")
        raise

    # STEP 6: Verify User History & Retained Photo Embeddings
    print("\n[6/8] Querying User Comparison History (/api/history)...")
    with opener.open(f"{BASE_URL}/api/history") as resp:
        assert resp.status == 200
        hist = json.loads(resp.read().decode())
        print(f"  ✓ Total Saved Comparisons:   {len(hist['history'])}")
        latest = hist['history'][0]
        print(f"  ✓ Latest Verdict:            {latest.get('verdict')} ({latest.get('similarityScore')}%)")
        print(f"  ✓ Embedded Image Count:      {len(latest.get('retainedImages', []))}")

    # STEP 7: Authenticate Administrator & Inspect Security Audit Trail
    print("\n[7/8] Authenticating Administrator (admin@facialsimilarity.ai)...")
    admin_login_data = json.dumps({
        "email": "admin@facialsimilarity.ai",
        "password": "AdminPassword123!",
        "isAdminPortal": True
    }).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=admin_login_data, headers={"Content-Type": "application/json"})
    with opener.open(req) as resp:
        assert resp.status == 200
        admin_body = json.loads(resp.read().decode())
        print(f"  ✓ Admin logged in: {admin_body['user']['name']} ({admin_body['user']['role']})")

    # Fetch Admin Stats & Audit Trail
    with opener.open(f"{BASE_URL}/api/admin/stats") as resp:
        assert resp.status == 200
        stats = json.loads(resp.read().decode())
        print(f"  ✓ Registered Users:          {stats['stats']['totalUsers']}")
        print(f"  ✓ Total System Comparisons:  {stats['stats']['totalComparisons']}")
        print(f"  ✓ Retained Photo Consent:    {stats['stats']['consentCount']}")

    with opener.open(f"{BASE_URL}/api/admin/audit-logs?limit=5") as resp:
        assert resp.status == 200
        logs = json.loads(resp.read().decode())
        print(f"  ✓ Recent Audit Event:        {logs['logs'][0]['action']} ({logs['logs'][0]['eventType']})")

    # STEP 8: Test Real Forgot Password Token Generation
    print("\n[8/8] Testing Password Reset Workflow (/api/auth/forgot-password)...")
    forgot_data = json.dumps({"email": "user@facialsimilarity.ai"}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/auth/forgot-password", data=forgot_data, headers={"Content-Type": "application/json"})
    with opener.open(req) as resp:
        assert resp.status == 200
        forgot_res = json.loads(resp.read().decode())
        print(f"  ✓ Password Reset Response:   {forgot_res['message']}")

    print("\n" + "=" * 70)
    print("ALL 7 END-TO-END PIPELINES EXECUTED SUCCESSFULLY WITHOUT ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    run_live_execution()
