'use strict';
//    TODO: onload events
//    TODO: callback passed in constrctor, 
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
                    this.ready(function(){
                        this
                            ._prepareDocument()
                            .setContents(headContents, bodyContents);
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
            
            ready : function(callback){
                $.event.add(this, 'iframe.ready', callback); // We use $.event.add instead of this.bind()
                return this;
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
                if (!bodyContents){
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
                    ie6 = ($.browser.msie && win.parseInt($.browser.version, 10) === 6),
                    className;
            
                $.fn.appendTo.call(this, obj);
                if (!this.attr('src') || this.attr('src') === 'about:blank'){
                   // this._swapDocuments();
                }
                // IE6 repaint hack for external src iframes
                else if (ie6) {
                    className = 'ie6hack';
                    this.addClass(className).removeClass(className);
                }
                return this;
            },
            
            _prepareDocument : function(){
                var doc = this.document();            
                doc.open();
                doc.close();       

                this.$('html')
                    .append(doc.createElement('head'))
                    .append(doc.createElement('body')); // NOTE: doesn't work with .append('<head></head><body></body>');
				
                this.body()
                    .css({margin:0, padding:0});
                
                return this;
            },
            
            _onload : function(callback){
                var
                    aomi = this,
                    iframe = this[0],
                    onload = function(){
                        callback.call(aomi);
                    };
                // W3C
                iframe.onload = onload;
                
                // IE (+ Opera?)
                if (iframe.attachEvent){
                    iframe.attachEvent('onload', onload);
                }
                return this;
            },
            
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
        });
    
    // Extend jquery with the iframe method
    $.extend({
        iframe : function(headContents, bodyContents, options, callback) {
            return new AppleOfMyIframe(headContents, bodyContents, options, callback);
        }
    });
    
}(jQuery));

/*jslint onevar: true, browser: true, devel: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, strict: true, newcap: true, immed: true */
