import { Router } from 'express';
import { PrismaReservaCampingRepository } from '../../../infrastructure/database/PrismaReservaCampingRepository.js';
import { ListarReservasCampingUseCase } from '../../../application/use-cases/ListarReservasCampingUseCase.js';
import { ActualizarReservaCampingUseCase } from '../../../application/use-cases/ActualizarReservaCampingUseCase.js';
import { EliminarReservaCampingUseCase } from '../../../application/use-cases/EliminarReservaCampingUseCase.js';
import { ReservaCampingController } from '../controllers/ReservaCampingController.js';

const router = Router();

const repository = new PrismaReservaCampingRepository();
const listarUseCase = new ListarReservasCampingUseCase(repository);
const actualizarUseCase = new ActualizarReservaCampingUseCase(repository);
const eliminarUseCase = new EliminarReservaCampingUseCase(repository);
const controller = new ReservaCampingController(listarUseCase, actualizarUseCase, eliminarUseCase);

// Hito 1: Listado paginado con filtros
router.get('/', controller.listar);

// Integrante 4: Edición y borrado lógico
router.patch('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);

export default router;
