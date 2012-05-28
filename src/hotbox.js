// hotbox
(function ($, window, document, undefined) {

  // Helper function to create unique instances of object literals
  if ( typeof Object.create !== 'function' ) {
    Object.create = function( obj ) {
      function F(){}
      F.prototype = obj;
    };
  }

  var KEY_SCROLL_AMOUNT = 40,
      PAGE_SCROLL_AMOUNT = 535,
      ARROW_KEYS  = [38, 40],
      PAGE_KEYS   = [33, 34],
      UP_KEYS     = [33, 36, 38],
      DOWN_KEYS   = [34, 35, 40],
      HOME_KEYS   = [35, 36],
      SCROLL_KEYS = [33, 34, 35, 36, 38, 40];

  var Hotbox = {
    init: function (selector, opts) {
      var self = this;

      self.selector = selector;
      self.options = $.extend( {}, $.fn.hotbox.options, opts);
      self.options.history = (self.options.history && History !== undefined);

      self.title = document.title;
      self.startURL = location.href;

      self.cycle();
    },

    cycle: function () {
      var self = this;
      if(self.options.history) {
        self.enableHistory();
      } else {
        self.disableHistory();
      }
      self.createOverlay();
      self.createContainer();
      self.bindEvents();
      if(self.options.preventScroll) {
        self.preventScrolling();
      }
    },


    enableHistory: function () {
      var self = this;

      History.replaceState(null, document.title, document.location);
      self.bindStateChangeEvent();
    },

    bindStateChangeEvent: function () {
      var self = this;

      History.Adapter.bind(window,'statechange',function() {
        var state = History.getState();

        if(state.data && state.data.open === 1) {
          self.process();
        } else {
          self.hide( true );
        }
      });
    },

    process: function () {
      var self = this;

      self.downloadContent().then(self.display());
    },

    downloadContent: function () {
      var self = this;

      return $.ajax({
        url: self.url,
        dataType: 'html'
      }).done(function (html) {
        self.html = html;
        self.$container.html(html);
      });
    },

    display: function () {
      var self = this;

      self.options.beforeOpen.apply(self.$container);

      self.$overlay.fadeIn( 100, function () {
        self.open = true;
        self.options.afterOpen.apply(self.$container);
      });
    },

    hide: function ( emptyContainer ) {
      var self = this;

      emptyContainer = emptyContainer || false;
      self.options.beforeClose.apply(self.$container);

      self.$overlay.fadeOut( 100, function () {
        self.open = false;
        if (emptyContainer) {
          self.$container.empty();
        }
        self.options.afterClose.apply(self.$container);
      });
    },

    disableHistory: function () {
      var self = this;

      self.updateHistory = self.process;
      self.revertHistory = self.hide;
    },

    updateHistory: function () {
      var self = this;

      History.replaceState({open: 1}, self.title, self.url);
    },

    revertHistory: function () {
      var self = this;

      History.replaceState(null, self.title, self.startURL);
    },

    createOverlay: function () {
      var self = this,
          $overlay = $('#hotbox-overlay');

      if ($overlay.length === 0) {
        $overlay = $('<div></div>', {
          id: 'hotbox-overlay',
          'class': 'hotbox-overlay'
        }).prependTo('body');
      }
      self.$overlay = $overlay;
    },

    createContainer: function () {
      var self = this,
          $container = self.$overlay.find('#hotbox-content');

      if($container.length === 0) {
        $container = $('<div></div>', {
          id: 'hotbox-content',
          'class': 'hotbox-content'
        })
        .append($('<div></div>', {
            'class': 'hotbox-panels'
        }))
        .appendTo(self.$overlay);
      }

      if (self.options.maxWidth) {
        $container.css({
          'max-width': self.options.maxWidth
        });
      }

      self.$container = $container.find('.hotbox-panels');
    },

    bindEvents: function () {
      var self = this;

      self.bindOpenEvent();
      self.bindCloseEvent();

    },

    bindOpenEvent: function () {
      var self = this;

      $(self.options.container).on('click', self.selector, function (event) {
        var $this = $(this),
            url = $this.attr('href'),
            title = $this.attr('title') || document.title;

        event.preventDefault();
        self.title = title;
        self.url = url;

        self.updateHistory();
      });
    },

    bindCloseEvent: function () {
      var self = this;

      // Close hotbox if click anywhere outside
      $('body').on('click', function (event) {
        var panelClicked = $(event.target).closest('.hotbox-panels').length > 0;

        if(self.open && panelClicked === false) {
          self.revertHistory();
        }
      }).on('keydown', function (event) {
        var key = event.which;

        if(self.open && key === 27) {
          self.revertHistory();
        }
      });
    },

    preventScrolling: function () {
      var self = this;

      self.bindKeydownEvent();
      self.bindMousewheelEvent();
    },

    bindKeydownEvent: function () {
      var self = this;
      $('body').on('keydown', function (event) {
        var key = event.which,
            scrollKeyPressed = $.inArray(key, SCROLL_KEYS) > -1;

        if(self.open && scrollKeyPressed) {
          var currentPosition = self.$overlay.scrollTop(),
              direction = $.inArray(key, UP_KEYS) > -1 ? -1 : 1,
              amount = $.inArray(key, ARROW_KEYS) > -1 ? KEY_SCROLL_AMOUNT :
                       $.inArray(key, PAGE_KEYS) > -1 ? PAGE_SCROLL_AMOUNT :
                       self.$overlay.get(0).scrollHeight - self.$overlay.innerHeight(),
              newPosition = currentPosition + amount * direction;

          event.preventDefault();
          if(amount > KEY_SCROLL_AMOUNT) {
            self.$overlay.stop().animate({
              scrollTop: newPosition
            }, 200);
          } else {
            self.$overlay.scrollTop( newPosition );
          }
        }

      });
    },

    bindMousewheelEvent: function () {
      var self = this;
      // If we have a mousewheel event, bind to it
      if($.fn.mousewheel) {
        self.$overlay.on('mousewheel', function (event, delta, deltaX, deltaY) {
          var scrollingUp = deltaY > 0,
              scrollingDown = !scrollingUp,
              $this = $(this);

          if (scrollingUp && $this.scrollTop() === 0) {
            event.preventDefault();
          } else if (scrollingDown &&  $this.scrollTop() == $this.get(0).scrollHeight - $this.innerHeight()) {
            event.preventDefault();
          }
        });
      }
    }
  };

  $.fn.hotbox = function(opts) {
    var hotbox = Object.create( Hotbox );
    hotbox.init(this.selector, opts);
  };

  $.fn.hotbox.options = {

    preventScroll: true,
    maxWidth: false,
    history: false,
    container: 'body',

    beforeOpen: $.noop,
    afterOpen: $.noop,
    beforeClose: $.noop,
    afterClose: $.noop
  };

}(jQuery, window, document));