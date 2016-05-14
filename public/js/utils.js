/**
 * 工具类
 */

class Utils {
	constructor(){
		this.name = 'xx';
	}

	makePublisher (child, params){
		var i = 0, l;
		return this.merge(child, {
			init: function() {
			    this.subcribe(); 
			    this.publish();
			},

			fn: [],

			subcribe: function() {
				params.forEach(function(value, index){
			    	this.fn.push(value);
				}.bind(this))
			},

			publish: function() {
			    for (l = this.fn.length; i < l; i++) {
			        this[this.fn[i]]();
			    }
			}
		});
	}

	merge (child, parent){
		var p;
		child = child || {};
		for(p in parent){
			if(parent.hasOwnProperty(p) && !child[p]){
				child[p] = parent[p];
			}
		}
		return child;
	}

}

export {Utils};