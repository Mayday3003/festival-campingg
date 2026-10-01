import { IReservaCampingRepository } from '../../domain/repositories/IReservaCampingRepository.js';
import { OcupacionZona } from '../../domain/entities/ReservaCamping.js';
import { NotFoundError, ValidationError } from '../errors/ApplicationErrors.js';

export class GetZoneOccupancyUseCase {
  constructor(private readonly repository: IReservaCampingRepository) {}

  async execute(zoneId: number): Promise<OcupacionZona> {
    const zone = await this.repository.obtenerZonaPorId(zoneId);
    if (!zone) {
      throw new NotFoundError(`Zone ${zoneId} not found`);
    }
    if (zone.tipo !== 'CAMPING') {
      throw new ValidationError(`Zone ${zoneId} is not a CAMPING zone`);
    }
    const occupied = await this.repository.contarReservasActivasPorZona(zoneId);
    return {
      zona_id: zoneId,
      capacidad: zone.capacidad,
      ocupadas: occupied,
      disponibles: Math.max(0, zone.capacidad - occupied),
    };
  }
}
