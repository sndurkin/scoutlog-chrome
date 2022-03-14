function Drive() {
  this.events = {
    initsuccess: [],
    initfailure: []
  };
}

Util.apply(Drive, {
  
  APP_FOLDER: 'ScoutLog',
  TAGS_FOLDER: 'tags',
  PHOTOS_FOLDER: 'photos',
  PLACES_FOLDER: 'locations',
  HIDDEN_TAGS_FOLDER: 'hidden_tags',
  METADATA_FOLDER: 'metadata',

  TAGS_TABLE: 'tags',
  PLACES_TABLE: 'places',
  
  BASE_URL: 'https://www.googleapis.com/drive/v3',
  BASE_UPLOAD_URL: 'https://www.googleapis.com/upload/drive/v3',
  MIME_TYPE_FOLDER: 'application/vnd.google-apps.folder',
  MIME_TYPE_PHOTO: 'application/vnd.google-apps.photo',
  MIME_TYPE_TEXT: 'text/plain',

  DB_NAME: 'ScoutLogDB',
  DB_VERSION: 1
  
});
Drive.SUB_FOLDERS = {
  'tagsFolder': Drive.TAGS_FOLDER,
  'photosFolder': Drive.PHOTOS_FOLDER,
  'placesFolder': Drive.PLACES_FOLDER,
  'hiddenTagsFolder': Drive.HIDDEN_TAGS_FOLDER,
  'metadataFolder': Drive.METADATA_FOLDER
};

Util.apply(Drive.prototype, ObservableMixin);
Util.apply(Drive.prototype, {
  
  auth: function(callbackFn) {
    var me = this;
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
      if(!token) {
        // User has denied authorization to the app.
        me.fireEvent('initfailure');
        return;
      }
      
      me.token = token;
      if(callbackFn) {
        callbackFn();
      }
    });
  },
  
  initFolders: function() {
    this.makeDriveRequest({
      url: Drive.BASE_URL + '/files',
      data: {
        'q': 'mimeType = "' + Drive.MIME_TYPE_FOLDER + '" and name = "' + Drive.APP_FOLDER + '" and trashed = false'
      },
      scope: this,
      onSuccess: function(data) {
        if(data.files.length > 0) {
          this.rootFolder = data.files[0];
          this.initSubFolders();
        }
        else {
          this.createFolder(Drive.APP_FOLDER, {
            scope: this,
            onSuccess: function(data) {
              this.rootFolder = data;
              this.initSubFolders();
            },
            onFailure: function() {
              this.fireEvent('initfailure');
            }
          });
        }
      },
      onFailure: function() {
        this.fireEvent('initfailure');
      }
    });
  },
  
  initSubFolders: function() {
    this.makeDriveRequest({
      url: Drive.BASE_URL + '/files',
      data: {
        'q': 'mimeType = "' + Drive.MIME_TYPE_FOLDER + '" and "' + this.rootFolder.id + '" in parents and trashed = false'
      },
      scope: this,
      onSuccess: function(data) {
        for(var i = 0; i < data.files.length; ++i) {
          var folder = data.files[i];
          for(var variableName in Drive.SUB_FOLDERS) {
            var driveFolderName = Drive.SUB_FOLDERS[variableName];
            if(folder.name == driveFolderName) {
              this[variableName] = folder;
            }
          }
        }
        
        this.createSubFolders();
      },
      onFailure: function() {
        this.fireEvent('initfailure');
      }
    });
  },
  
  // Recursively create any sub folders that are missing.
  createSubFolders: function() {
    var folderNamesToCreate = [];
    for(var variableName in Drive.SUB_FOLDERS) {
      if(!this[variableName]) {
        var driveFolderName = Drive.SUB_FOLDERS[variableName];
        this.createFolder(driveFolderName, {
          scope: this,
          onSuccess: function(data) {
            this[variableName] = data;
            this.createSubFolders();
          },
          onFailure: function() {
            this.fireEvent('initfailure');
          }
        }, this.rootFolder.id);
        
        return;
      }
    }
    
    this.fireEvent('initsuccess');
  },

  fetchData: function(cfg) {
    delete this.hiddenTags;
    delete this.tags;
    delete this.tagsById;
    delete this.places;
    delete this.placesById;
    delete this.photosById;
    delete this.iconUrlsById;
    
    var me = this;
    me.createDatabase({
      scope: cfg.scope,
      onSuccess: function() {
        me.changedTags = {};
        me.changedPlaces = {};
        me.removedFiles = {};

        me.fetchStartChangeIds({
          scope: cfg.scope,
          onSuccess: function() {
            if(me.lastStartChangeId) {
              me.fetchChangedData(me.lastStartChangeId, {
                scope: cfg.scope,
                onSuccess: function() {
                  me.afterDataFetched(cfg);
                },
                onFailure: cfg.onFailure
              });
            }
            else {
              me.fetchInitialData({
                scope: cfg.scope,
                onSuccess: function() {
                  me.afterDataFetched(cfg);
                },
                onFailure: cfg.onFailure
              });
            }
          },
          onFailure: cfg.onFailure
        })
      },
      onFailure: cfg.onFailure
    });
  },
  
  afterDataFetched: function(cfg) {
    chrome.storage.local.set({ lastStartChangeId: this.newStartChangeId }, function() {
      cfg.onSuccess.call(cfg.scope || window);
    });
  },

  fetchStartChangeIds: function(cfg) {
    var me = this;
    chrome.storage.local.get('lastStartChangeId', function(storageItems) {
      me.lastStartChangeId = storageItems.lastStartChangeId;
      
      me.makeDriveRequest({
        url: Drive.BASE_URL + '/changes/startPageToken',
        onSuccess: function(data) {
          me.newStartChangeId = data.startPageToken;
          cfg.onSuccess.call(cfg.scope || window);
        },
        onFailure: me.createFailureFn(cfg)
      });
    });
  },

  fetchChangedData: function(startChangeId, cfg) {
    this.makeDriveRequest({
      url: Drive.BASE_URL + '/changes',
      data: {
        'pageToken': startChangeId,
        'fields': 'changes(file(id,name,trashed,parents,thumbnailLink,webContentLink),fileId,removed,time),newStartPageToken,nextPageToken'
      },
      scope: this,
      onSuccess: function(data) {
        for(var i = 0; i < data.changes.length; ++i) {
          var change = data.changes[i];
          var file = change.file;
          if(change.removed || (file && file.trashed)) {
            this.removedFiles[change.fileId] = true;
          }
          else if(file && file.parents && file.parents.length > 0) {
            if(file.parents[0] == this.placesFolder.id) {
              this.changedPlaces[change.fileId] = file;
            }
            else if(file.parents[0] == this.tagsFolder.id ||
                    file.parents[0] == this.hiddenTagsFolder.id) {
              this.changedTags[change.fileId] = file;
            }
          }
        }
        
        if(data.nextPageToken) {
          this.fetchChangedData(data.nextPageToken, cfg);
        }
        else {
          this.newStartChangeId = data.newStartPageToken;
          this.onChangedDataFetched(cfg);
        }
      },
      onFailure: this.createFailureFn(cfg)
    });
  },

  onChangedDataFetched: function(cfg) {
    var me = this;
    var onSuccess = function() {
      me.onChangedDataFetched(cfg);
    };
    var onFailure = function() {
      cfg.onFailure.apply(cfg.scope || window, arguments);
    };
    
    if(!this.tags) {
      this.syncTags({
        onSuccess: onSuccess,
        onFailure: onFailure
      });
      return;
    }

    if(!me.iconUrlsById) {
      this.fetchAllIconUrls({
        onSuccess: onSuccess,
        onFailure: onFailure
      });
      return;
    }

    if(!this.photosById) {
      this.fetchAllPhotos({
        onSuccess: onSuccess,
        onFailure: onFailure
      })
      return;
    }
    
    if(!this.places) {
      this.syncPlaces({
        onSuccess: onSuccess,
        onFailure: onFailure
      });
      return;
    }
    
    cfg.onSuccess.call(cfg.scope || window);
  },

  syncTags: function(cfg) {
    var me = this;

    me.hiddenTags = [];
    me.tags = [];
    me.tagsById = {};
    me.tagsToAddToDatabase = [];
    
    var tagsStore = me.database.transaction([Drive.TAGS_TABLE], 'readwrite').objectStore(Drive.TAGS_TABLE);
    tagsStore.openCursor().onsuccess = function(e) {
      var cursor = e.target.result;
      if(cursor) {
        var tag = cursor.value;
        if(me.removedFiles[tag.id]) {
          cursor.delete();
        }
        else if(me.changedTags[tag.id]) {
          me.tagsToAddToDatabase.push(tag);
          delete me.changedTags[tag.id];
        }
        else {
          // Tag is unchanged, so add it into memory.
          me.addTagToCache(tag);
        }
        
        cursor.continue();
      }
      else {
        // We've reached the end of the cursor, so save any changed tags to the database
        // and add any new tags from Drive.
        if(me.tagsToAddToDatabase.length > 0) {
          me.addChangedTagsFromDrive({
            scope: cfg.scope,
            onSuccess: function() {
              me.addNewTagsFromDrive(cfg);
            },
            onFailure: cfg.onFailure
          });
        }
        else {
          me.addNewTagsFromDrive(cfg);
        }
      }
    };
  },

  addChangedTagsFromDrive: function(cfg, idx) {
    var me = this;
    
    idx = idx || 0;
    if(idx < me.tagsToAddToDatabase.length) {
      var tag = me.tagsToAddToDatabase[idx];
      
      me.makeDriveRequest({
        url: Drive.BASE_URL + '/files/' + tag.id,
        data: {
          'alt': 'media'
        },
        onSuccess: function(content) {
          if(content) {
            Util.apply(tag, content);
          }
          me.addTagToCache(tag);
          
          me.addChangedTagsFromDrive(cfg, idx + 1);
        },
        onFailure: me.createFailureFn(cfg)
      });
    }
    else {
      // We've fetched all the new data from Drive and added it into memory,
      // so save all this new data to the database.
      var transaction = me.database.transaction([Drive.TAGS_TABLE], 'readwrite');
      transaction.oncomplete = function(e) {
        cfg.onSuccess.call(cfg.scope);
      };
      
      transaction.onerror = function(e) {
        GAUtil.sendError('Failed to write to tags table.');

        cfg.onFailure.call(cfg.scope);
      };
      
      var tagsStore = transaction.objectStore(Drive.TAGS_TABLE);
      for(var i = 0; i < me.tagsToAddToDatabase.length; ++i) {
        tagsStore.put(me.tagsToAddToDatabase[i]);
      }
    }
  },

  // This function is recursive; it uses a for-in loop to access the first entry in the changedTags
  // object, fetches the data for that tag and adds it to the DB, removes that tag from changedTags,
  // and then calls itself recursively until changedTags is empty.
  addNewTagsFromDrive: function(cfg) {
    var me = this;
    for(var id in me.changedTags) {
      var tag = {
        id: id,
        name: me.changedTags[id].name
      };

      me.makeDriveRequest({
        url: Drive.BASE_URL + '/files/' + tag.id,
        data: {
          'alt': 'media'
        },
        onSuccess: function(content) {
          if(content) {
            Util.apply(tag, content);
          }
          me.addTagToCache(tag);

          var transaction = me.database.transaction([Drive.TAGS_TABLE], 'readwrite');
          transaction.oncomplete = function(e) {
            delete me.changedTags[tag.id];
            me.addNewTagsFromDrive(cfg);
          };

          transaction.onerror = function(e) {
            GAUtil.sendError('Failed to write to tags table.');

            cfg.onFailure.call(cfg.scope);
          };

          var tagsStore = transaction.objectStore(Drive.TAGS_TABLE);
          tagsStore.put(tag);
        },
        onFailure: me.createFailureFn(cfg)
      });

      return;
    }

    cfg.onSuccess.call(cfg.scope || window);
  },

  syncPlaces: function(cfg) {
    var me = this;
    
    me.places = [];
    me.placesById = {};
    me.placesToAddToDatabase = [];
    
    var placesStore = me.database.transaction([Drive.PLACES_TABLE], 'readwrite').objectStore(Drive.PLACES_TABLE);
    placesStore.openCursor().onsuccess = function(e) {
      var cursor = e.target.result;
      if(cursor) {
        var place = cursor.value;
        if(me.removedFiles[place.id]) {
          cursor.delete();
        }
        else if(me.changedPlaces[place.id]) {
          me.placesToAddToDatabase.push(place);
          delete me.changedPlaces[place.id];
        }
        else {
          // Place is unchanged, so add it into memory.
          me.addPlaceToCache(place);
        }
        
        cursor.continue();
      }
      else {
        // We've reached the end of the cursor, so save any changed places to the database
        // and add any new places from Drive.
        if(me.placesToAddToDatabase.length > 0) {
          me.addChangedPlacesFromDrive({
            scope: cfg.scope,
            onSuccess: function() {
              me.addNewPlacesFromDrive(cfg);
            },
            onFailure: cfg.onFailure
          });
        }
        else {
          me.addNewPlacesFromDrive(cfg);
        }
      }
    };
  },
  
  addChangedPlacesFromDrive: function(cfg, idx) {
    var me = this;
    
    idx = idx || 0;
    if(idx < me.placesToAddToDatabase.length) {
      var place = me.placesToAddToDatabase[idx];
      
      me.makeDriveRequest({
        url: Drive.BASE_URL + '/files/' + place.id,
        data: {
          'alt': 'media'
        },
        onSuccess: function(content) {
          if(content) {
            Util.apply(place, content);
          }
          me.addPlaceToCache(place);

          me.addChangedPlacesFromDrive(cfg, idx + 1);
        },
        onFailure: me.createFailureFn(cfg)
      });
    }
    else {
      // We've fetched all the new data from Drive and added it into memory,
      // so save all this new data to the database.
      var transaction = me.database.transaction([Drive.PLACES_TABLE], 'readwrite');
      transaction.oncomplete = function(e) {
        cfg.onSuccess.call(cfg.scope || window);
      };
      
      transaction.onerror = function(e) {
        GAUtil.sendError('Failed to write to places table.');

        cfg.onFailure.call(cfg.scope);
      };
      
      var placesStore = transaction.objectStore(Drive.PLACES_TABLE);
      for(var i = 0; i < me.placesToAddToDatabase.length; ++i) {
        placesStore.put(me.placesToAddToDatabase[i]);
      }
    }
  },

  // This function is recursive; it uses a for-in loop to access the first entry in the changedPlaces
  // object, fetches the data for that place and adds it to the DB, removes that place from changedPlaces,
  // and then calls itself recursively until changedPlaces is empty.
  addNewPlacesFromDrive: function(cfg) {
    var me = this;
    for(var id in me.changedPlaces) {
      var place = { id: id };

      me.makeDriveRequest({
        url: Drive.BASE_URL + '/files/' + place.id,
        data: {
          'alt': 'media'
        },
        onSuccess: function(content) {
          if(content) {
            Util.apply(place, content);
          }
          me.addPlaceToCache(place);

          var transaction = me.database.transaction([Drive.PLACES_TABLE], 'readwrite');
          transaction.oncomplete = function(e) {
            delete me.changedPlaces[place.id];
            me.addNewPlacesFromDrive(cfg);
          };

          transaction.onerror = function(e) {
            GAUtil.sendError('Failed to write to places table.');

            cfg.onFailure.call(cfg.scope);
          };

          var placesStore = transaction.objectStore(Drive.PLACES_TABLE);
          placesStore.put(place);
        },
        onFailure: me.createFailureFn(cfg)
      });

      return;
    }

    cfg.onSuccess.call(cfg.scope || window);
  },

  // Fetches all tags, hidden tags, and the initial set of places.
  fetchInitialData: function(cfg) {
    var me = this;
    var onSuccess = function() {
      me.fetchInitialData(cfg);
    };
    var onFailure = function() {
      cfg.onFailure.apply(cfg.scope || window, arguments);
    };
    
    if(!me.hiddenTags || !me.tags) {
      me.fetchAllHiddenTags({
        onSuccess: function() {
          me.fetchAllTags({
            onSuccess: function() {
              me.syncTags({
                onSuccess: onSuccess,
                onFailure: onFailure
              });
            },
            onFailure: onFailure
          });
        },
        onFailure: onFailure
      });
      return;
    }
    
    if(!me.iconUrlsById) {
      me.fetchAllIconUrls({
        onSuccess: onSuccess,
        onFailure: onFailure
      });
      return;
    }
    
    if(!me.photosById) {
      me.fetchAllPhotos({
        onSuccess: onSuccess,
        onFailure: onFailure
      });
      return;
    }
    
    if(!me.places) {
      me.fetchAllPlaces({
        onSuccess: function() {
          me.syncPlaces({
            onSuccess: onSuccess,
            onFailure: onFailure
          });
        },
        onFailure: onFailure
      });
      return;
    }

    cfg.onSuccess.call(cfg.scope || window);
  },
  
  fetchAllHiddenTags: function(cfg, startPageToken) {
    this.makeDriveRequest({
      url: Drive.BASE_URL + '/files',
      data: {
        'q': '"' + this.hiddenTagsFolder.id + '" in parents and trashed = false',
        'fields': 'files(id,name),nextPageToken',
        'pageToken': startPageToken
      },
      scope: this,
      onSuccess: function(data) {
        for(var i = 0; i < data.files.length; ++i) {
          var tagFile = data.files[i];
          this.changedTags[tagFile.id] = tagFile;
        }

        if(data.nextPageToken) {
          this.fetchAllHiddenTags(cfg, data.nextPageToken);
          return;
        }

        cfg.onSuccess.call(cfg.scope || window);
      },
      onFailure: this.createFailureFn(cfg)
    });
  },
  
  fetchAllTags: function(cfg, startPageToken) {
    this.makeDriveRequest({
      url: Drive.BASE_URL + '/files',
      data: {
        'q': '"' + this.tagsFolder.id + '" in parents and trashed = false',
        'fields': 'files(id,name),nextPageToken',
        'pageToken': startPageToken
      },
      scope: this,
      onSuccess: function(data) {
        for(var i = 0; i < data.files.length; ++i) {
          var tagFile = data.files[i];
          this.changedTags[tagFile.id] = tagFile;
        }

        if(data.nextPageToken) {
          this.fetchAllTags(cfg, data.nextPageToken);
          return;
        }

        cfg.onSuccess.call(cfg.scope || window);
      },
      onFailure: this.createFailureFn(cfg)
    });
  },

  fetchAllIconUrls: function(cfg, startPageToken) {
    if(!this.iconUrlsById) {
      this.iconUrlsById = {};
    }

    this.makeDriveRequest({
      url: Drive.BASE_URL + '/files',
      data: {
        'q': '"' + this.metadataFolder.id + '" in parents and trashed = false',
        'fields': 'files(id,thumbnailLink),nextPageToken',
        'pageToken': startPageToken
      },
      scope: this,
      onSuccess: function(data) {
        for(var i = 0; i < data.files.length; ++i) {
          var iconUrlFile = data.files[i];

          // Remove the width modifier.
          this.iconUrlsById[iconUrlFile.id] = iconUrlFile.thumbnailLink.replace(/=s[0-9]+/, '');
        }

        if(data.nextPageToken) {
          this.fetchAllIconUrls(cfg, data.nextPageToken);
          return;
        }

        cfg.onSuccess.call(cfg.scope || window);
      },
      onFailure: this.createFailureFn(cfg)
    });
  },

  fetchAllPhotos: function(cfg) {
    if(!this.photosById) {
      this.photosById = {};
    }

    this.fetchAllPhotosAux(cfg, this.photosFolder.id);
  },

  fetchAllPhotosAux: function(cfg, parentFolderId, startPageToken) {
    this.makeDriveRequest({
      url: Drive.BASE_URL + '/files',
      data: {
        'q': '"' + parentFolderId + '" in parents and trashed = false',
        'fields': 'files(id,mimeType,thumbnailLink,webContentLink),nextPageToken',
        'pageToken': startPageToken
      },
      scope: this,
      onSuccess: function(data) {
        for(var i = 0; i < data.files.length; ++i) {
          var file = data.files[i];
          if(file.mimeType == Drive.MIME_TYPE_FOLDER) {
            this.fetchAllPhotosAux(cfg, file.id);
          }
          else {
            this.addPhotoToCache(file);
          }
        }

        if(data.nextPageToken) {
          this.fetchAllPhotosAux(cfg, parentFolderId, data.nextPageToken);
          return;
        }

        cfg.onSuccess.call(cfg.scope || window);
      },
      onFailure: this.createFailureFn(cfg)
    });
  },

  fetchAllPlaces: function(cfg, startPageToken) {
    this.makeDriveRequest({
      url: Drive.BASE_URL + '/files',
      data: {
        'q': '"' + this.placesFolder.id + '" in parents and trashed = false',
        'fields': 'files(id,name),nextPageToken',
        'pageToken': startPageToken
      },
      scope: this,
      onSuccess: function(data) {
        for(var i = 0; i < data.files.length; ++i) {
          var placeFile = data.files[i];
          this.changedPlaces[placeFile.id] = placeFile;
        }

        if(data.nextPageToken) {
          this.fetchAllPlaces(cfg, data.nextPageToken);
          return;
        }

        cfg.onSuccess.call(cfg.scope || window);
      },
      onFailure: this.createFailureFn(cfg)
    });
  },

  addTagToCache: function(tag) {
    if(!tag.hidden) {
      tag.name = tag.name.trim();
      
      this.tags.push(tag);
      this.tagsById[tag.id] = tag;
    }
    else {
      delete tag.name;
      this.hiddenTags.push(tag);
    }
  },

  addPhotoToCache: function(photo) {
    // Remove the width modifier.
    photo.thumbnailLink = photo.thumbnailLink.replace(/=s[0-9]+/, '');

    this.photosById[photo.id] = photo;
  },

  addPlaceToCache: function(placeData) {
    var place = new Place(placeData);
    this.places.push(place);
    this.placesById[place.id] = place;
  },
  
  getPlaceThumbnailUrl: function(placeId, width, idx) {
    var place = drive.placesById[placeId];
    if(place && place.photos && place.photos.length) {
      var photoId = place.photos[idx || 0].driveId;
      var photo = drive.photosById[photoId];
      if(photo) {
        return photo.thumbnailLink + '=s' + width;
      }
    }
    return null;
  },
  
  createFolder: function(name, cfg, parentId) {
    var parents;
    if(parentId) {
      parents = [{
        id: parentId
      }];
    }
    
    Util.apply(cfg, {
      type: 'POST',
      url: Drive.BASE_URL + '/files',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify({
        mimeType: Drive.MIME_TYPE_FOLDER,
        name: name,
        parents: parents
      })
    });
    this.makeDriveRequest(cfg);
  },

  savePlace: function(place, cfg) {
    var me = this;
    
    var data = JSON.parse(JSON.stringify(place));
    delete data.id;

    var url = Drive.BASE_UPLOAD_URL + '/files';
    var type;
    var parentFolderId;
    if(place.id) {
      url += '/' + place.id;
      type = 'PATCH';
    }
    else {
      parentFolderId = this.placesFolder.id;
      type = 'POST';
    }
    url += '?uploadType=multipart';
    
    var partBoundary = Util.guid();
    this.makeDriveRequest({
      type: type,
      url: url,
      contentType: 'multipart/related; boundary=' + partBoundary,
      data: this.constructMultipartContent({
        partBoundary: partBoundary,
        name: place.title,
        mimeType: Drive.MIME_TYPE_TEXT,
        parentFolderId: parentFolderId,
        data: data
      }),
      scope: cfg.scope,
      onSuccess: function(resp) {
        if(!place.id) {
          // If there was no place id, then the caller is creating a new place,
          // so add it to the current database.
          place.id = resp.id;
          drive.places.push(place);
          drive.placesById[place.id] = place;

          me.fireEvent('placeadded', place);
        }
        cfg.onSuccess.apply(cfg.scope, arguments);
      },
      onFailure: cfg.onFailure
    });
  },
  
  saveTag: function(tag, cfg) {
    var me = this;
    
    var data = JSON.parse(JSON.stringify(tag));
    delete data.id;

    var url = Drive.BASE_UPLOAD_URL + '/files';
    var parentFolderId;
    if(tag.id) {
      url += '/' + tag.id;
    }
    else {
      parentFolderId = this.tagsFolder.id;
    }
    url += '?uploadType=multipart';
    
    var partBoundary = Util.guid();
    this.makeDriveRequest({
      type: 'POST',
      url: url,
      contentType: 'multipart/related; boundary=' + partBoundary,
      data: this.constructMultipartContent({
        partBoundary: partBoundary,
        name: tag.name,
        mimeType: Drive.MIME_TYPE_TEXT,
        parentFolderId: parentFolderId,
        data: data
      }),
      scope: cfg.scope,
      onSuccess: function(resp) {
        if(!tag.id) {
          // If there was no tag id, then the caller is creating a new tag,
          // so add it to the current database.
          tag.id = resp.id;
          drive.tags.push(tag);
          drive.tagsById[tag.id] = tag;

          me.fireEvent('tagadded', tag);
        }
        cfg.onSuccess.apply(cfg.scope, arguments);
      },
      onFailure: cfg.onFailure
    });
  },
  
  uploadPhotos: function(files, name, cfg) {
    this.numUploadedPhotos = 0;
    var uploadedPhotoIds = [];
    var me = this;
    for(var i = 0; i < files.length; ++i) {
      this.uploadPhoto(files, i, name, uploadedPhotoIds, {
        scope: cfg.scope,
        onSuccess: function() {
          cfg.onUpdate.call(cfg.scope || window, ++me.numUploadedPhotos);
          if(me.numUploadedPhotos == files.length) {
            delete me.numUploadedPhotos;
            cfg.onSuccess.call(cfg.scope || window, uploadedPhotoIds);
          }
        },
        onFailure: cfg.onFailure
      });
    }
  },
  
  // Private function, only used by uploadPhotos()
  uploadPhoto: function(files, idx, name, uploadedPhotoIds, cfg) {
    var me = this;
    var file = files[idx];
    var reader = new FileReader();
    reader.onload = function() {
      if(this.result.length == 0) {
        GAUtil.sendError('Could not load photo for upload.');
        cfg.onFailure.call(cfg.scope);
        return;
      }

      var mimeType = file.type;
      var base64Data = me.getBase64StringFromDataUrl(this.result);
      
      var partBoundary = Util.guid();
      me.makeDriveRequest({
        type: 'POST',
        url: Drive.BASE_UPLOAD_URL + '/files?uploadType=multipart',
        contentType: 'multipart/related; boundary=' + partBoundary,
        data: me.constructMultipartContent({
          partBoundary: partBoundary,
          name: name,
          mimeType: mimeType,
          parentFolderId: me.photosFolder.id,
          data: base64Data,
          contentHeaders: [{ name: 'Content-Transfer-Encoding', value: 'base64' }]
        }),

        scope: cfg.scope,
        onSuccess: function(resp) {
          me.makeDriveRequest({
            type: 'GET',
            url: Drive.BASE_URL + '/files/' + resp.id,
            data: {
              'fields': 'id,thumbnailLink,webContentLink'
            },
            scope: cfg.scope,
            onSuccess: function(resp2) {
              var photo = {
                id: resp2.id,
                thumbnailLink: resp2.thumbnailLink,
                webContentLink: resp2.webContentLink
              };

              me.addPhotoToCache(photo);
              uploadedPhotoIds[idx] = photo.id;

              cfg.onSuccess.call(cfg.scope || window);
            },
            onFailure: me.createFailureFn(cfg)
          });
        },
        onFailure: cfg.onFailure
      });
    };
    reader.readAsDataURL(file);
  },

  deletePhoto: function(placeId, photoId, photoIdx, cfg) {
    var place = this.placesById[placeId];
    place.photos.splice(photoIdx, 1);
    for(var i = 0; i < place.photos.length; ++i) {
      place.photos[i].sortNum = i;
    }

    var me = this;
    this.savePlace(place, {
      scope: cfg.scope,
      onSuccess: function() {
        me.makeDriveRequest({
          type: 'PATCH',
          url: Drive.BASE_URL + '/files/' + photoId,
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({
            trashed: false
          }),
          scope: cfg.scope,
          onSuccess: function() {
            cfg.onSuccess.call(cfg.scope || window, place);
          },
          onFailure: cfg.onFailure
        });
      },
      onFailure: cfg.onFailure
    });
  },

  undeletePhoto: function(placeId, deletedPhoto, deletedPhotoIdx, cfg) {
    var place = this.placesById[placeId];
    place.photos.splice(deletedPhotoIdx, 0, deletedPhoto);
    for(var i = 0; i < place.photos.length; ++i) {
      place.photos[i].sortNum = i;
    }

    var me = this;
    this.savePlace(place, {
      scope: cfg.scope,
      onSuccess: function() {
        me.makeDriveRequest({
          type: 'PATCH',
          url: Drive.BASE_URL + '/files/' + deletedPhoto.driveId,
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({
            trashed: false
          }),
          scope: cfg.scope,
          onSuccess: function() {
            cfg.onSuccess.call(cfg.scope || window, place);
          },
          onFailure: cfg.onFailure
        });
      },
      onFailure: cfg.onFailure
    });
  },

  permanentlyDeletePhoto: function(photoId, cfg) {
    delete this.photosById[photoId];
    this.makeDriveRequest({
      type: 'DELETE',
      url: Drive.BASE_URL + '/files/' + photoId,
      scope: cfg.scope,
      onSuccess: cfg.onSuccess,
      onFailure: cfg.onFailure
    });
  },

  // dataUrl should hold a string like this: "data:image/png;base64,iVBORw0KGgo..."
  getBase64StringFromDataUrl: function(dataUrl) {
    return dataUrl.substring(dataUrl.indexOf('base64,') + 'base64,'.length);
  },
  
  constructMultipartContent: function(cfg) {
    var metadata = {
      name: cfg.name,
      mimeType: cfg.mimeType
    };
    if(cfg.parentFolderId) {
      metadata.parents = [ cfg.parentFolderId ];
    }

    cfg.contentHeaders = cfg.contentHeaders || [];
    cfg.contentHeaders.unshift({ name: 'Content-Type', value: cfg.mimeType });
    
    var multipartContentArr = [
      '--', cfg.partBoundary, '\r\n',
      'Content-Type: application/json\r\n\r\n',
      JSON.stringify(metadata), '\r\n',
      '--', cfg.partBoundary, '\r\n'
    ];

    for(var i = 0; i < cfg.contentHeaders.length; ++i) {
      var headerField = cfg.contentHeaders[i];
      multipartContentArr.push(headerField.name, ': ', headerField.value, '\r\n');
    }

    var dataStr;
    if(typeof cfg.data === 'object') {
      dataStr = JSON.stringify(cfg.data)
    }
    else {
      dataStr = cfg.data;
    }

    multipartContentArr.push(
      '\r\n', dataStr, '\r\n',
      '--', cfg.partBoundary, '--\r\n'
    );
    return multipartContentArr.join('');
  },

  createDatabase: function(cfg) {
    var me = this;
    var request = window.indexedDB.open(Drive.DB_NAME, Drive.DB_VERSION);
    request.onupgradeneeded = function(e) {
      var db = e.target.result;
      if(e.newVersion >= 1) {
        var tagsStore = db.createObjectStore(Drive.TAGS_TABLE, { keyPath: 'id' });
            tagsStore.createIndex('name', 'name', { unique: false });
        var placesStore = db.createObjectStore(Drive.PLACES_TABLE, { keyPath: 'id' });
      }
    };

    request.onsuccess = function(e) {
      me.database = request.result;
      cfg.onSuccess.call(cfg.scope || window);
    };
    request.onerror = function(e) {
      GAUtil.sendError('Failed to create database.');

      cfg.onFailure.call(cfg.scope || window);
    };
  },

  deleteDatabase: function(cfg) {
    var request = window.indexedDB.deleteDatabase(Drive.DB_NAME);
    request.onsuccess = function() {
      cfg.onSuccess.call(cfg.scope || window);
    };
    request.onerror = function() {
      GAUtil.sendError('Failed to delete database.');

      cfg.onFailure.call(cfg.scope || window);
    };
  },
  
  createFailureFn: function(cfg) {
    return function() {
      cfg.onFailure.call(cfg.scope || window);
    };
  },
  
  makeDriveRequest: function(cfg) {
    var me = this;
    if(!this.token) {
      this.auth(function() {
        me.makeDriveRequest(cfg);
      });
      return;
    }
    
    cfg.type = cfg.type || 'GET';
    cfg.headers = {
      'Authorization': 'Bearer ' + this.token
    };
    
    Util.apply(cfg, {
      success: function(data) {
        if(typeof data === 'string' && data.length > 0) {
          data = JSON.parse(data);
        }
        cfg.onSuccess.call(cfg.scope || window, data);
      },
      error: function(xhr) {
        GAUtil.sendError('Request failed. Code: ' + xhr.status + ' Url: ' + cfg.url);

        switch(xhr.status) {
          case 401:
            chrome.identity.removeCachedAuthToken({ 
              token: me.token
            }, function() {
              delete me.token;
              me.makeDriveRequest(cfg);
            });
            break;
          case 403:
            // TODO: handle rate limiting and other misc errors from Google Drive: https://developers.google.com/drive/web/handle-errors
            break;
          default:        // 404, 500, and others
            if(cfg.onFailure) {
              cfg.onFailure.call(cfg.scope || window, xhr);
            }
            break;
        }
      }
    });
    $.ajax(cfg);
  }
  
});