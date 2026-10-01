import { IReservaCampingRepository } from '../../domain/repositories/IReservaCampingRepository.js';
import { ReservaCamping } from '../../domain/entities/ReservaCamping.js';
import { NotFoundError } from '../errors/ApplicationErrors.js';

export class GetCampingReservationUseCase {
  constructor(private readonly repository: IReservaCampingRepository) {}

  async execute(id: number): Promise<ReservaCamping> {
    const reservation = await this.repository.obtenerPorId(id);
    if (!reservation || reservation.state === 'REMOVED') {
      throw new NotFoundError('Camping reservation not found');
    }
    return reservation;
  }
}
