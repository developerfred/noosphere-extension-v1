# 🔮 Noosphere Reader

> Chrome/Firefox extension that transforms any webpage into structured knowledge.

## What is Noosphere Reader?

Noosphere Reader captures the content you browse and transforms it into **semantic data**. It's the bridge between the visual web and the knowledge graph.

Every page you read becomes part of your **personal knowledge graph**.

## Features

### 🌐 Smart Reader
One-click transforms any page into **clean Markdown**:
- Removes ads, trackers, noise
- Preserves semantic structure
- Extracts tables and lists

### 🧠 Knowledge Extraction
Automatically extracts **entities and relations**:
- People, places, organizations
- Dates and events
- Facts and claims
- Citations and references

### 📊 Local Graph
Your reading history becomes a **queryable graph**:
- "What did I read about AI this week?"
- "Show me all companies mentioned in my saved pages"
- "Find pages similar to this one"

### 🔍 Natural Language Search
Search across everything you've read:
- Not just keywords — **semantic meaning**
- "papers about transformers" finds NLP transformer papers
- Filter by date, source, topic

### 🔗 Noosphere Network
- Share knowledge with the global Noosphere network
- Discover what others found important
- Collaborative learning

## Installation

### Chrome (Stable)
1. Go to [Chrome Web Store](#) (coming soon)
2. Click "Add to Chrome"
3. Grant permissions

### Firefox
1. Go to [Firefox Add-ons](#) (coming soon)
2. Click "Add to Firefox"
3. Grant permissions

### Developer Mode (Manual)
```bash
# Clone the repo
git clone https://github.com/noosphere/noosphere-extension.git
cd noosphere-extension

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension/ folder
```

## Usage

### Basic
1. Browse any website
2. Click the 🔮 icon in toolbar
3. Page transforms to Markdown
4. Knowledge extracted automatically

### Advanced
- **Ctrl+Shift+N** — Quick snapshot current tab
- **Right-click → Save to Noosphere** — Bookmark with context
- **Popup search** — Search your knowledge graph

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                          │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │   POPUP UI    │   │   CONTENT    │   │  BACKGROUND  │   │
│  │   (React)     │◀──│   SCRIPT     │──▶│    SERVICE   │   │
│  └──────────────┘   └──────────────┘   └───────┬──────┘   │
│                                                │             │
│                         ┌─────────────────────┘             │
│                         ▼                                   │
│                 ┌────────────────┐                          │
│                 │   NOOSPHERE   │                          │
│                 │     NODE       │                          │
│                 │   (embedded)   │                          │
│                 └────────────────┘                          │
│                                                              │
│  📦 IndexedDB  📊 SQLite  🧠 Semantic Cache                  │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **React 18** — Lightweight UI
- **TypeScript** — Type safety
- **WebAssembly** — Fast HTML parsing
- **IndexedDB** — Local storage
- **Comlink** — Background script communication

## Freemium Model

| Feature | Free | Pro ($5/mo) | Team ($20/mo) |
|---------|------|-------------|---------------|
| Pages/month | 100 | Unlimited | Unlimited |
| Nodes | 1 | 10 | Unlimited |
| Search history | 30 days | Forever | Forever |
| API access | ❌ | ✅ | ✅ |
| Team sharing | ❌ | ❌ | ✅ |
| Priority sync | ❌ | ❌ | ✅ |

## Roadmap

- [ ] **v0.1** — Basic Markdown conversion
- [ ] **v0.2** — Entity extraction (people, places)
- [ ] **v0.3** — Local knowledge graph
- [ ] **v0.4** — Noosphere P2P network
- [ ] **v1.0** — Semantic search + recommendations

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -am 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

Apache 2.0 — see [LICENSE](LICENSE)

---

**Your browsing history is your knowledge. Own it.**
