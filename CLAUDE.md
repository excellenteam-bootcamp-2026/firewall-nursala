# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

```text
backend/                  the Node/Express/PostgreSQL application (everything below)
  Dockerfile              multi-stage: build (tsc) -> runtime (dist + prod deps only)
  env.dev / .env.prod     injected by the Compose stacks; never baked into the image
  .env.example            every required variable, no credentials
docker-compose.yml        default stack; `include`s the development configuration
docker-compose.dev.yml    development stack   (postgres -> migrate -> backend)
docker-compose.prod.yml   production stack    (postgres -> migrate -> backend)
```

A `frontend/` will be added at the root when it exists. Compose files stay at the root so they can coordinate all services.

## Commands

**All npm commands run from `backend/`** — `dotenv` resolves `.env`, and `LOG_FILE_PATH`, `outDir`, and the drizzle paths all resolve from the working directory. `docker compose` runs from the repository root.

```bash
cd backend

npm run dev          # nodemon + ts-node on src/main/server.ts
npm run build        # tsc -> dist/
npm start            # node dist/main/server.js (requires build)
npm test             # jest (ts-jest, roots = tests/) — includes the PostgreSQL suite
npm run test:unit    # unit tests only, no database needed
npm run test:db      # the PostgreSQL integration suite alone

npx jest tests/unit/domain/IpRule.test.ts   # single file
npx jest -t "rejects a non-integer port"    # single test by name

# From the repository root. Both stacks gate the backend on a pg_isready
# healthcheck and a one-shot `migrate` service, so a fresh volume comes up
# migrated and seeded. Run one stack at a time: same host ports, separate
# Compose projects and therefore separate volumes.
(cd .. && docker compose -f docker-compose.dev.yml up -d --build)   # or just: docker compose up -d
(cd .. && docker compose -f docker-compose.prod.yml up -d --build)
# Host ports: POSTGRES_HOST_PORT (default 5432), BACKEND_HOST_PORT (default 3000).
# Inside the network the backend always uses postgres:5432, never a host port.
npm run db:generate       # emit SQL migration into drizzle/ from schema.ts
npm run db:migrate        # apply migrations
npm run db:seed           # seed rule_types (1=ip, 2=domain, 3=port), idempotent
```

`npm test` needs a reachable PostgreSQL: the DB suite targets `TEST_DATABASE_URI`, falling back to `DEV_DATABASE_URI`. It **fails loudly** rather than skipping, so a green run always means PostgreSQL was really exercised. Use `npm run test:unit` when you deliberately have no database.

No linter or formatter is configured. `.env` is required and gitignored — `src/main/config/env.ts` parses it with zod at import time and **throws on startup if any of `ENV`, `PORT`, `DEV_DATABASE_URI`, `PROD_DATABASE_URI`, `DB_CONNECTION_INTERVAL` is missing or malformed**. This also means `drizzle.config.ts` and any script importing `config` needs a valid `.env`.

## Architecture

Ports-and-adapters (hexagonal), four layers with a strict inward dependency rule:

```text
backend/src/domain/       rules + validation, zero imports from other layers
backend/src/application/  services, factory, ports (interfaces), errors — depends only on domain
backend/src/adapters/     inbound/http (express) + outbound/persistence — implement/consume the ports
backend/src/main/         composition root, config, server bootstrap
```

Paths below are written relative to `backend/`.

`src/main/composition.ts` is the only place a concrete repository is chosen. `createFirewallRouterFor(repository)` takes any `IFirewallRepository`; `createInMemoryFirewallRouter()` is the in-memory wiring used by tests and by the default export of `app.ts`.

**The served process wires PostgreSQL.** `server.ts` owns the startup lifecycle and nothing serves traffic before the database answers:

```text
validated env -> logger -> createDatabase(uri) -> connect() Stop-and-Wait
  -> PostgresFirewallRepository -> FirewallService -> createApp(router) -> listen
```

`app.ts` still default-exports an in-memory application; that instance exists **only** for the test suites, which rely on Jest giving each test file its own module registry, and therefore never hardcode ids or assume an empty store (see the header comment in [tests/integration/firewallApi.test.ts](backend/tests/integration/firewallApi.test.ts)).

### Request flow

`routes/*Routes.ts` → controller → `FirewallService` → `IFirewallRepository`.

The three resource routers (`ipRoutes`, `domainRoutes`, `portRoutes`) all share one `createFirewallController` handler and differ only in the `RuleType` they pass to it; `ruleRoutes` holds the cross-type `GET/DELETE /rules` and `PATCH /rules/status`. All are mounted under `constants.apiBasePath` (`/api/firewall`).

Everything is factory-function based (`createFirewallRouter(service)`, `createFirewallController(service)`) rather than DI containers or class controllers — follow that pattern when adding endpoints.

### Validation is two-tiered

- **Request shape and primitive runtime types** — `adapters/inbound/http/validators/requestValidators.ts`, built on **zod**, called by controllers. Envelope (`values` non-empty array, `mode`, `ids` integers, `active` boolean) *and* per-element JavaScript type: ip/domain elements must be `string`, port elements must be an integer.
- **Semantic validity** — `domain/validation/ruleValidators.ts`, reached only through `FirewallRuleFactory.isValid(type, value)` from `FirewallService.addRule`. Real IPv4, bare domain (no protocol/path/port), port in 1..65535. The service validates *all* values before creating *any*, so a batch is all-or-nothing.

Both throw `RuleValidationError(code, message)`; the `code` string is what surfaces in the JSON body. Zod issues are never exposed raw — a wrongly typed element reports the same code as a semantically invalid one, via the shared [src/application/errors/ruleValidationErrors.ts](backend/src/application/errors/ruleValidationErrors.ts) map, so the two tiers cannot drift apart.

The domain validators are also independently total: each opens with a `typeof` guard and returns `false` for any exotic runtime value rather than throwing. Keep it that way — [tests/unit/domain/ruleValidators.test.ts](backend/tests/unit/domain/ruleValidators.test.ts) pins it.

### Error handling

Nothing try/catches in controllers. Handlers are `async` and Express 5 auto-forwards rejected promises to `errorHandler`, which maps:

| Error | Status | Code |
| --- | --- | --- |
| `RuleNotFoundError` | 404 | `RULE_NOT_FOUND` |
| `RuleValidationError` | 400 | its own `err.code` |
| error tagged with a 4xx `status` (e.g. `express.json()` parse failure) | that 4xx | `VALIDATION_ERROR` |
| anything else | 500 | `INTERNAL_SERVER_ERROR`, generic message |

Unexpected errors are logged in full via `console.error(err)` but their message is **never** sent to the client — it can carry stack, path, or database detail. Don't relax that to echo `err.message`.

This contract is pinned by [tests/unit/adapters/asyncRouteErrorPropagation.test.ts](backend/tests/unit/adapters/asyncRouteErrorPropagation.test.ts) — don't reintroduce local try/catch or the async-forwarding coverage becomes vacuous.

Every response carries `status: "success" | "error"` from `adapters/inbound/http/constants.ts`.

### Rule model

`FirewallRule<T>` is abstract with readonly `id`/`value`/`mode` and mutable `_active`; `IpRule`, `DomainRule`, `PortRule` subclass it and supply `type` + `isValid()`. Ids are assigned by the repository, not the domain — `FirewallRuleFactory.create(type, id, value, active, mode)` takes the id as an argument.

Two serializations, and endpoints deliberately differ: `toJSON()` returns `{id, value, active}` (used by POST responses via implicit serialization), `toDetailedJSON()` adds `type` and `mode` (used by DELETE and PATCH responses).

### Persistence

Two adapters implement the **same** `IFirewallRepository` port and are interchangeable at the composition root:

- `InMemoryFirewallRepository` — keeps its own id counter; used by tests.
- `drizzle/PostgresFirewallRepository` — used by the running server.

Both are held to one shared suite, [tests/fixtures/firewallRepositoryContract.ts](backend/tests/fixtures/firewallRepositoryContract.ts). **Add contract-level behaviour there, not to one adapter's tests.**

Schema: `firewall_rules.type_id` is a FK to the `rule_types` lookup table (seed before inserting), `mode` is a pg enum, `value` is `text`. All of that stops at [drizzle/firewallRuleMapper.ts](backend/src/adapters/outbound/persistence/drizzle/firewallRuleMapper.ts) — it owns the `RuleType ↔ type_id` map and decodes port values back to `number`. No Drizzle row type, `type_id`, or SQL detail may leak past it into the port, the service, or the domain.

**PostgreSQL owns persisted ids**: inserts omit `id` and read the generated identity back via `RETURNING`. Never compute `MAX(id)+1`.

`createDatabase(uri).connect(intervalMs)` is Stop-and-Wait — one attempt at a time, waiting `DB_CONNECTION_INTERVAL` between tries, no backoff and no attempt cap. It never returns until connected, so never call it from a test; probe with `client\`SELECT 1\`` instead.

### Logging and configuration

`main/config/Logger.ts` is a singleton that **reassigns global `console.log` to route through winston**. Console transport in `dev`, file transport (`LOG_FILE_PATH`) otherwise. So `console.log` anywhere in the codebase is already structured logging; `console.error` is not. The override captures the native `console.log` first, so the console fallback (used when winston fails to initialise) cannot recurse.

`env.ts` derives the level rather than trusting `LOG_LEVEL`: **production is always `info`**, dev defaults to `debug` and may be overridden. Read runtime settings from `config`, never from `process.env` directly.

## TypeScript config

`module: nodenext`, `strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` — array indexing yields `T | undefined` and optional properties can't be assigned `undefined` explicitly. `"types": []` means Node globals are not ambient; the surface that needs them is small and already handled.

## Testing

`tests/` mirrors `src/` (`tests/unit/{domain,application,adapters}`, `tests/integration`). Test doubles live in [tests/fixtures/firewallMocks.ts](backend/tests/fixtures/firewallMocks.ts) — use `createTestService()` and `stubRule()` from there rather than hand-rolling mocks. `StubRule` extends the abstract `FirewallRule` on purpose: the base declares protected members, so structural stand-ins don't type-check.
