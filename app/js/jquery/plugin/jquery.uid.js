// http://ihatecode.blogspot.com/2008/10/simple-jquery-uid-plugin.html
(function($){  

	$.fn.uid = function(prefix) {  
		if (!prefix) {
			prefix = "uid";
		}
		var generate = function() {
			var dt = new Date().getMilliseconds();
			var num = Math.random();
			var rnd = Math.round(num*100000);
			return prefix+dt+rnd;
		};
		return this.each(function() {  
			this.id = generate();
			return $;
		});  
	};
	
	$.uid = function(prefix) {  
		if (!prefix) {
			prefix = "uid";
		}
		var generate = function() {
			var dt = new Date().getMilliseconds();
			var num = Math.random();
			var rnd = Math.round(num*100000);
			return prefix+dt+rnd;
		};
		return generate();
	}; 

})(jQuery);