import { useState, useCallback, useRef } from "react";
import LandingPage from "./LandingPage.jsx";

const PAYMENT_LINK = "https://buy.stripe.com/8x200j5GZaO9aYZb7A2Ji00";
const ACCESS_CODE  = "Championsucks";



function CalendlyWidget() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useState(() => {
    if (document.getElementById("calendly-script")) { setReady(true); return; }
    const s = document.createElement("script");
    s.id = "calendly-script";
    s.src = "https://assets.calendly.com/assets/external/widget.js";
    s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => setError(true);
    document.head.appendChild(s);
  });
  if (error) return (
    <div className="pw-cal-error">
      <div style={{fontSize:28}}>⚠️</div>
      <div style={{fontWeight:700,color:"var(--text)"}}>Couldn't load calendar</div>
      <div>Please refresh or <a href="mailto:amaar@akronproductsinc.com" style={{color:"var(--teal)"}}>email us to schedule</a>.</div>
    </div>
  );
  return (
    <div style={{position:"relative",flex:1,minHeight:700}}>
      {!ready && (
        <div className="pw-cal-loading" style={{position:"absolute",inset:0,zIndex:2,background:"var(--bg2)"}}>
          <div className="pw-cal-spinner"/>
          Loading calendar…
        </div>
      )}
      <div className="calendly-inline-widget"
        data-url="https://calendly.com/amaar-akronproductsinc/30min"
        style={{minWidth:320,height:"100%",minHeight:700}} />
    </div>
  );
}

export default function App() {
  const [showLanding,  setShowLanding]  = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall,  setShowPaywall]  = useState(false);
  const [accessCode,   setAccessCode]   = useState("");
  const [codeError,    setCodeError]    = useState("");

  const [repName,     setRepName]     = useState("");
  const [brandName,   setBrandName]   = useState("");
  const [productDesc, setProductDesc] = useState("");

  const [view,       setView]       = useState("dashboard");
  const [copied,     setCopied]     = useState(null);

  // Pipeline
  const [pipeline, setPipeline] = useState([
    {id:1,account:"Walmart",stage:"Prospecting",category:"Snacks",value:"$0",lastContact:"—",notes:""},
    {id:2,account:"Target",stage:"Meeting Scheduled",category:"Beverages",value:"$0",lastContact:"—",notes:""},
  ]);
  const STAGES = ["Prospecting","First Contact","Meeting Scheduled","Proposal Sent","Negotiation","Closed Won","Closed Lost"];
  const STAGE_COLORS = {Prospecting:"#8b91b8","First Contact":"#a78bfa","Meeting Scheduled":"#38bdf8","Proposal Sent":"var(--amber)",Negotiation:"#fb923c","Closed Won":"#4ade80","Closed Lost":"#f87171"};

  // Simulator
  const [simStep, setSimStep]           = useState("setup"); // setup | running | done
  const [simRetailer, setSimRetailer]   = useState("");
  const [simCategory, setSimCategory]   = useState("");
  const [simBuyerType, setSimBuyerType] = useState("");
  const [simDifficulty, setSimDifficulty] = useState("Medium");
  const [simMessages, setSimMessages]   = useState([]);
  const [simUserInput, setSimUserInput] = useState("");
  const [simBusy, setSimBusy]           = useState(false);
  const [simScore, setSimScore]         = useState(null);
  const [simTurns, setSimTurns]         = useState(0);
  const [simIsRecording, setSimIsRecording] = useState(false);
  const [simVoiceEnabled, setSimVoiceEnabled] = useState(true);
  const simRecRef = useRef(null);
  const simSynthRef = useRef(null);

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
  const pitchRecRef    = useRef(null);
  const responseRecRef = useRef(null);

  // AI Tools tabs
  const [aiTab,            setAiTab]            = useState("pitch");
  const [pitchCtx,         setPitchCtx]         = useState("");
  const [pitchRes,         setPitchRes]         = useState("");
  const [pitchBusy,        setPitchBusy]        = useState(false);
  const [objInput,         setObjInput]         = useState("");
  const [objRes,           setObjRes]           = useState("");
  const [objBusy,          setObjBusy]          = useState(false);
  const [subjInput,        setSubjInput]        = useState("");
  const [subjRes,          setSubjRes]          = useState(null);
  const [subjBusy,         setSubjBusy]         = useState(false);
  const [valRes,           setValRes]           = useState(null);
  const [valBusy,          setValBusy]          = useState(false);
  const [callCtx,          setCallCtx]          = useState("");
  const [callRes,          setCallRes]          = useState("");
  const [callBusy,         setCallBusy]         = useState(false);

  // Retail Readiness
  const [readinessAnswers, setReadinessAnswers] = useState({});
  const [readinessScore,   setReadinessScore]   = useState(null);
  const [readinessBusy,    setReadinessBusy]     = useState(false);

  const READINESS_QUESTIONS = [
    {id:"pkg",   cat:"Packaging",    q:"Does your packaging meet major retailer compliance requirements (barcodes, nutrition facts, certifications)?", weight:20},
    {id:"price", cat:"Pricing",      q:"Is your retail price competitive within 10% of top 3 category competitors?", weight:20},
    {id:"margin",cat:"Margins",      q:"Can you offer retailers 35–45% gross margin on your product?", weight:20},
    {id:"logis", cat:"Logistics",    q:"Do you have a reliable 3PL or distributor that can service major retail DCs?", weight:15},
    {id:"inv",   cat:"Inventory",    q:"Can you fulfill an initial PO of 5,000+ units within 30 days?", weight:15},
    {id:"mktg",  cat:"Marketing",    q:"Do you have trade marketing budget and a consumer marketing plan?", weight:10},
  ];

  const calcReadiness = () => {
    const total = READINESS_QUESTIONS.reduce((sum,q)=>{
      const a = readinessAnswers[q.id];
      return sum + (a==="yes" ? q.weight : a==="partial" ? q.weight*0.5 : 0);
    }, 0);
    return Math.round(total);
  };

  const genReadinessReport = async () => {
    setReadinessBusy(true);
    const answered = READINESS_QUESTIONS.map(q=>`${q.cat}: ${readinessAnswers[q.id]||"no"}`).join(", ");
    const score = calcReadiness();
    try {
      const r = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt: `A CPG brand scored ${score}/100 on retail readiness. Answers: ${answered}. Brand: ${brandName||"unknown"}. Give 3 specific action items to improve their weakest areas. ONLY JSON: {"actions":["...","...","..."]}` }) });
      const d = await r.json();
      setReadinessScore({score, actions: JSON.parse(d.result).actions});
    } catch(e) { setReadinessScore({score, actions:[]}); }
    setReadinessBusy(false);
  };

  // Intelligence
  const [intelQuery,       setIntelQuery]       = useState("");
  const [intelResult,      setIntelResult]      = useState(null);
  const [intelBusy,        setIntelBusy]        = useState(false);

  // Sequences
  const [sequences,        setSequences]        = useState([]);
  const [showNewSeq,       setShowNewSeq]       = useState(false);
  const [newSeqName,       setNewSeqName]       = useState("");
  const [newSeqTarget,     setNewSeqTarget]     = useState("");
  const [newSeqSteps,      setNewSeqSteps]      = useState(4);
  const [seqBusy,          setSeqBusy]          = useState(false);
  const [activeSeq,        setActiveSeq]        = useState(null);

  // Enablement
  const [enabTab,          setEnabTab]          = useState("playbook");
  const [playbookTarget,   setPlaybookTarget]   = useState("");
  const [playbookResult,   setPlaybookResult]   = useState(null);
  const [playbookBusy,     setPlaybookBusy]     = useState(false);
  const [pitchTplScenario, setPitchTplScenario] = useState("cold_call");
  const [pitchTplResult,   setPitchTplResult]   = useState("");
  const [pitchTplBusy,     setPitchTplBusy]     = useState(false);
  const [sellSheetResult,  setSellSheetResult]  = useState(null);
  const [sellSheetBusy,    setSellSheetBusy]    = useState(false);
  const [objLibSearch,     setObjLibSearch]     = useState("");
  const [objLibResult,     setObjLibResult]     = useState(null);
  const [objLibBusy,       setObjLibBusy]       = useState(false);

  // Meetings
  const [meetTab,          setMeetTab]          = useState("brief");
  const [meetContact,      setMeetContact]      = useState(null);
  const [meetContactName,  setMeetContactName]  = useState("");
  const [meetContactTitle, setMeetContactTitle] = useState("");
  const [meetContactCo,    setMeetContactCo]    = useState("");
  const [meetBriefResult,  setMeetBriefResult]  = useState(null);
  const [meetBriefBusy,    setMeetBriefBusy]    = useState(false);
  const [agendaResult,     setAgendaResult]     = useState("");
  const [agendaBusy,       setAgendaBusy]       = useState(false);
  const [meetNotes,        setMeetNotes]        = useState("");
  const [followupResult,   setFollowupResult]   = useState(null);
  const [followupBusy,     setFollowupBusy]     = useState(false);

  const startMeeting = () => {
    if (!meetContactName.trim()) return;
    setMeetContact({ name: meetContactName.trim(), title: meetContactTitle.trim(), retailer: meetContactCo.trim() });
    setMeetBriefResult(null); setAgendaResult(""); setFollowupResult(null); setMeetNotes("");
    setMeetTab("brief");
    genMeetBriefManual({ name: meetContactName.trim(), title: meetContactTitle.trim(), retailer: meetContactCo.trim() });
  };

  // ── SEQUENCES ──
  const genSequence = async () => {
    if (!newSeqName.trim()) return alert("Enter a sequence name.");
    if (!brandName) return alert("Enter your brand name in the settings bar first.");
    setSeqBusy(true);
    try {
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:
          `Create a ${newSeqSteps}-step outreach sequence for a CPG sales rep.
Brand: ${brandName}. Product: ${productDesc||brandName}. Rep: ${repName||"Sales Rep"}.
Target: ${newSeqTarget||"retail buyer"}. Vary the approach across steps — change angle, tone, content.
Include Email and LinkedIn steps. Use natural days (1, 3, 7, 10, 14...).
ONLY JSON: {"steps":[{"day":1,"type":"Email","subject":"...","body":"..."},{"day":4,"type":"LinkedIn","subject":null,"body":"..."},...]}`
        }),
      });
      const d = await r.json(); if(d.error) throw new Error(d.error);
      const parsed = JSON.parse(d.result);
      const seq = { id: Date.now(), name: newSeqName, target: newSeqTarget||"Retail Buyer", steps: parsed.steps||[] };
      setSequences(prev=>[...prev, seq]);
      setActiveSeq(seq); setShowNewSeq(false); setNewSeqName(""); setNewSeqTarget("");
    } catch(e) { alert("Failed: "+e.message); }
    setSeqBusy(false);
  };

  // ── ENABLEMENT ──
  const genPlaybook = async () => {
    if (!brandName) return alert("Enter your brand name in the settings bar first.");
    setPlaybookBusy(true);
    try {
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:
          `Create a retail sales playbook for a CPG brand.
Brand: ${brandName}. Product: ${productDesc||brandName}. Rep: ${repName||"Sales Rep"}.
Target retailers: ${playbookTarget||"major retail chains"}.
Cover these 5 sections: 1) Getting the first meeting 2) The pitch meeting 3) Key objections + responses 4) Follow-up strategy 5) Closing the deal.
Each section: 3-4 concrete, tactical bullets. No fluff.
ONLY JSON: {"sections":[{"title":"...","bullets":["...","...","..."]},...]}`
        }),
      });
      const d = await r.json(); if(d.error) throw new Error(d.error);
      setPlaybookResult(JSON.parse(d.result));
    } catch(e) { alert("Failed: "+e.message); }
    setPlaybookBusy(false);
  };

  const genPitchTemplate = async () => {
    if (!brandName) return alert("Enter your brand name in the settings bar first.");
    setPitchTplBusy(true);
    const scenarios = { cold_call:"a cold phone call to a retail buyer", trade_show:"a trade show meeting with a buyer", broker:"a broker introduction presentation", followup:"a follow-up meeting after initial contact", zoom:"a Zoom demo meeting with a buyer" };
    try {
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:
          `Write a pitch template for ${scenarios[pitchTplScenario]||"a sales meeting"}.
Brand: ${brandName}. Product: ${productDesc||brandName}. Rep: ${repName||"Sales Rep"}.
Use [BUYER NAME], [RETAILER], [CATEGORY] as placeholders where appropriate.
Label each section clearly. 150 words max. Natural spoken language.
ONLY JSON: {"template":"..."}`
        }),
      });
      const d = await r.json(); if(d.error) throw new Error(d.error);
      setPitchTplResult(JSON.parse(d.result).template);
    } catch(e) { alert("Failed: "+e.message); }
    setPitchTplBusy(false);
  };

  const genSellSheet = async () => {
    if (!brandName) return alert("Enter your brand name in the settings bar first.");
    setSellSheetBusy(true);
    try {
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:
          `Write all copy for a one-page CPG sell sheet.
Brand: ${brandName}. Product: ${productDesc||brandName}.
Generate every text section a sell sheet needs to land shelf space.
ONLY JSON: {"headline":"...","subheadline":"...","productDescription":"...","keyBenefits":["...","...","..."],"targetConsumer":"...","velocityStats":"...","retailerBenefits":"...","callToAction":"..."}`
        }),
      });
      const d = await r.json(); if(d.error) throw new Error(d.error);
      setSellSheetResult(JSON.parse(d.result));
    } catch(e) { alert("Failed: "+e.message); }
    setSellSheetBusy(false);
  };

  const genObjLibrary = async () => {
    if (!objLibSearch.trim()) return;
    setObjLibBusy(true); setObjLibResult(null);
    try {
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:
          `A retail buyer just told a CPG sales rep: "${objLibSearch}"
Brand: ${brandName||"our brand"}. Product: ${productDesc||"our product"}.

Write one direct, effective response the rep should say right now. It must:
- Acknowledge the concern without being defensive
- Address the real underlying worry
- Pivot back to value with something concrete
- End with a soft next step or question
- Sound natural and confident, not scripted — 3-5 sentences max

Also provide a short explanation of the strategy behind the response.

ONLY JSON: {"response":"...","strategy":"..."}`
        }),
      });
      const d = await r.json(); if(d.error) throw new Error(d.error);
      setObjLibResult(JSON.parse(d.result));
    } catch(e) { alert("Failed: "+e.message); }
    setObjLibBusy(false);
  };

  // ── MEETINGS ──
  const genMeetBriefManual = async (contact) => {
    const c = contact || meetContact;
    if (!c) return;
    setMeetBriefBusy(true);
    try {
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:
          `Generate a pre-meeting brief for a CPG sales rep.
Rep: ${repName||"Sales Rep"}. Brand: ${brandName||"our brand"}. Product: ${productDesc||"our product"}.
Buyer: ${c.name}${c.title?", "+c.title:""}${c.retailer?" at "+c.retailer:""}.
Cover: talking points, objections to prepare for, questions to ask, and prep items to bring.
ONLY JSON: {"talkingPoints":["...","...","..."],"objections":["...","..."],"questionsToAsk":["...","...","..."],"prepItems":["...","..."]}`
        }),
      });
      const d = await r.json(); if(d.error) throw new Error(d.error);
      setMeetBriefResult(JSON.parse(d.result));
    } catch(e) { alert("Failed: "+e.message); }
    setMeetBriefBusy(false);
  };

  const genAgenda = async () => {
    if (!meetContact) return;
    setAgendaBusy(true);
    try {
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:
          `Write a 30-minute meeting agenda for a CPG sales rep meeting a retail buyer.
Rep: ${repName||"Sales Rep"}. Brand: ${brandName||"our brand"}. Product: ${productDesc||"our product"}.
Buyer: ${meetContact.name}${meetContact.title?", "+meetContact.title:""}${meetContact.retailer?" at "+meetContact.retailer:""}.
Include time blocks with clear purpose and transition notes.
ONLY JSON: {"agenda":"[formatted agenda with labeled time blocks]"}`
        }),
      });
      const d = await r.json(); if(d.error) throw new Error(d.error);
      setAgendaResult(JSON.parse(d.result).agenda);
    } catch(e) { alert("Failed: "+e.message); }
    setAgendaBusy(false);
  };

  const genMeetFollowup = async () => {
    if (!meetContact) return;
    setFollowupBusy(true);
    try {
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:
          `Write a post-meeting follow-up email from a CPG rep to a retail buyer.
Rep: ${repName||"Sales Rep"}. Brand: ${brandName||"our brand"}.
Buyer: ${meetContact.name}${meetContact.title?", "+meetContact.title:""}${meetContact.retailer?" at "+meetContact.retailer:""}.
${meetNotes?"Meeting notes: "+meetNotes:""}
Reference what was discussed, confirm next steps. Under 100 words. Professional but warm.
ONLY JSON: {"subject":"...","body":"..."}`
        }),
      });
      const d = await r.json(); if(d.error) throw new Error(d.error);
      setFollowupResult(JSON.parse(d.result));
    } catch(e) { alert("Failed: "+e.message); }
    setFollowupBusy(false);
  };

  // ── AI TOOLS helpers ──
  const aiGenerate = async (prompt, onResult, setBusy) => {
    setBusy(true);
    try {
      const r = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt }) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      onResult(JSON.parse(d.result));
    } catch(e) { alert("Failed: " + e.message); }
    setBusy(false);
  };

  const genPitch = () => {
    if (!brandName) return alert("Enter your brand name in the settings bar first.");
    aiGenerate(
      `Write a 60-second spoken sales pitch for a CPG rep calling on a retail buyer.
Rep: ${repName||"Sales Rep"}. Brand: ${brandName}. Product: ${productDesc||brandName}. Retail context: ${pitchCtx||"general retail"}.
Structure: hook → problem/opportunity → solution → proof point → ask. Under 100 words. Natural spoken tone.
ONLY JSON: {"pitch":"..."}`,
      d => setPitchRes(d.pitch), setPitchBusy
    );
  };

  const genObjHandler = () => {
    if (!objInput.trim()) return;
    aiGenerate(
      `A retail buyer just said: "${objInput}"
Brand: ${brandName||"our brand"}. Product: ${productDesc||"our product"}.
Write a confident, empathetic response: acknowledge the concern, pivot to value, keep conversation moving. 2-4 sentences.
ONLY JSON: {"response":"..."}`,
      d => setObjRes(d.response), setObjBusy
    );
  };

  const genSubjectTest = () => {
    if (!subjInput.trim()) return;
    aiGenerate(
      `Analyze this cold email subject line for a CPG rep emailing a retail buyer: "${subjInput}"
Score it 1–10. Give brief feedback and 3 improved alternatives.
ONLY JSON: {"score":7,"feedback":"...","alternatives":["...","...","..."]}`,
      d => setSubjRes(d), setSubjBusy
    );
  };

  const genValueProp = () => {
    if (!brandName) return alert("Enter your brand name in the settings bar first.");
    aiGenerate(
      `Create 3 value proposition statements for a CPG brand, each tailored for retail buyer conversations.
Brand: ${brandName}. Product: ${productDesc||brandName}.
Each focused on margin, velocity, consumer demand, or category growth. Under 30 words each.
ONLY JSON: {"props":["...","...","..."]}`,
      d => setValRes(d.props), setValBusy
    );
  };

  const genCallScript = () => {
    if (!brandName) return alert("Enter your brand name in the settings bar first.");
    aiGenerate(
      `Write a cold call script for a CPG rep calling a retail buyer.
Rep: ${repName||"Sales Rep"}. Brand: ${brandName}. Product: ${productDesc||brandName}. Context: ${callCtx||"general retail buyer"}.
Include labeled stages: [OPENER] [HOOK] [VALUE PROP] [HANDLE BRUSH-OFF] [ASK FOR MEETING]. Under 150 words.
ONLY JSON: {"script":"..."}`,
      d => setCallRes(d.script), setCallBusy
    );
  };

  const runIntelResearch = async () => {
    if (!intelQuery.trim()) return;
    setIntelBusy(true); setIntelResult(null);
    try {
      const r = await fetch("/api/intelligence", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ query: intelQuery, brand: brandName, product: productDesc }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setIntelResult(d);
    } catch(e) { alert("Research failed: " + e.message); }
    setIntelBusy(false);
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

  const speakBuyer = (text) => {
    if (!simVoiceEnabled) return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /Google US English|Samantha|Alex|Daniel/.test(v.name));
    if (preferred) utt.voice = preferred;
    simSynthRef.current = utt;
    window.speechSynthesis.speak(utt);
  };

  const stopBuyerSpeech = () => { window.speechSynthesis?.cancel(); };

  const startSimVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome or Edge."); return; }
    stopBuyerSpeech();
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    let final = "";
    r.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setSimUserInput(final + interim);
    };
    r.onerror = () => { setSimIsRecording(false); simRecRef.current = null; };
    r.onend   = () => { setSimIsRecording(false); simRecRef.current = null; };
    r.start(); setSimIsRecording(true); simRecRef.current = r;
  };

  const stopSimVoice = () => {
    if (simRecRef.current) { simRecRef.current.stop(); simRecRef.current = null; }
    setSimIsRecording(false);
  };

  const startSimulator = async () => {
    if (!simRetailer.trim() || !simCategory.trim()) return alert("Select a retailer and category.");
    setSimStep("running");
    setSimMessages([]);
    setSimTurns(0);
    setSimScore(null);
    setSimBusy(true);
    const systemCtx = `You are a ${simBuyerType||"Category Buyer"} at ${simRetailer} responsible for ${simCategory}. You are conducting a vendor pitch meeting. Difficulty: ${simDifficulty}. Brand pitching: ${brandName||"an emerging brand"}. Product: ${productDesc||"consumer packaged goods"}.
Be realistic and tough. Ask about margins (you need ${simDifficulty==="Expert"?"45%+":"40%+"}), velocity projections, slotting fees, logistics, inventory, packaging compliance, marketing support, and competitive positioning. On Hard/Expert difficulty, push back hard and be skeptical. Start by greeting the rep and asking them to begin their pitch. Respond ONLY as the buyer in first person. Keep responses under 80 words.`;
    try {
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt: systemCtx + '\n\nONLY JSON: {"message":"..."}' }),
      });
      const d = await r.json();
      const msg = JSON.parse(d.result).message;
      setSimMessages([{role:"buyer", text:msg}]);
      speakBuyer(msg);
    } catch(e) { alert("Simulator error: "+e.message); setSimStep("setup"); }
    setSimBusy(false);
  };

  const sendSimMessage = async () => {
    if (!simUserInput.trim() || simBusy) return;
    const userMsg = simUserInput.trim();
    setSimUserInput("");
    const newMsgs = [...simMessages, {role:"rep", text:userMsg}];
    setSimMessages(newMsgs);
    setSimBusy(true);
    const turns = simTurns + 1;
    setSimTurns(turns);
    const shouldEnd = turns >= (simDifficulty==="Expert" ? 8 : simDifficulty==="Hard" ? 6 : 5);
    try {
      const history = newMsgs.map(m => `${m.role==="buyer"?"Buyer":"Rep"}: ${m.text}`).join("\n");
      const prompt = `You are a ${simBuyerType||"Category Buyer"} at ${simRetailer} for ${simCategory}. Difficulty: ${simDifficulty}. Brand: ${brandName||"emerging brand"}. Product: ${productDesc||"CPG product"}.
Conversation so far:
${history}
${shouldEnd ? "This is the final exchange. Wrap up the meeting — either request a follow-up proposal or politely decline. Sound natural." : "Continue the realistic buyer meeting. Ask a tough follow-up question or challenge their last answer. Push on margins, velocity, slotting, logistics, or marketing. Under 80 words."}
ONLY JSON: {"message":"..."}`;
      const r = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt }) });
      const d = await r.json();
      const buyerReply = JSON.parse(d.result).message;
      const final = [...newMsgs, {role:"buyer", text:buyerReply}];
      setSimMessages(final);
      speakBuyer(buyerReply);
      if (shouldEnd) {
        setTimeout(() => scoreSimulation(final), 600);
      }
    } catch(e) { alert("Error: "+e.message); }
    setSimBusy(false);
  };

  const scoreSimulation = async (msgs) => {
    setSimStep("done");
    setSimBusy(true);
    try {
      const transcript = msgs.map(m=>`${m.role==="buyer"?"BUYER":"REP"}: ${m.text}`).join("\n");
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:
          `You are a retail sales trainer. Score this pitch simulation:
Retailer: ${simRetailer}. Category: ${simCategory}. Difficulty: ${simDifficulty}.
Transcript:\n${transcript}\n
Score 1–10. Identify top 3 weaknesses. Give 3 specific coaching tips. List 3 likely buyer objections they should prep for.
ONLY JSON: {"score":7,"summary":"...","weaknesses":["...","...","..."],"coaching":["...","...","..."],"objections":["...","...","..."]}` }),
      });
      const d = await r.json();
      setSimScore(JSON.parse(d.result));
    } catch(e) { alert("Scoring error: "+e.message); }
    setSimBusy(false);
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null),1800); };
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
        .cb-locked:hover{border-color:var(--teal);color:var(--teal)}
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

        /* ─── CONSULTATION MODAL (replaces paywall) ─── */
        .pw-overlay{position:fixed;inset:0;background:rgba(4,5,12,.92);backdrop-filter:blur(12px);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto}
        .pw-modal{background:var(--bg2);border:1px solid rgba(0,229,192,.18);border-radius:20px;max-width:900px;width:100%;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 0 1px rgba(0,229,192,.06);position:relative;display:grid;grid-template-columns:1fr 1fr}
        @media(max-width:700px){.pw-modal{grid-template-columns:1fr;max-height:90vh;overflow-y:auto}}
        .pw-left{background:linear-gradient(160deg,rgba(0,229,192,.07) 0%,rgba(0,107,255,.05) 100%);padding:36px 32px;border-right:1px solid rgba(0,229,192,.1);display:flex;flex-direction:column;justify-content:center}
        .pw-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(0,229,192,.1);border:1px solid rgba(0,229,192,.22);border-radius:20px;padding:4px 12px;font-size:10px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px}
        .pw-left h2{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;color:var(--text);line-height:1.2;letter-spacing:-.4px;margin:0 0 10px}
        .pw-left p{font-size:12px;color:var(--text2);line-height:1.65;margin:0 0 22px}
        .pw-benefits{display:flex;flex-direction:column;gap:11px;margin-bottom:24px}
        .pw-benefit{display:flex;align-items:flex-start;gap:10px}
        .pw-benefit-icon{width:30px;height:30px;border-radius:8px;background:var(--teal-dim);border:1px solid rgba(0,229,192,.18);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:1px}
        .pw-benefit-title{font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px}
        .pw-benefit-desc{font-size:11px;color:var(--text3);line-height:1.45}
        .pw-stats{display:flex;gap:10px;margin-bottom:20px}
        .pw-stat{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center}
        .pw-stat-val{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;color:var(--teal);line-height:1;margin-bottom:2px}
        .pw-stat-label{font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em}
        .pw-review{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:13px 14px;margin-top:4px}
        .pw-stars{color:#f5a623;font-size:11px;margin-bottom:5px}
        .pw-review-text{font-size:11px;color:var(--text2);line-height:1.5;font-style:italic;margin-bottom:5px}
        .pw-review-author{font-size:10px;font-weight:700;color:var(--text3)}
        .pw-right{padding:0;display:flex;flex-direction:column}
        .pw-right-hd{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
        .pw-right-dot{width:8px;height:8px;border-radius:50%;background:var(--teal)}
        .pw-right-title{font-size:13px;font-weight:700;color:var(--text);flex:1}
        .pw-right-sub{font-size:10px;color:var(--text3)}
        .pw-cal-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;min-height:500px;gap:12px;color:var(--text2);font-size:12px}
        .pw-cal-spinner{width:28px;height:28px;border:3px solid rgba(0,229,192,.15);border-top-color:var(--teal);border-radius:50%;animation:spin .8s linear infinite}
        .pw-cal-error{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;min-height:400px;gap:8px;text-align:center;padding:24px;color:var(--text2);font-size:12px}
        .pw-x{position:absolute;top:14px;right:16px;background:none;border:none;color:var(--text3);font-size:22px;cursor:pointer;line-height:1;z-index:10}
        .pw-x:hover{color:var(--text)}
        .pw-divider{text-align:center;color:var(--text3);font-size:10px;margin:10px 0;font-weight:600;letter-spacing:.6px}
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

        /* ─── FULL-PAGE VIEWS ─── */
        .view-wrap{flex:1;overflow-y:auto;padding:28px 28px 40px}
        .view-hd{margin-bottom:24px}
        .view-hd h2{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;color:var(--text);letter-spacing:-.4px;margin-bottom:5px}
        .view-hd p{font-size:13px;color:var(--text3);font-weight:500;line-height:1.6}
        .card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
        .feat-card{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:22px;transition:.15s;cursor:pointer}
        .feat-card:hover{border-color:var(--border2);transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
        .feat-card-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:14px}
        .feat-card h3{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:800;color:var(--text);margin-bottom:6px;letter-spacing:-.2px}
        .feat-card p{font-size:12px;color:var(--text3);line-height:1.65;margin-bottom:14px}
        .feat-card-cta{font-size:11px;font-weight:700;letter-spacing:.02em}
        .cs-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);border-radius:20px;font-size:10px;font-weight:700;color:var(--amber);letter-spacing:.06em;text-transform:uppercase;margin-bottom:20px}
        /* Pipeline kanban */
        .kanban{display:flex;gap:12px;overflow-x:auto;padding-bottom:20px;align-items:flex-start}
        .k-col{min-width:215px;flex:0 0 215px}
        .k-col-hd{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:9px;margin-bottom:9px}
        .k-col-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
        .k-col-label{font-size:12px;font-weight:700;color:var(--text);flex:1}
        .k-col-count{font-size:11px;font-weight:800;padding:2px 7px;border-radius:20px}
        .k-card{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;cursor:pointer;transition:.12s;margin-bottom:8px}
        .k-card:hover{border-color:var(--border2);background:var(--bg3)}
        /* Forecasting stats */
        .stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px}
        .stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:11px;padding:16px 18px}
        .stat-card-val{font-family:'Bricolage Grotesque',sans-serif;font-size:28px;font-weight:800;color:var(--text);letter-spacing:-.5px;line-height:1;margin-bottom:3px}
        .stat-card-label{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px}
        .funnel-row{display:flex;align-items:center;gap:12px;margin-bottom:8px}
        .funnel-bar-bg{flex:1;height:10px;background:var(--bg3);border-radius:20px;overflow:hidden;border:1px solid var(--border)}
        .funnel-bar-fill{height:100%;border-radius:20px;transition:width .6s ease}
        /* Integrations grid */
        .int-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px;display:flex;align-items:center;gap:14px;transition:.15s}
        .int-card:hover{border-color:var(--border2)}
        .int-logo{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
        .int-status{font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;margin-top:3px;display:inline-block}
        .int-coming{background:rgba(245,166,35,.1);color:var(--amber);border:1px solid rgba(245,166,35,.2)}
        .int-live{background:rgba(74,222,128,.1);color:#4ade80;border:1px solid rgba(74,222,128,.2)}

        /* ─── SCHEDULE / CONSULTATION ─── */
        .sch-wrap{padding:28px 32px;overflow-y:auto;flex:1;max-width:1100px;margin:0 auto;width:100%}
        .sch-hero{background:linear-gradient(135deg,rgba(0,229,192,.08) 0%,rgba(0,107,255,.08) 100%);border:1px solid rgba(0,229,192,.18);border-radius:18px;padding:36px 40px;margin-bottom:24px;position:relative;overflow:hidden}
        .sch-hero::before{content:"";position:absolute;top:-60px;right:-60px;width:220px;height:220px;background:radial-gradient(circle,rgba(0,229,192,.12) 0%,transparent 70%);pointer-events:none}
        .sch-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(0,229,192,.1);border:1px solid rgba(0,229,192,.22);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px}
        .sch-hero h1{font-family:'Bricolage Grotesque',sans-serif;font-size:32px;font-weight:800;color:var(--text);line-height:1.15;letter-spacing:-.5px;margin:0 0 12px}
        .sch-hero p{font-size:13px;color:var(--text2);line-height:1.65;max-width:560px;margin:0 0 20px}
        .sch-benefits{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px}
        .sch-benefit{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px;display:flex;gap:12px;align-items:flex-start;transition:.15s}
        .sch-benefit:hover{border-color:var(--border2)}
        .sch-benefit-icon{width:36px;height:36px;border-radius:9px;background:var(--teal-dim);border:1px solid rgba(0,229,192,.2);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
        .sch-benefit-title{font-size:12px;font-weight:700;color:var(--text);margin-bottom:3px}
        .sch-benefit-desc{font-size:11px;color:var(--text3);line-height:1.5}
        .sch-main{display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start}
        @media(max-width:860px){.sch-main{grid-template-columns:1fr}.sch-wrap{padding:18px 16px}.sch-hero{padding:24px 20px}.sch-hero h1{font-size:24px}}
        .sch-widget-box{background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;position:relative}
        .sch-widget-hd{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
        .sch-widget-dot{width:8px;height:8px;border-radius:50%;background:var(--teal)}
        .sch-widget-title{font-size:13px;font-weight:700;color:var(--text)}
        .sch-widget-sub{font-size:11px;color:var(--text3);margin-left:auto}
        .sch-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:500px;gap:12px;color:var(--text2);font-size:13px}
        .sch-spinner{width:32px;height:32px;border:3px solid rgba(0,229,192,.15);border-top-color:var(--teal);border-radius:50%;animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .sch-trust-col{display:flex;flex-direction:column;gap:14px}
        .sch-trust-card{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:18px 20px}
        .sch-trust-hd{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px}
        .sch-review{margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)}
        .sch-review:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none}
        .sch-stars{color:#f5a623;font-size:12px;margin-bottom:4px}
        .sch-review-text{font-size:11px;color:var(--text2);line-height:1.55;margin-bottom:5px;font-style:italic}
        .sch-review-author{font-size:10px;font-weight:700;color:var(--text3)}
        .sch-guarantee{display:flex;gap:10px;align-items:flex-start}
        .sch-guarantee-icon{font-size:20px;flex-shrink:0}
        .sch-guarantee-text{font-size:11px;color:var(--text2);line-height:1.55}
        .sch-guarantee-text strong{color:var(--text);display:block;margin-bottom:2px;font-size:12px}
        .sch-stat-row{display:flex;gap:10px}
        .sch-stat{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:12px;text-align:center}
        .sch-stat-val{font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;color:var(--teal);line-height:1;margin-bottom:3px}
        .sch-stat-label{font-size:10px;font-weight:600;color:var(--text3)}
        .sch-cta-banner{background:linear-gradient(135deg,rgba(0,229,192,.1),rgba(0,107,255,.08));border:1px solid rgba(0,229,192,.18);border-radius:13px;padding:20px 22px;margin-top:14px;text-align:center}
        .sch-cta-banner h3{font-family:'Bricolage Grotesque',sans-serif;font-size:16px;font-weight:800;color:var(--text);margin:0 0 6px}
        .sch-cta-banner p{font-size:11px;color:var(--text2);line-height:1.55;margin:0 0 14px}
        .sch-error{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;gap:10px;color:var(--text2);font-size:13px;text-align:center;padding:20px}
        .sch-error-icon{font-size:32px;margin-bottom:4px}

        /* ─── SEQUENCES ─── */
        .seq-list{padding:16px 20px;overflow-y:auto;flex:1}
        .seq-card{background:var(--bg2);border:1px solid var(--border);border-radius:11px;padding:14px 16px;cursor:pointer;transition:.15s;margin-bottom:9px;display:flex;align-items:center;gap:12px}
        .seq-card:hover{border-color:var(--border2)}
        .seq-card.active{border-color:var(--teal2);background:var(--teal-dim)}
        .seq-step{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px}
        .seq-step-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
        .seq-day{font-size:10px;font-weight:800;color:var(--teal);background:var(--teal-dim);border:1px solid rgba(0,229,192,.2);padding:2px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em}
        .seq-type{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;background:var(--bg2);border:1px solid var(--border);padding:2px 9px;border-radius:20px}
        .seq-subject{font-size:12px;font-weight:700;color:var(--text);margin-bottom:5px}
        .seq-body{font-size:12px;color:var(--text2);line-height:1.75;white-space:pre-wrap}
        /* ─── ENABLEMENT TABS ─── */
        .enab-view{display:flex;flex-direction:column;flex:1;overflow:hidden}
        /* ─── MEETINGS ─── */
        .meet-layout{display:flex;flex:1;overflow:hidden}
        .meet-list{width:255px;border-right:1px solid var(--border);overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column}
        .meet-list-hd{padding:12px 16px;border-bottom:1px solid var(--border);font-size:10px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;flex-shrink:0}
        .meet-row{display:flex;gap:10px;align-items:center;padding:11px 14px;border-bottom:1px solid rgba(26,31,58,.5);cursor:pointer;transition:.12s}
        .meet-row:hover{background:var(--bg3)}
        .meet-row.active{background:var(--teal-dim);border-left:2px solid var(--teal)}
        .meet-tools{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .meet-tabs{display:flex;border-bottom:1px solid var(--border);background:var(--bg2);flex-shrink:0;padding:0 16px;overflow-x:auto}
        .meet-tab{padding:10px 13px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--text3);border-bottom:2px solid transparent;margin-bottom:-1px;transition:.15s;white-space:nowrap}
        .meet-tab.on{color:var(--teal);border-bottom-color:var(--teal)}
        .meet-content{flex:1;overflow-y:auto;padding:20px 22px}
        /* ─── AI TOOLS TABS ─── */
        .ai-view{display:flex;flex-direction:column;flex:1;overflow:hidden}
        .ai-view-hd{padding:14px 20px 0;background:var(--bg2);flex-shrink:0;border-bottom:1px solid var(--border)}
        .ai-view-hd-top{display:flex;align-items:center;gap:8px;margin-bottom:2px}
        .ai-view-hd h2{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;color:var(--text);letter-spacing:-.2px}
        .ai-view-hd p{font-size:11px;color:var(--text3);font-weight:500;margin-bottom:10px}
        .ai-tabs{display:flex;gap:0;overflow-x:auto}
        .ai-tab{padding:10px 15px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--text3);border-bottom:2px solid transparent;margin-bottom:-1px;transition:.15s;white-space:nowrap;letter-spacing:.02em;display:flex;align-items:center;gap:5px}
        .ai-tab.on{color:var(--teal);border-bottom-color:var(--teal)}
        .ai-tab:hover:not(.on){color:var(--text2)}
        .ai-panel{flex:1;overflow-y:auto;padding:22px 24px}
        .ai-panel-title{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;color:var(--text);letter-spacing:-.2px;margin-bottom:3px;display:flex;align-items:center;gap:7px}
        .ai-panel-sub{font-size:12px;color:var(--text3);margin-bottom:20px;font-weight:500}
        .ai-field-label{font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
        .ai-in{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:10px 14px;font-size:13px;color:var(--text);outline:none;font-family:'Inter',sans-serif;transition:.15s}
        .ai-in::placeholder{color:var(--text3)}
        .ai-in:focus{border-color:var(--teal2);box-shadow:0 0 0 3px rgba(0,229,192,.07)}
        .ai-result-box{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:16px;margin-top:16px;font-size:13px;color:var(--text2);line-height:1.8;white-space:pre-wrap;font-weight:500}
        .ai-score-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;margin-bottom:10px}
        /* Intelligence */
        .intel-view{display:flex;flex-direction:column;flex:1;overflow:hidden}
        .intel-hd{padding:14px 20px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0}
        .intel-hd h2{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:800;color:var(--text);letter-spacing:-.2px;margin-bottom:2px}
        .intel-hd p{font-size:11px;color:var(--text3);font-weight:500}
        .intel-search{padding:12px 20px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;display:flex;gap:10px;align-items:center}
        .intel-body{flex:1;overflow-y:auto;padding:20px 24px}
        .intel-card{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:20px;margin-bottom:14px}
        .intel-card h3{font-family:'Bricolage Grotesque',sans-serif;font-size:12px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
        .intel-item{display:flex;gap:9px;padding:5px 0;font-size:12px;color:var(--text2);line-height:1.6;font-weight:500;border-bottom:1px solid rgba(26,31,58,.5)}
        .intel-item:last-child{border-bottom:none}
        .intel-item::before{content:'→';color:var(--teal);font-weight:800;flex-shrink:0;margin-top:1px}

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
            <button className="pw-x" onClick={() => setShowPaywall(false)}>×</button>

            {/* Left — value prop */}
            <div className="pw-left">
              <div className="pw-tag">🗓 Free Consultation</div>
              <h2>Book a 30-Min Strategy Call with Our Team</h2>
              <p>Get a personalized walkthrough of RepReach and leave with a clear plan to land more retail meetings — no pitch, just real value.</p>
              <div className="pw-stats">
                {[["500+","Reps"],["94%","Satisfaction"],["30 min","Session"]].map(([v,l])=>(
                  <div key={l} className="pw-stat"><div className="pw-stat-val">{v}</div><div className="pw-stat-label">{l}</div></div>
                ))}
              </div>
              <div className="pw-benefits">
                {[
                  {icon:"🎯",title:"Tailored to Your Market",desc:"We review your retailers and product line before the call."},
                  {icon:"🤖",title:"Live AI Demo",desc:"See RepReach generate buyer lists and pitch emails in real time."},
                  {icon:"📈",title:"Pipeline Audit",desc:"Walk away with a clear action plan to improve conversion."},
                  {icon:"🔒",title:"Zero Pressure",desc:"No sales tactics. This call is purely educational."},
                ].map(b=>(
                  <div key={b.title} className="pw-benefit">
                    <div className="pw-benefit-icon">{b.icon}</div>
                    <div><div className="pw-benefit-title">{b.title}</div><div className="pw-benefit-desc">{b.desc}</div></div>
                  </div>
                ))}
              </div>
              <div className="pw-review">
                <div className="pw-stars">★★★★★</div>
                <div className="pw-review-text">"The strategy call alone gave me three ideas I implemented that week. Booked two meetings within days."</div>
                <div className="pw-review-author">Marcus T. — Field Sales Rep, CPG Brand</div>
              </div>
              <div className="pw-divider" style={{marginTop:16}}>— already have access? —</div>
              <div className="code-wrap">
                <input className="code-in" placeholder="Access code" value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter"){ accessCode.trim()===ACCESS_CODE?(setIsSubscribed(true),setShowPaywall(false),setCodeError("")):setCodeError("Invalid code."); }}} />
                <button className="btn btn-teal" onClick={() => { accessCode.trim()===ACCESS_CODE?(setIsSubscribed(true),setShowPaywall(false),setCodeError("")):setCodeError("Invalid code."); }}>Apply</button>
              </div>
              {codeError && <div className="err">{codeError}</div>}
            </div>

            {/* Right — Calendly widget */}
            <div className="pw-right">
              <div className="pw-right-hd">
                <div className="pw-right-dot"/>
                <div className="pw-right-title">Choose a Time That Works for You</div>
                <div className="pw-right-sub">Your local timezone</div>
              </div>
              <CalendlyWidget />
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
              {id:"dashboard",  icon:"⬛", label:"Dashboard"},
              {id:"pipeline",   icon:"📊", label:"Sales Pipeline"},
              {id:"simulator",  icon:"🎯", label:"Pitch Simulator"},
              {id:"readiness",  icon:"✅", label:"Retail Readiness"},
              {id:"documents",  icon:"📁", label:"Documents"},
              {id:"meetings",   icon:"📅", label:"Meeting Prep"},
              {id:"coach",      icon:"🤖", label:"AI Sales Coach"},
              {id:"consulting", icon:"🏆", label:"Consulting"},
              {id:"settings",   icon:"⚙", label:"Settings"},
            ].map(n => (
              <div key={n.id} className={`sb-item ${view===n.id?"on":""}`} onClick={() => setView(n.id)}>
                <span className="sb-item-icon">{n.icon}</span> {n.label}
                {n.id==="simulator" && <span style={{marginLeft:"auto",fontSize:9,fontWeight:800,color:"var(--teal)",background:"rgba(0,229,192,.12)",border:"1px solid rgba(0,229,192,.2)",borderRadius:20,padding:"1px 7px",letterSpacing:".04em"}}>NEW</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div className="right">
          <div className="topbar">
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
              <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:15,color:"var(--text)",letterSpacing:"-.2px"}}>The Retail Sales Operating System</div>
            </div>
            <div className="topbar-right">
              {isSubscribed
                ? <span className="pro-badge">✓ Pro Active</span>
                : <button className="btn btn-teal btn-sm" onClick={() => setShowPaywall(true)}>📆 Book a Consultation</button>
              }
            </div>
          </div>

          <div className="sr">
            <div className="sf"><label>Your Name</label><input placeholder="Jamie" value={repName} onChange={e=>setRepName(e.target.value)} style={{width:100}} /></div>
            <div className="sf"><label>Brand *</label><input placeholder="NutriBlend" value={brandName} onChange={e=>setBrandName(e.target.value)} style={{width:120}} /></div>
            <div className="sf"><label>Product</label><input placeholder="e.g. Protein bars" value={productDesc} onChange={e=>setProductDesc(e.target.value)} style={{width:140}} /></div>
          </div>

          <div className="content">
            <div className="main">

              {view === "dashboard" ? (
                /* ── DASHBOARD ── */
                <div className="view-wrap">
                  <div className="view-hd">
                    <h2>Welcome back{repName ? ", "+repName : ""} 👋</h2>
                    <p>Your retail sales command center — manage opportunities, prep for meetings, and close more deals.</p>
                  </div>

                  {/* KPI row */}
                  <div className="stat-grid" style={{marginBottom:24}}>
                    {[
                      {label:"Active Opportunities",val:"0",sub:"in pipeline",color:"var(--teal)"},
                      {label:"Meetings This Week",val:"0",sub:"scheduled",color:"#a78bfa"},
                      {label:"Pitch Sim Sessions",val:"0",sub:"completed",color:"var(--amber)"},
                      {label:"Retail Readiness",val:"—",sub:"score pending",color:"#4ade80"},
                    ].map((k,i) => (
                      <div key={i} className="stat-card">
                        <div className="stat-card-val" style={{color:k.color}}>{k.val}</div>
                        <div className="stat-card-label">{k.label}</div>
                        <div style={{fontSize:10,color:"var(--text3)",marginTop:3}}>{k.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:10,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Quick Actions</div>
                    <div className="card-grid">
                      {[
                        {icon:"🎯",title:"Run a Pitch Simulation",desc:"Practice a real buyer meeting with AI. Get scored and coached.",cta:"Start Simulator →",color:"rgba(0,229,192,.08)",border:"rgba(0,229,192,.18)",view:"simulator"},
                        {icon:"📅",title:"Prepare for a Meeting",desc:"Generate a buyer brief, agenda, and talking points before your next call.",cta:"Prep Meeting →",color:"rgba(167,139,250,.06)",border:"rgba(167,139,250,.15)",view:"meetings"},
                        {icon:"✅",title:"Check Retail Readiness",desc:"Score your packaging, pricing, compliance, and logistics readiness.",cta:"Run Assessment →",color:"rgba(74,222,128,.06)",border:"rgba(74,222,128,.15)",view:"readiness"},
                        {icon:"📊",title:"Update Your Pipeline",desc:"Track active retail opportunities and deal stages.",cta:"Open Pipeline →",color:"rgba(245,166,35,.06)",border:"rgba(245,166,35,.15)",view:"pipeline"},
                      ].map((c,i) => (
                        <div key={i} className="feat-card" style={{background:c.color,borderColor:c.border}} onClick={()=>setView(c.view)}>
                          <div className="feat-card-icon" style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.06)"}}>{c.icon}</div>
                          <h3>{c.title}</h3>
                          <p>{c.desc}</p>
                          <div className="feat-card-cta" style={{color:"var(--teal)"}}>{c.cta}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Getting started strip */}
                  {!brandName && (
                    <div style={{background:"linear-gradient(135deg,rgba(0,229,192,.07),rgba(0,107,255,.05))",border:"1px solid rgba(0,229,192,.16)",borderRadius:14,padding:"20px 22px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                      <span style={{fontSize:24}}>⚡</span>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:3}}>Set up your brand to unlock all features</div>
                        <div style={{fontSize:12,color:"var(--text3)"}}>Enter your name, brand, and product in the settings bar above to personalize every AI output.</div>
                      </div>
                    </div>
                  )}
                </div>

              ) : view === "pipeline" ? (
                /* ── SALES PIPELINE ── */
                <div className="view-wrap">
                  <div className="view-hd"><h2>Sales Pipeline</h2><p>Track retail opportunities from first contact to closed deal.</p></div>
                  <div className="kanban">
                    {STAGES.slice(0,5).map(stage => {
                      const deals = pipeline.filter(d=>d.stage===stage);
                      return (
                        <div key={stage} className="k-col">
                          <div className="k-col-hd">
                            <div className="k-col-dot" style={{background:STAGE_COLORS[stage]}}/>
                            <div className="k-col-label">{stage}</div>
                            <div className="k-col-count" style={{background:STAGE_COLORS[stage]+"22",color:STAGE_COLORS[stage]}}>{deals.length}</div>
                          </div>
                          {deals.map(deal => (
                            <div key={deal.id} className="k-card">
                              <div style={{fontWeight:700,fontSize:12,color:"var(--text)",marginBottom:4}}>{deal.account}</div>
                              <div style={{fontSize:11,color:"var(--text3)",marginBottom:6}}>{deal.category}</div>
                              <select style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 7px",fontSize:11,color:"var(--text2)",outline:"none"}}
                                value={deal.stage} onChange={e=>setPipeline(prev=>prev.map(d=>d.id===deal.id?{...d,stage:e.target.value}:d))}>
                                {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          ))}
                          <button className="btn btn-outline btn-sm" style={{width:"100%",justifyContent:"center",marginTop:4,fontSize:11}}
                            onClick={()=>{const name=prompt("Account name:");if(name)setPipeline(prev=>[...prev,{id:Date.now(),account:name,stage,category:"",value:"$0",lastContact:"—",notes:""}]);}}>
                            + Add Deal
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

              ) : view === "simulator" ? (
                /* ── SALES PITCH SIMULATOR ── */
                <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                  <div className="ai-view-hd">
                    <div className="ai-view-hd-top"><span style={{fontSize:15}}>🎯</span><h2>Sales Pitch Simulator</h2><span className="cs-badge" style={{marginLeft:8,marginBottom:0}}>FLAGSHIP</span></div>
                    <p>Practice a real buyer meeting with AI. Get scored and coached after every session.</p>
                    <div style={{height:10}}/>
                  </div>

                  {simStep==="setup" && (
                    <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
                      <div style={{maxWidth:640,margin:"0 auto"}}>
                        <div style={{background:"linear-gradient(135deg,rgba(0,229,192,.07),rgba(0,107,255,.05))",border:"1px solid rgba(0,229,192,.16)",borderRadius:16,padding:"22px 24px",marginBottom:22}}>
                          <div style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:16,color:"var(--text)",marginBottom:6}}>Configure Your Simulation</div>
                          <div style={{fontSize:12,color:"var(--text3)",lineHeight:1.65}}>The AI will roleplay as a real buyer at your target retailer. Choose your scenario and difficulty — then pitch like your shelf space depends on it.</div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                          <div>
                            <div className="ai-field-label">Target Retailer *</div>
                            <select className="ai-in" value={simRetailer} onChange={e=>setSimRetailer(e.target.value)}>
                              <option value="">Select retailer...</option>
                              {["Walmart","Target","Costco","Sam's Club","Kroger","Whole Foods","Trader Joe's","Home Depot","Lowe's","CVS","Walgreens","Aldi","Publix","HEB","Meijer"].map(r=><option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div>
                            <div className="ai-field-label">Product Category *</div>
                            <select className="ai-in" value={simCategory} onChange={e=>setSimCategory(e.target.value)}>
                              <option value="">Select category...</option>
                              {["Snacks & Chips","Beverages","Health & Wellness","Frozen Foods","Dairy","Personal Care","Household","Supplements","Pet Food","Baby Products","Sporting Goods","Outdoor & Garden","Electronics","Cleaning Products","Organic & Natural"].map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <div className="ai-field-label">Buyer Type</div>
                            <select className="ai-in" value={simBuyerType} onChange={e=>setSimBuyerType(e.target.value)}>
                              <option value="">Category Buyer (default)</option>
                              {["Category Buyer","Category Manager","VP of Merchandising","Senior Buyer","DMM","Regional Buyer"].map(b=><option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                          <div>
                            <div className="ai-field-label">Meeting Difficulty</div>
                            <select className="ai-in" value={simDifficulty} onChange={e=>setSimDifficulty(e.target.value)}>
                              {["Easy","Medium","Hard","Expert"].map(d=>(
                                <option key={d} value={d}>{d}{d==="Expert"?" — Wall Street of Retail":d==="Hard"?" — Skeptical buyer":d==="Medium"?" — Standard meeting":""}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button className="btn btn-teal" style={{width:"100%",justifyContent:"center",paddingTop:14,paddingBottom:14,fontSize:14}}
                          disabled={!simRetailer||!simCategory} onClick={startSimulator}>
                          🎯 Start Simulation — {simRetailer||"Select retailer"} {simCategory?"· "+simCategory:""}
                        </button>
                        <div style={{display:"flex",gap:10,marginTop:18,flexWrap:"wrap"}}>
                          {[
                            {r:"Walmart",c:"Snacks & Chips",b:"Category Buyer",d:"Hard"},
                            {r:"Costco",c:"Beverages",b:"Senior Buyer",d:"Expert"},
                            {r:"Whole Foods",c:"Organic & Natural",b:"Category Manager",d:"Medium"},
                          ].map((preset,i)=>(
                            <button key={i} className="qp" onClick={()=>{setSimRetailer(preset.r);setSimCategory(preset.c);setSimBuyerType(preset.b);setSimDifficulty(preset.d);}}>
                              {preset.r} · {preset.c} · {preset.d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {simStep==="running" && (
                    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                      <div style={{padding:"10px 20px",background:"var(--bg3)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,fontSize:12,flexShrink:0}}>
                        <span style={{fontWeight:700,color:"var(--teal)"}}>{simRetailer} · {simBuyerType||"Category Buyer"}</span>
                        <span style={{color:"var(--text3)"}}>|</span>
                        <span style={{color:"var(--text3)"}}>{simCategory}</span>
                        <span style={{color:"var(--text3)"}}>|</span>
                        <span className={`obj-badge obj-badge-${simDifficulty.toLowerCase()}`}>{simDifficulty}</span>
                        <button className="btn btn-outline btn-sm" style={{marginLeft:"auto",fontSize:10}} onClick={()=>{stopBuyerSpeech();stopSimVoice();scoreSimulation(simMessages);}}>End &amp; Score Session</button>
                      </div>
                      <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:12}}>
                        {simMessages.map((m,i)=>(
                          <div key={i} style={{display:"flex",flexDirection:m.role==="buyer"?"row":"row-reverse",gap:10,alignItems:"flex-start"}}>
                            <div style={{width:32,height:32,borderRadius:"50%",background:m.role==="buyer"?"rgba(245,166,35,.15)":"var(--teal-dim)",border:`1px solid ${m.role==="buyer"?"rgba(245,166,35,.25)":"rgba(0,229,192,.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                              {m.role==="buyer"?"🏪":"👤"}
                            </div>
                            <div style={{maxWidth:"72%",background:m.role==="buyer"?"var(--bg3)":"rgba(0,229,192,.06)",border:`1px solid ${m.role==="buyer"?"var(--border)":"rgba(0,229,192,.14)"}`,borderRadius:12,padding:"10px 14px",fontSize:13,color:"var(--text2)",lineHeight:1.7}}>
                              <div style={{fontSize:9,fontWeight:800,color:m.role==="buyer"?"var(--amber)":"var(--teal)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>{m.role==="buyer"?simRetailer+" Buyer":"You"}</div>
                              {m.text}
                            </div>
                          </div>
                        ))}
                        {simBusy && <div style={{display:"flex",gap:10,alignItems:"center"}}><div className="spin"/><span style={{fontSize:12,color:"var(--text3)"}}>Buyer is responding...</span></div>}
                      </div>
                      <div style={{padding:"12px 16px",borderTop:"1px solid var(--border)",background:"var(--bg2)",flexShrink:0}}>
                        {/* Voice status bar */}
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <button
                            className={`rec-btn ${simIsRecording?"rec-active":"rec-idle"}`}
                            style={{flex:"0 0 auto"}}
                            onClick={simIsRecording ? stopSimVoice : startSimVoice}
                            disabled={simBusy}>
                            {simIsRecording
                              ? <><span style={{width:8,height:8,borderRadius:"50%",background:"#f87171",display:"inline-block",flexShrink:0}}/>Stop Speaking</>
                              : <>🎙 Speak Your Response</>}
                          </button>
                          <button
                            title={simVoiceEnabled?"Mute buyer voice":"Unmute buyer voice"}
                            className="btn btn-outline btn-sm"
                            style={{fontSize:14,padding:"4px 10px"}}
                            onClick={()=>{ setSimVoiceEnabled(v=>!v); if(simVoiceEnabled) stopBuyerSpeech(); }}>
                            {simVoiceEnabled ? "🔊" : "🔇"}
                          </button>
                          {simIsRecording && <span className="pulsing" style={{fontSize:11,color:"#f87171",fontWeight:700}}>● Recording — speak now</span>}
                        </div>
                        {/* Text fallback */}
                        <div style={{display:"flex",gap:8}}>
                          <textarea className="ai-in" style={{flex:1,resize:"none",minHeight:40}} rows={2}
                            placeholder="Or type your response here... (Enter to send)"
                            value={simUserInput}
                            onChange={e=>setSimUserInput(e.target.value)}
                            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(simIsRecording)stopSimVoice();sendSimMessage();}}} />
                          <button className="btn btn-teal" disabled={simBusy||!simUserInput.trim()} onClick={()=>{if(simIsRecording)stopSimVoice();sendSimMessage();}} style={{alignSelf:"flex-end"}}>
                            Send →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {simStep==="done" && (
                    <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
                      <div style={{maxWidth:680,margin:"0 auto"}}>
                        {simBusy ? (
                          <div className="empty"><span className="spin spin-lg"/><h3 style={{marginTop:18}}>Scoring your simulation...</h3></div>
                        ) : simScore && (<>
                          <div style={{textAlign:"center",marginBottom:24}}>
                            <div style={{fontSize:11,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Session Score</div>
                            <div className="score-num" style={{fontSize:72,color:simScore.score>=8?"#4ade80":simScore.score>=6?"#fb923c":"#f87171"}}>{simScore.score}<span style={{fontSize:28,color:"var(--text3)",fontWeight:600}}>/10</span></div>
                            <div style={{fontSize:13,color:"var(--text2)",marginTop:8,lineHeight:1.65,maxWidth:480,margin:"8px auto 0"}}>{simScore.summary}</div>
                          </div>
                          {[
                            {label:"Weaknesses to Address",items:simScore.weaknesses,color:"#f87171",icon:"⚠"},
                            {label:"Coaching Recommendations",items:simScore.coaching,color:"var(--teal)",icon:"💡"},
                            {label:"Likely Buyer Objections — Prepare These",items:simScore.objections,color:"var(--amber)",icon:"🛡"},
                          ].map((sec,i)=>sec.items?.length>0&&(
                            <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:12,padding:"18px 20px",marginBottom:12}}>
                              <div style={{fontSize:10,fontWeight:800,color:sec.color,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>{sec.icon} {sec.label}</div>
                              {sec.items.map((item,j)=>(
                                <div key={j} style={{display:"flex",gap:9,padding:"6px 0",borderBottom:j<sec.items.length-1?"1px solid rgba(26,31,58,.5)":"none",fontSize:12,color:"var(--text2)",lineHeight:1.65}}>
                                  <span style={{color:sec.color,fontWeight:800,flexShrink:0}}>→</span>{item}
                                </div>
                              ))}
                            </div>
                          ))}
                          <div style={{display:"flex",gap:10,marginTop:8}}>
                            <button className="btn btn-teal" style={{flex:1,justifyContent:"center"}} onClick={()=>{stopBuyerSpeech();stopSimVoice();setSimStep("setup");setSimScore(null);setSimMessages([]);setSimUserInput("");}}>🔄 Run Another Simulation</button>
                            <button className="btn btn-outline btn-sm" onClick={()=>setView("coach")}>Get Coaching →</button>
                          </div>
                        </>)}
                      </div>
                    </div>
                  )}
                </div>

              ) : view === "practice" ? (
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
              ) : view === "aitools" ? (
                /* ── AI TOOLS ── */
                <div className="ai-view">
                  <div className="ai-view-hd">
                    <div className="ai-view-hd-top"><span style={{fontSize:15}}>🤖</span><h2>AI Tools</h2></div>
                    <p>AI-powered sales assets</p>
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
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}><span style={{fontSize:14}}>⚡</span><span style={{fontFamily:"'Bricolage Grotesque',sans-serif",fontWeight:800,fontSize:15,color:"var(--text)"}}>Sequences</span></div>
                      <div style={{fontSize:11,color:"var(--text3)",fontWeight:500}}>Automated multi-step outreach</div>
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
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}><span style={{fontSize:14}}>🧠</span><h2>Intelligence</h2></div>
                    <p>AI-powered retailer &amp; buyer research</p>
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
                        <h3>Retailer Intelligence</h3>
                        <p>Enter any retailer or buyer name to get AI-powered insights: vendor policies, buying priorities, category focus, and tips for getting the meeting.</p>
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
                    <div className="ai-view-hd-top"><span style={{fontSize:15}}>🚀</span><h2>Enablement</h2></div>
                    <p>Sales resources and AI-generated assets to help you close more deals</p>
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

              ) : view === "readiness" ? (
                /* ── RETAIL READINESS CENTER ── */
                <div className="view-wrap">
                  <div className="view-hd"><h2>Retail Readiness Center</h2><p>Assess how ready your brand is to land and keep retail shelf space.</p></div>
                  {!readinessScore ? (
                    <>
                      <div style={{maxWidth:640}}>
                        {READINESS_QUESTIONS.map(q => (
                          <div key={q.id} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:10}}>
                            <div style={{fontSize:10,fontWeight:800,color:"var(--teal)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>{q.cat} · {q.weight} pts</div>
                            <div style={{fontSize:13,color:"var(--text)",marginBottom:12,lineHeight:1.6}}>{q.q}</div>
                            <div style={{display:"flex",gap:8}}>
                              {["yes","partial","no"].map(opt=>(
                                <button key={opt} className={`btn btn-sm ${readinessAnswers[q.id]===opt?"btn-teal":"btn-outline"}`}
                                  onClick={()=>setReadinessAnswers(p=>({...p,[q.id]:opt}))}>
                                  {opt.charAt(0).toUpperCase()+opt.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button className="btn btn-teal" style={{width:"100%",justifyContent:"center",marginTop:8}}
                          disabled={readinessBusy || Object.keys(readinessAnswers).length < READINESS_QUESTIONS.length}
                          onClick={genReadinessReport}>
                          {readinessBusy?<><span className="spin"/>Analyzing...</>:"⚡ Get My Readiness Score"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{maxWidth:580}}>
                      <div style={{textAlign:"center",marginBottom:24,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:16,padding:"28px"}}>
                        <div style={{fontSize:11,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Retail Readiness Score</div>
                        <div className="score-num" style={{fontSize:72,color:readinessScore.score>=75?"#4ade80":readinessScore.score>=50?"var(--amber)":"#f87171"}}>{readinessScore.score}<span style={{fontSize:28,color:"var(--text3)",fontWeight:600}}>/100</span></div>
                        <div style={{fontSize:13,color:"var(--text2)",marginTop:8}}>{readinessScore.score>=75?"Strong retail readiness — ready to pitch major retailers.":readinessScore.score>=50?"Moderate readiness — address gaps before major pitches.":"Low readiness — focus on fundamentals first."}</div>
                        <div className="score-bar-bg" style={{marginTop:16,height:12}}>
                          <div className="score-bar-fill" style={{width:`${readinessScore.score}%`,background:readinessScore.score>=75?"linear-gradient(90deg,#4ade80,var(--teal))":readinessScore.score>=50?"linear-gradient(90deg,var(--amber),#fb923c)":"linear-gradient(90deg,#f87171,#ef4444)"}}/>
                        </div>
                      </div>
                      {readinessScore.actions?.length>0 && (
                        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:12,padding:"18px 20px",marginBottom:14}}>
                          <div style={{fontSize:10,fontWeight:800,color:"var(--teal)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>💡 Priority Action Items</div>
                          {readinessScore.actions.map((a,i)=>(
                            <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:i<readinessScore.actions.length-1?"1px solid rgba(26,31,58,.5)":"none",fontSize:12,color:"var(--text2)",lineHeight:1.65}}>
                              <span style={{color:"var(--teal)",fontWeight:800,flexShrink:0}}>{i+1}.</span>{a}
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={()=>{setReadinessScore(null);setReadinessAnswers({});}}>Retake Assessment</button>
                    </div>
                  )}
                </div>

              ) : view === "documents" ? (
                /* ── DOCUMENTS & PRESENTATIONS ── */
                <div className="view-wrap">
                  <div className="view-hd"><h2>Documents &amp; Presentations</h2><p>Build and store your retail sales assets — pitch decks, sell sheets, line sheets, and more.</p></div>
                  <div className="card-grid">
                    {[
                      {icon:"📊",title:"Sell Sheet Builder",desc:"Generate all copy for a one-page sell sheet in seconds — headline, benefits, velocity stats, retailer value prop.",cta:"Build Sell Sheet",action:()=>{setView("coach");setTimeout(()=>setEnabTab("sellsheet"),50);}},
                      {icon:"🎙",title:"Pitch Templates",desc:"Proven pitch structures for cold calls, trade shows, Zoom demos, broker intros, and follow-up meetings.",cta:"Get Templates",action:()=>{setView("coach");setTimeout(()=>setEnabTab("pitchtpl"),50);}},
                      {icon:"📘",title:"Sales Playbook",desc:"AI-generated tactical playbook for landing shelf space at your target retailers.",cta:"Generate Playbook",action:()=>{setView("coach");setTimeout(()=>setEnabTab("playbook"),50);}},
                      {icon:"📞",title:"Call Scripts",desc:"Cold call scripts tailored to your brand and the buyer's context.",cta:"Generate Script",action:()=>{setView("coach");setTimeout(()=>setAiTab("callscript"),50);}},
                      {icon:"💡",title:"Value Propositions",desc:"Three buyer-focused value prop statements for your brand.",cta:"Generate Props",action:()=>{setView("coach");setTimeout(()=>setAiTab("value"),50);}},
                      {icon:"⚡",title:"Outreach Sequences",desc:"Multi-step outreach sequences with emails and LinkedIn touches for any buyer type.",cta:"Build Sequence",action:()=>{setView("sequences");}},
                    ].map((c,i)=>(
                      <div key={i} className="feat-card" onClick={c.action}>
                        <div className="feat-card-icon" style={{background:"var(--bg3)",border:"1px solid var(--border)"}}>{c.icon}</div>
                        <h3>{c.title}</h3>
                        <p>{c.desc}</p>
                        <div className="feat-card-cta" style={{color:"var(--teal)"}}>{c.cta} →</div>
                      </div>
                    ))}
                  </div>
                </div>

              ) : view === "meetings" ? (
                /* ── MEETING PREPARATION ── */
                <div className="meet-layout">
                  {/* Contact entry */}
                  <div className="meet-list">
                    <div className="meet-list-hd">Meeting Contact</div>
                    <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                      <input className="sb-in" placeholder="Buyer name *" value={meetContactName} onChange={e=>setMeetContactName(e.target.value)} />
                      <input className="sb-in" placeholder="Title (optional)" value={meetContactTitle} onChange={e=>setMeetContactTitle(e.target.value)} />
                      <input className="sb-in" placeholder="Retailer (optional)" value={meetContactCo} onChange={e=>setMeetContactCo(e.target.value)} />
                      <button className="btn btn-teal btn-sm" style={{justifyContent:"center"}} disabled={!meetContactName.trim()} onClick={startMeeting}>
                        ⚡ Generate Brief
                      </button>
                    </div>
                  </div>
                  {/* Tools panel */}
                  <div className="meet-tools">
                    {!meetContact ? (
                      <div className="empty">
                        <div className="empty-icon">📅</div>
                        <h3>Enter a meeting contact</h3>
                        <p>Fill in the buyer's name on the left and generate a full meeting brief, agenda, notes, and follow-up email.</p>
                      </div>
                    ) : (<>
                      <div className="meet-tabs">
                        {[{id:"brief",label:"📋 Brief"},{id:"research",label:"🔭 Research"},{id:"agenda",label:"🗓 Agenda"},{id:"notes",label:"📝 Notes"},{id:"followup",label:"📤 Follow-up"}].map(t=>(
                          <button key={t.id} className={`meet-tab ${meetTab===t.id?"on":""}`} onClick={()=>setMeetTab(t.id)}>{t.label}</button>
                        ))}
                        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",padding:"0 4px"}}>
                          <span style={{fontSize:12,fontWeight:700,color:"var(--teal)"}}>{meetContact.name}{meetContact.retailer?" · "+meetContact.retailer:""}</span>
                        </div>
                      </div>
                      <div className="meet-content">
                        {meetTab==="research" && (<>
                          <div style={{fontSize:10,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>🔭 Retailer Intelligence Research</div>
                          <div style={{display:"flex",gap:10,marginBottom:14}}>
                            <input className="ai-in" style={{flex:1}} placeholder={`Research ${meetContact.retailer||"this retailer"}...`}
                              value={intelQuery} onChange={e=>setIntelQuery(e.target.value)}
                              onKeyDown={e=>e.key==="Enter"&&runIntelResearch()} />
                            <button className="btn btn-teal" disabled={intelBusy||!intelQuery.trim()} onClick={runIntelResearch}>
                              {intelBusy?<><span className="spin"/>...</>:"Research"}
                            </button>
                          </div>
                          {!intelResult && !intelBusy && meetContact.retailer && (
                            <button className="btn btn-outline btn-sm" onClick={()=>{setIntelQuery(meetContact.retailer);setTimeout(runIntelResearch,100);}}>
                              🔭 Auto-research {meetContact.retailer}
                            </button>
                          )}
                          {intelBusy && <div className="empty" style={{minHeight:150}}><span className="spin spin-lg"/><p style={{marginTop:12}}>Researching {intelQuery}...</p></div>}
                          {intelResult && !intelBusy && (
                            <>
                              <div className="intel-card" style={{borderColor:"rgba(0,229,192,.12)"}}><h3>Overview</h3><div style={{fontSize:12,color:"var(--text2)",lineHeight:1.75}}>{intelResult.summary}</div></div>
                              {intelResult.priorities?.length>0 && <div className="intel-card"><h3>Buying Priorities</h3>{intelResult.priorities.map((p,i)=><div key={i} className="intel-item">{p}</div>)}</div>}
                              {intelResult.tips?.length>0 && <div className="intel-card" style={{borderColor:"rgba(0,229,192,.12)"}}><h3>Tips for Getting the Meeting</h3>{intelResult.tips.map((t,i)=><div key={i} className="intel-item">{t}</div>)}</div>}
                            </>
                          )}
                        </>)}
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
                          </>) : <div className="empty" style={{minHeight:200}}><p>Enter a contact and generate their brief.</p></div>
                        )}
                        {meetTab==="agenda" && (<>
                          <button className="btn btn-teal" style={{width:"100%",justifyContent:"center",marginBottom:14}} disabled={agendaBusy} onClick={genAgenda}>
                            {agendaBusy?<><span className="spin"/>Building Agenda...</>:"⚡ Generate 30-Min Agenda"}
                          </button>
                          {agendaResult && <><div className="ai-result-box">{agendaResult}</div><button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(agendaResult,"agenda")}>{copied==="agenda"?"✓ Copied":"Copy Agenda"}</button></>}
                        </>)}
                        {meetTab==="notes" && (<>
                          <div style={{fontSize:10,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Meeting Notes</div>
                          <textarea className="pitch-ta" style={{minHeight:200}} placeholder="Take notes during the meeting here..." value={meetNotes} onChange={e=>setMeetNotes(e.target.value)} />
                          <button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(meetNotes,"notes")}>{copied==="notes"?"✓ Copied":"Copy Notes"}</button>
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

              ) : view === "intelligence" ? null

              : view === "coach" ? (
                /* ── AI SALES COACH (merges AI Tools + Enablement) ── */
                <div className="enab-view">
                  <div className="ai-view-hd">
                    <div className="ai-view-hd-top"><span style={{fontSize:15}}>🤖</span><h2>AI Sales Coach</h2></div>
                    <p>AI trained to think like a retail sales executive. Improve pitches, pricing, and closing strategies.</p>
                    <div className="ai-tabs">
                      {[
                        {id:"pitch",icon:"🎤",label:"Pitch Builder"},
                        {id:"objection",icon:"🛡",label:"Objection Handler"},
                        {id:"callscript",icon:"📞",label:"Call Script"},
                        {id:"value",icon:"💡",label:"Value Props"},
                        {id:"subject",icon:"✉",label:"Subject Tester"},
                        {id:"playbook",icon:"📘",label:"Playbook"},
                        {id:"pitchtpl",icon:"🎙",label:"Pitch Templates"},
                        {id:"sellsheet",icon:"📊",label:"Sell Sheet"},
                        {id:"objlib",icon:"🎯",label:"Objection Library"},
                      ].map(t=>(
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
                      <textarea className="ai-in pitch-ta" placeholder='e.g. "Your margins are too thin for us to make money on this."' rows={3} value={objInput} onChange={e=>setObjInput(e.target.value)} />
                      <button className="btn btn-teal" style={{marginTop:14,width:"100%",justifyContent:"center"}} disabled={objBusy||!objInput.trim()} onClick={genObjHandler}>
                        {objBusy?<><span className="spin"/>Generating...</>:"⚡ Generate Response"}
                      </button>
                      {objRes && <><div className="ai-result-box">{objRes}</div><button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>copy(objRes,"obj")}>{copied==="obj"?"✓ Copied":"Copy Response"}</button></>}
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
                    {aiTab === "subject" && (<>
                      <div className="ai-panel-title">✉ Subject Line Tester</div>
                      <div className="ai-panel-sub">Score your subject line and get 3 stronger alternatives</div>
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
                          {(subjRes.alternatives||[]).map((a,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,marginBottom:7,fontSize:12,color:"var(--text2)"}}>
                              <span style={{flex:1}}>{a}</span>
                              <button className="dp-copy" onClick={()=>copy(a,"subj"+i)}>{copied==="subj"+i?"✓":"Copy"}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>)}
                    {aiTab==="playbook" && (<>
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
                        </div>
                      )}
                    </>)}
                    {aiTab==="pitchtpl" && (<>
                      <div className="ai-panel-title">🎙 Pitch Templates</div>
                      <div className="ai-panel-sub">Proven pitch structures for every sales scenario</div>
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
                    {aiTab==="sellsheet" && (<>
                      <div className="ai-panel-title">📊 Sell Sheet Builder</div>
                      <div className="ai-panel-sub">Generate all copy for a one-page sell sheet in seconds</div>
                      <button className="btn btn-teal" style={{width:"100%",justifyContent:"center"}} disabled={sellSheetBusy} onClick={genSellSheet}>
                        {sellSheetBusy?<><span className="spin"/>Building...</>:"⚡ Generate Sell Sheet"}
                      </button>
                      {sellSheetResult && (
                        <div style={{marginTop:16}}>
                          {[{label:"Headline",val:sellSheetResult.headline},{label:"Subheadline",val:sellSheetResult.subheadline},{label:"Product Description",val:sellSheetResult.productDescription},{label:"Target Consumer",val:sellSheetResult.targetConsumer},{label:"Velocity / Stats",val:sellSheetResult.velocityStats},{label:"Retailer Benefits",val:sellSheetResult.retailerBenefits},{label:"Call to Action",val:sellSheetResult.callToAction}].map((row,i)=>row.val&&(
                            <div key={i} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:9,padding:"12px 14px",marginBottom:9}}>
                              <div style={{fontSize:9,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>{row.label}</div>
                              <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.65}}>{row.val}</div>
                              <button className="dp-copy" style={{marginTop:6}} onClick={()=>copy(row.val,"ss"+i)}>{copied==="ss"+i?"✓":"Copy"}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>)}
                    {aiTab==="objlib" && (<>
                      <div className="ai-panel-title">🎯 Objection Library</div>
                      <div className="ai-panel-sub">Paste exactly what the buyer said — get a real, ready-to-use response</div>
                      <textarea className="ai-in pitch-ta" rows={3} placeholder={'e.g. "Your margins are too thin, we need at least 40%."'} value={objLibSearch} onChange={e=>setObjLibSearch(e.target.value)} />
                      <button className="btn btn-teal" style={{marginTop:14,width:"100%",justifyContent:"center"}} disabled={objLibBusy||!objLibSearch.trim()} onClick={genObjLibrary}>
                        {objLibBusy?<><span className="spin"/>Generating...</>:"⚡ Get My Response"}
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

              ) : view === "consulting" ? (
                /* ── CONSULTING SERVICES ── */
                (() => {
                  const [wReady, setWReady] = useState(false);
                  const [wErr, setWErr] = useState(false);
                  useState(() => {
                    if (document.getElementById("calendly-script")) { setWReady(true); return; }
                    const s = document.createElement("script");
                    s.id = "calendly-script"; s.src = "https://assets.calendly.com/assets/external/widget.js"; s.async = true;
                    s.onload = () => setWReady(true); s.onerror = () => setWErr(true);
                    document.head.appendChild(s);
                  });
                  return (
                    <div className="sch-wrap">
                      <div className="sch-hero">
                        <div className="sch-hero-tag">🏆 Premium Advisory</div>
                        <h1>Retail Growth Consulting</h1>
                        <p>Work directly with our retail growth experts to land shelf space, win buyer meetings, and scale distribution across major retailers. Premium strategic advisory for brands serious about retail.</p>
                        <div className="sch-stat-row" style={{maxWidth:420}}>
                          {[["500+","Brands Helped"],["94%","Client Satisfaction"],["$2M+","Revenue Generated"]].map(([v,l])=>(
                            <div key={l} className="sch-stat"><div className="sch-stat-val">{v}</div><div className="sch-stat-label">{l}</div></div>
                          ))}
                        </div>
                      </div>
                      <div className="sch-benefits">
                        {[
                          {icon:"🎯",title:"Retail Readiness Audits",desc:"Full review of packaging, pricing, compliance, and go-to-market strategy before your first buyer meeting."},
                          {icon:"📅",title:"Buyer Meeting Prep",desc:"We prepare you for specific buyer meetings — retailer research, talking points, objection prep, and role-play."},
                          {icon:"📈",title:"Strategic Advisory",desc:"Ongoing advisory for distribution strategy, category positioning, and retail expansion planning."},
                          {icon:"🤖",title:"Live AI Demo + Onboarding",desc:"Full platform onboarding with a custom AI configuration for your brand and product line."},
                        ].map(b=>(
                          <div key={b.title} className="sch-benefit">
                            <div className="sch-benefit-icon">{b.icon}</div>
                            <div><div className="sch-benefit-title">{b.title}</div><div className="sch-benefit-desc">{b.desc}</div></div>
                          </div>
                        ))}
                      </div>
                      <div className="sch-main">
                        <div className="sch-widget-box">
                          <div className="sch-widget-hd"><div className="sch-widget-dot"/><div className="sch-widget-title">Book a Free 30-Min Strategy Call</div><div className="sch-widget-sub">Your local timezone</div></div>
                          {wErr ? <div className="sch-error"><div className="sch-error-icon">⚠️</div><div>Could not load calendar. <a href="mailto:amaar@akronproductsinc.com" style={{color:"var(--teal)"}}>Email to schedule.</a></div></div>
                          : !wReady ? <div className="sch-loading"><div className="sch-spinner"/>Loading calendar…</div>
                          : <div className="calendly-inline-widget" data-url="https://calendly.com/amaar-akronproductsinc/30min" style={{minWidth:320,height:700}}/>}
                        </div>
                        <div className="sch-trust-col">
                          <div className="sch-trust-card">
                            <div className="sch-trust-hd">Client Results</div>
                            {[
                              {text:`"Strategy call alone gave me three ideas I implemented that week. Booked two meetings within days."`,author:"Marcus T. — CPG Sales Rep"},
                              {text:`"Left completely sold on the strategy. Extremely valuable 30 minutes."`,author:"Priya S. — National Sales Manager"},
                              {text:`"They reviewed my pitch before the call. I felt like they genuinely cared."`,author:"Jordan L. — Independent Sales Rep"},
                            ].map((r,i)=><div key={i} className="sch-review"><div className="sch-stars">★★★★★</div><div className="sch-review-text">{r.text}</div><div className="sch-review-author">{r.author}</div></div>)}
                          </div>
                          <div className="sch-cta-banner">
                            <h3>Ready to grow your retail sales?</h3>
                            <p>Most brands see measurable improvement in their first 30 days of working with us.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()

              ) : view === "settings" ? (
                /* ── SETTINGS ── */
                <div className="view-wrap">
                  <div className="view-hd"><h2>Settings</h2><p>Configure your account, brand profile, and integrations.</p></div>
                  <div style={{maxWidth:520}}>
                    <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:13,padding:"22px 24px",marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:16}}>Brand Profile</div>
                      {[{label:"Your Name",val:repName,set:setRepName,ph:"Jamie"},
                        {label:"Brand Name",val:brandName,set:setBrandName,ph:"NutriBlend"},
                        {label:"Product / Line Description",val:productDesc,set:setProductDesc,ph:"e.g. Protein bars with 20g protein, zero sugar"},
                      ].map((f,i)=>(
                        <div key={i} style={{marginBottom:14}}>
                          <div className="ai-field-label">{f.label}</div>
                          <input className="ai-in" placeholder={f.ph} value={f.val} onChange={e=>f.set(e.target.value)} />
                        </div>
                      ))}
                    </div>
                    <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:13,padding:"22px 24px",marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:16}}>Integrations</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                        {[
                          {icon:"✨",name:"Claude AI",bg:"#c87533",live:true},
                          {icon:"☁",name:"Salesforce",bg:"#00a1e0"},
                          {icon:"🔶",name:"HubSpot",bg:"#ff7a59"},
                          {icon:"📧",name:"Gmail",bg:"#ea4335"},
                          {icon:"📮",name:"Outlook",bg:"#0078d4"},
                          {icon:"📱",name:"LinkedIn Sales Nav",bg:"#0077b5"},
                        ].map((t,i)=>(
                          <div key={i} className="int-card" style={{padding:"12px 14px"}}>
                            <div className="int-logo" style={{background:t.bg+"22",border:`1px solid ${t.bg}33`,fontSize:18,width:34,height:34}}>{t.icon}</div>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:700,fontSize:12,color:"var(--text)",marginBottom:4}}>{t.name}</div>
                              {t.live ? <span className="int-status int-live">● Live</span>
                              : <button className="btn btn-outline btn-sm" style={{fontSize:10,padding:"2px 10px"}} onClick={()=>alert(`${t.name} coming soon.`)}>Connect</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:13,padding:"22px 24px"}}>
                      <div style={{fontSize:11,fontWeight:800,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Access</div>
                      {isSubscribed
                        ? <div style={{fontSize:13,color:"#4ade80",fontWeight:700}}>✓ Pro access active</div>
                        : <button className="btn btn-teal" onClick={()=>setShowPaywall(true)}>📆 Book a Consultation</button>}
                    </div>
                  </div>
                </div>

              ) : view === "integrations" ? (
                /* ── INTEGRATIONS ── */
                <div className="view-wrap">
                  <div className="view-hd"><h2>Integrations</h2><p>Connect RepReach to the tools your team already uses</p></div>
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

              ) : view === "schedule" ? (
                /* ── SCHEDULE A CONSULTATION ── */
                (() => {
                  const [widgetReady, setWidgetReady] = useState(false);
                  const [widgetError, setWidgetError] = useState(false);
                  const calendlyRef = useRef(null);

                  // Load Calendly script once
                  useState(() => {
                    if (document.getElementById("calendly-script")) {
                      setWidgetReady(true);
                      return;
                    }
                    const script = document.createElement("script");
                    script.id = "calendly-script";
                    script.src = "https://assets.calendly.com/assets/external/widget.js";
                    script.async = true;
                    script.onload = () => setWidgetReady(true);
                    script.onerror = () => setWidgetError(true);
                    document.head.appendChild(script);
                  });

                  return (
                    <div className="sch-wrap">
                      {/* Hero */}
                      <div className="sch-hero">
                        <div className="sch-hero-tag">🗓 Free Consultation</div>
                        <h1>Book a 30-Minute Strategy Call<br/>with Our Team</h1>
                        <p>Get a personalized walkthrough of RepReach and learn how top-performing sales reps are landing more retail meetings, crafting sharper outreach, and closing faster. No pitch. Just real value — guaranteed.</p>
                        <div className="sch-stat-row" style={{maxWidth:420}}>
                          {[["500+","Reps Onboarded"],["94%","Satisfaction Rate"],["30 min","Focused Session"]].map(([v,l])=>(
                            <div key={l} className="sch-stat"><div className="sch-stat-val">{v}</div><div className="sch-stat-label">{l}</div></div>
                          ))}
                        </div>
                      </div>

                      {/* Benefits row */}
                      <div className="sch-benefits">
                        {[
                          {icon:"🎯","title":"Tailored to Your Market","desc":"We review your target retailers and product line before the call so every minute is relevant."},
                          {icon:"🤖","title":"Live AI Demo","desc":"See RepReach generate buyer lists, pitch emails, and objection responses in real time for your brand."},
                          {icon:"📈","title":"Pipeline Audit","desc":"Walk away with a clear action plan to improve your outreach conversion rate immediately."},
                          {icon:"🔒","title":"No Commitment Required","desc":"Zero pressure. This call is purely educational — our job is to add value, not close a deal."},
                        ].map((b)=>(
                          <div key={b.title} className="sch-benefit">
                            <div className="sch-benefit-icon">{b.icon}</div>
                            <div><div className="sch-benefit-title">{b.title}</div><div className="sch-benefit-desc">{b.desc}</div></div>
                          </div>
                        ))}
                      </div>

                      {/* Main grid: widget + trust sidebar */}
                      <div className="sch-main">
                        {/* Calendly Widget */}
                        <div className="sch-widget-box">
                          <div className="sch-widget-hd">
                            <div className="sch-widget-dot"/>
                            <div className="sch-widget-title">Choose a Time That Works for You</div>
                            <div className="sch-widget-sub">All times in your local timezone</div>
                          </div>
                          {widgetError ? (
                            <div className="sch-error">
                              <div className="sch-error-icon">⚠️</div>
                              <div style={{fontWeight:700,color:"var(--text)"}}>Could not load the calendar</div>
                              <div style={{fontSize:12,maxWidth:320}}>There was a problem loading the booking widget. Please try refreshing the page, or email us directly to schedule.</div>
                              <a href="mailto:amaar@akronproductsinc.com" className="btn btn-teal btn-sm" style={{marginTop:8,textDecoration:"none"}}>Email to Schedule</a>
                            </div>
                          ) : !widgetReady ? (
                            <div className="sch-loading">
                              <div className="sch-spinner"/>
                              Loading calendar…
                            </div>
                          ) : (
                            <div
                              ref={calendlyRef}
                              className="calendly-inline-widget"
                              data-url="https://calendly.com/amaar-akronproductsinc/30min"
                              style={{minWidth:320,height:700}}
                            />
                          )}
                        </div>

                        {/* Trust sidebar */}
                        <div className="sch-trust-col">
                          {/* Reviews */}
                          <div className="sch-trust-card">
                            <div className="sch-trust-hd">What Reps Are Saying</div>
                            {[
                              {text:`"The strategy call alone gave me three ideas I implemented that week. Booked two meetings within days."`,author:"Marcus T. — Field Sales Rep, CPG Brand"},
                              {text:`"I came in skeptical and left completely sold — not on the software, but on the strategy. Extremely valuable 30 minutes."`,author:"Priya S. — National Sales Manager"},
                              {text:`"They actually reviewed my pitch before the call. I felt like they genuinely cared about my success."`,author:"Jordan L. — Independent Sales Rep"},
                            ].map((r,i)=>(
                              <div key={i} className="sch-review">
                                <div className="sch-stars">★★★★★</div>
                                <div className="sch-review-text">{r.text}</div>
                                <div className="sch-review-author">{r.author}</div>
                              </div>
                            ))}
                          </div>

                          {/* Guarantees */}
                          <div className="sch-trust-card">
                            <div className="sch-trust-hd">Our Commitments to You</div>
                            {[
                              {icon:"✅",title:"100% Free, No Catch",desc:"This is a genuine strategy session. We never use hard sales tactics."},
                              {icon:"⏱",title:"We Respect Your Time",desc:"Calls start on time and end on time. No overruns without your permission."},
                              {icon:"🔐",title:"Your Data Stays Private",desc:"Anything you share stays confidential. We don't share client information."},
                            ].map((g)=>(
                              <div key={g.title} className="sch-guarantee" style={{marginBottom:12}}>
                                <div className="sch-guarantee-icon">{g.icon}</div>
                                <div className="sch-guarantee-text"><strong>{g.title}</strong>{g.desc}</div>
                              </div>
                            ))}
                          </div>

                          {/* CTA Banner */}
                          <div className="sch-cta-banner">
                            <h3>Ready to grow your retail sales?</h3>
                            <p>Most reps see a measurable improvement in their outreach within the first week after a strategy call.</p>
                            <button className="btn btn-teal" style={{width:"100%",justifyContent:"center",fontSize:13}} onClick={()=>calendlyRef.current?.scrollIntoView({behavior:"smooth",block:"center"})}>
                              📆 Pick a Time Above
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()

              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
