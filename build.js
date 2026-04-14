// Cloudflare Pages build step.
//
// Produces a `dist/` folder that Pages serves as the static site. Every
// /images/, .css, and .js reference in the HTML gets rewritten to
// /path/file.ext?v=<hash>, where <hash> is derived from the file's size + mtime.
// Every deploy regenerates fresh hashes, so Cloudflare's edge cache sees new
// URLs and auto-invalidates stale versions. No manual Purge Cache ever needed.
//
// Pages config:
//   Build command:          npm run build
//   Build output directory: dist
//   (Functions stay at /functions in the repo root — Pages picks them up separately.)

const fs   = require('fs');
const path = require('path');
const { buildVersions, version, versions } = require('./asset-versioning');

const SRC = __dirname;
const OUT = path.join(SRC, 'dist');

// Files that belong in the deployed site.
const STATIC_FILES = [
  'index.html', 'about.html', 'admin.html', 'areas-we-serve.html',
  'commercial.html', 'faq.html', 'how-it-works.html', 'industrial.html',
  'land.html', 'mobile-parks.html', 'multifamily.html', 'office.html',
  'pre-foreclosure.html', 'probate.html', 'retail.html',
  'sell-my-house-fast.html', 'storage.html', 'submit-deal.html',
  'tired-landlords.html',
  'squarespace-custom.css', 'form-handler.js', 'interactions.js',
  'robots.txt', 'sitemap.xml',
];

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Wipe + recreate dist/
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// Images go first so versioning can hash them
const imagesDir = path.join(SRC, 'images');
if (fs.existsSync(imagesDir)) copyDir(imagesDir, path.join(OUT, 'images'));

// Compute fingerprints from the source tree
buildVersions(SRC);

// Copy static files — rewrite HTML, copy everything else verbatim
let rewritten = 0;
for (const file of STATIC_FILES) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) continue;
  const dst = path.join(OUT, file);
  if (file.endsWith('.html')) {
    fs.writeFileSync(dst, version(fs.readFileSync(src, 'utf8')));
    rewritten++;
  } else {
    fs.copyFileSync(src, dst);
  }
}

console.log(`✓ Built dist/ — ${rewritten} HTML files versioned, ${Object.keys(versions).length} assets fingerprinted`);
