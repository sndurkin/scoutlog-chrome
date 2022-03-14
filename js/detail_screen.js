function DetailScreen(placeId) {
  this.place = drive.placesById[placeId];

  this.NOTES_LENGTH_THRESHOLD = 200;
}

Util.apply(DetailScreen.prototype, {
  
  render: function(parentEl) {
    this.el = $('<div class="container"></div>').appendTo(parentEl).hide();
    
    // Add the detail cards.
    this.el.append($([
      '<div class="row">',
        '<div id="left-outer-panel" class="col s4"></div>',
        '<div id="right-outer-panel" class="col s8">',
          '<div class="row">',
            '<div id="left-inner-panel" class="col s6"></div>',
            '<div id="right-inner-panel" class="col s6"></div>',
          '</div>',
        '</div>',
        '<div id="media-panel" class="col s12">',
          '<h5 id="audio-recordings-title">', chrome.i18n.getMessage('audio_recordings_title'), '</h5>',
          '<div id="audio-recordings-panel" class="row"></div>',

          '<h5 id="photos-title">', chrome.i18n.getMessage('photos_tab_title'), '</h5>',
          '<div id="photos-panel" class="row"></div>',
        '</div>',
      '</div>'
    ].join('')));
    
    this.leftOuterPanel = $('#left-outer-panel');
    this.rightOuterPanel = $('#right-outer-panel');
    this.leftInnerPanel = $('#left-inner-panel');
    this.rightInnerPanel = $('#right-inner-panel');

    this.mediaPanel = $('#media-panel');
    this.audioRecordingsTitle = $('#audio-recordings-title');
    this.audioRecordingsPanel = $('#audio-recordings-panel');
    this.photosTitle = $('#photos-title');
    this.photosPanel = $('#photos-panel');
    
    this.dateCardEl = $([
      '<div class="card hoverable card-date">',
        '<div class="card-content valign-wrapper">',
          '<i class="material-icons card-icon">event</i>',
          '<div class="valign card-text date-text"></div>',
        '</div>',
      '</div>'
    ].join('')).appendTo(this.leftOuterPanel);
    this.dateCardEl.on('click', $.proxy(this.onClickDateCard, this));
    
    this.addressCardEl = $([
      '<div class="card hoverable card-address">',
        '<div class="card-image map-image"></div>',
        '<div class="card-content valign-wrapper">',
          '<i class="material-icons card-icon">location_on</i>',
          '<div class="valign card-text address-wrapper">',
            '<div class="address-title"></div>',
            '<div class="address"></div>',
            '<div class="empty-text" style="display: none">', chrome.i18n.getMessage('no_location_set'), '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('')).appendTo(this.leftInnerPanel);
    this.addressCardEl.on('click', $.proxy(this.onClickAddressCard, this));
    
    this.tagsCardEl = $([
      '<div class="card hoverable card-tags">',
        '<div class="card-content valign-wrapper">',
          '<i class="material-icons card-icon tag-icon">local_offer</i>',
          '<div class="valign card-text tags-text"></div>',
        '</div>',
      '</div>'
    ].join('')).appendTo(this.leftOuterPanel);
    this.tagsCardEl.on('click', $.proxy(this.onClickTagsCard, this));
    
    this.linkedLocationsCardEl = $([
      '<div class="card hoverable card-links">',
        '<div class="card-content valign-wrapper">',
          '<i class="material-icons card-icon">link</i>',
          '<div class="valign card-text links-text"></div>',
        '</div>',
      '</div>'
    ].join(''));
    
    this.notesCardEl = $([
      '<div class="card hoverable card-notes">',
        '<div class="card-content valign-wrapper">',
          '<i class="material-icons card-icon notes-icon">description</i>',
          '<div class="valign card-text notes-text"></div>',
        '</div>',
        '<div class="card-notes-toolbar" style="display: none">',
          '<a class="waves-effect waves-light btn-flat edit-notes-btn">', chrome.i18n.getMessage('edit_note'), '</a>',
        '</div>',
      '</div>'
    ].join(''));
    this.notesCardEl.find('.edit-notes-btn').on('click', $.proxy(this.onClickNotesCard, this));
    
    this.addPhotoFABEl = $([
      '<div class="fixed-action-btn add-photo-fab">',
        '<a class="btn-floating btn-large waves-effect waves-light">',
          '<i class="large material-icons">add_to_photos</i>',
        '</a>',
      '</div>'
    ].join('')).appendTo(this.el);
    this.addPhotoFABEl.on('click', $.proxy(this.onClickAddPhotoFAB, this));
  },
  
  renderPhotoCard: function(idx) {
    var cardEl = $([
      '<div class="col s4">',
        '<div class="card hoverable card-photo">',
          '<div class="card-image">',
            '<img src="', drive.getPlaceThumbnailUrl(this.place.id, 400, idx), '" />',
            '<div class="card-image-toolbar">',
              '<a class="btn-flat waves-effect waves-light right card-image-delete-btn"><i class="material-icons">delete</i></a>',
            '</div>',
          '</div>',
          '<div class="card-content valign-wrapper">',
            '<i class="material-icons card-icon">description</i>',
            '<div class="valign card-text notes-text"></div>',
          '</div>',
          '<div class="card-notes-toolbar" style="display: none">',
            '<a class="waves-effect waves-light btn-flat edit-notes-btn">', chrome.i18n.getMessage('edit_note'), '</a>',
          '</div>',
        '</div>',
      '</div>'
    ].join('')).appendTo(this.photosPanel);
    var cardImageEl = cardEl.find('.card-image');
    
    var photo = this.place.photos[idx];
    this.showPhotoNotes(photo, idx);
    
    var me = this;
    cardImageEl.on('click', function() {      
      Util.showNotImplementedToast();
      //me.showPhotosCarousel();
    });
    var deleteBtn = cardEl.find('.card-image-delete-btn');
    deleteBtn.on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      deleteBtn.css('visibility', 'hidden');
      var cardLoadingIcon = new CircularLoadingIcon({ size: 'tiny' });
      var cardLoadingIconWrapper = $('<div class="card-image-toolbar-loading-icon"></div>');
      cardLoadingIconWrapper.appendTo(cardEl.find('.card-image-toolbar'));
      cardLoadingIcon.render(cardLoadingIconWrapper);
      cardLoadingIcon.show();

      drive.deletePhoto(me.place.id, photo.driveId, idx, {
        onSuccess: function(place) {
          var tentativelyDeletedPhoto = photo;
          var tentativelyDeletedPhotoIdx = idx;

          //console.log('delete photo ' + tentativelyDeletedPhoto.driveId);

          me.place = place;
          me.showPhotosPanel();

          var snackbarHtml = [
            '<span>Photo deleted</span>',
            '<a class="btn-flat snackbar-undo-btn">Undo</a>'
          ].join('');

          var snackbar = new Toast({
            text: 'Photo deleted',
            actionText: 'Undo',
            duration: 3000
          });
          snackbar.on('expired', function() {
            drive.permanentlyDeletePhoto(tentativelyDeletedPhoto.driveId, {
              onSuccess: function() {
                // Do nothing.
                //console.log('permanently delete photo ' + tentativelyDeletedPhoto.driveId);
              },
              onFailure: function() {
                // TODO: show error
              }
            });
          });
          snackbar.on('actionclicked', function() {
            snackbar.cancelExpiration();
            snackbar.el.find('.toast-action-btn').css('visibility', 'hidden');

            var loadingIconWrapperEl = $('<div class="snackbar-loading-icon"></div>').appendTo(snackbar.el);
            var loadingIcon = new CircularLoadingIcon({ size: 'tiny' });
            loadingIcon.render(loadingIconWrapperEl);
            loadingIcon.show();

            drive.undeletePhoto(me.place.id, tentativelyDeletedPhoto, tentativelyDeletedPhotoIdx, {
              onSuccess: function(place) {
                //console.log('undelete photo ' + tentativelyDeletedPhoto.driveId);
                snackbar.hide(true);

                me.place = place;
                me.showPhotosPanel();
              },
              onFailure: function() {
                // TODO: show error
              }
            });
          });
          snackbar.show();
        },
        onFailure: function() {
          // TODO: show error
        }
      });

      GAUtil.sendButtonClick('Delete Photo from Place');
    });
  },

  onResize: function() {
    this.photosPanel.find('.card-image').each(function() {
      var imgEl = $(this).find('img');
      imgEl.css({
        'object-fit': 'cover',
        'height': (imgEl.width() * 0.6) + 'px'
      });
    });
  },

  getOnClickPhotoNotesFn: function(photo, idx) {
    var me = this;
    return function() {
      me.initEditNotesDialog();
      
      me.editNotesDialog.save = function(newPhoto, driveRequestCfg) {
        var newPlace = JSON.parse(JSON.stringify(me.place));
        newPhoto = newPlace.photos[idx];
        newPhoto.notes = this.el.find('textarea').val();
        
        me.editNotesDialog.off('aftersave');
        me.editNotesDialog.on('aftersave', function() {
          photo.notes = newPhoto.notes;
          me.showPhotoNotes(photo, idx);
        });
        
        drive.savePlace(newPlace, driveRequestCfg);

        GAUtil.sendButtonClick('Save Photo Notes');
      };
      
      me.editNotesDialog.show(photo);
    };
  },

  renderAudioRecordingCard: function(idx) {
    var cardEl = $([
      '<div class="col s4">',
        '<div class="card hoverable card-audio-recording">',
          /*
          '<div class="card-image">',
            '<img src="', drive.getPlaceThumbnailUrl(this.place.id, 400, idx), '" />',
            '<div class="card-image-toolbar">',
              '<a class="btn-flat waves-effect waves-light right card-image-delete-btn"><i class="material-icons">delete</i></a>',
            '</div>',
          '</div>',
          */
          '<div class="card-content valign-wrapper">',
            '<i class="material-icons card-icon">description</i>',
            '<div class="valign card-text notes-text"></div>',
          '</div>',
          '<div class="card-notes-toolbar" style="display: none">',
            '<a class="waves-effect waves-light btn-flat edit-notes-btn">', chrome.i18n.getMessage('edit_note'), '</a>',
          '</div>',
        '</div>',
      '</div>'
    ].join('')).appendTo(this.audioRecordingsPanel);
    
    var audioRecording = this.place.audio[idx];
    if(audioRecording.notes) {
      cardEl.find('.notes-text').removeClass('empty-text').text(audioRecording.notes).linkify({ target: '_blank' });
      cardEl.find('.card-notes-toolbar').show();
      cardEl.find('.card-content').css({ cursor: 'default' });
      // TODO: cardEl.find('.edit-notes-btn').on('click', this.getOnClickPhotoNotesFn(audioRecording, idx));
    }
    else {
      cardEl.find('.notes-text').addClass('empty-text').text(chrome.i18n.getMessage('notes'));
      cardEl.find('.card-notes-toolbar').hide();
      // TODO: cardEl.find('.card-content').css({ cursor: 'pointer' }).on('click', this.getOnClickPhotoNotesFn(audioRecording, idx));
    }
    
    /*
    var me = this;
    cardEl.find('.card-image').on('click', function() {      
      Util.showNotImplementedToast();
    });
    var deleteBtn = cardEl.find('.card-image-delete-btn');
    deleteBtn.on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      deleteBtn.css('visibility', 'hidden');
      var cardLoadingIcon = new CircularLoadingIcon({ size: 'tiny' });
      var cardLoadingIconWrapper = $('<div class="card-image-toolbar-loading-icon"></div>');
      cardLoadingIconWrapper.appendTo(cardEl.find('.card-image-toolbar'));
      cardLoadingIcon.render(cardLoadingIconWrapper);
      cardLoadingIcon.show();

      drive.deletePhoto(me.place.id, photo.driveId, idx, {
        onSuccess: function(place) {
          var tentativelyDeletedPhoto = photo;
          var tentativelyDeletedPhotoIdx = idx;

          //console.log('delete photo ' + tentativelyDeletedPhoto.driveId);

          me.place = place;
          me.showPhotosPanel();

          var snackbarHtml = [
            '<span>Photo deleted</span>',
            '<a class="btn-flat snackbar-undo-btn">Undo</a>'
          ].join('');

          var snackbar = new Toast({
            text: 'Photo deleted',
            actionText: 'Undo',
            duration: 3000
          });
          snackbar.on('expired', function() {
            drive.permanentlyDeletePhoto(tentativelyDeletedPhoto.driveId, {
              onSuccess: function() {
                // Do nothing.
                //console.log('permanently delete photo ' + tentativelyDeletedPhoto.driveId);
              },
              onFailure: function() {
                // TODO: show error
              }
            });
          });
          snackbar.on('actionclicked', function() {
            snackbar.cancelExpiration();
            snackbar.el.find('.toast-action-btn').css('visibility', 'hidden');

            var loadingIconWrapperEl = $('<div class="snackbar-loading-icon"></div>').appendTo(snackbar.el);
            var loadingIcon = new CircularLoadingIcon({ size: 'tiny' });
            loadingIcon.render(loadingIconWrapperEl);
            loadingIcon.show();

            drive.undeletePhoto(me.place.id, tentativelyDeletedPhoto, tentativelyDeletedPhotoIdx, {
              onSuccess: function(place) {
                //console.log('undelete photo ' + tentativelyDeletedPhoto.driveId);
                snackbar.hide(true);

                me.place = place;
                me.showPhotosPanel();
              },
              onFailure: function() {
                // TODO: show error
              }
            });
          });
          snackbar.show();
        },
        onFailure: function() {
          // TODO: show error
        }
      });

      GAUtil.sendButtonClick('Delete Audio Recording from Place');
    });
    */
  },
  
  show: function(placeId) {
    this.place = drive.placesById[placeId];
    if(!this.place) {
      mainErrorPanel.show({
        text: chrome.i18n.getMessage('error_place_not_found')
      });
      return;
    }
    
    // Action bar
    actionBarUtil.showNavIcon('back');
    actionBarUtil.setActions([{
      html: [
        '<li id="edit-title-wrapper">',
          '<a class="waves-effect waves-light btn light-blue accent-3 valign edit-title"></a>',
        '</li>'
      ].join(''),
      clickFn: $.proxy(this.onClickEditTitle, this)
    }]);
    this.showTitle();
    
    // Screen elements
    this.showDateCard();
    this.showTagsCard();
    this.showLinkedPlacesCard();
    this.showAddressCard(Settings.get(Settings.SHOW_CLOSEST_ADDRESS));
    this.showNotesCard();
    this.showMediaPanel();
    
    this.el.show();
    
    setTimeout(function() {
      $(document).scrollTop(0);
    }, 50);
    
    var me = this;
    setTimeout(function() {
      me.addPhotoFABEl.css('-webkit-transform', 'scale(1)');
    }, 300);
  },
  
  showTitle: function() {
    actionBarUtil.setTitleText(this.place.getTitleForDisplay());
    if(this.place.title) {
      $('.edit-title').text(chrome.i18n.getMessage('edit_title'));
    }
    else {
      $('.edit-title').text(chrome.i18n.getMessage('set_title'));
    }
  },
  
  showDateCard: function() {
    var dateStr;
    if(this.place.created_date) {
      dateStr = (new Date(this.place.created_date)).toLocaleDateString();
    }
    else {
      dateStr = this.place.date;
    }
    this.el.find('.date-text').text(dateStr);
  },
  
  showTagsCard: function() {
    var tagsEl = this.el.find('.tags-text');
    tagsEl.removeClass('empty-text').empty();
    if(this.place.tagDriveIds && this.place.tagDriveIds.length) {
      for(var i = 0; i < this.place.tagDriveIds.length; ++i) {
        var tag = drive.tagsById[this.place.tagDriveIds[i]];
        if(tag) {
          var chipEl = $('<div class="chip"></div>');
          var chipTextEl = $('<div class="tag-text">' + tag.name + '</div>');
          if(tag.color) {
            chipEl.append('<div class="tag-color" style="background-color: #' + Util.decimalToHexString(tag.color) + '"></div>');
            chipTextEl.addClass('tag-text-with-color');
          }
          chipEl.append(chipTextEl);
          tagsEl.append(chipEl);
        }
        else {
          console.log('Tag with id ' + this.place.tagDriveIds[i] + ' not found');
        }
      }
    }
    
    if(tagsEl.is(':empty')) {
      tagsEl.addClass('empty-text').text(chrome.i18n.getMessage('tags'));
    }
  },
  
  showLinkedPlacesCard: function() {
    if(false /* TODO, fetch all linked locations */) {
      this.el.find('.links-text').removeClass('empty-text').text('');
    }
    else {
      this.el.find('.links-text').addClass('empty-text').text(chrome.i18n.getMessage('linked_location'));
    }
  },
  
  showAddressCard: function(showClosestAddress) {
    if(this.place.notes && this.place.notes.length > this.NOTES_LENGTH_THRESHOLD) {
      this.addressCardEl.appendTo(this.leftOuterPanel);
    }
    else {
      this.addressCardEl.appendTo(this.leftInnerPanel);
    }

    var mapImageEl = this.addressCardEl.find('.map-image');

    var location = this.place.location;
    if(location && location.location) {
      var latLng = location.location;
      var urlParams = {
        'center': latLng,
        'zoom': 11,
        'size': '400x200',
        'maptype': 'roadmap',
        'key': Util.API_KEY
      };
      if(Settings.get(Settings.THEME) == 1) {
        urlParams.style = [ 'invert_lightness:true', 'feature:water|color:0x003344' ];
      }

      var markerIconSrc;
      if(this.place.tagDriveIds.length > 0) {
        var tag = drive.tagsById[this.place.tagDriveIds[0]];
        if(tag) {
          if(tag.iconId && drive.iconUrlsById[tag.iconId]) {
            markerIconSrc = drive.iconUrlsById[tag.iconId] + '=s24';
          }
          else if(tag.color) {
            markerIconSrc = Util.getDefaultMarkerIconSrc(tag.color);
          }
        }
      }

      if(!markerIconSrc) {
        markerIconSrc = Util.getDefaultMarkerIconSrc(0);
      }

      var mapImageSrc = Util.addUrlParams('https://maps.googleapis.com/maps/api/staticmap', urlParams);
      mapImageEl.html('<img src="' + mapImageSrc + '" />');
      var imgEl = $('<img id="static-map-marker-icon" />')
                    .attr('src', markerIconSrc)
                    .appendTo(mapImageEl);
      
      this.addressCardEl.find('.address-title').text(Util.getAddressTitle(location, showClosestAddress));
      this.addressCardEl.find('.address').text(Util.getAddressForDisplay(location, showClosestAddress));
      this.addressCardEl.find('.empty-text').hide();
    }
    else {
      mapImageEl.html('');
      this.addressCardEl.find('.address-title').html('');
      this.addressCardEl.find('.address').html('');
      this.addressCardEl.find('.empty-text').show();
    }
  },
  
  showNotesCard: function() {
    if(this.place.notes) {
      if(this.place.notes.length > this.NOTES_LENGTH_THRESHOLD) {
        this.notesCardEl.prependTo(this.rightOuterPanel);
      }
      else {
        this.notesCardEl.appendTo(this.rightInnerPanel);
      }

      this.notesCardEl.css({ cursor: 'default' }).off('click');
      this.notesCardEl.find('.notes-text').removeClass('empty-text').text(this.place.notes).linkify({ target: '_blank' });
      this.notesCardEl.find('.card-notes-toolbar').show();
    }
    else {
      this.notesCardEl.appendTo(this.rightInnerPanel);
      this.notesCardEl.css({ cursor: 'pointer' }).on('click', $.proxy(this.onClickNotesCard, this));
      this.notesCardEl.find('.notes-text').addClass('empty-text').text(chrome.i18n.getMessage('notes'));
      this.notesCardEl.find('.card-notes-toolbar').hide();
    }
  },
  
  showMediaPanel: function() {
    //this.showAudioRecordingsPanel();
    this.audioRecordingsTitle.hide();
    this.audioRecordingsPanel.hide();
    this.showPhotosPanel();
  },

  showAudioRecordingsPanel: function() {
    this.audioRecordingsPanel.empty();
    if(this.place.audio) {
      this.audioRecordingsTitle.show();
      this.audioRecordingsPanel.show();
      for(var i = 0; i < this.place.audio.length; ++i) {
        this.renderAudioRecordingCard(i);
      }
    }
    else {
      this.audioRecordingsTitle.hide();
      this.audioRecordingsPanel.hide();
    }
  },

  showPhotosPanel: function() {
    this.photosPanel.empty();
    if(this.place.photos && this.place.photos.length) {
      this.photosTitle.show();
      this.photosPanel.show();
      for(var i = 0; i < this.place.photos.length; ++i) {
        this.renderPhotoCard(i);
      }

      setTimeout(function() {
        $(window).resize();
      }, 50);
    }
    else {
      this.photosTitle.hide();
      this.photosPanel.hide();
    }
  },

  showPhotoNotes: function(photo, photoIdx) {
    var cardEl = this.photosPanel.children().eq(photoIdx);
    if(photo.notes) {
      cardEl.find('.notes-text').removeClass('empty-text').text(photo.notes).linkify({ target: '_blank' });
      cardEl.find('.card-notes-toolbar').show();
      cardEl.find('.card-content').css({ cursor: 'default' });
      cardEl.find('.edit-notes-btn').on('click', this.getOnClickPhotoNotesFn(photo, photoIdx));
    }
    else {
      cardEl.find('.notes-text').addClass('empty-text').text(chrome.i18n.getMessage('notes'));
      cardEl.find('.card-notes-toolbar').hide();
      cardEl.find('.card-content').css({ cursor: 'pointer' }).on('click', this.getOnClickPhotoNotesFn(photo, photoIdx));
    }
  },

  showPhotosCarousel: function() {
    if(!this.photosCarouselEl) {
      this.photosCarouselEl = $('<div class="photos-carousel"></div>').appendTo(this.el);
      for(var i = 0; i < this.place.photos.length; ++i) {
        $([
          '<img class="photos-carousel-item" src="', drive.getPlaceThumbnailUrl(this.place.id, 400, i), '" />',
        ].join('')).appendTo(this.photosCarouselEl);
      }
    }

    this.photosCarouselEl.show();

    var me = this;
    setTimeout(function() {
      me.photosCarouselEl.find('.photos-carousel-item').each(function() {
        if($(this).width() > $(this).height()) {
          $(this).css('width', '100%');
        }
        else {
          $(this).css('height', '100%');
        }
      });
    }, 50);
  },
  
  hide: function() {
    // Action bar
    actionBarUtil.clearActions();
    
    // Screen elements
    this.el.hide();
    this.addPhotoFABEl.css('-webkit-transform', 'scale(0)');
  },
  
  onSave: function() {
    if(this.editTitleDialog && this.editTitleDialog.isVisible()) {
      this.editTitleDialog.onSave();
      return;
    }
    
    if(this.editDateDialog && this.editDateDialog.isVisible()) {
      this.editDateDialog.onSave();
      return;
    }
    
    if(this.editNotesDialog && this.editNotesDialog.isVisible()) {
      this.editNotesDialog.onSave();
      return;
    }

    if(this.uploadPhotosDialog && this.uploadPhotosDialog.isVisible()) {
      this.uploadPhotosDialog.onSave();
      return;
    }
  },
  
  onClickEditTitle: function() {
    if(!this.editTitleDialog) {
      var me = this;
      this.editTitleDialog = new EditTitleDialog();
      this.editTitleDialog.on('aftersave', function(place) {
        me.place.title = place.title;
        me.showTitle();
      });
      this.editTitleDialog.render(this.el.parent());
    }
    this.editTitleDialog.show(this.place);
  },
  
  onClickDateCard: function() {
    if(!this.editDateDialog) {
      var me = this;
      this.editDateDialog = new EditDateDialog();
      this.editDateDialog.on('aftersave', function(place) {
        me.place.created_date = place.created_date;
        me.showDateCard();
      });
      this.editDateDialog.render($(document.body));
    }
    this.editDateDialog.show(this.place);
  },
  
  onClickAddressCard: function() {
    navUtil.openScreen({
      screenType: 'map_detail',
      args: [ this.place.id ],
      initiatedByUser: true
    });
  },
  
  onClickTagsCard: function() {
    navUtil.openScreen({
      screenType: 'select_tags',
      args: [ this.place.id ],
      initiatedByUser: true
    });
  },
  
  onClickNotesCard: function() {
    this.initEditNotesDialog();
    
    this.editNotesDialog.save = function(place, driveRequestCfg) {
      place.notes = this.el.find('textarea').val();
      drive.savePlace(place, driveRequestCfg);

      GAUtil.sendButtonClick('Save Notes');
    };
    
    var me = this;
    this.editNotesDialog.off('aftersave');
    this.editNotesDialog.on('aftersave', function(place) {
      me.place.notes = place.notes;
      me.showNotesCard();
      me.showAddressCard();
    });
    
    this.editNotesDialog.show(this.place);
  },
  
  initEditNotesDialog: function() {
    if(!this.editNotesDialog) {
      this.editNotesDialog = new EditNotesDialog();
      this.editNotesDialog.render(this.el.parent());
    }
  },
  
  onClickAddPhotoFAB: function() {
    this.initUploadPhotosDialog();

    var me = this;
    this.uploadPhotosDialog.off('aftersave');
    this.uploadPhotosDialog.on('aftersave', function(place) {
      me.place.photos = place.photos;
      me.showPhotosPanel();
    });

    this.uploadPhotosDialog.show(this.place);
  },
  
  initUploadPhotosDialog: function() {
    if(!this.uploadPhotosDialog) {
      this.uploadPhotosDialog = new UploadPhotosDialog();
      this.uploadPhotosDialog.render(this.el.parent());
    }
  },
  
  destroy: function() {
    this.el.remove();
  }
  
});


function EditTitleDialog() {
  this.initDialog();
}
Util.apply(EditTitleDialog.prototype, ObservableMixin);
Util.apply(EditTitleDialog.prototype, EditDialogMixin);
Util.apply(EditTitleDialog.prototype, {
  
  getDialogBody: function() {
    return [
      '<form class="col s12" autocomplete="off">',
        '<div class="input-field">',
          '<input id="edit-title-input" type="text" class="validate">',
          '<label for="edit-title-input"></label>',
        '</div>',
      '</form>'
    ].join('');
  },
  
  save: function(place, driveRequestCfg) {
    place.title = this.el.find('input').val();
    drive.savePlace(place, driveRequestCfg);

    GAUtil.sendButtonClick('Save Place Title');
  },
  
  afterShown: function() {
    var place = this.model;
    var labelEl = this.el.find('label');
    if(place.title) {
      labelEl.text(chrome.i18n.getMessage('edit_title'));
    }
    else {
      labelEl.text(chrome.i18n.getMessage('set_title'));
    }
    
    var inputEl = this.el.find('input');
    inputEl.val(place.title).focus();
  },
  
  afterHidden: function() {
    this.el.find('input').val('');
  }
  
});


function EditDateDialog() {
  this.initDialog();
}
Util.apply(EditDateDialog.prototype, ObservableMixin);
Util.apply(EditDateDialog.prototype, EditDialogMixin);
Util.apply(EditDateDialog.prototype, {
  
  getDialogBody: function() {
    return [
      '<form class="col s12" autocomplete="off">',
        '<div class="input-field">',
          '<input id="edit-date-input" type="text" class="validate">',
          '<label for="edit-date-input"></label>',
        '</div>',
      '</form>'
    ].join('');
  },
  
  save: function(place, driveRequestCfg) {
    place.created_date = this.valueToSave;
    drive.savePlace(place, driveRequestCfg);

    GAUtil.sendButtonClick('Save Place Date');
  },
  
  afterShown: function() {
    var place = this.model;
    var inputEl = this.el.find('input');
    if(place.created_date) {
      this.valueToSave = place.created_date;
      var date = new Date(place.created_date);
      inputEl.attr('data-value', date.toYYYYMMDD());
    }
    else if(place.date) {
      var parts = place.date.split('-');
      var date = new Date(parts[0], parts[1] - 1, parts[2]);
      this.valueToSave = date.getTime();
      inputEl.attr('data-value', date.toYYYYMMDD());
    }
    
    var me = this;
    inputEl.pickadate({
      container: this.el.parent(),
      formatSubmit: 'yyyy/mm/dd',
      onSet: function(context) {
        if(context.select) {
          me.valueToSave = context.select;
          this.close();
        }
      }
    });
    inputEl.focus();
    
    var labelEl = this.el.find('label');
    labelEl.text(chrome.i18n.getMessage('pick_date'));
  },
  
  afterHidden: function() {
    this.el.find('input').val('');
  }
  
});


function EditNotesDialog() {
  this.initDialog();
}
Util.apply(EditNotesDialog.prototype, ObservableMixin);
Util.apply(EditNotesDialog.prototype, EditDialogMixin);
Util.apply(EditNotesDialog.prototype, {
  
  getDialogBody: function() {
    return [
      '<form class="col s12" autocomplete="off">',
        '<div class="input-field">',
          '<textarea id="edit-note-textarea" class="materialize-textarea"></textarea>',
          '<label for="edit-note-textarea"></label>',
        '</div>',
      '</form>'
    ].join('');
  },
  
  afterShown: function() {
    var labelEl = this.el.find('label');
    labelEl.text(chrome.i18n.getMessage('edit_note'));
    
    var textAreaEl = this.el.find('textarea');
    textAreaEl.val(this.model.notes).trigger('autoresize').focus();
  },
  
  afterHidden: function() {
    this.el.find('textarea').val('').trigger('autoresize');
  }
  
});
