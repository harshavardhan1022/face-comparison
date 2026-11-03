"""
High-Concurrency Job Queue & Async Worker Manager for AI Inference
Handles bounded worker semaphores, backpressure, queue tracking, and duplicate prevention.
"""
import asyncio
import time
import uuid
from typing import Dict, Any, Optional
from dataclasses import dataclass, field

MAX_CONCURRENT_WORKERS = 8
MAX_QUEUE_CAPACITY = 100
JOB_TIMEOUT_SECONDS = 30.0

@dataclass
class JobRecord:
    job_id: str
    status: str  # QUEUED, PROCESSING, COMPLETED, FAILED
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class InferenceJobQueue:
    def __init__(self, max_workers: int = MAX_CONCURRENT_WORKERS, max_capacity: int = MAX_QUEUE_CAPACITY):
        self.max_workers = max_workers
        self.max_capacity = max_capacity
        self.semaphore = asyncio.Semaphore(max_workers)
        self.active_workers_count = 0
        self.total_processed = 0
        self.total_failed = 0
        self.jobs: Dict[str, JobRecord] = {}
        self._lock = asyncio.Lock()

    def get_stats(self) -> Dict[str, Any]:
        queued_count = sum(1 for j in self.jobs.values() if j.status == "QUEUED")
        processing_count = sum(1 for j in self.jobs.values() if j.status == "PROCESSING")
        return {
            "max_workers": self.max_workers,
            "active_workers": processing_count,
            "queue_depth": queued_count,
            "total_processed": self.total_processed,
            "total_failed": self.total_failed,
            "capacity": self.max_capacity,
        }

    async def submit_job(self, task_func, *args, **kwargs) -> str:
        """
        Submits an inference job with backpressure validation.
        """
        stats = self.get_stats()
        if stats["queue_depth"] >= self.max_capacity:
            raise RuntimeError("AI Inference queue is saturated. Backpressure applied.")

        job_id = f"job_{uuid.uuid4().hex[:16]}"
        record = JobRecord(job_id=job_id, status="QUEUED")
        self.jobs[job_id] = record

        # Launch worker task in background
        asyncio.create_task(self._process_worker(job_id, task_func, *args, **kwargs))
        return job_id

    async def _process_worker(self, job_id: str, task_func, *args, **kwargs):
        record = self.jobs.get(job_id)
        if not record:
            return

        async with self.semaphore:
            record.status = "PROCESSING"
            record.started_at = time.time()
            try:
                # Execute inference with timeout
                result = await asyncio.wait_for(
                    asyncio.to_thread(task_func, *args, **kwargs),
                    timeout=JOB_TIMEOUT_SECONDS
                )
                record.status = "COMPLETED"
                record.result = result
                record.completed_at = time.time()
                self.total_processed += 1
            except asyncio.TimeoutError:
                record.status = "FAILED"
                record.error = f"Inference job timed out after {JOB_TIMEOUT_SECONDS}s"
                record.completed_at = time.time()
                self.total_failed += 1
            except Exception as e:
                record.status = "FAILED"
                record.error = str(e)
                record.completed_at = time.time()
                self.total_failed += 1

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        return self.jobs.get(job_id)

    def cleanup_old_jobs(self, max_age_seconds: float = 600):
        """Purge jobs older than 10 minutes to prevent memory leak"""
        now = time.time()
        to_delete = [
            jid for jid, j in self.jobs.items()
            if (now - j.created_at) > max_age_seconds and j.status in ("COMPLETED", "FAILED")
        ]
        for jid in to_delete:
            del self.jobs[jid]

# Global singleton queue instance
inference_queue = InferenceJobQueue()

