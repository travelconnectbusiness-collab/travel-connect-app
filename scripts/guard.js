/* Travel Connect - GUARD CHECK
   Run from the repo root:  node scripts/guard.js
   1) Every server file (functions/**, worker.js) and every script that index.html loads
      from /src/ or that is named src/tc-*.js (plus sw.js) must have valid JavaScript syntax.
   2) Every "must keep" feature marker below must still exist in its file.
   Exit code 1 (red X / stopped deploy) if anything is wrong or missing.
   RULE: when a must-keep feature is added, add its marker to MARKERS below. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");
const os = require("os");

const ROOT = process.cwd();
const problems = [];

/* ---------- MARKERS: [file, text that must be inside it, what it protects] ---------- */
const MARKERS = [
  ["src/directory.js", "tcListBadgesHtml", "Premium/Plus/Free/Verified badges (function)"],
  ["src/directory.js", "tcSealSvg", "Premium/Plus seal icons"],
  ["src/directory.js", 'tcBl("Free"', "Free chip in listing badges"],
  ["src/directory.js", "tcSeatLabel", "Passengers + driver seat label"],
  ["functions/api/authorized.js", "authorized_categories", "Authorized categories table"],
  ["functions/api/authorized.js", "list_categories", "Authorized categories: list"],
  ["functions/api/authorized.js", "add_category", "Authorized categories: add"],
  ["functions/api/authorized.js", "remove_category", "Authorized categories: remove"],
  ["functions/api/authorized.js", "require_allowlist", "Authorization ON/OFF switch"],
  ["functions/api/authorized.js", "confirm_registered", "Lock to registered category"],
  ["src/customer-safety.js", "tcLoadCategoriesFor", "Authorized Users page: categories"],
  ["src/customer-safety.js", "tcConfirmAllRegistered", "Authorized Users page: Lock all"],
  ["functions/api/trip_class.js", "ENFORCE_DATE", "2027-01-01 enforcement date"],
  ["functions/api/trip_class.js", "getEnforceDate", "Admin-changeable enforcement date"],
  ["functions/api/regdocs.js", "enforce_preview", "Deadline preview: who will lose Verified"],
  ["functions/api/regdocs.js", "set_enforce_date", "Deadline date change by admin"],
  ["src/tc-regdocs.js", "tcEnfLoad", "Admin deadline preview page"],
  ["functions/api/trip_class.js", "vehicleLive", "Live Verified check (expired/incomplete vehicles never count)"],
  ["functions/api/partners.js", "applyLivePartnerVerified", "Live Verified chip for auto/goods after the deadline"],
  ["functions/api/vehicles.js", "vehicleLive", "Active Vehicles board / owner list use the live rule"],
  ["functions/api/docs_expiry.js", "BUDGET", "Daily sweep stays inside the free-plan query limit"],
  ["src/tc-regdocs.js", "tcAuSetFilter", "All Users: tap a tile to filter"],
  ["functions/api/trip_abuse.js", "checkBroadcast", "Trip request abuse limits"],
  ["functions/api/trip_alerts.js", "checkBroadcast", "Abuse limits are applied to trip requests"],
  ["src/tc-abuse.js", "tcAbuseLoad", "Admin spam check panel"],
  ["src/tc-regdocs.js", "tc-abuse.js", "tc-regdocs.js loads tc-abuse.js"],
  ["functions/api/trip_fallback.js", "fallbackGet", "Nobody-accepted help list + driver stats"],
  ["functions/api/trip_alerts.js", "fallbackGet", "Fallback endpoints are wired into trip_alerts"],
  ["src/tc-trips.js", "tcTripAdmLoad", "Admin: help screen settings + driver response"],
  ["src/tc-regdocs.js", "tc-trips.js", "tc-regdocs.js loads tc-trips.js"],
  ["functions/api/trip_alerts.js", "eligiblePartners", "Motor Cab / Carriage / Agency alert targeting"],
  ["functions/api/trip_alerts.js", "notifyBatch", "Trip alerts are pushed in batches (Free-plan 50-call limit)"],
  ["functions/api/trip_alerts.js", "waiting_push", "Status poll sends the next batch of drivers"],
  ["functions/api/docs_expiry.js", "Fitness certificate", "Fitness / PUC expiry reminders"],
  ["functions/api/docs_expiry.js", "Vehicle tax", "Vehicle tax expiry reminders"],
  ["functions/api/docs_expiry.js", "Driving licence", "RC / Driving licence expiry reminders"],
  ["functions/api/docs_expiry.js", "api.resend.com", "Reminders are also emailed (verified emails only)"],
  ["functions/api/docs_expiry.js", "mail_sent", "Daily email cap for reminders"],
  ["functions/api/vehicles.js", "tax_expiry", "Vehicle tax date is saved"],
  ["src/directory.js", "evTaxExp", "Vehicle form: Tax expiry field"],
  ["src/core.js", "shop:\"Shop / Store\"", "Shop / Store business type"],
  ["src/directory.js", "pePublicPhone", "Public contact number field (owner edit form)"],
  ["functions/api/partners.js", "has_public_phone", "Directory shows the public contact number instead of login numbers"],
  ["functions/api/trip_alerts.js", "planTier", "Trip alerts go Premium first, then Plus, then Free"],
  ["functions/api/vehicles.js", "seats_required", "Seat capacity is mandatory"],
  ["functions/api/docs_expiry.js", "doc_notices", "Expiry reminders / sweep"],
  ["worker.js", "maybeRunExpirySweep", "Daily expiry sweep is called"],
  ["sw.js", "tc-icon-192.png", "New notification icon"],
  ["manifest.webmanifest", "tc-icon-192.png", "New app icon"],
];

/* ---------- helpers ---------- */
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));
function walk(dir, out = []) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (e.name.endsWith(".js")) out.push(rel);
  }
  return out;
}

/* ES-module server files: check as .mjs */
function checkModule(file) {
  const tmp = path.join(os.tmpdir(), "guard_" + Date.now() + "_" + Math.random().toString(36).slice(2) + ".mjs");
  fs.writeFileSync(tmp, read(file));
  const r = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
  fs.unlinkSync(tmp);
  if (r.status !== 0) problems.push("SYNTAX ERROR in " + file + "\n    " + String(r.stderr || "").split("\n").slice(0, 4).join("\n    "));
}
/* Browser scripts: syntax only (never executed) */
function checkScript(file) {
  try { new vm.Script(read(file), { filename: file }); }
  catch (e) { problems.push("SYNTAX ERROR in " + file + ": " + e.message); }
}

/* ---------- 1) syntax ---------- */
const serverFiles = walk("functions");
if (exists("worker.js")) serverFiles.push("worker.js");
if (!serverFiles.length) problems.push("No server files found - run this from the repo root.");
serverFiles.forEach(checkModule);

const clientFiles = [];
if (exists("index.html")) {
  const html = read("index.html");
  const re = /<script[^>]+src="\/?(src\/[^"?]+\.js)(?:\?[^"]*)?"/g;
  let m;
  while ((m = re.exec(html))) clientFiles.push(m[1]);
  if (!clientFiles.length) problems.push("index.html loads no /src/ scripts - is index.html the right one?");
}
/* extra scripts that other scripts load themselves (e.g. tc-regdocs.js loads tc-abuse.js) */
for (const f of walk("src")) {
  const norm = f.split(path.sep).join("/");
  if (/\/tc-[^/]*\.js$/.test(norm) && !clientFiles.includes(norm)) clientFiles.push(norm);
}
for (const f of clientFiles) {
  if (!exists(f)) problems.push("index.html loads " + f + " but the file does not exist");
  else checkScript(f);
}
if (exists("sw.js")) checkScript("sw.js");

/* ---------- 2) must-keep markers ---------- */
for (const [file, marker, why] of MARKERS) {
  if (!exists(file)) { problems.push("MISSING FILE " + file + "  (needed for: " + why + ")"); continue; }
  if (!read(file).includes(marker)) problems.push("MISSING in " + file + ": " + marker + "  (" + why + ")");
}

/* ---------- result ---------- */
console.log("Guard check: " + serverFiles.length + " server files, " + clientFiles.length + " app scripts, " + MARKERS.length + " markers.");
if (problems.length) {
  console.error("\nGUARD CHECK FAILED - " + problems.length + " problem(s):\n");
  problems.forEach((p) => console.error(" - " + p));
  console.error("\nSomething that must stay is missing or a file is broken. Do not keep this version.");
  process.exit(1);
}
console.log("OK - nothing missing.");
