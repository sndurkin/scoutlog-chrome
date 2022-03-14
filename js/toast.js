function Toast(cfg) {
  Util.apply(this, cfg);
  this.events = {
    expired: [],
    actionclicked: []
  };
}

Toast.currentToast = null;

Util.apply(Toast.prototype, ObservableMixin);
Util.apply(Toast.prototype, {

  show: function() {
    if(!this.text) {
      throw 'No text provided to toast/snackbar';
    }

    // Create toast container if it does not exist.
    if($('#toast-container').length == 0) {
      $('<div id="toast-container"></div>').appendTo($(document.body));
    }

    if(Toast.currentToast) {
      var me = this;
      Toast.currentToast.on('expired', function() {
        me.showAux();
      });
      Toast.currentToast.hide();
    }
    else {
      this.showAux();
    }
  },

  showAux: function() {
    Toast.currentToast = this;

    var html = [
      '<div class="toast ', (this.cls || ''), '">',
        '<span class="toast-text">', this.text, '</span>'
    ];
    if(this.actionText) {
      html.push(
        '<a class="btn-flat toast-action-btn">', this.actionText, '</a>'
      );
    }
    html.push(
      '</div>'
    );

    var me = this;

    this.el = $(html.join(''));
    this.el.find('.toast-action-btn').on('click', function() {
      me.fireEvent('actionclicked');
    });
    this.el.css({
      top: '35px',
      opacity: '0'
    });
    this.el.appendTo($('#toast-container'));

    // Animate the toast into view.
    this.el.animate({
      top: '0px',
      opacity: '1'
    }, 300, 'easeOutCubic');

    this.timeoutRef = setTimeout(function() {
      // Animate toast out of view.
      me.el.animate({
        marginTop: '-40px',
        opacity: '0'
      }, 375, 'easeOutExpo', function() {
        me.destroy();
        me.fireEvent('expired');
      });
    }, this.duration || 3000);
  },

  cancelExpiration: function() {
    clearTimeout(this.timeoutRef);
  },

  hide: function(silent) {
    clearTimeout(this.timeoutRef);

    var me = this;
    this.el.animate({
      marginTop: '-40px',
      opacity: '0'
    }, 375, 'easeOutExpo', function() {
      me.destroy();
      if(silent !== true) {
        me.fireEvent('expired');
      }
    });
  },

  destroy: function() {
    this.el.remove();
    Toast.currentToast = null;
  }

});