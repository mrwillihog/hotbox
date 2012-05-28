hotbox
======

jQuery plugin for a scrollable lightbox that utilises the history API

Usage
=====

Include the hotbox.js source code and then hotbox-enable any links you like:

```js
$('a').hotbox();
```

If you want to prevent the main content from scrolling with the hotbox then include the mousewheel jquery plugin before hotbox:

```html
<script src="https://github.com/brandonaaron/jquery-mousewheel"></script>
```

To utilise the history API include the History.js API:

```html
<script src="https://github.com/balupton/History.js/"></script>
```

and enable the history option in hotbox:

```js
$('a').hotbox({
  history: true
});
```

The only other configuration option is ```maxWidth```, which limits the width of hotbox.

*WARNING* hotbox currently only supports links that return HTML via AJAX.