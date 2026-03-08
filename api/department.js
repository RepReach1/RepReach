export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { contacts } = req.body; // array of { id, firstName, lastName, title, retailer }
  if (!contacts || !Array.isArray(contacts)) return res.status(400).json({ error: "Missing contacts array" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  // Look up one contact at a time using web search
  const lookupOne = async (contact) => {
    const { id, firstName, lastName, title, retailer } = contact;
    const query = `${firstName} ${lastName} ${retailer} buyer category department`;

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
          max_tokens: 300,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Search for "${firstName} ${lastName}" who works at ${retailer} as a ${title}. 
Find what product category, department, or business unit they are responsible for buying/managing.
Examples: "Pet Care", "Frozen Foods", "Beauty & Personal Care", "Outdoor & Garden", "Electronics", "Snacks & Beverages", "Health & Wellness", "Apparel", "Home & Kitchen", etc.

Search query to use: ${query}

Reply with ONLY a short category label (2-4 words max). If you cannot find specific info, make your best inference from their title. Never say "Unknown".`
          }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(`Dept lookup failed for ${firstName} ${lastName}:`, data?.error?.message);
        return { id, department: inferFromTitle(title) };
      }

      // Extract text from response (could be after tool use)
      const textBlocks = (data.content || []).filter(b => b.type === "text");
      const rawText = textBlocks.map(b => b.text || "").join("").trim();

      // Clean up response — just want the category label
      const dept = rawText
        .replace(/^(the |their |responsible for |manages? |buying |department: |category: )/i, "")
        .replace(/\.$/, "")
        .trim()
        .slice(0, 40); // cap length

      return { id, department: dept || inferFromTitle(title) };
    } catch (e) {
      console.error(`Error for ${firstName} ${lastName}:`, e.message);
      return { id, department: inferFromTitle(title) };
    }
  };

  // Infer from title if search fails
  function inferFromTitle(title) {
    const t = (title || "").toLowerCase();
    if (t.includes("pet")) return "Pet Care";
    if (t.includes("beauty") || t.includes("personal care")) return "Beauty";
    if (t.includes("frozen")) return "Frozen Foods";
    if (t.includes("beverage") || t.includes("drink")) return "Beverages";
    if (t.includes("snack") || t.includes("food")) return "Food & Snacks";
    if (t.includes("health") || t.includes("wellness") || t.includes("pharma")) return "Health & Wellness";
    if (t.includes("apparel") || t.includes("cloth") || t.includes("fashion")) return "Apparel";
    if (t.includes("home") || t.includes("kitchen") || t.includes("house")) return "Home & Kitchen";
    if (t.includes("electronic") || t.includes("tech")) return "Electronics";
    if (t.includes("outdoor") || t.includes("garden") || t.includes("sport")) return "Outdoor & Sports";
    if (t.includes("toy") || t.includes("baby") || t.includes("kid")) return "Toys & Baby";
    if (t.includes("floral") || t.includes("garden")) return "Floral & Garden";
    if (t.includes("bakery") || t.includes("deli")) return "Bakery & Deli";
    if (t.includes("dmm") || t.includes("divisional")) return "Multi-Category";
    if (t.includes("vp") || t.includes("director") || t.includes("head")) return "Senior Buying";
    return "General Merchandise";
  }

  // Process in batches of 3 to avoid rate limits
  const results = {};
  const batchSize = 3;
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(lookupOne));
    for (const r of batchResults) results[r.id] = r.department;
  }

  return res.status(200).json({ departments: results });
}
