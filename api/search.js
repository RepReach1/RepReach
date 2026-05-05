export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { retailer, cursor = 1 } = req.body;
  if (!retailer) return res.status(400).json({ error: "Missing retailer" });

  const KEY     = process.env.APOLLO_API_KEY || "3LBzFfcpFsLRVm4f-JznYw";
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

  const TITLES = [
    "buyer","senior buyer","merchant","senior merchant","category manager",
    "senior category manager","divisional merchandise manager","general merchandise manager",
    "director of merchandising","vp of merchandising","head of merchandising",
    "director of buying","director of purchasing","director of sourcing",
    "purchasing manager","procurement manager","sourcing manager",
    "merchandise manager","category director","buying manager","chief merchant",
    "merchandise planner","inventory manager","assortment manager",
  ];

  const post = async (url, body) => {
    const r = await fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
    const text = await r.text();
    let d;
    try { d = JSON.parse(text); } catch { throw new Error(`Apollo non-JSON response (${r.status}): ${text.slice(0, 120)}`); }
    if (!r.ok) throw new Error(d?.error || d?.message || `Apollo error ${r.status}`);
    return d;
  };

  try {
    // 1. Resolve org ID
    let orgId = null;
    const domain = DOMAINS[retailer.toLowerCase().trim()];

    if (domain) {
      const r = await fetch(`https://api.apollo.io/v1/organizations/enrich?domain=${domain}`, { headers: HEADERS });
      const text = await r.text();
      try {
        const d = JSON.parse(text);
        orgId = d?.organization?.id || null;
        console.log(`[org enrich] domain=${domain} id=${orgId}`);
      } catch { console.log(`[org enrich] non-JSON: ${text.slice(0,80)}`); }
    }

    if (!orgId) {
      try {
        const d = await post("https://api.apollo.io/v1/mixed_companies/search",
          { q_organization_name: retailer, page: 1, per_page: 5 });
        const orgs = d?.organizations || d?.accounts || [];
        const best = orgs.find(o => o.name?.toLowerCase() === retailer.toLowerCase()) || orgs[0];
        if (best?.id) { orgId = best.id; console.log(`[org search] picked "${best.name}" ${best.id}`); }
      } catch (e) { console.log(`[org search] failed: ${e.message}`); }
    }

    const searchBody = orgId
      ? { organization_ids: [orgId], person_titles: TITLES }
      : { organization_names: [retailer], person_titles: TITLES };

    // 2. Fetch pages in parallel using mixed_people/search (supports title filtering)
    const start = (cursor - 1) * BATCH + 1;
    const pages = Array.from({ length: BATCH }, (_, i) => start + i);

    const results = await Promise.allSettled(pages.map(async pg => {
      const d = await post("https://api.apollo.io/v1/mixed_people/search", { ...searchBody, page: pg, per_page: 100 });
      console.log(`[page ${pg}] people=${d?.people?.length ?? 0} total=${d?.pagination?.total_entries ?? 0}`);
      return {
        people: d?.people || [],
        total:  d?.pagination?.total_entries || 0,
        pages:  d?.pagination?.total_pages || 1,
      };
    }));

    // Surface any errors from page fetches
    const errors = results.filter(r => r.status === "rejected").map(r => r.reason?.message);
    if (errors.length) console.log(`[page errors]`, errors);

    const fulfilled = results.filter(r => r.status === "fulfilled").map(r => r.value);
    if (!fulfilled.length) {
      return res.status(500).json({ error: errors[0] || "All page fetches failed", leads: [] });
    }

    const apolloTotal = fulfilled[0]?.total || 0;
    const totalPages  = Math.min(fulfilled[0]?.pages || 1, 500);
    let   people      = fulfilled.flatMap(r => r.people).filter(p => p.first_name);

    // 3. Dedupe
    const seen = new Set();
    people = people.filter(p => {
      const k = `${p.first_name}${p.last_name || ""}`.toLowerCase().replace(/\s/g, "");
      if (seen.has(k)) return false; seen.add(k); return true;
    });

    console.log(`[done] ${people.length} people after dedupe, apolloTotal=${apolloTotal}`);

    const leads = people.map((p, i) => ({
      id:           `apollo_${cursor}_${i}_${(p.id || "").slice(-6)}`,
      apolloId:     p.id || null,
      firstName:    p.first_name || "",
      lastName:     p.last_name || p.last_name_obfuscated || "",
      title:        p.title || "",
      seniority:    p.seniority || "",
      departments:  p.departments || [],
      retailer:     p.organization_name || p.organization?.name || retailer,
      email:        p.email || null,
      phone:        p.phone_numbers?.[0]?.sanitized_number || null,
      hasEmail:     !!(p.email || p.has_email),
      hasPhone:     !!(p.phone_numbers?.length || p.has_direct_phone === "Yes"),
      location:     [p.city, p.state].filter(Boolean).join(", ") || "",
      country:      p.country || null,
      linkedin:     p.linkedin_url || null,
    }));

    const nextCursor = start + BATCH <= totalPages ? cursor + 1 : null;
    return res.status(200).json({ leads, total: leads.length, apolloTotal, cursor, nextCursor });

  } catch (e) {
    console.error("[fatal]", e.message);
    return res.status(500).json({ error: e.message, leads: [] });
  }
}
