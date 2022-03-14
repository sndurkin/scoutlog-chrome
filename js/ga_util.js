var GAUtil = {

  UI_ACTION: "UI Action",

  sendError: function(msg, fatal) {
    ga('send', 'exception', {
      'exDescription': msg,
      'exFatal': fatal
    });
  },

  sendUIAction: function(action, label, value) {
    ga('send', 'event', {
      eventCategory: GAUtil.UI_ACTION,
      eventAction: action,
      eventLabel: label,
      eventValue: value
    });
  },

  sendButtonClick: function(label, value) {
    ga('send', 'event', {
      eventCategory: GAUtil.UI_ACTION,
      eventAction: 'Click Button',
      eventLabel: label,
      eventValue: value
    });
  },

  sendNavItemClick: function(label) {
    ga('send', 'event', {
      eventCategory: GAUtil.UI_ACTION,
      eventAction: 'Click Nav Drawer Item',
      eventLabel: label
    });
  },

  sendKeypress: function(keys) {
    ga('send', 'event', {
      eventCategory: GAUtil.UI_ACTION,
      eventAction: 'Shortcut',
      eventLabel: keys
    });
  }

};