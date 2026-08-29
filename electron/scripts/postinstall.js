#!/usr/bin/env node
// Rebuild native modules required by @electron-forge/maker-dmg on macOS.
// macos-alias and fs-xattr use node-gyp and their prebuilt binaries may not
// match the current Node.js version (especially v26+).
const { execSync } = require('child_process');
const path = require('path');

if (process.platform !== 'darwin') {
  process.exit(0);
}

const packages = ['macos-alias', 'fs-xattr'];

for (const pkg of packages) {
  const pkgDir = path.join(__dirname, '..', 'node_modules', pkg);
  try {
    require('fs').statSync(path.join(pkgDir, 'binding.gyp'));
    console.log(`[postinstall] Rebuilding ${pkg}...`);
    execSync('node-gyp rebuild', { cwd: pkgDir, stdio: 'pipe' });
    console.log(`[postinstall] ${pkg} rebuilt OK`);
  } catch (err) {
    console.warn(`[postinstall] Skipping ${pkg}: ${err.message}`);
  }
}
