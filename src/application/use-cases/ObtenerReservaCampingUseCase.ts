import { IReservaCampingRepository } from '../../domain/repositories/IReservaCampingRepository.js';
import { ReservaCamping } from '../../domain/entities/ReservaCamping.js';
import { NotFoundError, ValidationError } from '../errors/ApplicationErrors.js';

export class ObtenerReservaCampingUseCase {
  constructor(private readonly repository: IReservaCampingRepository) {}

  async ejecutar(id: number): Promise<ReservaCamping> {
    // Validate positive integer ID
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw new ValidationError('El id debe ser un número entero positivo');
    }

    // Retrieve reservation from repository
    const reserva = await this.repository.obtenerPorId(id);

    // If reservation does not exist or has been soft-deleted, throw 404
    if (!reserva || reserva.state === 'REMOVED') {
      throw new NotFoundError('Reserva de camping no encontrada');
    }

    return reserva;
  }
}
