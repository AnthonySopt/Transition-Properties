// Asset fingerprinting — rewrites /images/*.png, /*.css, /*.js references in
// HTML to /images/*.png?v=<hash> etc. Hashes come from each file's size+mtime
// so every deploy generates fresh URLs. Cloudflare treats `?v=abc` and `?v=xyz`
// as separate cache keys, so content updates invalidate the edge automatically.
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const versions = {};  // URL path → short hash

function hashFile(absPath) {
  const { size, mtimeMs } = fs.statSync(absPath);
  return crypto.createHash('sha256')
    .update(`${size}-${mtimeMs}`)
    .digest('hex')
    .slice(0, 8);
}

function scanDir(absDir, urlPrefix) {
  if (!fs.existsSync(absDir)) return;
  for (const name of fs.readdirSync(absDir)) {
    const abs = path.join(absDir, name);
    if (fs.statSync(abs).isDirectory()) continue;
    versions[`${urlPrefix}${name}`] = hashFile(abs);
  }
}

function buildVersions(rootDir) {
  scanDir(path.join(rootDir, 'images'), '/images/');
  // Root-level CSS / JS that the HTML references
  for (const f of ['squarespace-custom.css', 'form-handler.js', 'interactions.js']) {
    const abs = path.join(rootDir, f);
    if (fs.existsSync(abs)) versions[`/${f}`] = hashFile(abs);
  }
}

// Rewrites every src="/path/file.ext" or href="/path/file.ext" that matches
// something we fingerprinted. Leaves unknown assets untouched.
const ASSET_RE = /\b(src|href)="(\/[^"?#]+?\.(?:png|jpe?g|webp|gif|svg|ico|css|js))"/gi;

function version(html) {
  return html.replace(ASSET_RE, (m, attr, url) => {
    const v = versions[url];
    return v ? `${attr}="${url}?v=${v}"` : m;
  });
}

module.exports = { buildVersions, version, versions };
