var listMap, onListMapInitialized;

function MapListScreen() { }

Util.apply(MapListScreen.prototype, {
  
  render: function(parentEl) {
    this.el = $('<div id="list-map" class="container"></div>').appendTo(parentEl);
    
    var me = this;
    onListMapInitialized = function() {
      var mapOptions = {
        streetViewControl: false,
        disableDoubleClickZoom: true,
        draggableCursor: 'default',
        draggingCursor: 'default'
      };
      if(Settings.get(Settings.THEME) == 1) {
        // Dark theme
        // Created here: http://googlemaps.github.io/js-samples/styledmaps/wizard/index.html
        mapOptions.styles = [{"stylers":[{"invert_lightness":true}]},{"featureType":"water","stylers":[{"color":"#003344"}]}];
      }

      listMap = new google.maps.Map($('#list-map')[0], mapOptions);
      
      // Setup the map click listeners.
      listMap.addListener('click', function(e) {
        e.stop();
      });
      
      var geocoder = new google.maps.Geocoder();
      listMap.addListener('dblclick', function(e) {
        var latLng = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng()
        };
        
        geocoder.geocode({ 'location': latLng }, function(results, status) {
          if (status === google.maps.GeocoderStatus.OK) {
            if(results && results.length) {
              /*
              me.setCurrentLocation({
                location: latLng,
                addressStr: results[0].formatted_address,
                isAddressDerived: true
              });

              GAUtil.sendUIAction('Place Map Marker');
              */
            }
          }
        });
      });
      
      me.show();
    };
    var scriptUrl = Util.addUrlParams('https://maps.googleapis.com/maps/api/js', {
      'key': Util.API_KEY,
      'libraries': 'places',
      'callback': 'onListMapInitialized'
    });
    $.getScript(scriptUrl);
  },
  
  show: function(tagId) {
    if(tagId) {
      this.tag = drive.tagsById[tagId];
    }
    else {
      this.tag = tagId;
    }

    // Action bar
    actionBarUtil.showNavIcon('menu');
    if(this.tag) {
      actionBarUtil.setTitleText(this.tag.name);
    }
    else if(this.tag === null) {
      actionBarUtil.setTitleText(chrome.i18n.getMessage('untagged_places_title'));
    }
    else {
      actionBarUtil.setTitleText(chrome.i18n.getMessage('places'));
    }
    
    this.el.show();
    
    if(!listMap) {
      // Wait until the map is initialized.
      return;
    }
    
    //this.renderSearch();
    this.renderMarkers();
  },

  renderMarkers: function() {
    var bounds = new google.maps.LatLngBounds();
    this.markers = drive.places.filter(function(place) {
      if(this.tag) {
        if(!place.hasTag(this.tag)) {
          return false;
        }
      }
      else if(this.tag === null) {
        if(place.hasTags()) {
          return false;
        }
      }

      if(!place.location || !place.location.location) {
        return false;
      }

      return true;
    }, this).map(function(place, idx) {
      var latLng = Util.deserializeLatLng(place.location.location);
      bounds.extend(latLng);

      var marker = new google.maps.Marker({
        position: latLng,
        map: listMap,
        icon: Util.getMarkerIconSrcForPlace(place)
      });

      marker.addListener('dblclick', function() {
        navUtil.openScreen({
          screenType: 'detail',
          args: [ place.id ],
          initiatedByUser: true
        });
      });
      marker.addListener('click', function() {
        if(marker.infoWindow) {
          marker.infoWindow.setMap(null);
          delete marker.infoWindow;
        }
        else {
          var showClosestAddress = Settings.get(Settings.SHOW_CLOSEST_ADDRESS);
          var content$ = $([
            '<div>',
              '<a class="map-place-title">', place.getTitleForDisplay(), '</a>',
              '<div class="map-address">', Util.getAddressForDisplay(place.location, showClosestAddress), '</div>',
            '</div>'].join(''));
          content$.find('a').on('click', function() {
            navUtil.openScreen({
              screenType: 'detail',
              args: [ place.id ],
              initiatedByUser: true
            });
          });

          marker.infoWindow = new google.maps.InfoWindow({ content: content$[0] });
          marker.infoWindow.open(listMap, marker);

          marker.infoWindow.addListener('closeclick', function() {
            marker.infoWindow.setMap(null);
            delete marker.infoWindow;
          });
        }
      });

      return marker;
    }, this);

    listMap.fitBounds(bounds);
  },

  setCurrentLocation: function(location) {
    /*
    this.clearCurrentLocation();
    
    listMap.panTo(location.location);
    
    this.marker = new google.maps.Marker({
      position: location.location,
      map: listMap,
      icon: this.markerIconSrc
    });
    
    var showClosestAddress = Settings.get(Settings.SHOW_CLOSEST_ADDRESS);
    this.infoWindow = new google.maps.InfoWindow({
      content: [
        '<div class="address-title">', Util.getAddressTitle(location, showClosestAddress), '</div>',
        '<div class="address">', Util.getAddressForDisplay(location, showClosestAddress), '</div>'
      ].join('')
    });
    this.infoWindow.open(listMap, this.marker);
    
    var me = this;
    this.marker.addListener('click', function() {
      me.infoWindow.open(listMap, me.marker);
    });
    
    this.location = {
      location: Util.serializeLatLngForDisplay(location.location),
      addressStr: location.addressStr,
      isAddressDerived: location.isAddressDerived
    };
    */
  },
  
  // Remove the existing marker (if applicable).
  clearCurrentLocation: function() {
    /*
    if(this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    if(this.infoWindow) {
      this.infoWindow.setMap(null);
      this.infoWindow = null;
    }
    this.location = null;
    */
  },
  
  renderSearch: function() {
    /*
    $('#screen-title').html([
      '<div id="search-container">',
        '<input type="text" id="search" autocomplete="off" />',
        '<a id="search-icon" class="waves-effect waves-light btn-flat">',
          '<i class="material-icons">search</i>',
        '</a>',
        '<div class="clearfloat"></div>',
      '</div>'
    ].join(''));
    
    // Setup the places autocomplete.
    var autocomplete = new google.maps.places.Autocomplete($('#search')[0]);
    autocomplete.bindTo('bounds', listMap);
    
    var me = this;
    autocomplete.addListener('place_changed', function() {
      var place = autocomplete.getPlace();
      if (!place.geometry) {
        window.alert("Autocomplete's returned place contains no geometry");
        return;
      }
      
      var addressStr = place.formatted_address;
      if(place.name && addressStr.indexOf(place.name) < 0) {
        addressStr = place.name + '\n' + addressStr;
      }
      
      me.setCurrentLocation({
        location: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        },
        addressStr: addressStr,
        isAddressDerived: false
      });

      GAUtil.sendUIAction('Select Autocomplete Item');
    });
    */
  },
  
  hide: function() {
    this.el.hide();
    this.destroyMarkers();
  },

  destroyMarkers: function() {
    if(this.markers) {
      this.markers.map(function(marker, idx) {
        marker.setMap(null);
      });
    }
  },
  
  destroy: function() {
    this.el.remove();
  }

});