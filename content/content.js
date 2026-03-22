/**
 * Noosphere Content Script
 * Extracts semantic content from pages
 * SECURITY: Sanitizes all extracted data
 */

// SECURITY: Blocked URL schemes for extraction
const BLOCKED_URL_SCHEMES = ['javascript:', 'data:', 'blob:', 'file:'];

// SECURITY: Sanitize URL - prevent XSS via URL
function sanitizeUrl(url) {
  if (!url) return '';
  
  try {
    const parsed = new URL(url, window.location.origin);
    
    // Block dangerous schemes
    if (BLOCKED_URL_SCHEMES.includes(parsed.protocol)) {
      return '';
    }
    
    // Remove javascript: URLs
    if (parsed.href.toLowerCase().includes('javascript:')) {
      return '';
    }
    
    return parsed.href;
  } catch (e) {
    return '';
  }
}

// SECURITY: Sanitize text - prevent XSS
function sanitizeText(text) {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .substring(0, 100000); // Limit length
}

// Extract main content from page
function extractContent() {
  const result = {
    url: sanitizeUrl(window.location.href),
    title: sanitizeText(document.title),
    timestamp: new Date().toISOString(),
    content: null,
    text: null,
    entities: [],
    relations: [],
    metadata: {}
  };

  // Clone body and clean
  const body = document.body.cloneNode(true);
  
  // Remove unwanted and dangerous elements
  const unwanted = body.querySelectorAll(
    'script, style, nav, footer, header, aside, .ads, .sidebar, .menu, .nav, iframe, noscript, object, embed, form, input, button, select, textarea'
  );
  unwanted.forEach(el => el.remove());

  // Try to find main content
  const mainSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.post', '.article'];
  let mainContent = null;
  
  for (const selector of mainSelectors) {
    mainContent = body.querySelector(selector);
    if (mainContent) break;
  }
  
  if (!mainContent) {
    mainContent = body;
  }

  // Get clean text (textContent is safer than innerText)
  result.text = sanitizeText(mainContent.textContent || mainContent.innerText);
  
  // Get markdown-like content (sanitized)
  result.content = extractMarkdown(mainContent);

  // Extract entities (already sanitized)
  result.entities = extractEntities(result.text);

  // Extract relations
  result.relations = extractRelations(result.entities, result.text);

  // Metadata
  result.metadata = {
    lang: sanitizeText(document.documentElement.lang || 'en'),
    wordCount: result.text.split(/\s+/).length,
    linksCount: body.querySelectorAll('a').length,
    imagesCount: body.querySelectorAll('img').length
  };

  return result;
}

// Extract markdown-like content (sanitized)
function extractMarkdown(element) {
  const lines = [];
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = sanitizeText(node.textContent).trim();
      if (text) lines.push(text);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      
      switch (tag) {
        case 'h1': lines.push(`\n# ${sanitizeText(node.textContent)}\n`); break;
        case 'h2': lines.push(`\n## ${sanitizeText(node.textContent)}\n`); break;
        case 'h3': lines.push(`\n### ${sanitizeText(node.textContent)}\n`); break;
        case 'h4': lines.push(`\n#### ${sanitizeText(node.textContent)}\n`); break;
        case 'p': lines.push(`\n${sanitizeText(node.textContent)}\n`); break;
        case 'li': lines.push(`- ${sanitizeText(node.textContent)}`); break;
        case 'blockquote': lines.push(`\n> ${sanitizeText(node.textContent)}\n`); break;
        case 'code': lines.push(`\`${sanitizeText(node.textContent)}\``); break;
        case 'pre': lines.push(`\n\`\`\`\n${sanitizeText(node.textContent)}\n\`\`\`\n`); break;
        case 'table': lines.push(extractTable(node)); break;
        case 'a': 
          // SECURITY: Sanitize link
          lines.push(`[${sanitizeText(node.textContent)}](${sanitizeUrl(node.href)})`); 
          break;
        case 'img': 
          // SECURITY: Sanitize image src
          lines.push(`![${sanitizeText(node.alt || '')}](${sanitizeUrl(node.src)})`); 
          break;
        case 'br': lines.push('\n'); break;
        case 'div': case 'span': case 'section': case 'article':
          node.childNodes.forEach(processNode);
          break;
        default:
          node.childNodes.forEach(processNode);
      }
    }
  }
  
  element.childNodes.forEach(processNode);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim().substring(0, 500000);
}

// Extract table as markdown (sanitized)
function extractTable(table) {
  const rows = table.querySelectorAll('tr');
  if (!rows.length) return '';
  
  const lines = [];
  rows.forEach((row, i) => {
    const cells = row.querySelectorAll('th, td');
    const rowText = Array.from(cells).map(c => sanitizeText(c.textContent).trim()).join(' | ');
    
    if (i === 0) {
      lines.push(rowText);
      lines.push(cells.map(() => '---').join(' | '));
    } else {
      lines.push(rowText);
    }
  });
  
  return '\n' + lines.join('\n') + '\n';
}

// Extract named entities (simple regex-based, text already sanitized)
function extractEntities(text) {
  const entities = [];
  
  // Capitalized phrases (simple NER)
  const capitalPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  let match;
  while ((match = capitalPattern.exec(text)) !== null) {
    const text_val = sanitizeText(match[1]).substring(0, 200);
    if (text_val.length > 1) {
      entities.push({
        type: 'PERSON_OR_ORG',
        text: text_val,
        count: (text.match(new RegExp(match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      });
    }
  }
  
  // URLs (already sanitized)
  const urlPattern = /https?:\/\/[^\s]+/g;
  while ((match = urlPattern.exec(text)) !== null) {
    const url_val = sanitizeUrl(match[0]);
    if (url_val) {
      entities.push({
        type: 'URL',
        text: url_val.substring(0, 500),
        count: 1
      });
    }
  }
  
  // Dates
  const datePattern = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})\b/g;
  while ((match = datePattern.exec(text)) !== null) {
    entities.push({
      type: 'DATE',
      text: sanitizeText(match[0]).substring(0, 50),
      count: 1
    });
  }
  
  // Numbers with units (money, percentages)
  const numberPattern = /\$[\d,.]+|\d+%|[\d,.]+\s*(USD|EUR|BTC|ETH)/gi;
  while ((match = numberPattern.exec(text)) !== null) {
    entities.push({
      type: 'QUANTITY',
      text: sanitizeText(match[0]).substring(0, 50),
      count: 1
    });
  }
  
  // Dedupe by text
  const seen = new Set();
  return entities.filter(e => {
    if (seen.has(e.text)) return false;
    seen.add(e.text);
    return true;
  }).slice(0, 1000); // Limit entities
}

// Extract relations between entities
function extractRelations(entities, text) {
  const relations = [];
  
  entities.forEach(entity => {
    // Find co-occurrences
    const safePattern = entity.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (safePattern.length < 3) return;
    
    const contextPattern = new RegExp(`.{50}${safePattern}.{50}`, 'gi');
    const matches = text.match(contextPattern) || [];
    
    if (matches.length > 1) {
      relations.push({
        type: 'CO_OCCURS_WITH',
        from: sanitizeText(entity.text).substring(0, 200),
        to: 'multiple_sources',
        confidence: Math.min(matches.length / 5, 1)
      });
    }
  });
  
  return relations.slice(0, 500); // Limit relations
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // SECURITY: Validate request
  if (!request || typeof request.action !== 'string') {
    sendResponse({ success: false, error: 'Invalid request' });
    return true;
  }
  
  if (request.action === 'extract') {
    try {
      const data = extractContent();
      sendResponse({ success: true, data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  
  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
  }
  
  return true;
});

// Signal ready
console.log('[Noosphere] Content script loaded');
