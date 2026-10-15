/* Travel Connect - GUARD CHECK
   Run from the repo root:  node scripts/guard.js
   1) Every server file (functions/**, worker.js) and every script that index.html loads
      from /src/ (plus sw.js) must have valid JavaScript syntax.
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
  ["functions/api/trip_alerts.js", "eligiblePartners", "Motor Cab / Carriage / Agency alert targeting"],
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
