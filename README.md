# festival-campingg

> [!IMPORTANT]
> ### ⚠️ NOTA PARA EL DOCENTE — Commits de Mariaisabel (`Mariaisabel2`)
> Durante la integración del proyecto se presentó un conflicto de divergencia en el árbol de Git derivado de una reescritura de historial al sincronizar dependencias de Prisma 7. La vía para integrar su trabajo a `main` fue reaplicar los cambios en la rama `feature/detail-and-zone-occupancy-sync`.
> 
> Para verificar que el trabajo de Mariaisabel se desarrolló de manera progresiva y orgánica:
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
| **Persona 1 — Mayday3003** | Initial setup, schema sync with Prisma 7, pure domain entities (`ReservaCamping`, `Asistente`, `Zona`), repository interface (`IReservaCampingRepository`), paginated listing use case (`ListarReservasCampingUseCase`), and base HTTP routing. |
| **Persona 2 — sanma613** | Application error classes (`ValidationError`, `NotFoundError`, `BusinessRuleError`), implementation of `ActualizarReservaCampingUseCase` (PATCH with strict 404 precedence), and `EliminarReservaCampingUseCase` (soft DELETE with `state = 'REMOVED'`). |
| **Persona 3 — Josecopro** | Prisma 7 integration with `@prisma/adapter-pg`, creation use case with the 3 festival business rules (`CreateCampingReservationUseCase`), and global error handling middleware in `app.ts`. |
| **Persona 4 — Mariaisabel2** | Single item retrieval (`GetCampingReservationUseCase`), zone occupancy calculator (`GetZoneOccupancyUseCase`), controller integration, and the modular test suite (`tests/suite-completa.mjs`). |

---

## Clean Architecture Details

The system follows a strict Clean 4-Layer Architecture with Dependency Inversion:

### Persona 1: Setup, Domain & Paginated Listing (Mayday3003)
- **Domain Layer (`src/domain/`)**: Pure TypeScript models (`ReservaCamping`, `Asistente`, `Zona`) and abstract repository contract `IReservaCampingRepository`.
- **Application Layer (`src/application/`)**: `ListarReservasCampingUseCase.ts` handling pagination defaults (`page=1`, `limit=10`), maximum limit validation (`limit <= 50`), and filtering.
- **Infrastructure Layer (`src/infrastructure/`)**: Sourced database credentials from `process.env.DATABASE_URL` and implemented `PrismaReservaCampingRepository.listar()`.
- **Interface Layer (`src/interface/`)**: Base router mounting and pagination query param validation.

### Persona 2: Edición & Borrado Lógico (sanma613)
- **Domain Layer (`src/domain/`)**: Defined `DatosActualizarReserva` DTO decoupling mutable attributes from persistence models.
- **Application Layer (`src/application/`)**:
  - `ActualizarReservaCampingUseCase.ts`: Enforces 404 precedence over empty payload on missing resources, verifies festival dates window, capacity, and editable fields (`CAMPOS_PERMITIDOS`).
  - `EliminarReservaCampingUseCase.ts`: Idempotent soft delete updating `state = 'REMOVED'`.
  - `ApplicationErrors.ts`: Typed exception hierarchy (`ValidationError` 400, `NotFoundError` 404, `BusinessRuleError` 409).
- **Infrastructure Layer (`src/infrastructure/`)**: Implemented `actualizar()` and `borradoLogico()` in `PrismaReservaCampingRepository.ts`.
- **Interface Layer (`src/interface/`)**: Added `actualizar` and `eliminar` controller actions and registered `PATCH /:id` and `DELETE /:id`.

### Persona 3: Creación & Reglas de Negocio (Josecopro)
- **Domain Layer (`src/domain/`)**: Validated domain constraints across attendee age cutoffs and zone capacities.
- **Application Layer (`src/application/`)**:
  - `CreateCampingReservationUseCase.ts`: Implemented reservation creation enforcing adult-only cutoff, single active booking, and zone capacity limits (409 Conflict).
- **Infrastructure Layer (`src/infrastructure/`)**: Prisma 7 setup with PostgreSQL driver adapter (`@prisma/adapter-pg`).
- **Interface Layer (`src/interface/`)**: Global error middleware in `src/app.ts` ensuring structured JSON error responses without stack trace leaks.

### Persona 4: Detalle, Aforo & Suite Modular (Mariaisabel2)
- **Domain Layer (`src/domain/`)**: Leveraged entity definitions and repository contracts `obtenerPorId`, `obtenerZonaPorId` and `contarReservasActivasPorZona`.
- **Application Layer (`src/application/`)**:
  - `GetCampingReservationUseCase.ts`: Lookup for active reservations with 404 handling when absent or soft-deleted.
  - `GetZoneOccupancyUseCase.ts`: Computes total capacity, occupied spots, and availability, rejecting non-camping zones with 400.
- **Interface Layer (`src/interface/`)**: Controller methods for findById and occupancy; ordered `/zona/:zonaId/ocupacion` prior to `/:id` in router.
- **Testing Architecture (`tests/`)**: Designed the modular suite (`suite-completa.mjs`), separating use case unit tests (`tests/use-cases/`) from API integration tests (`tests/integration/`).

---

## Business Rules Explained (409 Conflict)

1. **Adults Only**: Attendees must be at least 18 years old on the festival opening date (`2026-11-19`, cutoff `2008-11-19`). Evaluated in `CreateCampingReservationUseCase.ts` and `ActualizarReservaCampingUseCase.ts`.
2. **Single Active Reservation**: An attendee can hold at most one active reservation (`state != 'REMOVED'`). Verified via `tieneReservaActiva()`.
3. **Zone Capacity**: Tent bookings cannot exceed the maximum tent capacity of the selected zone. Verified via `contarReservasActivasPorZona()`.

---

## Test Suites

The project includes both the official teacher kit and a custom modular test suite:

- **Official Public Tests (`npm test`)**: 15/15 tests passing.
- **Custom Modular Suite (`npm run test:suite`)**:
  - 20 Unit Tests (`tests/use-cases/`) with isolated mocks.
  - 27 Integration Tests (`tests/integration/`) covering pagination limits, creation rules, update/delete precedence, and zone occupancy.

---

## Declaración sobre el Uso de Inteligencia Artificial

En cumplimiento de las políticas del curso, se declara el uso puntual de herramientas de Inteligencia Artificial como asistente técnico durante el desarrollo del proyecto:

1. **Generación de plantillas (boilerplate)**: Creación de estructuras base repetitivas para DTOs, interfaces de TypeScript y esqueletos iniciales de pruebas unitarias.
2. **Depuración y diagnóstico**: Detección de errores de sintaxis, discrepancias de importación de módulos ESM y verificación del orden de precedencia de códigos HTTP (400 vs 404 vs 409).
3. **Redacción técnica**: Asistencia en la estructuración, estandarización y redacción de este documento `README.md`.
