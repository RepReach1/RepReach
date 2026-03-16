import { useState, useCallback, useRef, useEffect } from "react";

function lsGet(k, def) { try { const v=localStorage.getItem(k); return v?JSON.parse(v):def; } catch{ return def; } }
function lsSave(k, v) { try { localStorage.setItem(k,JSON.stringify(v)); } catch{} }

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

const AV_COLORS = ["#00c8ff","#06b6d4","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#0099cc"];

const TITLE_OPTIONS = [
  "Buyer","Senior Buyer","Merchant","Senior Merchant",
  "Category Manager","Senior Category Manager",
  "Director of Merchandising","VP of Merchandising",
  "Divisional Merchandise Manager","Head of Buying",
  "Chief Merchant","Procurement Manager","Sourcing Manager",
];

const QUICK_COMPANIES = ["Walmart","Sam's Club","Kroger","Target","Costco","Home Depot","CVS","Tractor Supply","Amazon","Lowe's","Publix","Walgreens","Best Buy","Dollar General","Albertsons","Dollar Tree","Aldi","Whole Foods","Meijer","HEB","Sprouts","Wegmans","Kohl's","Macy's","Nordstrom","Dick's Sporting","BJ's Wholesale","Ace Hardware","TJ Maxx","Ross","Marshalls","Safeway","Giant Eagle","ShopRite","Winn-Dixie"];

export default function App() {
  const [isSubscribed, setIsSubscribed] = useState(true);
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
  const [view,       setView]       = useState(() => lsGet("rr_view","people"));
  const [departments, setDepartments] = useState({});

  // ── NEW PLATFORM STATE ──
  const [deals,       setDeals]       = useState(() => lsGet("rr_deals",[]));
  const [sequences,   setSequences]   = useState(() => lsGet("rr_seqs",[]));
  const [enrollments, setEnrollments] = useState(() => lsGet("rr_enrollments",[]));
  const [templates,   setTemplates]   = useState(() => lsGet("rr_templates",[]));
  const [meetings,    setMeetings]    = useState(() => lsGet("rr_meetings",[]));
  const [activities,  setActivities]  = useState(() => lsGet("rr_activities",[]));

  // Pipeline deal modal
  const [showDealModal,  setShowDealModal]  = useState(false);
  const [editDeal,       setEditDeal]       = useState(null);
  const [dealForm,       setDealForm]       = useState({name:"",company:"",value:"",stage:"Lead",closeDate:"",notes:"",contactId:""});

  // Sequence modal
  const [showSeqModal,   setShowSeqModal]   = useState(false);
  const [seqForm,        setSeqForm]        = useState({name:"",description:"",steps:[]});
  const [seqStepInput,   setSeqStepInput]   = useState({type:"email",day:1,subject:"",body:""});

  // Meetings
  const [showMeetModal,  setShowMeetModal]  = useState(false);
  const [meetForm,       setMeetForm]       = useState({title:"",contact:"",date:"",notes:"",summary:""});
  const [genMeetSummary, setGenMeetSummary] = useState(false);

  // Templates
  const [showTplModal,   setShowTplModal]   = useState(false);
  const [tplForm,        setTplForm]        = useState({name:"",type:"cold",subject:"",body:""});

  // Intelligence
  const [intelQuery,     setIntelQuery]     = useState("");
  const [intelResult,    setIntelResult]    = useState(null);
  const [intelLoading,   setIntelLoading]   = useState(false);

  // AI Tools
  const [aiTool,         setAiTool]         = useState("pitch");
  const [aiInput,        setAiInput]        = useState({});
  const [aiOutput,       setAiOutput]       = useState(null);
  const [aiLoading,      setAiLoading]      = useState(false);

  // Persist state
  useEffect(() => lsSave("rr_view", view), [view]);
  useEffect(() => lsSave("rr_deals", deals), [deals]);
  useEffect(() => lsSave("rr_seqs", sequences), [sequences]);
  useEffect(() => lsSave("rr_enrollments", enrollments), [enrollments]);
  useEffect(() => lsSave("rr_templates", templates), [templates]);
  useEffect(() => lsSave("rr_meetings", meetings), [meetings]);
  useEffect(() => lsSave("rr_activities", activities), [activities]);
  const [loadingDepts, setLoadingDepts] = useState(false);

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
      const patch = {
        email:       data.email       || lead.email  || null,
        phone:       data.phone       || lead.phone  || null,
        emailStatus: data.emailStatus || null,
        enriched:    true,
      };
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...patch } : l));
      // Keep the active lead panel in sync
      setActiveLead(prev => prev?.id === lead.id ? { ...prev, ...patch } : prev);
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

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),1800); };
  const getStatus = (id) => STATUSES.find(s=>s.id===(statuses[id]||"none"))||STATUSES[0];
  const cycleStatus = (id) => { const i=STATUSES.findIndex(s=>s.id===(statuses[id]||"none")); setStatuses(p=>({...p,[id]:STATUSES[(i+1)%STATUSES.length].id})); };

  const eData  = activeLead && emails[activeLead.id];
  const liData = activeLead && linkedIns[activeLead.id];
  const fuData = activeLead && followUps[activeLead.id];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --bg:      #000000;
          --bg2:     #08090f;
          --bg3:     #0c0d15;
          --border:  rgba(255,255,255,.07);
          --border2: rgba(255,255,255,.12);
          --teal:    #00c8ff;
          --teal2:   #0099cc;
          --teal-dim:rgba(0,200,255,.08);
          --teal-glow:rgba(0,200,255,.28);
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
        .sb-logo-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--teal),var(--teal2));border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:14px;color:#000;flex-shrink:0;box-shadow:0 0 16px var(--teal-glow)}
        .sb-logo-text{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:17px;color:var(--text);letter-spacing:-.4px}
        .sb-logo-text em{font-style:normal;color:var(--teal)}

        .sb-nav{padding:8px;border-bottom:1px solid var(--border)}
        .sb-item{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:9px;font-size:12px;font-weight:600;color:var(--text3);cursor:pointer;transition:.15s;margin-bottom:1px;letter-spacing:.01em}
        .sb-item:hover{background:var(--bg3);color:var(--text2)}
        .sb-item.on{background:var(--teal-dim);color:var(--teal);border:1px solid rgba(0,200,255,.14)}
        .sb-item-icon{font-size:14px;width:18px;text-align:center;flex-shrink:0}

        .sb-sec{border-bottom:1px solid var(--border);padding:14px}
        .sb-sec-hd{font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:9px;display:flex;align-items:center;justify-content:space-between}
        .sb-sec-clear{font-size:10px;color:var(--teal);font-weight:700;cursor:pointer;background:none;border:none}
        .sb-in{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 11px;font-size:12px;color:var(--text);outline:none;margin-bottom:9px;transition:.15s}
        .sb-in::placeholder{color:var(--text3)}
        .sb-in:focus{border-color:var(--teal2);box-shadow:0 0 0 3px rgba(0,200,255,.07)}
        .sb-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--teal-dim);border:1px solid rgba(0,200,255,.16);border-radius:6px;font-size:11px;color:var(--teal);margin:2px;cursor:pointer;transition:.1s;font-weight:600;letter-spacing:.01em}
        .sb-tag:hover{background:rgba(0,200,255,.14)}
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
        .ts-wrap input:focus{border-color:var(--teal2);box-shadow:0 0 0 3px rgba(0,200,255,.08)}
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
        table.pt tr.act td{background:rgba(0,200,255,.06);border-left:2px solid var(--teal)}

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
        .cb-email{background:var(--teal-dim);color:var(--teal);border:1px solid rgba(0,200,255,.18)}
        .cb-email:hover{background:rgba(0,200,255,.14)}
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
        .dp-copy:hover{background:rgba(0,200,255,.16)}

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
        .btn-teal{background:linear-gradient(135deg,var(--teal),var(--teal2));color:#000;box-shadow:0 4px 16px var(--teal-glow)}
        .btn-teal:hover:not(:disabled){box-shadow:0 4px 24px rgba(0,200,255,.35);transform:translateY(-1px)}
        .btn-outline{background:transparent;color:var(--text2);border:1px solid var(--border)}
        .btn-outline:hover:not(:disabled){border-color:var(--teal2);color:var(--teal)}
        .btn-amber{background:linear-gradient(135deg,var(--amber),#fbbf24);color:#07080f;box-shadow:0 4px 16px rgba(245,166,35,.2)}
        .btn-amber:hover:not(:disabled){box-shadow:0 4px 24px rgba(245,166,35,.35);transform:translateY(-1px)}
        .btn-sm{padding:5px 13px;font-size:11px;border-radius:7px}

        input[type=checkbox]{accent-color:var(--teal);cursor:pointer}

        @keyframes sp{to{transform:rotate(360deg)}}
        .spin{width:13px;height:13px;border:2px solid rgba(0,200,255,.12);border-top-color:var(--teal);border-radius:50%;animation:sp .7s linear infinite;display:inline-block;flex-shrink:0}
        .spin-lg{width:32px;height:32px;border-width:3px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .pulsing{animation:pulse 1.4s ease-in-out infinite}

        /* ─── PAYWALL ─── */
        .pw-overlay{position:fixed;inset:0;background:rgba(4,5,12,.88);backdrop-filter:blur(10px);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px}
        .pw-modal{background:var(--bg2);border:1px solid var(--border);border-radius:20px;max-width:440px;width:100%;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 0 1px rgba(0,200,255,.06);position:relative}
        .pw-head{background:linear-gradient(135deg,var(--bg),#050818);padding:32px;text-align:center;border-bottom:1px solid rgba(0,200,255,.1)}
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
        .pro-badge{font-size:11px;font-weight:700;color:var(--teal);padding:4px 13px;background:var(--teal-dim);border:1px solid rgba(0,200,255,.18);border-radius:20px;letter-spacing:.02em}

        /* ─── PIPELINE / KANBAN ─── */
        .kanban{display:flex;gap:12px;padding:16px 20px;overflow-x:auto;flex:1;align-items:flex-start}
        .kanban-col{min-width:220px;width:220px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;display:flex;flex-direction:column;flex-shrink:0;max-height:calc(100vh - 220px)}
        .kanban-col-hd{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0}
        .kanban-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .kanban-col-name{font-size:12px;font-weight:700;color:var(--text);flex:1;letter-spacing:-.1px}
        .kanban-count{font-size:10px;font-weight:700;color:var(--text3);background:var(--bg3);padding:2px 7px;border-radius:10px}
        .kanban-cards{padding:10px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;flex:1}
        .deal-card{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:12px;cursor:pointer;transition:.15s}
        .deal-card:hover{border-color:var(--border2);background:#12162a}
        .deal-name{font-size:12px;font-weight:700;color:var(--text);margin-bottom:3px;letter-spacing:-.1px}
        .deal-co{font-size:11px;color:var(--teal);font-weight:600;margin-bottom:6px}
        .deal-val{font-size:13px;font-weight:800;color:var(--text);font-family:'Bricolage Grotesque',sans-serif}
        .deal-date{font-size:10px;color:var(--text3);margin-top:3px}
        .deal-add{display:flex;align-items:center;justify-content:center;padding:10px;border:1.5px dashed var(--border);border-radius:8px;cursor:pointer;color:var(--text3);font-size:12px;font-weight:600;margin:4px 10px 10px;transition:.15s;gap:4px}
        .deal-add:hover{border-color:var(--teal2);color:var(--teal)}

        /* Pipeline metrics bar */
        .pipe-metrics{display:flex;gap:20px;padding:12px 20px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
        .pm-item{display:flex;flex-direction:column;gap:2px;min-width:120px}
        .pm-val{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.5px}
        .pm-lbl{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px}

        /* ─── MODAL ─── */
        .modal-overlay{position:fixed;inset:0;background:rgba(4,5,12,.88);backdrop-filter:blur(8px);z-index:900;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:var(--bg2);border:1px solid var(--border);border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.7)}
        .modal-hd{padding:20px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .modal-title{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:800;color:var(--text);letter-spacing:-.3px}
        .modal-x{background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;line-height:1}
        .modal-x:hover{color:var(--text)}
        .modal-body{padding:20px 22px;display:flex;flex-direction:column;gap:14px}
        .modal-ft{padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end}
        .f-row{display:flex;flex-direction:column;gap:5px}
        .f-lbl{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px}
        .f-in{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 11px;font-size:13px;color:var(--text);outline:none;width:100%;transition:.15s;font-weight:500}
        .f-in::placeholder{color:var(--text3)}
        .f-in:focus{border-color:var(--teal2);box-shadow:0 0 0 3px rgba(0,200,255,.07)}
        .f-ta{resize:vertical;min-height:72px;font-family:'Inter',sans-serif;line-height:1.6}

        /* ─── SEQUENCES ─── */
        .seq-list{padding:16px 20px;display:flex;flex-direction:column;gap:10px}
        .seq-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:.15s}
        .seq-card:hover{border-color:var(--border2)}
        .seq-name{font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;letter-spacing:-.1px}
        .seq-desc{font-size:12px;color:var(--text3);margin-bottom:10px}
        .seq-steps{display:flex;gap:4px;flex-wrap:wrap}
        .seq-step-pill{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:var(--bg3);border:1px solid var(--border);color:var(--text3)}

        /* ─── FORECASTING ─── */
        .forecast-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;padding:16px 20px;flex-shrink:0}
        .fc-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px}
        .fc-val{font-family:'Bricolage Grotesque',sans-serif;font-size:28px;font-weight:800;color:var(--text);letter-spacing:-.6px;margin-bottom:2px}
        .fc-lbl{font-size:11px;font-weight:600;color:var(--text3)}
        .fc-trend{font-size:11px;font-weight:700;margin-top:6px}
        .trend-up{color:#4ade80}.trend-dn{color:#f87171}

        /* Stage bar chart */
        .stage-bars{padding:0 20px 16px;display:flex;flex-direction:column;gap:8px}
        .sb-row{display:flex;align-items:center;gap:10px}
        .sb-label{font-size:11px;font-weight:600;color:var(--text2);width:100px;flex-shrink:0}
        .sb-bar-wrap{flex:1;height:22px;background:var(--bg3);border-radius:5px;overflow:hidden}
        .sb-bar{height:100%;border-radius:5px;display:flex;align-items:center;padding:0 8px;font-size:10px;font-weight:700;color:#060b10;transition:width .4s;min-width:30px}
        .sb-amount{font-size:11px;font-weight:700;color:var(--text3);width:80px;text-align:right;flex-shrink:0}

        /* Activity log */
        .act-log{padding:0 20px 20px;display:flex;flex-direction:column;gap:6px}
        .act-item{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:9px}
        .act-icon{font-size:14px;width:24px;text-align:center;flex-shrink:0}
        .act-text{font-size:12px;color:var(--text2);flex:1;font-weight:500}
        .act-time{font-size:10px;color:var(--text3);flex-shrink:0}

        /* ─── AI TOOLS ─── */
        .ai-tool-tabs{display:flex;gap:6px;padding:14px 20px;flex-wrap:wrap;border-bottom:1px solid var(--border);background:var(--bg2);flex-shrink:0}
        .ai-tab{padding:7px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text3);transition:.12s}
        .ai-tab.on{border-color:var(--teal2);color:var(--teal);background:var(--teal-dim)}
        .ai-tab:hover:not(.on){color:var(--text2)}
        .ai-area{padding:20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1}

        /* ─── INTELLIGENCE ─── */
        .intel-bar{padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;gap:10px;flex-shrink:0}
        .intel-results{padding:20px;overflow-y:auto;flex:1}
        .intel-section{margin-bottom:20px}
        .intel-sec-title{font-size:10px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-family:'Bricolage Grotesque',sans-serif}
        .intel-item{display:flex;gap:10px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:9px;margin-bottom:6px;align-items:flex-start}
        .intel-item-label{font-size:11px;font-weight:700;color:var(--text3);width:100px;flex-shrink:0}
        .intel-item-val{font-size:12px;color:var(--text2);font-weight:500;flex:1}

        /* ─── ENABLEMENT ─── */
        .enable-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;padding:16px 20px}
        .enable-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;transition:.15s}
        .enable-card:hover{border-color:var(--teal2)}
        .enable-icon{font-size:24px;margin-bottom:10px}
        .enable-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:5px;letter-spacing:-.1px}
        .enable-desc{font-size:12px;color:var(--text3);line-height:1.6}
        .enable-tag{display:inline-flex;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;margin-top:10px;background:var(--teal-dim);color:var(--teal);border:1px solid rgba(0,200,255,.16)}

        /* ─── MEETINGS ─── */
        .meet-list{padding:16px 20px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1}
        .meet-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;transition:.15s}
        .meet-card:hover{border-color:var(--border2)}
        .meet-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:2px;letter-spacing:-.1px}
        .meet-contact{font-size:12px;color:var(--teal);font-weight:600;margin-bottom:6px}
        .meet-date{font-size:11px;color:var(--text3);margin-bottom:10px}
        .meet-summary{font-size:12px;color:var(--text2);line-height:1.7;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;white-space:pre-wrap}

        /* ─── INTEGRATIONS ─── */
        .intg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;padding:16px 20px}
        .intg-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px;display:flex;align-items:center;gap:14px}
        .intg-logo{width:44px;height:44px;border-radius:10px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
        .intg-info{flex:1;min-width:0}
        .intg-name{font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px;letter-spacing:-.1px}
        .intg-desc{font-size:11px;color:var(--text3);line-height:1.5}
        .intg-badge-connected{font-size:10px;font-weight:700;color:#4ade80;padding:3px 9px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:20px;white-space:nowrap}
        .intg-badge-pending{font-size:10px;font-weight:700;color:var(--amber);padding:3px 9px;background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);border-radius:20px;white-space:nowrap}
        .intg-btn{font-size:11px;font-weight:700;padding:6px 14px;border-radius:7px;cursor:pointer;border:1px solid var(--border);background:var(--bg3);color:var(--text2);transition:.12s;white-space:nowrap;flex-shrink:0}
        .intg-btn:hover{border-color:var(--teal2);color:var(--teal)}

        /* View section header */
        .view-hd{padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .view-hd-title{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:800;color:var(--text);letter-spacing:-.3px}
        .view-hd-sub{font-size:12px;color:var(--text3);margin-top:1px}
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
                style={{display:"block",width:"100%",padding:"13px",borderRadius:9,background:"linear-gradient(135deg,#00c8ff,#0077ff)",color:"#000",fontWeight:800,fontSize:14,textAlign:"center",textDecoration:"none",letterSpacing:".02em",boxShadow:"0 4px 20px rgba(0,200,255,.4)"}}>
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
            {[
              {id:"people",      icon:"👥", label:"People Finder"},
              {id:"pipeline",    icon:"📊", label:"Pipeline"},
              {id:"sequences",   icon:"⚡", label:"Sequences"},
              {id:"forecasting", icon:"📈", label:"Forecasting"},
              {id:"aitools",     icon:"🧠", label:"AI Tools"},
              {id:"intelligence",icon:"🔭", label:"Intelligence"},
              {id:"enablement",  icon:"📚", label:"Enablement"},
              {id:"meetings",    icon:"🎙️", label:"Meetings"},
              {id:"integrations",icon:"🔗", label:"Integrations"},
              {id:"tracker",     icon:"✓",  label:"Tracker"},
            ].map(({id,icon,label}) => (
              <div key={id} className={`sb-item ${view===id?"on":""}`} onClick={() => setView(id)}>
                <span className="sb-item-icon">{icon}</span> {label}
              </div>
            ))}
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
            {searching && <span style={{marginLeft:"auto",fontSize:11,color:"#00c8ff",fontWeight:700}} className="pulsing">Searching Apollo...</span>}
          </div>

          <div className="content">
            <div className="main">

              {/* ── PIPELINE VIEW ── */}
              {view === "pipeline" && (() => {
                const STAGES = [
                  {id:"Lead",        color:"#64748b", pct:10},
                  {id:"Contacted",   color:"#38bdf8", pct:25},
                  {id:"Qualified",   color:"#fb923c", pct:40},
                  {id:"Proposal",    color:"#a78bfa", pct:60},
                  {id:"Negotiation", color:"#facc15", pct:75},
                  {id:"Won",         color:"#4ade80", pct:100},
                  {id:"Lost",        color:"#f87171", pct:0},
                ];
                const totalPipe = deals.filter(d=>d.stage!=="Lost"&&d.stage!=="Won").reduce((s,d)=>s+Number(d.value||0),0);
                const weighted  = deals.filter(d=>d.stage!=="Lost"&&d.stage!=="Won").reduce((s,d)=>{const st=STAGES.find(x=>x.id===d.stage);return s+(Number(d.value||0)*(st?st.pct:0)/100);},0);
                const fmt = (n) => n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}K`:`$${n}`;
                const saveDeal = () => {
                  if(!dealForm.name) return;
                  if(editDeal) { setDeals(p=>p.map(d=>d.id===editDeal?{...d,...dealForm}:d)); }
                  else { setDeals(p=>[...p,{...dealForm,id:Date.now()+"",createdAt:new Date().toISOString()}]); setActivities(p=>[{id:Date.now()+"",type:"deal",text:`New deal: ${dealForm.name} (${dealForm.company})`,at:new Date().toISOString()},...p.slice(0,49)]); }
                  setShowDealModal(false); setEditDeal(null); setDealForm({name:"",company:"",value:"",stage:"Lead",closeDate:"",notes:"",contactId:""});
                };
                return (
                  <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                    <div className="view-hd">
                      <div><div className="view-hd-title">📊 Pipeline</div><div className="view-hd-sub">Kanban deal board</div></div>
                      <button className="btn btn-teal btn-sm" onClick={()=>{setEditDeal(null);setDealForm({name:"",company:"",value:"",stage:"Lead",closeDate:"",notes:"",contactId:""});setShowDealModal(true);}}>+ Add Deal</button>
                    </div>
                    <div className="pipe-metrics">
                      <div className="pm-item"><div className="pm-val">{fmt(totalPipe)}</div><div className="pm-lbl">Total Pipeline</div></div>
                      <div className="pm-item"><div className="pm-val">{fmt(weighted)}</div><div className="pm-lbl">Weighted Value</div></div>
                      <div className="pm-item"><div className="pm-val">{deals.filter(d=>d.stage!=="Lost"&&d.stage!=="Won").length}</div><div className="pm-lbl">Active Deals</div></div>
                      <div className="pm-item"><div className="pm-val">{deals.filter(d=>d.stage==="Won").length}</div><div className="pm-lbl">Won</div></div>
                      <div className="pm-item"><div className="pm-val">{deals.filter(d=>d.stage==="Lost").length}</div><div className="pm-lbl">Lost</div></div>
                    </div>
                    <div className="kanban">
                      {STAGES.map(st => {
                        const colDeals = deals.filter(d=>d.stage===st.id);
                        return (
                          <div key={st.id} className="kanban-col">
                            <div className="kanban-col-hd">
                              <div className="kanban-dot" style={{background:st.color}}/>
                              <div className="kanban-col-name">{st.id}</div>
                              <div className="kanban-count">{colDeals.length}</div>
                            </div>
                            <div className="kanban-cards">
                              {colDeals.map(deal => (
                                <div key={deal.id} className="deal-card" onClick={()=>{setEditDeal(deal.id);setDealForm({name:deal.name,company:deal.company,value:deal.value,stage:deal.stage,closeDate:deal.closeDate||"",notes:deal.notes||"",contactId:deal.contactId||""});setShowDealModal(true);}}>
                                  <div className="deal-name">{deal.name}</div>
                                  <div className="deal-co">{deal.company}</div>
                                  <div className="deal-val">{deal.value?fmt(Number(deal.value)):"—"}</div>
                                  {deal.closeDate && <div className="deal-date">Close: {deal.closeDate}</div>}
                                  {deal.notes && <div style={{fontSize:11,color:"#334155",marginTop:5,lineHeight:1.5}}>{deal.notes.slice(0,60)}{deal.notes.length>60?"…":""}</div>}
                                </div>
                              ))}
                            </div>
                            <div className="deal-add" onClick={()=>{setEditDeal(null);setDealForm({name:"",company:"",value:"",stage:st.id,closeDate:"",notes:"",contactId:""});setShowDealModal(true);}}>+ Add</div>
                          </div>
                        );
                      })}
                    </div>
                    {showDealModal && (
                      <div className="modal-overlay" onClick={()=>setShowDealModal(false)}>
                        <div className="modal" onClick={e=>e.stopPropagation()}>
                          <div className="modal-hd"><div className="modal-title">{editDeal?"Edit Deal":"New Deal"}</div><button className="modal-x" onClick={()=>setShowDealModal(false)}>×</button></div>
                          <div className="modal-body">
                            <div className="f-row"><label className="f-lbl">Deal Name *</label><input className="f-in" placeholder="e.g. Walmart Q3 Pitch" value={dealForm.name} onChange={e=>setDealForm(p=>({...p,name:e.target.value}))}/></div>
                            <div className="f-row"><label className="f-lbl">Company</label><input className="f-in" placeholder="Walmart" value={dealForm.company} onChange={e=>setDealForm(p=>({...p,company:e.target.value}))}/></div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                              <div className="f-row"><label className="f-lbl">Value ($)</label><input className="f-in" type="number" placeholder="50000" value={dealForm.value} onChange={e=>setDealForm(p=>({...p,value:e.target.value}))}/></div>
                              <div className="f-row"><label className="f-lbl">Close Date</label><input className="f-in" type="date" value={dealForm.closeDate} onChange={e=>setDealForm(p=>({...p,closeDate:e.target.value}))}/></div>
                            </div>
                            <div className="f-row"><label className="f-lbl">Stage</label>
                              <select className="f-in" value={dealForm.stage} onChange={e=>setDealForm(p=>({...p,stage:e.target.value}))}>
                                {STAGES.map(s=><option key={s.id}>{s.id}</option>)}
                              </select>
                            </div>
                            <div className="f-row"><label className="f-lbl">Notes</label><textarea className="f-in f-ta" placeholder="Deal notes..." value={dealForm.notes} onChange={e=>setDealForm(p=>({...p,notes:e.target.value}))}/></div>
                          </div>
                          <div className="modal-ft">
                            {editDeal && <button className="btn btn-outline btn-sm" style={{marginRight:"auto",color:"#f87171"}} onClick={()=>{setDeals(p=>p.filter(d=>d.id!==editDeal));setShowDealModal(false);setEditDeal(null);}}>Delete</button>}
                            <button className="btn btn-outline btn-sm" onClick={()=>setShowDealModal(false)}>Cancel</button>
                            <button className="btn btn-teal btn-sm" onClick={saveDeal}>Save Deal</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── SEQUENCES VIEW ── */}
              {view === "sequences" && (() => {
                const saveSeq = () => {
                  if(!seqForm.name) return;
                  setSequences(p=>[...p,{...seqForm,id:Date.now()+"",createdAt:new Date().toISOString()}]);
                  setShowSeqModal(false); setSeqForm({name:"",description:"",steps:[]});
                };
                const addStep = () => {
                  if(!seqStepInput.subject&&seqStepInput.type==="email") return;
                  setSeqForm(p=>({...p,steps:[...p.steps,{...seqStepInput,id:Date.now()+""}]}));
                  setSeqStepInput({type:"email",day:seqStepInput.day+3,subject:"",body:""});
                };
                return (
                  <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                    <div className="view-hd">
                      <div><div className="view-hd-title">⚡ Sequences</div><div className="view-hd-sub">Automated multi-step outreach</div></div>
                      <button className="btn btn-teal btn-sm" onClick={()=>{setSeqForm({name:"",description:"",steps:[]});setSeqStepInput({type:"email",day:1,subject:"",body:""});setShowSeqModal(true);}}>+ New Sequence</button>
                    </div>
                    <div className="seq-list" style={{overflowY:"auto",flex:1}}>
                      {sequences.length===0 && (
                        <div className="empty"><div className="empty-icon">⚡</div><h3>No sequences yet</h3><p>Create multi-step outreach sequences with emails, LinkedIn touches, and call reminders.</p></div>
                      )}
                      {sequences.map(seq => {
                        const enrolled = enrollments.filter(e=>e.seqId===seq.id).length;
                        return (
                          <div key={seq.id} className="seq-card">
                            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
                              <div style={{flex:1}}>
                                <div className="seq-name">{seq.name}</div>
                                <div className="seq-desc">{seq.description||`${seq.steps.length} steps`}</div>
                                <div className="seq-steps">
                                  {seq.steps.map((s,i)=>(
                                    <div key={i} className="seq-step-pill">Day {s.day}: {s.type==="email"?"✉ Email":s.type==="linkedin"?"💼 LinkedIn":"📞 Call"}</div>
                                  ))}
                                </div>
                              </div>
                              <div style={{display:"flex",gap:6,flexShrink:0}}>
                                <span style={{fontSize:11,color:enrolled>0?"#00c9a7":"#334155",fontWeight:700}}>{enrolled} enrolled</span>
                                <button className="btn btn-outline btn-sm" onClick={()=>setSequences(p=>p.filter(s=>s.id!==seq.id))}>Delete</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {showSeqModal && (
                      <div className="modal-overlay" onClick={()=>setShowSeqModal(false)}>
                        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
                          <div className="modal-hd"><div className="modal-title">New Sequence</div><button className="modal-x" onClick={()=>setShowSeqModal(false)}>×</button></div>
                          <div className="modal-body">
                            <div className="f-row"><label className="f-lbl">Name *</label><input className="f-in" placeholder="Walmart Outreach" value={seqForm.name} onChange={e=>setSeqForm(p=>({...p,name:e.target.value}))}/></div>
                            <div className="f-row"><label className="f-lbl">Description</label><input className="f-in" placeholder="Cold outreach for grocery buyers" value={seqForm.description} onChange={e=>setSeqForm(p=>({...p,description:e.target.value}))}/></div>
                            <div style={{borderTop:"1px solid var(--border)",paddingTop:12}}>
                              <div className="f-lbl" style={{marginBottom:10}}>Steps</div>
                              {seqForm.steps.map((s,i)=>(
                                <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 10px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,marginBottom:5}}>
                                  <span style={{fontSize:11,color:"#00c8ff",fontWeight:700,width:40,flexShrink:0}}>Day {s.day}</span>
                                  <span style={{fontSize:11,color:"#8b91b8",flex:1}}>{s.type==="email"?"✉ "+s.subject:s.type==="linkedin"?"💼 LinkedIn touch":"📞 Call task"}</span>
                                  <button style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:14}} onClick={()=>setSeqForm(p=>({...p,steps:p.steps.filter((_,j)=>j!==i)}))}>×</button>
                                </div>
                              ))}
                              <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:9,padding:12,display:"flex",flexDirection:"column",gap:8}}>
                                <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8}}>
                                  <div className="f-row"><label className="f-lbl">Day</label><input className="f-in" type="number" min={1} value={seqStepInput.day} onChange={e=>setSeqStepInput(p=>({...p,day:+e.target.value}))}/></div>
                                  <div className="f-row"><label className="f-lbl">Type</label>
                                    <select className="f-in" value={seqStepInput.type} onChange={e=>setSeqStepInput(p=>({...p,type:e.target.value}))}>
                                      <option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="call">Call</option>
                                    </select>
                                  </div>
                                </div>
                                {seqStepInput.type==="email" && <>
                                  <div className="f-row"><label className="f-lbl">Subject</label><input className="f-in" placeholder="Subject line" value={seqStepInput.subject} onChange={e=>setSeqStepInput(p=>({...p,subject:e.target.value}))}/></div>
                                  <div className="f-row"><label className="f-lbl">Body</label><textarea className="f-in f-ta" placeholder="Email body..." value={seqStepInput.body} onChange={e=>setSeqStepInput(p=>({...p,body:e.target.value}))}/></div>
                                </>}
                                <button className="btn btn-outline btn-sm" style={{alignSelf:"flex-start"}} onClick={addStep}>+ Add Step</button>
                              </div>
                            </div>
                          </div>
                          <div className="modal-ft">
                            <button className="btn btn-outline btn-sm" onClick={()=>setShowSeqModal(false)}>Cancel</button>
                            <button className="btn btn-teal btn-sm" onClick={saveSeq}>Create Sequence</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── FORECASTING VIEW ── */}
              {view === "forecasting" && (() => {
                const STAGES = [
                  {id:"Lead",color:"#64748b",pct:10},{id:"Contacted",color:"#38bdf8",pct:25},
                  {id:"Qualified",color:"#fb923c",pct:40},{id:"Proposal",color:"#a78bfa",pct:60},
                  {id:"Negotiation",color:"#facc15",pct:75},{id:"Won",color:"#4ade80",pct:100},
                ];
                const fmt = n=>n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}K`:`$${n}`;
                const total   = deals.reduce((s,d)=>s+Number(d.value||0),0);
                const weighted= deals.filter(d=>d.stage!=="Lost").reduce((s,d)=>{const st=STAGES.find(x=>x.id===d.stage);return s+(Number(d.value||0)*(st?st.pct:0)/100);},0);
                const won     = deals.filter(d=>d.stage==="Won").reduce((s,d)=>s+Number(d.value||0),0);
                const active  = deals.filter(d=>d.stage!=="Won"&&d.stage!=="Lost").length;
                const maxVal  = Math.max(...STAGES.map(s=>deals.filter(d=>d.stage===s.id).reduce((a,d)=>a+Number(d.value||0),0)),1);
                return (
                  <div style={{display:"flex",flexDirection:"column",flex:1,overflowY:"auto"}}>
                    <div className="view-hd">
                      <div><div className="view-hd-title">📈 Forecasting</div><div className="view-hd-sub">Pipeline analytics & activity</div></div>
                    </div>
                    <div className="forecast-grid">
                      <div className="fc-card"><div className="fc-val">{fmt(total)}</div><div className="fc-lbl">Total Pipeline</div></div>
                      <div className="fc-card"><div className="fc-val">{fmt(weighted)}</div><div className="fc-lbl">Weighted Forecast</div></div>
                      <div className="fc-card"><div className="fc-val">{fmt(won)}</div><div className="fc-lbl">Won YTD</div></div>
                      <div className="fc-card"><div className="fc-val">{active}</div><div className="fc-lbl">Active Deals</div></div>
                    </div>
                    <div style={{padding:"0 20px 8px 20px",fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:13,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px"}}>Pipeline by Stage</div>
                    <div className="stage-bars">
                      {STAGES.map(s => {
                        const val = deals.filter(d=>d.stage===s.id).reduce((a,d)=>a+Number(d.value||0),0);
                        const pct = maxVal>0?Math.round(val/maxVal*100):0;
                        return (
                          <div key={s.id} className="sb-row">
                            <div className="sb-label">{s.id}</div>
                            <div className="sb-bar-wrap"><div className="sb-bar" style={{width:pct+"%",background:s.color,minWidth:val>0?30:0}}>{val>0?"":" "}</div></div>
                            <div className="sb-amount">{fmt(val)}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{padding:"12px 20px 8px 20px",fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:13,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px"}}>Recent Activity</div>
                    <div className="act-log">
                      {activities.length===0 && <div style={{color:"#334155",fontSize:12,padding:"10px 0"}}>No activity yet. Create deals and send emails to see activity here.</div>}
                      {activities.slice(0,20).map(a=>(
                        <div key={a.id} className="act-item">
                          <div className="act-icon">{a.type==="deal"?"📊":a.type==="email"?"✉":a.type==="meeting"?"🎙️":"⚡"}</div>
                          <div className="act-text">{a.text}</div>
                          <div className="act-time">{new Date(a.at).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── AI TOOLS VIEW ── */}
              {view === "aitools" && (() => {
                const AI_TOOLS = [
                  {id:"pitch",      label:"Pitch Builder",       icon:"🎯", desc:"Generate a tailored pitch for any buyer"},
                  {id:"objection",  label:"Objection Handler",   icon:"🛡️", desc:"Overcome common buyer objections"},
                  {id:"subject",    label:"Subject Line Tester", icon:"✉", desc:"Generate 5 high-converting subject lines"},
                  {id:"valueprop",  label:"Value Proposition",   icon:"💎", desc:"Craft your unique selling point"},
                  {id:"callscript", label:"Call Script",         icon:"📞", desc:"Get a word-for-word cold call script"},
                ];
                const runAiTool = async () => {
                  if(!brandName) return alert("Enter your brand name in the settings bar first.");
                  setAiLoading(true); setAiOutput(null);
                  const prompts = {
                    pitch:      `Write a 3-bullet pitch from sales rep ${repName||"Rep"} at brand "${brandName}" (${productDesc||brandName}) to a retail buyer. Compelling, outcome-focused. Brand: ${brandName}. Context: ${aiInput.context||"grocery retail"}. ONLY JSON: {"headline":"...","bullets":["...","...","..."],"cta":"..."}`,
                    objection:  `Handle this buyer objection for brand "${brandName}": "${aiInput.objection||"We already have a supplier"}". Response max 80 words, professional. ONLY JSON: {"response":"...","followUp":"..."}`,
                    subject:    `Generate 5 cold email subject lines for "${brandName}" targeting ${aiInput.role||"retail buyer"} at ${aiInput.company||"major retailer"}. Varied styles (question, number, name-drop, benefit, urgency). ONLY JSON: {"lines":["...","...","...","...","..."]}`,
                    valuerop:   `Write a value proposition for "${brandName}" (${productDesc||"CPG product"}) for ${aiInput.channel||"grocery retail"}. Max 2 sentences. ONLY JSON: {"statement":"...","proof":"..."}`,
                    callscript: `Write a 30-second cold call opener for rep ${repName||"Rep"} at "${brandName}" calling a ${aiInput.role||"buyer"} at ${aiInput.company||"Walmart"}. Natural, not salesy. ONLY JSON: {"opener":"...","bridge":"...","ask":"..."}`,
                  };
                  try { const r = await generateText(prompts[aiTool]||prompts.pitch); setAiOutput(r); } catch(e){alert("Failed: "+e.message);}
                  setAiLoading(false);
                };
                return (
                  <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                    <div className="view-hd"><div><div className="view-hd-title">🧠 AI Tools</div><div className="view-hd-sub">AI-powered sales assets</div></div></div>
                    <div className="ai-tool-tabs">
                      {AI_TOOLS.map(t=><button key={t.id} className={`ai-tab ${aiTool===t.id?"on":""}`} onClick={()=>{setAiTool(t.id);setAiOutput(null);setAiInput({});}}>{t.icon} {t.label}</button>)}
                    </div>
                    <div className="ai-area">
                      {(() => {
                        const tool = AI_TOOLS.find(t=>t.id===aiTool);
                        return (
                          <>
                            <div style={{padding:"14px 16px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,marginBottom:4}}>
                              <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:4}}>{tool?.icon} {tool?.label}</div>
                              <div style={{fontSize:12,color:"var(--text3)"}}>{tool?.desc}</div>
                            </div>
                            {aiTool==="pitch" && <>
                              <div className="f-row"><label className="f-lbl">Retail Context</label><input className="f-in" placeholder="e.g. grocery, mass, club" value={aiInput.context||""} onChange={e=>setAiInput(p=>({...p,context:e.target.value}))}/></div>
                            </>}
                            {aiTool==="objection" && <>
                              <div className="f-row"><label className="f-lbl">Objection</label><input className="f-in" placeholder="e.g. Your price is too high" value={aiInput.objection||""} onChange={e=>setAiInput(p=>({...p,objection:e.target.value}))}/></div>
                            </>}
                            {(aiTool==="subject"||aiTool==="callscript") && <>
                              <div className="f-row"><label className="f-lbl">Buyer Role</label><input className="f-in" placeholder="e.g. Category Manager" value={aiInput.role||""} onChange={e=>setAiInput(p=>({...p,role:e.target.value}))}/></div>
                              <div className="f-row"><label className="f-lbl">Company</label><input className="f-in" placeholder="e.g. Walmart" value={aiInput.company||""} onChange={e=>setAiInput(p=>({...p,company:e.target.value}))}/></div>
                            </>}
                            {aiTool==="valueprop" && <>
                              <div className="f-row"><label className="f-lbl">Channel</label><input className="f-in" placeholder="e.g. Grocery retail" value={aiInput.channel||""} onChange={e=>setAiInput(p=>({...p,channel:e.target.value}))}/></div>
                            </>}
                            <button className="btn btn-teal" disabled={aiLoading} onClick={runAiTool}>{aiLoading?<><span className="spin"/>Generating...</>:"⚡ Generate"}</button>
                            {aiOutput && (
                              <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,padding:16,display:"flex",flexDirection:"column",gap:10}}>
                                {Object.entries(aiOutput).map(([k,v])=>(
                                  <div key={k}>
                                    <div style={{fontSize:9,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5,fontFamily:"'Bricolage Grotesque',sans-serif"}}>{k}</div>
                                    {Array.isArray(v)
                                      ? <div style={{display:"flex",flexDirection:"column",gap:5}}>{v.map((item,i)=><div key={i} style={{fontSize:12,color:"var(--text2)",padding:"7px 11px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:7}}>{item}</div>)}</div>
                                      : <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{v}</div>
                                    }
                                  </div>
                                ))}
                                <button className="btn btn-outline btn-sm" style={{alignSelf:"flex-start"}} onClick={()=>copy(JSON.stringify(aiOutput,null,2),"ai_out")}>{copied==="ai_out"?"✓ Copied":"Copy All"}</button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* ── INTELLIGENCE VIEW ── */}
              {view === "intelligence" && (() => {
                const runIntel = async () => {
                  if(!intelQuery.trim()) return;
                  setIntelLoading(true); setIntelResult(null);
                  try {
                    const r = await generateText(
                      `You are a retail intelligence analyst. Research the company or buyer: "${intelQuery}".
Provide key insights for a CPG sales rep. Brand context: ${brandName||"CPG brand"}.
ONLY JSON: {"company":"...","keyBuyers":"...","categoryFocus":"...","vendorPolicy":"...","opportunities":"...","risks":"...","recentNews":"...","tipsForRep":"..."}`
                    );
                    setIntelResult(r);
                  } catch(e){alert("Failed: "+e.message);}
                  setIntelLoading(false);
                };
                return (
                  <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                    <div className="view-hd"><div><div className="view-hd-title">🔭 Intelligence</div><div className="view-hd-sub">AI-powered retailer & buyer research</div></div></div>
                    <div className="intel-bar">
                      <input className="f-in" style={{flex:1}} placeholder="Enter retailer or buyer name to research..." value={intelQuery} onChange={e=>setIntelQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runIntel()}/>
                      <button className="btn btn-teal" disabled={intelLoading} onClick={runIntel}>{intelLoading?<><span className="spin"/>Researching...</>:"🔭 Research"}</button>
                    </div>
                    <div className="intel-results">
                      {!intelResult && !intelLoading && (
                        <div className="empty"><div className="empty-icon">🔭</div><h3>Retailer Intelligence</h3><p>Enter any retailer or buyer name to get AI-powered insights: vendor policies, buying priorities, category focus, and tips for getting the meeting.</p></div>
                      )}
                      {intelResult && (
                        <div style={{display:"flex",flexDirection:"column",gap:14}}>
                          {Object.entries(intelResult).map(([k,v])=>{
                            const labels={company:"Company Overview",keyBuyers:"Key Buyers",categoryFocus:"Category Focus",vendorPolicy:"Vendor Policy",opportunities:"Opportunities",risks:"Risks / Challenges",recentNews:"Recent News",tipsForRep:"Tips for Your Pitch"};
                            return (
                              <div key={k} className="intel-item" style={{flexDirection:"column"}}>
                                <div className="intel-sec-title">{labels[k]||k}</div>
                                <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.7}}>{v}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── ENABLEMENT VIEW ── */}
              {view === "enablement" && (
                <div style={{display:"flex",flexDirection:"column",flex:1,overflowY:"auto"}}>
                  <div className="view-hd"><div><div className="view-hd-title">📚 Sales Enablement</div><div className="view-hd-sub">Playbooks, battlecards & resources</div></div></div>
                  <div className="enable-grid">
                    {[
                      {icon:"⚔️",title:"Competitor Battlecard",desc:"Head-to-head comparison vs. top competitors in your category. Position your brand to win.",tag:"Strategy"},
                      {icon:"📋",title:"Buyer Persona Guide",desc:"Deep profiles for Grocery, Club, Drug, and Mass buyers. Know who you're talking to before you walk in.",tag:"Research"},
                      {icon:"📞",title:"Cold Call Playbook",desc:"Word-for-word scripts for the first 30 seconds, bridge to pitch, and how to book the meeting.",tag:"Scripts"},
                      {icon:"📦",title:"Category Sell Story",desc:"How to frame your product in the context of the category's biggest trends and gaps.",tag:"Pitch"},
                      {icon:"🤝",title:"Meeting Prep Checklist",desc:"Everything you need to prepare before walking into a buyer meeting. Never get caught off-guard.",tag:"Meetings"},
                      {icon:"💰",title:"Trade Spend Calculator",desc:"Model your trade spend ROI to walk into every conversation knowing your numbers cold.",tag:"Finance"},
                      {icon:"📊",title:"Nielsen/SPINS Cheat Sheet",desc:"How to read IRI/Nielsen data and use it to tell a compelling category story to buyers.",tag:"Data"},
                      {icon:"✉",title:"Email Template Library",desc:"20+ proven cold email templates for grocery, club, drug, and mass channel buyers.",tag:"Templates"},
                    ].map((card,i)=>(
                      <div key={i} className="enable-card">
                        <div className="enable-icon">{card.icon}</div>
                        <div className="enable-title">{card.title}</div>
                        <div className="enable-desc">{card.desc}</div>
                        <div className="enable-tag">{card.tag}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── MEETINGS VIEW ── */}
              {view === "meetings" && (() => {
                const saveMeet = async () => {
                  if(!meetForm.title) return;
                  setMeetings(p=>[{...meetForm,id:Date.now()+"",createdAt:new Date().toISOString()},...p]);
                  setActivities(p=>[{id:Date.now()+"",type:"meeting",text:`Meeting notes saved: ${meetForm.title}`,at:new Date().toISOString()},...p.slice(0,49)]);
                  setShowMeetModal(false); setMeetForm({title:"",contact:"",date:"",notes:"",summary:""});
                };
                const genSummary = async () => {
                  if(!meetForm.notes) return alert("Add meeting notes first.");
                  setGenMeetSummary(true);
                  try {
                    const r = await generateText(
                      `Summarize these sales meeting notes into: key outcomes, action items, and next steps.
Meeting: "${meetForm.title}". Contact: "${meetForm.contact}".
Notes: ${meetForm.notes}
ONLY JSON: {"summary":"...","outcomes":["..."],"actionItems":["..."],"nextSteps":"..."}`
                    );
                    setMeetForm(p=>({...p,summary:JSON.stringify(r,null,2)}));
                  } catch(e){alert("Failed: "+e.message);}
                  setGenMeetSummary(false);
                };
                return (
                  <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                    <div className="view-hd">
                      <div><div className="view-hd-title">🎙️ Meetings</div><div className="view-hd-sub">Notes & AI summaries</div></div>
                      <button className="btn btn-teal btn-sm" onClick={()=>{setMeetForm({title:"",contact:"",date:"",notes:"",summary:""});setShowMeetModal(true);}}>+ Log Meeting</button>
                    </div>
                    <div className="meet-list">
                      {meetings.length===0 && <div className="empty"><div className="empty-icon">🎙️</div><h3>No meetings logged</h3><p>Log buyer meetings and use AI to extract key outcomes, action items, and next steps.</p></div>}
                      {meetings.map(m=>(
                        <div key={m.id} className="meet-card">
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
                            <div style={{flex:1}}>
                              <div className="meet-title">{m.title}</div>
                              {m.contact && <div className="meet-contact">{m.contact}</div>}
                              {m.date && <div className="meet-date">{m.date}</div>}
                              {m.notes && <div style={{fontSize:12,color:"var(--text3)",marginBottom:8,lineHeight:1.6}}>{m.notes.slice(0,150)}{m.notes.length>150?"…":""}</div>}
                              {m.summary && (
                                <div className="meet-summary">{m.summary}</div>
                              )}
                            </div>
                            <button className="btn btn-outline btn-sm" style={{flexShrink:0}} onClick={()=>setMeetings(p=>p.filter(x=>x.id!==m.id))}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {showMeetModal && (
                      <div className="modal-overlay" onClick={()=>setShowMeetModal(false)}>
                        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
                          <div className="modal-hd"><div className="modal-title">Log Meeting</div><button className="modal-x" onClick={()=>setShowMeetModal(false)}>×</button></div>
                          <div className="modal-body">
                            <div className="f-row"><label className="f-lbl">Meeting Title *</label><input className="f-in" placeholder="Walmart Q3 Review" value={meetForm.title} onChange={e=>setMeetForm(p=>({...p,title:e.target.value}))}/></div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                              <div className="f-row"><label className="f-lbl">Contact</label><input className="f-in" placeholder="Jane Smith" value={meetForm.contact} onChange={e=>setMeetForm(p=>({...p,contact:e.target.value}))}/></div>
                              <div className="f-row"><label className="f-lbl">Date</label><input className="f-in" type="date" value={meetForm.date} onChange={e=>setMeetForm(p=>({...p,date:e.target.value}))}/></div>
                            </div>
                            <div className="f-row"><label className="f-lbl">Notes</label><textarea className="f-in f-ta" style={{minHeight:120}} placeholder="What was discussed, decisions made, objections raised..." value={meetForm.notes} onChange={e=>setMeetForm(p=>({...p,notes:e.target.value}))}/></div>
                            <button className="btn btn-outline btn-sm" disabled={genMeetSummary} onClick={genSummary}>{genMeetSummary?<><span className="spin"/>Summarizing...</>:"🧠 AI Summarize"}</button>
                            {meetForm.summary && <div className="meet-summary" style={{fontSize:11,lineHeight:1.6}}>{meetForm.summary}</div>}
                          </div>
                          <div className="modal-ft">
                            <button className="btn btn-outline btn-sm" onClick={()=>setShowMeetModal(false)}>Cancel</button>
                            <button className="btn btn-teal btn-sm" onClick={saveMeet}>Save Meeting</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── INTEGRATIONS VIEW ── */}
              {view === "integrations" && (
                <div style={{display:"flex",flexDirection:"column",flex:1,overflowY:"auto"}}>
                  <div className="view-hd"><div><div className="view-hd-title">🔗 Integrations</div><div className="view-hd-sub">Connect your sales stack</div></div></div>
                  <div className="intg-grid">
                    {[
                      {icon:"🟢",name:"Salesforce",desc:"Sync deals, contacts, and activities to your CRM",connected:false},
                      {icon:"📧",name:"Gmail",desc:"Send emails directly from RepReach. Track opens and replies.",connected:false},
                      {icon:"💼",name:"LinkedIn Sales Nav",desc:"Pull contact insights from LinkedIn directly into lead profiles.",connected:false},
                      {icon:"📅",name:"Google Calendar",desc:"Schedule buyer meetings and get prep reminders automatically.",connected:false},
                      {icon:"💬",name:"Slack",desc:"Get deal updates and meeting reminders sent to your Slack.",connected:false},
                      {icon:"🔵",name:"HubSpot",desc:"Bi-directional sync with HubSpot CRM. Contacts, deals, emails.",connected:false},
                      {icon:"📊",name:"Apollo.io",desc:"Native Apollo integration for contact data (already active).",connected:true},
                      {icon:"📝",name:"Notion",desc:"Auto-sync meeting notes and battlecards to your Notion workspace.",connected:false},
                    ].map((intg,i)=>(
                      <div key={i} className="intg-card">
                        <div className="intg-logo">{intg.icon}</div>
                        <div className="intg-info">
                          <div className="intg-name">{intg.name}</div>
                          <div className="intg-desc">{intg.desc}</div>
                          {intg.connected && <div style={{marginTop:5}}><span className="intg-badge-connected">✓ Connected</span></div>}
                        </div>
                        {!intg.connected
                          ? <button className="intg-btn" onClick={()=>alert(`${intg.name} integration coming soon! We're building it. Sign up for early access.`)}>Connect</button>
                          : null
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === "people" ? (<>
                <div className="toolbar">
                  {searching ? (
                    <><span className="spin"/><span style={{color:"#334155",marginLeft:8,fontWeight:600}}>
                      {searchMode==="person" ? <>Searching for <span style={{color:"#00c8ff"}}>{companyInput}</span>...</> : <>Finding buyers at <span style={{color:"#00c8ff"}}>{companyInput}</span>...</>}
                    </span></>
                  ) : hasSearched ? (
                    <>
                      <span className="rc">{leads.length.toLocaleString()} buyers found</span>
                      {totalAvailable > leads.length && <span className="rs" style={{marginLeft:6}}>of {totalAvailable.toLocaleString()} in Apollo</span>}
                      {selected.size > 0 && <span style={{marginLeft:12,color:"#00c8ff",fontWeight:700,fontSize:12}}>{selected.size} selected</span>}
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
                    <p style={{color:"#334155"}}>Pulling every buyer at <span style={{color:"#00c8ff",fontWeight:700}}>{companyInput}</span></p>
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
                                  ? <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",background:"rgba(0,200,255,.07)",border:"1px solid rgba(0,200,255,.15)",borderRadius:5,fontSize:11,fontWeight:700,color:"#00c8ff",whiteSpace:"nowrap"}}>{departments[lead.id]}</span>
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
                                      : lead.enriched
                                        ? <span style={{color:"#475569",fontSize:10}}>No email</span>
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
              </>) : (
                /* ── TRACKER ── */
                <div style={{padding:"16px 20px",overflow:"auto",flex:1}}>
                  <div style={{marginBottom:16}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#f1f5f9",marginBottom:3,letterSpacing:"-.2px"}}>Outreach Tracker</div>
                    <div style={{fontSize:12,color:"#334155"}}>{leads.length} contacts · {companyInput||"no search"}</div>
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
                              <td style={{color:"#00c8ff",fontWeight:600}}>{lead.retailer}</td>
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
                      <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",background:"rgba(0,200,255,.08)",border:"1px solid rgba(0,200,255,.15)",borderRadius:5,fontSize:11,fontWeight:700,color:"#00c8ff",marginTop:5,width:"fit-content"}}>{departments[activeLead.id]}</span>
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
                      ? <div className="dp-row"><span className="dp-icon">✉</span><span style={{color:"#00c8ff",fontSize:11,display:"flex",alignItems:"center",gap:6}}><span className="spin" style={{width:11,height:11}}/>Revealing...</span></div>
                      : activeLead.enriched
                        ? <div className="dp-row"><span className="dp-icon">✉</span><span style={{color:"#64748b",fontSize:11,flex:1}}>No email on record{activeLead.emailStatus==="unavailable"?" (unavailable in Apollo)":""}</span></div>
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
                      ? <div className="dp-row"><span className="dp-icon">📞</span><span style={{color:"#00c8ff",fontSize:11}}>Revealing...</span></div>
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
