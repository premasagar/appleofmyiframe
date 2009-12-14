'use strict';

(function($){
    var appleOfMyIframe = $.extend(
        function(){},
        {
            init: function(args){
                var that = this, headContents, bodyContents, optionsFound, callback, attr;

                function isUrl(str){
                    return (/^https?:\/\/[\-\w]+\.\w[\-\w]+\S*$/).test(str);
                }
                function isElement(obj){
                    return obj && obj.nodeType === 1;
                }
                function isJQuery(obj){
                    return obj && !!obj.jquery;
                }
                
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
                
                if (bodyContents || headContents){
                    this.ready(function(){
                        if (bodyContents){
                            this.body(bodyContents);
                        }
                        if (headContents){
                            this.head(headContents);
                        }
                    });
                }
                if (callback){
                    this.ready(callback);
                }
            },
            
            ready: function(callback){
                
            },
            
            body: function(contents){
            
            },
            
            head: function(contents){
            
            }
        }
    );
}(jQuery));
