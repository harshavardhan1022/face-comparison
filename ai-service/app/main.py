"""
Main Application Entry Point for AI Inference Service
"""
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import compare, health, evaluate

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade AI Facial Similarity Inference Microservice with calibrated cosine similarity.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS — allow all configured origins + any CORS_ORIGINS env var entries
cors_origins = settings.get_cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(compare.router)
app.include_router(health.router)
app.include_router(evaluate.router)

@app.get("/")
def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "endpoints": {
            "health": "/api/v1/health",
            "compare": "/api/v1/compare",
            "evaluate": "/api/v1/evaluate",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )

