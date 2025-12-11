# web_app/face_api.py
import os
import sys
from pathlib import Path
import importlib.util

# 取得專案根目錄，例如 13. ANIME-FACE-RECO...
ROOT_DIR = Path(__file__).resolve().parents[1]

# 指向 Machine-Learning---Face-Recognition/recognize_faces.py
ML_FACE_DIR = ROOT_DIR / "Machine-Learning---Face-Recognition"
RECOGNIZE_SCRIPT = ML_FACE_DIR / "recognize_faces.py"

# 緩存模組，避免重複載入
_ml_face_module = None

def _load_ml_face_module():
    """延遲載入 recognize_faces.py 模組，避免循環導入"""
    global _ml_face_module
    if _ml_face_module is None:
        # 確保 Python 能夠找到 Machine-Learning---Face-Recognition 目錄下的 app 模組
        ml_face_dir_str = str(ML_FACE_DIR)
        if ml_face_dir_str not in sys.path:
            sys.path.insert(0, ml_face_dir_str)
        
        # 用 importlib 以「檔案路徑」匯入這支 script（因為資料夾名稱有 - 不能直接 import）
        spec = importlib.util.spec_from_file_location(
            "ml_face_recognizer", RECOGNIZE_SCRIPT
        )
        _ml_face_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_ml_face_module)
    return _ml_face_module

def web_api(image_path: str):
    """
    給 Flask 用的統一接口：
    傳入圖片路徑，呼叫 recognize_image()，
    然後轉成前端 user.js 目前使用的 JSON 格式。
    """
    # 延遲載入模組，避免循環導入
    ml_face_module = _load_ml_face_module()
    # 呼叫你剛才在 recognize_faces.py 寫好的函式
    # recognize_image 返回格式：{"results": [{"label": name, "prob": score}, ...]}
    results = ml_face_module.recognize_image(image_path, top_k=3)
    
    # recognize_image 已經返回正確格式，直接返回即可
    return results

def detect_faces_api(image_path: str):
    """
    使用 MTCNN 檢測人臉，返回人臉區域坐標。
    與 recognize_faces1.py 使用相同的檢測方法，確保準確性。
    
    返回格式：
    {
        "faces": [
            {"x": 100, "y": 200, "width": 150, "height": 150, "prob": 0.98},
            ...
        ]
    }
    """
    # 確保 Python 能夠找到 Machine-Learning---Face-Recognition 目錄下的 app 模組
    ml_face_dir_str = str(ML_FACE_DIR)
    if ml_face_dir_str not in sys.path:
        sys.path.insert(0, ml_face_dir_str)
    
    from PIL import Image
    from app.detector import FaceDetector
    import numpy as np
    
    # 讀取圖片
    try:
        pil_image = Image.open(image_path).convert('RGB')
    except Exception as e:
        return {"faces": [], "error": f"無法讀取圖片: {str(e)}"}
    
    # 使用 MTCNN 檢測人臉（與 recognize_faces1.py 相同的檢測器）
    detector = FaceDetector(device=None, keep_all=True, min_prob=0.95)
    boxes, probs, landmarks = detector.detect(pil_image)
    
    if boxes is None or len(boxes) == 0:
        return {"faces": []}
    
    # 轉換為前端需要的格式
    faces = []
    for i, box in enumerate(boxes):
        x1, y1, x2, y2 = box
        width = int(x2 - x1)
        height = int(y2 - y1)
        prob = float(probs[i]) if probs[i] is not None else 0.0
        
        faces.append({
            "x": int(x1),
            "y": int(y1),
            "width": width,
            "height": height,
            "prob": prob
        })
    
    return {"faces": faces}