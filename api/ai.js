export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, data } = req.body;
  if (!type || !data) return res.status(400).json({ error: "Missing type or data" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const PROMPTS = {
    score: (d) => `You are a retail sales intelligence AI. Score this prospect for a CPG brand selling "${d.brandName || "consumer products"}".
Contact: ${d.firstName} ${d.lastName}, ${d.title} at ${d.company}. Seniority: ${d.seniority || "unknown"}. Department: ${d.department || "unknown"}. Company size: ${d.companySize ? d.companySize.toLocaleString() + " employees" : "unknown"}.
Score 0-100 based on: ICP fit (is this the right title/function?), seniority level (decision maker?), company fit (large enough retailer?), department relevance (do they buy this category?).
Return ONLY valid JSON:
{"score":85,"grade":"A","titleFit":90,"seniorityFit":85,"companyFit":80,"deptFit":75,"signals":["Buyer title matches ICP","Mid-level seniority - influencer","Large retailer - high volume potential"],"recommendation":"High priority. Direct outreach with category-specific value prop. Reference their department.","nextAction":"Send personalized cold email today"}`,

    callscript: (d) => `Generate a professional sales call script for a CPG sales rep.
Rep: ${d.repName || "Sales Rep"}. Brand: ${d.brandName}. Product: ${d.productDesc || d.brandName}.
Prospect: ${d.contactName}, ${d.contactTitle} at ${d.company}. Department: ${d.department || "Buying"}.
Create a complete, realistic call script with natural dialogue.
Return ONLY valid JSON:
{"opener":"Hi [Name], this is [Rep] from [Brand]...","hook":"...","discoveryQuestions":["What categories are you expanding this year?","How do you evaluate new vendors?","What does your review calendar look like?","What's performing best in [dept] right now?"],"pitch":"...","objectionHandlers":[{"objection":"We're not taking new vendors right now","response":"..."},{"objection":"Send me an email","response":"..."},{"objection":"We already have something similar","response":"..."}],"close":"Based on what you've shared...","voicemail":"Hi [Name], [Rep] from [Brand]. We've been helping retailers in [dept] increase velocity 23% — would love 15 min. I'll try again [day]. [Phone]."}`,

    objection: (d) => `You are an expert retail sales coach. Handle this objection professionally.
Objection: "${d.objection}"
Brand: ${d.brandName || "the brand"}. Product: ${d.productDesc || "CPG product"}. Buyer: ${d.buyerTitle || "Retail Buyer"} at ${d.company || "a major retailer"}.
Return ONLY valid JSON:
{"technique":"${d.objection.toLowerCase().includes("price") ? "ROI Reframe" : "Empathize & Pivot"}","response":"...","keyMessages":["Point 1","Point 2","Point 3"],"followUp":"...","avoidSaying":["Don't say this","Don't say that"]}`,

    pitch: (d) => `Generate a compelling CPG sales pitch for a retail buyer.
Brand: ${d.brandName}. Product: ${d.productDesc}. Target: ${d.targetBuyer || "Retail Buyer"} at ${d.targetRetailer || "major retailers"}. Differentiators: ${d.differentiators || "quality, innovation, consumer demand"}.
Return ONLY valid JSON:
{"thirtySecond":"...","sixtySecond":"...","elevatorHook":"...","proofPoints":["Stat or proof point 1","Stat or proof point 2","Stat or proof point 3"],"cta":"...","emailSubjectLines":["Subject line 1","Subject line 2","Subject line 3"]}`,

    meetingprep: (d) => `Prepare a retail sales rep for an upcoming buyer meeting.
Contact: ${d.contactName}, ${d.contactTitle} at ${d.company}. Meeting type: ${d.meetingType || "introductory call"}. Brand: ${d.brandName}. Product: ${d.productDesc || d.brandName}. Department: ${d.department || "General Merchandise"}.
Return ONLY valid JSON:
{"agenda":["Opening & rapport (2 min)","Discover their priorities (5 min)","Present brand/product (5 min)","Handle questions (3 min)","Next steps (2 min)"],"keyQuestions":["What categories are you most focused on growing?","What does a successful new brand launch look like for you?","How do you measure success at 90 days?","What's your review and reset calendar?","Who else should be involved in this decision?"],"talkingPoints":["Talking point 1","Talking point 2","Talking point 3"],"watchOuts":["Watch out for 1","Watch out for 2"],"closingGoal":"...","followUpPlan":"..."}`,

    meetingsummary: (d) => `Analyze these sales meeting notes and extract structured intelligence.
Contact: ${d.contactName || "Prospect"} at ${d.company || "Company"}. Date: ${d.meetingDate || "Today"}.
Notes: ${d.rawNotes}
Return ONLY valid JSON:
{"summary":"2-3 sentence summary of the meeting","keyInsights":["Insight 1","Insight 2","Insight 3"],"actionItems":["Action 1","Action 2"],"buyerActionItems":["What buyer said they would do"],"dealHealth":7,"dealHealthReason":"Why this score","nextStep":"Specific next step","nextStepDeadline":"Timeline","obstacles":["Any blockers mentioned"],"sentiment":"positive|neutral|negative","urgency":"high|medium|low"}`,

    accountresearch: (d) => `You are a retail industry analyst. Research and analyze this retailer for a CPG sales rep.
Company: ${d.companyName}. Industry: ${d.industry || "Retail"}. Focus category: ${d.category || "General"}.
Return ONLY valid JSON (based on general retail industry knowledge about major retailers):
{"overview":"3-4 sentence company overview","keyFacts":["Fact 1 - stores/reach","Fact 2 - revenue/size","Fact 3 - recent news/focus","Fact 4 - buying process"],"talkingPoints":["Relevant talking point 1","Relevant talking point 2","Relevant talking point 3"],"challenges":["Industry challenge they face 1","Challenge 2"],"opportunities":["Opportunity for your brand 1","Opportunity 2"],"buyingProcess":"How they typically evaluate new vendors","bestApproach":"Recommended approach for outreach","doNotDo":"Common mistakes when pitching this retailer"}`,

    sequencestep: (d) => `Generate content for step ${d.stepNumber} of a sales outreach sequence.
Step type: ${d.stepType}. Day: ${d.day}.
Rep: ${d.repName || "Sales Rep"}. Brand: ${d.brandName}. Product: ${d.productDesc || d.brandName}.
Contact: ${d.contactName}, ${d.contactTitle} at ${d.company}.
Previous steps: ${d.previousSteps || "None yet"}.
${d.stepType === "Email" ? `Write a ${d.stepNumber === 1 ? "cold outreach" : "follow-up"} email. Max ${d.stepNumber === 1 ? "120" : "80"} words body.` : d.stepType === "LinkedIn Message" ? "Write a LinkedIn direct message. Max 400 chars." : d.stepType === "Phone Call" ? "Write a call talk track with key talking points." : "Write task instructions."}
Return ONLY valid JSON:
{"subject":"${d.stepType === "Email" ? "Subject line here" : "N/A"}","body":"Message content here","instructions":"Quick note on goal/approach for this step","tone":"${d.stepNumber === 1 ? "professional" : "warmer"}"}`,

    battlecard: (d) => `Create a sales battlecard comparing a CPG brand against a competitor.
Your Brand: ${d.ourBrand}. Your Product: ${d.ourProduct}. Competitor: ${d.competitor}.
Return ONLY valid JSON:
{"ourStrengths":["Strength 1","Strength 2","Strength 3","Strength 4"],"competitorWeaknesses":["Their weakness 1","Their weakness 2","Their weakness 3"],"winThemes":["Key reason to choose you 1","Reason 2","Reason 3"],"objectionResponses":[{"objection":"We already work with [competitor]","response":"..."},{"objection":"[Competitor] is cheaper","response":"..."}],"talkTracks":{"discovery":"Question to ask that highlights your advantage","pitch":"Your key differentiator statement"},"avoidTopics":["Topic that puts you at disadvantage"],"proofPoints":["Data point or proof 1","Proof 2"]}`,

    icpscore: (d) => `Score these contacts against an Ideal Customer Profile for a CPG brand.
ICP: ${JSON.stringify(d.icp)}. Brand: ${d.brandName}. Product: ${d.productDesc || d.brandName}.
Contacts (first 20): ${JSON.stringify((d.contacts || []).slice(0, 20).map(c => ({ id: c.id, title: c.title, seniority: c.seniority, company: c.retailer, dept: c.department })))}
Score each 0-100. Return ONLY valid JSON:
{"scores":[{"id":"contact_id","score":85,"tier":"A","reason":"Short reason why good fit"}]}`,
  };

  const buildPrompt = PROMPTS[type];
  if (!buildPrompt) return res.status(400).json({ error: `Unknown type: ${type}` });

  try {
    const prompt = buildPrompt(data);
    const model = ["accountresearch", "battlecard", "callscript"].includes(type)
      ? "claude-sonnet-4-6"
      : "claude-haiku-4-5-20251001";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const raw = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: raw?.error?.message || "AI error", status: response.status });
    }

    const text = (raw.content || []).map(b => b.text || "").join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "No JSON in AI response", raw: text.slice(0, 300) });

    const result = JSON.parse(match[0]);
    return res.status(200).json({ result });

  } catch (e) {
    console.error("[ai.js]", e.message);
    return res.status(500).json({ error: e.message });
  }
}
