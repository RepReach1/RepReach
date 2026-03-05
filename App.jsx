import { useState, useCallback, useEffect } from "react";

/* ─── normalize: strips apostrophes, special chars, lowercases ─ */
const norm = (s = "") =>
  s.toLowerCase()
   .replace(/['\u2018\u2019]/g, "")
   .replace(/[^a-z0-9\s&]/g, " ")
   .replace(/\s+/g, " ")
   .trim();

const RETAILER_TYPES = [
  { id:"bigbox",      label:"Big Box",               icon:"🏬", ex:"Walmart, Target, Costco, Sam's Club" },
  { id:"grocery",     label:"Grocery / Supermarket", icon:"🛒", ex:"Kroger, Albertsons, Publix, H-E-B" },
  { id:"club",        label:"Club / Warehouse",      icon:"📦", ex:"Costco, BJ's Wholesale, Sam's Club" },
  { id:"drugstore",   label:"Drug / Pharmacy",       icon:"💊", ex:"CVS, Walgreens, Rite Aid" },
  { id:"dollar",      label:"Dollar / Value",        icon:"💲", ex:"Dollar General, Dollar Tree, Five Below" },
  { id:"specialty",   label:"Specialty Retail",      icon:"🏪", ex:"Sephora, Ulta, GNC, Vitamin Shoppe" },
  { id:"sporting",    label:"Sporting Goods",        icon:"⚽", ex:"REI, Dick's Sporting, Academy, Bass Pro" },
  { id:"home",        label:"Home Improvement",      icon:"🔨", ex:"Home Depot, Lowe's, Ace Hardware" },
  { id:"dept",        label:"Department Store",      icon:"🏢", ex:"Macy's, Nordstrom, Dillard's, Kohl's" },
  { id:"offprice",    label:"Off-Price / Outlet",    icon:"🏷️", ex:"TJ Maxx, Marshalls, Ross, Burlington" },
  { id:"convenience", label:"Convenience / Gas",     icon:"⛽", ex:"7-Eleven, Wawa, Sheetz, Circle K" },
  { id:"natural",     label:"Natural / Organic",     icon:"🌿", ex:"Whole Foods, Sprouts, Natural Grocers" },
  { id:"ecomm",       label:"Online / eCommerce",    icon:"🖥️", ex:"Amazon, Chewy, Wayfair, Instacart" },
  { id:"wholesale",   label:"Wholesale / Distributor",icon:"🏭",ex:"KeHE, UNFI, McLane, C&S Wholesale" },
  { id:"apparel",     label:"Apparel / Fashion",     icon:"👗", ex:"Gap, Old Navy, H&M, Urban Outfitters" },
  { id:"regional",    label:"Regional Grocery",      icon:"📍", ex:"Meijer, Wegmans, Hy-Vee, Fred Meyer" },
  { id:"pet",         label:"Pet Retail",            icon:"🐾", ex:"PetSmart, Petco, Pet Supplies Plus" },
  { id:"auto",        label:"Auto Parts",            icon:"🚗", ex:"AutoZone, O'Reilly, Advance Auto" },
  { id:"craft",       label:"Craft / Hobby",         icon:"🎨", ex:"Hobby Lobby, Michaels, JOANN" },
  { id:"electronics", label:"Electronics",           icon:"📱", ex:"Best Buy, Micro Center, B&H Photo" },
];

const EMAIL_TONES = [
  { id:"confident",    label:"Confident & Direct",    icon:"💼", desc:"Assertive, no-nonsense. Gets to the point fast and owns the ask." },
  { id:"consultative", label:"Consultative",          icon:"🤝", desc:"Positions you as a trusted advisor. Leads with insight, not product." },
  { id:"warm",         label:"Warm & Relationship",   icon:"☀️", desc:"Personable and genuine. Builds connection before making the ask." },
  { id:"urgency",      label:"Subtle Urgency",        icon:"⚡", desc:"Creates quiet FOMO. Makes sitting on this feel like a missed window." },
  { id:"storytelling", label:"Story-Driven",          icon:"📖", desc:"Opens with a compelling narrative about the brand or consumer demand." },
  { id:"premium",      label:"Premium & Elevated",    icon:"✨", desc:"Sophisticated and polished. Speaks to prestige and brand equity." },
];

const PRODUCT_CATEGORIES = [
  "Food & Beverage",
  "Health & Beauty",
  "Household & Cleaning",
  "Home & Garden",
  "Electronics",
  "Toys & Games",
  "Apparel & Footwear",
  "Sporting Goods & Outdoors",
  "Automotive",
  "Pet",
  "Baby & Kids",
  "Office & School Supplies",
  "Jewelry & Accessories",
  "Grocery & Gourmet",
  "Tools & Hardware",
];

/* ══════════════════════════════════════════════
   LEAD DATABASE — every contact has email + phone
   ══════════════════════════════════════════════ */
const ALL_LEADS = [];

/* ── search ─────────────────────────────────────── */
/* ── subcategory → parent category map ─────────── */
const SUBCATEGORY_MAP = {
  "Food & Beverage":            ["Food & Beverage", "Grocery & Gourmet"],
  "Health & Beauty":            ["Health & Beauty"],
  "Household & Cleaning":       ["Household & Cleaning"],
  "Home & Garden":              ["Home & Garden", "Tools & Hardware"],
  "Electronics":                ["Electronics"],
  "Toys & Games":               ["Toys & Games", "Baby & Kids"],
  "Apparel & Footwear":         ["Apparel & Footwear"],
  "Sporting Goods & Outdoors":  ["Sporting Goods & Outdoors", "Tools & Hardware", "Home & Garden"],
  "Automotive":                 ["Automotive"],
  "Pet":                        ["Pet"],
  "Baby & Kids":                ["Baby & Kids", "Toys & Games"],
  "Office & School Supplies":   ["Office & School Supplies"],
  "Jewelry & Accessories":      ["Jewelry & Accessories"],
  "Grocery & Gourmet":          ["Grocery & Gourmet", "Food & Beverage"],
  "Tools & Hardware":           ["Tools & Hardware", "Home & Garden", "Sporting Goods & Outdoors"],
};

function getCategoryMatches(cat) {
  if (!cat) return [];
  return SUBCATEGORY_MAP[cat] || [cat];
}

// Parent company aliases — searching the parent shows all subsidiaries
const PARENT_ALIASES = {
  walmart:   ["walmart", "sams", "sam s club"],
  kroger:    ["kroger", "fred meyer", "ralphs", "harris teeter", "smith", "king soopers", "fry", "dillons", "pay less", "mariano"],
  albertsons:["albertsons", "safeway", "vons", "jewel", "shaw", "acme", "tom thumb", "randalls", "pavilions"],
  ahold:     ["stop shop", "giant", "food lion", "hannaford"],
  amazon:    ["amazon", "whole foods"],
};

function matchesRetailer(lead, q) {
  const r = norm(lead.retailer);
  // Check direct match
  if (r.includes(q)) return true;
  // Check parent company aliases
  for (const [, subsidiaries] of Object.entries(PARENT_ALIASES)) {
    if (subsidiaries.some(s => q.includes(s) || s.includes(q))) {
      if (subsidiaries.some(s => r.includes(s))) return true;
    }
  }
  return false;
}

function titleMatchesCategory(title, categoryMatches) {
  const t = norm(title);
  // Extract keywords from category match list and check if title contains them
  const keywords = categoryMatches.flatMap(c => 
    norm(c).split(/[\s&,]+/).filter(w => w.length > 3)
  );
  return keywords.some(kw => t.includes(kw));
}

function searchLeads({ retailerName, selectedRetailerTypes, productCategory }) {
  let results = [...ALL_LEADS];

  // Filter by retailer name or retailer type
  if (retailerName.trim()) {
    const q = norm(retailerName);
    results = results.filter(l => matchesRetailer(l, q));
  } else if (selectedRetailerTypes.length) {
    results = results.filter(l => selectedRetailerTypes.includes(l.retailerType));
  }

  // Sort: category matches (via tags OR title) to the top, then by confidence
  if (productCategory) {
    const matches = getCategoryMatches(productCategory);
    results.sort((a, b) => {
      // Score: 0 = strong category tag match, 1 = title keyword match, 2 = no match
      const score = (lead) => {
        if (lead.categories.some(c => matches.includes(c))) return 0;
        if (titleMatchesCategory(lead.title, matches)) return 1;
        return 2;
      };
      const diff = score(a) - score(b);
      if (diff !== 0) return diff;
      return b.confidence - a.confidence;
    });
  } else {
    results.sort((a, b) => b.confidence - a.confidence);
  }

  return results;
}

/* ── Claude email generation ────────────────────── */
async function generateEmail({ lead, repName, brandName, productCategory, productDesc, uniqueAngle, emailTone }) {
  const rtLabel = RETAILER_TYPES.find((r) => r.id === lead.retailerType)?.label || lead.retailerType;
  const toneGuide = {
    confident:    "TONE DIRECTIVE — Confident & Direct: Be assertive and decisive. No hedging, no softening. Open with a strong, declarative statement. Get to the value fast. The ask should feel inevitable, not tentative.",
    consultative: "TONE DIRECTIVE — Consultative: Lead with a sharp insight about their category or business before mentioning the product. Position the rep as a knowledgeable peer, not a vendor. The product is a natural conclusion to the insight, not the opening pitch.",
    warm:         "TONE DIRECTIVE — Warm & Relationship-Driven: Write with genuine warmth and human connection. Acknowledge the buyer as a real person, not just a title. The email should feel like it came from someone who genuinely admires what they're building and wants to be part of it.",
    urgency:      "TONE DIRECTIVE — Subtle Urgency: Create a quiet sense that this moment matters. Hint that momentum is building, that other retailers are paying attention, that the window to be first is open — but don't be heavy-handed. Let the urgency feel earned.",
    storytelling: "TONE DIRECTIVE — Story-Driven: Open with a brief, vivid narrative — a consumer moment, a brand origin detail, or a market shift that makes the opportunity feel real and human. The story should create a 'this makes sense' feeling before the product is even fully introduced.",
    premium:      "TONE DIRECTIVE — Premium & Elevated: Every word should feel deliberate and refined. No casual language, no filler. The email should feel like it belongs in a boardroom. Position the brand as something exceptional that deserves a place in this retailer's most curated assortment.",
  };
  const activeTone = toneGuide[emailTone] || toneGuide.confident;
  const prompt = `You are a world-class retail sales strategist and copywriter. Your job is to write cold outreach emails so compelling, so well-positioned, and so tailored to the buyer that saying no feels like leaving money on the table. Every email must make the product feel like an obvious, effortless win for the retailer.

─── TONE DIRECTIVE ───────────────────────────────────────────
${activeTone}

─── SENDER INFORMATION ───────────────────────────────────────
Sales Rep: ${repName || "the representative"}
Brand / Product: ${brandName}
Category: ${productCategory}
Product Overview: ${productDesc}
Key Differentiators: ${uniqueAngle || "strong margins, proven consumer demand, retail-ready packaging"}

─── RECIPIENT INFORMATION ────────────────────────────────────
Name: ${lead.firstName} ${lead.lastName}
Title: ${lead.title}
Retailer: ${lead.retailer} (${rtLabel})
Category Responsibility: ${lead.categories.join(", ")}
Buyer Intelligence: ${lead.context}

─── WHAT MAKES A GREAT EMAIL ────────────────────────────────
The goal is not just to introduce the product — it is to make the buyer feel like they would be missing out if they didn't take the next step. The email should create a quiet sense of urgency and inevitability. By the time they finish reading, they should think: "This fits. I need to learn more."

TONE:
- Confident and assured, never desperate or salesy
- Warm but professional — like a trusted industry colleague sharing a real opportunity
- Subtly aspirational — the buyer should feel they are being let in on something worth knowing
- Never pushy, never hollow, never generic

PERSUASION PRINCIPLES:
- Lead with the buyer's world, not the product. Reference their retailer's positioning, their category's trajectory, or their shoppers' evolving needs. Make them feel seen.
- Paint a picture of the opportunity — what does having this product on shelf do for their category, their member/customer, their differentiation?
- Use desire language over data language. Instead of citing numbers, describe the momentum, the pull, the demand signal. Words like "reordering before the shelf is empty," "shoppers seeking it out by name," "a gap your category is ready to fill" — evocative, not numerical.
- Make the ask feel natural, not transactional. The close should feel like the obvious next step, not a sales push.

STRUCTURE:
- Subject line: Intriguing, professional, under 55 characters. Specific to their retailer or category. Should spark curiosity.
- Opening: Reference something true and relevant about their category direction, their shopper, or their retailer's strategy. Make them nod. Never "I hope this finds you well."
- Body (2–3 sentences): Connect the brand to a real opportunity in their business. Describe the consumer demand and fit in vivid, credible terms — no raw numbers, no percentages, no units-per-store stats. Make the fit feel undeniable.
- Close: A single, effortless ask — a short call, a sample, or a sell sheet. Frame it as a chance to explore, not a commitment.
- Sign-off: "Best regards," or "Warm regards," with rep name and brand.

ABSOLUTE PROHIBITIONS:
- No specific numbers, percentages, dollar amounts, or unit figures of any kind
- No "I hope this email finds you well" or any variation
- No "I wanted to reach out" or "I am writing to"
- No "innovative," "game-changing," "revolutionary," "disruptive," or hollow superlatives
- No bullet points inside the email body
- No more than 130 words in the body
- Nothing that sounds like it was written by AI or a template

VARIANT INSTRUCTIONS:
Variant A — "Category Opportunity": Open by identifying a clear, evolving need or white space in their category that this brand is perfectly positioned to fill. Build the case around what their shopper is looking for and not currently finding.
Variant B — "Retailer Fit": Open by acknowledging something specific and true about this retailer's identity, direction, or member/customer — then position the brand as a natural, almost inevitable extension of that story.

Respond ONLY with valid JSON, no markdown, no preamble:
{"a":{"angle":"Category Opportunity","subject":"...","body":"..."},"b":{"angle":"Retailer Fit","subject":"...","body":"..."}}`;
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Generate API error:", res.status, err);
    throw new Error("Generation failed: " + res.status);
  }
  const data = await res.json();
  if (data.error) {
    console.error("Generate error from server:", data.error);
    throw new Error(data.error);
  }
  try {
    return JSON.parse(data.result);
  } catch(e) {
    console.error("JSON parse failed. Raw result:", data.result);
    throw new Error("Could not parse AI response");
  }
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */
const STATUS_CONFIG = {
  none:       { label:"Not Contacted", color:"#b0bcd4", bg:"#f0f4ff" },
  contacted:  { label:"Contacted",     color:"#4f7cff", bg:"#eef1ff" },
  followedup: { label:"Followed Up",   color:"#f0a500", bg:"#fff8e6" },
  won:        { label:"Won ✓",         color:"#00c9a7", bg:"#e6faf6" },
  lost:       { label:"Lost",          color:"#f06292", bg:"#ffeef3" },
};


// Apollo enrichment goes through /api/enrich serverless function
// so the API key stays secret on the server
async function enrichBuyerWithApollo(lead) {
  try {
    const res = await fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: lead.firstName,
        lastName: lead.lastName,
        retailer: lead.retailer,
      }),
    });
    const data = await res.json();
    if (data.apolloEnriched) return data;
  } catch (e) {
    console.error("Enrich error:", e);
  }
  return null;
}

// Stripe Payment Link: https://buy.stripe.com/8x200j5GZaO9aYZb7A2Ji00

export default function RepReach() {
  const [screen, setScreen] = useState("home");
  const [repName, setRepName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [uniqueAngle, setUniqueAngle] = useState("");
  const [selectedRetailerTypes, setSelectedRetailerTypes] = useState([]);
  const [emailTone, setEmailTone] = useState("confident");
  const [retailerName, setRetailerName] = useState("");
  const [leads, setLeads] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLead, setActiveLead] = useState(null);
  const [emails, setEmails] = useState({});
  const [generating, setGenerating] = useState(null);
  const [activeVariant, setActiveVariant] = useState("a");
  const [copied, setCopied] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallLead, setPaywallLead] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [accessCode, setAccessCode] = useState("");
  const [enriched, setEnriched] = useState({});
  const [apolloLeads, setApolloLeads] = useState([]);
  const [apolloLoading, setApolloLoading] = useState(false);
  const [enriching, setEnriching] = useState(null);
  const [codeError, setCodeError] = useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [liveResults, setLiveResults] = React.useState([]);
  const [liveLoading, setLiveLoading] = React.useState(false);
  const searchTimerRef = React.useRef(null);
  const [outreachStatus, setOutreachStatus] = useState({});
  const [notes, setNotes] = useState({});
  const [linkedIn, setLinkedIn] = useState({});
  const [generatingLI, setGeneratingLI] = useState(null);
  const [followUps, setFollowUps] = useState({});
  const [generatingFU, setGeneratingFU] = useState(null);
  const [activeEmailTab, setActiveEmailTab] = useState("email");
  const [activeVariantLI, setActiveVariantLI] = useState("connection");




  const handleApolloSearch = async ({ retailerName, selectedRetailerTypes, productCategory }) => {
    setApolloLoading(true);
    setApolloLeads([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retailer: retailerName.trim() || null,
          titleKeyword: productCategory.trim() || null,
        }),
      });
      const data = await res.json();
      setApolloLeads(data.leads || []);
    } catch (e) {
      console.error("Apollo search error:", e);
    }
    setApolloLoading(false);
  };

  const handleEnrich = async (lead) => {
    if (enriching === lead.id) return;
    setEnriching(lead.id);
    const result = await enrichBuyerWithApollo(lead);
    if (result) {
      setEnriched(p => ({...p, [lead.id]: result}));
    }
    setEnriching(null);
  };

  const handleAccessCode = () => {
    if (accessCode.trim() === "Championsucks") {
      setIsSubscribed(true);
      setShowPaywall(false);
      setAccessCode("");
      setCodeError("");
    } else {
      setCodeError("Invalid access code. Please try again.");
      setTimeout(() => setCodeError(""), 3000);
    }
  };

  const handleStripeCheckout = () => {
    window.open("https://buy.stripe.com/8x200j5GZaO9aYZb7A2Ji00", "_blank");
  };

  const toggle = (setter, val) => setter((p) => p.includes(val) ? p.filter((x) => x !== val) : [...p, val]);

  const handleSearch = useCallback(async () => {
    setSearching(true);
    await new Promise((r) => setTimeout(r, 700));
    const results = searchLeads({ retailerName, selectedRetailerTypes, productCategory });
    setLeads(results);
    handleApolloSearch({ retailerName, selectedRetailerTypes, productCategory });
    setSearchQuery(retailerName || (selectedRetailerTypes.length ? selectedRetailerTypes.map((id) => RETAILER_TYPES.find((r) => r.id === id)?.label).join(", ") : "selected filters"));
    setSearching(false);
    setActiveLead(null);
    setEmails({});
    setScreen("results");
  }, [retailerName, selectedRetailerTypes, productCategory]);

  const handleGenerateEmail = useCallback(async (lead) => {
    setGenerating(lead.id);
    setActiveLead(lead);
    setActiveVariant("a");
    try {
      const result = await generateEmail({ lead, repName, brandName, productCategory, productDesc, uniqueAngle, emailTone });
      setEmails((p) => ({ ...p, [lead.id]: result }));
    } catch (e) { console.error(e); alert("Email generation failed: " + e.message); }
    setGenerating(null);
  }, [repName, brandName, productCategory, productDesc, uniqueAngle, emailTone]);

  const handleGenerateAll = useCallback(async () => {
    setSavingAll(true);
    for (const lead of leads) {
      if (!emails[lead.id]) {
        setGenerating(lead.id);
        try {
          const r = await generateEmail({ lead, repName, brandName, productCategory, productDesc, uniqueAngle, emailTone });
          setEmails((p) => ({ ...p, [lead.id]: r }));
        } catch (e) { console.error(e); }
        setGenerating(null);
      }
    }
    setSavingAll(false);
  }, [leads, emails, repName, brandName, productCategory, productDesc, uniqueAngle]);

  const cycleStatus = (leadId) => {
    const order = ["none","contacted","followedup","won","lost"];
    const cur = outreachStatus[leadId] || "none";
    const next = order[(order.indexOf(cur)+1) % order.length];
    setOutreachStatus(p => ({...p, [leadId]: next}));
  };
  const saveNote = (leadId, text) => setNotes(p => ({...p, [leadId]: text}));
  const handleGenerateLinkedIn = useCallback(async (lead) => {
    setGeneratingLI(lead.id);
    try {
      const rtLabel = RETAILER_TYPES.find(r=>r.id===lead.retailerType)?.label||lead.retailerType;
      const prompt = `Write LinkedIn outreach for sales rep reaching buyer. Rep: ${repName||"rep"}, Brand: ${brandName}, Product: ${productDesc}. Buyer: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.retailer} (${rtLabel}). Intel: ${lead.context}. Write: 1) "connection" note max 300 chars, 2) "dm" max 500 chars. Both personal, specific, no hollow superlatives. JSON only: {"connection":"...","dm":"..."}`;
      const _genRes = await fetch("/api/generate", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:prompt})});
      if(!_genRes.ok) { const _err = await _genRes.text(); throw new Error("API error " + _genRes.status + ": " + _err); }
      const _genData = await _genRes.json();
      const text = _genData.result || "";
      const liMatch = text.match(/\{[\s\S]*\}/);
      if (!liMatch) throw new Error('No JSON in LinkedIn response');
      setLinkedIn(p=>({...p,[lead.id]:JSON.parse(liMatch[0])}));
    } catch(e){console.error(e); alert('LinkedIn generation failed: ' + e.message);}
    setGeneratingLI(null);
  }, [repName, brandName, productDesc]);
  const handleGenerateFollowUp = useCallback(async (lead) => {
    setGeneratingFU(lead.id);
    try {
      const rtLabel = RETAILER_TYPES.find(r=>r.id===lead.retailerType)?.label||lead.retailerType;
      const origSubject = emails[lead.id]?.a?.subject||"";
      const prompt = `Write a follow-up email for a sales rep who reached out and got no reply. Rep: ${repName||"rep"}, Brand: ${brandName}, Product: ${productDesc}. Prior subject: "${origSubject}". Buyer: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.retailer} (${rtLabel}). Intel: ${lead.context}. Rules: No "just checking in", add 1 new value point, under 80 words body, subject starts with "Re:". JSON only: {"subject":"...","body":"..."}`;
      const _genRes = await fetch("/api/generate", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:prompt})});
      if(!_genRes.ok) { const _err = await _genRes.text(); throw new Error("API error " + _genRes.status + ": " + _err); }
      const _genData = await _genRes.json();
      const text = _genData.result || "";
      const fuMatch = text.match(/\{[\s\S]*\}/);
      if (!fuMatch) throw new Error('No JSON in follow-up response');
      setFollowUps(p=>({...p,[lead.id]:JSON.parse(fuMatch[0])}));
    } catch(e){console.error(e); alert('Follow-up generation failed: ' + e.message);}
    setGeneratingFU(null);
  }, [repName, brandName, productDesc, emails]);

  // ── Live Apollo search (debounced, fires as user types) ──
  const handleLiveSearch = React.useCallback(async (input) => {
    if (!input.trim() || input.trim().length < 2) {
      setLiveResults([]);
      return;
    }

    // Parse input: split into company + title keyword
    const TITLE_WORDS = ["buyer","merchant","manager","director","vp","head","chief","purchasing","procurement","sourcing","category","merchandise","divisional","dmm"];
    const words = input.trim().split(/\s+/);
    const titleWords = [];
    const companyWords = [];
    let foundTitle = false;
    for (const w of words) {
      if (TITLE_WORDS.some(t => w.toLowerCase().includes(t))) {
        foundTitle = true;
        titleWords.push(w);
      } else if (!foundTitle) {
        companyWords.push(w);
      } else {
        titleWords.push(w);
      }
    }
    const company = companyWords.join(" ") || input.trim();
    const titleKeyword = titleWords.join(" ") || null;

    setLiveLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retailer: company, titleKeyword }),
      });
      const data = await res.json();
      setLiveResults(data.leads || []);
    } catch (e) {
      console.error("Live search error:", e);
    }
    setLiveLoading(false);
  }, []);

  const handleSearchInput = React.useCallback((val) => {
    setSearchInput(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => handleLiveSearch(val), 400);
  }, [handleLiveSearch]);

  const exportCSV = () => {
    const rows = [["Name","Title","Retailer","Email","Phone","Location","Variant","Subject","Body"]];
    leads.forEach((l) => {
      const em = emails[l.id]; if (!em) return;
      ["a","b"].forEach((v) => { if (em[v]) rows.push([`"${l.firstName} ${l.lastName}"`,`"${l.title}"`,`"${l.retailer}"`,`"${l.email}"`,`"${l.phone}"`,`"${l.location}"`,v.toUpperCase(),`"${em[v].subject}"`,`"${em[v].body.replace(/\n/g," ")}"`]); });
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "repreach_emails.csv"; a.click();
  };

  const copyField = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const currentEmail = activeLead && emails[activeLead.id]?.[activeVariant];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Fraunces:ital,wght@0,700;0,900;1,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#f0f4ff;
          --surface:#ffffff;
          --card:#ffffff;
          --dark:#0f1523;
          --dark2:#1a2235;
          --dark3:#232f46;
          --accent:#4f7cff;
          --accent2:#3d6aee;
          --accent-glow:rgba(79,124,255,.18);
          --teal:#00c9a7;
          --teal2:#00a88c;
          --teal-glow:rgba(0,201,167,.15);
          --text:#0f1523;
          --muted:#6b7a99;
          --border:#dde3f0;
          --border2:#c8d2e8;
          --pink:#f64f8b;
          --red:#e53e3e;
          --white:#ffffff;
        }
        body{background:var(--bg);color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh}
        h1,h2,h3,h4{font-family:'Fraunces',serif;line-height:1.1}

        /* NAV */
        .nav{background:var(--dark);padding:0 32px;height:62px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:100;box-shadow:0 1px 0 rgba(255,255,255,.05)}
        .nav-logo{font-family:'Fraunces',serif;font-size:22px;font-weight:900;color:#fff;cursor:pointer;letter-spacing:-.5px}
        .nav-logo span{color:var(--teal);font-style:italic}
        .nav-tag{font-size:12px;color:#4a5a7a;font-weight:500}
        .nav-steps{margin-left:auto;display:flex;gap:4px}
        .ns{padding:5px 13px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #2a3550;color:#4a5a7a;letter-spacing:.3px}
        .ns.done{border-color:var(--teal2);color:var(--teal);background:rgba(0,201,167,.1)}
        .ns.active{border-color:var(--accent);color:#a0b4ff;background:rgba(79,124,255,.12)}

        /* PAGE */
        .page{max-width:1200px;margin:0 auto;padding:40px 28px}
        @media(max-width:720px){.page{padding:24px 16px}}

        /* HERO */
        .hero{background:var(--dark);padding:80px 32px 100px;text-align:center;position:relative;overflow:hidden}
        .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 90% 70% at 50% 110%,rgba(79,124,255,.2) 0%,rgba(0,201,167,.08) 45%,transparent 70%);pointer-events:none}
        .hero::after{content:'';position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(0,201,167,.06) 0%,transparent 70%);pointer-events:none}
        .eyebrow{display:inline-block;background:rgba(0,201,167,.12);border:1px solid rgba(0,201,167,.3);color:var(--teal);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;padding:5px 16px;border-radius:20px;margin-bottom:24px}
        .hero h1{font-size:clamp(34px,5vw,64px);font-weight:900;color:#fff;max-width:780px;margin:0 auto 20px;letter-spacing:-1.5px;line-height:1.02}
        .hero h1 em{color:var(--teal);font-style:italic}
        .hero p{color:#7a8db5;font-size:17px;max-width:520px;margin:0 auto 40px;line-height:1.7;font-weight:400}
        .stats{display:flex;justify-content:center;gap:48px;margin-bottom:44px;flex-wrap:wrap}
        .stat-num{font-family:'Fraunces',serif;font-size:36px;font-weight:700;color:#fff;line-height:1}
        .stat-lbl{font-size:12px;color:#4a5a7a;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}

        /* BUTTONS */
        .btn{display:inline-flex;align-items:center;gap:7px;padding:11px 24px;border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:14px;cursor:pointer;border:none;transition:all .15s;letter-spacing:-.1px}
        .btn-gold{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 4px 14px var(--accent-glow)}
        .btn-gold:hover{background:linear-gradient(135deg,#6690ff,var(--accent));transform:translateY(-1px);box-shadow:0 6px 20px var(--accent-glow)}
        .btn-navy{background:var(--dark);color:#fff}.btn-navy:hover{background:var(--dark2)}
        .btn-teal{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;box-shadow:0 4px 14px var(--teal-glow)}
        .btn-teal:hover{transform:translateY(-1px);box-shadow:0 6px 20px var(--teal-glow)}
        .btn-outline{background:var(--white);border:1.5px solid var(--border2);color:var(--text)}.btn-outline:hover{border-color:var(--accent);color:var(--accent)}
        .btn-ghost{background:transparent;border:1.5px solid rgba(255,255,255,.15);color:#fff}.btn-ghost:hover{border-color:var(--teal);color:var(--teal)}
        .btn-green{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff}.btn-green:hover{transform:translateY(-1px);box-shadow:0 6px 20px var(--teal-glow)}
        .btn-sm{padding:7px 14px;font-size:12px;border-radius:8px}
        .btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important;box-shadow:none!important}

        /* CARDS */
        .card{background:var(--white);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(15,21,35,.04)}
        .card-head{padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--white)}
        .ch-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted)}
        .card-body{padding:22px}

        .sh{font-size:clamp(24px,3.5vw,36px);font-weight:900;letter-spacing:-.8px;margin-bottom:6px;color:var(--dark)}
        .ss{color:var(--muted);font-size:15px;margin-bottom:28px;line-height:1.6;font-weight:400}

        /* FORM */
        .field{display:flex;flex-direction:column;gap:5px}
        .field label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)}
        .field input,.field select,.field textarea{background:var(--bg);border:1.5px solid var(--border);color:var(--text);border-radius:10px;padding:10px 13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;outline:none;transition:all .15s;width:100%;font-weight:500}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--accent);background:var(--white);box-shadow:0 0 0 3px var(--accent-glow)}
        .field input::placeholder,.field textarea::placeholder{color:#b0bcd4;font-weight:400}
        .field textarea{resize:vertical;min-height:76px}
        .field select{appearance:none;cursor:pointer}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        @media(max-width:600px){.g2{grid-template-columns:1fr}}

        /* RETAILER TYPE CARDS */
        .rt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:9px}
        .rt-card{padding:11px 13px;border-radius:10px;border:1.5px solid var(--border);background:var(--white);cursor:pointer;transition:all .15s;display:flex;align-items:flex-start;gap:9px}
        .rt-card:hover{border-color:var(--accent);background:#f5f7ff;transform:translateY(-1px);box-shadow:0 3px 10px var(--accent-glow)}
        .rt-card.on{border-color:var(--accent);background:linear-gradient(135deg,#f0f4ff,#e8eeff);box-shadow:0 0 0 1px var(--accent),0 4px 12px var(--accent-glow)}
        .rt-icon{font-size:17px;line-height:1;margin-top:1px;flex-shrink:0}
        .rt-label{font-size:13px;font-weight:700;color:var(--text)}
        .rt-sub{font-size:10px;color:var(--muted);margin-top:1px;line-height:1.35;font-weight:400}
        .role-pill{padding:6px 14px;border-radius:20px;border:1.5px solid var(--border);background:var(--white);cursor:pointer;font-size:12px;font-weight:700;color:var(--muted);font-family:'Plus Jakarta Sans',sans-serif;transition:all .15s;letter-spacing:.1px}
        .role-pill:hover{border-color:var(--accent);color:var(--accent);background:#f5f7ff}
        .role-pill.on{background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent;color:#fff;box-shadow:0 3px 10px var(--accent-glow)}

        /* SEARCH INPUT HIGHLIGHT */
        .primary-search input{font-size:15px;padding:13px 16px;border:2px solid var(--teal)!important;background:#f0fefa!important;border-radius:10px}
        .primary-search input:focus{border-color:var(--accent)!important;background:var(--white)!important;box-shadow:0 0 0 3px var(--accent-glow)!important}
        .search-hint{font-size:11px;color:var(--teal2);font-weight:700;margin-top:5px;display:flex;align-items:center;gap:4px}

        /* DIVIDER */
        .or-divider{display:flex;align-items:center;gap:12px;margin:4px 0}
        .or-line{flex:1;height:1px;background:var(--border)}
        .or-label{font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;white-space:nowrap}

        /* RESULTS LAYOUT */
        .leads-layout{display:grid;grid-template-columns:340px 1fr;gap:24px;align-items:start}
        @media(max-width:920px){.leads-layout{grid-template-columns:1fr}}
        .lead-list{display:flex;flex-direction:column;gap:9px;max-height:76vh;overflow-y:auto;padding-right:3px}
        .lead-list::-webkit-scrollbar{width:4px}
        .lead-list::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}

        /* LEAD CARD */
        .lead-card{background:var(--white);border:1.5px solid var(--border);border-radius:14px;padding:14px 16px;cursor:pointer;transition:all .2s;position:relative}
        .lead-card:hover{border-color:var(--accent);box-shadow:0 4px 18px var(--accent-glow);transform:translateY(-1px)}
        .lead-card.active{border-color:var(--accent);background:linear-gradient(160deg,#f8faff,var(--white));box-shadow:0 4px 20px var(--accent-glow)}
        .done-badge{display:none;position:absolute;top:11px;right:11px;background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 8px;border-radius:6px;letter-spacing:.3px}
        .lead-card.done .done-badge{display:block}
        .lead-avatar{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--dark2));display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;box-shadow:0 3px 10px var(--accent-glow)}
        .lead-row{display:flex;gap:11px;align-items:flex-start;margin-bottom:10px}
        .lead-name{font-weight:800;font-size:15px;line-height:1.2;color:var(--dark);font-family:'Plus Jakarta Sans',sans-serif}
        .lead-title{font-size:12px;color:var(--muted);margin-top:2px;line-height:1.35;font-weight:500}
        .lead-retailer{font-size:13px;font-weight:700;color:var(--accent);margin-top:2px}

        /* CONTACT INFO */
        .contact-info{display:flex;flex-direction:column;gap:5px;margin-top:9px;padding:10px 12px;background:linear-gradient(135deg,#f8faff,#f0f4ff);border-radius:10px;border:1px solid var(--border)}
        .contact-row{display:flex;align-items:center;gap:8px}
        .contact-icon{font-size:12px;flex-shrink:0;width:16px;text-align:center}
        .contact-value{font-size:12px;font-weight:600;color:var(--dark);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .contact-value a{color:var(--accent);text-decoration:none;font-weight:600}
        .contact-value a:hover{text-decoration:underline}
        .copy-btn{background:none;border:1px solid var(--border2);border-radius:5px;padding:2px 8px;font-size:10px;font-weight:700;cursor:pointer;color:var(--muted);font-family:'Plus Jakarta Sans',sans-serif;transition:all .15s;flex-shrink:0;white-space:nowrap}
        .copy-btn:hover{border-color:var(--accent);color:var(--accent)}
        .copy-btn.copied{background:var(--teal);border-color:var(--teal);color:#fff}

        .lead-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
        .lead-tag{padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;background:#eef1fa;color:#5a6a8a;letter-spacing:.2px}
        .lead-conf{display:flex;align-items:center;gap:6px;margin-top:7px;font-size:10px;color:var(--muted);font-weight:600}
        .conf-bar{flex:1;height:3px;background:var(--border);border-radius:2px;overflow:hidden}
        .conf-fill{height:100%;background:linear-gradient(90deg,var(--teal),var(--accent));border-radius:2px}
        .lead-ctx{font-size:11px;color:#6b7a99;line-height:1.55;background:#f8faff;border-radius:8px;padding:8px 10px;margin-top:8px;font-style:italic;border-left:2px solid var(--teal)}

        /* EMAIL PANEL */
        .email-panel{position:sticky;top:74px}
        .variant-bar{display:flex;background:#f0f4ff;border-radius:10px;padding:3px;margin-bottom:18px;width:fit-content;gap:2px}
        .v-tab{padding:7px 18px;background:transparent;border:none;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:12px;cursor:pointer;color:var(--muted);transition:all .15s;border-radius:8px;letter-spacing:.2px}
        .v-tab.on{background:var(--white);color:var(--dark);box-shadow:0 1px 4px rgba(15,21,35,.1)}
        .e-angle{display:inline-block;background:rgba(0,201,167,.1);border:1px solid rgba(0,201,167,.3);color:var(--teal2);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 10px;border-radius:6px;margin-bottom:12px}
        .e-sub-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-bottom:6px}
        .e-subject{font-family:'Fraunces',serif;font-size:22px;font-weight:700;letter-spacing:-.4px;line-height:1.25;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--border);color:var(--dark)}
        .e-body{font-size:14px;line-height:1.85;color:#2a3550;white-space:pre-wrap;font-weight:400}
        .e-actions{margin-top:18px;display:flex;gap:9px;flex-wrap:wrap;padding-top:16px;border-top:1px solid var(--border)}

        /* GENERATE BAR */
        .gen-bar{background:linear-gradient(135deg,var(--dark),var(--dark2));border-radius:14px;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:22px;flex-wrap:wrap;box-shadow:0 4px 20px rgba(15,21,35,.12)}
        .gb-h{font-family:'Fraunces',serif;color:#fff;font-size:18px;margin-bottom:3px}
        .gb-p{color:#4a5a7a;font-size:12px;font-weight:500}

        /* LOADING */
        .spin{display:inline-block;width:13px;height:13px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;animation:spin .65s linear infinite}
        .spin-d{border-color:rgba(79,124,255,.2);border-top-color:var(--accent)}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* EMPTY */
        .empty{padding:52px 24px;text-align:center}
        .empty-icon{font-size:48px;margin-bottom:14px}
        .empty h4{font-size:19px;margin-bottom:7px;color:var(--dark)}
        .empty p{color:var(--muted);font-size:13px;max-width:300px;margin:0 auto;line-height:1.6}

        .no-results-box{background:#fff5f8;border:1.5px solid #fca5c0;border-radius:14px;padding:28px 24px;text-align:center;max-width:520px}
        .no-results-box h4{font-size:18px;color:var(--pink);margin-bottom:8px}
        .no-results-box p{color:var(--muted);font-size:14px;line-height:1.5}

        .result-badge{display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;margin-bottom:7px;box-shadow:0 3px 10px var(--accent-glow)}

        /* FEATURES */
        .features{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:52px 0}
        @media(max-width:700px){.features{grid-template-columns:1fr}}
        .feature{background:var(--white);border:1px solid var(--border);border-radius:16px;padding:24px;transition:all .2s}
        .feature:hover{border-color:var(--accent);box-shadow:0 4px 16px var(--accent-glow);transform:translateY(-2px)}
        .feature-icon{font-size:28px;margin-bottom:12px;display:block}
        .feature h3{font-size:17px;font-weight:700;margin-bottom:6px;color:var(--dark)}
        .feature p{font-size:13px;color:var(--muted);line-height:1.6;font-weight:400}

        .leads-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:8px}
        .lead-card{background:#fff;border:1.5px solid var(--border);border-radius:12px;padding:16px;display:flex;gap:12px;align-items:flex-start;cursor:pointer;transition:all .15s}
        .lead-card:hover{border-color:var(--teal);box-shadow:0 4px 16px rgba(0,201,167,0.1);transform:translateY(-1px)}
        .lead-avatar{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,var(--teal),var(--teal2));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;flex-shrink:0}
        .back-btn{background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:5px;color:var(--muted);font-size:13px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;margin-bottom:20px;padding:0;transition:color .15s}
        .back-btn:hover{color:var(--accent)}
        .req{color:var(--pink)}
        /* PAYWALL */
        .paywall-overlay{position:fixed;inset:0;background:rgba(10,15,30,.75);backdrop-filter:blur(6px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
        .paywall-modal{background:var(--white);border-radius:20px;max-width:520px;width:100%;overflow-y:auto;max-height:92vh;box-shadow:0 24px 80px rgba(10,15,30,.35)}
        .paywall-hero{background:linear-gradient(135deg,var(--dark),var(--dark2));padding:32px 32px 28px;text-align:center}
        .paywall-icon{font-size:40px;margin-bottom:12px}
        .paywall-hero h2{font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff;margin-bottom:8px;letter-spacing:-.5px}
        .paywall-hero p{color:#7a8db5;font-size:14px;line-height:1.6}
        .paywall-body{padding:28px 32px}
        .plan-toggle{display:flex;background:#f0f4ff;border-radius:10px;padding:3px;margin-bottom:24px;gap:3px}
        .plan-btn{flex:1;padding:9px;border:none;border-radius:8px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;background:transparent;color:var(--muted);transition:all .15s;position:relative}
        .plan-btn.on{background:var(--white);color:var(--dark);box-shadow:0 1px 4px rgba(15,21,35,.12)}
        .plan-save{position:absolute;top:-8px;right:-4px;background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px;letter-spacing:.3px;text-transform:uppercase}
        .price-display{text-align:center;margin-bottom:22px}
        .price-amount{font-family:Georgia,serif;font-size:48px;font-weight:700;color:var(--dark);line-height:1;letter-spacing:-2px}
        .price-period{font-size:13px;color:var(--muted);font-weight:600;margin-top:4px}
        .price-annual-note{font-size:11px;color:var(--teal2);font-weight:700;margin-top:4px}
        .paywall-features{display:flex;flex-direction:column;gap:10px;margin-bottom:24px}
        .pf-row{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text);font-weight:500}
        .pf-check{width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,var(--teal),var(--teal2));display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
        .paywall-cta{width:100%;padding:15px;border-radius:12px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px var(--accent-glow);transition:all .15s;letter-spacing:-.2px}
        .paywall-cta:hover{transform:translateY(-1px);box-shadow:0 6px 22px var(--accent-glow)}
        .paywall-fine{font-size:11px;color:var(--muted);text-align:center;margin-top:12px}
        .paywall-close{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.1);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s}
        .paywall-close:hover{background:rgba(255,255,255,.2)}
        /* BLURRED CONTACT */
        .contact-locked{position:relative;display:inline-block}
        .contact-blur{filter:blur(5px);user-select:none;pointer-events:none;color:var(--muted)}
        .lock-badge{display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:6px;margin-left:6px;letter-spacing:.3px;text-transform:uppercase;cursor:pointer;vertical-align:middle;box-shadow:0 2px 6px var(--accent-glow)}
        /* SUBSCRIBED BADGE IN NAV */
        .sub-badge{display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff;font-size:10px;font-weight:800;padding:4px 12px;border-radius:20px;letter-spacing:.3px;text-transform:uppercase}

        .status-pill{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;cursor:pointer;border:1.5px solid transparent;transition:all .15s;white-space:nowrap;flex-shrink:0;font-family:inherit}
        .etab-bar{display:flex;gap:2px;background:#f0f4ff;border-radius:10px;padding:3px;margin-bottom:16px;width:fit-content}
        .etab{padding:6px 14px;border-radius:8px;border:none;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;color:var(--muted);background:transparent;transition:all .15s}
        .etab.on{background:var(--white);color:var(--dark);box-shadow:0 1px 4px rgba(15,21,35,.1)}
        .li-card{background:linear-gradient(135deg,#f0f7ff,#e8f2ff);border:1.5px solid #c3d9f7;border-radius:12px;padding:16px;margin-bottom:14px}
        .li-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#2967c2;margin-bottom:6px}
        .li-text{font-size:13px;line-height:1.7;color:#1a2a45;white-space:pre-wrap}
        .li-char{font-size:10px;color:var(--muted);font-weight:600;margin-top:4px}
        .fu-badge{display:inline-flex;align-items:center;background:rgba(240,165,0,.12);border:1px solid rgba(240,165,0,.35);color:#b07a00;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 10px;border-radius:6px;margin-bottom:12px}
        .notes-area{width:100%;border:1.5px solid var(--border);border-radius:9px;padding:8px 10px;font-size:11px;font-family:inherit;color:var(--dark);line-height:1.5;resize:none;background:#fafbff;margin-top:6px}
        .notes-area:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}
        .notes-area::placeholder{color:#c0cce0}
        .tracker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:16px}
        .tracker-card{background:var(--white);border:1.5px solid var(--border);border-radius:14px;padding:16px;transition:border-color .2s}
        .tracker-card:hover{border-color:var(--accent);box-shadow:0 4px 14px var(--accent-glow)}

      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo" onClick={() => setScreen("home")}>Rep<span>Reach</span></div>
        <div className="nav-tag">Find the right buyer. Send the right email. Close the deal.</div>
        {isSubscribed
          ? <div className="sub-badge" style={{marginLeft:"auto"}}>✓ Pro Member</div>
          : <button className="btn btn-teal btn-sm" style={{marginLeft:"auto",fontSize:11}} onClick={()=>{setPaywallLead(null);setShowPaywall(true);}}>⚡ Upgrade to Pro</button>
        }
        {screen !== "home" && (
          <div className="nav-steps">
            <div className={`ns ${screen==="setup"?"active":["search","results"].includes(screen)?"done":""}`}>① Brand</div>
            <div className={`ns ${screen==="search"?"active":screen==="results"?"done":""}`}>② Find Buyers</div>
            <div className={`ns ${screen==="results"?"active":""}`}>③ Emails</div>
            {leads.length>0&&<div className={`ns ${screen==="tracker"?"active":""}`} style={{cursor:"pointer",marginLeft:4}} onClick={()=>setScreen("tracker")}>📋 Tracker</div>}
          </div>
        )}
      </nav>

      {/* HOME */}
            {screen === "home" && (
        <>
          <div className="hero" style={{paddingBottom:0}}>
            <div className="eyebrow">Built for Sales Reps & Rep Groups</div>
            <h1>Find any retail buyer.<br /><em>Right now.</em></h1>
            <p style={{maxWidth:560,margin:"0 auto 32px"}}>Type a retailer name and watch buyers populate in real time — just like Apollo, built for CPG sales reps.</p>

            {/* ── LIVE SEARCH BAR ── */}
            <div style={{maxWidth:680,margin:"0 auto",position:"relative"}}>
              <div style={{position:"relative",display:"flex",alignItems:"center",background:"#fff",borderRadius:14,boxShadow:"0 4px 32px rgba(0,0,0,0.13)",border:"2px solid transparent",transition:"border .2s"}}
                onFocusCapture={e=>e.currentTarget.style.border="2px solid var(--teal)"}
                onBlurCapture={e=>e.currentTarget.style.border="2px solid transparent"}
              >
                <span style={{padding:"0 16px",fontSize:20,color:"var(--muted)"}}>🔍</span>
                <input
                  value={searchInput}
                  onChange={e=>handleSearchInput(e.target.value)}
                  placeholder='Try "Walmart", "Kroger buyer", "Target beauty merchant"...'
                  style={{flex:1,border:"none",outline:"none",fontSize:16,padding:"18px 0",background:"transparent",color:"var(--text)",fontFamily:"inherit"}}
                  autoFocus
                />
                {liveLoading && <span style={{padding:"0 16px",fontSize:13,color:"var(--teal)",fontWeight:700,whiteSpace:"nowrap"}}>Searching...</span>}
                {!liveLoading && searchInput && <span style={{padding:"0 16px",fontSize:12,color:"var(--muted)"}}>{liveResults.length} results</span>}
              </div>

              {/* Quick retailer chips */}
              {!searchInput && (
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16,justifyContent:"center"}}>
                  {["Walmart","Sam's Club","Kroger","Target","Costco","Home Depot","CVS","Tractor Supply","Amazon","Lowe's"].map(r=>(
                    <button key={r} onClick={()=>handleSearchInput(r)}
                      style={{padding:"7px 16px",borderRadius:20,border:"1.5px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.1)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",backdropFilter:"blur(4px)",transition:"all .15s"}}
                      onMouseEnter={e=>{e.target.style.background="rgba(255,255,255,0.2)";}}
                      onMouseLeave={e=>{e.target.style.background="rgba(255,255,255,0.1)";}}
                    >{r}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── LIVE RESULTS ── */}
          {(liveResults.length > 0 || liveLoading) && (
            <div className="page" style={{paddingTop:24}}>
              {liveLoading && <div style={{textAlign:"center",padding:"40px 0",color:"var(--muted)"}}>
                <span className="spin spin-d" style={{width:24,height:24,display:"inline-block",marginBottom:8}}/>
                <div style={{fontSize:14}}>Searching Apollo live database...</div>
              </div>}
              {!liveLoading && liveResults.length > 0 && (
                <>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                    <h2 style={{fontSize:18,fontWeight:800}}>{liveResults.length} buyers found</h2>
                    <button className="btn btn-gold btn-sm" onClick={()=>{
                      setLeads(liveResults);
                      setActiveLead(liveResults[0]);
                      setScreen("results");
                    }}>View All & Generate Emails →</button>
                  </div>
                  <div className="leads-grid">
                    {liveResults.slice(0,12).map(lead=>(
                      <div key={lead.id} className="lead-card" onClick={()=>{
                        if (!isSubscribed){setPaywallLead(lead);setShowPaywall(true);return;}
                        setLeads(liveResults);
                        setActiveLead(lead);
                        setScreen("results");
                      }}>
                        <div className="lead-avatar">{lead.firstName?.[0]}{lead.lastName?.[0]}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:800,fontSize:14}}>{lead.firstName} {lead.lastName}</div>
                          <div style={{fontSize:12,color:"var(--muted)",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{lead.title}</div>
                          <div style={{fontSize:12,color:"var(--teal2)",fontWeight:700,marginTop:2}}>{lead.retailer}</div>
                          {lead.email && <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>✉ {lead.email}</div>}
                        </div>
                        {!isSubscribed && <span style={{fontSize:10,color:"var(--gold)",fontWeight:700}}>🔒 PRO</span>}
                      </div>
                    ))}
                  </div>
                  {liveResults.length > 12 && (
                    <div style={{textAlign:"center",marginTop:20}}>
                      <button className="btn btn-ghost" onClick={()=>{
                        if (!isSubscribed){setShowPaywall(true);return;}
                        setLeads(liveResults);
                        setActiveLead(liveResults[0]);
                        setScreen("results");
                      }}>View all {liveResults.length} buyers →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Features section - only show when no search */}
          {!searchInput && (
            <div className="page">
              <div className="features" style={{marginTop:52}}>
<div className="feature"><div className="feature-icon">🎯</div><h3>Verified Decision-Makers Only</h3><p>Every result is the actual buyer, category manager, or merchant who controls your product's shelf space — with their direct email and phone number. No gatekeepers, no switchboards, no dead ends.</p></div>
              <div className="feature"><div className="feature-icon">✉️</div><h3>Emails That Get Responses</h3><p>AI-generated outreach written specifically for each buyer's retailer, category, and role — with the right industry language, a concrete metric, and a clear ask. Two A/B variants every time.</p></div>
              <div className="feature"><div className="feature-icon">⚡</div><h3>Move Faster Than the Competition</h3><p>Search any retailer or store type, pull the right contact, generate a tailored email, and have it in a buyer's inbox before your competition even finds the right person to call.</p></div>
            </div>
          </div>

              </div>
            </div>
          )}
        </>
      )}

      {screen === "setup" && (
        <div className="page">
          <h1 className="sh">Tell us about your brand</h1>
          <p className="ss">This powers the AI so every email is tailored to the specific buyer, their retailer, and their category.</p>
          <div className="card" style={{maxWidth:680}}>
            <div className="card-head"><span className="ch-label">👤 Rep & Brand Details</span></div>
            <div className="card-body" style={{display:"flex",flexDirection:"column",gap:18}}>
              <div className="g2">
                <div className="field"><label>Your Name</label><input placeholder="e.g. Jamie Winters" value={repName} onChange={(e)=>setRepName(e.target.value)} /></div>
                <div className="field"><label>Brand / Product Name <span className="req">*</span></label><input placeholder="e.g. NutriBlend Bars" value={brandName} onChange={(e)=>setBrandName(e.target.value)} /></div>
              </div>
              <div className="field"><label>Product Category <span style={{fontSize:10,color:"var(--muted)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
                <select value={productCategory} onChange={(e)=>setProductCategory(e.target.value)}>
                  <option value="">— All Categories —</option>
                  {[
                    ["🍎 Food & Beverage",["Food & Beverage","Snacks & Confection","Frozen & Refrigerated","Natural / Organic","Beverages – Non-Alcoholic","Beverages – Alcohol","Coffee & Tea","Functional Beverages & Energy","Dairy & Dairy Alternatives","Bakery & Bread","Breakfast & Cereal","Condiments & Sauces","Canned & Packaged Goods","International & Ethnic Foods","Candy & Chocolate","Gum & Mints","Deli & Prepared Foods","Meat & Seafood","Produce & Fresh","Baby Food & Formula","Cooking Oils & Vinegars","Pasta, Rice & Grains","Soups & Broths","Nuts, Seeds & Dried Fruit","Plant-Based & Vegan Foods","Keto & Low-Carb Foods","Gluten-Free Foods","Protein Bars & Meal Replacement"]],
                    ["💊 Health, Beauty & Wellness",["Health & Beauty","Personal Care","Supplements & Vitamins","Skincare","Haircare","Color Cosmetics & Makeup","Fragrance & Perfume","Oral Care","Eye Care","Men's Grooming","Feminine Care","Sexual Wellness","First Aid & OTC Medicine","Medical Devices & Diagnostics","Hearing & Vision Aids","Mental Wellness & CBD","Weight Management","Sports Nutrition","Aromatherapy & Essential Oils"]],
                    ["🧹 Household & Cleaning",["Household Goods","Cleaning Products","Laundry Care","Air Care & Fresheners","Paper & Tissue Products","Trash & Storage Bags","Pest Control","Candles & Home Fragrance","Organization & Storage"]],
                    ["🏡 Home, Garden & Outdoor",["Home & Garden","Furniture & Décor","Bedding & Bath","Kitchen & Cookware","Small Kitchen Appliances","Major Appliances","Lighting & Electrical","Flooring & Window Treatments","Seasonal & Holiday Décor","Lawn & Garden","Outdoor Power Equipment","Power Tools","Hand Tools & Hardware","Paint & Painting Supplies","Plumbing & HVAC","Building Materials & Lumber","Smart Home & Security","Generators & Power","Outdoor Furniture & Grills","Pool & Spa","Farm & Ranch Supplies"]],
                    ["👗 Apparel & Footwear",["Apparel & Footwear","Men's Clothing","Women's Clothing","Kids' Clothing","Activewear & Athleisure","Workwear & Safety Apparel","Swimwear & Beachwear","Underwear & Socks","Hats, Bags & Accessories","Shoes & Boots","Jewelry & Watches"]],
                    ["📱 Electronics & Tech",["Electronics & Tech","Mobile Phones & Accessories","Computers & Tablets","Audio & Headphones","TV & Home Theater","Cameras & Photography","Gaming & Consoles","Wearables & Fitness Tech","Car Electronics & GPS","Batteries & Chargers","Cables & Connectivity"]],
                    ["⚽ Sporting Goods & Outdoors",["Sporting Goods","Camping & Hiking","Hunting & Fishing","Cycling","Water Sports & Boating","Winter Sports & Snow","Golf","Team Sports & Athletics","Fitness Equipment & Weights","Yoga & Pilates","Martial Arts & Combat Sports","Climbing & Adventure","Racquet Sports"]],
                    ["🚗 Automotive",["Automotive","Motor Oil & Fluids","Car Care & Detailing","Tires & Wheels","Auto Parts & Accessories","Truck & Towing","RV & Camper Supplies","Motorcycle & Powersports","Marine & Watercraft"]],
                    ["🎮 Toys, Games & Hobbies",["Toys & Games","Video Games & Software","Board Games & Puzzles","Crafts & DIY","Art Supplies","Model Building & Collectibles","Musical Instruments","Books & Magazines","Party Supplies & Events"]],
                    ["🍼 Baby, Kids & Family",["Baby & Kids","Diapers & Wipes","Baby Gear & Furniture","Kids' Learning & Education"]],
                    ["🐾 Pet",["Pet Products","Dog Food & Treats","Cat Food & Treats","Pet Supplements & Health","Pet Accessories & Toys","Aquarium & Small Animals"]],
                    ["🏢 Office & Industrial",["Office & School Supplies","Janitorial & Facility","Safety & Workwear","Industrial & MRO","Packaging & Shipping"]],
                    ["✨ Specialty & Other",["Travel & Luggage","Wedding & Bridal","Religious & Cultural","Funeral & Memorial","Currency & Prepaid Cards","Subscription Boxes","Eco & Sustainable Goods","Luxury & Premium Goods"]],
                  ].map(([group, cats]) => (
                    <optgroup key={group} label={group}>
                      {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="field"><label>Product Description <span className="req">*</span></label><textarea placeholder="e.g. 6 high-protein, low-sugar snack bars. Currently in 800 Whole Foods doors at 4.2 units/store/week velocity." value={productDesc} onChange={(e)=>setProductDesc(e.target.value)} /></div>
              <div className="field"><label>Unique Angle / Hook</label><textarea placeholder="e.g. 52% gross margin, DTC proven with 200K subscribers, no refrigeration needed, 4-week sell-through guarantee" value={uniqueAngle} onChange={(e)=>setUniqueAngle(e.target.value)} style={{minHeight:56}} /></div>
              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button className="btn btn-outline" onClick={()=>setScreen("home")}>← Back</button>
                <button className="btn btn-gold" disabled={!brandName||!productDesc} onClick={()=>setScreen("search")}>Find Buyers →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH */}
      {screen === "search" && (
        <div className="page">
          <button className="back-btn" onClick={()=>setScreen("setup")}>← Back</button>
          <h1 className="sh">Find your retail buyers</h1>
          <p className="ss">Search any retailer and optionally filter by job title keyword — exactly like Apollo.</p>

          <div style={{display:"flex",flexDirection:"column",gap:20,maxWidth:700}}>
            <div className="card">
              <div className="card-head"><span className="ch-label">🔍 Buyer Search</span></div>
              <div className="card-body" style={{display:"flex",flexDirection:"column",gap:16}}>

                <div className="field">
                  <label>Retailer / Company Name <span className="req">*</span></label>
                  <input
                    placeholder="e.g. Walmart, Sam's Club, Kroger, Tractor Supply..."
                    value={retailerName}
                    onChange={(e)=>setRetailerName(e.target.value)}
                    onKeyDown={(e)=>e.key==="Enter"&&handleSearch()}
                    style={{fontSize:16,padding:"12px 16px"}}
                  />
                </div>

                <div className="field">
                  <label>Job Title Keywords <span style={{fontSize:11,color:"var(--muted)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional — leave blank to see all buyers)</span></label>
                  <input
                    placeholder="e.g. outdoor, frozen food, beauty, electronics..."
                    value={productCategory}
                    onChange={(e)=>setProductCategory(e.target.value)}
                    onKeyDown={(e)=>e.key==="Enter"&&handleSearch()}
                    style={{fontSize:15,padding:"12px 16px"}}
                  />
                  <div className="search-hint" style={{marginTop:6}}>💡 Type any keyword that would appear in a buyer's title</div>
                </div>

                <button
                  className="btn btn-gold"
                  style={{fontSize:15,padding:"13px 32px",width:"fit-content"}}
                  onClick={handleSearch}
                  disabled={!retailerName.trim()}
                >
                  Search Buyers →
                </button>
              </div>
            </div>

            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {["Walmart","Sam's Club","Kroger","Target","Costco","Home Depot","CVS","Tractor Supply","Amazon","Lowe's"].map(r=>(
                <button
                  key={r}
                  onClick={()=>{setRetailerName(r);}}
                  style={{padding:"7px 14px",borderRadius:20,border:"1.5px solid var(--border)",background:"transparent",color:"var(--text)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
                  onMouseEnter={e=>{e.target.style.borderColor="var(--teal)";e.target.style.color="var(--teal2)";}}
                  onMouseLeave={e=>{e.target.style.borderColor="var(--border)";e.target.style.color="var(--text)";}}
                >{r}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {screen === "results" && (
        <div className="page">
          <button className="back-btn" onClick={()=>setScreen("search")}>← Refine Search</button>
          {leads.length === 0 ? (
            <div>
              <h1 className="sh">No buyers found</h1>
              <div className="no-results-box">
                <h4>No contacts match "{searchQuery}"</h4>
                <p style={{marginTop:8}}>Try a different retailer name, broader filters, or a different product category.</p>
                <button className="btn btn-navy btn-sm" style={{marginTop:14}} onClick={()=>setScreen("search")}>← Back to Search</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
                <div className="result-badge">✓ {leads.length + apolloLeads.filter(al=>!leads.some(l=>l.firstName===al.firstName&&l.lastName===al.lastName&&l.retailer===al.retailer)).length} buyer{(leads.length+apolloLeads.length)!==1?"s":""} found — "{searchQuery}"</div>
                {apolloLoading && <span style={{fontSize:11,color:"var(--teal2)",fontWeight:700,display:"flex",alignItems:"center",gap:5}}><span className="spin spin-d" style={{width:10,height:10,borderColor:"rgba(0,201,167,.2)",borderTopColor:"var(--teal)"}}/> Searching Apollo live...</span>}
                {!isSubscribed && <button style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--accent)",fontWeight:700,padding:0}} onClick={()=>{setPaywallLead(null);setShowPaywall(true);}}>🔒 Unlock contact info →</button>}
              </div>
              <h1 className="sh">{leads.length} Buyer{leads.length!==1?"s":""} Found</h1>
              <p className="ss">Showing all buyers at this retailer{productCategory ? ` — ${productCategory} matches appear first` : ""}. Click any buyer to generate their personalized cold email.</p>
              <div className="gen-bar">
                <div>
                  <div className="gb-h">Generate emails for all {leads.length} buyers</div>
                  <div className="gb-p">{Object.keys(emails).length} of {leads.length} ready · A/B variants · Retail-native language</div>
                </div>
                <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
                  {Object.keys(emails).length>0 && <button className="btn btn-green btn-sm" onClick={exportCSV}>↓ Export CSV</button>}
                  <button className="btn btn-gold btn-sm" disabled={savingAll||generating!==null} onClick={()=>{if(isSubscribed){handleGenerateAll();}else{setPaywallLead(null);setShowPaywall(true);}}}>
                    {savingAll?<><span className="spin"/> Writing…</>:"⚡ Generate All"}
                  </button>
                </div>
              </div>

              <div className="leads-layout">
                {/* LEAD LIST */}
                <div className="lead-list">
                  {[...leads, ...apolloLeads.filter(al=>!leads.some(l=>l.firstName===al.firstName&&l.lastName===al.lastName&&l.retailer===al.retailer))].map((lead)=>(
                    <div
                      key={lead.id}
                      className={`lead-card ${activeLead?.id===lead.id?"active":""} ${emails[lead.id]?"done":""}`}
                      onClick={()=>{ setActiveLead(lead); setActiveVariant("a"); if(!emails[lead.id]) handleGenerateEmail(lead); }}
                    >
                      <div className="done-badge">✓ Ready</div>
                      <div className="lead-row">
                        <div className="lead-avatar">{lead.firstName[0]}{lead.lastName[0]}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="lead-name">{lead.firstName} {lead.lastName}</div>
                          <div className="lead-title">{lead.title}</div>
                          <div className="lead-retailer">{lead.retailer}</div>
                        </div>
                        <button className="status-pill" style={{background:STATUS_CONFIG[outreachStatus[lead.id]||"none"].bg,color:STATUS_CONFIG[outreachStatus[lead.id]||"none"].color,borderColor:STATUS_CONFIG[outreachStatus[lead.id]||"none"].color+"44"}} onClick={e=>{e.stopPropagation();cycleStatus(lead.id);}}>{STATUS_CONFIG[outreachStatus[lead.id]||"none"].label}</button>
                      </div>

                      {/* ── CONTACT INFO ── */}
                      {(()=>{
                        const en = enriched[lead.id];
                        const email = en?.email || lead.email;
                        const phone = en?.phone || lead.phone;
                        const title = en?.title || lead.title;
                        const linkedin = en?.linkedin;
                        return (
                          <div className="contact-info" onClick={(e)=>e.stopPropagation()}>
                            {en?.apolloEnriched && (
                              <div style={{marginBottom:6}}>
                                <div style={{fontSize:9,fontWeight:800,color:"var(--teal2)",textTransform:"uppercase",letterSpacing:".5px"}}>✦ Apollo + LinkedIn Verified</div>
                                {en.linkedinTitle && en.apolloTitle && en.linkedinTitle !== en.apolloTitle && (
                                  <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>
                                    <span style={{color:"#0077b5",fontWeight:600}}>LinkedIn:</span> {en.linkedinTitle} &nbsp;·&nbsp; <span style={{color:"var(--teal2)",fontWeight:600}}>Apollo:</span> {en.apolloTitle}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="contact-row">
                              <span className="contact-icon">📧</span>
                              {isSubscribed ? (
                                <>
                                  <span className="contact-value"><a href={`mailto:${email}`}>{email}</a></span>
                                  <button className={`copy-btn ${copiedField===lead.id+"email"?"copied":""}`} onClick={()=>copyField(email, lead.id+"email")}>{copiedField===lead.id+"email"?"✓":"Copy"}</button>
                                </>
                              ) : (
                                <span className="contact-value" style={{display:"flex",alignItems:"center",gap:6}}>
                                  <span className="contact-blur">buyer@retailer.com</span>
                                  <span className="lock-badge" onClick={()=>{setPaywallLead(lead);setShowPaywall(true);}}>🔒 Unlock</span>
                                </span>
                              )}
                            </div>
                            <div className="contact-row">
                              <span className="contact-icon">📞</span>
                              {isSubscribed ? (
                                <>
                                  <span className="contact-value"><a href={`tel:${phone}`}>{phone}</a></span>
                                  <button className={`copy-btn ${copiedField===lead.id+"phone"?"copied":""}`} onClick={()=>copyField(phone, lead.id+"phone")}>{copiedField===lead.id+"phone"?"✓":"Copy"}</button>
                                </>
                              ) : (
                                <span className="contact-value" style={{display:"flex",alignItems:"center",gap:6}}>
                                  <span className="contact-blur">(###) ###-####</span>
                                  <span className="lock-badge" onClick={()=>{setPaywallLead(lead);setShowPaywall(true);}}>🔒 Unlock</span>
                                </span>
                              )}
                            </div>
                            <div className="contact-row">
                              <span className="contact-icon">📍</span>
                              <span className="contact-value" style={{color:"var(--muted)",fontWeight:500}}>{lead.location}</span>
                            </div>
                            {linkedin && isSubscribed && (
                              <div className="contact-row">
                                <span className="contact-icon">💼</span>
                                <span className="contact-value"><a href={linkedin} target="_blank" rel="noreferrer" style={{color:"#0077b5",fontWeight:600}}>LinkedIn Profile</a></span>
                              </div>
                            )}
                            {isSubscribed && (
                              <button
                                onClick={()=>handleEnrich(lead)}
                                disabled={enriching===lead.id}
                                style={{marginTop:8,width:"100%",padding:"6px",border:"1.5px solid var(--teal)",borderRadius:8,background:en?"rgba(0,201,167,.08)":"transparent",color:"var(--teal2)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
                              >
                                {enriching===lead.id ? <><span className="spin spin-d" style={{width:10,height:10,borderColor:"rgba(0,201,167,.2)",borderTopColor:"var(--teal)"}}/> Searching Apollo...</> : en ? "✦ Re-verify with Apollo" : "⚡ Verify Contact with Apollo"}
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      <div className="lead-tags">
                        <span className="lead-tag">{RETAILER_TYPES.find(r=>r.id===lead.retailerType)?.label||lead.retailerType}</span>
                        {lead.categories.map((c)=><span key={c} className="lead-tag">{c}</span>)}
                        {productCategory && getCategoryMatches(productCategory).some(m=>lead.categories.includes(m)) && <span className="lead-tag" style={{background:"rgba(0,201,167,.15)",color:"var(--teal2)",border:"1px solid rgba(0,201,167,.3)"}}>✦ Category Match</span>}
                      </div>
                      <div className="lead-conf">
                        <span>Contact confidence</span>
                        <div className="conf-bar"><div className="conf-fill" style={{width:`${lead.confidence}%`}}/></div>
                        <strong style={{color:"var(--teal)"}}>{lead.confidence}%</strong>
                      </div>
                      <div className="lead-ctx">{lead.context}</div>
                      <div onClick={e=>e.stopPropagation()}><textarea className="notes-area" placeholder="Add a note…" value={notes[lead.id]||""} onChange={e=>saveNote(lead.id,e.target.value)} rows={2}/></div>
                      {generating===lead.id && (
                        <div style={{marginTop:9,display:"flex",alignItems:"center",gap:7,fontSize:12,color:"var(--muted)",fontWeight:600}}>
                          <span className="spin spin-d"/> Writing personalized email…
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* EMAIL PANEL */}
                <div className="email-panel">
                  {!activeLead ? (
                    <div className="card"><div className="empty"><div className="empty-icon">✉️</div><h4>Select a buyer</h4><p>Click any buyer card to generate a personalized cold email, LinkedIn message, or follow-up.</p></div></div>
                  ) : (
                    <div className="card">
                      <div className="card-head">
                        <div>
                          <div className="ch-label">📬 {activeLead.firstName} {activeLead.lastName}</div>
                          <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{activeLead.title} · {activeLead.retailer}</div>
                        </div>
                        <button className="status-pill" style={{background:STATUS_CONFIG[outreachStatus[activeLead.id]||"none"].bg,color:STATUS_CONFIG[outreachStatus[activeLead.id]||"none"].color,borderColor:STATUS_CONFIG[outreachStatus[activeLead.id]||"none"].color+"44"}} onClick={()=>cycleStatus(activeLead.id)}>{STATUS_CONFIG[outreachStatus[activeLead.id]||"none"].label}</button>
                      </div>
                      <div className="card-body">
                        <div style={{background:"#f0f4ff",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",gap:18,flexWrap:"wrap",border:"1px solid var(--border)"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}>
                            <span>📧</span>
                            {isSubscribed ? <a href={`mailto:${activeLead.email}`} style={{color:"var(--accent)",fontWeight:600,textDecoration:"none"}}>{activeLead.email}</a> : <><span className="contact-blur" style={{fontSize:13}}>buyer@retailer.com</span><span className="lock-badge" onClick={()=>{setPaywallLead(activeLead);setShowPaywall(true);}}>🔒 Unlock</span></>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}>
                            <span>📞</span>
                            {isSubscribed ? <a href={`tel:${activeLead.phone}`} style={{color:"var(--accent)",fontWeight:600,textDecoration:"none"}}>{activeLead.phone}</a> : <span className="contact-blur" style={{fontSize:13}}>(###) ###-####</span>}
                          </div>
                        </div>
                        <div className="etab-bar">
                          <button className={`etab ${activeEmailTab==="email"?"on":""}`} onClick={()=>setActiveEmailTab("email")}>✉️ Cold Email</button>
                          <button className={`etab ${activeEmailTab==="linkedin"?"on":""}`} onClick={()=>{setActiveEmailTab("linkedin");if(!linkedIn[activeLead.id]&&generatingLI!==activeLead.id)handleGenerateLinkedIn(activeLead);}}>💼 LinkedIn</button>
                          <button className={`etab ${activeEmailTab==="followup"?"on":""}`} onClick={()=>{setActiveEmailTab("followup");if(!followUps[activeLead.id]&&generatingFU!==activeLead.id)handleGenerateFollowUp(activeLead);}}>🔄 Follow-Up</button>
                        </div>
                        {activeEmailTab==="email" && (!emails[activeLead.id]
                          ? <div style={{textAlign:"center",padding:"28px 0"}}>{generating===activeLead.id?<><span className="spin spin-d" style={{width:18,height:18}}/><div style={{marginTop:10,fontSize:13,color:"var(--muted)"}}>Writing email…</div></>:<button className="btn btn-gold" onClick={()=>{if(isSubscribed){handleGenerateEmail(activeLead);}else{setPaywallLead(activeLead);setShowPaywall(true);}}}>⚡ Generate Cold Email</button>}</div>
                          : <><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}><div className="variant-bar"><button className={`v-tab ${activeVariant==="a"?"on":""}`} onClick={()=>setActiveVariant("a")}>A · {emails[activeLead.id]?.a?.angle||"Variant A"}</button><button className={`v-tab ${activeVariant==="b"?"on":""}`} onClick={()=>setActiveVariant("b")}>B · {emails[activeLead.id]?.b?.angle||"Variant B"}</button></div><button className="btn btn-outline btn-sm" onClick={()=>handleGenerateEmail(activeLead)} disabled={generating===activeLead.id}>{generating===activeLead.id?<span className="spin spin-d"/>:"↺ Regen"}</button></div>{currentEmail&&<><div className="e-angle">{currentEmail.angle}</div><div className="e-sub-lbl">Subject Line</div><div className="e-subject">{currentEmail.subject}</div><div className="e-body">{currentEmail.body}</div><div className="e-actions"><button className="btn btn-navy btn-sm" onClick={()=>{navigator.clipboard.writeText(`Subject: ${currentEmail.subject}\n\n${currentEmail.body}`);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>{copied?"✓ Copied!":"Copy Email"}</button><button className="btn btn-outline btn-sm" onClick={exportCSV}>↓ Export CSV</button></div></>}</>
                        )}
                        {activeEmailTab==="linkedin" && (generatingLI===activeLead.id
                          ? <div style={{textAlign:"center",padding:"28px 0"}}><span className="spin spin-d" style={{width:18,height:18}}/><div style={{marginTop:10,fontSize:13,color:"var(--muted)"}}>Writing LinkedIn messages…</div></div>
                          : !linkedIn[activeLead.id]
                            ? <div style={{textAlign:"center",padding:"20px 0"}}><button className="btn btn-gold" onClick={()=>handleGenerateLinkedIn(activeLead)}>⚡ Generate LinkedIn</button></div>
                            : <><div style={{display:"flex",gap:2,background:"#f0f7ff",borderRadius:9,padding:3,width:"fit-content",marginBottom:14}}><button className={`etab ${activeVariantLI==="connection"?"on":""}`} onClick={()=>setActiveVariantLI("connection")} style={{fontSize:11}}>🔗 Connection Note</button><button className={`etab ${activeVariantLI==="dm"?"on":""}`} onClick={()=>setActiveVariantLI("dm")} style={{fontSize:11}}>💬 DM</button></div><div className="li-card"><div className="li-label">{activeVariantLI==="connection"?"Connection Request (≤300 chars)":"Direct Message (≤500 chars)"}</div><div className="li-text">{linkedIn[activeLead.id][activeVariantLI]}</div><div className="li-char">{linkedIn[activeLead.id][activeVariantLI]?.length} chars</div></div><div className="e-actions"><button className="btn btn-navy btn-sm" onClick={()=>{navigator.clipboard.writeText(linkedIn[activeLead.id][activeVariantLI]);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>{copied?"✓ Copied!":"Copy"}</button><button className="btn btn-outline btn-sm" onClick={()=>handleGenerateLinkedIn(activeLead)}>↺ Regen</button></div></>
                        )}
                        {activeEmailTab==="followup" && (generatingFU===activeLead.id
                          ? <div style={{textAlign:"center",padding:"28px 0"}}><span className="spin spin-d" style={{width:18,height:18}}/><div style={{marginTop:10,fontSize:13,color:"var(--muted)"}}>Writing follow-up…</div></div>
                          : !followUps[activeLead.id]
                            ? <div style={{textAlign:"center",padding:"20px 0"}}><button className="btn btn-gold" onClick={()=>handleGenerateFollowUp(activeLead)}>⚡ Generate Follow-Up</button></div>
                            : <><div className="fu-badge">🔄 Follow-Up Email</div><div className="e-sub-lbl">Subject Line</div><div className="e-subject" style={{fontSize:18}}>{followUps[activeLead.id].subject}</div><div className="e-body">{followUps[activeLead.id].body}</div><div className="e-actions"><button className="btn btn-navy btn-sm" onClick={()=>{navigator.clipboard.writeText(`Subject: ${followUps[activeLead.id].subject}\n\n${followUps[activeLead.id].body}`);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>{copied?"✓ Copied!":"Copy Follow-Up"}</button><button className="btn btn-outline btn-sm" onClick={()=>handleGenerateFollowUp(activeLead)}>↺ Regen</button></div></>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {screen === "tracker" && (
        <div className="page">
          <button className="back-btn" onClick={()=>setScreen(leads.length?"results":"home")}>← Back</button>
          <h1 className="sh">Outreach Tracker</h1>
          <p className="ss">Track your outreach status for every buyer in your current search.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:24}}>
            {Object.entries(STATUS_CONFIG).map(([key,cfg])=>{
              const count = key==="none"?leads.filter(l=>!outreachStatus[l.id]||outreachStatus[l.id]==="none").length:leads.filter(l=>outreachStatus[l.id]===key).length;
              return <div key={key} style={{background:cfg.bg,border:`1.5px solid ${cfg.color}44`,borderRadius:10,padding:"10px 16px",minWidth:100,textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:cfg.color,fontFamily:"Georgia,serif"}}>{count}</div><div style={{fontSize:10,color:cfg.color,fontWeight:700,marginTop:2}}>{cfg.label}</div></div>;
            })}
          </div>
          {leads.length===0
            ? <div className="no-results-box"><h4 style={{color:"var(--accent)"}}>No leads yet</h4><p>Search for buyers first.</p><button className="btn btn-navy btn-sm" style={{marginTop:14}} onClick={()=>setScreen("search")}>Find Buyers →</button></div>
            : <div className="tracker-grid">{[...leads].sort((a,b)=>{const o={won:0,contacted:1,followedup:2,none:3,lost:4};return(o[outreachStatus[a.id]||"none"]??3)-(o[outreachStatus[b.id]||"none"]??3);}).map(lead=>{
                const status=outreachStatus[lead.id]||"none";const cfg=STATUS_CONFIG[status];const em=emails[lead.id];
                return <div key={lead.id} className="tracker-card" style={{borderColor:status!=="none"?cfg.color+"66":"var(--border)"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:10}}>
                    <div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,fontSize:14,color:"var(--dark)"}}>{lead.firstName} {lead.lastName}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{lead.title}</div><div style={{fontSize:12,fontWeight:700,color:"var(--accent)",marginTop:1}}>{lead.retailer}</div></div>
                    <button className="status-pill" style={{background:cfg.bg,color:cfg.color,borderColor:cfg.color+"44"}} onClick={()=>cycleStatus(lead.id)}>{cfg.label}</button>
                  </div>
                  <div style={{display:"flex",gap:12,marginBottom:8,flexWrap:"wrap"}}>
                    <a href={`mailto:${lead.email}`} style={{fontSize:11,color:"var(--accent)",fontWeight:600,textDecoration:"none"}}>📧 {lead.email}</a>
                    <span style={{fontSize:11,color:"var(--muted)",fontWeight:600}}>📞 {lead.phone}</span>
                  </div>
                  {em?.a?.subject && <div style={{fontSize:11,fontWeight:600,color:"var(--dark)",padding:"5px 8px",background:"#f8faff",borderRadius:7,marginBottom:7,borderLeft:"2px solid var(--accent)"}}>✉️ {em.a.subject}</div>}
                  {notes[lead.id] && <div style={{fontSize:11,color:"#6b7a99",fontStyle:"italic",marginTop:6,padding:"6px 8px",background:"#f8faff",borderRadius:7,borderLeft:"2px solid var(--teal)"}}>💬 {notes[lead.id]}</div>}
                  <div style={{marginTop:10,display:"flex",gap:6}}>
                    <button className="btn btn-outline btn-sm" style={{fontSize:10}} onClick={()=>{setActiveLead(lead);setActiveEmailTab("email");setScreen("results");}}>View Emails</button>
                    {!em&&<button className="btn btn-gold btn-sm" style={{fontSize:10}} disabled={generating===lead.id} onClick={()=>{setActiveLead(lead);handleGenerateEmail(lead);setScreen("results");}}>⚡ Generate</button>}
                  </div>
                </div>;
              })}</div>
          }
        </div>
      )}

      {/* PAYWALL MODAL */}
      {showPaywall && (
        <div className="paywall-overlay" onClick={()=>setShowPaywall(false)}>
          <div className="paywall-modal" onClick={e=>e.stopPropagation()}>
            <div className="paywall-hero" style={{position:"relative"}}>
              <button className="paywall-close" onClick={()=>setShowPaywall(false)}>×</button>
              <div className="paywall-icon">🔓</div>
              <h2>{paywallLead ? `Unlock ${paywallLead.firstName}'s Contact Info` : "Unlock Full Access"}</h2>
              <p>{paywallLead ? `Get the direct email and phone for ${paywallLead.firstName} ${paywallLead.lastName}, ${paywallLead.title} at ${paywallLead.retailer}.` : "Get direct email, phone, and AI-generated outreach for every buyer in our database."}</p>
            </div>
            <div className="paywall-body">
              {/* Pricing */}
              <div style={{textAlign:"center",marginBottom:22,padding:"18px 0",borderBottom:"1px solid var(--border)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:4}}>
                  <span style={{fontSize:18,color:"var(--muted)",fontWeight:600,textDecoration:"line-through"}}>$2,500</span>
                  <span style={{background:"linear-gradient(135deg,#ff6b6b,#ee5a24)",color:"#fff",fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20,letterSpacing:".3px",textTransform:"uppercase"}}>$500 OFF</span>
                </div>
                <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:4}}>
                  <span style={{fontFamily:"Georgia,serif",fontSize:56,fontWeight:700,color:"var(--dark)",letterSpacing:"-2px",lineHeight:1}}>$2,000</span>
                  <span style={{fontSize:15,color:"var(--muted)",fontWeight:600}}>/month</span>
                </div>
                <div style={{fontSize:12,color:"var(--teal2)",fontWeight:700,marginTop:6}}>Sale price — save $500 · Cancel anytime</div>
              </div>
              {/* Features */}
              <div className="paywall-features">
                {[
                  "Direct email & phone for every verified buyer",
                  "AI cold emails with A/B variants per buyer",
                  "LinkedIn messages & follow-up emails",
                  "80+ buyers across 30+ major retailers",
                  "Outreach tracker with notes & status",
                  "Export all emails & contacts to CSV",
                  "New buyers added every month",
                ].map(f=>(
                  <div key={f} className="pf-row"><div className="pf-check">✓</div>{f}</div>
                ))}
              </div>
              {/* Stripe CTA */}
              <button className="paywall-cta" onClick={()=>handleStripeCheckout()}>
                Subscribe Now — $2,000/mo →
              </button>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:14}}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" style={{height:18,opacity:.5}}/>
                <span style={{fontSize:11,color:"var(--muted)",fontWeight:500}}>Secured by Stripe · PCI compliant</span>
              </div>
              <div className="paywall-fine">You'll be redirected to Stripe's secure checkout to enter your payment info.</div>
              <div style={{marginTop:20,paddingTop:18,borderTop:"1px solid var(--border)"}}>
                <div style={{fontSize:12,color:"var(--muted)",fontWeight:600,textAlign:"center",marginBottom:10}}>Have an access code?</div>
                <div style={{display:"flex",gap:8}}>
                  <input
                    type="text"
                    placeholder="Enter access code"
                    value={accessCode}
                    onChange={e=>setAccessCode(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&handleAccessCode()}
                    style={{flex:1,padding:"9px 12px",border:"1.5px solid var(--border)",borderRadius:9,fontFamily:"inherit",fontSize:13,outline:"none",background:"var(--bg)"}}
                  />
                  <button onClick={handleAccessCode} style={{padding:"9px 16px",background:"var(--dark)",color:"#fff",border:"none",borderRadius:9,fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer"}}>Apply</button>
                </div>
                {codeError && <div style={{fontSize:11,color:"#f06292",fontWeight:600,marginTop:6,textAlign:"center"}}>{codeError}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
