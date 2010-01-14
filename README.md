[AppleOfMyIframe](http://github.com/premasagar/appleofmyiframe)
================
*A JavaScript library for creating & manipulating iframe documents on-the-fly*


* by [Premasagar Rose](http://github.com/premasagar)
    * ([premasagar.com](http://premasagar.com) / [dharmafly.com](http://dharmafly.com))
* [MIT license](http://opensource.org/licenses/mit-license.php)
* ~2.7KB minified & gzipped


A jQuery Plugin
---------------
(so far tested only with jQuery v1.3.2)

### Creates methods:
1. jQuery.iframe()
2. jQuery(elem).intoIframe()


Contributors
------------
* [Alastair James](http://github.com/onewheelgood)
* [Jonathan Lister](http://jaybyjayfresh.com)


Example usage
-------------

**1. Create an iframe with some body contents, and add it to the document:**
    $.iframe('<p>hello world</p>') // Add contents to the iframe's body
        .appendTo('body'); // Manipulate, as with any other jQuery collection

**2. Additionally, add elements to the iframe's head:**
    $.iframe(
        '<style>background-color:green;</style>',
        '<p>hello world</p>'
    )
        .appendTo('body');


**3. And change various options:**
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


**4. And supply a callback function, for when the iframe first loads:**
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

**5. Inject elements that are already in the host document into an iframe
    $('<p>Hello world</p>') // A standard jQuery collection
        .appendTo('body')
        .intoIframe(); // Inject into the body of an iframe, then insert the iframe


More advanced methods also available.
