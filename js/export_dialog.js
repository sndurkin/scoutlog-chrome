function ExportDialog() {
  
}
Util.apply(ExportDialog.prototype, ObservableMixin);
Util.apply(ExportDialog.prototype, {

  render: function(parentEl) {
    this.el = $([
      '<div class="modal export-dialog">',
        '<div class="modal-content">',
          '<h4>', chrome.i18n.getMessage('export_notification_title'), '</h4>',
          '<ul class="collection">',
            '<li id="export-gpx" class="collection-item action-not-implemented">', chrome.i18n.getMessage('menu_export_gpx'), '</li>',
            '<li id="export-kml" class="collection-item action-not-implemented">', chrome.i18n.getMessage('menu_export_kml'), '</li>',
            '<li id="export-csv" class="collection-item">', chrome.i18n.getMessage('menu_export_csv'), '</li>',
            '<li id="export-excel" class="collection-item">', chrome.i18n.getMessage('menu_export_excel'), '</li>',
          '</ul>',
        '</div>',
        '<div class="modal-footer">',
          '<a class="waves-effect waves-light btn-flat cancel-btn">', chrome.i18n.getMessage('cancel'), '</a>',
        '</div>',
      '</div>'
    ].join('')).appendTo(parentEl);

    this.el.find('.cancel-btn').on('click', $.proxy(this.hide, this));
    this.el.find('.collection-item').hover(function() {
      $(this).addClass('hovered');
    }, function() {
      $(this).removeClass('hovered');
    });
    $('#export-gpx').on('click', $.proxy(this.onClickExportToGPX, this));
    $('#export-kml').on('click', $.proxy(this.onClickExportToKML, this));
    $('#export-csv').on('click', $.proxy(this.onClickExportToCSV, this));
    $('#export-excel').on('click', $.proxy(this.onClickExportToExcel, this));
  },

  onClickExportToGPX: function() {
    Util.showNotImplementedToast();
  },

  onClickExportToKML: function() {
    Util.showNotImplementedToast();
  },

  onClickExportToCSV: function() {
    this.hide();
    ExportTabularScreen.idsToExport = this.selectedPlaceIds;
    navUtil.openScreen({
      screenType: 'export_tabular',
      args: [ 'csv' ],
      initiatedByUser: true
    });
  },

  onClickExportToExcel: function() {
    this.hide();
    ExportTabularScreen.idsToExport = this.selectedPlaceIds;
    navUtil.openScreen({
      screenType: 'export_tabular',
      args: [ 'excel' ],
      initiatedByUser: true
    });
  },

  show: function(selectedPlaceIds) {
    this.selectedPlaceIds = selectedPlaceIds;
    this.el.openModal({
      dismissible: true,
      ready: $.proxy(this.afterShown, this),
      complete: $.proxy(this.onHide, this)
    });
  },

  afterShown: function() { },
  
  hide: function() {
    this.el.closeModal();
    this.onHide();
  },

  onHide: function() {
    this.fireEvent('hide', this);
  },
  
  destroy: function() {
    this.el.remove();
  }
  
});