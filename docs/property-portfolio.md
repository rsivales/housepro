# Helix property portfolio

`/app/imoveis`: own/co-listed portfolio; the agency tab appears when the role has
viewAgency. `/admin/imoveis`: agency/global initial scope. Responsive compact rows on phones and a sortable table on desktop support 25/50/100 rows per page. The sidebar, role menus,
management dashboard, and developments page link to the compact list. No mock
properties or artificial performance scores are used in the real list.

The authenticated API returns only operational listing metadata, document kinds,
and aggregate counts. It never returns seller identity, document URLs or lead
contact data. PostgreSQL scopes every read/write using the current active profile,
actual ownership/co-listing and the owner's agency. Broker/other delegated roles
stay in their own agency; only admin/superadmin have global scope. Real portfolio
permissions are stored server-side and configured in `/admin/permissoes`.
Superadmin view-as sessions are read-only for mutations. Existing approval and
edit flows now enforce the same portfolio permission checks. Delegated readers can preview private drafts without receiving seller identity, document URLs or commission fields; editing remains a separate capability. Copy permission is independent from editing the source template. Legacy direct-client writes also enforce approval and assignment rights in the private trigger.

State transitions get exact timestamps from a DB trigger, regardless of whether
the change originates in the list or existing form. Historical dates are not
invented: active rows may show their original publication age; unknown inactive
periods explicitly say that the historical date was not recorded. Price drops
are recovered from actual existing price audit entries and future changes are
recorded by the database trigger. Only the last 3 reductions are expanded, with
a total reduction count. Document counts use the existing required-document rules,
including company sellers and the endorsed-license waiver. Commercial reservation is displayed separately from active publication and does not reset its age.

Anonymous page view/contact interactions are counted from launch time, including
Signature property pages. A per-property/event 30-minute session key deduplicates
reloads and repeated taps. No IP, visitor identity or personal contact data is
stored in this metric table. Contact counts are actual lead rows (including the
existing contact-intent capture); interactions are displayed separately. Public
collection pages are not falsely counted as views of a particular property.

Bulk duplication accepts 1–100 edited unit rows, assigns the target consultant,
and generates references using the same agency/consultant sequence convention as
normal creation. Legacy agencies without a code preserve the existing 0 prefix;
a reference-prefix lock and collision check keep references unique. A stable
batch UUID makes retries idempotent. Entire batches and their audit entries commit
atomically. Copies whitelist listing data/media, clear private seller/documents,
contracts, approval/Signature, tokens, SEO slug, statistics and price history, and
start as inactive drafts. No ads are published by duplication. Each fraction can
be edited, submitted and approved individually or via the selection toolbar.
A common development name groups the fractions in the existing public and
private development model once actual publication has been approved.

## Validation

- Typecheck and ESLint on changed modules.
- Vitest: unit generation, malformed batches, stable batch/session boundaries.
- Live database transaction, rolled back: 70 fractions, distinct references,
  idempotent retry, cleared private/workflow data, submit/approve/inactivate/
  reactivate and price-history capture.
- Live database transaction, rolled back: consultant, own-AMI, broker,
  delegated marketing and global administrator scope; delegated rights cannot
  cross agencies; engagement deduplication.
- RLS enabled on all new operational tables; anonymous/authenticated direct
  access and mutation RPC execution revoked. Trigger-only history capture is
  a private-schema definer, not an exposed callable API.
