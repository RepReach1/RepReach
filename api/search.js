export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, titleKeyword, personName, cursor = 1 } = req.body;
  if (!retailer && !personName) return res.status(400).json({ error: "Missing retailer or personName" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
  const BATCH_SIZE = 10;

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

  const DEFAULT_TITLES = [
    "buyer", "senior buyer", "merchant", "senior merchant",
    "category manager", "senior category manager", "purchasing manager",
    "divisional merchandise manager", "DMM", "director of merchandising",
    "VP merchandising", "head of buying", "chief merchant",
    "merchandise manager", "procurement manager", "sourcing manager",
    "director of purchasing", "inventory manager", "buying manager",
  ];

  const fetchPage = async (body, pg) => {
    const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
      body: JSON.stringify({ ...body, page: pg, per_page: 100 }),
    });
    const d = await r.json();
    console.log(`Page ${pg}: ${d?.people?.length} people | total: ${d?.pagination?.total_entries}`);
    return {
      people: d?.people || [],
      total:  d?.pagination?.total_entries || 0,
      pages:  d?.pagination?.total_pages   || 1,
    };
  };

  const mapLead = (p, i, cursorN) => ({
    id:        `apollo_${cursorN}_${i}_${p.id || Math.random().toString(36).slice(2)}`,
    apolloId:  p.id || null,
    firstName: p.first_name  || "",
    lastName:  p.last_name   || "",
    title:     p.title       || "",
    retailer:  p.organization_name || "",
    email:     p.email       || null,
    phone:     p.phone_numbers?.[0]?.sanitized_number || null,
    location:  [p.city, p.state].filter(Boolean).join(", ") || "",
    linkedin:  p.linkedin_url || null,
  });

  try {
    // ── PERSON NAME SEARCH ──
    if (personName) {
      const nameParts = personName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName  = nameParts.slice(1).join(" ") || undefined;

      const searchBody = {
        q_person_name: personName.trim(), // full name search
        ...(firstName && { person_first_name: firstName }),
        ...(lastName  && { person_last_name:  lastName }),
      };

      const startPage = (cursor - 1) * BATCH_SIZE + 1;
      const pages = Array.from({ length: BATCH_SIZE }, (_, i) => startPage + i);
      const results = await Promise.all(pages.map(pg => fetchPage(searchBody, pg)));

      const apolloTotal = results[0]?.total || 0;
      const totalApolloPages = Math.min(results[0]?.pages || 1, 500);
      const allPeople = results.flatMap(r => r.people);

      // Dedupe
      const seen = new Set();
      const unique = allPeople.filter(p => {
        if (!p.first_name) return false;
        const k = `${p.first_name}${p.last_name || ""}`.toLowerCase().replace(/\s/g, "");
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      const leads = unique.map((p, i) => mapLead(p, i, cursor));
      const nextCursor = startPage + BATCH_SIZE <= totalApolloPages ? cursor + 1 : null;

      console.log(`Person search "${personName}": ${leads.length} results | total: ${apolloTotal}`);
      return res.status(200).json({ leads, total: leads.length, apolloTotal, cursor, nextCursor });
    }

    // ── COMPANY SEARCH ──
    let orgId = null;
    let orgName = retailer;
    const domainKey = retailer.toLowerCase().trim();
    const knownDomain = KNOWN_DOMAINS[domainKey];

    if (knownDomain) {
      const enrichRes = await fetch(
        `https://api.apollo.io/api/v1/organizations/enrich?domain=${knownDomain}`,
        { headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY } }
      );
      const enrichData = await enrichRes.json();
      if (enrichData?.organization?.id) {
        orgId   = enrichData.organization.id;
        orgName = enrichData.organization.name || retailer;
        console.log(`Domain: ${knownDomain} → ${orgName} (${orgId})`);
      }
    }

    if (!orgId) {
      const orgRes = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
        body: JSON.stringify({ q_organization_name: retailer, page: 1, per_page: 5 }),
      });
      const orgData = await orgRes.json();
      const orgs = orgData?.organizations || orgData?.accounts || [];
      if (orgs.length > 0) {
        const exact = orgs.find(o => o.name?.toLowerCase() === retailer.toLowerCase());
        const best  = exact || orgs[0];
        orgId   = best.id;
        orgName = best.name || retailer;
        console.log(`Name match: ${orgName} (${orgId})`);
      }
    }

    const personTitles = titleKeyword
      ? [titleKeyword, `${titleKeyword} buyer`, `${titleKeyword} merchant`, `senior ${titleKeyword}`, `director of ${titleKeyword}`]
      : DEFAULT_TITLES;

    const searchBody = orgId
      ? { organization_ids: [orgId], person_titles: personTitles }
      : { organization_names: [retailer], person_titles: personTitles };

    const startPage = (cursor - 1) * BATCH_SIZE + 1;
    const pages = Array.from({ length: BATCH_SIZE }, (_, i) => startPage + i);
    const results = await Promise.all(pages.map(pg => fetchPage(searchBody, pg)));

    const apolloTotal = results[0]?.total || 0;
    const totalApolloPages = Math.min(results[0]?.pages || 1, 500);
    const allPeople = results.flatMap(r => r.people);

    // Hard filter by company
    const searchLower  = retailer.toLowerCase();
    const orgNameLower = orgName.toLowerCase();
    const filtered = allPeople.filter(p => {
      if (!p.first_name) return false;
      const pOrg = (p.organization_name || "").toLowerCase();
      return (
        pOrg.includes(searchLower) ||
        searchLower.includes(pOrg.split(" ")[0]) ||
        pOrg.includes(orgNameLower.split(" ")[0]) ||
        (orgId && p.organization_id === orgId)
      );
    });

    // Dedupe
    const seen = new Set();
    const unique = filtered.filter(p => {
      const k = `${p.first_name}${p.last_name || ""}`.toLowerCase().replace(/\s/g, "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const leads = unique.map((p, i) => mapLead(p, i, cursor));
    const nextCursor = startPage + BATCH_SIZE <= totalApolloPages ? cursor + 1 : null;

    console.log(`Company "${orgName}": ${leads.length} contacts | total: ${apolloTotal} | next: ${nextCursor}`);
    return res.status(200).json({ leads, total: leads.length, apolloTotal, cursor, nextCursor, orgName });

  } catch (e) {
    console.error("Search error:", e.message);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
