export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { firstName, lastName, retailer } = req.body;

  if (!firstName || !lastName || !retailer) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  try {
    // Try exact match first
    const matchRes = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        organization_name: retailer,
        reveal_personal_emails: true,
        reveal_phone_number: true,
      }),
    });

    const matchData = await matchRes.json();
    const person = matchData?.person;

    if (person) {
      return res.status(200).json({
        email: person.email || person.personal_emails?.[0] || null,
        phone: person.phone_numbers?.[0]?.sanitized_number || null,
        title: person.title || null,
        linkedin: person.linkedin_url || null,
        apolloEnriched: true,
      });
    }

    // Fallback to search
    const searchRes = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify({
        q_keywords: `${firstName} ${lastName}`,
        organization_names: [retailer],
        page: 1,
        per_page: 1,
      }),
    });

    const searchData = await searchRes.json();
    const result = searchData?.people?.[0] || searchData?.contacts?.[0];

    if (result) {
      return res.status(200).json({
        email: result.email || result.personal_emails?.[0] || null,
        phone: result.phone_numbers?.[0]?.sanitized_number || null,
        title: result.title || null,
        linkedin: result.linkedin_url || null,
        apolloEnriched: true,
      });
    }

    return res.status(200).json({ apolloEnriched: false });
  } catch (e) {
    console.error("Apollo error:", e);
    return res.status(500).json({ error: "Apollo lookup failed" });
  }
}
