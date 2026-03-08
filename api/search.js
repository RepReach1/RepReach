export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, titleKeyword } = req.body;
  if (!retailer) return res.status(400).json({ error: "Missing retailer" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  // Known domains for major retailers — gives Apollo an exact org to search
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
    "rite aid": "riteaid.com", "7-eleven": "7-eleven.com",
    "bed bath": "bedbathandbeyond.com", "tj maxx": "tjmaxx.com",
    "ross": "rossstores.com", "marshalls": "marshalls.com",
  };

  const DEFAULT_TITLES = [
    "buyer", "senior buyer", "merchant", "senior merchant",
    "category manager", "senior category manager", "purchasing manager",
    "divisional merchandise manager", "DMM", "director of merchandising",
    "VP merchandising", "head of buying", "chief merchant",
    "merchandise manager", "procurement manager", "sourcing manager",
    "director of purchasing", "inventory manager",
  ];

  const personTitles = titleKeyword
    ? [titleKeyword, `${titleKeyword} buyer`, `${titleKeyword} merchant`, `senior ${titleKeyword}`, `director of ${titleKeyword}`]
    : DEFAULT_TITLES;

  try {
    // Step 1: Get organization ID — try domain lookup first (most accurate), then name search
    let orgId = null;
    let orgName = retailer;
    const domainKey = retailer.toLowerCase().trim();
    const knownDomain = KNOWN_DOMAINS[domainKey];

    if (knownDomain) {
      // Enrich by domain — most reliable method
      const enrichRes = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${knownDomain}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
      });
      const enrichData = await enrichRes.json();
      if (enrichData?.organization?.id) {
        orgId = enrichData.organization.id;
        orgName = enrichData.organization.name || retailer;
        console.log(`Domain lookup: ${knownDomain} → org: ${orgName} (${orgId})`);
      }
    }

    if (!orgId) {
      // Fall back to name search
      const orgRes = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
        body: JSON.stringify({ q_organization_name: retailer, page: 1, per_page: 5 }),
      });
      const orgData = await orgRes.json();
      const orgs = orgData?.organizations || orgData?.accounts || [];
      console.log(`Name search for "${retailer}": found ${orgs.length} orgs`);

      if (orgs.length > 0) {
        const exact = orgs.find(o => o.name?.toLowerCase() === retailer.toLowerCase());
        const best  = exact || orgs[0];
        orgId   = best.id;
        orgName = best.name || retailer;
        console.log(`Using org: ${orgName} (${orgId})`);
      }
    }

    // Step 2: Fetch people — use organization_ids if we have one (exact filter)
    const fetchPage = async (page) => {
      const body = orgId
        ? { organization_ids: [orgId], person_titles: personTitles, page, per_page: 50 }
        : { organization_names: [retailer], person_titles: personTitles, page, per_page: 50 };

      const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      console.log(`Page ${page}: status=${r.status} people=${d?.people?.length} total=${d?.pagination?.total_entries}`);
      return { people: d?.people || [], total: d?.pagination?.total_entries || 0 };
    };

    const first = await fetchPage(1);
    const totalInApollo = first.total;
    const totalPages = Math.min(Math.ceil(totalInApollo / 50), 10);
    console.log(`Apollo total: ${totalInApollo}, fetching ${totalPages} pages`);

    let allPeople = [...first.people];
    if (totalPages > 1) {
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2))
      );
      for (const r of rest) allPeople = [...allPeople, ...r.people];
    }

    // Step 3: Hard filter — only keep people whose org name matches what was searched
    // This prevents Apollo fuzzy matches from leaking in other companies
    const searchLower = retailer.toLowerCase();
    const orgNameLower = orgName.toLowerCase();
    const filtered = allPeople.filter(p => {
      if (!p.first_name) return false;
      const pOrg = (p.organization_name || "").toLowerCase();
      // Keep if person's org matches either the searched name or the resolved org name
      return pOrg.includes(searchLower) || searchLower.includes(pOrg.split(" ")[0]) || pOrg.includes(orgNameLower.split(" ")[0]);
    });
    console.log(`After company filter: ${filtered.length} of ${allPeople.length}`);

    // Deduplicate by name
    const seen = new Set();
    const unique = filtered.filter(p => {
      const k = `${p.first_name}${p.last_name || ""}`.toLowerCase().replace(/\s/g, "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const leads = unique.map((p, i) => ({
      id: `apollo_${i}_${p.id || Math.random().toString(36).slice(2)}`,
      firstName:   p.first_name  || "",
      lastName:    p.last_name   || "",
      title:       p.title       || "Buyer",
      retailer:    p.organization_name || orgName,
      email:       p.email       || null,
      phone:       p.phone_numbers?.[0]?.sanitized_number || null,
      location:    [p.city, p.state].filter(Boolean).join(", ") || "",
      linkedin:    p.linkedin_url || null,
    }));

    console.log(`Returning ${leads.length} contacts for ${orgName}`);
    return res.status(200).json({ leads, total: leads.length, apolloTotal: totalInApollo });

  } catch (e) {
    console.error("Search error:", e.message);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
