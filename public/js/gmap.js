
// 加载 JS 模块
import $ from 'jquery';
import {Utils as utils} from 'utils'; 
import DATA from './data';
import {formTemplate, loaderTemplate} from './templates';
import 'jqueryui';

// 加载 CSS 模块
import 'layout-css';

// 变量初始化
let [
		CACHE, 
		POINTS, 
		map, 
		encode, 
		decode,
		drivePath
	] = [
		{}, 
		[], 
		null, 
		encodeURIComponent, 
		decodeURIComponent,
		null
	];

let mapBox = document.getElementById('map-wrap'), 
	$mapBox = $(mapBox), 
	$sider = $('#sidebar'),
	infoSource = {};

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
					publisher.paint(type);
				}
				else {
					publisher.removeMarks(type);
				}
			}
		})
	},

	// 绘制 根据中文地址 获取地点经纬度
	paint : function(type){
		let data = DATA[type], lnglat;
		
		this.loading.show();

		let promises = data.map((v, i)=>{
			let promise = new Promise((resolve, reject) => {
				geocoder.geocode({ 'address': v['address'] }, (results, status) => {
				    if (status === google.maps.GeocoderStatus.OK) {
				        lnglat = results[0].geometry.location;
				        resolve({
				        	lnglat : lnglat, 
				        	content : v['name'],
				        	address : v['address'],
				        	place_id : results[0].place_id,
				        	link : v['link']
				        });
				    } else {
				        alert('地理位置解析失败(geocoder) 失败原因: ' + status);
				    }
				});
			})

			promise.then((data)=>{
				let link = data.link, name = data.content, lng = data.lnglat.lng(), lat = data.lnglat.lat(), address = data.address, id = data.place_id;
				let _address = decode(address);
				let infoTemplate = `
					<div class='info'>
						<h3>${name}</h3>
						<p>地点描述文字...<p>
						<p>${address}</p>
						<a href="${link}" target="_blank">查看详情</a>
						<a href="javascript:;" target="_blank">查看附近</a>
						<a href='javascript:;' id=${id} data-name=${name} data-lng=${lng} data-lat=${lat} data-_address=${_address} class="route">添加到行程</a>
					</div>`;
				this.makeMarks(data.lnglat, type, infoTemplate, id);
			})

			return promise;
		})

		// 视图自适应
		Promise.all(promises).then((post)=>{
			var bounds = new google.maps.LatLngBounds();
			POINTS = POINTS.concat(post);
			POINTS.map((v, i)=>{
				bounds.extend(v['lnglat']);
			})
			map.fitBounds(bounds);
			this.loading.hide();
		});
	},

	// 根据经纬度 标记类型 标记窗口的文本 生成点标记
	makeMarks : (lnglat, type, content, id)=> {
		let marker = new google.maps.Marker({
			position : lnglat,
			animation: google.maps.Animation.DROP,
			icon : {
				url : publisher.makeIcon(type),
				scaledSize : new google.maps.Size(30, 30)
			}
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

		infowindow.open(map, marker);
		marker.addListener('click', ()=>{
		    infowindow.open(map, marker);
		});

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
			let count = $sider.find('.lines').length;
			let id = $this.attr('id');
			let html = count >= 1 ?
						`<section class='lines' data-id=${id} data-lat=${lat} data-lng=${lng}>
							<div class="distance">距离:待测 自驾时长:待测</div>
							<div class="spot">
								<a href="javascript:;" class="delete">删除</a>
								<h4>${name}</h4>
							</div>
						</section>` :
						`<section class='lines' data-id=${id} data-lat=${lat} data-lng=${lng}>
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
			let start = {
				lat : nodes.eq(0).data('lat'),
				lng : nodes.eq(0).data('lng'),
			};

			let end = {
				lat : nodes.eq(count - 1).data('lat'),
				lng : nodes.eq(count - 1).data('lng')
			};

			let points = nodes.slice(1, -1);

			$.each(points, function(i, v){
				waypts.push({
					// 指定路径点的地址
					location : {
						lat : +this.getAttribute('data-lat'),
						lng : +this.getAttribute('data-lng')
					},  
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
				        window.alert('Directions request failed due to ' + status);
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
	},

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


	// icon 生成器 根据传入的 类型 返回对应类型的 icon 图标
	makeIcon : (type)=>{
		let iconPath = location.protocol + '//' + location.hostname + '/gmap/public/images/';
		let cfg = {
			'michelin' : {
				icon_url : iconPath + 'B.png'
			},
			'hotel' : {
				icon_url : iconPath + 'A.png'
			}
		};
		return cfg[type] ? cfg[type]['icon_url'] : iconPath + 'B.png';
	}

}, ['content', 'addToPanel', 'calculate', 'sideBarMannger', 'sortable']);

publisher.init();
