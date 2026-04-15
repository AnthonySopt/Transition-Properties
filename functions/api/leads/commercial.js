import { forwardToCrm, rateLimit, clientIp } from '../../_shared/forward-to-crm.js';
import { sendLeadEmail } from '../../_shared/send-lead.js';

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
  const emailRecipient = isDeal ? (env.DEALS_EMAIL || 'deals@transitionfl.com') : undefined;

  // CRM forward + email in parallel. Email is a backup for when OpenPhone
  // SMS is blocked or the CRM is down. See residential.js for logic notes.
  const [crmResult, emailResult] = await Promise.allSettled([
    forwardToCrm(env, { kind, data, clientIp: ip, request }),
    sendLeadEmail(env, { type: 'commercial', data: { ...data, ip }, recipient: emailRecipient }),
  ]);

  if (emailResult.status === 'rejected') {
    console.error('[leads/commercial] email fallback failed:', emailResult.reason?.message);
  }
  if (crmResult.status === 'rejected') {
    console.error('[leads/commercial] CRM forward failed:', crmResult.reason?.message);
    if (emailResult.status === 'rejected') {
      return json({ error: 'Could not send your submission. Please call us at (239) 766-6978.' }, 500);
    }
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
