AppleOfMyIframe
===============
* A JavaScript library for creating & manipulating iframe documents on-the-fly *
http://github.com/premasagar/appleofmyiframe

author
------
    Premasagar Rose
        premasagar.com
        dharmafly.com

license
-------
    opensource.org/licenses/mit-license.php

**

requires jQuery
---------------
    (so far tested only with jQuery v1.3.2)

    creates two methods:
        jQuery.iframe()
        jQuery(elem).intoIframe()
    
**

contributors
------------
    Alastair James: github.com/onewheelgood
    Jonathan Lister: jaybyjayfresh.com

**

~2.7KB minified & gzipped

**

example uses
------------    
    
    $.iframe('<p>hello world</p>') // Add contents to the iframe's body
        .appendTo('body'); // Manipulate, as with any other jQuery collection
        
        
    
    $.iframe(
        '<style>background-color:green;</style>', // Add contents to the iframe's head
        '<p>hello world</p>'
    )
        .appendTo('body');
        
        
    
    $.iframe(
        '<style>background-color:green;</style>',
        '<p>hello world</p>',
        { // Options object
            title:"Jimbob", // document title
            doctype:5, // HTML5 doctype
            autoheight:true, // Automatically resize the iframe's height, as new content is added and removed from the iframe's document body
            autowidth:false // As above, for the iframe's width
        }
    )
        .appendTo('body');
        
        
    
    $.iframe(
        '<style>p {color:green;}</style>',
        '<p>hello world</p>',
        {
            title:"Jimbob", // document title
            doctype:5, // HTML5
            autowidth:false, // Whether to automatically resize the width of the iframe element, as new content is added and removed from the document body
            autoheight:true // As for autowidth, but for the iframe height
        },
        function(){ // Callback function, executed when the iframe is ready
            alert('iframe has loaded');
            this.body('<p>hello again</p>'); // Other methods also available
        }
    )
        .appendTo('body');
        
        
        
    $('<p>Hello world</p>') // A standard jQuery collection
        .appendTo('body')
        .intoIframe(); // Insert the collection into the body of an iframe, and replace that collection with the iframe
            
            
        
More advanced methods also available.
