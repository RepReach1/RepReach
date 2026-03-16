export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { apolloId, firstName, lastName, retailer, linkedin } = req.body;
  if (!apolloId && !firstName) return res.status(400).json({ error: "Missing contact info" });

  const APOLLO_ENRICH_KEY = process.env.APOLLO_API_KEY;

  try {
    const payload = {
      ...(apolloId
        ? { id: apolloId }
        : { first_name: firstName, last_name: lastName, organization_name: retailer, linkedin_url: linkedin || undefined }
      ),
      reveal_personal_emails: true,
      reveal_phone_number:    true,
    };

    const r = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_ENRICH_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Enrich error:", data?.error || r.status);
      return res.status(500).json({ error: data?.error || "Enrichment failed" });
    }

    const p = data?.person;
    if (!p) return res.status(200).json({ enriched: false, _debug: { topKeys: Object.keys(data || {}), payload } });

    // Log what Apollo actually returned so we can diagnose missing emails
    console.log("Apollo enrich raw:", JSON.stringify({
      id: p.id, name: `${p.first_name} ${p.last_name}`,
      email: p.email, email_status: p.email_status,
      personal_emails: p.personal_emails,
      phone_numbers: p.phone_numbers?.length,
      contact_emails: p.contact_emails,
    }));

    // Pull email from whichever field Apollo populated
    const email = p.email
      || p.contact_emails?.[0]?.email
      || p.personal_emails?.[0]
      || null;

    return res.status(200).json({
      enriched: true,
      _debug: { email_status: p.email_status, had_email: !!p.email, had_personal: !!(p.personal_emails?.length), had_contact_emails: !!(p.contact_emails?.length) },
      // Contact
      email,
      emailStatus:      p.email_status || null,
      personalEmails:   p.personal_emails || [],
      phone:            p.phone_numbers?.[0]?.sanitized_number || null,
      allPhones:        (p.phone_numbers || []).map(ph => ({ number: ph.sanitized_number, type: ph.type })),
      // Social
      linkedin:         p.linkedin_url  || null,
      twitter:          p.twitter_url   || null,
      github:           p.github_url    || null,
      // Work
      title:            p.title         || null,
      seniority:        p.seniority     || null,
      departments:      p.departments   || [],
      functions:        p.functions     || [],
      // Location
      city:             p.city          || null,
      state:            p.state         || null,
      country:          p.country       || null,
      // Company
      company:          p.organization_name || null,
      companyWebsite:   p.organization?.website_url || null,
      companyPhone:     p.organization?.phone || null,
      companySize:      p.organization?.estimated_num_employees || null,
      companyRevenue:   p.organization?.annual_revenue_printed || null,
      companyIndustry:  p.organization?.industry || null,
      companyLinkedin:  p.organization?.linkedin_url || null,
    });

  } catch (e) {
    console.error("Enrich error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
