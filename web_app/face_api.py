# web_app/face_api.py
# ============================================================
# 功能說明：Flask 與機器學習模組之間的橋接 API
# 作用：將 Flask 請求轉發給 recognize_faces.py 進行處理
# ============================================================

import os
import sys
from pathlib import Path
import importlib.util

# ============================================================
# Step 1: 設定專案路徑
# ============================================================
# 說明：取得專案根目錄和機器學習模組的路徑
ROOT_DIR = Path(__file__).resolve().parents[1]

# 指向 Machine-Learning---Face-Recognition/recognize_faces.py
ML_FACE_DIR = ROOT_DIR / "Machine-Learning---Face-Recognition"
RECOGNIZE_SCRIPT = ML_FACE_DIR / "recognize_faces.py"

# 緩存模組，避免重複載入
_ml_face_module = None

# ============================================================
# Step 2: 動態載入機器學習模組
# ============================================================
# 說明：由於資料夾名稱包含 "-"，無法直接 import，需要使用 importlib 動態載入
def _load_ml_face_module():
    """延遲載入 recognize_faces.py 模組，避免循環導入"""
    global _ml_face_module
    if _ml_face_module is None:
        # Step 2.1: 將機器學習模組目錄加入 Python 路徑
        # 說明：確保可以導入 app 目錄下的模組（如 app.pipeline, app.recognizer 等）
        ml_face_dir_str = str(ML_FACE_DIR)
        if ml_face_dir_str not in sys.path:
            sys.path.insert(0, ml_face_dir_str)
        
        # Step 2.2: 使用 importlib 動態載入模組
        # 說明：通過文件路徑載入模組，而不是通過模組名稱
        spec = importlib.util.spec_from_file_location(
            "ml_face_recognizer", RECOGNIZE_SCRIPT
        )
        _ml_face_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_ml_face_module)
    return _ml_face_module

# ============================================================
# Step 3: 人臉識別 API（主要接口）
# ============================================================
# 說明：Flask 調用此函數處理圖片識別請求
def web_api(image_path: str):
    """
    給 Flask 用的統一接口：
    傳入圖片路徑，呼叫 recognize_image()，
    然後轉成前端 user.js 目前使用的 JSON 格式。
    """
    # Step 3.1: 載入機器學習模組（延遲載入，避免循環導入）
    ml_face_module = _load_ml_face_module()
    
    # Step 3.2: 調用 recognize_faces.py 中的 recognize_image 函數
    # 說明：這是核心識別邏輯，返回前 3 名最相似的人臉
    # 返回格式：{"results": [{"label": name, "prob": score}, ...], "aligned_image": "..."}
    results = ml_face_module.recognize_image(image_path, top_k=3)
    
    # Step 3.3: 直接返回結果（格式已經符合前端需求）
    return results

# ============================================================
# Step 4: 人臉檢測 API（僅檢測位置，不識別）
# ============================================================
# 說明：用於前端"自動識別"功能，只檢測人臉位置，不進行身份識別
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
    # Step 4.1: 確保 Python 能夠找到機器學習模組
    ml_face_dir_str = str(ML_FACE_DIR)
    if ml_face_dir_str not in sys.path:
        sys.path.insert(0, ml_face_dir_str)
    
    from PIL import Image
    from app.detector import FaceDetector
    import numpy as np
    
    # Step 4.2: 讀取圖片並應用 EXIF 方向修正
    # 說明：修正手機拍照時的旋轉問題
    try:
        from app.image_utils import apply_exif_orientation
        pil_image = Image.open(image_path).convert('RGB')
        # 應用 EXIF 方向信息，確保圖片方向正確
        pil_image = apply_exif_orientation(pil_image)
    except Exception as e:
        return {"faces": [], "error": f"無法讀取圖片: {str(e)}"}
    
    # Step 4.3: 使用 MTCNN 檢測人臉
    # 說明：MTCNN 是多任務卷積神經網絡，用於檢測人臉位置和關鍵點
    # keep_all=True: 檢測所有人臉
    # min_prob=0.95: 只返回檢測概率大於 95% 的人臉
    detector = FaceDetector(device=None, keep_all=True, min_prob=0.95)
    boxes, probs, landmarks = detector.detect(pil_image)
    
    if boxes is None or len(boxes) == 0:
        return {"faces": []}
    
    # Step 4.4: 轉換為前端需要的格式
    # 說明：將檢測結果轉換為 JSON 格式，包含位置、大小、檢測概率
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
    
    # Step 4.5: 返回檢測結果
    return {"faces": faces}

def get_registered_faces_api():
    """
    獲取所有註冊的人物列表（名稱和圖片路徑）
    用於大炮圖鑑功能
    
    返回格式：
    {
        "faces": [
            {"name": "厲耿桂芳", "image_path": "images/register/厲耿桂芳.jpg"},
            ...
        ]
    }
    """
    # 確保 Python 能夠找到 Machine-Learning---Face-Recognition 目錄下的 app 模組
    ml_face_dir_str = str(ML_FACE_DIR)
    if ml_face_dir_str not in sys.path:
        sys.path.insert(0, ml_face_dir_str)
    
    import os
    from pathlib import Path
    
    # 註冊圖片目錄
    register_dir = ML_FACE_DIR / "images" / "register"
    
    # 如果目錄不存在，返回空列表
    if not register_dir.exists():
        return {"faces": []}
    
    # 獲取所有圖片文件
    faces = []
    image_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    
    for file_path in register_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            # 文件名（不含擴展名）就是人物名稱
            name = file_path.stem
            
            # 構建相對路徑（用於前端顯示）
            # 前端需要通過 Flask 的靜態文件服務來訪問
            relative_path = f"/static/registered_faces/{file_path.name}"
            
            # 同時提供絕對路徑（用於後端處理）
            absolute_path = str(file_path)
            
            faces.append({
                "name": name,
                "image_path": relative_path,
                "absolute_path": absolute_path
            })
    
    # 按名稱排序
    faces.sort(key=lambda x: x["name"])
    
    return {"faces": faces}

def get_input_images_api():
    """
    獲取所有 input 目錄下的圖片列表
    用於臉部辨識功能，讓用戶可以選擇現有圖片進行識別
    
    返回格式：
    {
        "images": [
            {"name": "image1.jpg", "image_path": "/static/input_images/image1.jpg"},
            ...
        ]
    }
    """
    # 確保 Python 能夠找到 Machine-Learning---Face-Recognition 目錄下的 app 模組
    ml_face_dir_str = str(ML_FACE_DIR)
    if ml_face_dir_str not in sys.path:
        sys.path.insert(0, ml_face_dir_str)
    
    import os
    from pathlib import Path
    
    # input 圖片目錄
    input_dir = ML_FACE_DIR / "images" / "input"
    
    # 如果目錄不存在，返回空列表
    if not input_dir.exists():
        return {"images": []}
    
    # 獲取所有圖片文件
    images = []
    image_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    
    for file_path in input_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            # 文件名
            name = file_path.name
            
            # 構建相對路徑（用於前端顯示）
            # 前端需要通過 Flask 的靜態文件服務來訪問
            relative_path = f"/static/input_images/{file_path.name}"
            
            # 同時提供絕對路徑（用於後端處理）
            absolute_path = str(file_path)
            
            images.append({
                "name": name,
                "image_path": relative_path,
                "absolute_path": absolute_path
            })
    
    # 按文件名排序
    images.sort(key=lambda x: x["name"])
    
    return {"images": images}