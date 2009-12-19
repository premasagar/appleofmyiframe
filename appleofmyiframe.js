/*
    by.Dharmafly() with [
        premasagar.rose && (jonathan.lister + alistair.james)
    ];
    license: mit
    url: http://github.com/premasagar/appleofmyiframe
*/

// TODO: Possible loading flow: pass 'ready' callback to _onload(), then in the 'ready' handler, trigger 'load' and pass 'load' callback to _onload().
// TODO: Coding style: Standardise use of leading '$' for variables referring to jQuery collections - e.g. var $body = $('body'); - or simply avoid altogether

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
    // Copied from jQuery src - required for .live() and .die() methods
    function liveConvert(type, selector){
        return ["live", type, selector.replace(/\./g, "`").replace(/ /g, "|")].join(".");
    }

    // Utility class to create jquery extension class easily
    // Mixin the passed argument with a clone of the jQuery prototype
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
        ns = 'aomi',
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
                var
                    aomi = this,
                    args = this._constructorArgs,
                    headContents, bodyContents, optionsFound, callback, attr;
                
                if (!args){
                    args = $.makeArray(arguments);
                    this._constructorArgs = args;
                }
                
                this.options = {
                    attr:{
                        scrolling:'no',
                        frameBorder:0,
                        allowTransparency:true,
                        src:'about:blank'
                    },
                    autoresize:true,
                    target:'_parent', // which window to open links in, by default - set to '_self' or '_blank' if necessary
                    css:$.extend({}, cssPlain),
                    title:''
                };
                
                // All arguments are optional, so we need to determine which have been supplied
                $.each(args.reverse(), function(i, arg){
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
                
                // Setup the 'ready' event to trigger the first time an iframe loads. This must be set before any other 'load' callbacks.
                this.one('load', function(){
                    this.trigger('ready');
                });
                
                // If a url supplied, add it as the iframe src, to load the page
                if (isUrl(bodyContents)){
                    attr.src = bodyContents;
                    
                    // IE6 repaint - required a) for external iframes that are added to the doc while they are hidden, and b) for some external iframes that are moved in the DOM (e.g. google.co.uk)
                    if (ie6){
                        this.ready(this.repaint);
                    }
                }
                                
                // If an injected iframe (i.e. without a document url set as the src)
                else if (bodyContents || headContents){
                    this
                        // When the iframe is ready, prepare the document and its contents
                        .ready(function(){            
                            if (!msie){
                                this._prepareDocument();
                            }
                            // Check if the iframe is all OK to continue loading (e.g. guarding against browser bugs with external src leakage)
                            if (this._okToLoad()){
                                this
                                    // Setup event listeners
                                    .bind('contents', this.matchSize)
                                    .bind('style', this.matchSize)
                                    .load(this.cache)
                                    // Let anchor links open targets in the default target
                                    .live('a', 'click', function(){
                                        if (!$(this).attr('target') && $(this).attr('href')){
                                            $(this).attr('target', aomi.options.target);
                                        }
                                    })
                                    // Change contents
                                    ._trim()
                                    .title(this.options.title)
                                    .contents(headContents, bodyContents)
                                    // Iframe document persistance: Each time the onload event fires, the iframe's document is discarded (the onload event doesn't refire in IE), so we need to bring back the contents from the discarded document
                                    .cache();
                            }
                            else {
                                // There's a problem with the iframe. Reload.
                                // TODO: Add some kind of count, to guard against infinite reloading
                                this
                                    // Trigger the 'ready' event once the reload completes
                                    .one('load', function(){
                                        this.trigger('ready');
                                    })
                                    .reload();
                            }
                        });
                }
                
                // If a callback was supplied, fire it on 'ready'
                if (callback){
                    this.ready(callback);
                }
                
                return this
                    // Absorb the iframe - this needs to be executed before any native onload handlers are applied to the iframe element
                    ._absorbIframe(this.options)                                
                    // Pin the 'load' event to the iframe element's native 'onload' event
                    ._onload(function(){
                        this.trigger('load');
                    })
                    // Init complete
                    .trigger('init');
            },
            
            _absorbIframe : function(options){
                $.fn.init.call(this, '<iframe></iframe>')
                    .css(options.css)
                    .attr(options.attr);
                return this;
            },
        
            $ : function(arg){
                var doc = this.document();
                return arg ? $(arg, doc) : doc;
            },
            
            // NOTE: We use $.event.trigger() instead of this.trigger(), because we want the callback to have the AOMI object as the 'this' keyword, rather than the iframe element itself
            trigger : function(type, data){                
                // _(this.attr('id') + ': *' + type + '*');
                $.event.trigger(type + '.' + ns, data, this);
                return this;
            },
            
            bind : function(type, callback){
                $.event.add(this, type + '.' + ns, callback);
                return this;
            },
            
            unbind : function(type, callback){
                $.event.remove(this, type + '.' + ns, callback);
                return this;
            },
            
            one : function(type, callback){
                var aomi = this;
                return this.bind(type, function outerCallback(){
                    callback.apply(aomi, $.makeArray(arguments));
                    aomi.unbind(type, outerCallback);
                });
            },
            
            live: function(selector, type, fn){
		        var proxy = $.event.proxy(fn);
		        proxy.guid += selector + type;         
		        this.body()
		            .bind(liveConvert(type, selector), selector, proxy);         
		        return this;
	        },
	        
	        die: function(selector, type, fn){
		        this.body()
		            .unbind(liveConvert(type, selector), fn ? {guid: fn.guid + selector + type} : null);
		        return this;
	        },
            
            load: function(callback){
                return this.bind('load', callback);
            },
            
            ready : function(callback){
                return this.bind('ready', callback);
            },
            
            reload : function(){
                this.attr('src', this.attr('src'));
                return this.trigger('reload');
            },
            
            // Trigger a repaint of the iframe - e.g. for external iframes in IE6, where the contents aren't always shown at first
            repaint : function(){
                var className = ns + '-repaint';
                this
                    .addClass(className)
                    .removeClass(className);
                return this.trigger('repaint');
            },
        
            window : function(){
                var win = this[0].contentWindow;
                try {
                    return $(win);
                }
                catch(e){
                    return $([]);
                }
            },
            
            location : function(){
                var
                    win = this.window(),
                    loc = win.attr('location');
                return loc ? loc.href : null;
            },
        
            document : function(){
                return $(this.window().attr('document') || []);
            },
        
            body : function(contents){
                var body = this.$('body');
                return contents ? body.append(contents) : body;
            },

            head : function(contents){
                var head = this.$('head');                            
                return contents ? head.append(contents) : head;
            },
            
            title : function(title){
                if (typeof title !== 'undefined'){
                    this.options.title = title;
                    this.$().attr('title', title);
                    return this;
                }
                return this.$().attr('title');
            },
            
            style : function(cssText){
                this.head('<style>' + cssText + '</style>');
                return this.trigger('style');
            },
        
            // TODO: If bodyChildren is a block-level element (e.g. a div) then, unless specific css has been applied, its width will stretch to fill the body element which, by default, is a set size in iframe documents (e.g. 300px wide in Firefox 3.5). Is there a way to determine the width of the body contents, as they would be on their own? E.g. by temporarily setting the direct children to have display:inline (which feels hacky, but might just work).
            matchSize : function(){
                var
                    args = arguments,
                    matchWidth = (args.length>0) ? args[0] : true,
                    matchHeight = (args.length>1) ? args[1] : true,
                    bodyChildren = this.body().children(),
                    width = bodyChildren.width(),
                    height = bodyChildren.height();
                            
                if (matchWidth){
                    this.width(width);
                }
                if (matchHeight){
                    this.height(height);
                }
                // TODO: Decide if this event should be renamed or removed, since there may be confusion that it would fire on every kind of iframe document, body or window resize.
                return this.trigger('resize', [width, height]);
            },
            
            contents : function(headContents, bodyContents){
                if (typeof bodyContents === 'undefined'){
                    bodyContents = headContents;
                    headContents = false;
                }
                this.body(bodyContents);
                this.head(headContents);
                return this.trigger('contents');
            },
        
            appendTo : function(obj){
                $.fn.appendTo.call(this, obj);
                if (ie6){
                    this.repaint();
                }
                this.trigger('appendTo');
                return this;
            },
            
            // TODO: Useful method to add: hasCrossDomainDocument(), as opposed to a document served from the same domain
            hasExternalDocument : function(){
                var loc = this.location();
                return !loc || (loc !== 'about:blank' && loc !== win.location.href);
                // NOTE: the comparison with the host window href is because, in WebKit, an injected iframe may have a location set to that url. This would also match an iframe that has a src matching the host document url, though this seems unlikely to take place in practice.
            },
            
            hasBlankSrc : function(){
                var src = this.attr('src');
                return !src || src === 'about:blank';
            },
            
            // If an injected iframe fires the onload event move than once, then its content will be lost, so we need to pull the nodes from  IE doesn't fire onload event more than once.
            cache : function(){
	            var
	                doc = this.$()[0],
	                htmlElement, oldHtmlElement, oldHead, oldBody, method, appendWith;
	                
	            if (!doc){
	                return this;
	            }
	            htmlElement = this.$('html');
	            // Check if there's already a cached htmlElement, from the last time the iframe loaded
	            oldHtmlElement = this._oldHtmlElement;	                
	                
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
                        if (method !== 'init'){
                            // NOTE: even if oldHead or oldBody are null, or the adoptNode fails, this should never error
                            appendNode(oldHead[0]);
                            appendNode(oldBody[0]);
                        }
                        else { // TODO: This aspect of initialize(), where the constructor args are cached, is not yet implemented
                            this.initialize();
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
                                        // #5: re-initialize iframe
                                        method = appendWith('init');
                                    }
                                }
                            }
                        }
                        
                        // TODO: Fix incomplete images in WebKit. The problem: when a document is dropped while images in the document are still loading, then when the nodes are copied over to the new document, the image does not continue to load, and remains blank. The solution: a method that re-applies the src attribute of images, after adding them to the new document. Possibly check the image's 'complete' property, and only if it is not complete, then re-apply the src attribute. Need to verify if there is a performance impact of re-applying the src of an image that has already been cached.
                        
                        // The append method will be stored as a property of the $.iframe method. T, so it only needs to run once on the first iframe, to determine the best method to use.
                        $.iframe.appendMethod = method;
                        this
                            .title(this.options.title)
                            .trigger('restore', method);
                    }
	            }
	            // Update the cached htmlElement with the new one
	            this._oldHtmlElement = htmlElement;
	            this.trigger('cache');
	            return this;
            },
            
            _prepareDocument : function(){
                var doc = this.$()[0];
                if (doc){        
                    doc.open();
                    doc.write('<head></head><body></body>');
                    doc.close();
                }
                return this;
            },
            
            _trim : function(){
                this.body()
                    .css(cssPlain);
                return this;
            },
            
            _hasSrcMismatch : function(){
                return (this.hasBlankSrc() && this.hasExternalDocument());
            },
            
            // A check to prevent the situation where an iframe with an external src is on page, as well as an injected iframe; if the iframes are moved in the DOM and the page reloaded, then the contents of the external src iframe may be duplicated into the injected iframe (seen in FF3.5 and others). This function re-appplies the 'about:blank' src attribute of injected iframes, to force a reload of its content
            _okToLoad : function(){
                var ok = true;
                if (this._hasSrcMismatch()){ // add other tests here, if required
                    ok = false;
                }
                return ok;
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
