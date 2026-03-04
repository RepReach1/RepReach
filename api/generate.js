export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in environment variables" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message || "Anthropic API error", status: response.status });
    }

    const text = (data.content || []).map(b => b.text || "").join("");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "No JSON in response", raw: text.slice(0, 300) });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ result: JSON.stringify(parsed) });
    } catch (e) {
      return res.status(500).json({ error: "JSON parse failed", raw: jsonMatch[0].slice(0, 300) });
    }

  } catch (e) {
    console.error("Generate error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
