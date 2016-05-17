
// 加载 JS 模块
import $ from 'jquery';
import {Utils as utils} from 'utils'; 
import {formTemplate, loaderTemplate} from './templates';
import 'jqueryui';

// 加载 CSS 模块
import 'layout-css';

// 变量初始化
let [
		CACHE, 
		MARKERS, // 存储 place id 跟 marks 的对应关系
		map, 
		encode, 
		decode,
		drivePath
	] = [
		{}, 
		{}, 
		null, 
		encodeURIComponent, 
		decodeURIComponent,
		null
	];

let mapBox = document.getElementById('map-wrap'), 
	$mapBox = $(mapBox), 
	$sider = $('#sidebar'),
	infoSource = {}, 	// 存储 place id 和信息窗口的对应关系 方便窗口管理如关闭
	latlngSource = {}; 	// 存储 place id 和经纬度对象的对应关系 方便根据 place id 获取 经纬度

// 引用谷歌地图导向 API
let directionsDisplay = new google.maps.DirectionsRenderer;
let directionsService = new google.maps.DirectionsService();
let geocoder = new google.maps.Geocoder();

let publisher = new utils().makePublisher({
	// 内容初始化
	content : function(){
		//大阪
		let osaka = {lng : 135.3 , lat :34.4};
		let form = $(formTemplate).get(0);
		map = new google.maps.Map(mapBox, {
		    center: osaka,
		    zoom: 7,
		    zoomControl: true,
		    mapTypeControl: true,
		    scaleControl: true,
		    streetViewControl: true,
		    rotateControl: true
		});

		// 在地图上布局表单
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(form);

		// 注册表单事件
		this.formLister();
	},

	// 绑定表单事件
	formLister : ()=>{
		$(mapBox).on('click', '.item', function(e){
			var target = e.target;
			if(target.tagName.toLowerCase() === 'input'){
				let type = $(this).data('type'), check = this.checked;
				if($(target).prop('checked')){
					publisher.loading.show();
					// 从后台查询点相关信息
					publisher.fetch(type, function(data){
						// 绘制点
						this.paint(data, type);
					}.bind(publisher));
				}
				else {
					publisher.removeMarks(type);
				}
			}
		})
	},

	// 绘制 根据中文地址 获取地点经纬度
	// 后端返回的数据分2组处理: 
	// 1/已经获得经纬度的点直接在地图上绘制
	// 2/未获得经纬度的点由前端直接获取，之后再入库 单秒不能超过10次请求 每日不等超过2500次请求
	paint : function(data, type){
		var promises = [], rich = [], poor = [], pool = [], max = 0;
		data.forEach((v, i)=>{
			// 检测数据库中是否已经录入了地址经纬度
			if(!v.place_id){
				//promises.push(this.geocode(v));
				poor.push(v);
			}
			else {
				rich.push(v);
			}
		})

		rich.forEach((v, i)=>{
			makeMarkersAndInfoHandler.call(publisher, v);
		});

		this.loading.hide();

		traverse.call(publisher);
		
		// 部署 promise 对象，当且仅当后台没有录入地点经纬度的情况下 前台至谷歌 API 获取经纬度的所有请求完成时执行
		// promises.length && Promise.all(promises).then((posts)=>{
		// 	posts.forEach((v, i)=>{
		// 		v.lat = v.lnglat.lat();
		// 		v.lng = v.lnglat.lng();

		// 		makeMarkersAndInfoHandler.call(publisher, v);
				
		// 		// 将通过geocode 获取的地点数据存入内部数据库
		// 		this.put({
		// 			lat : v.lat,
		// 			lng : v.lng,
		// 			type : v.type,
		// 			place_id : v.place_id,
		// 			id : v.id
		// 		});
		// 	})
			
		// 	if(poor.length){
		// 		setTimeout(()=>{
		// 			traverse.call(publisher);
		// 		}, 1000)
		// 	}
		// 	else {
		// 		let bounds = new google.maps.LatLngBounds();
		// 		$.each(latlngSource, (i, v)=>{
		// 			bounds.extend(v);
		// 		})
		// 		map.fitBounds(bounds);
		// 		this.loading.hide();
		// 	}
		// }, (post)=>{
		// 	this.loading.hide();
		// 	poor.length && setTimeout(()=>{
		// 		traverse.call(publisher);
		// 	}, 1000)
		// })
		// .catch(function(err){
		// 	console.log('promise err all--' + err);
		// })

		function traverse(){
			this.loading.show();
			if(poor.length){
				this.geocode(poor[0], (post) => {
					makeMarkersAndInfoHandler.call(this, post);
					this.put({
						lat : post.lat,
						lng : post.lng,
						type : post.type,
						place_id : post.place_id,
						id : post.id
					});
					setTimeout(()=>{
						traverse.call(this);
						poor.shift();
					}, 300)
				}, ()=>{
					setTimeout(()=>{
						traverse.call(this);
						poor.shift();
					}, 300)
				})
			}
			else {
				this.loading.hide();
			}

		}

		// 绘制
		function makeMarkersAndInfoHandler(v){
			var link = v.jump_url, name = v.cn_name, lng = v.lng, lat = v.lat, address = v.address, id = v.place_id;
			var _address = decode(address), latlng = new google.maps.LatLng(lat, lng);
			var infoTemplate = `
				<div class='info'>
					<h3>${name}</h3>
					<p>${address}</p>
					<a href="${link}" target="_blank">查看详情</a>
					<a href="javascript:;" target="_blank">查看附近</a>
					<a href='javascript:;' data-type='${type}' id='${id}' data-name='${name}' data-lng='${lng}' data-lat='${lat}' data-_address='${_address}' class="route">添加到行程</a>
				</div>`;
			this.makeMarks(latlng, type, infoTemplate, id);
			latlngSource[id] = latlng;
		}

		let bounds = new google.maps.LatLngBounds();
		$.each(latlngSource, (i, v)=>{
			bounds.extend(v);
		})
		map.fitBounds(bounds);
	},

	// 根据经纬度 标记类型 标记窗口的文本 生成点标记
	makeMarks : (lnglat, type, content, id)=> {
		let marker = new google.maps.Marker({
			position : lnglat,
			animation: google.maps.Animation.DROP,
			icon : publisher.makeIcon(type, 1)
		})

		// 缓存该类型的标记 用于之后的清除
		if(!CACHE[type]){
			CACHE[type] = [];
		}

		CACHE[type].push(marker);

		marker.setMap(map);
		
		let infowindow = new google.maps.InfoWindow({
		    content: content
		});

		infoSource[id] = infowindow;

		// infowindow.open(map, marker);
		marker.addListener('click', ()=>{
		    infowindow.open(map, marker);
		});

		MARKERS[id] = marker;
	},

	// 清除标记
	removeMarks : (type)=>{
		CACHE[type].map((v, i)=>{
			v.setMap(null);
		})
		delete CACHE[type];
	},

	// 加载状态
	loading : {
		show : function(){
			if(!this.ins){
				this.ins = $(loaderTemplate).appendTo('#map-wrap');
			}
		},
		hide : function(){
			this.ins.remove();
			delete this.ins;
		}
	},

	// 添加到行程 将地点添加到行程面板
	addToPanel : function(){
		var self = this;
		$mapBox.on('click', '.route', function(){
			let $this = $(this), lng = $this.data('lng'), lat = $this.data('lat'), name = $this.data('name'), _address = $this.data('_address');
			let type = $this.data('type');
			let count = $sider.find('.lines').length;
			let id = $this.attr('id');
			let html = count >= 1 ?
						`<section class='lines' data-type="${type}" data-id="${id}" data-lat="${lat}" data-lng="${lng}">
							<div class="distance">距离:待测 自驾时长:待测</div>
							<div class="spot">
								<a href="javascript:;" class="delete">删除</a>
								<h4>${name}</h4>
							</div>
						</section>` :
						`<section class='lines' data-type="${type}" data-id=${id} data-lat=${lat} data-lng=${lng}>
							<div class="spot">
								<a href="javascript:;" class="delete">删除</a>
								<h4>${name}</h4>
							</div>
						</section>`;

			// 是否已添加过
			if($sider.find(`.lines[data-id="${id}"]`).length){
				return;
			}

			// 查询插入的位置
			if(!$sider.find('.lines.now').length){
				$sider.append(html);
			}
			else {
				$sider.find('.lines.now').after(html);
			}

			// if($this.data('status') == 1){
			// 	return;
			// }

			// $this.html('已经添加').data('status', 1).addClass('disable');
			// $sider.append(html);

			infoSource[id].close();
		})
	},

	// 规划线路
	calculate : function(){
		$('#caculate-btn').click(()=>{
			// 绘制导航路线
			this.calculateAndDisplayRoute();
		})
	},

	// 导向
	calculateAndDisplayRoute : function(){
		let nodes = $sider.find('.lines');
		let count = nodes.length;
		let waypts = [];

		if(count >= 2){
			let start = latlngSource[nodes.eq(0).data('id')];
			let end = latlngSource[nodes.eq(count - 1).data('id')];
			let points = nodes.slice(1, -1);

			$.each(points, function(i, v){
				waypts.push({
					// 指定路径点的地址
					location : latlngSource[v.getAttribute('data-id')], 
					// 是否停靠
					stopover : true 
				});
			})
			this.loading.show();
			// 发起路线请求
			directionsService.route({
			    	origin: start,
			    	destination: end,
			    	waypoints: waypts,
	            	optimizeWaypoints: true,
			    	travelMode: google.maps.TravelMode.DRIVING
				}, 
				(response, status)=> {
					this.loading.hide();
				    if (status === google.maps.DirectionsStatus.OK) {
				        let legs = response.routes[0].legs;
				        let $distance = $sider.find('.distance');
				        legs.map((v, i)=>{
				        	let time = v['duration'].text,
				        		distance = v['distance'].text;
				        	$distance.eq(i).html(`距离:${distance} 自驾时长${time}`);
				        })
				        //directionsDisplay.setMap(map);
				        //directionsDisplay.setDirections(response);
				        publisher.drawPath(response);

				    } else {
				        console.log('Directions request failed due to ' + status);
				    }
			});
		}
		else {
			//directionsDisplay.setMap(null);
			if(drivePath){
				drivePath.setMap(null);
			}
		}
	},

	// 获取数据
	fetch : function(type, cb = function(){}){
		$.when(
			$.ajax({
				url : 'http://api.yqqjp.com/index.php?c=data&a=list&type=' + type,
				dataType : 'jsonp',
				jsonp : 'cb'
			})
		)
		.done(function(res){
			if(res.code == 0){
				cb(res.info);
			}
		})
	},

	// 更新数据库数据
	put : function(opts){
		let params = [
			'type=' + opts.type, 
			'id=' + opts.id, 
			'place_id=' + opts.place_id, 
			'lat=' +  opts.lat,
			'lng=' + opts.lng
		];

		$.ajax({
			url : 'http://api.yqqjp.com/index.php?c=data&a=editmap&' + params.join('&'),
			type : 'get',
			dataType : 'jsonp',
			jsonp : 'cb'
		})
	},

	// 地址编码
	geocode : function(value, success = function(){}, failed = function(){}){
		let promise = new Promise((resolve, reject) => {
			geocoder.geocode({ 
					'address': value['address'],
					componentRestrictions : {
						country : 'JP'
					},
					region : 'JP'
				}, (results, status) => {
				    if (status === google.maps.GeocoderStatus.OK) {
				        var lnglat = results[0].geometry.location;
				        resolve(Object.assign(value, {
					        	lnglat : lnglat, 
					        	lat : lnglat.lat(),
					        	lng : lnglat.lng(),
					        	place_id : results[0].place_id
				        	})
				        );
				    } else {
				        console.log('地理位置解析失败(geocoder) 失败原因: ' + status, value);
				    	reject('reject');
				    }
				}
			);
		})

		promise.then(
			(post) => {success(post)},
			(post) => {failed(post)}
		)
		return promise;
	},


	// 绘制 折线
	drawPath : function(response){
		let legs = response.routes[0].legs;
		let coordinates = (function(){
			let ret = [];
			legs.forEach((v, i)=>{
				v['steps'].forEach((value, index)=>{
					ret.push(value['start_location'], value['end_location']);
				});
			})
			return ret;
		})();

		if(drivePath){
			drivePath.setMap(null);
		}

		drivePath = new google.maps.Polyline({
		    path: coordinates,
		    geodesic: true,
		    strokeColor: '#FF0000',
		    strokeOpacity: 0.8,
		    strokeWeight: 2
		});

		drivePath.setMap(map);
	},

	// 侧栏管理
	sideBarMannger : function(){
		let self = this;
		$sider.on('click', '.delete', function(){
			let $section = $(this).closest('.lines'), id = $section.data('id');
			let $next = $section.next('.lines'),
				$prev = $section.prev('.lines');

			// $('#' + id).html('添加到行程').data('status', 0).removeClass('disable');
			if(!$prev.length && $next.length){
				$next.find('.distance').remove();
			}
			$section.remove();
			self.calculateAndDisplayRoute();
		})
		// 点击高亮
		.on('click', '.lines', function(){
			if(!$(this).hasClass('now')){
				$(this).addClass('now').siblings().removeClass('now');
			}
			else {
				$(this).removeClass('now');
			}
		})
		.on('mouseenter', '.lines', function(){
			let id = $(this).data('id'), type = $(this).data('type');
			MARKERS[id].setAnimation(google.maps.Animation.BOUNCE);
		})
		.on('mouseleave', '.lines', function(){
			let id = $(this).data('id'), type = $(this).data('type');
			MARKERS[id].setAnimation(null);
		})
	},

	// 拖放
	sortable : function(){
		$sider.sortable({
       		placeholder: "state-highlight",
       		update : (e, ui)=>{
       			let $item = ui.item;
       			this.calculateAndDisplayRoute();
       			if(!$item.prev().length){
       				$item.find('.distance').prependTo($item.next());
       			}
       		}
		})
	},


	// icon 生成器 返回对应类型的 icon 配置
	// type 类型 
	// status 状态  1 选中状态 0 默认状态
	makeIcon : (type, status)=>{
		let xAxis = {'0' : 30, '1' : 0}, 
			yAxis = {
				'hotel' : 190,
				'cate' : 152
			};

		return {
			url : 'http://static.qyer.com/static/plan/new/project/web/plan/img/pin.png',
			size : new google.maps.Size(30, 38),
			origin : {
				x : xAxis[status], 
				y : yAxis[type]
			}
		};
	},

	// 工具函数 用来等分数组
	devide : (haystack, piece)=>{
		var max = parseInt(haystack.length / piece);
		var ret = [];
		
		for(var i = 0; i <= max; i++){
			ret.push(haystack.splice(0, piece));
		}

		return ret;
	}

}, ['content', 'addToPanel', 'calculate', 'sideBarMannger', 'sortable']);

publisher.init();
