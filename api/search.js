export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, personName, titleKeyword, cursor = 1 } = req.body;
  if (!retailer && !personName) return res.status(400).json({ error: "Missing retailer or personName" });

  // Apollo provides a single API key that works for all endpoints (search + enrich).
  // Set APOLLO_API_KEY in your Vercel environment variables (or .env locally).
  const KEY = process.env.APOLLO_API_KEY;
  if (!KEY) {
    console.error("[fatal] APOLLO_API_KEY environment variable is not set.");
    return res.status(500).json({ error: "Apollo API key not configured", leads: [] });
  }

  const BATCH   = 5;
  const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": KEY };

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

  // ── TITLE STRATEGY ────────────────────────────────────────────────────────
  // Apollo's person_titles filter does substring matching against their
  // normalized title index. Fewer, broader terms = far more recall.
  // We do precise keyword filtering ourselves after Apollo returns results.
  const BROAD_TITLES = [
    "buyer", "merchant", "category", "purchasing", "merchandising",
    "procurement", "sourcing", "assortment",
  ];

  // If the user selected specific titles from the UI, use those verbatim.
  // Otherwise use the broad list above so Apollo casts a wide net.
  const apolloTitles = (Array.isArray(titleKeyword) && titleKeyword.length)
    ? titleKeyword.map(t => t.toLowerCase())
    : BROAD_TITLES;

  // ── POST-FILTER KEYWORDS (applied to Apollo's response on our side) ───────
  // These catch titles Apollo returns that are relevant buying/merch roles.
  // Intentionally broad — single words only, no multi-word phrases.
  const KEYWORDS = [
    "buyer", "buying", "merchant", "category", "purchasing",
    "procurement", "sourcing", "merchandise", "merchandising",
    "assortment", "dmm", "gmm", "planner", "allocation",
    "director", "vp", "vice president", "head", "chief",
  ];

  const post = (url, body) =>
    fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });

  // ── SHARED HELPERS ────────────────────────────────────────────────────────
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
                   : `apollo_${(fallbackRetailer || "unknown").replace(/\s+/g, "_").toLowerCase()}_${p.first_name || ""}_${p.last_name || ""}`.toLowerCase(),
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

  const fetchPages = async (bodyBase, startPage, batchSize) => {
    const pages = Array.from({ length: batchSize }, (_, i) => startPage + i);
    const results = await Promise.all(pages.map(async pg => {
      const r = await post("https://api.apollo.io/v1/mixed_people/search", {
        ...bodyBase,
        page: pg,
        per_page: 100,
      });
      const d = await r.json();
      console.log(`[page ${pg}] status=${r.status} people=${d?.people?.length ?? 0} total=${d?.pagination?.total_entries ?? 0} err=${d?.error ?? "none"}`);
      return {
        people: d?.people || [],
        total:  d?.pagination?.total_entries || 0,
        pages:  d?.pagination?.total_pages   || 1,
      };
    }));
    return results;
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
    // ════════════════════════════════════════════════════════════════════════

    // 1. Resolve Apollo org ID via domain (most reliable) or company name search
    let orgId = null;
    const domain = DOMAINS[retailer.toLowerCase().trim()];

    if (domain) {
      const r = await fetch(
        `https://api.apollo.io/v1/organizations/enrich?domain=${domain}`,
        { headers: HEADERS },
      );
      const d = await r.json();
      console.log(`[enrich] domain=${domain} status=${r.status} id=${d?.organization?.id} err=${d?.error}`);
      orgId = d?.organization?.id || null;
    }

    if (!orgId) {
      const r = await post("https://api.apollo.io/v1/mixed_companies/search", {
        q_organization_name: retailer,
        page: 1,
        per_page: 5,
      });
      const d = await r.json();
      console.log(`[org search] status=${r.status} count=${d?.organizations?.length} err=${d?.error}`);
      const orgs = d?.organizations || d?.accounts || [];
      const best = orgs.find(o => o.name?.toLowerCase() === retailer.toLowerCase()) || orgs[0];
      if (best?.id) {
        orgId = best.id;
        console.log(`[org] picked "${best.name}" id=${best.id}`);
      }
    }

    // 2. Build search body — always scoped to this org so results are retailer-specific
    const scopedBy = orgId
      ? { organization_ids: [orgId] }
      : { organization_names: [retailer] };

    const start = (cursor - 1) * BATCH + 1;

    // ── ATTEMPT 1: scoped + title-filtered ───────────────────────────────────
    console.log(`[search] retailer="${retailer}" orgId=${orgId} cursor=${cursor} titles=${apolloTitles.join(",")}`);
    const results1 = await fetchPages(
      { ...scopedBy, person_titles: apolloTitles },
      start,
      BATCH,
    );

    const apolloTotal = results1[0]?.total || 0;
    const totalPages  = Math.min(results1[0]?.pages || 1, 500);
    let   people      = results1.flatMap(r => r.people).filter(p => p.first_name);
    people = dedupeByName(people);

    const preTitleFilter = people.length;
    people = keywordFilter(people);
    console.log(`[filter] ${preTitleFilter} -> ${people.length} after keyword filter`);

    // ── ATTEMPT 2 (fallback): if 0 results, retry WITHOUT title filter ────────
    // Apollo may not have these people indexed under those titles. Return
    // anyone at that company and let the keyword filter do its work.
    if (people.length === 0 && preTitleFilter === 0) {
      console.log(`[fallback] 0 from titled search — retrying org-only, no title filter`);
      const results2 = await fetchPages(
        { ...scopedBy },          // no person_titles — broadest possible query for this org
        start,
        BATCH,
      );
      let fallbackPeople = results2.flatMap(r => r.people).filter(p => p.first_name);
      fallbackPeople = dedupeByName(fallbackPeople);

      if (fallbackPeople.length > 0) {
        console.log(`[fallback] ${fallbackPeople.length} raw people from org-only search`);
        // Apply keyword filter; if still 0 (org has no buying staff), return top 20 unfiltered
        const filtered = keywordFilter(fallbackPeople);
        people = filtered.length > 0 ? filtered : fallbackPeople.slice(0, 20);
        console.log(`[fallback] returning ${people.length} people`);
      }
    } else if (preTitleFilter > 0 && people.length === 0) {
      // Apollo returned people but our keyword filter removed them all.
      // Log the titles so we can tune the filter, and return raw results.
      const sample = results1.flatMap(r => r.people).slice(0, 8).map(p => p.title).filter(Boolean);
      console.log(`[debug] keyword filter removed everything. Sample titles:`, sample);
      // Return up to 20 unfiltered so the user isn't left empty-handed
      people = results1.flatMap(r => r.people).filter(p => p.first_name).slice(0, 20);
    }

    const leads      = people.map(p => buildLead(p, retailer));
    const nextCursor = start + BATCH <= totalPages ? cursor + 1 : null;
    console.log(`[done] ${leads.length} leads, apolloTotal=${apolloTotal}`);
    return res.status(200).json({ leads, total: leads.length, apolloTotal, cursor, nextCursor });

  } catch (e) {
    console.error("[fatal]", e.message, e.stack);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
