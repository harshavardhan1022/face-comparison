# System Architecture — AI Face Similarity Analyzer

## Overview

The AI Face Similarity Analyzer is built on a decoupled, production-grade microservice architecture:
1. **Frontend**: Next.js 15 App Router providing an Apple-inspired glassmorphism interface with Framer Motion animations.
2. **AI Inference Microservice**: Python FastAPI service running OpenCV DNN with YuNet face detection and SFace (ArcFace-calibrated) deep representation embeddings.
3. **Database Layer**: PostgreSQL managed via Prisma ORM (with local SQLite fallback for isolated zero-dependency dev environments).

```
                      +-----------------------------+
                      |         Web Client          |
                      |   (Next.js App Router)      |
                      +--------------+--------------+
                                     |
                                     | Multipart Form / JSON API
                                     v
                      +-----------------------------+
                      |       Next.js API Server    |
                      |  - Session / JWT Auth       |
                      |  - Role-based Access (RBAC) |
                      |  - Upload Validation        |
                      +------+---------------+------+
                             |               |
              Prisma Query   |               | Private REST (Internal Network)
                             v               v
                +-------------------+ +--------------------------+
                |    PostgreSQL     | |    Python AI Service     |
                |   (Prisma ORM)    | |  - Magic Byte Validation |
                |  - Users          | |  - YuNet Face Detection  |
                |  - Comparisons    | |  - 5-Point Alignment     |
                |  - Evaluations    | |  - ArcFace/SFace 128D    |
                |  - Audit Logs     | |  - Cosine Similarity     |
                +-------------------+ |  - Sigmoid Calibration   |
                                      +--------------------------+
```

## AI Pipeline Data Flow

1. **Image Validation**:
   - Inspects file signatures (`JPEG: \xFF\xD8\xFF`, `PNG: \x89PNG`, `WEBP: RIFF...WEBP`).
   - Rejects decompression bomb payloads (`MAX_IMAGE_PIXELS = 25M`).
   - Assesses image quality (blur via Laplacian variance, exposure via luminance histogram).

2. **Face Detection & 5-Point Landmarks**:
   - Neural network face detection using YuNet (SCRFD architecture).
   - Detects primary face bounding box with confidence score $\ge 0.60$.
   - Locates 5 fiducial landmarks: Left Eye, Right Eye, Nose Tip, Left Mouth Corner, Right Mouth Corner.

3. **Face Alignment**:
   - Computes 2x3 affine similarity transformation mapping detected coordinates to canonical $112 \times 112$ ArcFace template coordinates.
   - Normalizes pixels to $[-1.0, 1.0]$.

4. **Deep Feature Embedding**:
   - Feeds aligned $112 \times 112$ crop into SFace / ArcFace deep neural network.
   - Extracts 128-dimensional dense feature representation $\mathbf{e}$.
   - Applies unit $L_2$ normalization: $\hat{\mathbf{e}} = \frac{\mathbf{e}}{\|\mathbf{e}\|_2}$.

5. **Cosine Similarity & Calibration**:
   - Evaluates normalized cosine dot product: $S_c = \hat{\mathbf{e}}_1 \cdot \hat{\mathbf{e}}_2 \in [-1, 1]$.
   - Maps raw metric through empirical sigmoid calibration curve:
     $$F(S_c) = \frac{100}{1 + \exp(-8.5 \cdot (S_c - 0.38))}$$
   - Returns calibrated 0–100 Facial Similarity Index with contextual categorization:
     - **High Similarity** ($\ge 70\%$, Cosine $\ge 0.48$)
     - **Moderate Similarity** ($50\% - 69\%$, Cosine $0.38 - 0.47$)
     - **Low Similarity** ($25\% - 49\%$, Cosine $0.20 - 0.37$)
     - **Inconclusive** ($< 25\%$, Cosine $< 0.20$)

6. **Privacy & Ephemeral Storage**:
   - Uploaded photograph bytes reside strictly in memory/temporary scratch space during inference.
   - Zero permanent retention of facial images on disk by default.
   - Zero training on user data.

