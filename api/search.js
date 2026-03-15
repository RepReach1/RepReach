import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, "../data/contacts.json");

// Load contacts once — cached across warm invocations
let _cache = null;
function getContacts() {
  if (_cache) return _cache;
  if (!existsSync(DB_PATH)) {
    _cache = [];
    return _cache;
  }
  try {
    _cache = JSON.parse(readFileSync(DB_PATH, "utf8"));
  } catch {
    _cache = [];
  }
  return _cache;
}

const KEYWORDS = [
  "buyer","merchant","category","purchasing","procurement","sourcing",
  "merchandise","buying","assortment","dmm","gmm","chief merchant",
  "planner","allocation","director","vp ","head of",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, titleKeyword, personName, cursor = 1 } = req.body;
  const PER_PAGE = 25;
  const contacts = getContacts();

  // ── Person name search ─────────────────────────────────────────────────────
  if (personName) {
    if (contacts.length === 0) return await apolloFallback(req, res);

    const q = personName.trim().toLowerCase();
    const filtered = contacts.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
    );
    const page  = Math.max(1, cursor);
    const start = (page - 1) * PER_PAGE;
    const leads = filtered.slice(start, start + PER_PAGE).map(stamp);
    return res.status(200).json({
      leads,
      total:       filtered.length,
      apolloTotal: filtered.length,
      cursor:      page,
      nextCursor:  start + PER_PAGE < filtered.length ? page + 1 : null,
    });
  }

  // ── Retailer search ────────────────────────────────────────────────────────
  if (!retailer) return res.status(400).json({ error: "Missing retailer or personName" });

  const q = retailer.trim().toLowerCase();

  // Match on retailerKey (exact), or retailer name contains, or domain contains
  let filtered = contacts.filter(c =>
    (c.retailerKey && c.retailerKey.includes(q)) ||
    c.retailer.toLowerCase().includes(q) ||
    (c.domain && c.domain.includes(q))
  );

  // Optional title keyword filter
  if (titleKeyword && titleKeyword.trim()) {
    const kws = titleKeyword.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
    filtered = filtered.filter(c =>
      kws.some(kw => c.title.toLowerCase().includes(kw))
    );
  }

  // If local DB is empty or no local results for this retailer, fall back to Apollo live search
  if (contacts.length === 0 || filtered.length === 0) {
    return await apolloFallback(req, res);
  }

  const total  = filtered.length;
  const page   = Math.max(1, cursor);
  const start  = (page - 1) * PER_PAGE;
  const leads  = filtered.slice(start, start + PER_PAGE).map(stamp);

  return res.status(200).json({
    leads,
    total,
    apolloTotal: total,
    cursor:      page,
    nextCursor:  start + PER_PAGE < total ? page + 1 : null,
    source:      "local",
  });
}

// Stable ID per render (don't mutate stored record)
function stamp(c, i) {
  return { ...c, id: c.id || `rr_${i}` };
}

// ── Persist new Apollo contacts into the local DB ─────────────────────────────
function cacheToDb(newLeads) {
  if (!newLeads.length) return;
  try {
    const existing = existsSync(DB_PATH)
      ? JSON.parse(readFileSync(DB_PATH, "utf8"))
      : [];
    const knownIds = new Set(existing.map(c => c.apolloId).filter(Boolean));
    const brandNew = newLeads.filter(c => c.apolloId && !knownIds.has(c.apolloId));
    if (!brandNew.length) return;
    const merged = [...existing, ...brandNew].map((c, i) => ({ ...c, id: `rr_${i}` }));
    _cache = merged; // update in-memory cache first (always works)
    try { writeFileSync(DB_PATH, JSON.stringify(merged, null, 2)); } catch {} // non-fatal on read-only fs
  } catch { /* non-fatal */ }
}

// ── Apollo live fallback (used only when DB is empty) ─────────────────────────
async function apolloFallback(req, res) {
  const { retailer, titleKeyword, personName, cursor = 1 } = req.body;

  const KEY     = process.env.APOLLO_API_KEY;
  const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": KEY };
  const BATCH   = 5;

  const DOMAINS = {
    "walmart":"walmart.com","sam's club":"samsclub.com","sams club":"samsclub.com",
    "kroger":"kroger.com","target":"target.com","costco":"costco.com",
    "home depot":"homedepot.com","cvs":"cvs.com","tractor supply":"tractorsupply.com",
    "amazon":"amazon.com","lowe's":"lowes.com","lowes":"lowes.com",
    "publix":"publix.com","walgreens":"walgreens.com","best buy":"bestbuy.com",
    "dollar general":"dollargeneral.com","dollar tree":"dollartree.com",
    "albertsons":"albertsons.com","aldi":"aldi.us","trader joe's":"traderjoes.com",
    "whole foods":"wholefoodsmarket.com","meijer":"meijer.com","heb":"heb.com",
    "sprouts":"sprouts.com","wegmans":"wegmans.com","rite aid":"riteaid.com",
    "tj maxx":"tjmaxx.com","ross":"rossstores.com","marshalls":"marshalls.com",
    "7-eleven":"7-eleven.com","family dollar":"familydollar.com",
  };

  const TITLES = [
    "buyer","senior buyer","merchant","senior merchant","category manager",
    "senior category manager","divisional merchandise manager","general merchandise manager",
    "director of merchandising","vp of merchandising","head of merchandising",
    "director of buying","director of purchasing","director of sourcing",
    "purchasing manager","procurement manager","sourcing manager",
    "merchandise manager","category director","buying manager","chief merchant",
    "merchandise planner","inventory manager","assortment manager",
  ];

  const KEYWORDS_FB = [
    "buyer","merchant","category","purchasing","procurement","sourcing",
    "merchandise","buying","assortment","dmm","gmm","chief merchant",
    "planner","allocation","director of","vp of","head of",
  ];

  const post = (url, body) =>
    fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });

  try {
    // ── Person name search path ──────────────────────────────────────────────
    if (personName) {
      const r = await post("https://api.apollo.io/v1/people/search", {
        q_person_name:  personName.trim(),
        person_titles:  TITLES,
        page:    1,
        per_page: 25,
      });
      const d = await r.json();
      const people = d?.people || d?.contacts || [];
      const leads = people.filter(p => p.first_name)
        .map((p, i) => ({
          id:          `apollo_pn_${i}_${(p.id||"").slice(-6)}`,
          apolloId:    p.id || null,
          firstName:   p.first_name  || "",
          lastName:    p.last_name   || "",
          title:       p.title       || "",
          seniority:   p.seniority   || "",
          departments: p.departments || [],
          retailer:    p.organization_name || "",
          email:       p.email       || null,
          phone:       p.phone_numbers?.[0]?.sanitized_number || null,
          location:    [p.city, p.state].filter(Boolean).join(", ") || "",
          country:     p.country     || null,
          linkedin:    p.linkedin_url || null,
        }));
      cacheToDb(leads);
      return res.status(200).json({ leads, total: leads.length, apolloTotal: d?.pagination?.total_entries || leads.length, cursor: 1, nextCursor: null, source: "apollo_live" });
    }

    // ── Retailer search path ─────────────────────────────────────────────────
    let orgId = null;
    const domain = DOMAINS[retailer.toLowerCase().trim()];
    if (domain) {
      const r = await fetch(`https://api.apollo.io/v1/organizations/enrich?domain=${domain}`, { headers: HEADERS });
      const d = await r.json();
      orgId = d?.organization?.id || null;
    }
    if (!orgId) {
      const r = await post("https://api.apollo.io/v1/organizations/search",
        { q_organization_name: retailer, page:1, per_page:5 });
      const d = await r.json();
      const orgs = d?.organizations || d?.accounts || [];
      const best = orgs.find(o => o.name?.toLowerCase()===retailer.toLowerCase()) || orgs[0];
      if (best?.id) orgId = best.id;
    }

    const pageStart = (cursor - 1) * BATCH + 1;

    const fetchPages = async (body) => {
      const pages = Array.from({length:BATCH}, (_,i) => pageStart+i);
      const results = await Promise.all(pages.map(async pg => {
        const r = await post("https://api.apollo.io/v1/people/search", {...body, page:pg, per_page:100});
        const d = await r.json();
        return { people:d?.people||d?.contacts||[], total:d?.pagination?.total_entries||0, pages:d?.pagination?.total_pages||1 };
      }));
      return results;
    };

    // Try org_id + titles first; fall back progressively
    let results = orgId
      ? await fetchPages({ organization_ids:[orgId], person_titles: TITLES })
      : null;

    if (!results || results[0]?.total === 0) {
      results = await fetchPages({ organization_names:[retailer], person_titles: TITLES });
    }

    // Broaden: drop title filter if still nothing
    if (!results || results[0]?.total === 0) {
      results = orgId
        ? await fetchPages({ organization_ids:[orgId] })
        : await fetchPages({ organization_names:[retailer] });
    }

    const apolloTotal = results[0]?.total || 0;
    const totalPages  = Math.min(results[0]?.pages || 1, 500);
    let   people      = results.flatMap(r => r.people).filter(p => p.first_name);

    const seen = new Set();
    people = people.filter(p => {
      const k = `${p.first_name}${p.last_name||""}`.toLowerCase().replace(/\s/g,"");
      if (seen.has(k)) return false; seen.add(k); return true;
    });
    const leads = people.map((p,i) => ({
      id:          `apollo_${cursor}_${i}_${(p.id||"").slice(-6)}`,
      apolloId:    p.id || null,
      firstName:   p.first_name  || "",
      lastName:    p.last_name   || "",
      title:       p.title       || "",
      seniority:   p.seniority   || "",
      departments: p.departments || [],
      retailer:    p.organization_name || retailer,
      email:       p.email       || null,
      phone:       p.phone_numbers?.[0]?.sanitized_number || null,
      location:    [p.city, p.state].filter(Boolean).join(", ") || "",
      country:     p.country     || null,
      linkedin:    p.linkedin_url || null,
    }));

    const nextCursor = pageStart + BATCH <= totalPages ? cursor + 1 : null;
    cacheToDb(leads);
    return res.status(200).json({ leads, total:leads.length, apolloTotal, cursor, nextCursor, source:"apollo_live" });
  } catch(e) {
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
