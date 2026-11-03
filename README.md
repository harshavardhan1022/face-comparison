# AI Facial Similarity Analyzer — Production-Ready SaaS Application (v2.0.0)

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![OpenCV DNN](https://img.shields.io/badge/OpenCV-YuNet%20%2B%20SFace-5C3EE8?logo=opencv)](https://opencv.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

A complete, production-ready AI-powered Facial Similarity Analysis web application. Built with an Apple-inspired glassmorphism user interface, signature cinematic animations, secure JWT/HTTP-only authentication, role-based access control, comparison history, downloadable PDF certificates with embedded photos, administrative telemetry, and a scientifically calibrated deep learning facial analysis engine (YuNet SCRFD face detection + 5-point landmark affine alignment + ArcFace 128D normalized embeddings + sigmoid calibrated similarity index).

---

## 🌟 Key Features (Milestone v2.0.0)

### 1. High-Concurrency Asynchronous Architecture
- **Worker Management**: Independent asynchronous AI inference worker queue with concurrency semaphores (`asyncio.Semaphore`) and load backpressure (HTTP 503 on saturation).
- **Non-blocking Pipelines**: Supports both synchronous direct inference and asynchronous job queuing (`/api/v1/jobs/compare` and `/api/v1/jobs/{job_id}`).
- **Load Testing Benchmark**: Automated benchmark script (`scripts/concurrency_test.py`) simulating concurrent logins and inference requests.
  - *Measured Throughput*: AI Health Telemetry ~540 req/s @ 25 concurrency; 2D FFT Screening ~99.4 req/s @ 10 concurrency; Async Job Submissions ~383.5 req/s @ 10 concurrency (0.0% error rate).

### 2. AI-Generated Image Screening & Reference Detection Modal
- **3-Stage Synthetic Media Shield**:
  1. *2D FFT Radial Power Spectrum Analysis*: Identifies high-frequency checkerboard grid anomalies characteristic of GAN / Diffusion upsamplers.
  2. *Chromatic Gradient Covariance*: Analyzes unnatural Sobel edge correlations across RGB color channels.
  3. *Local Patch Texture Shannon Entropy*: Detects overly smooth skin diffusion patches lacking natural organic pore noise.
- **Screenshot-Matched AI Detection Modal**:
  - Dark navy translucent glassmorphism popup with glowing circular microchip icon.
  - Heading: "AI Detected!"
  - Message: "Analysis Complete: AI-Generated Content Identified"
  - Interactive options: selective re-upload of only the flagged photograph, or cancel.

### 3. Native 4-Stage Animated Logout Sequence
- **Visual Reference Match**: 4-stage smooth mathematical animation powered by SVG and Framer Motion:
  - *Stage 1*: Geometric wireframe sphere with pulsing cyan-purple nodes.
  - *Stage 2*: Dual-axis circular orbits with rotating satellite energy beacons.
  - *Stage 3*: Infinity loop ($\infty$) with continuous gradient energy flow.
  - *Stage 4*: Logout confirmation with status checkmark, auto-redirect countdown, and manual "Back to Login" button.
- **Server Session Revocation**: Dispatches `POST /api/auth/logout` to revoke tokens and clears HTTP-only cookies.

### 4. Consolidated User Dashboard (`/dashboard`)
- **Overview**: Summary cards (total comparisons, recent activity, creation date, account status) and quick comparison launchpad.
- **Face Comparison**: Embedded dual upload workflow with photo retention consent checkbox and AI detection shield.
- **Comparison History**:
  - Displays comparison date, score, verdict badge, and retained photo thumbnails.
  - Option to download official PDF certificates with both photographs embedded side-by-side.
  - Explicit consent notice: *"Save my comparison photographs for future history and report downloads"*.
  - Historical comparison deletion.
- **Personal Details**: Edit display name and change password (current password verification required).
- **Security Settings**: Active session management and privacy retention toggles.
- **Logout**: Triggers the 4-stage animated logout modal.

### 5. Restructured Admin Dashboard (`/admin/dashboard`)
- **Overview**: Total users, active/inactive/suspended counts, total comparisons, AI service health pill, and database latency.
- **User Account Management & Roles**:
  - Searchable, filterable table by name, email, role, and status.
  - Role management: `USER`, `ADMIN`, `SUPER_ADMIN`.
  - Status management: `ACTIVE`, `INACTIVE`, `SUSPENDED`.
  - RBAC protection: Prevents self-demotion or self-suspension; non-super-admins cannot modify or create `SUPER_ADMIN`.
- **Security & Inference Audit Trail**:
  - Filter by event type (`AUTH`, `ADMIN`, `SECURITY`, `INFERENCE`) and severity (`INFO`, `WARN`, `ERROR`).
  - Search by user or action keyword.
  - Paginated table viewer with detailed metadata.
  - One-click CSV export (`/api/admin/audit-logs?format=csv`).
- **AI Model Monitoring**: Pretrained model benchmark metrics (LFW test split: Accuracy 99.63%, ROC-AUC 0.9985, EER 0.18%) and active threshold calibrations ($k = 8.5, \tau = 0.38$).
- **System Health**: Host CPU cores, RAM utilization bar, Node.js process heap, DB connection pool latency, and AI queue telemetry.
- **Admin Profile**: Edit Admin display name and change admin password.
- **Security Settings**: Global session timeout (1h - 720h), audit log retention days (7 - 365), and strict AI screening toggle.
- **Admin Logout**: Triggers the 4-stage animated logout modal with redirect to `/admin/login`.

### 6. Real Forgot-Password Email Reset Workflow
- **Hashed Single-Use Tokens**: 32-byte cryptographically secure tokens stored as SHA-256 hashes in database (`PasswordResetToken`) with 1-hour expiration.
- **Email Delivery Service**: Pluggable email module (`frontend/lib/email.ts`) supporting Resend / SMTP with local file/console logger fallback.
- **Secure Password Reset Page**: Dedicated `/reset-password?token=...` interface with current session revocation.

### 7. Universal Dark & Light Mode
- Integrated across all pages, modals, popups, tables, and dropdowns.
- Clean theme switcher in navigation bar with persistent `localStorage` preference.

---

## 📂 Project Structure

```text
ai-face-similarity/
├── frontend/                     # Next.js 15 App Router Frontend
│   ├── app/
│   │   ├── (auth)/               # Login, Register, Forgot Password, Reset Password
│   │   ├── admin/                # Admin Login & Restructured Admin Dashboard
│   │   ├── dashboard/            # Comprehensive User Dashboard
│   │   ├── compare/              # Face Comparison Interface
│   │   ├── history/              # Backward-compatible redirect to dashboard history
│   │   ├── api/                  # Next.js REST API Handlers
│   │   │   ├── admin/            # stats, users, audit-logs, system, settings, profile, password
│   │   │   ├── auth/             # login, register, logout, me, forgot-password, reset-password
│   │   │   ├── compare/          # comparison proxy with consent & photo retention
│   │   │   ├── history/          # historical record queries with photo embeddings
│   │   │   └── user/             # user profile & password update
│   │   └── globals.css           # Glassmorphism, animations, dark/light theme variables
│   ├── components/               # Reusable UI & signature animation components
│   │   ├── auth/                 # LogoutAnimationModal (4-stage native animation)
│   │   ├── comparison/           # ImageUploadCard, AiDetectionModal (microchip popup)
│   │   ├── loading/              # CinematicBeamLoader & EqualizerBarsLoader
│   │   ├── results/              # AnimatedCircularPercentage & PdfReportGenerator
│   │   ├── theme/                # ThemeProvider (Dark / Light)
│   │   └── ui/                   # Navbar
│   ├── lib/                      # Auth, JWT, Prisma singleton, email delivery service
│   └── prisma/                   # Prisma ORM Schema & Seed Script
├── ai-service/                   # Python FastAPI AI Inference Service
│   ├── app/
│   │   ├── models/               # YuNet detector, SFace ArcFace recognizer, calibration
│   │   ├── preprocessing/        # Image validator & 2D FFT synthetic AI screening
│   │   ├── routes/               # compare, health, evaluate, jobs
│   │   ├── schemas/              # Pydantic schemas
│   │   └── services/             # Inference service & asynchronous job queue
│   ├── tests/                    # 16 Unit, integration, and E2E pytest tests
│   └── weights/                  # Pretrained ONNX model binaries
├── scripts/                      # Concurrency load testing suite (concurrency_test.py)
└── docs/                         # Technical Architecture & API Documentation
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22)
- Python 3.10+ (tested on Python 3.12 / 3.14)
- Git

### 1. Pre-Seeded Accounts
For immediate testing, the database comes pre-seeded with:
- **Super Administrator**: `superadmin@facialsimilarity.ai` / `SuperAdmin123!`
- **Administrator**: `admin@facialsimilarity.ai` / `AdminPassword123!`
- **Standard User**: `user@facialsimilarity.ai` / `UserPassword123!`

### 2. AI Inference Microservice
```powershell
cd ai-service
pip install -r requirements.txt
python -m pytest tests -v
python app/main.py
```
*Listens on `http://127.0.0.1:8000`*.

### 3. Next.js Frontend Application
```powershell
cd frontend
npm install
npx prisma generate
npx prisma db push
npm run build
npm run start
```
*Listens on `http://localhost:3000`*.

### 4. Running Concurrency & Load Tests
```powershell
python scripts/concurrency_test.py
```

---

## 📜 Biometric Disclaimer
The Facial Similarity Analyzer generates estimated mathematical similarity indices between facial representations. Biometric similarity does not establish legal identity. Results are subject to photographic variation, lighting, and pose constraints.
