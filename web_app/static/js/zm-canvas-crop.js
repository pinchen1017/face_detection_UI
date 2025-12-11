
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
		if (!self._$canvasUp.css('position')) {
			self._$canvasUp.css('position', 'absolute');
		}
		
		// 设置初始位置（直接设置style属性）
		var canvasElement = self._$canvasUp[0];
		canvasElement.style.position = 'absolute';
		canvasElement.style.left = '0px';
		canvasElement.style.top = '0px';
		
		// 绘制初始重叠部分
		self.drawOverlap(0, 0, self._img_show.crop_width, self._img_show.crop_height);

		self.upCanvasEvent();
	},

	// 绘制重叠部分的辅助函数
	drawOverlap: function(canvasLeft, canvasTop, cropWidth, cropHeight) {
		var self = this;
		
		// 计算实际裁剪区域（框与图片重叠的部分）
		var cropLeft = Math.max(0, canvasLeft);
		var cropTop = Math.max(0, canvasTop);
		var cropRight = Math.min(self._img_show.width, canvasLeft + cropWidth);
		var cropBottom = Math.min(self._img_show.height, canvasTop + cropHeight);
		
		var overlapWidth = cropRight - cropLeft;
		var overlapHeight = cropBottom - cropTop;
		
		// 清空canvas
		self._ctxUp.clearRect(0, 0, cropWidth, cropHeight);
		
		// 如果框与图片有重叠部分，才绘制
		if (overlapWidth > 0 && overlapHeight > 0) {
			// 计算源图片中的位置和大小
			var srcLeft = cropLeft / self._img_show.scale;
			var srcTop = cropTop / self._img_show.scale;
			var srcWidth = overlapWidth / self._img_show.scale;
			var srcHeight = overlapHeight / self._img_show.scale;
			
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

	//绑定鼠标按下事件
	upCanvasEvent: function () {
		var self = this;
		// 移除旧的事件监听器，避免重复绑定
		self._$canvasUp.off('mousedown');
		self._$canvasUp.on('mousedown', cavMouseDown);

		function cavMouseDown(e) {
			e.preventDefault(); // 防止默认行为
			var canv = this;

			// 获取当前canvas的位置（相对于父元素）
			var currentLeft = parseFloat($(canv).css('left')) || 0;
			var currentTop = parseFloat($(canv).css('top')) || 0;
			
			// 获取鼠标按下时相对于canvas的位置
			var canvasRect = canv.getBoundingClientRect();
			var boxRect = self._$box[0].getBoundingClientRect();
			var relativeOffset = {
				x: e.clientX - canvasRect.left,
				y: e.clientY - canvasRect.top
			};

			$(document).on('mousemove.crop', function (e) {
				e.preventDefault();
				var newPos = countPosition();
				
				// 移动上层canvas（直接设置style属性以覆盖CSS的!important）
				canv.style.left = newPos.left + 'px';
				canv.style.top = newPos.top + 'px';

				// 绘制重叠部分
				self.drawOverlap(newPos.left, newPos.top, self._img_show.crop_width, self._img_show.crop_height);

				//设置缩放按钮位置
				self.resizePosition();

				function countPosition() {
					// 重新获取box的位置（因为页面可能滚动）
					var currentBoxRect = self._$box[0].getBoundingClientRect();
					
					// 计算鼠标相对于父容器(.canvas-box)的位置
					var mouseX = e.clientX - currentBoxRect.left;
					var mouseY = e.clientY - currentBoxRect.top;
					
					// 计算新的canvas位置（鼠标位置减去相对偏移）
					var left = mouseX - relativeOffset.x;
					var top = mouseY - relativeOffset.y;
					
					// 限制在图片范围内
					left = Math.max(0, Math.min(left, self._img_show.width - self._img_show.crop_width));
					top = Math.max(0, Math.min(top, self._img_show.height - self._img_show.crop_height));
					
					return { left: left, top: top };
				}
			});
			
			// 鼠标松开时移除事件监听器
			$(document).on('mouseup.crop', function() {
				$(document).off('mousemove.crop');
				$(document).off('mouseup.crop');
			});
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

	//绑定方向按钮事件
	resizeEvent: function () {
		var self = this;
		$('.resize-point').on('mousedown', function () {

			var pLeft = $(this).position().left + self._resize_point.size / 2,
				pTop = $(this).position().top + self._resize_point.size / 2;
			var upLeft = self._$canvasUp.position().left,
				upTop = self._$canvasUp.position().top;
			var noChangeX, noChangeY;
			if (upLeft >= pLeft) noChangeX = -(upLeft + self._img_show.crop_width);//为负在右
			else noChangeX = upLeft;
			if (upTop >= pTop) noChangeY = -(upTop + self._img_show.crop_height);//为负在下
			else noChangeY = upTop;

			$(document).on('mousemove.resize', function (e) {
				e.preventDefault();
				// 计算新的框大小
				var mousePos = countPosition();
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

				// 限制在图片范围内
				newLeft = Math.max(0, Math.min(newLeft, self._img_show.width - self._img_show.crop_width));
				newTop = Math.max(0, Math.min(newTop, self._img_show.height - self._img_show.crop_height));
				
				// 如果调整大小后超出边界，调整大小
				if (newLeft + self._img_show.crop_width > self._img_show.width) {
					self._img_show.crop_width = self._img_show.width - newLeft;
					self._img_show.crop_height = self._img_show.crop_width / self._option.crop_scale;
				}
				if (newTop + self._img_show.crop_height > self._img_show.height) {
					self._img_show.crop_height = self._img_show.height - newTop;
					self._img_show.crop_width = self._img_show.crop_height * self._option.crop_scale;
				}

				// 设置canvas大小和位置（直接设置style属性以覆盖CSS的!important）
				self._$canvasUp.attr("width", self._img_show.crop_width);
				self._$canvasUp.attr("height", self._img_show.crop_height);
				var canvasElement = self._$canvasUp[0];
				canvasElement.style.left = newLeft + 'px';
				canvasElement.style.top = newTop + 'px';

				// 绘制重叠部分
				self.drawOverlap(newLeft, newTop, self._img_show.crop_width, self._img_show.crop_height);

				self.resizePosition();

				function countPosition() {//鼠标在底层canvas的相对位置
					var boxRect = self._$box[0].getBoundingClientRect();
					var left = e.clientX - boxRect.left;
					var top = e.clientY - boxRect.top;
					return { left: left, top: top }
				}

			});
			
			// 鼠标松开时移除事件监听器
			$(document).on('mouseup.resize', function() {
				$(document).off('mousemove.resize');
				$(document).off('mouseup.resize');
			});

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
