export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { apolloId, firstName, lastName, retailer, linkedin } = req.body;
  if (!apolloId && !firstName) return res.status(400).json({ error: "Missing contact info" });

  const APOLLO_ENRICH_KEY = process.env.APOLLO_ENRICH_KEY || "RDwOP69rbo3M2KQ1iJNLhQ";

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
      },
      body: JSON.stringify({ ...payload, api_key: APOLLO_ENRICH_KEY }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Enrich error:", data?.error || r.status);
      return res.status(500).json({ error: data?.error || "Enrichment failed" });
    }

    const p = data?.person;
    if (!p) return res.status(200).json({ enriched: false });

    return res.status(200).json({
      enriched: true,
      // Contact
      email:            p.email || null,
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
