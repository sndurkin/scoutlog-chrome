var detailMap, onDetailMapInitialized;

function MapDetailScreen(placeId) {
  this.place = drive.placesById[placeId];
  if(!this.place) {
    throw 'No place found with id: ' + placeId;
  }
}

Util.apply(MapDetailScreen.prototype, {
  
  render: function(parentEl) {
    this.el = $('<div id="detail-map" class="container"></div>').appendTo(parentEl);
    
    var me = this;
    onDetailMapInitialized = function() {
      var mapOptions = {
        zoom: 11,
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

      detailMap = new google.maps.Map($('#detail-map')[0], mapOptions);
      
      // Setup the map click listeners.
      detailMap.addListener('click', function(e) {
        e.stop();
      });
      
      var geocoder = new google.maps.Geocoder();
      detailMap.addListener('dblclick', function(e) {
        var latLng = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng()
        };
        
        geocoder.geocode({ 'location': latLng }, function(results, status) {
          if (status === google.maps.GeocoderStatus.OK) {
            if(results && results.length) {
              me.setCurrentLocation({
                location: latLng,
                addressStr: results[0].formatted_address,
                isAddressDerived: true
              });

              GAUtil.sendUIAction('Place Map Marker');
            }
          }
        });
      });
      
      me.show(me.place.id);
    };
    var scriptUrl = Util.addUrlParams('https://maps.googleapis.com/maps/api/js', {
      'key': Util.API_KEY,
      'libraries': 'places',
      'callback': 'onDetailMapInitialized'
    });
    $.getScript(scriptUrl);
  },
  
  show: function(placeId) {
    this.place = drive.placesById[placeId];
    this.markerIconSrc = Util.getMarkerIconSrcForPlace(this.place);
    
    // Action bar
    actionBarUtil.showNavIcon('close');
    
    this.el.show();
    
    if(!detailMap) {
      // Wait until the map is initialized.
      return;
    }
    
    this.renderSearch();
    this.renderSaveButton();
    this.clearCurrentLocation();
    
    // Set the new center, marker and info window (if applicable).
    if(this.place.location && this.place.location.location) {
      this.setCurrentLocation({
        location: Util.deserializeLatLng(this.place.location.location),
        addressStr: this.place.location.addressStr,
        isAddressDerived: this.place.location.isAddressDerived
      });
    }
  },
  
  setCurrentLocation: function(location) {
    this.clearCurrentLocation();
    
    detailMap.panTo(location.location);
    
    this.marker = new google.maps.Marker({
      position: location.location,
      map: detailMap,
      icon: this.markerIconSrc
    });
    
    var showClosestAddress = Settings.get(Settings.SHOW_CLOSEST_ADDRESS);
    this.infoWindow = new google.maps.InfoWindow({
      content: [
        '<div class="map-address-title">', Util.getAddressTitle(location, showClosestAddress), '</div>',
        '<div class="map-address">', Util.getAddressForDisplay(location, showClosestAddress), '</div>'
      ].join('')
    });
    this.infoWindow.open(detailMap, this.marker);
    
    var me = this;
    this.marker.addListener('click', function() {
      me.infoWindow.open(detailMap, me.marker);
    });
    
    this.location = {
      location: Util.serializeLatLngForDisplay(location.location),
      addressStr: location.addressStr,
      isAddressDerived: location.isAddressDerived
    };
  },
  
  // Remove the existing marker (if applicable).
  clearCurrentLocation: function() {
    if(this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    if(this.infoWindow) {
      this.infoWindow.setMap(null);
      this.infoWindow = null;
    }
    this.location = null;
  },
  
  renderSearch: function() {
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
    autocomplete.bindTo('bounds', detailMap);
    
    var me = this;
    autocomplete.addListener('place_changed', function() {
      var place = autocomplete.getPlace();
      if (!place.geometry) {
        var latLng = LatLngParser.parse(place.name);
        if(latLng) {
          me.setCurrentLocation({
            location: {
              lat: latLng.latitude,
              lng: latLng.longitude
            },
            addressStr: null,
            isAddressDerived: true
          });

          GAUtil.sendUIAction('Search Lat/Lon Coordinates');
        }

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
  },
  
  renderSaveButton: function() {
    this.loadingIcon = new CircularLoadingIcon({ size: 'tiny' });
    this.loadingIcon.render($('#right-footer'));
    
    this.saveBtnEl = $([
      '<a id="save-address-btn" class="waves-effect waves-light btn light-blue accent-3 right save-btn">',
        chrome.i18n.getMessage('save'),
      '</a>'
    ].join(''));
    this.saveBtnEl.appendTo($('#right-footer'));
    this.saveBtnEl.on('click', $.proxy(this.save, this));
  },
  
  save: function() {
    if(this.saveBtnEl.hasClass('disabled')) {
      return;
    }
    this.saveBtnEl.addClass('disabled');
    this.loadingIcon.show();
    
    var newPlace = JSON.parse(JSON.stringify(this.place));
    newPlace.location = this.location;
    drive.savePlace(newPlace, {
      scope: this,
      onSuccess: function() {
        this.place.location = this.location;
        this.loadingIcon.hide();
        navUtil.navigateBack();
      },
      onFailure: function() {
        // TODO: show error
        this.loadingIcon.hide();
      }
    });
  },
  
  onSave: function() {
    this.save();
  },
  
  destroySaveButton: function() {
    this.loadingIcon.destroy();
    this.saveBtnEl.off('click');
    this.saveBtnEl.remove();
  },
  
  hide: function() {
    this.destroySaveButton();
    this.el.hide();
  },
  
  destroy: function() {
    this.el.remove();
  }

});