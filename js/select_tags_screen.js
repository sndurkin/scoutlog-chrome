function SelectTagsScreen(placeId) {
  this.place = drive.placesById[placeId];
}

Util.apply(SelectTagsScreen.prototype, {
  
  render: function(parentEl) {
    this.el = $([
      '<div class="container">',
        '<ul class="collection selected-tags"></ul>',
        '<ul class="collection unselected-tags"></ul>',
      '</div>'
    ].join('')).appendTo(parentEl);
    this.selectedTagsListEl = this.el.find('ul.selected-tags');
    this.unselectedTagsListEl = this.el.find('ul.unselected-tags');
  },
  
  show: function(placeId) {
    this.place = drive.placesById[placeId];
    
    // Action bar
    actionBarUtil.showNavIcon('close');
    actionBarUtil.setTitleText(chrome.i18n.getMessage('tags_title'));
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

    // Populate the selected tags list.
    this.selectedTagIds = this.getSelectedTagIds();
    var selectedTagIdsMap = {};
    for(var i = 0; i < this.selectedTagIds.length; ++i) {
      selectedTagIdsMap[this.selectedTagIds[i]] = i;
    }
    
    // Populate the unselected tags list.
    this.unselectedTagIds = [];
    for(var i = 0, len = drive.tags.length; i < len; ++i) {
      var tagId = drive.tags[i].id;
      if(!(tagId in selectedTagIdsMap)) {
        this.unselectedTagIds.push(tagId);
      }
    }
    
    this.renderSelectedTags();
    this.renderUnselectedTags();
    
    if(drive.tags.length > 0) {
      this.renderSaveButton();
    }
    else {
      this.emptyTextEl = $('<div class="empty-list-text">' + chrome.i18n.getMessage('empty_tags_text') + '</div>').appendTo(this.el);
    }
    this.el.show();
  },
  
  renderSelectedTags: function() {
    this.selectedTagsListEl.empty();
    for(var i = 0; i < this.selectedTagIds.length; ++i) {
      this.renderTag(this.selectedTagsListEl, this.selectedTagIds[i], true, 'selected-tag-' + i);
    }
  },
  
  renderUnselectedTags: function() {
    // Sort the unselected tags by name.
    this.unselectedTagIds.sort(function(id1, id2) {
      var tag1 = drive.tagsById[id1];
      var tag2 = drive.tagsById[id2];
      return tag1.name.toLowerCase().localeCompare(tag2.name.toLowerCase());
    });
    
    this.unselectedTagsListEl.empty();
    for(var i = 0; i < this.unselectedTagIds.length; ++i) {
      this.renderTag(this.unselectedTagsListEl, this.unselectedTagIds[i], false, 'tag-' + i);
    }
  },
  
  renderTag: function(parentEl, tagId, tagSelected, domId) {
    var tag = drive.tagsById[tagId];

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
    
    var el = $([
      '<li class="collection-item">',
        '<input type="checkbox" id="' + domId + '" class="filled-in"', (tagSelected ? ' checked="checked"' : ''), ' />',
        '<label for="' + domId + '">',
          '<div class="left valign-wrapper tag-details">',
            '<span class="tag-text">', tag.name, '</span>',
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
        '</label>',
      '</li>'
    ].join('')).appendTo(parentEl);
    
    this.addTagButtonListeners(el, tag);
  },
  
  addTagButtonListeners: function(el, tag) {
    var inputEl = el.find('input');
    var tagTextEl = el.find('.tag-text');
    var checked = inputEl.is(':checked');
    var me = this;
    
    inputEl.on('change', function() {
      if($(this)[0].checked) {
        me.selectedTagIds.push(tag.id);

        for(var i = 0; i < me.unselectedTagIds.length; ++i) {
          if(me.unselectedTagIds[i] == tag.id) {
            me.unselectedTagIds.splice(i, 1);
            break;
          }
        }
      }
      else {
        me.unselectedTagIds.push(tag.id);

        for(var i = 0; i < me.selectedTagIds.length; ++i) {
          if(me.selectedTagIds[i] == tag.id) {
            me.selectedTagIds.splice(i, 1);
            break;
          }
        }
      }
    });
    
    el.find('.rename-tag-btn').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      me.initRenameTagDialog();
      
      me.renameTagDialog.save = function(tag, driveRequestCfg) {
        tag.name = this.el.find('input').val();
        drive.saveTag(tag, driveRequestCfg);

        GAUtil.sendButtonClick('Rename Tag');
      };
      
      me.renameTagDialog.off('aftersave');
      me.renameTagDialog.on('aftersave', function(newTag) {
        tag.name = newTag.name;
        tagTextEl.text(newTag.name);
      });
      
      me.renameTagDialog.show(tag);
    });
    
    el.find('.set-tag-color-btn').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      Util.showNotImplementedToast();
    });
    
    el.find('.delete-tag-btn').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      Util.showNotImplementedToast();
    });
  },
  
  renderSaveButton: function() {
    this.loadingIcon = new CircularLoadingIcon({ size: 'tiny' });
    this.loadingIcon.render($('#right-footer'));
    
    this.saveBtnEl = $([
      '<a id="save-tags-btn" class="waves-effect waves-light btn light-blue accent-3 right save-btn">',
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
    newPlace.tagDriveIds = this.selectedTagIds;
    drive.savePlace(newPlace, {
      scope: this,
      onSuccess: function() {
        this.place.tagDriveIds = this.selectedTagIds;
        this.loadingIcon.hide();
        navUtil.navigateBack();
      },
      onFailure: function() {
        // TODO: show error
        this.loadingIcon.hide();
      }
    });

    GAUtil.sendButtonClick('Save Tag Selections');
  },
  
  onSave: function() {
    if(this.renameTagDialog && this.renameTagDialog.isVisible()) {
      this.renameTagDialog.onSave();
      return;
    }
    
    this.save();
  },
  
  destroySaveButton: function() {
    this.loadingIcon.destroy();
    this.saveBtnEl.off('click');
    this.saveBtnEl.remove();
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
      me.selectedTagIds.push(tag.id);
      me.renderSelectedTags();
      me.renderUnselectedTags();

      if(me.emptyTextEl) {
        me.emptyTextEl.remove();
        delete me.emptyTextEl;

        me.renderSaveButton();
      }
    });
    
    this.renameTagDialog.show({});
  },
  
  hide: function() {
    // Action bar
    actionBarUtil.clearActions();
    
    this.el.find('.rename-tag-btn').off('click');
    this.el.find('.set-tag-color-btn').off('click');
    this.el.find('.delete-tag-btn').off('click');

    if(this.emptyTextEl) {
      this.emptyTextEl.remove();
      delete this.emptyTextEl;
    }
    
    this.destroySaveButton();
    this.el.hide();
  },
  
  initRenameTagDialog: function() {
    if(!this.renameTagDialog) {
      this.renameTagDialog = new RenameTagDialog();
      this.renameTagDialog.render(this.el.parent());
    }
  },

  getSelectedTagIds: function() {
    var tagDriveIds = JSON.parse(JSON.stringify(this.place.tagDriveIds));
    var selectedTagIds = [];
    for(var i = 0; i < tagDriveIds.length; ++i) {
      if(drive.tagsById[tagDriveIds[i]]) {
        selectedTagIds.push(tagDriveIds[i]);
      }
    }
    
    return selectedTagIds;
  }
  
});