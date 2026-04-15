// Forwards a website form submission to the CRM intake webhook at
// app.transitionfl.com/api/webhooks/website-lead. The CRM logs every payload
// into its intake_webhook_log table, creates / updates a lead, appends a
// timeline activity, and fires an OpenPhone SMS notification. This module
// knows nothing about email — that path has been retired.
//
// Required env vars on the marketing-site Cloudflare Pages project:
//   APP_URL            — base URL of the CRM (default: https://app.transitionfl.com)
//   APP_INTAKE_SECRET  — shared secret, also set on the CRM side
//
// The CRM endpoint always returns 200 (so misconfigured secrets don't wedge
// the form). We look at the JSON body to distinguish real success from
// `{ ignored: true }` or `{ rejected: true, reason }`.

export async function forwardToCrm(env, { kind, data, clientIp, request }) {
  if (!env.APP_INTAKE_SECRET) {
    throw new Error('APP_INTAKE_SECRET env var not set on website project');
  }

  const url = (env.APP_URL || 'https://app.transitionfl.com').replace(/\/$/, '')
    + '/api/webhooks/website-lead';

  const payload = {
    kind,                                      // 'residential' | 'commercial' | 'deal'
    ...data,                                   // all raw form fields
    client_ip:   clientIp || null,
    page_path:   data.page_path  || request?.headers.get('referer') || null,
    referrer:    data.referrer   || request?.headers.get('referer') || null,
    user_agent:  request?.headers.get('user-agent') || null,
    submitted_at: new Date().toISOString(),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'X-Webhook-Secret': env.APP_INTAKE_SECRET,
    },
    body: JSON.stringify(payload),
  });

  // Parse response; don't trust status code alone — CRM intentionally returns
  // 200 for auth failures to avoid exposing the secret.
  let body = {};
  try { body = await res.json(); } catch { /* empty body */ }

  if (body.ignored)   throw new Error(`CRM webhook ignored payload: ${body.reason || 'auth mismatch'}`);
  if (body.rejected)  throw new Error(`CRM rejected lead: ${body.reason || 'invalid'}`);
  if (!body.success)  throw new Error(`CRM webhook returned non-success (status ${res.status})`);

  return { leadId: body.leadId, deduped: !!body.deduped, source: body.source };
}

// Rate limiter: shared in-memory bucket across the two lead endpoints so a
// single IP can't multiply its allowance by bouncing between residential
// and commercial forms. 10 submissions / 15 minutes.
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
