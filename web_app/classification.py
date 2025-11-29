# classification.py (TF2 compatible version)

import tensorflow as tf
import numpy as np
from PIL import Image
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "model"

H5_MODEL_PATH = MODEL_DIR / "inceptionv3.h5"
JSON_LABEL_PATH = MODEL_DIR / "labels.json"

print("Loading TF2 Keras model:", H5_MODEL_PATH)
model = tf.keras.models.load_model(str(H5_MODEL_PATH))

with open(JSON_LABEL_PATH, "r", encoding="utf-8") as f:
    labels = json.load(f)

IMG_SIZE = (299, 299)

def preprocess_image(img: Image.Image):
    img = img.convert("RGB").resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32)
    arr = tf.keras.applications.inception_v3.preprocess_input(arr)
    arr = np.expand_dims(arr, axis=0)
    return arr

def predict_top_k(img_path, top_k=5):
    img = Image.open(img_path)
    x = preprocess_image(img)

    preds = model.predict(x)[0]   # softmax
    top_indices = preds.argsort()[-top_k:][::-1]

    results = [
        {"label": labels[str(i)], "prob": float(preds[i])}
        for i in top_indices
    ]
    return results

# 舊版 API 需這個名稱，因此保留 wrapper
def web_api(img_path):
    result = predict_top_k(img_path, top_k=5)
    return {"results": result}