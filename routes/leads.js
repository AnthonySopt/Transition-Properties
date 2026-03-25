const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');
const { insertLead } = require('../db');

// ── Email ─────────────────────────────────────────────────────────────────────

function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function formatLeadEmail(type, data) {
  const label = type === 'residential' ? 'Residential' : 'Commercial';
  const name  = type === 'residential'
    ? [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unknown'
    : data.name || 'Unknown';

  const rows = Object.entries(data)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr>
      <td style="padding:6px 12px;font-weight:600;color:#2C1810;white-space:nowrap">${k.replace(/_/g,' ')}</td>
      <td style="padding:6px 12px;color:#3D2B1F">${v}</td>
    </tr>`).join('');

  return {
    subject: `New ${label} Lead — ${name} (${data.address || 'No address'})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#E8612D,#F5A623);padding:24px 32px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">New ${label} Lead</h2>
          <p style="color:rgba(255,255,255,.85);margin:6px 0 0">${new Date().toLocaleString()}</p>
        </div>
        <div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:24px 32px">
          <table style="width:100%;border-collapse:collapse">${rows}</table>
        </div>
        <p style="text-align:center;color:#aaa;font-size:12px;margin-top:16px">
          Transition Properties · transitionfl.com
        </p>
      </div>`,
  };
}

async function sendNotification(type, data) {
  const transporter = createTransporter();
  if (!transporter || !process.env.NOTIFY_EMAIL) return;
  const { subject, html } = formatLeadEmail(type, data);
  await transporter.sendMail({
    from: `"Transition Properties" <${process.env.SMTP_USER}>`,
    to:   process.env.NOTIFY_EMAIL,
    subject,
    html,
  }).catch(err => console.error('Email error:', err.message));
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/leads/residential
router.post('/residential', (req, res) => {
  const { first_name, last_name, phone, email, address, property_type, situation, details } = req.body;

  if (!phone?.trim() || !email?.trim() || !address?.trim()) {
    return res.status(400).json({ error: 'Phone, email, and property address are required.' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  insertLead({ type: 'residential', first_name, last_name, phone, email, address, property_type, situation, details, ip });
  sendNotification('residential', req.body);

  res.json({ success: true, message: "✓ Request received! We'll reach out within 24 hours." });
});

// POST /api/leads/commercial
router.post('/commercial', (req, res) => {
  const { name, phone, email, address, property_type, asking_price, details } = req.body;

  if (!phone?.trim() || !email?.trim() || !address?.trim()) {
    return res.status(400).json({ error: 'Phone, email, and property address are required.' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  insertLead({ type: 'commercial', name, phone, email, address, property_type, asking_price, details, ip });
  sendNotification('commercial', req.body);

  res.json({ success: true, message: "✓ Submission received! We review all inquiries within 48 hours." });
});

module.exports = router;
