export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { query, brand, product } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

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
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{
          role: "user",
          content: `Research "${query}" for a CPG sales rep${brand ? ` selling ${brand}${product ? ` (${product})` : ""}` : ""}.

Provide actionable intelligence they can use before a buyer meeting. Cover:
1. What this retailer/buyer prioritizes when evaluating new CPG vendors
2. How their buying process works (vendor portal, category review cadence)
3. Key categories they are actively growing or looking to add right now
4. Recent company news or initiatives a rep should know about
5. Specific practical tips for getting a meeting and making a strong impression

Respond ONLY with valid JSON (no extra text):
{"summary":"[2-3 sentence overview of this target]","priorities":["...","...","..."],"process":["...","..."],"categories":["...","...","..."],"recentNews":"[1-2 sentences of relevant recent news]","tips":["...","...","..."]}`,
        }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Anthropic error:", JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message || "Anthropic API error" });
    }

    const text = (data.content || []).map(b => b.type === "text" ? b.text : "").join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "No JSON in response", raw: text.slice(0, 300) });

    try {
      return res.status(200).json(JSON.parse(match[0]));
    } catch (e) {
      return res.status(500).json({ error: "JSON parse failed", raw: match[0].slice(0, 300) });
    }
  } catch (e) {
    console.error("Intelligence error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
