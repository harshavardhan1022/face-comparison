"""
Facial Landmark Alignment and Image Normalization
Aligns detected facial landmarks to standard canonical ArcFace coordinates (112x112).
"""
import numpy as np
import cv2
from app.schemas.face_schemas import FacialLandmarks

# Standard 112x112 ArcFace landmark template coordinates
ARCFACE_REFERENCE_LANDMARKS = np.array([
    [38.2946, 51.6963],  # Left eye
    [73.5318, 51.5014],  # Right eye
    [56.0252, 71.7366],  # Nose tip
    [41.5493, 92.3655],  # Left mouth corner
    [70.7299, 92.2041]   # Right mouth corner
], dtype=np.float32)

def estimate_similarity_transform(src_pts: np.ndarray, dst_pts: np.ndarray) -> np.ndarray:
    """
    Computes 2x3 affine similarity transform matrix (rotation, scaling, translation)
    mapping source landmark points to target reference points using Umeyama algorithm.
    """
    assert src_pts.shape == dst_pts.shape
    num = src_pts.shape[0]
    dim = src_pts.shape[1]

    # Compute centroids
    src_mean = src_pts.mean(axis=0)
    dst_mean = dst_pts.mean(axis=0)

    # Center points
    src_centered = src_pts - src_mean
    dst_centered = dst_pts - dst_mean

    # Variance
    src_var = np.mean(np.sum(src_centered ** 2, axis=1))

    # Covariance matrix
    cov = np.dot(dst_centered.T, src_centered) / num

    # SVD
    u, d, vt = np.linalg.svd(cov)
    s = np.eye(dim)
    if np.linalg.det(cov) < 0:
        s[dim - 1, dim - 1] = -1

    # Rotation and scale
    r = np.dot(u, np.dot(s, vt))
    scale = 1.0 if src_var == 0 else 1.0 / src_var * np.trace(np.dot(np.diag(d), s))

    # Translation
    t = dst_mean - scale * np.dot(r, src_mean)

    transform = np.zeros((2, 3), dtype=np.float32)
    transform[0:2, 0:2] = scale * r
    transform[0:2, 2] = t
    return transform

def align_face_crop(bgr_img: np.ndarray, landmarks: FacialLandmarks, output_size: tuple[int, int] = (112, 112)) -> np.ndarray:
    """
    Applies affine transformation to align eyes and facial geometry into a normalized 112x112 frame.
    """
    src_points = np.array([
        [landmarks.left_eye.x, landmarks.left_eye.y],
        [landmarks.right_eye.x, landmarks.right_eye.y],
        [landmarks.nose_tip.x, landmarks.nose_tip.y],
        [landmarks.left_mouth.x, landmarks.left_mouth.y],
        [landmarks.right_mouth.x, landmarks.right_mouth.y],
    ], dtype=np.float32)

    # Compute affine transformation matrix
    warp_mat = estimate_similarity_transform(src_points, ARCFACE_REFERENCE_LANDMARKS)

    # Warp image to normalized coordinates
    aligned = cv2.warpAffine(
        bgr_img,
        warp_mat,
        output_size,
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT_101
    )
    return aligned

def normalize_for_inference(aligned_bgr: np.ndarray) -> np.ndarray:
    """
    Converts aligned face crop from BGR [0, 255] to RGB float32 normalized [-1.0, 1.0].
    """
    rgb = cv2.cvtColor(aligned_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    normalized = (rgb - 127.5) / 128.0
    return normalized

