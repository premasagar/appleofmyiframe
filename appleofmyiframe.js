/**
* AppleOfMyIframe
*     v0.5
**

    A jQuery plugin for manipulating programmatically created iframe DOM elements with injected HTML contents.
    
    by Premasagar Rose
        http://premasagar.com
        http://dharmafly.com
    
    **

    Methods added:
        jQuery.iframe(),    jQuery(elem).intoIframe()
        
    **
    
    TODO
        Intelligent resizing to body contents, whenever the body needs re-creating, or is modified - done. but only on first creation
        
        Store options as .data()?
        Store AOMI instance as $(iframe).data('aomi');
        
        $.iframe('#myDiv') === $('#myDiv').intoIframe() // [except that the former returns the iframe object, not the contents]
        
        Remove hideInDom method and only cache in data (documentFragment ?)
        Also, 
        
        STYLES:
        $.iframe('<html><head> ... </head><body> ... </body><html>');

        $.iframe('<p>hello</p>');
        
        $.iframe().style('stylesheet.css');
        -> $.iframe().head('<link rel="stylesheet" href="stylesheet.css" />');

        
        // To support head, try caching html element
        var d = $.iframe('<p>hi</p>').appendTo('body');
        var s = $('<html></html>');
        $(d.document().documentElement).replaceWith(s);
        //d.body('ho');
        
        $(d.document().documentElement).find('head');
        
**/

(function($){ // optional args: contents, options, callback
    // AppleOfMyIframe constructor
    var 
        ns = 'appleOfMyIframe',
        AppleOfMyIframe = $.extend(
            function(){
                this.init(arguments);
            },
            {
                // AppleOfMyIframe prototype
                prototype: $.extend(
                    {},
                    // Mixin the jQuery prototype methods. Modify some of them.
                    (function(){
                        var methods = {};
                        
                        $.each($.fn, function(method, fn){
                            // For methods that move the iframe to a different position in the DOM, we want to restore the iframe body, and also use the AOMI object as the 'this' keyword instead of the iframe element.
                            // TODO: Should we make these available on body() so that they manipulate the iframe element?
                            if (method.match(/appendTo|prependTo|insertBefore|insertAfter|replaceAll/)){
                                methods[method] = function(){
                                    fn.apply(this, arguments);
                                    this.body(); // Prepare the iframe document and cache its body, if not yet done
                                    this.hideInDom.remove(); // remove the hidden div if it's empty
                                    return this;
                                };
                            }
                            // For methods that involve modifying the contents of the iframe, let the modification happen on the iframe body
                            else if (method.match(/append|prepend|html|text|wrapInner/)){
                                methods[method] = function(){
                                    fn.apply(this.body(), arguments);
                                    if (this.options.autoresize){ // TODO: Ideally, whenever content is manipulated inside the iframe's body, then it would be good to matchSize() at that point, e.g. by using the DOM mutation event on the body contents...
                                        this.matchSize();
                                    }
                                    this.hideInDom.remove(); // remove the hidden div if it's empty
                                    return this;
                                };
                            }
                            else {
                                methods[method] = fn;
                            }
                        });
                        return methods;
                    })(),
                    {
                        init: function(args){
                            var that = this, contents, optionsFound, callback, attr;
                            
                            this.options = {
                                attr:{
                                    scrolling:'no',
                                    frameborder:0,
                                    marginheight:0,
                                    allowtransparency:true
                                },
                                autoresize:true
                            };

                            function isUrl(str){
                                return (/^https?:\/\/[\-\w]+\.\w[\-\w]+\S*$/).test(str);
                            }
                            function isElement(obj){
                                return obj && obj.nodeType === 1;
                            }
                            function isJQuery(obj){
                                return obj && !!obj.jquery;
                            }
                            
                            // All arguments are optional, so we need to determine which have been supplied
                            $.each($.makeArray(args).reverse(), function(i, arg){
                                if (!callback && $.isFunction(arg)){
                                    callback = arg;
                                }
                                else if (!optionsFound && typeof arg === 'object' && !isJQuery(arg) && !isElement(arg)){
                                    optionsFound = true;
                                    $.extend(true, that.options, arg);
                                }
                                // Once callback and options are assigned, any remaining arg must be the contents; then exit loop
                                else if (!contents && typeof arg !== 'undefined'){
                                    contents = arg;
                                    return false;
                                }
                            });
                            
                            attr = this.options.attr;
                            
                            // If a url supplied, add it as the iframe src, to load the page
                            if (isUrl(contents)){
                                attr.src = contents;
                            }
                         
                            // Absorb iframe into this object
                            $.fn.init.call(this, '<iframe></iframe>')
                                // Bind a trigger for the internal 'iframe.ready' event to the iframe's onload handler. This will call any .ready() callbacks.
                                .onload(function(){
                                    $.event.trigger('iframe.ready', null, this); // Use $.event.trigger() instead of this.trigger()
                                })
                                // Add attributes
                                .attr(attr);

                            // If callback supplied, add it to the stack, via the .ready() method
                            if (callback){
                                this.ready(callback);
                            }
                            
                            // Inject contents, if supplied
                            if (contents && !attr.src){
                                this.body(contents);
                            }
                            return this;
                        },
                        // Returns the iframe contentDocument (equivalent to window.document), or false if the iframe has not yet been inserted into the DOM
                        document: function(){
                            return this[0].contentDocument || (this[0].contentWindow ? this[0].contentWindow.document : false);
                        },
                        // TODO: Add a parallel head() method, and perhaps move some of the generic functionality to a different method(?)
                        body: function(contents){
                            var that, doc, $bodyCache, src, $body, nowPrimed;
                            that = this;
                            
                            doc = this.document();
                            $bodyCache = this.data('body'); // look for cached body - TODO: Since we need to add a head() method, we either need to cache the body and head separately or, better, cache the whole document so that it encloses both body and head
                            src = this.attr('src');
                            
                            if (!doc){ // if iframe element is not within the DOM
                                // TODO: Instead of adding to a hidden div, instead just cache the intended contents, and insert it next time
                                this.hideInDom(); // Add to an invisible element in the DOM
                                doc = this.document();
                            }
                            if (!src && doc.URL === 'about:blank'){ // document not yet primed for manipulation - TODO: test cross-browser (only checked in FF 3.5) test with: $.iframe('<p>blah</p>').appendTo('body')
                                doc.open().close();
                                nowPrimed = true;
                            }
                            try {
                                $body = $(doc.documentElement).find('body');
                                // Note: When the host doc is on file:/// and the iframe is external, the body is successfully returned and has length === 1, but it is not manipulatable. If the host doc is http:// and the iframe is external, then the catch() block will execute instead.
                            }
                            catch(e){
                                return $([]);
                            }
                            
                            if (nowPrimed){
                                if ($bodyCache){
                                    $body.replaceWith($bodyCache.clone(true));
                                    $body = $bodyCache;
                                }
                                // First time iframe has been created
                                else {
                                    this.data('body', $body);
                                    $body.data('frameElement', this);
                                    $(window).unload(function(){ // reduce memory leaks by removing data on window.unload
                                        that.removeData();
                                    });
                                    // fit iframe dimensions to body dimensions, if the iframe has not had a size specified
                                    /*if (!options.attr.width && !options.attr.height){
                                        this.matchSize();
                                    }*/
                                }
                            }
                            return contents ? this.append(contents) : $body;
                        },
                        // Set dimensions of iframe element to that of its inner body.
                        // TODO: Are offsetHeight, offsetWidth, scrollHeight or scrollWidth properties of <iframe/> element useful here instead?
                        // TODO: Separate methods for horiz and vert size, e.g. matchXSize() and matchYSize()
                        matchSize: function(){
                            var $body = this.body();
                            return this
                                .height($body.height())
                                .width($body.width()); // Note that width will only be changed if the iframe body contains content of a specified width. Otherwise, it'll remain as the browser's default width for an iframe (e.g. 300px in Firefox)
                        },
                        // The callback function has the iframe jQuery object as the 'this' keyword. If is a local iframe, then contents of iframe's body will be the first arg of the argument
                        // Not required when injecting HTML contents
                        // This activates when iframe body has loaded all HTML, CSS, JS and images (etc) - not just when the DOM is ready
                        onload: function(callback){
                            var that = this, iframe = this[0];
                            iframe.onload = function(){ // TODO: does this work in Opera?
                                callback.call(that);
                            };
                            if (iframe.attachEvent){ // IE
                                iframe.attachEvent('onload', iframe.onload);
                            }
                            return this;
                        },
                        ready: function(callback){
                            $.event.add(this, 'iframe.ready', callback); // We use $.event.add instead of this.bind()
                        },
                        // An invisible element in the DOM for preparing iframes that are not yet in the DOM
                        // TODO: This can now be axed. It has been used for situation when iframe element is not yet in DOM, but iframe body contents has been supplied. In such a situation, however, we can simply cache the body contents and wait until the iframe element is append'edTo some element in the DOM, when the body contents can be retrieved from the cache.
                        hideInDom: $.extend(
                            function(){
                                var $dom = $('#' + ns);                                
                                if (!$dom.length){
                                    $dom = $('<div></div>')
                                        .attr('id', ns)
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
                                }
                                return this.appendTo($dom);
                            },
                            {
                                // TODO: What is the best way to fire the .remove() method when this dom element is emptied?, e.g. due to $('body').append($.iframe());
                                // TODO: Can this be called via a .ready() callback?
                                remove: function(force){ // remove if empty, or if boolean true passed
                                    var $dom = $('#' + ns);
                                    if (force || !$dom.children().length){
                                        $dom.remove();
                                        return true;
                                    }
                                    return false;
                                }
                            }
                        )
                    }
                )
            }
        );
    
    // Add $.iframe() method 
    
    // EXTEND JQUERY
    $.extend(
        true,
        $,
        {
            // STATIC METHODS
            // $.iframe()
            iframe: function(contents, options, callback){
                return new AppleOfMyIframe(contents, options, callback);
            },
            
            // ELEMENT METHODS
            fn: {
                // $(elem).intoIframe()
                intoIframe: function(options, callback){ // TODO: Allow multiple elements in a collection to be replaced with iframes $('.myDivs').intoIframe() 
                    return $.iframe(options, callback)
                        .replaceAll(this)
                        .body(this)
                            .contents();
                }
            }
        }
    );
})(jQuery);

/* end: AppleOfMyIframe */
