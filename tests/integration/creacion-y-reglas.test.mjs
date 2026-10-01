const R = '/api/reservas-camping';
const payloadValido = {
  asistente_id: 20,
  zona_id: 1,
  fecha_entrada: '2026-11-20',
  fecha_salida: '2026-11-21',
  personas: 1,
};

const post = (api, extra) => api.post(R, { ...payloadValido, ...extra });

export default [
  { nombre: 'POST sin cuerpo responde 400', prueba: async ({ api, espera }) => espera.error(await api.post(R), 400) },
  { nombre: 'POST con id de tipo string responde 400', prueba: async ({ api, espera }) => espera.error(await post(api, { asistente_id: '20' }), 400) },
  { nombre: 'POST con formato de fecha invalido responde 400', prueba: async ({ api, espera }) => espera.error(await post(api, { fecha_entrada: '20-11-2026' }), 400) },
  { nombre: 'POST con fecha fuera del festival responde 400', prueba: async ({ api, espera }) => espera.error(await post(api, { fecha_salida: '2026-11-24' }), 400) },
  { nombre: 'POST con fechas iguales responde 400', prueba: async ({ api, espera }) => espera.error(await post(api, { fecha_salida: '2026-11-20' }), 400) },
  { nombre: 'POST con personas = 7 responde 400', prueba: async ({ api, espera }) => espera.error(await post(api, { personas: 7 }), 400) },
  { nombre: 'POST con personas = 0 responde 400', prueba: async ({ api, espera }) => espera.error(await post(api, { personas: 0 }), 400) },
  { nombre: 'Precedencia: 400 antes que 404', prueba: async ({ api, espera }) => espera.error(await post(api, { asistente_id: 999999, personas: 9 }), 400) },
  { nombre: 'POST con asistente inexistente responde 404', prueba: async ({ api, espera }) => espera.error(await post(api, { asistente_id: 999999 }), 404) },
  { nombre: 'POST con zona inexistente responde 404', prueba: async ({ api, espera }) => espera.error(await post(api, { zona_id: 999999 }), 404) },
  { nombre: 'POST hacia zona que no es camping responde 400', prueba: async ({ api, espera }) => espera.error(await post(api, { zona_id: 3 }), 400) },
  { nombre: 'Precedencia: tipo de zona 400 antes que menor 409', prueba: async ({ api, espera }) => espera.error(await post(api, { asistente_id: 19, zona_id: 3 }), 400) },
  {
    nombre: 'Asistente 20 (cumple 18 en fecha limite) crea reserva exitosa',
    prueba: async ({ api, ctx, espera }) => {
      const x = espera.item(await post(api, { state: 'REMOVED', id: 1 }), 201);
      espera.igual(x.state, 'ACTIVE', 'state');
      espera.igual(x.fecha_entrada, '2026-11-20', 'fecha_entrada');
      ctx.extra = x.id;
    },
  },
];