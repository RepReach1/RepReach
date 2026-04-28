#!/usr/bin/env node
/**
 * Run: APOLLO_API_KEY=your_key node scripts/test-apollo.js
 */
const KEY = process.env.APOLLO_API_KEY;
if (!KEY) { console.error("Set APOLLO_API_KEY env var"); process.exit(1); }
const h = { "Content-Type": "application/json", "X-Api-Key": KEY };

const postH = (url, body) =>
  fetch(url, { method: "POST", headers: h, body: JSON.stringify(body) });
const postB = (url, body) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, api_key: KEY }) });

async function test(name, fn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000))
    ]);
    console.log(`✓ status=${result.status} | total=${result.total ?? "?"} | count=${result.count ?? "?"} | error=${result.error || "none"}`);
    if (result.sample?.length) console.log("  sample:", JSON.stringify(result.sample[0]));
    return result;
  } catch(e) {
    console.log(`✗ ${e.message}`);
    return null;
  }
}

async function parseSearch(r, key = "people") {
  const text = await r.text();
  let d;
  try { d = JSON.parse(text); } catch { return { status: r.status, error: text.slice(0, 200) }; }
  const arr = d?.[key] || d?.contacts || d?.people || [];
  return {
    status: r.status,
    total: d?.pagination?.total_entries ?? 0,
    count: arr.length,
    error: d?.error || null,
    sample: arr.slice(0, 1).map(p => ({ name: `${p.first_name} ${p.last_name}`, title: p.title, org: p.organization_name })),
  };
}

console.log(`\nApollo API Diagnostic — key: ${KEY.slice(0,8)}...\n`);

// 1. Org enrich (baseline)
await test("GET organizations/enrich (walmart.com)", async () => {
  const r = await fetch("https://api.apollo.io/v1/organizations/enrich?domain=walmart.com", { headers: h });
  const d = await r.json();
  return { status: r.status, orgId: d?.organization?.id, total: d?.organization ? 1 : 0, error: d?.error || null };
});

// 2. people/search header auth
const r2 = await test("POST people/search header auth (Walmart buyers)", async () => {
  const r = await postH("https://api.apollo.io/v1/mixed_people/api_search",
    { organization_names: ["Walmart"], page: 1, per_page: 5 });
  return parseSearch(r);
});

// 3. people/search body auth
await test("POST people/search body auth (Walmart)", async () => {
  const r = await postB("https://api.apollo.io/v1/mixed_people/api_search",
    { organization_names: ["Walmart"], page: 1, per_page: 5 });
  return parseSearch(r);
});

// 4. mixed_people/search header auth
await test("POST mixed_people/search header auth", async () => {
  const r = await postH("https://api.apollo.io/v1/mixed_people/api_search",
    { organization_names: ["Walmart"], page: 1, per_page: 5 });
  return parseSearch(r);
});

// 5. mixed_people/search body auth
await test("POST mixed_people/search body auth", async () => {
  const r = await postB("https://api.apollo.io/v1/mixed_people/api_search",
    { organization_names: ["Walmart"], page: 1, per_page: 5 });
  return parseSearch(r);
});

// 6. contacts/search
await test("POST contacts/search", async () => {
  const r = await postH("https://api.apollo.io/v1/contacts/search",
    { organization_names: ["Walmart"], page: 1, per_page: 5 });
  return parseSearch(r, "contacts");
});

// 7. mixed_companies/search
await test("POST mixed_companies/search", async () => {
  const r = await postH("https://api.apollo.io/v1/mixed_companies/search",
    { q_organization_name: "Walmart", page: 1, per_page: 3 });
  const d = await r.json();
  const orgs = d?.organizations || d?.accounts || [];
  return { status: r.status, count: orgs.length, total: orgs.length, error: d?.error || null };
});

console.log("\nDone.");
