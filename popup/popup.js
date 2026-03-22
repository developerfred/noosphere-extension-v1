/**
 * Noosphere Popup Script v0.2.0
 * Enhanced for AI agent workflows
 */

// State
let currentData = null;
let allSavedPages = [];

// DOM Elements
const elements = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  pageInfo: document.getElementById('pageInfo'),
  extractBtn: document.getElementById('extractBtn'),
  copyMdBtn: document.getElementById('copyMdBtn'),
  copyJsonBtn: document.getElementById('copyJsonBtn'),
  saveBtn: document.getElementById('saveBtn'),
  shareBtn: document.getElementById('shareBtn'),
  previewSection: document.getElementById('previewSection'),
  previewTitle: document.getElementById('previewTitle'),
  previewContent: document.getElementById('previewContent'),
  wordCount: document.getElementById('wordCount'),
  entityCount: document.getElementById('entityCount'),
  relCount: document.getElementById('relCount'),
  linkCount: document.getElementById('linkCount'),
  entityList: document.getElementById('entityList'),
  entityListSection: document.getElementById('entityListSection'),
  relationList: document.getElementById('relationList'),
  relationListSection: document.getElementById('relationListSection'),
  savedList: document.getElementById('savedList'),
  savedCount: document.getElementById('savedCount'),
  nodeCount: document.getElementById('nodeCount'),
  sizeCount: document.getElementById('sizeCount'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  clearBtn: document.getElementById('clearBtn'),
};

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    
    if (tab.dataset.tab === 'saved') {
      loadSavedPages();
    }
  });
});

// Set status
function setStatus(status, text) {
  elements.statusDot.className = 'status-dot' + (status ? ' ' + status : '');
  elements.statusText.textContent = text;
}

// Update stats display
function updateStats(data) {
  elements.wordCount.textContent = formatNumber(data.metadata?.wordCount || 0);
  elements.entityCount.textContent = formatNumber(data.entities?.length || 0);
  elements.relCount.textContent = formatNumber(data.relations?.length || 0);
  elements.linkCount.textContent = formatNumber(data.metadata?.linksCount || 0);
}

// Format number
function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// Update UI with extracted data
function updateUI(data) {
  currentData = data;
  
  elements.pageInfo.textContent = data.url;
  elements.pageInfo.title = data.url;
  
  elements.previewTitle.textContent = data.title;
  elements.previewContent.textContent = data.content?.substring(0, 200) + '...';
  
  updateStats(data);
  
  // Enable buttons
  elements.copyMdBtn.disabled = false;
  elements.copyJsonBtn.disabled = false;
  elements.saveBtn.disabled = false;
  elements.shareBtn.disabled = false;
  
  // Update entities tab
  updateEntityList(data.entities || []);
  
  // Update relations tab
  updateRelationList(data.relations || []);
}

// Update entity list
function updateEntityList(entities) {
  if (entities.length === 0) {
    elements.entityList.classList.add('hidden');
    elements.entityListSection.classList.remove('hidden');
    elements.entityListSection.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">No entities found</p>';
    return;
  }
  
  elements.entityListSection.classList.add('hidden');
  elements.entityList.classList.remove('hidden');
  
  // Group by type
  const grouped = {};
  entities.forEach(e => {
    if (!grouped[e.type]) grouped[e.type] = [];
    grouped[e.type].push(e);
  });
  
  // Sort by count
  const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  
  let html = '';
  for (const [type, items] of sorted.slice(0, 5)) {
    items.slice(0, 10).forEach(entity => {
      const typeClass = entity.type.toLowerCase().replace(/_/g, '-');
      html += `
        <div class="entity-item">
          <span class="entity-type ${typeClass}">${entity.type}</span>
          <span class="entity-text" title="${escapeHtml(entity.text)}">${escapeHtml(entity.text)}</span>
          ${entity.count > 1 ? `<span class="entity-count">×${entity.count}</span>` : ''}
        </div>
      `;
    });
  }
  
  if (entities.length > 50) {
    html += `<p style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 8px;">+${entities.length - 50} more entities</p>`;
  }
  
  elements.entityList.innerHTML = html;
}

// Update relation list
function updateRelationList(relations) {
  if (relations.length === 0) {
    elements.relationList.classList.add('hidden');
    elements.relationListSection.classList.remove('hidden');
    elements.relationListSection.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">No relations found</p>';
    return;
  }
  
  elements.relationListSection.classList.add('hidden');
  elements.relationList.classList.remove('hidden');
  
  let html = '';
  relations.slice(0, 20).forEach(rel => {
    html += `
      <div class="relation-item">
        <span class="relation-from">${escapeHtml(rel.from?.substring(0, 30) || '-')}</span>
        <span class="relation-type">${rel.type || 'relates_to'}</span>
        <span class="relation-to">${escapeHtml(rel.to?.substring(0, 30) || '-')}</span>
      </div>
    `;
  });
  
  if (relations.length > 20) {
    html += `<p style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 8px;">+${relations.length - 20} more relations</p>`;
  }
  
  elements.relationList.innerHTML = html;
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Extract current tab
async function extractCurrentTab() {
  setStatus('loading', 'Extracting...');
  elements.extractBtn.disabled = true;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
    
    if (response.success) {
      updateUI(response.data);
      setStatus('', 'Extracted!');
      
      // Auto-save
      await saveToStorage(response.data);
    } else {
      setStatus('error', 'Error: ' + (response.error || 'Unknown'));
    }
  } catch (error) {
    setStatus('error', 'Cannot extract this page');
    console.error(error);
  }
  
  elements.extractBtn.disabled = false;
}

// Copy as Markdown
async function copyAsMarkdown() {
  if (!currentData) return;
  
  const markdown = `# ${currentData.title}\n\n` +
    `**URL:** ${currentData.url}\n` +
    `**Saved:** ${new Date().toISOString()}\n` +
    `**Words:** ${currentData.metadata?.wordCount || 0}\n` +
    `**Entities:** ${currentData.entities?.length || 0}\n\n` +
    `---\n\n${currentData.content}`;
  
  await navigator.clipboard.writeText(markdown);
  showCopiedFeedback('copyMdBtn', '📋');
}

// Copy as JSON
async function copyAsJSON() {
  if (!currentData) return;
  
  const json = JSON.stringify(currentData, null, 2);
  await navigator.clipboard.writeText(json);
  showCopiedFeedback('copyJsonBtn', '{ }');
}

// Show copied feedback
function showCopiedFeedback(btnId, text) {
  const btn = document.getElementById(btnId);
  const original = btn.innerHTML;
  btn.innerHTML = `<span class="quick-btn-icon">✅</span> Done!`;
  setTimeout(() => { btn.innerHTML = original; }, 1500);
}

// Share via Web Share API
async function shareData() {
  if (!currentData) return;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: currentData.title,
        text: `${currentData.entities?.length || 0} entities extracted`,
        url: currentData.url
      });
    } catch (e) {
      if (e.name !== 'AbortError') {
        copyAsMarkdown();
      }
    }
  } else {
    copyAsMarkdown();
  }
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
        db.createObjectStore('entities', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('graph')) {
        db.createObjectStore('graph', { keyPath: 'id' });
      }
    };
  });
}

async function saveToStorage(data) {
  const db = await openDB();
  const tx = db.transaction('pages', 'readwrite');
  const store = tx.objectStore('pages');
  
  const pageData = {
    id: data.url,
    url: data.url,
    title: data.title,
    content: data.content,
    text: data.text,
    entities: data.entities,
    relations: data.relations,
    metadata: data.metadata,
    savedAt: new Date().toISOString()
  };
  
  await store.put(pageData);
  updateStats();
  loadSavedPages();
}

async function loadSavedPages() {
  try {
    const db = await openDB();
    const tx = db.transaction('pages', 'readonly');
    const store = tx.objectStore('pages');
    
    const pages = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    allSavedPages = pages;
    updateSavedList(pages);
    updateStats();
  } catch (e) {
    console.error('Error loading pages:', e);
  }
}

function updateSavedList(pages) {
  elements.savedCount.textContent = `${pages.length} saved pages`;
  elements.nodeCount.textContent = `${pages.length} nodes`;
  
  if (pages.length === 0) {
    elements.savedList.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary);">No saved pages yet</p>';
    return;
  }
  
  // Sort by date
  pages.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  
  let html = '';
  pages.slice(0, 20).forEach(page => {
    const date = new Date(page.savedAt).toLocaleDateString();
    const entityCount = page.entities?.length || 0;
    html += `
      <div class="saved-item" data-url="${escapeHtml(page.url)}">
        <span class="saved-icon">📄</span>
        <div class="saved-info">
          <div class="saved-title">${escapeHtml(page.title || page.url)}</div>
          <div class="saved-meta">${entityCount} entities · ${date}</div>
        </div>
      </div>
    `;
  });
  
  if (pages.length > 20) {
    html += `<p style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 8px;">+${pages.length - 20} more pages</p>`;
  }
  
  elements.savedList.innerHTML = html;
  
  // Add click handlers
  elements.savedList.querySelectorAll('.saved-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      const page = pages.find(p => p.url === url);
      if (page) {
        currentData = page;
        updateUI(page);
        // Switch to extract tab
        document.querySelector('.tab[data-tab="extract"]').click();
      }
    });
  });
}

function updateStats() {
  // Calculate total size
  const totalSize = allSavedPages.reduce((sum, p) => {
    return sum + (JSON.stringify(p).length || 0);
  }, 0);
  
  const sizeKB = (totalSize / 1024).toFixed(1);
  elements.sizeCount.textContent = totalSize > 1024 * 1024 
    ? `${(totalSize / 1024 / 1024).toFixed(1)} MB` 
    : `${sizeKB} KB`;
  
  elements.nodeCount.textContent = `${allSavedPages.length} nodes`;
}

// Export all
async function exportAll() {
  if (allSavedPages.length === 0) return;
  
  const exportData = {
    version: '0.2.0',
    exportedAt: new Date().toISOString(),
    pages: allSavedPages
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `noosphere-export-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Import
async function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.pages && Array.isArray(data.pages)) {
        const db = await openDB();
        const tx = db.transaction('pages', 'readwrite');
        const store = tx.objectStore('pages');
        
        for (const page of data.pages) {
          if (page.id) await store.put(page);
        }
        
        await loadSavedPages();
        setStatus('', `Imported ${data.pages.length} pages!`);
      }
    } catch (e) {
      setStatus('error', 'Import failed: Invalid file');
    }
  };
  
  input.click();
}

// Clear all
async function clearAll() {
  if (!confirm('Delete all saved pages? This cannot be undone.')) return;
  
  const db = await openDB();
  const tx = db.transaction('pages', 'readwrite');
  const store = tx.objectStore('pages');
  await store.clear();
  
  allSavedPages = [];
  updateSavedList([]);
  updateStats();
  setStatus('', 'All pages deleted');
}

// Event listeners
elements.extractBtn.addEventListener('click', extractCurrentTab);
elements.copyMdBtn.addEventListener('click', copyAsMarkdown);
elements.copyJsonBtn.addEventListener('click', copyAsJSON);
elements.shareBtn.addEventListener('click', shareData);
elements.exportBtn.addEventListener('click', exportAll);
elements.importBtn.addEventListener('click', importData);
elements.clearBtn.addEventListener('click', clearAll);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    extractCurrentTab();
  }
});

// Init
loadSavedPages();
setStatus('', 'Ready to extract');

// Listen for extraction from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractionComplete') {
    loadSavedPages();
  }
});
