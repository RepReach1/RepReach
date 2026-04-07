export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, personName, titleKeyword, cursor = 1 } = req.body;
  if (!retailer && !personName) return res.status(400).json({ error: "Missing retailer or personName" });

  // Use APOLLO_API_KEY for search endpoints, fall back to APOLLO_ENRICH_KEY
  const KEY       = process.env.APOLLO_API_KEY || process.env.APOLLO_ENRICH_KEY;
  if (!KEY) return res.status(500).json({ error: "Apollo API key not configured" });

  const BATCH     = 5;
  const HEADERS   = { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": KEY };

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

  const DEFAULT_TITLES = [
    "buyer","senior buyer","merchant","senior merchant","category manager",
    "senior category manager","divisional merchandise manager","general merchandise manager",
    "director of merchandising","vp of merchandising","head of merchandising",
    "director of buying","director of purchasing","director of sourcing",
    "purchasing manager","procurement manager","sourcing manager",
    "merchandise manager","category director","buying manager","chief merchant",
    "merchandise planner","inventory manager","assortment manager",
  ];

  // titleKeyword is an array of selected title strings from the frontend
  const TITLES = (Array.isArray(titleKeyword) && titleKeyword.length)
    ? titleKeyword.map(t => t.toLowerCase())
    : DEFAULT_TITLES;

  const KEYWORDS = [
    "buyer","merchant","category","purchasing","procurement","sourcing",
    "merchandise","buying","assortment","dmm","gmm","chief merchant",
    "planner","allocation","director of","vp of","head of",
  ];

  const post = (url, body) =>
    fetch(url, { method:"POST", headers:HEADERS, body:JSON.stringify(body) });

  try {
    // ── PERSON NAME SEARCH ──────────────────────────────────────────────────
    if (personName) {
      console.log(`[person search] name="${personName}" cursor=${cursor}`);
      const start = (cursor - 1) * BATCH + 1;
      const pages = Array.from({length:BATCH}, (_,i) => start+i);
      const results = await Promise.all(pages.map(async pg => {
        const r = await post("https://api.apollo.io/v1/mixed_people/search", {
          q_keywords: personName,
          person_titles: DEFAULT_TITLES,
          page: pg,
          per_page: 100,
        });
        const d = await r.json();
        console.log(`[person page ${pg}] status=${r.status} people=${d?.people?.length??0} err=${d?.error??'none'}`);
        return { people: d?.people||[], total: d?.pagination?.total_entries||0, pages: d?.pagination?.total_pages||1 };
      }));

      const apolloTotal = results[0]?.total || 0;
      const totalPages  = Math.min(results[0]?.pages || 1, 500);
      let   people      = results.flatMap(r => r.people).filter(p => p.first_name);

      // Dedupe by full name
      const seen = new Set();
      people = people.filter(p => {
        const k = `${p.first_name}${p.last_name||""}`.toLowerCase().replace(/\s/g,"");
        if (seen.has(k)) return false; seen.add(k); return true;
      });

      // Keyword filter
      people = people.filter(p => KEYWORDS.some(kw => (p.title||"").toLowerCase().includes(kw)));

      const leads = people.map(p => ({
        // Use the full Apollo ID as the stable unique key — never truncate
        id:          p.id ? `apollo_${p.id}` : `apollo_name_${p.first_name}_${p.last_name}_${p.organization_name||"unknown"}`.toLowerCase().replace(/\s+/g,"_"),
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

      const nextCursor = start + BATCH <= totalPages ? cursor + 1 : null;
      console.log(`[person done] ${leads.length} leads, apolloTotal=${apolloTotal}`);
      return res.status(200).json({ leads, total:leads.length, apolloTotal, cursor, nextCursor });
    }

    // ── RETAILER / COMPANY SEARCH ───────────────────────────────────────────
    // 1. Resolve org ID
    let orgId = null;
    const domain = DOMAINS[retailer.toLowerCase().trim()];

    if (domain) {
      const r = await fetch(`https://api.apollo.io/v1/organizations/enrich?domain=${domain}`, { headers: HEADERS });
      const d = await r.json();
      console.log(`[enrich] domain=${domain} status=${r.status} id=${d?.organization?.id} err=${d?.error}`);
      orgId = d?.organization?.id || null;
    }

    if (!orgId) {
      const r = await post("https://api.apollo.io/v1/mixed_companies/search",
        { q_organization_name: retailer, page:1, per_page:5 });
      const d = await r.json();
      console.log(`[org search] status=${r.status} count=${d?.organizations?.length} err=${d?.error}`);
      const orgs = d?.organizations || d?.accounts || [];
      const best = orgs.find(o => o.name?.toLowerCase()===retailer.toLowerCase()) || orgs[0];
      if (best?.id) { orgId = best.id; console.log(`[org] picked "${best.name}" ${best.id}`); }
    }

    // Always scope by org ID or org name — never leave unscoped so different retailers get different results
    const searchBody = orgId
      ? { organization_ids:[orgId], person_titles:TITLES }
      : { organization_names:[retailer], person_titles:TITLES };

    console.log(`[search] retailer="${retailer}" orgId=${orgId} cursor=${cursor} titles=${TITLES.length}`);

    // 2. Fetch BATCH pages in parallel
    const start = (cursor - 1) * BATCH + 1;
    const pages = Array.from({length:BATCH}, (_,i) => start+i);
    const results = await Promise.all(pages.map(async pg => {
      const r = await post("https://api.apollo.io/v1/mixed_people/search", {...searchBody, page:pg, per_page:100});
      const d = await r.json();
      console.log(`[page ${pg}] status=${r.status} people=${d?.people?.length??0} total=${d?.pagination?.total_entries??0} err=${d?.error??'none'}`);
      return { people:d?.people||[], total:d?.pagination?.total_entries||0, pages:d?.pagination?.total_pages||1 };
    }));

    const apolloTotal = results[0]?.total || 0;
    const totalPages  = Math.min(results[0]?.pages || 1, 500);
    let   people      = results.flatMap(r => r.people).filter(p => p.first_name);
    console.log(`[raw] ${people.length} people before filter`);

    // 3. Dedupe by full name
    const seen = new Set();
    people = people.filter(p => {
      const k = `${p.first_name}${p.last_name||""}`.toLowerCase().replace(/\s/g,"");
      if (seen.has(k)) return false; seen.add(k); return true;
    });

    // 4. Hard keyword filter
    const pre = people.length;
    people = people.filter(p => KEYWORDS.some(kw => (p.title||"").toLowerCase().includes(kw)));
    console.log(`[filter] ${pre} -> ${people.length} after keyword filter`);

    if (people.length === 0 && pre > 0) {
      const sample = results.flatMap(r=>r.people).slice(0,8).map(p=>p.title).filter(Boolean);
      console.log(`[debug] sample titles that got filtered:`, sample);
    }

    const leads = people.map(p => ({
      // Use full Apollo person ID as the stable unique key — scoped to avoid cross-retailer collisions
      id:          p.id
                     ? `apollo_${p.id}`
                     : `apollo_${orgId||retailer.replace(/\s+/g,"_").toLowerCase()}_p${cursor}_${p.first_name}_${p.last_name||""}`.toLowerCase().replace(/\s+/g,"_"),
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

    const nextCursor = start + BATCH <= totalPages ? cursor + 1 : null;
    console.log(`[done] ${leads.length} leads, apolloTotal=${apolloTotal}`);
    return res.status(200).json({ leads, total:leads.length, apolloTotal, cursor, nextCursor });

  } catch(e) {
    console.error("[fatal]", e.message);
    return res.status(500).json({ error:e.message, leads:[] });
  }
}
