# festival-campingg

Module **08 — Camping** of Festival Picnic 2026: tent reservations in the camping zones, adults only, with zone capacity.
Contract: [`contratos/08-camping.md`](contratos/08-camping.md) · Conventions: [`contratos/CONVENCIONES.md`](contratos/CONVENCIONES.md)

Stack: Node.js + Express 5 + TypeScript + Prisma 7 (`@prisma/adapter-pg`) on the shared PostgreSQL (Supabase).  
Layers: `domain` → `application` (use cases and business rules) → `infrastructure` (Prisma only) → `interface` (HTTP).

---

## Install and run

```bash
npm install
cp .env.example .env      # fill in the database password
npm run sync              # prisma db pull + prisma generate (NEVER migrate / db push)
npm run dev               # API on http://localhost:$PORT (default 3000)
```

Tests (with the API running):

```bash
npm test                  # public kit tests
npm run test:suite        # our extended edge-case suite (tests/camping.mjs)
```

---

## Endpoints

| Method | Route | Success |
|---|---|---|
| GET | `/api/reservas-camping?page&limit&zona_id&asistente_id` | 200 paginated |
| GET | `/api/reservas-camping/:id` | 200 |
| POST | `/api/reservas-camping` | 201 |
| PATCH | `/api/reservas-camping/:id` | 200 |
| DELETE | `/api/reservas-camping/:id` | 200 (soft delete) |
| GET | `/api/reservas-camping/zona/:zonaId/ocupacion` | 200 |
| GET | `/api/health` | 200 diagnostic check |

---

## Team & Layer Breakdown

| Member | Contribution |
|---|---|
| **Integrante 1 — Mayday3003** | Initial setup (`package.json`, `tsconfig.json`, `.env.example`, `.gitignore`), schema sync with Prisma 7, pure domain entities (`ReservaCamping`, `Asistente`, `Zona`) and repository interface (`IReservaCampingRepository`), paginated listing use case (`ListarReservasCampingUseCase`) with input validations and query filters (`?zona_id=`, `?asistente_id=`), and core Express HTTP routing. |
| **Integrante 2 — sanma613** | Application error classes (`ValidationError`, `NotFoundError`, `BusinessRuleError`), implementation of `ActualizarReservaCampingUseCase` (PATCH with editable field checking and error precedence), and soft DELETE with logical state transition to `'REMOVED'`. |
| **Integrante 3 — Josecopro** | Prisma 7 integration with `@prisma/adapter-pg`, single item retrieval (`GetCampingReservationUseCase`), creation use case with the 3 festival business rules (`CreateCampingReservationUseCase`), zone occupancy calculator (`GetZoneOccupancyUseCase`), and extended edge-case test suite. |
| **Integrante 4 — Mariaisabel2** | Verification of contract adherence, negative boundary testing, validation of strict 400/404/409 error precedence, and documentation polishing. |

---

## Architecture Details: Persona 1 (Setup, Domain & Paginated Listing)

The foundational work established in Milestone 1 strictly adheres to the Clean 4-Layer Architecture:

1. **Domain Layer (`src/domain/`)**:
   - Pure TypeScript models (`ReservaCamping`, `Asistente`, `Zona`) completely decoupled from the database engine.
   - Declared the abstract contract `IReservaCampingRepository`, ensuring the use cases never depend on Prisma directly (Inversion of Control).
2. **Application Layer (`src/application/use-cases/ListarReservasCampingUseCase.ts`)**:
   - Encapsulates the listing logic and pagination filters.
   - Guarantees sorting by `id ASC` and automatic exclusion of soft-deleted records (`state = 'REMOVED'`).
3. **Infrastructure Layer (`src/infrastructure/database/`)**:
   - Sourced database credentials exclusively from `process.env.DATABASE_URL`.
   - Implemented `PrismaReservaCampingRepository.listar()` calculating `totalPages = Math.ceil(total / limit)`.
4. **Interface Layer (`src/interface/http/`)**:
   - Express controller validating `page` and `limit` (positive integers, `limit <= 50`, returning 400 if invalid).
   - Validated numeric query filters (`?zona_id=` and `?asistente_id=`) returning 400 on non-numeric input per CONVENCIONES §3.

---

## Business rule explained: adults only

**What it validates.** Only people who are already 18 on the first camping night (2026-11-19) can book a tent. Someone born on 2008-11-19 turns 18 that same day and is allowed; someone born on 2008-11-20 is not. Because birth dates are stored as `YYYY-MM-DD`, the check is a plain string comparison against the cutoff `2008-11-19`. A later birth date means the person is still a minor, so the API responds **409**.

**Where it lives.** `src/application/use-cases/CreateCampingReservationUseCase.ts` (rule 1, constant `ADULT_BIRTH_DATE_CUTOFF`). It runs only after every 400/404 check passes, following the order in CONVENCIONES §5. The controller only delegates to the use case, and the use case reads the attendee through the `IReservaCampingRepository` interface, not through Prisma.

**How we tested it.** The public test `Regla: un menor de edad no puede acampar (409)` posts attendee 19 (a minor) and expects 409. Our suite (`tests/camping.mjs`) covers the boundary: attendee 20, who turns 18 exactly on 2026-11-19, gets **201**. That reservation is then soft-deleted so the test can run again.
