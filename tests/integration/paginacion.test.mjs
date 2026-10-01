import { pruebasListado } from '../../pruebas/lib.mjs';

const R = '/api/reservas-camping';

export default [
  ...pruebasListado(R, { publicas: false }),
  {
    nombre: 'Empty filtered list has totalPages = 0',
    prueba: async ({ api, espera }) => {
      const b = espera.lista(await api.get(`${R}?asistente_id=999999`));
      espera.igual(b.pagination.totalPages, 0, 'totalPages');
    },
  },
  {
    nombre: '?zona_id=abc responds 400',
    prueba: async ({ api, espera }) => espera.error(await api.get(`${R}?zona_id=abc`), 400),
  },
];
