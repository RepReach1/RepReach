export default async function handler(req, res) {
  const KEY = process.env.APOLLO_API_KEY;
  if (!KEY) return res.status(500).json({ error: "APOLLO_API_KEY not set", keySet: false });

  const results = { keyPrefix: KEY.slice(0, 8) + "..." };
  const H = { "Content-Type": "application/json", "X-Api-Key": KEY };

  const safe = async (fn) => {
    try {
      const r = await Promise.race([fn(), new Promise((_, j) => setTimeout(() => j(new Error("timeout")), 8000))]);
      const text = await r.text();
      let d; try { d = JSON.parse(text); } catch { d = { _raw: text.slice(0, 300) }; }
      const arr = d?.people || d?.contacts || d?.organizations || d?.accounts || [];
      return {
        status: r.status,
        total: d?.pagination?.total_entries ?? (arr.length || null),
        count: arr.length,
        error: d?.error || d?._raw || null,
        sample: arr.slice(0, 2).map(p => ({ name: `${p.first_name||p.name||"?"} ${p.last_name||""}`.trim(), title: p.title, org: p.organization_name })),
      };
    } catch(e) { return { error: e.message }; }
  };

  // 1. Org enrich — GET, known working
  results.t1_orgEnrich = await safe(() =>
    fetch("https://api.apollo.io/v1/organizations/enrich?domain=walmart.com", { headers: H }));

  // 2. people/search — X-Api-Key header
  results.t2_peopleHeader = await safe(() =>
    fetch("https://api.apollo.io/v1/people/search", { method:"POST", headers:H,
      body: JSON.stringify({ organization_names:["Walmart"], page:1, per_page:5 }) }));

  // 3. people/search — api_key in body
  results.t3_peopleBody = await safe(() =>
    fetch("https://api.apollo.io/v1/people/search", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ api_key:KEY, organization_names:["Walmart"], page:1, per_page:5 }) }));

  // 4. people/search — api_key as query param
  results.t4_peopleQueryParam = await safe(() =>
    fetch(`https://api.apollo.io/v1/people/search?api_key=${KEY}`, { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ organization_names:["Walmart"], page:1, per_page:5 }) }));

  // 5. mixed_people/search — api_key in body (old auth method)
  results.t5_mixedPeopleBody = await safe(() =>
    fetch("https://api.apollo.io/v1/mixed_people/search", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ api_key:KEY, organization_names:["Walmart"], page:1, per_page:5 }) }));

  // 6. contacts/search — header auth
  results.t6_contactsHeader = await safe(() =>
    fetch("https://api.apollo.io/v1/contacts/search", { method:"POST", headers:H,
      body: JSON.stringify({ organization_names:["Walmart"], page:1, per_page:5 }) }));

  // 7. mixed_companies/search — header auth
  results.t7_mixedCompanies = await safe(() =>
    fetch("https://api.apollo.io/v1/mixed_companies/search", { method:"POST", headers:H,
      body: JSON.stringify({ q_organization_name:"Walmart", page:1, per_page:3 }) }));

  // 8. people/search — no filter at all, just page
  results.t8_peopleNoFilter = await safe(() =>
    fetch("https://api.apollo.io/v1/people/search", { method:"POST", headers:H,
      body: JSON.stringify({ page:1, per_page:3 }) }));

  // 9. Account / current user info
  results.t9_accountInfo = await safe(() =>
    fetch("https://api.apollo.io/v1/users/me", { headers: H }));

  // 10. Health / ping
  results.t10_health = await safe(() =>
    fetch("https://api.apollo.io/health", { headers: H }));

  return res.status(200).json(results);
}
