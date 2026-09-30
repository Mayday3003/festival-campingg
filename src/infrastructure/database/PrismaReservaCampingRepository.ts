import { prisma } from './prisma.js';
import { IReservaCampingRepository, FiltrosListado, ResultadoPaginado, DatosActualizarReserva } from '../../domain/repositories/IReservaCampingRepository.js';
import { ReservaCamping, Asistente, Zona } from '../../domain/entities/ReservaCamping.js';

function formatearFecha(date: Date): string {
  const anio = date.getUTCFullYear();
  const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(date.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function mapearReserva(r: any): ReservaCamping {
  return {
    id: r.id,
    asistente_id: r.asistente_id,
    zona_id: r.zona_id,
    fecha_entrada: formatearFecha(r.fecha_entrada),
    fecha_salida: formatearFecha(r.fecha_salida),
    personas: r.personas,
    state: r.state,
  };
}

export class PrismaReservaCampingRepository implements IReservaCampingRepository {
  async listar(filtros: FiltrosListado): Promise<ResultadoPaginado<ReservaCamping>> {
    const where: any = {
      state: 'ACTIVE',
    };

    if (filtros.zona_id !== undefined) {
      where.zona_id = filtros.zona_id;
    }
    if (filtros.asistente_id !== undefined) {
      where.asistente_id = filtros.asistente_id;
    }

    const total = await prisma.reservas_camping.count({ where });
    const skip = (filtros.page - 1) * filtros.limit;

    const registros = await prisma.reservas_camping.findMany({
      where,
      orderBy: { id: 'asc' },
      skip,
      take: filtros.limit,
    });

    return {
      data: registros.map(mapearReserva),
      pagination: {
        total,
        currentPage: filtros.page,
        limit: filtros.limit,
        totalPages: Math.ceil(total / filtros.limit) || 1,
      },
    };
  }

  async obtenerPorId(id: number): Promise<ReservaCamping | null> {
    const r = await prisma.reservas_camping.findUnique({
      where: { id },
    });
    if (!r) return null;
    return mapearReserva(r);
  }

  async obtenerAsistentePorId(asistenteId: number): Promise<Asistente | null> {
    const a = await prisma.asistentes.findUnique({
      where: { id: asistenteId },
    });
    if (!a) return null;
    return {
      id: a.id,
      nombre: a.nombre,
      documento: a.documento,
      fecha_nacimiento: formatearFecha(a.fecha_nacimiento),
      email: a.email,
    };
  }

  async obtenerZonaPorId(zonaId: number): Promise<Zona | null> {
    const z = await prisma.zonas.findUnique({
      where: { id: zonaId },
    });
    if (!z) return null;
    return {
      id: z.id,
      nombre: z.nombre,
      tipo: z.tipo,
      capacidad: z.capacidad,
    };
  }

  async contarReservasActivasPorZona(zonaId: number): Promise<number> {
    return await prisma.reservas_camping.count({
      where: {
        zona_id: zonaId,
        state: 'ACTIVE',
      },
    });
  }

  async tieneReservaActiva(asistenteId: number, excluirReservaId?: number): Promise<boolean> {
    const where: any = {
      asistente_id: asistenteId,
      state: 'ACTIVE',
    };
    if (excluirReservaId !== undefined) {
      where.id = { not: excluirReservaId };
    }
    const count = await prisma.reservas_camping.count({ where });
    return count > 0;
  }

  async crear(datos: {
    asistente_id: number;
    zona_id: number;
    fecha_entrada: string;
    fecha_salida: string;
    personas: number;
  }): Promise<ReservaCamping> {
    const creada = await prisma.reservas_camping.create({
      data: {
        asistente_id: datos.asistente_id,
        zona_id: datos.zona_id,
        fecha_entrada: new Date(`${datos.fecha_entrada}T00:00:00Z`),
        fecha_salida: new Date(`${datos.fecha_salida}T00:00:00Z`),
        personas: datos.personas,
        state: 'ACTIVE',
      },
    });
    return mapearReserva(creada);
  }

  async actualizar(id: number, datos: DatosActualizarReserva): Promise<ReservaCamping> {
    const dataUpdate: any = {};
    if (datos.zona_id !== undefined) dataUpdate.zona_id = datos.zona_id;
    if (datos.fecha_entrada !== undefined) {
      dataUpdate.fecha_entrada = new Date(`${datos.fecha_entrada}T00:00:00Z`);
    }
    if (datos.fecha_salida !== undefined) {
      dataUpdate.fecha_salida = new Date(`${datos.fecha_salida}T00:00:00Z`);
    }
    if (datos.personas !== undefined) dataUpdate.personas = datos.personas;
    dataUpdate.updated_at = new Date();

    const actualizada = await prisma.reservas_camping.update({
      where: { id },
      data: dataUpdate,
    });
    return mapearReserva(actualizada);
  }

  async borradoLogico(id: number): Promise<boolean> {
    await prisma.reservas_camping.update({
      where: { id },
      data: {
        state: 'REMOVED',
        updated_at: new Date(),
      },
    });
    return true;
  }
}
