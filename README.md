English | [Português](README.pt.md)

# back-template-nest

Production-ready base template for new backend projects: NestJS, TypeScript (strict), Postgres + Prisma, Passport (local + JWT) auth with email verification/password reset/rate limiting, nodemailer with a console fallback, structured logging via nestjs-pino, a full example CRUD resource (`notes`), and Docker + CI wired end to end.

## Stack

- NestJS — TypeScript strict mode
- Postgres + Prisma (`schema.prisma`, versioned migrations)
- Passport — `passport-local` (login) + `passport-jwt` (route protection), `@nestjs/throttler` for rate limiting
- nodemailer — console fallback in dev when SMTP env vars aren't set
- nestjs-pino — pretty logs in dev, JSON in prod, level via `LOG_LEVEL`
- class-validator/class-transformer — DTO validation on every client-input endpoint
- Jest (unit, mocked dependencies) + Jest/Supertest (e2e, real Postgres, no mocks)
- ESLint + Prettier + Husky/lint-staged
- Docker (multi-stage, non-root, healthcheck) + docker-compose
- GitHub Actions (build+lint+test, Docker build, e2e against a real Postgres service) + Dependabot

## Getting started (Docker — recommended)

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# paste the output into .env as JWT_SECRET

docker compose up -d db      # start Postgres only
npm run db:migrate           # apply schema (first time / after schema changes)
npm run docker:up            # build and start the app too
```

App: http://localhost:3000/api. Postgres is exposed on host port `5456` by default — change `POSTGRES_PORT` in `.env` if that collides locally.

## Getting started (without Docker)

Requires a reachable Postgres instance.

```bash
cp .env.example .env    # point DATABASE_URL at your own Postgres
npm install
npm run db:migrate
npm run dev
```

## Environment variables

See `.env.example` for the full, commented list. `src/config/env.validation.ts` validates the required ones at startup via Joi — a missing/invalid var fails fast with a readable message.

## Auth

- `POST /api/auth/register`, `POST /api/auth/login` (register/login is rate limited to 5 requests/60s per IP, fixed and not env-configurable — see Design notes)
- `GET /api/auth/verify-email?token=...`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `PATCH /api/account/password`, `DELETE /api/account` (both require a Bearer JWT)
- All protected routes use `JwtAuthGuard` + `@CurrentUser()` (see `src/auth`)

## Email

Verification and password-reset emails go through `src/email/email.service.ts`. Without `SMTP_HOST` set, emails are logged to the console instead of sent — no setup required to try the flow locally.

## Example CRUD resource

`src/notes` (Prisma model owned by the authenticated user, DTO-validated, full CRUD) is the reference implementation to copy for your first real feature — delete it once you don't need the reference (drop the `Note` model from `prisma/schema.prisma` and generate a migration).

## Testing

- **Unit** (`npm test`): most services are instantiated manually with jest-mocked dependencies — no real database. The one exception is `src/prisma/prisma.service.spec.ts`, a real integration check (its own describe title says so) that needs a reachable Postgres; CI's `build` job runs a Postgres service specifically for it.
- **E2E** (`npm run test:e2e`): full `AppModule` + Supertest against a real Postgres, no mocks. Requires `docker compose up -d db && npm run db:migrate` first.

## Docker

- `Dockerfile` — multi-stage (`deps` → `builder` → `runner`), runs as a non-root user, healthcheck hits `/api/health` via `127.0.0.1`.
- `docker-compose.yml` — `db` (Postgres 17, healthchecked via `pg_isready`, host port `5456`) and `app` (waits for `db` healthy).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start dev server (watch mode) |
| `npm run build` | Compile TypeScript |
| `npm start` | Start the compiled server |
| `npm run lint` | ESLint (auto-fix) |
| `npm run format` | Prettier (write) |
| `npm run format:check` | Prettier (check only) |
| `npm test` | Unit tests |
| `npm run test:watch` | Unit tests, watch mode |
| `npm run test:e2e` | E2E tests against a real Postgres |
| `npm run db:generate` | `prisma migrate dev` — create + apply a migration locally |
| `npm run db:migrate` | `prisma migrate deploy` — apply pending migrations (CI/prod) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run docker:up` | `docker compose up --build` |
| `npm run docker:down` | `docker compose down` |

## Using this as a template

1. Clone/degit this repo as your new project's starting point
2. Update `package.json`'s `name` and this README
3. `cp .env.example .env`, set a real `JWT_SECRET`
4. `docker compose up -d db && npm run db:migrate && npm run dev`
5. Delete `src/notes` once you've copied its pattern for your own first feature

## Design notes and gotchas

Things that weren't obvious while building this, kept here so they don't have to be rediscovered:

- **Guards run before Pipes in Nest's request pipeline**: `@UseGuards(LocalAuthGuard)` fires passport-local's `validate()` before the controller's `@Body()` DTO ever reaches the global `ValidationPipe`. `LocalStrategy.validate()` (`src/auth/strategies/local.strategy.ts`) therefore runs `class-validator` against a `LoginDto` itself, before delegating to `AuthService.validateUser` — otherwise a malformed login body would silently skip schema validation and surface as a generic 401 instead of a 400.
- **`nest build` doesn't need placeholder env vars the way `next build` does**: Next.js's build step statically analyzes every route (including API routes), which imports and executes env-validated modules. `nest build` is plain `tsc` — it never instantiates `AppModule` or runs Joi validation. The *only* reason the Docker `deps`/`runner` stages and the CI `build` job still need a placeholder `DATABASE_URL` is that `npm ci` triggers `postinstall` → `prisma generate`, which needs the env var to be *set* to something (it never connects) but errors if it's simply undefined.
- **`class-validator`/`class-transformer` must be installed before `ValidationPipe` is ever wired, not just before the first DTO exists**: Nest's `ValidationPipe` calls `process.exit(1)` at construction if the packages aren't resolvable — the app couldn't boot for the one commit's window between wiring the pipe and the plan's originally-scheduled dependency install. Fixed by installing them a task early.
- **Docker healthcheck: use `127.0.0.1`, not `localhost`**: inside the Alpine container, `wget`'s `localhost` resolves to `::1` (IPv6) first, but the Nest server binds IPv4 — the healthcheck fails with "connection refused" even though the app is up. Both the `Dockerfile`'s `HEALTHCHECK` and `docker-compose.yml`'s `app.healthcheck` target `127.0.0.1` explicitly.
- **`bcryptjs` over `bcrypt`**: native `bcrypt` needs a `python3`/`make`/`g++` toolchain to compile on Alpine, which would otherwise have to be installed and then stripped back out of the `deps` stage. `bcryptjs` is pure JS — slightly slower per hash, irrelevant at this scale, and it keeps the Dockerfile a single `npm ci` with no build-tool detour.
- **Runtime stage reinstalls with `npm ci --omit=dev`**: rather than copying the `deps` stage's `node_modules` (which includes `typescript`, `eslint`, `jest`, etc.) into the final image, the `runner` stage does its own production-only install. This runs `prisma generate` a second time (needs the same placeholder `DATABASE_URL`), trading a few extra build seconds for a meaningfully smaller runtime image.
- **`"prepare": "husky"` breaks a production-only `npm ci --omit=dev`**: Husky is a devDependency; when the Docker runtime stage installs with `--omit=dev`, the `prepare` lifecycle script still fires but the `husky` binary is gone, failing the whole build with exit 127. Fixed with `"prepare": "husky || true"` — a missing/failing Husky install never blocks a production install.
- **Host Postgres port `5456`, not `5432`/`5433`/`5455`**: this machine already has other local Postgres instances (and the sibling `next-template` project) bound to those. `POSTGRES_PORT` in `.env` makes it a one-line fix wherever this is deployed.
- **Register/login's rate limit is hardcoded, not env-driven**: `THROTTLE_TTL`/`THROTTLE_LIMIT` configure the *global* fallback throttle (generous default: 100 req/60s, applies to every other route). The `@Throttle({ default: { limit: 5, ttl: 60000 } })` on `register`/`login` specifically is a fixed literal in `src/auth/auth.controller.ts` — deliberately not wired to an env var, so a misconfigured `.env` can't accidentally loosen protection on the two endpoints most worth protecting.
- **`Test.createTestingModule` never runs `main.ts`**: the global prefix, `ValidationPipe`, and `AllExceptionsFilter` set in `main.ts`'s `bootstrap()` have to be applied again on every e2e test's app instance. `test/utils/create-test-app.ts` centralizes this so it's set up identically once, not copy-pasted per spec file.
- **E2E specs run with `--runInBand`**: they share one real Postgres and use timestamped unique emails per spec run, but serial execution keeps a failing spec's DB state easy to reason about — safe default for a small suite; revisit if the suite grows large enough that serial execution becomes the bottleneck.
- **`src/prisma/prisma.service.spec.ts` is a real integration test living inside `npm test`, not just e2e**: it needs a reachable Postgres. Locally that's `docker compose up -d db`; in CI, the `build` job runs its own `postgres:17-alpine` service (same pattern as the `e2e` job) specifically so this one spec can pass — a first attempt without it failed for real in GitHub Actions before this was added.
- **ESLint's Jest-mock/supertest rules are scoped off for test files, not disabled globally**: `unbound-method` (fires on `expect(mock.method).toHaveBeenCalledWith(...)`) and `no-unsafe-assignment`/`no-unsafe-member-access` (fire on untyped `supertest` response bodies) are inherent to these patterns, not real bugs — turned off only for `**/*.spec.ts`/`**/*.e2e-spec.ts` in `eslint.config.mjs` so production code still gets the full type-checked rule set.
