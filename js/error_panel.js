function ErrorPanel(cfg) {
  Util.apply(this, cfg);
  
}

Util.apply(ErrorPanel.prototype, {
  
  render: function(parentEl) {
    if(!this.el) {
      this.el = $([
        '<div class="row">',
          '<div class="col s2">&nbsp;</div>',
          '<div class="col s8 card-panel card-error drive-error-panel">',
            '<div class="left drive-error-text"></div>',
            '<div class="right drive-error-buttons"></div>',
          '<div class="col s2">&nbsp;</div>',
        '</div>'
      ].join('')).hide().appendTo(parentEl);

      this.errorText = this.el.find('.drive-error-text');
      this.errorButtonsCt = this.el.find('.drive-error-buttons');
    }

    return this;
  },
  
  show: function(cfg) {
    this.errorText.text(cfg.text);
    if(cfg.buttons) {
      for(var i = 0; i < cfg.buttons.length; ++i) {
        var linkEl = $([
          '<a class="waves-effect waves-light btn-flat">',
            '<i class="material-icons left">', cfg.buttons[i].icon, '</i>', cfg.buttons[i].text,
          '</a>'
        ].join('')).appendTo(this.errorButtonsCt);

        linkEl.click(cfg.buttons[i].handler);
      }
    }

    this.el.show();
    return this;
  },
  
  hide: function() {
    this.el.hide();
    return this;
  },
  
  destroy: function() {
    this.el.remove();
  }
  
});