# festival-campingg

> [!IMPORTANT]
> ### ⚠️ NOTA PARA EL DOCENTE — Commits de Mariaisabel (`Mariaisabel2`)
> Durante la integración del proyecto se presentó un conflicto de divergencia en el árbol de Git derivado de una reescritura de historial al sincronizar dependencias de Prisma 7. La vía para integrar su trabajo a `main` fue reaplicar los cambios en la rama `feature/detail-and-zone-occupancy-sync`.
> 
> Para verificar que el trabajo de Mariaisabel se desarrolló de manera progresiva y orgánica:
> * **Se mantuvo intacta la rama original de trabajo:** [`feature/detail-and-zone-occupancy`](https://github.com/Mayday3003/festival-campingg/tree/feature/detail-and-zone-occupancy).
> * En esa rama original se puede auditar la distribución cronológica y gradual de todos sus commits individuales (casos de uso, controladores, rutas y la suite de pruebas).

Módulo **08 — Camping** del Festival Picnic 2026: administración de reservas de carpas en las zonas de camping, exclusivo para mayores de edad y sujeto a la capacidad de cada zona.  
Contrato: [`contratos/08-camping.md`](contratos/08-camping.md) · Convenciones: [`contratos/CONVENCIONES.md`](contratos/CONVENCIONES.md)

Stack tecnológico: Node.js + Express 5 + TypeScript + Prisma 7 (`@prisma/adapter-pg`) sobre la base de datos compartida en PostgreSQL (Supabase).  
Capas: `domain` → `application` (casos de uso y reglas de negocio) → `infrastructure` (persistencia con Prisma) → `interface` (controladores y rutas HTTP).

---

## Instalación y ejecución

```bash
npm install
cp .env.example .env      # configurar la contraseña de la base de datos
npm run sync              # prisma db pull + prisma generate (NUNCA usar migrate ni db push)
npm run dev               # levanta la API en http://localhost:$PORT (por defecto 3000)
```

Ejecución de pruebas (con la API levantada en otra terminal):

```bash
npm test                  # pruebas públicas oficiales del kit (15/15)
npm run test:suite        # suite modular de pruebas unitarias y de integración (tests/suite-completa.mjs)
```

---

## Endpoints

| Método | Ruta | Código Éxito | Códigos de Error | Descripción |
|---|---|---|---|---|
| GET | `/api/reservas-camping?page&limit&zona_id&asistente_id` | 200 paginado | 400 | Listado paginado con filtros opcionales |
| GET | `/api/reservas-camping/:id` | 200 | 400, 404 | Detalle de una reserva activa específica |
| POST | `/api/reservas-camping` | 201 | 400, 404, 409 | Creación de reserva validando las reglas del festival |
| PATCH | `/api/reservas-camping/:id` | 200 | 400, 404, 409 | Edición parcial (personas, fechas, zona) con revalidación |
| DELETE | `/api/reservas-camping/:id` | 200 | 400, 404 | Borrado lógico (transición de estado a `REMOVED`) |
| GET | `/api/reservas-camping/zona/:zonaId/ocupacion` | 200 | 400, 404 | Capacidad total, carpas ocupadas y cupos disponibles |
| GET | `/api/health` | 200 | — | Endpoint de diagnóstico y estado del microservicio |

---

## Equipo y asignación de responsabilidades

| Integrante | Rol y Contribución Principal |
|---|---|
| **Persona 1 — Mayday3003** | Configuración inicial del entorno, sincronización de esquema con Prisma 7, entidades de dominio puro (`ReservaCamping`, `Asistente`, `Zona`), interfaz de repositorio (`IReservaCampingRepository`), caso de uso de listado paginado (`ListarReservasCampingUseCase`) y ruteo HTTP base. |
| **Persona 2 — sanma613** | Jerarquía de excepciones de aplicación (`ValidationError`, `NotFoundError`, `BusinessRuleError`), implementación de `ActualizarReservaCampingUseCase` (PATCH con estricta precedencia de 404), y `EliminarReservaCampingUseCase` (borrado lógico con `state = 'REMOVED'`). |
| **Persona 3 — Josecopro** | Integración de Prisma 7 con `@prisma/adapter-pg`, caso de uso de creación con validación de las 3 reglas de negocio (`CreateCampingReservationUseCase`), y middleware de manejo seguro de errores en `src/app.ts`. |
| **Persona 4 — Mariaisabel2** | Caso de uso de detalle (`GetCampingReservationUseCase`), cálculo de aforo de zonas (`GetZoneOccupancyUseCase`), integración en controladores y estructuración de la suite de pruebas modular (`tests/suite-completa.mjs`). |

---

## Detalles de Arquitectura Limpia

El módulo implementa estrictamente una Arquitectura en 4 Capas con Inversión de Dependencias:

### Persona 1: Setup, Dominio y Listado Paginado (Mayday3003)
- **Capa de Dominio (`src/domain/`)**: Definición de modelos puros en TypeScript (`ReservaCamping`, `Asistente`, `Zona`) y el contrato abstracto `IReservaCampingRepository`, asegurando que el dominio no dependa de Prisma ni de frameworks externos.
- **Capa de Aplicación (`src/application/`)**: `ListarReservasCampingUseCase.ts` encargado de la paginación por defecto (`page=1`, `limit=10`), control del límite superior (`limit <= 50`), ordenamiento ascendente por ID y exclusión automática de registros eliminados.
- **Capa de Infraestructura (`src/infrastructure/`)**: Conexión a base de datos mediante variables de entorno e implementación de `PrismaReservaCampingRepository.listar()`.
- **Capa de Interfaz (`src/interface/`)**: Montaje del enrutador y validación de parámetros numéricos en la URL según la sección 3 de CONVENCIONES.

### Persona 2: Edición y Borrado Lógico (sanma613)
- **Capa de Dominio (`src/domain/`)**: DTO `DatosActualizarReserva` para tipar exclusivamente los campos editables (`zona_id`, `fecha_entrada`, `fecha_salida`, `personas`), desacoplándolos de la base de datos.
- **Capa de Aplicación (`src/application/`)**:
  - `ActualizarReservaCampingUseCase.ts`: Validación de formato entero positivo en `:id` (400), garantía de precedencia de 404 sobre cuerpos vacíos en registros inexistentes (sección 4 de CONVENCIONES), control de ventana de fechas del festival (19 al 23 de noviembre de 2026), capacidad de carpas (1 a 6 personas) y revalidación de reglas de negocio ante cambios de zona o fechas.
  - `EliminarReservaCampingUseCase.ts`: Verificación de existencia activa y borrado lógico idempotente (el primer intento retorna 200 y los posteriores 404).
  - `ApplicationErrors.ts`: Jerarquía tipada de errores que mapean directamente a códigos HTTP (`ValidationError` 400, `NotFoundError` 404, `BusinessRuleError` 409).
- **Capa de Infraestructura (`src/infrastructure/`)**: Métodos `actualizar()` y `borradoLogico()` en `PrismaReservaCampingRepository.ts` modificando el registro sin destrucción física de datos.
- **Capa de Interfaz (`src/interface/`)**: Controladores y registro de rutas `PATCH /:id` y `DELETE /:id`.

### Persona 3: Creación y Reglas de Negocio (Josecopro)
- **Capa de Dominio (`src/domain/`)**: Especificación de restricciones de fechas y capacidades asociadas a las entidades.
- **Capa de Aplicación (`src/application/`)**:
  - `CreateCampingReservationUseCase.ts`: Orquestación de la creación de reservas evaluando secuencialmente el orden de validaciones (400 sintácticos > 404 recursos inexistentes > 400 tipos de zona incompatibles > 409 reglas de negocio).
- **Capa de Infraestructura (`src/infrastructure/`)**: Configuración del cliente Prisma 7 utilizando el adaptador para PostgreSQL (`@prisma/adapter-pg`).
- **Capa de Interfaz (`src/interface/`)**: Middleware central de errores en `src/app.ts` que captura JSON malformados (400) y previene la exposición de stack traces de base de datos en respuestas 500.

### Persona 4: Detalle, Aforo y Suite Modular (Mariaisabel2)
- **Capa de Dominio (`src/domain/`)**: Uso de entidades y métodos de repositorio `obtenerPorId`, `obtenerZonaPorId` y `contarReservasActivasPorZona`.
- **Capa de Aplicación (`src/application/`)**:
  - `GetCampingReservationUseCase.ts`: Búsqueda de reservas activas con respuesta 404 cuando no existen o tienen estado `REMOVED`.
  - `GetZoneOccupancyUseCase.ts`: Cálculo de capacidad total, carpas ocupadas y cupos disponibles, rechazando zonas que no sean de tipo `CAMPING` con 400.
- **Capa de Interfaz (`src/interface/`)**: Métodos de controlador y ordenamiento de rutas en `reservaCampingRoutes.ts` (posicionando `/zona/:zonaId/ocupacion` antes de `/:id` para evitar conflictos en el enrutador de Express).
- **Arquitectura de Pruebas (`tests/`)**: Diseño y estructuración de la suite modular (`suite-completa.mjs`), separando pruebas unitarias de casos de uso (`tests/use-cases/`) de las pruebas de integración (`tests/integration/`).

---

## Explicación de Reglas de Negocio (409 Conflict)

1. **Solo mayores de edad:** El asistente titular debe tener 18 años cumplidos al inicio de la primera noche de camping (`2026-11-19`, fecha límite de nacimiento `2008-11-19`). Quien cumpla la mayoría de edad ese mismo día puede reservar; un menor de edad es rechazado con código 409. Implementada en `CreateCampingReservationUseCase.ts` y `ActualizarReservaCampingUseCase.ts`.
2. **Máximo una reserva activa por asistente:** Un asistente no puede contar con más de una reserva de camping en estado activo simultáneamente. Se valida mediante `tieneReservaActiva()` antes de crear o al actualizar.
3. **Control de aforo por zona:** Cada zona cuenta con un límite físico de carpas (`capacidad`). Si las reservas activas alcanzan dicho límite, cualquier intento de reserva adicional es rechazado con 409. Se valida mediante `contarReservasActivasPorZona()`.

---

## Batería de Pruebas

El proyecto cuenta con dos suites de verificación automatizadas:

- **Pruebas Oficiales del Kit (`npm test`)**: 15 de 15 pruebas públicas aprobadas contra el contrato del festival.
- **Suite Modular Propia (`npm run test:suite`)**:
  - 20 Pruebas Unitarias (`tests/use-cases/`) ejecutadas con mocks puros y aislamiento total.
  - 27 Pruebas de Integración (`tests/integration/`) evaluando casos borde de paginación, precedencia de códigos HTTP, creación con reglas de negocio y borrado lógico.

---

## Declaración sobre el Uso de Inteligencia Artificial

En cumplimiento de las pautas académicas del curso, se detalla el uso de herramientas de Inteligencia Artificial como apoyo técnico en el desarrollo:

1. **Generación de plantillas (boilerplate)**: Construcción de estructuras base repetitivas para DTOs, interfaces de dominio y esqueletos de pruebas unitarias.
2. **Diagnóstico y depuración**: Asistencia en la identificación de inconsistencias de importación de módulos ESM y verificación del orden estricto de precedencia de errores (400 vs 404 vs 409).
3. **Redacción técnica**: Apoyo en la organización, coherencia y estandarización del presente documento `README.md`.
