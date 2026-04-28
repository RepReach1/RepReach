/**
 * Minimal test server — runs api/search.js handler without Vercel CLI
 * Usage: APOLLO_API_KEY=xxx node scripts/test-server.mjs
 */
import { createServer } from "http";
import { readFileSync } from "fs";
import handler from "../api/search.js";

const PORT = 3737;

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }

  if (req.method !== "POST" || req.url !== "/api/search") {
    res.writeHead(404); return res.end("Not found");
  }

  // Read body
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = JSON.parse(Buffer.concat(chunks).toString());

  // Mock req/res
  const mockReq = { method: "POST", body };
  const mockRes = {
    _status: 200, _body: null,
    status(code) { this._status = code; return this; },
    json(data) { this._body = data; return this; },
  };

  await handler(mockReq, mockRes);

  res.writeHead(mockRes._status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(mockRes._body));
});

server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(`APOLLO_API_KEY: ${process.env.APOLLO_API_KEY ? process.env.APOLLO_API_KEY.slice(0,8)+"..." : "NOT SET"}`);
  console.log("contacts.json:", (() => {
    try { const d = JSON.parse(readFileSync("data/contacts.json","utf8")); return d.length+" contacts"; }
    catch { return "not found"; }
  })());
});
