/**
 * Noosphere Firefox Background Script
 * Adapted for Firefox WebExtensions API
 */

// Create context menu
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'saveToNoosphere',
    title: '🔮 Save to Noosphere',
    contexts: ['page', 'selection']
  });
  
  browser.contextMenus.create({
    id: 'extractPage',
    title: '📖 Extract as Knowledge',
    contexts: ['page']
  });
  
  console.log('[Noosphere] Firefox extension installed');
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveToNoosphere') {
    try {
      const response = await browser.tabs.sendMessage(tab.id, { action: 'extract' });
      if (response.success) {
        await saveToIndexedDB(response.data);
        showNotification('Saved!', `${response.data.title.substring(0, 50)} saved to Noosphere`);
      }
    } catch (e) {
      showNotification('Error', 'Could not extract page');
    }
  }
  
  if (info.menuItemId === 'extractPage') {
    browser.action.openPopup();
  }
});

// Save to IndexedDB
async function saveToIndexedDB(data) {
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

// Show notification (Firefox supports browser.notifications)
function showNotification(title, message) {
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message
  });
}

// Badge management - Firefox uses browser.action
browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const response = await browser.tabs.sendMessage(activeInfo.tabId, { action: 'ping' });
    if (response?.status === 'ok') {
      browser.action.setBadgeText({ text: '✓', tabId: activeInfo.tabId });
    }
  } catch {
    browser.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
  }
});

console.log('[Noosphere] Firefox background script loaded');
