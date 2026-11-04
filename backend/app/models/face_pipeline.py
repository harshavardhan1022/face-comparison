"""
AI Face Pipeline: YuNet Face Detection, 5-point Landmark Alignment, and ArcFace/SFace Feature Embedding
"""
import os
import time
from typing import Optional, Tuple
import cv2
import numpy as np

from app.config import settings
from app.schemas.face_schemas import FaceBBox, FacialLandmarks, Point2D

class FacePipelineError(Exception):
    def __init__(self, message: str, code: str):
        self.message = message
        self.code = code
        super().__init__(self.message)

class FacePipeline:
    def __init__(
        self,
        detector_path: Optional[str] = None,
        recognizer_path: Optional[str] = None
    ):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.detector_path = detector_path or os.path.join(base_dir, "weights", "face_detection_yunet_2023mar.onnx")
        self.recognizer_path = recognizer_path or os.path.join(base_dir, "weights", "face_recognition_sface_2021dec.onnx")
        
        if not os.path.exists(self.detector_path):
            raise FileNotFoundError(f"Detector model not found at {self.detector_path}")
        if not os.path.exists(self.recognizer_path):
            raise FileNotFoundError(f"Recognizer model not found at {self.recognizer_path}")
            
        # Initialize OpenCV DNN models
        self.detector = cv2.FaceDetectorYN_create(
            model=self.detector_path,
            config="",
            input_size=(320, 320),
            score_threshold=settings.MIN_FACE_CONFIDENCE,
            nms_threshold=0.3,
            top_k=5000
        )
        self.recognizer = cv2.FaceRecognizerSF_create(
            model=self.recognizer_path,
            config=""
        )

    def detect_face(self, bgr_img: np.ndarray) -> Tuple[np.ndarray, FaceBBox, FacialLandmarks]:
        """
        Detects primary face and extracts 5 facial landmarks using YuNet deep learning detector.
        Returns:
            face_row: raw 15-element numpy vector [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
            bbox: FaceBBox schema
            landmarks: FacialLandmarks schema
        """
        img_h, img_w = bgr_img.shape[:2]
        self.detector.setInputSize((img_w, img_h))
        
        _, faces = self.detector.detect(bgr_img)
        
        if faces is None or len(faces) == 0:
            raise FacePipelineError(
                "No human face could be detected in the photograph. Please ensure the face is clearly visible, well-lit, and unoccluded.",
                "NO_FACE_DETECTED"
            )

        # In YuNet output:
        # faces[i] = [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
        # Choose face with largest bounding box area * confidence
        best_face = None
        max_prominence = -1.0
        
        for face in faces:
            w, h = face[2], face[3]
            conf = face[14]
            area = w * h
            prominence = area * conf
            if prominence > max_prominence:
                max_prominence = prominence
                best_face = face

        x, y, w, h = int(best_face[0]), int(best_face[1]), int(best_face[2]), int(best_face[3])
        conf = float(best_face[14])
        
        # Landmarks: Right Eye (x_re, y_re), Left Eye (x_le, y_le), Nose Tip, Right Corner Mouth, Left Corner Mouth
        # Note: in subject's perspective vs camera view:
        # face[4], face[5] is right eye (left in camera view)
        # face[6], face[7] is left eye (right in camera view)
        landmarks = FacialLandmarks(
            left_eye=Point2D(x=float(best_face[4]), y=float(best_face[5])),
            right_eye=Point2D(x=float(best_face[6]), y=float(best_face[7])),
            nose_tip=Point2D(x=float(best_face[8]), y=float(best_face[9])),
            left_mouth=Point2D(x=float(best_face[10]), y=float(best_face[11])),
            right_mouth=Point2D(x=float(best_face[12]), y=float(best_face[13]))
        )

        bbox = FaceBBox(
            x=max(0, x),
            y=max(0, y),
            width=min(img_w, w),
            height=min(img_h, h),
            confidence=round(conf, 4)
        )

        return best_face, bbox, landmarks

    def align_face(self, bgr_img: np.ndarray, face_row: np.ndarray) -> np.ndarray:
        """
        Standardizes face crop into a canonical 112x112 aligned image using SFace alignCrop.
        """
        aligned_face = self.recognizer.alignCrop(bgr_img, face_row)
        return aligned_face

    def extract_embedding(self, aligned_face: np.ndarray) -> np.ndarray:
        """
        Extracts 128-dimensional normalized ArcFace/SFace feature embedding.
        """
        feature = self.recognizer.feature(aligned_face)
        # SFace feature is 1x128 float32. Flatten and ensure unit L2 norm
        embedding = feature.flatten().astype(np.float32)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding

    def compare_embeddings(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Computes cosine similarity between normalized 128D embeddings.
        """
        cosine = float(np.dot(emb1, emb2))
        return float(np.clip(cosine, -1.0, 1.0))

# Global pipeline instance
_pipeline_instance: Optional[FacePipeline] = None

def get_face_pipeline() -> FacePipeline:
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = FacePipeline()
    return _pipeline_instance

