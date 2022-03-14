function BrowseByTagsScreen() {
  
}

Util.apply(BrowseByTagsScreen.prototype, {
  
  render: function(parentEl) {
    this.el = $([
      '<div class="container">',
        '<ul class="collection"></ul>',
      '</div>'
    ].join('')).appendTo(parentEl);
    this.listEl = this.el.find('ul');
  },
  
  show: function() {
    // Action bar
    actionBarUtil.showNavIcon('menu');
    actionBarUtil.setTitleText(chrome.i18n.getMessage('browse_by_tags'));
    actionBarUtil.setActions([{
      html: [
        '<li>',
          '<a href="javascript:;">',
            '<i class="material-icons">add</i>',
          '</a>',
        '</li>'
      ].join(''),
      tooltip: chrome.i18n.getMessage('add_tag'),
      clickFn: $.proxy(this.onClickAddTag, this)
    }]);
    
    // Populate the list with tags.
    this.tags = [];
    for(var i = 0, len = drive.tags.length; i < len; ++i) {
      this.tags.push(drive.tags[i]);
    }
    
    if(this.tags.length > 0) {
      this.sortTags();
      this.renderTags();    
      this.renderUntaggedPlacesIfApplicable(this.listEl);
    }
    else {
      this.emptyTextEl = $('<div class="empty-list-text">' + chrome.i18n.getMessage('empty_tags_text') + '</div>').appendTo(this.el);
    }
    
    this.el.show();
  },

  sortTags: function() {
    this.tags.sort(function(a, b) {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  },

  renderTags: function() {
    this.listEl.empty();
    for(var i = 0; i < this.tags.length; ++i) {
      this.renderTag(this.listEl, this.tags[i]);
    }
  },
  
  renderTag: function(parentEl, tag) {
    var tagIconHtml = '';
    if(tag.iconId) {
      var iconUrl = drive.iconUrlsById[tag.iconId];
      if(iconUrl) {
        tagIconHtml = ' <div class="valign tag-icon" style="background-image: url(\'' + iconUrl + '\'); background-size: contain"></div>';
      }
    }
    else if(tag.color) {
      tagIconHtml = ' <div class="valign tag-color" style="background-color: #' + Util.decimalToHexString(tag.color) + '"></div>';
    }
    
    // Find the number of places with this tag.
    var placesCount = 0;
    for(var i = 0; i < drive.places.length; ++i) {
      var place = drive.places[i];
      if(place.hasTag(tag)) {
        ++placesCount;
      }
    }
    
    var el = $([
      '<li class="collection-item valign-wrapper">',
        '<div class="left valign-wrapper tag-details">',
          '<div class="tag-text-wrapper">',
            '<div class="tag-text">', tag.name, '</div>',
            '<div class="num-places-tagged">', this.getPlacesCountString(placesCount), '</div>',
          '</div>',
          tagIconHtml,
        '</div>',
        '<div class="right tag-buttons">',
          '<a class="waves-effect waves-light btn-flat rename-tag-btn" title="', chrome.i18n.getMessage('edit_tag'), '">',
            '<i class="material-icons">mode_edit</i>',
          '</a>',
          '<a class="waves-effect waves-light btn-flat set-tag-color-btn action-not-implemented" title="', chrome.i18n.getMessage('set_tag_color'), '">',
            '<i class="material-icons">color_lens</i>',
          '</a>',
          '<a class="waves-effect waves-light btn-flat delete-tag-btn action-not-implemented" title="', chrome.i18n.getMessage('delete_tag'), '">',
            '<i class="material-icons">delete</i>',
          '</a>',
        '</div>',
        '<div style="clear: both"></div>',
      '</li>'
    ].join('')).appendTo(parentEl);
    
    this.addTagButtonListeners(el, tag);
  },
  
  renderUntaggedPlacesIfApplicable: function() {
    // Find the number of places with no tags.
    var untaggedPlacesCount = 0;
    for(var i = 0; i < drive.places.length; ++i) {
      var place = drive.places[i];      
      if(!place.hasTags()) {
        ++untaggedPlacesCount;
      }
    }
    
    if(untaggedPlacesCount == 0) {
      return;
    }
    
    var el = $([
      '<li class="collection-item valign-wrapper">',
        '<div class="valign-wrapper tag-details">',
          '<div class="tag-text-wrapper">',
            '<div class="tag-text untagged-text">', chrome.i18n.getMessage('untagged_places'), '</div>',
            '<div class="num-places-tagged">', this.getPlacesCountString(untaggedPlacesCount), '</div>',
          '</div>',
        '</div>',
      '</li>'
    ].join('')).appendTo(this.listEl);
    
    this.addTagButtonListeners(el, null);
  },
  
  addTagButtonListeners: function(el, tag) {
    var inputEl = el.find('input');
    var tagTextEl = el.find('.tag-text');
    var checked = inputEl.is(':checked');
    var me = this;
    
    if(!tag) {
      el.on('click', function() {
        navUtil.openScreen({
          screenType: 'grid',
          args: [ null ],
          initiatedByUser: true
        });
      });
      
      return;
    }
    
    el.on('click', function() {
      navUtil.openScreen({
        screenType: 'grid',
        args: [ tag.id ],
        initiatedByUser: true
      });
    });
    
    el.find('.rename-tag-btn').on('click', function(e) {
      e.stopPropagation();
      
      if(!me.renameTagDialog) {
        me.renameTagDialog = new RenameTagDialog();
        me.renameTagDialog.on('save', function(newTag) {
          tag.name = newTag.name;
          tagTextEl.text(newTag.name);
        });
        me.renameTagDialog.render(me.el.parent());
      }
      me.renameTagDialog.show(tag);
    });
    
    el.find('.set-tag-color-btn').on('click', function(e) {
      e.stopPropagation();
      Util.showNotImplementedToast();
    });
    
    el.find('.delete-tag-btn').on('click', function(e) {
      e.stopPropagation();
      Util.showNotImplementedToast();
    });
  },
  
  getPlacesCountString: function(placesCount) {
    if(placesCount == 1) {
      return chrome.i18n.getMessage('num_places_tagged_text_singular', [placesCount]);
    }
    else {
      return chrome.i18n.getMessage('num_places_tagged_text_plural', [placesCount]);
    }
  },

  onSave: function() {
    if(this.renameTagDialog && this.renameTagDialog.isVisible()) {
      this.renameTagDialog.onSave();
    }
  },
  
  onClickAddTag: function() {
    this.initRenameTagDialog();
    
    this.renameTagDialog.save = function(tag, driveRequestCfg) {
      tag.name = this.el.find('input').val();
      drive.saveTag(tag, driveRequestCfg);

      GAUtil.sendButtonClick('Add Tag');
    };
    
    var me = this;
    this.renameTagDialog.off('aftersave');
    this.renameTagDialog.on('aftersave', function(newTag) {
      var tag = newTag;
      me.tags.push(tag);
      me.sortTags();
      me.renderTags();
    });
    
    this.renameTagDialog.show({});
  },

  initRenameTagDialog: function() {
    if(!this.renameTagDialog) {
      this.renameTagDialog = new RenameTagDialog();
      this.renameTagDialog.render(this.el.parent());
    }
  },
  
  hide: function() {
    // Action bar
    actionBarUtil.clearActions();

    if(this.emptyTextEl) {
      this.emptyTextEl.remove();
      delete this.emptyTextEl;
    }

    this.el.hide();
  },
  
  destroy: function() {
    this.el.remove();
  }

});