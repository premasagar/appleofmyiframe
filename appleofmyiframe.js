        /*!
* AppleOfMyIframe
*     v0.9
**
    JavaScript library for creating & manipulating iframe documents on-the-fly
    http://github.com/premasagar/appleofmyiframe

    by Premasagar Rose
        http://premasagar.com + http://dharmafly.com

    license:
        http://www.opensource.org/licenses/mit-license.php

*//*

    requires jQuery
    adds methods:
        jQuery.iframe()
        jQuery(elem).intoIframe()
        
    **
    
    contributors:
        Alastair James - http://github.com/onewheelgood
        Jonathan Lister - http://jaybyjayfresh.com
    
    
    ~2KB minified & gzipped

*/

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
    // From jQuery; required for .live() and .die() methods
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
        // Namespace
        ns = 'aomi',
        
        // Environment
        win = window,
        browser = $.browser,
        msie = browser.msie,
        ie6 = (msie && win.parseInt(browser.version, 10) === 6),
        opera = browser.opera,
        browserNeedsDocumentPreparing = (function(){
            return !msie && !opera;
        }()),
        browserDestroysDocumentWhenIframeMoved = (function(){
            return !msie;
        }()),
        browserRequiresRepaintForExternalIframes = (function(){
            return ie6;
        }()),
        
        // Shortcuts
        event = $.event,
        
        // Settings
        cssPlain = {
            margin:0,
            padding:0,
            borderWidth:0,
            borderStyle:'none',
            backgroundColor:'transparent'
        },
        
        defaultOptions = {
            attr:{
                scrolling:'no',
                frameBorder:0,
                allowTransparency:true,
                src:'about:blank'
            },
            doctype:5, // html5 doctype
            autoresize:true,
            target:'_parent', // which window to open links in, by default - set to '_self' or '_blank' if necessary
            css:$.extend({}, cssPlain),
            title:''
        },
                
        // Main class
        AppleOfMyIframe = new JqueryClass({
            initialize : function(){
                var args, options, attr;
                
                // Cache the constructor arguments, to enable later reloading
                this.args.apply(this, arguments);
                args = this.args(); // retrieve the sorted arguments
                options = this.options();
                attr = options.attr;
                
                // If a url supplied, add it as the iframe src, to load the page
                if (isUrl(args.bodyContents)){
                    options.attr.src = args.bodyContents;
                    
                    // IE6 repaint - required a) for external iframes that are added to the doc while they are hidden, and b) for some external iframes that are moved in the DOM (e.g. google.co.uk)
                    if (browserRequiresRepaintForExternalIframes){
                        this.ready(this.repaint);
                    }
                }
                                
                // If an injected iframe (i.e. without a document url set as the src)
                else if (args.bodyContents || args.headContents){
                    this
                        // When the iframe is ready, prepare the document and its contents
                        .ready(function(){
                            var options = this.options();
                            // Remove handler for the native onload event
                            
                            // Prepare the iframe document
                            /*
                            if (browserNeedsDocumentPreparing){
                                this.document(true);
                            }
                            */
                            // Setup iframe document caching
                            // Ridiculously, each time the iframe element is moved, or removed and re-inserted into the DOM, then the native onload event fires and the iframe's document is discarded. (This doesn't happen in IE, thought). So we need to bring back the contents from the discarded document, by caching it and restoring from the cache on each 'load' event.
                            if (browserDestroysDocumentWhenIframeMoved){
                                this.load(this.cache);
                            }
                            this.document(true);
                            // Setup auto-resize event listeners
                            if (options.autoresize){
                                this
                                    .bind('headContents', this.matchSize)
                                    .bind('bodyContents', this.matchSize);
                                    // TODO: How should this be simplified, so that a call to contents() doesn't lead to two calls to matchSize()? In this function, we could use the 'contents' event, but it makes sense to use 'headContents' and 'bodyContents' for general usage.
                            }
                            this
                                // Let anchor links open pages in the default target
                                .live('a', 'click', function(){
                                    if (!$(this).attr('target') && $(this).attr('href')){
                                        $(this).attr('target', options.target);
                                    }
                                })
                                // Change head and body contents
                                ._trim()
                                .title(options.title)
                                .contents(args.headContents, args.bodyContents);
                    });
                }
                
                // If a callback was supplied, fire it on 'ready'
                if (args.callback){
                    this.ready(function(){
                        args.callback.apply(this, arguments);
                    });
                    // NOTE: This block used to read "this.ready(callback);", which should be identical. However, WebKit (seen in Chrome 4) doesn't successfully apply manipulations to the iframe head on a reload(true) when the block reads that way. Why? Who knows?
                    // TODO: Investigate this. Perhaps the bind/unbind/trigger events need changing instead?
                }
                
                return this
                    // Attach the iframe element
                    ._attachElement()
                    // Init complete
                    .trigger('init');
            },
        
            $ : function(arg){
                var doc = this.document();
                return arg ? $(arg, doc) : doc;
            },
            
            
            // doctype() examples:
                // this.doctype(5);
                // this.doctype(4.01, 'strict');
                // this.doctype() // returns doctype object
            doctype : function(v){
                var doctype;
                                
                if (v){
                    this.options().doctype = v;
                    return this;
                }
                v = this.options().doctype;
                doctype = '<!DOCTYPE ';
                if (v === 5){ // html5 doctype
                    doctype += 'html';
                }
                return doctype + '>';
            },
            
            // NOTE: We use $.event.trigger() instead of this.trigger(), because we want the callback to have the AOMI object as the 'this' keyword, rather than the iframe element itself
            trigger : function(type, data){
                // DEBUG LOGGING
                var debug = [this.attr('id') + ': *' + type + '*'];
                if (data){
                    debug.push(data);
                }
                //debug.push(arguments.callee.caller);
                _.apply(null, debug);                
                
                
                event.trigger(type + '.' + ns, data, this);
                return this;
            },
            
            bind : function(type, callback){
                event.add(this, type + '.' + ns, callback);
                return this;
            },
            
            unbind : function(type, callback){
                event.remove(this, type + '.' + ns, callback);
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
		        var proxy = event.proxy(fn);
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
            
            /*
            Examples:
            var aomi = $.iframe();
            aomi(fn);
            aomi(html);
            aomi(head, body);
            
            aomi.history(-1);
            
            aomi.load(0); // index in history
            aomi.load(fn); // initialize? or bind callback for future 'load' events?
            aomi.load(html); // string, appended to body
            aomi.load(head, body);
            
            $.iframe.doctypes = {
                html5: '<!DOCTYPE html>'
            };
            
            aomi.doctype('html5') === $.iframe.doctypes['html5'];
            
            aomi.options(args) === {
                headContents:'',
                bodyContents:'',
                options:{},
                callback:function(){}
            };
            aomi.document(a1, a2, a3, a4) === aomi.document(
                aomi
                    .options($.makeArray(arguments))
                    .options()
            );
            aomi.options() === aomi._options;
            aomi.iframeLoad 
            
            
            */
            
            
            document : function(useCachedArgs){
                var
                    doc = this.window().attr('document'),
                    args;
                
                if (!arguments.length){
                    return $(doc || []);
                }
                if (doc){
                    if (useCachedArgs !== true){
                        // Cache supplied args
                        this.args.apply(this, arguments);
                    }
                    args = this.args();
                    doc.open();
                    doc.write(
                        this.doctype() + '\n' +
                        '<head></head><body></body>'                    
                    );
                    doc.close();
                }
                return this;
            },

            
            args : function(){
                var
                    args = $.makeArray(arguments),
                    found = {},
                    argsCache;
                
                // Get cached constructor arguments
                if (!this._args){
                    this._args = {
                        headContents: '',
                        bodyContents: '',
                        options: $.extend(true, {}, defaultOptions),
                        callback: function(){}
                    };
                }
                argsCache = this._args;
                if (!args.length){
                    return argsCache;
                }
                // All arguments are optional. Determine which were supplied.
                $.each(args.reverse(), function(i, arg){
                    if (!found.callback && $.isFunction(arg)){
                        found.callback = arg;
                    }
                    else if (!found.options && typeof arg === 'object' && !isJQuery(arg) && !isElement(arg)){
                        found.options = arg;
                    }
                    // TODO: If the bodyContents or headContents is a DOM node or jQuery collection, does this throw an error in some browsers? Probably, since we have not used adoptNode, and the nodes have a different ownerDocument. Should the logic in reload for falling back from adoptNode be taken into a more generic function that is used here?
                    else if (!found.bodyContents && typeof arg !== 'undefined'){
                        found.bodyContents = arg;
                    }
                    // Once callback and options are assigned, any remaining args must be the headContents; then exit loop
                    else if (!found.headContents && typeof arg !== 'undefined'){
                        found.headContents = arg;
                    }
                });
                $.extend(true, argsCache, found);
                return this;
            },
            
            options : function(newOptions){
                return newOptions ?
                    this.args(newOptions) :
                    this.args().options;
            },
            
            load : function(callback){
                return this.bind('load', callback);
            },
            
            ready : function(callback){
                return this.bind('ready', callback);
            },
            
            reload : function(extreme){
                // 'soft reload': re-apply src attribute
                if (!extreme || !this.hasBlankSrc()){
                    this.attr('src', this.attr('src'));
                }
                // 'hard reload': re-apply original constructor args
                else {
                    this.document(true);
                }
                return this.trigger('reload', !!extreme);
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
                var win = this._windowObj();
                if (win){ // For an injected iframe not yet in the DOM, then win is null
                    try { // For an external iframe, win is accessible, but $(win) will throw a permission denied error
                        return $(win);
                    }
                    catch(e){}
                }
                return $([]);
            },
            
            location : function(){
                var
                    win = this.window(),
                    loc = win.attr('location');
                
                return loc ?
                    loc.href : ( // location href is available, so iframe is in the DOM and is in the same domain
                        this._windowObj() ?
                            null : // iframe is in the DOM, but has a cross-domain document
                            this.attr('src') // iframe is out of the DOM, so its window doesn't exist and it has no location, return iframe element src
                    );
            },
            
            body : function(contents){
                var body = this.$('body');
                if (contents){
                    if (body.length){ // TODO: Perhaps this should also check if the 'ready' event has ever fired - e.g. in situations where iframe has just been added to the DOM, but has not yet loaded
                        body.append(contents);
                        this.trigger('bodyContents');
                    }
                    // Document not active because iframe out of the DOM. Defer till the next 'load' event.
                    else {
                        this.one('load', function(){
                            this.body(contents);
                        });
                    }
                    return this;
                }
                return body;
            },

            head : function(contents){
                var head = this.$('head');
                if (contents){
                    if (head.length){
                        head.append(contents);
                        this.trigger('headContents');
                    }
                    // Document not active because iframe out of the DOM. Defer till the next 'load' event.
                    else {
                        this.one('load', function(){
                            this.head(contents);
                        });
                    }
                    return this;
                }
                return head;
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
                return this.head('<style>' + cssText + '</style>');
            },
        
            // TODO: If bodyChildren is a block-level element (e.g. a div) then, unless specific css has been applied, its width will stretch to fill the body element which, by default, is a set size in iframe documents (e.g. 300px wide in Firefox 3.5). Is there a way to determine the width of the body contents, as they would be on their own? E.g. by temporarily setting the direct children to have display:inline (which feels hacky, but might just work).
            matchSize : function(){
                var
                    args = arguments,
                    matchWidth = (args.length>0) ? args[0] : true,
                    matchHeight = (args.length>1) ? args[1] : true,
                    htmlElement = this.$('html'),
                    bodyChildren = this.body().children(),
                    width = Math.max(htmlElement.width(), bodyChildren.width()),
                    height = Math.max(htmlElement.height(), bodyChildren.height());
                            
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
        
            // TODO: Add similar methods - e.g. prependTo, replaceWith
            appendTo : function(obj){
                $.fn.appendTo.call(this, obj);
                // TODO: If we group together manipulation events, the repaint call can be passed as an event listener to those manip events.
                if (browserRequiresRepaintForExternalIframes && this.hasExternalDocument()){
                    this.repaint();
                }
                if (!this.hasBlankSrc()){ // external iframes sometimes mess up their contents. TODO: Should this use .hasExternalDocument instead?
                    this.reload();
                }
                return this.trigger('appendTo');
            },
            
            // TODO: Currently, this will return true for an iframe that has a cross-domain src attribute and is not yet in the DOM. We should include a check to compare the domain of the host window with the domain of the iframe window - including checking document.domain property
            isSameDomain : function(){
                return this.location() !== null;
            },
            
            hasExternalDocument : function(){
                var loc = this.location();
                return loc === null || (loc !== 'about:blank' && loc !== win.location.href);
                // NOTE: the comparison with the host window href is because, in WebKit, an injected iframe may have a location set to that url. This would also match an iframe that has a src matching the host document url, though this seems unlikely to take place in practice.
                // NOTE: this also returns true when the iframe src attribute is for an external document, but the iframe is out of the DOM and so doesn't actually contain a document at that time
            },
            
            hasBlankSrc : function(){
                var src = this.attr('src');
                return !src || src === 'about:blank';
            },
            
            cache : function(){
	            var
	                doc = this.$()[0],
	                // Check if there's already cached head and body elements
	                cachedNodes = this._cachedNodes,
	                appendMethod, methodsToTry, htmlElement;
	                
	            if (!doc){ // iframe is not in the DOM
	                return this;
	            }
	            
                // This will run each time the iframe reloads, except for the very first time the iframe is inserted
	            if (cachedNodes){
                    // Methods to try, in order. If all fail, then the iframe will re-initialize.
                    methodsToTry = ['adoptNode', 'appendChild', 'importNode', 'cloneNode'];
                    appendMethod = $.iframe.appendMethod;
		            htmlElement = this.$('html').empty();
                    
                    // If we don't yet know the append method to use, then cycle through the different options. This only needs to be determined the first time an iframe is moved in the DOM, and only once per page view.
                    if (!appendMethod) {
                        appendMethod = this._findAppendMethod(doc, methodsToTry, htmlElement, cachedNodes) || 'reload';
                        $.iframe.appendMethod = appendMethod;
                    }
                    // If we've already determined the method to use, then use it
                    else if (appendMethod !== 'reload'){
                        this._appendWith(doc, appendMethod, htmlElement, cachedNodes);
                    }
                    // If the standard append methods don't work, then resort to re-initializing the iframe
                    if (appendMethod === 'reload'){
                        this.reload(true);
                    }
                    this
                        .title(this.options.title)
                        .trigger('restore', appendMethod);
	            }
	            
                // TODO: Fix incomplete images in WebKit. The problem: when a document is dropped while images in the document are still loading, then when the nodes are copied over to the new document, the image does not continue to load, and remains blank. The solution: a method that re-applies the src attribute of images, after adding them to the new document. Possibly check the image's 'complete' property, and only if it is not complete, then re-apply the src attribute. Need to verify if there is a performance impact of re-applying the src of an image that has already been cached.
	            
	            // Update the cached nodes
	            this._cachedNodes = this.head().add(this.body());
	            this.trigger('cache');
	            return this;
            },
            
            // Advised not to use this API method externally
            // Proxy for iframe's native load event, with free jQuery event handling
            iframeLoad : function(callback, unbind){
                var aomi = this;
                $(this[0])
                    [unbind ? 'unbind' : 'bind']
                    ('load', callback);
                return this;
            },
            
            _attachElement : function(){
                var
                    aomi = this,
                    options = this.options();
                $.fn.init.call(this, '<iframe></iframe>')
                    .css(options.css)
                    .attr(options.attr);
                
                // Bind 'ready' & 'load' handlers to the iframe's native 'onload' event
                return this.iframeLoad(
                    function readyTrigger(){                        
                        if (aomi._okToLoad()){
                        // TODO: Does okToLoad need to be tested after document(args) is called?
                            // If the iframe has properly loaded
                            aomi
                                // unbind this handler
                                .iframeLoad(readyTrigger, true)
                                // bind the 'load' handler for next time
                                .iframeLoad(function(){
                                    aomi.trigger('load');
                                })
                                // trigger events on AOMI object
                                .trigger('ready')
                                .trigger('load');
                        }
                        else {
                            // There's a problem with the iframe, so reload it
                            // TODO: Add a counter and prevent infinite reloading
                            aomi.reload();
                        }
                    }
                );
            },
            
            _windowObj : function(){
                return this[0].contentWindow;
            },
            
            _appendWith : function(doc, method, parentNode, childNodes){
                if ($.isFunction(doc[method])){
                    try {
                        childNodes.each(
                            function(){
                                var newNode;
                                switch (method){
                                    case 'cloneNode':
                                    newNode = this[method](true);
                                    break;
                                    
                                    case 'appendChild':
                                    newNode = this;
                                    break;
                                    
                                    default: // adoptNode & importNode
                                    newNode = doc[method](this, true);
                                }
                                parentNode.append(newNode);
                            }
                        );
                        return true;
                    }
                    catch(e){}
                }
                return false;
            },
            
            _findAppendMethod : function(doc, methods, parentNode, childNodes){
                var aomi = this, appendMethod;
                
                $.each(methods, function(i, method){
                    if (aomi._appendWith(doc, method, parentNode, childNodes)){
                        appendMethod = method;
                        return false;
                    }
                });
                                
                return appendMethod;
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
            }
        });
        
    
    // Extend jQuery with jQuery.iframe() and jQuery(elem).intoIframe()
    $.extend(
        true,
        {
            iframe : function(headContents, bodyContents, options, callback) {
                return new AppleOfMyIframe(headContents, bodyContents, options, callback);
            },
            fn : {
                // TODO: Allow multiple elements in a collection to be replaced with iframes, e.g. $('.toReplace').intoIframe()
                // TODO: Where the element doesn't have an explicit width set, the iframe will not be able to resize to it. One hacky method to determine the width: display the element inline, measure its width, then return the display and then set the width of the iframe.
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
