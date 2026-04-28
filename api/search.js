// Apollo people search endpoint — v1/mixed_people/search (free-plan compatible).
// api/v1/mixed_people/api_search requires a paid Apollo plan (API_INACCESSIBLE on free).
// Uses q_organization_domains for domain-based scoping — no org-ID resolution needed.

const APOLLO_SEARCH_ENDPOINT = "https://api.apollo.io/v1/mixed_people/search";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, personName, titleKeyword, cursor = 1 } = req.body;
  if (!retailer && !personName) return res.status(400).json({ error: "Missing retailer or personName" });

  const KEY = process.env.APOLLO_API_KEY;
  if (!KEY) {
    console.error("[fatal] APOLLO_API_KEY is not set in environment variables.");
    return res.status(500).json({ error: "Apollo API key not configured", leads: [] });
  }

  const BATCH   = 5;
  const HEADERS = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "X-Api-Key": KEY,
  };

  // Known retailer → domain mapping.
  // Domain-based search is far more precise than name-based — Apollo resolves
  // company identity via domain, so this avoids matching wrong companies.
  const DOMAINS = {
    "walmart":         "walmart.com",
    "sam's club":      "samsclub.com",
    "sams club":       "samsclub.com",
    "kroger":          "kroger.com",
    "target":          "target.com",
    "costco":          "costco.com",
    "home depot":      "homedepot.com",
    "cvs":             "cvs.com",
    "tractor supply":  "tractorsupply.com",
    "amazon":          "amazon.com",
    "lowe's":          "lowes.com",
    "lowes":           "lowes.com",
    "publix":          "publix.com",
    "walgreens":       "walgreens.com",
    "best buy":        "bestbuy.com",
    "dollar general":  "dollargeneral.com",
    "dollar tree":     "dollartree.com",
    "albertsons":      "albertsons.com",
    "aldi":            "aldi.us",
    "trader joe's":    "traderjoes.com",
    "whole foods":     "wholefoodsmarket.com",
    "meijer":          "meijer.com",
    "heb":             "heb.com",
    "sprouts":         "sprouts.com",
    "wegmans":         "wegmans.com",
    "rite aid":        "riteaid.com",
    "tj maxx":         "tjmaxx.com",
    "ross":            "rossstores.com",
    "marshalls":       "marshalls.com",
    "7-eleven":        "7-eleven.com",
    "family dollar":   "familydollar.com",
  };

  // ── TITLE FILTER ─────────────────────────────────────────────────────────
  // Broad single-word terms — Apollo does substring matching so "buyer"
  // catches "Senior Buyer", "Global Buyer", "Buyer II", etc.
  // Deliberately short list: more terms = more AND/OR complexity = fewer results.
  const BROAD_TITLES = [
    "buyer", "merchant", "category", "purchasing",
    "merchandising", "procurement", "sourcing", "assortment",
  ];

  // User-selected titles from the UI take precedence; fall back to BROAD_TITLES.
  const apolloTitles = (Array.isArray(titleKeyword) && titleKeyword.length)
    ? titleKeyword.map(t => t.toLowerCase())
    : BROAD_TITLES;

  // ── POST-FILTER (applied client-side after Apollo responds) ──────────────
  // Single-word patterns only — avoids phrase-matching bugs.
  const KEYWORDS = [
    "buyer", "buying", "merchant", "category", "purchasing",
    "procurement", "sourcing", "merchandise", "merchandising",
    "assortment", "dmm", "gmm", "planner", "allocation",
    "director", "vp", "vice president", "head", "chief",
  ];

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const post = (body) =>
    fetch(APOLLO_SEARCH_ENDPOINT, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(body),
    });

  const dedupeByName = (people) => {
    const seen = new Set();
    return people.filter(p => {
      const k = `${p.first_name}${p.last_name || ""}`.toLowerCase().replace(/\s/g, "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const keywordFilter = (people) =>
    people.filter(p => KEYWORDS.some(kw => (p.title || "").toLowerCase().includes(kw)));

  const buildLead = (p, fallbackRetailer) => ({
    id:          p.id
                   ? `apollo_${p.id}`
                   : `apollo_${(fallbackRetailer || "unknown").replace(/\s+/g, "_").toLowerCase()}_${(p.first_name || "")}_${(p.last_name || "")}`.toLowerCase(),
    apolloId:    p.id || null,
    firstName:   p.first_name  || "",
    lastName:    p.last_name   || "",
    title:       p.title       || "",
    seniority:   p.seniority   || "",
    departments: p.departments || [],
    retailer:    p.organization_name || fallbackRetailer || "",
    email:       p.email       || null,
    phone:       p.phone_numbers?.[0]?.sanitized_number || null,
    location:    [p.city, p.state].filter(Boolean).join(", ") || "",
    country:     p.country     || null,
    linkedin:    p.linkedin_url || null,
  });

  // Fetch BATCH pages in parallel from the apollo search endpoint.
  const fetchPages = async (bodyBase, startPage, batchSize) => {
    const pages = Array.from({ length: batchSize }, (_, i) => startPage + i);
    console.log(`[fetchPages] endpoint=${APOLLO_SEARCH_ENDPOINT} pages=${pages} payload=${JSON.stringify(bodyBase)}`);

    return Promise.all(pages.map(async pg => {
      const payload = { ...bodyBase, page: pg, per_page: 100 };
      console.log(`[req page ${pg}]`, JSON.stringify(payload));

      const r = await post(payload);
      const d = await r.json();

      console.log(`[res page ${pg}] status=${r.status} people=${d?.people?.length ?? 0} total=${d?.pagination?.total_entries ?? 0} err=${d?.error ?? "none"}`);

      if (!r.ok) {
        console.error(`[apollo error page ${pg}]`, JSON.stringify(d));
      }

      return {
        people: d?.people || [],
        total:  d?.pagination?.total_entries || 0,
        pages:  d?.pagination?.total_pages   || 1,
      };
    }));
  };

  try {
    // ════════════════════════════════════════════════════════════════════════
    // PERSON NAME SEARCH
    // ════════════════════════════════════════════════════════════════════════
    if (personName) {
      console.log(`[person search] name="${personName}" cursor=${cursor}`);
      const start   = (cursor - 1) * BATCH + 1;
      const results = await fetchPages(
        { q_keywords: personName, person_titles: BROAD_TITLES },
        start,
        BATCH,
      );

      const apolloTotal = results[0]?.total || 0;
      const totalPages  = Math.min(results[0]?.pages || 1, 500);
      let   people      = results.flatMap(r => r.people).filter(p => p.first_name);
      people = dedupeByName(people);
      people = keywordFilter(people);

      const leads      = people.map(p => buildLead(p, ""));
      const nextCursor = start + BATCH <= totalPages ? cursor + 1 : null;
      console.log(`[person done] ${leads.length} leads, apolloTotal=${apolloTotal}`);
      return res.status(200).json({ leads, total: leads.length, apolloTotal, cursor, nextCursor });
    }

    // ════════════════════════════════════════════════════════════════════════
    // RETAILER / COMPANY SEARCH
    // Domain-based search: q_organization_domains is the most reliable way
    // to scope results to a specific company in Apollo's index. No org-ID
    // resolution needed — the domain IS the identifier.
    // ════════════════════════════════════════════════════════════════════════
    const domain = DOMAINS[retailer.toLowerCase().trim()];
    const start  = (cursor - 1) * BATCH + 1;

    // Scope the query — prefer domain, fall back to org name for unlisted retailers.
    // Never pass both: Apollo treats them as separate filters that AND together.
    const orgScope = domain
      ? { q_organization_domains: [domain] }
      : { q_organization_name: retailer };

    console.log(`[search] retailer="${retailer}" domain=${domain || "(none, using name)"} cursor=${cursor}`);

    // ── ATTEMPT 1: org-scoped + title-filtered ───────────────────────────
    const results1 = await fetchPages(
      { ...orgScope, person_titles: apolloTitles },
      start,
      BATCH,
    );

    const apolloTotal = results1[0]?.total || 0;
    const totalPages  = Math.min(results1[0]?.pages || 1, 500);
    let   people      = results1.flatMap(r => r.people).filter(p => p.first_name);
    people = dedupeByName(people);

    const preKeywordCount = people.length;
    people = keywordFilter(people);
    console.log(`[filter] ${preKeywordCount} raw → ${people.length} after keyword filter`);

    // ── ATTEMPT 2: org-scoped, NO title filter ───────────────────────────
    // If Apollo returned nothing with the title filter, the titles may not
    // match their index for this company. Retry with just the domain/name.
    if (preKeywordCount === 0) {
      console.log(`[fallback] Apollo returned 0 with title filter — retrying without titles`);
      const results2 = await fetchPages(
        { ...orgScope },
        start,
        BATCH,
      );
      let fallbackPeople = results2.flatMap(r => r.people).filter(p => p.first_name);
      fallbackPeople = dedupeByName(fallbackPeople);
      console.log(`[fallback] ${fallbackPeople.length} raw people (no title filter)`);

      const filtered = keywordFilter(fallbackPeople);
      // If keyword filter still finds relevant people, great. If not, return
      // the first 20 unfiltered — better to show something than nothing.
      people = filtered.length > 0 ? filtered : fallbackPeople.slice(0, 20);
      console.log(`[fallback] returning ${people.length} people`);

    } else if (preKeywordCount > 0 && people.length === 0) {
      // Apollo returned people but our keyword filter removed all of them.
      // This means the company has staff but none with buying-related titles.
      // Log sample titles so we can tune KEYWORDS, and return raw top 20.
      const sample = results1.flatMap(r => r.people).slice(0, 10).map(p => p.title).filter(Boolean);
      console.log(`[debug] keyword filter dropped all results. Sample titles:`, sample);
      people = results1.flatMap(r => r.people).filter(p => p.first_name).slice(0, 20);
    }

    const leads      = people.map(p => buildLead(p, retailer));
    const nextCursor = start + BATCH <= totalPages ? cursor + 1 : null;
    console.log(`[done] ${leads.length} leads returned, apolloTotal=${apolloTotal}`);
    return res.status(200).json({ leads, total: leads.length, apolloTotal, cursor, nextCursor });

  } catch (e) {
    console.error("[fatal]", e.message, e.stack);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
