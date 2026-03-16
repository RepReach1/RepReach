export default async function handler(req, res) {
  const KEY = process.env.APOLLO_API_KEY;
  if (!KEY) return res.status(500).json({ error: "APOLLO_API_KEY not set" });

  const results = {};
  const xHeader = { "Content-Type": "application/json", "X-Api-Key": KEY };

  const postH = (url, body) =>
    fetch(url, { method: "POST", headers: xHeader, body: JSON.stringify(body) });
  const postB = (url, body) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, api_key: KEY }) });

  // 1. Org enrich (known-working)
  try {
    const r = await fetch("https://api.apollo.io/v1/organizations/enrich?domain=walmart.com", { headers: xHeader });
    const d = await r.json();
    results.orgEnrich = { status: r.status, orgId: d?.organization?.id || null, error: d?.error || null };
  } catch(e) { results.orgEnrich = { error: e.message }; }

  // 2. people/search with X-Api-Key header
  try {
    const r = await postH("https://api.apollo.io/v1/people/search",
      { organization_names: ["Walmart"], person_titles: ["buyer"], page: 1, per_page: 3 });
    const d = await r.json();
    results.peopleSearchHeader = { status: r.status, count: d?.people?.length ?? 0, total: d?.pagination?.total_entries ?? 0, error: d?.error || null, raw: d?.people ? "has_people_key" : Object.keys(d||{}).join(",") };
  } catch(e) { results.peopleSearchHeader = { error: e.message }; }

  // 3. people/search with api_key in body
  try {
    const r = await postB("https://api.apollo.io/v1/people/search",
      { organization_names: ["Walmart"], person_titles: ["buyer"], page: 1, per_page: 3 });
    const d = await r.json();
    results.peopleSearchBody = { status: r.status, count: d?.people?.length ?? 0, total: d?.pagination?.total_entries ?? 0, error: d?.error || null };
  } catch(e) { results.peopleSearchBody = { error: e.message }; }

  // 4. mixed_people/search with api_key in body (original endpoint, different auth)
  try {
    const r = await postB("https://api.apollo.io/v1/mixed_people/search",
      { organization_names: ["Walmart"], person_titles: ["buyer"], page: 1, per_page: 3 });
    const d = await r.json();
    results.mixedPeopleBody = { status: r.status, count: d?.people?.length ?? 0, total: d?.pagination?.total_entries ?? 0, error: d?.error || null };
  } catch(e) { results.mixedPeopleBody = { error: e.message }; }

  // 5. contacts/search
  try {
    const r = await postH("https://api.apollo.io/v1/contacts/search",
      { organization_names: ["Walmart"], person_titles: ["buyer"], page: 1, per_page: 3 });
    const d = await r.json();
    results.contactsSearch = { status: r.status, count: d?.contacts?.length ?? 0, total: d?.pagination?.total_entries ?? 0, error: d?.error || null };
  } catch(e) { results.contactsSearch = { error: e.message }; }

  // 6. people/search — no title filter, just org
  try {
    const r = await postH("https://api.apollo.io/v1/people/search",
      { organization_names: ["Walmart"], page: 1, per_page: 3 });
    const d = await r.json();
    results.peopleNoFilter = { status: r.status, count: d?.people?.length ?? 0, total: d?.pagination?.total_entries ?? 0, error: d?.error || null, sample: (d?.people||[]).slice(0,2).map(p=>({ name:`${p.first_name} ${p.last_name}`, title:p.title })) };
  } catch(e) { results.peopleNoFilter = { error: e.message }; }

  // 7. mixed_companies/search (org discovery)
  try {
    const r = await postH("https://api.apollo.io/v1/mixed_companies/search",
      { q_organization_name: "Walmart", page: 1, per_page: 3 });
    const d = await r.json();
    const orgs = d?.organizations || d?.accounts || [];
    results.mixedCompanies = { status: r.status, count: orgs.length, error: d?.error || null, first: orgs[0]?.name || null };
  } catch(e) { results.mixedCompanies = { error: e.message }; }

  return res.status(200).json(results);
}
