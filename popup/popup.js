/**
 * Noosphere Popup Script
 */

// DOM elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const pageInfo = document.getElementById('pageInfo');
const extractBtn = document.getElementById('extractBtn');
const saveBtn = document.getElementById('saveBtn');
const copyBtn = document.getElementById('copyBtn');
const searchBtn = document.getElementById('searchBtn');
const previewSection = document.getElementById('previewSection');
const previewTitle = document.getElementById('previewTitle');
const previewContent = document.getElementById('previewContent');
const wordCount = document.getElementById('wordCount');
const entityCount = document.getElementById('entityCount');
const relCount = document.getElementById('relCount');
const openDashboard = document.getElementById('openDashboard');
const nodeCount = document.getElementById('nodeCount');

let currentData = null;

// Set status
function setStatus(status, text) {
  statusDot.className = 'status-dot ' + status;
  statusText.textContent = text;
}

// Update UI with extracted data
function updateUI(data) {
  currentData = data;
  
  pageInfo.textContent = data.url;
  pageInfo.title = data.url;
  
  previewTitle.textContent = data.title;
  previewContent.textContent = data.content?.substring(0, 300) + '...';
  
  wordCount.textContent = data.metadata?.wordCount || 0;
  entityCount.textContent = data.entities?.length || 0;
  relCount.textContent = data.relations?.length || 0;
  
  previewSection.classList.remove('hidden');
  saveBtn.disabled = false;
  copyBtn.disabled = false;
}

// Extract current tab
async function extractCurrentTab() {
  setStatus('loading', 'Extracting...');
  extractBtn.disabled = true;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
    
    if (response.success) {
      updateUI(response.data);
      setStatus('', 'Extracted!');
      
      // Auto-save to storage
      await saveToStorage(response.data);
    } else {
      setStatus('error', 'Error: ' + response.error);
    }
  } catch (error) {
    setStatus('error', 'Cannot extract this page');
    console.error(error);
  }
  
  extractBtn.disabled = false;
}

// Save to IndexedDB
async function saveToStorage(data) {
  const db = await openDB();
  const tx = db.transaction('pages', 'readwrite');
  const store = tx.objectStore('pages');
  
  await store.put({
    id: data.url,
    ...data,
    savedAt: new Date().toISOString()
  });
  
  updateNodeCount();
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NoosphereDB', 1);
    
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
    };
  });
}

// Update node count
async function updateNodeCount() {
  try {
    const db = await openDB();
    const tx = db.transaction('pages', 'readonly');
    const store = tx.objectStore('pages');
    const count = await new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    nodeCount.textContent = `${count} nodes`;
  } catch (e) {
    nodeCount.textContent = '0 nodes';
  }
}

// Copy as markdown
async function copyAsMarkdown() {
  if (!currentData) return;
  
  const markdown = `# ${currentData.title}\n\n**URL:** ${currentData.url}\n**Saved:** ${new Date().toISOString()}\n\n---\n\n${currentData.content}`;
  
  await navigator.clipboard.writeText(markdown);
  
  const original = copyBtn.innerHTML;
  copyBtn.innerHTML = '<span class="btn-icon">✅</span> Copied!';
  setTimeout(() => { copyBtn.innerHTML = original; }, 2000);
}

// Open knowledge base
function openKnowledgeBase() {
  chrome.runtime.openOptionsPage();
}

// Event listeners
extractBtn.addEventListener('click', extractCurrentTab);
copyBtn.addEventListener('click', copyAsMarkdown);
searchBtn.addEventListener('click', openKnowledgeBase);
openDashboard.addEventListener('click', (e) => {
  e.preventDefault();
  openKnowledgeBase();
});

// Init
updateNodeCount();
setStatus('', 'Ready');

// Keyboard shortcut: Ctrl+Shift+N
chrome.commands.onCommand.addListener((command) => {
  if (command === 'extract-current-tab') {
    extractCurrentTab();
  }
});
