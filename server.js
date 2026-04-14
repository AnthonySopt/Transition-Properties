require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const fs = require('fs');
const { initDb, getLeads, deleteLead, getStats } = require('./db');
const leadsRouter = require('./routes/leads');
const { buildVersions, version } = require('./asset-versioning');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Database ──────────────────────────────────────────────────────────────────
initDb();

// ── Asset fingerprints (computed once at boot) ───────────────────────────────
buildVersions(__dirname);

// ── Middleware ────────────────────────────────────────────────────────────────
// gzip/deflate — massive win for HTML/CSS/JS payloads on mobile networks
app.use(compression({ level: 6, threshold: 1024 }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting (forms) ─────────────────────────────────────────────────────
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again in 15 minutes.' },
});

// ── API Routes ────────────────────────────────────────────────────────────────
// Residential & commercial lead forms → info@transitionfl.com
app.use('/api/leads', formLimiter, leadsRouter);

// Deal submission form → deals@transitionfl.com
// This reuses the commercial lead endpoint but tags submissions as deals.
// The submit-deal.html page sets situation to "Deal Submission — [Role]"
// so deal submissions are identifiable in the admin dashboard and email notifications.

// ── Admin Auth ────────────────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Transition Properties Admin"');
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const decoded  = Buffer.from(auth.slice(6), 'base64').toString('utf8');
  const colonIdx = decoded.indexOf(':');
  const user     = decoded.slice(0, colonIdx);
  const pass     = decoded.slice(colonIdx + 1);
  if (user === 'admin' && pass === process.env.ADMIN_PASSWORD) return next();
  res.status(401).json({ error: 'Invalid credentials.' });
}

// ── Admin API ─────────────────────────────────────────────────────────────────
app.get('/api/admin/leads',        adminAuth, (req, res) => res.json(getLeads(req.query.type)));
app.get('/api/admin/stats',        adminAuth, (req, res) => res.json(getStats()));
app.delete('/api/admin/leads/:id', adminAuth, (req, res) => {
  const ok = deleteLead(req.params.id);
  ok ? res.json({ success: true }) : res.status(404).json({ error: 'Lead not found.' });
});

// ── .html → clean URL redirects (before static files to intercept) ───────────
app.get('/*.html', (req, res) => {
  const slug = req.path.replace(/\.html$/, '').replace(/^\//, '');
  const map = {
    'index': '/',
    'about': '/about',
    'commercial': '/commercial',
    'sell-my-house-fast': '/sell-my-house-fast',
    'pre-foreclosure': '/pre-foreclosure',
    'probate': '/probate',
    'land': '/land',
    'tired-landlords': '/tired-landlords',
    'storage': '/storage',
    'mobile-parks': '/mobile-parks',
    'multifamily': '/multifamily',
    'industrial': '/industrial',
    'office': '/office',
    'retail': '/retail',
    'how-it-works': '/how-it-works',
    'areas-we-serve': '/areas-we-serve',
    'faq': '/faq',
    'submit-deal': '/submit-deal',
  };
  if (map[slug]) return res.redirect(301, map[slug]);
  // Fall through to static for non-mapped .html files (e.g. admin.html)
  res.sendFile(path.join(__dirname, req.path.slice(1)), (err) => {
    if (err) res.status(404).send('Not found');
  });
});

// ── Static Files ──────────────────────────────────────────────────────────────
// Long-cache static assets (images, css, js, fonts). HTML stays short so edits
// propagate immediately. Cache-busting via filename changes recommended for css/js.
app.use(express.static(path.join(__dirname), {
  etag: true,
  lastModified: true,
  // Do NOT auto-serve HTML from static — all HTML goes through the versioning
  // helper below so asset refs get ?v=<hash> appended. Static handles images,
  // css, js, fonts only.
  index: false,
  extensions: [],
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'].includes(ext)) {
      // Images & fonts: 1 year, immutable-ish
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (ext === '.css' || ext === '.js') {
      // CSS/JS: 1 day + revalidate so updates are picked up quickly
      res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    } else if (ext === '.html') {
      // HTML: no long cache — lets content updates go live fast
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  },
}));

// ── SEO Files ─────────────────────────────────────────────────────────────────
app.get('/robots.txt',  (_, res) => res.sendFile(path.join(__dirname, 'robots.txt')));
app.get('/sitemap.xml', (_, res) => res.type('application/xml').sendFile(path.join(__dirname, 'sitemap.xml')));

// ── Helper: serve HTML file (versioned + cached in memory) ────────────────────
// HTML is read from disk once, rewritten to include ?v=<hash> on every asset
// reference, and stashed in memory. Subsequent requests serve straight from RAM.
const htmlCache = {};
function loadHtml(file) {
  const raw = fs.readFileSync(path.join(__dirname, file), 'utf8');
  htmlCache[file] = version(raw);
}
const html = (file) => {
  loadHtml(file);
  return (_, res) => {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.type('html').send(htmlCache[file]);
  };
};

// ── Page Routes (clean URLs) ──────────────────────────────────────────────────

// Core pages
app.get('/',                  html('index.html'));
app.get('/about',             html('about.html'));
app.get('/admin',             html('admin.html'));

// Residential service pages
app.get('/sell-my-house-fast', html('sell-my-house-fast.html'));
app.get('/pre-foreclosure',    html('pre-foreclosure.html'));
app.get('/probate',            html('probate.html'));
app.get('/land',               html('land.html'));
app.get('/tired-landlords',    html('tired-landlords.html'));

// Commercial pages
app.get('/commercial',         html('commercial.html'));
app.get('/storage',            html('storage.html'));
app.get('/mobile-parks',       html('mobile-parks.html'));
app.get('/multifamily',        html('multifamily.html'));
app.get('/industrial',         html('industrial.html'));
app.get('/office',             html('office.html'));
app.get('/retail',             html('retail.html'));

// Resource pages
app.get('/how-it-works',       html('how-it-works.html'));
app.get('/areas-we-serve',     html('areas-we-serve.html'));
app.get('/faq',                html('faq.html'));
app.get('/submit-deal',        html('submit-deal.html'));

// ── Redirects (alternate URLs → canonical) ────────────────────────────────────
app.get('/tired-landlord',     (_, res) => res.redirect(301, '/tired-landlords'));
app.get('/storage-facilities', (_, res) => res.redirect(301, '/storage'));
app.get('/mobile-home-parks',  (_, res) => res.redirect(301, '/mobile-parks'));
app.get('/areas',              (_, res) => res.redirect(301, '/areas-we-serve'));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Transition Properties running`);
  console.log(`  Site:    http://localhost:${PORT}`);
  console.log(`  Admin:   http://localhost:${PORT}/admin`);
  console.log(`  (username: admin  /  password: ${process.env.ADMIN_PASSWORD || 'check .env'})\n`);
});
