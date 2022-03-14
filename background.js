chrome.browserAction.onClicked.addListener(function(tab) {
  
  chrome.tabs.query({
    url: chrome.extension.getURL('index.html'),
    windowId: chrome.windows.WINDOW_ID_CURRENT
  }, function(tabs) {
    if(tabs && tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, {
        active: true
      });
    }
    else {
      chrome.tabs.create({
        'url': chrome.extension.getURL('index.html')
      });
    }
  });
  
});