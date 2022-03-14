function ActionBarUtil() {
  
}

Util.apply(ActionBarUtil.prototype, {
  
  showNavIcon: function(type, callbackFn) {
    var icon = $('#nav-icon');
    
    icon.off('click');
    if(type == 'menu') {
      icon.html('<i id="nav-icon-arrow" class="material-icons">menu</i>')
          .sideNav({ closeOnClick: true, menuWidth: 400 });
    }
    else if(type == 'back') {
      icon.html('<i id="nav-icon-arrow" class="material-icons">arrow_back</i>')
          .click(function() {
            navUtil.navigateBack();
          });
    }
    else if(type == 'close') {
      icon.html('<i id="nav-icon-arrow" class="material-icons">close</i>')
          .click(function() {
            navUtil.navigateBack();
          });
    }
    else if(type == 'cancel_selection') {
      icon.html('<i id="nav-icon-arrow" class="material-icons">close</i>')
          .click(callbackFn);
    }
  },
  
  setTitleText: function(titleText) {
    $('#screen-title').text(titleText);
  },

  getTitleText: function() {
    return $('#screen-title').text();
  },
  
  setTitleHtml: function(titleHtml) {
    $('#screen-title').html(titleHtml);
  },
  
  setActions: function(actionsCfg) {
    this.clearActions();

    for(var i = 0; i < actionsCfg.length; ++i) {
      var actionCfg = actionsCfg[i];
      var el = $(actionCfg.html).appendTo($('#action-bar-actions'));

      if(actionCfg.tooltip) {
        el.addClass('tooltipped');
        el.attr({
          'data-position': 'bottom',
          'data-tooltip': actionCfg.tooltip,
        });
        el.tooltip({ delay: 500 });
      }

      if(actionCfg.clickFn) {
        if(el.is('a')) {
          el.on('click', actionCfg.clickFn);
        }
        else {
          el.find('a').on('click', actionCfg.clickFn);
        }
      }
    }
  },
  
  clearActions: function() {
    $('#action-bar-actions a').off('click')
    $('#action-bar-actions .tooltipped').tooltip('remove');
    $('#action-bar-actions').empty();
  },

  showLoadingIcon: function() {
    $('#action-bar-actions').children().hide();
    this.loadingIconWrapper = $('<div class="action-bar-loading-icon"></div>').appendTo($('#action-bar-actions'));
    var loadingIcon = new CircularLoadingIcon({ size: 'tiny' });
    loadingIcon.render(this.loadingIconWrapper);
    loadingIcon.show();
  },

  hideLoadingIcon: function() {
    this.loadingIconWrapper.remove();
    $('#action-bar-actions').children().show();
  }
  
});