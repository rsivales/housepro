# Consultant access and historical numbering

Prestige's historical consultant numbers through 12 remain reserved. Active
commercial consultants are Rodrigo 01, Manuela 02 and Alvacir 08. Brand
administration remains separate without a commercial code. The next new
consultant receives 14, then 15. Consultant and agency codes ending in 13 are
rejected by database constraints; allocators skip 13, 113, 213, etc. Longer
consultant codes are never truncated when generating property references.

Login navigation now depends on /api/auth/session verifying both Supabase
getUser() and an active professional profile on the server. A stale browser
getSession() hint cannot bounce /entrar to /app repeatedly. Password login
uses full navigation after session cookies are written, avoiding stale
prefetched unauthenticated pages. Professional magic links do not create
uninvited Auth accounts.

The server callback supports PKCE codes and token_hash links. Fragment-only
email links go through /auth/complete: the browser clears the sensitive
fragment, writes session cookies with setSession, verifies professional access,
and navigates once. Recovery/invitation links go to password setup. Invalid
links display a stable error with a link back to login. Auth redirects and
session responses are not cached. Inactive professional profiles cannot access
Helix even while an old access token remains valid.

Validation: 221 tests and production build. Tests cover stale/missing sessions,
missing and inactive profiles, service errors, safe destinations, recovery/PKCE
callbacks, and future reserved-code suffixes. Database transactions verify the
08 prefix, next14, skip113, invalid-code rejection and code114 generation;
all generated property rows are rolled back. The existing Alvacir account is
preserved; no email is sent and no password is reset by this repair.
