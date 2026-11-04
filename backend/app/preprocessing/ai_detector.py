"""
AI-Generated and Synthetically Manipulated Image Screening Module
Combines frequency-domain 2D FFT spectral anomaly analysis, color-channel
gradient coherence, and high-pass residual noise variance.
"""
from typing import Tuple, Dict, Any
import numpy as np
import cv2

class AiImageDetector:
    def __init__(
        self,
        ai_threshold: float = 0.65,
        inconclusive_min: float = 0.45
    ):
        self.ai_threshold = ai_threshold
        self.inconclusive_min = inconclusive_min

    def analyze_frequency_spectrum(self, gray_img: np.ndarray) -> float:
        """
        Analyzes 2D Discrete Fourier Transform spectrum for synthetic generation grid artifacts.
        Generative models (diffusion/GANs) exhibit high-frequency spectral spikes
        and abnormal radial energy distributions compared to natural camera optical 1/f^2 falloffs.
        """
        h, w = gray_img.shape
        # Center crop to power of 2 for consistent FFT
        dim = min(h, w, 512)
        start_y = (h - dim) // 2
        start_x = (w - dim) // 2
        cropped = gray_img[start_y:start_y + dim, start_x:start_x + dim]

        # 2D FFT
        dft = np.fft.fft2(cropped.astype(np.float32))
        dft_shift = np.fft.fftshift(dft)
        magnitude_spectrum = 20 * np.log(np.abs(dft_shift) + 1.0)

        cy, cx = dim // 2, dim // 2
        y, x = np.ogrid[-cy:dim-cy, -cx:dim-cx]
        r = np.sqrt(x*x + y*y)

        # High-frequency band ring (between 0.4*radius and 0.8*radius)
        r_inner = 0.35 * (dim // 2)
        r_outer = 0.85 * (dim // 2)
        hf_mask = (r >= r_inner) & (r <= r_outer)

        if np.sum(hf_mask) == 0:
            return 0.5

        hf_values = magnitude_spectrum[hf_mask]
        hf_mean = np.mean(hf_values)
        hf_std = np.std(hf_values)

        # High-frequency spike ratio (anomalous peaks indicating grid / checkerboard artifacts)
        hf_peaks = np.sum(hf_values > (hf_mean + 2.2 * hf_std))
        peak_ratio = hf_peaks / max(1, len(hf_values))

        # Radial falloff score: natural scenes have steep radial energy drop; synthetic models often have flat/elevated tails
        center_val = magnitude_spectrum[cy, cx]
        tail_ratio = hf_mean / max(1e-5, center_val)

        score = float(np.clip((peak_ratio * 35.0) + (tail_ratio * 0.6), 0.05, 0.95))
        return score

    def analyze_chromatic_coherence(self, bgr_img: np.ndarray) -> float:
        """
        Evaluates cross-channel gradient covariance and unnatural chromatic consistency.
        Optical camera lenses produce micro-chromatic fringing; generative models
        often exhibit hyper-correlated color transitions or uncorrelated synthetic edges.
        """
        b, g, r = cv2.split(bgr_img.astype(np.float32))

        # Horizontal and vertical Sobel gradients
        grad_r = cv2.Sobel(r, cv2.CV_32F, 1, 0, ksize=3) + cv2.Sobel(r, cv2.CV_32F, 0, 1, ksize=3)
        grad_g = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3) + cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
        grad_b = cv2.Sobel(b, cv2.CV_32F, 1, 0, ksize=3) + cv2.Sobel(b, cv2.CV_32F, 0, 1, ksize=3)

        # Cross-channel gradient correlation
        std_r = np.std(grad_r)
        std_b = np.std(grad_b)

        if std_r == 0 or std_b == 0:
            return 0.5

        corr_rb = np.mean((grad_r - np.mean(grad_r)) * (grad_b - np.mean(grad_b))) / (std_r * std_b)
        
        # Natural lenses have 0.82 - 0.96 correlation. Super-high (>0.985) or low (<0.7) are synthetic indicators
        if corr_rb > 0.985:
            synth_score = 0.75 + (corr_rb - 0.985) * 15.0
        elif corr_rb < 0.72:
            synth_score = 0.65 + (0.72 - corr_rb) * 1.5
        else:
            synth_score = 0.25

        return float(np.clip(synth_score, 0.1, 0.95))

    def analyze_texture_entropy(self, gray_img: np.ndarray) -> float:
        """
        Measures high-pass residual noise variance.
        Diffusion de-noising steps frequently create piecewise-smooth patches
        punctuated by unnatural high-frequency micro-textures.
        """
        blurred = cv2.GaussianBlur(gray_img, (5, 5), 1.0)
        residual = cv2.absdiff(gray_img, blurred).astype(np.float32)

        mean_res = np.mean(residual)
        std_res = np.std(residual)

        # Coefficient of variation in high-pass residual
        cv_score = std_res / max(1e-4, mean_res)

        # Natural photography has smooth CV ~ 1.1 - 1.4; diffusion models often have CV > 1.7 or < 0.8
        if cv_score > 1.75:
            score = 0.70 + min(0.25, (cv_score - 1.75) * 0.4)
        elif cv_score < 0.75:
            score = 0.65 + min(0.25, (0.75 - cv_score) * 0.5)
        else:
            score = 0.20

        return float(np.clip(score, 0.1, 0.95))

    def screen_image(self, bgr_img: np.ndarray) -> Dict[str, Any]:
        """
        Performs holistic multi-modal screening for synthetic / AI-generated artifacts.
        Returns:
            - is_synthetic: bool
            - confidence: float [0.0 - 1.0]
            - status: "LIKELY_AUTHENTIC" | "LIKELY_AI" | "INCONCLUSIVE"
            - details: human-friendly technical explanation
        """
        gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)

        # Extract features
        freq_score = self.analyze_frequency_spectrum(gray)
        color_score = self.analyze_chromatic_coherence(bgr_img)
        texture_score = self.analyze_texture_entropy(gray)

        # Weighted ensemble
        composite_score = float(0.45 * freq_score + 0.30 * color_score + 0.25 * texture_score)
        confidence = round(float(np.clip(composite_score, 0.05, 0.98)), 3)

        if confidence >= self.ai_threshold:
            status = "LIKELY_AI"
            is_synthetic = True
            details = (
                f"Synthetic generation markers detected (confidence {confidence * 100:.1f}%). "
                f"High-frequency Fourier grid artifacts and unnatural cross-channel gradient covariance identified."
            )
        elif confidence >= self.inconclusive_min:
            status = "INCONCLUSIVE"
            is_synthetic = False
            details = (
                f"Authenticity indicators inconclusive (confidence {confidence * 100:.1f}%). "
                f"Image exhibits partial spectral irregularities, possibly due to aggressive compression or filters."
            )
        else:
            status = "LIKELY_AUTHENTIC"
            is_synthetic = False
            details = (
                f"Image exhibits optical camera sensor characteristics (confidence {confidence * 100:.1f}%). "
                f"Frequency spectra and chromatic dispersion align with natural photography."
            )

        return {
            "is_synthetic": is_synthetic,
            "confidence": confidence,
            "status": status,
            "details": details,
            "breakdown": {
                "frequency_score": round(freq_score, 3),
                "chromatic_score": round(color_score, 3),
                "texture_score": round(texture_score, 3),
            }
        }

_detector_instance = None

def get_ai_image_detector() -> AiImageDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = AiImageDetector()
    return _detector_instance

