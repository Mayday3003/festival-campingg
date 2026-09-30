import {
  IReservaCampingRepository,
  DatosActualizarReserva,
} from '../../domain/repositories/IReservaCampingRepository.js';
import { ReservaCamping } from '../../domain/entities/ReservaCamping.js';
import { ValidationError, NotFoundError, BusinessRuleError } from '../errors/ApplicationErrors.js';

const CAMPOS_PERMITIDOS = ['zona_id', 'fecha_entrada', 'fecha_salida', 'personas'];
const FECHA_MIN = '2026-11-19';
const FECHA_MAX = '2026-11-23';
const FECHA_CORTE_MAYORIA_EDAD = '2008-11-19'; // 18 años cumplidos al 19 de noviembre de 2026

function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !isNaN(d.getTime());
}

export class ActualizarReservaCampingUseCase {
  constructor(private readonly repository: IReservaCampingRepository) {}

  async ejecutar(id: number, payload: any): Promise<ReservaCamping> {
    // 1. Validaciones sintácticas y de campos permitidos
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ValidationError('El cuerpo de la petición debe ser un objeto JSON válido');
    }

    const claves = Object.keys(payload);
    if (claves.length === 0) {
      throw new ValidationError('Debe enviar al menos un campo para actualizar');
    }

    const camposNoPermitidos = claves.filter((k) => !CAMPOS_PERMITIDOS.includes(k));
    if (camposNoPermitidos.length > 0) {
      throw new ValidationError(
        `Campos no permitidos para edición: ${camposNoPermitidos.join(', ')}`
      );
    }

    if (payload.personas !== undefined) {
      if (
        typeof payload.personas !== 'number' ||
        !Number.isInteger(payload.personas) ||
        payload.personas < 1 ||
        payload.personas > 6
      ) {
        throw new ValidationError('personas debe ser un entero entre 1 y 6');
      }
    }

    if (payload.zona_id !== undefined) {
      if (
        typeof payload.zona_id !== 'number' ||
        !Number.isInteger(payload.zona_id) ||
        payload.zona_id <= 0
      ) {
        throw new ValidationError('zona_id debe ser un entero positivo');
      }
    }

    if (payload.fecha_entrada !== undefined) {
      if (typeof payload.fecha_entrada !== 'string' || !esFechaValida(payload.fecha_entrada)) {
        throw new ValidationError('fecha_entrada debe tener el formato YYYY-MM-DD');
      }
      if (payload.fecha_entrada < FECHA_MIN || payload.fecha_entrada > FECHA_MAX) {
        throw new ValidationError(`fecha_entrada debe estar entre ${FECHA_MIN} y ${FECHA_MAX}`);
      }
    }

    if (payload.fecha_salida !== undefined) {
      if (typeof payload.fecha_salida !== 'string' || !esFechaValida(payload.fecha_salida)) {
        throw new ValidationError('fecha_salida debe tener el formato YYYY-MM-DD');
      }
      if (payload.fecha_salida < FECHA_MIN || payload.fecha_salida > FECHA_MAX) {
        throw new ValidationError(`fecha_salida debe estar entre ${FECHA_MIN} y ${FECHA_MAX}`);
      }
    }

    // 2. Existencia de la reserva
    const reservaActual = await this.repository.obtenerPorId(id);
    if (!reservaActual || reservaActual.state === 'REMOVED') {
      throw new NotFoundError('Reserva de camping no encontrada');
    }

    // Coherencia de fechas combinando valores nuevos con existentes
    const fechaEntradaFinal = payload.fecha_entrada ?? reservaActual.fecha_entrada;
    const fechaSalidaFinal = payload.fecha_salida ?? reservaActual.fecha_salida;
    if (fechaSalidaFinal <= fechaEntradaFinal) {
      throw new ValidationError('fecha_salida debe ser posterior a fecha_entrada');
    }

    // Existencia y tipo de la zona (si se actualiza)
    let zonaDestino = null;
    if (payload.zona_id !== undefined) {
      zonaDestino = await this.repository.obtenerZonaPorId(payload.zona_id);
      if (!zonaDestino) {
        throw new NotFoundError('Zona no encontrada');
      }
      if (zonaDestino.tipo !== 'CAMPING') {
        throw new ValidationError('La zona especificada no es de tipo CAMPING');
      }
    }

    // 3. Reglas de negocio
    // Regla 1: Asistente debe ser mayor de edad
    const asistente = await this.repository.obtenerAsistentePorId(reservaActual.asistente_id);
    if (!asistente) {
      throw new NotFoundError('Asistente titular de la reserva no encontrado');
    }
    if (asistente.fecha_nacimiento > FECHA_CORTE_MAYORIA_EDAD) {
      throw new BusinessRuleError(
        'Solo acampan mayores de edad cumplidos al 19 de noviembre de 2026'
      );
    }

    // Regla 2: Un asistente tiene máximo una reserva activa
    const tieneOtra = await this.repository.tieneReservaActiva(reservaActual.asistente_id, id);
    if (tieneOtra) {
      throw new BusinessRuleError('El asistente ya cuenta con otra reserva activa de camping');
    }

    // Regla 3: Capacidad de la zona
    if (payload.zona_id !== undefined && payload.zona_id !== reservaActual.zona_id && zonaDestino) {
      const reservasActivas = await this.repository.contarReservasActivasPorZona(payload.zona_id);
      if (reservasActivas >= zonaDestino.capacidad) {
        throw new BusinessRuleError('La zona de camping ha alcanzado su capacidad máxima');
      }
    }

    // 4. Persistir cambios
    const datosActualizacion: DatosActualizarReserva = {};
    if (payload.zona_id !== undefined) datosActualizacion.zona_id = payload.zona_id;
    if (payload.fecha_entrada !== undefined)
      datosActualizacion.fecha_entrada = payload.fecha_entrada;
    if (payload.fecha_salida !== undefined) datosActualizacion.fecha_salida = payload.fecha_salida;
    if (payload.personas !== undefined) datosActualizacion.personas = payload.personas;

    return await this.repository.actualizar(id, datosActualizacion);
  }
}
