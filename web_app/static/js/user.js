function facedet() {
    try {
        let canvasInput = document.getElementById('canvasInput');
        if (!canvasInput) {
            alert('請先上傳圖片！');
            return;
        }
        
        // 檢查 canvas 是否有內容
        let ctx = canvasInput.getContext('2d');
        let imageData = ctx.getImageData(0, 0, canvasInput.width, canvasInput.height);
        let hasContent = false;
        for (let i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i + 3] > 0) { // 檢查 alpha 通道
                hasContent = true;
                break;
            }
        }
        
        if (!hasContent) {
            alert('請先上傳圖片！');
            return;
        }
        
        let src = cv.imread('canvasInput');
        if (src.empty()) {
            alert('無法讀取圖片，請重新上傳！');
            return;
        }
        
        let src_canvas = document.getElementById('canvasInput');
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        let faces = new cv.RectVector();
        let faceCascade = new cv.CascadeClassifier();
        console.log("Face Detection Initialization (Real Human Faces)");
        faceCascade.load('haarcascade_frontalface_default.xml');
        console.log("haarcascade_frontalface_default.xml loaded");
        
        // detect faces - 優化參數以減少誤檢（非人臉區域）
        // scaleFactor: 1.2 (每次縮放比例，較大值減少檢測層級，提高準確度)
        // minNeighbors: 5 (最少鄰居數，越高越嚴格，減少誤檢)
        // flags: 0 (使用默認標誌)
        // minSize: 50x50 (最小人臉尺寸，過濾太小的誤檢)
        // maxSize: 根據圖片大小動態設置，避免檢測到整個圖片
        let minSize = new cv.Size(50, 50);
        let maxSize = new cv.Size(Math.floor(gray.cols * 0.8), Math.floor(gray.rows * 0.8));
        faceCascade.detectMultiScale(gray, faces, 1.2, 5, 0, minSize, maxSize);
        console.log("face detected, count: " + faces.size());
        
        if (faces.size() === 0) {
            alert('未偵測到人臉，請確認圖片中包含清晰的人臉！');
        } else {
            // 過濾誤檢：檢查長寬比和大小
            let validFaces = [];
            for (let i = 0; i < faces.size(); ++i) {
                let face = faces.get(i);
                let width = face.width;
                let height = face.height;
                
                // 人臉通常接近正方形，長寬比應該在 0.6 到 1.5 之間
                let aspectRatio = width / height;
                
                // 檢查區域大小是否合理（不能太小也不能太大）
                let area = width * height;
                let imageArea = gray.cols * gray.rows;
                let areaRatio = area / imageArea;
                
                // 過濾條件（更嚴格）：
                // 1. 長寬比在合理範圍內（0.7-1.3，更接近正方形）
                // 2. 區域面積不能太小（至少佔圖片的 0.2%）
                // 3. 區域面積不能太大（不超過圖片的 30%）
                // 4. 寬度和高度都要大於 60 像素（過濾領帶等細長物體）
                if (aspectRatio >= 0.7 && aspectRatio <= 1.3 && 
                    areaRatio >= 0.002 && areaRatio <= 0.3 &&
                    width >= 60 && height >= 60) {
                    validFaces.push(face);
                    console.log(`Valid face detected: ${width}x${height}, aspect ratio: ${aspectRatio.toFixed(2)}, area ratio: ${(areaRatio*100).toFixed(2)}%`);
                } else {
                    console.log(`Filtered out invalid detection: ${width}x${height}, aspect ratio: ${aspectRatio.toFixed(2)}, area ratio: ${(areaRatio*100).toFixed(2)}%`);
                }
            }
            
            if (validFaces.length === 0) {
                alert('未偵測到有效人臉，請確認圖片中包含清晰的人臉！');
            } else {
                console.log(`Found ${validFaces.length} valid face(s) out of ${faces.size()} detection(s)`);
                for (let i = 0; i < validFaces.length; ++i) {
                    let face = validFaces[i];
                    let width = face.width;
                    let height = face.height;
                    addToList(face.x, face.y, width, height, src_canvas);
                }
            }
        }
        
        src.delete(); 
        gray.delete(); 
        faceCascade.delete();
        faces.delete();
    } catch (e) {
        console.error('Face detection error:', e);
        alert('人臉偵測時發生錯誤：' + e.message);
    }
}

function addToList(x, y, width, height, src_canvas) {
    // 隱藏佔位符
    const mylist = document.getElementById("mylist");
    const placeholder = mylist.querySelector('.results-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // 創建新的結果卡片
    let resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    
    // 創建canvas用於顯示圖片
    let canvas = document.createElement('canvas');
    canvas.className = 'result_pic';
    canvas.width = width;
    canvas.height = height;
    
    // 繪製圖片到canvas
    let ctx = canvas.getContext('2d');
    ctx.drawImage(src_canvas, x, y, width, height, 0, 0, width, height);
    
    // 創建結果信息區域
    let resultInfo = document.createElement('div');
    resultInfo.className = 'result-info';
    
    let resultText = document.createElement('div');
    resultText.className = 'result-text';
    resultText.innerHTML = '等待上傳……';
    
    // 創建操作按鈕區域
    let resultActions = document.createElement('div');
    resultActions.className = 'result-actions';
    
    let deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '刪除';
    deleteButton.addEventListener('click', () => {
        resultCard.remove();
        // 如果沒有結果了，顯示佔位符
        if (mylist.children.length === 0 || (mylist.children.length === 1 && mylist.children[0].classList.contains('results-placeholder'))) {
            const placeholder = document.createElement('div');
            placeholder.className = 'results-placeholder';
            placeholder.innerHTML = `
                <p class="placeholder-text">上傳圖片後，結果將顯示在這裡</p>
                <p class="placeholder-hint">點擊角色名稱查看詳細資訊</p>
            `;
            mylist.appendChild(placeholder);
        }
    });
    
    let reportButton = document.createElement('button');
    reportButton.className = 'report-button';
    reportButton.innerHTML = '回報錯誤';
    reportButton.addEventListener('click', () => {
        let name = window.prompt("識別為了錯誤的人物？請輸入他/她正確的名稱，將上傳圖片和您輸入的標籤資訊。");
        if (name != null && name.trim() !== '') {
            // 使用 JPEG 格式壓縮圖片
            $.post("/report", {
                data: canvas.toDataURL('image/jpeg', 0.85),
                real_name: name
            }, (data, status) => {
                if (status == "success") {
                    alert("感謝您的回報！我們會盡快處理。");
                    reportButton.innerHTML = '✅ 已回報';
                    reportButton.disabled = true;
                    reportButton.style.opacity = '0.6';
                } else {
                    alert("回報失敗，請稍後再試。");
                }
            });
        }
    });
    
    resultActions.appendChild(deleteButton);
    resultActions.appendChild(reportButton);
    
    resultInfo.appendChild(resultText);
    resultInfo.appendChild(resultActions);
    
    resultCard.appendChild(canvas);
    resultCard.appendChild(resultInfo);
    
    mylist.appendChild(resultCard);
    
    // 添加動畫效果
    setTimeout(() => {
        resultCard.style.opacity = '1';
    }, 10);
}
