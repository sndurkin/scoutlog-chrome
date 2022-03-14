EditDialogMixin = {
  
  initDialog: function() {
    this.model = null;
    this.events = {
      aftersave: []
    };
  },
  
  render: function(parentEl) {
    this.el = $([
      '<div class="modal edit-dialog">',
        '<div class="modal-content">', this.getDialogBody(), '</div>',
        '<div class="modal-footer">',
          '<a class="waves-effect waves-light btn-flat cancel-btn">', chrome.i18n.getMessage('cancel'), '</a>',
          '<a class="waves-effect waves-light btn save-btn">', chrome.i18n.getMessage('save'), '</a>',
          '<div class="edit-dialog-loading-icon"></div>',
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
    if(this.saveBtnEl.hasClass('disabled')) {
      return;
    }
    this.saveBtnEl.addClass('disabled');
    
    if(!this.loadingIcon) {
      this.loadingIcon = new CircularLoadingIcon({ size: 'tiny' });
      this.loadingIcon.render(this.el.find('.edit-dialog-loading-icon'));
    }
    this.loadingIcon.show();
    
    var newModel = JSON.parse(JSON.stringify(this.model));
    this.save(newModel, {
      scope: this,
      onSuccess: function() {
        this.fireEvent('aftersave', newModel);
        this.loadingIcon.hide();
        this.hide();
        this.saveBtnEl.removeClass('disabled');
      },
      onFailure: function() {
        // TODO: show error
        this.saveBtnEl.removeClass('disabled');
        this.loadingIcon.hide();
      }
    });
  },
  
  show: function(model) {
    this.model = model;
    
    var me = this;
    this.el.openModal({
      dismissible: true,
      ready: $.proxy(this.afterShown, this),
      complete: $.proxy(this.onHide, this)
    });
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
  afterShown: function() { },
  afterHidden: function() { }
  
};


function RenameTagDialog() {
  this.initDialog();
}
Util.apply(RenameTagDialog.prototype, ObservableMixin);
Util.apply(RenameTagDialog.prototype, EditDialogMixin);
Util.apply(RenameTagDialog.prototype, {
  
  getDialogBody: function() {
    return [
      '<form class="col s12" autocomplete="off">',
        '<div class="input-field">',
          '<input id="rename-tag-input" type="text" class="validate">',
          '<label for="rename-tag-input">', chrome.i18n.getMessage('tag_edit_dialog_title'), '</label>',
        '</div>',
      '</form>'
    ].join('');
  },
  
  afterShown: function() {
    var inputEl = this.el.find('input');
    inputEl.val(this.model.name).focus();
  },
  
  afterHidden: function() {
    this.el.find('input').val('');
  }
  
});