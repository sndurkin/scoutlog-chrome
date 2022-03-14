function Place(data) {
  Util.apply(this, data);
}

Util.apply(Place.prototype, {
  
  getTitleForDisplay: function() {
    return this.title || chrome.i18n.getMessage('untitled');
  },
  
  hasTag: function(tag) {
    for(var i = 0; i < this.tagDriveIds.length; ++i) {
      if(tag.id == this.tagDriveIds[i]) {
        return true;
      }
    }
    
    return false;
  },
  
  // Returns true if this place has any tags, false otherwise.
  hasTags: function() {
    for(var j = 0; j < this.tagDriveIds.length; ++j) {
      if(drive.tagsById[this.tagDriveIds[j]]) {
        return true;
      }
    }
    
    return false;
  }
  
});