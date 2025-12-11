#!/usr/bin/env python3
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

# 增加請求大小限制，允許上傳較大的 base64 圖片（100MB）
# 真實人臉圖片通常比動漫圖片更大，需要更大的限制
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB

# 處理 413 錯誤
@app.errorhandler(413)
@app.errorhandler(RequestEntityTooLarge)
def handle_413(e):
    return jsonify({"results": [], "error": "上傳的圖片太大，請嘗試使用較小的圖片或裁剪後再上傳"}), 413

def receive_img(request, target_dir, desired_filename=None):
    try:
        # 支援 PNG 和 JPEG 格式
        magic_str_png = "data:image/png;base64,"
        magic_str_jpeg = "data:image/jpeg;base64,"
        pic = request.form.get('data', '')

        if pic is None or pic == "":
            return "An error occurred when receiving your images."
        
        # 判斷圖片格式
        if pic.startswith(magic_str_png):
            pic = pic[len(magic_str_png):]
            file_ext = ".png"
        elif pic.startswith(magic_str_jpeg):
            pic = pic[len(magic_str_jpeg):]
            file_ext = ".jpg"
        else:
            return "An error occurred when receiving your images."

        if not desired_filename:
            file_name = target_dir + str(datetime.now())[:10] + str(randint(0,100)) + file_ext
        else:
            file_name = target_dir + secure_filename(desired_filename) + "-" + str(datetime.now())[:10] + str(randint(0,100)) + file_ext

        # 確保目錄存在
        os.makedirs(target_dir, exist_ok=True)

        with open(file_name, "wb") as f:
            f.write(base64.urlsafe_b64decode(pic.encode("utf-8")))

        return file_name
    except Exception as e:
        raise Exception(f"接收圖片時發生錯誤: {str(e)}")

@app.route("/")
def index():
    return render_template("index.html")

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

@app.route("/uploadForIdent", methods=['POST'])
def submitPic():
    try:
        filename = receive_img(request, IDENT_DIR)
        
        # 檢查是否為錯誤訊息
        if isinstance(filename, str) and filename.startswith("An error occurred"):
            return jsonify({"results": [], "error": filename})
        
        # 使用新的 TF2 分類器推論
        result = web_api(filename)
        
        # 確保返回格式正確
        if not isinstance(result, dict) or "results" not in result:
            return jsonify({"results": [], "error": "伺服器返回格式錯誤"})
        
        # 必須 jsonify 才能回給前端
        return jsonify(result)
    except Exception as e:
        # 捕獲所有異常，返回錯誤訊息
        return jsonify({"results": [], "error": f"處理圖片時發生錯誤: {str(e)}"})

@app.route("/detectFaces", methods=['POST'])
def detectFaces():
    """
    使用 MTCNN 檢測人臉，返回人臉區域坐標。
    與 recognize_faces1.py 使用相同的檢測方法。
    """
    try:
        filename = receive_img(request, IDENT_DIR)
        
        # 檢查是否為錯誤訊息
        if isinstance(filename, str) and filename.startswith("An error occurred"):
            return jsonify({"faces": [], "error": filename})
        
        # 使用 MTCNN 檢測人臉
        from face_api import detect_faces_api
        result = detect_faces_api(filename)
        
        # 確保返回格式正確
        if not isinstance(result, dict) or "faces" not in result:
            return jsonify({"faces": [], "error": "伺服器返回格式錯誤"})
        
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

# 處理 404 錯誤（主要是源映射文件）
@app.errorhandler(404)
def handle_404(e):
    # 如果是源映射文件，返回空响应
    if request.path.endswith('.map'):
        return '', 204
    return jsonify({"error": "找不到請求的資源"}), 404

if __name__ == '__main__':
    app.run("0.0.0.0", port=5000, debug=True)