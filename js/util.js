var Util = {
  
  API_KEY: '<removed>',
  
  apply: function(a, b) {
    if(b) {
      for(var i in b) {
        a[i] = b[i];
      }
    }
    return a;
  },
  
  showNotImplementedToast: function() {
    var toast = new Toast({
      text: 'This feature is not implemented yet!',
      cls: 'not-implemented-toast',
      duration: 3000
    });
    toast.show();
  },
  
  serializeLatLngForDisplay: function(latLng) {
    return latLng.lat.toFixed(6) + ', ' + latLng.lng.toFixed(6);
  },
  
  serializeLatLng: function(latLng) {
    return latLng.lat.toFixed(6) + ',' + latLng.lng.toFixed(6);
  },
  
  deserializeLatLng: function(latLng) {
    if(latLng.lat && latLng.lng) {
      return latLng;
    }
    
    var coords = latLng.split(',');      
    return {
      lat: parseFloat(coords[0].trim()),
      lng: parseFloat(coords[1].trim())
    };
  },
  
  // Code taken from: http://stackoverflow.com/a/2117523
  guid: function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  },
  
  getAddressTitle: function(location, showClosestAddress) {
    if(location.isAddressDerived) {
      if(showClosestAddress && location.addressStr) {
        return chrome.i18n.getMessage('appx_address_title');
      }
      else {
        return chrome.i18n.getMessage('coordinates_title');
      }
    }
    else {
      return chrome.i18n.getMessage('address_title');
    }
  },
  
  getAddressForDisplay: function(location, showClosestAddress) {
    if(!location.isAddressDerived || (showClosestAddress && location.addressStr)) {
      return location.addressStr;
    }
    return Util.serializeLatLngForDisplay(Util.deserializeLatLng(location.location));
  },
  
  decimalToHexString: function(number) {
    if (number < 0) {
      number = 0xFFFFFFFF + number + 1;
    }
    return number.toString(16).toUpperCase().substring(2);
  },

  getMarkerIconSrcForPlace: function(place) {
    if(place.tagDriveIds.length > 0) {
      var tag = drive.tagsById[place.tagDriveIds[0]];
      if(tag) {
        if(tag.iconId && drive.iconUrlsById[tag.iconId]) {
          return drive.iconUrlsById[tag.iconId] + '=s24';
        }
        else if(tag.color) {
          return Util.getDefaultMarkerIconSrc(tag.color);
        }
      }
    }

    return Util.getDefaultMarkerIconSrc(0);
  },

  getDefaultMarkerIconSrc: function(tagColor) {
    var tagColorHex;
    if(tagColor) {
      tagColorHex = '#' + Util.decimalToHexString(tagColor);
    }
    else {
      tagColorHex = '#FF0000';
    }

    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" fill="', tagColorHex, '" height="36" stroke="#000000" stroke-width="0.2" viewBox="0 0 24 24" width="36">',
        '<path xmlns="http://www.w3.org/2000/svg" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>',
        '<path d="M0 0h24v24H0z" fill="none" stroke="none" />',
      '</svg>'
    ].join('');
    return 'data:image/svg+xml;utf8,' + svg;
  },
  
  addUrlParams: function(url, params) {
    var paramCh = (url.indexOf('?') >= 0) ? '&' : '?';
    for(var name in params) {
      var value = params[name];
      if(Object.prototype.toString.call(value) == '[object Array]') {
        for(var i = 0; i < value.length; ++i) {
          url += paramCh + encodeURIComponent(name) + '=' + encodeURIComponent(value[i]);
          paramCh = '&';
        }
      }
      else {
        url += paramCh + encodeURIComponent(name) + '=' + encodeURIComponent(value);
        paramCh = '&';
      }
    }
    return url;
  },
  
  getParamsFromUrl: function(url) {
    var params = {};
    
    url.replace(
      new RegExp( "([^?=&]+)(=([^&]*))?", "g" ),
      function( $0, $1, $2, $3 ) {
        params[decodeURIComponent($1)] = decodeURIComponent($3);
      }
    );
    
    return params;
  },
  
  // Limits the rate at which a function is called; useful for rate-limiting events
  // that will get fired often, like mousewheel.
  debounce: function(fn) {
    var timeout;
    return function() {
      var args = arguments,
          ctx = this;
      
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        fn.apply(ctx, args);
      }, 100);
    };
  },

  addTooltip: function(el, msg) {
    el.addClass('tooltipped');
    el.attr({
      'data-position': 'bottom',
      'data-tooltip': msg
    });
    el.tooltip({ delay: 500 });
  },

  convertStringToArrayBuffer: function(s) {
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  },

  setTheme: function(themeIdx) {
    switch(themeIdx) {
      case 1:
        $(document.body).addClass('dark-theme');
        break;
      default:
        $(document.body).removeClass('dark-theme');
    }
  }
  
};

var ObservableMixin = {
  
  on: function(evtName, fn, scope) {
    this.events = this.events || {};
    this.events[evtName] = this.events[evtName] || [];
    this.events[evtName].push({ fn: fn, scope: scope });
    return this;
  },
  
  off: function(evtName, fn) {
    if(fn) {
      var idx = -1;
      var evtHandlers = this.events[evtName] || [];
      for(var i = 0; i < evtHandlers.length; ++i) {
        if(evtHandlers[i] === fn) {
          idx = i;
          break;
        }
      }
      
      if(idx >= 0) {
        evtHandlers.splice(idx, 1);
      }
    }
    else {
      this.events[evtName] = null;
    }
    
    return this;
  },
  
  fireEvent: function(evtName) {
    var evtArguments = [];
    for(var i = 1; i < arguments.length; ++i) {
      evtArguments.push(arguments[i]);
    }
    
    var evtHandlers = this.events[evtName];
    for(var i = 0; i < evtHandlers.length; ++i) {
      var evtHandler = evtHandlers[i];
      if(evtHandler.fn.apply(evtHandler.scope || this, evtArguments) === false) {
        return false;
      }
    }
  }
  
};

function CircularLoadingIcon(cfg) {
  Util.apply(this, cfg);
  this.size = this.size || 'medium';
}

Util.apply(CircularLoadingIcon.prototype, {
  
  render: function(parentEl) {
    if(!this.el) {
      this.el = $([
        '<div class="preloader-wrapper ', this.size, ' loading-icon">',
          '<div class="spinner-layer spinner-blue">',
            '<div class="circle-clipper left">',
              '<div class="circle"></div>',
            '</div>',
            '<div class="gap-patch">',
              '<div class="circle"></div>',
            '</div>',
            '<div class="circle-clipper right">',
              '<div class="circle"></div>',
            '</div>',
          '</div>',
          '<div class="spinner-layer spinner-red">',
            '<div class="circle-clipper left">',
              '<div class="circle"></div>',
            '</div>',
            '<div class="gap-patch">',
              '<div class="circle"></div>',
            '</div>',
            '<div class="circle-clipper right">',
              '<div class="circle"></div>',
            '</div>',
          '</div>',
          '<div class="spinner-layer spinner-yellow">',
            '<div class="circle-clipper left">',
              '<div class="circle"></div>',
            '</div>',
            '<div class="gap-patch">',
              '<div class="circle"></div>',
            '</div>',
            '<div class="circle-clipper right">',
              '<div class="circle"></div>',
            '</div>',
          '</div>',
          '<div class="spinner-layer spinner-green">',
            '<div class="circle-clipper left">',
              '<div class="circle"></div>',
            '</div>',
            '<div class="gap-patch">',
              '<div class="circle"></div>',
            '</div>',
            '<div class="circle-clipper right">',
              '<div class="circle"></div>',
            '</div>',
          '</div>',
        '</div>'
      ].join('')).appendTo(parentEl);
    }

    return this;
  },
  
  show: function() {
    this.el.show().addClass('active');
    return this;
  },
  
  hide: function() {
    this.el.hide().removeClass('active');
    return this;
  },
  
  destroy: function() {
    this.el.remove();
  }
  
});

function LinearLoadingIcon(cfg) {
  Util.apply(this, cfg);
}

Util.apply(LinearLoadingIcon.prototype, {
  
  render: function(parentEl) {
    if(!this.el) {
      this.el = $([
        '<div class="progress">',
          '<div class="determinate" style="width: ' + (this.width || 0) + '%"></div>',
        '</div>'
      ].join('')).appendTo(parentEl);

      this.displayEl = this.el.find('.determinate');
    }

    return this;
  },
  
  show: function() {
    this.el.show();
    return this;
  },
  
  hide: function() {
    this.el.hide();
    return this;
  },

  update: function(width) {
    this.displayEl.css('width', width + '%');
    return this;
  },
  
  destroy: function() {
    this.el.remove();
  }
  
});

Date.prototype.toYYYYMMDD = function (f) {
  var padNumber = function(number) {
    number = number.toString();
    if (number.length === 1) {
      return "0" + number;
    }
    return number;
  };

  return this.getFullYear() + "/" 
       + padNumber(this.getMonth() + 1) + "/"
       + padNumber(this.getDate());
};