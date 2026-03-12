export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { query } = req.body;
  if (!query || query.trim().length < 2) return res.status(200).json({ companies: [] });

  const KEY     = process.env.APOLLO_API_KEY || "xHkG62bA8-6XFutAKMgrFQ";
  const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": KEY };

  try {
    const r = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ q_organization_name: query.trim(), page: 1, per_page: 8 }),
    });
    const d = await r.json();
    const companies = (d?.organizations || d?.accounts || [])
      .map(o => o.name)
      .filter(Boolean)
      .slice(0, 6);
    return res.status(200).json({ companies });
  } catch (e) {
    return res.status(200).json({ companies: [] });
  }
}
