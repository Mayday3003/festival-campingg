// Extended edge cases for the camping contract, in the same format as the kit tests.
// Run with the API up: npm run test:suite
import { pruebasListado } from '../pruebas/lib.mjs';
const R = '/api/reservas-camping';
const ok = { asistente_id: 20, zona_id: 1, fecha_entrada: '2026-11-20', fecha_salida: '2026-11-21', personas: 1 };
const post = (api, extra) => api.post(R, { ...ok, ...extra });

export default [
  ...pruebasListado(R, { publicas: false }),
  { nombre: 'Empty filtered list has totalPages = 0', prueba: async ({ api, espera }) => {
    const b = espera.lista(await api.get(`${R}?asistente_id=999999`));
    espera.igual(b.pagination.totalPages, 0, 'totalPages');
  } },
  { nombre: '?zona_id=abc responds 400', prueba: async ({ api, espera }) => espera.error(await api.get(`${R}?zona_id=abc`), 400) },
  { nombre: 'POST with no body responds 400', prueba: async ({ api, espera }) => espera.error(await api.post(R), 400) },
  { nombre: 'POST with string id responds 400', prueba: async ({ api, espera }) => espera.error(await post(api, { asistente_id: '20' }), 400) },
  { nombre: 'POST with bad date format responds 400', prueba: async ({ api, espera }) => espera.error(await post(api, { fecha_entrada: '20-11-2026' }), 400) },
  { nombre: 'POST with date outside the window responds 400', prueba: async ({ api, espera }) => espera.error(await post(api, { fecha_salida: '2026-11-24' }), 400) },
  { nombre: 'POST with equal dates responds 400', prueba: async ({ api, espera }) => espera.error(await post(api, { fecha_salida: '2026-11-20' }), 400) },
  { nombre: 'POST with personas = 7 responds 400', prueba: async ({ api, espera }) => espera.error(await post(api, { personas: 7 }), 400) },
  { nombre: 'POST with personas = 0 responds 400', prueba: async ({ api, espera }) => espera.error(await post(api, { personas: 0 }), 400) },
  { nombre: '400 wins over 404 (bad personas + missing attendee)', prueba: async ({ api, espera }) => espera.error(await post(api, { asistente_id: 999999, personas: 9 }), 400) },
  { nombre: 'POST with unknown attendee responds 404', prueba: async ({ api, espera }) => espera.error(await post(api, { asistente_id: 999999 }), 404) },
  { nombre: 'POST with unknown zone responds 404', prueba: async ({ api, espera }) => espera.error(await post(api, { zona_id: 999999 }), 404) },
  { nombre: 'POST to a non-camping zone responds 400', prueba: async ({ api, espera }) => espera.error(await post(api, { zona_id: 3 }), 400) },
  { nombre: '400 (zone type) wins over 409 (minor)', prueba: async ({ api, espera }) => espera.error(await post(api, { asistente_id: 19, zona_id: 3 }), 400) },
  { nombre: 'Attendee 20 (turns 18 on 2026-11-19) can camp; extra fields are ignored', prueba: async ({ api, ctx, espera }) => {
    const x = espera.item(await post(api, { state: 'REMOVED', id: 1 }), 201);
    espera.igual(x.state, 'ACTIVE', 'state'); espera.igual(x.fecha_entrada, '2026-11-20', 'fecha_entrada');
    ctx.extra = x.id;
  } },
  { nombre: 'PATCH with non-editable field responds 400', prueba: async ({ api, ctx, espera }) => espera.error(await api.patch(`${R}/${ctx.extra}`, { asistente_id: 1 }), 400) },
  { nombre: 'Occupancy of a non-camping zone responds 400', prueba: async ({ api, espera }) => espera.error(await api.get(`${R}/zona/3/ocupacion`), 400) },
  { nombre: 'Occupancy of an unknown zone responds 404', prueba: async ({ api, espera }) => espera.error(await api.get(`${R}/zona/999999/ocupacion`), 404) },
  { nombre: 'Occupancy with invalid zone id responds 400', prueba: async ({ api, espera }) => espera.error(await api.get(`${R}/zona/abc/ocupacion`), 400) },
  { nombre: 'Cleanup: delete twice gives 200 then 404', prueba: async ({ api, ctx, espera }) => {
    espera.status(await api.del(`${R}/${ctx.extra}`), 200);
    espera.error(await api.del(`${R}/${ctx.extra}`), 404);
  } },
];
