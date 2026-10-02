import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ActualizarReservaCampingUseCase } from '../../src/application/use-cases/ActualizarReservaCampingUseCase.js';
import { EliminarReservaCampingUseCase } from '../../src/application/use-cases/EliminarReservaCampingUseCase.js';
import { IReservaCampingRepository } from '../../src/domain/repositories/IReservaCampingRepository.js';
import { ValidationError, NotFoundError } from '../../src/application/errors/ApplicationErrors.js';
import { ReservaCamping } from '../../src/domain/entities/ReservaCamping.js';

function createMockRepository(overrides: Partial<IReservaCampingRepository> = {}): IReservaCampingRepository {
    return {
        listar: async () => ({ data: [], pagination: { total: 0, currentPage: 1, limit: 10, totalPages: 0 } }),
        obtenerPorId: async () => null,
        obtenerAsistentePorId: async () => null,
        obtenerZonaPorId: async () => null,
        contarReservasActivasPorZona: async () => 0,
        tieneReservaActiva: async () => false,
        crear: async () => ({} as ReservaCamping),
        actualizar: async (id, datos) => ({ id, ...datos } as ReservaCamping),
        borradoLogico: async () => true,
        ...overrides,
    };
}

const mockReserva: ReservaCamping = {
    id: 1,
    asistente_id: 5,
    zona_id: 1,
    fecha_entrada: '2026-11-20',
    fecha_salida: '2026-11-22',
    personas: 2,
    state: 'ACTIVE',
};

describe('ActualizarReservaCampingUseCase (Unit)', () => {
    test('debe retornar 404 si la reserva no existe independientemente del cuerpo', async () => {
        const repo = createMockRepository({ obtenerPorId: async () => null });
        const useCase = new ActualizarReservaCampingUseCase(repo);
        await assert.rejects(async () => useCase.ejecutar(999999, {}), (err: any) => err instanceof NotFoundError);
    });

    test('debe retornar 404 si la reserva tiene estado REMOVED', async () => {
        const repo = createMockRepository({ obtenerPorId: async () => ({ ...mockReserva, state: 'REMOVED' }) });
        const useCase = new ActualizarReservaCampingUseCase(repo);
        await assert.rejects(async () => useCase.ejecutar(1, { personas: 3 }), (err: any) => err instanceof NotFoundError);
    });

    test('debe lanzar ValidationError al enviar campos no editables', async () => {
        const repo = createMockRepository({ obtenerPorId: async () => mockReserva });
        const useCase = new ActualizarReservaCampingUseCase(repo);
        await assert.rejects(async () => useCase.ejecutar(1, { asistente_id: 9 }), (err: any) => err instanceof ValidationError);
    });
});

describe('EliminarReservaCampingUseCase (Unit)', () => {
    test('debe realizar borrado logico sobre un registro activo', async () => {
        let llamado = false;
        const repo = createMockRepository({
            obtenerPorId: async () => mockReserva,
            borradoLogico: async () => { llamado = true; return true; },
        });
        const useCase = new EliminarReservaCampingUseCase(repo);
        const ok = await useCase.ejecutar(1);
        assert.deepStrictEqual(ok, { message: 'Reserva de camping eliminada exitosamente' });
        assert.equal(llamado, true);
    });

    test('debe fallar con 404 si el registro ya fue eliminado previamente', async () => {
        const repo = createMockRepository({ obtenerPorId: async () => ({ ...mockReserva, state: 'REMOVED' }) });
        const useCase = new EliminarReservaCampingUseCase(repo);
        await assert.rejects(async () => useCase.ejecutar(1), (err: any) => err instanceof NotFoundError);
    });
});
