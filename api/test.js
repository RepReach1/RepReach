export default async function handler(req, res) {
  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
  if (!APOLLO_API_KEY) return res.status(200).json({ error: "No API key found" });

  try {
    const r = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
      body: JSON.stringify({ organization_names: ["Walmart"], person_titles: ["buyer"], page: 1, per_page: 5 }),
    });
    const data = await r.json();
    return res.status(200).json({
      status: r.status,
      keyUsed: APOLLO_API_KEY.slice(0, 8) + "...",
      totalEntries: data?.pagination?.total_entries,
      peopleCount: data?.people?.length,
      error: data?.error,
      firstPerson: data?.people?.[0] ? {
        name: `${data.people[0].first_name} ${data.people[0].last_name}`,
        title: data.people[0].title,
        company: data.people[0].organization_name,
      } : null,
    });
  } catch (e) {
    return res.status(200).json({ fetchError: e.message });
  }
}
