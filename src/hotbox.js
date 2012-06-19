;(function ($, window, document, undefined) {

  // Helper function to create unique instances of object literals
  if ( typeof Object.create !== 'function' ) {
    Object.create = function( obj ) {
      function F(){}
      F.prototype = obj;
      return new F();
    };
  }

  var STATE_CHANGE_BOUND = false,
      CURRENT_HOTBOX,
      LOADER;

  var KEY_SCROLL_AMOUNT = 40,
      PAGE_SCROLL_AMOUNT = 535,
      ARROW_KEYS  = [38, 40],
      PAGE_KEYS   = [33, 34],
      UP_KEYS     = [33, 36, 38],
      DOWN_KEYS   = [34, 35, 40],
      HOME_KEYS   = [35, 36],
      SCROLL_KEYS = [33, 34, 35, 36, 38, 40],
      RIGHT_ARROW = 39,
      LEFT_ARROW  = 37;

  var bindStateChangeEvent = function () {
    if(typeof History !== 'undefined' && History.enabled) {
      History.Adapter.bind(window,'statechange',function() {
        var self = CURRENT_HOTBOX;
        var state = History.getState();

        if(state.data && state.data.open === 1) {
          self.process();
        } else {
          self.hide( true );
        }
      });
    }
  };

  var scrollKeyEvent = function (event) {
    var self = CURRENT_HOTBOX;

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
  };

  var mousewheelEvent = function (event, delta, deltaX, deltaY) {
    var self = CURRENT_HOTBOX;

    var scrollingUp = deltaY > 0,
        scrollingDown = !scrollingUp,
        $this = $(this);

    if (scrollingUp && $this.scrollTop() === 0) {
      event.preventDefault();
    } else if (scrollingDown &&  $this.scrollTop() == $this.get(0).scrollHeight - $this.innerHeight()) {
      event.preventDefault();
    }
  };

  var navKeyEvent = function (event) {
    var self = CURRENT_HOTBOX;

    var key = event.which,
        nextKeyPressed = key == RIGHT_ARROW,
        prevKeyPressed = key == LEFT_ARROW;

    if(nextKeyPressed) {
      self.next();
    } else if (prevKeyPressed) {
      self.prev();
    }
  };

  var navButtonEvent = function (event) {
    var self = CURRENT_HOTBOX,
        $target = $(event.target);

    event.preventDefault();

    if($target.hasClass(self.options.nextClass)) {
      self.next();
    } else if($target.hasClass(self.options.prevClass)) {
      self.prev();
    }
  };

  var createLoader = function () {
    LOADER = $loader = $('<div></div>', {
      id: 'hotbox-loader',
      'class': 'hotbox-loader'
    }).hide().prependTo('body');
  };

  var loading = function () {
    LOADER.show();
  };

  var finishedLoading = function () {
    LOADER.hide();
  };

  var Hotbox = {
    init: function (selector, opts) {
      var self = this;

      self.selector = selector;
      self.options = $.extend( {}, $.fn.hotbox.options, opts);

      self.startTitle = document.title;
      self.startURL = location.href !== "" ? location.href : "/";

      self.group = [];
      self.index = 0;

      self.cycle();
    },

    cycle: function () {
      var self = this;
      if(typeof History !== 'undefined' && (!History.enabled || !self.options.history)) {
        self.disableHistory();
      }
      self.createOverlay();
      self.createContainer();
      self.bindEvents();
    },

    process: function () {
      var self = this;

      self.downloadContent().done(function () {
        self.display();
      }).fail(function (event, status) {
        if(status !== "abort") {
          self.revertHistory();
          finishedLoading();
        }
      });
    },

    downloadContent: function () {
      var self = this;
      if(self.request !== undefined) {
        self.request.abort();
      }
      self.request = $.ajax({
        url: self.url,
        dataType: 'html'
      }).done(function (html) {
        self.request = undefined;
        self.html = html;
        self.$container.html(html);
      });

      return self.request;
    },

    display: function () {
      var self = this;

      self.options.beforeOpen.apply(self.$container, [self]);

      if (self.options.maxWidth) {
        self.$container.parent().css({
          'max-width': self.options.maxWidth
        });
      }

      self.setupScrolling();
      self.setupNavigation();
      finishedLoading();

      self.$overlay.fadeIn( 100, function () {
        $('html').addClass('hotbox-fixed');
        self.open = true;
        self.options.afterOpen.apply(self.$container, [self]);
      });
    },

    hide: function ( emptyContainer, instant ) {
      var self = this,
          delay = instant ? 0 : 100;

      emptyContainer = emptyContainer || false;
      self.options.beforeClose.apply(self.$container, [self]);

      self.$overlay.fadeOut( delay, function () {
        self.open = false;
        if (emptyContainer) {
          self.$container.empty();
        }
        $('html').removeClass('hotbox-fixed');
        self.options.afterClose.apply(self.$container, [self]);
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

      History.replaceState(null, self.startTitle, self.startURL);
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
        var $this = $(this);
        event.preventDefault();
        self.loadGroup($this);
        self.calculateIndex($this);
        self.loadNewContent($this);
      });
    },

    loadGroup: function (item) {
      var self = this,
          rel = item.attr('rel');

      self.group = [];

      if(rel !== undefined) {
        $('[rel="'+rel+'"]').each(function (index, element) {
          self.group.push($(this));
        });
      }
    },

    loadNewContent: function (item) {
      var self = this,
          url = item.attr('href'),
          title = item.attr('title') || document.title;


        self.title = title;
        self.url = url;
        self.$element = item;

        CURRENT_HOTBOX = self;
        loading();

        self.updateHistory();
    },

    bindCloseEvent: function () {
      var self = this;

      // Close hotbox if click anywhere outside
      $('#hotbox-overlay').on('click', function (event) {
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

    setupScrolling: function () {
      var self = this;

      $('body').unbind('keydown', scrollKeyEvent);
      self.$overlay.unbind('mousewheel', mousewheelEvent);

      $('body').on('keydown', scrollKeyEvent);
      if($.fn.mousewheel) {
        self.$overlay.on('mousewheel', mousewheelEvent);
      }
    },

    setupNavigation: function () {
      var self = this,
          buttonSelector = '.'+self.options.nextClass + ',.' + self.options.prevClass;

      $('body').unbind('keydown', navKeyEvent);
      self.$container.find(buttonSelector).unbind('click', navButtonEvent);


      if(self.group.length > 1) {
        $('body').on('keydown', navKeyEvent);
        self.$container.find(buttonSelector).on('click', navButtonEvent);
      } else {
        self.$container.find(buttonSelector).hide();
      }
    },

    calculateIndex: function (item) {
      var self = this;
          index = 0;

      if(self.group.length === 0) return 0;

      $.each(self.group, function (i, element) {
        // Test if 2 jquery objects are equal, probably non-optimal
        if(item[0] === $(element)[0]) {
          index = i;
        }
      });
      self.index = index;
      return index;
    },

    next: function () {
      var self = this;
      self.loadNewContent(self.nextItem());
    },

    nextItem: function () {
      var self = this,
          index = self.index,
          numItems = self.group.length;

      index += 1;
      if(index >= numItems) {
        index = 0;
      }

      self.index = index;
      return self.group[index];
    },

    prev: function () {
      var self = this;
      self.loadNewContent(self.prevItem());
    },

    prevItem: function () {
      var self = this,
          index = self.index,
          numItems = self.group.length;

      index -= 1;
      if(index == -1) {
        index = numItems - 1;
      }

      self.index = index;
      return self.group[index];
    }
  };

  $.fn.hotbox = function(opts) {
    var hotbox = Object.create( Hotbox );
    hotbox.init(this.selector, opts);
  };

  bindStateChangeEvent();
  createLoader();

  $.fn.hotbox.options = {
    maxWidth: false,
    history: false,
    container: 'body',
    nextClass: 'hotbox-next',
    prevClass: 'hotbox-prev',

    beforeOpen: $.noop,
    afterOpen: $.noop,
    beforeClose: $.noop,
    afterClose: $.noop
  };

}(jQuery, window, document));