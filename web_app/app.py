#!/usr/bin/env python3
from flask import *
import os
from datetime import datetime
import base64
from random import randint
from classification import web_api
from werkzeug.utils import secure_filename

IDENT_DIR = os.path.dirname(os.path.abspath(__file__)) + '/ident/'
REPORT_DIR = os.path.dirname(os.path.abspath(__file__)) + '/user_report/'
app = Flask(__name__)

def receive_img(request, target_dir, desired_filename=None):
    magic_str = "data:image/png;base64,"
    pic = request.form['data']

    if pic is None or pic == "" or pic[:len(magic_str)] != magic_str:
        return "An error occurred when receiving your images."
    else:
        pic = pic[len(magic_str):]

    if not desired_filename:
        file_name = target_dir + str(datetime.now())[:10] + str(randint(0,100)) + ".png"
    else:
        file_name = target_dir + secure_filename(desired_filename) + "-" + str(datetime.now())[:10] + str(randint(0,100)) + ".png"

    with open(file_name, "wb") as f:
        f.write(base64.urlsafe_b64decode(pic.encode("utf-8")))

    return file_name

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/uploadForIdent", methods=['POST'])
def submitPic():
    filename = receive_img(request, IDENT_DIR)
    
    # 使用新的 TF2 分類器推論
    result = web_api(filename)

    # 必須 jsonify 才能回給前端
    return jsonify(result)

@app.route("/report", methods=['POST'])
def reportPic():
    receive_img(request, REPORT_DIR, request.form['real_name'])
    return "success!"

if __name__ == '__main__':
    app.run("0.0.0.0", port=5000, debug=True)