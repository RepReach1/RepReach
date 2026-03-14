#!/usr/bin/env node
/**
 * RepReach Seed Script
 * ---------------------
 * Bulk-fetches all retail buyer contacts from Apollo and writes them
 * to data/contacts.json so the app can search locally — no live API
 * calls needed at runtime.
 *
 * Usage:
 *   node scripts/seed.js
 *   APOLLO_KEY=your_key node scripts/seed.js
 *   node scripts/seed.js --retailers "Walmart,Target"   (specific retailers only)
 *   node scripts/seed.js --append                       (add to existing DB, skip dupes)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE  = join(__dirname, "../data/contacts.json");

// ── Config ────────────────────────────────────────────────────────────────────
const KEY      = process.env.APOLLO_KEY || process.env.APOLLO_ENRICH_KEY || "RDwOP69rbo3M2KQ1iJNLhQ";
const HEADERS  = { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": KEY };
const PER_PAGE = 100;   // max Apollo allows
const MAX_PAGES = 10;   // 10 pages × 100 = 1,000 contacts per retailer
const DELAY_MS  = 800;  // pause between retailer batches to respect rate limits

const ARGS        = process.argv.slice(2);
const APPEND_MODE = ARGS.includes("--append");
const RETAILER_FILTER = (() => {
  const i = ARGS.indexOf("--retailers");
  if (i === -1) return null;
  return ARGS[i + 1]?.split(",").map(s => s.trim().toLowerCase()) || null;
})();

// ── Retailers ─────────────────────────────────────────────────────────────────
const RETAILERS = [
  { name: "Walmart",          domain: "walmart.com"            },
  { name: "Sam's Club",       domain: "samsclub.com"           },
  { name: "Kroger",           domain: "kroger.com"             },
  { name: "Target",           domain: "target.com"             },
  { name: "Costco",           domain: "costco.com"             },
  { name: "Home Depot",       domain: "homedepot.com"          },
  { name: "CVS",              domain: "cvs.com"                },
  { name: "Tractor Supply",   domain: "tractorsupply.com"      },
  { name: "Amazon",           domain: "amazon.com"             },
  { name: "Lowe's",           domain: "lowes.com"              },
  { name: "Publix",           domain: "publix.com"             },
  { name: "Walgreens",        domain: "walgreens.com"          },
  { name: "Best Buy",         domain: "bestbuy.com"            },
  { name: "Dollar General",   domain: "dollargeneral.com"      },
  { name: "Albertsons",       domain: "albertsons.com"         },
  { name: "Dollar Tree",      domain: "dollartree.com"         },
  { name: "Aldi",             domain: "aldi.us"                },
  { name: "Trader Joe's",     domain: "traderjoes.com"         },
  { name: "Whole Foods",      domain: "wholefoodsmarket.com"   },
  { name: "Meijer",           domain: "meijer.com"             },
  { name: "HEB",              domain: "heb.com"                },
  { name: "Sprouts",          domain: "sprouts.com"            },
  { name: "Wegmans",          domain: "wegmans.com"            },
  { name: "Rite Aid",         domain: "riteaid.com"            },
  { name: "TJ Maxx",          domain: "tjmaxx.com"             },
  { name: "Ross",             domain: "rossstores.com"         },
  { name: "Marshalls",        domain: "marshalls.com"          },
  { name: "Family Dollar",    domain: "familydollar.com"       },
  { name: "7-Eleven",         domain: "7-eleven.com"           },
  { name: "BJ's Wholesale",   domain: "bjs.com"                },
  { name: "Kohl's",           domain: "kohls.com"              },
  { name: "Macy's",           domain: "macys.com"              },
  { name: "Nordstrom",        domain: "nordstrom.com"          },
  { name: "Dick's Sporting",  domain: "dickssportinggoods.com" },
  { name: "Ace Hardware",     domain: "acehardware.com"        },
  { name: "Winn-Dixie",       domain: "winndixie.com"          },
  { name: "Giant Eagle",      domain: "gianteagle.com"         },
  { name: "ShopRite",         domain: "shoprite.com"           },
  { name: "Stop & Shop",      domain: "stopandshop.com"        },
  { name: "Safeway",          domain: "safeway.com"            },
];

// ── Buyer title keywords ───────────────────────────────────────────────────────
const TITLES = [
  "buyer","senior buyer","merchant","senior merchant","category manager",
  "senior category manager","divisional merchandise manager","general merchandise manager",
  "director of merchandising","vp of merchandising","head of merchandising",
  "director of buying","director of purchasing","director of sourcing",
  "purchasing manager","procurement manager","sourcing manager",
  "merchandise manager","category director","buying manager","chief merchant",
  "merchandise planner","inventory manager","assortment manager","head of buying",
];

const KEYWORDS = [
  "buyer","merchant","category","purchasing","procurement","sourcing",
  "merchandise","buying","assortment","dmm","gmm","chief merchant",
  "planner","allocation","director","vp ","head of",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const post = (url, body) =>
  fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });

function log(msg) { process.stdout.write(msg + "\n"); }

// ── Fetch org ID ───────────────────────────────────────────────────────────────
async function resolveOrgId(retailer) {
  try {
    const r = await fetch(
      `https://api.apollo.io/v1/organizations/enrich?domain=${retailer.domain}`,
      { headers: HEADERS }
    );
    const d = await r.json();
    if (d?.organization?.id) return d.organization.id;
  } catch (e) { /* fall through */ }

  try {
    const r = await post("https://api.apollo.io/v1/mixed_companies/search",
      { q_organization_name: retailer.name, page: 1, per_page: 5 });
    const d = await r.json();
    const orgs = d?.organizations || d?.accounts || [];
    const best = orgs.find(o => o.name?.toLowerCase() === retailer.name.toLowerCase()) || orgs[0];
    return best?.id || null;
  } catch (e) { return null; }
}

// ── Fetch one retailer ─────────────────────────────────────────────────────────
async function fetchRetailer(retailer) {
  log(`\n▶  ${retailer.name} (${retailer.domain})`);

  const orgId = await resolveOrgId(retailer);
  log(`   org_id: ${orgId || "not found — using name fallback"}`);

  const body = orgId
    ? { organization_ids: [orgId], person_titles: TITLES }
    : { organization_names: [retailer.name], person_titles: TITLES };

  let allPeople = [];
  let totalEntries = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const r = await post("https://api.apollo.io/v1/mixed_people/search",
        { ...body, page, per_page: PER_PAGE });
      const d = await r.json();

      if (r.status === 429) {
        log(`   ⚠ rate limited on page ${page}, waiting 5s...`);
        await sleep(5000);
        page--; continue;
      }

      const people = d?.people || [];
      if (page === 1) totalEntries = d?.pagination?.total_entries || 0;

      if (people.length === 0) break;
      allPeople.push(...people);
      process.stdout.write(`   page ${page}: ${people.length} contacts (total pool: ${totalEntries})\n`);

      if (page >= (d?.pagination?.total_pages || 1)) break;
      await sleep(300); // small pause between pages
    } catch (e) {
      log(`   ✗ page ${page} error: ${e.message}`);
      break;
    }
  }

  // Dedupe
  const seen = new Set();
  allPeople = allPeople.filter(p => {
    const k = `${p.first_name}${p.last_name}`.toLowerCase().replace(/\s/g, "");
    if (seen.has(k)) return false; seen.add(k); return true;
  });

  // Keyword filter — only keep genuine buyers/merchandisers
  const filtered = allPeople.filter(p =>
    KEYWORDS.some(kw => (p.title || "").toLowerCase().includes(kw))
  );

  log(`   ✓ ${filtered.length} buyers kept (${allPeople.length - filtered.length} filtered out)`);

  return filtered.map((p, i) => ({
    id:          `${retailer.domain}_${i}_${(p.id || "").slice(-6)}`,
    apolloId:    p.id          || null,
    firstName:   p.first_name  || "",
    lastName:    p.last_name   || "",
    title:       p.title       || "",
    seniority:   p.seniority   || "",
    departments: p.departments || [],
    retailer:    p.organization_name || retailer.name,
    retailerKey: retailer.name.toLowerCase(),
    domain:      retailer.domain,
    email:       p.email       || null,
    phone:       p.phone_numbers?.[0]?.sanitized_number || null,
    location:    [p.city, p.state].filter(Boolean).join(", ") || "",
    country:     p.country     || null,
    linkedin:    p.linkedin_url || null,
    seededAt:    new Date().toISOString(),
  }));
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  log("╔══════════════════════════════════════════╗");
  log("║       RepReach Apollo Seed Script        ║");
  log("╚══════════════════════════════════════════╝");
  log(`Mode: ${APPEND_MODE ? "append" : "full rebuild"}`);
  log(`Key:  ${KEY.slice(0, 6)}...`);

  // Load existing contacts if appending
  let existing = [];
  if (APPEND_MODE && existsSync(OUT_FILE)) {
    existing = JSON.parse(readFileSync(OUT_FILE, "utf8"));
    log(`Loaded ${existing.length} existing contacts`);
  }

  // Filter retailers if --retailers flag used
  const retailers = RETAILER_FILTER
    ? RETAILERS.filter(r => RETAILER_FILTER.includes(r.name.toLowerCase()))
    : RETAILERS;

  log(`\nFetching ${retailers.length} retailers...\n`);

  const allNew = [];
  for (let i = 0; i < retailers.length; i++) {
    const contacts = await fetchRetailer(retailers[i]);
    allNew.push(...contacts);
    if (i < retailers.length - 1) await sleep(DELAY_MS);
  }

  // Merge and dedupe if appending
  let final = allNew;
  if (APPEND_MODE && existing.length > 0) {
    const existingKeys = new Set(
      existing.map(c => `${c.firstName}${c.lastName}${c.retailerKey}`.toLowerCase())
    );
    const brandNew = allNew.filter(c =>
      !existingKeys.has(`${c.firstName}${c.lastName}${c.retailerKey}`.toLowerCase())
    );
    final = [...existing, ...brandNew];
    log(`\nMerged: ${brandNew.length} new + ${existing.length} existing = ${final.length} total`);
  }

  // Reassign stable IDs
  final = final.map((c, i) => ({ ...c, id: `rr_${i}` }));

  // Write output
  mkdirSync(join(__dirname, "../data"), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(final, null, 2));

  log(`\n✅ Done! Saved ${final.length} contacts → data/contacts.json`);
  log(`   File size: ${(JSON.stringify(final).length / 1024).toFixed(0)} KB`);

  // Summary by retailer
  log("\n── Breakdown ──────────────────────────────");
  const byRetailer = {};
  for (const c of final) byRetailer[c.retailer] = (byRetailer[c.retailer] || 0) + 1;
  for (const [r, n] of Object.entries(byRetailer).sort((a, b) => b[1] - a[1])) {
    log(`   ${r.padEnd(25)} ${n}`);
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
