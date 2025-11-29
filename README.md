# 動漫人物臉部辨識系統（Anime Face Recognition UI）
----------------------------------------
使用方式
----------------------------------------

1. 下載本專案

git clone https://github.com/pinchen1017/face_detection_UI.git
cd face_detection_UI

2. 建立 Python 虛擬環境（建議）

Windows:
python -m venv .venv
.venv\Scripts\activate

Mac / Linux:
python3 -m venv .venv
source .venv/bin/activate

3. 安裝套件

pip install -r requirements.txt

4. 放置模型檔案到以下資料夾：

web_app/model/

需要包含：
- inceptionv3.h5        （分類模型）
- model.tflite          （TFLite 推論版）
- embedding_model.h5    （128 維 embedding）
- labels.json           （角色標籤）

5. 啟動網站

cd web_app
python app.py

啟動後開啟：  
http://127.0.0.1:5000

----------------------------------------
功能說明
----------------------------------------

1. 自動偵測臉部：使用 OpenCV.js 在前端進行臉部框選
2. 手動框選：若自動偵測不準確，可自行拉框加入
3. 上傳辨識：將臉部圖像傳給後端執行 TensorFlow 推論
4. 回報錯誤：結果若不正確，可回傳正解供資料增補
5. Embedding 模式：使用 128 維向量進行相似度計算（如臉部搜尋）

----------------------------------------
專案結構
----------------------------------------

web_app/            # 前後端主要程式
  app.py            # Flask 主程式
  classification.py # 模型推論
  model/            # 模型放置處
  ident/            # 前端臨時輸入
  user_report/      # 使用者錯誤回報

mtrain/             # 訓練資料（不需上傳 GitHub）
work/               # 模型訓練、Embedding 工具

----------------------------------------
重新訓練模型（選用）
----------------------------------------

cd work
python train_v2.py

訓練完成後模型會輸出到：

web_app/model/

----------------------------------------
注意事項
----------------------------------------

- GitHub 無法上傳超過 100MB 檔案，因此模型請勿 push
- .venv、mtrain/、model.h5、tflite、pyd、dll 皆請加入 .gitignore