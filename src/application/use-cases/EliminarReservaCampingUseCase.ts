import { IReservaCampingRepository } from '../../domain/repositories/IReservaCampingRepository.js';
import { NotFoundError, ValidationError } from '../errors/ApplicationErrors.js';

export class EliminarReservaCampingUseCase {
  constructor(private readonly repository: IReservaCampingRepository) {}

  async ejecutar(id: number): Promise<{ message: string }> {
    // 1. Validar que el id sea un entero positivo
    if (!id || typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw new ValidationError('El id debe ser un número entero positivo');
    }

    // 2. Verificar existencia y estado (si no existe o ya está REMOVED -> 404)
    const reserva = await this.repository.obtenerPorId(id);
    if (!reserva || reserva.state === 'REMOVED') {
      throw new NotFoundError('Reserva de camping no encontrada');
    }

    // 3. Realizar el borrado lógico (actualiza state a 'REMOVED' y updated_at)
    await this.repository.borradoLogico(id);

    return { message: 'Reserva de camping eliminada exitosamente' };
  }
}
