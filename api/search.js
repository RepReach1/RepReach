export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, titleKeyword, personName, cursor = 1 } = req.body;
  if (!retailer && !personName) return res.status(400).json({ error: "Missing retailer or personName" });

  const APOLLO_SEARCH_KEY = process.env.APOLLO_API_KEY    || "NaiSzPpxILq0OSyylU1Cxg";
  const BATCH_SIZE = 5; // 5 pages × 100 = 500 contacts per call

  const searchHeaders = {
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

  const DEFAULT_TITLES = [
    "buyer", "senior buyer", "merchant", "senior merchant",
    "category manager", "senior category manager", "purchasing manager",
    "divisional merchandise manager", "DMM", "director of merchandising",
    "VP merchandising", "head of buying", "chief merchant",
    "merchandise manager", "procurement manager", "sourcing manager",
    "director of purchasing", "inventory manager", "buying manager",
  ];

  const searchPeople = async (body, page) => {
    const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: searchHeaders,
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
    let searchBody = {};

    if (personName) {
      const parts = personName.trim().split(" ");
      searchBody = {
        q_person_name:     personName.trim(),
        person_first_name: parts[0] || undefined,
        person_last_name:  parts.slice(1).join(" ") || undefined,
      };
    } else {
      // Resolve org ID
      let orgId = null, orgName = retailer;
      const knownDomain = KNOWN_DOMAINS[retailer.toLowerCase().trim()];

      if (knownDomain) {
        const r = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${knownDomain}`, { headers: searchHeaders });
        const d = await r.json();
        if (d?.organization?.id) {
          orgId   = d.organization.id;
          orgName = d.organization.name || retailer;
          console.log(`Domain: ${knownDomain} → ${orgName} (${orgId})`);
        }
      }

      if (!orgId) {
        const r = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
          method: "POST", headers: searchHeaders,
          body: JSON.stringify({ q_organization_name: retailer, page: 1, per_page: 5 }),
        });
        const d = await r.json();
        const orgs = d?.organizations || d?.accounts || [];
        if (orgs.length > 0) {
          const best = orgs.find(o => o.name?.toLowerCase() === retailer.toLowerCase()) || orgs[0];
          orgId   = best.id;
          orgName = best.name || retailer;
          console.log(`Org: ${orgName} (${orgId})`);
        }
      }

      const personTitles = titleKeyword
        ? [titleKeyword, `${titleKeyword} buyer`, `${titleKeyword} merchant`, `senior ${titleKeyword}`, `director of ${titleKeyword}`]
        : DEFAULT_TITLES;

      searchBody = orgId
        ? { organization_ids: [orgId], person_titles: personTitles }
        : { organization_names: [retailer], person_titles: personTitles };
    }

    // Fetch pages in parallel
    const startPage   = (cursor - 1) * BATCH_SIZE + 1;
    const pageNums    = Array.from({ length: BATCH_SIZE }, (_, i) => startPage + i);
    const pageResults = await Promise.all(pageNums.map(pg => searchPeople(searchBody, pg)));

    const apolloTotal      = pageResults[0]?.total || 0;
    const totalApolloPages = Math.min(pageResults[0]?.pages || 1, 500);
    let   allPeople        = pageResults.flatMap(r => r.people).filter(p => p.first_name);

    // Dedupe
    const seen = new Set();
    allPeople = allPeople.filter(p => {
      const k = `${p.first_name}${p.last_name || ""}`.toLowerCase().replace(/\s/g, "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Company filter
    if (retailer && !personName) {
      const sl = retailer.toLowerCase();
      allPeople = allPeople.filter(p => {
        const pOrg = (p.organization_name || "").toLowerCase();
        return pOrg.includes(sl) || sl.includes(pOrg.split(" ")[0]) || pOrg.includes(sl.split(" ")[0]);
      });
    }

    // Map to leads — NO enrichment here, that happens on-demand per contact
    const leads = allPeople.map((p, i) => ({
      id:        `apollo_${cursor}_${i}_${p.id || Math.random().toString(36).slice(2)}`,
      apolloId:  p.id || null,
      firstName: p.first_name  || "",
      lastName:  p.last_name   || "",
      title:     p.title       || "",
      seniority: p.seniority   || "",
      departments: p.departments || [],
      retailer:  p.organization_name || "",
      email:     p.email       || null,  // Apollo sometimes includes this for free
      phone:     p.phone_numbers?.[0]?.sanitized_number || null,
      location:  [p.city, p.state].filter(Boolean).join(", ") || "",
      country:   p.country     || null,
      linkedin:  p.linkedin_url || null,
    }));

    const nextCursor = startPage + BATCH_SIZE <= totalApolloPages ? cursor + 1 : null;

    console.log(`Returning ${leads.length} leads for "${retailer || personName}", apolloTotal: ${apolloTotal}`);

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
