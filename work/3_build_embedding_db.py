import os
from pathlib import Path
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications.inception_v3 import preprocess_input

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "mtrain"
MODEL_DIR = ROOT_DIR / "web_app" / "model"
EMB_MODEL_PATH = MODEL_DIR / "embedding_model.h5"
EMB_DB_PATH = MODEL_DIR / "embedding_db.npz"  # 我們會存成 npz

IMG_SIZE = (299, 299)

def load_image(path: Path):
    img = Image.open(path).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32)
    arr = preprocess_input(arr)
    arr = np.expand_dims(arr, axis=0)  # (1, 299, 299, 3)
    return arr

def main():
    print("載入 embedding 模型:", EMB_MODEL_PATH)
    emb_model = tf.keras.models.load_model(str(EMB_MODEL_PATH))

    char_dirs = sorted([p for p in DATA_DIR.iterdir() if p.is_dir()])
    print(f"共 {len(char_dirs)} 個角色資料夾")

    emb_dict = {}  # {角色資料夾名稱: 向量}

    for char_dir in char_dirs:
        print(f"處理角色: {char_dir.name}")
        img_paths = [p for p in char_dir.glob("*.jpg")] + \
                    [p for p in char_dir.glob("*.png")] + \
                    [p for p in char_dir.glob("*.jpeg")]

        if not img_paths:
            print("  這個角色沒有圖片，略過")
            continue

        vecs = []
        for img_path in img_paths:
            try:
                x = load_image(img_path)
                emb = emb_model.predict(x, verbose=0)[0]  # (embedding_dim,)
                vecs.append(emb)
            except Exception as e:
                print("  讀圖失敗:", img_path, e)

        if not vecs:
            print("  這個角色全部圖片都失敗，略過")
            continue

        mean_vec = np.mean(np.stack(vecs, axis=0), axis=0)
        emb_dict[char_dir.name] = mean_vec

    # 存成 npz： key=角色名稱, value=向量
    np.savez(EMB_DB_PATH, **emb_dict)
    print("已儲存 embedding 資料庫到:", EMB_DB_PATH)
    print("角色數:", len(emb_dict))

if __name__ == "__main__":
    main()