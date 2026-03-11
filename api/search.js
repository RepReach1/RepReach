export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, cursor = 1 } = req.body;
  if (!retailer) return res.status(400).json({ error: "Missing retailer" });

  const APOLLO_SEARCH_KEY = process.env.APOLLO_API_KEY || "NaiSzPpxILq0OSyylU1Cxg";
  const BATCH_SIZE = 5;

  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  };

  const KNOWN_DOMAINS = {
    "walmart": "walmart.com", "sam's club": "samsclub.com", "sams club": "samsclub.com",
    "kroger": "kroger.com", "target": "target.com", "costco": "costco.com",
    "home depot": "homedepot.com", "cvs": "cvs.com", "tractor supply": "tractorsupply.com",
    "amazon": "amazon.com", "lowe's": "lowes.com", "lowes": "lowes.com",
    "publix": "publix.com", "walgreens": "walgreens.com", "best buy": "bestbuy.com",
    "dollar general": "dollargeneral.com", "dollar tree": "dollartree.com",
    "albertsons": "albertsons.com", "aldi": "aldi.us", "trader joe's": "traderjoes.com",
    "whole foods": "wholefoodsmarket.com", "meijer": "meijer.com",
    "heb": "heb.com", "sprouts": "sprouts.com", "wegmans": "wegmans.com",
    "rite aid": "riteaid.com", "tj maxx": "tjmaxx.com",
    "ross": "rossstores.com", "marshalls": "marshalls.com",
    "7-eleven": "7-eleven.com", "family dollar": "familydollar.com",
  };

  // Titles sent TO Apollo to get relevant results back
  const APOLLO_TITLES = [
    "buyer", "senior buyer", "merchant", "senior merchant",
    "category manager", "senior category manager", "divisional merchandise manager",
    "general merchandise manager", "director of merchandising", "VP of merchandising",
    "head of merchandising", "director of buying", "director of purchasing",
    "director of sourcing", "director of category management", "purchasing manager",
    "procurement manager", "sourcing manager", "merchandise manager",
    "category director", "buying manager", "chief merchant",
    "merchandise planner", "inventory manager", "assortment manager",
    "VP of purchasing", "VP of sourcing", "VP of buying",
  ];

  // Keywords we hard-filter on after Apollo returns results
  const BUYER_KEYWORDS = [
    "buyer", "merchant", "category", "purchasing", "procurement",
    "sourcing", "merchandise", "buying", "assortment", "dmm", "gmm",
    "chief merchant", "planning", "allocation", "director of", "vp of", "head of",
  ];

  const searchPeople = async (body, page) => {
    try {
      const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...body, page, per_page: 100, api_key: APOLLO_SEARCH_KEY }),
      });
      const d = await r.json();
      console.log(`[page ${page}] status=${r.status} people=${d?.people?.length ?? 0} total=${d?.pagination?.total_entries ?? 0} error=${d?.error ?? "none"}`);
      return { people: d?.people || [], total: d?.pagination?.total_entries || 0, pages: d?.pagination?.total_pages || 1 };
    } catch(e) {
      console.error(`[page ${page}] threw:`, e.message);
      return { people: [], total: 0, pages: 1 };
    }
  };

  try {
    // ── Resolve org ID ──
    let orgId = null;
    const knownDomain = KNOWN_DOMAINS[retailer.toLowerCase().trim()];

    if (knownDomain) {
      try {
        const r = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${knownDomain}&api_key=${APOLLO_SEARCH_KEY}`, { headers });
        const d = await r.json();
        console.log(`[org enrich] domain=${knownDomain} id=${d?.organization?.id ?? "NONE"} error=${d?.error ?? "none"}`);
        if (d?.organization?.id) orgId = d.organization.id;
      } catch(e) { console.error("[org enrich] threw:", e.message); }
    }

    if (!orgId) {
      try {
        const r = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
          method: "POST", headers,
          body: JSON.stringify({ q_organization_name: retailer, page: 1, per_page: 5, api_key: APOLLO_SEARCH_KEY }),
        });
        const d = await r.json();
        const orgs = d?.organizations || d?.accounts || [];
        const best = orgs.find(o => o.name?.toLowerCase() === retailer.toLowerCase()) || orgs[0];
        if (best?.id) { orgId = best.id; console.log(`[org search] picked "${best.name}" id=${best.id}`); }
        else console.log(`[org search] no org found for "${retailer}"`);
      } catch(e) { console.error("[org search] threw:", e.message); }
    }

    // ── Build search body — titles sent to Apollo to help it find the right people ──
    const searchBody = orgId
      ? { organization_ids: [orgId], person_titles: APOLLO_TITLES }
      : { organization_names: [retailer], person_titles: APOLLO_TITLES };

    console.log(`[search] using orgId=${orgId} titles=${APOLLO_TITLES.length} cursor=${cursor}`);

    // ── Fetch 5 pages in parallel ──
    const startPage   = (cursor - 1) * BATCH_SIZE + 1;
    const pageNums    = Array.from({ length: BATCH_SIZE }, (_, i) => startPage + i);
    const pageResults = await Promise.all(pageNums.map(pg => searchPeople(searchBody, pg)));

    const apolloTotal      = pageResults[0]?.total || 0;
    const totalApolloPages = Math.min(pageResults[0]?.pages || 1, 500);
    let   allPeople        = pageResults.flatMap(r => r.people).filter(p => p.first_name);

    console.log(`[filter] raw: ${allPeople.length}, apolloTotal: ${apolloTotal}`);

    // Dedupe
    const seen = new Set();
    allPeople = allPeople.filter(p => {
      const k = `${p.first_name}${p.last_name || ""}`.toLowerCase().replace(/\s/g, "");
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });

    // Hard keyword filter on our side
    const beforeKw = allPeople.length;
    allPeople = allPeople.filter(p => BUYER_KEYWORDS.some(kw => (p.title || "").toLowerCase().includes(kw)));
    console.log(`[filter] after keyword filter: ${allPeople.length} (dropped ${beforeKw - allPeople.length})`);

    // If keyword filter wiped everything, return raw results so we can debug
    if (allPeople.length === 0 && beforeKw > 0) {
      console.log("[debug] keyword filter killed all results — sample titles:", pageResults.flatMap(r => r.people).slice(0, 10).map(p => p.title));
    }

    const leads = allPeople.map((p, i) => ({
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

    const nextCursor = startPage + BATCH_SIZE <= totalApolloPages ? cursor + 1 : null;
    console.log(`[done] returning ${leads.length} leads`);

    return res.status(200).json({ leads, total: leads.length, apolloTotal, cursor, nextCursor });

  } catch (e) {
    console.error("[fatal]", e.message);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
