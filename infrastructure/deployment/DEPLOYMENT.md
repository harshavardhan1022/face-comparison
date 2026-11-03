# Production Deployment Guide — AI Facial Similarity Analyzer (v2.0.0)

This guide provides end-to-end instructions for deploying the **AI Facial Similarity Analyzer** to production environments, including Docker Compose, Linux VPS, Cloud Container Platforms (AWS ECS, GCP Cloud Run, DigitalOcean, Railway, Render), and PaaS configurations.

---

## 🏗️ Architecture Overview

```text
               Internet (Clients / Browsers)
                           │
                           ▼
          ┌───────────────────────────────────┐
          │     Nginx Reverse Proxy (SSL)     │ (Port 80/443)
          └─────────────────┬─────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐     ┌────────────────────────┐
│  Next.js 15 Web App     │     │  FastAPI AI Service    │
│  (Frontend & REST API)  │────▶│  (YuNet + ArcFace)     │
│  Port 3000              │     │  Port 8000             │
└───────────┬─────────────┘     └────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│  PostgreSQL Database    │
│  Port 5432              │
└─────────────────────────┘
```

---

## 🚀 Option 1: Standard Docker Compose (Recommended for VPS / Dedicated Server)

### Prerequisites
- Docker Engine 24.0+
- Docker Compose v2.20+
- 2 CPU Cores, 4GB+ RAM recommended (for AI inference & ONNX models)

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/harshavardhan1022/face-comparison.git
cd face-comparison
cp .env.example .env
```

Edit `.env` to configure your production secrets:
```env
DATABASE_URL="postgresql://postgres:your_strong_password@postgres:5432/facesimilarity?schema=public"
JWT_SECRET="generate-a-64-character-random-hex-string"
ADMIN_REGISTRATION_SECRET="strong-secret-for-admin-provisioning"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=facesimilarity
NODE_ENV=production
```

### Step 2: One-Command Deployment
On Linux:
```bash
chmod +x infrastructure/deployment/deploy.sh
./infrastructure/deployment/deploy.sh
```

Or run directly with Docker Compose:
```bash
docker compose up -d --build
```

### Step 3: Verify Running Services
```bash
docker compose ps
```

Health check endpoints:
- Web Application: `http://<your-server-ip>:3000`
- AI Microservice Health: `http://<your-server-ip>:8000/api/v1/health`

---

## 🔒 Option 2: Production with Nginx SSL Reverse Proxy

For a hardened production deployment with automatic SSL termination and rate limiting:

```bash
docker compose -f infrastructure/deployment/docker-compose.prod.yml up -d --build
```

Nginx configuration features:
- Maximum upload size configured to **25MB** (`client_max_body_size 25M`) for high-resolution images.
- Gzip compression enabled for JS, CSS, and SVG assets.
- HTTP security headers enabled (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`).
- Docker container log rotation limited to 10MB x 3 files.

---

## ☁️ Option 3: Cloud Platform Deployment (Railway / Render / AWS / Supabase)

### 1. Database (PostgreSQL)
- Create a managed PostgreSQL database (e.g., Neon, Supabase, AWS RDS, Railway Postgres).
- Obtain the connection URL: `postgresql://user:password@host:5432/dbname?sslmode=require`.

### 2. AI Inference Service
- **Build Context**: `./ai-service`
- **Dockerfile Path**: `infrastructure/docker/Dockerfile.ai-service`
- **Port**: `8000`
- **Healthcheck Path**: `/api/v1/health`
- **Environment Variables**:
  - `AI_SERVICE_HOST=0.0.0.0`
  - `AI_SERVICE_PORT=8000`
  - `ENVIRONMENT=production`

### 3. Frontend Web Application
- **Build Context**: `./frontend`
- **Dockerfile Path**: `infrastructure/docker/Dockerfile.frontend`
- **Port**: `3000`
- **Environment Variables**:
  - `DATABASE_URL`: Your production PostgreSQL URL
  - `JWT_SECRET`: 64-character random secret
  - `ADMIN_REGISTRATION_SECRET`: Secret provisioning key
  - `AI_SERVICE_INTERNAL_URL`: Internal URL to the AI container (e.g., `http://ai-service:8000`)
  - `NEXT_PUBLIC_AI_SERVICE_URL`: Public or proxy URL for client-side checks
  - `NODE_ENV`: `production`

> **Note on Prisma**: The frontend container automatically runs `prepare-db.js` on startup to configure the datasource provider for PostgreSQL, execute `prisma db push`, and seed initial accounts automatically.

---

## 👥 Default Pre-Seeded Credentials

Upon first initialization, the database seeds the following accounts:

| Role | Email | Default Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@facialsimilarity.ai` | `SuperAdmin123!` | Full administrative telemetry, user management, and security audit logs |
| **Admin** | `admin@facialsimilarity.ai` | `AdminPassword123!` | User management, inference audit, system stats |
| **Demo User** | `user@facialsimilarity.ai` | `UserPassword123!` | Standard user comparison history and dashboard |

> ⚠️ **Security Notice**: Change the default passwords immediately via the Admin Dashboard (`/admin/dashboard` &rarr; Profile &rarr; Change Password) upon first deployment.

---

## 🔄 Database Backups & Maintenance

### Backup PostgreSQL
```bash
docker exec -t face-similarity-db pg_dump -U postgres facesimilarity > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore PostgreSQL
```bash
cat backup_file.sql | docker exec -i face-similarity-db psql -U postgres -d facesimilarity
```

