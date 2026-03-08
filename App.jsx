import { useState, useCallback, useRef } from "react";

const PAYMENT_LINK = "https://buy.stripe.com/8x200j5GZaO9aYZb7A2Ji00";
const ACCESS_CODE  = "Championsucks";

// ─── API helpers ───────────────────────────────────────────────────────────
async function apolloSearch(retailer, titleKeyword) {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ retailer, titleKeyword: titleKeyword || null }),
  });
  const d = await res.json();
  return d.leads || [];
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
  const raw = d.result || "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Bad response format");
  return JSON.parse(match[0]);
}

// ─── Status config ─────────────────────────────────────────────────────────
const STATUSES = [
  { id: "none",    label: "Not Contacted", color: "#8b95a8" },
  { id: "sent",    label: "Emailed",       color: "#3a7bd5" },
  { id: "opened",  label: "Opened",        color: "#f7931e" },
  { id: "replied", label: "Replied",       color: "#00c9a7" },
  { id: "meeting", label: "Meeting Set",   color: "#c9a84c" },
  { id: "passed",  label: "Passed",        color: "#e63946" },
];

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  // Auth
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall,  setShowPaywall]  = useState(false);
  const [accessCode,   setAccessCode]   = useState("");
  const [codeError,    setCodeError]    = useState("");

  // Brand
  const [repName,      setRepName]      = useState("");
  const [brandName,    setBrandName]    = useState("");
  const [productDesc,  setProductDesc]  = useState("");
  const [emailTone,    setEmailTone]    = useState("professional");

  // Search
  const [searchInput,  setSearchInput]  = useState("");
  const [leads,        setLeads]        = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [searched,     setSearched]     = useState(false);
  const timerRef = useRef(null);

  // Selected lead & generated content
  const [activeLead,   setActiveLead]   = useState(null);
  const [emails,       setEmails]       = useState({});
  const [linkedIns,    setLinkedIns]    = useState({});
  const [followUps,    setFollowUps]    = useState({});

  // Generation loading states
  const [genEmail,  setGenEmail]  = useState(null);
  const [genLI,     setGenLI]     = useState(null);
  const [genFU,     setGenFU]     = useState(null);

  // UI
  const [emailTab,  setEmailTab]  = useState("cold"); // cold | linkedin | followup
  const [variant,   setVariant]   = useState("a");
  const [copied,    setCopied]    = useState(null);
  const [screen,    setScreen]    = useState("home"); // home | emails | tracker

  // Outreach tracking
  const [statuses,  setStatuses]  = useState({});
  const [notes,     setNotes]     = useState({});

  // ── Parse search input into company + title keyword ──
  const parseQuery = (q) => {
    const BUYER_WORDS = ["buyer","merchant","manager","director","vp","head","chief","purchasing","procurement","sourcing","category","merchandise","divisional","dmm"];
    const words = q.trim().split(" ");
    const company = [];
    const title   = [];
    let hitTitle  = false;
    for (const w of words) {
      if (!hitTitle && BUYER_WORDS.some(t => w.toLowerCase().includes(t))) hitTitle = true;
      hitTitle ? title.push(w) : company.push(w);
    }
    return { company: company.join(" ") || q.trim(), titleKw: title.join(" ") || null };
  };

  // ── Live search (debounced 400ms) ──
  const runSearch = useCallback(async (q) => {
    if (!q.trim() || q.trim().length < 2) { setLeads([]); setSearched(false); return; }
    setSearching(true);
    const { company, titleKw } = parseQuery(q);
    try {
      const results = await apolloSearch(company, titleKw);
      setLeads(results);
      setSearched(true);
      if (results.length > 0) setActiveLead(results[0]);
    } catch(e) { setLeads([]); setSearched(true); }
    setSearching(false);
  }, []);

  const handleInput = (val) => {
    setSearchInput(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(val), 400);
  };

  // ── Select lead ──
  const selectLead = (lead) => {
    if (!isSubscribed) { setShowPaywall(true); return; }
    setActiveLead(lead);
    setScreen("emails");
  };

  // ── Generate cold email ──
  const genEmail_ = async (lead) => {
    if (!brandName) return alert("Add your brand name in the top settings bar first.");
    setGenEmail(lead.id);
    try {
      const r = await generateText(
        `Write TWO cold email variants (A and B) from a CPG sales rep to a retail buyer.
Rep: ${repName || "Sales Rep"}. Brand: ${brandName}. Product: ${productDesc || brandName}.
Buyer: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.retailer}.
Tone: ${emailTone}. Each email max 120 words. Subject lines must be specific, not generic.
Reply ONLY with JSON (no markdown): {"a":{"subject":"...","body":"..."},"b":{"subject":"...","body":"..."}}`
      );
      setEmails(p => ({ ...p, [lead.id]: r }));
    } catch(e) { alert("Failed: " + e.message); }
    setGenEmail(null);
  };

  // ── Generate LinkedIn ──
  const genLI_ = async (lead) => {
    setGenLI(lead.id);
    try {
      const r = await generateText(
        `Write LinkedIn outreach for a CPG sales rep to a retail buyer.
Rep: ${repName || "Sales Rep"}. Brand: ${brandName || "our brand"}.
Buyer: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.retailer}.
Write: 1) connection request (max 300 chars), 2) DM after connecting (max 500 chars).
Reply ONLY with JSON: {"connection":"...","dm":"..."}`
      );
      setLinkedIns(p => ({ ...p, [lead.id]: r }));
    } catch(e) { alert("Failed: " + e.message); }
    setGenLI(null);
  };

  // ── Generate follow-up ──
  const genFU_ = async (lead) => {
    setGenFU(lead.id);
    const prior = emails[lead.id]?.a?.subject || "";
    try {
      const r = await generateText(
        `Write a follow-up email for a sales rep who got no reply.
Rep: ${repName || "Sales Rep"}. Brand: ${brandName || "our brand"}.
Prior subject: "${prior}". Buyer: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.retailer}.
Rules: No "just checking in". Add new value. Max 80 words. Subject starts with "Re:".
Reply ONLY with JSON: {"subject":"...","body":"..."}`
      );
      setFollowUps(p => ({ ...p, [lead.id]: r }));
    } catch(e) { alert("Failed: " + e.message); }
    setGenFU(null);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  const getStatus = (id) => STATUSES.find(s => s.id === (statuses[id] || "none")) || STATUSES[0];
  const cycleStatus = (id) => {
    const cur = STATUSES.findIndex(s => s.id === (statuses[id] || "none"));
    setStatuses(p => ({ ...p, [id]: STATUSES[(cur + 1) % STATUSES.length].id }));
  };

  const QUICK = ["Walmart","Sam's Club","Kroger","Target","Costco","Home Depot","CVS","Tractor Supply","Amazon","Lowe's","Publix","Walgreens"];

  const eData  = activeLead && emails[activeLead.id];
  const liData = activeLead && linkedIns[activeLead.id];
  const fuData = activeLead && followUps[activeLead.id];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{--teal:#00c9a7;--teal2:#00b896;--gold:#c9a84c;--text:#1a2035;--muted:#6b7a99;--border:#e8ecf4;--bg:#f5f7fc;--white:#fff;--red:#e63946;--blue:#3a7bd5}
        body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:"#1a2035"}
        input,select,textarea,button{font-family:inherit}
        /* Nav */
        .nav{background:var(--text);padding:0 24px;height:56px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:200;box-shadow:0 2px 12px rgba(0,0,0,.2)}
        .logo{font-size:19px;font-weight:800;color:#fff;margin-right:auto}
        .logo em{font-style:italic;color:"#00c9a7"}
        .nb{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:.15s;font-family:inherit}
        .nb-ghost{background:rgba(255,255,255,.08);color:#fff;border:1.5px solid rgba(255,255,255,.15)}
        .nb-ghost:hover{background:rgba(255,255,255,.16)}
        .nb-gold{background:"#c9a84c";color:#fff}
        .nb-gold:hover{filter:brightness(1.1)}
        .nb-teal{background:"#00c9a7";color:#fff}
        /* Layout */
        .page{max-width:1280px;margin:0 auto;padding:24px}
        /* Hero */
        .hero{background:linear-gradient(135deg,#1a2035 0%,#0a3028 100%);padding:56px 24px 48px;text-align:center;position:relative;overflow:hidden}
        .hero:before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(0,201,167,.15),transparent 65%);pointer-events:none}
        .eyebrow{font-size:11px;font-weight:700;letter-spacing:3px;color:"#00c9a7";margin-bottom:14px;text-transform:uppercase}
        .hero h1{font-size:clamp(30px,5vw,52px);font-weight:800;color:#fff;line-height:1.1;margin-bottom:14px}
        .hero h1 em{font-style:italic;color:"#00c9a7"}
        .hero p{color:rgba(255,255,255,.6);font-size:16px;max-width:520px;margin:0 auto 32px;line-height:1.6}
        /* Search */
        .search-wrap{max-width:660px;margin:0 auto}
        .search-box{display:flex;align-items:center;background:#fff;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.22);border:2.5px solid transparent;transition:border-color .2s}
        .search-box:focus-within{border-color:"#00c9a7"}
        .s-icon{padding:0 16px;font-size:19px;color:#aab;flex-shrink:0}
        .s-input{flex:1;border:none;outline:none;font-size:16px;padding:17px 0;background:transparent;color:"#1a2035"}
        .s-input::placeholder{color:#bbc}
        .s-status{padding:0 16px;font-size:12px;color:"#6b7a99";white-space:nowrap;flex-shrink:0;font-weight:600}
        .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;justify-content:center}
        .chip{padding:6px 15px;border-radius:20px;border:1.5px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:.15s;font-family:inherit}
        .chip:hover{background:rgba(255,255,255,.16);border-color:"#00c9a7"}
        /* Results grid */
        .results-wrap{display:grid;grid-template-columns:300px 1fr;gap:18px;align-items:start}
        @media(max-width:768px){.results-wrap{grid-template-columns:1fr}}
        /* Lead list */
        .lead-list{display:flex;flex-direction:column;gap:7px;max-height:calc(100vh - 160px);overflow-y:auto}
        .lead-card{background:#fff;border:1.5px solid var(--border);border-radius:11px;padding:13px 14px;cursor:pointer;transition:.15s;display:flex;align-items:flex-start;gap:11px}
        .lead-card:hover{border-color:"#00c9a7";box-shadow:0 2px 10px rgba(0,201,167,.1)}
        .lead-card.sel{border-color:"#00c9a7";background:#f0fdfb}
        .av{width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,var(--teal),#00a880);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;flex-shrink:0}
        .ln{font-weight:700;font-size:13px;line-height:1.25}
        .lt{font-size:11px;color:"#6b7a99";margin-top:2px;line-height:1.3}
        .lc{font-size:11px;color:"#00b896";font-weight:700;margin-top:2px}
        /* Detail panel */
        .panel{background:#fff;border:1.5px solid var(--border);border-radius:14px;overflow:hidden;position:sticky;top:72px}
        .panel-head{background:linear-gradient(135deg,var(--text),#0a3028);padding:22px;color:#fff}
        .pname{font-size:19px;font-weight:800;margin-bottom:3px}
        .prole{font-size:12px;color:rgba(255,255,255,.65);margin-bottom:2px}
        .pco{font-size:12px;color:"#00c9a7";font-weight:700}
        .panel-body{padding:18px}
        /* Contact rows */
        .crow{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px}
        .crow:last-child{border-bottom:none}
        .cicon{width:18px;text-align:center;flex-shrink:0;font-size:14px}
        .cval{flex:1;word-break:break-all}
        .cval a{color:"#3a7bd5";text-decoration:none}
        .cbtn{font-size:11px;font-weight:700;color:"#00b896";cursor:pointer;background:rgba(0,201,167,.08);border:none;border-radius:6px;padding:3px 9px;flex-shrink:0}
        .cbtn:hover{background:rgba(0,201,167,.18)}
        /* Tabs */
        .tabs{display:flex;background:#f0f4ff;border-radius:10px;padding:3px;gap:2px;margin-bottom:16px}
        .tab{flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:transparent;color:"#6b7a99";transition:.15s;text-align:center}
        .tab.on{background:#fff;color:"#1a2035";box-shadow:0 1px 4px rgba(0,0,0,.1)}
        /* Variant toggle */
        .vtoggle{display:flex;gap:6px;margin-bottom:12px}
        .vbtn{padding:5px 14px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid var(--border);background:transparent;color:"#6b7a99";transition:.15s}
        .vbtn.on{border-color:"#00c9a7";color:"#00b896";background:rgba(0,201,167,.07)}
        /* Email output */
        .ebox{background:#f8faff;border:1.5px solid var(--border);border-radius:10px;padding:15px;margin-bottom:10px}
        .elabel{font-size:11px;font-weight:700;color:"#6b7a99";text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px}
        .ebody{font-size:14px;line-height:1.75;color:"#1a2035";white-space:pre-wrap}
        /* Buttons */
        .btn{padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:.15s;font-family:inherit;display:inline-flex;align-items:center;gap:6px}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .btn-teal{background:"#00c9a7";color:#fff}
        .btn-teal:hover:not(:disabled){background:var(--teal2)}
        .btn-gold{background:"#c9a84c";color:#fff}
        .btn-gold:hover:not(:disabled){filter:brightness(1.1)}
        .btn-ghost{background:transparent;color:"#1a2035";border:1.5px solid var(--border)}
        .btn-ghost:hover:not(:disabled){border-color:"#00c9a7";color:"#00b896"}
        .btn-sm{padding:7px 13px;font-size:12px;border-radius:8px}
        /* Status pill */
        .spill{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:none;font-family:inherit}
        /* Spinner */
        @keyframes sp{to{transform:rotate(360deg)}}
        .spin{width:18px;height:18px;border:2.5px solid rgba(0,201,167,.2);border-top-color:"#00c9a7";border-radius:50%;animation:sp .7s linear infinite;display:inline-block;flex-shrink:0}
        .spin-lg{width:32px;height:32px;border-width:3px}
        /* Settings bar */
        .sbar{background:#fff;border-bottom:1.5px solid var(--border);padding:12px 24px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
        .sbar-field{display:flex;flex-direction:column;gap:3px;min-width:140px}
        .sbar-field label{font-size:10px;font-weight:700;color:"#6b7a99";text-transform:uppercase;letter-spacing:.5px}
        .sbar-field input,.sbar-field select{border:1.5px solid var(--border);border-radius:8px;padding:7px 11px;font-size:13px;outline:none;font-family:inherit;color:"#1a2035"}
        .sbar-field input:focus,.sbar-field select:focus{border-color:"#00c9a7"}
        /* Tracker */
        .tbl{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1.5px solid var(--border)}
        .tbl th{text-align:left;padding:11px 16px;font-size:11px;font-weight:700;color:"#6b7a99";text-transform:uppercase;letter-spacing:.5px;border-bottom:1.5px solid var(--border);background:#f8faff}
        .tbl td{padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;vertical-align:middle}
        .tbl tr:last-child td{border-bottom:none}
        .notes-in{width:100%;border:1.5px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12px;resize:none;outline:none;font-family:inherit;background:#f8faff}
        .notes-in:focus{border-color:"#00c9a7"}
        /* Paywall */
        .pw-overlay{position:fixed;inset:0;background:rgba(10,15,40,.75);backdrop-filter:blur(6px);z-index:500;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto}
        .pw-modal{background:#fff;border-radius:20px;max-width:480px;width:100%;overflow:hidden;box-shadow:0 24px 80px rgba(10,15,30,.35);margin:auto;position:relative}
        .pw-head{background:linear-gradient(135deg,var(--text),#0a3028);padding:32px;text-align:center;color:#fff}
        .pw-head h2{font-size:22px;font-weight:800;margin-bottom:8px}
        .pw-head p{font-size:13px;color:rgba(255,255,255,.6);line-height:1.5}
        .pw-body{padding:28px}
        .pw-price{text-align:center;margin-bottom:22px}
        .pw-price .amt{font-size:44px;font-weight:800;color:"#1a2035";line-height:1}
        .pw-price .per{font-size:14px;color:"#6b7a99";margin-top:4px}
        .pw-price .disc{font-size:12px;color:"#00b896";font-weight:700;margin-top:4px}
        .pw-feats{display:flex;flex-direction:column;gap:10px;margin-bottom:22px}
        .pw-feat{display:flex;align-items:center;gap:10px;font-size:13px}
        .pw-feat:before{content:'✓';color:"#00c9a7";font-weight:800;flex-shrink:0}
        .pw-close{position:absolute;top:12px;right:14px;background:none;border:none;color:rgba(255,255,255,.5);font-size:22px;cursor:pointer}
        .code-wrap{display:flex;gap:8px;margin-top:14px}
        .code-in{flex:1;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;font-size:14px;outline:none;font-family:inherit}
        .code-in:focus{border-color:"#00c9a7"}
        .err{font-size:12px;color:"#e63946";margin-top:5px;font-weight:600}
        /* No results */
        .empty{text-align:center;padding:60px 20px;color:"#6b7a99"}
        .empty h3{font-size:17px;color:"#1a2035";margin-bottom:8px;font-weight:700}
        /* Search results header */
        .sh{font-size:13px;font-weight:700;color:"#6b7a99";margin-bottom:12px;padding-bottom:8px;border-bottom:1.5px solid var(--border)}
      `}</style>

      {/* ── PAYWALL ── */}
      {showPaywall && (
        <div className="pw-overlay" onClick={() => setShowPaywall(false)}>
          <div className="pw-modal" onClick={e => e.stopPropagation()}>
            <div className="pw-head">
              <button className="pw-close" onClick={() => setShowPaywall(false)}>×</button>
              <div style={{fontSize:36,marginBottom:12}}>🔓</div>
              <h2>Unlock RepReach Pro</h2>
              <p>Get unlimited access to live Apollo buyer data and AI-powered email generation.</p>
            </div>
            <div className="pw-body">
              <div className="pw-price">
                <div className="amt">$2,000</div>
                <div className="per">per month</div>
                <div className="disc">First month: $1,500 — save $500</div>
              </div>
              <div className="pw-feats">
                <div className="pw-feat">Live Apollo buyer search — any retailer</div>
                <div className="pw-feat">AI cold emails, LinkedIn & follow-ups</div>
                <div className="pw-feat">Direct email + phone on every contact</div>
                <div className="pw-feat">Outreach tracker with notes</div>
                <div className="pw-feat">Unlimited searches & emails</div>
              </div>
              <a href={PAYMENT_LINK} target="_blank" rel="noreferrer"
                style={{display:"block",width:"100%",padding:"14px",borderRadius:12,background:"#c9a84c",color:"#fff",fontWeight:800,fontSize:16,textAlign:"center",textDecoration:"none",marginBottom:16}}>
                ⚡ Subscribe Now — $1,500 First Month
              </a>
              <div style={{textAlign:"center",color:"#6b7a99",fontSize:12,marginBottom:12}}>— or enter access code —</div>
              <div className="code-wrap">
                <input className="code-in" placeholder="Access code" value={accessCode} onChange={e => setAccessCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (() => {
                    if (accessCode.trim() === ACCESS_CODE) { setIsSubscribed(true); setShowPaywall(false); setCodeError(""); }
                    else setCodeError("Invalid access code.");
                  })()} />
                <button className="btn btn-teal" onClick={() => {
                  if (accessCode.trim() === ACCESS_CODE) { setIsSubscribed(true); setShowPaywall(false); setCodeError(""); }
                  else setCodeError("Invalid access code.");
                }}>Apply</button>
              </div>
              {codeError && <div className="err">{codeError}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="logo">Rep<em>Reach</em></div>
        {(leads.length > 0 || searched) && (
          <>
            <button className="nb nb-ghost" onClick={() => setScreen("home")}>🔍 Search</button>
            {activeLead && <button className="nb nb-ghost" onClick={() => setScreen("emails")}>✉ Emails</button>}
            {Object.keys(statuses).length > 0 && <button className="nb nb-ghost" onClick={() => setScreen("tracker")}>📋 Tracker</button>}
          </>
        )}
        {isSubscribed
          ? <span style={{fontSize:12,fontWeight:700,color:"#00c9a7",padding:"5px 13px",background:"rgba(0,201,167,.1)",borderRadius:20}}>✓ PRO Active</span>
          : <button className="nb nb-gold" onClick={() => setShowPaywall(true)}>⚡ Upgrade to Pro</button>
        }
      </nav>

      {/* ── SETTINGS BAR (visible when not on home) ── */}
      {screen !== "home" && (
        <div className="sbar">
          <div className="sbar-field">
            <label>Your Name</label>
            <input placeholder="e.g. Jamie" value={repName} onChange={e => setRepName(e.target.value)} style={{width:130}} />
          </div>
          <div className="sbar-field">
            <label>Brand *</label>
            <input placeholder="e.g. NutriBlend" value={brandName} onChange={e => setBrandName(e.target.value)} style={{width:150}} />
          </div>
          <div className="sbar-field">
            <label>Product</label>
            <input placeholder="e.g. Protein bars" value={productDesc} onChange={e => setProductDesc(e.target.value)} style={{width:170}} />
          </div>
          <div className="sbar-field">
            <label>Tone</label>
            <select value={emailTone} onChange={e => setEmailTone(e.target.value)} style={{width:140}}>
              <option value="professional">Professional</option>
              <option value="casual">Casual & Friendly</option>
              <option value="bold">Bold & Direct</option>
              <option value="data-driven">Data-Driven</option>
            </select>
          </div>
        </div>
      )}

      {/* ════════════════ HOME / SEARCH ════════════════ */}
      {screen === "home" && (
        <>
          <div className="hero">
            <div className="eyebrow">Built for CPG Sales Reps</div>
            <h1>Find any retail buyer.<br /><em>Instantly.</em></h1>
            <p>Type a retailer and watch buyers populate in real time — powered by Apollo's live database.</p>

            <div className="search-wrap">
              <div className="search-box">
                <span className="s-icon">🔍</span>
                <input
                  className="s-input"
                  autoFocus
                  value={searchInput}
                  onChange={e => handleInput(e.target.value)}
                  placeholder='Try "Walmart", "Kroger buyer", "Target beauty merchant"...'
                />
                {searching
                  ? <span className="s-status"><span className="spin" /></span>
                  : searched && <span className="s-status">{leads.length} results</span>
                }
              </div>
              {!searchInput && (
                <div className="chips">
                  {QUICK.map(r => (
                    <button key={r} className="chip" onClick={() => handleInput(r)}>{r}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live results below hero */}
          {(leads.length > 0 || (searched && !searching)) && (
            <div className="page">
              {leads.length === 0 && !searching ? (
                <div className="empty">
                  <h3>No buyers found for "{searchInput}"</h3>
                  <p>Try a different spelling or a parent company name (e.g. "Walmart" for Sam's Club)</p>
                </div>
              ) : (
                <>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                    <div style={{fontWeight:800,fontSize:18}}>{leads.length} buyers found</div>
                    {!isSubscribed && (
                      <button className="btn btn-gold btn-sm" onClick={() => setShowPaywall(true)}>⚡ Unlock Full Access</button>
                    )}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                    {leads.map(lead => (
                      <div key={lead.id} className="lead-card" onClick={() => selectLead(lead)}>
                        <div className="av">{(lead.firstName?.[0]||"")+(lead.lastName?.[0]||"")}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="ln">{lead.firstName} {lead.lastName}</div>
                          <div className="lt">{lead.title}</div>
                          <div className="lc">{lead.retailer}</div>
                          {lead.location && <div style={{fontSize:11,color:"#6b7a99",marginTop:2}}>📍 {lead.location}</div>}
                        </div>
                        {!isSubscribed
                          ? <span style={{fontSize:10,fontWeight:800,color:"#c9a84c"}}>🔒</span>
                          : lead.email && <span style={{fontSize:10,fontWeight:700,color:"#00b896"}}>✉</span>
                        }
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Features — only when no search */}
          {!searchInput && !searched && (
            <div className="page">
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:20,marginTop:40}}>
                {[
                  ["🎯","Right buyer, right now","Every result is the actual buyer or category manager who decides what goes on the shelf — with direct contact info."],
                  ["✉️","Emails that get replies","AI writes two cold email variants, a LinkedIn message, and a follow-up — all tailored to the specific buyer and retailer."],
                  ["⚡","Move faster","Search, generate, and send before your competition even finds the right contact to call."],
                  ["📋","Track everything","Log every outreach, mark status, add notes — your CRM built right in."],
                ].map(([icon,title,desc]) => (
                  <div key={title} style={{background:"#fff",border:"1.5px solid #e8ecf4",borderRadius:14,padding:24}}>
                    <div style={{fontSize:28,marginBottom:12}}>{icon}</div>
                    <h3 style={{fontWeight:800,fontSize:15,marginBottom:8}}>{title}</h3>
                    <p style={{fontSize:13,color:"#6b7a99",lineHeight:1.6}}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════ EMAILS SCREEN ════════════════ */}
      {screen === "emails" && activeLead && (
        <div className="page">
          <div className="results-wrap">
            {/* Left: lead list */}
            <div>
              <div className="sh">{leads.length} buyers — {searchInput}</div>
              <div className="lead-list">
                {leads.map(lead => (
                  <div key={lead.id} className={`lead-card ${activeLead.id === lead.id ? "sel" : ""}`}
                    onClick={() => setActiveLead(lead)}>
                    <div className="av">{(lead.firstName?.[0]||"")+(lead.lastName?.[0]||"")}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="ln">{lead.firstName} {lead.lastName}</div>
                      <div className="lt">{lead.title}</div>
                      <div className="lc">{lead.retailer}</div>
                    </div>
                    {emails[lead.id] && <span style={{fontSize:10,color:"#00b896",fontWeight:700}}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: detail + email panel */}
            <div className="panel">
              <div className="panel-head">
                <div className="pname">{activeLead.firstName} {activeLead.lastName}</div>
                <div className="prole">{activeLead.title}</div>
                <div className="pco">{activeLead.retailer}</div>
              </div>
              <div className="panel-body">
                {/* Contact info */}
                {activeLead.email && (
                  <div className="crow">
                    <span className="cicon">✉</span>
                    <span className="cval">{activeLead.email}</span>
                    <button className="cbtn" onClick={() => copy(activeLead.email, "email")}>{copied==="email"?"Copied!":"Copy"}</button>
                  </div>
                )}
                {activeLead.phone && (
                  <div className="crow">
                    <span className="cicon">📞</span>
                    <span className="cval">{activeLead.phone}</span>
                    <button className="cbtn" onClick={() => copy(activeLead.phone, "phone")}>{copied==="phone"?"Copied!":"Copy"}</button>
                  </div>
                )}
                {activeLead.linkedin && (
                  <div className="crow">
                    <span className="cicon">💼</span>
                    <span className="cval"><a href={"https://"+activeLead.linkedin.replace(/^https?:\/\//,"")} target="_blank" rel="noreferrer">LinkedIn Profile</a></span>
                  </div>
                )}
                {activeLead.location && (
                  <div className="crow">
                    <span className="cicon">📍</span>
                    <span className="cval">{activeLead.location}</span>
                  </div>
                )}

                <div style={{marginTop:18}}>
                  {/* Status + tracker button */}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <button className="spill"
                      style={{background:getStatus(activeLead.id).color+"22",color:getStatus(activeLead.id).color}}
                      onClick={() => cycleStatus(activeLead.id)}>
                      ● {getStatus(activeLead.id).label}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setScreen("tracker")}>📋 Tracker</button>
                  </div>

                  {/* Email type tabs */}
                  <div className="tabs">
                    <button className={`tab ${emailTab==="cold"?"on":""}`} onClick={() => setEmailTab("cold")}>Cold Email</button>
                    <button className={`tab ${emailTab==="linkedin"?"on":""}`} onClick={() => setEmailTab("linkedin")}>LinkedIn</button>
                    <button className={`tab ${emailTab==="followup"?"on":""}`} onClick={() => setEmailTab("followup")}>Follow-up</button>
                  </div>

                  {/* Cold Email */}
                  {emailTab === "cold" && (
                    <>
                      {!eData ? (
                        <button className="btn btn-teal" style={{width:"100%",justifyContent:"center"}}
                          disabled={!!genEmail} onClick={() => genEmail_(activeLead)}>
                          {genEmail === activeLead.id ? <><span className="spin"/>Generating...</> : "✨ Generate Cold Emails"}
                        </button>
                      ) : (
                        <>
                          <div className="vtoggle">
                            <button className={`vbtn ${variant==="a"?"on":""}`} onClick={() => setVariant("a")}>Version A</button>
                            <button className={`vbtn ${variant==="b"?"on":""}`} onClick={() => setVariant("b")}>Version B</button>
                            <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto"}}
                              onClick={() => genEmail_(activeLead)} disabled={!!genEmail}>
                              {genEmail === activeLead.id ? "Regenerating..." : "↺ Regenerate"}
                            </button>
                          </div>
                          <div className="ebox">
                            <div className="elabel">Subject</div>
                            <div className="ebody" style={{fontSize:13,fontWeight:600}}>{eData[variant]?.subject}</div>
                          </div>
                          <div className="ebox">
                            <div className="elabel">Body</div>
                            <div className="ebody">{eData[variant]?.body}</div>
                          </div>
                          <button className="btn btn-ghost btn-sm" onClick={() => copy(`Subject: ${eData[variant]?.subject}\n\n${eData[variant]?.body}`, "email-copy")}>
                            {copied==="email-copy" ? "✓ Copied!" : "Copy Email"}
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* LinkedIn */}
                  {emailTab === "linkedin" && (
                    <>
                      {!liData ? (
                        <button className="btn btn-teal" style={{width:"100%",justifyContent:"center"}}
                          disabled={!!genLI} onClick={() => genLI_(activeLead)}>
                          {genLI === activeLead.id ? <><span className="spin"/>Generating...</> : "💼 Generate LinkedIn Messages"}
                        </button>
                      ) : (
                        <>
                          <div className="ebox">
                            <div className="elabel">Connection Request Note</div>
                            <div className="ebody" style={{fontSize:13}}>{liData.connection}</div>
                          </div>
                          <div className="ebox">
                            <div className="elabel">Direct Message</div>
                            <div className="ebody">{liData.dm}</div>
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <button className="btn btn-ghost btn-sm" onClick={() => copy(liData.connection, "li-conn")}>{copied==="li-conn"?"✓ Copied!":"Copy Note"}</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => copy(liData.dm, "li-dm")}>{copied==="li-dm"?"✓ Copied!":"Copy DM"}</button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Follow-up */}
                  {emailTab === "followup" && (
                    <>
                      {!fuData ? (
                        <button className="btn btn-teal" style={{width:"100%",justifyContent:"center"}}
                          disabled={!!genFU} onClick={() => genFU_(activeLead)}>
                          {genFU === activeLead.id ? <><span className="spin"/>Generating...</> : "↩ Generate Follow-up"}
                        </button>
                      ) : (
                        <>
                          <div className="ebox">
                            <div className="elabel">Subject</div>
                            <div className="ebody" style={{fontWeight:600}}>{fuData.subject}</div>
                          </div>
                          <div className="ebox">
                            <div className="elabel">Body</div>
                            <div className="ebody">{fuData.body}</div>
                          </div>
                          <button className="btn btn-ghost btn-sm" onClick={() => copy(`Subject: ${fuData.subject}\n\n${fuData.body}`, "fu-copy")}>{copied==="fu-copy"?"✓ Copied!":"Copy"}</button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ TRACKER ════════════════ */}
      {screen === "tracker" && (
        <div className="page">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <h1 style={{fontSize:22,fontWeight:800}}>Outreach Tracker</h1>
              <p style={{fontSize:13,color:"#6b7a99",marginTop:4}}>{leads.length} contacts from "{searchInput}"</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setScreen("emails")}>← Back to Emails</button>
          </div>
          {leads.length === 0 ? (
            <div className="empty"><h3>No contacts yet</h3><p>Search for a retailer first.</p></div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th><th>Title</th><th>Company</th><th>Status</th><th>Notes</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const st = getStatus(lead.id);
                  return (
                    <tr key={lead.id}>
                      <td style={{fontWeight:700}}>{lead.firstName} {lead.lastName}</td>
                      <td style={{color:"#6b7a99",fontSize:12}}>{lead.title}</td>
                      <td style={{color:"#00b896",fontWeight:700,fontSize:12}}>{lead.retailer}</td>
                      <td>
                        <button className="spill" style={{background:st.color+"22",color:st.color}} onClick={() => cycleStatus(lead.id)}>
                          ● {st.label}
                        </button>
                      </td>
                      <td>
                        <textarea className="notes-in" rows={2} placeholder="Add notes..."
                          value={notes[lead.id] || ""}
                          onChange={e => setNotes(p => ({ ...p, [lead.id]: e.target.value }))} />
                      </td>
                      <td>
                        <button className="btn btn-teal btn-sm" onClick={() => { setActiveLead(lead); setScreen("emails"); }}>
                          ✨ Email
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
