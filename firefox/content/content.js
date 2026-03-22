/**
 * Noosphere Content Script
 * Extracts semantic content from pages
 */

// Extract main content from page
function extractContent() {
  const result = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    content: null,
    text: null,
    entities: [],
    relations: [],
    metadata: {}
  };

  // Clone body and clean
  const body = document.body.cloneNode(true);
  
  // Remove unwanted elements
  const unwanted = body.querySelectorAll(
    'script, style, nav, footer, header, aside, .ads, .sidebar, .menu, .nav, iframe, noscript'
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

  // Get clean text
  result.text = mainContent.innerText || mainContent.textContent;
  
  // Get markdown-like content
  result.content = extractMarkdown(mainContent);

  // Extract entities
  result.entities = extractEntities(result.text);

  // Extract relations
  result.relations = extractRelations(result.entities, result.text);

  // Metadata
  result.metadata = {
    lang: document.documentElement.lang || 'en',
    wordCount: result.text.split(/\s+/).length,
    linksCount: body.querySelectorAll('a').length,
    imagesCount: body.querySelectorAll('img').length
  };

  return result;
}

// Extract markdown-like content
function extractMarkdown(element) {
  const lines = [];
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) lines.push(text);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      
      switch (tag) {
        case 'h1': lines.push(`\n# ${node.innerText}\n`); break;
        case 'h2': lines.push(`\n## ${node.innerText}\n`); break;
        case 'h3': lines.push(`\n### ${node.innerText}\n`); break;
        case 'h4': lines.push(`\n#### ${node.innerText}\n`); break;
        case 'p': lines.push(`\n${node.innerText}\n`); break;
        case 'li': lines.push(`- ${node.innerText}`); break;
        case 'blockquote': lines.push(`\n> ${node.innerText}\n`); break;
        case 'code': lines.push(`\`${node.innerText}\``); break;
        case 'pre': lines.push(`\n\`\`\`\n${node.innerText}\n\`\`\`\n`); break;
        case 'table': lines.push(extractTable(node)); break;
        case 'a': lines.push(`[${node.innerText}](${node.href})`); break;
        case 'img': lines.push(`![${node.alt || ''}](${node.src})`); break;
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
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Extract table as markdown
function extractTable(table) {
  const rows = table.querySelectorAll('tr');
  if (!rows.length) return '';
  
  const lines = [];
  rows.forEach((row, i) => {
    const cells = row.querySelectorAll('th, td');
    const rowText = Array.from(cells).map(c => c.innerText.trim()).join(' | ');
    
    if (i === 0) {
      lines.push(rowText);
      lines.push(cells.map(() => '---').join(' | '));
    } else {
      lines.push(rowText);
    }
  });
  
  return '\n' + lines.join('\n') + '\n';
}

// Extract named entities (simple regex-based)
function extractEntities(text) {
  const entities = [];
  
  // Capitalized phrases (simple NER)
  const capitalPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  let match;
  while ((match = capitalPattern.exec(text)) !== null) {
    entities.push({
      type: 'PERSON_OR_ORG',
      text: match[1],
      count: (text.match(new RegExp(match[1], 'g')) || []).length
    });
  }
  
  // URLs
  const urlPattern = /https?:\/\/[^\s]+/g;
  while ((match = urlPattern.exec(text)) !== null) {
    entities.push({
      type: 'URL',
      text: match[0],
      count: 1
    });
  }
  
  // Dates
  const datePattern = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})\b/g;
  while ((match = datePattern.exec(text)) !== null) {
    entities.push({
      type: 'DATE',
      text: match[0],
      count: 1
    });
  }
  
  // Numbers with units (money, percentages)
  const numberPattern = /\$[\d,.]+|\d+%|[\d,.]+\s*(USD|EUR|BTC|ETH)/gi;
  while ((match = numberPattern.exec(text)) !== null) {
    entities.push({
      type: 'QUANTITY',
      text: match[0],
      count: 1
    });
  }
  
  // Dedupe by text
  const seen = new Set();
  return entities.filter(e => {
    if (seen.has(e.text)) return false;
    seen.add(e.text);
    return true;
  });
}

// Extract relations between entities
function extractRelations(entities, text) {
  const relations = [];
  
  entities.forEach(entity => {
    // Find co-occurrences
    const contextPattern = new RegExp(`.{50}${entity.text}.{50}`, 'gi');
    const matches = text.match(contextPattern) || [];
    
    if (matches.length > 1) {
      relations.push({
        type: 'CO_OCCURS_WITH',
        from: entity.text,
        to: 'multiple_sources',
        confidence: Math.min(matches.length / 5, 1)
      });
    }
  });
  
  return relations;
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    try {
      const data = extractContent();
      sendResponse({ success: true, data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

// Signal ready
console.log('[Noosphere] Content script loaded');
