require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const { initDb, getLeads, deleteLead, getStats } = require('./db');
const leadsRouter = require('./routes/leads');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Database ──────────────────────────────────────────────────────────────────
initDb();

// ── Middleware ────────────────────────────────────────────────────────────────
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
app.use('/api/leads', formLimiter, leadsRouter);

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
app.get('/api/admin/leads',     adminAuth, (req, res) => res.json(getLeads(req.query.type)));
app.get('/api/admin/stats',     adminAuth, (req, res) => res.json(getStats()));
app.delete('/api/admin/leads/:id', adminAuth, (req, res) => {
  const ok = deleteLead(req.params.id);
  ok ? res.json({ success: true }) : res.status(404).json({ error: 'Lead not found.' });
});

// ── Static Files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

app.get('/',           (_, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/about',      (_, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/commercial', (_, res) => res.sendFile(path.join(__dirname, 'commercial.html')));
app.get('/admin',      (_, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Transition Properties running`);
  console.log(`  Site:    http://localhost:${PORT}`);
  console.log(`  Admin:   http://localhost:${PORT}/admin`);
  console.log(`  (username: admin  /  password: ${process.env.ADMIN_PASSWORD || 'check .env'})\n`);
});
