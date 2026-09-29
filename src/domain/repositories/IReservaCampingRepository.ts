import { ReservaCamping, Asistente, Zona } from '../entities/ReservaCamping.js';

export interface FiltrosListado {
  page: number;
  limit: number;
  zona_id?: number;
  asistente_id?: number;
}

export interface ResultadoPaginado<T> {
  data: T[];
  pagination: {
    total: number;
    currentPage: number;
    limit: number;
    totalPages: number;
  };
}

export interface IReservaCampingRepository {
  listar(filtros: FiltrosListado): Promise<ResultadoPaginado<ReservaCamping>>;
  obtenerPorId(id: number): Promise<ReservaCamping | null>;
  obtenerAsistentePorId(asistenteId: number): Promise<Asistente | null>;
  obtenerZonaPorId(zonaId: number): Promise<Zona | null>;
  contarReservasActivasPorZona(zonaId: number): Promise<number>;
  tieneReservaActiva(asistenteId: number, excluirReservaId?: number): Promise<boolean>;
  crear(datos: {
    asistente_id: number;
    zona_id: number;
    fecha_entrada: string;
    fecha_salida: string;
    personas: number;
  }): Promise<ReservaCamping>;
  actualizar(id: number, datos: Partial<{
    zona_id: number;
    fecha_entrada: string;
    fecha_salida: string;
    personas: number;
  }>): Promise<ReservaCamping>;
  borradoLogico(id: number): Promise<boolean>;
}
