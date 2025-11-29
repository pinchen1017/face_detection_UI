import os
from pathlib import Path
import tensorflow as tf

# 和 train_anime_face.py 一樣的路徑設定
ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT_DIR / "web_app" / "model"
H5_PATH = MODEL_DIR / "inceptionv3.h5"
EMB_PATH = MODEL_DIR / "embedding_model.h5"

def main():
    print("載入分類模型:", H5_PATH)
    model = tf.keras.models.load_model(str(H5_PATH))

    print("模型結構：")
    model.summary()  # 第一次可以跑跑看，看倒數幾層的名字

    # 這支模型最後幾層結構是：
    # ... → GlobalAveragePooling2D → Dropout → Dense(num_classes, softmax)
    #
    # 我們想要的 embedding = GlobalAveragePooling2D 那層的輸出
    # 也就是倒數第 3 層：model.layers[-3]
    embedding_layer = model.layers[-3]

    embedding_model = tf.keras.Model(
        inputs=model.input,
        outputs=embedding_layer.output,
        name="anime_embedding_model"
    )

    embedding_model.summary()
    EMB_PATH.parent.mkdir(parents=True, exist_ok=True)
    embedding_model.save(str(EMB_PATH))
    print("已儲存 embedding 模型到:", EMB_PATH)

if __name__ == "__main__":
    main()