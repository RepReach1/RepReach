export default async function handler(req, res) {
  const SEARCH_KEY = process.env.APOLLO_API_KEY   || "xHkG62bA8-6XFutAKMgrFQ";
  const ENRICH_KEY = process.env.APOLLO_ENRICH_KEY || "xHkG62bA8-6XFutAKMgrFQ";
  const results = {};

  const sh = { "Content-Type": "application/json", "X-Api-Key": SEARCH_KEY };
  const eh = { "Content-Type": "application/json", "X-Api-Key": ENRICH_KEY };

  // Test 1: Search key — org lookup
  try {
    const r = await fetch("https://api.apollo.io/api/v1/organizations/enrich?domain=walmart.com", { headers: sh });
    const d = await r.json();
    results.orgEnrich = { status: r.status, orgId: d?.organization?.id || null, error: d?.error || null };
  } catch(e) { results.orgEnrich = { error: e.message }; }

  // Test 2: Search key — people search
  try {
    const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST", headers: sh,
      body: JSON.stringify({ organization_names: ["Walmart"], person_titles: ["buyer"], page: 1, per_page: 3 })
    });
    const d = await r.json();
    results.peopleSearch = { status: r.status, count: d?.people?.length || 0, total: d?.pagination?.total_entries || 0, error: d?.error || null, sample: (d?.people||[]).slice(0,2).map(p => ({ name: p.first_name+" "+p.last_name, title: p.title })) };
  } catch(e) { results.peopleSearch = { error: e.message }; }

  // Test 3: Enrich key — people match
  try {
    const r = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST", headers: eh,
      body: JSON.stringify({ first_name: "John", last_name: "Smith", organization_name: "Walmart", reveal_personal_emails: true })
    });
    const d = await r.json();
    results.enrichTest = { status: r.status, found: !!d?.person, error: d?.error || null };
  } catch(e) { results.enrichTest = { error: e.message }; }

  return res.status(200).json(results);
}
