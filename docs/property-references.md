# HousePro Prestige property references

The commercial reference is `HP<agency><city><consultant:2>-<sequence:2+>`.
Prestige has agency 1 and city 1 (Faro). Rodrigo is consultant 01 and Manuela 02.
Brand administration has no commercial consultant code. UUID primary keys are
unchanged, preserving property links, leads, documents and other relationships.

Original portal references are restored from verified historical references.
They stay unchanged when a property is reassigned to another consultant, so
Idealista can match existing ads. The supplied screenshots show Rodrigo's
historical maximum 405; the already-entered new rental receives HP1101-406.
The next allocation is therefore 407; Manuela's new prefix starts at 01.

PostgreSQL assigns references during insertion, locks the consultant row and
checks the largest sequence in current, historical and previous references.
Normal entry, historical import and the existing atomic fraction duplicator
share this rule. Importing a higher original number advances future allocation;
importing an older number never rewinds it. Existing references cannot be edited
through a direct authenticated write; duplicate references/imports are rejected.
Previous internal references are retained as aliases for public Signature links.

When loading an existing Idealista property, fill in `Referência anterior /
Idealista` with the exact original reference. Leave it empty for a genuinely
new listing. Imported historical numbers are preserved even if their prefix
belongs to a different previous consultant.

Validation: 209 tests and production build; database transactions rolled back
for 70-fraction allocation (407–476), idempotent retry, authenticated normal
creation, Manuela 01, importing 600 then allocating 601, duplicate-reference
rejection, cross-consultant allocator rejection and immutable references.
No test properties remain and Idealista production export remains disabled.
