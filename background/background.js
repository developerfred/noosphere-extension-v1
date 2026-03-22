/**
 * Noosphere Background Service Worker v0.2.0
 * Enhanced for AI agent workflows
 */

// State
let isProcessing = false;

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Noosphere] Extension installed v0.2.0');
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'saveToNoosphere',
    title: '🔮 Save to Noosphere',
    contexts: ['page', 'selection']
  });
  
  chrome.contextMenus.create({
    id: 'extractEntities',
    title: '📊 Extract All Entities',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'extractPage',
    title: '📖 Quick Extract',
    contexts: ['page']
  });
  
  // Set default settings
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          autoSave: false,
          showNotifications: true,
          badgeEnabled: true,
          maxStorage: 100 // pages
        }
      });
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    switch (info.menuItemId) {
      case 'saveToNoosphere':
        await handleSaveToNoosphere(tab);
        break;
      case 'extractEntities':
        await handleExtractEntities(info, tab);
        break;
      case 'extractPage':
        await handleQuickExtract(tab);
        break;
    }
  } catch (e) {
    console.error('[Noosphere] Context menu error:', e);
    showNotification('Error', e.message);
  }
});

// Save to Noosphere
async function handleSaveToNoosphere(tab) {
  isProcessing = true;
  updateBadge(tab.id, '...');
  
  try {
    // Check storage limit
    const limit = await getStorageLimit();
    const currentCount = await getStoredCount();
    
    if (currentCount >= limit) {
      showNotification('Storage Full', `Maximum ${limit} pages. Delete some to save new ones.`);
      updateBadge(tab.id, '✗');
      return;
    }
    
    // Extract from page
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
    
    if (response.success) {
      await saveToIndexedDB(response.data);
      showNotification('Saved!', `"${response.data.title.substring(0, 50)}" saved`);
      updateBadge(tab.id, '✓');
      
      // Broadcast to popup
      chrome.runtime.sendMessage({ action: 'extractionComplete' });
    } else {
      updateBadge(tab.id, '✗');
      showNotification('Error', response.error || 'Could not extract');
    }
  } catch (e) {
    updateBadge(tab.id, '✗');
    showNotification('Error', 'Cannot access this page');
  }
  
  isProcessing = false;
}

// Quick extract without saving
async function handleQuickExtract(tab) {
  updateBadge(tab.id, '...');
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
    
    if (response.success) {
      updateBadge(tab.id, '✓');
      
      // Send to popup
      chrome.runtime.sendMessage({
        action: 'quickExtract',
        data: response.data
      });
    } else {
      updateBadge(tab.id, '✗');
    }
  } catch (e) {
    updateBadge(tab.id, '✗');
  }
}

// Extract entities from selection
async function handleExtractEntities(info, tab) {
  if (!info.selectionText) return;
  
  showNotification('Extracting Entities', `Analyzing "${info.selectionText.substring(0, 30)}..."`);
  
  // Simple entity extraction on selected text
  const entities = extractSimpleEntities(info.selectionText);
  
  // Save entities to separate store
  await saveEntities(entities, tab.url);
  
  showNotification('Done!', `Found ${entities.length} entities`);
}

// Simple entity extraction for selected text
function extractSimpleEntities(text) {
  const entities = [];
  
  // URLs
  const urlRegex = /https?:\/\/[^\s]+/g;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    entities.push({ type: 'URL', text: match[0] });
  }
  
  // Dates
  const dateRegex = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/g;
  while ((match = dateRegex.exec(text)) !== null) {
    entities.push({ type: 'DATE', text: match[0] });
  }
  
  // Capitalized phrases
  const capRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  while ((match = capRegex.exec(text)) !== null) {
    entities.push({ type: 'PERSON_ORG', text: match[0] });
  }
  
  // Numbers with units
  const numRegex = /\$[\d,.]+|\d+%|[\d,.]+\s*(USD|EUR|BTC|ETH|km|mi|kg|lb)/gi;
  while ((match = numRegex.exec(text)) !== null) {
    entities.push({ type: 'QUANTITY', text: match[0] });
  }
  
  return entities;
}

// IndexedDB operations
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NoosphereDB', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pages')) {
        db.createObjectStore('pages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('entities')) {
        const entityStore = db.createObjectStore('entities', { keyPath: 'id', autoIncrement: true });
        entityStore.createIndex('url', 'sourceUrl');
      }
      if (!db.objectStoreNames.contains('graph')) {
        db.createObjectStore('graph', { keyPath: 'id' });
      }
    };
  });
}

async function saveToIndexedDB(data) {
  const db = await openDB();
  const tx = db.transaction('pages', 'readwrite');
  const store = tx.objectStore('pages');
  
  await new Promise((resolve, reject) => {
    const request = store.put({
      id: data.url,
      url: data.url,
      title: data.title,
      content: data.content,
      text: data.text,
      entities: data.entities,
      relations: data.relations,
      metadata: data.metadata,
      savedAt: new Date().toISOString()
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  // Also save individual entities for graph
  if (data.entities && data.entities.length > 0) {
    await saveEntities(data.entities, data.url);
  }
}

async function saveEntities(entities, sourceUrl) {
  const db = await openDB();
  const tx = db.transaction('entities', 'readwrite');
  const store = tx.objectStore('entities');
  
  for (const entity of entities) {
    await new Promise((resolve, reject) => {
      const request = store.put({
        ...entity,
        sourceUrl,
        createdAt: new Date().toISOString()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

async function getStoredCount() {
  try {
    const db = await openDB();
    const tx = db.transaction('pages', 'readonly');
    const store = tx.objectStore('pages');
    
    return await new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return 0;
  }
}

async function getStorageLimit() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve(result.settings?.maxStorage || 100);
    });
  });
}

// Update badge
function updateBadge(tabId, text) {
  chrome.storage.local.get(['settings'], (result) => {
    if (result.settings?.badgeEnabled !== false) {
      chrome.action.setBadgeText({ text, tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
    }
  });
}

// Show notification
function showNotification(title, message) {
  chrome.storage.local.get(['settings'], (result) => {
    if (result.settings?.showNotifications !== false) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `🔮 ${title}`,
        message
      });
    }
  });
}

// Badge on tab change
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const response = await chrome.tabs.sendMessage(activeInfo.tabId, { action: 'ping' });
    if (response?.status === 'ok') {
      updateBadge(activeInfo.tabId, '✓');
    } else {
      updateBadge(activeInfo.tabId, '');
    }
  } catch {
    updateBadge(activeInfo.tabId, '');
  }
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    getStoredCount().then(count => {
      sendResponse({ count });
    });
    return true;
  }
  
  if (request.action === 'queryEntities') {
    queryEntities(request.query).then(results => {
      sendResponse({ results });
    });
    return true;
  }
});

// Query entities
async function queryEntities(query) {
  const db = await openDB();
  const tx = db.transaction('entities', 'readonly');
  const store = tx.objectStore('entities');
  const index = store.index('url');
  
  const results = [];
  
  return new Promise((resolve) => {
    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const entity = cursor.value;
        if (entity.text.toLowerCase().includes(query.toLowerCase())) {
          results.push(entity);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => resolve([]);
  });
}

console.log('[Noosphere] Background service worker loaded');
