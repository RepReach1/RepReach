import React, { useEffect, useRef, useState } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black: #04060f;
    --charcoal: #07091a;
    --graphite: #0b0e22;
    --card: #0f1228;
    --border: rgba(255,255,255,0.07);
    --blue: #2979ff;
    --blue-glow: #2979ffaa;
    --gold: #f5a623;
    --gold-glow: #f5a62366;
    --orange: #ff6b35;
    --text: #e8e8f0;
    --muted: #6b6b88;
    --font: 'Inter', sans-serif;
    --font-alt: 'Space Grotesk', sans-serif;
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--black);
    color: var(--text);
    font-family: var(--font);
    line-height: 1.6;
    overflow-x: hidden;
  }

  /* ── NAV ── */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 48px;
    height: 72px;
    background: rgba(5,5,8,0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }
  .lp-nav-logo {
    font-family: var(--font-alt);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, #fff 0%, var(--blue) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .lp-nav-links { display: flex; gap: 32px; }
  .lp-nav-links a {
    font-size: 14px; font-weight: 500; color: var(--muted);
    text-decoration: none; transition: color 0.2s;
  }
  .lp-nav-links a:hover { color: var(--text); }
  .lp-nav-cta {
    background: var(--blue);
    color: #fff;
    border: none;
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 0 24px var(--blue-glow);
    font-family: var(--font);
  }
  .lp-nav-cta:hover {
    background: #4d94ff;
    box-shadow: 0 0 36px var(--blue-glow);
    transform: translateY(-1px);
  }

  /* ── HERO ── */
  .lp-hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 120px 48px 80px;
    position: relative;
    overflow: hidden;
    text-align: center;
  }

  .lp-hero-bg {
    position: absolute; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(41,121,255,0.12) 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 80% 80%, rgba(245,166,35,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 20% 60%, rgba(255,107,53,0.05) 0%, transparent 60%);
  }

  .lp-hero-grid {
    position: absolute; inset: 0; z-index: 0;
    background-image:
      linear-gradient(rgba(41,121,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(41,121,255,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%);
  }

  .lp-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(41,121,255,0.1);
    border: 1px solid rgba(41,121,255,0.3);
    padding: 6px 16px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
    color: #7ab3ff;
    margin-bottom: 32px;
    position: relative; z-index: 1;
    animation: fadeUp 0.6s ease both;
  }
  .lp-hero-badge-dot {
    width: 6px; height: 6px;
    background: var(--blue);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--blue);
    animation: pulse 2s ease infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.8); }
  }

  .lp-hero-h1 {
    font-family: var(--font-alt);
    font-size: clamp(48px, 7vw, 96px);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -2px;
    color: #fff;
    max-width: 900px;
    position: relative; z-index: 1;
    animation: fadeUp 0.6s 0.1s ease both;
  }
  .lp-hero-h1 .accent-blue {
    background: linear-gradient(135deg, var(--blue) 0%, #7ab3ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .lp-hero-h1 .accent-gold {
    background: linear-gradient(135deg, var(--gold) 0%, var(--orange) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lp-hero-sub {
    font-size: clamp(16px, 2vw, 20px);
    color: var(--muted);
    max-width: 600px;
    margin: 24px auto 0;
    position: relative; z-index: 1;
    animation: fadeUp 0.6s 0.2s ease both;
    line-height: 1.7;
  }

  .lp-hero-actions {
    display: flex; gap: 16px; align-items: center;
    margin-top: 48px;
    position: relative; z-index: 1;
    animation: fadeUp 0.6s 0.3s ease both;
    flex-wrap: wrap; justify-content: center;
  }
  .btn-primary {
    background: var(--blue);
    color: #fff;
    border: none;
    padding: 16px 36px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 0 40px var(--blue-glow);
    font-family: var(--font);
    display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-primary:hover {
    background: #4d94ff;
    box-shadow: 0 0 60px var(--blue-glow), 0 8px 24px rgba(41,121,255,0.3);
    transform: translateY(-2px);
  }
  .btn-secondary {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
    padding: 16px 36px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: var(--font);
    display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-secondary:hover {
    border-color: rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.04);
    transform: translateY(-2px);
  }

  /* ── FLOATING STATS ── */
  .lp-hero-stats {
    display: flex; gap: 48px; flex-wrap: wrap; justify-content: center;
    margin-top: 72px;
    position: relative; z-index: 1;
    animation: fadeUp 0.6s 0.4s ease both;
  }
  .lp-hero-stat { text-align: center; }
  .lp-hero-stat-val {
    font-family: var(--font-alt);
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    line-height: 1;
  }
  .lp-hero-stat-val .unit {
    background: linear-gradient(135deg, var(--blue), #7ab3ff);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .lp-hero-stat-label { font-size: 13px; color: var(--muted); margin-top: 6px; }

  /* ── ANIMATED DASHBOARD PREVIEW ── */
  .lp-preview-wrap {
    position: relative; z-index: 1;
    margin-top: 80px;
    animation: fadeUp 0.8s 0.5s ease both;
    max-width: 1100px;
    width: 100%;
  }
  .lp-preview-glow {
    position: absolute;
    inset: -40px;
    background: radial-gradient(ellipse 60% 40% at 50% 50%, rgba(41,121,255,0.2) 0%, transparent 70%);
    z-index: -1;
  }
  .lp-preview {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05);
  }
  .lp-preview-bar {
    background: var(--graphite);
    padding: 12px 20px;
    display: flex; gap: 8px; align-items: center;
    border-bottom: 1px solid var(--border);
  }
  .lp-preview-dot { width: 12px; height: 12px; border-radius: 50%; }
  .lp-preview-dot:nth-child(1) { background: #ff5f57; }
  .lp-preview-dot:nth-child(2) { background: #febc2e; }
  .lp-preview-dot:nth-child(3) { background: #28c840; }
  .lp-preview-url {
    margin-left: 12px;
    background: rgba(255,255,255,0.04);
    border-radius: 6px;
    padding: 4px 16px;
    font-size: 12px;
    color: var(--muted);
    flex: 1; max-width: 300px;
    text-align: center;
  }
  .lp-preview-inner {
    padding: 24px;
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 24px;
    min-height: 400px;
  }
  .lp-preview-sidebar {
    background: var(--graphite);
    border-radius: 10px;
    padding: 16px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .lp-preview-sb-item {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    display: flex; align-items: center; gap: 8px;
    color: var(--muted);
    transition: all 0.2s;
  }
  .lp-preview-sb-item.active {
    background: rgba(41,121,255,0.15);
    color: #7ab3ff;
  }
  .lp-preview-main { display: flex; flex-direction: column; gap: 16px; }
  .lp-preview-cards {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  }
  .lp-preview-card {
    background: var(--graphite);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
  }
  .lp-preview-card-label { font-size: 11px; color: var(--muted); margin-bottom: 8px; }
  .lp-preview-card-val {
    font-size: 22px; font-weight: 700; color: #fff; font-family: var(--font-alt);
  }
  .lp-preview-card-delta { font-size: 11px; color: #4dff91; margin-top: 4px; }
  .lp-preview-bars { background: var(--graphite); border-radius: 10px; padding: 16px; flex: 1; }
  .lp-preview-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .lp-preview-bar-label { font-size: 11px; color: var(--muted); width: 80px; text-align: right; }
  .lp-preview-bar-track { flex: 1; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
  .lp-preview-bar-fill { height: 100%; border-radius: 4px; transition: width 1.5s cubic-bezier(0.23,1,0.32,1); }
  .lp-preview-bar-fill.blue { background: linear-gradient(90deg, var(--blue), #7ab3ff); }
  .lp-preview-bar-fill.gold { background: linear-gradient(90deg, var(--gold), var(--orange)); }
  .lp-preview-bar-fill.teal { background: linear-gradient(90deg, #2979ff, #7ab3ff); }

  /* ── SOCIAL PROOF TICKER ── */
  .lp-ticker {
    background: var(--charcoal);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 14px 0;
    overflow: hidden;
    position: relative;
  }
  .lp-ticker-inner {
    display: flex; gap: 64px;
    animation: ticker 30s linear infinite;
    width: max-content;
  }
  .lp-ticker-item {
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; font-weight: 500; color: var(--muted);
    white-space: nowrap;
  }
  .lp-ticker-item .icon { font-size: 16px; }
  .lp-ticker-item strong { color: var(--text); }
  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  /* ── SECTIONS ── */
  .lp-section {
    padding: 120px 48px;
    max-width: 1200px;
    margin: 0 auto;
  }
  .lp-section-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--blue);
    margin-bottom: 16px;
  }
  .lp-section-h2 {
    font-family: var(--font-alt);
    font-size: clamp(32px, 4vw, 52px);
    font-weight: 700;
    letter-spacing: -1px;
    color: #fff;
    line-height: 1.1;
    max-width: 700px;
    margin-bottom: 16px;
  }
  .lp-section-sub {
    font-size: 18px;
    color: var(--muted);
    max-width: 560px;
    line-height: 1.7;
  }

  /* ── METRICS ── */
  .lp-metrics {
    background: var(--charcoal);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .lp-metrics-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 80px 48px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--border);
  }
  .lp-metric {
    background: var(--charcoal);
    padding: 40px 32px;
    text-align: center;
  }
  .lp-metric-val {
    font-family: var(--font-alt);
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    background: linear-gradient(135deg, #fff 0%, var(--blue) 80%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .lp-metric-label {
    font-size: 14px;
    color: var(--muted);
    margin-top: 12px;
    font-weight: 500;
  }

  /* ── FEATURES ── */
  .lp-features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    margin-top: 64px;
  }
  .lp-feature {
    background: var(--card);
    padding: 40px 32px;
    transition: background 0.2s;
    position: relative;
    overflow: hidden;
  }
  .lp-feature::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--blue), transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .lp-feature:hover { background: rgba(41,121,255,0.04); }
  .lp-feature:hover::before { opacity: 1; }
  .lp-feature-icon {
    font-size: 32px;
    margin-bottom: 20px;
    display: block;
  }
  .lp-feature-h3 {
    font-family: var(--font-alt);
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 12px;
  }
  .lp-feature-p {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.7;
  }
  .lp-feature-tag {
    display: inline-block;
    background: rgba(41,121,255,0.1);
    border: 1px solid rgba(41,121,255,0.2);
    color: #7ab3ff;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 100px;
    margin-top: 16px;
  }

  /* ── HOW IT WORKS ── */
  .lp-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    margin-top: 64px;
    counter-reset: steps;
  }
  .lp-step {
    position: relative;
    padding: 40px 32px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    transition: border-color 0.2s, transform 0.2s;
  }
  .lp-step:hover {
    border-color: rgba(41,121,255,0.3);
    transform: translateY(-4px);
  }
  .lp-step-num {
    font-family: var(--font-alt);
    font-size: 13px;
    font-weight: 700;
    color: var(--blue);
    background: rgba(41,121,255,0.1);
    border: 1px solid rgba(41,121,255,0.2);
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
  }
  .lp-step-h3 {
    font-family: var(--font-alt);
    font-size: 20px; font-weight: 700; color: #fff;
    margin-bottom: 12px;
  }
  .lp-step-p { font-size: 14px; color: var(--muted); line-height: 1.7; }

  /* ── TESTIMONIALS ── */
  .lp-testimonials {
    background: var(--charcoal);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 120px 48px;
  }
  .lp-testimonials-inner { max-width: 1200px; margin: 0 auto; }
  .lp-testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-top: 64px;
  }
  .lp-testimonial {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    transition: border-color 0.2s, transform 0.2s;
    position: relative;
    overflow: hidden;
  }
  .lp-testimonial::before {
    content: '"';
    position: absolute;
    top: -10px; right: 20px;
    font-size: 120px;
    font-family: Georgia, serif;
    color: rgba(41,121,255,0.08);
    line-height: 1;
  }
  .lp-testimonial:hover {
    border-color: rgba(41,121,255,0.3);
    transform: translateY(-4px);
  }
  .lp-testimonial-stars {
    color: var(--gold);
    font-size: 14px;
    margin-bottom: 16px;
    letter-spacing: 2px;
  }
  .lp-testimonial-quote {
    font-size: 15px;
    color: var(--text);
    line-height: 1.7;
    margin-bottom: 24px;
    font-style: italic;
  }
  .lp-testimonial-author {
    display: flex; align-items: center; gap: 12px;
  }
  .lp-testimonial-avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    font-family: var(--font-alt);
  }
  .lp-testimonial-name {
    font-size: 14px; font-weight: 600; color: #fff;
  }
  .lp-testimonial-role {
    font-size: 12px; color: var(--muted);
  }
  .lp-testimonial-result {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(77,255,145,0.08);
    border: 1px solid rgba(77,255,145,0.2);
    color: #4dff91;
    font-size: 12px; font-weight: 600;
    padding: 4px 10px;
    border-radius: 100px;
    margin-top: 16px;
  }

  /* ── CTA ── */
  .lp-cta {
    padding: 120px 48px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .lp-cta-bg {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(41,121,255,0.08) 0%, transparent 70%);
  }
  .lp-cta-inner { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; }
  .lp-cta h2 {
    font-family: var(--font-alt);
    font-size: clamp(36px, 5vw, 64px);
    font-weight: 700;
    color: #fff;
    letter-spacing: -1.5px;
    line-height: 1.05;
    margin-bottom: 20px;
  }
  .lp-cta p {
    font-size: 18px;
    color: var(--muted);
    margin-bottom: 48px;
    line-height: 1.7;
  }
  .lp-cta-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .btn-gold {
    background: linear-gradient(135deg, var(--gold) 0%, var(--orange) 100%);
    color: #fff;
    border: none;
    padding: 18px 40px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 0 40px var(--gold-glow);
    font-family: var(--font);
    display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-gold:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 60px var(--gold-glow), 0 8px 24px rgba(245,166,35,0.3);
  }

  /* ── FOOTER ── */
  .lp-footer {
    border-top: 1px solid var(--border);
    padding: 40px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .lp-footer-logo {
    font-family: var(--font-alt);
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(135deg, #fff 0%, var(--blue) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .lp-footer-copy { font-size: 13px; color: var(--muted); }

  /* ── ANIMATIONS ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .reveal {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .lp-nav { padding: 0 20px; }
    .lp-nav-links { display: none; }
    .lp-section { padding: 80px 24px; }
    .lp-hero { padding: 100px 24px 60px; }
    .lp-features-grid { grid-template-columns: 1fr; }
    .lp-steps { grid-template-columns: 1fr; }
    .lp-testimonials-grid { grid-template-columns: 1fr; }
    .lp-metrics-inner { grid-template-columns: repeat(2, 1fr); }
    .lp-preview-inner { grid-template-columns: 1fr; }
    .lp-preview-sidebar { display: none; }
    .lp-preview-cards { grid-template-columns: 1fr 1fr; }
    .lp-footer { flex-direction: column; gap: 16px; text-align: center; }
    .lp-testimonials { padding: 80px 24px; }
    .lp-cta { padding: 80px 24px; }
    .lp-hero-stats { gap: 24px; }
  }
  @media (max-width: 600px) {
    .lp-metrics-inner { grid-template-columns: 1fr 1fr; }
    .lp-preview-cards { grid-template-columns: 1fr; }
  }
`;

function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function MetricCounter({ target, suffix = "", prefix = "", duration = 2000 }) {
  const [started, setStarted] = useState(false);
  const ref = useRef(null);
  const count = useCounter(target, duration, started);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function BarChart({ animate }) {
  const bars = [
    { label: "Kroger", pct: 87, cls: "blue" },
    { label: "Walmart", pct: 73, cls: "gold" },
    { label: "Whole Foods", pct: 92, cls: "teal" },
    { label: "Target", pct: 65, cls: "blue" },
    { label: "Costco", pct: 79, cls: "gold" },
  ];
  return (
    <div className="lp-preview-bars">
      {bars.map(b => (
        <div key={b.label} className="lp-preview-bar-row">
          <span className="lp-preview-bar-label">{b.label}</span>
          <div className="lp-preview-bar-track">
            <div className={`lp-preview-bar-fill ${b.cls}`} style={{ width: animate ? `${b.pct}%` : "0%" }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--muted)", width: 32, textAlign: "right" }}>{b.pct}%</span>
        </div>
      ))}
    </div>
  );
}

const TICKER_ITEMS = [
  { icon: "🏆", text: <><strong>Marcus T.</strong> closed a $2.4M Kroger deal using RepReach</> },
  { icon: "⚡", text: <><strong>500+ retail buyers</strong> contacted this week</> },
  { icon: "📈", text: <><strong>Sarah K.</strong> hit 340% of quota — first month using RepReach</> },
  { icon: "🎯", text: <><strong>92% contact accuracy rate</strong> across all major chains</> },
  { icon: "💰", text: <><strong>$18M in pipeline</strong> generated by RepReach reps this quarter</> },
  { icon: "🔥", text: <><strong>David R.</strong> landed a Target buyer meeting in 48 hours</> },
  { icon: "🏆", text: <><strong>Marcus T.</strong> closed a $2.4M Kroger deal using RepReach</> },
  { icon: "⚡", text: <><strong>500+ retail buyers</strong> contacted this week</> },
  { icon: "📈", text: <><strong>Sarah K.</strong> hit 340% of quota — first month using RepReach</> },
  { icon: "🎯", text: <><strong>92% contact accuracy rate</strong> across all major chains</> },
  { icon: "💰", text: <><strong>$18M in pipeline</strong> generated by RepReach reps this quarter</> },
  { icon: "🔥", text: <><strong>David R.</strong> landed a Target buyer meeting in 48 hours</> },
];

const FEATURES = [
  { icon: "🔍", tag: "People Finder", title: "Find Any Retail Buyer", desc: "Instant access to verified contacts at Kroger, Walmart, Whole Foods, Target, Costco and 200+ other chains. Direct emails, LinkedIn profiles, and org charts." },
  { icon: "🎯", tag: "Objection Trainer", title: "Train Like a Pro Athlete", desc: "Practice your pitch against 5,000+ AI-generated buyer objections. Get scored 1-10 with coaching. Build the reps that make you unbeatable on real calls." },
  { icon: "🤖", tag: "Write with AI", title: "AI-Powered Outreach", desc: "Generate custom cold emails, pitch decks, call scripts, and value props in seconds. Personalized to each buyer and retailer — not generic templates." },
  { icon: "🧠", tag: "Buyer Research", title: "Walk In Knowing Everything", desc: "Research any retailer instantly. Understand their buying priorities, category focus, vendor process, and recent news before your meeting." },
  { icon: "📊", tag: "Deal Board", title: "Pipeline That Drives Action", desc: "Visual Kanban board to track every deal from first contact to signed PO. Never let a hot opportunity slip through the cracks again." },
  { icon: "📈", tag: "My Numbers", title: "Know Your Revenue at a Glance", desc: "Live forecasting and pipeline analytics. See your projected revenue, deal velocity, and close rates so you can hit your number every quarter." },
];

const STEPS = [
  { n: "01", title: "Find Your Buyer", desc: "Search any retailer and get verified contact data for their buyers, category managers, and VPs of purchasing — with 92% accuracy." },
  { n: "02", title: "Prep Like a Winner", desc: "Use AI to research their priorities, generate a custom pitch, practice objections, and write a personalized outreach sequence — in minutes." },
  { n: "03", title: "Close the Deal", desc: "Track every conversation on your Deal Board, forecast your revenue, and use coaching to improve with every rep until you're unstoppable." },
];

const TESTIMONIALS = [
  {
    stars: 5, avatar: "M", avatarBg: "linear-gradient(135deg,#2979ff,#7ab3ff)",
    quote: "I used to spend 3 hours researching before every buyer meeting. Now I do it in 10 minutes. Landed Kroger in week 2 — $1.8M deal. This tool is a weapon.",
    name: "Marcus T.", role: "National Sales Director • Beverage Brand",
    result: "+$1.8M in pipeline, first 30 days",
  },
  {
    stars: 5, avatar: "S", avatarBg: "linear-gradient(135deg,#f5a623,#ff6b35)",
    quote: "The Objection Trainer alone is worth 10x the price. I practiced 200+ objections before my Whole Foods pitch. I had an answer for everything they threw at me.",
    name: "Sarah K.", role: "Regional Sales Manager • Organic Snacks",
    result: "340% of quota, Month 1",
  },
  {
    stars: 5, avatar: "D", avatarBg: "linear-gradient(135deg,#00c8c8,#4dfff3)",
    quote: "RepReach found me a direct contact at Target's Category VP level that I'd been trying to reach for 8 months. Got a meeting in 48 hours. Closed in 6 weeks.",
    name: "David R.", role: "Founder & CEO • Health Foods Startup",
    result: "Target placement secured in 6 weeks",
  },
];

export default function LandingPage({ onEnter }) {
  const [barsAnimated, setBarsAnimated] = useState(false);
  const previewRef = useRef(null);

  useReveal();

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setBarsAnimated(true); }, { threshold: 0.3 });
    if (previewRef.current) io.observe(previewRef.current);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-nav-logo" style={{display:"flex",alignItems:"center",gap:10}}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter:"drop-shadow(0 0 8px rgba(41,121,255,.5))"}}>
            <defs>
              <linearGradient id="lp-rr-l" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#2979ff"/></linearGradient>
              <linearGradient id="lp-rr-r" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#6aaeff"/><stop offset="100%" stopColor="#2979ff"/></linearGradient>
            </defs>
            <path d="M4 7h8.5c2.8 0 4.5 1.8 4.5 4s-1.7 4-4.5 4H4V7z" fill="url(#lp-rr-l)"/>
            <rect x="4" y="7" width="2.5" height="22" rx="1" fill="url(#lp-rr-l)"/>
            <path d="M12.5 15l5.5 14" stroke="url(#lp-rr-l)" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M20 7h8.5c2.8 0 4.5 1.8 4.5 4s-1.7 4-4.5 4H20V7z" fill="url(#lp-rr-r)"/>
            <rect x="20" y="7" width="2.5" height="22" rx="1" fill="url(#lp-rr-r)"/>
            <path d="M28.5 15l4.5 14" stroke="url(#lp-rr-r)" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span style={{letterSpacing:"2px",fontSize:18}}><span style={{color:"#ffffff",fontWeight:800}}>REP</span><span style={{background:"linear-gradient(135deg,#ffffff,#2979ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",fontWeight:800}}>REACH</span></span>
        </div>
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#proof">Results</a>
        </div>
        <button className="lp-nav-cta" onClick={onEnter}>Get Started →</button>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-grid" />

        <div className="lp-hero-badge">
          <span className="lp-hero-badge-dot" />
          The Retail Sales Operating System
        </div>

        <h1 className="lp-hero-h1">
          Win More <span className="accent-blue">Retail</span><br />
          <span className="accent-gold">Business.</span>
        </h1>

        <p className="lp-hero-sub">
          Manage opportunities, prepare for buyer meetings, practice real-world
          sales presentations, and execute winning retail growth strategies —
          from a single platform built for brands selling into major retailers.
        </p>

        <div className="lp-hero-actions">
          <button className="btn-primary" onClick={onEnter}>
            Prepare, Practice, Pitch &amp; Close →
          </button>
          <button className="btn-secondary" onClick={onEnter}>
            See It In Action
          </button>
        </div>

        <div className="lp-hero-stats">
          {[
            { val: "500", suffix: "+", label: "Brands using RepReach" },
            { val: "94", suffix: "%", label: "Client satisfaction rate" },
            { val: "18", prefix: "$", suffix: "M+", label: "Revenue growth tracked" },
            { val: "5000", suffix: "+", label: "Pitch simulations completed" },
          ].map(s => (
            <div key={s.label} className="lp-hero-stat">
              <div className="lp-hero-stat-val">
                {s.prefix || ""}<span className="unit">{s.val}</span>{s.suffix}
              </div>
              <div className="lp-hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* DASHBOARD PREVIEW */}
        <div className="lp-preview-wrap" ref={previewRef}>
          <div className="lp-preview-glow" />
          <div className="lp-preview">
            <div className="lp-preview-bar">
              <div className="lp-preview-dot" />
              <div className="lp-preview-dot" />
              <div className="lp-preview-dot" />
              <div className="lp-preview-url">app.repreach.io</div>
            </div>
            <div className="lp-preview-inner">
              <div className="lp-preview-sidebar">
                {["🔍 People Finder","📊 Deal Board","🎯 Objection Trainer","🤖 Write with AI","🧠 Buyer Research","📈 My Numbers"].map((item,i) => (
                  <div key={item} className={`lp-preview-sb-item ${i===0?"active":""}`}>{item}</div>
                ))}
              </div>
              <div className="lp-preview-main">
                <div className="lp-preview-cards">
                  <div className="lp-preview-card">
                    <div className="lp-preview-card-label">Pipeline Value</div>
                    <div className="lp-preview-card-val">$4.2M</div>
                    <div className="lp-preview-card-delta">▲ 24% this month</div>
                  </div>
                  <div className="lp-preview-card">
                    <div className="lp-preview-card-label">Active Deals</div>
                    <div className="lp-preview-card-val">38</div>
                    <div className="lp-preview-card-delta">▲ 12 new this week</div>
                  </div>
                  <div className="lp-preview-card">
                    <div className="lp-preview-card-label">Close Rate</div>
                    <div className="lp-preview-card-val">67%</div>
                    <div className="lp-preview-card-delta">▲ Top 5% of reps</div>
                  </div>
                </div>
                <BarChart animate={barsAnimated} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="lp-ticker">
        <div className="lp-ticker-inner">
          {TICKER_ITEMS.map((item, i) => (
            <div key={i} className="lp-ticker-item">
              <span className="icon">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* METRICS */}
      <div className="lp-metrics">
        <div className="lp-metrics-inner">
          {[
            { target: 92, suffix: "%", label: "Contact accuracy rate" },
            { target: 18, prefix: "$", suffix: "M+", label: "Pipeline generated this quarter" },
            { target: 500, suffix: "+", label: "Retailers indexed" },
            { target: 5000, suffix: "+", label: "Objections to practice" },
          ].map(m => (
            <div key={m.label} className="lp-metric">
              <div className="lp-metric-val">
                <MetricCounter target={m.target} prefix={m.prefix||""} suffix={m.suffix} />
              </div>
              <div className="lp-metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="lp-section" id="features">
        <div className="reveal">
          <div className="lp-section-label">Platform Features</div>
          <h2 className="lp-section-h2">Every tool a top closer needs.<br />Nothing they don't.</h2>
          <p className="lp-section-sub">Built for serious CPG sales reps who want to outwork and out-prepare every competitor in the room.</p>
        </div>
        <div className="lp-features-grid reveal">
          {FEATURES.map(f => (
            <div key={f.title} className="lp-feature">
              <span className="lp-feature-icon">{f.icon}</span>
              <h3 className="lp-feature-h3">{f.title}</h3>
              <p className="lp-feature-p">{f.desc}</p>
              <span className="lp-feature-tag">{f.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section" id="how" style={{ paddingTop: 0 }}>
        <div className="reveal">
          <div className="lp-section-label">How It Works</div>
          <h2 className="lp-section-h2">From zero to deal in three steps.</h2>
          <p className="lp-section-sub">Top reps using RepReach close their first meeting within the first week. Here's how.</p>
        </div>
        <div className="lp-steps reveal">
          {STEPS.map(s => (
            <div key={s.n} className="lp-step">
              <div className="lp-step-num">{s.n}</div>
              <h3 className="lp-step-h3">{s.title}</h3>
              <p className="lp-step-p">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <div className="lp-testimonials" id="proof">
        <div className="lp-testimonials-inner">
          <div className="reveal">
            <div className="lp-section-label">Results</div>
            <h2 className="lp-section-h2">Real reps. Real numbers. Real deals.</h2>
            <p className="lp-section-sub">These aren't vanity metrics. These are buyers closed, quotas crushed, and careers built.</p>
          </div>
          <div className="lp-testimonials-grid reveal">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="lp-testimonial">
                <div className="lp-testimonial-stars">{"★".repeat(t.stars)}</div>
                <p className="lp-testimonial-quote">"{t.quote}"</p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar" style={{ background: t.avatarBg }}>{t.avatar}</div>
                  <div>
                    <div className="lp-testimonial-name">{t.name}</div>
                    <div className="lp-testimonial-role">{t.role}</div>
                  </div>
                </div>
                <div className="lp-testimonial-result">📈 {t.result}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-cta-bg" />
        <div className="lp-cta-inner reveal">
          <h2>Ready to become the rep<br />every buyer remembers?</h2>
          <p>Stop grinding cold outreach with generic tools. RepReach puts the intelligence, coaching, and firepower of a full sales team in your hands — right now.</p>
          <div className="lp-cta-btns">
            <button className="btn-gold" onClick={onEnter}>
              Start Closing Deals →
            </button>
            <button className="btn-secondary" onClick={onEnter}>
              Explore the Platform
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">RepReach</div>
        <div className="lp-footer-copy">© 2025 RepReach. Built for closers.</div>
      </footer>
    </>
  );
}
