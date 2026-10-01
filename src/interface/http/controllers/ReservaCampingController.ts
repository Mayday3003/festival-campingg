import { Request, Response } from 'express';
import { ListarReservasCampingUseCase } from '../../../application/use-cases/ListarReservasCampingUseCase.js';
import { ActualizarReservaCampingUseCase } from '../../../application/use-cases/ActualizarReservaCampingUseCase.js';
import { EliminarReservaCampingUseCase } from '../../../application/use-cases/EliminarReservaCampingUseCase.js';
import { CreateCampingReservationUseCase } from '../../../application/use-cases/CreateCampingReservationUseCase.js';
import { GetCampingReservationUseCase } from '../../../application/use-cases/GetCampingReservationUseCase.js';
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} from '../../../application/errors/ApplicationErrors.js';

export class ReservaCampingController {
  constructor(
    private listarUseCase: ListarReservasCampingUseCase,
    private actualizarUseCase: ActualizarReservaCampingUseCase,
    private eliminarUseCase: EliminarReservaCampingUseCase,
    private getUseCase: GetCampingReservationUseCase,
    private createUseCase: CreateCampingReservationUseCase
  ) {}

  private parsePositiveInt(value: unknown, name: string): number {
    const str = String(value ?? '');
    if (!/^\d+$/.test(str) || parseInt(str, 10) <= 0) {
      throw new ValidationError(`${name} must be a positive integer`);
    }
    return parseInt(str, 10);
  }

  private manejarError(err: any, res: Response) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof BusinessRuleError) {
      return res.status(409).json({ error: err.message });
    }
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Error interno del servidor' });
  }

  listar = async (req: Request, res: Response) => {
    try {
      const pageQuery = req.query.page;
      const limitQuery = req.query.limit;
      const zonaIdQuery = req.query.zona_id;
      const asistenteIdQuery = req.query.asistente_id;

      let page = 1;
      let limit = 10;

      if (pageQuery !== undefined) {
        const pageStr = String(pageQuery);
        if (!/^\d+$/.test(pageStr) || parseInt(pageStr, 10) <= 0) {
          return res.status(400).json({ error: 'page debe ser un entero positivo' });
        }
        page = parseInt(pageStr, 10);
      }

      if (limitQuery !== undefined) {
        const limitStr = String(limitQuery);
        if (!/^\d+$/.test(limitStr) || parseInt(limitStr, 10) <= 0) {
          return res.status(400).json({ error: 'limit debe ser un entero positivo' });
        }
        limit = parseInt(limitStr, 10);
        if (limit > 50) {
          return res.status(400).json({ error: 'limit no puede ser mayor a 50' });
        }
      }

      let zona_id: number | undefined = undefined;
      if (zonaIdQuery !== undefined) {
        const zonaIdStr = String(zonaIdQuery);
        if (!/^\d+$/.test(zonaIdStr) || parseInt(zonaIdStr, 10) <= 0) {
          return res.status(400).json({ error: 'zona_id debe ser un número entero positivo' });
        }
        zona_id = parseInt(zonaIdStr, 10);
      }

      let asistente_id: number | undefined = undefined;
      if (asistenteIdQuery !== undefined) {
        const asistenteIdStr = String(asistenteIdQuery);
        if (!/^\d+$/.test(asistenteIdStr) || parseInt(asistenteIdStr, 10) <= 0) {
          return res.status(400).json({ error: 'asistente_id debe ser un número entero positivo' });
        }
        asistente_id = parseInt(asistenteIdStr, 10);
      }

      const resultado = await this.listarUseCase.ejecutar({
        page,
        limit,
        zona_id,
        asistente_id,
      });

      return res.status(200).json(resultado);
    } catch (err: any) {
      return this.manejarError(err, res);
    }
  };

  obtenerPorId = async (req: Request, res: Response) => {
    try {
      const id = this.parsePositiveInt(req.params.id, 'id');
      const reservation = await this.getUseCase.execute(id);
      return res.status(200).json({ data: reservation });
    } catch (err: any) {
      return this.manejarError(err, res);
    }
  };

  crear = async (req: Request, res: Response) => {
    try {
      const created = await this.createUseCase.execute(req.body);
      return res.status(201).json({ data: created });
    } catch (err: any) {
      return this.manejarError(err, res);
    }
  };

  actualizar = async (req: Request, res: Response) => {
    try {
      const idStr = String(req.params.id ?? '');
      if (!/^\d+$/.test(idStr) || parseInt(idStr, 10) <= 0) {
        return res.status(400).json({ error: 'El id debe ser un número entero positivo' });
      }

      const id = parseInt(idStr, 10);
      if (!this.actualizarUseCase) {
        return res.status(500).json({ error: 'Caso de uso de actualización no configurado' });
      }

      const resultado = await this.actualizarUseCase.ejecutar(id, req.body);
      return res.status(200).json({ data: resultado });
    } catch (err: any) {
      return this.manejarError(err, res);
    }
  };

  eliminar = async (req: Request, res: Response) => {
    try {
      const idStr = String(req.params.id ?? '');
      if (!/^\d+$/.test(idStr) || parseInt(idStr, 10) <= 0) {
        return res.status(400).json({ error: 'El id debe ser un número entero positivo' });
      }

      const id = parseInt(idStr, 10);
      if (!this.eliminarUseCase) {
        return res.status(500).json({ error: 'Caso de uso de eliminación no configurado' });
      }

      const resultado = await this.eliminarUseCase.ejecutar(id);
      return res.status(200).json(resultado);
    } catch (err: any) {
      return this.manejarError(err, res);
    }
  };
}
