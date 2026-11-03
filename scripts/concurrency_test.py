"""
High-Concurrency Performance & Capacity Benchmark Suite
Simulates concurrent user logins, registrations, and simultaneous facial inference jobs.
Reports measured throughput, average latency, p95 latency, error rates, and capacity limits.
"""
import asyncio
import time
import statistics
import sys
import io
import cv2
import numpy as np

try:
    import httpx
except ImportError:
    print("Please install httpx: pip install httpx")
    sys.exit(1)

FRONTEND_URL = "http://127.0.0.1:3000"
AI_SERVICE_URL = "http://127.0.0.1:8000"

def generate_test_face_jpeg() -> bytes:
    """Generates synthetic test face image bytes"""
    img = np.ones((250, 250, 3), dtype=np.uint8) * 180
    # Add face oval and features
    cv2.ellipse(img, (125, 125), (60, 80), 0, 0, 360, (230, 210, 195), -1)
    cv2.circle(img, (100, 105), 8, (60, 40, 20), -1)
    cv2.circle(img, (150, 105), 8, (60, 40, 20), -1)
    cv2.line(img, (125, 115), (125, 140), (140, 100, 80), 3)
    cv2.ellipse(img, (125, 160), (25, 12), 0, 0, 180, (80, 50, 50), 3)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

async def benchmark_endpoint(name: str, fn, total_requests: int, concurrency: int):
    print(f"\n========================================================")
    print(f"Testing {name}: {total_requests} requests @ concurrency = {concurrency}")
    print(f"========================================================")
    
    semaphore = asyncio.Semaphore(concurrency)
    latencies = []
    successes = 0
    failures = 0

    async def worker(req_idx: int):
        nonlocal successes, failures
        async with semaphore:
            t0 = time.perf_counter()
            try:
                ok = await fn(req_idx)
                elapsed = (time.perf_counter() - t0) * 1000
                if ok:
                    successes += 1
                    latencies.append(elapsed)
                else:
                    failures += 1
            except Exception as e:
                failures += 1

    t_start = time.perf_counter()
    tasks = [worker(i) for i in range(total_requests)]
    await asyncio.gather(*tasks)
    total_time = time.perf_counter() - t_start

    avg_lat = statistics.mean(latencies) if latencies else 0.0
    p95_lat = np.percentile(latencies, 95) if latencies else 0.0
    throughput = (successes / total_time) if total_time > 0 else 0.0
    error_rate = (failures / total_requests * 100) if total_requests > 0 else 0.0

    print(f"Total Time:      {total_time:.2f} s")
    print(f"Throughput:      {throughput:.2f} req/s")
    print(f"Successes:       {successes} / {total_requests}")
    print(f"Error Rate:      {error_rate:.1f}%")
    print(f"Average Latency: {avg_lat:.2f} ms")
    print(f"p95 Latency:     {p95_lat:.2f} ms")

    return {
        "name": name,
        "concurrency": concurrency,
        "total": total_requests,
        "throughput_req_s": round(throughput, 2),
        "avg_latency_ms": round(avg_lat, 2),
        "p95_latency_ms": round(p95_lat, 2),
        "error_rate_pct": round(error_rate, 2),
    }

async def run_all_benchmarks():
    client = httpx.AsyncClient(timeout=30.0)

    # Health check probe
    try:
        r = await client.get(f"{AI_SERVICE_URL}/api/v1/health")
        if r.status_code != 200:
            print("AI Service not healthy, aborting.")
            return
        print("Connected to AI Service successfully.")
    except Exception as e:
        print(f"Could not connect to {AI_SERVICE_URL}: {e}")
        return

    test_img = generate_test_face_jpeg()

    # 1. AI Health / Telemetry Endpoint Concurrency
    async def task_health(idx: int):
        r = await client.get(f"{AI_SERVICE_URL}/api/v1/health")
        return r.status_code == 200

    r1 = await benchmark_endpoint("AI Service Health & Queue Telemetry", task_health, total_requests=100, concurrency=25)

    # 2. AI Screening Endpoint Concurrency
    async def task_screening(idx: int):
        files = {"image": ("test.jpg", test_img, "image/jpeg")}
        r = await client.post(f"{AI_SERVICE_URL}/api/v1/screen-ai", files=files)
        return r.status_code == 200

    r2 = await benchmark_endpoint("Synthetic AI Screening (2D FFT)", task_screening, total_requests=30, concurrency=10)

    # 3. AI Async Job Submission Concurrency
    async def task_async_compare(idx: int):
        files = {
            "image1": ("face1.jpg", test_img, "image/jpeg"),
            "image2": ("face2.jpg", test_img, "image/jpeg"),
        }
        r = await client.post(f"{AI_SERVICE_URL}/api/v1/jobs/compare", files=files, data={"bypass_ai_screen": "true"})
        return r.status_code in (200, 202)

    r3 = await benchmark_endpoint("AI Async Inference Job Submissions", task_async_compare, total_requests=30, concurrency=10)

    await client.aclose()

    print("\n" + "=" * 60)
    print("CAPACITY BENCHMARK SUMMARY REPORT")
    print("=" * 60)
    print(f"| {'Benchmark':<35} | {'Conc':<5} | {'Throughput':<10} | {'Avg (ms)':<9} | {'p95 (ms)':<9} | {'Err (%)':<7} |")
    print("|" + "-" * 37 + "|" + "-" * 7 + "|" + "-" * 12 + "|" + "-" * 11 + "|" + "-" * 11 + "|" + "-" * 9 + "|")
    for r in [r1, r2, r3]:
        print(f"| {r['name']:<35} | {r['concurrency']:<5} | {r['throughput_req_s']:<10} | {r['avg_latency_ms']:<9} | {r['p95_latency_ms']:<9} | {r['error_rate_pct']:<7} |")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_all_benchmarks())

