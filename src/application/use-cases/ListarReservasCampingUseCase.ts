import {
  IReservaCampingRepository,
  FiltrosListado,
  ResultadoPaginado,
} from '../../domain/repositories/IReservaCampingRepository.js';
import { ReservaCamping } from '../../domain/entities/ReservaCamping.js';

export class ListarReservasCampingUseCase {
  constructor(private repository: IReservaCampingRepository) {}

  async ejecutar(filtros: FiltrosListado): Promise<ResultadoPaginado<ReservaCamping>> {
    return await this.repository.listar(filtros);
  }
}
