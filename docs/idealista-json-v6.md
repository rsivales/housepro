# Helix / HousePro — idealista JSON V6

Integration for one HousePro agency account. Source specification:
https://feeds.idealista.com/v6/specs/properties.html
Official Draft-04 schemas downloaded 2026-10-07 are vendored under
src/lib/idealista/schemas and bundled in schema-bundle.json. Validation is local;
no schema fetch or private documents are sent during export.

## Setup

1. Open `/admin/exportacoes` with a real HousePro brand-admin session.
2. Enter the real account ILC (`ilc` + 40 lowercase alphanumeric characters).
3. Confirm references/property codes with idealista before migrating an existing
   Casafari feed; reference, operation and property type affect existing-ad matching.
4. Select the complete set of ads to keep active, correct flagged fields or enter
   verified export overrides, save and download JSON for technical review.
5. Obtain idealista FTP details and set private server environment variables:
   IDEALISTA_FTP_HOST, IDEALISTA_FTP_USER, IDEALISTA_FTP_PASSWORD.
   Optional: IDEALISTA_FTP_PORT (21), IDEALISTA_FTP_DIRECTORY (/),
   IDEALISTA_FTP_SECURE (true; use false only if idealista explicitly requires FTP).
   Redeploy after setting environment variables. The temporary documentation login
   is not a FTP login. Do not commit credentials.
6. After vendor review, confirm approval and migration matching in Helix. Confirm
   the new-development service only if the idealista account actually has it.
7. Enable automatic export only once the complete selected snapshot validates.

## Behaviour

Supabase pg_cron calls POST /api/cron/idealista every 15 minutes only while the
private config is enabled. A generated DB secret authenticates this call;
concurrency/frequency claims and 5-minute leases prevent overlapping uploads.
Anonymous/authenticated DB clients cannot access the config or RPC. Real brand
admins use the authenticated API; demo sessions are rejected.

Selected approved, active, available properties from the configured agency are
loaded in deterministic order and pages of 500. Any failed database page aborts
rather than exporting a partial snapshot. Reserved/CPCV/sold/off-market ads are
excluded. Required fields and official schemas must validate for the whole feed;
errors block all transfers. Empty exports also block: idealista does not remove
all ads from an empty feed. Removing an ad from a nonempty snapshot can deactivate
it at idealista, so the UI explains this consequence.

A content hash prevents repeated unchanged uploads. basic-ftp uses binary TYPE I;
UTF-8 JSON is uploaded to a temporary `.uploading` file, renamed on completion to
an ILC-prefixed JSON filename. Confirm the server accepts FTPS, rename and ignores
`.uploading` files during onboarding. Last transfer time/count and failures are
visible in Helix; transfer success does not assert vendor publication success.

UUIDs are stable default property codes. Historical references are preferred when
available. Migration-specific external codes may be configured before first
transfer and become immutable afterwards; changing the account also requires a
review after first transfer. No automatic inference of missing area/bedrooms is
performed. Descriptions with explicit language headings are split into supported
languages; sections over 4000 characters are shortened at a paragraph/word boundary
for the feed, without changing the original listing. Only real public JPG/PNG/GIF
photo URLs are exported; private owner records, documents and unsupported video
links are omitted. Coordinates are exported with hidden/moved address precision.

Current new-development support maps an actual property flagged is_development,
its real development name and a single actual typology. It does not invent units
or prices, nor export unrelated promotional development records lacking inventory.

## Verification and pending vendor checks

Official-schema, eligibility, privacy, descriptions, stable hashes, required-field
and scheduler failure/locking tests run in Vitest. A real HousePro property snapshot
was validated for the review sample. The sample uses the official example ILC and
must be regenerated in Helix once the account's real ILC is supplied.

FTP end-to-end receipt/publication cannot be verified until idealista supplies FTP
credentials and approves the sample. No automatic feed has been enabled.
