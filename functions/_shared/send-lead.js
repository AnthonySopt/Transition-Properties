// Shared helper for lead notification emails. Called from the two Pages
// Functions under /api/leads/. Uses Resend's HTTP API so it works in the
// Cloudflare Workers runtime (no Node APIs like nodemailer).
//
// Required env vars (set in Cloudflare Pages → Settings → Environment variables):
//   RESEND_API_KEY   — from resend.com dashboard
//   NOTIFY_EMAIL     — where leads are delivered (default: leads@transitionfl.com)
//   DEALS_EMAIL      — where deal submissions go  (default: deals@transitionfl.com)
//   FROM_EMAIL       — verified sender (default: forms@transitionfl.com)

const BRAND = {
  orange: '#E8612D',
  amber:  '#F5A623',
  dark:   '#2C1810',
  text:   '#3D2B1F',
};

export function formatLeadEmail(type, data) {
  const label = type === 'residential' ? 'Residential' : 'Commercial';
  const name = type === 'residential'
    ? [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unknown'
    : data.name || 'Unknown';

  const rows = Object.entries(data)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr>
      <td style="padding:6px 12px;font-weight:600;color:${BRAND.dark};white-space:nowrap">${escapeHtml(k.replace(/_/g, ' '))}</td>
      <td style="padding:6px 12px;color:${BRAND.text}">${escapeHtml(String(v))}</td>
    </tr>`).join('');

  return {
    subject: `New ${label} Lead — ${name} (${data.address || 'No address'})`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,${BRAND.orange},${BRAND.amber});padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">New ${label} Lead</h2>
        <p style="color:rgba(255,255,255,.85);margin:6px 0 0">${new Date().toLocaleString()}</p>
      </div>
      <div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:24px 32px">
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
      <p style="text-align:center;color:#aaa;font-size:12px;margin-top:16px">Transition Properties · transitionfl.com</p>
    </div>`,
  };
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function sendLeadEmail(env, { type, data, recipient }) {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY env var not set');
  }
  const to = recipient || env.NOTIFY_EMAIL || 'leads@transitionfl.com';
  const from = env.FROM_EMAIL || 'forms@transitionfl.com';
  const { subject, html } = formatLeadEmail(type, data);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from: `Transition Properties <${from}>`,
      to:   [to],
      reply_to: data.email || undefined,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

// Simple per-IP rate limit using a short-lived Map. Survives within one Worker
// instance; spam traffic that changes IP can still get through, which is fine
// for a contact form. For stricter limits, switch to KV.
const hits = new Map();
export function rateLimit(ip, { windowMs = 15 * 60 * 1000, max = 10 } = {}) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, expires: now + windowMs };
  if (now > entry.expires) { entry.count = 0; entry.expires = now + windowMs; }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count <= max;
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || 'unknown';
}
