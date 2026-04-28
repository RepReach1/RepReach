export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { contacts } = req.body;
  if (!contacts || !Array.isArray(contacts)) return res.status(400).json({ error: "Missing contacts array" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  function inferFromTitle(title) {
    const t = (title || "").toLowerCase();
    if (t.includes("pet")) return "Pet Care";
    if (t.includes("beauty") || t.includes("personal care")) return "Beauty";
    if (t.includes("frozen")) return "Frozen Foods";
    if (t.includes("beverage") || t.includes("drink")) return "Beverages";
    if (t.includes("snack") || t.includes("food")) return "Food & Snacks";
    if (t.includes("health") || t.includes("wellness")) return "Health & Wellness";
    if (t.includes("apparel") || t.includes("cloth")) return "Apparel";
    if (t.includes("home") || t.includes("kitchen")) return "Home & Kitchen";
    if (t.includes("electronic") || t.includes("tech")) return "Electronics";
    if (t.includes("outdoor") || t.includes("garden") || t.includes("sport")) return "Outdoor & Sports";
    if (t.includes("toy") || t.includes("baby")) return "Toys & Baby";
    if (t.includes("dmm") || t.includes("divisional")) return "Multi-Category";
    if (t.includes("vp") || t.includes("director") || t.includes("head")) return "Senior Buying";
    return "General Merchandise";
  }

  const lookupOne = async (contact) => {
    const { id, firstName, lastName, title, retailer } = contact;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Search LinkedIn for this person's profile to find their specific product category or department.

Search query: site:linkedin.com "${firstName} ${lastName}" "${retailer}"

From their LinkedIn headline or job description, extract the specific buying category or department they are responsible for.

Examples of good outputs: "Pet Care", "Frozen Foods", "Beauty & Personal Care", "Outdoor & Garden", "Snacks & Beverages", "Health & Wellness", "Apparel", "Home & Kitchen", "Electronics", "Toys & Baby", "Floral", "Bakery & Deli", "Sporting Goods".

Their current title is: ${title} at ${retailer}

Reply with ONLY the category label — 2 to 4 words maximum. No explanation, no punctuation, just the category.`,
          }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(`LinkedIn lookup failed for ${firstName} ${lastName}:`, data?.error?.message);
        return { id, department: inferFromTitle(title) };
      }

      const textBlocks = (data.content || []).filter(b => b.type === "text");
      const rawText = textBlocks.map(b => b.text || "").join("").trim();

      // Clean up — strip common filler phrases
      const dept = rawText
        .replace(/^(based on|from|their|the|i found|according to|linkedin shows?|it appears?|category:|department:)\s*/i, "")
        .replace(/[.\n].*$/s, "") // take only first line/sentence
        .trim()
        .slice(0, 40);

      console.log(`${firstName} ${lastName} @ ${retailer} → ${dept}`);
      return { id, department: dept || inferFromTitle(title) };
    } catch (e) {
      console.error(`Error for ${firstName} ${lastName}:`, e.message);
      return { id, department: inferFromTitle(title) };
    }
  };

  // Process in batches of 3
  const results = {};
  const batchSize = 3;
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(lookupOne));
    for (const r of batchResults) results[r.id] = r.department;
  }

  return res.status(200).json({ departments: results });
}
