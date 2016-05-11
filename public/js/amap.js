	

// 加载 JS 模块
import $ from 'jquery';
import {Utils as utils} from 'utils'; 
import DATA from './data';

// 加载 CSS 模块
import 'layout-css';
import 'demo-css';

let osaka = [135.3 , 34.4];
var map = new AMap.Map('container', {
	center : osaka
});