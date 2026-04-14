import { sendLeadEmail, rateLimit, clientIp } from '../../_shared/send-lead.js';

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

  // Deal submissions (from /submit-deal) route to deals@transitionfl.com;
  // regular commercial inquiries go to the main leads inbox.
  const isDeal = situation && situation.startsWith('Deal Submission');
  const recipient = isDeal ? (env.DEALS_EMAIL || 'deals@transitionfl.com') : undefined;

  try {
    await sendLeadEmail(env, { type: 'commercial', data: { ...data, ip }, recipient });
  } catch (err) {
    console.error('Lead email failed:', err.message);
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
