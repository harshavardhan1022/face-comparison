#!/usr/bin/env bash
# ==============================================================================
# One-Command Automated Production Deployment Script
# AI Facial Similarity Analyzer v2.0.0
# ==============================================================================
set -euo pipefail

echo "========================================================================"
echo " Starting AI Facial Similarity Analyzer Deployment..."
echo "========================================================================"

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed. Please install Docker and Docker Compose first."
    exit 1
fi

# Check Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo "[ERROR] 'docker compose' is not available. Please verify Docker Compose plugin."
    exit 1
fi

# Ensure .env exists
if [ ! -f .env ]; then
    echo "[INFO] No .env file found in root. Generating from .env.example..."
    cp .env.example .env
    # Generate random JWT secret if openssl is available
    if command -v openssl &> /dev/null; then
        GENERATED_SECRET=$(openssl rand -hex 32)
        sed -i "s/replace-with-a-64-character-random-hex-string/$GENERATED_SECRET/g" .env
        echo "[INFO] Generated random cryptographic JWT_SECRET."
    fi
fi

echo "[1/3] Pulling and building Docker images..."
docker compose build --parallel

echo "[2/3] Starting containers..."
docker compose up -d

echo "[3/3] Checking container health..."
sleep 5
docker compose ps

echo "========================================================================"
echo " Deployment Successfully Completed!"
echo " Web UI:     http://localhost:3000"
echo " AI Engine:  http://localhost:8000"
echo " AI Health:  http://localhost:8000/api/v1/health"
echo " Pre-seeded Super Admin: superadmin@facialsimilarity.ai / SuperAdmin123!"
echo "========================================================================"
