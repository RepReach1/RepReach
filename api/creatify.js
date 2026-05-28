export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, script, avatarId, aspectRatio, voiceId, videoId } = req.body;
  if (!action) return res.status(400).json({ error: "Missing action" });

  const apiId  = process.env.CREATIFY_API_ID;
  const apiKey = process.env.CREATIFY_API_KEY;
  if (!apiId || !apiKey) {
    return res.status(500).json({ error: "CREATIFY_API_ID and CREATIFY_API_KEY are not set in environment variables" });
  }

  const headers = {
    "Content-Type": "application/json",
    "X-API-ID": apiId,
    "X-API-KEY": apiKey,
  };

  const BASE = "https://api.creatify.ai/api";

  try {
    if (action === "list_avatars") {
      const r = await fetch(`${BASE}/ai_avatars/`, { headers });
      if (!r.ok) return res.status(r.status).json({ error: `Creatify error ${r.status}` });
      return res.status(200).json(await r.json());
    }

    if (action === "list_voices") {
      const r = await fetch(`${BASE}/ai_voices/`, { headers });
      if (!r.ok) return res.status(r.status).json({ error: `Creatify error ${r.status}` });
      return res.status(200).json(await r.json());
    }

    if (action === "create_video") {
      if (!script || !avatarId) return res.status(400).json({ error: "Missing script or avatarId" });
      const body = {
        script,
        creator: avatarId,
        aspect_ratio: aspectRatio || "16:9",
      };
      if (voiceId) body.voice_id = voiceId;

      const r = await fetch(`${BASE}/lipsyncs/`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data?.message || `Creatify error ${r.status}`, detail: data });
      return res.status(200).json(data);
    }

    if (action === "get_status") {
      if (!videoId) return res.status(400).json({ error: "Missing videoId" });
      const r = await fetch(`${BASE}/lipsyncs/${videoId}/`, { headers });
      if (!r.ok) return res.status(r.status).json({ error: `Creatify error ${r.status}` });
      return res.status(200).json(await r.json());
    }

    if (action === "render_video") {
      if (!videoId) return res.status(400).json({ error: "Missing videoId" });
      const r = await fetch(`${BASE}/lipsyncs/${videoId}/render/`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data?.message || `Creatify error ${r.status}`, detail: data });
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (e) {
    console.error("Creatify error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
