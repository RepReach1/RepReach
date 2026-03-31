export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { url, payload } = req.body;
  if (!url) return res.status(400).json({ error: "Missing url" });

  const ALLOWED_HOSTS = [
    "hooks.slack.com",
    "hooks.zapier.com",
    "hook.us1.make.com",
    "hook.eu1.make.com",
    "connect.make.com",
  ];

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith("." + h))) {
    return res.status(403).json({ error: "Webhook domain not allowed" });
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    return res.status(200).json({ ok: r.ok, status: r.status, body: text.slice(0, 200) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
