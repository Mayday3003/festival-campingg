import { IReservaCampingRepository } from '../../domain/repositories/IReservaCampingRepository.js';
import { OcupacionZona } from '../../domain/entities/ReservaCamping.js';
import { NotFoundError, ValidationError } from '../errors/ApplicationErrors.js';

export class ObtenerOcupacionZonaUseCase {
  constructor(private readonly repository: IReservaCampingRepository) {}

  async ejecutar(zonaId: number): Promise<OcupacionZona> {
    // 1. Validate that zonaId is a positive integer
    if (typeof zonaId !== 'number' || !Number.isInteger(zonaId) || zonaId <= 0) {
      throw new ValidationError('El id de la zona debe ser un número entero positivo');
    }

    // 2. Retrieve zone from repository
    const zona = await this.repository.obtenerZonaPorId(zonaId);
    if (!zona) {
      throw new NotFoundError('Zona no encontrada');
    }

    // 3. Verify that the zone is of type CAMPING
    if (zona.tipo !== 'CAMPING') {
      throw new ValidationError('La zona no es de tipo CAMPING');
    }

    // 4. Count active reservations in the zone
    const ocupadas = await this.repository.contarReservasActivasPorZona(zonaId);

    // 5. Calculate available spots (non-negative)
    const disponibles = Math.max(0, zona.capacidad - ocupadas);

    // 6. Return zone occupancy data
    return {
      zona_id: zona.id,
      capacidad: zona.capacidad,
      ocupadas,
      disponibles,
    };
  }
}
