function GridScreen() {
  this.events = {
    placedetail: []
  };
}

GridScreen.PLACES_PER_ROW = 6;

Util.apply(GridScreen.prototype, ObservableMixin);

Util.apply(GridScreen.prototype, {
  
  render: function(parentEl) {
    this.el = $('<div class="container"></div>').appendTo(parentEl);
    
    // Add a resize listener to the window to resize the grid cells.
    // It's buffered so that the handler doesn't get called on every
    // single resize event.
    var me = this;
    var timer;
    $(window).on('resize', function() {
      if(timer) {
        window.clearTimeout(timer);
      }
      
      timer = window.setTimeout(function() {
        me.resizeGridCells();
      }, 50);
    });
  },
  
  // tagId can be one of the following:
  //  - undefined: no tag id was passed in, so show all places
  //  - Number: tag id was passed in, so show places with that tag
  //  - null: show all untagged places
  show: function(tagId) {
    this.selectedPlaceIds = [];

    if(tagId) {
      this.tag = drive.tagsById[tagId];
    }
    else {
      this.tag = tagId;
    }
    
    // Action bar
    this.updateActionBar();
    
    // Screen elements
    this.el.empty().show();
    
    drive.places.sort(function(a, b) {
      if(a.created_date && b.created_date) {
        return b.created_date - a.created_date;
      }
      
      // Backward compatibility against older versions of the Android app.
      return Date.parse(b.date) - Date.parse(a.date);
    });
    
    var PLACES_PER_ROW = 6;
    this.gridRows = [];
    this.gridCells = [];
    var gridRow;
    for(var i = 0, count = 0; i < drive.places.length; ++i) {
      var place = drive.places[i];
      
      if(this.tag) {
        if(!place.hasTag(this.tag)) {
          continue;
        }
      }
      else if(this.tag === null) {
        if(place.hasTags()) {
          continue;
        }
      }
      
      if(count++ % PLACES_PER_ROW == 0) {
        gridRow = new GridRow();
        this.gridRows.push(gridRow);
      }
      
      var gridCell = new GridCell(drive.places[i], i);
      this.gridCells.push(gridCell);
      gridRow.add(gridCell);
      this.setupCellEventHandlers(gridCell, drive.places[i]);
    }

    if(this.gridRows.length > 0) {
      for(var i = 0; i < this.gridRows.length; ++i) {
        this.gridRows[i].render(this.el);
      }
    }
    else {
      this.emptyTextEl = $('<div class="empty-list-text"></div>').appendTo(this.el);
      if(this.tag) {
        this.emptyTextEl.text(chrome.i18n.getMessage('empty_places_search_text'));
      }
      else {
        this.emptyTextEl.text(chrome.i18n.getMessage('empty_places_text'));
      }
    }
  },
  
  resizeGridCells: function() {
    for(var i = 0; i < this.gridCells.length; ++i) {
      this.gridCells[i].resize();
    }
  },
  
  setupCellEventHandlers: function(cell, place) {
    var me = this;
    cell.on('click', function() {
      navUtil.openScreen({
        screenType: 'detail',
        args: [ place.id ],
        initiatedByUser: true
      });
    });
    cell.on('selected', function(cell, placeId, isSelected) {
      if(isSelected) {
        me.selectedPlaceIds.push(placeId);
      }
      else {
        for(var i = 0; i < me.selectedPlaceIds.length; ++i) {
          if(me.selectedPlaceIds[i] == placeId) {
            me.selectedPlaceIds.splice(i, 1);
            break;
          }
        }
      }

      me.updateActionBar();
    });
  },

  updateActionBar: function() {
    var numSelected = this.selectedPlaceIds.length;
    if(numSelected > 0) {
      actionBarUtil.setTitleText(numSelected + ' Selected');

      if(!this.onEsc) {
        $(document.body).addClass('selection-mode');
        actionBarUtil.showNavIcon('cancel_selection', $.proxy(this.clearSelections, this));
        actionBarUtil.setActions([{
          html: [
            '<li>',
              '<a>',
                '<i class="material-icons">share</i>',
              '</a>',
            '</li>'
          ].join(''),
          tooltip: chrome.i18n.getMessage('export_notification_title'),
          clickFn: $.proxy(this.onClickExport, this)
        }, {
          html: [
            '<li>',
              '<a>',
                '<i class="material-icons">select_all</i>',
              '</a>',
            '</li>'
          ].join(''),
          tooltip: chrome.i18n.getMessage('menu_select_all'),
          clickFn: $.proxy(this.onClickSelectAll, this)
        }]);

        this.onEsc = this.clearSelections;
      }
    }
    else {
      $(document.body).removeClass('selection-mode');
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
      actionBarUtil.setActions([{
        html: [
          '<li>',
            '<a>',
              '<i class="material-icons">add</i>',
            '</a>',
          '</li>'
        ].join(''),
        tooltip: chrome.i18n.getMessage('add_place'),
        clickFn: $.proxy(this.onClickAddPlace, this)
      }, {
        html: [
          '<li>',
            '<a>',
              '<i class="material-icons">select_all</i>',
            '</a>',
          '</li>'
        ].join(''),
        tooltip: chrome.i18n.getMessage('menu_select_all'),
        clickFn: $.proxy(this.onClickSelectAll, this)
      }]);

      delete this.onEsc;
    }
  },

  clearSelections: function() {
    this.selectedPlaceIds = [];
    $('.card-checkbox input').prop('checked', '');
    this.updateActionBar();
  },

  onClickAddPlace: function() {
    actionBarUtil.showLoadingIcon();

    var place = new Place({
      title: '',
      created_date: new Date().getTime(),
      tagDriveIds: [],
      photos: []
    });
    drive.savePlace(place, {
      scope: this,
      onSuccess: function() {
        actionBarUtil.hideLoadingIcon();
        navUtil.openScreen({
          screenType: 'detail',
          args: [ place.id ],
          initiatedByUser: true
        });
      },
      onFailure: function() {
        actionBarUtil.hideLoadingIcon();

        // TODO: show error
      }
    });

    GAUtil.sendButtonClick('Add Place');
  },

  onClickSelectAll: function() {
    if(this.selectedPlaceIds.length < drive.places.length) {
      // Select all places.
      this.selectedPlaceIds = [];
      for(var i = 0; i < drive.places.length; ++i) {
        this.selectedPlaceIds.push(drive.places[i].id);
      }
      $('.card-checkbox input').prop('checked', 'checked');
      this.updateActionBar();

      GAUtil.sendButtonClick('Select All Places');
    }
    else {
      // Unselect all places if all places are already selected.
      this.clearSelections();

      GAUtil.sendButtonClick('Unselect All Places');
    }
  },

  onClickExport: function() {
    if(!this.exportDialog) {
      this.exportDialog = new ExportDialog();
      this.exportDialog.render(this.el.parent());
      this.exportDialog.on('hide', function() {
        this.clearSelections();
      }, this);
    }
    this.exportDialog.show(this.selectedPlaceIds);

    GAUtil.sendButtonClick('Show Export Dialog');
  },
  
  hide: function() {
    // Action bar
    actionBarUtil.clearActions();

    // Screen elements
    this.el.hide();
    
    for(var i = 0; i < this.gridCells.length; ++i) {
      this.gridCells[i].off('click');
    }
    
    for(var i = 0; i < this.gridRows.length; ++i) {
      this.gridRows[i].destroy();
    }

    if(this.emptyTextEl) {
      this.emptyTextEl.remove();
      delete this.emptyTextEl;
    }
  },
  
  destroy: function() {
    $(window).off('resize');    
    this.el.remove();
  }
  
});

function GridRow() {
  this.cells = [];
}

Util.apply(GridRow.prototype, {
  
  add: function(cell) {
    this.cells.push(cell);
  },
  
  render: function(parentEl) {
    this.el = $('<div class="row" style="visibility: hidden"></div>').appendTo(parentEl);
    
    for(var i = 0; i < this.cells.length; ++i) {
      this.cells[i].render(this.el);
    }
    
    this.el.hide().css('visibility', 'visible').fadeIn();
  },
  
  destroy: function() {
    for(var i = 0; i < this.cells.length; ++i) {
      this.cells[i].destroy();
    }
    
    this.el.remove();
  }
  
});

function GridCell(place, idx) {
  this.place = place;
  this.idx = idx;
  this.events = {
    click: [],
    selected: []
  };
}

Util.apply(GridCell.prototype, ObservableMixin);

Util.apply(GridCell.prototype, {
  
  render: function(parentEl) {
    this.el = $([
      '<div class="col s12 m2">',
        '<div class="card hoverable">',
          '<div class="card-image">',
            '<div class="card-checkbox">',
              '<input type="checkbox" class="filled-in" id="place-', this.idx, '" />',
              '<label for="place-', this.idx, '"></label>',
            '</div>',
            '<span class="card-title">', this.place.getTitleForDisplay(), '</span>',
          '</div>',
        '</div>',
      '</div>'
    ].join('')).appendTo(parentEl);
    this.cardEl = this.el.find('.card');
    this.checkboxCtEl = this.cardEl.find('.card-checkbox');
    this.checkboxEl = this.cardEl.find('input[type=checkbox]');

    var me = this;
    this.cardEl.hover(
      function() { $(this).addClass('card-hovered'); },
      function() { $(this).removeClass('card-hovered'); }
    );
    this.cardEl.on('click', function(e) {
      me.fireEvent('click', me, me.place);
    });
    this.checkboxEl.on('change', function(e) {
      e.stopImmediatePropagation();
      me.fireEvent('selected', me, me.place.id, $(this)[0].checked);
    });
    this.checkboxCtEl.on('click', function(e) {
      e.stopImmediatePropagation();
      me.checkboxEl.css('checked', 'checked');
      me.fireEvent('selected', me, me.place.id, $(this)[0].checked);
    });
    
    this.resize();
    
    // Try to load the photo into the card.
    var thumbnailUrl = drive.getPlaceThumbnailUrl(this.place.id, 300);
    if(thumbnailUrl) {
      $('<div class="card-image-inner"></div>')
        .prependTo(this.el.find('.card-image'))
        .css({
          'opacity': '0',
          'background-image': 'url("' + thumbnailUrl + '")',
          'background-repeat': 'no-repeat',
          'background-size': 'cover',
          'background-position': 'center'
        })
        .animate({ opacity: 1 }, { duration: 500 });
    }
  },
  
  resize: function() {
    this.cardEl.height(this.el.width());
  },
  
  destroy: function() {
    this.cardEl.off('click');
    this.checkboxEl.off('change');
    this.el.remove();
  }
  
});