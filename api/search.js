export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, titleKeyword, personName, cursor = 1 } = req.body;
  if (!retailer && !personName) return res.status(400).json({ error: "Missing retailer or personName" });

  const APOLLO_SEARCH_KEY = process.env.APOLLO_API_KEY    || "NaiSzPpxILq0OSyylU1Cxg";
  const APOLLO_ENRICH_KEY = process.env.APOLLO_ENRICH_KEY || "RDwOP69rbo3M2KQ1iJNLhQ";
  const BATCH_SIZE = 5; // 5 pages × 100 = 500 contacts per call

  const searchHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "X-Api-Key": APOLLO_SEARCH_KEY,
  };
  const enrichHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "X-Api-Key": APOLLO_ENRICH_KEY,
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

  // ── SEARCH ────────────────────────────────────────────────────────────────
  const searchPeople = async (body, page) => {
    const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: searchHeaders,
      body: JSON.stringify({ ...body, page, per_page: 100 }),
    });
    const d = await r.json();
    console.log(`Search page ${page}: ${d?.people?.length || 0} results, status ${r.status}`);
    if (d?.error) console.error("Search API error:", d.error);
    return {
      people: d?.people || [],
      total:  d?.pagination?.total_entries || 0,
      pages:  d?.pagination?.total_pages   || 1,
    };
  };

  // ── ENRICH (single contact) ───────────────────────────────────────────────
  // Pull every available field Apollo has on this person
  const enrichOne = async (p) => {
    try {
      const payload = {
        ...(p.id ? { id: p.id } : {
          first_name:        p.first_name,
          last_name:         p.last_name,
          organization_name: p.organization_name,
          linkedin_url:      p.linkedin_url || undefined,
        }),
        reveal_personal_emails: true,   // get work + personal
        reveal_phone_number:    true,   // get phone
      };

      const r = await fetch("https://api.apollo.io/api/v1/people/match", {
        method: "POST",
        headers: enrichHeaders,
        body: JSON.stringify(payload),
      });
      const d = await r.json();

      if (!r.ok) {
        console.error(`Enrich failed for ${p.first_name} ${p.last_name}: ${d?.error || r.status}`);
        return null;
      }

      const m = d?.person;
      if (!m) return null;

      // Pull EVERYTHING Apollo returns
      return {
        // Contact
        email:           m.email || null,
        email_status:    m.email_status || null,
        personal_emails: m.personal_emails || [],
        phone:           m.phone_numbers?.[0]?.sanitized_number || null,
        all_phones:      (m.phone_numbers || []).map(ph => ({
                           number: ph.sanitized_number,
                           type:   ph.type,
                         })),
        // Identity
        linkedin:        m.linkedin_url || null,
        twitter:         m.twitter_url  || null,
        github:          m.github_url   || null,
        facebook:        m.facebook_url || null,
        // Work
        title:           m.title || null,
        seniority:       m.seniority || null,
        departments:     m.departments || [],
        functions:       m.functions   || [],
        // Location
        city:            m.city    || null,
        state:           m.state   || null,
        country:         m.country || null,
        // Company
        company:         m.organization_name || null,
        company_website: m.organization?.website_url || null,
        company_phone:   m.organization?.phone || null,
        company_size:    m.organization?.estimated_num_employees || null,
        company_revenue: m.organization?.annual_revenue_printed || null,
        company_industry:m.organization?.industry || null,
        company_linkedin:m.organization?.linkedin_url || null,
      };
    } catch (e) {
      console.error(`Enrich exception for ${p.first_name} ${p.last_name}:`, e.message);
      return null;
    }
  };

  // Run enrichment in parallel batches of 5
  const enrichAll = async (people) => {
    const results = {};
    const batchSize = 5;
    for (let i = 0; i < people.length; i += batchSize) {
      const chunk = people.slice(i, i + batchSize);
      const enriched = await Promise.all(chunk.map(enrichOne));
      chunk.forEach((p, j) => {
        if (enriched[j]) results[p.id] = enriched[j];
      });
    }
    console.log(`Enriched ${Object.keys(results).length}/${people.length} contacts`);
    return results;
  };

  // ── MAP RAW APOLLO PERSON + ENRICH DATA → LEAD ────────────────────────────
  const mapLead = (p, enrichMap, i, cur) => {
    const en = enrichMap[p.id] || {};
    return {
      id:              `apollo_${cur}_${i}_${p.id || Math.random().toString(36).slice(2)}`,
      apolloId:        p.id || null,
      // Name
      firstName:       p.first_name || "",
      lastName:        p.last_name  || "",
      // Work
      title:           en.title    || p.title    || "",
      seniority:       en.seniority || p.seniority || "",
      departments:     en.departments || p.departments || [],
      functions:       en.functions   || p.functions   || [],
      // Company
      retailer:        en.company  || p.organization_name || "",
      companyWebsite:  en.company_website || null,
      companyPhone:    en.company_phone   || null,
      companySize:     en.company_size    || null,
      companyRevenue:  en.company_revenue || null,
      companyIndustry: en.company_industry|| null,
      companyLinkedin: en.company_linkedin|| null,
      // Contact
      email:           en.email          || p.email || null,
      emailStatus:     en.email_status   || null,
      personalEmails:  en.personal_emails|| [],
      phone:           en.phone          || p.phone_numbers?.[0]?.sanitized_number || null,
      allPhones:       en.all_phones     || [],
      // Social
      linkedin:        en.linkedin || p.linkedin_url || null,
      twitter:         en.twitter  || null,
      github:          en.github   || null,
      facebook:        en.facebook || null,
      // Location
      location:        [en.city || p.city, en.state || p.state].filter(Boolean).join(", ") || "",
      country:         en.country || p.country || null,
    };
  };

  // ── MAIN ──────────────────────────────────────────────────────────────────
  try {
    let searchBody = {};

    if (personName) {
      const parts = personName.trim().split(" ");
      searchBody = {
        q_person_name:     personName.trim(),
        person_first_name: parts[0]             || undefined,
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
          console.log(`Domain lookup: ${knownDomain} → ${orgName} (${orgId})`);
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
          console.log(`Org lookup: ${orgName} (${orgId})`);
        }
      }

      const personTitles = titleKeyword
        ? [titleKeyword, `${titleKeyword} buyer`, `${titleKeyword} merchant`, `senior ${titleKeyword}`, `director of ${titleKeyword}`]
        : DEFAULT_TITLES;

      searchBody = orgId
        ? { organization_ids: [orgId], person_titles: personTitles }
        : { organization_names: [retailer], person_titles: personTitles };
    }

    // Fetch pages
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

    console.log(`Found ${allPeople.length} people, enriching all...`);
    const enrichMap = await enrichAll(allPeople);
    const leads     = allPeople.map((p, i) => mapLead(p, enrichMap, i, cursor));
    const nextCursor = startPage + BATCH_SIZE <= totalApolloPages ? cursor + 1 : null;

    return res.status(200).json({ leads, total: leads.length, apolloTotal, cursor, nextCursor });

  } catch (e) {
    console.error("Search error:", e.message);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
