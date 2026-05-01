export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, pitch, brand, product, objection, response, previousObjections } = req.body;
  if (!action) return res.status(400).json({ error: "Missing action" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  let prompt;

  if (action === "generate") {
    const prev = (previousObjections || []).slice(-8).join(" | ");
    prompt = `You are a skeptical retail buyer at a major chain store. A CPG sales rep just pitched you their product.

Brand: ${brand || "their brand"}
Product: ${product || "their product"}
Pitch: ${pitch || "No pitch provided"}

Generate ONE realistic objection a retail buyer would raise right now. Draw from this wide range of objection types — pick one that fits the pitch context:

Price & Margins: price too high, margins too thin, no trade spend, competitor offers better deal, cost per unit uncompetitive
Shelf Space: category is full, no incremental shelf space, planogram locked, new items need to prove velocity first, reset not until Q3
Incumbent Competition: already have a similar product, exclusive deal with competitor, category captain controls assortment, brand loyalty to existing vendor
Distribution & Logistics: don't have national distribution, not in our DC, logistics not set up, can't ship to our stores, no 3PL relationship
Brand Awareness: brand too small, no consumer pull, no marketing budget, not a nationally recognized brand, no social proof
Timing: wrong time of year, category review not for 6 months, budget frozen until next quarter, just completed a major reset
Authority & Process: need sign-off from category director, committee decision, need to go through our vendor portal, legal review required
Proof & Validation: need velocity data from comparable retailers, no consumer research, need 90-day test results, no case studies
MOQ & Inventory: minimum order too high, can't commit to volume, too much inventory risk, need scan-based trading
Compliance & Admin: need to update insurance cert, product not in our system, need updated UPC info, sustainability requirements not met
E-commerce & Digital: not set up for our online portal, no digital assets ready, content not optimized for our site
Promotions: no promotional spend commitment, won't support slotting fees, need co-op advertising budget
Consumer Research: need category insights, no shopper research, need third-party validation, no test market data

${prev ? `Do NOT repeat or closely paraphrase these recent objections: ${prev}` : ""}

Vary the difficulty. Sometimes make it easy, sometimes hard.

Respond ONLY with valid JSON (no extra text):
{"objection":"[the objection in first person as the buyer, 1-3 natural spoken sentences]","type":"[short category, e.g. Price, Shelf Space, Distribution, Brand Awareness, Timing, etc]","difficulty":"Easy|Medium|Hard"}`;

  } else if (action === "score") {
    prompt = `You are an expert sales coach for CPG reps selling into retail accounts.

The retail buyer raised this objection:
"${objection}"

The sales rep responded:
"${response}"

Context:
Brand: ${brand || "their brand"}
Product: ${product || "their product"}

Evaluate the response across these dimensions:
- Empathy: did they acknowledge the buyer's concern before pushing back?
- Root cause: did they actually address the underlying issue, not just deflect?
- Value pivot: did they redirect toward concrete ROI, margin, or consumer demand?
- Specificity: were they specific with numbers/facts or vague?
- Confidence: did they sound credible and assertive without being pushy?

Score from 1-10. Be honest — don't inflate. A 10 means a top-performing rep gave a near-perfect answer.

Respond ONLY with valid JSON (no extra text):
{"score":7,"strengths":"[1-2 sentences on what they did well]","improvements":"[1-2 sentences on specifically what to improve]","modelAnswer":"[a strong 3-4 sentence model response to this exact objection for this brand/product — show them how a top rep would handle it]"}`;

  } else {
    return res.status(400).json({ error: "Unknown action. Use 'generate' or 'score'." });
  }

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      console.error("Anthropic error:", JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message || "Anthropic API error" });
    }

    const text = (data.content || []).map(b => b.text || "").join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "No JSON in response", raw: text.slice(0, 300) });

    try {
      return res.status(200).json(JSON.parse(match[0]));
    } catch (e) {
      return res.status(500).json({ error: "JSON parse failed", raw: match[0].slice(0, 300) });
    }
  } catch (e) {
    console.error("Objection API error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
