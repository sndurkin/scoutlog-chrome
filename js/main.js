var drive, navUtil, actionBarUtil;
var loadingIcon = new CircularLoadingIcon({
  size: 'medium'
});
var mainErrorPanel = new ErrorPanel();
/*
$.ajaxSetup({
  cache: true
});
*/
// GA tracking
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://ssl.google-analytics.com/analytics.js','ga');

var GA_APP_NAME = 'ScoutLog';
ga('create', 'UA-54755935-2', 'auto', { appName: GA_APP_NAME });
ga('set', 'checkProtocolTask', null);   // Disable file protocol checking, because we're not using http/https.

// Send any uncaught exceptions to GA.
window.onerror = function(err, url, line) {
  GAUtil.sendError(line + ' ' + err);
};

$(document).ready(function() {
  $('#app-version').text('ScoutLog v' + chrome.runtime.getManifest().version);
  
  // Internationalize the DOM.
  $('[i18n-content]').each(function() {
    $(this).text(chrome.i18n.getMessage($(this).attr('i18n-content')));
  });
  
  // Add window listeners.
  $(window).on('keydown', function(e) {
    var ch = String.fromCharCode(e.which).toLowerCase();
    if(ch == 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      
      var screenInstance = navUtil.getCurrentScreenInstance();
      if(screenInstance.onSave) {
        screenInstance.onSave();
      }

      GAUtil.sendKeypress('Ctrl + S');
    }
    else if(e.which == 27) {
      var screenInstance = navUtil.getCurrentScreenInstance();
      if(screenInstance.onEsc) {
        screenInstance.onEsc();
      }

      GAUtil.sendKeypress('Esc');
    }
  });
  $(window).on('resize', function() {
    var screenInstance = navUtil.getCurrentScreenInstance();
    if(screenInstance.onResize) {
      screenInstance.onResize.apply(screenInstance, arguments);
    }
  });
  
  $('#menu-overflow').dropdown({
      inDuration: 300,
      outDuration: 225,
      constrain_width: false,
      belowOrigin: true,
      alignment: 'right'
    }
  );

  actionBarUtil = new ActionBarUtil();
  drive = new Drive();

  Settings.load(function() {
    // Add the dark theme class, if applicable.
    Util.setTheme(Settings.get(Settings.THEME));

    initDisplayMode();

    drive.on('initfailure', function() {
      onLoadFinished();

      mainErrorPanel.show({
        text: chrome.i18n.getMessage('error_401')
      });
    });
    drive.on('initsuccess', function() {
      drive.fetchData({
        onSuccess: function() {
          onLoadFinished();
          
          navUtil = new NavUtil();
          navUtil.init();

          navUtil.setPlacesCount(drive.places.length);
          navUtil.setTagsCount(drive.tags.length);
          drive.on('placeadded', function() {
            navUtil.setPlacesCount(drive.places.length);
          });
          drive.on('tagadded', function() {
            navUtil.setTagsCount(drive.tags.length);
          });
        },
        onFailure: function() {
          onLoadFinished();

          mainErrorPanel.show({
            text: chrome.i18n.getMessage('error_unknown'),
            buttons: [{
              icon: 'refresh',
              text: chrome.i18n.getMessage('try_again'),
              handler: function() {
                drive.deleteDatabase({
                  onSuccess: function() {
                    location.reload();
                  },
                  onFailure: function() {
                    mainErrorPanel.show({
                      text: chrome.i18n.getMessage('error_unknown')
                    });
                  }
                });
              }
            }]
          });
        }
      });
    });
    
    loadingIcon.render($('#main-loading-icon'));
    loadingIcon.show();
    mainErrorPanel.render($('#main-error-panel'));
    drive.initFolders();

    var longWaitMessage = $('#long-wait-message');
    var timeoutId = setTimeout(function() {
      longWaitMessage.show();
    }, 3000);

    var onLoadFinished = function() {
      loadingIcon.hide();
      longWaitMessage.hide();
      clearTimeout(timeoutId);
    };
  });
});

function initDisplayMode() {
  // Set the display mode.
  $('.nav-display-mode').removeClass('nav-display-mode-selected');
  var navDisplayModeEl;
  switch(Settings.get(Settings.DISPLAY_MODE)) {
    case 1:
      navDisplayModeEl = $('#nav-display-mode-map');
      break;
    default:
      navDisplayModeEl = $('#nav-display-mode-grid');
  }
  navDisplayModeEl.addClass('nav-display-mode-selected');

  // Set the click listeners.
  $('#nav-display-mode-grid').on('click', function() {
    if(Settings.get(Settings.DISPLAY_MODE) == 0) {
      return;
    }

    $('.nav-display-mode').removeClass('nav-display-mode-selected');
    $(this).addClass('nav-display-mode-selected');

    Settings.set(Settings.DISPLAY_MODE, 0, function() {
      navUtil.reopenCurrentScreen();
    });
  });

  $('#nav-display-mode-map').on('click', function() {
    if(Settings.get(Settings.DISPLAY_MODE) == 1) {
      return;
    }

    $('.nav-display-mode').removeClass('nav-display-mode-selected');
    $(this).addClass('nav-display-mode-selected');

    Settings.set(Settings.DISPLAY_MODE, 1, function() {
      navUtil.reopenCurrentScreen();
    });
  });
}