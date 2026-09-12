# TODO Improvements

Sensitive/behavior-changing items found during review passes, queued here instead of applied directly.

### Login does not gate on email verification
- **Category:** Feature
- **What:** `POST /api/auth/login` (`src/auth/auth.service.ts` `validateUser`) issues a token pair for any user with correct credentials, regardless of `emailVerified`. The verify-email flow exists (`verifyEmail`, `GET /api/auth/verify-email`) but nothing currently checks its result — a user can register and log in immediately without ever clicking the link.
- **Where:** `src/auth/auth.service.ts` (`validateUser`, `login`), `src/auth/strategies/local.strategy.ts`
- **Why:** Not necessarily a bug (some products intentionally allow unverified login with restricted access), but it means `emailVerified` is currently decorative. Worth a deliberate decision: either gate login on it (throw `ForbiddenException` for unverified users) or document that verification is informational-only.
- **Risk:** Changes login behavior for existing/template users; would need `test/auth.e2e-spec.ts` updated to verify before asserting login succeeds.
- **Effort:** Low
