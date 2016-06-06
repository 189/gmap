var webpack = require('webpack');
var path = require('path');
var js_path = path.join(__dirname, 'public', 'js');
var css_path = path.join(__dirname, 'public', 'css');

var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

var evn = '';

module.exports = {
	entry : {
		'gmap' : path.join(js_path, 'gmap')
	},
	output : {
		path : evn == 'dev' ? 'build' : path.join('..', 'gmap'),
		filename : "js/[name].min.js"
	},
	module : {
		loaders: [
		{
		    test: /\.js$/,
		    loader: "babel",
		    query: {
		        presets: ['es2015'],
		        compact: false
		    }
		},
		{
		    test: /\.css$/,
		    loader: ExtractTextPlugin.extract("style-loader", "css-loader")
		    // loader: "style!css"
		},
		{
			test : /\.scss$/,
			loader : "style!css!sass"
		}]
	},

	resolve : {
		alias : {
			'jquery' : path.join(js_path, 'jquery'),
			'utils' : path.join(js_path, 'utils'),
			'jqueryui' : path.join(js_path, 'jquery-ui'),
			'layout-css' : path.join(css_path, 'layout.css'),
			'animate-css' : path.join(css_path, 'animate.min.css'),
			'demo-css' : path.join(css_path, 'demo.scss')
		}
	},

	plugins : [
		new ExtractTextPlugin("css/[name].css"),

		new HtmlWebpackPlugin({
	            filename: 'gmap.html',
	            inject: 'body',
	            template : 'gmap.html',
	            chunks : ['gmap']
	    })
	]
};
