function ExportTabularScreen() {
  
}

Util.apply(ExportTabularScreen.prototype, {
  
  render: function(parentEl) {
    this.el = $('<div class="container"></div>').appendTo(parentEl);
    $([
      '<div class="row">',
        '<div class="col s4">',
          '<div class="export-description">', 'Add any number of columns to the file, and then select the data for each column.', '</div>',
          '<form class="tabular-export-form"></form>',
          '<a class="waves-effect waves-light btn add-column-btn">', 'Add column', '</a>',
        '</div>',
      '</div>'
    ].join('')).appendTo(this.el);
    this.formEl = this.el.find('form');

    this.addColumnButtonEl = this.el.find('.add-column-btn');
    this.addColumnButtonEl.on('click', $.proxy(this.addField, this));
  },

  show: function(fileType) {
    if(!ExportTabularScreen.idsToExport) {
      navUtil.navigateBack();
      return;
    }

    this.fileType = fileType;

    // Action bar
    actionBarUtil.showNavIcon('close');
    actionBarUtil.setTitleText(this.fileType == 'csv' ? 'Export to CSV' : 'Export to Excel');

    this.el.show();

    this.clearFields();
    this.addField();
    this.renderExportButton();
  },

  addField: function() {
    var fieldEl = $([
      '<div class="field-ct">',
        '<div class="input-field">',
          '<select>',
            '<option value="0" selected>&nbsp;</option>',
            '<option value="1">Title</option>',
            '<option value="2">Date</option>',
            '<option value="3">Address</option>',
            '<option value="4">Latitude</option>',
            '<option value="5">Longitude</option>',
            '<option value="6">Latitude, Longitude</option>',
            '<option value="7">Tags</option>',
            '<option value="8">Notes</option>',
          '</select>',
          '<label></label>',
        '</div>',
        '<a class="waves-effect waves-light btn-flat field-close-btn">',
          '<i class="material-icons">close</i>',
        '</a>',
      '</div>'
    ].join(''));
    this.formEl.append(fieldEl);

    var selectEl = fieldEl.find('select');
    selectEl.material_select();

    var fieldIdx = this.fieldEls.length;
    this.fieldEls.push(fieldEl);

    var me = this;
    fieldEl.find('.field-close-btn').on('click', function() {
      $(this).parent('.field-ct').remove();
      me.updateFieldLabels();
    });

    this.updateFieldLabels();
  },

  updateFieldLabels: function() {
    this.formEl.find('label').each(function(idx) {
      $(this).text('Column ' + (idx + 1));
    });
  },

  clearFields: function() {
    this.fieldEls = [];
    this.formEl.empty();
  },

  renderExportButton: function() {
    this.loadingIcon = new CircularLoadingIcon({ size: 'tiny' });
    this.loadingIcon.render($('#right-footer'));
    
    this.exportBtnEl = $([
      '<a id="export-btn" class="waves-effect waves-light btn light-blue accent-3 right export-btn">',
        chrome.i18n.getMessage('export'),
      '</a>'
    ].join(''));
    this.exportBtnEl.appendTo($('#right-footer'));
    this.exportBtnEl.on('click', $.proxy(this.export, this));
  },

  gatherData: function() {
    var fieldVals = [];
    this.formEl.find('select').each(function() {
      fieldVals.push($(this).val());
    });

    if(!ExportTabularScreen.idsToExport) {
      return null;
    }

    var data = [];
    for(var i = 0; i < ExportTabularScreen.idsToExport.length; ++i) {
      var place = drive.placesById[ExportTabularScreen.idsToExport[i]];
      if(!place) {
        continue;
      }

      var rowData = [];
      for(var j = 0; j < fieldVals.length; ++j) {
        var cellData = null;
        switch(fieldVals[j]) {
          case '1':
            cellData = place.title;
            break;
          case '2':
            cellData = new Date(place.created_date);
            break;
          case '3':
            if(place.location && place.location.addressStr) {
              cellData = place.location.addressStr;
            }
            break;
          case '4':
            if(place.location && place.location.location) {
              cellData = Util.deserializeLatLng(place.location.location).lat.toFixed(6);
            }
            break;
          case '5':
            if(place.location && place.location.location) {
              cellData = Util.deserializeLatLng(place.location.location).lng.toFixed(6);
            }
            break;
          case '6':
            if(place.location && place.location.location) {
              cellData = Util.serializeLatLngForDisplay(Util.deserializeLatLng(place.location.location));
            }
            break;
          case '7':
            var tagNames = '';
            if(place.tagDriveIds) {
              for(var k = 0; k < place.tagDriveIds.length; ++k) {
                var tag = drive.tagsById[place.tagDriveIds[k]];
                if(tag) {
                  if(tagNames.length > 0) {
                    tagNames += ', ';
                  }
                  tagNames += tag.name;
                }
              }
            }
            cellData = tagNames;
            break;
          case '8':
            cellData = place.notes;
            break;
        }

        rowData.push(cellData);
      }

      data.push(rowData);
    }

    return data;
  },

  export: function() {
    var data = this.gatherData();
    if(!data) {
      return;
    }

    var worksheet = {};

    // The range object is used to keep track of the range of the sheet.
    var range = {
      s: { c: 0, r: 0 },
      e: { c: 0, r: 0 }
    };

    // Iterate through each element in the data.
    for(var rowIdx = 0; rowIdx < data.length; ++rowIdx) {
      if(range.e.r < rowIdx) {
        range.e.r = rowIdx;
      }

      for(var colIdx = 0; colIdx < data[rowIdx].length; ++colIdx) {
        if(range.e.c < colIdx) {
          range.e.c = colIdx;
        }

        // Construct the cell object; the v property holds the actual data.
        var cell = { v: data[rowIdx][colIdx] };
        if(cell.v === null || cell.v === undefined || cell.v === '') {
          continue;
        }

        // Construct the cell reference.
        var cellReference = XLSX.utils.encode_cell({
          c: colIdx,
          r: rowIdx
        });

        // Set the cell type.
        cell.t = (typeof cell.v === 'number')  ? 'n'
               : (typeof cell.v === 'boolean') ? 'b'
                                    /* else */ : 's';

        // Add the cell to the worksheet.
        worksheet[cellReference] = cell;
      }
    }
    worksheet['!ref'] = XLSX.utils.encode_range(range);

    if(this.fileType == 'excel') {
      // Set up the workbook objects.
      var workbook = {};
      workbook.Sheets = {};
      workbook.Props = {};
      workbook.SSF = {};
      workbook.SheetNames = [];

      // Add the worksheet to the workbook.
      workbook.SheetNames.push('Places');
      workbook.Sheets['Places'] = worksheet;

      // Write the file.
      var workbookOut = XLSX.write(workbook,  {
        bookType: 'xlsx',
        bookSST: false,
        type: 'binary'
      });
      saveAs(new Blob([ Util.convertStringToArrayBuffer(workbookOut) ], { type:"application/octet-stream" }), 'ScoutLog_Places.xlsx');
    }
    else if(this.fileType == 'csv') {
      var csvOut = XLSX.utils.sheet_to_csv(worksheet);
      saveAs(new Blob([ Util.convertStringToArrayBuffer(csvOut) ], { type:"text/csv" }), 'ScoutLog_Places.csv');
    }

    GAUtil.sendUIAction('Export', 'Export Places as ' + this.fileType, data.length);
  },
  
  destroyExportButton: function() {
    if(this.loadingIcon) {
      this.loadingIcon.destroy();
    }
    if(this.exportBtnEl) {
      this.exportBtnEl.off('click');
      this.exportBtnEl.remove();
    }
  },

  hide: function() {
    this.el.hide();
    this.clearFields();
    this.destroyExportButton();
  },

  destroy: function() {
    this.addColumnButtonEl.off('click');
    this.el.remove();
  }

});