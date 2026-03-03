export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Anthropic API error:", data.error);
      return res.status(500).json({ error: data.error.message || "API error" });
    }

    const text = (data.content || []).map(b => b.text || "").join("");

    // Try to extract JSON even if wrapped in markdown or extra text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", text.slice(0, 500));
      return res.status(500).json({ error: "No JSON in response", raw: text.slice(0, 500) });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ result: JSON.stringify(parsed) });
    } catch (e) {
      console.error("JSON parse failed:", jsonMatch[0].slice(0, 500));
      return res.status(500).json({ error: "JSON parse failed", raw: jsonMatch[0].slice(0, 500) });
    }

  } catch (e) {
    console.error("Generate error:", e);
    return res.status(500).json({ error: "Generation failed: " + e.message });
  }
}
