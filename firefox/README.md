# Noosphere Reader for Firefox

Firefox version of the Noosphere extension.

## Installation (Developer)

1. Clone the repository
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select `firefox/manifest.json`

## Or Package for Distribution

```bash
cd firefox
zip -r noosphere-extension.xpi *
```

Then submit to [Firefox Add-ons](https://addons.mozilla.org)

## Differences from Chrome

- Uses `browser.contextMenus` (same API)
- Background uses `scripts: []` instead of `service_worker:`
- Firefox 109+ required (Manifest V3 support)

## Permissions

Same as Chrome version:
- `activeTab` - Access current tab
- `storage` - Local storage
- `contextMenus` - Right-click menu
- `<all_urls>` - Access all websites
