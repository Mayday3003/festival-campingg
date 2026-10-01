# festival-campingg

> [!IMPORTANT]
> ### ⚠️ NOTA PARA EL DOCENTE — Commits de Mariaisabel (`Mariaisabel2`)
> Durante la integración del proyecto se presentó un conflicto de divergencia en el árbol de Git derivado de una reescritura de historial al sincronizar dependencias de Prisma 7. La vía para integrar su trabajo a `main` fue reaplicar los cambios en la rama `feature/detail-and-zone-occupancy-sync`.
> 
> Para verificar que el trabajo de Mariaisabel se desarrolló de manera progresiva y orgánica (y no generado con IA o en bloque):
> * **Se mantuvo intacta la rama original de trabajo:** [`feature/detail-and-zone-occupancy`](https://github.com/Mayday3003/festival-campingg/tree/feature/detail-and-zone-occupancy).
> * En esa rama original se puede auditar la distribución cronológica y gradual de todos sus commits individuales (casos de uso, controladores, rutas y la suite de pruebas).
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
npm run test:suite        # our extended edge-case and unit suite (tests/suite-completa.mjs)
```

---

## Endpoints

| Method | Route | Success | Error Codes | Description |
|---|---|---|---|---|
| GET | `/api/reservas-camping?page&limit&zona_id&asistente_id` | 200 paginated | 400 | Paginated list with optional query filters |
| GET | `/api/reservas-camping/:id` | 200 | 400, 404 | Single active reservation detail |
| POST | `/api/reservas-camping` | 201 | 400, 404, 409 | Create new camping reservation enforcing business rules |
| PATCH | `/api/reservas-camping/:id` | 200 | 400, 404, 409 | Partial update (personas, dates, zone) with rule revalidation |
| DELETE | `/api/reservas-camping/:id` | 200 | 400, 404 | Soft delete (state transition to `REMOVED`) |
| GET | `/api/reservas-camping/zona/:zonaId/ocupacion` | 200 | 400, 404 | Zone capacity, occupied tents, and availability |
| GET | `/api/health` | 200 | — | Diagnostic microservice status check |

---

## Team & Layer Breakdown

| Member | Contribution |
|---|---|
| **Integrante 1 — Mayday3003** | Initial setup (`package.json`, `tsconfig.json`, `.env.example`, `.gitignore`), schema sync with Prisma 7, pure domain entities (`ReservaCamping`, `Asistente`, `Zona`) and repository interface (`IReservaCampingRepository`), paginated listing use case (`ListarReservasCampingUseCase`) with input validations and query filters (`?zona_id=`, `?asistente_id=`), and core Express HTTP routing. |
| **Integrante 2 — sanma613** | Application error hierarchy (`ValidationError`, `NotFoundError`, `BusinessRuleError`), implementation of `ActualizarReservaCampingUseCase` (PATCH with editable field checking, date window enforcement, capacity revalidation and strict 404 precedence), and `EliminarReservaCampingUseCase` for soft DELETE (`state = 'REMOVED'`). |
| **Integrante 3 — Josecopro** | Prisma 7 integration with `@prisma/adapter-pg`, single item retrieval (`GetCampingReservationUseCase`), creation use case with the 3 festival business rules (`CreateCampingReservationUseCase`), zone occupancy calculator (`GetZoneOccupancyUseCase`), and extended edge-case test runner. |
| **Integrante 4 — Mariaisabel2** | Implementation of `GetCampingReservationUseCase` (GET /:id), `GetZoneOccupancyUseCase` (GET /zona/:zonaId/ocupacion), controller integration, and the 27-test automated extended edge-case suite (`tests/camping.mjs`). |

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

## Architecture Details: Persona 2

Implemented the mutation and soft deletion operations ensuring full adherence to the 4-layer separation and contract rules:

1. **Domain Layer (`src/domain/`)**:
   - Defined `DatosActualizarReserva` in `IReservaCampingRepository.ts` to strictly decouple mutable fields (`zona_id`, `fecha_entrada`, `fecha_salida`, `personas`) from persistence concerns.
2. **Application Layer (`src/application/`)**:
   - **`ActualizarReservaCampingUseCase.ts`**:
     - Strict route `:id` validation (positive integer → 400).
     - Enforces 404 precedence over empty payload: checks reservation existence before body rejection per CONVENCIONES §4.
     - Validates permitted fields (`CAMPOS_PERMITIDOS`), rejecting any extraneous key with 400 Bad Request.
     - Re-validates date constraints (`fecha_salida > fecha_entrada`, festival window 2026-11-19 to 2026-11-23) and personas capacity (1–6).
     - Enforces business rules on update: rejects minor attendees (409), duplicate active reservations (409), and zone capacity overflow (409).
   - **`EliminarReservaCampingUseCase.ts`**:
     - Enforces soft delete idempotency: verifies reservation existence and checks `state !== 'REMOVED'`; subsequent deletes return 404.
     - Delegates status transition `state = 'REMOVED'` to the repository.
   - **`ApplicationErrors.ts`**: Standardized domain exceptions (`ValidationError` → 400, `NotFoundError` → 404, `BusinessRuleError` → 409).
3. **Infrastructure Layer (`src/infrastructure/database/`)**:
   - Implemented `actualizar()` and `eliminar()` in `PrismaReservaCampingRepository.ts` updating records via Prisma Client without physical row deletion.
4. **Interface Layer (`src/interface/http/`)**:
   - Added `actualizar` and `eliminar` controller actions in `ReservaCampingController.ts`.
   - Registered `PATCH /api/reservas-camping/:id` and `DELETE /api/reservas-camping/:id` in `reservaCampingRoutes.ts`.

---

## Architecture Details: Persona 3 (Detalle, Ocupación & Suite de Pruebas — Mariaisabel2)

Implemented the single item retrieval, zone occupancy calculation and extended negative testing:

1. **Domain Layer (`src/domain/`)**:
   - Leveraged pure entities `ReservaCamping` and `Zona`.
   - Used repository contract methods `obtenerPorId()`, `obtenerZonaPorId()` and `contarReservasActivasPorZona()`.
2. **Application Layer (`src/application/`)**:
   - **`GetCampingReservationUseCase.ts`**: Encapsulates single reservation lookup; throws `NotFoundError` (404) if missing or if `state === 'REMOVED'`.
   - **`GetZoneOccupancyUseCase.ts`**: Validates that target zone exists (404) and is of type `CAMPING` (400), returning total capacity, active occupied tents and available spots.
3. **Interface Layer (`src/interface/http/`)**:
   - Controller handlers `obtenerPorId` and `obtenerOcupacion`.
   - Route registration in `reservaCampingRoutes.ts` placing `/zona/:zonaId/ocupacion` before `/:id` so Express router never mistakes the word `zona` for a numerical ID.
4. **Testing Suite (`tests/suite-completa.mjs`)**:
   - Created the 27 automated integration test cases verifying strict error precedence (400 > 404 > 409), date boundaries, minor attendee rejection, and idempotent deletion.


## Business rule explained: adults only

**What it validates.** Only people who are already 18 on the first camping night (2026-11-19) can book a tent. Someone born on 2008-11-19 turns 18 that same day and is allowed; someone born on 2008-11-20 is not. Because birth dates are stored as `YYYY-MM-DD`, the check is a plain string comparison against the cutoff `2008-11-19`. A later birth date means the person is still a minor, so the API responds **409**.

**Where it lives.** `src/application/use-cases/CreateCampingReservationUseCase.ts` (rule 1, constant `ADULT_BIRTH_DATE_CUTOFF`). It runs only after every 400/404 check passes, following the order in CONVENCIONES §5. The controller only delegates to the use case, and the use case reads the attendee through the `IReservaCampingRepository` interface, not through Prisma.

**How we tested it.** The public test `Regla: un menor de edad no puede acampar (409)` posts attendee 19 (a minor) and expects 409. Our suite (`tests/suite-completa.mjs`) covers the boundary: attendee 20, who turns 18 exactly on 2026-11-19, gets **201**. That reservation is then soft-deleted so the test can run again.
