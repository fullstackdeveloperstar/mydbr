(function ($) {

  $.fn.customScrollbar = function (options, args) {

    var defaultOptions = {
      skin: undefined,
      hScroll: true,
      vScroll: true,
      updateOnWindowResize: false,
      animationSpeed: 300,
      onCustomScroll: undefined,
      swipeSpeed: 1,
      wheelSpeed: 40,
      fixedThumbWidth: undefined,
      fixedThumbHeight: undefined,
      preventDefaultScroll: false
    }

    var Scrollable = function (element, options) {
      this.$element = $(element);
      this.options = options;
      this.addScrollableClass();
      this.addSkinClass();
      this.addScrollBarComponents();
      if (this.options.vScroll)
        this.vScrollbar = new Scrollbar(this, new VSizing());
      if (this.options.hScroll)
        this.hScrollbar = new Scrollbar(this, new HSizing());
      this.$element.data("scrollable", this);
      this.initKeyboardScrolling();
      this.bindEvents();
    }

    Scrollable.prototype = {

      addScrollableClass: function () {
        if (!this.$element.hasClass("scrollable")) {
          this.scrollableAdded = true;
          this.$element.addClass("scrollable");
        }
      },

      removeScrollableClass: function () {
        if (this.scrollableAdded)
          this.$element.removeClass("scrollable");
      },

      addSkinClass: function () {
        if (typeof(this.options.skin) == "string" && !this.$element.hasClass(this.options.skin)) {
          this.skinClassAdded = true;
          this.$element.addClass(this.options.skin);
        }
      },

      removeSkinClass: function () {
        if (this.skinClassAdded)
          this.$element.removeClass(this.options.skin);
      },

      addScrollBarComponents: function () {
        this.assignViewPort();
        if (this.$viewPort.length == 0) {
          this.$element.wrapInner("<div class=\"viewport\" />");
          this.assignViewPort();
          this.viewPortAdded = true;
        }
        this.assignOverview();
        if (this.$overview.length == 0) {
          this.$viewPort.wrapInner("<div class=\"overview\" />");
          this.assignOverview();
          this.overviewAdded = true;
        }
        this.addScrollBar("vertical", "prepend");
        this.addScrollBar("horizontal", "append");
      },

      removeScrollbarComponents: function () {
        this.removeScrollbar("vertical");
        this.removeScrollbar("horizontal");
        if (this.overviewAdded)
          this.$element.unwrap();
        if (this.viewPortAdded)
          this.$element.unwrap();
      },

      removeScrollbar: function (orientation) {
        if (this[orientation + "ScrollbarAdded"])
          this.$element.find(".scroll-bar." + orientation).remove();
      },

      assignViewPort: function () {
        this.$viewPort = this.$element.find(".viewport");
      },

      assignOverview: function () {
        this.$overview = this.$viewPort.find(".overview");
      },

      addScrollBar: function (orientation, fun) {
        if (this.$element.find(".scroll-bar." + orientation).length == 0) {
          this.$element[fun]("<div class='scroll-bar " + orientation + "'><div class='thumb'></div></div>")
          this[orientation + "ScrollbarAdded"] = true;
        }
      },

      resize: function (keepPosition) {
        if (this.vScrollbar)
          this.vScrollbar.resize(keepPosition);
        if (this.hScrollbar)
          this.hScrollbar.resize(keepPosition);
      },

      scrollTo: function (element) {
        if (this.vScrollbar)
          this.vScrollbar.scrollToElement(element);
        if (this.hScrollbar)
          this.hScrollbar.scrollToElement(element);
      },

      scrollToXY: function (x, y) {
        this.scrollToX(x);
        this.scrollToY(y);
      },

      scrollToX: function (x) {
        if (this.hScrollbar)
          this.hScrollbar.scrollOverviewTo(x, true);
      },

      scrollToY: function (y) {
        if (this.vScrollbar)
          this.vScrollbar.scrollOverviewTo(y, true);
      },

      scrollByX: function (x) {
        if (this.hScrollbar)
          this.scrollToX(this.hScrollbar.overviewPosition() + x);
      },

      scrollByY: function (y) {
        if (this.vScrollbar)
          this.scrollToY(this.vScrollbar.overviewPosition() + y);
      },

      remove: function () {
        this.removeScrollableClass();
        this.removeSkinClass();
        this.removeScrollbarComponents();
        this.$element.data("scrollable", null);
        this.removeKeyboardScrolling();
        if (this.vScrollbar)
          this.vScrollbar.remove();
        if (this.hScrollbar)
          this.hScrollbar.remove();
      },

      setAnimationSpeed: function (speed) {
        this.options.animationSpeed = speed;
      },

      isInside: function (element, wrappingElement) {
        var $element = $(element);
        var $wrappingElement = $(wrappingElement);
        var elementOffset = $element.offset();
        var wrappingElementOffset = $wrappingElement.offset();
        return (elementOffset.top >= wrappingElementOffset.top) && (elementOffset.left >= wrappingElementOffset.left) &&
          (elementOffset.top + $element.height() <= wrappingElementOffset.top + $wrappingElement.height()) &&
          (elementOffset.left + $element.width() <= wrappingElementOffset.left + $wrappingElement.width())
      },

      initKeyboardScrolling: function () {
        var _this = this;

        this.elementKeydown = function (event) {
          if (document.activeElement === _this.$element[0]) {
            if (_this.vScrollbar)
              _this.vScrollbar.keyScroll(event);
            if (_this.hScrollbar)
              _this.hScrollbar.keyScroll(event);
          }
        }

        this.$element
          .attr('tabindex', '-1')
          .keydown(this.elementKeydown);
      },

      removeKeyboardScrolling: function () {
        this.$element
          .removeAttr('tabindex')
          .unbind("keydown", this.elementKeydown);
      },

      bindEvents: function () {
        if (this.options.onCustomScroll)
          this.$element.on("customScroll", this.options.onCustomScroll);
      }

    }

    var Scrollbar = function (scrollable, sizing) {
      this.scrollable = scrollable;
      this.sizing = sizing
      this.$scrollBar = this.sizing.scrollBar(this.scrollable.$element);
      this.$thumb = this.$scrollBar.find(".thumb");
      this.setScrollPosition(0, 0);
      this.resize();
      this.initMouseMoveScrolling();
      this.initMouseWheelScrolling();
      this.initTouchScrolling();
      this.initMouseClickScrolling();
      this.initWindowResize();
    }

    Scrollbar.prototype = {

      resize: function (keepPosition) {
        this.overviewSize = this.sizing.size(this.scrollable.$overview);
        this.calculateViewPortSize();
        this.sizing.size(this.scrollable.$viewPort, this.viewPortSize);
        this.ratio = this.viewPortSize / this.overviewSize;
        this.sizing.size(this.$scrollBar, this.viewPortSize);
        this.thumbSize = this.calculateThumbSize();
        this.sizing.size(this.$thumb, this.thumbSize);
        this.maxThumbPosition = this.calculateMaxThumbPosition();
        this.maxOverviewPosition = this.calculateMaxOverviewPosition();
        this.enabled = (this.overviewSize > this.viewPortSize);
        if (this.scrollPercent === undefined)
          this.scrollPercent = 0.0;
        if (this.enabled)
          this.rescroll(keepPosition);
        else
          this.setScrollPosition(0, 0);
        this.$scrollBar.toggle(this.enabled);
      },

      calculateViewPortSize: function () {
        var elementSize = this.sizing.size(this.scrollable.$element);
        if (elementSize > 0 && !this.maxSizeUsed) {
          this.viewPortSize = elementSize;
          this.maxSizeUsed = false;
        }
        else {
          var maxSize = this.sizing.maxSize(this.scrollable.$element);
          this.viewPortSize = Math.min(maxSize, this.overviewSize);
          this.maxSizeUsed = true;
        }
      },

      calculateThumbSize: function () {
        var fixedSize = this.sizing.fixedThumbSize(this.scrollable.options)
        var size;
        if (fixedSize)
          size = fixedSize;
        else
          size = this.ratio * this.viewPortSize
        return Math.max(size, this.sizing.minSize(this.$thumb));
      },

      initMouseMoveScrolling: function () {
        var _this = this;
        this.$thumb.mousedown(function (event) {
          if (_this.enabled)
            _this.startMouseMoveScrolling(event);
        });
        this.documentMouseup = function (event) {
          _this.stopMouseMoveScrolling(event);
        };
        $(document).mouseup(this.documentMouseup);
        this.documentMousemove = function (event) {
          _this.mouseMoveScroll(event);
        };
        $(document).mousemove(this.documentMousemove);
        this.$thumb.click(function (event) {
          event.stopPropagation();
        });
      },

      removeMouseMoveScrolling: function () {
        this.$thumb.unbind();
        $(document).unbind("mouseup", this.documentMouseup);
        $(document).unbind("mousemove", this.documentMousemove);
      },

      initMouseWheelScrolling: function () {
        var _this = this;
        this.scrollable.$element.mousewheel(function (event, delta, deltaX, deltaY) {
          if (_this.enabled) {
            var scrolled = _this.mouseWheelScroll(deltaX, deltaY);
            _this.stopEventConditionally(event, scrolled);
          }
        });
      },

      removeMouseWheelScrolling: function () {
        this.scrollable.$element.unbind("mousewheel");
      },

      initTouchScrolling: function () {
        if (document.addEventListener) {
          var _this = this;
          this.elementTouchstart = function (event) {
            if (_this.enabled)
              _this.startTouchScrolling(event);
          }
          this.scrollable.$element[0].addEventListener("touchstart", this.elementTouchstart);
          this.documentTouchmove = function (event) {
            _this.touchScroll(event);
          }
          this.scrollable.$element[0].addEventListener("touchmove", this.documentTouchmove);
          this.elementTouchend = function (event) {
            _this.stopTouchScrolling(event);
          }
          this.scrollable.$element[0].addEventListener("touchend", this.elementTouchend);
        }
      },

      removeTouchScrolling: function () {
        if (document.addEventListener) {
          this.scrollable.$element[0].removeEventListener("touchstart", this.elementTouchstart);
          document.removeEventListener("touchmove", this.documentTouchmove);
          this.scrollable.$element[0].removeEventListener("touchend", this.elementTouchend);
        }
      },

      initMouseClickScrolling: function () {
        var _this = this;
        this.scrollBarClick = function (event) {
          _this.mouseClickScroll(event);
        };
        this.$scrollBar.click(this.scrollBarClick);
      },

      removeMouseClickScrolling: function () {
        this.$scrollBar.unbind("click", this.scrollBarClick);
      },

      initWindowResize: function () {
        if (this.scrollable.options.updateOnWindowResize) {
          var _this = this;
          this.windowResize = function () {
            _this.resize();
          };
          $(window).resize(this.windowResize);
        }
      },

      removeWindowResize: function () {
        $(window).unbind("resize", this.windowResize);
      },

      isKeyScrolling: function (key) {
        return this.keyScrollDelta(key) != null;
      },

      keyScrollDelta: function (key) {
        for (var scrollingKey in this.sizing.scrollingKeys)
          if (scrollingKey == key)
            return this.sizing.scrollingKeys[key](this.viewPortSize);
        return null;
      },

      startMouseMoveScrolling: function (event) {
        this.mouseMoveScrolling = true;
        $("body").addClass("not-selectable");
        this.setUnselectable($("body"), "on");
        this.setScrollEvent(event);
        event.preventDefault();
      },

      stopMouseMoveScrolling: function (event) {
        this.mouseMoveScrolling = false;
        $("body").removeClass("not-selectable");
        this.setUnselectable($("body"), null);
      },

      setUnselectable: function (element, value) {
        if (element.attr("unselectable") != value) {
          element.attr("unselectable", value);
          element.find(':not(input)').attr('unselectable', value);
        }
      },

      mouseMoveScroll: function (event) {
        if (this.mouseMoveScrolling) {
          var delta = this.sizing.mouseDelta(this.scrollEvent, event);
          this.scrollThumbBy(delta);
          this.setScrollEvent(event);
        }
      },

      startTouchScrolling: function (event) {
        if (event.touches && event.touches.length == 1) {
          this.setScrollEvent(event.touches[0]);
          this.touchScrolling = true;
          event.stopPropagation();
        }
      },

      touchScroll: function (event) {
        if (this.touchScrolling && event.touches && event.touches.length == 1) {
          var delta = -this.sizing.mouseDelta(this.scrollEvent, event.touches[0]) * this.scrollable.options.swipeSpeed;
          var scrolled = this.scrollOverviewBy(delta);
          if (scrolled)
            this.setScrollEvent(event.touches[0]);
          this.stopEventConditionally(event, scrolled);
        }
      },

      stopTouchScrolling: function (event) {
        this.touchScrolling = false;
        event.stopPropagation();
      },

      mouseWheelScroll: function (deltaX, deltaY) {
        var delta = -this.sizing.wheelDelta(deltaX, deltaY) * this.scrollable.options.wheelSpeed;
        if (delta != 0)
          return this.scrollOverviewBy(delta);
      },

      mouseClickScroll: function (event) {
        var delta = this.viewPortSize - 20;
        if (event["page" + this.sizing.scrollAxis()] < this.$thumb.offset()[this.sizing.offsetComponent()])
        // mouse click over thumb
          delta = -delta;
        this.scrollOverviewBy(delta);
      },

      keyScroll: function (event) {
        var keyDown = event.which;
        if (this.enabled && this.isKeyScrolling(keyDown)) {
          var scrolled = this.scrollOverviewBy(this.keyScrollDelta(keyDown));
          this.stopEventConditionally(event, scrolled);
        }
      },

      scrollThumbBy: function (delta) {
        var thumbPosition = this.thumbPosition();
        thumbPosition += delta;
        thumbPosition = this.positionOrMax(thumbPosition, this.maxThumbPosition);
        var oldScrollPercent = this.scrollPercent;
        this.scrollPercent = thumbPosition / this.maxThumbPosition;
        if (oldScrollPercent != this.scrollPercent) {
          var overviewPosition = (thumbPosition * this.maxOverviewPosition) / this.maxThumbPosition;
          this.setScrollPosition(overviewPosition, thumbPosition);
          this.triggerCustomScroll(oldScrollPercent);
          return true
        }
        else
          return false;
      },

      thumbPosition: function () {
        return this.$thumb.position()[this.sizing.offsetComponent()];
      },

      scrollOverviewBy: function (delta) {
        var overviewPosition = this.overviewPosition() + delta;
        return this.scrollOverviewTo(overviewPosition, false);
      },

      overviewPosition: function () {
        return -this.scrollable.$overview.position()[this.sizing.offsetComponent()];
      },

      scrollOverviewTo: function (overviewPosition, animate) {
        overviewPosition = this.positionOrMax(overviewPosition, this.maxOverviewPosition);
        var oldScrollPercent = this.scrollPercent;
        this.scrollPercent = overviewPosition / this.maxOverviewPosition;
        //console.log([overviewPosition, oldScrollPercent, this.scrollPercent]);
        if (oldScrollPercent != this.scrollPercent) {
          var thumbPosition = this.scrollPercent * this.maxThumbPosition;
          if (animate)
            this.setScrollPositionWithAnimation(overviewPosition, thumbPosition);
          else
            this.setScrollPosition(overviewPosition, thumbPosition);
          this.triggerCustomScroll(oldScrollPercent);
          return true;
        }
        else
          return false;
      },

      positionOrMax: function (p, max) {
        if(this.sizing.offsetComponent() == 'top' && $(".content").height() > max) {
          return 0;
        } else if (p < 0) {
          return 0;
        } else if (this.sizing.offsetComponent() == 'top' && (p+$(".content").height() > max)) {
          return max-$(window).height()+50;
        } else if(p > max) {
          return max;
        }else {
          return p;
        }
      },

      triggerCustomScroll: function (oldScrollPercent) {
        this.scrollable.$element.trigger("customScroll", {
            scrollAxis: this.sizing.scrollAxis(),
            direction: this.sizing.scrollDirection(oldScrollPercent, this.scrollPercent),
            scrollPercent: this.scrollPercent * 100
          }
        );
      },

      rescroll: function (keepPosition) {
        if (keepPosition) {
          var overviewPosition = this.positionOrMax(this.overviewPosition(), this.maxOverviewPosition);
          this.scrollPercent = overviewPosition / this.maxOverviewPosition;
          var thumbPosition = this.scrollPercent * this.maxThumbPosition;
          this.setScrollPosition(overviewPosition, thumbPosition);
        }
        else {
          var thumbPosition = this.scrollPercent * this.maxThumbPosition;
          var overviewPosition = this.scrollPercent * this.maxOverviewPosition;
          this.setScrollPosition(overviewPosition, thumbPosition);
        }
      },

      setScrollPosition: function (overviewPosition, thumbPosition) {
        this.$thumb.css(this.sizing.offsetComponent(), thumbPosition + "px");
        this.scrollable.$overview.css(this.sizing.offsetComponent(), -overviewPosition + "px");
      },

      setScrollPositionWithAnimation: function (overviewPosition, thumbPosition) {
        var thumbAnimationOpts = {};
        var overviewAnimationOpts = {};
        thumbAnimationOpts[this.sizing.offsetComponent()] = thumbPosition + "px";
        this.$thumb.animate(thumbAnimationOpts, this.scrollable.options.animationSpeed);
        overviewAnimationOpts[this.sizing.offsetComponent()] = -overviewPosition + "px";
        this.scrollable.$overview.animate(overviewAnimationOpts, this.scrollable.options.animationSpeed);
      },

      calculateMaxThumbPosition: function () {
        return Math.max(0, this.sizing.size(this.$scrollBar) - this.thumbSize);
      },

      calculateMaxOverviewPosition: function () {
        return Math.max(0, this.sizing.size(this.scrollable.$overview) - this.sizing.size(this.scrollable.$viewPort));
      },

      setScrollEvent: function (event) {
        var attr = "page" + this.sizing.scrollAxis();
        if (!this.scrollEvent || this.scrollEvent[attr] != event[attr])
          this.scrollEvent = {pageX: event.pageX, pageY: event.pageY};
      },

      scrollToElement: function (element) {
        var $element = $(element);
        if (this.sizing.isInside($element, this.scrollable.$overview) && !this.sizing.isInside($element, this.scrollable.$viewPort)) {
          var elementOffset = $element.offset();
          var overviewOffset = this.scrollable.$overview.offset();
          var viewPortOffset = this.scrollable.$viewPort.offset();
          this.scrollOverviewTo(elementOffset[this.sizing.offsetComponent()] - overviewOffset[this.sizing.offsetComponent()], true);
        }
      },

      remove: function () {
        this.removeMouseMoveScrolling();
        this.removeMouseWheelScrolling();
        this.removeTouchScrolling();
        this.removeMouseClickScrolling();
        this.removeWindowResize();
      },

      stopEventConditionally: function (event, condition) {
        if (condition || this.scrollable.options.preventDefaultScroll) {
          event.preventDefault();
          event.stopPropagation();
        }
      }

    }

    var HSizing = function () {
    }

    HSizing.prototype = {
      size: function ($el, arg) {
        if (arg)
          return $el.width(arg);
        else
          return $el.width();
      },

      minSize: function ($el) {
        return parseInt($el.css("min-width")) || 0;
      },

      maxSize: function ($el) {
        return parseInt($el.css("max-width")) || 0;
      },

      fixedThumbSize: function (options) {
        return options.fixedThumbWidth;
      },

      scrollBar: function ($el) {
        return $el.find(".scroll-bar.horizontal");
      },

      mouseDelta: function (event1, event2) {
        return event2.pageX - event1.pageX;
      },

      offsetComponent: function () {
        return "left";
      },

      wheelDelta: function (deltaX, deltaY) {
        return deltaX;
      },

      scrollAxis: function () {
        return "X";
      },

      scrollDirection: function (oldPercent, newPercent) {
        return oldPercent < newPercent ? "right" : "left";
      },

      scrollingKeys: {
        37: function (viewPortSize) {
          return -10; //arrow left
        },
        39: function (viewPortSize) {
          return 10; //arrow right
        }
      },

      isInside: function (element, wrappingElement) {
        var $element = $(element);
        var $wrappingElement = $(wrappingElement);
        var elementOffset = $element.offset();
        var wrappingElementOffset = $wrappingElement.offset();
        return (elementOffset.left >= wrappingElementOffset.left) &&
          (elementOffset.left + $element.width() <= wrappingElementOffset.left + $wrappingElement.width());
      }

    }

    var VSizing = function () {
    }

    VSizing.prototype = {

      size: function ($el, arg) {
        if (arg)
          return $el.height(arg);
        else
          return $el.height();
      },

      minSize: function ($el) {
        return parseInt($el.css("min-height")) || 0;
      },

      maxSize: function ($el) {
        return parseInt($el.css("max-height")) || 0;
      },

      fixedThumbSize: function (options) {
        return options.fixedThumbHeight;
      },

      scrollBar: function ($el) {
        return $el.find(".scroll-bar.vertical");
      },

      mouseDelta: function (event1, event2) {
        return event2.pageY - event1.pageY;
      },

      offsetComponent: function () {
        return "top";
      },

      wheelDelta: function (deltaX, deltaY) {
        return deltaY;
      },

      scrollAxis: function () {
        return "Y";
      },

      scrollDirection: function (oldPercent, newPercent) {
        return oldPercent < newPercent ? "down" : "up";
      },

      scrollingKeys: {
        38: function (viewPortSize) {
          return -10; //arrow up
        },
        40: function (viewPortSize) {
          return 10; //arrow down
        },
        33: function (viewPortSize) {
          return -(viewPortSize - 20); //page up
        },
        34: function (viewPortSize) {
          return viewPortSize - 20; //page down
        }
      },

      isInside: function (element, wrappingElement) {
        var $element = $(element);
        var $wrappingElement = $(wrappingElement);
        var elementOffset = $element.offset();
        var wrappingElementOffset = $wrappingElement.offset();
        return (elementOffset.top >= wrappingElementOffset.top) &&
          (elementOffset.top + $element.height() <= wrappingElementOffset.top + $wrappingElement.height());
      }

    }

    return this.each(function () {
      if (options == undefined)
        options = defaultOptions;
      if (typeof(options) == "string") {
        var scrollable = $(this).data("scrollable");
        if (scrollable)
          scrollable[options](args);
      }
      else if (typeof(options) == "object") {
        options = $.extend(defaultOptions, options);
        new Scrollable($(this), options);
      }
      else
        throw "Invalid type of options";
    });

  }
  ;

})
  (jQuery);

(function ($) {

  var types = ['DOMMouseScroll', 'mousewheel'];

  if ($.event.fixHooks) {
    for (var i = types.length; i;) {
      $.event.fixHooks[ types[--i] ] = $.event.mouseHooks;
    }
  }

  $.event.special.mousewheel = {
    setup: function () {
      if (this.addEventListener) {
        for (var i = types.length; i;) {
          this.addEventListener(types[--i], handler, false);
        }
      } else {
        this.onmousewheel = handler;
      }
    },

    teardown: function () {
      if (this.removeEventListener) {
        for (var i = types.length; i;) {
          this.removeEventListener(types[--i], handler, false);
        }
      } else {
        this.onmousewheel = null;
      }
    }
  };

  $.fn.extend({
    mousewheel: function (fn) {
      return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
    },

    unmousewheel: function (fn) {
      return this.unbind("mousewheel", fn);
    }
  });


  function handler(event) {
    var orgEvent = event || window.event, args = [].slice.call(arguments, 1), delta = 0, returnValue = true, deltaX = 0, deltaY = 0;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel";

    // Old school scrollwheel delta
    if (orgEvent.wheelDelta) {
      delta = orgEvent.wheelDelta / 120;
    }
    if (orgEvent.detail) {
      delta = -orgEvent.detail / 3;
    }

    // New school multidimensional scroll (touchpads) deltas
    deltaY = delta;

    // Gecko
    if (orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS) {
      deltaY = 0;
      deltaX = delta;
    }

    // Webkit
    if (orgEvent.wheelDeltaY !== undefined) {
      deltaY = orgEvent.wheelDeltaY / 120;
    }
    if (orgEvent.wheelDeltaX !== undefined) {
      deltaX = orgEvent.wheelDeltaX / 120;
    }

    // Add event and delta to the front of the arguments
    args.unshift(event, delta, deltaX, deltaY);

    return ($.event.dispatch || $.event.handle).apply(this, args);
  }

})(jQuery);

(function($) {
     $.fn.doubleTap = function(doubleTapCallback) {
         return this.each(function(){
      var elm = this;
      var lastTap = 0;
      $(elm).bind('vmousedown', function (e) {
                                var now = (new Date()).valueOf();
        var diff = (now - lastTap);
                                lastTap = now ;
                                if (diff < 250) {
                        if($.isFunction( doubleTapCallback ))
                        {
                           doubleTapCallback.call(elm);
                        }
                                }      
      });
         });
    }
})(jQuery);
    
jQuery(document).ready(function($) {
	//Viewport - Important for responsive design
	$('head').append('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">');

  var scrollTable = $(".divTableWithFloatingHeader");
	//Generating Top Column Filters
	$("body").append('<div id="top_filters"><div class="handler"><span class="opener"><i class="arrow down"></i></span><span class="closer"><i class="arrow up"></i></span></div></div>');
	var topFilters = $("body").find("#top_filters");

  $("body").find('#Link1Menu').append('<div class="sync_buttons"><button class="cancel">Cancel</button><button class="success">OK</button></div>');
  
  $("body").on('click', '.sync_buttons .success, .sync_buttons .cancel', function(event) {
    event.preventDefault();
    $('#Link1Menu').hide();
  });

  var topFilters = $("body").find("#top_filters");

	//Top Filters Handler
	$(topFilters).on('click', '.handler', function(event) {
		event.preventDefault();
		$(topFilters).toggleClass('open');
		$('#dbr_rt1').toggleClass('filter_open');
		$(scrollTable).customScrollbar("scrollToY", 0);
		$("body").find("#thead_clone").toggle();
	});

  //Table Head Clone for Fixed Table Header
  $("body").append('<div id="thead_clone" style=""><div class="inner"></div></div>');
  var theadClone = $("body").find("#thead_clone");

	//Generating Column Buttons
	$("body").find("thead.tableFloatingHeaderOriginal .row_header th").each(function(index, el) {
    if($.trim($(this).text()) != '' && $.trim($(this).text()) != ' ')
      $(topFilters).append('<button data-col="'+(index+1)+'" class="col_hide">'+$(this).text()+'</button>');
    $(".inner", theadClone).append('<div data-col="'+(index)+'" class="thead_elm" style="width:'+($(this).width()-4)+'px">'+$(this).text()+'<span class="outer"><span class="uparrow"><i class="arrow up"></i></span><span class="downarrow"><i class="arrow down"></i></span></span></div>');
	});

	//Push Table Bottom when filters are opened
	$("body").append("<style> .filter_open { margin-top: " + ($(topFilters).height()+60) + "px !important;} </style>");

	//Column Filtering 
	$("body").on('click', '.col_hide:not(.col_detail)', function(event) {
		event.preventDefault();
		$(this).toggleClass('inactive');
		$('#dbr_rt1 tr > *:nth-child('+$(this).data('col')+')').toggle();
		$('.inner > *:nth-child('+$(this).data('col')+')', thead_clone).toggle();
		refreshScrollbar();
  });
  
  $("body").on('click', '.col_hide.col_detail', function(event) {
    event.preventDefault();
		$(this).toggleClass('inactive');

    $('.stickyheader thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal) tr > *:nth-child('+$(this).data('col')+')').toggle();
    $('.stickyheader tbody:not(.cell) tr > *:nth-child('+$(this).data('col')+')').toggle();
		// $('.inner > *:nth-child('+$(this).data('col')+')', thead_clone).toggle();
		// refreshScrollbar();
	});

	//Inline Editing
	//$('#dbr_rt1 tbody td').addClass('inline-edit');


  $(".thead_elm", theadClone).on('click',  function(event) {
    event.preventDefault();
    var colElm =  $("body").find("thead.tableFloatingHeaderOriginal .row_header th").eq($(this).data("col"));
    var theadElm = $(this);
    $(colElm).click();
    $(".thead_elm", theadClone).removeClass('headerSortUp');
    $(".thead_elm", theadClone).removeClass('headerSortDown');
    setTimeout(function() {
      console.log($(colElm).hasClass('headerSortUp'));
      if($(colElm).hasClass('headerSortUp')) {
        $(theadElm).addClass('headerSortUp');
        $(theadElm).removeClass('headerSortDown');
      } else if ($(colElm).hasClass('headerSortDown')) {
        $(theadElm).addClass('headerSortDown');
        $(theadElm).removeClass('headerSortUp');
      } else {
        $(theadElm).removeClass('headerSortDown');
        $(theadElm).removeClass('headerSortUp');
      }
      //resizeHeaders();
    }, 100);
  });
	//Scroller Arrows
	$("body").append('<div class="bt-scroller"><span id="rightScroller">&#x25B6;</span><span id="leftScroller">&#x25C0;</span><center><span id="topScroller">&#x25BC;</span></center></div><div id="custom_css"></div>');

	//Window Resize Handler
	function refreshSize() {
		screenWidth = $(window).width();
		screenHeight = $(window).height();

		//Hide Scrollers if screen size is enough for content
		if(screenWidth-40 > $("#dbr_rt1").width()) {
			$(".scroll-bar.horizontal, .bt-scroller").hide();
		} else {
			$(".scroll-bar.horizontal, .bt-scroller").show();
		}

		//Fixing top Height
		$(".max_height, .content").height(screenHeight-60 + "px");
		
		//Custom Css on runtime
		$("body").find('#custom_css').html("<style>.scroll-bar.horizontal { max-width: " + (screenWidth-100) + "px; </style>");

		//Top Search Size
		$("#tab_dbr_rt1").width(screenWidth + "px");

    resizeHeaders();
	

		$(".inner", theadClone).css("left", $("body").find(".overview").css("left"));


    //Filters initial position
    $(topFilters).css("top", "-" + $(topFilters).height()-15 + "px");

	}

  function resizeHeaders() {
    //Table Header Resizing 
    $(".inner", theadClone).width(($("thead.tableFloatingHeaderOriginal .row_header").width()) + "px");
    $(".inner", theadClone).height($("thead.tableFloatingHeaderOriginal .row_header").height() + "px")
    $("thead.tableFloatingHeaderOriginal .row_header").height($(".inner", theadClone).height() + "px");
    $(theadClone).height($("thead.tableFloatingHeaderOriginal .row_header").height() + "px");
    //Managing Clone Header Size according to Table Header
    $("body").find("thead.tableFloatingHeaderOriginal .row_header th").each(function(index, el) {
      $(".inner div:eq("+index+")", theadClone).width(($(this).width()+18)+'px');
    });
  }

	$(window).resize(refreshSize);

	//Refresh Scrollbar on changing the content size
	function refreshScrollbar() {
		$(scrollTable).customScrollbar("resize", true);
	}
	$(".divTableWithFloatingHeader").on("change", refreshScrollbar);
	$(".findit").on('keyup', refreshScrollbar);

	//Window Resize Handler. Initializing
	refreshSize();

	//Custom Scroll Initializer. Waiting to load the all content and styles
	setTimeout(function() {
		$(scrollTable).customScrollbar({
			updateOnWindowResize: true,
			vScroll: true,
			hScroll: true,
			onCustomScroll: function(event, scrollData) {
				$(".inner", theadClone).css("left", $("body").find(".overview").css("left"));
			}
		 });
	}, 300);

  //Right Arrow Scroll Function
  var counterArrow = 0;
  var scroll_step = 200;
  localStorage.setItem("stickyTableWidth", 0);

	$("body").on('click', '#rightScroller', function(event) {
    $(scrollTable).customScrollbar("scrollByX", 200);
    var stickyTableWidth = localStorage.getItem("stickyTableWidth");
    var step = ($('.custom_scroll_div').width() - $('.custom_scroll_div div').width()) / (Math.ceil((stickyTableWidth - $('.popup_content').width())/scroll_step));
    if(counterArrow < Math.ceil((stickyTableWidth- $('.popup_content').width())/scroll_step) && stickyTableWidth > 0){  
      ++counterArrow;
      $('.custom_scroll_div div').css("margin-left",step * counterArrow);
      $('.popup_content').scrollLeft(scroll_step*counterArrow);
    } 
    
		setTimeout(function() {
			$(".inner", theadClone).css("left", $("body").find(".overview").css("left"));
		}, 300);
	});

	//Left Arrow Scroll Function
	$("body").on('click', '#leftScroller', function(event) {

    var stickyTableWidth = localStorage.getItem("stickyTableWidth");
    $(scrollTable).customScrollbar("scrollByX", -200);
    var step = ($('.custom_scroll_div').width() - $('.custom_scroll_div div').width()) / (Math.ceil((stickyTableWidth - $('.popup_content').width())/scroll_step));
    if(counterArrow > 0 && stickyTableWidth > 0){
      --counterArrow;     
      $('.custom_scroll_div div').css("margin-left",step * counterArrow);
      $('.popup_content').scrollLeft(scroll_step*counterArrow);      
    } 
           
		setTimeout(function() {
			$(".inner", theadClone).css("left", $("body").find(".overview").css("left"));
		}, 300);
  });

  var scrollX = 0;
  var flag = true;
  var oldX = 0;
  var currentX = 0;
  var tbodyWidth = 0;
  var customscroll_width = 0;
  var customscroll_thumbWidth = 0;

  $("body").on('touchstart', '.stickyheader tbody:not(.cell)', function(event) {
    oldX = event.changedTouches[0].pageX;
    tbodyWidth = $(this).width();
    customscroll_width = $('.custom_scroll_div').width();
    customscroll_thumbWidth = $('.custom_scroll_div div').width();
  });

  // $("body").on('touchend', '.stickyheader tbody:not(.cell)', function(event) {
  //   flag = false;
  // });
  
  
  
  $("body").on('touchmove', '.stickyheader tbody:not(.cell)', function(event) {
    
      // $('.stickyheader tbody:not(.cell)').customScrollbar({
      //   updateOnWindowResize: true,
      //   vScroll: true,
      //   hScroll: true,
      //   wheelSpeed: 40,
      //   onCustomScroll: function(event, scrollData) {
      //     $(".inner", theadClone).css("left", $("body").find(".overview").css("left"));
      //   }
      // });
    
    
      // if(flag) {
      //   flag = false;
      //   if (scrollX - event.changedTouches[0].pageX > 2) {          
      //     var stickyTableWidth = localStorage.getItem("stickyTableWidth");
      //     var step = ($('.custom_scroll_div').width() - $('.custom_scroll_div div').width()) / (Math.ceil((stickyTableWidth - $('.popup_content').width())/scroll_step));
      //     if(counterArrow < Math.ceil((stickyTableWidth- $('.popup_content').width())/scroll_step) && stickyTableWidth > 0){  
      //       ++counterArrow;
      //       $('.custom_scroll_div div').css("margin-left",step * counterArrow);
      //       $('.popup_content').scrollLeft(scroll_step*counterArrow);
      //     } 
      //     scrollX = event.changedTouches[0].pageX;
      //     setTimeout(function() {
      //       $(".inner", theadClone).css("left", $("body").find(".overview").css("left"));
      //       flag = true;
      //     }, 50);
      //   } else if (scrollX - event.changedTouches[0].pageX < -2) {
      //     var stickyTableWidth = localStorage.getItem("stickyTableWidth");
      //     var step = ($('.custom_scroll_div').width() - $('.custom_scroll_div div').width()) / (Math.ceil((stickyTableWidth - $('.popup_content').width())/scroll_step));
      //     if(counterArrow > 0 && stickyTableWidth > 0){
      //       --counterArrow;     
      //       $('.custom_scroll_div div').css("margin-left",step * counterArrow);
      //       $('.popup_content').scrollLeft(scroll_step*counterArrow);      
      //     }
      //     scrollX = event.changedTouches[0].pageX;
      //     setTimeout(function() {
      //       $(".inner", theadClone).css("left", $("body").find(".overview").css("left"));
      //       flag = true;
      //     }, 50);
      //   }
      // }

      // $('.custom_scroll_div div').css("margin-left", 100);
      var tempcurrentX = currentX -event.changedTouches[0].pageX + oldX;
      if(tempcurrentX < 0) {
        tempcurrentX = 0;
      }
      if (tempcurrentX > tbodyWidth){
        tempcurrentX = tbodyWidth;
      }
      currentX = tempcurrentX;
      oldX = event.changedTouches[0].pageX;
      $('.popup_content').scrollLeft(tempcurrentX);
     
      var percent = currentX / tbodyWidth;
      var currentCustomScroll = (customscroll_width - customscroll_thumbWidth) * percent;
      if(currentCustomScroll < 0 ) {
        currentCustomScroll = 0;
      }
      if(currentCustomScroll > (customscroll_width - customscroll_thumbWidth)) {
        currentCustomScroll = customscroll_width - customscroll_thumbWidth;
      }
      $('.custom_scroll_div div').css("margin-left", currentCustomScroll);
  });
	

	//Bottom Arrow Scroll Function
	$("body").on('click', '#topScroller', function(event) {
		$(scrollTable).customScrollbar("scrollByY", 200);
	});
	
	//Inline Editing.
	$("body").on('click touch', '.inline-edit', function(event) {
		event.preventDefault();
		var target = $(event.target);

		//Save the data 
		if(target.is(".verify")) {
			var editArea = $(this).find('.inline-edit-area');
			var orgElm = $(this);
			$(orgElm).html($(editArea).find("input").val());
			$(orgElm).removeClass('editing');
			return;
		}

		//Already in Editing Mode
		if($(this).hasClass('editing'))
			return false;

		//Generate Editing Layout
		$(this).addClass('editing');
		var oldText = $(this).text();
		$(this).html('<div class="inline-edit-area"><input type="text" value="'+oldText+'"><div class="verify_bg"><button class="verify">&#10003;</button></div></div>');
	});

	$(".findit").attr("placeholder", 'Filter');

  $("body").on('click', '#topNav_toggler', function(event) {
    event.preventDefault();
    $("#topNav").addClass('open');
    setTimeout($(".cloud_logo").css('display',"block"), 2000);    
  });

  $(".nav_area > ul > li.submenu").on('click', function(event) {
    if(!($(event.target).is($(this)) || $(event.target).is($(this).find("a").first())) ) 
      return;
    event.preventDefault();
    $(this).find("ul").first().slideToggle()
    $(this).toggleClass('open');
  });

  $("body").on('click', "#topNav_closer", function(e) {
    $("#topNav").removeClass('open');
    $(".cloud_logo").css('display',"none");
  });

});

jQuery(document).ready(function($) {
  var touchtime = 0;
  // $("body").on("dblclick doubleTap", "#dbr_rt1 tbody tr", function(e) {
  $("body").on("click doubleTap", "#dbr_rt1 tbody tr", function(e) {
    if (touchtime == 0) {
      // set first click
      touchtime = new Date().getTime();
    } else {
      if (((new Date().getTime()) - touchtime) < 800) {
        var new_element = "<div class='new_element'></div>";
        $( new_element ).appendTo( "body" );
        $(".new_element").css("top",$(this).offset().top+"px");
        $(".new_element").css("height",$(this).height()+"px");
        
        if($(this).offset().top < $(window).height() / 2){      
          //go bottom
          var bottom = $(window).height() / 2 + 20;
          $("#Link1Menu table").css("margin-top",bottom+"px");      
        }
        else{
          //go top     
          $("#Link1Menu table").css("margin-top","45px");
        }
        //$(this).parent().find('.activated_row').removeClass("activated_row");
        //$(this).find('.drill').attr("onmousedown","alert('rest');this.parentNode.classList.add('activated_row');drill_set('Link1Menu', this);return !showPopup('Link1Menu', event, true);");
        $(this).find('.drill').mousedown();
    
        $( "td.popuprow" ).each(function( index ) {
          var content = $(this).html();
          if(content.search('Display Tariff Page View')!=-1){       
            content = content.replace("javascript:","javascript:change_title();");
            $(this).html(content);        
          }
        });
        touchtime = 0;
      } else {
          // not a double click so set as a new first click
          touchtime = new Date().getTime();
      }
    }
  });
  $(".drillmenu").on("click",function(){
    $('.new_element').remove();
  });
  $(".sync_buttons").on("click",function(){
    $('.new_element').remove();
  });  
  $( "#profileArrowLeft" ).click(function() {
    $("#topNav").removeClass('open');
    $(".cloud_logo").css('display',"none");
  });

  $("body").on("click touchstart", ".mydbr_popupframe .close, .bottom-background .cancel", function(e) {
    // First Modal
    $("#dbr_rt1").show();
    $('.bt-scroller').show();
    $('.scroll-bar').show();
    $(".inner").show();
    setTimeout(() => {
      $(".inner").show();
    }, 100);
    $(".tableFloatingHeaderOriginal").show();
    $(".rstable.sortable.stickyheader tbody").show();
    $(".more-dialog").removeClass('more-dialog');
    //
    $(".mydbr_popupframe.ui-draggable").hide();
    $("#thead_clone").show();
    //$(".bt-scroller").show();
    $(".mydbr_popupframe").css("margin-top","21%");
    $(".divTableWithFloatingHeader").show();
    $(".custom_scroll_div").remove();
    $(".mobile a.refresh.ui-icon.ui-icon-arrowrefresh-1-n, .tablet a.refresh.ui-icon.ui-icon-arrowrefresh-1-n").attr("style","display:none!important;");
    $(".popup_content tbody tr td:nth-child(1)").css("width","202px");
    //Top
    var topFilters = $("body").find("#top_filters");
    var theadClone = $("body").find("#thead_clone");
    $(topFilters).show();
    // $(topFilters).css('top', (parseInt($(topFilters).css('top').replace('px',''))-50)+"px" );
    $($("body").find("#top_filters .col_hide")).remove();
    $("body").find("thead.tableFloatingHeaderOriginal .row_header th").each(function(index, el) {
      if($.trim($(this).text()) != '' && $.trim($(this).text()) != ' ')
        $(topFilters).append('<button data-col="'+(index+1)+'" class="col_hide">'+$(this).text()+'</button>');
      $(".inner", theadClone).append('<div data-col="'+(index)+'" class="thead_elm" style="width:'+($(this).width()-4)+'px">'+$(this).text()+'<span class="outer"><span class="uparrow"><i class="arrow up"></i></span><span class="downarrow"><i class="arrow down"></i></span></span></div>');
    });



    localStorage.setItem("stickyTableWidth", 0);
  });

  $("body").on("click touchstart", "tr.row td:nth-child(2):has(>a)", function(e) {
    $(".divTableWithFloatingHeader").hide();
    $("#thead_clone").hide();
    $( ".bt-scroller" ).append( "<div class='custom_scroll_div'><div></div></div>" );
    $(".mydbr_popupframe").css("margin-top","1%");
    $(".popup_content tbody tr td:nth-child(1)").css("width","202px");
    var topFilters = $("body").find("#top_filters");
    var theadClone = $("body").find("#thead_clone");
    $(topFilters).show();
    $($("body").find("#top_filters .col_hide:not(.col_detail)")).remove();    
    $("table:has(>thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal):parent)").remove();
    // console.log($(".stickyheader thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal)"));
    setTimeout(function() {
      // $(topFilters).css('top', (parseInt($(topFilters).css('top').replace('px',''))+50)+"px" );
      $("body").find(".stickyheader thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal) .row_header th").each(function(index, el) {        
        if($.trim($(this).text()) != '' && $.trim($(this).text()) != ' ')
          $(topFilters).append('<button data-col="'+(index+1)+'" class="col_hide col_detail">'+$(this).text()+'</button>');
        $(".inner", theadClone).append('<div data-col="'+(index)+'" class="thead_elm" style="width:'+($(this).width()-4)+'px">'+$(this).text()+'<span class="outer"><span class="uparrow"><i class="arrow up"></i></span><span class="downarrow"><i class="arrow down"></i></span></span></div>');
      });
    },500);
    
    localStorage.setItem("stickyTableWidth", 1982);
  });

  $("body").on("click touchstart", "tr.row td:nth-child(4)", function(e) {
    $(".divTableWithFloatingHeader").hide();
    $("#thead_clone").hide();
    // $( ".bt-scroller" ).append( "<div class='custom_scroll_div'><div></div></div>" );
    $(".mydbr_popupframe").css("margin-top","1%");
    $(".popup_content tbody tr td:nth-child(1)").css("width","202px");
    localStorage.setItem("stickyTableWidth", 1576);
  });

  $("body").on("click doubleTap", ".popupmenu:not(.more-dialog) .drillmenu tbody tr:nth-child(3)", function(e) {
    // $(".inner").hide();
    $(".inner").css('display', 'none');
    $("#dbr_rt1").hide();
  });

  // Display Tariff Page View

  $("body").on("click doubleTap", ".popupmenu:not(.more-dialog) .drillmenu tbody tr:nth-child(4)", function(e) {
    // $(".inner").hide();
    $(".inner").css('display', 'none');
    // $("#dbr_rt1").hide();
    var topFilters = $("body").find("#top_filters");
    $(topFilters).hide();
    $(".tableFloatingHeaderOriginal").hide();
    $(".rstable.sortable.stickyheader tbody").hide();
    
    setTimeout(function() {

      $(".drill_image.margin_top_20").append("<span>More</span>");
      $(".drill_image.margin_top_20").addClass("success");
      $("div:has(>.drill_image.margin_top_20:parent)").addClass('more-button');
      $(".popupmenu:not(#Link1Menu").addClass('more-dialog');
      // $(".popupmenu:not(#Link1Menu").attr('id','more-dialog');
      $(".ip_form.pageview_mobile").append("<div class='bottom-background'><div style='width:40%;display: flex;justify-content: flex-start;'><button class='cancel'>Cancel</button></div><div style='width:60%;display: flex;justify-content: flex-end;'><button class='success'>OK</button></div></div>");
      $(".popup_content .ip_form").animate({
        scrollTop: 0
      }, 10);
    }, 700);
  })

  $("body").on("click doubleTap", ".popupmenu:not(.more-dialog) .drillmenu tbody tr:nth-child(5)", function(e) {
    // $(".inner").hide();
    $(".inner").css('display', 'none');
    $("#dbr_rt1").hide();

    var topFilters = $("body").find("#top_filters");
    $(topFilters).hide();
    
    $('.bt-scroller').hide();
    $('.scroll-bar').hide();
  })

  $("body").on("click doubleTap", ".popupmenu:not(.more-dialog) .drillmenu tbody tr:nth-child(6)", function(e) {
    // $(".inner").hide();
    $(".inner").css('display', 'none');
    $("#dbr_rt1").hide();
    $(".divTableWithFloatingHeader").hide();
    $("#thead_clone").hide();
    $( ".bt-scroller" ).append( "<div class='custom_scroll_div'><div></div></div>" );
    $(".mydbr_popupframe").css("margin-top","1%");
    $(".popup_content tbody tr td:nth-child(1)").css("width","202px");
    var topFilters = $("body").find("#top_filters");
    var theadClone = $("body").find("#thead_clone");
    $($("body").find("#top_filters .col_hide:not(.col_detail)")).remove();    
    $("table:has(>thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal):parent)").remove();
    // console.log($(".stickyheader thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal)"));
    setTimeout(function() {
      // $(topFilters).css('top', (parseInt($(topFilters).css('top').replace('px',''))+50)+"px" );
      $("body").find(".stickyheader thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal) .row_header th").each(function(index, el) {        
        if($.trim($(this).text()) != '' && $.trim($(this).text()) != ' ')
          $(topFilters).append('<button data-col="'+(index+1)+'" class="col_hide col_detail">'+$(this).text()+'</button>');
        $(".inner", theadClone).append('<div data-col="'+(index)+'" class="thead_elm" style="width:'+($(this).width()-4)+'px">'+$(this).text()+'<span class="outer"><span class="uparrow"><i class="arrow up"></i></span><span class="downarrow"><i class="arrow down"></i></span></span></div>');
      });
    },500);
    
    localStorage.setItem("stickyTableWidth", 1982);
  })

  $("body").on("click doubleTap", ".popupmenu:not(.more-dialog) .drillmenu tbody tr:nth-child(7)", function(e) {
    $(".inner").hide();
    $("#dbr_rt1").hide();
    $('.bt-scroller').hide();
    $('.scroll-bar').hide();
    var topFilters = $("body").find("#top_filters");
    $(topFilters).hide();

    setTimeout(function() {
      $(':focus').blur();
    }, 500);
  });

  $("body").on("click touchstart", ".drill_image.margin_top_20", function(e) {
    $('.more-dialog').removeClass('bottom-dialog');
    setTimeout(function() {
      $('.more-dialog').addClass('bottom-dialog');
    },200);
    // 
  });

  $("body").on("click", ".popupmenu.more-dialog table tbody tr:nth-child(2)", function(e) {
    $(".inner").hide();
    $("#dbr_rt1").hide();
    $(".divTableWithFloatingHeader").hide();
    $("#thead_clone").hide();
    $( ".bt-scroller" ).append( "<div class='custom_scroll_div'><div></div></div>" );
    $(".mydbr_popupframe").css("margin-top","1%");
    $(".popup_content tbody tr td:nth-child(1)").css("width","202px");
    var topFilters = $("body").find("#top_filters");
    var theadClone = $("body").find("#thead_clone");
    $($("body").find("#top_filters .col_hide")).remove();    
    $("table:has(>thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal):parent)").remove();
    // console.log($(".stickyheader thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal)"));
    setTimeout(function() {
      $("body").find(".stickyheader thead:not(.tableFloatingHeader, .tableFloatingHeaderOriginal) .row_header th").each(function(index, el) {        
        if($.trim($(this).text()) != '' && $.trim($(this).text()) != ' ')
          $(topFilters).append('<button data-col="'+(index+1)+'" class="col_hide col_detail">'+$(this).text()+'</button>');
        $(".inner", theadClone).append('<div data-col="'+(index)+'" class="thead_elm" style="width:'+($(this).width()-4)+'px">'+$(this).text()+'<span class="outer"><span class="uparrow"><i class="arrow up"></i></span><span class="downarrow"><i class="arrow down"></i></span></span></div>');
      });
    },500);
    
    localStorage.setItem("stickyTableWidth", 1982);
  });

  $("body").on("click touchstart", ".popupmenu.more-dialog table tbody tr:nth-child(3)", function(e) {
    setTimeout(function() {
      $(':focus').blur();
    }, 500);
  });


});

function change_title(){
  setTimeout(function(){
    // $(".mydbr_popupframe .border span").replaceWith("<span>Screen Mode</span>");
    // $(".mobile a.refresh.ui-icon.ui-icon-arrowrefresh-1-n, .tablet a.refresh.ui-icon.ui-icon-arrowrefresh-1-n").attr("style","display:inline!important;");
    $(".mydbr_popupframe").css("margin-top","1%");
  }, 1500);
}
