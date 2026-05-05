import { useState, useCallback, useRef } from "react";
import LandingPage from "./LandingPage.jsx";

const PAYMENT_LINK = "https://buy.stripe.com/8x200j5GZaO9aYZb7A2Ji00";
const ACCESS_CODE  = "Championsucks";

async function apolloSearch(retailer, titles) {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ retailer, titleKeyword: titles || null }),
  });
  const d = await res.json();
  return { leads: d.leads || [], total: d.apolloTotal || d.total || 0 };
}

async function generateText(prompt) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("API error " + res.status);
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  const match = (d.result || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Bad response format");
  return JSON.parse(match[0]);
}

const STATUSES = [
  { id: "none",    label: "Not Contacted", color: "#64748b" },
  { id: "sent",    label: "Emailed",       color: "#38bdf8" },
  { id: "opened",  label: "Opened",        color: "#fb923c" },
  { id: "replied", label: "Replied",       color: "#4ade80" },
  { id: "meeting", label: "Meeting Set",   color: "#facc15" },
  { id: "passed",  label: "Passed",        color: "#f87171" },
];

const AV_COLORS = ["#00c9a7","#06b6d4","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#00c9a7"];

const TITLE_OPTIONS = [
  "Buyer","Senior Buyer","Merchant","Senior Merchant",
  "Category Manager","Senior Category Manager",
  "Director of Merchandising","VP of Merchandising",
  "Divisional Merchandise Manager","Head of Buying",
  "Chief Merchant","Procurement Manager","Sourcing Manager",
];

const QUICK_COMPANIES = ["Walmart","Sam's Club","Kroger","Target","Costco","Home Depot","CVS","Tractor Supply","Amazon","Lowe's","Publix","Walgreens","Best Buy","Dollar General","Albertsons"];

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall,  setShowPaywall]  = useState(false);
  const [accessCode,   setAccessCode]   = useState("");
  const [codeError,    setCodeError]    = useState("");

  const [repName,     setRepName]     = useState("");
  const [brandName,   setBrandName]   = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [emailTone,   setEmailTone]   = useState("professional");

  const [companyInput,   setCompanyInput]   = useState("");
  const [titleSearch,    setTitleSearch]    = useState("");
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [leads,          setLeads]          = useState([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [searching,      setSearching]      = useState(false);
  const [hasSearched,    setHasSearched]    = useState(false);
  const [nextCursor,     setNextCursor]     = useState(null);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [searchMode,     setSearchMode]     = useState("company"); // "company" | "person"

  const searchTimer = useRef(null);

  const [activeLead, setActiveLead] = useState(null);
  const [selected,   setSelected]   = useState(new Set());
  const [emails,     setEmails]     = useState({});
  const [linkedIns,  setLinkedIns]  = useState({});
  const [followUps,  setFollowUps]  = useState({});
  const [genEmail,   setGenEmail]   = useState(null);
  const [genLI,      setGenLI]      = useState(null);
  const [genFU,      setGenFU]      = useState(null);
  const [emailTab,   setEmailTab]   = useState("cold");
  const [variant,    setVariant]    = useState("a");
  const [copied,     setCopied]     = useState(null);
  const [enriching,  setEnriching]  = useState(new Set()); // contact IDs currently being enriched
  const [enriched,   setEnriched]   = useState({}); // id -> {email, phone, linkedin}
  const [statuses,   setStatuses]   = useState({});
  const [notes,      setNotes]      = useState({});
  const [view,       setView]       = useState("people");
  const [departments, setDepartments] = useState({});
  const [loadingDepts, setLoadingDepts] = useState(false);

  // Practice tab
  const [pitchText,          setPitchText]          = useState("");
  const [isRecordingPitch,   setIsRecordingPitch]   = useState(false);
  const [isRecordingResp,    setIsRecordingResp]    = useState(false);
  const [currentObjection,   setCurrentObjection]   = useState(null);
  const [objResp,            setObjResp]            = useState("");
  const [scoringResult,      setScoringResult]      = useState(null);
  const [genObjection,       setGenObjection]       = useState(false);
  const [scoringResp,        setScoringResp]        = useState(false);
  const [practiceHistory,    setPracticeHistory]    = useState([]);
  const [prevObjections,     setPrevObjections]     = useState([]);
  const [practiceStarted,    setPracticeStarted]    = useState(false);

  // ── Forecasting ──
  const [dealValue, setDealValue] = useState("");

  // ── Write with AI ──
  const [aiTab,      setAiTab]      = useState("pitch");
  const [pitchCtx,   setPitchCtx]   = useState("");
  const [pitchBusy,  setPitchBusy]  = useState(false);
  const [pitchRes,   setPitchRes]   = useState("");
  const [objInput,   setObjInput]   = useState("");
  const [objBusy,    setObjBusy]    = useState(false);
  const [objRes,     setObjRes]     = useState("");
  const [subjInput,  setSubjInput]  = useState("");
  const [subjBusy,   setSubjBusy]   = useState(false);
  const [subjRes,    setSubjRes]    = useState(null);
  const [valBusy,    setValBusy]    = useState(false);
  const [valRes,     setValRes]     = useState(null);
  const [callCtx,    setCallCtx]    = useState("");
  const [callBusy,   setCallBusy]   = useState(false);
  const [callRes,    setCallRes]    = useState("");

  // ── Email Sequences ──
  const [sequences,    setSequences]    = useState([]);
  const [showNewSeq,   setShowNewSeq]   = useState(false);
  const [newSeqName,   setNewSeqName]   = useState("");
  const [newSeqTarget, setNewSeqTarget] = useState("");
  const [newSeqSteps,  setNewSeqSteps]  = useState(3);
  const [seqBusy,      setSeqBusy]      = useState(false);
  const [activeSeq,    setActiveSeq]    = useState(null);

  // ── Sales Toolkit ──
  const [enabTab,          setEnabTab]          = useState("playbook");
  const [playbookTarget,   setPlaybookTarget]   = useState("");
  const [playbookBusy,     setPlaybookBusy]     = useState(false);
  const [playbookResult,   setPlaybookResult]   = useState(null);
  const [pitchTplBusy,     setPitchTplBusy]     = useState(false);
  const [pitchTplResult,   setPitchTplResult]   = useState("");
  const [sellSheetBusy,    setSellSheetBusy]    = useState(false);
  const [sellSheetResult,  setSellSheetResult]  = useState(null);
  const [objLibSearch,     setObjLibSearch]     = useState("");
  const [objLibBusy,       setObjLibBusy]       = useState(false);
  const [objLibResult,     setObjLibResult]     = useState(null);

  // ── Buyer Research ──
  const [intelQuery,  setIntelQuery]  = useState("");
  const [intelBusy,   setIntelBusy]   = useState(false);
  const [intelResult, setIntelResult] = useState(null);

  // ── Meeting Prep ──
  const [meetContact,    setMeetContact]    = useState(null);
  const [meetTab,        setMeetTab]        = useState("brief");
  const [meetBriefBusy,  setMeetBriefBusy]  = useState(false);
  const [meetBriefResult,setMeetBriefResult]= useState(null);
  const [agendaBusy,     setAgendaBusy]     = useState(false);
  const [agendaResult,   setAgendaResult]   = useState("");
  const [meetNotes,      setMeetNotes]      = useState({});
  const [followupBusy,   setFollowupBusy]   = useState(false);
  const [followupResult, setFollowupResult] = useState(null);
  const pitchRecRef    = useRef(null);
  const responseRecRef = useRef(null);

  // fetchDepartments must be defined first — used by runSearch, runPersonSearch, loadMore
  const fetchDepartments = useCallback(async (leadList) => {
    if (!leadList || !leadList.length) return;
    setLoadingDepts(true);
    const needed = leadList
      .filter(l => l && l.id)
      .map(l => ({ id: l.id, firstName: l.firstName, lastName: l.lastName, title: l.title, retailer: l.retailer }))
      .slice(0, 30);
    if (!needed.length) { setLoadingDepts(false); return; }
    try {
      const res = await fetch("/api/department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: needed }),
      });
      const data = await res.json();
      if (data.departments) setDepartments(p => ({ ...p, ...data.departments }));
    } catch(e) { console.error("Dept fetch failed:", e); }
    setLoadingDepts(false);
  }, []);

  const runSearch = useCallback(async (company, titles) => {
    if (!company.trim() || company.trim().length < 2) {
      setLeads([]); setHasSearched(false); setNextCursor(null); return;
    }
    setSearching(true);
    setLeads([]); setNextCursor(null); setDepartments({});
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retailer: company, titleKeyword: titles || null, cursor: 1 }),
      });
      const data = await res.json();
      const r = data.leads || [];
      setLeads(r);
      setTotalAvailable(data.apolloTotal || r.length);
      setNextCursor(data.nextCursor || null);
      setHasSearched(true);
      setActiveLead(null);
      if (r.length) setTimeout(() => fetchDepartments(r), 100);
    } catch(e) { setLeads([]); setHasSearched(true); }
    setSearching(false);
  }, [fetchDepartments]);

  const runPersonSearch = useCallback(async (name) => {
    if (!name.trim() || name.trim().length < 3) return;
    setSearching(true);
    setLeads([]); setNextCursor(null); setDepartments({});
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personName: name.trim(), cursor: 1 }),
      });
      const data = await res.json();
      const r = data.leads || [];
      setLeads(r);
      setTotalAvailable(data.apolloTotal || r.length);
      setNextCursor(data.nextCursor || null);
      setHasSearched(true);
      setActiveLead(null);
      if (r.length) setTimeout(() => fetchDepartments(r), 100);
    } catch(e) { setLeads([]); setHasSearched(true); }
    setSearching(false);
  }, [fetchDepartments]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || !companyInput) return;
    setLoadingMore(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retailer: companyInput, titleKeyword: selectedTitles.length ? selectedTitles.join(" ") : null, cursor: nextCursor }),
      });
      const data = await res.json();
      const newLeads = data.leads || [];
      setLeads(prev => {
        const existing = new Set(prev.map(l => l.firstName + l.lastName));
        const unique = newLeads.filter(l => !existing.has(l.firstName + l.lastName));
        setTimeout(() => fetchDepartments(unique), 100);
        return [...prev, ...unique];
      });
      setNextCursor(data.nextCursor || null);
    } catch(e) { console.error("Load more failed:", e); }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, companyInput, selectedTitles, fetchDepartments]);

  const detectSearchMode = (val) => {
    const trimmed = val.trim();
    const words = trimmed.split(" ");
    const companyKeywords = ["walmart","kroger","target","costco","amazon","cvs","depot","supply","publix","walgreens","dollar","best buy","sam","lowe","aldi","trader","whole foods","meijer","heb","sprouts","wegmans","rite","marshalls","ross","maxx","general"];
    const isCompany = companyKeywords.some(k => trimmed.toLowerCase().includes(k));
    if (words.length >= 2 && words.length <= 4 && !isCompany && !trimmed.match(/[0-9]/)) {
      return "person";
    }
    return "company";
  };

  const enrichContact = useCallback(async (lead) => {
    if (!isSubscribed) { setShowPaywall(true); return; }
    setEnriching(prev => new Set([...prev, lead.id]));
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apolloId:  lead.apolloId,
          firstName: lead.firstName,
          lastName:  lead.lastName,
          retailer:  lead.retailer,
          linkedin:  lead.linkedin,
        }),
      });
      const data = await res.json();
      setEnriched(prev => ({ ...prev, [lead.id]: data }));
      // Also update the lead in the leads array with the revealed info
      setLeads(prev => prev.map(l => l.id === lead.id
        ? { ...l, email: data.email || l.email, phone: data.phone || l.phone }
        : l
      ));
    } catch(e) { console.error("Enrich failed:", e); }
    setEnriching(prev => { const n = new Set(prev); n.delete(lead.id); return n; });
  }, [isSubscribed]);

  const handleCompanyInput = (val) => {
    setCompanyInput(val);
    const mode = detectSearchMode(val);
    setSearchMode(mode);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (mode === "person") runPersonSearch(val);
      else runSearch(val, selectedTitles.length ? selectedTitles.join(" ") : null);
    }, 500);
  };

  const toggleTitle = (t) => {
    const next = selectedTitles.includes(t) ? selectedTitles.filter(x=>x!==t) : [...selectedTitles, t];
    setSelectedTitles(next);
    if (companyInput.trim()) runSearch(companyInput, next.length ? next.join(" ") : null);
  };

  const openLead = (lead) => {
    if (!isSubscribed) { setShowPaywall(true); return; }
    setActiveLead(activeLead?.id === lead.id ? null : lead);
    setEmailTab("cold");
    // Auto-enrich to reveal contact info if not already done
    if (!lead.email && !lead.phone && !enriching.has(lead.id)) {
      enrichContact(lead);
    }
  };

  const genEmail_ = async (lead) => {
    if (!brandName) return alert("Enter your brand name in the settings bar first.");
    setGenEmail(lead.id);
    try {
      const r = await generateText(
        `Write TWO cold email variants (A/B) from a CPG sales rep to a retail buyer.
Rep: ${repName||"Sales Rep"}. Brand: ${brandName}. Product: ${productDesc||brandName}.
Buyer: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.retailer}. Tone: ${emailTone}.
Max 120 words body. Specific, compelling subjects.
ONLY JSON: {"a":{"subject":"...","body":"..."},"b":{"subject":"...","body":"..."}}`
      );
      setEmails(p => ({...p,[lead.id]:r}));
    } catch(e) { alert("Failed: "+e.message); }
    setGenEmail(null);
  };

  const genLI_ = async (lead) => {
    setGenLI(lead.id);
    try {
      const r = await generateText(
        `LinkedIn outreach, CPG sales rep to retail buyer.
Rep: ${repName||"Sales Rep"}. Brand: ${brandName||"our brand"}.
Buyer: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.retailer}.
Connection note max 300 chars. DM max 500 chars.
ONLY JSON: {"connection":"...","dm":"..."}`
      );
      setLinkedIns(p => ({...p,[lead.id]:r}));
    } catch(e) { alert("Failed: "+e.message); }
    setGenLI(null);
  };

  const genFU_ = async (lead) => {
    setGenFU(lead.id);
    try {
      const r = await generateText(
        `Follow-up email, no reply received.
Rep: ${repName||"Sales Rep"}. Brand: ${brandName||"our brand"}.
Prior subject: "${emails[lead.id]?.a?.subject||""}".
Buyer: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.retailer}.
No "just checking in". Add value. Max 80 words. Subject "Re:...".
ONLY JSON: {"subject":"...","body":"..."}`
      );
      setFollowUps(p => ({...p,[lead.id]:r}));
    } catch(e) { alert("Failed: "+e.message); }
    setGenFU(null);
  };

  // ── PRACTICE helpers ──
  const startSpeech = (onText, setActive, recRef) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice recording requires Chrome or Edge. Please type instead."); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    let final = "";
    r.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      onText(final + interim);
    };
    r.onerror = () => { setActive(false); recRef.current = null; };
    r.onend   = () => { setActive(false); recRef.current = null; };
    r.start(); setActive(true); recRef.current = r;
  };

  const stopSpeech = (setActive, recRef) => {
    if (recRef.current) { recRef.current.stop(); recRef.current = null; }
    setActive(false);
  };

  const generateObjection = async () => {
    if (!pitchText.trim()) return alert("Enter or record your sales pitch first.");
    setGenObjection(true); setScoringResult(null); setObjResp("");
    try {
      const r = await fetch("/api/objection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", pitch: pitchText, brand: brandName, product: productDesc, previousObjections: prevObjections }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setCurrentObjection(d);
      setPracticeStarted(true);
    } catch(e) { alert("Failed to generate objection: " + e.message); }
    setGenObjection(false);
  };

  const scoreResponse = async () => {
    if (!objResp.trim()) return alert("Enter your response first.");
    setScoringResp(true);
    try {
      const r = await fetch("/api/objection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "score", objection: currentObjection.objection, response: objResp, brand: brandName, product: productDesc }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setScoringResult(d);
      setPracticeHistory(prev => [...prev, { objection: currentObjection, response: objResp, score: d.score }]);
      setPrevObjections(prev => [...prev, currentObjection.objection]);
    } catch(e) { alert("Failed to score response: " + e.message); }
    setScoringResp(false);
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),1800); };

  // ── Write with AI handlers ──
  const genPitch = async () => {
    setPitchBusy(true); setPitchRes("");
    try {
      const r = await generateText(`You are a CPG sales expert. Generate a concise, persuasive 60-second retail sales pitch for a rep with these details:
Brand: ${brandName||"their brand"}
Product: ${productDesc||"their product"}
Retail Context: ${pitchCtx||"general retail"}
Rep Name: ${repName||"the rep"}
Write a natural, spoken-word pitch. Start with a hook, cover the key value props and consumer demand, and close with a clear ask. Keep it under 120 words. Return ONLY valid JSON: {"text":"..."}`);
      setPitchRes(r.text || "");
    } catch(e) { alert("Failed: " + e.message); }
    setPitchBusy(false);
  };

  const genObjHandler = async () => {
    if (!objInput.trim()) return;
    setObjBusy(true); setObjRes("");
    try {
      const d = await generateText(`You are a CPG sales coach. A retail buyer said: "${objInput}"
Brand: ${brandName||"the brand"} | Product: ${productDesc||"the product"}
Write ONE direct, confident, ready-to-use response the rep should say out loud. 3-4 natural sentences. No preamble. Return ONLY valid JSON: {"response":"..."}`);
      setObjRes(d.response || "");
    } catch(e) { alert("Failed: " + e.message); }
    setObjBusy(false);
  };

  const genSubjectTest = async () => {
    if (!subjInput.trim()) return;
    setSubjBusy(true); setSubjRes(null);
    try {
      const d = await generateText(`Rate this cold email subject line for a CPG sales rep and give 3 stronger alternatives.
Subject: "${subjInput}"
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"}
Score 1-10 (10=best). Return ONLY valid JSON: {"score":7,"feedback":"short reason","alternatives":["alt1","alt2","alt3"]}`);
      setSubjRes(d);
    } catch(e) { alert("Failed: " + e.message); }
    setSubjBusy(false);
  };

  const genValueProp = async () => {
    setValBusy(true); setValRes(null);
    try {
      const d = await generateText(`Generate 3 buyer-focused value proposition statements for a CPG sales rep.
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"}
Each value prop should speak directly to what the retail buyer cares about: margin, velocity, consumer demand, category growth.
Return ONLY valid JSON: {"props":["value prop 1","value prop 2","value prop 3"]}`);
      setValRes(d.props || []);
    } catch(e) { alert("Failed: " + e.message); }
    setValBusy(false);
  };

  const genCallScript = async () => {
    setCallBusy(true); setCallRes("");
    try {
      const r = await generateText(`Write a 60-second cold call script for a CPG sales rep.
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"} | Buyer Type: ${callCtx||"retail buyer"}
Include: opening hook, one key value prop, proof point, and a clear ask for a meeting. Natural spoken language. Under 150 words. Return ONLY valid JSON: {"text":"..."}`);
      setCallRes(r.text || "");
    } catch(e) { alert("Failed: " + e.message); }
    setCallBusy(false);
  };

  // ── Email Sequences handler ──
  const genSequence = async () => {
    if (!newSeqName.trim()) return;
    setSeqBusy(true);
    try {
      const d = await generateText(`Create a ${newSeqSteps}-step email outreach sequence for a CPG sales rep.
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"} | Target Buyer: ${newSeqTarget||"retail buyer"}
Each step: day number, type (Email/LinkedIn/Call), subject line (if email), and body (2-4 sentences, natural and direct).
Return ONLY valid JSON: {"steps":[{"day":1,"type":"Email","subject":"...","body":"..."},...]}`);
      const seq = { id: Date.now(), name: newSeqName, target: newSeqTarget, steps: d.steps || [] };
      setSequences(prev => [...prev, seq]);
      setActiveSeq(seq);
      setShowNewSeq(false); setNewSeqName(""); setNewSeqTarget(""); setNewSeqSteps(3);
    } catch(e) { alert("Failed: " + e.message); }
    setSeqBusy(false);
  };

  // ── Sales Toolkit handlers ──
  const genPlaybook = async () => {
    setPlaybookBusy(true); setPlaybookResult(null);
    try {
      const d = await generateText(`Create a tactical retail sales playbook for a CPG rep.
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"} | Target Retailers: ${playbookTarget||"major chains"}
Include 4-5 sections: Positioning, Outreach Strategy, Meeting Preparation, Objection Handling, Closing.
Each section has 3-4 actionable bullet points specific to CPG retail sales.
Return ONLY valid JSON: {"sections":[{"title":"...","bullets":["...","...","..."]},...]}`);
      setPlaybookResult(d);
    } catch(e) { alert("Failed: " + e.message); }
    setPlaybookBusy(false);
  };

  const genPitchTemplate = async () => {
    setPitchTplBusy(true); setPitchTplResult("");
    try {
      const r = await generateText(`Write a versatile 90-second elevator pitch template for a CPG sales rep with fill-in-the-blank fields.
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"}
Include placeholders like [RETAILER NAME], [CATEGORY], [VELOCITY STAT]. Natural spoken language. Return ONLY valid JSON: {"text":"..."}`);
      setPitchTplResult(r.text || "");
    } catch(e) { alert("Failed: " + e.message); }
    setPitchTplBusy(false);
  };

  const genSellSheet = async () => {
    setSellSheetBusy(true); setSellSheetResult(null);
    try {
      const d = await generateText(`Create a one-page sell sheet for a CPG sales rep.
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"}
Return ONLY valid JSON: {"headline":"...","subheadline":"...","productDescription":"...","targetConsumer":"...","keyBenefits":["...","...","..."],"velocityStats":"...","retailerBenefits":"...","callToAction":"..."}`);
      setSellSheetResult(d);
    } catch(e) { alert("Failed: " + e.message); }
    setSellSheetBusy(false);
  };

  const genObjLibrary = async () => {
    if (!objLibSearch.trim()) return;
    setObjLibBusy(true); setObjLibResult(null);
    try {
      const d = await generateText(`A retail buyer said exactly this: "${objLibSearch}"
Brand: ${brandName||"the brand"} | Product: ${productDesc||"the product"}
Give ONE confident, ready-to-say response a top CPG sales rep would use. Then explain the strategy behind it in 1-2 sentences.
Return ONLY valid JSON: {"response":"[3-4 natural spoken sentences]","strategy":"[why this approach works]"}`);
      setObjLibResult(d);
    } catch(e) { alert("Failed: " + e.message); }
    setObjLibBusy(false);
  };

  // ── Buyer Research handler ──
  const runIntelResearch = async () => {
    if (!intelQuery.trim()) return;
    setIntelBusy(true); setIntelResult(null);
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: intelQuery, brand: brandName, product: productDesc }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setIntelResult(d);
    } catch(e) { alert("Research failed: " + e.message); }
    setIntelBusy(false);
  };

  // ── Meeting Prep handlers ──
  const genMeetBrief = async (lead) => {
    setMeetContact(lead); setMeetTab("brief");
    setMeetBriefBusy(true); setMeetBriefResult(null); setAgendaResult(""); setFollowupResult(null);
    try {
      const d = await generateText(`Generate a pre-meeting brief for a CPG sales rep meeting with this buyer.
Buyer: ${lead.firstName} ${lead.lastName} at ${lead.retailer}, Title: ${lead.title||"Buyer"}
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"}
Return ONLY valid JSON: {"talkingPoints":["...","...","..."],"anticipatedObjections":["...","..."],"quickWins":["...","..."],"keyQuestions":["...","..."]}`);
      setMeetBriefResult(d);
    } catch(e) { alert("Failed: " + e.message); }
    setMeetBriefBusy(false);
  };

  const genAgenda = async () => {
    if (!meetContact) return;
    setAgendaBusy(true); setAgendaResult("");
    try {
      const r = await generateText(`Write a structured 30-minute meeting agenda for a CPG sales rep meeting with ${meetContact.firstName} ${meetContact.lastName} at ${meetContact.retailer}.
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"}
Format as a clear, time-blocked agenda. Include: intro, product overview, category opportunity, Q&A, next steps. Return ONLY valid JSON: {"text":"..."}`);
      setAgendaResult(r.text || "");
    } catch(e) { alert("Failed: " + e.message); }
    setAgendaBusy(false);
  };

  const genMeetFollowup = async () => {
    if (!meetContact) return;
    setFollowupBusy(true); setFollowupResult(null);
    const notes = meetNotes[meetContact.id] || "";
    try {
      const d = await generateText(`Write a professional follow-up email after a CPG sales meeting.
Buyer: ${meetContact.firstName} ${meetContact.lastName} at ${meetContact.retailer}
Brand: ${brandName||"their brand"} | Product: ${productDesc||"their product"}
${notes ? `Meeting Notes: ${notes}` : ""}
Warm but professional. Reference the meeting, confirm next steps, and keep it under 150 words.
Return ONLY valid JSON: {"subject":"...","body":"..."}`);
      setFollowupResult(d);
    } catch(e) { alert("Failed: " + e.message); }
    setFollowupBusy(false);
  };

  // ── Export CSV ──
  const exportCSV = () => {
    const header = "First Name,Last Name,Title,Company,Email,LinkedIn";
    const rows = leads.map(l => [l.firstName,l.lastName,l.title,l.retailer,l.email,l.linkedinUrl||""].map(v=>`"${(v||"").replace(/"/g,'""')}"`).join(","));
    const blob = new Blob([header+"\n"+rows.join("\n")],{type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download="repreach-contacts.csv"; a.click();
  };
  const getStatus = (id) => STATUSES.find(s=>s.id===(statuses[id]||"none"))||STATUSES[0];
  const cycleStatus = (id) => { const i=STATUSES.findIndex(s=>s.id===(statuses[id]||"none")); setStatuses(p=>({...p,[id]:STATUSES[(i+1)%STATUSES.length].id})); };

  const eData  = activeLead && emails[activeLead.id];
  const liData = activeLead && linkedIns[activeLead.id];
  const fuData = activeLead && followUps[activeLead.id];

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --bg:      #07080f;
          --bg2:     #0c0e19;
          --bg3:     #11152a;
          --border:  #1a1f3a;
          --border2: #242942;
          --teal:    #00e5c0;
          --teal2:   #00c9a7;
          --teal-dim:rgba(0,229,192,.08);
          --teal-glow:rgba(0,229,192,.25);
          --text:    #f0f2ff;
          --text2:   #8b91b8;
          --text3:   #3d4468;
          --amber:   #f5a623;
        }

        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%}
        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);font-size:13px;overflow:hidden}
        input,select,textarea,button{font-family:'Inter',sans-serif;font-size:13px}

        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
        ::-webkit-scrollbar-thumb:hover{background:var(--teal2)}

        /* ─── SHELL ─── */
        .shell{display:flex;height:100vh;overflow:hidden}

        /* ─── SIDEBAR ─── */
        .sidebar{width:230px;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}

        .sb-logo{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
        .sb-logo-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--teal),var(--teal2));border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:14px;color:#07080f;flex-shrink:0;box-shadow:0 0 16px var(--teal-glow)}
        .sb-logo-text{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:17px;color:var(--text);letter-spacing:-.4px}
        .sb-logo-text em{font-style:normal;color:var(--teal)}

        .sb-nav{padding:8px;border-bottom:1px solid var(--border)}
        .sb-item{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:9px;font-size:12px;font-weight:600;color:var(--text3);cursor:pointer;transition:.15s;margin-bottom:1px;letter-spacing:.01em}
        .sb-item:hover{background:var(--bg3);color:var(--text2)}
        .sb-item.on{background:var(--teal-dim);color:var(--teal);border:1px solid rgba(0,229,192,.14)}
        .sb-item-icon{font-size:14px;width:18px;text-align:center;flex-shrink:0}

        .sb-sec{border-bottom:1px solid var(--border);padding:14px}
        .sb-sec-hd{font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:9px;display:flex;align-items:center;justify-content:space-between}
        .sb-sec-clear{font-size:10px;color:var(--teal);font-weight:700;cursor:pointer;background:none;border:none}
        .sb-in{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 11px;font-size:12px;color:var(--text);outline:none;margin-bottom:9px;transition:.15s}
        .sb-in::placeholder{color:var(--text3)}
        .sb-in:focus{border-color:var(--teal2);box-shadow:0 0 0 3px rgba(0,229,192,.07)}
        .sb-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--teal-dim);border:1px solid rgba(0,229,192,.16);border-radius:6px;font-size:11px;color:var(--teal);margin:2px;cursor:pointer;transition:.1s;font-weight:600;letter-spacing:.01em}
        .sb-tag:hover{background:rgba(0,229,192,.14)}
        .sb-tag-x{color:var(--teal2);font-size:12px;font-weight:800}
        .sb-check{display:flex;align-items:center;gap:8px;padding:6px 7px;border-radius:7px;cursor:pointer;transition:.1s}
        .sb-check:hover{background:var(--bg3)}
        .sb-check label{font-size:12px;color:var(--text2);cursor:pointer;flex:1}
        .sb-check input[type=checkbox]{width:14px;height:14px;accent-color:var(--teal);cursor:pointer;flex-shrink:0}

        /* ─── RIGHT SIDE ─── */
        .right{flex:1;display:flex;flex-direction:column;overflow:hidden}

        /* ─── TOPBAR ─── */
        .topbar{height:52px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 18px;gap:12px;flex-shrink:0}
        .ts-wrap{flex:1;max-width:440px;position:relative}
        .ts-wrap input{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:9px 13px 9px 36px;font-size:13px;color:var(--text);outline:none;transition:.15s;font-weight:500}
        .ts-wrap input::placeholder{color:var(--text3)}
        .ts-wrap input:focus{border-color:var(--teal2);box-shadow:0 0 0 3px rgba(0,229,192,.08)}
        .ts-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:14px;pointer-events:none}
        .topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px}

        /* ─── SETTINGS ROW ─── */
        .sr{background:var(--bg2);border-bottom:1px solid var(--border);padding:7px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;flex-shrink:0}
        .sf{display:flex;flex-direction:column;gap:2px}
        .sf label{font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.9px}
        .sf input,.sf select{background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:5px 10px;font-size:12px;color:var(--text);outline:none;min-width:100px;transition:.15s;font-weight:500}
        .sf input::placeholder{color:var(--text3)}
        .sf input:focus,.sf select:focus{border-color:var(--teal2)}
        .sf select option{background:var(--bg2)}

        /* ─── CONTENT ─── */
        .content{flex:1;display:flex;overflow:hidden}
        .main{flex:1;overflow-y:auto;display:flex;flex-direction:column}

        /* ─── TOOLBAR ─── */
        .toolbar{padding:10px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:var(--bg2);flex-shrink:0}
        .rc{font-size:14px;font-weight:700;color:var(--text);font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-.2px}
        .rs{font-size:12px;color:var(--text3)}

        /* ─── PEOPLE TABLE ─── */
        .tbl-wrap{flex:1;overflow:auto}
        table.pt{width:100%;border-collapse:collapse;min-width:820px}
        table.pt thead{position:sticky;top:0;z-index:10}
        table.pt th{background:var(--bg2);border-bottom:1px solid var(--border);padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;white-space:nowrap}
        table.pt td{padding:10px 14px;border-bottom:1px solid rgba(26,31,58,.6);vertical-align:middle;transition:.1s}
        table.pt tr:hover td{background:rgba(12,14,25,.8)}
        table.pt tr.sel td{background:var(--teal-dim)}
        table.pt tr.act td{background:rgba(0,229,192,.06);border-left:2px solid var(--teal)}

        /* Avatar */
        .av{width:31px;height:31px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:#fff;flex-shrink:0;font-family:'Bricolage Grotesque',sans-serif}

        /* Name */
        .pname{font-weight:600;font-size:13px;color:var(--text);white-space:nowrap;letter-spacing:-.1px}
        .pli{color:var(--text3);font-size:10px;font-weight:700;cursor:pointer;margin-left:5px;padding:1px 6px;border-radius:4px;background:var(--bg3);border:1px solid var(--border);text-decoration:none;transition:.1s;letter-spacing:.02em}
        .pli:hover{border-color:var(--teal2);color:var(--teal)}
        .ptitle{color:var(--text3);font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pco{color:var(--teal);font-size:12px;font-weight:600;white-space:nowrap;letter-spacing:-.1px}

        /* Contact buttons */
        .cbtn{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:none;white-space:nowrap;transition:.12s;font-family:'Inter',sans-serif;letter-spacing:.01em}
        .cb-locked{background:var(--bg3);color:var(--text3);border:1px solid var(--border)}
        .cb-locked:hover{border-color:var(--amber);color:var(--amber)}
        .cb-email{background:var(--teal-dim);color:var(--teal);border:1px solid rgba(0,229,192,.18)}
        .cb-email:hover{background:rgba(0,229,192,.14)}
        .cb-gen{background:rgba(245,166,35,.08);color:var(--amber);border:1px solid rgba(245,166,35,.2)}
        .cb-gen:hover{background:rgba(245,166,35,.14)}
        .cb-phone{background:var(--bg3);color:var(--text2);border:1px solid var(--border)}
        .cb-phone:hover{border-color:#38bdf8;color:#38bdf8}

        /* Status pill */
        .spill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;cursor:pointer;border:none;font-family:'Inter',sans-serif;white-space:nowrap;letter-spacing:.02em}

        /* ─── DETAIL PANEL ─── */
        .detail{width:400px;background:var(--bg2);border-left:1px solid var(--border);overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column}
        .dp-head{padding:20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:13px}
        .dp-av{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff;flex-shrink:0;font-family:'Bricolage Grotesque',sans-serif}
        .dp-name{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:800;color:var(--text);margin-bottom:2px;letter-spacing:-.3px;line-height:1.2}
        .dp-role{font-size:12px;color:var(--text2);margin-bottom:2px;font-weight:500}
        .dp-co{font-size:12px;color:var(--teal);font-weight:700;letter-spacing:-.1px}
        .dp-x{background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;margin-left:auto;flex-shrink:0;line-height:1}
        .dp-x:hover{color:var(--text)}

        .dp-sec{padding:14px 20px;border-bottom:1px solid var(--border)}
        .dp-sec-title{font-size:9px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-family:'Bricolage Grotesque',sans-serif}
        .dp-row{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px}
        .dp-icon{color:var(--text3);width:16px;text-align:center;font-size:13px;flex-shrink:0}
        .dp-val{flex:1;color:var(--text2);word-break:break-all;font-weight:500}
        .dp-val a{color:var(--teal);text-decoration:none}
        .dp-val a:hover{text-decoration:underline}
        .dp-copy{font-size:10px;font-weight:700;color:var(--teal);cursor:pointer;background:var(--teal-dim);border:none;border-radius:5px;padding:3px 9px;flex-shrink:0;transition:.1s;letter-spacing:.02em}
        .dp-copy:hover{background:rgba(0,229,192,.16)}

        /* Email panel */
        .etabs{display:flex;border-bottom:1px solid var(--border);flex-shrink:0}
        .etab{padding:12px 16px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--text3);border-bottom:2px solid transparent;margin-bottom:-1px;transition:.15s;white-space:nowrap;letter-spacing:.02em}
        .etab.on{color:var(--teal);border-bottom-color:var(--teal)}
        .etab:hover:not(.on){color:var(--text2)}

        .email-area{padding:16px 20px;flex:1;overflow-y:auto}
        .ebox{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:14px;margin-bottom:10px;transition:.15s}
        .ebox:hover{border-color:var(--border2)}
        .elabel{font-size:9px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;font-family:'Bricolage Grotesque',sans-serif}
        .ebody{font-size:12px;line-height:1.8;color:var(--text2);white-space:pre-wrap;font-weight:400}
        .vbtn{padding:5px 14px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text3);transition:.12s;letter-spacing:.02em}
        .vbtn.on{border-color:var(--teal2);color:var(--teal);background:var(--teal-dim)}

        /* Buttons */
        .btn{padding:9px 20px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:.15s;display:inline-flex;align-items:center;gap:6px;font-family:'Inter',sans-serif;letter-spacing:.02em}
        .btn:disabled{opacity:.35;cursor:not-allowed}
        .btn-teal{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#07080f;box-shadow:0 4px 16px var(--teal-glow)}
        .btn-teal:hover:not(:disabled){box-shadow:0 4px 24px rgba(0,229,192,.35);transform:translateY(-1px)}
        .btn-outline{background:transparent;color:var(--text2);border:1px solid var(--border)}
        .btn-outline:hover:not(:disabled){border-color:var(--teal2);color:var(--teal)}
        .btn-amber{background:linear-gradient(135deg,var(--amber),#fbbf24);color:#07080f;box-shadow:0 4px 16px rgba(245,166,35,.2)}
        .btn-amber:hover:not(:disabled){box-shadow:0 4px 24px rgba(245,166,35,.35);transform:translateY(-1px)}
        .btn-sm{padding:5px 13px;font-size:11px;border-radius:7px}

        input[type=checkbox]{accent-color:var(--teal);cursor:pointer}

        @keyframes sp{to{transform:rotate(360deg)}}
        .spin{width:13px;height:13px;border:2px solid rgba(0,229,192,.12);border-top-color:var(--teal);border-radius:50%;animation:sp .7s linear infinite;display:inline-block;flex-shrink:0}
        .spin-lg{width:32px;height:32px;border-width:3px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .pulsing{animation:pulse 1.4s ease-in-out infinite}

        /* ─── PAYWALL ─── */
        .pw-overlay{position:fixed;inset:0;background:rgba(4,5,12,.88);backdrop-filter:blur(10px);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px}
        .pw-modal{background:var(--bg2);border:1px solid var(--border);border-radius:20px;max-width:440px;width:100%;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 0 1px rgba(0,229,192,.06);position:relative}
        .pw-head{background:linear-gradient(135deg,var(--bg),#081a15);padding:32px;text-align:center;border-bottom:1px solid rgba(0,229,192,.1)}
        .pw-glow{width:62px;height:62px;background:linear-gradient(135deg,var(--teal),var(--teal2));border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 18px;box-shadow:0 0 36px var(--teal-glow)}
        .pw-head h2{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;color:var(--text);margin-bottom:8px;letter-spacing:-.4px}
        .pw-head p{font-size:13px;color:var(--text2);line-height:1.65;max-width:300px;margin:0 auto;font-weight:500}
        .pw-body{padding:26px}
        .pw-price{text-align:center;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid var(--border)}
        .pw-amt{font-family:'Bricolage Grotesque',sans-serif;font-size:48px;font-weight:800;color:var(--text);line-height:1;letter-spacing:-2px}
        .pw-per{font-size:13px;color:var(--text2);margin-top:4px;font-weight:500}
        .pw-disc{font-size:12px;color:var(--teal);font-weight:700;margin-top:5px;letter-spacing:.02em}
        .pw-feats{display:flex;flex-direction:column;gap:10px;margin-bottom:22px}
        .pw-feat{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2);font-weight:500}
        .pw-feat:before{content:'→';color:var(--teal);font-weight:800;flex-shrink:0;font-size:15px}
        .pw-x{position:absolute;top:14px;right:16px;background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;line-height:1}
        .pw-x:hover{color:var(--text)}
        .pw-divider{text-align:center;color:var(--text3);font-size:11px;margin:14px 0;font-weight:600;letter-spacing:.6px}
        .code-wrap{display:flex;gap:8px}
        .code-in{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 13px;font-size:13px;color:var(--text);outline:none;font-weight:500}
        .code-in::placeholder{color:var(--text3)}
        .code-in:focus{border-color:var(--teal2)}
        .err{font-size:11px;color:#f87171;margin-top:7px;font-weight:600}

        /* ─── EMPTY ─── */
        .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:60px 24px;text-align:center}
        .empty-icon{font-size:40px;margin-bottom:16px;opacity:.4}
        .empty h3{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:800;color:var(--text);margin-bottom:7px;letter-spacing:-.3px}
        .empty p{font-size:13px;color:var(--text3);line-height:1.7;max-width:290px;font-weight:500}
        .qpills{display:flex;flex-wrap:wrap;gap:7px;margin-top:22px;justify-content:center;max-width:420px}
        .qp{padding:6px 15px;border-radius:20px;border:1px solid var(--border);background:var(--bg3);cursor:pointer;font-size:12px;font-weight:600;color:var(--text2);transition:.12s;letter-spacing:.01em}
        .qp:hover{border-color:var(--teal2);color:var(--teal);background:var(--teal-dim)}

        /* Tracker */
        table.trkr{width:100%;border-collapse:collapse}
        table.trkr th{background:var(--bg2);border-bottom:1px solid var(--border);padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px}
        table.trkr td{padding:10px 14px;border-bottom:1px solid rgba(26,31,58,.5);font-size:12px;vertical-align:middle}
        .n-in{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:6px 9px;font-size:11px;resize:none;outline:none;color:var(--text2);font-weight:500}
        .n-in::placeholder{color:var(--text3)}
        .n-in:focus{border-color:var(--teal2)}

        /* Status grid */
        .st-grid{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}

        /* Pro badge */
        .pro-badge{font-size:11px;font-weight:700;color:var(--teal);padding:4px 13px;background:var(--teal-dim);border:1px solid rgba(0,229,192,.18);border-radius:20px;letter-spacing:.02em}

        /* ─── PRACTICE ─── */
        .practice-wrap{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:16px;max-width:800px;margin:0 auto;width:100%}
        .practice-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:22px;transition:.15s}
        .practice-card:hover{border-color:var(--border2)}
        .prac-title{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;color:var(--text);margin-bottom:4px;letter-spacing:-.2px}
        .prac-sub{font-size:12px;color:var(--text3);margin-bottom:14px;font-weight:500;line-height:1.6}
        .pitch-ta{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px;color:var(--text);outline:none;resize:vertical;min-height:110px;font-family:'Inter',sans-serif;line-height:1.7;transition:.15s}
        .pitch-ta::placeholder{color:var(--text3)}
        .pitch-ta:focus{border-color:var(--teal2);box-shadow:0 0 0 3px rgba(0,229,192,.07)}
        .rec-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:.15s;font-family:'Inter',sans-serif;letter-spacing:.02em}
        .rec-idle{background:var(--bg3);color:var(--text2);border:1px solid var(--border)}
        .rec-idle:hover{border-color:var(--teal2);color:var(--teal)}
        .rec-active{background:rgba(248,113,113,.1);color:#f87171;border:1px solid rgba(248,113,113,.3)}
        @keyframes recpulse{0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.35)}70%{box-shadow:0 0 0 9px rgba(248,113,113,0)}}
        .rec-active{animation:recpulse 1.4s ease-in-out infinite}
        .obj-card{background:linear-gradient(135deg,var(--bg3),#0d1124);border:1px solid var(--border2);border-radius:12px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden}
        .obj-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--teal),var(--teal2))}
        .obj-badges{display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap}
        .obj-badge{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
        .obj-badge-type{background:rgba(0,229,192,.1);color:var(--teal);border:1px solid rgba(0,229,192,.2)}
        .obj-badge-easy{background:rgba(74,222,128,.1);color:#4ade80;border:1px solid rgba(74,222,128,.2)}
        .obj-badge-medium{background:rgba(251,146,60,.1);color:#fb923c;border:1px solid rgba(251,146,60,.2)}
        .obj-badge-hard{background:rgba(248,113,113,.1);color:#f87171;border:1px solid rgba(248,113,113,.2)}
        .obj-text{font-size:15px;color:var(--text);line-height:1.65;font-weight:500;font-style:italic}
        .score-wrap{display:flex;align-items:center;gap:16px;margin-bottom:16px}
        .score-num{font-family:'Bricolage Grotesque',sans-serif;font-size:52px;font-weight:800;letter-spacing:-2px;line-height:1;flex-shrink:0}
        .score-bar-bg{flex:1;height:8px;background:var(--bg3);border-radius:20px;overflow:hidden;border:1px solid var(--border)}
        .score-bar-fill{height:100%;border-radius:20px;transition:width .8s cubic-bezier(.4,0,.2,1)}
        .feedback-sec{margin-bottom:13px}
        .feedback-label{font-size:9px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;font-family:'Bricolage Grotesque',sans-serif}
        .feedback-text{font-size:12px;color:var(--text2);line-height:1.7;font-weight:500}
        .model-answer{background:var(--bg3);border:1px solid rgba(0,229,192,.12);border-radius:9px;padding:14px;font-size:12px;color:var(--text2);line-height:1.8;font-weight:500}
        .prac-stats{display:flex;gap:10px;flex-wrap:wrap}
        .prac-stat{background:var(--bg2);border:1px solid var(--border);border-radius:11px;padding:13px 18px;flex:1;min-width:80px}
        .prac-stat-val{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;color:var(--text);letter-spacing:-.5px;line-height:1;margin-bottom:3px}
        .prac-stat-label{font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.6px}
        .hist-row{display:flex;align-items:flex-start;gap:12px;padding:10px 12px;background:var(--bg3);border-radius:9px;border:1px solid var(--border)}
        .hist-score{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;flex-shrink:0;min-width:26px;line-height:1.2}
      `}</style>

      {/* ── PAYWALL ── */}
      {showPaywall && (
        <div className="pw-overlay" onClick={() => setShowPaywall(false)}>
          <div className="pw-modal" onClick={e => e.stopPropagation()}>
            <div className="pw-head">
              <button className="pw-x" onClick={() => setShowPaywall(false)}>×</button>
              <div className="pw-glow">⚡</div>
              <h2>Unlock RepReach Pro</h2>
              <p>Stop losing deals to reps who already have the buyer's number. Get in first.</p>
            </div>
            <div className="pw-body">
              <div className="pw-price">
                <div className="pw-amt">$2,000</div>
                <div className="pw-per">per month</div>
                <div className="pw-disc">First month: $1,500 — save $500 today</div>
              </div>
              <div className="pw-feats">
                <div className="pw-feat">Live buyer search for any retailer in seconds</div>
                <div className="pw-feat">Direct email + phone on every contact</div>
                <div className="pw-feat">AI cold emails, LinkedIn & follow-ups</div>
                <div className="pw-feat">Outreach tracker — know where every deal stands</div>
                <div className="pw-feat">Up to 500 contacts per search</div>
              </div>
              <a href={PAYMENT_LINK} target="_blank" rel="noreferrer"
                style={{display:"block",width:"100%",padding:"13px",borderRadius:9,background:"linear-gradient(135deg,#00c9a7,#00e5c0)",color:"#060b10",fontWeight:800,fontSize:14,textAlign:"center",textDecoration:"none",letterSpacing:".02em",boxShadow:"0 4px 20px rgba(0,201,167,.35)"}}>
                Get Access — $1,500 First Month →
              </a>
              <div className="pw-divider">— or enter access code —</div>
              <div className="code-wrap">
                <input className="code-in" placeholder="Access code" value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter"){ accessCode.trim()===ACCESS_CODE?(setIsSubscribed(true),setShowPaywall(false),setCodeError("")):setCodeError("Invalid code."); }}} />
                <button className="btn btn-teal" onClick={() => { accessCode.trim()===ACCESS_CODE?(setIsSubscribed(true),setShowPaywall(false),setCodeError("")):setCodeError("Invalid code."); }}>Apply</button>
              </div>
              {codeError && <div className="err">{codeError}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="shell">
        {/* ══ SIDEBAR ══ */}
        <div className="sidebar">
          <div className="sb-logo">
            <div className="sb-logo-icon">R</div>
            <div className="sb-logo-text">Rep<em>Reach</em></div>
          </div>

          <div className="sb-nav">
            <div className={`sb-item ${view==="people"?"on":""}`} onClick={() => setView("people")}>
              <span className="sb-item-icon">🔍</span> People Finder
            </div>
            <div className={`sb-item ${view==="pipeline"?"on":""}`} onClick={() => setView("pipeline")}>
              <span className="sb-item-icon">📊</span> Deal Board
            </div>
            <div className={`sb-item ${view==="sequences"?"on":""}`} onClick={() => setView("sequences")}>
              <span className="sb-item-icon">⚡</span> Email Sequences
            </div>
            <div className={`sb-item ${view==="forecasting"?"on":""}`} onClick={() => setView("forecasting")}>
              <span className="sb-item-icon">📈</span> My Numbers
            </div>
            <div className={`sb-item ${view==="aitools"?"on":""}`} onClick={() => setView("aitools")}>
              <span className="sb-item-icon">🤖</span> Write with AI
            </div>
            <div className={`sb-item ${view==="intelligence"?"on":""}`} onClick={() => setView("intelligence")}>
              <span className="sb-item-icon">🧠</span> Buyer Research
            </div>
            <div className={`sb-item ${view==="enablement"?"on":""}`} onClick={() => setView("enablement")}>
              <span className="sb-item-icon">🚀</span> Sales Toolkit
            </div>
            <div className={`sb-item ${view==="meetings"?"on":""}`} onClick={() => setView("meetings")}>
              <span className="sb-item-icon">📅</span> Meeting Prep
            </div>
            <div className={`sb-item ${view==="integrations"?"on":""}`} onClick={() => setView("integrations")}>
              <span className="sb-item-icon">🔗</span> Connect Tools
            </div>
            <div className={`sb-item ${view==="tracker"?"on":""}`} onClick={() => setView("tracker")}>
              <span className="sb-item-icon">✓</span> Outreach Tracker
            </div>
            <div className={`sb-item ${view==="practice"?"on":""}`} onClick={() => setView("practice")}>
              <span className="sb-item-icon">🎯</span> Objection Trainer
            </div>
          </div>

          {/* Company filter */}
          <div className="sb-sec">
            <div className="sb-sec-hd">Retailer</div>
            <input className="sb-in" placeholder="Type retailer name..."
              value={companyInput} onChange={e => handleCompanyInput(e.target.value)} />
            {companyInput ? (
              <span className="sb-tag">
                {companyInput}
                <span className="sb-tag-x" onClick={() => { setCompanyInput(""); setLeads([]); setHasSearched(false); }}>×</span>
              </span>
            ) : (
              <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                {QUICK_COMPANIES.map(c => (
                  <span key={c} className="sb-tag" style={{fontSize:10,cursor:"pointer"}} onClick={() => handleCompanyInput(c)}>{c}</span>
                ))}
              </div>
            )}
          </div>

          {/* Title filter */}
          <div className="sb-sec">
            <div className="sb-sec-hd">
              Job Title
              {selectedTitles.length > 0 && (
                <button className="sb-sec-clear" onClick={() => { setSelectedTitles([]); if(companyInput) runSearch(companyInput, null); }}>Clear all</button>
              )}
            </div>
            <input className="sb-in" placeholder="Search titles..."
              value={titleSearch} onChange={e => setTitleSearch(e.target.value)} />
            <div style={{maxHeight:190,overflowY:"auto"}}>
              {TITLE_OPTIONS.filter(t => t.toLowerCase().includes(titleSearch.toLowerCase())).map(t => (
                <div key={t} className="sb-check">
                  <input type="checkbox" checked={selectedTitles.includes(t)} onChange={() => toggleTitle(t)} />
                  <label onClick={() => toggleTitle(t)}>{t}</label>
                </div>
              ))}
            </div>
            {selectedTitles.length > 0 && (
              <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:3}}>
                {selectedTitles.map(t => (
                  <span key={t} className="sb-tag" style={{fontSize:10}} onClick={() => toggleTitle(t)}>
                    {t} <span className="sb-tag-x">×</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div className="right">
          <div className="topbar">
            <div className="ts-wrap">
              <span className="ts-icon">⚡</span>
              <input autoFocus value={companyInput}
                onChange={e => handleCompanyInput(e.target.value)}
                placeholder="Search any retailer — or type a person's name..." />
            </div>
            <div className="topbar-right">
              {isSubscribed
                ? <span className="pro-badge">✓ Pro Active</span>
                : <button className="btn btn-amber btn-sm" onClick={() => setShowPaywall(true)}>⚡ Upgrade to Pro</button>
              }
            </div>
          </div>

          <div className="sr">
            <div className="sf"><label>Your Name</label><input placeholder="Jamie" value={repName} onChange={e=>setRepName(e.target.value)} style={{width:100}} /></div>
            <div className="sf"><label>Brand *</label><input placeholder="NutriBlend" value={brandName} onChange={e=>setBrandName(e.target.value)} style={{width:120}} /></div>
            <div className="sf"><label>Product</label><input placeholder="e.g. Protein bars" value={productDesc} onChange={e=>setProductDesc(e.target.value)} style={{width:140}} /></div>
            <div className="sf"><label>Tone</label>
              <select value={emailTone} onChange={e=>setEmailTone(e.target.value)} style={{width:130}}>
                <option value="professional">Professional</option>
                <option value="casual">Casual & Friendly</option>
                <option value="bold">Bold & Direct</option>
                <option value="data-driven">Data-Driven</option>
              </select>
            </div>
            {searching && <span style={{marginLeft:"auto",fontSize:11,color:"#00c9a7",fontWeight:700}} className="pulsing">Searching Apollo...</span>}
          </div>

          <div className="content">
            <div className="main">

              {view === "people" ? (<>
                <div className="toolbar">
                  {searching ? (
                    <><span className="spin"/><span style={{color:"#334155",marginLeft:8,fontWeight:600}}>
                      {searchMode==="person" ? <>Searching for <span style={{color:"#00c9a7"}}>{companyInput}</span>...</> : <>Finding buyers at <span style={{color:"#00c9a7"}}>{companyInput}</span>...</>}
                    </span></>
                  ) : hasSearched ? (
                    <>
                      <span className="rc">{leads.length.toLocaleString()} buyers found</span>
                      {totalAvailable > leads.length && <span className="rs" style={{marginLeft:6}}>of {totalAvailable.toLocaleString()} in Apollo</span>}
                      {selected.size > 0 && <span style={{marginLeft:12,color:"#00c9a7",fontWeight:700,fontSize:12}}>{selected.size} selected</span>}
                      {!isSubscribed && leads.length > 0 && (
                        <button className="btn btn-amber btn-sm" style={{marginLeft:"auto"}} onClick={() => setShowPaywall(true)}>⚡ Unlock All Contacts</button>
                      )}
                    </>
                  ) : (
                    <span style={{color:"#334155",fontWeight:600}}>Search a retailer to find buyers instantly</span>
                  )}
                </div>

                {!hasSearched && !searching ? (
                  <div className="empty">
                    <div className="empty-icon">⚡</div>
                    <h3>Find any buyer. Right now.</h3>
                    <p>Type a retailer in the sidebar or search bar. Get every buyer, merchant, and category manager in seconds.</p>
                    <div className="qpills">
                      {QUICK_COMPANIES.map(c => (
                        <button key={c} className="qp" onClick={() => handleCompanyInput(c)}>{c}</button>
                      ))}
                    </div>
                  </div>
                ) : searching ? (
                  <div className="empty">
                    <span className="spin-lg spin" style={{marginBottom:18}} />
                    <h3>Hitting Apollo...</h3>
                    <p style={{color:"#334155"}}>Pulling every buyer at <span style={{color:"#00c9a7",fontWeight:700}}>{companyInput}</span></p>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">🔍</div>
                    <h3>No contacts found for "{companyInput}"</h3>
                    <p>Try the parent company name or remove title filters.</p>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                  <div className="tbl-wrap">
                    <table className="pt">
                      <thead>
                        <tr>
                          <th style={{width:36,paddingLeft:16}}>
                            <input type="checkbox" checked={selected.size===leads.length&&leads.length>0}
                              onChange={() => setSelected(selected.size===leads.length?new Set():new Set(leads.map(l=>l.id)))} />
                          </th>
                          <th style={{width:40}}></th>
                          <th>Name</th>
                          <th>Title</th>
                          <th>Company</th>
                          <th>Location</th>
                          <th>Department</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead, i) => {
                          const color  = AV_COLORS[i % AV_COLORS.length];
                          const st     = getStatus(lead.id);
                          const isSel  = selected.has(lead.id);
                          const isAct  = activeLead?.id === lead.id;
                          return (
                            <tr key={lead.id} className={`${isSel?"sel":""} ${isAct?"act":""}`} onClick={() => openLead(lead)}>
                              <td style={{paddingLeft:16}} onClick={e=>e.stopPropagation()}>
                                <input type="checkbox" checked={isSel}
                                  onChange={e => { e.stopPropagation(); setSelected(prev=>{const n=new Set(prev);n.has(lead.id)?n.delete(lead.id):n.add(lead.id);return n;}); }} />
                              </td>
                              <td><div className="av" style={{background:color}}>{(lead.firstName?.[0]||"")+(lead.lastName?.[0]||"")}</div></td>
                              <td>
                                <div style={{display:"flex",alignItems:"center",gap:4}}>
                                  <span className="pname">{lead.firstName} {lead.lastName}</span>
                                  {lead.linkedin && <a href={"https://"+lead.linkedin.replace(/^https?:\/\//,"")} target="_blank" rel="noreferrer" className="pli" onClick={e=>e.stopPropagation()}>in</a>}
                                </div>
                              </td>
                              <td><span className="ptitle">{lead.title}</span></td>
                              <td><span className="pco">{lead.retailer}</span></td>
                              <td style={{color:"#334155",fontSize:12}}>{lead.location||"—"}</td>
                              <td>
                                {departments[lead.id]
                                  ? <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",background:"rgba(0,201,167,.07)",border:"1px solid rgba(0,201,167,.15)",borderRadius:5,fontSize:11,fontWeight:700,color:"#00c9a7",whiteSpace:"nowrap"}}>{departments[lead.id]}</span>
                                  : loadingDepts ? <span style={{fontSize:11,color:"#1e2d3d"}}>···</span> : <span style={{color:"#1e2d3d",fontSize:12}}>—</span>
                                }
                              </td>
                              <td onClick={e=>e.stopPropagation()}>
                                {!isSubscribed
                                  ? <button className="cbtn cb-locked" onClick={()=>setShowPaywall(true)}>🔒 Unlock</button>
                                  : lead.email
                                    ? <button className="cbtn cb-email" onClick={()=>copy(lead.email,"e_"+lead.id)}>✉ {copied==="e_"+lead.id?"Copied!":lead.email.length>22?lead.email.slice(0,22)+"…":lead.email}</button>
                                    : enriching.has(lead.id)
                                      ? <span className="cbtn cb-gen"><span className="spin" style={{width:10,height:10}}/>Revealing...</span>
                                      : <button className="cbtn cb-gen" onClick={()=>enrichContact(lead)}>⚡ Reveal</button>
                                }
                              </td>
                              <td onClick={e=>e.stopPropagation()}>
                                {!isSubscribed
                                  ? <button className="cbtn cb-locked" onClick={()=>setShowPaywall(true)}>🔒</button>
                                  : lead.phone
                                    ? <button className="cbtn cb-phone" onClick={()=>copy(lead.phone,"p_"+lead.id)}>📞 {copied==="p_"+lead.id?"Copied!":lead.phone}</button>
                                    : enriching.has(lead.id)
                                      ? <span style={{color:"#334155",fontSize:11}}>···</span>
                                      : <button className="cbtn cb-gen" style={{fontSize:10}} onClick={()=>enrichContact(lead)}>⚡ Reveal</button>
                                }
                              </td>
                              <td onClick={e=>e.stopPropagation()}>
                                <button className="spill" style={{background:st.color+"20",color:st.color}} onClick={()=>cycleStatus(lead.id)}>
                                  ● {st.label}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {nextCursor && (
                    <div style={{padding:"16px 20px",borderTop:"1px solid #0d1f2d",display:"flex",alignItems:"center",gap:14}}>
                      <button className="btn btn-teal" disabled={loadingMore} onClick={loadMore} style={{justifyContent:"center"}}>
                        {loadingMore ? <><span className="spin"/>Loading next 1,000...</> : "⚡ Load More Contacts"}
                      </button>
                      <span style={{fontSize:12,color:"#334155"}}>{leads.length.toLocaleString()} loaded · {(totalAvailable - leads.length).toLocaleString()} more in Apollo</span>
                    </div>
                  )}
                  </div>
                )}
              </>) : view === "practice" ? (
                /* ── PRACTICE ── */
                <div className="practice-wrap">

                  {/* Session stats bar */}
                  {practiceHistory.length > 0 && (
                    <div className="prac-stats">
                      <div className="prac-stat">
                        <div className="prac-stat-val">{practiceHistory.length}</div>
                        <div className="prac-stat-label">Answered</div>
                      </div>
                      <div className="prac-stat">
                        <div className="prac-stat-val">{(practiceHistory.reduce((a,b)=>a+b.score,0)/practiceHistory.length).toFixed(1)}</div>
                        <div className="prac-stat-label">Avg Score</div>
                      </div>
                      <div className="prac-stat">
                        <div className="prac-stat-val">{Math.max(...practiceHistory.map(h=>h.score))}</div>
                        <div className="prac-stat-label">Best Score</div>
                      </div>
                      <div className="prac-stat">
                        <div className="prac-stat-val" style={{color:practiceHistory[practiceHistory.length-1]?.score>=7?"#4ade80":practiceHistory[practiceHistory.length-1]?.score>=5?"#fb923c":"#f87171"}}>
                          {practiceHistory[practiceHistory.length-1]?.score ?? "—"}
                        </div>
                        <div className="prac-stat-label">Last Score</div>
                      </div>
                    </div>
                  )}

                  {/* Pitch input */}
                  <div className="practice-card">
                    <div className="prac-title">Your Sales Pitch</div>
                    <div className="prac-sub">Type or record what you'd say to a retail buyer in the first 60 seconds. The more specific you are, the more realistic the objections.</div>
                    <textarea className="pitch-ta"
                      placeholder={`e.g. "Hi Sarah, I'm ${repName||"Jamie"} from ${brandName||"NutriBlend"}. We make ${productDesc||"protein bars with 20g protein and zero sugar"}. We're already in 800 Whole Foods and growing 40% YoY — I'd love to talk about getting us into your health & wellness aisle..."`}
                      value={pitchText} onChange={e => setPitchText(e.target.value)} rows={5} />
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,flexWrap:"wrap"}}>
                      <button className={`rec-btn ${isRecordingPitch?"rec-active":"rec-idle"}`}
                        onClick={() => isRecordingPitch
                          ? stopSpeech(setIsRecordingPitch, pitchRecRef)
                          : startSpeech(t => setPitchText(t), setIsRecordingPitch, pitchRecRef)
                        }>
                        {isRecordingPitch
                          ? <><span style={{width:8,height:8,borderRadius:"50%",background:"#f87171",flexShrink:0,display:"inline-block"}}/>Stop Recording</>
                          : <>🎙 Record Pitch</>}
                      </button>
                      {pitchText && <span style={{fontSize:11,color:"var(--text3)",fontWeight:600}}>{pitchText.trim().split(/\s+/).length} words</span>}
                      {pitchText && <button className="btn btn-outline btn-sm" style={{marginLeft:"auto"}} onClick={()=>{setPitchText("");setPracticeStarted(false);setCurrentObjection(null);setScoringResult(null);setObjResp("");setPracticeHistory([]);setPrevObjections([]);}}>Reset Session</button>}
                    </div>
                  </div>

                  {/* Generate / Next objection */}
                  <button className="btn btn-teal" style={{width:"100%",justifyContent:"center",paddingTop:13,paddingBottom:13,fontSize:14}}
                    disabled={genObjection||!pitchText.trim()} onClick={generateObjection}>
                    {genObjection
                      ? <><span className="spin"/>Generating objection...</>
                      : practiceStarted ? "⚡ Next Objection" : "⚡ Start Practice Session"}
                  </button>

                  {/* Objection + response + feedback */}
                  {currentObjection && (
                    <div className="practice-card" style={{borderColor:"rgba(0,229,192,.14)"}}>
                      <div className="prac-title" style={{marginBottom:14}}>Buyer's Objection</div>
                      <div className="obj-card">
                        <div className="obj-badges">
                          <span className="obj-badge obj-badge-type">{currentObjection.type}</span>
                          <span className={`obj-badge obj-badge-${(currentObjection.difficulty||"medium").toLowerCase()}`}>{currentObjection.difficulty}</span>
                        </div>
                        <div className="obj-text">"{currentObjection.objection}"</div>
                      </div>

                      {!scoringResult ? (
                        <>
                          <div className="prac-sub" style={{marginBottom:8}}>How do you respond? Speak naturally — don't read from a script.</div>
                          <textarea className="pitch-ta" placeholder="Handle the objection out loud or type your response..."
                            value={objResp} onChange={e => setObjResp(e.target.value)} rows={4} />
                          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,flexWrap:"wrap"}}>
                            <button className={`rec-btn ${isRecordingResp?"rec-active":"rec-idle"}`}
                              onClick={() => isRecordingResp
                                ? stopSpeech(setIsRecordingResp, responseRecRef)
                                : startSpeech(t => setObjResp(t), setIsRecordingResp, responseRecRef)
                              }>
                              {isRecordingResp
                                ? <><span style={{width:8,height:8,borderRadius:"50%",background:"#f87171",flexShrink:0,display:"inline-block"}}/>Stop Recording</>
                                : <>🎙 Record Response</>}
                            </button>
                            <button className="btn btn-teal btn-sm" style={{marginLeft:"auto"}} disabled={scoringResp||!objResp.trim()} onClick={scoreResponse}>
                              {scoringResp ? <><span className="spin"/>Scoring...</> : "Submit Response →"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{marginTop:4}}>
                          <div className="score-wrap">
                            <div className="score-num" style={{color:scoringResult.score>=8?"#4ade80":scoringResult.score>=6?"#fb923c":"#f87171"}}>
                              {scoringResult.score}<span style={{fontSize:22,color:"var(--text3)",fontWeight:600}}>/10</span>
                            </div>
                            <div style={{flex:1}}>
                              <div style={{marginBottom:6,fontSize:11,color:"var(--text3)",fontWeight:700}}>{scoringResult.score>=8?"Strong response":"Room to improve"}</div>
                              <div className="score-bar-bg">
                                <div className="score-bar-fill" style={{
                                  width:`${scoringResult.score*10}%`,
                                  background:scoringResult.score>=8?"linear-gradient(90deg,#4ade80,#00e5c0)":scoringResult.score>=6?"linear-gradient(90deg,#fb923c,#f59e0b)":"linear-gradient(90deg,#f87171,#ef4444)"
                                }}/>
                              </div>
                            </div>
                          </div>
                          <div className="feedback-sec">
                            <div className="feedback-label">What you did well</div>
                            <div className="feedback-text">✓ {scoringResult.strengths}</div>
                          </div>
                          <div className="feedback-sec">
                            <div className="feedback-label">What to improve</div>
                            <div className="feedback-text">↗ {scoringResult.improvements}</div>
                          </div>
                          <div className="feedback-sec">
                            <div className="feedback-label">Model Answer — how a top rep handles this</div>
                            <div className="model-answer">{scoringResult.modelAnswer}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Session history */}
                  {practiceHistory.length > 0 && (
                    <div className="practice-card">
                      <div className="prac-title" style={{marginBottom:12}}>Session History</div>
                      <div style={{display:"flex",flexDirection:"column",gap:7}}>
                        {[...practiceHistory].reverse().map((h,i) => (
                          <div key={i} className="hist-row">
                            <span className="hist-score" style={{color:h.score>=8?"#4ade80":h.score>=6?"#fb923c":"#f87171"}}>{h.score}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:10,fontWeight:700,color:"var(--text3)",marginBottom:2,textTransform:"uppercase",letterSpacing:".04em"}}>{h.objection.type} · {h.objection.difficulty}</div>
                              <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>"{h.objection.objection}"</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!practiceStarted && (
                    <div className="practice-card" style={{borderColor:"rgba(0,229,192,.08)"}}>
                      <div className="prac-title" style={{marginBottom:8}}>How it works</div>
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {[
                          ["1","Record or type your pitch","Tell the buyer who you are, what you sell, and why they should care."],
                          ["2","Get a real objection","Claude plays a skeptical buyer and throws a realistic objection at you."],
                          ["3","Handle it","Speak or type your response — just like you would in a real meeting."],
                          ["4","Get scored","See your score 1–10, specific feedback, and a model answer from a top rep."],
                        ].map(([n,title,desc]) => (
                          <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                            <span style={{width:22,height:22,borderRadius:"50%",background:"var(--teal-dim)",border:"1px solid rgba(0,229,192,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"var(--teal)",flexShrink:0}}>{n}</span>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:"var(--text)",marginBottom:2}}>{title}</div>
                              <div style={{fontSize:11,color:"var(--text3)",lineHeight:1.6}}>{desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : view === "pipeline" ? (
                /* ── PIPELINE ── */
                <div className="view-wrap">
                  <div className="view-hd">
                    <h2>Deal Board</h2>
                    <p>{leads.length} contacts tracked · drag-and-drop coming soon</p>
                  </div>
                  {leads.length === 0
                    ? <div className="empty"><div className="empty-icon">📊</div><h3>Deal Board is empty</h3><p>Search a retailer in People Finder and contacts will appear here.</p></div>
                    : <div className="kanban">
                        {STATUSES.map(col => {
                          const colLeads = leads.filter(l => (statuses[l.id]||"none") === col.id);
                          return (
                            <div key={col.id} className="k-col">
                              <div className="k-col-hd">
                                <span className="k-col-dot" style={{background:col.color}}/>
                                <span className="k-col-label">{col.label}</span>
                                <span className="k-col-count" style={{background:col.color+"22",color:col.color}}>{colLeads.length}</span>
                              </div>
                              {colLeads.map(lead => {
                                const idx = leads.findIndex(l=>l.id===lead.id);
                                return (
                                  <div key={lead.id} className="k-card" onClick={()=>{setView("people");openLead(lead);}}>
                                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                                      <div className="av" style={{background:AV_COLORS[idx%AV_COLORS.length],width:28,height:28,fontSize:10,flexShrink:0}}>{(lead.firstName?.[0]||"")+(lead.lastName?.[0]||"")}</div>
                                      <div style={{minWidth:0}}>
                                        <div style={{fontWeight:700,fontSize:12,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{lead.firstName} {lead.lastName}</div>
                                        <div style={{fontSize:10,color:"var(--text3)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{lead.title}</div>
                                      </div>
                                    </div>
                                    <div style={{fontSize:11,fontWeight:700,color:"var(--teal)"}}>{lead.retailer}</div>
                                    {notes[lead.id] && <div style={{fontSize:10,color:"var(--text3)",marginTop:5,lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{notes[lead.id]}</div>}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>

              ) : view === "forecasting" ? (
                /* ── FORECASTING ── */
                (() => {
                  const statusCounts = STATUSES.map(s => ({ ...s, count: leads.filter(l=>(statuses[l.id]||"none")===s.id).length }));
                  const contacted = leads.filter(l=>(statuses[l.id]||"none")!=="none").length;
                  const meetings  = leads.filter(l=>(statuses[l.id]||"none")==="meeting").length;
                  const replied   = leads.filter(l=>["replied","meeting"].includes(statuses[l.id]||"none")).length;
                  return (
                    <div className="view-wrap">
                      <div className="view-hd"><h2>My Numbers</h2><p>Live breakdown of your pipeline and projected revenue</p></div>
                      <div className="stat-grid">
                        <div className="stat-card"><div className="stat-card-val">{leads.length}</div><div className="stat-card-label">Total Contacts</div></div>
                        <div className="stat-card"><div className="stat-card-val" style={{color:"#38bdf8"}}>{contacted}</div><div className="stat-card-label">Contacted</div></div>
                        <div className="stat-card"><div className="stat-card-val" style={{color:"#4ade80"}}>{replied}</div><div className="stat-card-label">Replied</div></div>
                        <div className="stat-card"><div className="stat-card-val" style={{color:"#facc15"}}>{meetings}</div><div className="stat-card-label">Meetings Set</div></div>
                        <div className="stat-card">
                          <div className="stat-card-val" style={{color:"var(--teal)"}}>{leads.length ? Math.round(contacted/leads.length*100) : 0}%</div>
                          <div className="stat-card-label">Contact Rate</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-card-val" style={{color:"#fb923c"}}>{contacted ? Math.round(meetings/contacted*100) : 0}%</div>
                          <div className="stat-card-label">Meeting Rate</div>
                        </div>
                      </div>
                      <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:13,padding:"20px",marginBottom:16}}>
                        <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:16,letterSpacing:"-.2px"}}>Pipeline by Stage</div>
                        {statusCounts.map(s => (
                          <div key={s.id} className="funnel-row">
                            <span style={{width:110,fontSize:11,fontWeight:700,color:"var(--text2)",flexShrink:0}}>{s.label}</span>
                            <div className="funnel-bar-bg">
                              <div className="funnel-bar-fill" style={{width:leads.length?`${Math.max(4,s.count/leads.length*100)}%`:"4%",background:s.color}}/>
                            </div>
                            <span style={{width:28,fontSize:12,fontWeight:800,color:s.color,textAlign:"right",flexShrink:0}}>{s.count}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{background:"var(--bg2)",border:"1px solid rgba(0,229,192,.1)",borderRadius:13,padding:"20px"}}>
                        <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:14,letterSpacing:"-.2px"}}>Revenue Forecast</div>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                          <div className="ai-field-label" style={{margin:0,flexShrink:0}}>Avg Deal Value ($)</div>
                          <input className="ai-in" style={{width:160}} type="number" placeholder="e.g. 50000" value={dealValue} onChange={e=>setDealValue(e.target.value)} />
                        </div>
                        {dealValue > 0 ? (<>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                            {[
                              {label:"Won (Meetings)",val:meetings,color:"#facc15",rev:meetings*Number(dealValue)},
                              {label:"In Progress",val:replied-meetings,color:"#4ade80",rev:Math.round((replied-meetings)*Number(dealValue)*0.4)},
                              {label:"Projected (Pipeline)",val:leads.length-contacted,color:"var(--teal)",rev:Math.round((leads.length-contacted)*(contacted?meetings/contacted:0.05)*Number(dealValue))},
                            ].map((s,i)=>(
                              <div key={i} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px"}}>
                                <div style={{fontSize:10,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>{s.label}</div>
                                <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:20,fontWeight:800,color:s.color,letterSpacing:"-.3px"}}>${s.rev.toLocaleString()}</div>
                                <div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{s.val} deal{s.val!==1?"s":""}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{fontSize:12,color:"var(--text3)",lineHeight:1.8}}>
                            Total pipeline value: <span style={{color:"var(--teal)",fontWeight:700}}>${(meetings*Number(dealValue)+Math.round((replied-meetings)*Number(dealValue)*0.4)+Math.round((leads.length-contacted)*(contacted?meetings/contacted:0.05)*Number(dealValue))).toLocaleString()}</span> projected across {leads.length} contacts.
                          </div>
                        </>) : (
                          <div style={{fontSize:12,color:"var(--text3)",lineHeight:1.8}}>
                            Enter your average deal value above to see projected revenue across your pipeline. Based on {contacted?Math.round(meetings/contacted*100):0}% meeting rate, you can expect <span style={{color:"#facc15",fontWeight:700}}>{Math.max(0,Math.round((leads.length-contacted)*(contacted?meetings/contacted:0.05)))} more meetings</span> from {leads.length-contacted} uncontacted leads.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()

              ) : view === "aitools" ? (
                /* ── AI TOOLS ── */
                <div className="ai-view">
                  <div className="ai-view-hd">
                    <div className="ai-view-hd-top"><span style={{fontSize:15}}>🤖</span><h2>Write with AI</h2></div>
                    <p>Generate pitches, emails, scripts, and call openers in seconds</p>
                    <div className="ai-tabs">
                      {[{id:"pitch",icon:"🎤",label:"Pitch Builder"},{id:"objection",icon:"🛡",label:"Objection Handler"},{id:"subject",icon:"✉",label:"Subject Line Tester"},{id:"value",icon:"💡",label:"Value Proposition"},{id:"callscript",icon:"📞",label:"Call Script"}].map(t=>(
                        <button key={t.id} className={`ai-tab ${aiTab===t.id?"on":""}`} onClick={()=>setAiTab(t.id)}>{t.icon} {t.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="ai-panel">
                    {aiTab === "pitch" && (<>
                      <div className="ai-panel-title">🎤 Pitch Builder</div>
                      <div className="ai-panel-sub">Generate a tailored pitch for any buyer</div>
                      <div className="ai-field-label">Retail Context</div>
                      <input className="ai-in" placeholder="e.g. grocery, mass, club" value={pitchCtx} onChange={e=>setPitchCtx(e.target.value)} onKeyDown={e=>e.key==="Enter"&&genPitch()} />
                      <button className="btn btn-teal" style={{marginTop:14,width:"100%",justifyContent:"center"}} disabled={pitchBusy} onClick={genPitch}>
                        {pitchBusy?<><span className="spin"/>Generating...</>:"⚡ Generate"}
                      </button>
                      {pitchRes && <><div className="ai-result-box">{pitchRes}</div><button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(pitchRes,"pitch")}>{copied==="pitch"?"✓ Copied":"Copy Pitch"}</button></>}
                    </>)}

                    {aiTab === "objection" && (<>
                      <div className="ai-panel-title">🛡 Objection Handler</div>
                      <div className="ai-panel-sub">Enter a buyer objection and get a confident, ready-to-use response</div>
                      <div className="ai-field-label">Buyer Objection</div>
                      <textarea className="ai-in pitch-ta" placeholder='e.g. "Your margins are too thin for us to make money on this."' rows={3} value={objInput} onChange={e=>setObjInput(e.target.value)} />
                      <button className="btn btn-teal" style={{marginTop:14,width:"100%",justifyContent:"center"}} disabled={objBusy||!objInput.trim()} onClick={genObjHandler}>
                        {objBusy?<><span className="spin"/>Generating...</>:"⚡ Generate Response"}
                      </button>
                      {objRes && <><div className="ai-result-box">{objRes}</div><button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(objRes,"obj")}>{copied==="obj"?"✓ Copied":"Copy Response"}</button></>}
                    </>)}

                    {aiTab === "subject" && (<>
                      <div className="ai-panel-title">✉ Subject Line Tester</div>
                      <div className="ai-panel-sub">Score your subject line and get 3 stronger alternatives</div>
                      <div className="ai-field-label">Email Subject Line</div>
                      <input className="ai-in" placeholder='e.g. "Quick question about your protein bar set"' value={subjInput} onChange={e=>setSubjInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&genSubjectTest()} />
                      <button className="btn btn-teal" style={{marginTop:14,width:"100%",justifyContent:"center"}} disabled={subjBusy||!subjInput.trim()} onClick={genSubjectTest}>
                        {subjBusy?<><span className="spin"/>Analyzing...</>:"⚡ Test Subject Line"}
                      </button>
                      {subjRes && (
                        <div style={{marginTop:16}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                            <span className="ai-score-pill" style={{background:subjRes.score>=7?"rgba(74,222,128,.12)":subjRes.score>=5?"rgba(251,146,60,.12)":"rgba(248,113,113,.12)",color:subjRes.score>=7?"#4ade80":subjRes.score>=5?"#fb923c":"#f87171",border:`1px solid ${subjRes.score>=7?"rgba(74,222,128,.25)":subjRes.score>=5?"rgba(251,146,60,.25)":"rgba(248,113,113,.25)"}`}}>{subjRes.score}/10</span>
                            <span style={{fontSize:12,color:"var(--text2)"}}>{subjRes.feedback}</span>
                          </div>
                          <div className="ai-field-label" style={{marginBottom:8}}>Stronger Alternatives</div>
                          {(subjRes.alternatives||[]).map((a,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,marginBottom:7,fontSize:12,color:"var(--text2)"}}>
                              <span style={{flex:1}}>{a}</span>
                              <button className="dp-copy" onClick={()=>copy(a,"subj"+i)}>{copied==="subj"+i?"✓":"Copy"}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>)}

                    {aiTab === "value" && (<>
                      <div className="ai-panel-title">💡 Value Proposition</div>
                      <div className="ai-panel-sub">Generate 3 buyer-focused value prop statements for your brand</div>
                      <button className="btn btn-teal" style={{width:"100%",justifyContent:"center"}} disabled={valBusy} onClick={genValueProp}>
                        {valBusy?<><span className="spin"/>Generating...</>:"⚡ Generate Value Props"}
                      </button>
                      {valRes && (
                        <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:10}}>
                          {valRes.map((v,i)=>(
                            <div key={i} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"flex-start",gap:12}}>
                              <span style={{width:22,height:22,borderRadius:"50%",background:"var(--teal-dim)",border:"1px solid rgba(0,229,192,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"var(--teal)",flexShrink:0}}>{i+1}</span>
                              <span style={{flex:1,fontSize:13,color:"var(--text2)",lineHeight:1.65,fontWeight:500}}>{v}</span>
                              <button className="dp-copy" onClick={()=>copy(v,"val"+i)}>{copied==="val"+i?"✓":"Copy"}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>)}

                    {aiTab === "callscript" && (<>
                      <div className="ai-panel-title">📞 Call Script</div>
                      <div className="ai-panel-sub">Get a cold call script tailored to your brand and the buyer's context</div>
                      <div className="ai-field-label">Call Context</div>
                      <input className="ai-in" placeholder="e.g. club buyer, natural grocery, mass merchant" value={callCtx} onChange={e=>setCallCtx(e.target.value)} onKeyDown={e=>e.key==="Enter"&&genCallScript()} />
                      <button className="btn btn-teal" style={{marginTop:14,width:"100%",justifyContent:"center"}} disabled={callBusy} onClick={genCallScript}>
                        {callBusy?<><span className="spin"/>Generating...</>:"⚡ Generate Call Script"}
                      </button>
                      {callRes && <><div className="ai-result-box">{callRes}</div><button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(callRes,"call")}>{copied==="call"?"✓ Copied":"Copy Script"}</button></>}
                    </>)}
                  </div>
                </div>

              ) : view === "sequences" ? (
                /* ── SEQUENCES ── */
                <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                  <div style={{padding:"14px 20px",background:"var(--bg2)",borderBottom:"1px solid var(--border)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}><span style={{fontSize:14}}>⚡</span><span style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:15,color:"var(--text)"}}>Email Sequences</span></div>
                      <div style={{fontSize:11,color:"var(--text3)",fontWeight:500}}>Build multi-step outreach sequences and generate every email with AI</div>
                    </div>
                    <button className="btn btn-teal btn-sm" onClick={()=>setShowNewSeq(true)}>+ New Sequence</button>
                  </div>

                  {showNewSeq && (
                    <div style={{padding:"20px",background:"var(--bg3)",borderBottom:"1px solid var(--border)",flexShrink:0}}>
                      <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:14}}>New Sequence</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto auto",gap:10,alignItems:"end"}}>
                        <div>
                          <div className="ai-field-label">Sequence Name</div>
                          <input className="ai-in" placeholder="e.g. Walmart Outreach" value={newSeqName} onChange={e=>setNewSeqName(e.target.value)} />
                        </div>
                        <div>
                          <div className="ai-field-label">Target Buyer Type</div>
                          <input className="ai-in" placeholder="e.g. grocery buyer, club buyer" value={newSeqTarget} onChange={e=>setNewSeqTarget(e.target.value)} />
                        </div>
                        <div>
                          <div className="ai-field-label">Steps</div>
                          <select className="ai-in" style={{width:80}} value={newSeqSteps} onChange={e=>setNewSeqSteps(Number(e.target.value))}>
                            {[2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div style={{display:"flex",gap:7}}>
                          <button className="btn btn-teal btn-sm" disabled={seqBusy||!newSeqName.trim()} onClick={genSequence}>
                            {seqBusy?<><span className="spin"/>Generating...</>:"⚡ Generate"}
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={()=>{setShowNewSeq(false);setNewSeqName("");setNewSeqTarget("");}}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{display:"flex",flex:1,overflow:"hidden"}}>
                    {/* Sequences list */}
                    <div style={{width:240,borderRight:"1px solid var(--border)",overflow:"auto",padding:"12px",flexShrink:0}}>
                      {sequences.length===0 ? (
                        <div style={{padding:"20px 10px",textAlign:"center",color:"var(--text3)",fontSize:12,lineHeight:1.6}}>No sequences yet.<br/>Click "+ New Sequence" to generate one with AI.</div>
                      ) : sequences.map(s=>(
                        <div key={s.id} className={`seq-card ${activeSeq?.id===s.id?"active":""}`} onClick={()=>setActiveSeq(s)}>
                          <span style={{fontSize:18,flexShrink:0}}>⚡</span>
                          <div style={{minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:12,color:"var(--text)",marginBottom:2}}>{s.name}</div>
                            <div style={{fontSize:10,color:"var(--text3)"}}>{s.steps?.length||0} steps · {s.target}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Steps panel */}
                    <div style={{flex:1,overflow:"auto",padding:"16px 20px"}}>
                      {!activeSeq ? (
                        <div className="empty" style={{minHeight:300}}>
                          <div className="empty-icon">⚡</div>
                          <h3>No sequences yet</h3>
                          <p>Create multi-step outreach sequences with emails, LinkedIn touches, and call reminders.</p>
                        </div>
                      ) : (<>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                          <div>
                            <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:15,color:"var(--text)",marginBottom:2}}>{activeSeq.name}</div>
                            <div style={{fontSize:11,color:"var(--text3)"}}>{activeSeq.steps?.length} steps · targeting {activeSeq.target}</div>
                          </div>
                          <button className="btn btn-outline btn-sm" onClick={()=>setSequences(prev=>prev.filter(s=>s.id!==activeSeq.id))||setActiveSeq(null)}>Delete</button>
                        </div>
                        {(activeSeq.steps||[]).map((step,i)=>(
                          <div key={i} className="seq-step">
                            <div className="seq-step-hd">
                              <span className="seq-day">Day {step.day}</span>
                              <span className="seq-type">{step.type}</span>
                              {step.subject && <button className="dp-copy" style={{marginLeft:"auto"}} onClick={()=>copy(`Subject: ${step.subject}\n\n${step.body}`,"seq"+i)}>{copied==="seq"+i?"✓ Copied":"Copy"}</button>}
                            </div>
                            {step.subject && <div className="seq-subject">Subject: {step.subject}</div>}
                            <div className="seq-body">{step.body||step.message}</div>
                          </div>
                        ))}
                      </>)}
                    </div>
                  </div>
                </div>

              ) : view === "intelligence" ? (
                /* ── INTELLIGENCE ── */
                <div className="intel-view">
                  <div className="intel-hd">
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}><span style={{fontSize:14}}>🧠</span><h2>Buyer Research</h2></div>
                    <p>Look up any retailer or buyer — get their priorities, buying process, and tips for getting the meeting</p>
                  </div>
                  <div className="intel-search">
                    <input className="ai-in" style={{flex:1}} placeholder="Enter retailer or buyer name to research..."
                      value={intelQuery} onChange={e=>setIntelQuery(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&runIntelResearch()} />
                    <button className="btn btn-teal" disabled={intelBusy||!intelQuery.trim()} onClick={runIntelResearch}>
                      {intelBusy?<><span className="spin"/>Researching...</>:"🔭 Research"}
                    </button>
                  </div>
                  <div className="intel-body">
                    {!intelResult && !intelBusy && (
                      <div className="empty">
                        <div className="empty-icon">🔭</div>
                        <h3>Buyer Research</h3>
                        <p>Type any retailer or buyer name above. Get their buying priorities, how their vendor process works, what categories they're growing, and exactly how to get the meeting.</p>
                      </div>
                    )}
                    {intelBusy && (
                      <div className="empty"><span className="spin spin-lg"/><h3 style={{marginTop:18}}>Researching {intelQuery}...</h3><p>Scanning the web for buyer intelligence</p></div>
                    )}
                    {intelResult && !intelBusy && (
                      <>
                        <div className="intel-card" style={{borderColor:"rgba(0,229,192,.12)"}}>
                          <h3>Overview</h3>
                          <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.75,fontWeight:500}}>{intelResult.summary}</div>
                        </div>
                        {intelResult.priorities?.length > 0 && (
                          <div className="intel-card">
                            <h3>Buying Priorities</h3>
                            {intelResult.priorities.map((p,i)=><div key={i} className="intel-item">{p}</div>)}
                          </div>
                        )}
                        {intelResult.process?.length > 0 && (
                          <div className="intel-card">
                            <h3>Buying Process</h3>
                            {intelResult.process.map((p,i)=><div key={i} className="intel-item">{p}</div>)}
                          </div>
                        )}
                        {intelResult.categories?.length > 0 && (
                          <div className="intel-card">
                            <h3>Active Categories</h3>
                            {intelResult.categories.map((c,i)=><div key={i} className="intel-item">{c}</div>)}
                          </div>
                        )}
                        {intelResult.recentNews && (
                          <div className="intel-card">
                            <h3>Recent News</h3>
                            <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.75}}>{intelResult.recentNews}</div>
                          </div>
                        )}
                        {intelResult.tips?.length > 0 && (
                          <div className="intel-card" style={{borderColor:"rgba(0,229,192,.12)"}}>
                            <h3>Tips for Getting the Meeting</h3>
                            {intelResult.tips.map((t,i)=><div key={i} className="intel-item">{t}</div>)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

              ) : view === "enablement" ? (
                /* ── ENABLEMENT ── */
                <div className="enab-view">
                  <div className="ai-view-hd">
                    <div className="ai-view-hd-top"><span style={{fontSize:15}}>🚀</span><h2>Sales Toolkit</h2></div>
                    <p>Playbooks, pitch templates, sell sheets, and objection responses — all built for your brand</p>
                    <div className="ai-tabs">
                      {[{id:"playbook",icon:"📘",label:"Sales Playbook"},{id:"pitchtpl",icon:"🎙",label:"Pitch Templates"},{id:"sellsheet",icon:"📊",label:"Sell Sheet Builder"},{id:"objlib",icon:"🎯",label:"Objection Library"}].map(t=>(
                        <button key={t.id} className={`ai-tab ${enabTab===t.id?"on":""}`} onClick={()=>setEnabTab(t.id)}>{t.icon} {t.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="ai-panel">
                    {enabTab==="playbook" && (<>
                      <div className="ai-panel-title">📘 Retail Sales Playbook</div>
                      <div className="ai-panel-sub">Generate a tactical playbook for landing shelf space at your target retailers</div>
                      <div className="ai-field-label">Target Retailers</div>
                      <input className="ai-in" placeholder="e.g. Walmart, Target, Kroger" value={playbookTarget} onChange={e=>setPlaybookTarget(e.target.value)} />
                      <button className="btn btn-teal" style={{marginTop:14,width:"100%",justifyContent:"center"}} disabled={playbookBusy} onClick={genPlaybook}>
                        {playbookBusy?<><span className="spin"/>Generating Playbook...</>:"⚡ Generate Playbook"}
                      </button>
                      {playbookResult && (
                        <div style={{marginTop:18}}>
                          {(playbookResult.sections||[]).map((s,i)=>(
                            <div key={i} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
                              <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:13,color:"var(--text)",marginBottom:10}}>{i+1}. {s.title}</div>
                              {(s.bullets||[]).map((b,j)=>(
                                <div key={j} style={{display:"flex",gap:9,padding:"5px 0",borderBottom:j<s.bullets.length-1?"1px solid rgba(26,31,58,.5)":"none",fontSize:12,color:"var(--text2)",lineHeight:1.65}}>
                                  <span style={{color:"var(--teal)",fontWeight:800,flexShrink:0}}>→</span>{b}
                                </div>
                              ))}
                            </div>
                          ))}
                          <button className="btn btn-outline btn-sm" onClick={()=>copy((playbookResult.sections||[]).map((s,i)=>`${i+1}. ${s.title}\n${s.bullets.map(b=>`→ ${b}`).join("\n")}`).join("\n\n"),"playbook")}>{copied==="playbook"?"✓ Copied":"Copy Playbook"}</button>
                        </div>
                      )}
                    </>)}

                    {enabTab==="pitchtpl" && (<>
                      <div className="ai-panel-title">🎙 Pitch Templates</div>
                      <div className="ai-panel-sub">Proven pitch structures for every sales scenario</div>
                      <div className="ai-field-label">Scenario</div>
                      <select className="ai-in" value={pitchTplScenario} onChange={e=>setPitchTplScenario(e.target.value)}>
                        <option value="cold_call">Cold Phone Call</option>
                        <option value="trade_show">Trade Show Meeting</option>
                        <option value="broker">Broker Introduction</option>
                        <option value="followup">Follow-up Meeting</option>
                        <option value="zoom">Zoom Demo</option>
                      </select>
                      <button className="btn btn-teal" style={{marginTop:14,width:"100%",justifyContent:"center"}} disabled={pitchTplBusy} onClick={genPitchTemplate}>
                        {pitchTplBusy?<><span className="spin"/>Generating...</>:"⚡ Generate Template"}
                      </button>
                      {pitchTplResult && <><div className="ai-result-box">{pitchTplResult}</div><button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(pitchTplResult,"pitchtpl")}>{copied==="pitchtpl"?"✓ Copied":"Copy Template"}</button></>}
                    </>)}

                    {enabTab==="sellsheet" && (<>
                      <div className="ai-panel-title">📊 Sell Sheet Builder</div>
                      <div className="ai-panel-sub">Generate all copy for a one-page sell sheet in seconds</div>
                      <button className="btn btn-teal" style={{width:"100%",justifyContent:"center"}} disabled={sellSheetBusy} onClick={genSellSheet}>
                        {sellSheetBusy?<><span className="spin"/>Building Sell Sheet...</>:"⚡ Generate Sell Sheet"}
                      </button>
                      {sellSheetResult && (
                        <div style={{marginTop:16}}>
                          {[
                            {label:"Headline",val:sellSheetResult.headline},
                            {label:"Subheadline",val:sellSheetResult.subheadline},
                            {label:"Product Description",val:sellSheetResult.productDescription},
                            {label:"Target Consumer",val:sellSheetResult.targetConsumer},
                            {label:"Velocity / Stats",val:sellSheetResult.velocityStats},
                            {label:"Retailer Benefits",val:sellSheetResult.retailerBenefits},
                            {label:"Call to Action",val:sellSheetResult.callToAction},
                          ].map((row,i)=>row.val&&(
                            <div key={i} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:9,padding:"12px 14px",marginBottom:9}}>
                              <div style={{fontSize:9,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>{row.label}</div>
                              <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.65}}>{row.val}</div>
                              <button className="dp-copy" style={{marginTop:6}} onClick={()=>copy(row.val,"ss"+i)}>{copied==="ss"+i?"✓":"Copy"}</button>
                            </div>
                          ))}
                          {sellSheetResult.keyBenefits?.length>0&&(
                            <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:9,padding:"12px 14px",marginBottom:9}}>
                              <div style={{fontSize:9,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Key Benefits</div>
                              {sellSheetResult.keyBenefits.map((b,i)=><div key={i} style={{display:"flex",gap:8,padding:"4px 0",fontSize:12,color:"var(--text2)"}}><span style={{color:"var(--teal)",fontWeight:800}}>→</span>{b}</div>)}
                            </div>
                          )}
                        </div>
                      )}
                    </>)}

                    {enabTab==="objlib" && (<>
                      <div className="ai-panel-title">🎯 Objection Handler</div>
                      <div className="ai-panel-sub">Paste exactly what the buyer said — get a real, ready-to-use response</div>
                      <div className="ai-field-label">What did the buyer say?</div>
                      <textarea className="ai-in pitch-ta" rows={3} placeholder={'e.g. "Your margins are too thin, we need at least 40% to make this work for us."'} value={objLibSearch} onChange={e=>setObjLibSearch(e.target.value)} />
                      <button className="btn btn-teal" style={{marginTop:14,width:"100%",justifyContent:"center"}} disabled={objLibBusy||!objLibSearch.trim()} onClick={genObjLibrary}>
                        {objLibBusy?<><span className="spin"/>Generating response...</>:"⚡ Get My Response"}
                      </button>
                      {objLibResult && (
                        <div style={{marginTop:18}}>
                          <div style={{background:"var(--bg3)",border:"1px solid rgba(0,229,192,.15)",borderRadius:11,padding:"16px 18px",marginBottom:12}}>
                            <div style={{fontSize:9,fontWeight:800,color:"var(--teal)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Say This</div>
                            <div style={{fontSize:13,color:"var(--text)",lineHeight:1.8,fontWeight:500}}>{objLibResult.response}</div>
                            <button className="btn btn-teal btn-sm" style={{marginTop:12}} onClick={()=>copy(objLibResult.response,"objresp")}>{copied==="objresp"?"✓ Copied":"Copy Response"}</button>
                          </div>
                          {objLibResult.strategy && (
                            <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:11,padding:"14px 16px"}}>
                              <div style={{fontSize:9,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>Why This Works</div>
                              <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.7}}>{objLibResult.strategy}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </>)}
                  </div>
                </div>

              ) : view === "meetings" ? (
                /* ── MEETINGS ── */
                (() => {
                  const meetLeads = leads.filter(l=>(statuses[l.id]||"none")==="meeting");
                  return (
                    <div className="meet-layout">
                      {/* Contact list */}
                      <div className="meet-list">
                        <div className="meet-list-hd">Your Meetings ({meetLeads.length})</div>
                        {meetLeads.length===0 ? (
                          <div style={{padding:"20px 14px",textAlign:"center",color:"var(--text3)",fontSize:11,lineHeight:1.7}}>No meetings yet.<br/>Mark contacts as "Meeting Set" in Outreach Tracker or People Finder.</div>
                        ) : meetLeads.map(lead=>{
                          const idx=leads.findIndex(l=>l.id===lead.id);
                          return (
                            <div key={lead.id} className={`meet-row ${meetContact?.id===lead.id?"active":""}`} onClick={()=>genMeetBrief(lead)}>
                              <div className="av" style={{background:AV_COLORS[idx%AV_COLORS.length],width:30,height:30,fontSize:10,flexShrink:0}}>{(lead.firstName?.[0]||"")+(lead.lastName?.[0]||"")}</div>
                              <div style={{minWidth:0}}>
                                <div style={{fontWeight:700,fontSize:12,color:"var(--text)"}}>{lead.firstName} {lead.lastName}</div>
                                <div style={{fontSize:10,color:"var(--text3)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{lead.retailer}</div>
                              </div>
                            </div>
                          );
                        })}
                        {meetLeads.length===0&&(
                          <div style={{padding:"0 14px 14px",marginTop:4}}>
                            <button className="btn btn-outline btn-sm" style={{width:"100%",justifyContent:"center"}} onClick={()=>setView("tracker")}>Open Tracker →</button>
                          </div>
                        )}
                      </div>
                      {/* Tools panel */}
                      <div className="meet-tools">
                        {!meetContact ? (
                          <div className="empty">
                            <div className="empty-icon">📅</div>
                            <h3>Pick a contact to prep</h3>
                            <p>Click any contact on the left to generate a meeting brief, agenda, live notes, and follow-up email.</p>
                          </div>
                        ) : (<>
                          <div className="meet-tabs">
                            {[{id:"brief",label:"📋 Brief"},{id:"agenda",label:"🗓 Agenda"},{id:"notes",label:"📝 Notes"},{id:"followup",label:"📤 Follow-up"}].map(t=>(
                              <button key={t.id} className={`meet-tab ${meetTab===t.id?"on":""}`} onClick={()=>setMeetTab(t.id)}>{t.label}</button>
                            ))}
                            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",padding:"0 4px"}}>
                              <span style={{fontSize:12,fontWeight:700,color:"var(--teal)"}}>{meetContact.firstName} {meetContact.lastName} · {meetContact.retailer}</span>
                            </div>
                          </div>
                          <div className="meet-content">
                            {meetTab==="brief" && (
                              meetBriefBusy ? <div className="empty" style={{minHeight:200}}><span className="spin spin-lg"/><p style={{marginTop:16}}>Generating brief...</p></div>
                              : meetBriefResult ? (<>
                                {[
                                  {label:"Key Talking Points",key:"talkingPoints",icon:"💬"},
                                  {label:"Objections to Prepare For",key:"objections",icon:"🛡"},
                                  {label:"Questions to Ask",key:"questionsToAsk",icon:"❓"},
                                  {label:"What to Bring / Send Ahead",key:"prepItems",icon:"📦"},
                                ].map(s=>meetBriefResult[s.key]?.length>0&&(
                                  <div key={s.key} style={{marginBottom:16}}>
                                    <div style={{fontSize:10,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>{s.icon} {s.label}</div>
                                    {meetBriefResult[s.key].map((item,i)=>(
                                      <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(26,31,58,.5)",fontSize:12,color:"var(--text2)",lineHeight:1.6}}>
                                        <span style={{color:"var(--teal)",fontWeight:800,flexShrink:0}}>→</span>{item}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </>) : <div className="empty" style={{minHeight:200}}><p>Click a contact to generate their brief.</p></div>
                            )}
                            {meetTab==="agenda" && (<>
                              <button className="btn btn-teal" style={{width:"100%",justifyContent:"center",marginBottom:14}} disabled={agendaBusy} onClick={genAgenda}>
                                {agendaBusy?<><span className="spin"/>Building Agenda...</>:"⚡ Generate 30-Min Agenda"}
                              </button>
                              {agendaResult && <><div className="ai-result-box">{agendaResult}</div><button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(agendaResult,"agenda")}>{copied==="agenda"?"✓ Copied":"Copy Agenda"}</button></>}
                            </>)}
                            {meetTab==="notes" && (<>
                              <div style={{fontSize:10,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Meeting Notes</div>
                              <textarea className="pitch-ta" style={{minHeight:200}} placeholder="Take notes during the meeting here..." value={meetNotes[meetContact.id]||""} onChange={e=>setMeetNotes(p=>({...p,[meetContact.id]:e.target.value}))} />
                              <button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(meetNotes[meetContact.id]||"","notes")}>{copied==="notes"?"✓ Copied":"Copy Notes"}</button>
                            </>)}
                            {meetTab==="followup" && (<>
                              <button className="btn btn-teal" style={{width:"100%",justifyContent:"center",marginBottom:14}} disabled={followupBusy} onClick={genMeetFollowup}>
                                {followupBusy?<><span className="spin"/>Writing Email...</>:"⚡ Generate Follow-up Email"}
                              </button>
                              {followupResult && (<>
                                <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:9,padding:"12px 14px",marginBottom:9}}>
                                  <div style={{fontSize:9,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>Subject</div>
                                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{followupResult.subject}</div>
                                </div>
                                <div className="ai-result-box">{followupResult.body}</div>
                                <button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(`Subject: ${followupResult.subject}\n\n${followupResult.body}`,"followup")}>{copied==="followup"?"✓ Copied":"Copy Email"}</button>
                              </>)}
                            </>)}
                          </div>
                        </>)}
                      </div>
                    </div>
                  );
                })()

              ) : view === "integrations" ? (
                /* ── INTEGRATIONS ── */
                <div className="view-wrap">
                  <div className="view-hd"><h2>Connect Tools</h2><p>Export your contacts or connect RepReach to your CRM, email, and calendar</p></div>
                  {/* CSV Export — live */}
                  <div style={{background:"var(--bg2)",border:"1px solid rgba(0,229,192,.2)",borderRadius:13,padding:"18px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:16}}>
                    <div style={{width:44,height:44,borderRadius:11,background:"rgba(0,229,192,.1)",border:"1px solid rgba(0,229,192,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📥</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13,color:"var(--text)",marginBottom:3}}>CSV Export</div>
                      <div style={{fontSize:11,color:"var(--text3)",lineHeight:1.5}}>{leads.length} contacts ready — name, title, company, email, phone, status, notes, department.</div>
                    </div>
                    <span className="int-status int-live" style={{flexShrink:0}}>● Live</span>
                    <button className="btn btn-teal btn-sm" onClick={exportCSV} disabled={!leads.length}>{leads.length?"⬇ Export CSV":"No contacts yet"}</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                    {[
                      {icon:"☁",name:"Salesforce",desc:"Sync contacts, leads, and outreach activity automatically.",bg:"#00a1e0"},
                      {icon:"🔶",name:"HubSpot",desc:"Push buyer data and track deal stages inside your HubSpot CRM.",bg:"#ff7a59"},
                      {icon:"💬",name:"Slack",desc:"Get notified in Slack when a buyer replies or a meeting gets set.",bg:"#4a154b"},
                      {icon:"📧",name:"Gmail",desc:"Send outreach directly from your Gmail with one click.",bg:"#ea4335"},
                      {icon:"📮",name:"Outlook / Microsoft 365",desc:"Native Outlook integration for reps who live in Microsoft.",bg:"#0078d4"},
                      {icon:"📊",name:"Google Sheets",desc:"Export your pipeline and lead data to Sheets for reporting.",bg:"#34a853"},
                      {icon:"🗓",name:"Calendly",desc:"Embed your booking link directly into outreach emails.",bg:"#006bff"},
                      {icon:"📱",name:"LinkedIn Sales Nav",desc:"Pull buyer data directly from Sales Navigator.",bg:"#0077b5"},
                      {icon:"🔔",name:"Apollo.io",desc:"RepReach is already powered by Apollo's contact database.",bg:"#6c63ff",live:true},
                      {icon:"✨",name:"Claude AI",desc:"All AI generation, scoring, and research is powered by Claude.",bg:"#c87533",live:true},
                    ].map((t,i)=>(
                      <div key={i} className="int-card">
                        <div className="int-logo" style={{background:t.bg+"22",border:`1px solid ${t.bg}33`,fontSize:22}}>{t.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,color:"var(--text)",marginBottom:3}}>{t.name}</div>
                          <div style={{fontSize:11,color:"var(--text3)",lineHeight:1.5,marginBottom:6}}>{t.desc}</div>
                          {t.live
                            ? <span className="int-status int-live">● Live</span>
                            : <button className="btn btn-outline btn-sm" style={{fontSize:10,padding:"3px 12px"}} onClick={()=>alert(`${t.name} integration coming soon. We'll notify you when it's ready.`)}>Connect</button>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              ) : (
                /* ── TRACKER ── */
                <div style={{padding:"16px 20px",overflow:"auto",flex:1}}>
                  <div style={{marginBottom:16}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#f1f5f9",marginBottom:3,letterSpacing:"-.2px"}}>Outreach Tracker</div>
                    <div style={{fontSize:12,color:"#334155"}}>{leads.length} contacts tracked · {companyInput||"no search yet"}</div>
                  </div>
                  {leads.length === 0
                    ? <div className="empty"><div className="empty-icon">📋</div><h3>No contacts yet</h3><p>Search a retailer in People view first.</p></div>
                    : <table className="trkr">
                        <thead><tr><th>Name</th><th>Title</th><th>Company</th><th>Status</th><th>Notes</th><th></th></tr></thead>
                        <tbody>
                          {leads.map(lead => { const st=getStatus(lead.id); return (
                            <tr key={lead.id}>
                              <td style={{color:"#f1f5f9",fontWeight:600}}>{lead.firstName} {lead.lastName}</td>
                              <td style={{color:"#64748b",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.title}</td>
                              <td style={{color:"#00c9a7",fontWeight:600}}>{lead.retailer}</td>
                              <td><button className="spill" style={{background:st.color+"20",color:st.color}} onClick={()=>cycleStatus(lead.id)}>● {st.label}</button></td>
                              <td><textarea className="n-in" rows={2} placeholder="Notes..." value={notes[lead.id]||""} onChange={e=>setNotes(p=>({...p,[lead.id]:e.target.value}))} /></td>
                              <td><button className="btn btn-teal btn-sm" onClick={()=>{setView("people");openLead(lead);}}>⚡ Email</button></td>
                            </tr>
                          );})}
                        </tbody>
                      </table>
                  }
                </div>
              )}
            </div>

            {/* ── DETAIL PANEL ── */}
            {activeLead && (
              <div className="detail">
                <div className="dp-head">
                  {(() => { const i=leads.findIndex(l=>l.id===activeLead.id); return <div className="dp-av" style={{background:AV_COLORS[i%AV_COLORS.length]}}>{(activeLead.firstName?.[0]||"")+(activeLead.lastName?.[0]||"")}</div>; })()}
                  <div style={{flex:1,minWidth:0}}>
                    <div className="dp-name">{activeLead.firstName} {activeLead.lastName}</div>
                    <div className="dp-role">{activeLead.title}</div>
                    <div className="dp-co">{activeLead.retailer}</div>
                    {departments[activeLead.id] && (
                      <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",background:"rgba(0,201,167,.08)",border:"1px solid rgba(0,201,167,.15)",borderRadius:5,fontSize:11,fontWeight:700,color:"#00c9a7",marginTop:5,width:"fit-content"}}>{departments[activeLead.id]}</span>
                    )}
                  </div>
                  <button className="dp-x" onClick={()=>setActiveLead(null)}>×</button>
                </div>

                <div className="dp-sec">
                  <div className="dp-sec-title">Contact Info</div>
                  {/* Email */}
                  {activeLead.email
                    ? <div className="dp-row"><span className="dp-icon">✉</span><span className="dp-val">{activeLead.email}{activeLead.emailStatus && <span style={{marginLeft:5,fontSize:10,color:"#4ade80",fontWeight:700}}>{activeLead.emailStatus}</span>}</span><button className="dp-copy" onClick={()=>copy(activeLead.email,"de")}>{copied==="de"?"✓":"Copy"}</button></div>
                    : enriching.has(activeLead.id)
                      ? <div className="dp-row"><span className="dp-icon">✉</span><span style={{color:"#00c9a7",fontSize:11,display:"flex",alignItems:"center",gap:6}}><span className="spin" style={{width:11,height:11}}/>Revealing...</span></div>
                      : <div className="dp-row"><span className="dp-icon">✉</span><span style={{color:"#334155",fontSize:11,flex:1}}>Not revealed</span><button className="dp-copy" onClick={()=>enrichContact(activeLead)}>⚡ Reveal</button></div>
                  }
                  {/* Personal emails */}
                  {(activeLead.personalEmails||[]).map((em,i) => (
                    <div key={i} className="dp-row"><span className="dp-icon" style={{opacity:0}}>✉</span><span className="dp-val" style={{fontSize:11,color:"#64748b"}}>{em} <span style={{color:"#334155",fontSize:10}}>personal</span></span><button className="dp-copy" onClick={()=>copy(em,"pe"+i)}>{copied==="pe"+i?"✓":"Copy"}</button></div>
                  ))}
                  {/* Phone */}
                  {activeLead.phone
                    ? <div className="dp-row"><span className="dp-icon">📞</span><span className="dp-val">{activeLead.phone}</span><button className="dp-copy" onClick={()=>copy(activeLead.phone,"dp2")}>{copied==="dp2"?"✓":"Copy"}</button></div>
                    : enriching.has(activeLead.id)
                      ? <div className="dp-row"><span className="dp-icon">📞</span><span style={{color:"#00c9a7",fontSize:11}}>Revealing...</span></div>
                      : null
                  }
                  {/* Extra phones */}
                  {(activeLead.allPhones||[]).slice(1).map((ph,i) => (
                    <div key={i} className="dp-row"><span className="dp-icon" style={{opacity:0}}>📞</span><span className="dp-val" style={{fontSize:11,color:"#64748b"}}>{ph.number} <span style={{color:"#334155",fontSize:10}}>{ph.type}</span></span></div>
                  ))}
                  {/* Social */}
                  {activeLead.linkedin && <div className="dp-row"><span className="dp-icon">💼</span><span className="dp-val"><a href={"https://"+activeLead.linkedin.replace(/^https?:\/\//,"")} target="_blank" rel="noreferrer">LinkedIn ↗</a></span></div>}
                  {activeLead.twitter && <div className="dp-row"><span className="dp-icon">🐦</span><span className="dp-val"><a href={activeLead.twitter} target="_blank" rel="noreferrer">Twitter ↗</a></span></div>}
                  {activeLead.location && <div className="dp-row"><span className="dp-icon">📍</span><span className="dp-val">{activeLead.location}{activeLead.country ? ", "+activeLead.country : ""}</span></div>}
                  {activeLead.seniority && <div className="dp-row"><span className="dp-icon">⭐</span><span className="dp-val" style={{textTransform:"capitalize"}}>{activeLead.seniority}</span></div>}

                </div>

                <div className="dp-sec">
                  <div className="dp-sec-title">Outreach Status</div>
                  <div className="st-grid">
                    {STATUSES.filter(s=>s.id!=="none").map(s => (
                      <button key={s.id} className="spill"
                        style={{background:(statuses[activeLead.id]||"none")===s.id?s.color+"30":s.color+"12",color:s.color,border:(statuses[activeLead.id]||"none")===s.id?`1.5px solid ${s.color}`:"1.5px solid transparent"}}
                        onClick={()=>setStatuses(p=>({...p,[activeLead.id]:s.id}))}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <textarea className="n-in" rows={2} placeholder="Notes on this contact..." value={notes[activeLead.id]||""} onChange={e=>setNotes(p=>({...p,[activeLead.id]:e.target.value}))} />
                </div>

                {(activeLead.companySize || activeLead.companyRevenue || activeLead.companyIndustry || activeLead.companyWebsite) && (
                  <div className="dp-sec">
                    <div className="dp-sec-title">Company Info</div>
                    {activeLead.companyIndustry && <div className="dp-row"><span className="dp-icon">🏢</span><span className="dp-val">{activeLead.companyIndustry}</span></div>}
                    {activeLead.companySize && <div className="dp-row"><span className="dp-icon">👥</span><span className="dp-val">{activeLead.companySize.toLocaleString()} employees</span></div>}
                    {activeLead.companyRevenue && <div className="dp-row"><span className="dp-icon">💰</span><span className="dp-val">{activeLead.companyRevenue}</span></div>}
                    {activeLead.companyWebsite && <div className="dp-row"><span className="dp-icon">🌐</span><span className="dp-val"><a href={"https://"+activeLead.companyWebsite.replace(/^https?:\/\//,"")} target="_blank" rel="noreferrer">{activeLead.companyWebsite.replace(/^https?:\/\//,"")}</a></span></div>}
                    {activeLead.companyPhone && <div className="dp-row"><span className="dp-icon">☎</span><span className="dp-val">{activeLead.companyPhone}</span><button className="dp-copy" onClick={()=>copy(activeLead.companyPhone,"cp")}>{copied==="cp"?"✓":"Copy"}</button></div>}
                  </div>
                )}
                <div className="etabs">
                  <button className={`etab ${emailTab==="cold"?"on":""}`} onClick={()=>setEmailTab("cold")}>Cold Email</button>
                  <button className={`etab ${emailTab==="linkedin"?"on":""}`} onClick={()=>setEmailTab("linkedin")}>LinkedIn</button>
                  <button className={`etab ${emailTab==="followup"?"on":""}`} onClick={()=>setEmailTab("followup")}>Follow-up</button>
                </div>

                <div className="email-area">
                  {emailTab==="cold" && (!eData
                    ? <button className="btn btn-teal" style={{width:"100%",justifyContent:"center"}} disabled={!!genEmail} onClick={()=>genEmail_(activeLead)}>
                        {genEmail===activeLead.id?<><span className="spin"/>Generating...</>:"⚡ Generate Cold Emails (A/B)"}
                      </button>
                    : <>
                        <div style={{display:"flex",gap:5,marginBottom:12,alignItems:"center"}}>
                          <button className={`vbtn ${variant==="a"?"on":""}`} onClick={()=>setVariant("a")}>Version A</button>
                          <button className={`vbtn ${variant==="b"?"on":""}`} onClick={()=>setVariant("b")}>Version B</button>
                          <button className="btn btn-outline btn-sm" style={{marginLeft:"auto"}} disabled={!!genEmail} onClick={()=>genEmail_(activeLead)}>↺ Redo</button>
                        </div>
                        <div className="ebox"><div className="elabel">Subject</div><div className="ebody" style={{fontWeight:700,color:"#f1f5f9"}}>{eData[variant]?.subject}</div></div>
                        <div className="ebox"><div className="elabel">Body</div><div className="ebody">{eData[variant]?.body}</div></div>
                        <button className="btn btn-outline btn-sm" onClick={()=>copy(`Subject: ${eData[variant]?.subject}\n\n${eData[variant]?.body}`,"ec")}>{copied==="ec"?"✓ Copied!":"Copy Email"}</button>
                      </>
                  )}

                  {emailTab==="linkedin" && (!liData
                    ? <button className="btn btn-teal" style={{width:"100%",justifyContent:"center"}} disabled={!!genLI} onClick={()=>genLI_(activeLead)}>
                        {genLI===activeLead.id?<><span className="spin"/>Generating...</>:"💼 Generate LinkedIn Messages"}
                      </button>
                    : <>
                        <div className="ebox"><div className="elabel">Connection Request</div><div className="ebody" style={{fontSize:11}}>{liData.connection}</div></div>
                        <div className="ebox"><div className="elabel">Direct Message</div><div className="ebody">{liData.dm}</div></div>
                        <div style={{display:"flex",gap:7}}>
                          <button className="btn btn-outline btn-sm" onClick={()=>copy(liData.connection,"lc")}>{copied==="lc"?"✓":"Copy Note"}</button>
                          <button className="btn btn-outline btn-sm" onClick={()=>copy(liData.dm,"ld")}>{copied==="ld"?"✓":"Copy DM"}</button>
                        </div>
                      </>
                  )}

                  {emailTab==="followup" && (!fuData
                    ? <button className="btn btn-teal" style={{width:"100%",justifyContent:"center"}} disabled={!!genFU} onClick={()=>genFU_(activeLead)}>
                        {genFU===activeLead.id?<><span className="spin"/>Generating...</>:"↩ Generate Follow-up"}
                      </button>
                    : <>
                        <div className="ebox"><div className="elabel">Subject</div><div className="ebody" style={{fontWeight:700,color:"#f1f5f9"}}>{fuData.subject}</div></div>
                        <div className="ebox"><div className="elabel">Body</div><div className="ebody">{fuData.body}</div></div>
                        <button className="btn btn-outline btn-sm" onClick={()=>copy(`Subject: ${fuData.subject}\n\n${fuData.body}`,"fc")}>{copied==="fc"?"✓ Copied!":"Copy"}</button>
                      </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
