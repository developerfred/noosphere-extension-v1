# Noosphere Extension - AI Agent Discovery

## For AI Agents

This extension is **AI-agent friendly**. It exposes:

### Capabilities
- Extract structured data from any webpage
- Entity extraction (persons, organizations, URLs, dates, quantities)
- Relation detection
- Local knowledge graph storage
- IndexedDB persistence
- Import/export functionality

### Usage by AI Agents

```javascript
// Content script extraction
const response = await chrome.tabs.sendMessage(tabId, { action: 'extract' });
if (response.success) {
  console.log('Entities:', response.data.entities);
  console.log('Relations:', response.data.relations);
  console.log('Content:', response.data.content);
}
```

### Storage API

```javascript
// Background storage
chrome.runtime.sendMessage({ action: 'getStats' });
chrome.runtime.sendMessage({ action: 'queryEntities', query: 'search term' });
```

### Keyboard Shortcut
- `Ctrl+Shift+E` (Mac: `Cmd+Shift+E`) - Extract current page

### Context Menu
- Right-click → "Save to Noosphere" - Extract and save page
- Right-click → "Extract All Entities" - Extract entities from selection
- Right-click → "Quick Extract" - Extract without saving

### Manifest
- Version: 0.2.0
- Permissions: activeTab, storage, contextMenus, notifications, tabs
- Host permissions: `<all_urls>`

## For Developers

```bash
# Build
npm install

# Load in Chrome
1. Go to chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked"
4. Select this directory

# Generate icons
cd icons && node create_icons.js
```

## Features
- [x] Entity extraction (PERSON, ORG, LOCATION, URL, DATE, QUANTITY)
- [x] Relation detection
- [x] Markdown export
- [x] JSON export
- [x] IndexedDB storage
- [x] Import/Export
- [x] Keyboard shortcuts
- [x] Context menus
- [x] Multiple tabs (Extract, Entities, Relations, Saved)
- [x] Storage limit management
