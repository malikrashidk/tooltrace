#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html', '.env', '.yml', '.yaml']);

function walk(dir) {
  const results = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) results.push(...walk(filePath));
    else if (exts.has(path.extname(name)) || name === '.env' || name === 'Dockerfile' || name === 'Makefile') results.push(filePath);
  }
  return results;
}

function fixFile(file) {
  let buf = fs.readFileSync(file);
  // detect common BOMs / encodings
  let str;
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    // UTF-16 LE
    str = buf.toString('utf16le');
  } else if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    // UTF-16 BE - Node doesn't directly support utf16be; attempt to swap bytes
    const swapped = Buffer.allocUnsafe(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    str = swapped.toString('utf16le');
  } else {
    str = buf.toString('utf8');
  }
  // If the file contained replacement characters, report as error
  if (str.includes('\uFFFD')) {
    return { file, fixed: false, reason: 'contains invalid UTF-8 sequences' };
  }

  // remove BOM if present
  if (str.charCodeAt(0) === 0xFEFF) {
    str = str.slice(1);
  }

  // normalize to NFC and force LF
  const normalized = str.normalize('NFC').replace(/\r\n/g, '\n');
  if (normalized !== str) {
    fs.writeFileSync(file, normalized, 'utf8');
    return { file, fixed: true };
  }
  return { file, fixed: false };
}

const repoRoot = path.resolve(__dirname, '..');
const files = walk(repoRoot);
const errors = [];
const fixed = [];
for (const f of files) {
  try {
    const r = fixFile(f);
    if (r.reason) errors.push(r);
    else if (r.fixed) fixed.push(r.file);
  } catch (e) {
    errors.push({ file: f, reason: String(e) });
  }
}

if (fixed.length) {
  console.log('[utf8] Fixed files:', fixed.length);
}
if (errors.length) {
  console.error('[utf8] Errors detected:');
  for (const e of errors) console.error('-', e.file, e.reason || '');
  process.exit(2);
}
console.log('[utf8] All checked files are UTF-8 clean');
