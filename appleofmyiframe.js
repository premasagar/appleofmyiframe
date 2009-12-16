'use strict';

(function($){ 

    function isUrl(str){
        return (/^https?:\/\/[\-\w]+\.\w[\-\w]+\S*$/).test(str);
    }
    function isElement(obj){
        return obj && obj.nodeType === 1;
    }
    function isJQuery(obj){
        return obj && !!obj.jquery;
    }

    // 
    //    Utility class to create jquery extension class easily
    //    Mixin the passed argument with a clone of the jQuery prototype
    //
    function JqueryClass(proto){
        return $.extend(
            function(){
                if (this.initialize){
                    this.initialize.apply(this, arguments);
                }
            },
            {
                // deep clone of jQuery prototype and passed prototype
                prototype: $.extend(true, {}, $.fn, proto)
            }
        );
    }


    var
        win = window,
        document = win.document,
        msie = $.browser.msie,
        ie6 = (msie && win.parseInt($.browser.version, 10) === 6),
        
        AppleOfMyIframe = new JqueryClass({
            initialize : function(){
                var aomi = this, headContents, bodyContents, optionsFound, callback, attr;
                
                this.options = {
                    attr:{
                        scrolling:'no',
                        frameborder:0,
                        marginheight:0,
                        allowtransparency:true
                    },
                    autoresize:true
                };
                
                // All arguments are optional, so we need to determine which have been supplied
                $.each($.makeArray(arguments).reverse(), function(i, arg){
                    if (!callback && $.isFunction(arg)){
                        callback = arg;
                    }
                    else if (!optionsFound && typeof arg === 'object' && !isJQuery(arg) && !isElement(arg)){
                        optionsFound = true;
                        $.extend(true, aomi.options, arg);
                    }
                    else if (!bodyContents && typeof arg !== 'undefined'){
                        bodyContents = arg;
                    }
                    // Once callback and options are assigned, any remaining args must be the headContents; then exit loop
                    else if (!headContents && typeof arg !== 'undefined'){
                        headContents = arg;
                    }
                });
                attr = this.options.attr;
                
                // If a url supplied, add it as the iframe src, to load the page
                if (isUrl(bodyContents)){
                    attr.src = bodyContents;
                }
                
                if ((bodyContents && !isUrl(bodyContents)) || headContents){                
                    this
                        .ready(function(){
                            if (!msie){
                                this._prepareDocument();
                            }
                            this.setContents(headContents, bodyContents);
                        })
                        .load(function(){
                            this._pinIframeContent();
                        });
                }
                if (callback){
                    this.ready(callback);
                }
                
                // Absorb the iframe
                $.fn.init.call(this, '<iframe></iframe>')
                    .attr(attr);
                
                // Setup 'ready' event, for when iframe element fires 'load' event
                this._onload(function(){
                    $.event.trigger('iframe.ready', null, this); // Use $.event.trigger() instead of this.trigger()
                });
                
                return this;
            },
        
            $ : function(arg) {
                return $(arg, this.document());
            },
            
            // TODO: make this fire only on the first onload event
            ready : function(callback){
                var aomi = this;
                return this.load(function outerCallback(){
                    $.event.remove(aomi, 'iframe.ready', outerCallback);
                    callback.apply(aomi, arguments);
                });
            },
            
            // TODO: make this fire on every onload event (as the current .ready() method already does)
            load: function(callback){
                $.event.add(this, 'iframe.ready', callback); // We use $.event.add instead of this.bind()
                return this;
            },
        
            window : function(){
                return this[0].contentWindow;
            },
        
            document : function(){
                var iframe = this[0];
                return iframe.contentDocument ? iframe.contentDocument : iframe.contentWindow.document;
            },
        
            body : function(contents) {
                var body = this.$('body');
            
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
                var
                    args = arguments,
                    matchWidth = (args.length>0) ? args[0] : true,
                    matchHeight = (args.length>1) ? args[1] : true,
                    $bodyChildren = this.body().children();
                            
                if (matchWidth) {
                    this.width($bodyChildren.width());
                }
                if (matchHeight) {
                    this.height($bodyChildren.height());
                }
                return this;
            },
            
            setContents : function(headContents, bodyContents){
                if (typeof bodyContents === 'undefined'){
                    bodyContents = headContents;
                    headContents = false;
                }
                
                // Set body contents, and cache
                if (bodyContents){
                    this.data('body', this.body(bodyContents));
                }
                // Set head contents, and cache
                if (headContents){
                    this.data('head', this.head(headContents));
                }
                
                if (this.options.autoresize){
                    this.matchSize();
                }
                return this;
            },
        
            appendTo : function(obj){
                var
                    src = this.attr('src'),
                    className;
            
                $.fn.appendTo.call(this, obj);
                
                // IE6 repaint hack for external src iframes
                if (ie6 && this.hasExternalDocument()) {
                    className = 'ie6hack';
                    this.addClass(className).removeClass(className);
                }
                return this;
            },
            
            location : function(){
                var win = this.window();
                try {
                    return win.location.href;
                }
                catch(e){
                    return false;
                }
            },
            
            hasExternalDocument : function(){
                return this.location() !== 'about:blank'; // TODO: is this ever a blank string, or undedfined
            },
            
            hasBlankSrc : function(){
                var src = this.attr('src');
                return !src || src === 'about:blank';
            },
            
            // Hack to prevent situation where an iframe with an external src is on page, as well as an injected iframe; if the iframes are moved in the DOM and the page reloaded, then the contents of the external src iframe may be duplicated into the injected iframe (seen in FF3.5 and others). This function re-appplies the 'about:blank' src attribute of injected iframes, to force a reload of its content
            _enforceSrc : function(){
                if (this.hasBlankSrc() && this.hasExternalDocument()){
                    this.attr('src', 'about:blank');
                    return true; // iframe is being reloaded
                }
                return false; // iframe doesn't require intervention
            },
            
            _pinIframeContent : function(){            
	            var
	                doc = this.document(),
	                htmlElement = $(doc).find('html'),
	                oldHtmlElement = this._oldHtmlElement,
	                oldHead,
	                oldBody;

	            if (oldHtmlElement){
		            oldHead = oldHtmlElement.find('head');
		            oldBody = oldHtmlElement.find('body');
		            htmlElement.empty();

                    // Priority 1: adoptNode
                    if (doc.adoptNode){
                        htmlElement
                            // NOTE: even if oldHead or oldBody are null, or the adoptNode fails, this won't error
                            .append(doc.adoptNode(oldHead[0]))
                            .append(doc.adoptNode(oldBody[0]));
                    }
                    else {
                        // Priority 2: appendChild 
                        // attempt to append nodes from the other document; technically against the DOM spec, but supported by FF2 et al
                        try {
                            htmlElement
                                .append(oldHead)
                                .append(oldBody);
                        }
                        catch(e){
                            // Priority 3: importNode
                            // this, and the remaining steps, will clone the nodes, so any references to nodes will be broken
                            if (doc.importNode){
                                htmlElement
                                    .append(doc.importNode(oldHead[0]), true)
                                    .append(doc.importNode(oldBody[0]), true);
                            }
                            else {
                                // Priority 4: cloneNode
                                // if 2) appendChild didn't work, then this probably won't either
                                try {
                                    htmlElement
                                        .append(doc.cloneNode(oldBody[0]), true) // TODO: any difference with oldBody.clone(true) ?
                                        .append(doc.cloneNode(oldBody[0]), true);
                                }
                                catch(e){
                                    // Priority 5: reload iframe
                                    this.reload();
                                }
                            }
                        }
                    }
	            }
	            this._oldHtmlElement = htmlElement;
	            return this;
            },
            
            _prepareDocument : function(){
                var doc = this.document();            
                doc.open();
                doc.write('<head></head><body></body>');
                doc.close();
				
                this.body()
                    .css({margin:0, padding:0});
                
                return this;
            },
            
            _onload : function(callback){
                var
                    aomi = this,
                    iframe = this[0],
                    enforceSrcDone = false,
                    
                    onload = function(){
                        var iframeNeedsReload = false;
                        if (!enforceSrcDone){
                            iframeNeedsReload = aomi._enforceSrc();
                            enforceSrcDone = true;
                        }
                        if (!iframeNeedsReload){
                            callback.call(aomi);
                        }
                    };
                // W3C
                iframe.onload = onload;
                
                // IE (+ Opera?)
                if (iframe.attachEvent){
                    iframe.attachEvent('onload', onload);
                }
                return this;
            }
            
            /*
            _moveNode : (function(){
                var method;
                
                if (document.adoptNode){
                    method = 'adoptNode';
                }
                else if (document.importNode){
                    method = 'importNode';
                }
                else if (document.cloneNode){
                    method = 'cloneNode';
                }
                else {
                    method = false;
                }
                
                return function(document, $node){
                    return document && $node && $node[0] && method ?                    
                        document[method]($node[0], true):
                        false;
                };
            }()),
        
            //    Insert body and head elements from old document into new document
            _swapDocuments : function(){
                var
                    newDocument = this.document(),
                    oldBody,
                    oldHead;
        
                if ($.browser.msie){
                    return true;
                }
                
                oldBody = this._moveNode(newDocument, this.data('body'));
                oldHead = this._moveNode(newDocument, this.data('head'));
                
                if (oldBody){
                    this.body().replaceWith(oldBody);
                    this.data('body', $(oldBody).clone(true)); // TODO: Does this need to be a clone?
                }
                if (oldHead){
                    this.head().replaceWith(oldHead);
                    this.data('head', $(oldHead).clone(true)); // TODO: Does this need to be a clone?
                }

                return this;
            }
            */
        });
    
    // Extend jquery with the iframe method
    $.extend({
        iframe : function(headContents, bodyContents, options, callback) {
            return new AppleOfMyIframe(headContents, bodyContents, options, callback);
        }
    });
    
}(jQuery));

/*jslint onevar: true, browser: true, devel: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, strict: true, newcap: true, immed: true */
