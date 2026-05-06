#!/usr/bin/env node
// Bumps src/_data/site.json's top-level "version" field.
// Usage: node scripts/bump-version.js patch|minor|major
// Preserves the file's existing formatting (tabs, comments, key order)
// by doing a targeted regex replace rather than parse/stringify.

const fs = require('fs');
const path = require('path');

const segment = process.argv[2];
if (!['patch', 'minor', 'major'].includes(segment)) {
  console.error('Usage: node scripts/bump-version.js patch|minor|major');
  process.exit(1);
}

const sitePath = path.join(__dirname, '..', 'src', '_data', 'site.json');
const text = fs.readFileSync(sitePath, 'utf8');

const re = /^(\s*"version"\s*:\s*")v?(\d+)\.(\d+)\.(\d+)(")/m;
const match = text.match(re);
if (!match) {
  console.error(`No top-level "version": "vX.Y.Z" field found in ${sitePath}`);
  process.exit(2);
}

const [, prefix, majorStr, minorStr, patchStr, suffix] = match;
let [major, minor, patch] = [majorStr, minorStr, patchStr].map(Number);
const oldVersion = `v${major}.${minor}.${patch}`;

if (segment === 'major') { major++; minor = 0; patch = 0; }
else if (segment === 'minor') { minor++; patch = 0; }
else { patch++; }

const newVersion = `v${major}.${minor}.${patch}`;
fs.writeFileSync(sitePath, text.replace(re, `${prefix}${newVersion}${suffix}`));
console.log(`site.version: ${oldVersion} -> ${newVersion}`);
