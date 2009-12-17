'use strict';
// TODO: Coding style: Standardise use of leading '$' for variables referring to jQuery collections - e.g. var $body = $('body'); - or simply avoid altogether

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

    // Utility class to create jquery extension class easily
    // Mixin the passed argument with a clone of the jQuery prototype
    function JqueryClass(proto){
        return $.extend(
            function(){
                if (this.initialize){
                    this.initialize.apply(this, $.makeArray(arguments));
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
        msie = $.browser.msie,
        ie6 = (msie && win.parseInt($.browser.version, 10) === 6),
        cssPlain = {
            margin:0,
            padding:0,
            borderWidth:0,
            borderStyle:'none',
            backgroundColor:'transparent'
        },
        
        AppleOfMyIframe = new JqueryClass({
            initialize : function(){
                var aomi = this, headContents, bodyContents, optionsFound, callback, attr, css;
                
                this.options = {
                    attr:{
                        scrolling:'no',
                        frameBorder:0,
                        allowTransparency:true
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
                    // TODO: If the bodyContents or headContents is a DOM node or jQuery collection, does this throw an error in some browsers. Probably, since we have not used adoptNode, and the nodes have a different ownerDocument. Should the logic in reload for falling back from adoptNode be taken into a more generic function that is used here?
                    else if (!bodyContents && typeof arg !== 'undefined'){
                        bodyContents = arg;
                    }
                    // Once callback and options are assigned, any remaining args must be the headContents; then exit loop
                    else if (!headContents && typeof arg !== 'undefined'){
                        headContents = arg;
                    }
                });
                attr = this.options.attr;
                css = $.extend({}, cssPlain, this.options.css);
                
                // If a url supplied, add it as the iframe src, to load the page
                if (isUrl(bodyContents)){
                    attr.src = bodyContents;
                }
                                
                // If an injected iframe (i.e. without a document url set as the src)
                else if (bodyContents || headContents){                
                    this
                        // When the iframe is ready, prepare the document and its contents
                        .ready(function(){
                            if (!msie){
                                this._prepareDocument();
                            }
                            this
                                ._trimBody()
                                .contents(headContents, bodyContents);
                        })
                        // Each time the onload event fires, the iframe's document is discarded (the onload event doesn't refire in IE), so we need to bring back the contents from the discarded document
                        .load(function(){
                            this.reload();
                        });
                }
                
                // Set the callback to fire when the iframe is ready
                if (callback){
                    this.ready(callback);
                }
                
                // Absorb the iframe
                $.fn.init.call(this, '<iframe></iframe>')
                    .css(css)
                    .attr(attr);
                
                // Setup 'load' event, for when iframe element fires 'load' event
                this._onload(function(){
                    $.event.trigger('aomi.load', null, this); // Use $.event.trigger() instead of this.trigger()
                });
                
                return this;
            },
        
            $ : function(arg) {
                return $(arg, this.document());
            },
            
            ready : function(callback){
                var aomi = this;
                return this.load(function outerCallback(){
                    $.event.remove(aomi, 'aomi.load', outerCallback);
                    callback.apply(aomi, $.makeArray(arguments));
                });
            },
            
            // TODO: use a different custom event type to the .ready() method (e.g. 'iframe.load' - but test if this would erroneously trigger the load() method, which is what would happen if the event type was 'load' (without the 'iframe.' prefix)
            load: function(callback){
                $.event.add(this, 'aomi.load', callback); // We use $.event.add instead of this.bind()
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
        
            // TODO: If $bodyChildren is a block-level element (e.g. a div) then, unless specific css has been applied, its width will stretch to fill the body element which, by default, is a set size in iframe documents (e.g. 300px wide in Firefox 3.5). Is there a way to determine the width of the body contents, as they would be on their own? E.g. by temporarily setting the direct children to have display:inline (which feels hacky, but might just work).
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
            
            contents : function(headContents, bodyContents){
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
                $.fn.appendTo.call(this, obj);
                
                // IE6 repaint hack for external src iframes
                // TODO: Is this needed anymore, now that the hidden div trick isn't in use?
                if (ie6 && this.hasExternalDocument()){
                    this._triggerRepaint();
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
                return this.location() !== 'about:blank'; // TODO: is this ever a blank string, or undefined?
            },
            
            hasBlankSrc : function(){
                var src = this.attr('src');
                return !src || src === 'about:blank';
            },
            
            // Hack to prevent situation where an iframe with an external src is on page, as well as an injected iframe; if the iframes are moved in the DOM and the page reloaded, then the contents of the external src iframe may be duplicated into the injected iframe (seen in FF3.5 and others). This function re-appplies the 'about:blank' src attribute of injected iframes, to force a reload of its content
            _enforceBlankDoc : function(){
                if (this.hasBlankSrc() && this.hasExternalDocument()){
                    this.attr('src', 'about:blank');
                    return true; // iframe is being reloaded
                }
                return false; // iframe doesn't require intervention
            },
            
            // If an injected iframe fires the onload event move than once, then its content will be lost, so we need to pull the nodes from  IE doesn't fire onload event more than once.
            reload : function(){
	            var
	                doc = this.document(),
	                htmlElement = $(doc).find('html'),
	                oldHtmlElement = this._oldHtmlElement, // A cached htmlElement, from the last time the iframe reloaded
	                oldHead, oldBody, method, appendWith;

                // This will run each time the iframe reloads, except for the very first time the iframe is inserted
	            if (oldHtmlElement){
		            oldHead = oldHtmlElement.find('head');
		            oldBody = oldHtmlElement.find('body');
		            htmlElement.empty();
		            
		            // Re-usable append function, for trying different DOM methods            
		            appendWith = function(method){
                        function appendNode(node){
                            htmlElement.append(
                                method === 'appendChild' ?
                                    node :
                                    doc[method](node, true)
                            );
                        }
                        if (method !== 'reboot'){
                            // NOTE: even if oldHead or oldBody are null, or the adoptNode fails, this should never error
                            appendNode(oldHead[0]);
                            appendNode(oldBody[0]);
                        }
                        else {
                            // TODO: Add reboot() method to re-initialize $.iframe() with the original constructor arguments. Add an event type for it
                            /* this.reboot(); */
                        }
                        return method;
                    };
                    
                    // If we've already determined the method to use, then use it
                    if (method){
                        appendWith(method);
                    }
                    // If not, then cycle through the different options
                    else {
                        // #1: adoptNode
                        if (doc.adoptNode){
                            method = appendWith('adoptNode');
                        }
                        else {
                            // #2: appendChild 
                            // append nodes straight from the other document; technically against the DOM spec, but supported by FF2 et al
                            try {
                                method = appendWith('appendChild');
                            }
                            catch(e){
                                // #3: importNode
                                // this and remaining steps will clone the nodes, so any references to nodes will be broken
                                if (doc.importNode){
                                    method = appendWith('importNode');
                                }
                                else {
                                    // #4: cloneNode
                                    // if 2) appendChild didn't work, then this probably won't either
                                    try {
                                        method = appendWith('cloneNode');
                                    }
                                    catch(e2){
                                        // #5: reboot iframe
                                        method = appendWith('reboot');
                                    }
                                }
                            }
                        }
                        
                        // TODO: Fix incomplete images in WebKit. The problem: when a document is dropped while images in the document are still loading, then when the nodes are copied over to the new document, the image does not continue to load, and remains blank. The solution: a method that re-applies the src attribute of images, after adding them to the new document. Possibly check the image's 'complete' property, and only if it is not complete, then re-apply the src attribute. Need to verify if there is a performance impact of re-applying the src of an image that has already been cached.
                        
                        // The append method will be stored as a property of the $.iframe method. T, so it only needs to run once on the first iframe, to determine the best method to use.
                        $.iframe.appendMethod = method;
                    }
	            }
	            // Update the cached htmlElement with the new one
	            this._oldHtmlElement = htmlElement;
	            return this;
            },
            
            _prepareDocument : function(){
                var doc = this.document();            
                doc.open();
                doc.write('<head></head><body></body>');
                doc.close();                                
                return this;
            },
            
            _trimBody : function(){
                this.body()
                    .css(cssPlain);
                return this;
            },
            
            // e.g. for external iframes in IE6 - the contents isn't always shown at first
            _triggerRepaint : function(){
                var className = 'aomi-repaint';
                this
                    .addClass(className)
                    .removeClass(className);
            },
            
            _onload : function(callback){
                var
                    aomi = this,
                    iframe = this[0],
                    enforceBlankDone = false,
                    
                    onload = function(){
                        var iframeToReload = false;
                        if (!enforceBlankDone){
                            iframeToReload = aomi._enforceBlankDoc();
                            enforceBlankDone = true;
                        }
                        if (!iframeToReload){
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
        });
    
    // Extend jquery with the iframe method
    $.extend(
        true,
        {
            iframe : function(headContents, bodyContents, options, callback) {
                return new AppleOfMyIframe(headContents, bodyContents, options, callback);
            },
            fn : {
                // TODO: Allow multiple elements in a collection to be replaced with iframes, e.g. $('.toReplace').intoIframe()
                intoIframe : function(headContents, options, callback){
                    var aomi = $.iframe(headContents, this, options, callback);
                    aomi.replaceAll(this);
                    return aomi;
                }
            }
        }
    );
    
}(jQuery));

/*jslint onevar: true, browser: true, devel: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, strict: true, newcap: true, immed: true */
