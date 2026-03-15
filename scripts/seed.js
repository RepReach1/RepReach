#!/usr/bin/env node
/**
 * RepReach Seed Script — Full Apollo Discovery
 * ─────────────────────────────────────────────
 * Two-phase approach:
 *   Phase 1 — Discover ALL retail companies on Apollo via industry/keyword
 *             search. Paginate until exhausted. Collect org IDs.
 *   Phase 2 — For every discovered org, batch-query buyer contacts.
 *             Dedupe and write to data/contacts.json.
 *
 * Usage:
 *   node scripts/seed.js
 *   APOLLO_KEY=xxx node scripts/seed.js
 *   node scripts/seed.js --phase1-only      (just discover companies, save company list)
 *   node scripts/seed.js --phase2-only      (use saved company list, fetch buyers)
 *   node scripts/seed.js --append           (merge into existing contacts.json)
 *   node scripts/seed.js --max-orgs 500     (limit orgs for testing)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname   = dirname(fileURLToPath(import.meta.url));
const DATA_DIR    = join(__dirname, "../data");
const CONTACTS_F  = join(DATA_DIR, "contacts.json");
const COMPANIES_F = join(DATA_DIR, "companies.json");

mkdirSync(DATA_DIR, { recursive: true });

// ── Config ────────────────────────────────────────────────────────────────────
const KEY      = process.env.APOLLO_KEY || process.env.APOLLO_ENRICH_KEY || "RDwOP69rbo3M2KQ1iJNLhQ";
const HEADERS  = { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": KEY };

const ARGS          = process.argv.slice(2);
const PHASE1_ONLY   = ARGS.includes("--phase1-only");
const PHASE2_ONLY   = ARGS.includes("--phase2-only");
const APPEND_MODE   = ARGS.includes("--append");
const MAX_ORGS      = parseInt(ARGS[ARGS.indexOf("--max-orgs") + 1] || "0") || Infinity;

// Pages of companies to fetch per industry search term (100 per page)
const ORG_PAGES_PER_TERM = 8;   // 8 × 100 = 800 orgs per keyword
const ORG_BATCH_SIZE     = 25;  // Apollo allows up to 25-50 org IDs per people search
const BUYER_PAGES_PER_ORG_BATCH = 3; // 3 × 25 = up to 75 buyers per batch
const DELAY_MS           = 600;

// ── Buyer title keywords ───────────────────────────────────────────────────────
const BUYER_TITLES = [
  "buyer","senior buyer","associate buyer","assistant buyer",
  "merchant","senior merchant","associate merchant","assistant merchant",
  "category manager","senior category manager","associate category manager",
  "divisional merchandise manager","general merchandise manager",
  "director of merchandising","vp of merchandising","head of merchandising",
  "director of buying","director of purchasing","director of sourcing",
  "purchasing manager","procurement manager","sourcing manager",
  "merchandise manager","category director","buying manager",
  "chief merchant","merchandise planner","inventory manager",
  "assortment manager","head of buying","vp of buying",
  "chief merchandising officer","evp merchandising","svp merchandising",
];

const BUYER_KEYWORDS = [
  "buyer","merchant","category","purchasing","procurement","sourcing",
  "merchandise","buying","assortment","dmm","gmm","chief merchant",
  "planner","allocation","director","vp ","head of","svp","evp",
];

// ── Industry search terms — these drive company discovery ─────────────────────
// Apollo company search: q_organization_keyword_tags matches industry/description
const INDUSTRY_TERMS = [
  // Mass / big box
  "mass merchandise retailer",
  "big box retailer",
  "hypermarket retail",
  "discount retailer",
  "dollar store",
  // Grocery / food
  "supermarket",
  "grocery store",
  "food retailer",
  "natural food retailer",
  "organic grocery",
  "specialty food retailer",
  "convenience store retail",
  "warehouse club",
  "wholesale club",
  // Drug / health / beauty
  "drug store",
  "pharmacy retail",
  "health beauty retail",
  "beauty retailer",
  "personal care retail",
  // Home improvement / hardware
  "home improvement retail",
  "hardware retail",
  "home center retail",
  "building materials retail",
  // Apparel / fashion / department
  "department store",
  "apparel retailer",
  "clothing retailer",
  "fashion retailer",
  "off price retailer",
  "specialty apparel",
  "footwear retailer",
  // Electronics / sporting / hobbies
  "electronics retailer",
  "sporting goods retailer",
  "outdoor retail",
  "fitness retail",
  "hobby retailer",
  "toy retailer",
  "craft retailer",
  "book retailer",
  // Home / furnishings
  "home goods retailer",
  "home furnishings retail",
  "furniture retailer",
  "decor retailer",
  "kitchen retail",
  "bed bath retail",
  // Automotive / tools
  "auto parts retailer",
  "automotive retail",
  "tools retail",
  // Pet / garden / outdoor
  "pet supply retailer",
  "garden center retail",
  "farm supply retailer",
  "ranch supply retail",
  // Office / tech
  "office supply retailer",
  "computer electronics retail",
  // Specialty / misc
  "specialty retailer",
  "general merchandise",
  "variety store",
  "club store",
  "liquidation retailer",
  "closeout retailer",
  // E-commerce / omni
  "e-commerce retailer",
  "online retailer",
  "omnichannel retailer",
  "direct to consumer retailer",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const post = (url, body) =>
  fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body) }).then(async r => {
    if (r.status === 429) throw Object.assign(new Error("rate_limited"), { status: 429 });
    return r.json();
  });

function log(msg) { process.stdout.write(msg + "\n"); }
function logr(msg) { process.stdout.write("\r" + msg + "                    "); }

// Retry with backoff
async function withRetry(fn, retries = 4) {
  let delay = 2000;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch(e) {
      if (i === retries) throw e;
      if (e.status === 429 || e.message === "rate_limited") {
        log(`   ⚠ rate limited, waiting ${delay / 1000}s...`);
        await sleep(delay);
        delay *= 2;
      } else throw e;
    }
  }
}

// ── Phase 1: Discover all retail orgs ─────────────────────────────────────────
async function discoverCompanies() {
  log("\n╔══════════════════════════════════════════╗");
  log("║  Phase 1: Discovering Retail Companies   ║");
  log("╚══════════════════════════════════════════╝\n");

  const orgMap = new Map(); // id → { id, name, domain }

  for (let ti = 0; ti < INDUSTRY_TERMS.length; ti++) {
    const term = INDUSTRY_TERMS[ti];
    log(`[${ti + 1}/${INDUSTRY_TERMS.length}] "${term}"`);
    let added = 0;

    for (let page = 1; page <= ORG_PAGES_PER_TERM; page++) {
      if (orgMap.size >= MAX_ORGS) break;
      try {
        const d = await withRetry(() => post("https://api.apollo.io/v1/mixed_companies/search", {
          q_organization_keyword_tags: [term],
          page,
          per_page: 100,
        }));

        const orgs = d?.organizations || d?.accounts || [];
        if (!orgs.length) break;

        for (const o of orgs) {
          if (!o.id || orgMap.has(o.id)) continue;
          orgMap.set(o.id, {
            id:     o.id,
            name:   o.name || "",
            domain: o.primary_domain || o.website_url || "",
          });
          added++;
        }

        const totalPages = d?.pagination?.total_pages || 1;
        logr(`   page ${page}/${Math.min(totalPages, ORG_PAGES_PER_TERM)}: ${orgs.length} orgs (+${added} new, ${orgMap.size} total)`);
        if (page >= totalPages) break;
        await sleep(250);
      } catch(e) {
        log(`\n   ✗ error: ${e.message}`);
        break;
      }
    }
    log(`\n   → ${added} new orgs found (${orgMap.size} unique total)`);
    await sleep(DELAY_MS);
  }

  const companies = Array.from(orgMap.values());
  writeFileSync(COMPANIES_F, JSON.stringify(companies, null, 2));
  log(`\n✅ Phase 1 done — ${companies.length} unique retail orgs → data/companies.json`);
  return companies;
}

// ── Phase 2: Fetch buyers for all orgs ────────────────────────────────────────
async function fetchBuyers(companies) {
  log("\n╔══════════════════════════════════════════╗");
  log("║  Phase 2: Fetching Buyer Contacts        ║");
  log("╚══════════════════════════════════════════╝\n");

  const limit = Math.min(companies.length, MAX_ORGS);
  log(`Processing ${limit} companies in batches of ${ORG_BATCH_SIZE}...\n`);

  const allContacts = [];
  const seenPeople  = new Set();

  const batches = [];
  for (let i = 0; i < limit; i += ORG_BATCH_SIZE) {
    batches.push(companies.slice(i, i + ORG_BATCH_SIZE));
  }

  for (let bi = 0; bi < batches.length; bi++) {
    const batch    = batches[bi];
    const orgIds   = batch.map(c => c.id);
    const orgNames = batch.map(c => c.name).join(", ").slice(0, 80);
    logr(`Batch ${bi + 1}/${batches.length}: ${orgNames}...`);

    for (let page = 1; page <= BUYER_PAGES_PER_ORG_BATCH; page++) {
      try {
        const d = await withRetry(() => post("https://api.apollo.io/v1/mixed_people/search", {
          organization_ids: orgIds,
          // q_person_title does fuzzy keyword search; person_titles requires near-exact match
          q_person_title: "buyer merchant category purchasing procurement sourcing merchandising",
          page,
          per_page: 100,
        }));

        // Apollo returns people under either key depending on plan/endpoint version
        const people = d?.people || d?.contacts || [];
        if (bi === 0 && page === 1 && !people.length) {
          log(`\n   [debug] batch 1 raw keys: ${Object.keys(d || {}).join(", ")}`);
          log(`   [debug] pagination: ${JSON.stringify(d?.pagination)}`);
        }
        if (!people.length) break;

        for (const p of people) {
          if (!p.first_name) continue;
          const key = `${p.first_name}${p.last_name}${p.organization_id}`.toLowerCase().replace(/\s/g, "");
          if (seenPeople.has(key)) continue;
          seenPeople.add(key);

          // Only keep genuine retail buying roles
          if (!BUYER_KEYWORDS.some(kw => (p.title || "").toLowerCase().includes(kw))) continue;

          // Find the org record to get domain/name
          const org = batch.find(c => c.id === p.organization_id) ||
                      { name: p.organization_name || "", domain: "" };

          allContacts.push({
            id:          `rr_${allContacts.length}`,
            apolloId:    p.id            || null,
            firstName:   p.first_name    || "",
            lastName:    p.last_name     || "",
            title:       p.title         || "",
            seniority:   p.seniority     || "",
            departments: p.departments   || [],
            retailer:    p.organization_name || org.name || "",
            retailerKey: (p.organization_name || org.name || "").toLowerCase(),
            domain:      org.domain       || "",
            email:       p.email          || null,
            phone:       p.phone_numbers?.[0]?.sanitized_number || null,
            location:    [p.city, p.state].filter(Boolean).join(", ") || "",
            country:     p.country        || null,
            linkedin:    p.linkedin_url   || null,
            seededAt:    new Date().toISOString(),
          });
        }

        const totalPages = d?.pagination?.total_pages || 1;
        if (page >= totalPages) break;
        await sleep(250);
      } catch(e) {
        if (e.message !== "rate_limited") log(`\n   ✗ batch ${bi + 1} page ${page}: ${e.message}`);
        break;
      }
    }

    // Save checkpoint every 50 batches
    if ((bi + 1) % 50 === 0) {
      writeFileSync(CONTACTS_F, JSON.stringify(allContacts, null, 2));
      log(`\n   💾 checkpoint: ${allContacts.length} contacts saved`);
    }

    await sleep(DELAY_MS);
  }

  log(`\n\n✅ Phase 2 done — ${allContacts.length} buyer contacts collected`);
  return allContacts;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  log("╔══════════════════════════════════════════╗");
  log("║   RepReach Full Apollo Discovery Seed    ║");
  log("╚══════════════════════════════════════════╝");
  log(`Key:    ${KEY.slice(0, 6)}...`);
  log(`Mode:   ${PHASE1_ONLY ? "phase 1 only" : PHASE2_ONLY ? "phase 2 only" : "full (phase 1 + 2)"}`);
  log(`Append: ${APPEND_MODE}`);
  if (MAX_ORGS < Infinity) log(`Max orgs: ${MAX_ORGS}`);

  let companies = [];

  // ── Phase 1 ──────────────────────────────────────────────────────────────
  if (!PHASE2_ONLY) {
    companies = await discoverCompanies();
  } else {
    if (!existsSync(COMPANIES_F)) {
      log("ERROR: data/companies.json not found. Run without --phase2-only first.");
      process.exit(1);
    }
    companies = JSON.parse(readFileSync(COMPANIES_F, "utf8"));
    log(`Loaded ${companies.length} companies from data/companies.json`);
  }

  if (PHASE1_ONLY) {
    log("\nDone (phase 1 only). Run again with --phase2-only to fetch contacts.");
    return;
  }

  // ── Phase 2 ──────────────────────────────────────────────────────────────
  let newContacts = await fetchBuyers(companies);

  // Merge if appending
  let final = newContacts;
  if (APPEND_MODE && existsSync(CONTACTS_F)) {
    const existing = JSON.parse(readFileSync(CONTACTS_F, "utf8"));
    const existingKeys = new Set(
      existing.map(c => `${c.firstName}${c.lastName}${c.retailerKey}`.toLowerCase())
    );
    const brandNew = newContacts.filter(c =>
      !existingKeys.has(`${c.firstName}${c.lastName}${c.retailerKey}`.toLowerCase())
    );
    final = [...existing, ...brandNew];
    log(`Merged: ${brandNew.length} new + ${existing.length} existing = ${final.length} total`);
  }

  // Stable IDs
  final = final.map((c, i) => ({ ...c, id: `rr_${i}` }));

  // Write final output
  writeFileSync(CONTACTS_F, JSON.stringify(final, null, 2));
  const kb = (JSON.stringify(final).length / 1024).toFixed(0);
  log(`\n✅ Saved ${final.length} contacts → data/contacts.json (${kb} KB)`);

  // ── Breakdown by retailer (top 50) ────────────────────────────────────────
  log("\n── Top retailers by contact count ─────────────────────────────────");
  const byRetailer = {};
  for (const c of final) byRetailer[c.retailer] = (byRetailer[c.retailer] || 0) + 1;
  Object.entries(byRetailer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .forEach(([r, n]) => log(`   ${r.padEnd(35)} ${n}`));

  const uniqueRetailers = Object.keys(byRetailer).length;
  log(`\n   Total: ${final.length} contacts across ${uniqueRetailers} retailers`);
}

main().catch(e => { console.error("\nFatal:", e); process.exit(1); });
