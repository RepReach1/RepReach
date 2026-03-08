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
  { id: "none",    label: "Not Contacted", color: "#6b7280" },
  { id: "sent",    label: "Emailed",       color: "#3b82f6" },
  { id: "opened",  label: "Opened",        color: "#f59e0b" },
  { id: "replied", label: "Replied",       color: "#10b981" },
  { id: "meeting", label: "Meeting Set",   color: "#8b5cf6" },
  { id: "passed",  label: "Passed",        color: "#ef4444" },
];

const AV_COLORS = ["#00c9a7","#2563eb","#059669","#d97706","#dc2626","#0891b2","#00c9a7","#db2777"];

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

  const [companyInput,    setCompanyInput]    = useState("");
  const [titleSearch,     setTitleSearch]     = useState("");
  const [selectedTitles,  setSelectedTitles]  = useState([]);
  const [leads,           setLeads]           = useState([]);
  const [totalAvailable,  setTotalAvailable]  = useState(0);
  const [searching,       setSearching]       = useState(false);
  const [hasSearched,     setHasSearched]     = useState(false);
  const searchTimer = useRef(null);

  const [activeLead,   setActiveLead]   = useState(null);
  const [selected,     setSelected]     = useState(new Set());
  const [emails,       setEmails]       = useState({});
  const [linkedIns,    setLinkedIns]    = useState({});
  const [followUps,    setFollowUps]    = useState({});
  const [genEmail,     setGenEmail]     = useState(null);
  const [genLI,        setGenLI]        = useState(null);
  const [genFU,        setGenFU]        = useState(null);
  const [emailTab,     setEmailTab]     = useState("cold");
  const [variant,      setVariant]      = useState("a");
  const [copied,       setCopied]       = useState(null);
  const [statuses,     setStatuses]     = useState({});
  const [notes,        setNotes]        = useState({});
  const [view,         setView]         = useState("people");

  const runSearch = useCallback(async (company, titles) => {
    if (!company.trim() || company.trim().length < 2) {
      setLeads([]); setHasSearched(false); return;
    }
    setSearching(true);
    try {
      const { leads: r, total } = await apolloSearch(company, titles || null);
      setLeads(r);
      setTotalAvailable(total);
      setHasSearched(true);
      setActiveLead(null);
    } catch(e) { setLeads([]); setHasSearched(true); }
    setSearching(false);
  }, []);

  const handleCompanyInput = (val) => {
    setCompanyInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(val, selectedTitles.join(" ")), 500);
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
    if (!brandName) return alert("Enter your brand name in the top bar first.");
    setGenEmail(lead.id);
    try {
      const r = await generateText(
        `Write TWO cold email variants (A/B) from a CPG sales rep to a retail buyer.
Rep: ${repName||"Sales Rep"}. Brand: ${brandName}. Product: ${productDesc||brandName}.
Buyer: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.retailer}. Tone: ${emailTone}.
Max 120 words body each. Specific compelling subjects.
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
1) Connection note max 300 chars. 2) DM max 500 chars.
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
No "just checking in". Add new value. Max 80 words. Subject "Re:...".
ONLY JSON: {"subject":"...","body":"..."}`
      );
      setFollowUps(p => ({...p,[lead.id]:r}));
    } catch(e) { alert("Failed: "+e.message); }
    setGenFU(null);
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),1800); };
  const getStatus = (id) => STATUSES.find(s=>s.id===(statuses[id]||"none"))||STATUSES[0];
  const setStatus = (id, sid) => setStatuses(p=>({...p,[id]:sid}));

  const eData  = activeLead && emails[activeLead.id];
  const liData = activeLead && linkedIns[activeLead.id];
  const fuData = activeLead && followUps[activeLead.id];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%}
        body{font-family:'Inter',sans-serif;background:#0f1117;color:#e2e8f0;font-size:13px;overflow:hidden}
        input,select,textarea,button{font-family:'Inter',sans-serif;font-size:13px}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#374151;border-radius:3px}

        /* ── Outer shell ── */
        .shell{display:flex;height:100vh;overflow:hidden}

        /* ── LEFT SIDEBAR ── */
        .sidebar{width:228px;background:#111827;border-right:1px solid #1f2937;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
        .sb-logo{padding:14px 16px;border-bottom:1px solid #1f2937;display:flex;align-items:center;gap:8px}
        .sb-logo-mark{width:26px;height:26px;background:linear-gradient(135deg,#00c9a7,#00a880);border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0}
        .sb-logo-text{font-weight:700;font-size:15px;color:#f9fafb}
        .sb-logo-text span{color:#5eead4}
        .sb-nav{padding:10px 8px;border-bottom:1px solid #1f2937}
        .sb-nav-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:7px;font-size:12px;font-weight:500;color:#9ca3af;cursor:pointer;transition:.1s;margin-bottom:1px}
        .sb-nav-item:hover{background:#1f2937;color:#f9fafb}
        .sb-nav-item.active{background:#1f2937;color:#5eead4;font-weight:600}
        .sb-nav-icon{font-size:14px;width:18px;text-align:center;flex-shrink:0}
        .sb-section{border-bottom:1px solid #1f2937;padding:12px 12px}
        .sb-section-title{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
        .sb-section-clear{font-size:10px;color:#00c9a7;cursor:pointer;font-weight:600;background:none;border:none;color:#5eead4}
        .sb-input{width:100%;background:#1f2937;border:1px solid #374151;border-radius:6px;padding:6px 10px;font-size:12px;color:#e2e8f0;outline:none;margin-bottom:8px}
        .sb-input::placeholder{color:#6b7280}
        .sb-input:focus{border-color:#00c9a7}
        .sb-check-row{display:flex;align-items:center;gap:7px;padding:4px 6px;border-radius:5px;cursor:pointer;transition:.1s}
        .sb-check-row:hover{background:#1f2937}
        .sb-check-row label{font-size:12px;color:#d1d5db;cursor:pointer;flex:1;line-height:1.3}
        .sb-check-row input[type=checkbox]{width:14px;height:14px;accent-color:#00c9a7;cursor:pointer;flex-shrink:0}
        .sb-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#003d35;border-radius:4px;font-size:11px;color:#5eead4;margin:2px;cursor:pointer}
        .sb-tag-x{color:#2dd4bf;font-size:12px}

        /* ── RIGHT SIDE ── */
        .right{flex:1;display:flex;flex-direction:column;overflow:hidden;background:#0f1117}

        /* ── TOP BAR ── */
        .topbar{height:48px;background:#111827;border-bottom:1px solid #1f2937;display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0}
        .topbar-search{flex:1;max-width:380px;position:relative}
        .topbar-search input{width:100%;background:#1f2937;border:1px solid #374151;border-radius:7px;padding:7px 12px 7px 32px;font-size:13px;color:#e2e8f0;outline:none}
        .topbar-search input::placeholder{color:#6b7280}
        .topbar-search input:focus{border-color:#00c9a7;background:#1a2035}
        .ts-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#6b7280;font-size:13px}
        .topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px}

        /* ── SETTINGS ROW ── */
        .settings-row{background:#111827;border-bottom:1px solid #1f2937;padding:7px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex-shrink:0}
        .srf{display:flex;flex-direction:column;gap:2px}
        .srf label{font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
        .srf input,.srf select{background:#1f2937;border:1px solid #374151;border-radius:6px;padding:5px 9px;font-size:12px;color:#e2e8f0;outline:none;min-width:100px}
        .srf input::placeholder{color:#6b7280}
        .srf input:focus,.srf select:focus{border-color:#00c9a7}

        /* ── CONTENT AREA ── */
        .content-area{flex:1;display:flex;overflow:hidden}
        .main-area{flex:1;overflow-y:auto;display:flex;flex-direction:column}

        /* ── TOOLBAR ── */
        .toolbar{padding:10px 16px;border-bottom:1px solid #1f2937;display:flex;align-items:center;gap:10px;flex-shrink:0;background:#111827}
        .result-count{font-size:13px;font-weight:600;color:#f9fafb}
        .result-sub{font-size:12px;color:#6b7280}

        /* ── PEOPLE TABLE ── */
        .tbl-wrap{flex:1;overflow:auto}
        table.ptbl{width:100%;border-collapse:collapse;min-width:800px}
        table.ptbl thead{position:sticky;top:0;z-index:10}
        table.ptbl th{background:#111827;border-bottom:1px solid #1f2937;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
        table.ptbl td{padding:9px 14px;border-bottom:1px solid #1a2030;vertical-align:middle}
        table.ptbl tr:hover td{background:#131929}
        table.ptbl tr.row-sel td{background:#002e28}
        .av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:#fff;flex-shrink:0}
        .person-name{font-weight:600;font-size:13px;color:#f9fafb;white-space:nowrap}
        .person-li{color:#6b7280;font-size:11px;cursor:pointer;margin-left:4px}
        .person-li:hover{color:#5eead4}
        .person-title{color:#9ca3af;font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .person-co{color:#5eead4;font-size:12px;font-weight:500;white-space:nowrap}

        /* ── Email/Phone buttons (Apollo style) ── */
        .contact-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;border:none;white-space:nowrap;transition:.1s}
        .cb-email-locked{background:#1f2937;color:#6b7280;border:1px solid #374151}
        .cb-email-locked:hover{border-color:#f59e0b;color:#f59e0b}
        .cb-email-has{background:#064e3b;color:#34d399;border:1px solid #065f46}
        .cb-email-has:hover{background:#065f46}
        .cb-generate{background:#002e28;color:#5eead4;border:1px solid #003d35}
        .cb-generate:hover{background:#003d35;color:#99f6e4}
        .cb-phone{background:#1f2937;color:#9ca3af;border:1px solid #374151}
        .cb-phone:hover{border-color:#3b82f6;color:#60a5fa}

        /* Status */
        .spill{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;font-size:10px;font-weight:700;cursor:pointer;border:none;font-family:'Inter',sans-serif;white-space:nowrap}

        /* ── DETAIL PANEL ── */
        .detail{width:400px;background:#111827;border-left:1px solid #1f2937;overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column}
        .dp-head{padding:16px;border-bottom:1px solid #1f2937;display:flex;align-items:flex-start;gap:12px}
        .dp-av{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:#fff;flex-shrink:0}
        .dp-name{font-size:15px;font-weight:700;color:#f9fafb;margin-bottom:2px}
        .dp-role{font-size:12px;color:#9ca3af;margin-bottom:2px}
        .dp-co{font-size:12px;color:#5eead4;font-weight:600}
        .dp-close{background:none;border:none;color:#6b7280;font-size:18px;cursor:pointer;flex-shrink:0;margin-left:auto}
        .dp-close:hover{color:#f9fafb}
        .dp-sec{padding:12px 16px;border-bottom:1px solid #1f2937}
        .dp-sec-title{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px}
        .dp-row{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px}
        .dp-icon{color:#6b7280;width:16px;text-align:center;flex-shrink:0;font-size:13px}
        .dp-val{flex:1;color:#d1d5db;word-break:break-all}
        .dp-val a{color:#5eead4;text-decoration:none}
        .dp-val a:hover{text-decoration:underline}
        .dp-copy{font-size:10px;font-weight:700;color:#5eead4;cursor:pointer;background:#002e28;border:none;border-radius:4px;padding:2px 8px;flex-shrink:0}
        .dp-copy:hover{background:#003d35}

        /* ── Email tabs ── */
        .etabs{display:flex;border-bottom:1px solid #1f2937;flex-shrink:0}
        .etab{padding:10px 16px;font-size:12px;font-weight:500;cursor:pointer;border:none;background:transparent;color:#9ca3af;border-bottom:2px solid transparent;margin-bottom:-1px;transition:.1s;white-space:nowrap}
        .etab.on{color:#5eead4;border-bottom-color:#00c9a7;font-weight:600}
        .etab:hover:not(.on){color:#d1d5db}
        .email-area{padding:14px 16px;flex:1;overflow-y:auto}
        .ebox{background:#1f2937;border:1px solid #374151;border-radius:8px;padding:12px;margin-bottom:10px}
        .elabel{font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px}
        .ebody{font-size:12px;line-height:1.7;color:#d1d5db;white-space:pre-wrap}
        .vbtn{padding:4px 12px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid #374151;background:transparent;color:#9ca3af;transition:.1s}
        .vbtn.on{border-color:#00c9a7;color:#5eead4;background:#002e28}

        /* Status picker */
        .status-grid{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}

        /* ── Buttons ── */
        .btn{padding:7px 16px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:.1s;display:inline-flex;align-items:center;gap:5px;font-family:'Inter',sans-serif}
        .btn:disabled{opacity:.45;cursor:not-allowed}
        .btn-purple{background:#00c9a7;color:#fff}
        .btn-purple:hover:not(:disabled){background:#00b896}
        .btn-outline{background:transparent;color:#d1d5db;border:1px solid #374151}
        .btn-outline:hover:not(:disabled){border-color:#00c9a7;color:#5eead4}
        .btn-sm{padding:5px 11px;font-size:11px;border-radius:5px}
        .btn-gold{background:#d97706;color:#fff}
        .btn-gold:hover:not(:disabled){background:#b45309}
        .btn-green{background:#059669;color:#fff}
        .btn-green:hover:not(:disabled){background:#047857}

        /* Checkbox */
        input[type=checkbox]{accent-color:#00c9a7;cursor:pointer}

        /* ── Spinner ── */
        @keyframes sp{to{transform:rotate(360deg)}}
        .spin{width:13px;height:13px;border:2px solid rgba(167,139,250,.2);border-top-color:#5eead4;border-radius:50%;animation:sp .7s linear infinite;display:inline-block;flex-shrink:0}
        .spin-lg{width:28px;height:28px;border-width:3px}

        /* ── Paywall ── */
        .pw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px}
        .pw-modal{background:#111827;border:1px solid #374151;border-radius:16px;max-width:440px;width:100%;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);position:relative}
        .pw-head{background:linear-gradient(135deg,#00a880,#00c9a7);padding:28px;text-align:center;color:#fff}
        .pw-head h2{font-size:20px;font-weight:700;margin-bottom:6px}
        .pw-head p{font-size:13px;color:rgba(255,255,255,.7);line-height:1.5}
        .pw-body{padding:22px}
        .pw-price{text-align:center;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid #1f2937}
        .pw-amt{font-size:40px;font-weight:800;color:#f9fafb;line-height:1}
        .pw-per{font-size:13px;color:#9ca3af;margin-top:3px}
        .pw-disc{font-size:12px;color:#34d399;font-weight:600;margin-top:3px}
        .pw-feats{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
        .pw-feat{display:flex;align-items:center;gap:8px;font-size:12px;color:#d1d5db}
        .pw-feat:before{content:'✓';color:#34d399;font-weight:800;flex-shrink:0}
        .pw-close{position:absolute;top:12px;right:14px;background:none;border:none;color:rgba(255,255,255,.4);font-size:20px;cursor:pointer}
        .pw-divider{text-align:center;color:#6b7280;font-size:11px;margin:12px 0}
        .code-wrap{display:flex;gap:8px}
        .code-in{flex:1;background:#1f2937;border:1px solid #374151;border-radius:6px;padding:8px 12px;font-size:13px;color:#e2e8f0;outline:none}
        .code-in:focus{border-color:#00c9a7}
        .code-in::placeholder{color:#6b7280}
        .err{font-size:11px;color:#f87171;margin-top:6px;font-weight:500}

        /* ── Empty states ── */
        .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:60px 24px;text-align:center}
        .empty-icon{font-size:36px;margin-bottom:14px;opacity:.6}
        .empty h3{font-size:15px;color:#f9fafb;margin-bottom:6px;font-weight:600}
        .empty p{font-size:12px;color:#6b7280;line-height:1.6;max-width:280px}
        .quick-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px;justify-content:center;max-width:380px}
        .qpill{padding:5px 13px;border-radius:20px;border:1px solid #374151;background:#1f2937;cursor:pointer;font-size:12px;font-weight:500;color:#9ca3af;transition:.1s}
        .qpill:hover{border-color:#00c9a7;color:#5eead4;background:#002e28}

        /* Tracker */
        table.tracker-tbl{width:100%;border-collapse:collapse}
        table.tracker-tbl th{background:#111827;border-bottom:1px solid #1f2937;padding:9px 14px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
        table.tracker-tbl td{padding:10px 14px;border-bottom:1px solid #1a2030;font-size:12px;vertical-align:middle}
        .notes-in{width:100%;background:#1f2937;border:1px solid #374151;border-radius:5px;padding:5px 8px;font-size:11px;resize:none;outline:none;color:#d1d5db}
        .notes-in:focus{border-color:#00c9a7}
        .notes-in::placeholder{color:#6b7280}
      `}</style>

      {/* ── PAYWALL ── */}
      {showPaywall && (
        <div className="pw-overlay" onClick={() => setShowPaywall(false)}>
          <div className="pw-modal" onClick={e => e.stopPropagation()}>
            <div className="pw-head">
              <button className="pw-close" onClick={() => setShowPaywall(false)}>×</button>
              <div style={{fontSize:30,marginBottom:10}}>🚀</div>
              <h2>Unlock RepReach Pro</h2>
              <p>Full access to live Apollo buyer data and AI-generated outreach for every contact.</p>
            </div>
            <div className="pw-body">
              <div className="pw-price">
                <div className="pw-amt">$2,000</div>
                <div className="pw-per">per month</div>
                <div className="pw-disc">First month: $1,500 — save $500</div>
              </div>
              <div className="pw-feats">
                <div className="pw-feat">Live Apollo search — any retailer, unlimited</div>
                <div className="pw-feat">AI cold emails, LinkedIn & follow-ups</div>
                <div className="pw-feat">Direct email + phone on every contact</div>
                <div className="pw-feat">Outreach tracker with status & notes</div>
                <div className="pw-feat">Up to 500 contacts per search</div>
              </div>
              <a href={PAYMENT_LINK} target="_blank" rel="noreferrer"
                style={{display:"block",width:"100%",padding:"12px",borderRadius:8,background:"#00c9a7",color:"#fff",fontWeight:700,fontSize:14,textAlign:"center",textDecoration:"none",marginBottom:4}}>
                Subscribe — $1,500 First Month →
              </a>
              <div className="pw-divider">— or enter access code —</div>
              <div className="code-wrap">
                <input className="code-in" placeholder="Access code" value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter"){ accessCode.trim()===ACCESS_CODE ? (setIsSubscribed(true),setShowPaywall(false),setCodeError("")) : setCodeError("Invalid code."); }}} />
                <button className="btn btn-purple" onClick={() => {
                  accessCode.trim()===ACCESS_CODE ? (setIsSubscribed(true),setShowPaywall(false),setCodeError("")) : setCodeError("Invalid code.");
                }}>Apply</button>
              </div>
              {codeError && <div className="err">{codeError}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="shell">
        {/* ══ LEFT SIDEBAR ══ */}
        <div className="sidebar">
          {/* Logo */}
          <div className="sb-logo">
            <div className="sb-logo-mark">R</div>
            <div className="sb-logo-text">Rep<span>Reach</span></div>
          </div>

          {/* Nav */}
          <div className="sb-nav">
            <div className={`sb-nav-item ${view==="people"?"active":""}`} onClick={() => setView("people")}>
              <span className="sb-nav-icon">👥</span> People
            </div>
            <div className={`sb-nav-item ${view==="tracker"?"active":""}`} onClick={() => setView("tracker")}>
              <span className="sb-nav-icon">📋</span> Outreach Tracker
            </div>
          </div>

          {/* Company filter */}
          <div className="sb-section">
            <div className="sb-section-title">Company</div>
            <input className="sb-input" placeholder="Search company name..."
              value={companyInput} onChange={e => handleCompanyInput(e.target.value)} />
            {!companyInput && (
              <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:2}}>
                {QUICK_COMPANIES.map(c => (
                  <span key={c} className="sb-tag" onClick={() => handleCompanyInput(c)} style={{fontSize:11}}>{c}</span>
                ))}
              </div>
            )}
            {companyInput && (
              <span className="sb-tag" style={{fontSize:11,cursor:"default"}}>
                {companyInput}
                <span className="sb-tag-x" onClick={() => { setCompanyInput(""); setLeads([]); setHasSearched(false); }} style={{cursor:"pointer"}}>×</span>
              </span>
            )}
          </div>

          {/* Job title filter */}
          <div className="sb-section">
            <div className="sb-section-title">
              Job Title
              {selectedTitles.length > 0 && (
                <button className="sb-section-clear" onClick={() => { setSelectedTitles([]); if(companyInput) runSearch(companyInput, null); }}>Clear</button>
              )}
            </div>
            <input className="sb-input" placeholder="Search titles..."
              value={titleSearch} onChange={e => setTitleSearch(e.target.value)} />
            <div style={{maxHeight:200,overflowY:"auto"}}>
              {TITLE_OPTIONS.filter(t => t.toLowerCase().includes(titleSearch.toLowerCase())).map(t => (
                <div key={t} className="sb-check-row">
                  <input type="checkbox" checked={selectedTitles.includes(t)} onChange={() => toggleTitle(t)} />
                  <label onClick={() => toggleTitle(t)}>{t}</label>
                </div>
              ))}
            </div>
            {selectedTitles.length > 0 && (
              <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:3}}>
                {selectedTitles.map(t => (
                  <span key={t} className="sb-tag" onClick={() => toggleTitle(t)}>
                    {t} <span className="sb-tag-x">×</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT SIDE ══ */}
        <div className="right">
          {/* Top bar */}
          <div className="topbar">
            <div className="topbar-search">
              <span className="ts-icon">🔍</span>
              <input autoFocus value={companyInput}
                onChange={e => handleCompanyInput(e.target.value)}
                placeholder="Search any retailer or company..." />
            </div>
            <div className="topbar-right">
              {isSubscribed
                ? <span style={{fontSize:11,fontWeight:700,color:"#34d399",padding:"4px 12px",background:"#064e3b",borderRadius:20}}>✓ Pro Active</span>
                : <button className="btn btn-gold btn-sm" onClick={() => setShowPaywall(true)}>⚡ Upgrade to Pro</button>
              }
            </div>
          </div>

          {/* Settings row */}
          <div className="settings-row">
            <div className="srf"><label>Your Name</label><input placeholder="Jamie" value={repName} onChange={e=>setRepName(e.target.value)} style={{width:100}} /></div>
            <div className="srf"><label>Brand *</label><input placeholder="NutriBlend" value={brandName} onChange={e=>setBrandName(e.target.value)} style={{width:120}} /></div>
            <div className="srf"><label>Product</label><input placeholder="e.g. Protein bars" value={productDesc} onChange={e=>setProductDesc(e.target.value)} style={{width:140}} /></div>
            <div className="srf"><label>Tone</label>
              <select value={emailTone} onChange={e=>setEmailTone(e.target.value)} style={{width:130}}>
                <option value="professional">Professional</option>
                <option value="casual">Casual & Friendly</option>
                <option value="bold">Bold & Direct</option>
                <option value="data-driven">Data-Driven</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="content-area">
            <div className="main-area">

              {view === "people" ? (
                <>
                  {/* Toolbar */}
                  <div className="toolbar">
                    {searching ? (
                      <><span className="spin"/><span style={{color:"#9ca3af",marginLeft:6}}>Searching Apollo database...</span></>
                    ) : hasSearched ? (
                      <>
                        <span className="result-count">{leads.length.toLocaleString()} people</span>
                        {totalAvailable > leads.length && (
                          <span className="result-sub" style={{marginLeft:6}}>of {totalAvailable.toLocaleString()} in Apollo</span>
                        )}
                        {selected.size > 0 && (
                          <span style={{marginLeft:12,color:"#5eead4",fontWeight:600,fontSize:12}}>{selected.size} selected</span>
                        )}
                      </>
                    ) : (
                      <span style={{color:"#6b7280"}}>Search a company to find buyers</span>
                    )}
                  </div>

                  {/* Table or empty state */}
                  {!hasSearched && !searching ? (
                    <div className="empty">
                      <div className="empty-icon">🔍</div>
                      <h3>Find retail buyers</h3>
                      <p>Search any retailer in the sidebar or search bar to find buyers, merchants, and category managers.</p>
                      <div className="quick-pills">
                        {QUICK_COMPANIES.map(c => (
                          <button key={c} className="qpill" onClick={() => handleCompanyInput(c)}>{c}</button>
                        ))}
                      </div>
                    </div>
                  ) : searching ? (
                    <div className="empty">
                      <span className="spin-lg spin" style={{marginBottom:16}}/>
                      <h3>Searching Apollo...</h3>
                      <p>Finding buyers at {companyInput}</p>
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">😕</div>
                      <h3>No contacts found</h3>
                      <p>Try the parent company name or remove job title filters.</p>
                    </div>
                  ) : (
                    <div className="tbl-wrap">
                      <table className="ptbl">
                        <thead>
                          <tr>
                            <th style={{width:36,paddingLeft:16}}>
                              <input type="checkbox"
                                checked={selected.size===leads.length&&leads.length>0}
                                onChange={() => setSelected(selected.size===leads.length ? new Set() : new Set(leads.map(l=>l.id)))} />
                            </th>
                            <th style={{width:40}}></th>
                            <th>Name</th>
                            <th>Title</th>
                            <th>Company</th>
                            <th>Location</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leads.map((lead, i) => {
                            const color = AV_COLORS[i % AV_COLORS.length];
                            const st    = getStatus(lead.id);
                            const isSel = selected.has(lead.id);
                            const isActive = activeLead?.id === lead.id;
                            return (
                              <tr key={lead.id} className={isSel?"row-sel":""} style={isActive?{background:"#002e28"}:{}}
                                onClick={() => openLead(lead)}>
                                <td style={{paddingLeft:16}} onClick={e=>e.stopPropagation()}>
                                  <input type="checkbox" checked={isSel}
                                    onChange={e => { e.stopPropagation(); setSelected(prev => { const n=new Set(prev); n.has(lead.id)?n.delete(lead.id):n.add(lead.id); return n; }); }} />
                                </td>
                                <td>
                                  <div className="av" style={{background:color}}>{(lead.firstName?.[0]||"")+(lead.lastName?.[0]||"")}</div>
                                </td>
                                <td>
                                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                                    <span className="person-name">{lead.firstName} {lead.lastName}</span>
                                    {lead.linkedin && <a href={"https://"+lead.linkedin.replace(/^https?:\/\//,"")} target="_blank" rel="noreferrer" className="person-li" onClick={e=>e.stopPropagation()}>in</a>}
                                  </div>
                                </td>
                                <td><span className="person-title">{lead.title}</span></td>
                                <td><span className="person-co">{lead.retailer}</span></td>
                                <td style={{color:"#9ca3af",fontSize:12}}>{lead.location||"—"}</td>
                                <td onClick={e=>e.stopPropagation()}>
                                  {!isSubscribed ? (
                                    <button className="contact-btn cb-email-locked" onClick={() => setShowPaywall(true)}>🔒 Unlock</button>
                                  ) : lead.email ? (
                                    <button className="contact-btn cb-email-has" onClick={() => { copy(lead.email,"email_"+lead.id); }}>
                                      ✉ {copied==="email_"+lead.id ? "Copied!" : lead.email.length > 22 ? lead.email.slice(0,22)+"…" : lead.email}
                                    </button>
                                  ) : (
                                    <button className="contact-btn cb-generate" onClick={() => openLead(lead)}>✨ Get Email</button>
                                  )}
                                </td>
                                <td onClick={e=>e.stopPropagation()}>
                                  {!isSubscribed ? (
                                    <button className="contact-btn cb-phone" onClick={() => setShowPaywall(true)}>🔒</button>
                                  ) : lead.phone ? (
                                    <button className="contact-btn cb-phone" onClick={() => copy(lead.phone,"ph_"+lead.id)}>
                                      📞 {copied==="ph_"+lead.id ? "Copied!" : lead.phone}
                                    </button>
                                  ) : (
                                    <span style={{color:"#4b5563",fontSize:12}}>—</span>
                                  )}
                                </td>
                                <td onClick={e=>e.stopPropagation()}>
                                  <button className="spill" style={{background:st.color+"25",color:st.color}}
                                    onClick={() => { const idx=STATUSES.findIndex(s=>s.id===(statuses[lead.id]||"none")); setStatuses(p=>({...p,[lead.id]:STATUSES[(idx+1)%STATUSES.length].id})); }}>
                                    ● {st.label}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                /* ── TRACKER ── */
                <div style={{padding:"16px 20px",overflow:"auto",flex:1}}>
                  <div style={{marginBottom:14}}>
                    <div style={{fontWeight:700,fontSize:15,color:"#f9fafb",marginBottom:3}}>Outreach Tracker</div>
                    <div style={{fontSize:12,color:"#9ca3af"}}>{leads.length} contacts · {companyInput}</div>
                  </div>
                  {leads.length === 0 ? (
                    <div className="empty"><div className="empty-icon">📋</div><h3>No contacts yet</h3><p>Search a retailer in People view first.</p></div>
                  ) : (
                    <table className="tracker-tbl">
                      <thead><tr><th>Name</th><th>Title</th><th>Company</th><th>Status</th><th>Notes</th><th></th></tr></thead>
                      <tbody>
                        {leads.map(lead => {
                          const st = getStatus(lead.id);
                          return (
                            <tr key={lead.id}>
                              <td style={{color:"#f9fafb",fontWeight:500}}>{lead.firstName} {lead.lastName}</td>
                              <td style={{color:"#9ca3af",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.title}</td>
                              <td style={{color:"#5eead4",fontWeight:500}}>{lead.retailer}</td>
                              <td>
                                <button className="spill" style={{background:st.color+"25",color:st.color}}
                                  onClick={() => { const idx=STATUSES.findIndex(s=>s.id===(statuses[lead.id]||"none")); setStatuses(p=>({...p,[lead.id]:STATUSES[(idx+1)%STATUSES.length].id})); }}>
                                  ● {st.label}
                                </button>
                              </td>
                              <td><textarea className="notes-in" rows={2} placeholder="Add notes..." value={notes[lead.id]||""} onChange={e=>setNotes(p=>({...p,[lead.id]:e.target.value}))} /></td>
                              <td><button className="btn btn-purple btn-sm" onClick={() => { setView("people"); openLead(lead); }}>✨ Email</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* ══ DETAIL / EMAIL PANEL ══ */}
            {activeLead && (
              <div className="detail">
                <div className="dp-head">
                  {(() => { const i=leads.findIndex(l=>l.id===activeLead.id); return (
                    <div className="dp-av" style={{background:AV_COLORS[i%AV_COLORS.length]}}>{(activeLead.firstName?.[0]||"")+(activeLead.lastName?.[0]||"")}</div>
                  ); })()}
                  <div style={{flex:1,minWidth:0}}>
                    <div className="dp-name">{activeLead.firstName} {activeLead.lastName}</div>
                    <div className="dp-role">{activeLead.title}</div>
                    <div className="dp-co">{activeLead.retailer}</div>
                  </div>
                  <button className="dp-close" onClick={() => setActiveLead(null)}>×</button>
                </div>

                <div className="dp-sec">
                  <div className="dp-sec-title">Contact</div>
                  {activeLead.email
                    ? <div className="dp-row"><span className="dp-icon">✉</span><span className="dp-val">{activeLead.email}</span><button className="dp-copy" onClick={()=>copy(activeLead.email,"dpe")}>{copied==="dpe"?"✓":"Copy"}</button></div>
                    : <div className="dp-row"><span className="dp-icon">✉</span><span style={{color:"#6b7280",fontSize:11}}>Not in Apollo — generate outreach below</span></div>
                  }
                  {activeLead.phone && <div className="dp-row"><span className="dp-icon">📞</span><span className="dp-val">{activeLead.phone}</span><button className="dp-copy" onClick={()=>copy(activeLead.phone,"dpp")}>{copied==="dpp"?"✓":"Copy"}</button></div>}
                  {activeLead.linkedin && <div className="dp-row"><span className="dp-icon">💼</span><span className="dp-val"><a href={"https://"+activeLead.linkedin.replace(/^https?:\/\//,"")} target="_blank" rel="noreferrer">LinkedIn ↗</a></span></div>}
                  {activeLead.location && <div className="dp-row"><span className="dp-icon">📍</span><span className="dp-val">{activeLead.location}</span></div>}
                </div>

                <div className="dp-sec">
                  <div className="dp-sec-title">Outreach Status</div>
                  <div className="status-grid">
                    {STATUSES.filter(s=>s.id!=="none").map(s => (
                      <button key={s.id} className="spill"
                        style={{background:(statuses[activeLead.id]||"none")===s.id?s.color+"35":s.color+"15",color:s.color,border:(statuses[activeLead.id]||"none")===s.id?`1.5px solid ${s.color}`:"1.5px solid transparent"}}
                        onClick={()=>setStatus(activeLead.id,s.id)}>{s.label}</button>
                    ))}
                  </div>
                  <textarea className="notes-in" rows={2} placeholder="Notes..." value={notes[activeLead.id]||""} onChange={e=>setNotes(p=>({...p,[activeLead.id]:e.target.value}))} />
                </div>

                <div className="etabs">
                  <button className={`etab ${emailTab==="cold"?"on":""}`} onClick={()=>setEmailTab("cold")}>Cold Email</button>
                  <button className={`etab ${emailTab==="linkedin"?"on":""}`} onClick={()=>setEmailTab("linkedin")}>LinkedIn</button>
                  <button className={`etab ${emailTab==="followup"?"on":""}`} onClick={()=>setEmailTab("followup")}>Follow-up</button>
                </div>

                <div className="email-area">
                  {emailTab==="cold" && (!eData ? (
                    <button className="btn btn-purple" style={{width:"100%",justifyContent:"center"}} disabled={!!genEmail} onClick={()=>genEmail_(activeLead)}>
                      {genEmail===activeLead.id?<><span className="spin"/>Generating...</>:"✨ Generate Cold Emails (A/B)"}
                    </button>
                  ) : (
                    <>
                      <div style={{display:"flex",gap:5,marginBottom:10,alignItems:"center"}}>
                        <button className={`vbtn ${variant==="a"?"on":""}`} onClick={()=>setVariant("a")}>Version A</button>
                        <button className={`vbtn ${variant==="b"?"on":""}`} onClick={()=>setVariant("b")}>Version B</button>
                        <button className="btn btn-outline btn-sm" style={{marginLeft:"auto"}} disabled={!!genEmail} onClick={()=>genEmail_(activeLead)}>↺ Redo</button>
                      </div>
                      <div className="ebox"><div className="elabel">Subject</div><div className="ebody" style={{fontWeight:600,color:"#f9fafb"}}>{eData[variant]?.subject}</div></div>
                      <div className="ebox"><div className="elabel">Body</div><div className="ebody">{eData[variant]?.body}</div></div>
                      <button className="btn btn-outline btn-sm" onClick={()=>copy(`Subject: ${eData[variant]?.subject}\n\n${eData[variant]?.body}`,"ec")}>{copied==="ec"?"✓ Copied!":"Copy Email"}</button>
                    </>
                  ))}

                  {emailTab==="linkedin" && (!liData ? (
                    <button className="btn btn-purple" style={{width:"100%",justifyContent:"center"}} disabled={!!genLI} onClick={()=>genLI_(activeLead)}>
                      {genLI===activeLead.id?<><span className="spin"/>Generating...</>:"💼 Generate LinkedIn Messages"}
                    </button>
                  ) : (
                    <>
                      <div className="ebox"><div className="elabel">Connection Request</div><div className="ebody" style={{fontSize:11}}>{liData.connection}</div></div>
                      <div className="ebox"><div className="elabel">Direct Message</div><div className="ebody">{liData.dm}</div></div>
                      <div style={{display:"flex",gap:7}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>copy(liData.connection,"lc")}>{copied==="lc"?"✓":"Copy Note"}</button>
                        <button className="btn btn-outline btn-sm" onClick={()=>copy(liData.dm,"ldm")}>{copied==="ldm"?"✓":"Copy DM"}</button>
                      </div>
                    </>
                  ))}

                  {emailTab==="followup" && (!fuData ? (
                    <button className="btn btn-purple" style={{width:"100%",justifyContent:"center"}} disabled={!!genFU} onClick={()=>genFU_(activeLead)}>
                      {genFU===activeLead.id?<><span className="spin"/>Generating...</>:"↩ Generate Follow-up"}
                    </button>
                  ) : (
                    <>
                      <div className="ebox"><div className="elabel">Subject</div><div className="ebody" style={{fontWeight:600,color:"#f9fafb"}}>{fuData.subject}</div></div>
                      <div className="ebox"><div className="elabel">Body</div><div className="ebody">{fuData.body}</div></div>
                      <button className="btn btn-outline btn-sm" onClick={()=>copy(`Subject: ${fuData.subject}\n\n${fuData.body}`,"fc")}>{copied==="fc"?"✓ Copied!":"Copy"}</button>
                    </>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
