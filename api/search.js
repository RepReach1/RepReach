export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, cursor = 1 } = req.body;
  if (!retailer) return res.status(400).json({ error: "Missing retailer" });

  const APOLLO_SEARCH_KEY = process.env.APOLLO_API_KEY || "NaiSzPpxILq0OSyylU1Cxg";
  const BATCH_SIZE = 5; // 5 pages x 100 = 500 per load

  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "X-Api-Key": APOLLO_SEARCH_KEY,
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

  // Only show contacts whose title contains one of these keywords
  const BUYER_KEYWORDS = [
    "buyer", "merchant", "category", "purchasing", "procurement",
    "sourcing", "merchandise", "buying", "vendor", "assortment",
    "inventory", "replenishment", "dmm", "gmm", "chief merchant",
    "head of", "vp of merchandising", "director of merchandising",
    "director of buying", "director of purchasing", "director of sourcing",
    "director of category", "planning", "allocation",
  ];

  const searchPeople = async (body, page) => {
    const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, page, per_page: 100 }),
    });
    const d = await r.json();
    console.log(`Page ${page}: ${d?.people?.length || 0} people, total: ${d?.pagination?.total_entries}`);
    if (d?.error) console.error("Apollo error:", d.error);
    return {
      people: d?.people || [],
      total:  d?.pagination?.total_entries || 0,
      pages:  d?.pagination?.total_pages   || 1,
    };
  };

  try {
    // Resolve org ID
    let orgId = null, orgName = retailer;
    const knownDomain = KNOWN_DOMAINS[retailer.toLowerCase().trim()];

    if (knownDomain) {
      const r = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${knownDomain}`, { headers });
      const d = await r.json();
      if (d?.organization?.id) {
        orgId   = d.organization.id;
        orgName = d.organization.name || retailer;
        console.log(`Domain: ${knownDomain} -> ${orgName} (${orgId})`);
      }
    }

    if (!orgId) {
      const r = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
        method: "POST", headers,
        body: JSON.stringify({ q_organization_name: retailer, page: 1, per_page: 5 }),
      });
      const d = await r.json();
      const orgs = d?.organizations || d?.accounts || [];
      if (orgs.length > 0) {
        const best = orgs.find(o => o.name?.toLowerCase() === retailer.toLowerCase()) || orgs[0];
        orgId   = best.id;
        orgName = best.name || retailer;
        console.log(`Org lookup: ${orgName} (${orgId})`);
      }
    }

    // No title filter passed to Apollo — we get everyone at the org, filter ourselves
    const searchBody = orgId
      ? { organization_ids: [orgId] }
      : { organization_names: [retailer] };

    // Fetch pages in parallel
    const startPage   = (cursor - 1) * BATCH_SIZE + 1;
    const pageNums    = Array.from({ length: BATCH_SIZE }, (_, i) => startPage + i);
    const pageResults = await Promise.all(pageNums.map(pg => searchPeople(searchBody, pg)));

    const apolloTotal      = pageResults[0]?.total || 0;
    const totalApolloPages = Math.min(pageResults[0]?.pages || 1, 500);
    let   allPeople        = pageResults.flatMap(r => r.people).filter(p => p.first_name);

    // Dedupe by name
    const seen = new Set();
    allPeople = allPeople.filter(p => {
      const k = `${p.first_name}${p.last_name || ""}`.toLowerCase().replace(/\s/g, "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Hard-coded title filter — only buyer/merchant/category roles
    allPeople = allPeople.filter(p => {
      const t = (p.title || "").toLowerCase();
      return BUYER_KEYWORDS.some(kw => t.includes(kw));
    });

    // Company filter — make sure results actually belong to this retailer
    const sl = retailer.toLowerCase();
    allPeople = allPeople.filter(p => {
      const pOrg = (p.organization_name || "").toLowerCase();
      return pOrg.includes(sl) || sl.includes(pOrg.split(" ")[0]) || pOrg.includes(sl.split(" ")[0]);
    });

    console.log(`After filters: ${allPeople.length} buyer-role contacts for "${retailer}"`);

    const leads = allPeople.map((p, i) => ({
      id:          `apollo_${cursor}_${i}_${p.id || Math.random().toString(36).slice(2)}`,
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

    console.log(`Returning ${leads.length} leads, apolloTotal: ${apolloTotal}`);

    return res.status(200).json({
      leads,
      total:      leads.length,
      apolloTotal,
      cursor,
      nextCursor,
    });

  } catch (e) {
    console.error("Search error:", e.message);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
