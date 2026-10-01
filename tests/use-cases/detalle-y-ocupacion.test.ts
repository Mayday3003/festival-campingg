import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ObtenerReservaCampingUseCase } from '../../src/application/use-cases/ObtenerReservaCampingUseCase.js';
import { ObtenerOcupacionZonaUseCase } from '../../src/application/use-cases/ObtenerOcupacionZonaUseCase.js';
import { IReservaCampingRepository } from '../../src/domain/repositories/IReservaCampingRepository.js';
import { ValidationError, NotFoundError } from '../../src/application/errors/ApplicationErrors.js';
import { ReservaCamping, Zona } from '../../src/domain/entities/ReservaCamping.js';

function createMockRepository(
  overrides: Partial<IReservaCampingRepository> = {}
): IReservaCampingRepository {
  return {
    listar: async () => ({
      data: [],
      pagination: { total: 0, currentPage: 1, limit: 10, totalPages: 0 },
    }),
    obtenerPorId: async () => null,
    obtenerAsistentePorId: async () => null,
    obtenerZonaPorId: async () => null,
    contarReservasActivasPorZona: async () => 0,
    tieneReservaActiva: async () => false,
    crear: async () => ({}) as ReservaCamping,
    actualizar: async () => ({}) as ReservaCamping,
    borradoLogico: async () => true,
    ...overrides,
  };
}

describe('ObtenerReservaCampingUseCase', () => {
  test('debe retornar la reserva cuando existe y está activa', async () => {
    const mockReserva: ReservaCamping = {
      id: 1,
      asistente_id: 3,
      zona_id: 2,
      fecha_entrada: '2026-11-20',
      fecha_salida: '2026-11-22',
      personas: 2,
      state: 'ACTIVE',
    };

    const repo = createMockRepository({
      obtenerPorId: async (id: number) => (id === 1 ? mockReserva : null),
    });

    const useCase = new ObtenerReservaCampingUseCase(repo);
    const resultado = await useCase.ejecutar(1);

    assert.deepStrictEqual(resultado, mockReserva);
  });

  test('debe lanzar NotFoundError si la reserva no existe', async () => {
    const repo = createMockRepository({
      obtenerPorId: async () => null,
    });

    const useCase = new ObtenerReservaCampingUseCase(repo);

    await assert.rejects(
      async () => useCase.ejecutar(9999),
      (err: any) => {
        assert(err instanceof NotFoundError);
        assert.strictEqual(err.message, 'Reserva de camping no encontrada');
        return true;
      }
    );
  });

  test('debe lanzar NotFoundError si la reserva está eliminada lógicamente (state = REMOVED)', async () => {
    const mockReservaEliminada: ReservaCamping = {
      id: 2,
      asistente_id: 5,
      zona_id: 1,
      fecha_entrada: '2026-11-20',
      fecha_salida: '2026-11-22',
      personas: 2,
      state: 'REMOVED',
    };

    const repo = createMockRepository({
      obtenerPorId: async () => mockReservaEliminada,
    });

    const useCase = new ObtenerReservaCampingUseCase(repo);

    await assert.rejects(
      async () => useCase.ejecutar(2),
      (err: any) => {
        assert(err instanceof NotFoundError);
        assert.strictEqual(err.message, 'Reserva de camping no encontrada');
        return true;
      }
    );
  });

  test('debe lanzar ValidationError cuando el id no es un entero positivo', async () => {
    const repo = createMockRepository();
    const useCase = new ObtenerReservaCampingUseCase(repo);

    const invalidIds: any[] = [0, -1, 1.5, 'abc', null, undefined, NaN];

    for (const invalidId of invalidIds) {
      await assert.rejects(
        async () => useCase.ejecutar(invalidId),
        (err: any) => {
          assert(err instanceof ValidationError);
          assert.strictEqual(err.message, 'El id debe ser un número entero positivo');
          return true;
        }
      );
    }
  });
});

describe('ObtenerOcupacionZonaUseCase', () => {
  const campingZona: Zona = {
    id: 1,
    nombre: 'Camping Norte',
    tipo: 'CAMPING',
    capacidad: 200,
  };

  test('debe retornar ocupación correcta para zona con cupos disponibles', async () => {
    const repo = createMockRepository({
      obtenerZonaPorId: async () => campingZona,
      contarReservasActivasPorZona: async () => 50,
    });

    const useCase = new ObtenerOcupacionZonaUseCase(repo);
    const resultado = await useCase.ejecutar(1);

    assert.deepStrictEqual(resultado, {
      zona_id: 1,
      capacidad: 200,
      ocupadas: 50,
      disponibles: 150,
    });
  });

  test('debe retornar disponibles = 0 cuando la zona está llena', async () => {
    const zonaVip: Zona = {
      id: 2,
      nombre: 'Camping VIP',
      tipo: 'CAMPING',
      capacidad: 2,
    };

    const repo = createMockRepository({
      obtenerZonaPorId: async () => zonaVip,
      contarReservasActivasPorZona: async () => 2,
    });

    const useCase = new ObtenerOcupacionZonaUseCase(repo);
    const resultado = await useCase.ejecutar(2);

    assert.deepStrictEqual(resultado, {
      zona_id: 2,
      capacidad: 2,
      ocupadas: 2,
      disponibles: 0,
    });
  });

  test('debe retornar disponibles = capacidad cuando la zona no tiene reservas', async () => {
    const repo = createMockRepository({
      obtenerZonaPorId: async () => campingZona,
      contarReservasActivasPorZona: async () => 0,
    });

    const useCase = new ObtenerOcupacionZonaUseCase(repo);
    const resultado = await useCase.ejecutar(1);

    assert.deepStrictEqual(resultado, {
      zona_id: 1,
      capacidad: 200,
      ocupadas: 0,
      disponibles: 200,
    });
  });

  test('debe lanzar NotFoundError cuando la zona no existe', async () => {
    const repo = createMockRepository({
      obtenerZonaPorId: async () => null,
    });

    const useCase = new ObtenerOcupacionZonaUseCase(repo);

    await assert.rejects(
      async () => useCase.ejecutar(999),
      (err: any) => {
        assert(err instanceof NotFoundError);
        assert.strictEqual(err.message, 'Zona no encontrada');
        return true;
      }
    );
  });

  test('debe lanzar ValidationError cuando la zona no es de tipo CAMPING', async () => {
    const zonaParqueadero: Zona = {
      id: 3,
      nombre: 'Parqueadero Principal',
      tipo: 'PARQUEADERO',
      capacidad: 500,
    };

    const repo = createMockRepository({
      obtenerZonaPorId: async () => zonaParqueadero,
    });

    const useCase = new ObtenerOcupacionZonaUseCase(repo);

    await assert.rejects(
      async () => useCase.ejecutar(3),
      (err: any) => {
        assert(err instanceof ValidationError);
        assert.strictEqual(err.message, 'La zona no es de tipo CAMPING');
        return true;
      }
    );
  });

  test('debe lanzar ValidationError cuando zonaId no es un entero positivo', async () => {
    const repo = createMockRepository();
    const useCase = new ObtenerOcupacionZonaUseCase(repo);

    const invalidIds: any[] = [0, -5, 2.5, 'abc', null, undefined];

    for (const invalidId of invalidIds) {
      await assert.rejects(
        async () => useCase.ejecutar(invalidId),
        (err: any) => {
          assert(err instanceof ValidationError);
          assert.strictEqual(err.message, 'El id de la zona debe ser un número entero positivo');
          return true;
        }
      );
    }
  });
});
