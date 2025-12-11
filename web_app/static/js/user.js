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
        
        // 使用後端 MTCNN 檢測人臉（與 recognize_faces1.py 相同的檢測方法）
        // 將 canvas 轉換為 base64 圖片
        let imageDataUrl = canvasInput.toDataURL('image/jpeg', 0.9);
        
        // 顯示載入狀態
        console.log("使用 MTCNN 檢測人臉（後端檢測）...");
        
        // 發送請求到後端進行人臉檢測
        $.post("/detectFaces", {
            data: imageDataUrl
        }, (data, status) => {
            if (status === "success") {
                if (data.error) {
                    alert('檢測人臉時發生錯誤：' + data.error);
                    return;
                }
                
                if (!data.faces || data.faces.length === 0) {
            alert('未偵測到人臉，請確認圖片中包含清晰的人臉！');
                    return;
                }
                
                console.log(`使用 MTCNN 檢測到 ${data.faces.length} 張人臉`);
                
                // 使用檢測到的人臉區域添加到列表
                let src_canvas = document.getElementById('canvasInput');
                for (let i = 0; i < data.faces.length; ++i) {
                    let face = data.faces[i];
                    console.log(`人臉 ${i + 1}: x=${face.x}, y=${face.y}, width=${face.width}, height=${face.height}, prob=${(face.prob * 100).toFixed(2)}%`);
                    addToList(face.x, face.y, face.width, face.height, src_canvas);
                }
            } else {
                alert('檢測人臉時發生錯誤，請稍後再試。');
            }
        }).fail((xhr, status, error) => {
            console.error('Face detection request failed:', error);
            alert('檢測人臉時發生錯誤：' + error);
        });
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
