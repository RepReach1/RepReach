import { useState, useEffect, useRef } from "react";

/* ── Animated counter hook ── */
function useCounter(target, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* ── Intersection observer hook ── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ── Format large numbers ── */
function fmt(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

export default function Landing({ onEnter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  /* Section refs */
  const [metricsRef, metricsInView] = useInView(0.2);
  const [howRef, howInView]         = useInView(0.15);
  const [benefitsRef, benefitsInView] = useInView(0.15);
  const [testiRef, testiInView]     = useInView(0.15);
  const [ctaRef, ctaInView]         = useInView(0.3);

  /* Counters */
  const deals      = useCounter(47300,  2200, metricsInView);
  const revenue    = useCounter(284000000, 2400, metricsInView);
  const retailers  = useCounter(1200,   2000, metricsInView);
  const closers    = useCounter(3800,   1800, metricsInView);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,600;12..96,700;12..96,800&family=Inter:wght@300;400;500;600;700&display=swap');

        /* ── RESET & BASE ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background: #000; color: #f0f2ff; overflow-x: hidden; }

        /* ── CUSTOM VARS ── */
        :root {
          --black:    #000000;
          --deep:     #050508;
          --bg1:      #08090f;
          --bg2:      #0c0d15;
          --bg3:      #10121c;
          --border:   rgba(255,255,255,.07);
          --border2:  rgba(255,255,255,.12);

          --blue:     #00c8ff;
          --blue2:    #0099cc;
          --blue-dim: rgba(0,200,255,.08);
          --blue-glow:rgba(0,200,255,.28);

          --gold:     #f5a623;
          --gold2:    #ffd166;
          --gold-dim: rgba(245,166,35,.09);
          --gold-glow:rgba(245,166,35,.25);

          --orange:   #ff6b2b;

          --text:     #f0f2ff;
          --text2:    #8b91b8;
          --text3:    #3d4468;

          --grad-hero: linear-gradient(135deg, #000 0%, #050818 50%, #000 100%);
          --grad-blue: linear-gradient(135deg, #00c8ff, #0077ff);
          --grad-gold: linear-gradient(135deg, #f5a623, #ffd166);
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a1f3a; border-radius: 4px; }

        /* ── SCROLL ANIMATIONS ── */
        .reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity .65s cubic-bezier(.16,1,.3,1), transform .65s cubic-bezier(.16,1,.3,1);
        }
        .reveal.in {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-left {
          opacity: 0;
          transform: translateX(-40px);
          transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1);
        }
        .reveal-left.in { opacity: 1; transform: translateX(0); }
        .reveal-right {
          opacity: 0;
          transform: translateX(40px);
          transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1);
        }
        .reveal-right.in { opacity: 1; transform: translateX(0); }

        /* ── KEYFRAMES ── */
        @keyframes gradShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px var(--blue-glow); }
          50%       { box-shadow: 0 0 50px rgba(0,200,255,.5); }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes bar-grow {
          from { width: 0%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        @keyframes number-flash {
          0%   { color: var(--gold); text-shadow: 0 0 30px var(--gold-glow); }
          100% { color: var(--text); text-shadow: none; }
        }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; padding: 0 40px; height: 68px;
          background: rgba(0,0,0,.7); backdrop-filter: blur(20px) saturate(1.4);
          border-bottom: 1px solid var(--border);
          transition: background .3s;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 20px; font-weight: 800; color: var(--text);
          text-decoration: none; letter-spacing: -.4px;
        }
        .nav-logo-badge {
          width: 34px; height: 34px; border-radius: 10px;
          background: var(--grad-blue);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 900; color: #000;
          box-shadow: 0 0 20px var(--blue-glow);
        }
        .nav-logo em { font-style: normal; color: var(--blue); }
        .nav-links {
          display: flex; gap: 36px; margin-left: 48px;
          list-style: none;
        }
        .nav-links a {
          font-size: 13px; font-weight: 600; color: var(--text2);
          text-decoration: none; letter-spacing: .02em;
          transition: color .15s;
        }
        .nav-links a:hover { color: var(--text); }
        .nav-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
        .nav-cta {
          padding: 9px 22px; border-radius: 9px; font-size: 13px;
          font-weight: 700; cursor: pointer; transition: .2s;
          background: var(--grad-blue); color: #000; border: none;
          font-family: 'Inter', sans-serif; letter-spacing: .02em;
          box-shadow: 0 4px 20px var(--blue-glow);
        }
        .nav-cta:hover { box-shadow: 0 4px 30px rgba(0,200,255,.5); transform: translateY(-1px); }

        /* ── HERO ── */
        .hero {
          position: relative; min-height: 100vh;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center;
          padding: 120px 24px 80px;
          overflow: hidden;
          background: var(--grad-hero);
        }

        /* Orb backgrounds */
        .hero::before {
          content: '';
          position: absolute; top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 900px; height: 900px;
          background: radial-gradient(circle, rgba(0,200,255,.12) 0%, transparent 65%);
          pointer-events: none;
        }
        .hero::after {
          content: '';
          position: absolute; bottom: -100px; right: -100px;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(245,166,35,.09) 0%, transparent 65%);
          pointer-events: none;
        }

        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 100px;
          background: rgba(0,200,255,.08);
          border: 1px solid rgba(0,200,255,.2);
          font-size: 11px; font-weight: 800; color: var(--blue);
          text-transform: uppercase; letter-spacing: 1.5px;
          margin-bottom: 28px;
          transition: opacity .6s, transform .6s;
        }
        .hero-eyebrow .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--blue);
          animation: blink 2s ease-in-out infinite;
          box-shadow: 0 0 8px var(--blue);
        }

        .hero-h1 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(52px, 7vw, 96px);
          font-weight: 800; line-height: 1.02;
          letter-spacing: -3px; color: var(--text);
          max-width: 900px; margin-bottom: 24px;
          position: relative; z-index: 1;
        }
        .hero-h1 .line-gold {
          background: var(--grad-gold);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradShift 4s ease infinite;
        }
        .hero-h1 .line-blue {
          background: var(--grad-blue);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradShift 4s ease infinite;
        }

        .hero-sub {
          font-size: clamp(15px, 1.8vw, 19px);
          color: var(--text2); max-width: 580px;
          line-height: 1.7; margin-bottom: 44px;
          font-weight: 400; position: relative; z-index: 1;
        }

        .hero-ctas {
          display: flex; gap: 14px; justify-content: center;
          flex-wrap: wrap; position: relative; z-index: 1;
          margin-bottom: 64px;
        }
        .btn-primary {
          padding: 16px 36px; border-radius: 12px;
          background: var(--grad-blue);
          color: #000; font-weight: 800; font-size: 15px;
          border: none; cursor: pointer; letter-spacing: .01em;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 8px 32px var(--blue-glow);
          transition: .2s; position: relative; overflow: hidden;
        }
        .btn-primary::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,.15) 0%, transparent 60%);
          pointer-events: none;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,200,255,.55); }

        .btn-ghost {
          padding: 16px 36px; border-radius: 12px;
          background: rgba(255,255,255,.04);
          color: var(--text); font-weight: 700; font-size: 15px;
          border: 1px solid var(--border2); cursor: pointer;
          font-family: 'Inter', sans-serif; letter-spacing: .01em;
          transition: .2s;
          backdrop-filter: blur(10px);
        }
        .btn-ghost:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2); }

        /* Hero dashboard mockup */
        .hero-visual {
          position: relative; z-index: 1;
          width: 100%; max-width: 900px;
          animation: float 5s ease-in-out infinite;
        }
        .hero-dash {
          background: rgba(10,12,20,.9);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(20px);
          box-shadow: 0 40px 100px rgba(0,0,0,.8), 0 0 0 1px rgba(0,200,255,.06), inset 0 1px 0 rgba(255,255,255,.06);
        }
        .dash-bar {
          height: 8px; background: rgba(255,255,255,.04);
          border-radius: 4px; margin-bottom: 16px;
          display: flex; align-items: center; gap: 6px; padding: 0;
        }
        .dash-bar-dot { width: 10px; height: 10px; border-radius: 50%; }
        .dash-inner { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .dash-metric {
          background: rgba(255,255,255,.03);
          border: 1px solid var(--border);
          border-radius: 12px; padding: 14px 16px;
        }
        .dash-metric-label { font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; }
        .dash-metric-val { font-family: 'Bricolage Grotesque', sans-serif; font-size: 22px; font-weight: 800; color: var(--text); }
        .dash-metric-val.blue { color: var(--blue); }
        .dash-metric-val.gold { color: var(--gold); }
        .dash-metric-val.green { color: #4ade80; }
        .dash-chart { background: rgba(255,255,255,.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px; height: 100px; display: flex; align-items: flex-end; gap: 6px; }
        .dash-bar-item { flex: 1; border-radius: 4px 4px 0 0; min-width: 8px; transition: opacity .2s; }
        .dash-bar-item:hover { opacity: .8; }

        /* ── TICKER ── */
        .ticker-wrap {
          background: rgba(0,200,255,.06);
          border-top: 1px solid rgba(0,200,255,.12);
          border-bottom: 1px solid rgba(0,200,255,.12);
          overflow: hidden; padding: 11px 0;
        }
        .ticker-track {
          display: flex; gap: 0;
          animation: ticker 28s linear infinite;
          width: max-content;
        }
        .ticker-item {
          display: flex; align-items: center; gap: 8px;
          padding: 0 36px; white-space: nowrap;
          font-size: 12px; font-weight: 700; color: var(--blue);
          letter-spacing: .04em;
        }
        .ticker-item .sep { color: rgba(0,200,255,.3); font-size: 16px; }

        /* ── METRICS STRIP ── */
        .metrics {
          padding: 80px 40px;
          background: var(--bg1);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .metric-item {
          padding: 40px 32px; text-align: center;
          background: var(--bg1);
          position: relative;
        }
        .metric-item::after {
          content: '';
          position: absolute; right: 0; top: 20%; bottom: 20%;
          width: 1px; background: var(--border);
        }
        .metric-item:last-child::after { display: none; }
        .metric-val {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(36px, 4vw, 56px);
          font-weight: 800; letter-spacing: -2px;
          line-height: 1; margin-bottom: 10px;
          background: var(--grad-gold);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .metric-label {
          font-size: 13px; font-weight: 600; color: var(--text3);
          text-transform: uppercase; letter-spacing: 1px;
          line-height: 1.5;
        }
        .metric-sub {
          font-size: 11px; color: rgba(245,166,35,.5); margin-top: 4px; font-weight: 600;
        }

        /* ── LOGOS (retailers) ── */
        .logos-strip {
          padding: 52px 40px;
          text-align: center;
          background: var(--bg1);
          border-bottom: 1px solid var(--border);
        }
        .logos-label {
          font-size: 11px; font-weight: 700; color: var(--text3);
          text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 28px;
        }
        .logos-row {
          display: flex; align-items: center; justify-content: center;
          gap: 40px; flex-wrap: wrap;
        }
        .logo-pill {
          padding: 10px 24px; border-radius: 8px;
          background: rgba(255,255,255,.03);
          border: 1px solid var(--border);
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 15px; font-weight: 800; color: var(--text3);
          letter-spacing: -.3px;
          transition: .2s;
        }
        .logo-pill:hover { color: var(--text2); border-color: var(--border2); }

        /* ── SECTION SHARED ── */
        .section {
          padding: 100px 40px;
        }
        .section-center { text-align: center; }
        .section-label {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 800; color: var(--blue);
          text-transform: uppercase; letter-spacing: 1.5px;
          margin-bottom: 18px;
        }
        .section-label::before, .section-label::after {
          content: ''; flex: 1; height: 1px;
          background: rgba(0,200,255,.2);
        }
        .section-h2 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(32px, 4.5vw, 54px);
          font-weight: 800; letter-spacing: -1.5px;
          color: var(--text); line-height: 1.08;
          margin-bottom: 16px;
        }
        .section-sub {
          font-size: 16px; color: var(--text2);
          line-height: 1.7; max-width: 540px;
          margin: 0 auto;
        }
        .accent-blue { color: var(--blue); }
        .accent-gold { color: var(--gold); }

        /* ── HOW IT WORKS ── */
        .how-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px; margin-top: 64px;
          max-width: 1100px; margin-left: auto; margin-right: auto;
        }
        .how-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 20px; padding: 36px;
          position: relative; overflow: hidden;
          transition: border-color .25s, transform .25s;
        }
        .how-card:hover {
          border-color: rgba(0,200,255,.25);
          transform: translateY(-4px);
        }
        .how-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,200,255,.3), transparent);
        }
        .how-step-num {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 72px; font-weight: 800;
          color: rgba(0,200,255,.07); line-height: 1;
          position: absolute; top: 20px; right: 24px;
          letter-spacing: -4px;
        }
        .how-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 20px;
          background: var(--blue-dim);
          border: 1px solid rgba(0,200,255,.18);
          box-shadow: 0 0 20px rgba(0,200,255,.1);
        }
        .how-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 20px; font-weight: 800; color: var(--text);
          letter-spacing: -.4px; margin-bottom: 10px;
        }
        .how-desc { font-size: 14px; color: var(--text2); line-height: 1.7; }

        /* ── BENEFITS ── */
        .benefits-wrap {
          background: var(--bg1);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .benefits-inner {
          max-width: 1200px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 80px; align-items: center;
          padding: 100px 40px;
        }
        .benefits-list { display: flex; flex-direction: column; gap: 28px; }
        .benefit-item {
          display: flex; gap: 18px; align-items: flex-start;
          padding: 24px; border-radius: 14px;
          background: rgba(255,255,255,.02);
          border: 1px solid var(--border);
          transition: .2s;
        }
        .benefit-item:hover {
          border-color: rgba(0,200,255,.2);
          background: rgba(0,200,255,.04);
        }
        .benefit-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: var(--blue-dim); border: 1px solid rgba(0,200,255,.18);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .benefit-text h3 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 16px; font-weight: 800; color: var(--text);
          margin-bottom: 5px; letter-spacing: -.2px;
        }
        .benefit-text p { font-size: 13px; color: var(--text2); line-height: 1.65; }

        /* Revenue visual */
        .revenue-visual {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 20px; padding: 28px;
          box-shadow: 0 40px 80px rgba(0,0,0,.5);
        }
        .rev-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .rev-title { font-size: 13px; font-weight: 700; color: var(--text2); }
        .rev-live { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #4ade80; }
        .rev-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; animation: blink 1.5s ease-in-out infinite; }
        .rev-total { font-family: 'Bricolage Grotesque', sans-serif; font-size: 38px; font-weight: 800; color: var(--text); letter-spacing: -2px; margin-bottom: 4px; }
        .rev-change { font-size: 13px; font-weight: 700; color: #4ade80; margin-bottom: 22px; }
        .rev-bars { display: flex; align-items: flex-end; gap: 8px; height: 120px; margin-bottom: 16px; }
        .rev-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
        .rev-bar-fill {
          width: 100%; border-radius: 5px 5px 0 0;
          background: var(--grad-blue);
          min-height: 4px;
          box-shadow: 0 0 16px rgba(0,200,255,.25);
        }
        .rev-bar-fill.gold { background: var(--grad-gold); box-shadow: 0 0 16px var(--gold-glow); }
        .rev-bar-label { font-size: 9px; color: var(--text3); font-weight: 700; }
        .rev-pipeline {
          display: flex; flex-direction: column; gap: 8px;
          border-top: 1px solid var(--border); padding-top: 16px;
        }
        .rev-pipe-row { display: flex; align-items: center; gap: 10px; }
        .rev-pipe-name { font-size: 11px; font-weight: 600; color: var(--text2); width: 90px; flex-shrink: 0; }
        .rev-pipe-bar-wrap { flex: 1; height: 8px; background: rgba(255,255,255,.04); border-radius: 4px; overflow: hidden; }
        .rev-pipe-bar { height: 100%; border-radius: 4px; }
        .rev-pipe-val { font-size: 11px; font-weight: 700; color: var(--text3); width: 50px; text-align: right; flex-shrink: 0; }

        /* ── TESTIMONIALS ── */
        .testi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px; margin-top: 60px;
          max-width: 1100px; margin-left: auto; margin-right: auto;
        }
        .testi-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 18px; padding: 30px;
          display: flex; flex-direction: column; gap: 18px;
          transition: border-color .25s, transform .25s;
          position: relative; overflow: hidden;
        }
        .testi-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
        }
        .testi-card:nth-child(1)::before { background: var(--grad-blue); }
        .testi-card:nth-child(2)::before { background: var(--grad-gold); }
        .testi-card:nth-child(3)::before { background: linear-gradient(135deg, #ff6b2b, #ff9f43); }
        .testi-card:nth-child(4)::before { background: linear-gradient(135deg, #a78bfa, #c4b5fd); }
        .testi-card:nth-child(5)::before { background: linear-gradient(135deg, #4ade80, #86efac); }
        .testi-card:nth-child(6)::before { background: var(--grad-blue); }
        .testi-card:hover { border-color: rgba(255,255,255,.15); transform: translateY(-3px); }
        .testi-stars { display: flex; gap: 3px; }
        .testi-star { font-size: 14px; }
        .testi-quote {
          font-size: 14px; color: var(--text2); line-height: 1.75;
          font-style: italic; font-weight: 400; flex: 1;
        }
        .testi-quote strong { color: var(--text); font-style: normal; font-weight: 700; }
        .testi-author { display: flex; align-items: center; gap: 12px; }
        .testi-av {
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 15px; font-weight: 800; color: #000;
          flex-shrink: 0;
        }
        .testi-name { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
        .testi-role { font-size: 11px; color: var(--text3); font-weight: 600; }
        .testi-revenue {
          font-size: 11px; font-weight: 800; color: var(--gold);
          background: var(--gold-dim); border: 1px solid rgba(245,166,35,.2);
          padding: 3px 10px; border-radius: 20px; white-space: nowrap;
        }

        /* ── FINAL CTA ── */
        .final-cta {
          padding: 120px 40px; text-align: center;
          background: linear-gradient(180deg, var(--bg1) 0%, #000 100%);
          position: relative; overflow: hidden;
        }
        .final-cta::before {
          content: '';
          position: absolute; top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 800px; height: 800px;
          background: radial-gradient(circle, rgba(0,200,255,.1) 0%, transparent 65%);
          pointer-events: none;
        }
        .final-cta::after {
          content: '';
          position: absolute; bottom: -100px; left: 50%;
          transform: translateX(-50%);
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(245,166,35,.07) 0%, transparent 65%);
          pointer-events: none;
        }
        .cta-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 18px; border-radius: 100px;
          background: var(--gold-dim);
          border: 1px solid rgba(245,166,35,.25);
          font-size: 12px; font-weight: 800; color: var(--gold);
          text-transform: uppercase; letter-spacing: 1px;
          margin-bottom: 28px;
        }
        .cta-h2 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(40px, 6vw, 72px);
          font-weight: 800; letter-spacing: -2.5px;
          line-height: 1.04; color: var(--text);
          margin-bottom: 20px; position: relative; z-index: 1;
        }
        .cta-sub {
          font-size: 17px; color: var(--text2); line-height: 1.7;
          max-width: 520px; margin: 0 auto 44px;
          position: relative; z-index: 1;
        }
        .cta-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; position: relative; z-index: 1; }
        .btn-large {
          padding: 18px 44px; border-radius: 14px; font-size: 16px;
          font-weight: 800; cursor: pointer; font-family: 'Inter', sans-serif;
          letter-spacing: .01em; transition: .2s; border: none;
        }
        .btn-large-blue {
          background: var(--grad-blue); color: #000;
          box-shadow: 0 8px 40px var(--blue-glow);
        }
        .btn-large-blue:hover { box-shadow: 0 12px 56px rgba(0,200,255,.6); transform: translateY(-2px); }
        .btn-large-ghost {
          background: transparent; color: var(--text2);
          border: 1px solid var(--border2) !important;
        }
        .btn-large-ghost:hover { color: var(--text); border-color: rgba(255,255,255,.2) !important; background: rgba(255,255,255,.04); }
        .cta-trust {
          margin-top: 28px; font-size: 12px; color: var(--text3);
          display: flex; align-items: center; justify-content: center;
          gap: 20px; flex-wrap: wrap;
        }
        .cta-trust-item { display: flex; align-items: center; gap: 5px; font-weight: 600; }
        .cta-trust-item::before { content: '✓'; color: var(--blue); font-size: 11px; }

        /* ── FOOTER ── */
        .footer {
          padding: 32px 40px;
          border-top: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          background: #000;
          flex-wrap: wrap; gap: 16px;
        }
        .footer-copy { font-size: 13px; color: var(--text3); font-weight: 500; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 12px; color: var(--text3); text-decoration: none; font-weight: 600; transition: color .15s; }
        .footer-links a:hover { color: var(--text2); }

        /* ── GLASS CARD ── */
        .glass {
          backdrop-filter: blur(20px) saturate(1.5);
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.08);
        }

        /* Responsive basics */
        @media (max-width: 900px) {
          .nav-links { display: none; }
          .metrics { grid-template-columns: repeat(2, 1fr); }
          .how-grid { grid-template-columns: 1fr; }
          .testi-grid { grid-template-columns: 1fr; }
          .benefits-inner { grid-template-columns: 1fr; gap: 40px; }
          .revenue-visual { display: none; }
        }
        @media (max-width: 600px) {
          .metrics { grid-template-columns: 1fr 1fr; gap: 1px; }
          .metric-item::after { display: none; }
          .hero-ctas { flex-direction: column; align-items: center; }
          .btn-primary, .btn-ghost { width: 100%; max-width: 300px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <a className="nav-logo" href="#">
          <div className="nav-logo-badge">R</div>
          Rep<em>Reach</em>
        </a>
        <ul className="nav-links">
          <li><a href="#how">How It Works</a></li>
          <li><a href="#benefits">Features</a></li>
          <li><a href="#proof">Proof</a></li>
        </ul>
        <div className="nav-right">
          <button className="btn-ghost" style={{padding:"8px 18px",fontSize:13,borderRadius:9}} onClick={onEnter}>Sign In</button>
          <button className="nav-cta" onClick={onEnter}>Get Started →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div
          className="hero-eyebrow"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(16px)", transition: "opacity .6s, transform .6s" }}
        >
          <div className="dot" /> The #1 Platform for Sales Closers
        </div>

        <h1
          className="hero-h1"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(24px)", transition: "opacity .7s .1s, transform .7s .1s" }}
        >
          Where <span className="line-gold">Closers</span><br/>
          Are <span className="line-blue">Built.</span>
        </h1>

        <p
          className="hero-sub"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(20px)", transition: "opacity .7s .2s, transform .7s .2s" }}
        >
          Stop cold-guessing. Start closing. RepReach puts verified buyer contacts,
          AI outreach, and pipeline intelligence in the hands of reps who mean business.
        </p>

        <div
          className="hero-ctas"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(16px)", transition: "opacity .7s .3s, transform .7s .3s" }}
        >
          <button className="btn-primary" onClick={onEnter}>
            ⚡ Start Closing Now
          </button>
          <button className="btn-ghost" onClick={onEnter}>
            See It In Action →
          </button>
        </div>

        {/* Dashboard mockup */}
        <div
          className="hero-visual"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(32px)", transition: "opacity .8s .4s, transform .8s .4s" }}
        >
          <div className="hero-dash">
            <div className="dash-bar">
              <div className="dash-bar-dot" style={{ background: "#ff5f57" }} />
              <div className="dash-bar-dot" style={{ background: "#febc2e" }} />
              <div className="dash-bar-dot" style={{ background: "#28c840" }} />
            </div>
            <div className="dash-inner">
              <div className="dash-metric">
                <div className="dash-metric-label">Pipeline Value</div>
                <div className="dash-metric-val gold">$2.4M</div>
              </div>
              <div className="dash-metric">
                <div className="dash-metric-label">Contacts Found</div>
                <div className="dash-metric-val blue">1,247</div>
              </div>
              <div className="dash-metric">
                <div className="dash-metric-label">Deals Won</div>
                <div className="dash-metric-val green">38</div>
              </div>
            </div>
            <div className="dash-chart">
              {[30,50,40,70,60,85,75,90,80,95,88,100].map((h, i) => (
                <div key={i} className="dash-bar-item" style={{
                  height: h + "%",
                  background: i === 11
                    ? "linear-gradient(180deg, #00c8ff, #0077ff)"
                    : i >= 9
                    ? "linear-gradient(180deg, #f5a623, #ffd166)"
                    : "rgba(255,255,255,.08)"
                }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...Array(2)].map((_, ri) => (
            <div key={ri} style={{ display: "flex" }}>
              {["Deal Closed: Walmart — $840K","New Contact: Target Buyer Added","Pipeline: $2.4M","Rep of the Month: J. Martinez","Deal Won: Costco — $1.2M","Outreach Sent: 340 emails","Meeting Booked: Kroger","Contact Revealed: 50 buyers"].map((item, i) => (
                <div key={i} className="ticker-item">
                  <span className="sep">●</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── METRICS ── */}
      <div ref={metricsRef} className="metrics">
        {[
          { val: `${deals.toLocaleString()}+`, label: "Deals Tracked", sub: "across all users" },
          { val: `$${(revenue / 1000000).toFixed(0)}M+`, label: "Revenue Generated", sub: "by RepReach reps" },
          { val: `${retailers.toLocaleString()}+`, label: "Retailers Covered", sub: "in our database" },
          { val: `${closers.toLocaleString()}+`, label: "Active Closers", sub: "on the platform" },
        ].map((m, i) => (
          <div key={i} className={`metric-item reveal ${metricsInView ? "in" : ""}`} style={{ transitionDelay: i * 0.08 + "s" }}>
            <div className="metric-val">{m.val}</div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── RETAILERS LOGOS ── */}
      <div className="logos-strip">
        <div className="logos-label">Buyers from these companies are already in RepReach</div>
        <div className="logos-row">
          {["Walmart","Target","Kroger","Costco","Amazon","CVS","Home Depot","Walgreens","Sam's Club","Publix"].map(r => (
            <div key={r} className="logo-pill">{r}</div>
          ))}
        </div>
      </div>

      {/* ── HOW CLOSERS USE THIS ── */}
      <section id="how" className="section section-center" ref={howRef}>
        <div className={`reveal ${howInView ? "in" : ""}`}>
          <div className="section-label">How It Works</div>
          <h2 className="section-h2">How <span className="accent-blue">Top Closers</span> Use RepReach</h2>
          <p className="section-sub">Three moves. From zero to pipeline in under 10 minutes.</p>
        </div>
        <div className="how-grid">
          {[
            {
              step: "01", icon: "🎯",
              title: "Find Your Buyer. Instantly.",
              desc: "Search any retailer — Walmart, Target, Costco — and pull every buyer, merchant, and category manager in seconds. 1,000+ contacts per search. No guessing."
            },
            {
              step: "02", icon: "⚡",
              title: "Reveal. Reach. Close.",
              desc: "One click reveals verified emails and direct-dial numbers. AI writes your cold email, LinkedIn message, and follow-up before your competitor even finds the company page."
            },
            {
              step: "03", icon: "📊",
              title: "Manage Your Pipeline.",
              desc: "Track every deal from Lead to Won on your Kanban board. Sequences keep you top-of-mind. Forecasting tells you exactly where your quarter is going. Stay ahead."
            },
          ].map((card, i) => (
            <div key={i} className={`how-card reveal ${howInView ? "in" : ""}`} style={{ transitionDelay: i * 0.12 + "s" }}>
              <div className="how-step-num">{card.step}</div>
              <div className="how-icon">{card.icon}</div>
              <div className="how-title">{card.title}</div>
              <div className="how-desc">{card.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <div id="benefits" className="benefits-wrap" ref={benefitsRef}>
        <div className="benefits-inner">
          {/* Left: benefit list */}
          <div className={`benefits-list reveal-left ${benefitsInView ? "in" : ""}`}>
            <div style={{ marginBottom: 8 }}>
              <div className="section-label" style={{ justifyContent: "flex-start" }}>Revenue Engine</div>
              <h2 className="section-h2" style={{ textAlign: "left" }}>Built to Make You<br/><span className="accent-gold">More Money.</span></h2>
              <p className="section-sub" style={{ textAlign: "left", margin: "0 0 32px" }}>Every feature exists to put more deals in your pipeline and more commission in your pocket.</p>
            </div>
            {[
              { icon: "🔍", title: "Instant Buyer Discovery", text: "Find every decision-maker at any retailer in America. No gatekeepers, no guessing. Direct to the person who signs the PO." },
              { icon: "🤖", title: "AI That Writes Like a Closer", text: "Cold emails, LinkedIn messages, follow-ups, call scripts — generated in seconds and calibrated to your brand and your buyer." },
              { icon: "📈", title: "Pipeline That Pays", text: "Kanban CRM, weighted forecasting, and deal tracking designed for reps who run 30+ deals at once without dropping one." },
              { icon: "⚡", title: "Sequences on Autopilot", text: "Multi-step outreach sequences. Email Monday, LinkedIn Wednesday, call Friday. Stay relentless without burning out." },
            ].map((b, i) => (
              <div key={i} className="benefit-item" style={{ transitionDelay: i * 0.08 + "s" }}>
                <div className="benefit-icon">{b.icon}</div>
                <div className="benefit-text">
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: revenue visual */}
          <div className={`reveal-right ${benefitsInView ? "in" : ""}`}>
            <div className="revenue-visual">
              <div className="rev-header">
                <div className="rev-title">Pipeline Overview</div>
                <div className="rev-live"><div className="rev-live-dot"/>LIVE</div>
              </div>
              <div className="rev-total">$2,847,000</div>
              <div className="rev-change">↑ +$184K this week</div>
              <div className="rev-bars">
                {[
                  {h:"35%",gold:false,lbl:"Jan"},
                  {h:"48%",gold:false,lbl:"Feb"},
                  {h:"42%",gold:false,lbl:"Mar"},
                  {h:"60%",gold:false,lbl:"Apr"},
                  {h:"55%",gold:false,lbl:"May"},
                  {h:"72%",gold:false,lbl:"Jun"},
                  {h:"68%",gold:true, lbl:"Jul"},
                  {h:"84%",gold:true, lbl:"Aug"},
                  {h:"78%",gold:true, lbl:"Sep"},
                  {h:"95%",gold:true, lbl:"Oct"},
                  {h:"88%",gold:true, lbl:"Nov"},
                  {h:"100%",gold:true,lbl:"Dec"},
                ].map((b, i) => (
                  <div key={i} className="rev-bar-col">
                    <div className={`rev-bar-fill ${b.gold ? "gold" : ""}`} style={{ height: b.h }} />
                    <div className="rev-bar-label">{b.lbl}</div>
                  </div>
                ))}
              </div>
              <div className="rev-pipeline">
                {[
                  {name:"Negotiation", pct:85, color:"#facc15", val:"$840K"},
                  {name:"Proposal",    pct:62, color:"#a78bfa", val:"$620K"},
                  {name:"Qualified",   pct:45, color:"#fb923c", val:"$430K"},
                  {name:"Contacted",   pct:30, color:"#38bdf8", val:"$280K"},
                ].map((r, i) => (
                  <div key={i} className="rev-pipe-row">
                    <div className="rev-pipe-name">{r.name}</div>
                    <div className="rev-pipe-bar-wrap">
                      <div className="rev-pipe-bar" style={{ width: r.pct + "%", background: r.color }} />
                    </div>
                    <div className="rev-pipe-val">{r.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <section id="proof" className="section section-center" ref={testiRef}>
        <div className={`reveal ${testiInView ? "in" : ""}`}>
          <div className="section-label">Social Proof</div>
          <h2 className="section-h2">Built by Reps, <span className="accent-gold">Proven by Numbers.</span></h2>
          <p className="section-sub">The people talking aren't influencers. They're closers who have the commissions to prove it.</p>
        </div>
        <div className="testi-grid" style={{ marginTop: 52 }}>
          {[
            {
              av:"JM", avColor:"linear-gradient(135deg,#00c8ff,#0077ff)",
              name:"Jake Martinez", role:"National Account Manager", co:"CPG Brand — Walmart Channel",
              stars:5, revenue:"$1.2M closed",
              quote:"I found the right Walmart buyer in 90 seconds. <strong>RepReach paid for itself on the first call.</strong> I don't know how I was doing this job before."
            },
            {
              av:"SR", avColor:"linear-gradient(135deg,#f5a623,#ffd166)",
              name:"Sarah R.", role:"Regional Sales Director", co:"Natural Foods Brand",
              stars:5, revenue:"$620K pipeline added",
              quote:"The AI cold emails are <strong>better than what I was writing myself</strong>. My open rates tripled. My response rate went from 4% to 22%."
            },
            {
              av:"DK", avColor:"linear-gradient(135deg,#ff6b2b,#ff9f43)",
              name:"Derek Kim", role:"VP of Sales", co:"Consumer Goods — Club Channel",
              stars:5, revenue:"18 new meetings booked",
              quote:"We cracked Costco and Sam's Club in the same quarter. <strong>RepReach gave us access to decision-makers we'd been chasing for two years.</strong>"
            },
            {
              av:"AL", avColor:"linear-gradient(135deg,#a78bfa,#c4b5fd)",
              name:"Ashley L.", role:"Key Account Manager", co:"Health & Wellness Brand",
              stars:5, revenue:"$380K in new business",
              quote:"The pipeline view alone is worth the subscription. I run 40+ accounts and <strong>not a single deal has fallen through the cracks</strong> since I started."
            },
            {
              av:"MT", avColor:"linear-gradient(135deg,#4ade80,#86efac)",
              name:"Marcus T.", role:"Enterprise Sales Rep", co:"Emerging CPG — Drug Channel",
              stars:5, revenue:"CVS deal worth $290K",
              quote:"Got a CVS buyer's direct number and email in literally 10 seconds. <strong>Booked the meeting that afternoon.</strong> No LinkedIn, no assistant, no waiting."
            },
            {
              av:"RC", avColor:"linear-gradient(135deg,#00c8ff,#a78bfa)",
              name:"Rachel C.", role:"Founder & CEO", co:"Bootstrapped CPG Startup",
              stars:5, revenue:"First retail deal: $160K",
              quote:"As a founder doing my own sales, RepReach made me feel like <strong>I had an entire business development team behind me.</strong> Absolute game changer."
            },
          ].map((t, i) => (
            <div key={i} className={`testi-card reveal ${testiInView ? "in" : ""}`} style={{ transitionDelay: i * 0.08 + "s" }}>
              <div className="testi-stars">
                {[...Array(t.stars)].map((_, j) => <div key={j} className="testi-star" style={{ color: "#f5a623" }}>★</div>)}
              </div>
              <div className="testi-quote" dangerouslySetInnerHTML={{ __html: `"${t.quote}"` }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div className="testi-author">
                  <div className="testi-av" style={{ background: t.avColor }}>{t.av}</div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-role">{t.role} · {t.co}</div>
                  </div>
                </div>
                <div className="testi-revenue">{t.revenue}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="final-cta" ref={ctaRef}>
        <div className={`cta-badge reveal ${ctaInView ? "in" : ""}`}>
          ⚡ Limited Access — First Month $1,500
        </div>
        <h2 className={`cta-h2 reveal ${ctaInView ? "in" : ""}`} style={{ transitionDelay: ".08s" }}>
          Your Competition<br/>
          Is Already In Here.<br/>
          <span style={{
            background: "linear-gradient(135deg,#00c8ff,#0077ff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>Are You?</span>
        </h2>
        <p className={`cta-sub reveal ${ctaInView ? "in" : ""}`} style={{ transitionDelay: ".16s" }}>
          Every day you wait, a competitor is finding your buyer, booking your meeting, and closing your deal.
          The platform for elite sales professionals is ready. The question is: are you?
        </p>
        <div className={`cta-btns reveal ${ctaInView ? "in" : ""}`} style={{ transitionDelay: ".24s" }}>
          <button className="btn-large btn-large-blue" onClick={onEnter}>
            ⚡ Start Closing — Get Access Now
          </button>
          <button className="btn-large btn-large-ghost" style={{ border: "1px solid" }} onClick={onEnter}>
            See The Platform →
          </button>
        </div>
        <div className={`cta-trust reveal ${ctaInView ? "in" : ""}`} style={{ transitionDelay: ".32s" }}>
          <div className="cta-trust-item">No contracts</div>
          <div className="cta-trust-item">Live buyer data</div>
          <div className="cta-trust-item">AI-powered outreach</div>
          <div className="cta-trust-item">Cancel anytime</div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-copy">© 2025 RepReach. Built for closers.</div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </>
  );
}
