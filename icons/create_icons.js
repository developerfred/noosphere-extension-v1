/**
 * Noosphere Icon Generator
 * Creates SVG-based icons for the extension
 * Run with: node create_icons.js
 */

const fs = require('fs');
const path = require('path');

// Icon data (base64 encoded PNG for each size)
const icons = {
  16: createIconData(16),
  48: createIconData(48),
  128: createIconData(128)
};

// Create icon as raw RGBA data
function createIconData(size) {
  const canvas = {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4)
  };
  
  // Background: gradient from #667eea to #764ba2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Gradient
      const t = y / size;
      const r = Math.floor(0x66 + (0x76 - 0x66) * t);
      const g = Math.floor(0x7e + (0x4b - 0x7e) * t);
      const b = Math.floor(0xea + (0xa2 - 0xea) * t);
      
      // Circle mask
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 1;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= radius) {
        canvas.data[idx] = r;     // R
        canvas.data[idx + 1] = g; // G
        canvas.data[idx + 2] = b; // B
        canvas.data[idx + 3] = 255; // A
      } else {
        // Anti-aliased edge
        const alpha = Math.max(0, 1 - (dist - radius));
        canvas.data[idx] = r;
        canvas.data[idx + 1] = g;
        canvas.data[idx + 2] = b;
        canvas.data[idx + 3] = Math.floor(255 * alpha);
      }
    }
  }
  
  // Draw brain/network pattern (simplified as dots)
  const centerX = size / 2;
  const centerY = size / 2;
  const nodeRadius = size * 0.06;
  
  // Central node
  drawCircle(canvas, centerX, centerY, nodeRadius * 1.5, 255, 255, 255);
  
  // Surrounding nodes
  const angles = [0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3];
  const orbitRadius = size * 0.25;
  
  angles.forEach(angle => {
    const nx = centerX + Math.cos(angle) * orbitRadius;
    const ny = centerY + Math.sin(angle) * orbitRadius;
    
    // Line to center
    drawLine(canvas, centerX, centerY, nx, ny, 255, 255, 255, size * 0.04);
    
    // Node
    drawCircle(canvas, nx, ny, nodeRadius, 255, 255, 255);
  });
  
  return canvas;
}

function drawCircle(canvas, cx, cy, radius, r, g, b) {
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= radius) {
        const idx = (y * canvas.width + x) * 4;
        canvas.data[idx] = r;
        canvas.data[idx + 1] = g;
        canvas.data[idx + 2] = b;
        canvas.data[idx + 3] = 255;
      }
    }
  }
}

function drawLine(canvas, x1, y1, x2, y2, r, g, b, thickness) {
  const halfThick = thickness / 2;
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      // Distance from point to line segment
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      
      if (len2 === 0) continue;
      
      let t = ((x - x1) * dx + (y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      
      const nearestX = x1 + t * dx;
      const nearestY = y1 + t * dy;
      
      const distX = x - nearestX;
      const distY = y - nearestY;
      const dist = Math.sqrt(distX * distX + distY * distY);
      
      if (dist <= halfThick) {
        const idx = (y * canvas.width + x) * 4;
        canvas.data[idx] = r;
        canvas.data[idx + 1] = g;
        canvas.data[idx + 2] = b;
        canvas.data[idx + 3] = 255;
      }
    }
  }
}

// Convert to PNG (simple implementation)
function toPNG(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = createIHDR(width, height);
  
  // IDAT chunk (image data)
  const idat = createIDAT(canvas);
  
  // IEND chunk
  const iend = createIEND();
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIHDR(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;  // bit depth
  data[9] = 6;  // color type (RGBA)
  data[10] = 0; // compression
  data[11] = 0; // filter
  data[12] = 0; // interlace
  
  return createChunk('IHDR', data);
}

function createIDAT(canvas) {
  const zlib = require('zlib');
  
  // Raw image data with filter byte per row
  const rawData = Buffer.alloc((canvas.width * 4 + 1) * canvas.height);
  
  for (let y = 0; y < canvas.height; y++) {
    rawData[y * (canvas.width * 4 + 1)] = 0; // No filter
    for (let x = 0; x < canvas.width; x++) {
      const srcIdx = (y * canvas.width + x) * 4;
      const dstIdx = y * (canvas.width * 4 + 1) + 1 + x * 4;
      rawData[dstIdx] = canvas.data[srcIdx];
      rawData[dstIdx + 1] = canvas.data[srcIdx + 1];
      rawData[dstIdx + 2] = canvas.data[srcIdx + 2];
      rawData[dstIdx + 3] = canvas.data[srcIdx + 3];
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  return createChunk('IDAT', compressed);
}

function createIEND() {
  return createChunk('IEND', Buffer.alloc(0));
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = makeCRCTable();
  
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCRCTable() {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

// Generate icons
const iconsDir = __dirname;

for (const [size, canvas] of Object.entries(icons)) {
  const png = toPNG(canvas);
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, png);
  console.log(`Created ${filename} (${png.length} bytes)`);
}

console.log('Done!');
