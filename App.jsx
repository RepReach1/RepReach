import { useState, useCallback, useRef } from "react";

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
  const [statuses,   setStatuses]   = useState({});
  const [notes,      setNotes]      = useState({});
  const [view,       setView]       = useState("people");
  const [departments, setDepartments] = useState({});
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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%}
        body{font-family:'DM Sans',sans-serif;background:#080d14;color:#e2e8f0;font-size:13px;overflow:hidden}
        input,select,textarea,button{font-family:'DM Sans',sans-serif;font-size:13px}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1e2d3d;border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:#00c9a7}

        /* ─── SHELL ─── */
        .shell{display:flex;height:100vh;overflow:hidden}

        /* ─── SIDEBAR ─── */
        .sidebar{width:236px;background:#060b10;border-right:1px solid #0d1f2d;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}

        .sb-logo{padding:16px;border-bottom:1px solid #0d1f2d;display:flex;align-items:center;gap:10px}
        .sb-logo-icon{width:30px;height:30px;background:linear-gradient(135deg,#00c9a7,#00e5c0);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:#060b10;flex-shrink:0;box-shadow:0 0 12px rgba(0,201,167,.4)}
        .sb-logo-text{font-family:'Syne',sans-serif;font-weight:800;font-size:16px;color:#fff;letter-spacing:-.3px}
        .sb-logo-text em{font-style:normal;color:#00c9a7}

        .sb-nav{padding:10px 8px;border-bottom:1px solid #0d1f2d}
        .sb-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;transition:.15s;margin-bottom:2px;letter-spacing:.01em}
        .sb-item:hover{background:#0d1f2d;color:#94a3b8}
        .sb-item.on{background:linear-gradient(135deg,rgba(0,201,167,.12),rgba(0,201,167,.06));color:#00c9a7;border:1px solid rgba(0,201,167,.15)}
        .sb-item-icon{font-size:15px;width:18px;text-align:center;flex-shrink:0}

        .sb-sec{border-bottom:1px solid #0d1f2d;padding:12px}
        .sb-sec-hd{font-size:10px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
        .sb-sec-clear{font-size:10px;color:#00c9a7;font-weight:700;cursor:pointer;background:none;border:none}
        .sb-in{width:100%;background:#0d1f2d;border:1px solid #1e2d3d;border-radius:7px;padding:7px 10px;font-size:12px;color:#cbd5e1;outline:none;margin-bottom:8px;transition:.15s}
        .sb-in::placeholder{color:#334155}
        .sb-in:focus{border-color:#00c9a7;background:#0a1929;box-shadow:0 0 0 2px rgba(0,201,167,.1)}
        .sb-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;background:rgba(0,201,167,.08);border:1px solid rgba(0,201,167,.18);border-radius:5px;font-size:11px;color:#00c9a7;margin:2px;cursor:pointer;transition:.1s;font-weight:600}
        .sb-tag:hover{background:rgba(0,201,167,.16)}
        .sb-tag-x{color:#00a880;font-size:12px;font-weight:700}
        .sb-check{display:flex;align-items:center;gap:7px;padding:5px 6px;border-radius:6px;cursor:pointer;transition:.1s}
        .sb-check:hover{background:#0d1f2d}
        .sb-check label{font-size:12px;color:#94a3b8;cursor:pointer;flex:1}
        .sb-check input[type=checkbox]{width:14px;height:14px;accent-color:#00c9a7;cursor:pointer;flex-shrink:0}

        /* ─── RIGHT SIDE ─── */
        .right{flex:1;display:flex;flex-direction:column;overflow:hidden}

        /* ─── TOPBAR ─── */
        .topbar{height:50px;background:#060b10;border-bottom:1px solid #0d1f2d;display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0}
        .ts-wrap{flex:1;max-width:400px;position:relative}
        .ts-wrap input{width:100%;background:#0d1f2d;border:1px solid #1e2d3d;border-radius:8px;padding:8px 12px 8px 34px;font-size:13px;color:#e2e8f0;outline:none;transition:.15s}
        .ts-wrap input::placeholder{color:#334155}
        .ts-wrap input:focus{border-color:#00c9a7;background:#0a1929;box-shadow:0 0 0 3px rgba(0,201,167,.1)}
        .ts-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#334155;font-size:14px;pointer-events:none}
        .topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px}

        /* ─── SETTINGS ROW ─── */
        .sr{background:#060b10;border-bottom:1px solid #0d1f2d;padding:7px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex-shrink:0}
        .sf{display:flex;flex-direction:column;gap:2px}
        .sf label{font-size:9px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.7px}
        .sf input,.sf select{background:#0d1f2d;border:1px solid #1e2d3d;border-radius:6px;padding:5px 9px;font-size:12px;color:#cbd5e1;outline:none;min-width:100px;transition:.15s}
        .sf input::placeholder{color:#334155}
        .sf input:focus,.sf select:focus{border-color:#00c9a7}
        .sf select option{background:#0d1f2d}

        /* ─── CONTENT ─── */
        .content{flex:1;display:flex;overflow:hidden}
        .main{flex:1;overflow-y:auto;display:flex;flex-direction:column}

        /* ─── TOOLBAR ─── */
        .toolbar{padding:10px 16px;border-bottom:1px solid #0d1f2d;display:flex;align-items:center;gap:10px;background:#060b10;flex-shrink:0}
        .rc{font-size:13px;font-weight:700;color:#f1f5f9}
        .rs{font-size:12px;color:#334155}

        /* ─── PEOPLE TABLE ─── */
        .tbl-wrap{flex:1;overflow:auto}
        table.pt{width:100%;border-collapse:collapse;min-width:820px}
        table.pt thead{position:sticky;top:0;z-index:10}
        table.pt th{background:#060b10;border-bottom:1px solid #0d1f2d;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap}
        table.pt td{padding:9px 14px;border-bottom:1px solid #0a1424;vertical-align:middle;transition:.1s}
        table.pt tr:hover td{background:#0a1929}
        table.pt tr.sel td{background:rgba(0,201,167,.06)}
        table.pt tr.act td{background:rgba(0,201,167,.08);border-left:2px solid #00c9a7}

        /* Avatar */
        .av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:#fff;flex-shrink:0}

        /* Name */
        .pname{font-weight:600;font-size:13px;color:#f1f5f9;white-space:nowrap}
        .pli{color:#334155;font-size:10px;font-weight:700;cursor:pointer;margin-left:4px;padding:1px 5px;border-radius:3px;background:#0d1f2d;border:1px solid #1e2d3d;text-decoration:none;transition:.1s}
        .pli:hover{border-color:#00c9a7;color:#00c9a7}
        .ptitle{color:#64748b;font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pco{color:#00c9a7;font-size:12px;font-weight:600;white-space:nowrap}

        /* Contact buttons — Apollo-style */
        .cbtn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;border:none;white-space:nowrap;transition:.12s;font-family:'DM Sans',sans-serif}
        .cb-locked{background:#0d1f2d;color:#334155;border:1px solid #1e2d3d}
        .cb-locked:hover{border-color:#f59e0b;color:#f59e0b}
        .cb-email{background:rgba(0,201,167,.1);color:#00c9a7;border:1px solid rgba(0,201,167,.2)}
        .cb-email:hover{background:rgba(0,201,167,.18)}
        .cb-gen{background:rgba(251,191,36,.08);color:#fbbf24;border:1px solid rgba(251,191,36,.18)}
        .cb-gen:hover{background:rgba(251,191,36,.15)}
        .cb-phone{background:#0d1f2d;color:#64748b;border:1px solid #1e2d3d}
        .cb-phone:hover{border-color:#38bdf8;color:#38bdf8}

        /* Status pill */
        .spill{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;font-size:10px;font-weight:700;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;white-space:nowrap;letter-spacing:.01em}

        /* ─── DETAIL PANEL ─── */
        .detail{width:400px;background:#060b10;border-left:1px solid #0d1f2d;overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column}
        .dp-head{padding:18px;border-bottom:1px solid #0d1f2d;display:flex;align-items:flex-start;gap:12px}
        .dp-av{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:#fff;flex-shrink:0}
        .dp-name{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#f1f5f9;margin-bottom:2px;letter-spacing:-.2px}
        .dp-role{font-size:12px;color:#64748b;margin-bottom:2px}
        .dp-co{font-size:12px;color:#00c9a7;font-weight:700}
        .dp-x{background:none;border:none;color:#334155;font-size:18px;cursor:pointer;margin-left:auto;flex-shrink:0;line-height:1}
        .dp-x:hover{color:#f1f5f9}

        .dp-sec{padding:13px 18px;border-bottom:1px solid #0d1f2d}
        .dp-sec-title{font-size:9px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}
        .dp-row{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px}
        .dp-icon{color:#334155;width:16px;text-align:center;font-size:13px;flex-shrink:0}
        .dp-val{flex:1;color:#94a3b8;word-break:break-all}
        .dp-val a{color:#00c9a7;text-decoration:none}
        .dp-val a:hover{text-decoration:underline}
        .dp-copy{font-size:10px;font-weight:700;color:#00c9a7;cursor:pointer;background:rgba(0,201,167,.1);border:none;border-radius:4px;padding:2px 8px;flex-shrink:0;transition:.1s}
        .dp-copy:hover{background:rgba(0,201,167,.2)}

        /* Email panel */
        .etabs{display:flex;border-bottom:1px solid #0d1f2d;flex-shrink:0}
        .etab{padding:11px 16px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:#334155;border-bottom:2px solid transparent;margin-bottom:-1px;transition:.15s;white-space:nowrap;letter-spacing:.01em}
        .etab.on{color:#00c9a7;border-bottom-color:#00c9a7}
        .etab:hover:not(.on){color:#64748b}

        .email-area{padding:16px 18px;flex:1;overflow-y:auto}
        .ebox{background:#0d1f2d;border:1px solid #1e2d3d;border-radius:8px;padding:13px;margin-bottom:10px;transition:.15s}
        .ebox:hover{border-color:#1e3a4d}
        .elabel{font-size:9px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.8px;margin-bottom:7px}
        .ebody{font-size:12px;line-height:1.75;color:#94a3b8;white-space:pre-wrap}
        .vbtn{padding:5px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid #1e2d3d;background:transparent;color:#64748b;transition:.12s;letter-spacing:.01em}
        .vbtn.on{border-color:#00c9a7;color:#00c9a7;background:rgba(0,201,167,.08)}

        /* Buttons */
        .btn{padding:8px 18px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:.15s;display:inline-flex;align-items:center;gap:6px;font-family:'DM Sans',sans-serif;letter-spacing:.01em}
        .btn:disabled{opacity:.4;cursor:not-allowed}
        .btn-teal{background:linear-gradient(135deg,#00c9a7,#00e5c0);color:#060b10;box-shadow:0 4px 14px rgba(0,201,167,.25)}
        .btn-teal:hover:not(:disabled){box-shadow:0 4px 20px rgba(0,201,167,.4);transform:translateY(-1px)}
        .btn-outline{background:transparent;color:#64748b;border:1px solid #1e2d3d}
        .btn-outline:hover:not(:disabled){border-color:#00c9a7;color:#00c9a7}
        .btn-amber{background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#060b10;box-shadow:0 4px 14px rgba(245,158,11,.25)}
        .btn-amber:hover:not(:disabled){box-shadow:0 4px 20px rgba(245,158,11,.4);transform:translateY(-1px)}
        .btn-sm{padding:5px 12px;font-size:11px;border-radius:6px}

        input[type=checkbox]{accent-color:#00c9a7;cursor:pointer}

        @keyframes sp{to{transform:rotate(360deg)}}
        .spin{width:13px;height:13px;border:2px solid rgba(0,201,167,.15);border-top-color:#00c9a7;border-radius:50%;animation:sp .7s linear infinite;display:inline-block;flex-shrink:0}
        .spin-lg{width:30px;height:30px;border-width:3px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .pulsing{animation:pulse 1.5s ease-in-out infinite}

        /* ─── PAYWALL ─── */
        .pw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px}
        .pw-modal{background:#080d14;border:1px solid #0d1f2d;border-radius:18px;max-width:440px;width:100%;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 0 1px rgba(0,201,167,.08);position:relative}
        .pw-head{background:linear-gradient(135deg,#060b10,#0a2420);padding:30px;text-align:center;border-bottom:1px solid rgba(0,201,167,.12)}
        .pw-glow{width:60px;height:60px;background:linear-gradient(135deg,#00c9a7,#00e5c0);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 16px;box-shadow:0 0 30px rgba(0,201,167,.4)}
        .pw-head h2{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#fff;margin-bottom:8px;letter-spacing:-.3px}
        .pw-head p{font-size:13px;color:#64748b;line-height:1.6;max-width:300px;margin:0 auto}
        .pw-body{padding:24px}
        .pw-price{text-align:center;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid #0d1f2d}
        .pw-amt{font-family:'Syne',sans-serif;font-size:44px;font-weight:800;color:#f1f5f9;line-height:1}
        .pw-per{font-size:13px;color:#64748b;margin-top:3px}
        .pw-disc{font-size:12px;color:#00c9a7;font-weight:700;margin-top:4px;letter-spacing:.01em}
        .pw-feats{display:flex;flex-direction:column;gap:9px;margin-bottom:20px}
        .pw-feat{display:flex;align-items:center;gap:9px;font-size:13px;color:#94a3b8}
        .pw-feat:before{content:'→';color:#00c9a7;font-weight:800;flex-shrink:0;font-size:14px}
        .pw-x{position:absolute;top:13px;right:15px;background:none;border:none;color:#334155;font-size:20px;cursor:pointer;line-height:1}
        .pw-x:hover{color:#f1f5f9}
        .pw-divider{text-align:center;color:#334155;font-size:11px;margin:12px 0;font-weight:600;letter-spacing:.5px}
        .code-wrap{display:flex;gap:8px}
        .code-in{flex:1;background:#0d1f2d;border:1px solid #1e2d3d;border-radius:7px;padding:9px 13px;font-size:13px;color:#e2e8f0;outline:none}
        .code-in::placeholder{color:#334155}
        .code-in:focus{border-color:#00c9a7}
        .err{font-size:11px;color:#f87171;margin-top:6px;font-weight:600}

        /* ─── EMPTY ─── */
        .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:60px 24px;text-align:center}
        .empty-icon{font-size:38px;margin-bottom:14px;opacity:.5}
        .empty h3{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#f1f5f9;margin-bottom:6px;letter-spacing:-.2px}
        .empty p{font-size:12px;color:#334155;line-height:1.7;max-width:280px}
        .qpills{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px;justify-content:center;max-width:400px}
        .qp{padding:5px 14px;border-radius:20px;border:1px solid #1e2d3d;background:#0d1f2d;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;transition:.12s}
        .qp:hover{border-color:#00c9a7;color:#00c9a7;background:rgba(0,201,167,.06)}

        /* Tracker */
        table.trkr{width:100%;border-collapse:collapse}
        table.trkr th{background:#060b10;border-bottom:1px solid #0d1f2d;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.6px}
        table.trkr td{padding:10px 14px;border-bottom:1px solid #0a1424;font-size:12px;vertical-align:middle}
        .n-in{width:100%;background:#0d1f2d;border:1px solid #1e2d3d;border-radius:5px;padding:5px 8px;font-size:11px;resize:none;outline:none;color:#94a3b8}
        .n-in::placeholder{color:#334155}
        .n-in:focus{border-color:#00c9a7}

        /* Status grid */
        .st-grid{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}

        /* Pro badge */
        .pro-badge{font-size:11px;font-weight:700;color:#00c9a7;padding:4px 12px;background:rgba(0,201,167,.1);border:1px solid rgba(0,201,167,.2);border-radius:20px}
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
              <span className="sb-item-icon">👥</span> People
            </div>
            <div className={`sb-item ${view==="tracker"?"on":""}`} onClick={() => setView("tracker")}>
              <span className="sb-item-icon">📋</span> Tracker
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
                                    : <button className="cbtn cb-gen" onClick={()=>openLead(lead)}>⚡ Generate</button>
                                }
                              </td>
                              <td onClick={e=>e.stopPropagation()}>
                                {!isSubscribed
                                  ? <button className="cbtn cb-locked" onClick={()=>setShowPaywall(true)}>🔒</button>
                                  : lead.phone
                                    ? <button className="cbtn cb-phone" onClick={()=>copy(lead.phone,"p_"+lead.id)}>📞 {copied==="p_"+lead.id?"Copied!":lead.phone}</button>
                                    : <span style={{color:"#1e2d3d",fontSize:12}}>—</span>
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
                  {activeLead.email
                    ? <div className="dp-row"><span className="dp-icon">✉</span><span className="dp-val">{activeLead.email}</span><button className="dp-copy" onClick={()=>copy(activeLead.email,"de")}>{copied==="de"?"✓ Copied":"Copy"}</button></div>
                    : <div className="dp-row"><span className="dp-icon">✉</span><span style={{color:"#334155",fontSize:11}}>Not in Apollo — generate outreach below</span></div>
                  }
                  {activeLead.phone && <div className="dp-row"><span className="dp-icon">📞</span><span className="dp-val">{activeLead.phone}</span><button className="dp-copy" onClick={()=>copy(activeLead.phone,"dp2")}>{copied==="dp2"?"✓ Copied":"Copy"}</button></div>}
                  {activeLead.linkedin && <div className="dp-row"><span className="dp-icon">💼</span><span className="dp-val"><a href={"https://"+activeLead.linkedin.replace(/^https?:\/\//,"")} target="_blank" rel="noreferrer">LinkedIn Profile ↗</a></span></div>}
                  {activeLead.location && <div className="dp-row"><span className="dp-icon">📍</span><span className="dp-val">{activeLead.location}</span></div>}
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
