function UploadPhotosDialog(cfg) {
  Util.apply(this, cfg);

  this.model = null;
  this.events = {
    aftersave: []
  };
}

Util.apply(UploadPhotosDialog.prototype, ObservableMixin);
Util.apply(UploadPhotosDialog.prototype, {
  
  render: function(parentEl) {
    this.el = $([
      '<div class="modal upload-dialog">',
        '<div class="modal-content">',
          '<form class="col s12" autocomplete="off">',
            '<div class="file-field input-field">',
              '<div class="btn">',
                '<span>', chrome.i18n.getMessage('browse'), '</span>',
                '<input id="upload-photos-input" type="file" multiple accept="image/*">',
              '</div>',
              '<div class="file-path-wrapper">',
                '<input class="file-path validate" type="text" placeholder="', chrome.i18n.getMessage('select_photos'), '">',
              '</div>',
            '</div>',
          '</form>',
        '</div>',
        '<div class="modal-footer">',
          '<a class="waves-effect waves-light btn-flat cancel-btn">', chrome.i18n.getMessage('cancel'), '</a>',
          '<a class="waves-effect waves-light btn save-btn">', chrome.i18n.getMessage('upload'), '</a>',
          '<div class="upload-dialog-loading-icon"></div>',
        '</div>',
      '</div>'
    ].join('')).appendTo(parentEl);
    
    this.saveBtnEl = this.el.find('.save-btn');
    this.cancelBtnEl = this.el.find('.cancel-btn');
    
    var me = this;
    this.el.find('form').on('submit', function(e) {
      e.preventDefault();
      
      me.onSave();
    });
    me.saveBtnEl.on('click', $.proxy(me.onSave, me));
    me.cancelBtnEl.on('click', $.proxy(me.hide, me));
  },
  
  onSave: function() {
    if(!$('#upload-photos-input')[0].value) {
      return;
    }

    if(this.saveBtnEl.hasClass('disabled')) {
      return;
    }
    this.saveBtnEl.addClass('disabled');
    
    if(!this.loadingIcon) {
      this.loadingIcon = new LinearLoadingIcon();
      this.loadingIcon.render(this.el.find('.upload-dialog-loading-icon'));
    }
    this.loadingIcon.show();
    
    var newPlace = JSON.parse(JSON.stringify(this.model));
    
    var files = this.el.find('#upload-photos-input')[0].files;
    drive.uploadPhotos(files, newPlace.title, {
      scope: this,
      onUpdate: function(numUploadedPhotos) {
        this.loadingIcon.update(numUploadedPhotos / (files.length + 1) * 100);
      },
      onSuccess: function(uploadedPhotoIds) {
        newPlace.photos = newPlace.photos || [];
        var sortNum = newPlace.photos.length;
        for(var i = 0; i < uploadedPhotoIds.length; ++i) {
          var placePhoto = {
            sortNum: sortNum++,
            notes: '',
            driveId: uploadedPhotoIds[i]
          };

          newPlace.photos.push(placePhoto);
        }

        drive.savePlace(newPlace, {
          scope: this,
          onSuccess: function() {
            this.fireEvent('aftersave', newPlace);
            this.loadingIcon.hide().update(0);
            this.hide();
            this.saveBtnEl.removeClass('disabled');
          }
        });
      },
      onFailure: function() {
        // TODO: show error on dialog
      }
    });

    GAUtil.sendButtonClick('Add Photos to Place');
  },
  
  show: function(model) {
    this.model = model;
    
    var me = this;
    this.el.openModal({
      dismissible: true,
      ready: $.proxy(this.afterShown, this),
      complete: $.proxy(this.onHide, this)
    });

    this.el.find('input').val('');
  },
  
  isVisible: function() {
    return this.el.is(':visible');
  },
  
  hide: function() {
    this.el.closeModal();
    this.onHide();
  },
  
  onHide: function() {
    this.saveBtnEl.removeClass('disabled');
    this.afterHidden();
  },
  
  destroy: function() {
    this.el.remove();
  },
  
  // Callbacks
  getDialogBody: function() { return ''; },
  beforeSave: function(place) { },
  afterShown: function() { },
  afterHidden: function() { }

});