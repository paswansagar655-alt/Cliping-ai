# ClipDeck Security Specification & Payload-First Rules Audit

## 1. Core Data Invariants
1. **Admin Authority**: Only the verified bootstrapped admin email (`paswansagar655@gmail.com` with `email_verified == true`) or UIDs explicitly listed in `/admins/{uid}` may read/list all user profiles, modify user `planTier` or quota limits, approve/reject upgrade requests, or update `/appConfig/monetization`.
2. **Self-Assigned Privilege Prevention**: Standard authenticated users can only create `/users/{uid}` with `planTier == "free"`, `scansUsed == 0`, `exportsUsed == 0`, and bounded starter quotas (`<= 25`). They cannot modify `planTier`, `monthlyScanLimit`, `monthlyExportLimit`, `email`, `uid`, or `createdAt` on update.
3. **Quota Integrity**: Standard users may only increment `scansUsed` or `exportsUsed` by at most `+1` per mutation and never above their `monthlyScanLimit` / `monthlyExportLimit`, nor decrement their own usage counters.
4. **PII Isolation**: User profiles containing emails (`users/{uid}`) and upgrade requests (`upgradeRequests/{id}`) can only be read or listed by the document owner (`uid == request.auth.uid`) or an admin (`isAdmin()`).
5. **Temporal & ID Integrity**: Every document ID path variable must pass `isValidId()` (`<= 128` chars, `^[a-zA-Z0-9_-]+$`), and `createdAt`/`updatedAt` must strictly equal `request.time`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Self-Assigned Pro Plan on Signup**: `POST /users/{uid}` with `planTier: "pro"` by non-admin user -> Rejected.
2. **Quota Reset / Decrement Hack**: `PATCH /users/{uid}` setting `scansUsed: 0` when existing `scansUsed: 4` -> Rejected.
3. **Limit Inflation Attack**: `PATCH /users/{uid}` changing `monthlyScanLimit: 9999` by non-admin -> Rejected.
4. **Shadow Ghost Field Injection**: `POST /users/{uid}` including `isAdmin: true` or `credits: 999` -> Rejected by `keys().hasOnly(...)`.
5. **Email Spoofing Without Verification**: Signed-in token with `email: "paswansagar655@gmail.com"` and `email_verified: false` attempting admin read -> Rejected.
6. **Cross-User PII Scraping**: Authenticated user A calling `list` on `/users` without owning documents -> Rejected.
7. **Unverified User Write**: Unverified email token attempting to create `/upgradeRequests/{id}` -> Rejected.
8. **Self-Approved Upgrade Request**: User creating `/upgradeRequests/{id}` with `status: "approved"` -> Rejected (`status == "pending"` required on create).
9. **Terminal Upgrade Status Tampering**: User or admin attempting to mutate an already `"approved"` upgrade request back to `"pending"` -> Rejected.
10. **Non-Admin AdSense Hijack**: Standard user attempting `write` on `/appConfig/monetization` with attacker `adsenseClientId` -> Rejected.
11. **Oversized ID Poisoning**: Creating `/usageLogs/{1500_char_id}` -> Rejected by `isValidId()`.
12. **Backdated Timestamp Injection**: Creating `/usageLogs/{id}` with client-supplied past timestamp instead of `request.time` -> Rejected.
