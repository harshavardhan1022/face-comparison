# SPEC.md — AI Face Similarity Analyzer Specification

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: Milestone v2.0.0 Advanced Application Modifications.

## Vision
A production-ready, enterprise-grade AI-powered Facial Similarity Analysis SaaS platform featuring an Apple-inspired glassmorphism interface, high-concurrency worker architecture, AI-generated image screening, dedicated User and Admin dashboards with full profile management, consent-based private photo retention with PDF report image embedding, real email password reset workflow, 4-stage geometric wireframe logout animation, and flawless Dark & Light mode integration across all components.

## Core Capabilities & Features (v2.0.0)

1. **High-Concurrency Architecture & Background Processing**:
   - Decoupled asynchronous worker queue for AI inference with worker pools, concurrency limits, duplicate submission prevention, and non-blocking request lifecycle.
   - Concurrency load testing suite reporting throughput, average latency, p95 latency, and error rates.

2. **AI-Generated Image Screening & Reference-Matched Warning Modal**:
   - Frequency-domain (FFT) 2D Fourier spectrum artifact detection, color-space gradient incoherence, and texture entropy analysis.
   - Calibrated confidence: Likely Authentic, Likely AI-Generated, or Inconclusive.
   - Dark navy translucent popup with glowing blue microchip AI icon, "AI Detected!" heading, "Analysis Complete: AI-Generated Content Identified" message, and Re-upload / Cancel buttons.
   - Selective replacement keeping the valid photograph slot intact.

3. **Animated Logout Screen (Video-Inspired 4-Stage Native Web Animation)**:
   - Stage 1: Central rotating luminous geometric wireframe sphere with electric-blue glow.
   - Stage 2: Smooth transition into a thin glowing circular orbit with an orbiting light particle.
   - Stage 3: Smooth morph into a horizontal glowing infinity loop ($\infty$) with light trails.
   - Stage 4: "Logged Out Successfully" & "Your session has ended securely. See you again!" with Back to Login button.
   - Distinct server-side session revocation for both User Dashboard and Admin Dashboard.

4. **Complete User Dashboard**:
   - Navigation: Overview, Face Comparison, Comparison History, Personal Details (Edit Profile: Name and Password update with current password validation and session rotation), Security Settings, and Logout.
   - Unified comparison history with photo thumbnails, similarity score, category, model version, and actions.
   - Download Report with embedded photographs when user opts into private image retention.
   - Opt-in retention toggle: "Save my comparison photographs for future history and report downloads" with zero retention default.

5. **Complete Admin Dashboard Restructuring**:
   - Unified navigation: Overview, User Account Management & Roles, Security & Inference Audit Trail, AI Model Monitoring, System Health, Admin Profile (Edit Admin Details & Password), Security Settings, and Logout.
   - User account status management (ACTIVE, INACTIVE, SUSPENDED) and role assignment (USER, ADMIN, SUPER_ADMIN) with strict RBAC.
   - Searchable, filterable security and inference audit logs.

6. **Real Forgot-Password Email Reset Workflow**:
   - Secure cryptographic token generation, SHA-256 hashed database storage with expiration.
   - Email dispatch with reset link, password update form, token invalidation, and session rotation.

7. **Universal Dark Mode & Light Mode Integration**:
   - Consistent styling across all pages, dashboards, modals, popups, and dropdowns with persistent preference.

*Last updated: 2026-11-03 (Milestone v2.0.0)*
