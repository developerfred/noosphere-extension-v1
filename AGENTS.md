# AGENTS.md — Noosphere Extension

> Documentation for AI agents to discover and use the Noosphere Chrome/Firefox extension.

## What is Noosphere Extension?

**Noosphere Extension** transforms any webpage into structured knowledge directly from your browser.

- One-click transforms pages to Markdown
- Extracts entities automatically
- Stores locally in IndexedDB
- Works offline

## For AI Agents

### Installation

```bash
# Clone the repo
git clone https://github.com/developerfred/noosphere-extension-v1.git

# Load in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension/ folder
```

### Usage (for agents)

The extension runs in the browser. Agents can:

1. Click the 🔮 icon to extract current page
2. Access extracted data via browser storage
3. Use content scripts to parse pages programmatically

### Content Script API

From any webpage, call:

```javascript
// Extract page content
chrome.runtime.sendMessage({ action: 'extract' }, response => {
  if (response.success) {
    console.log(response.data);
    // {
    //   url: "https://...",
    //   title: "Page Title",
    //   content: "# Markdown content...",
    //   entities: [...],
    //   relations: [...]
    // }
  }
});
```

### Storage

Extracted pages are stored in IndexedDB:

```javascript
// Database: NoosphereDB
// Store: pages
// Key: URL
// Value: { url, title, content, entities, relations, savedAt }
```

### Output Format

```json
{
  "url": "https://en.wikipedia.org/wiki/Albert_Einstein",
  "title": "Albert Einstein - Wikipedia",
  "content": "# Albert Einstein\n\nAlbert Einstein was...",
  "entities": [
    {"type": "PERSON", "text": "Albert Einstein", "count": 10},
    {"type": "LOCATION", "text": "Ulm", "count": 2}
  ],
  "relations": [
    {"type": "born_in", "from": "Albert Einstein", "to": "Ulm", "confidence": 0.95}
  ],
  "metadata": {
    "wordCount": 5420,
    "lang": "en",
    "linksCount": 142
  }
}
```

## For RAG Systems

Use the extension to:

1. **Batch extract** - Browse pages, extension captures all
2. **Local storage** - All data stays in browser IndexedDB
3. **Export** - Copy as Markdown or JSON

## Platform Support

- Chrome 88+ (Manifest V3)
- Firefox (WebExtensions API)
- Edge (Chromium-based)

## License

Apache 2.0
