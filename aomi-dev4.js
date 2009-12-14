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


    //    Id of hidden div
    var
        hiddenDivId = 'appleofmyiframe',
        AppleOfMyIframe = new JqueryClass({
            onload : function(callback){
                var
                    that = this,
                    iframe = this[0],
                    onload = function(){
                        callback.call(that);
                    };
                // W3C
                iframe.onload = onload;
                
                // IE (+ Opera?)
                if (iframe.attachEvent){
                    iframe.attachEvent('onload', onload);
                }
                return this;
            },
            
            ready : function(callback){
                $.event.add(this, 'iframe.ready', callback); // We use $.event.add instead of this.bind()
                return this;
            },
            initialize : function(args){
                var that = this, headContents, bodyContents, optionsFound, callback, attr;
                
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
                        $.extend(true, that.options, arg);
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
                
                this.onload(function(){
                    $.event.trigger('iframe.ready', null, this); // Use $.event.trigger() instead of this.trigger()
                });
                
                if ((bodyContents && !isUrl(bodyContents)) || headContents){                
                    this.ready(function(){
                        this
                            .prepareDocument()
                            .setContents();
                    });
                }
                if (callback){
                    this.ready(callback);
                }
                
                // Absorb the iframe
                $.fn.init.call(this, '<iframe></iframe>').attr(attr);
                
                return this;
            },
            
            prepareDocument : function(){
                var doc = this.document();            
                doc.open();
                doc.close();
                this.body().css({margin:0, padding:0});
                return this;
            },
            
            setContents : function(headContents, bodyContents){
                if (!bodyContents){
                    bodyContents = headContents;
                    headContents = false;
                }
                
                // Set body contents, and cache
                if (bodyContents){
                    this.body(bodyContents);
                    this.data('body', this.document().body());
                }
                // Set head contents, and cache
                if (headContents){
                    this.head(headContents);
                    this.data('head', this.document().head());
                }
                if (this.options.autoresize){
                    this.matchSize();
                }
                return this;
            },
        
            appendTo : function(obj){
                var
                    ie6 = ($.browser.msie && parseInt($.browser.version, 10) === 6),
                    className;
            
                $.fn.appendTo.call(this, obj);
                if (!this.attr('src') || this.attr('src') === 'about:blank') {
                    this._swapDocuments();
                }
                // IE6 repaint hack for external src iframes
                else if (ie6) {
                    className = 'ie6hack';
                    this.addClass(className).removeClass(className);
                }
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
        
            $ : function(arg) {
                return $(arg, this.document());
            },
        
            //    Get hidden div. Insert if necessary.
            _hiddenDiv : function()
            {
                var div = $('#'+ hiddenDivId);
        
                if (div.length){
                    return div;
                }
            
                return $('<div></div>')
                        .attr('id', hiddenDivId)
                        .css({
                            overflow:'hidden',
                            width:'1px',
                            height:'1px',
                            //visibility:'hidden',
                            position:'absolute',
                            left:'-1000px',
                            top:'-1000px'
                        })
                        .appendTo('body');
            },
        
            //     Remove hidden div if empty
            _checkHiddenDiv : function()
            {
                // TODO: 
            },
        
            //    Insert body and head elements from old document into new document
            _swapDocuments : function()
            {
                var newDocument, oldDocument, old_body, new_body, old_head, new_head, moveNode;
        
                if ($.browser.msie){
                    return true;
                }
                newDocument = this.document();
                old_body = this.data('body');
            
                moveNode = this._moveNode;            
                if (typeof moveNode === 'undefined'){
                    if (newDocument.adoptNode){
                        moveNode = 'adoptNode';
                    }
                    else if (newDocument.importNode){
                        moveNode = 'importNode';
                    }
                    else if (newDocument.cloneNode){
                        moveNode = 'cloneNode';
                    }
                    else {
                        moveNode = false;
                    }
                    this._moveNode = moveNode;
                }
                if (!moveNode){
                    return false;
                }
                
                if (old_body){                
                    //console.dir(old_body.innerHTML);
                    oldDocument = old_body.ownerDocument;
                
                    newDocument.open();
                    newDocument.close();
                
                    //var old_body = oldDocument.body;
                    new_body = newDocument.body;
                    newDocument[moveNode](old_body, true); // 'true' has no effect for adoptNode, but is used for importNode and cloneNode
                    new_body.parentNode.replaceChild(old_body, new_body);
                
                    old_head = oldDocument.getElementsByTagName('head')[0];
                    new_head = newDocument.getElementsByTagName('head')[0];
                    newDocument[moveNode](old_head, true);
                    new_head.parentNode.replaceChild(old_head, new_head);
                }
                this.data('body', newDocument.body.cloneNode(true));
            }
        });
    
    // Extend jquery with the iframe method
    $.extend({
        iframe : function(headContents, bodyContents, options, callback) {
            return new AppleOfMyIframe(headContents, bodyContents, options, callback);
        }
    });
    
}(jQuery));
