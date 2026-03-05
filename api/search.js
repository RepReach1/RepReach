export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, titleKeyword } = req.body;
  if (!retailer) return res.status(400).json({ error: "Missing retailer" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  const DEFAULT_TITLES = [
    "buyer", "senior buyer", "merchant", "senior merchant",
    "category manager", "purchasing manager", "divisional merchandise manager",
    "director of merchandising", "VP merchandising", "head of buying",
    "chief merchant", "merchandise manager", "procurement manager"
  ];

  const personTitles = titleKeyword
    ? [titleKeyword, `${titleKeyword} buyer`, `${titleKeyword} merchant`, `senior ${titleKeyword}`]
    : DEFAULT_TITLES;

  const fetchPage = async (page) => {
    const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify({
        organization_names: [retailer],
        person_titles: personTitles,
        page,
        per_page: 50,
      }),
    });
    const d = await r.json();
    console.log(`Page ${page}:`, r.status, "people:", d?.people?.length, "error:", d?.error);
    return d?.people || [];
  };

  try {
    const [p1, p2, p3] = await Promise.all([fetchPage(1), fetchPage(2), fetchPage(3)]);

    const seen = new Set();
    const unique = [...p1, ...p2, ...p3].filter(p => {
      if (!p.first_name || !p.last_name) return false;
      const k = `${p.first_name}${p.last_name}`.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const leads = unique.map((p, i) => ({
      id: `apollo_${i}_${p.id || Math.random().toString(36).slice(2)}`,
      firstName: p.first_name,
      lastName: p.last_name,
      title: p.title || "Buyer",
      retailer: p.organization_name || retailer,
      retailerType: "unknown",
      email: p.email || null,
      phone: p.phone_numbers?.[0]?.sanitized_number || null,
      location: [p.city, p.state].filter(Boolean).join(", ") || "",
      categories: [],
      confidence: 88,
      context: `Apollo verified contact at ${p.organization_name || retailer}.`,
      linkedin: p.linkedin_url || null,
      apolloEnriched: !!(p.email || p.linkedin_url),
      apolloSource: true,
    }));

    return res.status(200).json({ leads, total: leads.length });
  } catch (e) {
    console.error("Search error:", e.message);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
