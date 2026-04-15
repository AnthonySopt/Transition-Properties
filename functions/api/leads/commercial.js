import { forwardToCrm, rateLimit, clientIp } from '../../_shared/forward-to-crm.js';

export async function onRequestPost({ request, env }) {
  const ip = clientIp(request);
  if (!rateLimit(ip)) {
    return json({ error: 'Too many submissions. Please try again in 15 minutes.' }, 429);
  }

  let data;
  try { data = await request.json(); }
  catch { return json({ error: 'Invalid request.' }, 400); }

  const { phone, email, address, situation } = data;
  if (!phone?.trim() || !email?.trim() || !address?.trim()) {
    return json({ error: 'Phone, email, and property address are required.' }, 400);
  }

  // `submit-deal.html` prefixes `situation` with "Deal Submission" so we can
  // tag these separately in the CRM (web_deal_submission) for reporting.
  const isDeal = situation && situation.startsWith('Deal Submission');
  const kind = isDeal ? 'deal' : 'commercial';

  try {
    await forwardToCrm(env, { kind, data, clientIp: ip, request });
  } catch (err) {
    console.error('[leads/commercial] CRM forward failed:', err.message);
    return json({ error: 'Could not send your submission. Please call us at (239) 766-6978.' }, 500);
  }

  return json({
    success: true,
    message: isDeal
      ? '✓ Deal submitted! We review all submissions within 24 hours.'
      : '✓ Submission received! We review all inquiries within 48 hours.',
  });
}

export async function onRequest({ request }) {
  if (request.method === 'POST') return;
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
