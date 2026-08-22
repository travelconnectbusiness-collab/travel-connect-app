# Travel Connect Professional — V1 Foundation 

This is a NEW application codebase. It is not a repair/update of the old Travel Connect HTML apps.

## Design principle
Old versions are used only as a reference for the agreed travel-rate concepts. The new application has a separate data model and modular architecture.

## Included in V1 foundation
- Dashboard
- Enquiry management
- Quotation management
- Saved/open/edit quotation foundation
- Vehicle categories + editable Rate Master
- Standard / Competitive / Minimum Safety / Local rates
- Local limit: 50 KM AND 5 hours
- 80 KM / 8 hours non-local base coverage
- Higher of additional KM vs additional hour charge
- Vehicle database
- Driver database
- Customer-ready structure
- Trip confirmation and actual trip details
- Final bill foundation
- Customer Balance / Discount Given / Paid & Settled / Discount & Settled
- Accounts and expense ledger foundation
- UPI settings foundation
- GPS/location/SOS foundation
- Travel Connect Network S foundation
- PWA
- Cloudflare Functions API foundation
- D1 schema ready for cloud persistence
- Subscription, audit-log and future travel-service tables in schema

## Production phases still required
1. Cloudflare D1 provisioning and server API persistence
2. Authentication/roles
3. Real-time Network alerts via Durable Objects/WebSockets
4. Push notifications
5. Payment verification/webhooks
6. PDF generation
7. GST/tax reporting/integration
8. Flight/train/hotel/visa supplier APIs
9. Subscription/commission billing
10. Admin analytics
11. Security audit
12. Android AAB / Play Store packaging

## Rate snapshot rule
When a quotation is saved, the applicable rates must be stored as a snapshot. Later changes to the Rate Master must not alter historical quotations/bills.

## Local rule
Local Trip is valid only when BOTH are within limits:
- <= 50 KM
- <= 5 hours
If either is exceeded, the trip is not a Local Trip.
