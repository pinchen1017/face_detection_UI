
function ZmCanvasCrop(opt, saveCallBack) {
	this.init(opt);
	this._option.crop_box_width = opt.box_width; //剪裁容器的最大宽度
	this._option.crop_box_height = opt.box_height;  //剪裁容器的最大高度
	this._option.crop_min_width = opt.min_width;  //要剪裁图片的最小宽度
	this._option.crop_min_height = opt.min_height;  //要剪裁图片的最小高度
	this._option.crop_scale = opt.min_width / opt.min_height;  //图片会按照最小宽高的比例裁剪
}

ZmCanvasCrop.prototype = {

	_$box: '',
	_$canvasDown: '',
	_$canvasUp: '',
	_input: '',
	_ctxUp: '',//裁剪区域canvas
	_img: '',
	_img_show: {
		width: '',
		height: '',
		scale: '', //显示像素除以实际像素
		crop_width: '',//要裁剪部分显示宽
		crop_height: '',
		min_width: '',//要裁剪部分显示最小宽度
		min_height: ''
	},

	_option: {
		crop_box_width: '',			//图片操作区域宽限制
		crop_box_height: '',			//图片操作区域高限制
		crop_min_width: '',		//剪裁实际最小像素宽
		crop_min_height: '',	//剪裁实际最小像素高
		crop_scale: '' //宽高比
	},
	_save: {
		left: '',
		top: '',
		width: '',
		height: ''
	},
	_resize_point: {
		color: '#69f',
		size: 8
	},
	_resize_btn: {},

	init: function (opt) {
		var self = this;
		self._input = opt.fileInput;

		self._$box = $('.canvas-box');
		self.readFile();

		opt.saveBtn.addEventListener('click', function () {
			self.save();
		});
	},

	imgTrue: function () {
		if (this._img.width < this._option.crop_min_width || this._img.height < this._option.crop_min_height) {
			return false;
		}
		return true;
	},

	readFile: function () {
		var self = this;

		if (typeof FileReader === 'undefined') {
			alert("抱歉，你的浏览器不支持 FileReader");
			input.setAttribute('disabled', 'disabled');
		} else {
			this._input.addEventListener('change', readFile, false);
		}

		function readFile() {
			var file = this.files[0];
			if (!/image\/\w+/.test(file.type)) {
				alert("文件必须为图片！");
				return false;
			}
			var reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = function (e) {
				//result.innerHTML = '<img src="'+this.result+'" alt=""/>'

				self.drawCavDown(this.result);

			}
		}
	},

	drawCavDown: function (src) {
		var self = this;
		//清除上一次的
		self._$box.html('');
		self._save = {};
		self._img_show = {};

		self._img = new Image();

		self._img.onload = function () {

			if (!self.imgTrue()) {
				alert('图片大小必须大于:' + self._option.crop_min_width + '*' + self._option.crop_min_height);
				return;
			}
			//让宽或者高撑满
			self.setShowImg();
			self._img_show.scale = self._img_show.width / self._img.width;//缩放比例
			//计算裁剪高亮区域的最小宽高
			self._img_show.min_width = self._option.crop_min_width * self._img_show.scale;
			self._img_show.min_height = self._option.crop_min_height * self._img_show.scale;

			//初始化显示剪裁框宽高,按照宽或者高（更小）的一半显示,如果一半值小于最小可剪裁值，还是按最小剪裁值显示
			var size;
			if (self._img.width > self._img.height) {
				size = self._img.height / 2;
				if (size < self._option.crop_min_height) {
					self.resizeCrop({
						width: self._option.crop_min_width,
						height: self._option.crop_min_height
					});
				} else {
					self.resizeCrop({
						height: size,
						width: size * self._option.crop_scale
					});
				}
			} else {
				size = self._img.width / 2;
				if (size < self._option.crop_min_width) {
					self.resizeCrop({
						width: self._option.crop_min_width,
						height: self._option.crop_min_height
					});
				} else {
					self.resizeCrop({
						height: size / self._option.crop_scale,
						width: size
					});
				}
			}


			//绘制底层剪裁区域
			drawDown();

			//载入上层canvas
			self.addUpCanvas();
			//绑定松开鼠标事件
			$(document).on('mouseup.crop', function () {//在外部松开
				$(document).off('mousemove');
			});
		}

		self._img.src = src;

		function drawDown() {
			var $canvas = $('<canvas width="' + self._img_show.width + '" height="' + self._img_show.height + '"></canvas>');
			self._$box.append($canvas);
			var $ctx = $canvas[0].getContext('2d');
			$ctx.drawImage(self._img, 0, 0, self._img_show.width, self._img_show.height);
			//裁剪区域透明
			$ctx.beginPath();
			$ctx.fillStyle = "rgba(0,0,0,0.6)";
			$ctx.fillRect(0, 0, self._img_show.width, self._img_show.height);

			/*for(var i=1;i<5;i++){
				$ctx.moveTo(self._img_show.width/5*i,0);
				$ctx.lineTo(self._img_show.width/5*i, self._img_show.height);
				$ctx.moveTo(0, self._img_show.height/5*i);
				$ctx.lineTo(self._img_show.width, self._img_show.height/5*i);
				$ctx.strokeStyle="rgba(255,255,255,0.9)";
				$ctx.stroke();
			}*/

			self._$canvasDown = $canvas;
		}

	},

	setResizePoint: function (direction, left, top) {
		return $('<div class="resize-point" style="width:' + this._resize_point.size + 'px;height:' + this._resize_point.size + 'px;' +
			'background: ' + this._resize_point.color + ';cursor:' + direction + ';position:absolute;' +
			'left:' + left + 'px;top:' + top + 'px"></div>');
	},

	addUpCanvas: function () {
		var self = this;
		self.addResizeBtn();//添加放大缩小按钮

		self._ctxUp = self._$canvasUp[0].getContext('2d');
		
		// 确保canvas有正确的定位样式
		// 橙色框应该相对于照片canvas定位，而不是灰色容器框
		var canvasElement = self._$canvasUp[0];
		canvasElement.style.position = 'absolute';
		
		// 获取照片canvas的位置
		var canvasDownRect = self._$canvasDown[0].getBoundingClientRect();
		var boxRect = self._$box[0].getBoundingClientRect();
		
		// 计算相对于灰色容器框的位置（照片canvas在容器中的位置）
		var canvasDownOffsetLeft = canvasDownRect.left - boxRect.left;
		var canvasDownOffsetTop = canvasDownRect.top - boxRect.top;
		
		// 设置初始位置（相对于灰色容器框，但限制在照片范围内）
		canvasElement.style.left = canvasDownOffsetLeft + 'px';
		canvasElement.style.top = canvasDownOffsetTop + 'px';
		
		// 绘制初始重叠部分（位置是相对于照片canvas的，所以是0,0）
		self.drawOverlap(0, 0, self._img_show.crop_width, self._img_show.crop_height);

		self.upCanvasEvent();
	},

	// 绘制重叠部分的辅助函数
	drawOverlap: function(canvasLeft, canvasTop, cropWidth, cropHeight) {
		var self = this;
		
		// 获取底层canvas的实际显示尺寸（考虑CSS缩放）
		var canvasDown = self._$canvasDown[0];
		var canvasDownRect = canvasDown ? canvasDown.getBoundingClientRect() : null;
		var canvasDownDisplayWidth = canvasDownRect ? canvasDownRect.width : self._img_show.width;
		var canvasDownDisplayHeight = canvasDownRect ? canvasDownRect.height : self._img_show.height;
		
		// 计算实际裁剪区域（框与图片重叠的部分）
		// 使用实际显示的canvas尺寸来限制边界
		var cropLeft = Math.max(0, canvasLeft);
		var cropTop = Math.max(0, canvasTop);
		var cropRight = Math.min(canvasDownDisplayWidth, canvasLeft + cropWidth);
		var cropBottom = Math.min(canvasDownDisplayHeight, canvasTop + cropHeight);
		
		var overlapWidth = cropRight - cropLeft;
		var overlapHeight = cropBottom - cropTop;
		
		// 清空canvas
		self._ctxUp.clearRect(0, 0, cropWidth, cropHeight);
		
		// 如果框与图片有重叠部分，才绘制
		if (overlapWidth > 0 && overlapHeight > 0) {
			// 计算实际缩放比例（使用实际显示的尺寸）
			var actualScale = canvasDownDisplayWidth / self._img.width;
			
			// 计算源图片中的位置和大小（使用实际缩放比例）
			var srcLeft = cropLeft / actualScale;
			var srcTop = cropTop / actualScale;
			var srcWidth = overlapWidth / actualScale;
			var srcHeight = overlapHeight / actualScale;
			
			// 计算在canvas上的绘制位置（相对于框的位置）
			var drawLeft = cropLeft - canvasLeft;
			var drawTop = cropTop - canvasTop;
			
			// 只绘制重叠部分
			self._ctxUp.drawImage(self._img,
				srcLeft, srcTop, srcWidth, srcHeight,
				drawLeft, drawTop, overlapWidth, overlapHeight
			);
			
			//实际存储（存储实际裁剪的部分）
			self._save.left = srcLeft;
			self._save.top = srcTop;
			self._save.width = srcWidth;
			self._save.height = srcHeight;
		} else {
			// 如果没有重叠，清空存储
			self._save.left = 0;
			self._save.top = 0;
			self._save.width = 0;
			self._save.height = 0;
		}
	},

	//绑定鼠标按下事件（同时支持触摸事件）
	upCanvasEvent: function () {
		var self = this;
		// 移除旧的事件监听器，避免重复绑定
		self._$canvasUp.off('mousedown touchstart');
		self._$canvasUp.on('mousedown touchstart', cavMouseDown);

		function cavMouseDown(e) {
			e.preventDefault(); // 防止默认行为
			var canv = this;

			// 判断是触摸事件还是鼠标事件
			var isTouch = e.type === 'touchstart' || (e.originalEvent && e.originalEvent.type === 'touchstart');
			var clientX = isTouch ? (e.originalEvent ? e.originalEvent.touches[0].clientX : e.touches[0].clientX) : e.clientX;
			var clientY = isTouch ? (e.originalEvent ? e.originalEvent.touches[0].clientY : e.touches[0].clientY) : e.clientY;

			// 获取当前canvas的位置（相对于父元素）
			var currentLeft = parseFloat($(canv).css('left')) || 0;
			var currentTop = parseFloat($(canv).css('top')) || 0;
			
			// 获取按下时相对于canvas的位置
			// 使用照片canvas的位置作为参考，而不是灰色容器框
			var canvasRect = canv.getBoundingClientRect();
			var canvasDownRect = self._$canvasDown[0].getBoundingClientRect();
			
			// 计算相对于照片canvas的位置
			var relativeOffset = {
				x: clientX - canvasRect.left,
				y: clientY - canvasRect.top
			};

			// 移动事件处理函数
			function handleMove(e) {
				e.preventDefault();
				var moveClientX = isTouch ? (e.originalEvent ? e.originalEvent.touches[0].clientX : e.touches[0].clientX) : e.clientX;
				var moveClientY = isTouch ? (e.originalEvent ? e.originalEvent.touches[0].clientY : e.touches[0].clientY) : e.clientY;
				
				var newPos = countPosition(moveClientX, moveClientY);
				
				// 获取照片canvas和灰色容器框的位置
				var canvasDownRect = self._$canvasDown[0].getBoundingClientRect();
				var boxRect = self._$box[0].getBoundingClientRect();
				
				// 计算照片canvas相对于灰色容器框的偏移
				var canvasDownOffsetLeft = canvasDownRect.left - boxRect.left;
				var canvasDownOffsetTop = canvasDownRect.top - boxRect.top;
				
				// 移动上层canvas（位置是相对于灰色容器框的，需要加上照片canvas的偏移）
				canv.style.left = (canvasDownOffsetLeft + newPos.left) + 'px';
				canv.style.top = (canvasDownOffsetTop + newPos.top) + 'px';

				// 绘制重叠部分（newPos是相对于照片canvas的位置）
				self.drawOverlap(newPos.left, newPos.top, self._img_show.crop_width, self._img_show.crop_height);

				//设置缩放按钮位置
				self.resizePosition();

				function countPosition(clientX, clientY) {
					// 获取底层canvas（照片）的实际显示位置和尺寸
					var canvasDown = self._$canvasDown[0];
					var canvasDownRect = canvasDown.getBoundingClientRect();
					
					// 计算相对于照片canvas的位置（而不是相对于灰色容器框）
					var mouseX = clientX - canvasDownRect.left;
					var mouseY = clientY - canvasDownRect.top;
					
					// 计算新的canvas位置（位置减去相对偏移）
					var left = mouseX - relativeOffset.x;
					var top = mouseY - relativeOffset.y;
					
					// 使用照片canvas的实际显示尺寸来限制边界
					var canvasDownDisplayWidth = canvasDownRect.width;
					var canvasDownDisplayHeight = canvasDownRect.height;
					var maxLeft = Math.max(0, canvasDownDisplayWidth - self._img_show.crop_width);
					var maxTop = Math.max(0, canvasDownDisplayHeight - self._img_show.crop_height);
					
					// 限制在照片范围内
					left = Math.max(0, Math.min(left, maxLeft));
					top = Math.max(0, Math.min(top, maxTop));
					
					return { left: left, top: top };
				}
			}
			
			// 结束事件处理函数
			function handleEnd(e) {
				e.preventDefault();
				$(document).off(isTouch ? 'touchmove.crop' : 'mousemove.crop');
				$(document).off(isTouch ? 'touchend.crop touchcancel.crop' : 'mouseup.crop');
			}

			// 绑定移动和结束事件
			if (isTouch) {
				$(document).on('touchmove.crop', handleMove);
				$(document).on('touchend.crop touchcancel.crop', handleEnd);
			} else {
				$(document).on('mousemove.crop', handleMove);
				$(document).on('mouseup.crop', handleEnd);
			}
		}
	},

	addResizeBtn: function () {
		var self = this;
		//载入方向按钮
		var $seResize = self.setResizePoint('se-resize', self._img_show.crop_width - self._resize_point.size / 2, self._img_show.crop_height - self._resize_point.size / 2);
		var $swResize = self.setResizePoint('sw-resize', -self._resize_point.size / 2, self._img_show.crop_height - self._resize_point.size / 2);
		var $neResize = self.setResizePoint('ne-resize', self._img_show.crop_width - self._resize_point.size / 2, -self._resize_point.size / 2);
		var $nwResize = self.setResizePoint('nw-resize', -self._resize_point.size / 2, -self._resize_point.size / 2);

		var $canvas = $('<canvas class="overlay" width="' + self._img_show.crop_width + '" height="' + self._img_show.crop_height + '"></canvas>');

		self._$box.append($canvas);
		self._$canvasUp = $canvas;

		self._$box.append($seResize);
		self._$box.append($swResize);
		self._$box.append($neResize);
		self._$box.append($nwResize);

		self._resize_btn.$se = $seResize;
		self._resize_btn.$sw = $swResize;
		self._resize_btn.$ne = $neResize;
		self._resize_btn.$nw = $nwResize;

		self.resizeEvent();
	},

	//绑定方向按钮事件（同时支持触摸事件）
	resizeEvent: function () {
		var self = this;
		$('.resize-point').off('mousedown touchstart');
		$('.resize-point').on('mousedown touchstart', function (e) {
			e.preventDefault();
			
			// 判断是触摸事件还是鼠标事件
			var isTouch = e.type === 'touchstart' || (e.originalEvent && e.originalEvent.type === 'touchstart');
			var clientX = isTouch ? (e.originalEvent ? e.originalEvent.touches[0].clientX : e.touches[0].clientX) : e.clientX;
			var clientY = isTouch ? (e.originalEvent ? e.originalEvent.touches[0].clientY : e.touches[0].clientY) : e.clientY;

			var pLeft = $(this).position().left + self._resize_point.size / 2,
				pTop = $(this).position().top + self._resize_point.size / 2;
			var upLeft = self._$canvasUp.position().left,
				upTop = self._$canvasUp.position().top;
			var noChangeX, noChangeY;
			if (upLeft >= pLeft) noChangeX = -(upLeft + self._img_show.crop_width);//为负在右
			else noChangeX = upLeft;
			if (upTop >= pTop) noChangeY = -(upTop + self._img_show.crop_height);//为负在下
			else noChangeY = upTop;

			// 移动事件处理函数
			function handleResizeMove(e) {
				e.preventDefault();
				var moveClientX = isTouch ? (e.originalEvent ? e.originalEvent.touches[0].clientX : e.touches[0].clientX) : e.clientX;
				var moveClientY = isTouch ? (e.originalEvent ? e.originalEvent.touches[0].clientY : e.touches[0].clientY) : e.clientY;
				
				// 计算新的框大小
				var mousePos = countPosition(moveClientX, moveClientY);
				self._img_show.crop_width = Math.abs(Math.abs(noChangeX) - mousePos.left);
				self._img_show.crop_height = self._img_show.crop_width / self._option.crop_scale;
				
				// 如果宽高小于限制
				if (self._img_show.crop_width < self._img_show.min_width) {
					self._img_show.crop_width = self._img_show.min_width;
					self._img_show.crop_height = self._img_show.crop_width / self._option.crop_scale;
				}
				if (self._img_show.crop_height < self._img_show.min_height) {
					self._img_show.crop_height = self._img_show.min_height;
					self._img_show.crop_width = self._img_show.crop_height / self._option.crop_scale;
				}

				// 计算新位置
				var newLeft = noChangeX >= 0 ? noChangeX : (Math.abs(noChangeX) - self._img_show.crop_width);
				var newTop = noChangeY >= 0 ? noChangeY : (Math.abs(noChangeY) - self._img_show.crop_height);

				// 获取底层canvas的实际显示尺寸（考虑CSS缩放）
				var canvasDown = self._$canvasDown[0];
				var canvasDownRect = canvasDown.getBoundingClientRect();
				var canvasDownDisplayWidth = canvasDownRect.width;
				var canvasDownDisplayHeight = canvasDownRect.height;
				
				// 使用实际显示的canvas尺寸来限制边界
				var maxLeft = Math.max(0, canvasDownDisplayWidth - self._img_show.crop_width);
				var maxTop = Math.max(0, canvasDownDisplayHeight - self._img_show.crop_height);
				
				// 限制在图片范围内
				newLeft = Math.max(0, Math.min(newLeft, maxLeft));
				newTop = Math.max(0, Math.min(newTop, maxTop));
				
				// 如果调整大小后超出边界，调整大小
				if (newLeft + self._img_show.crop_width > canvasDownDisplayWidth) {
					self._img_show.crop_width = canvasDownDisplayWidth - newLeft;
					self._img_show.crop_height = self._img_show.crop_width / self._option.crop_scale;
					// 重新检查最小尺寸
					if (self._img_show.crop_width < self._img_show.min_width) {
						self._img_show.crop_width = self._img_show.min_width;
						self._img_show.crop_height = self._img_show.crop_width / self._option.crop_scale;
						newLeft = Math.max(0, canvasDownDisplayWidth - self._img_show.crop_width);
					}
				}
				if (newTop + self._img_show.crop_height > canvasDownDisplayHeight) {
					self._img_show.crop_height = canvasDownDisplayHeight - newTop;
					self._img_show.crop_width = self._img_show.crop_height * self._option.crop_scale;
					// 重新检查最小尺寸
					if (self._img_show.crop_height < self._img_show.min_height) {
						self._img_show.crop_height = self._img_show.min_height;
						self._img_show.crop_width = self._img_show.crop_height * self._option.crop_scale;
						newTop = Math.max(0, canvasDownDisplayHeight - self._img_show.crop_height);
					}
				}

				// 获取照片canvas和灰色容器框的位置
				var canvasDownRect = self._$canvasDown[0].getBoundingClientRect();
				var boxRect = self._$box[0].getBoundingClientRect();
				
				// 计算照片canvas相对于灰色容器框的偏移
				var canvasDownOffsetLeft = canvasDownRect.left - boxRect.left;
				var canvasDownOffsetTop = canvasDownRect.top - boxRect.top;
				
				// 设置canvas大小和位置（直接设置style属性以覆盖CSS的!important）
				// newLeft和newTop是相对于照片canvas的位置，需要加上照片canvas的偏移
				self._$canvasUp.attr("width", self._img_show.crop_width);
				self._$canvasUp.attr("height", self._img_show.crop_height);
				var canvasElement = self._$canvasUp[0];
				canvasElement.style.left = (canvasDownOffsetLeft + newLeft) + 'px';
				canvasElement.style.top = (canvasDownOffsetTop + newTop) + 'px';

				// 绘制重叠部分
				self.drawOverlap(newLeft, newTop, self._img_show.crop_width, self._img_show.crop_height);

				self.resizePosition();

				function countPosition(clientX, clientY) {//在底层canvas（照片）的相对位置
					// 使用照片canvas的位置，而不是灰色容器框
					var canvasDownRect = self._$canvasDown[0].getBoundingClientRect();
					var left = clientX - canvasDownRect.left;
					var top = clientY - canvasDownRect.top;
					return { left: left, top: top }
				}
			}
			
			// 结束事件处理函数
			function handleResizeEnd(e) {
				e.preventDefault();
				$(document).off(isTouch ? 'touchmove.resize' : 'mousemove.resize');
				$(document).off(isTouch ? 'touchend.resize touchcancel.resize' : 'mouseup.resize');
			}

			// 绑定移动和结束事件
			if (isTouch) {
				$(document).on('touchmove.resize', handleResizeMove);
				$(document).on('touchend.resize touchcancel.resize', handleResizeEnd);
			} else {
				$(document).on('mousemove.resize', handleResizeMove);
				$(document).on('mouseup.resize', handleResizeEnd);
			}

		});

	},
	resizePosition: function () {
		var self = this;
		self._resize_btn.$se.css({ left: self._$canvasUp.position().left + self._img_show.crop_width - self._resize_point.size / 2, top: self._$canvasUp.position().top + self._img_show.crop_height - self._resize_point.size / 2 });//加上宽高,减去本身大小
		self._resize_btn.$sw.css({ left: self._$canvasUp.position().left - self._resize_point.size / 2, top: self._$canvasUp.position().top + self._img_show.crop_height - self._resize_point.size / 2 });//加上宽高,减去本身大小
		self._resize_btn.$ne.css({ left: self._$canvasUp.position().left + self._img_show.crop_width - self._resize_point.size / 2, top: self._$canvasUp.position().top - self._resize_point.size / 2 });//加上宽高,减去本身大小
		self._resize_btn.$nw.css({ left: self._$canvasUp.position().left - self._resize_point.size / 2, top: self._$canvasUp.position().top - self._resize_point.size / 2 });//加上宽高,减去本身大小
	},
	parseInt: function () {
		this._save.width = parseInt(this._save.width);
		this._save.height = parseInt(this._save.height);
		this._save.top = parseInt(this._save.top);
		this._save.left = parseInt(this._save.left);
	},
	//保存
	save: function () {
		this.parseInt();//取整，避免出现杂边线条
		var self = this;
		// var $result = $("<canvas class='result_pic' width='" + self._save.width + "' height='" + self._save.height + "'></canvas><button class='delete_button'>删除此项</button>");
		// $('#mylist').append($result);
		// $result[0].getContext('2d').drawImage(self._img,
		// 	self._save.left, self._save.top, self._save.width, self._save.height,
		// 	0, 0, self._save.width, self._save.height
		// );
		addToList(self._save.left, self._save.top, self._save.width, self._save.height, self._img);

		// var base64Url = $result[0].toDataURL('image/jpeg');

		// saveCallBack && saveCallBack(base64Url);

		// return base64Url;
	},

	//显示的图片大小,三种结果，撑满宽或者高，或者原图大小
	setShowImg: function () {
		if (this._img.width <= this._option.crop_box_width && this._img.height <= this._option.crop_box_height) {
			this._img_show.width = this._img.width;
			this._img_show.height = this._img.height;
			return;
		}

		var weight = 0;//设置权重
		if (this._img.width > this._option.crop_box_width) weight += 10;
		if (this._img.height > this._option.crop_box_height) weight -= 10;
		if (this._img.width / this._img.height > this._option.crop_box_width / this._option.crop_box_height) weight += 5;
		else weight -= 5;
		if (this._img.width >= this._img.height) weight++;
		else weight--;

		if (weight > 0) {//撑满宽度
			this._img_show.width = this._option.crop_box_width;
			this._img_show.height = this._option.crop_box_width / (this._img.width / this._img.height);
		} else {//撑满高度
			this._img_show.height = this._option.crop_box_height;
			this._img_show.width = this._option.crop_box_height / (this._img.height / this._img.width);
		}
	},

	resizeCrop: function (real) {//剪裁框大小
		this._img_show.crop_width = real.width * this._img_show.scale;
		this._img_show.crop_height = real.height * this._img_show.scale;
	}

}
