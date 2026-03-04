export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, category, retailerType } = req.body;
  if (!retailer && !retailerType) return res.status(400).json({ error: "Missing search params" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  const BUYER_WORDS = ["buyer", "merchant", "purchas", "category", "merchandis", "dmm", "divisional", "procurement", "sourcing"];

  const CATEGORY_RULES = {
    "Food & Beverage": {
      include: ["food", "beverage", "grocery", "snack", "bakery", "dairy", "frozen", "deli", "produce", "meat", "seafood", "candy", "confection", "center store", "perishable", "drink"],
      exclude: ["outdoor", "power", "hardware", "tool", "pet", "footwear", "shoe", "apparel", "clothing", "baby", "toy", "vitamin", "supplement", "beauty", "cosmetic", "electronics", "tech", "automotive", "sporting", "jewelry", "office"],
      searchTitles: ["food buyer", "grocery buyer", "beverage buyer", "frozen buyer", "snack buyer", "deli buyer", "center store buyer"],
    },
    "Health & Beauty": {
      include: ["health", "beauty", "personal care", "wellness", "skincare", "cosmetic", "hair", "otc", "pharmacy", "hygiene", "fragrance"],
      exclude: ["food", "beverage", "grocery", "outdoor", "power", "hardware", "tool", "pet", "shoe", "footwear", "baby", "toy", "automotive", "electronics", "sporting", "jewelry", "office"],
      searchTitles: ["health buyer", "beauty buyer", "personal care buyer", "wellness buyer", "OTC buyer", "skincare buyer"],
    },
    "Household & Cleaning": {
      include: ["household", "cleaning", "laundry", "paper", "chemical", "janitorial", "air care", "pest", "home care"],
      exclude: ["food", "beverage", "grocery", "pet", "footwear", "shoe", "apparel", "baby", "toy", "vitamin", "beauty", "cosmetic", "electronics", "automotive", "sporting", "jewelry", "office"],
      searchTitles: ["household buyer", "cleaning buyer", "laundry buyer", "home care buyer", "paper products buyer"],
    },
    "Home & Garden": {
      include: ["home", "garden", "lawn", "outdoor", "furniture", "decor", "bedding", "kitchen", "appliance", "lighting", "seasonal", "holiday", "patio"],
      exclude: ["food", "beverage", "grocery", "pet", "footwear", "shoe", "apparel", "clothing", "baby", "vitamin", "supplement", "beauty", "cosmetic", "pharmacy", "automotive", "jewelry", "office"],
      searchTitles: ["home buyer", "garden buyer", "lawn buyer", "outdoor buyer", "furniture buyer", "seasonal buyer", "appliance buyer"],
    },
    "Electronics": {
      include: ["electronic", "tech", "audio", "mobile", "device", "gaming", "camera", "computer", "wireless", "tv", "television"],
      exclude: ["food", "beverage", "grocery", "pet", "footwear", "shoe", "apparel", "clothing", "baby", "toy", "vitamin", "beauty", "cosmetic", "automotive", "sporting", "jewelry", "garden", "hardware", "tool"],
      searchTitles: ["electronics buyer", "tech buyer", "consumer electronics buyer", "audio buyer", "gaming buyer"],
    },
    "Toys & Games": {
      include: ["toy", "game", "play", "kids", "child", "juvenile", "infant", "baby", "learning"],
      exclude: ["food", "beverage", "grocery", "pet", "footwear", "shoe", "apparel", "vitamin", "beauty", "cosmetic", "electronics", "automotive", "sporting", "jewelry", "office", "garden", "hardware"],
      searchTitles: ["toy buyer", "games buyer", "kids buyer", "juvenile buyer", "baby buyer"],
    },
    "Apparel & Footwear": {
      include: ["apparel", "clothing", "footwear", "fashion", "softline", "shoe", "wear", "textile", "accessory", "intimates"],
      exclude: ["food", "beverage", "grocery", "pet", "baby", "toy", "vitamin", "beauty", "electronics", "automotive", "sporting", "garden", "hardware", "tool", "office"],
      searchTitles: ["apparel buyer", "clothing buyer", "footwear buyer", "fashion buyer", "softlines buyer"],
    },
    "Sporting Goods & Outdoors": {
      include: ["sporting", "sport", "fitness", "athletic", "recreation", "outdoor", "camping", "hunting", "fishing", "exercise", "gym"],
      exclude: ["food", "beverage", "grocery", "pet", "footwear", "shoe", "apparel", "clothing", "baby", "toy", "vitamin", "beauty", "cosmetic", "automotive", "jewelry", "office", "electronics"],
      searchTitles: ["sporting goods buyer", "fitness buyer", "outdoor buyer", "recreation buyer", "athletic buyer"],
    },
    "Automotive": {
      include: ["automotive", "auto", "car", "motor", "tire", "vehicle", "accessory", "parts"],
      exclude: ["food", "beverage", "grocery", "pet", "footwear", "apparel", "baby", "toy", "vitamin", "beauty", "electronics", "sporting", "garden", "hardware", "office", "jewelry"],
      searchTitles: ["automotive buyer", "auto parts buyer", "car accessories buyer", "tire buyer"],
    },
    "Pet": {
      include: ["pet", "animal", "dog", "cat", "bird", "fish", "aquatic"],
      exclude: ["food", "beverage", "grocery", "footwear", "apparel", "baby", "toy", "vitamin", "beauty", "electronics", "automotive", "sporting", "garden", "hardware", "office", "jewelry"],
      searchTitles: ["pet buyer", "pet food buyer", "animal care buyer", "pet supplies buyer"],
    },
    "Baby & Kids": {
      include: ["baby", "infant", "kid", "toy", "juvenile", "child", "toddler", "nursery"],
      exclude: ["food", "beverage", "grocery", "pet", "footwear", "apparel", "vitamin", "beauty", "automotive", "sporting", "garden", "hardware", "office", "jewelry", "electronics"],
      searchTitles: ["baby buyer", "toy buyer", "infant buyer", "kids buyer", "juvenile buyer"],
    },
    "Office & School Supplies": {
      include: ["office", "school", "stationery", "supply", "paper", "writing", "education"],
      exclude: ["food", "beverage", "grocery", "pet", "footwear", "apparel", "baby", "toy", "vitamin", "beauty", "electronics", "automotive", "sporting", "garden", "hardware", "jewelry"],
      searchTitles: ["office supplies buyer", "school supplies buyer", "stationery buyer"],
    },
    "Jewelry & Accessories": {
      include: ["jewelry", "accessory", "watch", "handbag", "luggage", "sunglasses", "optical"],
      exclude: ["food", "beverage", "grocery", "pet", "baby", "toy", "vitamin", "beauty", "electronics", "automotive", "sporting", "garden", "hardware", "office", "apparel", "clothing"],
      searchTitles: ["jewelry buyer", "accessories buyer", "watch buyer", "handbag buyer"],
    },
    "Grocery & Gourmet": {
      include: ["grocery", "gourmet", "food", "specialty", "organic", "natural", "center store", "pantry"],
      exclude: ["outdoor", "power", "hardware", "tool", "pet", "footwear", "apparel", "baby", "toy", "vitamin", "supplement", "beauty", "cosmetic", "electronics", "automotive", "sporting", "jewelry", "office"],
      searchTitles: ["grocery buyer", "gourmet buyer", "specialty food buyer", "natural food buyer"],
    },
    "Tools & Hardware": {
      include: ["tool", "hardware", "power", "hand tool", "equipment", "building", "construction", "lawn", "garden"],
      exclude: ["food", "beverage", "grocery", "pet", "footwear", "apparel", "clothing", "baby", "toy", "vitamin", "beauty", "cosmetic", "jewelry", "office", "automotive"],
      searchTitles: ["tools buyer", "hardware buyer", "power tools buyer", "equipment buyer", "outdoor power buyer"],
    },
  };

  const rules = category ? CATEGORY_RULES[category] : null;
  const personTitles = rules?.searchTitles || [
    "buyer", "merchant", "category manager", "purchasing manager",
    "senior buyer", "divisional merchandise manager", "DMM", 
    "director of merchandising", "VP merchandising", "sourcing manager"
  ];

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
      if (!BUYER_WORDS.some(w => title.includes(w))) return false;
      if (!rules) return true;
      if (rules.exclude.some(kw => title.includes(kw))) return false;
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
