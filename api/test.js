export default async function handler(req, res) {
  const KEY = process.env.APOLLO_API_KEY;
  const out = {
    keyPrefix: KEY ? KEY.slice(0, 8) + "..." : "NOT SET",
    tests: {}
  };

  if (!KEY) {
    out.diagnosis = "❌ APOLLO_API_KEY is not set in Vercel environment variables";
    return res.status(200).json(out);
  }

  const H = { "Content-Type": "application/json", "X-Api-Key": KEY };

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
        error: d?.error || (r.status !== 200 ? text.slice(0, 200) : null) || null,
        sample: arr.slice(0, 1).map(p => ({ name: `${p.first_name || p.name || ""} ${p.last_name || ""}`.trim(), title: p.title })),
      };
    } catch (e) { out.tests[name] = { works: false, error: e.message }; }
  };

  await run("orgEnrich",    () => fetch("https://api.apollo.io/v1/organizations/enrich?domain=walmart.com", { headers: H }));
  await run("peopleSearch", () => fetch("https://api.apollo.io/v1/people/search", { method: "POST", headers: H, body: JSON.stringify({ organization_names: ["Walmart"], page: 1, per_page: 5 }) }));
  await run("enrichTest",   () => fetch("https://api.apollo.io/v1/people/match", { method: "POST", headers: H, body: JSON.stringify({ first_name: "John", last_name: "Furner", organization_name: "Walmart" }) }));

  const allWork = Object.values(out.tests).every(t => t.works);
  const anyFail = Object.entries(out.tests).filter(([, t]) => !t.works);

  out.diagnosis = allWork
    ? "✅ All endpoints working!"
    : `❌ Failing: ${anyFail.map(([k, t]) => `${k} (${t.error})`).join(", ")}`;

  return res.status(200).json(out);
}
