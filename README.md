[AppleOfMyIframe](http://github.com/premasagar/appleofmyiframe)
================
*A JavaScript library for creating & manipulating iframe documents on-the-fly*


* by [Premasagar Rose](http://github.com/premasagar) - ([premasagar.com](http://premasagar.com), [dharmafly.com](http://dharmafly.com))
* [MIT license](http://opensource.org/licenses/mit-license.php)
* ~2.7KB minified & gzipped
* Contributors:
** [Alastair James](http://github.com/onewheelgood)
** [Jonathan Lister](http://jaybyjayfresh.com)


AppleOfMyIframe is a jQuery Plugin. It aims to provide a simple API for the manipulation of iframe elements and their contents.

Overview
--------
iframes are commonly used to embed external documents in a web page (via the element's `src` attribute). However, they are rarely used for another purpose: to create a brand new document on-the-fly, via JavaScript within a host document. This can be useful, for example, to protect the iframe document's contents from the CSS and JavaScript contained within the host document - for example, when creating widgets and other kinds of modular user interfaces.

The standard JavaScript API for achieving this is pretty convoluted and fragile, and the behaviour of iframe documents can vary wildly between different browsers. As a result, it has been tricky to take advantage of the potential for this technique.

As an example of this quirky behaviour: when an iframe element is created, and a document created within it, and some content put into the document's body, if the iframe element is moved to a different part of the host document's DOM (e.g. if it is drag-and-dropped, or shifted to a new position), then the iframe's document is completely destroyed, and its contents is lost. That is, except in Interet Explorer, which has its own quirks.

AppleOfMyIframe aims to smooth over all these differences between browsers, and bring iframe documents closer to being a first-class citizen in the host document's DOM. All with a jQuery style of simple, intuitive, chainable methods.


jQuery Methods
--------------
The plugin creates two methods:
1. jQuery.iframe()
    This is used to create a new iframe element, wrapped inside a standard jQuery collection (i.e. `$('<iframe></iframe>')`) that has been extended with some additional methods.
2. jQuery(elem).intoIframe()
    Probably less useful. This is used to replace elements in the host document with an iframe that contains those elements in the iframe's document body. (See below).


Example usage
-------------

1. Create an iframe with some body contents, and add it to the document:
        $.iframe('<p>hello world</p>') // Add contents to the iframe's body
            .appendTo('body'); // Use any jQuery method here

2. Additionally, add elements to the iframe's head:
        $.iframe(
            '<style>background-color:green;</style>',
            '<p>hello world</p>'
        )
            .appendTo('body');


3. And change various options:
        $.iframe(
            '<style>background-color:green;</style>',
            '<p>hello world</p>',
            { // Options object
                title:"Jimbob", // document title
                doctype:5, // HTML5 doctype
                autoheight:true, // Automatically resize iframe height, when content is added or removed from the iframe's body
                autowidth:false // As above, for the iframe width
            }
        )
            .appendTo('body');


4. And supply a callback function, for when the iframe first loads:
        $.iframe(
            '<style>p {color:green;}</style>',
            '<p>hello world</p>',
            {
                title:"Jimbob",
                doctype:5,
                autowidth:false,
                autoheight:true
            },
            function(){ // Callback function
                alert('iframe has loaded');
                this.body('<p>hello again</p>');
            }
        )
            .appendTo('body');

5. Inject elements that are already in the host document into an iframe:
        $('<p>Hello world</p>') // A standard jQuery collection
            .appendTo('body')
            .intoIframe(); // Inject into the body of an iframe, then insert the iframe


More advanced methods also available. See the project wiki.
