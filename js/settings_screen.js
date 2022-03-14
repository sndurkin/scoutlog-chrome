function SettingsScreen() {
  
}

Util.apply(SettingsScreen.prototype, {
  
  render: function(parentEl) {
    this.el = $([
      '<div class="container settings-ct">',
        '<div class="row">',
          '<div class="col s4">',
            '<div class="settings-header">', chrome.i18n.getMessage('pref_category_display'), '</div>',
            '<div class="settings-section-ct">',
              
              // Theme
              '<div class="input-field setting select-setting">',
                '<select id="theme-setting">',
                  '<option value="0">Light</option>',
                  '<option value="1">Dark</option>',
                '</select>',
                '<label class="select-label">', chrome.i18n.getMessage('pref_theme'), '</label>',
              '</div>',
              /*
              // Distance units
              '<div class="input-field setting select-setting">',
                '<select id="measurement-setting">',
                  '<option value="0" selected>Metric system (m, km)</option>',
                  '<option value="1">U.S. system (ft, mi)</option>',
                '</select>',
                '<label class="select-label">', chrome.i18n.getMessage('pref_measurement'), '</label>',
              '</div>',
              */
              // Show closest address
              '<div class="setting">',
                '<input type="checkbox" id="show-closest-address-setting" />',
                '<label for="show-closest-address-setting">', chrome.i18n.getMessage('pref_show_closest_address_title'), '</label>',
                '<div class="setting-description">', chrome.i18n.getMessage('pref_show_closest_address_summary'), '</div>',
              '</div>',
              
            '</div>',
          '</div>',
          /*
          '<div class="col s4">',
            '<div class="settings-header">', chrome.i18n.getMessage('pref_category_behavior'), '</div>',
            '<div class="settings-section-ct">',
              '<div class="setting">',
                '<input type="checkbox" id="show-closest-address-setting" />',
                '<label for="show-closest-address-setting">', chrome.i18n.getMessage('pref_show_closest_address_title'), '</label>',
                '<div class="setting-description">', chrome.i18n.getMessage('pref_show_closest_address_summary'), '</div>',
              '</div>',
            '</div>',
          '</div>',
          
          '<div class="col s4">',
            '<div class="settings-header">', chrome.i18n.getMessage('pref_category_advanced'), '</div>',
            '<div class="settings-section-ct">',
              '<div class="setting">',
                '<input type="checkbox" id="show-closest-address-setting" />',
                '<label for="show-closest-address-setting">', chrome.i18n.getMessage('pref_show_closest_address_title'), '</label>',
                '<div class="setting-description">', chrome.i18n.getMessage('pref_show_closest_address_summary'), '</div>',
              '</div>',
            '</div>',
          '</div>',
          */
        '</div>',
      '</div>'
    ].join('')).appendTo(parentEl);
    
    this.showClosestAddressEl = this.el.find('#show-closest-address-setting');
    this.showClosestAddressEl.on('change', function() {
      Settings.set(Settings.SHOW_CLOSEST_ADDRESS, $(this)[0].checked);
    });
    
    this.themeEl = this.el.find('#theme-setting');
    this.themeEl.material_select();
    this.themeEl.on('change', function() {
      var themeIdx = $(this).children('option:selected').index();
      Settings.set(Settings.THEME, themeIdx);
      Util.setTheme(themeIdx);
    });
    
    this.measurementEl = this.el.find('#measurement-setting');
    this.measurementEl.material_select();
  },
  
  show: function() {
    // Action bar
    actionBarUtil.showNavIcon('menu');
    actionBarUtil.setTitleText(chrome.i18n.getMessage('settings'));
    
    // Theme setting
    this.themeEl.children('option:selected').prop('selected', false);
    var selectedIdx = Settings.get(Settings.THEME);
    $(this.themeEl.children('option').get(selectedIdx)).prop('selected', true);
    this.themeEl.material_select();

    // Show closest address setting
    this.showClosestAddressEl.attr('checked', Settings.get(Settings.SHOW_CLOSEST_ADDRESS));
    
    this.el.show();
  },
  
  hide: function() {
    this.el.hide();
  },
  
  destroy: function() {
    this.el.remove();
  }

});

var Settings = {
  
  THEME: 'theme',
  SHOW_CLOSEST_ADDRESS: 'show_closest_address',
  DISPLAY_MODE: 'display_mode',

  cache: {},

  load: function(callback, scope) {
    chrome.storage.sync.get([
      Settings.THEME,
      Settings.SHOW_CLOSEST_ADDRESS,
      Settings.DISPLAY_MODE
    ], function(settingsObj) {
      for(var settingName in settingsObj) {
        Settings.cache[settingName] = settingsObj[settingName];
      }

      callback.call(scope);
    });
  },

  // Returns the value of the given [settingName]; if it's not present in [settingsObj],
  // it will return the default value.
  get: function(settingName) {
    if(Settings.cache[settingName]) {
      return Settings.cache[settingName];
    }
    
    // Default values
    if(settingName == Settings.THEME) {
      return 0;
    }
    else if(settingName == Settings.SHOW_CLOSEST_ADDRESS) {
      return true;
    }
    else if(settingName == Settings.DISPLAY_MODE) {
      return 0;
    }
  },

  set: function(settingName, settingValue, callbackFn) {
    var settingsObj = {};
    settingsObj[settingName] = settingValue;
    chrome.storage.sync.set(settingsObj, function() {
      if(chrome.runtime.lastError) {
        throw 'Chrome runtime error: ' + chrome.runtime.lastError;
      }
      else {
        Settings.cache[settingName] = settingValue;
        if(callbackFn) callbackFn();
      }
    });
  }
  
};