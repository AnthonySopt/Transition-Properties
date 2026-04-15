import { forwardToCrm, rateLimit, clientIp } from '../../_shared/forward-to-crm.js';

export async function onRequestPost({ request, env }) {
  const ip = clientIp(request);
  if (!rateLimit(ip)) {
    return json({ error: 'Too many submissions. Please try again in 15 minutes.' }, 429);
  }

  let data;
  try { data = await request.json(); }
  catch { return json({ error: 'Invalid request.' }, 400); }

  const { first_name, last_name, phone, email, address } = data;
  if (!phone?.trim() || !email?.trim() || !address?.trim()) {
    return json({ error: 'Phone, email, and property address are required.' }, 400);
  }
  if (!first_name?.trim() && !last_name?.trim()) {
    return json({ error: 'Your name is required.' }, 400);
  }

  try {
    await forwardToCrm(env, { kind: 'residential', data, clientIp: ip, request });
  } catch (err) {
    console.error('[leads/residential] CRM forward failed:', err.message);
    return json({ error: 'Could not send your request. Please call us at (239) 766-6978.' }, 500);
  }

  return json({ success: true, message: "✓ Request received! We'll reach out within 24 hours." });
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
