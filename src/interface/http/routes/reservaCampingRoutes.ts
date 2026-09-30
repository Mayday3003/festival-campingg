import { Router } from 'express';
import { PrismaReservaCampingRepository } from '../../../infrastructure/database/PrismaReservaCampingRepository.js';
import { ListarReservasCampingUseCase } from '../../../application/use-cases/ListarReservasCampingUseCase.js';
import { ReservaCampingController } from '../controllers/ReservaCampingController.js';

const router = Router();

const repository = new PrismaReservaCampingRepository();
const listarUseCase = new ListarReservasCampingUseCase(repository);
const controller = new ReservaCampingController(listarUseCase);

// Hito 1: Listado paginado con filtros
router.get('/', controller.listar);

export default router;
