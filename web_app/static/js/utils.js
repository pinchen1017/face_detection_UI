function Utils(errorOutputId) { // eslint-disable-line no-unused-vars
    let self = this;
    this.errorOutput = document.getElementById(errorOutputId);

    const OPENCV_URL = '/static/js/opencv.js';
    this.loadOpenCv = function(onloadCallback) {
        let script = document.createElement('script');
        script.setAttribute('async', '');
        script.setAttribute('type', 'text/javascript');
        script.addEventListener('load', () => {
            if (cv.getBuildInformation)
            {
                console.log(cv.getBuildInformation());
                onloadCallback();
            }
            else
            {
                // WASM
                cv['onRuntimeInitialized']=()=>{
                    console.log(cv.getBuildInformation());
                    onloadCallback();
                }
            }
        });
        script.addEventListener('error', () => {
            self.printError('Failed to load ' + OPENCV_URL);
        });
        script.src = OPENCV_URL;
        let node = document.getElementsByTagName('script')[0];
        node.parentNode.insertBefore(script, node);
    };

    this.createFileFromUrl = function(path, url, callback) {
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function(ev) {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    let data = new Uint8Array(request.response);
                    cv.FS_createDataFile('/', path, data, true, false, false);
                    callback();
                } else {
                    self.printError('Failed to load ' + url + ' status: ' + request.status);
                }
            }
        };
        request.send();
    };

    this.loadImageToCanvas = function(url, cavansId, file) {
        let canvas = document.getElementById(cavansId);
        let ctx = canvas.getContext('2d');
        let img = new Image();
        img.crossOrigin = 'anonymous';
        
        // 讀取 EXIF 方向信息的函數
        function getOrientation(file, callback) {
            if (!file || typeof EXIF === 'undefined') {
                callback(1); // 默認方向
                return;
            }
            
            EXIF.getData(file, function() {
                let orientation = EXIF.getTag(this, "Orientation") || 1;
                callback(orientation);
            });
        }
        
        // 根據 EXIF 方向信息繪製圖片
        function drawImageWithOrientation(canvas, ctx, img, orientation) {
            // 根據方向信息設置 canvas 大小
            let width = img.width;
            let height = img.height;
            
            // 如果方向是 90 度或 270 度，需要交換寬高
            if (orientation === 6 || orientation === 8) {
                canvas.width = height;
                canvas.height = width;
            } else {
                canvas.width = width;
                canvas.height = height;
            }
            
            // 清除 canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 根據方向信息進行旋轉和翻轉
            ctx.save();
            
            switch(orientation) {
                case 2:
                    // 水平翻轉
                    ctx.translate(width, 0);
                    ctx.scale(-1, 1);
                    break;
                case 3:
                    // 旋轉 180 度
                    ctx.translate(width, height);
                    ctx.rotate(Math.PI);
                    break;
                case 4:
                    // 垂直翻轉
                    ctx.translate(0, height);
                    ctx.scale(1, -1);
                    break;
                case 5:
                    // 順時針 90 度 + 水平翻轉
                    ctx.translate(height, 0);
                    ctx.rotate(Math.PI / 2);
                    ctx.scale(-1, 1);
                    break;
                case 6:
                    // 順時針 90 度
                    ctx.translate(height, 0);
                    ctx.rotate(Math.PI / 2);
                    break;
                case 7:
                    // 逆時針 90 度 + 水平翻轉
                    ctx.translate(0, width);
                    ctx.rotate(-Math.PI / 2);
                    ctx.scale(-1, 1);
                    break;
                case 8:
                    // 逆時針 90 度
                    ctx.translate(0, width);
                    ctx.rotate(-Math.PI / 2);
                    break;
                default:
                    // 正常方向，不需要變換
                    break;
            }
            
            // 繪製圖片
            ctx.drawImage(img, 0, 0);
            ctx.restore();
        }
        
        img.onload = function() {
            // 先讀取 EXIF 方向信息，然後再繪製
            getOrientation(file, function(orientation) {
                drawImageWithOrientation(canvas, ctx, img, orientation);
            });
        };
        
        img.src = url;
    };

    this.clearError = function() {
        this.errorOutput.innerHTML = '';
    };

    this.printError = function(err) {
        if (typeof err === 'undefined') {
            err = '';
        } else if (typeof err === 'number') {
            if (!isNaN(err)) {
                if (typeof cv !== 'undefined') {
                    err = 'Exception: ' + cv.exceptionFromPtr(err).msg;
                }
            }
        } else if (typeof err === 'string') {
            let ptr = Number(err.split(' ')[0]);
            if (!isNaN(ptr)) {
                if (typeof cv !== 'undefined') {
                    err = 'Exception: ' + cv.exceptionFromPtr(ptr).msg;
                }
            }
        } else if (err instanceof Error) {
            err = err.stack.replace(/\n/g, '<br>');
        }
        this.errorOutput.innerHTML = err;
    };

    this.addFileInputHandler = function(fileInputId, canvasId) {
        let inputElement = document.getElementById(fileInputId);
        inputElement.addEventListener('change', (e) => {
            let files = e.target.files;
            if (files.length > 0) {
                let file = files[0];
                let imgUrl = URL.createObjectURL(file);
                self.loadImageToCanvas(imgUrl, canvasId, file);
            }
        }, false);
    };
};
