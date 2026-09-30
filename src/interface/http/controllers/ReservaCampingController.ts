import { Request, Response } from 'express';
import { ListarReservasCampingUseCase } from '../../../application/use-cases/ListarReservasCampingUseCase.js';

export class ReservaCampingController {
  constructor(
    private listarUseCase: ListarReservasCampingUseCase
  ) {}

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
      const status = err.status || 500;
      return res.status(status).json({ error: err.message || 'Error interno del servidor' });
    }
  };
}
