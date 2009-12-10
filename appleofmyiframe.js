function iframeElementMoved(){
                                console.log('DOMNodeInserted', this);
                                iframeAndParents.unbind('DOMNodeInserted', arguments.callee);
                                refreshBody();
                                iframeAndParents = that.parents().andSelf();
                                iframeAndParents.bind('DOMNodeInserted', iframeElementMoved);
                            }
                            if (nowPrimed){
                                refreshBody();
                            }
                            // Watch for DOM mutation events, then refresh the iframe body when moved
                            iframeAndParents = that.parents().andSelf();                            
                            iframeAndParents.bind('DOMNodeInserted', iframeElementMoved);
