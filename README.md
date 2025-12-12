# 動漫角色識別 Web 應用

基於 Flask 的 Web 應用，提供動漫角色人臉識別服務。

# 架構

```
anime-face-recognition/
├── web_app/                          # Web 應用目錄
│   ├── app.py                       # Flask 主應用
│   ├── face_api.py                  # 人臉識別 API 包裝
│   ├── templates/
│   │   └── index.html              # 前端頁面
│   ├── static/
│   │   ├── css/                    # 樣式文件
│   │   ├── js/                     # JavaScript 文件
│   │   │   ├── user.js             # 人臉檢測邏輯
│   │   │   ├── utils.js            # OpenCV 工具
│   │   │   └── opencv.js           # OpenCV.js 庫
│   │   └── data/
│   │       └── lbpcascade_animeface.xml  # 動漫人臉檢測器
│   ├── ident/                      # 上傳的識別圖片
│   ├── user_report/                # 用戶錯誤報告
│   ├── result/                     # 識別結果輸出
│   ├── model/                      # 模型文件
│   └── requirements.txt            # 套件需求
├── Machine-Learning---Face-Recognition/  # 機器學習模組
│   ├── app/                        # 核心模組
│   │   ├── detector.py            # 臉部偵測
│   │   ├── aligner.py             # 臉部對齊
│   │   ├── embedder.py            # 特徵向量
│   │   ├── db.py                  # 資料存取
│   │   ├── pipeline.py            # 整體流程
│   │   └── recognizer.py          # 人臉比對
│   ├── images/
│   │   ├── input/                 # 待辨識圖
│   │   └── register/              # 登錄人臉
│   ├── register_faces.py          # 建立資料庫
│   ├── recognize_faces.py         # 執行辨識
│   ├── face_db.sqlite            # 臉部資料庫
│   └── requirements.txt           # 套件需求
├── mtrain/                        # 訓練資料集
├── work/                          # 工作目錄
│   ├── 1_train_anime_face.py     # 訓練腳本
│   ├── 2_build_embedding_model.py
│   ├── 3_build_embedding_db.py
│   └── 4_embedding_infer.py
├── output_graph.pb               # 訓練好的模型
└── requirements.txt              # 根目錄套件需求
```

# 環境建置說明

### 1. 建立 Python 虛擬環境

建議使用 Python 3.8 或以上版本

```bash
# 使用 conda
conda create -n face_web python=3.9
conda activate face_web

# 或使用 venv
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

### 2. 安裝套件

根據不同模組安裝對應的套件：

**Web 應用套件：**
```bash
cd web_app
pip install -r requirements.txt
```

**機器學習模組套件：**
```bash
cd Machine-Learning---Face-Recognition
pip install -r requirements.txt
```

主要依賴套件：
- Flask: Web 框架
- facenet-pytorch: 人臉識別模型
- torch, torchvision: PyTorch 深度學習框架
- pillow: 圖像處理
- numpy: 數值計算
- opencv-python: 圖像處理（後端使用）
- tensorflow: 深度學習框架（訓練用）

### 3. 準備資料庫

確保 `Machine-Learning---Face-Recognition/face_db.sqlite` 已建立：

```bash
# 進入 Machine-Learning---Face-Recognition 目錄
cd ../Machine-Learning---Face-Recognition

# 將要註冊的人臉放入 images/register/，檔名即人名
# 執行註冊腳本
python register_faces.py

# 將資料庫複製到 web_app 目錄（可選，系統會自動查找）
cp face_db.sqlite ../web_app/
```

# 操作流程

### 1. 啟動 Web 應用

```bash
cd web_app
python app.py
```

應用將在 `http://127.0.0.1:5000` 啟動

### 2. 使用 Web 界面

1. 打開瀏覽器訪問 `http://localhost:5000`
2. 上傳包含動漫角色的圖片
3. 點擊「自動識別」按鈕，系統會自動檢測人臉
4. 手動框選（可選）：如果自動識別不準確，可以手動框選人臉區域
5. 點擊「上傳分析」按鈕，系統會識別每個人臉並顯示結果
6. 查看識別結果：顯示前 3 名最相似的動漫角色及相似度

### 3. 功能說明

- **自動人臉檢測**：使用 OpenCV.js 在前端進行動漫人臉檢測
- **人臉識別**：使用 MTCNN + FaceNet 進行高精度動漫角色識別
- **錯誤報告**：如果識別錯誤，可以點擊「回報錯誤」按鈕上報
- **角色圖鑑**：查看所有已註冊的動漫角色

# 技術細節

### 前端人臉檢測

- 使用 OpenCV.js 的 `lbpcascade_animeface.xml` 進行動漫人臉檢測
- 過濾條件：
  - 長寬比：0.7 - 1.3（接近正方形）
  - 最小尺寸：60x60 像素
  - 面積比例：0.2% - 30%

### 後端人臉識別

- 使用 MTCNN 進行人臉檢測和對齊
- 使用 FaceNet 提取人臉特徵向量
- 使用餘弦相似度進行比對
- 返回前 3 名最相似的人物

### 資料庫結構

```sql
CREATE TABLE faces (
    name TEXT PRIMARY KEY,
    embedding BLOB
)
```

# 注意事項

1. **資料庫位置**：系統會自動查找 `Machine-Learning---Face-Recognition/face_db.sqlite`，確保該資料庫已建立並包含註冊的人臉
2. **圖片大小限制**：上傳圖片最大 100MB（base64 編碼後）
3. **圖片格式**：支援 PNG 和 JPEG 格式
4. **瀏覽器要求**：建議使用 Chrome、Firefox 或 Edge 等現代瀏覽器

# 疑難排解

### 問題一：413 Request Entity Too Large

- **原因**：上傳的圖片太大
- **解決**：系統已設定 100MB 限制，並使用 JPEG 壓縮減少上傳大小

### 問題二：no such table: faces

- **原因**：資料庫表不存在
- **解決**：執行 `register_faces.py` 建立資料庫和表

### 問題三：未偵測到人臉

- **原因**：圖片中沒有動漫人臉或人臉太小
- **解決**：確保圖片包含清晰的動漫角色人臉，人臉尺寸至少 60x60 像素

### 問題四：識別到非人臉區域

- **原因**：人臉檢測誤檢
- **解決**：系統已加入過濾條件，如仍有問題可手動刪除誤檢項目

### 問題五：找不到 Machine-Learning---Face-Recognition 模組

- **原因**：路徑配置錯誤或目錄不存在
- **解決**：確保 `Machine-Learning---Face-Recognition` 目錄存在於專案根目錄，且包含 `app` 子目錄和 `recognize_faces.py` 文件