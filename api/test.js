export default async function handler(req, res) {
  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_API_KEY) return res.status(200).json({ error: "No API key found" });

  try {
    const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
      body: JSON.stringify({ organization_names: ["Walmart"], person_titles: ["buyer"], page: 1, per_page: 3 }),
    });
    const data = await r.json();
    // Return full first person so we can see all field names
    return res.status(200).json({
      status: r.status,
      peopleCount: data?.people?.length,
      firstPersonRaw: data?.people?.[0] || null,
    });
  } catch (e) {
    return res.status(200).json({ fetchError: e.message });
  }
}
