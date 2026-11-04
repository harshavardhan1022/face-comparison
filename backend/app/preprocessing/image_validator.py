"""
Image Security, Validation, and Quality Assessment
"""
import io
import numpy as np
import cv2
from PIL import Image
from app.config import settings
from app.schemas.face_schemas import ImageQuality

# Enforce decompression bomb defense: maximum 25 megapixels
Image.MAX_IMAGE_PIXELS = 25_000_000

# Magic bytes signatures
JPEG_MAGIC = b"\xFF\xD8\xFF"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
WEBP_MAGIC_RIFF = b"RIFF"
WEBP_MAGIC_WEBP = b"WEBP"

class ImageValidationError(Exception):
    def __init__(self, message: str, code: str):
        self.message = message
        self.code = code
        super().__init__(self.message)

def validate_image_bytes(file_bytes: bytes) -> tuple[np.ndarray, Image.Image]:
    """
    Validates magic bytes, checks file size, prevents decompression bombs,
    and returns both OpenCV (BGR) and PIL images.
    """
    if len(file_bytes) == 0:
        raise ImageValidationError("Uploaded image file is empty.", "EMPTY_FILE")
        
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise ImageValidationError(
            f"File size ({size_mb:.2f} MB) exceeds maximum allowed {settings.MAX_FILE_SIZE_MB} MB.",
            "FILE_TOO_LARGE"
        )

    # Check magic byte signature
    is_jpeg = file_bytes.startswith(JPEG_MAGIC)
    is_png = file_bytes.startswith(PNG_MAGIC)
    is_webp = len(file_bytes) > 12 and file_bytes[:4] == WEBP_MAGIC_RIFF and file_bytes[8:12] == WEBP_MAGIC_WEBP

    if not (is_jpeg or is_png or is_webp):
        raise ImageValidationError(
            "Invalid file signature. Only authentic JPEG, PNG, and WebP files are supported.",
            "INVALID_SIGNATURE"
        )

    try:
        pil_img = Image.open(io.BytesIO(file_bytes))
        pil_img.verify()  # Verify integrity
        
        # Re-open after verify() because verify() exhausts file pointer
        pil_img = Image.open(io.BytesIO(file_bytes))
        width, height = pil_img.size

        if width < settings.MIN_IMAGE_DIMENSION or height < settings.MIN_IMAGE_DIMENSION:
            raise ImageValidationError(
                f"Image dimensions ({width}x{height}) are below minimum {settings.MIN_IMAGE_DIMENSION}x{settings.MIN_IMAGE_DIMENSION} px.",
                "DIMENSIONS_TOO_SMALL"
            )

        if width > settings.MAX_IMAGE_DIMENSION or height > settings.MAX_IMAGE_DIMENSION:
            raise ImageValidationError(
                f"Image dimensions ({width}x{height}) exceed maximum {settings.MAX_IMAGE_DIMENSION}x{settings.MAX_IMAGE_DIMENSION} px.",
                "DIMENSIONS_TOO_LARGE"
            )

        # Convert to RGB numpy array then BGR for OpenCV
        rgb_img = pil_img.convert("RGB")
        np_arr = np.array(rgb_img)
        cv2_bgr = cv2.cvtColor(np_arr, cv2.COLOR_RGB2BGR)

        return cv2_bgr, rgb_img

    except Image.DecompressionBombError:
        raise ImageValidationError("Image rejected: Potential decompression bomb attack.", "DECOMPRESSION_BOMB")
    except ImageValidationError:
        raise
    except Exception as e:
        raise ImageValidationError(f"Corrupt or unreadable image: {str(e)}", "CORRUPT_IMAGE")

def evaluate_image_quality(bgr_img: np.ndarray) -> ImageQuality:
    """
    Computes objective quality metrics:
    - Laplacian variance for sharpness (blur detection)
    - Mean grayscale luminance for exposure/lighting
    - Composite score normalized between 0.0 and 1.0
    """
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    
    # 1. Sharpness via Laplacian variance
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    sharpness_score = float(laplacian.var())
    is_sharp = sharpness_score >= settings.MIN_SHARPNESS_LAPLACIAN
    
    # 2. Lighting via mean and standard deviation
    mean_val, std_val = cv2.meanStdDev(gray)
    brightness_mean = float(mean_val[0][0])
    is_well_lit = 45.0 <= brightness_mean <= 215.0
    
    # 3. Normalized quality score [0.0 - 1.0]
    sharpness_norm = min(1.0, sharpness_score / 350.0)
    brightness_norm = 1.0 - (abs(brightness_mean - 128.0) / 128.0)
    contrast_norm = min(1.0, float(std_val[0][0]) / 60.0)
    
    overall_quality = 0.5 * sharpness_norm + 0.3 * brightness_norm + 0.2 * contrast_norm
    overall_quality = round(float(np.clip(overall_quality, 0.05, 0.99)), 3)
    
    if overall_quality >= 0.80:
        quality_label = "Optimal"
    elif overall_quality >= 0.60:
        quality_label = "Good"
    elif overall_quality >= 0.40:
        quality_label = "Fair"
    else:
        quality_label = "Suboptimal"

    return ImageQuality(
        sharpness_score=round(sharpness_score, 2),
        is_sharp=is_sharp,
        brightness_mean=round(brightness_mean, 2),
        is_well_lit=is_well_lit,
        overall_quality_score=overall_quality,
        quality_label=quality_label
    )

