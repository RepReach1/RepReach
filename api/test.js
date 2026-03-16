export default async function handler(req, res) {
  const ENRICH_KEY = process.env.APOLLO_API_KEY;
  const SEARCH_KEY = process.env.APOLLO_SEARCH_KEY || process.env.APOLLO_API_KEY;

  const out = {
    keys: {
      APOLLO_API_KEY:    ENRICH_KEY ? ENRICH_KEY.slice(0,8)+"..." : "NOT SET",
      APOLLO_SEARCH_KEY: process.env.APOLLO_SEARCH_KEY ? process.env.APOLLO_SEARCH_KEY.slice(0,8)+"..." : "not set (falling back to APOLLO_API_KEY)",
      searchKeyDifferent: process.env.APOLLO_SEARCH_KEY && process.env.APOLLO_SEARCH_KEY !== ENRICH_KEY,
    },
    tests: {}
  };

  const EH = { "Content-Type": "application/json", "X-Api-Key": ENRICH_KEY };
  const SH = { "Content-Type": "application/json", "X-Api-Key": SEARCH_KEY };

  const run = async (name, fn) => {
    try {
      const r = await Promise.race([fn(), new Promise((_, j) => setTimeout(() => j(new Error("timeout")), 9000))]);
      const text = await r.text();
      let d; try { d = JSON.parse(text); } catch { d = null; }
      const arr = d?.people || d?.contacts || d?.organizations || [];
      out.tests[name] = {
        status: r.status,
        works: r.status === 200 && !d?.error,
        total: d?.pagination?.total_entries ?? arr.length,
        count: arr.length,
        error: d?.error || (r.status !== 200 ? text.slice(0,200) : null) || null,
        sample: arr.slice(0,1).map(p => ({ name:`${p.first_name||p.name||""} ${p.last_name||""}`.trim(), title:p.title })),
      };
    } catch(e) { out.tests[name] = { works: false, error: e.message }; }
  };

  // Enrichment endpoints (use APOLLO_API_KEY)
  await run("enrich_orgEnrich",   () => fetch("https://api.apollo.io/v1/organizations/enrich?domain=walmart.com", { headers: EH }));
  await run("enrich_peopleMatch", () => fetch("https://api.apollo.io/v1/people/match", { method:"POST", headers:EH, body: JSON.stringify({ first_name:"John", last_name:"Furner", organization_name:"Walmart" }) }));

  // Search endpoints (use APOLLO_SEARCH_KEY — must be different from enrich key)
  await run("search_peopleHeader", () => fetch("https://api.apollo.io/v1/people/search", { method:"POST", headers:SH, body: JSON.stringify({ organization_names:["Walmart"], page:1, per_page:5 }) }));
  await run("search_peopleBody",   () => fetch("https://api.apollo.io/v1/people/search", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ api_key:SEARCH_KEY, organization_names:["Walmart"], page:1, per_page:5 }) }));
  await run("search_mixedPeople",  () => fetch("https://api.apollo.io/v1/mixed_people/search", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ api_key:SEARCH_KEY, organization_names:["Walmart"], page:1, per_page:5 }) }));
  await run("search_mixedCompanies", () => fetch("https://api.apollo.io/v1/mixed_companies/search", { method:"POST", headers:SH, body: JSON.stringify({ q_organization_name:"Walmart", page:1, per_page:3 }) }));

  const enrichWorks = out.tests.enrich_orgEnrich?.works;
  const searchWorks = ["search_peopleHeader","search_peopleBody","search_mixedPeople"].some(k => out.tests[k]?.works);

  out.diagnosis = !ENRICH_KEY
    ? "❌ APOLLO_API_KEY is not set in Vercel environment variables"
    : !searchWorks && enrichWorks
    ? "❌ SEARCH KEY MISSING: Your APOLLO_API_KEY is an enrichment-only key. Go to Apollo → Settings → Integrations → API and copy the 'Search API Key' (separate field). Add it to Vercel as APOLLO_SEARCH_KEY."
    : searchWorks
    ? "✅ Search is working! People should appear in the app."
    : "❌ Both keys failing — check Apollo account status.";

  return res.status(200).json(out);
}
