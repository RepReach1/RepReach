export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, category, retailerType } = req.body;
  if (!retailer && !retailerType) return res.status(400).json({ error: "Missing search params" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  // For each category, define which OTHER categories are clearly unrelated
  // Anyone whose title matches an unrelated category gets excluded
  const UNRELATED_KEYWORDS = {
    "Generators & Power Equipment": ["food", "beverage", "grocery", "beauty", "cosmetic", "apparel", "clothing", "fashion", "baby", "infant", "pet", "vitamin", "supplement", "pharmacy", "jewelry", "optical", "floral"],
    "Outdoor & Hardware":           ["food", "beverage", "grocery", "beauty", "cosmetic", "apparel", "clothing", "baby", "infant", "pet", "vitamin", "supplement", "pharmacy", "jewelry", "optical", "floral"],
    "Home Improvement":             ["food", "beverage", "grocery", "beauty", "cosmetic", "apparel", "clothing", "baby", "infant", "pet", "vitamin", "supplement", "pharmacy", "jewelry", "optical", "floral"],
    "Food & Beverage":              ["outdoor", "power", "hardware", "tool", "automotive", "apparel", "clothing", "footwear", "shoe", "electronics", "tech", "sporting", "fitness", "pet", "baby", "toy", "jewelry"],
    "Health & Beauty":              ["food", "beverage", "grocery", "outdoor", "power", "hardware", "tool", "automotive", "apparel", "shoe", "footwear", "toy", "baby", "pet", "sporting"],
    "Supplements & Vitamins":       ["food", "beverage", "grocery", "outdoor", "power", "hardware", "apparel", "shoe", "toy", "baby", "automotive", "sporting", "electronics"],
    "Pet":                          ["food", "beverage", "apparel", "shoe", "electronics", "automotive", "outdoor", "power", "hardware", "baby", "vitamin", "beauty", "cosmetic"],
    "Baby & Kids":                  ["food", "beverage", "outdoor", "power", "hardware", "tool", "automotive", "beauty", "cosmetic", "pet", "vitamin", "sporting"],
    "Apparel & Footwear":           ["food", "beverage", "grocery", "outdoor", "power", "hardware", "tool", "automotive", "pet", "vitamin", "pharmacy", "electronics", "sporting"],
    "Electronics":                  ["food", "beverage", "grocery", "beauty", "cosmetic", "apparel", "clothing", "baby", "pet", "vitamin", "pharmacy", "floral", "optical"],
    "Natural / Organic":            ["outdoor", "power", "hardware", "tool", "automotive", "apparel", "shoe", "electronics", "sporting", "pet", "baby", "toy"],
  };

  // Buyer-type words — title must contain at least one
  const BUYER_WORDS = ["buyer", "merchant", "purchas", "category", "merchandis", "dmm", "divisional", "procurement", "sourcing"];

  // Build search titles — broad enough to catch related roles
  const CATEGORY_SEARCH_TITLES = {
    "Generators & Power Equipment": ["outdoor power buyer", "hardware buyer", "power equipment buyer", "seasonal buyer", "lawn garden buyer", "tools buyer"],
    "Outdoor & Hardware":           ["outdoor buyer", "hardware buyer", "lawn garden buyer", "seasonal buyer", "tools buyer", "patio buyer"],
    "Home Improvement":             ["home improvement buyer", "hardware buyer", "building materials buyer", "home buyer", "seasonal buyer"],
    "Food & Beverage":              ["food buyer", "grocery buyer", "beverage buyer", "frozen buyer", "dairy buyer", "snack buyer", "deli buyer"],
    "Health & Beauty":              ["health buyer", "beauty buyer", "personal care buyer", "wellness buyer", "OTC buyer", "skincare buyer"],
    "Supplements & Vitamins":       ["vitamin buyer", "supplement buyer", "nutrition buyer", "health buyer", "wellness buyer"],
    "Pet":                          ["pet buyer", "pet food buyer", "animal care buyer"],
    "Baby & Kids":                  ["baby buyer", "toy buyer", "infant buyer", "kids buyer", "juvenile buyer"],
    "Apparel & Footwear":           ["apparel buyer", "clothing buyer", "footwear buyer", "fashion buyer", "softlines buyer"],
    "Electronics":                  ["electronics buyer", "tech buyer", "consumer electronics buyer", "audio buyer", "gaming buyer"],
    "Natural / Organic":            ["natural foods buyer", "organic buyer", "specialty food buyer", "natural buyer"],
  };

  const personTitles = category && CATEGORY_SEARCH_TITLES[category]
    ? CATEGORY_SEARCH_TITLES[category]
    : ["buyer", "merchant", "category manager", "purchasing manager"];

  const unrelated = category ? (UNRELATED_KEYWORDS[category] || []) : [];

  // Resolve companies
  const aliases = {
    walmart:       ["Walmart", "Sam's Club"],
    "sam's club":  ["Sam's Club", "Walmart"],
    kroger:        ["Kroger", "Fred Meyer", "Ralphs", "Harris Teeter", "King Soopers"],
    amazon:        ["Amazon", "Whole Foods"],
    albertsons:    ["Albertsons", "Safeway", "Vons", "Jewel-Osco"],
  };
  const retailerTypeMap = {
    mass:             ["Walmart", "Target"],
    club:             ["Sam's Club", "Costco", "BJ's Wholesale"],
    grocery:          ["Kroger", "Albertsons", "Publix", "Safeway", "Whole Foods"],
    drug:             ["CVS", "Walgreens", "Rite Aid"],
    home_improvement: ["Home Depot", "Lowe's", "Menards"],
    specialty:        ["Northern Tool", "Tractor Supply", "Harbor Freight", "Ace Hardware"],
    dollar:           ["Dollar General", "Dollar Tree", "Five Below"],
    ecomm:            ["Amazon"],
  };

  let companies = [];
  if (retailer) {
    companies = [retailer];
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
        q_keywords: personTitles.slice(0, 4).join(" "),
        organization_names: companies,
        person_titles: personTitles,
        page: 1,
        per_page: 25,
      }),
    });

    const data = await searchRes.json();
    const people = data?.people || data?.contacts || [];

    const filtered = people.filter(p => {
      if (!p.first_name || !p.last_name || !p.organization_name) return false;
      const title = (p.title || "").toLowerCase();

      // Must be a buyer-type role
      const hasBuyerWord = BUYER_WORDS.some(w => title.includes(w));
      if (!hasBuyerWord) return false;

      // Exclude if title clearly belongs to an unrelated category
      const isUnrelated = unrelated.some(kw => title.includes(kw));
      if (isUnrelated) return false;

      return true;
    });

    const leads = filtered.map((p, i) => ({
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
      confidence: 88,
      context: `Apollo verified buyer at ${p.organization_name}. Title: ${p.title || "Buyer"}.`,
      linkedin: p.linkedin_url || null,
      apolloEnriched: true,
      apolloSource: true,
    }));

    return res.status(200).json({ leads, total: leads.length });
  } catch (e) {
    console.error("Apollo search error:", e);
    return res.status(500).json({ error: "Apollo search failed", leads: [] });
  }
}
