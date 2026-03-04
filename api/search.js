export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, titleKeyword } = req.body;
  if (!retailer) return res.status(400).json({ error: "Missing retailer" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  const DEFAULT_TITLES = [
    "buyer", "senior buyer", "merchant", "category manager",
    "purchasing manager", "divisional merchandise manager",
    "director of merchandising", "VP merchandising", "head of buying"
  ];

  const personTitles = titleKeyword
    ? [titleKeyword, `${titleKeyword} buyer`, `${titleKeyword} merchant`]
    : DEFAULT_TITLES;

  try {
    // Try two different Apollo search approaches and log both
    const body1 = {
      organization_names: [retailer],
      person_titles: personTitles,
      page: 1,
      per_page: 50,
    };

    // Also try q_keywords approach
    const body2 = {
      q_keywords: `buyer ${retailer}`,
      organization_names: [retailer],
      page: 1,
      per_page: 50,
    };

    const r1 = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
      body: JSON.stringify(body1),
    });
    const d1 = await r1.json();
    console.log("Apollo response 1 status:", r1.status);
    console.log("Apollo response 1 total:", d1?.pagination?.total_entries, "people:", d1?.people?.length, "error:", d1?.error);

    const r2 = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
      body: JSON.stringify(body2),
    });
    const d2 = await r2.json();
    console.log("Apollo response 2 status:", r2.status);
    console.log("Apollo response 2 total:", d2?.pagination?.total_entries, "people:", d2?.people?.length, "error:", d2?.error);

    const people = [...(d1?.people || []), ...(d2?.people || [])];

    // Deduplicate
    const seen = new Set();
    const unique = people.filter(p => {
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

    return res.status(200).json({ leads, total: leads.length, debug: { approach1: d1?.people?.length || 0, approach2: d2?.people?.length || 0, error1: d1?.error, error2: d2?.error } });
  } catch (e) {
    console.error("Search error:", e.message);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
