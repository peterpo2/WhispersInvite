export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.status(200).json({ guests: [] });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Backend is not configured' });

  const endpoint = `${url}/rest/v1/guest_list?select=id,name&name=ilike.*${encodeURIComponent(q)}*&limit=8`;
  const r = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return res.status(502).json({ error: 'Guest search failed' });
  const guests = await r.json();
  return res.status(200).json({ guests });
}
