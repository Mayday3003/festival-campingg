import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CreateCampingReservationUseCase } from '../../src/application/use-cases/CreateCampingReservationUseCase.js';
import { IReservaCampingRepository } from '../../src/domain/repositories/IReservaCampingRepository.js';
import { BusinessRuleError, ValidationError } from '../../src/application/errors/ApplicationErrors.js';
import { ReservaCamping, Zona, Asistente } from '../../src/domain/entities/ReservaCamping.js';

function createMockRepository(overrides: Partial<IReservaCampingRepository> = {}): IReservaCampingRepository {
    return {
        listar: async () => ({ data: [], pagination: { total: 0, currentPage: 1, limit: 10, totalPages: 0 } }),
        obtenerPorId: async () => null,
        obtenerAsistentePorId: async () => null,
        obtenerZonaPorId: async () => null,
        contarReservasActivasPorZona: async () => 0,
        tieneReservaActiva: async () => false,
        crear: async (datos) => ({ id: 10, ...datos, state: 'ACTIVE' } as ReservaCamping),
        actualizar: async () => ({} as ReservaCamping),
        borradoLogico: async () => true,
        ...overrides,
    };
}

const mockAsistenteAdulto: Asistente = { id: 7, nombre: 'Ana', documento: '1037600107', fecha_nacimiento: '2000-01-01', email: 'ana@festival.com' };
const mockAsistenteMenor: Asistente = { id: 19, nombre: 'David', documento: '1037600119', fecha_nacimiento: '2010-05-15', email: 'david@festival.com' };
const mockAsistenteLimite: Asistente = { id: 20, nombre: 'Laura', documento: '1037600120', fecha_nacimiento: '2008-11-19', email: 'laura@festival.com' };

const mockZonaCamping: Zona = { id: 1, nombre: 'Camping Norte', tipo: 'CAMPING', capacidad: 200 };
const mockZonaNoCamping: Zona = { id: 3, nombre: 'Parqueadero Principal', tipo: 'PARQUEADERO', capacidad: 500 };

describe('CreateCampingReservationUseCase (Unit Reglas)', () => {
    test('Regla 1: debe rechazar con 409 a asistentes menores de edad', async () => {
        const repo = createMockRepository({
            obtenerAsistentePorId: async () => mockAsistenteMenor,
            obtenerZonaPorId: async () => mockZonaCamping,
        });
        const useCase = new CreateCampingReservationUseCase(repo);
        await assert.rejects(
            async () => useCase.execute({ asistente_id: 19, zona_id: 1, fecha_entrada: '2026-11-20', fecha_salida: '2026-11-21', personas: 2 }),
            (err: any) => err instanceof BusinessRuleError
        );
    });

    test('Regla 1 (Frontera): asistente que cumple 18 el 19-Nov-2026 si puede acampar', async () => {
        const repo = createMockRepository({
            obtenerAsistentePorId: async () => mockAsistenteLimite,
            obtenerZonaPorId: async () => mockZonaCamping,
        });
        const useCase = new CreateCampingReservationUseCase(repo);
        const res = await useCase.execute({
            asistente_id: 20,
            zona_id: 1,
            fecha_entrada: '2026-11-20',
            fecha_salida: '2026-11-21',
            personas: 1,
        });
        assert.equal(res.asistente_id, 20);
    });

    test('Regla 2: debe rechazar con 409 si el asistente ya tiene una reserva activa', async () => {
        const repo = createMockRepository({
            obtenerAsistentePorId: async () => mockAsistenteAdulto,
            obtenerZonaPorId: async () => mockZonaCamping,
            tieneReservaActiva: async () => true,
        });
        const useCase = new CreateCampingReservationUseCase(repo);
        await assert.rejects(
            async () => useCase.execute({ asistente_id: 7, zona_id: 1, fecha_entrada: '2026-11-20', fecha_salida: '2026-11-21', personas: 2 }),
            (err: any) => err instanceof BusinessRuleError
        );
    });

    test('Regla 3: debe rechazar con 409 si la zona alcanzo aforo maximo', async () => {
        const repo = createMockRepository({
            obtenerAsistentePorId: async () => mockAsistenteAdulto,
            obtenerZonaPorId: async () => ({ ...mockZonaCamping, capacidad: 1 }),
            contarReservasActivasPorZona: async () => 1,
        });
        const useCase = new CreateCampingReservationUseCase(repo);
        await assert.rejects(
            async () => useCase.execute({ asistente_id: 7, zona_id: 1, fecha_entrada: '2026-11-20', fecha_salida: '2026-11-21', personas: 2 }),
            (err: any) => err instanceof BusinessRuleError
        );
    });

    test('Validacion (400): debe rechazar si la zona no es de tipo CAMPING', async () => {
        const repo = createMockRepository({
            obtenerAsistentePorId: async () => mockAsistenteAdulto,
            obtenerZonaPorId: async () => mockZonaNoCamping,
        });
        const useCase = new CreateCampingReservationUseCase(repo);
        await assert.rejects(
            async () => useCase.execute({ asistente_id: 7, zona_id: 3, fecha_entrada: '2026-11-20', fecha_salida: '2026-11-21', personas: 2 }),
            (err: any) => err instanceof ValidationError
        );
    });
});