export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, titleKeyword } = req.body;
  if (!retailer) return res.status(400).json({ error: "Missing retailer" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  // Default broad buyer titles — used when no keyword given
  const DEFAULT_TITLES = [
    "buyer", "senior buyer", "merchant", "senior merchant",
    "category manager", "purchasing manager", "DMM",
    "divisional merchandise manager", "director of merchandising",
    "VP of merchandising", "sourcing manager", "merchandise manager",
    "head of buying", "chief merchant", "procurement manager",
    "inventory buyer", "product manager"
  ];

  // If user typed a keyword, search that directly — no filtering
  const personTitles = titleKeyword
    ? [titleKeyword, `senior ${titleKeyword}`, `${titleKeyword} buyer`, `${titleKeyword} merchant`, `${titleKeyword} manager`]
    : DEFAULT_TITLES;

  // Company name aliases
  const aliases = {
    "walmart":         ["Walmart"],
    "sam's club":      ["Sam's Club", "Sams Club"],
    "sams club":       ["Sam's Club", "Sams Club"],
    "kroger":          ["Kroger", "Fred Meyer", "Ralphs", "Harris Teeter", "King Soopers"],
    "target":          ["Target"],
    "costco":          ["Costco", "Costco Wholesale"],
    "amazon":          ["Amazon", "Whole Foods Market"],
    "whole foods":     ["Whole Foods Market", "Amazon"],
    "home depot":      ["The Home Depot", "Home Depot"],
    "lowe's":          ["Lowe's", "Lowes"],
    "lowes":           ["Lowe's", "Lowes"],
    "cvs":             ["CVS Health", "CVS Pharmacy", "CVS"],
    "walgreens":       ["Walgreens", "Walgreens Boots Alliance"],
    "albertsons":      ["Albertsons", "Safeway", "Vons", "Jewel-Osco", "Shaw's"],
    "publix":          ["Publix"],
    "heb":             ["H-E-B", "HEB"],
    "h-e-b":           ["H-E-B", "HEB"],
    "tractor supply":  ["Tractor Supply Co", "Tractor Supply", "Tractor Supply Company"],
    "dollar general":  ["Dollar General"],
    "dollar tree":     ["Dollar Tree", "Family Dollar"],
    "five below":      ["Five Below"],
    "bed bath":        ["Bed Bath & Beyond", "Overstock"],
    "best buy":        ["Best Buy"],
    "rite aid":        ["Rite Aid"],
    "petco":           ["Petco"],
    "petsmart":        ["PetSmart"],
    "chewy":           ["Chewy"],
    "ulta":            ["Ulta Beauty", "Ulta"],
    "sephora":         ["Sephora"],
    "ace hardware":    ["Ace Hardware"],
    "menards":         ["Menards"],
    "bj's":            ["BJ's Wholesale Club", "BJs Wholesale"],
    "northern tool":   ["Northern Tool", "Northern Tool + Equipment"],
    "harbor freight":  ["Harbor Freight Tools", "Harbor Freight"],
  };

  const key = retailer.toLowerCase().trim();
  let companies = [retailer];
  for (const [alias, names] of Object.entries(aliases)) {
    if (key.includes(alias) || alias.includes(key)) {
      companies = names;
      break;
    }
  }

  const fetchPage = async (page) => {
    const body = {
      organization_names: companies,
      person_titles: personTitles,
      page,
      per_page: 50,
    };
    const r = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    return d?.people || d?.contacts || [];
  };

  try {
    const [p1, p2, p3] = await Promise.all([fetchPage(1), fetchPage(2), fetchPage(3)]);

    // Deduplicate by name + company
    const seen = new Set();
    const all = [...p1, ...p2, ...p3].filter(p => {
      if (!p.first_name || !p.last_name) return false;
      const key = `${p.first_name}${p.last_name}${p.organization_name}`.toLowerCase().replace(/\s/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const leads = all.map((p, i) => ({
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
    console.error("Search error:", e);
    return res.status(500).json({ error: "Search failed", leads: [] });
  }
}
