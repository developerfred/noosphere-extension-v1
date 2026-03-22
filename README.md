# 🔮 Noosphere Extension

Chrome/Firefox extension that transforms any webpage into structured knowledge.

## Features

- 🌐 **Smart Reader** - One-click transforms pages to clean Markdown
- 🧠 **Knowledge Extraction** - Extracts entities and relations automatically
- 📊 **Local Graph** - Your reading history becomes a queryable knowledge graph
- 🔍 **Semantic Search** - Search across everything you've read
- 🔗 **Noosphere Network** - Share knowledge with the global network

## Installation

### Chrome (Coming Soon)
Install from Chrome Web Store

### Firefox (Coming Soon)
Install from Firefox Add-ons

### Manual (Developer)
```bash
# Clone repo
git clone https://codeberg.org/codingsh/noosphere-extension.git
cd noosphere-extension

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select this folder
```

## Quick Start

1. Install the extension
2. Browse any website
3. Click the 🔮 icon
4. Page is extracted as Markdown + knowledge graph

## Architecture

```
Extension (Manifest V3)
├── Content Script - Extracts semantic content
├── Popup UI - User interaction
├── Background - Service worker
└── IndexedDB - Local storage
```

## Tech Stack

- Vanilla JS (no build required for MVP)
- Manifest V3
- IndexedDB for storage
- Chrome/Firefox WebExtensions API

## License

Apache 2.0
