/**
 * Noosphere Background Service Worker
 */

// Create context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveToNoosphere',
    title: '🔮 Save to Noosphere',
    contexts: ['page', 'selection']
  });
  
  chrome.contextMenus.create({
    id: 'extractPage',
    title: '📖 Extract as Knowledge',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveToNoosphere') {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
      if (response.success) {
        // Save to storage
        await saveToIndexedDB(response.data);
        showNotification('Saved!', `${response.data.title.substring(0, 50)} saved to Noosphere`);
      }
    } catch (e) {
      showNotification('Error', 'Could not extract page');
    }
  }
  
  if (info.menuItemId === 'extractPage') {
    chrome.action.openPopup();
  }
});

// Save to IndexedDB
function saveToIndexedDB(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NoosphereDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pages')) {
        db.createObjectStore('pages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('entities')) {
        db.createObjectStore('entities', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('pages', 'readwrite');
      const store = tx.objectStore('pages');
      
      store.put({
        id: data.url,
        ...data,
        savedAt: new Date().toISOString()
      });
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message
  });
}

// Badge management
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const response = await chrome.tabs.sendMessage(activeInfo.tabId, { action: 'ping' });
    if (response?.status === 'ok') {
      chrome.action.setBadgeText({ text: '✓', tabId: activeInfo.tabId });
    }
  } catch {
    chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
  }
});

console.log('[Noosphere] Background service worker loaded');
