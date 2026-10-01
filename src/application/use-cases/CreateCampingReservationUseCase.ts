import { IReservaCampingRepository } from '../../domain/repositories/IReservaCampingRepository.js';
import { ReservaCamping } from '../../domain/entities/ReservaCamping.js';
import { ValidationError } from '../errors/ApplicationErrors.js';

const MIN_DATE = '2026-11-19';
const MAX_DATE = '2026-11-23';
const REQUIRED_FIELDS = ['asistente_id', 'zona_id', 'fecha_entrada', 'fecha_salida', 'personas'];

const isPositiveInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export class CreateCampingReservationUseCase {
  constructor(private readonly repository: IReservaCampingRepository) {}

  async execute(body: any): Promise<ReservaCamping> {
    // 1. 400: missing fields, types, formats and ranges
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ValidationError('Request body must be a JSON object');
    }
    const missing = REQUIRED_FIELDS.filter((f) => body[f] === undefined || body[f] === null);
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }
    const { asistente_id, zona_id, fecha_entrada, fecha_salida, personas } = body;

    if (!isPositiveInt(asistente_id)) {
      throw new ValidationError('asistente_id must be a positive integer');
    }
    if (!isPositiveInt(zona_id)) {
      throw new ValidationError('zona_id must be a positive integer');
    }
    if (!isDate(fecha_entrada) || !isDate(fecha_salida)) {
      throw new ValidationError('fecha_entrada and fecha_salida must use the YYYY-MM-DD format');
    }
    // Every date in the allowed window is a real calendar date, so a string compare is enough
    for (const date of [fecha_entrada, fecha_salida]) {
      if (date < MIN_DATE || date > MAX_DATE) {
        throw new ValidationError(`Dates must be between ${MIN_DATE} and ${MAX_DATE}`);
      }
    }
    if (fecha_salida <= fecha_entrada) {
      throw new ValidationError('fecha_salida must be after fecha_entrada');
    }
    if (!Number.isInteger(personas) || personas < 1 || personas > 6) {
      throw new ValidationError('personas must be an integer between 1 and 6');
    }

    // Server-side fields (id, state) are ignored if the client sends them
    return await this.repository.crear({
      asistente_id,
      zona_id,
      fecha_entrada,
      fecha_salida,
      personas,
    });
  }
}
