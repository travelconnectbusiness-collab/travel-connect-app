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
  ["src/tc-img.js", "__tcImgShrink", "Photos are shrunk on the phone before upload"],
  ["src/tc-regdocs.js", "tc-img.js", "tc-regdocs.js loads tc-img.js"],
  ["functions/api/partner_media.js", "mediaPurge", "Shop photo / Premium ad posts / social links (deletes replaced pictures)"],
  ["functions/api/partners.js", "partner_media.js", "partners.js uses partner_media.js (media_* actions, directory media, delete cleanup)"],
  ["src/tc-media.js", "__tcMedia", "Shop window card + directory media (tc-media.js)"],
  ["src/tc-regdocs.js", "tc-media.js", "tc-regdocs.js loads tc-media.js"],
  ["src/tc-inapp.js", "__tcInApp", "In-app browser (Instagram / Facebook) help banner"],
  ["index.html", "tc-inapp.js", "index.html loads tc-inapp.js"],
  ["src/landing.js", "/privacy.html", "Landing footer links to the Privacy page"],
  ["privacy.html", "Privacy Policy", "Privacy Policy page"],
  ["terms.html", "Terms of Use", "Terms of Use page"],
  ["src/tc-share.js", "__tcShare", "Menu entries: Share this app, Privacy Policy, Terms of Use"],
  ["src/tc-regdocs.js", "tc-share.js", "tc-regdocs.js loads tc-share.js"],
  ["src/tc-dash.js", "__tcDash", "Dashboard: business name/details first + compact Verification card (tc-dash.js)"],
  ["src/tc-regdocs.js", "tc-dash.js", "tc-regdocs.js loads tc-dash.js"],
  ["src/tc-livetrip.js", "__tcLiveTrip", "Live Trip Log: start trip, stops, end, bill (tc-livetrip.js)"],
  ["src/tc-livetrip.js", "db.liveTrips", "Live trips are saved in db.liveTrips (never lost until deleted)"],
  ["src/tc-regdocs.js", "tc-livetrip.js", "tc-regdocs.js loads tc-livetrip.js"],
  ["functions/api/vehicles.js", "deleteFiles", "Replaced / deleted vehicle photos are removed from storage"],
  ["functions/api/partners.js", "fileKeys", "Deleting a business removes its files from storage"],
  ["functions/api/vehicles.js", "tax_expiry", "Vehicle tax date is saved"],
  ["src/directory.js", "evTaxExp", "Vehicle form: Tax expiry field"],
  ["src/core.js", "shop:\"Shop / Store\"", "Shop / Store business type"],
  ["src/directory.js", "pePublicPhone", "Public contact number field (owner edit form)"],
  ["src/tc-ratecat.js", "__tcRateCat", "Rate Master category picker in Find Nearby Vehicle (tc-ratecat.js)"],
  ["src/tc-ratecat.js", "tcRcOpenPicker", "Customer category picker (Motor Cab / Contract Carriage)"],
  ["src/tc-ratecat.js", "tcRcAdmin", "Admin: Rate Master > Customer vehicle details"],
  ["src/tc-ratecat.js", "vRateCat", "Vehicle form: Rate Master category box"],
  ["src/tc-ratecat.js", "DISC_C_EN", "Approximate-rate / no-liability notice for customers and owners"],
  ["src/tc-ratecat.js", "tcRcSetPax", "Picker: passengers box suggests vehicles that fit"],
  ["src/tc-ratecat.js", "tcRcDaysSet", "Picker: One-day trip / Multi-day with number of days"],
  ["src/tc-ratecat.js", "tcRcLeave", "Picker: Back from Directory / Active Vehicles Board returns to the picker"],
  ["src/tc-regdocs.js", "tc-ratecat.js", "tc-regdocs.js loads tc-ratecat.js"],
  ["src/tc-pushtest.js", "__tcPushTest", "Test Notification card on the owner dashboard (tc-pushtest.js)"],
  ["src/tc-pushtest.js", "tcPtChecklist", "Test Notification: checklist when nothing arrives"],
  ["src/tc-regdocs.js", "tc-pushtest.js", "tc-regdocs.js loads tc-pushtest.js"],
  ["functions/api/regdocs.js", "push_test", "Server: owner Test Notification (max 3 per hour)"],
  ["src/tc-regdocs.js", "tcrc-mark", "Pending Approvals shows the vehicle's Rate Master category"],
  ["functions/api/trip_class.js", "vehicleSuitsRate", "Category request matching (live-Verified vehicles of that category + old vehicles by seats)"],
  ["functions/api/trip_class.js", "rateAvailability", "Available nearby / Not available now per category"],
  ["functions/api/trip_alerts.js", "rc_avail", "Availability endpoint for the category cards"],
  ["functions/api/trip_alerts.js", "rc_meta_set", "Admin saves category details (passengers, AC, Premium)"],
  ["functions/api/trip_alerts.js", "rate_cat_label", "Owner's alert shows the requested category"],
  ["functions/api/trip_abuse.js", "rate_cat", "Duplicate-request check includes the category"],
  ["functions/api/vehicles.js", "set_rate_cat", "Admin can change a vehicle's Rate Master category"],
  ["functions/api/vehicles.js", "rate_cat_name", "Vehicles store their Rate Master category"],
  ["functions/api/docs_expiry.js", ":ratecat", "One-time 'Choose the Rate Master category' reminder"],
  ["terms.html", "Rates and charges", "Terms: rates are approximate, no liability for charge disputes"],
  ["functions/api/partners.js", "has_public_phone", "Directory shows the public contact number instead of login numbers"],
  ["functions/api/trip_alerts.js", "planTier", "Trip alerts go Premium first, then Plus, then Free"],
  ["functions/api/vehicles.js", "seats_required", "Seat capacity is mandatory"],
  ["functions/api/docs_expiry.js", "doc_notices", "Expiry reminders / sweep"],
  ["worker.js", "maybeRunExpirySweep", "Daily expiry sweep is called"],
  ["sw.js", "tc-icon-192.png", "New notification icon"],
  ["manifest.webmanifest", "tc-icon-192.png", "New app icon"],
  ["src/tc-accbook.js", "__tcAccBook", "Trip & Accounts book (vehicle-wise income and expense)"],
  ["src/tc-accbook.js", "syncAuto", "Bill payments and quotation advances fill the book automatically"],
  ["src/tc-accbook.js", "tcAbVehSave", "Vehicle book: purchase price, down payment, loan, EMI"],
  ["src/tc-accbook.js", "tcAbCsv", "Accounts CSV export (always allowed, also after the free period)"],
  ["src/tc-accbook.js", "tcAbReceive", "Accounts: money received later is added to the bill AND the book"],
  ["src/tc-accbook.js", "tcAbTripExp", "Accounts: expense (diesel etc.) of a trip from its income entry"],
  ["src/tc-accbook.js", "tcAbTipSave", "Accounts: tip for the vehicle (income) or the driver (not counted)"],
  ["src/tc-accbook.js", "accEntries", "Accounts entries are kept in db.accEntries (never lost until deleted)"],
  ["src/tc-regdocs.js", "tc-accbook.js", "tc-regdocs.js loads tc-accbook.js"],
  ["functions/api/backup.js", "accEntries", "Cloud Backup counts the accounts book"],
  ["functions/api/backup.js", "bookings", "Cloud Backup counts the bookings"],
  ["src/tc-bills.js", "__tcBills", "My Bills list on the Billing page (all plans)"],
  ["src/tc-bills.js", "tcBlRecvSave", "Bills: money received later (UPI / Cash / Other) saved in the bill's payments"],
  ["src/tc-bills.js", "tcBlPrint", "Bills: print / PDF / image of an old bill again"],
  ["src/tc-bills.js", "tcBlTip", "Bills: extra money received over the bill is asked about (vehicle tip / driver tip)"],
  ["src/tc-accbook.js", "stay behind it", "Dashboard: Trip & Accounts card stays behind the backup reminder (no flipping)"],
  ["src/tc-accbook.js", "tcAbDrill", "Accounts: tap Income / Expense / Profit to see categories and dated entries"],
  ["src/tc-accbook.js", "tcAbDrvPaid", "Accounts: driver tips still to give / given"],
  ["src/tc-accbook.js", "catGuess", "Accounts: a typed new category is matched to the closest existing one"],
  ["src/tc-regdocs.js", "tc-bills.js", "tc-regdocs.js loads tc-bills.js"],
  ["src/tc-accbook.js", "tcAbDrvTips", "Accounts: driver tips list by driver - this week / month / all, to give / given / direct"],
  ["src/tc-accbook.js", "tcAbDrvAllGiven", "Accounts: mark all of a driver's tips as given"],
  ["src/tc-tripcards.js", "__tcTripCards", "Accounts: Trips tab - one card per trip + full trip report"],
  ["src/tc-tripcards.js", "tcTrShare", "Trip report: customer-safe WhatsApp share (no profit / expense)"],
  ["src/tc-accbook.js", "tcTrListHtml", "Accounts: Trips tab hooks the trip cards in"],
  ["src/tc-regdocs.js", "tc-tripcards.js", "tc-regdocs.js loads tc-tripcards.js"],
  ["src/tc-daybook.js", "__tcDayBook", "Accounts: Day Book - opening / IN / OUT / closing balance of a chosen day"],
  ["src/tc-accbook.js", "tcDbHtml", "Accounts: Day Book tab hooks in"],
  ["src/tc-accbook.js", "tcAbAddOn", "Accounts: add an entry for the day chosen in the Day Book"],
  ["src/tc-regdocs.js", "tc-daybook.js", "tc-regdocs.js loads tc-daybook.js"],
  ["src/tc-enq.js", "__tcEnq", "Enquiry -> Booking: source / commission, Confirm, own or partner vehicle, Booking Schedule"],
  ["src/tc-enq.js", "tcEnqConfirm", "Enquiry Confirm makes a booking in the schedule"],
  ["src/tc-enq.js", "tcEnqMarginSave", "Partner margin is booked as income only when received (cash basis)"],
  ["src/tc-enq.js", "tcEnqLostSave", "Enquiry outcome: Lost with reason"],
  ["src/tc-enq.js", "clashHtml", "Trip-date boxes show the bookings already on that day, free / busy vehicles, partner suggestion"],
  ["src/tc-enq.js", "tcEnqRemind", "Booking: WhatsApp reminder text to the customer"],
  ["src/tc-regdocs.js", "tc-enq.js", "tc-regdocs.js loads tc-enq.js"],
  ["src/tc-home.js", "__tcHome", "Dashboard: Bookings & follow-ups card; rarely used boxes moved into the closed 'More' box"],
  ["src/tc-home.js", "tcBkCard", "Dashboard shows today's / tomorrow's bookings and open enquiries"],
  ["src/tc-regdocs.js", "tc-home.js", "tc-regdocs.js loads tc-home.js"],
  ["src/tc-wait.js", "__tcWait", "Waiting for a driver screen: live clock and plain explanation"],
  ["src/tc-regdocs.js", "tc-wait.js", "tc-regdocs.js loads tc-wait.js"],
  ["src/tc-demand.js", "__tcDemand", "Demand report by Rate Master category: enquiries, booked, lost + reasons, unmet demand, sources"],
  ["src/tc-demand.js", "allBusy", "Enquiries saved on a day when all own vehicles are booked are flagged as unmet demand"],
  ["src/tc-enq.js", "tcEnqPartnerPaid", "Partner trip: record what was paid to the partner (customer paid us the full fare)"],
  ["src/tc-regdocs.js", "tc-demand.js", "tc-regdocs.js loads tc-demand.js"],
  ["src/tc-xlsx.js", "__tcXlsx", "Excel export: real .xlsx (Summary, Trips one row per trip, All entries) made on the phone, no library"],
  ["src/tc-xlsx.js", "tcAbXlsx", "Excel button handler: shares / downloads the .xlsx for the chosen period and vehicle"],
  ["src/tc-accbook.js", "tcAbXlsx()", "Trip & Accounts shows the Excel button next to CSV"],
  ["src/tc-tripcards.js", "__tcTrApi", "Trip report data shared with the Excel export"],
  ["src/tc-regdocs.js", "tc-xlsx.js", "tc-regdocs.js loads tc-xlsx.js"],
  ["src/tc-accbook.js", "tripAsk", "Typed entry on the same day + vehicle as a trip asks: add this to that trip?"],
  ["src/tc-accbook.js", "catNear", "New category that is a typo / near copy of an existing one offers the existing category"],
  ["src/tc-sharecard.js", "__tcShareCard", "Green 'Share Travel Connect' card on every home page (customer, partner, owner), not only in the Menu"],
  ["src/tc-regdocs.js", "tc-sharecard.js", "tc-regdocs.js loads tc-sharecard.js"],
  ["src/tc-drivers.js", "__tcDrivers", "Driver list: licence number + expiry warnings, trips / wages / tips by week-month-all, add/edit/delete"],
  ["src/tc-drivers.js", "tcDrvSave", "Driver list: add / edit a driver (licence, expiry, note)"],
  ["src/tc-accbook.js", "tcDrvList()", "Trip & Accounts has the Drivers button"],
  ["src/tc-regdocs.js", "tc-drivers.js", "tc-regdocs.js loads tc-drivers.js"],
  ["src/tc-bkflow.js", "__tcBkFlow", "Booking card: Start trip / Make bill / Trip done with details pre-filled (no retyping the customer)"],
  ["src/tc-bkflow.js", "tcBkBill", "Booking -> Quick Bill pre-filled; the bill is linked back to the booking"],
  ["src/tc-bkflow.js", "tcBkStart", "Booking -> Live Trip form pre-filled; the trip log remembers the booking"],
  ["src/tc-enq.js", "tcBkFlowHtml", "Booking Schedule cards show the next step (tc-bkflow.js)"],
  ["src/tc-regdocs.js", "tc-bkflow.js", "tc-regdocs.js loads tc-bkflow.js"],
  ["src/tc-dropbill.js", "__tcDropBill", "Quick Bill: trip type Drop/Local selects the Drop/Local rate; Drop bills are not compared with the Standard day package"],
  ["src/tc-regdocs.js", "tc-dropbill.js", "tc-regdocs.js loads tc-dropbill.js"],
  ["src/tc-dropmin.js", "__tcDropMin", "Drop bills: Minimum charge + Return KM (KM method) boxes in Quick Bill, calculated in billFinalAmount"],
  ["src/tc-dropmin.js", "qbMinCharge", "Quick Bill Minimum charge box"],
  ["src/tc-regdocs.js", "tc-dropmin.js", "tc-regdocs.js loads tc-dropmin.js"],
  ["src/tc-bankdet.js", "__tcBankDet", "Bank account details (A/c no, IFSC) on bills and advance requests for customers who do not use UPI"],
  ["src/tc-bankdet.js", "tcBankPdf", "Bank details drawn in the bill / quotation PDF"],
  ["src/business.js", "tcBankHtml", "Printed bill and quotation call the bank details box"],
  ["src/tc-regdocs.js", "tc-bankdet.js", "tc-regdocs.js loads tc-bankdet.js"],
  ["src/tc-profit.js", "__tcProfit", "Profit report: by vehicle / by month, Excel + CSV (tc-profit.js)"],
  ["src/tc-profit.js", "tcPrXlsx", "Profit report Excel export"],
  ["src/tc-accbook.js", "tcPrOpen", "Accounts page has the Profit report button"],
  ["src/tc-regdocs.js", "tc-profit.js", "tc-regdocs.js loads tc-profit.js"],
  ["src/tc-home.js", "tcLicCard", "Dashboard: driver licence expiry alert (expired / within 30 days)"],
  ["src/tc-billedit.js", "__tcBillEdit", "Edit full bill: change trip type / category / rate / customer of a made bill (tc-billedit.js)"],
  ["src/tc-billedit.js", "tcBeSave", "Edit full bill save (recalculates amount, keeps payments)"],
  ["src/tc-regdocs.js", "tc-billedit.js", "tc-regdocs.js loads tc-billedit.js"],
  ["src/tc-custfare.js", "__tcCustFare", "Customer fare calculator: approximate range (own rate - Standard) with not-actual-fare notice (tc-custfare.js)"],
  ["src/tc-custfare.js", "tcCfNote", "Customer fare notice text"],
  ["src/tc-regdocs.js", "tc-custfare.js", "tc-regdocs.js loads tc-custfare.js"],
  ["src/tc-filebk.js", "__tcFileBk", "Backup file on the phone: save / restore, optional password (tc-filebk.js)"],
  ["src/tc-filebk.js", "tcFbPick", "Restore from backup file"],
  ["src/tc-filebk.js", "AES-GCM", "Backup file password lock"],
  ["src/tc-regdocs.js", "tc-filebk.js", "tc-regdocs.js loads tc-filebk.js"],
  ["src/tc-home.js", "tcFbCard", "Dashboard reminder: save a backup file (30 days)"],
  ["functions/api/_devauth.js", "deviceCheck", "Device check helper: soft / enforce mode (_devauth.js)"],
  ["functions/api/auth.js", "admin_password_hash", "Admin password stored hashed + wrong-try lock"],
  ["functions/api/auth.js", "set_devauth", "Admin switch for the device check"],
  ["functions/api/calls.js", "calls.received", "Call logs only for the logged-in owner / caller"],
  ["functions/api/sos.js", "too_many_alerts", "SOS: login check + flood guard"],
  ["functions/api/push.js", "push.subscribe", "Push subscription only for the logged-in number"],
  ["functions/api/partners.js", "partners.set_password", "Business edits: device check"],
  ["functions/api/partner_media.js", "media.edit", "Shop media edits: device check"],
  ["worker.js", "X-TC-Device", "CORS allows the device headers"],
  ["src/tc-devhdr.js", "__tcDevHdr", "Phone sends device headers on every /api call + Security screen (tc-devhdr.js)"],
  ["src/tc-devhdr.js", "tcDevSecSet", "Security screen: switch the device check"],
  ["src/tc-regdocs.js", "tc-devhdr.js", "tc-regdocs.js loads tc-devhdr.js"],
  ["functions/api/_loginotp.js", "loginGate", "New phone on a protected account needs an e-mailed code (_loginotp.js)"],
  ["functions/api/auth.js", "login_otp_send", "Login: e-mail a code to the verified address / check it"],
  ["functions/api/auth.js", "set_devotp", "Admin switch for the new-phone e-mail code"],
  ["functions/api/auth.js", "revoke_others", "Sign out all other phones"],
  ["src/tc-acctsec.js", "__tcAcctSec", "Account security: login-page notice, code box, dashboard bar, My account security (tc-acctsec.js)"],
  ["src/tc-acctsec.js", "otp_required", "Login page catches 'otp_required' and asks for the e-mailed code"],
  ["src/tc-devhdr.js", "tcDevOtpSet", "Security screen: switch the new-phone e-mail code"],
  ["src/tc-regdocs.js", "tc-acctsec.js", "tc-regdocs.js loads tc-acctsec.js"],
  ["functions/api/_loginotp.js", "sendEmailCode", "E-mail verification code for every account (owners and customers)"],
  ["functions/api/_loginotp.js", "sendEmailReminder", "Admin: reminder notification to accounts without a verified e-mail"],
  ["functions/api/auth.js", "email_otp_verify", "E-mail verification: check the code"],
  ["functions/api/auth.js", "accept_email_risk", "Person may go on without e-mail after accepting the risk"],
  ["functions/api/auth.js", "email_reminder", "Admin reminder notification action"],
  ["src/tc-acctsec.js", "tcEmailOpen", "E-mail verification box (forced for new accounts, bar for the others)"],
  ["src/tc-acctsec.js", "accept_email_risk", "Box: continue without e-mail after ticking the risk"],
  ["functions/api/_loginotp.js", "emailLoginSend", "E-mail first login: send a login / registration code"],
  ["functions/api/_loginotp.js", "emailLoginVerify", "E-mail first login: check the code (existing account or e-mail proof)"],
  ["functions/api/_loginotp.js", "useEmailProof", "New account is created with the e-mail already verified"],
  ["functions/api/_loginotp.js", "pinResetVerify", "Forgot PIN: new PIN only after an e-mailed code"],
  ["functions/api/auth.js", "number_taken", "Registration refuses a mobile that belongs to an account verified with another e-mail"],
  ["functions/api/auth.js", "pin_reset_send", "Forgot PIN: send the code to the verified e-mail"],
  ["src/tc-emaillogin.js", "__tcEmailLogin", "E-mail first login page and e-mailed PIN reset (tc-emaillogin.js)"],
  ["src/tc-emaillogin.js", "email_proof", "Login request carries the e-mail proof"],
  ["src/tc-emaillogin.js", "pin_reset_verify", "Forgot PIN asks for the e-mailed code"],
  ["src/tc-regdocs.js", "tc-emaillogin.js", "tc-regdocs.js loads tc-emaillogin.js"],
  ["functions/api/messages.js", "messages.send", "Chat: device check on send / hide / unread / inbox / thread"],
  ["functions/api/trip_alerts.js", "trip_alerts.accept", "Trip alerts: device check on accept / cancel / broadcast / status / histories"],
  ["functions/api/vehicles.js", "vehicles.toggle_active", "Vehicles: device check on register / update / Active Now / hours"],
  ["functions/api/_ratelimit.js", "rate_limits", "Small per-key rate limiter (feedback 5 per hour per IP)"],
  ["worker.js", "rlAllowed", "Feedback POST is rate limited"],
  ["functions/api/auth.js", "callerOf", "lookup shows name / place / pincode only to the owner's own known phone"],
  ["src/tc-devhdr.js", "tcDevRemind", "Security screen: send the e-mail reminder notification"],
  ["src/tc-bills.js", "tcBlDelete", "My Bills: Delete a bill made by mistake (copy kept in deletedBills, money entries removed, booking unlinked)"],
  ["src/tc-nav.js", "__tcNav", "Navigation: phone Back goes page -> Dashboard -> leaves app; no extra history steps"],
  ["src/tc-nav.js", "goBase", "Navigation: Back to Dashboard / Dashboard tab drops the page steps instead of adding new ones"],
  ["src/tc-nav.js", "cleanStale", "Navigation: a closed pop-up leaves no extra Back step"],
  ["src/tc-regdocs.js", "tc-nav.js", "tc-regdocs.js loads tc-nav.js"],
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

/* ---------- 3) CLEAN-UP REPORT (information only, never fails the check) ----------
   Lists files that no other file mentions by name: candidates for deleting old, unused files.
   A file is "mentioned" when its file name appears in index.html, sw.js, worker.js, manifest, a workflow, or any other script.
   Always double-check before deleting - a file can also be loaded by a name built in code. */
try {
  const skipDirs = new Set([".git", "node_modules", "android", ".wrangler"]);
  const allFiles = [];
  (function scan(dir) {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      if (skipDirs.has(e.name)) continue;
      const rel = dir ? dir + "/" + e.name : e.name;
      if (e.isDirectory()) scan(rel); else allFiles.push(rel);
    }
  })("");
  const textExt = /\.(js|html|json|toml|yml|yaml|css|md|sql|txt|webmanifest)$/i;
  const texts = {};
  for (const f of allFiles) {
    if (f === "scripts/guard.js" || f === "guard.js" || f === "FEATURES.md") continue; /* the guard / notes mention every file */
    if (textExt.test(f)) { try { texts[f] = fs.readFileSync(path.join(ROOT, f), "utf8"); } catch (e) {} }
  }
  const mentioned = (f) => {
    const base = f.split("/").pop();
    for (const k in texts) { if (k !== f && texts[k].includes(base)) return true; }
    return false;
  };
  const cands = allFiles.filter((f) =>
    /^(src\/[^/]+\.js|functions\/[^/]+\/[^/]+\.js|[^/]+\.(js|html|css|sql|png|jpg|svg|ico|txt|json|webmanifest))$/i.test(f) &&
    !["index.html", "sw.js", "worker.js", "package.json", "wrangler.toml"].includes(f) && !mentioned(f));
  console.log("\nCLEAN-UP REPORT (files no other file mentions by name - " + cands.length + "):");
  if (!cands.length) console.log("  none");
  cands.forEach((f) => {
    let n = ""; try { n = " (" + fs.readFileSync(path.join(ROOT, f), "utf8").split("\n").length + " lines)"; } catch (e) { n = " (binary)"; }
    console.log("  - " + f + n);
  });
  const old = allFiles.filter((f) => /^src\/app-updates[^/]*\.js$/.test(f));
  console.log("OLD-STYLE FILES src/app-updates*.js: " + (old.length ? old.join(", ") : "none"));
  console.log("All files in repo (for the record): " + allFiles.length);
} catch (e) { console.log("(clean-up report skipped: " + e.message + ")"); }
