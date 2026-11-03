# ==============================================================================
# One-Command Automated Production Deployment Script (PowerShell / Windows)
# AI Facial Similarity Analyzer v2.0.0
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host " Starting AI Facial Similarity Analyzer Deployment..." -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# Verify Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed or not in PATH. Please install Docker Desktop first."
    exit 1
}

# Ensure .env exists
if (-not (Test-Path .env)) {
    Write-Host "[INFO] Copying .env.example to .env..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

Write-Host "[1/3] Building Docker images..." -ForegroundColor Green
docker compose build

Write-Host "[2/3] Starting containers in background..." -ForegroundColor Green
docker compose up -d

Start-Sleep -Seconds 5

Write-Host "[3/3] Inspecting service status..." -ForegroundColor Green
docker compose ps

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host " Deployment Completed!" -ForegroundColor Green
Write-Host " Web Portal:  http://localhost:3000" -ForegroundColor White
Write-Host " AI Service:  http://localhost:8000" -ForegroundColor White
Write-Host " Super Admin: superadmin@facialsimilarity.ai / SuperAdmin123!" -ForegroundColor White
Write-Host "========================================================================" -ForegroundColor Cyan

