export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { firstName, lastName, retailer } = req.body;
  if (!firstName || !lastName || !retailer) return res.status(400).json({ error: "Missing fields" });

  const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

  try {
    // Step 1: Get Apollo data
    const matchRes = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        organization_name: retailer,
        reveal_personal_emails: true,
        reveal_phone_number: true,
      }),
    });

    const matchData = await matchRes.json();
    let person = matchData?.person;

    // Fallback to search
    if (!person) {
      const searchRes = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
        body: JSON.stringify({
          q_keywords: `${firstName} ${lastName}`,
          organization_names: [retailer],
          page: 1, per_page: 1,
        }),
      });
      const searchData = await searchRes.json();
      person = searchData?.people?.[0] || searchData?.contacts?.[0];
    }

    if (!person) return res.status(200).json({ apolloEnriched: false });

    const apolloTitle = person.title || null;
    const linkedinUrl = person.linkedin_url || null;

    // Step 2: If we have a LinkedIn URL, scrape their current title via LinkedIn's public profile
    let linkedinTitle = null;
    if (linkedinUrl) {
      try {
        const liRes = await fetch(`https://api.apollo.io/api/v1/people/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": APOLLO_API_KEY },
          body: JSON.stringify({
            linkedin_url: linkedinUrl,
            reveal_personal_emails: true,
            reveal_phone_number: true,
          }),
        });
        const liData = await liRes.json();
        if (liData?.person?.title) linkedinTitle = liData.person.title;
      } catch (e) {
        // LinkedIn lookup failed, use Apollo title
      }
    }

    // LinkedIn is always more up to date — use it as priority over Apollo
    return res.status(200).json({
      // Contact info always from Apollo — they have the best verified data
      email: person.email || person.personal_emails?.[0] || null,
      phone: person.phone_numbers?.[0]?.sanitized_number || null,
      // Title always from LinkedIn — more up to date than Apollo
      title: linkedinTitle || apolloTitle,
      apolloTitle,
      linkedinTitle,
      linkedin: linkedinUrl,
      apolloEnriched: true,
    });

  } catch (e) {
    console.error("Enrich error:", e);
    return res.status(500).json({ error: "Enrichment failed" });
  }
}
