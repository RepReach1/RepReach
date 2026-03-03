export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, category, retailerType } = req.body;
  if (!retailer && !retailerType) return res.status(400).json({ error: "Missing search params" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  // Build keyword query from category + buyer title keywords
  const titleKeywords = [
    "buyer", "merchant", "purchasing", "category manager",
    "merchandising", "procurement", "senior buyer", "divisional buyer"
  ];

  const categoryKeywords = category ? [category] : [];
  const keywords = [...categoryKeywords, ...titleKeywords].join(" ");

  // Map retailer types to company names for Apollo
  const retailerTypeMap = {
    mass: ["Walmart", "Target", "Kmart"],
    club: ["Sam's Club", "Costco", "BJ's Wholesale"],
    grocery: ["Kroger", "Albertsons", "Publix", "Safeway", "Whole Foods"],
    drug: ["CVS", "Walgreens", "Rite Aid"],
    home_improvement: ["Home Depot", "Lowe's", "Menards"],
    specialty: ["Northern Tool", "Tractor Supply", "Harbor Freight", "Ace Hardware", "GNC", "Vitamin Shoppe"],
    dollar: ["Dollar General", "Dollar Tree", "Five Below"],
    ecomm: ["Amazon"],
  };

  // Figure out which companies to search
  let companies = [];
  if (retailer) {
    companies = [retailer];
    // Add parent/subsidiary aliases
    const aliases = {
      walmart: ["Walmart", "Sam's Club"],
      "sam's club": ["Sam's Club", "Walmart"],
      kroger: ["Kroger", "Fred Meyer", "Ralphs", "Harris Teeter", "King Soopers"],
      amazon: ["Amazon", "Whole Foods"],
      albertsons: ["Albertsons", "Safeway", "Vons", "Jewel-Osco"],
    };
    const key = retailer.toLowerCase();
    for (const [alias, names] of Object.entries(aliases)) {
      if (key.includes(alias)) { companies = names; break; }
    }
  } else if (retailerType && retailerTypeMap[retailerType]) {
    companies = retailerTypeMap[retailerType];
  }

  try {
    const searchRes = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify({
        q_keywords: keywords,
        organization_names: companies,
        person_titles: titleKeywords,
        page: 1,
        per_page: 25,
      }),
    });

    const data = await searchRes.json();
    const people = data?.people || data?.contacts || [];

    // Format results to match our lead schema
    const leads = people
      .filter(p => p.first_name && p.last_name && p.organization_name)
      .map((p, i) => ({
        id: `apollo_${i}_${p.id || Math.random().toString(36).slice(2)}`,
        firstName: p.first_name,
        lastName: p.last_name,
        title: p.title || "Buyer",
        retailer: p.organization_name,
        retailerType: retailerType || "unknown",
        email: p.email || null,
        phone: p.phone_numbers?.[0]?.sanitized_number || null,
        location: [p.city, p.state].filter(Boolean).join(", ") || "Unknown",
        categories: category ? [category] : [],
        confidence: 90,
        context: `Apollo verified buyer at ${p.organization_name}. Title: ${p.title || "Buyer"}.`,
        linkedin: p.linkedin_url || null,
        apolloEnriched: true,
        apolloSource: true,
      }));

    return res.status(200).json({ leads, total: data?.pagination?.total_entries || leads.length });
  } catch (e) {
    console.error("Apollo search error:", e);
    return res.status(500).json({ error: "Apollo search failed", leads: [] });
  }
}
