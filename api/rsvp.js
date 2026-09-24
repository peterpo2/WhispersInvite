export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  if (!body.guestId || !body.guestName || !['attending','declined'].includes(body.status)) {
    return res.status(400).json({ error: 'Invalid RSVP' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Backend is not configured' });

  const row = {
    event_key: body.event || 'whispers-2026-10-10',
    guest_id: body.guestId,
    guest_name: body.guestName,
    status: body.status,
    plus_one_name: body.plusOne?.name || null,
    plus_one_email: body.plusOne?.email || null,
    seal_code: body.sealCode || null,
    submitted_at: body.submittedAt || new Date().toISOString()
  };

  const endpoint = `${url}/rest/v1/rsvps?on_conflict=event_key,guest_id`;
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(row)
  });
  if (!r.ok) return res.status(502).json({ error: 'Could not save RSVP', detail: await r.text() });
  return res.status(200).json({ ok: true, rows: await r.json() });
}
