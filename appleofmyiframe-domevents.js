

//
//	TODO: onload events
//	TODO: callback passed in constrctor, 
(function($){ 

	function isUrl(str){
		return (/^https?:\/\/[\-\w]+\.\w[\-\w]+\S*$/).test(str);
	}

    // 
	//	Utility class to create jquery extension class easily
	//
	function JqueryClass(proto){
		var ret = function() {
			if (this.initialize) this.initialize.apply(this, arguments);
		};
		
		ret.prototype = {};
		$.extend(ret.prototype, $.fn, proto);
		
		return ret;
	}


	//	Id of hidden div
	var hiddenDivId = 'appleofmyiframe';




	var AppleOfMyIframe = new JqueryClass({
		initialize : function(contents, options, callback){
			// 	TODO: more flexible arguments and argument intelligence
			//	TODO: deal with callback events
						
			this.options = {
                attr:{
                    scrolling:'no',
                    frameborder:0,
                    marginheight:0,
                    allowtransparency:true
                },
                autoresize:true
            };

			//	Options
			if (typeof options=='object') $.extend(true, this.options, options);
			var attr = this.options.attr;
			
			// If a url supplied, add it as the iframe src, to load the page
            if (isUrl(contents)){
                attr.src = contents;
				contents = '';
            }
			
			//	Absorbe the iframe
			$.fn.init.call(this, '<iframe></iframe>').attr(attr);
		
			//	Apend to hidden div
			this._hiddenDiv().append(this);
			
			//	Append contents
			if (contents) {
				this.document().open().close();
				this.body(contents);
				if (this.options.autoresize) this.matchSize();
			}
			
			// 	Key 'body' in data stores the body element of this iframes document
			//	Note: It stores the dom node directly. That seems to fix opera'a garbage collection bug
			this.data('body', this.document().body);
			
			var _this = this;	// Pointer to this for closure
			this.bind('DOMNodeInsertedIntoDocument', function(){
				// If NOT a url src
				// TODO: check the 'about:blank' logic
				if (!_this.attr('src') || _this.attr('src')=='about:blank')
					setTimeout(function(){
						_this._swapDocuments();
						if (_this.options.autoresize) _this.matchSize();
					}, 1);
					
				_this._checkHiddenDiv();
			});
			
		},
		
		/*appendTo : function(obj)
		{
			$.fn.appendTo.call(this, obj);
			if (!this.attr('src') || this.attr('src')=='about:blank') {
				var _this = this;
				setTimeout(function(){
					_this._swapDocuments();
				}, 1);
			}	
		},*/
		
		body : function(contents) {
			var body = this.$('body');//document().body;
			
			if (contents) {
				this.$(contents).appendTo(body);
			}
			
			return body;
		},

		head : function(contents) {
			var head = this.$('head');
			
			if (contents) {
				this.$(contents).appendTo(head);
			}
			
			return head;
		},
		
		matchSize : function() {
			var matchWidth = (arguments.length>0) ? arguments[0] : true;
			var matchHeight = (arguments.length>1) ? arguments[1] : true;
			
			var $bodyChildren = this.body().children();
			            
			if (matchWidth) this.height($bodyChildren.height())
            if (matchHeight) this.width($bodyChildren.width());
			return this;
		},
		
		document : function(){
            return this[0].contentDocument || (this[0].contentWindow ? this[0].contentWindow.document : false);
		},
		
		$ : function(arg) {
			return $(arg, this.document());
		},
		
		//	Get hidden div. Insert if necessary.
		_hiddenDiv : function()
		{
			var div = $('#'+hiddenDivId);
		
			if (div.length) return div;
			
			return $('<div></div>')
	                .attr('id', hiddenDivId)
	                .css({
	                    overflow:'hidden',
	                    width:'1px',
	                    height:'1px',
	                    visibility:'hidden',
	                    position:'absolute',
	                    left:0,
	                    bottom:0
	                })
	                .appendTo('body');
		},
		
		// 	Remove hidden div if empty
		_checkHiddenDiv : function()
		{
			// TODO: 
		},
		
		//	Insert body and head elements from old document into new document
		_swapDocuments : function()
		{
			var newDocument = this.document();
			var old_body = this.data('body');			
						
				
			if (old_body){
				oldDocument = old_body.ownerDocument;
				
				newDocument.open().close();
				
				//var old_body = oldDocument.body;
				var new_body = newDocument.body;
				newDocument.adoptNode(old_body);
				new_body.parentNode.replaceChild(old_body, new_body);
				
				var old_head = oldDocument.getElementsByTagName('head')[0];
				var new_head = newDocument.getElementsByTagName('head')[0];
				newDocument.adoptNode(old_head);
				new_head.parentNode.replaceChild(old_head, new_head);
			}
			
			this.data('body', new_body);
		}
	});
	
	// Extend jquery with the iframe method
	$.extend({
		iframe : function(content, options, callback) {
			return new AppleOfMyIframe(content, options, callback);
		}
	});
	
})(jQuery);
