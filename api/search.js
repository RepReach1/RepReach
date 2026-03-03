export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, category, retailerType } = req.body;
  if (!retailer && !retailerType) return res.status(400).json({ error: "Missing search params" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  // Buyer-type words — title must contain at least one
  const BUYER_WORDS = ["buyer", "merchant", "purchas", "category", "merchandis", "dmm", "divisional", "procurement", "sourcing"];

  // For each category: INCLUDE keywords (title must match at least one)
  // and EXCLUDE keywords (title must NOT match any — these are clearly other categories)
  const CATEGORY_RULES = {
    "Generators & Power Equipment": {
      include: ["power", "generator", "outdoor", "hardware", "tool", "lawn", "garden", "seasonal", "electric", "equipment"],
      exclude: ["food", "beverage", "grocery", "beauty", "cosmetic", "apparel", "clothing", "shoe", "footwear", "baby", "infant", "pet", "vitamin", "supplement", "pharmacy", "jewelry", "optical", "floral", "electronics", "tech", "sporting", "automotive", "toy"],
      searchTitles: ["outdoor power buyer", "hardware buyer", "power equipment buyer", "seasonal buyer", "tools buyer", "lawn garden buyer"],
    },
    "Outdoor & Hardware": {
      include: ["outdoor", "hardware", "lawn", "garden", "patio", "seasonal", "tool", "power", "equipment"],
      exclude: ["food", "beverage", "grocery", "beauty", "cosmetic", "apparel", "clothing", "shoe", "baby", "pet", "vitamin", "pharmacy", "jewelry", "floral", "electronics", "tech", "automotive", "toy"],
      searchTitles: ["outdoor buyer", "hardware buyer", "lawn garden buyer", "seasonal buyer", "tools buyer"],
    },
    "Home Improvement": {
      include: ["home", "hardware", "building", "improvement", "paint", "floor", "plumbing", "electrical", "seasonal", "construction"],
      exclude: ["food", "beverage", "grocery", "beauty", "cosmetic", "apparel", "clothing", "shoe", "baby", "pet", "vitamin", "pharmacy", "jewelry", "floral", "electronics", "tech", "automotive", "toy", "sporting"],
      searchTitles: ["home improvement buyer", "hardware buyer", "building materials buyer", "home buyer"],
    },
    "Food & Beverage": {
      include: ["food", "beverage", "grocery", "snack", "bakery", "dairy", "frozen", "deli", "produce", "drink", "meat", "seafood", "candy", "confection", "center store", "perishable"],
      exclude: ["outdoor", "power", "hardware", "tool", "automotive", "apparel", "clothing", "footwear", "shoe", "electronics", "tech", "sporting", "pet", "baby", "toy", "jewelry", "vitamin", "supplement", "beauty", "cosmetic", "home improvement", "garden", "lawn", "floral", "optical"],
      searchTitles: ["food buyer", "grocery buyer", "beverage buyer", "frozen buyer", "snack buyer", "deli buyer", "dairy buyer", "center store buyer"],
    },
    "Health & Beauty": {
      include: ["health", "beauty", "personal care", "wellness", "skincare", "cosmetic", "hair", "otc", "pharmacy", "hygiene", "fragrance"],
      exclude: ["food", "beverage", "grocery", "outdoor", "power", "hardware", "tool", "automotive", "apparel", "shoe", "toy", "baby", "pet", "sporting", "electronics", "garden", "lawn"],
      searchTitles: ["health buyer", "beauty buyer", "personal care buyer", "wellness buyer", "OTC buyer"],
    },
    "Supplements & Vitamins": {
      include: ["vitamin", "supplement", "nutrition", "nutraceutical", "wellness", "health"],
      exclude: ["food", "beverage", "grocery", "outdoor", "power", "hardware", "apparel", "shoe", "toy", "baby", "automotive", "sporting", "electronics", "garden", "lawn", "beauty", "cosmetic"],
      searchTitles: ["vitamin buyer", "supplement buyer", "nutrition buyer", "health buyer", "wellness buyer"],
    },
    "Pet": {
      include: ["pet", "animal", "dog", "cat", "bird", "fish"],
      exclude: ["food", "beverage", "apparel", "shoe", "electronics", "automotive", "outdoor power", "hardware", "baby", "vitamin", "beauty", "cosmetic", "sporting", "toy"],
      searchTitles: ["pet buyer", "pet food buyer", "animal care buyer"],
    },
    "Baby & Kids": {
      include: ["baby", "infant", "kid", "toy", "juvenile", "child", "toddler"],
      exclude: ["food", "beverage", "outdoor", "power", "hardware", "tool", "automotive", "beauty", "cosmetic", "pet", "vitamin", "sporting", "electronics"],
      searchTitles: ["baby buyer", "toy buyer", "infant buyer", "kids buyer", "juvenile buyer"],
    },
    "Apparel & Footwear": {
      include: ["apparel", "clothing", "footwear", "fashion", "softline", "shoe", "wear", "textile", "accessory"],
      exclude: ["food", "beverage", "grocery", "outdoor", "power", "hardware", "tool", "automotive", "pet", "vitamin", "pharmacy", "electronics", "sporting", "baby"],
      searchTitles: ["apparel buyer", "clothing buyer", "footwear buyer", "fashion buyer", "softlines buyer"],
    },
    "Electronics": {
      include: ["electronic", "tech", "audio", "mobile", "device", "gaming", "camera", "computer", "wireless"],
      exclude: ["food", "beverage", "grocery", "beauty", "cosmetic", "apparel", "clothing", "baby", "pet", "vitamin", "pharmacy", "floral", "optical", "outdoor", "hardware", "tool"],
      searchTitles: ["electronics buyer", "tech buyer", "consumer electronics buyer", "audio buyer", "gaming buyer"],
    },
    "Natural / Organic": {
      include: ["natural", "organic", "specialty food", "better for you", "wellness", "clean label"],
      exclude: ["outdoor", "power", "hardware", "tool", "automotive", "apparel", "shoe", "electronics", "sporting", "pet", "baby", "toy", "jewelry"],
      searchTitles: ["natural foods buyer", "organic buyer", "specialty food buyer", "natural buyer"],
    },
  };

  const rules = category ? CATEGORY_RULES[category] : null;
  const personTitles = rules?.searchTitles || ["buyer", "merchant", "category manager", "purchasing manager"];

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
      if (!BUYER_WORDS.some(w => title.includes(w))) return false;

      // No category filter — return all buyer types
      if (!rules) return true;

      // Must NOT match any exclude keyword
      if (rules.exclude.some(kw => title.includes(kw))) return false;

      // Must match at least one include keyword
      return rules.include.some(kw => title.includes(kw));
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
