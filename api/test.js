export default async function handler(req, res) {
  const KEY = process.env.APOLLO_API_KEY;
  if (!KEY) return res.status(500).json({
    error: "APOLLO_API_KEY env var is NOT SET in Vercel",
    fix: "Go to Vercel > Settings > Environment Variables and add APOLLO_API_KEY"
  });

  const out = { keyPrefix: KEY.slice(0, 8) + "...", keyLength: KEY.length, tests: {} };
  const H = { "Content-Type": "application/json", "X-Api-Key": KEY };

  const run = async (name, fn) => {
    try {
      const r = await Promise.race([fn(), new Promise((_, j) => setTimeout(() => j(new Error("timeout")), 9000))]);
      const text = await r.text();
      let d; try { d = JSON.parse(text); } catch { d = null; }
      const arr = d?.people || d?.contacts || d?.organizations || d?.accounts || [];
      out.tests[name] = {
        status: r.status,
        works: r.status === 200 && (!d?.error),
        total: d?.pagination?.total_entries ?? arr.length,
        count: arr.length,
        error: d?.error || (r.status !== 200 ? (d?._raw || text.slice(0, 150)) : null) || null,
        sample: arr.slice(0, 1).map(p => ({
          name: `${p.first_name || p.name || "?"} ${p.last_name || ""}`.trim(),
          title: p.title, org: p.organization_name
        })),
      };
    } catch(e) {
      out.tests[name] = { status: 0, works: false, error: e.message };
    }
  };

  // ── Enrichment endpoints (should work if this is an enrichment key) ──────────
  await run("orgEnrich_GET", () =>
    fetch("https://api.apollo.io/v1/organizations/enrich?domain=walmart.com", { headers: H }));

  await run("peopleMatch_POST", () =>
    fetch("https://api.apollo.io/v1/people/match", { method:"POST", headers:H,
      body: JSON.stringify({ first_name:"John", last_name:"Furner", organization_name:"Walmart" }) }));

  // ── Search endpoints (require Search API key) ────────────────────────────────
  await run("peopleSearch_headerAuth", () =>
    fetch("https://api.apollo.io/v1/people/search", { method:"POST", headers:H,
      body: JSON.stringify({ organization_names:["Walmart"], page:1, per_page:5 }) }));

  await run("peopleSearch_bodyAuth", () =>
    fetch("https://api.apollo.io/v1/people/search", { method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ api_key:KEY, organization_names:["Walmart"], page:1, per_page:5 }) }));

  await run("peopleSearch_queryParam", () =>
    fetch(`https://api.apollo.io/v1/people/search?api_key=${KEY}`, { method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ organization_names:["Walmart"], page:1, per_page:5 }) }));

  await run("mixedPeople_bodyAuth", () =>
    fetch("https://api.apollo.io/v1/mixed_people/search", { method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ api_key:KEY, organization_names:["Walmart"], page:1, per_page:5 }) }));

  await run("mixedCompanies_headerAuth", () =>
    fetch("https://api.apollo.io/v1/mixed_companies/search", { method:"POST", headers:H,
      body: JSON.stringify({ q_organization_name:"Walmart", page:1, per_page:3 }) }));

  // ── Diagnosis ─────────────────────────────────────────────────────────────────
  const enrichWorks = out.tests.orgEnrich_GET?.works;
  const anySearchWorks = ["peopleSearch_headerAuth","peopleSearch_bodyAuth","peopleSearch_queryParam","mixedPeople_bodyAuth"]
    .some(k => out.tests[k]?.works);

  out.diagnosis = enrichWorks && !anySearchWorks
    ? "KEY TYPE MISMATCH: This appears to be an Enrichment-only key. Go to Apollo > Settings > Integrations > API and look for a separate 'Search API Key'. Set that key as APOLLO_API_KEY in Vercel."
    : !enrichWorks
    ? "KEY INVALID: The API key does not work at all. Check APOLLO_API_KEY in Vercel settings."
    : anySearchWorks
    ? "SEARCH WORKS: People search is functional. Check the search.js fallback logic."
    : "UNKNOWN: All tests failed unexpectedly.";

  return res.status(200).json(out);
}
