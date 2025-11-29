import os
import json
from pathlib import Path
import tensorflow as tf
from tensorflow.keras.applications.inception_v3 import InceptionV3, preprocess_input
from tensorflow.keras import layers, models

# ==============================
# 路徑設定
# ==============================
# 這支程式預設放在 work/ 底下
ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "mtrain"           # 你的角色資料夾
MODEL_DIR = ROOT_DIR / "web_app" / "model"

IMG_SIZE = (299, 299)                    # InceptionV3 預設大小
BATCH_SIZE = 32
EPOCHS = 10                              # 想要更準可以調大，但時間會變久
SEED = 123

# Step 1: 建立資料集
def build_datasets():
    """從 mtrain 建立訓練 / 驗證資料集"""
    if not DATA_DIR.exists():
        raise FileNotFoundError(f"找不到資料夾: {DATA_DIR}")

    train_ds = tf.keras.preprocessing.image_dataset_from_directory(
        DATA_DIR,
        labels="inferred",
        label_mode="int",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        validation_split=0.2,
        subset="training",
        seed=SEED,
    )

    val_ds = tf.keras.preprocessing.image_dataset_from_directory(
        DATA_DIR,
        labels="inferred",
        label_mode="int",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        validation_split=0.2,
        subset="validation",
        seed=SEED,
    )

    class_names = train_ds.class_names
    print(f"共 {len(class_names)} 個角色類別：")
    for i, name in enumerate(class_names):
        print(f"{i:2d}: {name}")

    AUTOTUNE = tf.data.AUTOTUNE

    def preprocess(images, labels):
        images = tf.cast(images, tf.float32)
        images = preprocess_input(images)
        return images, labels

    train_ds = train_ds.map(preprocess).prefetch(AUTOTUNE)
    val_ds = val_ds.map(preprocess).prefetch(AUTOTUNE)

    return train_ds, val_ds, class_names

# Step 2: 建立模型
def build_model(num_classes: int) -> tf.keras.Model:
    """建立 InceptionV3 + 全連接分類頭"""
    base_model = InceptionV3(
        weights="imagenet",
        include_top=False,
        input_shape=IMG_SIZE + (3,)
    )
    base_model.trainable = False  # 只訓練最後幾層

    inputs = layers.Input(shape=IMG_SIZE + (3,))
    x = preprocess_input(inputs)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = models.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()
    return model

# Step 3: 儲存模型與標籤檔
def save_label_files(class_names):
    """輸出 labels.json 和 mapping.txt"""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    index_to_label = {i: name for i, name in enumerate(class_names)}
    labels_path = MODEL_DIR / "labels.json"
    with labels_path.open("w", encoding="utf-8") as f:
        json.dump(index_to_label, f, ensure_ascii=False, indent=2)
    print(f"已寫出 {labels_path}")

    mapping_path = MODEL_DIR / "mapping.txt"
    with mapping_path.open("w", encoding="utf-8") as f:
        for i, name in enumerate(class_names):
            f.write(f"{i}\t{name}\n")
    print(f"已寫出 {mapping_path}")

# Step 3-1: 儲存 Keras 模型
def save_keras_model(model: tf.keras.Model):
    """存成 inceptionv3.h5"""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    h5_path = MODEL_DIR / "inceptionv3.h5"
    model.save(h5_path)
    print(f"已寫出 {h5_path}")

# Step 3-2: 儲存 TFLite 模型
def save_tflite_model(model: tf.keras.Model):
    """轉成 TFLite model.tflite"""
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    tflite_path = MODEL_DIR / "model.tflite"
    with tflite_path.open("wb") as f:
        f.write(tflite_model)
    print(f"已寫出 {tflite_path}")

def main():
    print("=== 1. 建立資料集 ===")
    train_ds, val_ds, class_names = build_datasets()

    print("\n=== 2. 建立並訓練模型 ===")
    model = build_model(num_classes=len(class_names))

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
    )

    print("\n=== 3. 儲存模型與標籤檔 ===")
    save_keras_model(model)
    save_tflite_model(model)
    save_label_files(class_names)

    print("\n全部完成！模型已存到:", MODEL_DIR)

if __name__ == "__main__":
    main()