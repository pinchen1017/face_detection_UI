#!/usr/bin/env python3
# ============================================================
# Flask Web 應用程式主程式
# 功能說明：提供 HTTP API 接口，處理前端請求
# ============================================================

from flask import *
import os
from datetime import datetime
import base64
from random import randint
from face_api import web_api
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

IDENT_DIR = os.path.dirname(os.path.abspath(__file__)) + '/ident/'
REPORT_DIR = os.path.dirname(os.path.abspath(__file__)) + '/user_report/'
app = Flask(__name__)

# ============================================================
# Step 1: 配置 Flask 應用程式
# ============================================================
# 說明：設定上傳文件大小限制為 100MB
# 真實人臉圖片通常比動漫圖片更大，需要更大的限制
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB

# ============================================================
# Step 2: 錯誤處理 - 413 請求實體過大
# ============================================================
# 說明：當上傳的圖片超過大小限制時，返回友好的錯誤訊息
@app.errorhandler(413)
@app.errorhandler(RequestEntityTooLarge)
def handle_413(e):
    return jsonify({"results": [], "error": "上傳的圖片太大，請嘗試使用較小的圖片或裁剪後再上傳"}), 413

# ============================================================
# Step 3: 接收前端上傳的圖片
# ============================================================
# 說明：將前端傳來的 base64 圖片解碼並保存到本地文件
def receive_img(request, target_dir, desired_filename=None):
    try:
        # Step 3.1: 定義 base64 圖片的前綴字串
        # 說明：前端傳來的 base64 圖片會有格式前綴，需要識別並移除
        magic_str_png = "data:image/png;base64,"
        magic_str_jpeg = "data:image/jpeg;base64,"
        pic = request.form.get('data', '')

        if pic is None or pic == "":
            return "An error occurred when receiving your images."
        
        # Step 3.2: 判斷圖片格式並移除前綴
        # 說明：根據前綴判斷是 PNG 還是 JPEG，並移除前綴獲取純 base64 字串
        if pic.startswith(magic_str_png):
            pic = pic[len(magic_str_png):]
            file_ext = ".png"
        elif pic.startswith(magic_str_jpeg):
            pic = pic[len(magic_str_jpeg):]
            file_ext = ".jpg"
        else:
            return "An error occurred when receiving your images."

        # Step 3.3: 生成文件名
        # 說明：如果沒有指定文件名，使用時間戳+隨機數生成唯一文件名
        if not desired_filename:
            file_name = target_dir + str(datetime.now())[:10] + str(randint(0,100)) + file_ext
        else:
            file_name = target_dir + secure_filename(desired_filename) + "-" + str(datetime.now())[:10] + str(randint(0,100)) + file_ext

        # Step 3.4: 確保目標目錄存在
        os.makedirs(target_dir, exist_ok=True)

        # Step 3.5: 解碼 base64 並保存為圖片文件
        # 說明：將 base64 字串解碼為二進制數據，寫入文件
        with open(file_name, "wb") as f:
            f.write(base64.urlsafe_b64decode(pic.encode("utf-8")))

        return file_name
    except Exception as e:
        raise Exception(f"接收圖片時發生錯誤: {str(e)}")

# ============================================================
# Step 4: 首頁路由
# ============================================================
@app.route("/")
def index():
    return render_template("index.html")

# ============================================================
# Step 5: 提供註冊人物圖片的靜態文件服務
# ============================================================
# 說明：前端需要顯示已註冊人物的圖片，通過此路由提供
@app.route("/static/registered_faces/<filename>")
def serve_registered_face(filename):
    """
    提供註冊人物圖片的靜態文件服務
    """
    from flask import send_from_directory
    from pathlib import Path
    
    # 註冊圖片目錄
    register_dir = Path(__file__).resolve().parents[1] / "Machine-Learning---Face-Recognition" / "images" / "register"
    
    if not register_dir.exists():
        return "Directory not found", 404
    
    return send_from_directory(str(register_dir), filename)

# ============================================================
# Step 6: 上傳圖片進行人臉識別
# ============================================================
# 說明：這是核心 API，處理前端上傳的圖片並返回識別結果
@app.route("/uploadForIdent", methods=['POST'])
def submitPic():
    try:
        # Step 6.1: 接收前端上傳的圖片並保存到本地
        print("[DEBUG] 收到 /uploadForIdent 請求")
        filename = receive_img(request, IDENT_DIR)
        print(f"[DEBUG] 圖片已保存到: {filename}")
        
        # Step 6.2: 檢查是否接收圖片時發生錯誤
        if isinstance(filename, str) and filename.startswith("An error occurred"):
            return jsonify({"results": [], "error": filename})
        
        # Step 6.3: 調用人臉識別 API 處理圖片
        # 說明：web_api 會調用 recognize_faces.py 中的 recognize_image 函數
        print("[DEBUG] 開始調用 web_api 處理圖片")
        result = web_api(filename)
        print(f"[DEBUG] web_api 返回結果，keys: {list(result.keys())}")
        print(f"[DEBUG] 是否包含 aligned_image: {'aligned_image' in result}")
        
        # Step 6.4: 驗證返回結果格式
        if not isinstance(result, dict) or "results" not in result:
            return jsonify({"results": [], "error": "伺服器返回格式錯誤"})
        
        # Step 6.5: 將結果轉換為 JSON 格式返回給前端
        # 說明：Flask 需要使用 jsonify 將 Python 字典轉為 JSON 響應
        print("[DEBUG] 返回結果給前端")
        return jsonify(result)
    except Exception as e:
        # Step 6.6: 捕獲所有異常，返回友好的錯誤訊息
        print(f"[ERROR] 處理圖片時發生錯誤: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"results": [], "error": f"處理圖片時發生錯誤: {str(e)}"})

# ============================================================
# Step 7: 檢測圖片中的人臉位置
# ============================================================
# 說明：用於前端"自動識別"功能，只檢測人臉位置，不進行識別
@app.route("/detectFaces", methods=['POST'])
def detectFaces():
    """
    使用 MTCNN 檢測人臉，返回人臉區域坐標。
    與 recognize_faces1.py 使用相同的檢測方法。
    """
    try:
        # Step 7.1: 接收前端上傳的圖片
        filename = receive_img(request, IDENT_DIR)
        
        # Step 7.2: 檢查是否接收圖片時發生錯誤
        if isinstance(filename, str) and filename.startswith("An error occurred"):
            return jsonify({"faces": [], "error": filename})
        
        # Step 7.3: 調用人臉檢測 API
        # 說明：使用 MTCNN 檢測圖片中所有人臉的位置和大小
        from face_api import detect_faces_api
        result = detect_faces_api(filename)
        
        # Step 7.4: 驗證返回結果格式
        if not isinstance(result, dict) or "faces" not in result:
            return jsonify({"faces": [], "error": "伺服器返回格式錯誤"})
        
        # Step 7.5: 返回檢測結果
        return jsonify(result)
    except Exception as e:
        return jsonify({"faces": [], "error": f"檢測人臉時發生錯誤: {str(e)}"})

@app.route("/report", methods=['POST'])
def reportPic():
    try:
        receive_img(request, REPORT_DIR, request.form['real_name'])
        return "success!"
    except Exception as e:
        return jsonify({"error": f"回報時發生錯誤: {str(e)}"}), 500

@app.route("/getRegisteredFaces", methods=['GET'])
def getRegisteredFaces():
    """
    獲取所有註冊的人物列表（名稱和圖片路徑）
    用於大炮圖鑑功能
    """
    try:
        from face_api import get_registered_faces_api
        result = get_registered_faces_api()
        return jsonify(result)
    except Exception as e:
        return jsonify({"faces": [], "error": f"獲取註冊人物列表時發生錯誤: {str(e)}"}), 500

@app.route("/getInputImages", methods=['GET'])
def getInputImages():
    """
    獲取所有 input 目錄下的圖片列表
    用於臉部辨識功能，讓用戶可以選擇現有圖片進行識別
    """
    try:
        from face_api import get_input_images_api
        result = get_input_images_api()
        return jsonify(result)
    except Exception as e:
        return jsonify({"images": [], "error": f"獲取圖片列表時發生錯誤: {str(e)}"}), 500

@app.route("/static/input_images/<filename>")
def serve_input_image(filename):
    """
    提供 input 目錄圖片的靜態文件服務
    """
    from flask import send_from_directory
    from pathlib import Path
    
    # input 圖片目錄
    input_dir = Path(__file__).resolve().parents[1] / "Machine-Learning---Face-Recognition" / "images" / "input"
    
    if not input_dir.exists():
        return "Directory not found", 404
    
    return send_from_directory(str(input_dir), filename)

# 處理 404 錯誤（主要是源映射文件）
@app.errorhandler(404)
def handle_404(e):
    # 如果是源映射文件，返回空响应
    if request.path.endswith('.map'):
        return '', 204
    return jsonify({"error": "找不到請求的資源"}), 404

if __name__ == '__main__':
    app.run("0.0.0.0", port=5000, debug=True)