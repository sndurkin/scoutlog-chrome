function NavUtil() {
  this.currentScreen = null;
  this.previousScreens = [];
  
  this.screenTypes.grid.ctor = GridScreen;
  this.screenTypes.map_list.ctor = MapListScreen;
  this.screenTypes.browse_by_tags.ctor = BrowseByTagsScreen;
  this.screenTypes.settings.ctor = SettingsScreen;
  this.screenTypes.detail.ctor = DetailScreen;
  this.screenTypes.map_detail.ctor = MapDetailScreen;
  this.screenTypes.select_tags.ctor = SelectTagsScreen;
  this.screenTypes.export_tabular.ctor = ExportTabularScreen;
  
  $('#nav-places').on('click', $.proxy(this.navigateToPlaces, this));
  $('#nav-tags').on('click', $.proxy(this.navigateToTags, this));
  $('#nav-settings').on('click', $.proxy(this.navigateToSettings, this));
}

Util.apply(NavUtil.prototype, {
  
  screenTypes: {
    grid: {
      ctor: null,
      instance: null,
      parent: null,
      cls: 'grid-screen'
    },
    map_list: {
      ctor: null,
      instance: null,
      parent: null,
      cls: 'map-list-screen'
    },
    browse_by_tags: {
      ctor: null,
      instance: null,
      parent: null,
      cls: 'browse-by-tags-screen'
    },
    settings: {
      ctor: null,
      instance: null,
      parent: null,
      cls: 'settings-screen'
    },
    detail: {
      ctor: null,
      instance: null,
      parent: 'grid',
      cls: 'detail-screen'
    },
    map_detail: {
      ctor: null,
      instance: null,
      parent: 'detail',
      cls: 'map-detail-screen'
    },
    select_tags: {
      ctor: null,
      instance: null,
      parent: 'detail',
      cls: 'select-tags-screen'
    },
    export_tabular: {
      ctor: null,
      instance: null,
      parent: 'grid',
      cls: 'export-tabular-screen'
    }
  },
  
  // Opens the first screen, as dictated by the current url.
  init: function() {
    var paramsStr = document.location.search;
    var cfg;
    if(paramsStr) {
      cfg = Util.getParamsFromUrl(paramsStr);
      if(cfg) {
        cfg.args = cfg.args ? JSON.parse(cfg.args) : [];
        cfg.initiatedByUser = false;
      }
    }
    
    this.openScreen(cfg || {
      screenType: 'grid',
      initiatedByUser: false
    });
  },
  
  openScreen: function(cfg) {
    // Hide the current snackbar/toast (if necessary).
    if(Toast.currentToast) {
      Toast.currentToast.hide();
    }

    // Hide the current error (if necessary).
    mainErrorPanel.hide();

    // Hide the current screen (if necessary).
    if(this.currentScreen) {
      this.screenTypes[this.currentScreen.screenType].instance.hide();
      $(document.body).removeClass(this.screenTypes[this.currentScreen.screenType].cls);
    }
    
    if(cfg.initiatedByUser !== false) {
      this.previousScreens.push(this.currentScreen);
    }

    // Resolve the correct display mode.
    if(cfg.screenType == 'grid' || cfg.screenType == 'map_list') {
      switch(Settings.get(Settings.DISPLAY_MODE)) {
        case 1:
          cfg.screenType = 'map_list';
          break;
        default:
          cfg.screenType = 'grid';
      }
    }
    
    // Display the screen (creating it if necessary).
    var screenType = cfg.screenType;
    var args = cfg.args || [];
    if(!this.screenTypes[screenType].instance) {
      var ctor = this.screenTypes[screenType].ctor;
      if(!ctor) {
        throw 'Screen type "' + screenType + '" not recognized';
      }
      
      ctor = ctor.bind.apply(ctor, [null].concat(args));
      this.currentScreen = {
        screenType: screenType,
        args: args
      };
      this.setCurrentScreenInstance(new ctor());
      this.getCurrentScreenInstance().render($('#content'));
    }
    else {
      this.currentScreen = {
        screenType: screenType,
        args: args
      };
    }
    
    $(document.body).addClass(this.screenTypes[this.currentScreen.screenType].cls);
    
    if(screenType == 'grid' || screenType == 'map_list') {
      $('#side-nav li').removeClass('nav-selected');
      $('#nav-places').parent().addClass('nav-selected');
    }
    else if(screenType == 'browse_by_tags') {
      $('#side-nav li').removeClass('nav-selected');
      $('#nav-tags').parent().addClass('nav-selected');
    }
    else if(screenType == 'settings') {
      $('#side-nav li').removeClass('nav-selected');
      $('#nav-settings').parent().addClass('nav-selected');
    }

    this.getCurrentScreenInstance().show.apply(this.getCurrentScreenInstance(), args);
    
    // Send a pageview to GA.
    ga('send', 'pageview', '/' + this.currentScreen.screenType);
    
    // Add the screen to the history.
    if(cfg.initiatedByUser !== false) {
      var url = document.location.protocol + '//' + document.location.host + document.location.pathname;
      var historyCfg = { screenType: screenType };
      if(screenType != 'grid' || args) {
        if(args.length > 0) {
          historyCfg.args = JSON.stringify(args);
        }
        
        url = Util.addUrlParams(url, historyCfg);
      }
      
      history.pushState(historyCfg, chrome.i18n.getMessage('app_name'), url);
    }
  },
  
  navigateBack: function() {
    if(!this.currentScreen) {
      return;
    }
    
    // If we're at the detail screen, for example, and the last screen was the grid (its direct parent),
    // then just navigate back in the browser history; we don't want to add to the browser history
    // unless it's necessary.
    if(this.previousScreens.length) {
      var parentScreenType = this.screenTypes[this.currentScreen.screenType].parent;
      var previousScreenType = this.previousScreens[this.previousScreens.length - 1].screenType;
      if(parentScreenType == previousScreenType) {
        this.previousScreens.pop();
        history.back();
        return;
      }
    }
    
    if(this.currentScreen) {
      var args;
      /*
      switch(this.currentScreen.screenType) {
        case 'detail':
        case 'map_detail':
        case 'select_tags':
          args = [ this.getCurrentScreenInstance().place.id ];
          break;
      }
      */
      this.openScreen({
        screenType: this.screenTypes[this.currentScreen.screenType].parent,
        args: args,
        initiatedByUser: true
      });
    }
  },
  
  setCurrentScreenInstance: function(currentScreenInstance) {
    this.screenTypes[this.currentScreen.screenType].instance = currentScreenInstance;
  },
  
  getCurrentScreenInstance: function() {
    return this.screenTypes[this.currentScreen.screenType].instance;
  },

  reopenCurrentScreen: function() {
    var currentScreen = {};
    Util.apply(currentScreen, this.currentScreen);
    currentScreen.initiatedByUser = false;
    this.openScreen(currentScreen);
  },
  
  navigateToPlaces: function() {
    this.openScreen({
      screenType: 'grid',
      initiatedByUser: true
    });
  },
  
  navigateToTags: function() {
    this.openScreen({
      screenType: 'browse_by_tags',
      initiatedByUser: true
    });
  },
  
  navigateToSettings: function() {
    this.openScreen({
      screenType: 'settings',
      initiatedByUser: true
    });
  },

  setPlacesCount: function(count) {
    $('#nav-places-count').show().text(count);
  },

  setTagsCount: function(count) {
    $('#nav-tags-count').show().text(count);
  }
  
});

// Add an event handler for back/next navigation.
$(window).on('popstate', function(e) {
  var state = e.originalEvent.state;
  var cfg;
  if(state) {
    cfg = {
      screenType: state.screenType,
      args: state.args ? JSON.parse(state.args) : [],
      initiatedByUser: false
    };
  }
  else {
    cfg = {
      screenType: 'grid',
      initiatedByUser: false
    };
  }
  
  navUtil.openScreen(cfg);
});