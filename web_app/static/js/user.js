function facedet() {
    let src = cv.imread('canvasInput');
    let src_canvas = document.getElementById('canvasInput')
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    let faces = new cv.RectVector();
    let faceCascade = new cv.CascadeClassifier();
    console.log("Face Detection Initialization");
    faceCascade.load('lbpcascade_animeface.xml');
    console.log("lbpcascade_animeface.xml loaded");
    // detect faces
    let msize = new cv.Size(30, 30);
    faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, msize);
    console.log("face detected");
    for (let i = 0; i < faces.size(); ++i) {
        let face = faces.get(i);
        let width = face.width;
        let height = face.height;
        console.log(faces.get(i));

        addToList(face.x, face.y, width, height, src_canvas)
        
    }
    src.delete(); gray.delete(); faceCascade.delete();
    faces.delete();
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
        let name = window.prompt("識別為了錯誤的角色？請輸入他/她正確的名稱，將上傳圖片和您輸入的標籤資訊。");
        if (name != null && name.trim() !== '') {
            $.post("/report", {
                data: canvas.toDataURL('image/png'),
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
