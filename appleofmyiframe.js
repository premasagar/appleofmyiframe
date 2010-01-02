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
    // Anon and on
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
                allowTransparency:true
            },
            src:'about:blank', // don't include in attr object, or unexpected triggering of 'load' event may happen on applying attributes
            doctype:5, // html5 doctype
            autoresize:true,
            target:'_parent', // which window to open links in, by default - set to '_self' or '_blank' if necessary
            css:$.extend({}, cssPlain),
            title:''
        },
                
        // Main class
        AppleOfMyIframe = new JqueryClass({
            initialize: function(){
                var 
                    // Cache the constructor arguments, to enable later reloading
                    args = this.args($.makeArray(arguments))
                        .args(), // retrieve the sorted arguments
                    options = this.options(),
                    fromReload;
                
                // If a url supplied, add it as the iframe src, to load the page
                if (isUrl(args.bodyContents)){
                    options.src = args.bodyContents;
                    
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
                            // Prepare the iframe document
                            /*
                            if (browserNeedsDocumentPreparing){
                                this.document(true);
                            }
                            */
                            this.document(true); // always needs to take place, to allow doctype assignment
                    });
                    
                    // Setup iframe document caching
                    // Ridiculously, each time the iframe element is moved, or removed and re-inserted into the DOM, then the native onload event fires and the iframe's document is discarded. (This doesn't happen in IE, thought). So we need to bring back the contents from the discarded document, by caching it and restoring from the cache on each 'load' event.
                    if (browserDestroysDocumentWhenIframeMoved){
                        this
                            // Track when an 'extreme' reload takes place
                            .bind('extremereloadstart', function(){
                                fromReload = true;
                            })
                            .load(function(ev){
                                // If an extreme reload, then don't restore from cached nodes - a) because the original constructor args are used, b) because probably the browser doesn't support adoptNode, etc, so we'll end up reloading again anyway during cache(), leading to an infinite loop          
                                if (fromReload){
                                    fromReload = false;
                                }
                                // Restore from cached nodes. Not restored if the body already has contents.
                                // TODO: Could it be problematic to not restore when there is already body contents? Should we check for head contents too?
                                else if (!this.body().children().length){
                                    this.restore();
                                }
                                this.cache();
                            });
                    }
                    // Setup auto-resize event listeners
                    if (options.autoresize){
                        this
                            .bind('headContents', this.resize)
                            .bind('bodyContents', this.resize);
                            // TODO: How should this be simplified, so that a call to contents() doesn't lead to two calls to resize()? In this function, we could use the 'contents' event, but it makes sense to use 'headContents' and 'bodyContents' for general usage.
                            // TODO: should this use setTimeout of 250ms, to allow rendering time (particularly in Firefox)?
                    }
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
        
            $: function(arg){
                var doc = this.document();
                return arg ? $(arg, doc) : doc;
            },
            
            
            // doctype() examples:
                // this.doctype(5);
                // this.doctype(4.01, 'strict');
                // this.doctype() // returns doctype object
            doctype: function(v){
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
            trigger: function(type, data){
                // DEBUG LOGGING
                var debug = [this.attr('id') + ': *' + type + '*'];
                if (data){
                    debug.push(data);
                }
                //debug.push(arguments.callee.caller);
                _.apply(null, debug);
                // end DEBUG LOGGING
                
                event.trigger(type + '.' + ns, data, this);
                return this;
            },
            
            bind: function(type, callback){
                event.add(this, type + '.' + ns, callback);
                return this;
            },
            
            unbind: function(type, callback){
                event.remove(this, type + '.' + ns, callback);
                return this;
            },
            
            one: function(type, callback){
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
            => aomi.document(head, body); // etc
            
            $.iframe.doctypes = {
                html5: '<!DOCTYPE html>'
            };
            
            aomi.doctype('html5') === $.iframe.doctypes['html5'];
            */
            
            document: function(){
                var
                    doc = this.window().attr('document'),
                    args = $.makeArray(arguments),
                    options, applyCachedArgs;
                
                if (!args.length){
                    return $(doc || []);
                }
                if (args[0] === true){
                    applyCachedArgs = true;
                }
                else {
                    // Cache supplied args
                    this.args(args);
                }
                // Doc is ready for manipulation
                if (doc){
                    doc.open();
                    doc.write(
                        this.doctype() + '\n' +
                        '<head></head><body></body>'                    
                    );
                    doc.close();
                    
                    // Re-apply cached options & args, e.g. when preparing a new iframe document
                    if (applyCachedArgs){
                        args = this.args();
                        options = this.options();
                                                
                        this
                            ._trim()
                            .args(true)
                            // Let anchor links open pages in the default target
                            .live('a', 'click', function(){
                                if (!$(this).attr('target') && $(this).attr('href')){
                                    $(this).attr('target', options.target);
                                }
                            });
                        // Call the ready callback - TODO: Should this really be done?
                        args.callback.call(this);
                    }
                    this.trigger('document', applyCachedArgs);
                }
                // Doc not ready, so apply arguments at next load event
                else {
                    this.one('load', function(){
                        this.document(true);
                    });
                }
                return this;
            },
            
            args: function(){
                var
                    aomi = this,
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
                
                // An array of args was passed. Re-apply as arguments to this function.
                if ($.isArray(args[0])){
                    return this.args.apply(this, args[0]);
                }
                
                // All arguments are optional. Determine which were supplied.
                $.each(args.reverse(), function(i, arg){
                    if (arg === true){
                        // apply cached options and constructor arguments; prepare a new iframe document
                        aomi
                            .options(true)
                            .contents(argsCache.headContents, argsCache.bodyContents, true);
                        // Call the ready callback - TODO: Should this really be done?
                        argsCache.callback.call(aomi);
                        return false; // exit $.each loop
                    }                   
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
            
            options: function(newOptions){
                var args, options;
                
                if (newOptions){
                    if (typeof newOptions === 'object'){
                        this.args(newOptions);
                    }
                    else if (newOptions === true){
                        args = this.args();
                        options = this.options();
                        
                        this
                            // Re-apply cached title
                            .title(true)
                            
                            // Let anchor links open pages in the default target
                            .live('a', 'click', function(){
                                if (!$(this).attr('target') && $(this).attr('href')){
                                    $(this).attr('target', options.target);
                                }
                            })
                            // iframe element manipulation
                            .css(options.css)
                            .attr(options.attr);
                    }
                    return this;
                }
                // !newOptions
                return this.args().options;
            },                
            
            load: function(callback){
                return this.bind('load', callback);
            },
            
            ready: function(callback){
                return this.bind('ready', callback);
            },
            
            reload: function(extreme){
                // 'soft reload': re-apply src attribute
                if (!extreme || !this.hasBlankSrc()){
                    this.attr('src', this.attr('src'));
                    // TODO: Should this also call document('')?, as it seems in Opera 10.10 to require doc.open().write().close() in order for body to have node. But then, that would trigger a new 'load' event.
                }
                // 'hard reload': re-apply original constructor args
                else {
                    this.trigger('extremereloadstart', !!extreme);
                    this.document(true);
                }
                return this.trigger('reload', !!extreme);
            },
            
            // Trigger a repaint of the iframe - e.g. for external iframes in IE6, where the contents aren't always shown at first
            repaint: function(){
                var className = ns + '-repaint';
                this
                    .addClass(className)
                    .removeClass(className);
                return this.trigger('repaint');
            },
        
            window: function(){
                var win = this._windowObj();
                if (win){ // For an injected iframe not yet in the DOM, then win is null
                    try { // For an external iframe, win is accessible, but $(win) will throw a permission denied error
                        return $(win);
                    }
                    catch(e){}
                }
                return $([]);
            },
            
            location: function(){
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
            
            contents: function(headContents, bodyContents, emptyFirst){
                if (typeof bodyContents === 'undefined'){
                    bodyContents = headContents;
                    headContents = false;
                }
                this.head(headContents, emptyFirst);
                this.body(bodyContents, emptyFirst);
                return this.trigger('contents');
            },

            head: function(contents, emptyFirst){
                var head = this.$('head');
                if (typeof contents !== 'undefined' && contents !== false){
                    if (head.length){
                        if (emptyFirst){
                            head.empty();
                        }
                        head.append(contents);
                        this.trigger('headContents');
                    }
                    // Document not active because iframe out of the DOM. Defer till the next 'load' event.
                    else {
                        this.one('load', function(){
                            this.head(contents, emptyFirst);
                        });
                    }
                    return this;
                }
                return head;
            },
            
            body: function(contents, emptyFirst){
                var body = this.$('body');
                if (typeof contents !== 'undefined' && contents !== false){
                    if (body.length){ // TODO: Perhaps this should also check if the 'ready' event has ever fired - e.g. in situations where iframe has just been added to the DOM, but has not yet loaded
                        if (emptyFirst){
                            body.empty();
                        }
                        body.append(contents);
                        this.trigger('bodyContents');
                    }
                    // Document not active because iframe out of the DOM. Defer till the next 'load' event.
                    else {
                        this.one('load', function(){
                            this.body(contents, emptyFirst);
                        });
                    }
                    return this;
                }
                return body;
            },
            
            title: function(title){
                if (title === true){
                    return this.title(this.options().title);
                }
                if (typeof title !== 'undefined'){
                    this.options().title = title;
                    this.$().attr('title', title);
                    return this;
                }
                return this.$().attr('title');
            },
            
            style: function(cssText){
                return this.head('<style>' + cssText + '</style>');
            },
        
            // TODO: If bodyChildren is a block-level element (e.g. a div) then, unless specific css has been applied, its width will stretch to fill the body element which, by default, is a set size in iframe documents (e.g. 300px wide in Firefox 3.5). Is there a way to determine the width of the body contents, as they would be on their own? E.g. by temporarily setting the direct children to have display:inline (which feels hacky, but might just work).
            resize: function(matchWidth, matchHeight){
                var
                    bodyChildren = this.body().children(),
                    width, height, htmlElement;
                                    
                if (bodyChildren.length){
                    width = bodyChildren.outerWidth(true);
                    height = bodyChildren.outerHeight(true);
                }
                else {
                    htmlElement = this.$('html');
                    width = htmlElement.outerWidth(true);
                    height = htmlElement.outerHeight(true);
                }
                
                if (matchWidth !== false){
                    this.width(width);
                }
                if (matchHeight !== false){
                    this.height(height);
                }
                return this.trigger('resize', [width, height]);
            },
        
            // TODO: Add similar methods - e.g. prependTo, replaceWith
            appendTo: function(obj){
                $.fn.appendTo.call(this, obj);
                // TODO: If we group together manipulation events, the repaint call can be passed as an event listener to those manip events.
                if (browserRequiresRepaintForExternalIframes && this.hasExternalDocument()){
                    this.repaint();
                }
                if (!this.hasBlankSrc()){ // external iframes sometimes mess up their contents.
                // TODO: 1) Should this use hasExternalDocument() instead? 2) This doesn't need the call to repaint() above as well 3) Did this only become necessary because the check for okToLoad in iframeLoad() is now before, and not after, the document has been open()'ed and close()'d?
                    this.reload();
                }
                return this.trigger('appendTo');
            },
            
            // TODO: Currently, this will return true for an iframe that has a cross-domain src attribute and is not yet in the DOM. We should include a check to compare the domain of the host window with the domain of the iframe window - including checking document.domain property
            isSameDomain: function(){
                return this.location() !== null;
            },
            
            hasExternalDocument: function(){
                var loc = this.location();
                return loc === null || (loc !== 'about:blank' && loc !== win.location.href);
                // NOTE: the comparison with the host window href is because, in WebKit, an injected iframe may have a location set to that url. This would also match an iframe that has a src matching the host document url, though this seems unlikely to take place in practice.
                // NOTE: this also returns true when the iframe src attribute is for an external document, but the iframe is out of the DOM and so doesn't actually contain a document at that time
            },
            
            hasBlankSrc: function(){
                var src = this.attr('src');
                return !src || src === 'about:blank';
            },
            
            cache: function(){	            
	            // iframe is not in the DOM
	            if (!this.$()[0]){
	                return this;
	            }
	            
	            // Update the cached nodes
	            this._cachedNodes = this.head().add(this.body());
	            this.trigger('cache');
	            return this;
            },
            
            restore: function(){
                // Methods to try, in order. If all fail, then the iframe will re-initialize.
                var
                    methodsToTry = ['adoptNode', 'appendChild', 'importNode', 'cloneNode'],
                    appendMethod = $.iframe.appendMethod,
	                htmlElement = this.$('html').empty(),
                    doc = this.$()[0],
	                cachedNodes = this._cachedNodes;
	                
	            if (!doc || !cachedNodes){
	                return this;
	            }
	            
                // If we don't yet know the append method to use, then cycle through the different options. This only needs to be determined the first time an iframe is moved in the DOM, and only once per page view.
                if (!appendMethod){
                    appendMethod = this._findAppendMethod(doc, methodsToTry, htmlElement, cachedNodes) || 'reload';
                    $.iframe.appendMethod = appendMethod;
                }
                // If we've already determined the method to use, then use it
                else if (appendMethod !== 'reload'){
                    this._appendWith(doc, appendMethod, htmlElement, cachedNodes);
                }
                // If the standard append methods don't work, then reload the iframe, using the original constructor arguments.
                if (appendMethod === 'reload'){
                    // Remove the cached nodes, to prevent the reload triggering a new 'load' event => call to cache() => infinite loop
                    delete this._cachedNodes; 
                    this.reload(true);
                }
                else {
                    // Apply cached options
                    this.options(true);
                }
                
                return this.trigger('restore', appendMethod);
            },
            
            // Advised not to use this API method externally
            // Proxy for iframe's native load event, with free jQuery event handling
            iframeLoad: function(callback, unbind){
                $(this[0])
                    [unbind ? 'unbind' : 'bind']
                    ('load', callback);
                return this;
            },
            
            _attachElement: function(){
                var aomi = this;
                // Absorb a jQuery-wrapped iframe element into the AOMI object
                $.fn.init.call(this, '<iframe></iframe>');
                this.attr('src', this.options().src);
                
                // Bind 'ready' & 'load' handlers to the iframe's native 'onload' event
                return this
                    // Apply attributes, styling and contents
                    .options(true)
                    // Set a handler for the native iframe 'load' event
                    .iframeLoad(
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
            
            _windowObj: function(){
                return this[0].contentWindow;
            },
            
            _appendWith: function(doc, method, parentNode, childNodes){
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
            
            _findAppendMethod: function(doc, methods, parentNode, childNodes){
                var aomi = this, appendMethod;
                
                $.each(methods, function(i, method){
                    if (aomi._appendWith(doc, method, parentNode, childNodes)){
                        appendMethod = method;
                        return false;
                    }
                });
                                
                return appendMethod;
            },
            
            _trim: function(){
                this.body()
                    .css(cssPlain);
                return this;
            },
            
            _hasSrcMismatch: function(){
                return (this.hasBlankSrc() && this.hasExternalDocument());
            },
            
            // A check to prevent the situation where an iframe with an external src is on page, as well as an injected iframe; if the iframes are moved in the DOM and the page reloaded, then the contents of the external src iframe may be duplicated into the injected iframe (seen in FF3.5 and others). This function re-appplies the 'about:blank' src attribute of injected iframes, to force a reload of its content
            _okToLoad: function(){
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
            iframe: function(headContents, bodyContents, options, callback) {
                return new AppleOfMyIframe(headContents, bodyContents, options, callback);
            },
            fn : {
                // TODO: Allow multiple elements in a collection to be replaced with iframes, e.g. $('.toReplace').intoIframe()
                // TODO: Where the element doesn't have an explicit width set, the iframe will not be able to resize to it. One hacky method to determine the width: display the element inline, measure its width, then return the display and then set the width of the iframe.
                intoIframe: function(headContents, options, callback){
                    var aomi = $.iframe(headContents, this, options, callback);
                    aomi.replaceAll(this);
                    return aomi;
                }
            }
        }
    );
    
}(jQuery));

/*jslint onevar: true, browser: true, devel: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, strict: true, newcap: true, immed: true */
