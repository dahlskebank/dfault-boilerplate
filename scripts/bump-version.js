#!/usr/bin/env node
// Bumps src/_data/site.json's top-level "version" field (the one the
// footer shows), and keeps package.json + package-lock.json in step so
// the project has ONE version number.
// Usage: node scripts/bump-version.js patch|minor|major
// Preserves site.json's existing formatting (tabs, comments, key order)
// by doing a targeted regex replace rather than parse/stringify.
// site.json uses "v1.2.3"; package.json uses plain "1.2.3" (npm's format).

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

// package.json: same targeted replace — its first "version" key is the
// top-level one (npm always writes name, then version).
const npmVersion = newVersion.slice(1);
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkgText = fs.readFileSync(pkgPath, 'utf8');
const pkgRe = /^(\s*"version"\s*:\s*")[^"]*(")/m;
if (pkgRe.test(pkgText)) {
  fs.writeFileSync(pkgPath, pkgText.replace(pkgRe, `$1${npmVersion}$2`));
  console.log(`package.json version -> ${npmVersion}`);
}

// package-lock.json stores the version twice (top level + packages[""]).
// npm writes it as plain 2-space JSON, so parse/stringify round-trips it
// byte for byte; if it ever doesn't, leave it for `npm install` to fix.
const lockPath = path.join(__dirname, '..', 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lockText = fs.readFileSync(lockPath, 'utf8');
  const lock = JSON.parse(lockText);
  if (JSON.stringify(lock, null, 2) + '\n' === lockText) {
    lock.version = npmVersion;
    if (lock.packages && lock.packages['']) lock.packages[''].version = npmVersion;
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    console.log(`package-lock.json version -> ${npmVersion}`);
  } else {
    console.warn('package-lock.json left as-is (unusual formatting) — run `npm install` to sync its version');
  }
}
